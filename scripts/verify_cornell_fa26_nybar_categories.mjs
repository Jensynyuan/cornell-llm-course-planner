import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const sourceUrl = "https://community.lawschool.cornell.edu/wp-content/uploads/2026/05/NYS-Bar-Requirements-for-LLMs_Fall-2026.pdf";

// Cornell's 2026-27 NY Bar memo, page 3, Fall column. A course may appear in
// more than one official category, but the planner assigns one primary category
// for progress so credits are never double counted automatically.
const CATEGORY_MAP = {
  "LAW 6641": ["professional", "core"],
  "LAW 6761": ["writing"],
  "LAW 6091": ["american"],
  "LAW 5001": ["american", "core"],
  "LAW 5021": ["american", "core"],
  "LAW 6011": ["core"],
  "LAW 6131": ["core"],
  "LAW 5041": ["core"],
  "LAW 6007": ["core"],
  "LAW 6263": ["core"],
  "LAW 7169": ["core"],
  "LAW 6401": ["core"],
  "LAW 6801": ["core"],
  "LAW 5151": ["core"],
  "LAW 6941": ["core"]
};

const primaryCategory = categories => {
  if (categories.includes("professional")) return "professional";
  if (categories.includes("writing")) return "writing";
  // IALS (LAW 6091) is automatically added and fulfills the American-law
  // category. Assign the two overlapping fall courses to the D category so
  // their credits remain useful for the separate six-credit requirement.
  if (categories.includes("core")) return "core";
  return categories.includes("american") ? "american" : null;
};

const readJson = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const writeJson = (file, value) => fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");

function updateDataset(file, catalogName, metaName) {
  const dataset = readJson(file);
  const expectedCodes = new Set(Object.keys(CATEGORY_MAP));
  const sourceCodes = new Set(dataset.courses.map(course => course.code));
  const missingOfficialCodes = [...expectedCodes].filter(code => !sourceCodes.has(code));
  if (missingOfficialCodes.length) throw new Error(`Official NY Bar list contains code(s) absent from ${file}: ${missingOfficialCodes.join(", ")}`);

  let descriptionsCleared = 0;
  dataset.courses = dataset.courses.map(course => {
    const categories = CATEGORY_MAP[course.code] || [];
    const { barStatus, ...withoutLegacyBarStatus } = course;
    const next = {
      ...withoutLegacyBarStatus,
      barCategories: categories,
      barPrimary: primaryCategory(categories),
      // A non-listed course is not marked ineligible: Cornell's memo is an
      // expected-course checklist, so its status remains "confirm with school".
      barClassroomEligible: categories.length ? true : (course.barClassroomEligible === false ? false : null),
      barEvidence: categories.length ? {
        source: "Cornell Law 2026-27 NYS Bar Examination Memorandum, p. 3 (Fall column)",
        sourceUrl,
        categories,
        note: categories.length > 1 ? "Multiple official categories; primary category is used for progress to avoid automatic double counting." : "Officially listed for this category."
      } : null
    };
    if (!String(course.officialDescriptionEn || "").trim()) {
      next.descriptionEn = "";
      next.descriptionZh = "Fall 2026 官方课程页面未公布详细课程说明。";
      next.translationStatus = "official-description-unavailable";
      descriptionsCleared += 1;
    }
    return next;
  });

  const listed = dataset.courses.filter(course => course.barCategories?.length);
  const core = listed.filter(course => course.barCategories.includes("core")).map(course => course.code).sort();
  const expectedCore = Object.entries(CATEGORY_MAP).filter(([, categories]) => categories.includes("core")).map(([code]) => code).sort();
  if (JSON.stringify(core) !== JSON.stringify(expectedCore)) throw new Error(`Core-course verification failed for ${file}`);

  const audit = {
    generatedAt: new Date().toISOString(),
    sourceUrl,
    sourceDescription: "Cornell Law 2026-27 NYS Bar Examination Memorandum, page 3, Fall column",
    plannerCourses: dataset.courses.length,
    officialCategoryCourses: listed.length,
    categoryCounts: Object.fromEntries(["professional", "writing", "american", "core"].map(category => [category, listed.filter(course => course.barCategories.includes(category)).length])),
    coreCourseCodes: core,
    removedIncorrectCoreCodes: ["LAW 6791", "LAW 6821"],
    addedCoreCodes: ["LAW 5151", "LAW 6641", "LAW 7169"],
    officialDescriptionUnavailable: dataset.courses.filter(course => !String(course.officialDescriptionEn || "").trim()).map(course => course.code),
    descriptionsCleared
  };
  dataset.meta ||= {};
  dataset.meta.nyBarCategoryAudit = audit;
  dataset.meta.releaseVersion = "v5.15";
  writeJson(file, dataset);
  fs.writeFileSync(path.join(dataDir, catalogName), `window.${catalogName.includes(".en.") ? "CORNELL_COURSE_CATALOG_EN" : "CORNELL_COURSE_CATALOG"} = ${JSON.stringify(dataset.courses)};\nwindow.${metaName} = ${JSON.stringify(dataset.meta)};\n`, "utf8");
  return audit;
}

const zh = updateDataset("cornell-law-2026-27.zh-CN.json", "cornell.catalog.zh-CN.js", "CORNELL_DATA_META");
const en = updateDataset("cornell-law-2026-27.en.json", "cornell.catalog.en.js", "CORNELL_DATA_META_EN");
if (JSON.stringify(zh.coreCourseCodes) !== JSON.stringify(en.coreCourseCodes)) throw new Error("Chinese and English catalog NY Bar categories diverged");
writeJson("cornell-fa26-nybar-category-audit.v5.15.json", { zh, en });
console.log(JSON.stringify({ zh, en }, null, 2));
