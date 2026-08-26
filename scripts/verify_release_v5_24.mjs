import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fail = message => { throw new Error(`v5.24 release check failed: ${message}`); };
const readJson = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const zh = readJson("cornell-law-2026-27.zh-CN.json");
const en = readJson("cornell-law-2026-27.en.json");
const springZh = readJson("cornell-law-spring-2027.zh-CN.json");
const springEn = readJson("cornell-law-spring-2027.en.json");
const courseCodes = dataset => dataset.courses.map(course => course.code);
const sectionIds = dataset => dataset.courses.flatMap(course => (course.sections || []).map(section => section.id));

if (zh.courses?.length !== 136 || en.courses?.length !== 136) fail("both Fall 2026 LL.M. planning catalogs must contain 136 courses");
const zhCodes = courseCodes(zh);
const enCodes = courseCodes(en);
if (JSON.stringify(zhCodes) !== JSON.stringify(enCodes)) fail("Chinese and English course order must match");
if (new Set(zhCodes).size !== zhCodes.length) fail("course codes must be unique");
if (JSON.stringify(sectionIds(zh)) !== JSON.stringify(sectionIds(en))) fail("Fall Chinese and English section order must match");

for (const dataset of [zh, en]) {
  const law7202 = dataset.courses.find(course => course.code === "LAW 7202");
  const law7259 = dataset.courses.find(course => course.code === "LAW 7259");
  if (!law7202 || law7202.credits !== 1 || law7202.classNumber !== "19470") fail("LAW 7202 must be present as class 19470 for one credit");
  if (!law7259 || law7259.credits !== 1 || law7259.classNumber !== "19463") fail("LAW 7259 must be present as class 19463 for one credit");
}

for (const dataset of [zh, en]) {
  const course = dataset.courses.find(item => item.code === "LAW 6641");
  if (!course || course.credits !== 3) fail("LAW 6641 must remain a three-credit Fall course");
  if (course.barPrimary !== "professional") fail("LAW 6641 must default to Professional Responsibility");
  if (JSON.stringify(course.barCategories) !== JSON.stringify(["professional", "core"])) fail("LAW 6641 must retain both official categories");
}

const sandbox = { window:{} };
for (const file of ["cornell.catalog.zh-CN.js", "cornell.catalog.en.js"]) vm.runInNewContext(fs.readFileSync(path.join(dataDir, file), "utf8"), sandbox);
if (JSON.stringify(sandbox.window.CORNELL_COURSE_CATALOG) !== JSON.stringify(zh.courses)) fail("Fall Chinese browser catalog must match its JSON dataset");
if (JSON.stringify(sandbox.window.CORNELL_COURSE_CATALOG_EN) !== JSON.stringify(en.courses)) fail("Fall English browser catalog must match its JSON dataset");

if (springZh.courses?.length !== 126 || springEn.courses?.length !== 126) fail("both Spring 2027 catalogs must contain 126 courses after exclusions");
if (JSON.stringify(courseCodes(springZh)) !== JSON.stringify(courseCodes(springEn))) fail("Spring Chinese and English course order must match");
if (new Set(courseCodes(springZh)).size !== springZh.courses.length) fail("Spring course codes must be unique after merging duplicate offerings");
if (sectionIds(springZh).length !== 145 || sectionIds(springEn).length !== 145) fail("both Spring 2027 catalogs must contain 145 sections");
if (JSON.stringify(sectionIds(springZh)) !== JSON.stringify(sectionIds(springEn))) fail("Spring Chinese and English section order must match");
const excludedSpringCodes = ["LAW 4013", "LAW 4051", "LAW 4081", "LAW 4131", "LAW 4330", "LAW 6332"];
for (const dataset of [springZh, springEn]) {
  if (dataset.meta?.termCode !== "SP27" || dataset.meta?.courseCount !== 126 || dataset.meta?.sectionCount !== 145) fail("Spring metadata counts or term marker are incorrect");
  if (excludedSpringCodes.some(code => courseCodes(dataset).includes(code))) fail("an excluded Spring course remains in a published dataset");
  if (JSON.stringify((dataset.meta?.excludedCourses || []).map(course => course.code)) !== JSON.stringify(excludedSpringCodes)) fail("Spring exclusion audit list is incomplete");
}
for (const file of ["cornell.catalog.spring-2027.zh-CN.js", "cornell.catalog.spring-2027.en.js"]) vm.runInNewContext(fs.readFileSync(path.join(dataDir, file), "utf8"), sandbox);
if (JSON.stringify(sandbox.window.CORNELL_SPRING_2027_COURSE_CATALOG) !== JSON.stringify(springZh.courses)) fail("Spring Chinese browser catalog must match its JSON dataset");
if (JSON.stringify(sandbox.window.CORNELL_SPRING_2027_COURSE_CATALOG_EN) !== JSON.stringify(springEn.courses)) fail("Spring English browser catalog must match its JSON dataset");

vm.runInNewContext(fs.readFileSync(path.join(root, "nybar-allocation.js"), "utf8"), sandbox);
const allocation = sandbox.window.NY_BAR_ALLOCATION;
const law6641 = zh.courses.find(course => course.code === "LAW 6641");
if (allocation.assignedCategory(law6641, {}) !== "professional") fail("default LAW 6641 allocation must be Professional Responsibility");
if (allocation.assignedCategory(law6641, { [law6641.id]:"core" }) !== "core") fail("LAW 6641 must support one-time reassignment to NYLE / Bar");
const totals = allocation.creditsByCategory([law6641], { [law6641.id]:"core" }, () => true);
if (totals.core !== 3 || totals.professional !== 0) fail("reassignment must move, not duplicate, LAW 6641 credits");

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
if (!index.includes("LL.M. Course Planner v5.24")) fail("page version marker is missing");
if (index.indexOf("./nybar-allocation.js") < 0 || index.indexOf("./nybar-allocation.js") > index.indexOf("./app.js")) fail("allocation helper must load before app.js");
if (index.includes("cornell.catalog.spring-2027")) fail("Spring database must remain separate until the planner gains an explicit term selector");
for (const marker of ["barCategoryAllocations", "bindBarAllocationControls", "creditsByCategory"]) if (!app.includes(marker)) fail(`allocation interface marker absent: ${marker}`);
for (const marker of ["normalizedCourseTitle", "pickedTitles.has(titleKey)"]) if (!app.includes(marker)) fail(`recommendation de-duplication marker absent: ${marker}`);
if (app.includes("})) || course.sections?.[0];")) fail("recommendation generation must skip a course when every section conflicts");

console.log("PASS: v5.24 Fall catalogs=136/136, Spring catalogs=126/126 (145 sections), and LAW 6641 allocation moves exactly once.");
