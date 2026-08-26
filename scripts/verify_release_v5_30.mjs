import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

await import("./verify_release_v5_25.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const json = file => JSON.parse(read(path.join("data", file)));
const fail = message => { throw new Error(`v5.30 release check failed: ${message}`); };

const fallZh = json("cornell-law-2026-27.zh-CN.json");
const fallEn = json("cornell-law-2026-27.en.json");
const springZh = json("cornell-law-spring-2027.zh-CN.json");
const springEn = json("cornell-law-spring-2027.en.json");
const index = read("index.html");
const app = read("app.js");
const styles = read("styles.css");

if (!index.includes("LL.M. Course Planner v5.30") || !app.includes('const APP_VERSION = "v5.30"')) fail("v5.30 markers are missing");
if (fallZh.courses.length !== 136 || fallEn.courses.length !== 136) fail("Fall bilingual catalogs must remain 136/136");
if (springZh.courses.length !== 126 || springEn.courses.length !== 126) fail("Spring bilingual catalogs must remain 126/126");
const combined = [...fallEn.courses, ...springEn.courses];
if (combined.length !== 262) fail("combined Cornell catalog must contain 262 term-specific offerings");
if (new Set(combined.map(course => course.id)).size !== 262) fail("combined offering IDs must be unique across terms");
const fallCodes = new Set(fallEn.courses.map(course => course.code));
const overlap = springEn.courses.filter(course => fallCodes.has(course.code));
if (overlap.length !== 48) fail(`expected 48 course codes offered in both terms, found ${overlap.length}`);
if (!fallEn.courses.some(course => course.code === "LAW 6641") || !springEn.courses.some(course => course.code === "LAW 6641")) fail("LAW 6641 must appear as separate Fall and Spring offerings");

const expectedSpringCategories = new Map([
  ["LAW 5061", ["core"]], ["LAW 5121", ["core"]], ["LAW 6011", ["core"]], ["LAW 6131", ["core"]],
  ["LAW 6203", ["core"]], ["LAW 6264", ["core"]], ["LAW 6401", ["core"]], ["LAW 6431", ["core"]],
  ["LAW 6641", ["professional", "core"]], ["LAW 6761", ["writing"]]
]);
for (const dataset of [springZh, springEn]) {
  for (const [code, categories] of expectedSpringCategories) {
    const course = dataset.courses.find(item => item.code === code);
    if (!course) fail(`${code} is missing from Spring`);
    if (JSON.stringify(course.barCategories) !== JSON.stringify(categories)) fail(`${code} Spring NY Bar categories are incorrect`);
    if (course.barClassroomEligible !== true) fail(`${code} must carry official Spring classroom eligibility`);
  }
  const categoryCourses = dataset.courses.filter(course => course.barCategories?.length);
  if (categoryCourses.length !== 10) fail(`Spring must contain exactly 10 actually offered memo-category courses, found ${categoryCourses.length}`);
  const law6264 = dataset.courses.find(course => course.code === "LAW 6264");
  if (law6264.credits !== 2) fail("LAW 6264 must preserve the current two-credit offering");
  if (!/memo.*3|3.*memo/i.test(`${law6264.barEvidence?.note || ""} ${law6264.barEvidence?.noteZh || ""}`)) fail("LAW 6264 evidence must record the memo/current-offering credit conflict");
}

const sandbox = { window:{} };
for (const file of ["cornell.catalog.zh-CN.js", "cornell.catalog.en.js", "cornell.catalog.spring-2027.zh-CN.js", "cornell.catalog.spring-2027.en.js"]) {
  vm.runInNewContext(read(path.join("data", file)), sandbox);
}
if (sandbox.window.CORNELL_COURSE_CATALOG.length + sandbox.window.CORNELL_SPRING_2027_COURSE_CATALOG.length !== 262) fail("browser catalogs do not expose 262 offerings");
for (const script of ["cornell.catalog.zh-CN.js", "cornell.catalog.en.js", "cornell.catalog.spring-2027.zh-CN.js", "cornell.catalog.spring-2027.en.js"]) {
  if (index.indexOf(script) < 0 || index.indexOf(script) > index.indexOf("./app.js")) fail(`${script} must load before app.js`);
}

for (const id of ["termFilter", "termSwitchOverlay", "fallWeekBtn", "springWeekBtn"]) if (!index.includes(`id="${id}"`)) fail(`UI marker missing: ${id}`);
for (const id of ["termFilter", "barFilter", "gradingFilter", "creditsFilter", "meetingDayFilter", "topicFilter", "courseFormatFilter"]) {
  if (!new RegExp(`id="${id}"[^>]*multiple[^>]*multi-filter-source|id="${id}"[^>]*multi-filter-source[^>]*multiple`).test(index)) fail(`${id} must be a checkbox-backed multi-select source`);
}
for (const marker of ["courseTermCode", "catalogOfferingKey", "selectedFilterValues", "planningTermCourses", "currentUserWeekStart", "chooseTermFilter", "CORNELL_TERM_PROFILES.SP27", "courseTermLabel(c)"]) if (!app.includes(marker)) fail(`term-aware app marker missing: ${marker}`);
if (!app.includes("termValues.size") || !app.includes("meetingDayValues.size") || !app.includes("some(day => courseDays.has(day))")) fail("OR-within-facet multi-select logic is missing");
if (!app.includes("state.scheduleWeekStart = currentUserWeekStart()")) fail("schedule must reset to the user's local current week when opened");
if (!styles.includes(".overlay:not(#detailOverlay) { display: grid; place-items: center") || !styles.includes(".overlay[hidden] { display: none !important; }")) fail("non-detail dialogs must be centered and hidden overlays must stay hidden");
if (!styles.includes(".multi-filter-menu") || !styles.includes(".badge-term-sp27")) fail("multi-select or term-badge styles are missing");
if (!styles.includes(".topbar-actions { display:flex; width:100%") || !styles.includes(".school-switcher-button small { display:block; }")) fail("narrow screens must keep term and language controls reachable");
if (!app.includes('version:"v5.30"') || !app.includes("Fixed the Spring 2027 catalog integration")) fail("bilingual v5.30 release notes are missing");

console.log("PASS: v5.30 exposes 262 term-specific offerings, official Spring NY Bar mappings, multi-select filters, term-aware planning, current-week scheduling, and centered dialogs.");
