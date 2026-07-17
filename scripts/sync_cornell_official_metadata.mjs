import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const terms = ["FA26", "SP26", "FA25", "SP25", "FA24"];
const read = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const snapshots = {};
for (const term of terms) {
  const response = await fetch(`https://classes.cornell.edu/api/2.0/search/classes.json?roster=${term}&subject=LAW`, { headers:{ Accept:"application/json", "User-Agent":"Cornell-LLM-Course-Planner-v5.4-official-sync" } });
  if (!response.ok) throw new Error(`${term}: Cornell API returned ${response.status}`);
  const payload = await response.json();
  if (payload.status !== "success" || !Array.isArray(payload.data?.classes)) throw new Error(`${term}: unexpected Cornell API response`);
  snapshots[term] = payload.data.classes;
  await sleep(1100);
}

const official = new Map();
for (const term of terms) for (const course of snapshots[term]) {
  const code = `LAW ${course.catalogNbr}`;
  if (!official.has(code)) official.set(code, { term, course });
}

const zh = read("cornell-law-2026-27.zh-CN.json");
const en = read("cornell-law-2026-27.en.json");
const update = record => {
  const entry = official.get(record.code);
  if (!entry) return record;
  const { term, course } = entry;
  const rosterUrl = `https://classes.cornell.edu/browse/roster/${term}/class/LAW/${course.catalogNbr}`;
  return {
    ...record,
    sourceUrl: rosterUrl,
    officialSourceTerm: term,
    officialTitleEn: course.titleLong || course.titleShort || "",
    officialDescriptionEn: course.description || "",
    officialDataStatus: term === "FA26" ? "offered-current-term" : "verified-historical-offering",
    catalogOnly: term !== "FA26" ? true : Boolean(record.catalogOnly)
  };
};
zh.courses = zh.courses.map(update);
en.courses = en.courses.map(record => {
  const updated = update(record);
  return {
    ...updated,
    titleEn: updated.officialTitleEn || record.titleEn,
    descriptionEn: updated.officialDescriptionEn || record.descriptionEn
  };
});
const audit = {
  generatedAt: new Date().toISOString(),
  terms,
  officialCourseCounts: Object.fromEntries(terms.map(term => [term, snapshots[term].length])),
  verifiedCourses: official.size,
  unmatchedCatalogCourses: zh.courses.filter(course => !official.has(course.code)).map(course => course.code),
  notes: "Course links and English descriptions are refreshed only from Cornell Class Roster API results. A course absent from FA26 is marked as a verified historical offering when found in another official term."
};
zh.meta.officialApiAudit = audit;
en.meta.officialApiAudit = audit;
write("cornell-law-2026-27.zh-CN.json", zh);
write("cornell-law-2026-27.en.json", en);
fs.writeFileSync(path.join(dataDir, "cornell.official-api-audit.v5.4.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(dataDir, "cornell.catalog.zh-CN.js"), `window.CORNELL_COURSE_CATALOG = ${JSON.stringify(zh.courses)};\nwindow.CORNELL_DATA_META = ${JSON.stringify(zh.meta)};\n`, "utf8");
fs.writeFileSync(path.join(dataDir, "cornell.catalog.en.js"), `window.CORNELL_COURSE_CATALOG_EN = ${JSON.stringify(en.courses)};\nwindow.CORNELL_DATA_META_EN = ${JSON.stringify(en.meta)};\n`, "utf8");
console.log(JSON.stringify(audit, null, 2));
