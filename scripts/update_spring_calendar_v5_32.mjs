import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const oldStart = "2027-01-25";
const oldEnd = "2027-05-11";
const instructionStart = "2027-01-19";
const instructionEnd = "2027-04-28";
const examEnd = "2027-05-14";
const academicCalendarUrl = "https://community.lawschool.cornell.edu/academics/2026-27-academic-calendar/";
const noClassDates = ["2027-01-18", "2027-02-15", "2027-02-16", "2027-03-29", "2027-03-30", "2027-03-31", "2027-04-01", "2027-04-02"];
const calendarPeriods = [
  { start:"2027-01-18", end:"2027-01-18", type:"holiday", noClass:true, labelEn:"Martin Luther King, Jr. Holiday", labelZh:"马丁·路德·金纪念日" },
  { start:"2027-02-15", end:"2027-02-16", type:"break", noClass:true, labelEn:"February Break", labelZh:"二月假期" },
  { start:"2027-03-29", end:"2027-04-02", type:"break", noClass:true, labelEn:"Spring Break", labelZh:"春假" }
];
const specialScheduleDays = { "2027-04-28":"M" };
const files = [
  { json:"cornell-law-spring-2027.zh-CN.json", js:"cornell.catalog.spring-2027.zh-CN.js", courseGlobal:"CORNELL_SPRING_2027_COURSE_CATALOG", metaGlobal:"CORNELL_SPRING_2027_DATA_META" },
  { json:"cornell-law-spring-2027.en.json", js:"cornell.catalog.spring-2027.en.js", courseGlobal:"CORNELL_SPRING_2027_COURSE_CATALOG_EN", metaGlobal:"CORNELL_SPRING_2027_DATA_META_EN" }
];

function updateRegularDateEnvelope(item) {
  const status = item.scheduleDateStatus || "";
  if (item.startDate !== oldStart || item.endDate !== oldEnd || status === "current-course-offerings-specific-date") return 0;
  item.startDate = instructionStart;
  item.endDate = instructionEnd;
  item.scheduleDateStatus = "regular-spring-term";
  return 1;
}

const results = [];
for (const file of files) {
  const jsonPath = path.join(dataDir, file.json);
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  Object.assign(payload.meta, {
    instructionStart,
    instructionEnd,
    examEnd,
    noClassDates,
    calendarPeriods,
    specialScheduleDays,
    academicCalendarUrl,
    academicCalendarScope:"Cornell Law JD and Ithaca LL.M. 2026-27 academic calendar",
    academicCalendarCheckedAt:"2026-08-26"
  });
  let sectionsUpdated = 0;
  let meetingsUpdated = 0;
  for (const course of payload.courses) {
    for (const section of course.sections || []) {
      sectionsUpdated += updateRegularDateEnvelope(section);
      for (const meeting of section.meetings || []) meetingsUpdated += updateRegularDateEnvelope(meeting);
    }
  }
  if (!sectionsUpdated || !meetingsUpdated) throw new Error(`${file.json}: no regular Spring date envelopes were updated.`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  const jsPath = path.join(dataDir, file.js);
  fs.writeFileSync(jsPath, `window.${file.courseGlobal} = ${JSON.stringify(payload.courses)};\nwindow.${file.metaGlobal} = ${JSON.stringify(payload.meta)};\n`);
  const sandbox = { window:{} };
  vm.runInNewContext(fs.readFileSync(jsPath, "utf8"), sandbox, { filename:file.js });
  if (JSON.stringify(sandbox.window[file.courseGlobal]) !== JSON.stringify(payload.courses)) throw new Error(`${file.js}: course global mismatch.`);
  if (JSON.stringify(sandbox.window[file.metaGlobal]) !== JSON.stringify(payload.meta)) throw new Error(`${file.js}: metadata global mismatch.`);
  results.push({ file:file.json, sectionsUpdated, meetingsUpdated });
}

if (results[0].sectionsUpdated !== results[1].sectionsUpdated || results[0].meetingsUpdated !== results[1].meetingsUpdated) {
  throw new Error("English and Chinese Spring calendar updates differ.");
}
console.log(JSON.stringify({ instructionStart, instructionEnd, examEnd, noClassDates, specialScheduleDays, results }, null, 2));
