import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

await import("./verify_spring_2027_data_v5_31.mjs");
await import("./verify_calendar_integration.mjs");
await import("./verify_nybar_allocation.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const json = relative => JSON.parse(read(relative));
const app = read("app.js");
const index = read("index.html");
const styles = read("styles.css");
const fall = json("data/cornell-law-2026-27.en.json");
const spring = json("data/cornell-law-spring-2027.en.json");
const eligibilitySandbox = { window:{} };
vm.runInNewContext(read("nybar-eligibility.js"), eligibilitySandbox, { filename:"nybar-eligibility.js" });
const eligibility = eligibilitySandbox.window.NY_BAR_ELIGIBILITY;

assert.match(app, /const APP_VERSION = "v5\.33"/);
assert.match(app, /const CURRENT_CORNELL_DATASET_VERSION = "v5\.32"/, "Code-only v5.33 must not invalidate the verified v5.32 dataset snapshot.");
assert.match(app, /version:"v5\.33"[\s\S]*?zh:\[[\s\S]*?en:\[/, "v5.33 release note must remain bilingual");
assert.match(index, /LL\.M\. Course Planner v5\.33/);
assert.match(index, /<span>v5\.33<\/span>/);
assert.match(app, /Enrollment to confirm/);
assert.match(app, /选课资格待确认/);
assert.ok(eligibility, "Production NY Bar eligibility helper must load in the release test.");
assert.ok(index.indexOf("./nybar-eligibility.js") < index.indexOf("./app.js"), "Eligibility helper must load before app.js.");
const eligibilitySource = app.slice(app.indexOf("function barEligibility"), app.indexOf("function barStatus", app.indexOf("function barEligibility")));
assert.match(eligibilitySource, /NY_BAR_ELIGIBILITY\.classifyCourse/, "app.js must call the production-tested eligibility helper.");
assert.doesNotMatch(eligibilitySource, /sectionHasPublishedLocation|manualLocation|syncedLocation/, "Browser room overrides must never change NY Bar eligibility.");
assert.match(app, /const hasDifference = rows\.some\(row => row\.eligibility\.status !== "eligible"\)/, "A zero-credit pending or excluded row must still auto-open the breakdown.");

for (const marker of [
  "function nyBarCreditBreakdownHtml(selected)",
  "Course-by-course NY Bar calculation",
  "NY Bar 逐门学分计算",
  "bar-credit-breakdown-row is-",
  ".bar-credit-breakdown-row.is-review",
  ".bar-credit-breakdown-row.is-ineligible"
]) assert.ok(app.includes(marker) || styles.includes(marker), `v5.33 explanation guard missing: ${marker}`);

const byId = new Map([...fall.courses, ...spring.courses].map(course => [course.id, course]));
const plan = [
  ["LAW-5061-SP27", "LAW-5061-SP27-1"],
  ["LAW-6051-SP27", "LAW-6051-SP27-1"],
  ["LAW-6091", "LAW-6091-11936"],
  ["LAW-6131", "LAW-6131-11779"],
  ["LAW-6641", "LAW-6641-11783"],
  ["LAW-6734-SP27", "LAW-6734-SP27-1"],
  ["LAW-6745", "LAW-6745-18456"],
  ["LAW-6761-SP27", "LAW-6761-SP27-2"],
  ["LAW-7028-SP27", "LAW-7028-SP27-1"],
  ["LAW-7713-SP27", "LAW-7713-SP27-101"],
  ["LAW-7991", "LAW-7991-11863"]
].map(([courseId, sectionId]) => {
  const course = byId.get(courseId);
  assert.ok(course, `${courseId} missing from the bilingual release dataset`);
  const section = course.sections.find(item => item.id === sectionId);
  assert.ok(section, `${sectionId} missing from ${courseId}`);
  return { course, section };
});

const classify = ({ course, section }) => eligibility.classifyCourse({ course, sections:[section], schoolId:"cornell" }).status;

const affected = plan.filter(({ course }) => ["LAW-6051-SP27", "LAW-6734-SP27", "LAW-7713-SP27"].includes(course.id));
assert.deepEqual(affected.map(({ course }) => [course.code, Number(course.credits)]), [["LAW 6051", 1], ["LAW 6734", 3], ["LAW 7713", 3]]);
assert.equal(affected.reduce((sum, { course }) => sum + Number(course.credits), 0), 7);
for (const row of affected) {
  assert.match(String(row.section.instructionMode), /not published/i);
  assert.match(eligibility.officialLocationText(row.section), /Myron Taylor Hall/, `${row.course.code} must retain its official Cornell physical room`);
  assert.equal(classify(row), "eligible", `${row.course.code} must count despite unpublished instruction mode`);
}

assert.equal(plan.reduce((sum, { course }) => sum + Number(course.credits), 0), 28);
assert.ok(plan.every(row => classify(row) === "eligible"), "Every course in the user's 28-credit plan should qualify under the published section evidence.");
assert.equal(plan.filter(row => classify(row) === "eligible").reduce((sum, { course }) => sum + Number(course.credits), 0), 28);

assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Online", component:"LEC", label:"Lecture", location:"Myron Taylor Hall 184" } }), "ineligible");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Not published", component:"LEC", label:"Lecture", location:"Online" } }), "ineligible", "An online location must not pass when mode is unpublished.");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Not published", component:"CLN", componentLabel:"Clinic", label:"Clinic Seminar", location:"Myron Taylor Hall 184" } }), "review", "A clinic code must take priority over the word Seminar.");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Not published", component:"PRA", componentLabel:"Practicum", label:"Practicum Seminar", location:"Myron Taylor Hall 184" } }), "review");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Independent Study", component:"IND", label:"Independent study", location:"Myron Taylor Hall 184" } }), "ineligible");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Pending hybrid classification", component:"LEC", label:"Lecture", location:"Myron Taylor Hall 184" } }), "review");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Not published", component:"LEC", label:"Lecture", location:"Teaching location not published" } }), "eligible", "A standard Cornell classroom course must not lose credit merely because mode or room is not yet published.");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"", component:"LEC", label:"Lecture", location:"Teaching location not published" } }), "eligible", "A blank mode follows the same rule as Not published.");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"Not published", component:"DIS", label:"Discussion", location:"Myron Taylor Hall 184" } }), "eligible");
assert.equal(classify({ course:{ credits:3 }, section:{ instructionMode:"In Person", component:"UNK", label:"Section", location:"Myron Taylor Hall 184" } }), "review", "In Person alone must not turn an unknown course format into a classroom course.");

