import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./verify_release_v5_33.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const json = relative => JSON.parse(read(relative));
const app = read("app.js");
const index = read("index.html");
const fall = json("data/cornell-law-2026-27.en.json");

assert.match(app, /const APP_VERSION = "v5\.34"/);
assert.match(index, /LL\.M\. Course Planner v5\.34/);
assert.match(index, /<span>v5\.34<\/span>/);
assert.match(app, /version:"v5\.34"[\s\S]*?zh:\[[\s\S]*?en:\[/, "v5.34 release note must remain bilingual");

assert.match(app, /const CORNELL_LLM_REGISTRATION_POLICY = Object\.freeze\(\{[\s\S]*?minimum:10,[\s\S]*?maximum:17,/);
assert.match(app, /publications\.lawschool\.cornell\.edu\/student-handbook\/academic-degree-requirements\/llm\//);
assert.match(app, /General LL\.M\. Student Handbook 规定每学期注册/);
assert.match(app, /generic Registrar FAQ still says 10–15/);
assert.match(app, /IALS counts in the Fall registration total but not toward the separate 20-credit degree-course requirement/);
assert.match(app, /registration \(\$\{registrationMinimum\}–\$\{registrationMaximum\}\)/);
assert.match(app, /annual\.registrationCredits\.FA26, registrationMinimum, registrationMaximum/);
assert.match(app, /annual\.registrationCredits\.SP27, registrationMinimum, registrationMaximum/);
assert.match(app, /Within the published \$\{minimum\}–\$\{maximum\} credit range/);

const renderProgress = app.slice(app.indexOf("function renderProgress"), app.indexOf("function barAllocationControlsHtml"));
assert.doesNotMatch(renderProgress, /annual\.registrationCredits\.(?:FA26|SP27),\s*10,\s*15/, "Current registration bars must not retain the old 15-credit cap.");

const expected = new Map([
  ["LAW 6745", 2],
  ["LAW 6007", 3],
  ["LAW 7991", 3],
  ["LAW 6131", 3],
  ["LAW 6641", 3],
  ["LAW 6091", 2]
]);
const selected = [...expected].map(([code, credits]) => {
  const course = fall.courses.find(item => item.code === code);
  assert.ok(course, `${code} missing from Fall 2026 dataset`);
  assert.equal(Number(course.credits), credits, `${code} credit value changed`);
  return course;
});
const total = selected.reduce((sum, course) => sum + Number(course.credits), 0);
const ordinary = selected.filter(course => course.code !== "LAW 6091").reduce((sum, course) => sum + Number(course.credits), 0);
assert.equal(ordinary, 14);
assert.equal(total, 16);
assert.equal(total > 17, false, "The user's 16-credit Fall plan must not be marked as an overload.");
assert.equal(total > 15, true, "Fixture must prove why the old website incorrectly raised an alert.");

const registrationSource = app.slice(app.indexOf("function calculateCornellAcademicYearProgress"), app.indexOf("function nyBarCreditBreakdownHtml"));
assert.match(registrationSource, /selected\.forEach\(course =>/);
assert.doesNotMatch(registrationSource, /degreeExcludeCodes|LAW 6091/, "IALS must remain in semester registration totals.");

console.log("PASS: v5.34 applies the 2026–27 General LL.M. 10–17 semester range.");
console.log("PASS: LAW 6745 + 6007 + 7991 + 6131 + 6641 = 14; IALS adds 2; Fall total = 16 and is not an overload.");
console.log("PASS: IALS remains in Fall registration credits while the interface preserves the separate 20-credit degree-course distinction.");
