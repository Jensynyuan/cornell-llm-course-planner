import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const rosterHtmlPath = process.argv[2];
if (!rosterHtmlPath) throw new Error("Usage: node scripts/audit_cornell_fa26_integrity.mjs <saved-FA26-LAW-roster.html>");

const readJson = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const normalizeTime = value => {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})(AM|PM)/i);
  if (!match) return "";
  let hour = Number(match[1]);
  if (/PM/i.test(match[3]) && hour !== 12) hour += 12;
  if (/AM/i.test(match[3]) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};
const isoDate = value => {
  const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : "";
};
const instructorNames = section => [...new Set((section.meetings || []).flatMap(meeting => meeting.instructors || []).map(person => [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ").trim()).filter(Boolean))].sort();
const decode = value => String(value || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const catalog = file => {
  const context = { window:{} };
  vm.runInNewContext(fs.readFileSync(path.join(dataDir, file), "utf8"), context);
  return file.includes(".en.") ? context.window.CORNELL_COURSE_CATALOG_EN : context.window.CORNELL_COURSE_CATALOG;
};
const courseCode = apiCourse => `${apiCourse.subject} ${apiCourse.catalogNbr}`;
const expectedCore = ["LAW 5001","LAW 5021","LAW 5041","LAW 5151","LAW 6007","LAW 6011","LAW 6131","LAW 6263","LAW 6401","LAW 6641","LAW 6801","LAW 6941","LAW 7169"].sort();

const html = fs.readFileSync(rosterHtmlPath, "utf8");
const htmlLocations = new Map();
for (const chunk of html.split(/<li class="class-numbers">/i).slice(1)) {
  const classNumber = chunk.match(/data-content="(\d+)"/i)?.[1];
  const location = chunk.match(/class="facility-search"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
  if (classNumber && location) htmlLocations.set(classNumber, decode(location));
}

const response = await fetch("https://classes.cornell.edu/api/2.0/search/classes.json?roster=FA26&subject=LAW", { headers:{ Accept:"application/json" } });
if (!response.ok) throw new Error(`Cornell API returned ${response.status}`);
const apiPayload = await response.json();
const apiCourses = apiPayload.data?.classes || [];
const apiByCode = new Map(apiCourses.map(course => [courseCode(course), course]));

const zh = readJson("cornell-law-2026-27.zh-CN.json").courses;
const en = readJson("cornell-law-2026-27.en.json").courses;
const zhCatalog = catalog("cornell.catalog.zh-CN.js");
const enCatalog = catalog("cornell.catalog.en.js");
const datasetCodes = new Set(zh.map(course => course.code));
const mismatch = { code:[], title:[], description:[], credits:[], sections:[], meetings:[], grading:[], instructors:[], consent:[], instructionMode:[], location:[], sourceUrl:[] };

for (const course of zh) {
  const apiCourse = apiByCode.get(course.code);
  if (!apiCourse) { mismatch.code.push(course.code); continue; }
  const group = apiCourse.enrollGroups?.[0] || {};
  if ((apiCourse.titleLong || apiCourse.titleShort || "") !== course.officialTitleEn) mismatch.title.push(course.code);
  if (String(apiCourse.description || "") !== String(course.officialDescriptionEn || "")) mismatch.description.push(course.code);
  if (Number(group.unitsMaximum ?? course.credits) !== Number(course.credits)) mismatch.credits.push(course.code);
  if (course.sourceUrl !== `https://classes.cornell.edu/browse/roster/FA26/class/LAW/${apiCourse.catalogNbr}`) mismatch.sourceUrl.push(course.code);
  const apiSections = new Map((apiCourse.enrollGroups || []).flatMap(groupItem => (groupItem.classSections || []).map(section => [String(section.classNbr), { section, grading:groupItem.gradingBasisLong || groupItem.gradingBasisShort || "" }])));
  for (const section of course.sections || []) {
    const liveRecord = apiSections.get(String(section.classNumber));
    if (!liveRecord) { mismatch.sections.push(`${course.code}#${section.classNumber}`); continue; }
    const { section:live, grading:expectedGrading } = liveRecord;
    if (expectedGrading && section.grading !== expectedGrading) mismatch.grading.push(`${course.code}#${section.classNumber}`);
    if (JSON.stringify((section.instructors || []).slice().sort()) !== JSON.stringify(instructorNames(live))) mismatch.instructors.push(`${course.code}#${section.classNumber}`);
    if ((section.addConsent || "N") !== (live.addConsent || "N")) mismatch.consent.push(`${course.code}#${section.classNumber}`);
    if (String(section.instructionMode || "") !== String(live.instrModeDescr || "")) mismatch.instructionMode.push(`${course.code}#${section.classNumber}`);
    const actualMeetings = (section.meetings || []).map(meeting => `${meeting.pattern}|${meeting.start}|${meeting.end}|${meeting.startDate}|${meeting.endDate}`).sort();
    const liveMeetings = (live.meetings || []).map(meeting => `${String(meeting.pattern || "").replace(/[^MTWRF]/g, "")}|${normalizeTime(meeting.timeStart)}|${normalizeTime(meeting.timeEnd)}|${isoDate(meeting.startDt || live.startDt)}|${isoDate(meeting.endDt || live.endDt)}`).filter(value => !value.startsWith("||")).sort();
    if (JSON.stringify(actualMeetings) !== JSON.stringify(liveMeetings)) mismatch.meetings.push(`${course.code}#${section.classNumber}`);
    const htmlLocation = htmlLocations.get(String(section.classNumber));
    if (htmlLocation && section.location !== htmlLocation) mismatch.location.push(`${course.code}#${section.classNumber}`);
  }
}

const excluded = apiCourses.filter(course => !datasetCodes.has(courseCode(course))).map(course => ({ code:courseCode(course), academicCareer:course.acadCareer, enrollmentPriority:course.catalogEnrollmentPriority || "" }));
const core = zh.filter(course => (course.barCategories || []).includes("core")).map(course => course.code).sort();
const report = {
  generatedAt:new Date().toISOString(),
  officialApiCourseCount:apiCourses.length,
  plannerCourseCount:zh.length,
  plannerSectionCount:zh.reduce((sum, course) => sum + (course.sections || []).length, 0),
  htmlLocationRecords:htmlLocations.size,
  excludedFromPlanner:excluded,
  expectedExclusionsAreUndergraduateOnly:excluded.every(item => item.academicCareer === "UG" && /undergraduates/i.test(item.enrollmentPriority)),
  chineseEnglishCodeSetMatches:JSON.stringify(zh.map(course => course.code).sort()) === JSON.stringify(en.map(course => course.code).sort()),
  chineseCatalogMatchesDataset:JSON.stringify(zh) === JSON.stringify(zhCatalog),
  englishCatalogMatchesDataset:JSON.stringify(en) === JSON.stringify(enCatalog),
  nyBarCoreCodes:core,
  nyBarCoreMatchesOfficialFallList:JSON.stringify(core) === JSON.stringify(expectedCore),
  officialDescriptionsUnavailable:zh.filter(course => !String(course.officialDescriptionEn || "").trim()).map(course => course.code),
  mismatch,
  passed:Object.values(mismatch).every(values => values.length === 0)
};
fs.writeFileSync(path.join(dataDir, "cornell-fa26-integrity-audit.v5.15.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.passed || !report.expectedExclusionsAreUndergraduateOnly || !report.chineseEnglishCodeSetMatches || !report.chineseCatalogMatchesDataset || !report.englishCatalogMatchesDataset || !report.nyBarCoreMatchesOfficialFallList) process.exitCode = 1;