assert.equal(classify({ course:{ credits:3, barClassroomEligible:true }, section:{ instructionMode:"In Person", component:"CLN", label:"Clinic" } }), "eligible", "An explicit official eligible classification may override the generic clinic review rule.");
assert.equal(classify({ course:{ credits:3, barClassroomEligible:true }, section:{ instructionMode:"Hybrid", component:"LEC", label:"Lecture" } }), "eligible", "An explicit official eligible classification may override the generic hybrid review rule.");
assert.equal(classify({ course:{ credits:3, barClassroomEligible:true }, section:{ instructionMode:"Online", component:"LEC", label:"Lecture" } }), "ineligible", "Explicit Online remains excluded even if a stale eligible flag exists.");

const mixedSectionResult = eligibility.classifyCourse({
  course:{ credits:3 },
  sections:[
    { instructionMode:"In Person", component:"LEC", label:"Lecture", location:"Myron Taylor Hall 184" },
    { instructionMode:"Not published", component:"DIS", label:"Discussion", location:"Myron Taylor Hall 277" }
  ],
  schoolId:"cornell"
});
assert.equal(mixedSectionResult.status, "eligible", "Lecture + discussion combinations must be evaluated section by section.");

const localOverrideFixture = { instructionMode:"Not published", component:"", label:"Section", manualLocation:"Myron Taylor Hall 184", syncedLocation:"Myron Taylor Hall 184" };
assert.equal(classify({ course:{ credits:3 }, section:localOverrideFixture }), "review", "Local room-shaped fields must not change the production result.");

const allSections = [...fall.courses, ...spring.courses].flatMap(course => (course.sections || []).map(section => ({ course, section })));
const isStandardComponent = section => /^(LEC|SEM|DIS|COL)$/i.test(String(section.component || "").trim());
const isModeUnpublished = section => !String(section.instructionMode || "").trim() || /^(not published|unpublished|unknown|tba|to be announced)$/i.test(String(section.instructionMode || "").trim());
const standardUnpublished = allSections.filter(({ section }) => isStandardComponent(section) && isModeUnpublished(section) && !/online|remote|zoom|distance|线上|远程/i.test(eligibility.officialLocationText(section)));
assert.ok(standardUnpublished.length > 0, "Catalog-wide unpublished classroom fixture set must not be empty.");
assert.ok(standardUnpublished.every(({ course, section }) => eligibility.classifySection(section, course).status === "eligible"), "Every standard Cornell classroom section with no online designation must count at section level.");

const explicitRemoteSections = allSections.filter(({ section }) => /online|remote|zoom|distance|线上|远程/i.test(`${section.instructionMode || ""} ${eligibility.officialLocationText(section)}`));
assert.ok(explicitRemoteSections.every(({ course, section }) => eligibility.classifySection(section, course).status === "ineligible"), "Every explicitly remote catalog section must be rejected.");

console.log("PASS: v5.33 user plan = 28 registered credits / 28 NY Bar classroom credits.");
console.log("PASS: LAW 6051 (1) + LAW 6734 (3) + LAW 7713 (3) recover the exact 7-credit false exclusion.");
console.log("PASS: production classifier rejects explicit online delivery and preserves clinic, independent-study, hybrid, and local-override safety guards.");
console.log("PASS: unpublished standard Lecture / Seminar / Discussion sections count across the Cornell catalog, including mixed component groups.");
console.log(`PASS: catalog-wide delivery-mode matrix · ${standardUnpublished.length} standard unpublished sections count · ${explicitRemoteSections.length} explicitly remote sections are excluded.`);
