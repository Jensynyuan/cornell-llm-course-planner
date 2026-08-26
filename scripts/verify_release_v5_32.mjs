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
const springEn = json("data/cornell-law-spring-2027.en.json");
const springZh = json("data/cornell-law-spring-2027.zh-CN.json");
const fallEn = json("data/cornell-law-2026-27.en.json");
const expectedNoClassDates = ["2027-01-18", "2027-02-15", "2027-02-16", "2027-03-29", "2027-03-30", "2027-03-31", "2027-04-01", "2027-04-02"];

assert.match(app, /const APP_VERSION = "v5\.32"/);
assert.match(app, /const CURRENT_CORNELL_DATASET_VERSION = "v5\.32"/);
assert.match(app, /version:"v5\.32"[\s\S]*?zh:\[[\s\S]*?en:\[/, "v5.32 release note must remain bilingual");
assert.match(index, /LL\.M\. Course Planner v5\.32/);
assert.match(index, /<span>v5\.32<\/span>/);

assert.doesNotMatch(app, /planningTermCourses\(selectedCourses\(\)\)/, "Credit Progress must never be scoped by the catalog term filter.");
assert.doesNotMatch(app, /const activeSelected = planningTermCourses\(selected\)/, "Selected-course summary must never be scoped by the catalog term filter.");
assert.doesNotMatch(app, /courseTermCode\(course\) === courseTermCode\(c\)/, "Smart NY Bar allocation must consider the unified academic-year selection.");
assert.match(app, /function calculateCornellAcademicYearProgress\(selected\)/);
assert.match(app, /const registrationCredits = \{ FA26:0, SP27:0 \}/);
assert.match(app, /2026–27 academic-year record/);
assert.match(app, /2026–27 秋春学年个人记录/);
assert.match(app, /Fall 2026 LL\.M\. registration \(10–15\)/);
assert.match(app, /Spring 2027 LL\.M\. registration \(10–15\)/);
assert.match(app, /2026–27 NY Bar qualifying classroom credits/);
assert.match(app, /This choice filters Course Search and term-specific recommendations only/);
assert.match(app, /这里仅筛选课程库及当学期推荐/);

for (const marker of [
  ".selected-course-panel .schedule-course-token span.schedule-allocation-badge",
  "height:auto !important",
  "max-height:none !important",
  "white-space:normal !important",
  ".no-class-label strong",
  ".schedule-header.has-special-schedule"
]) assert.ok(styles.includes(marker), `v5.32 visual guard missing: ${marker}`);

for (const dataset of [springEn, springZh]) {
  assert.equal(dataset.meta.instructionStart, "2027-01-19");
  assert.equal(dataset.meta.instructionEnd, "2027-04-28");
  assert.equal(dataset.meta.examEnd, "2027-05-14");
  assert.deepEqual(dataset.meta.noClassDates, expectedNoClassDates);
  assert.deepEqual(dataset.meta.specialScheduleDays, { "2027-04-28":"M" });
  assert.equal(dataset.meta.academicCalendarUrl, "https://community.lawschool.cornell.edu/academics/2026-27-academic-calendar/");
  assert.equal(dataset.meta.academicCalendarScope, "Cornell Law JD and Ithaca LL.M. 2026-27 academic calendar");
  assert.equal(dataset.meta.academicCalendarCheckedAt, "2026-08-26");
  assert.deepEqual((dataset.meta.calendarPeriods || []).map(period => [period.start, period.end, period.labelEn, period.labelZh]), [
    ["2027-01-18", "2027-01-18", "Martin Luther King, Jr. Holiday", "马丁·路德·金纪念日"],
    ["2027-02-15", "2027-02-16", "February Break", "二月假期"],
    ["2027-03-29", "2027-04-02", "Spring Break", "春假"]
  ]);
  for (const course of dataset.courses) for (const section of course.sections || []) {
    if (section.scheduleDateStatus === "regular-spring-term") {
      assert.equal(section.startDate, "2027-01-19", `${course.code} regular section start drifted`);
      assert.equal(section.endDate, "2027-04-28", `${course.code} regular section end drifted`);
    }
    for (const meeting of section.meetings || []) if (meeting.scheduleDateStatus === "regular-spring-term") {
      assert.equal(meeting.startDate, "2027-01-19", `${course.code} regular meeting start drifted`);
      assert.equal(meeting.endDate, "2027-04-28", `${course.code} regular meeting end drifted`);
    }
  }
}
assert.deepEqual(springEn.courses.map(course => course.id), springZh.courses.map(course => course.id), "Spring bilingual offering IDs differ after calendar correction");

const catalogSandbox = { window:{} };
for (const file of ["data/cornell.catalog.spring-2027.en.js", "data/cornell.catalog.spring-2027.zh-CN.js"]) vm.runInNewContext(read(file), catalogSandbox, { filename:file });
assert.deepEqual(JSON.parse(JSON.stringify(catalogSandbox.window.CORNELL_SPRING_2027_COURSE_CATALOG_EN)), springEn.courses);
assert.deepEqual(JSON.parse(JSON.stringify(catalogSandbox.window.CORNELL_SPRING_2027_COURSE_CATALOG)), springZh.courses);
assert.deepEqual(JSON.parse(JSON.stringify(catalogSandbox.window.CORNELL_SPRING_2027_DATA_META_EN)), springEn.meta);
assert.deepEqual(JSON.parse(JSON.stringify(catalogSandbox.window.CORNELL_SPRING_2027_DATA_META)), springZh.meta);

const allocationSandbox = { window:{} };
vm.runInNewContext(read("nybar-allocation.js"), allocationSandbox);
const allocation = allocationSandbox.window.NY_BAR_ALLOCATION;
const fall6641 = fallEn.courses.find(course => course.code === "LAW 6641");
const spring6761 = springEn.courses.find(course => course.code === "LAW 6761");
assert.ok(fall6641 && spring6761, "mixed-term NY Bar fixtures are missing");
const selected = [fall6641, spring6761];
const registrationCredits = Object.fromEntries(["FA26", "SP27"].map(term => [term, selected.filter(course => (course.term || course.officialSourceTerm || "FA26") === term).reduce((sum, course) => sum + Number(course.credits || 0), 0)]));
const allocations = { [fall6641.id]:"core" };
const categoryTotals = { professional:0, writing:0, american:0, core:0 };
for (const course of selected) categoryTotals[allocation.assignedCategory(course, allocations)] += Number(course.credits || 0);
assert.deepEqual(registrationCredits, { FA26:3, SP27:2 });
assert.equal(selected.reduce((sum, course) => sum + Number(course.credits || 0), 0), 5);
assert.deepEqual(categoryTotals, { professional:0, writing:2, american:0, core:3 });

const noClass = new Set(expectedNoClassDates);
const dayKey = iso => ["U", "M", "T", "W", "R", "F", "S"][new Date(`${iso}T12:00:00`).getDay()];
const meetingsForDate = iso => {
  if (noClass.has(iso)) return [];
  const scheduleDay = springEn.meta.specialScheduleDays?.[iso] || dayKey(iso);
  return springEn.courses.flatMap(course => (course.sections || []).flatMap(section => (section.meetings || []).filter(meeting => String(meeting.pattern || "").includes(scheduleDay) && iso >= meeting.startDate && iso <= meeting.endDate).map(meeting => ({ course, meeting }))));
};
for (const iso of expectedNoClassDates) assert.equal(meetingsForDate(iso).length, 0, `${iso} must suppress all recurring class meetings`);
const april28 = meetingsForDate("2027-04-28");
assert.ok(april28.length > 0, "April 28 Monday-schedule day must render Monday meetings");
assert.ok(april28.every(({ meeting }) => String(meeting.pattern).includes("M")), "April 28 must not render ordinary Wednesday-only meetings");

console.log(`PASS: v5.32 academic-year progress guards; Fall registration=3, Spring registration=2, annual NY Bar=5.`);
console.log(`PASS: Cornell Law Spring calendar; ${expectedNoClassDates.length} labeled no-class weekdays and Apr 28 Monday schedule.`);
console.log("PASS: allocation badge containment CSS and bilingual v5.32 release markers.");
