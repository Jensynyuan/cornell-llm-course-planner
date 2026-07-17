import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const sourceHtml = process.argv[2];
if (!sourceHtml) throw new Error("Usage: node scripts/sync_cornell_locations_from_roster_html.mjs <saved-roster-html>");
const html = fs.readFileSync(sourceHtml, "utf8");
const read = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const decode = value => String(value || "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").trim();

const sectionChunks = html.split(/<li class="class-numbers">/i).slice(1);
const locationByClassNumber = new Map();
for (const chunk of sectionChunks) {
  const classMatch = chunk.match(/data-content="(\d+)"[^>]*data-original-title="Class Number"/i);
  const locationMatch = chunk.match(/class="facility-search"[^>]*>([^<]+)<\/a>/i);
  if (classMatch && locationMatch) locationByClassNumber.set(classMatch[1], decode(locationMatch[1]));
}

const updateDataset = file => {
  const dataset = read(file);
  let matchedSections = 0;
  let matchedMeetings = 0;
  dataset.courses = dataset.courses.map(course => ({ ...course, sections:(course.sections || []).map(section => {
    const location = locationByClassNumber.get(String(section.classNumber || ""));
    if (!location) return section;
    matchedSections += 1;
    const meetings = (section.meetings || []).map(meeting => {
      matchedMeetings += 1;
      return { ...meeting, location, locationZh:location, locationStatus:"published", locationSource:"Cornell FA26 roster HTML" };
    });
    return { ...section, location, locationZh:location, locationStatus:"published", locationSource:"Cornell FA26 roster HTML", meetings };
  }) }));
  return { dataset, matchedSections, matchedMeetings };
};

const zh = updateDataset("cornell-law-2026-27.zh-CN.json");
const en = updateDataset("cornell-law-2026-27.en.json");
const audit = {
  generatedAt:new Date().toISOString(),
  sourceHtml:path.resolve(sourceHtml),
  sourceUrl:"https://classes.cornell.edu/browse/roster/FA26/subject/LAW",
  rosterLocationRecords:locationByClassNumber.size,
  matchedSections:zh.matchedSections,
  matchedMeetings:zh.matchedMeetings,
  note:"Only concrete facility names present in the saved official roster HTML are written to the bundled course data. Missing facilities remain unpublished."
};
zh.dataset.meta.rosterLocationAudit = audit;
en.dataset.meta.rosterLocationAudit = audit;
write("cornell-law-2026-27.zh-CN.json", zh.dataset);
write("cornell-law-2026-27.en.json", en.dataset);
write("cornell-roster-html-location-audit.v5.4.json", audit);
fs.writeFileSync(path.join(dataDir, "cornell.catalog.zh-CN.js"), `window.CORNELL_COURSE_CATALOG = ${JSON.stringify(zh.dataset.courses)};\nwindow.CORNELL_DATA_META = ${JSON.stringify(zh.dataset.meta)};\n`, "utf8");
fs.writeFileSync(path.join(dataDir, "cornell.catalog.en.js"), `window.CORNELL_COURSE_CATALOG_EN = ${JSON.stringify(en.dataset.courses)};\nwindow.CORNELL_DATA_META_EN = ${JSON.stringify(en.dataset.meta)};\n`, "utf8");
console.log(JSON.stringify(audit, null, 2));
