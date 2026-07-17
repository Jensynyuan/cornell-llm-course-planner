import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const rosterHtmlPath = process.argv[2];
if (!rosterHtmlPath) throw new Error("Usage: node scripts/refresh_cornell_fa26_roster_data.mjs <saved-FA26-LAW-roster.html>");

const decode = value => String(value || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;/gi, "'").replace(/&quot;/gi, '"').replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const readJson = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const writeJson = (file, value) => fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const iso = value => {
  const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : "";
};
const time = value => {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})(AM|PM)/i);
  if (!match) return "";
  let hour = Number(match[1]);
  if (/PM/i.test(match[3]) && hour !== 12) hour += 12;
  if (/AM/i.test(match[3]) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};
const componentZh = { LEC:"讲授课", DIS:"讨论课", SEM:"研讨课", CLN:"诊所", LAB:"实验课", IND:"独立研究", PRC:"实践课" };
const componentEn = { LEC:"Lecture", DIS:"Discussion", SEM:"Seminar", CLN:"Clinic", LAB:"Laboratory", IND:"Independent Study", PRC:"Practicum" };
const gradingZh = value => {
  const text = String(value || "").trim(); const low = text.toLowerCase();
  if (low.includes("letter grades only") || low === "graded") return "仅字母等级评分";
  if (low.includes("satisfactory/unsatisfactory") || low.includes("s/u")) return "合格／不合格（S/U）";
  if (low.includes("student option") || low.includes("letter or satisfactory")) return "学生可选字母等级或合格／不合格（S/U）";
  return text || "评分方式未公布";
};
const consentZh = raw => {
  if (!raw || raw.addConsent === "N") return "";
  if (raw.addConsent === "D") return "需院系同意";
  if (raw.addConsent === "I") return "需任课教师同意";
  return raw.addConsentDescr ? String(raw.addConsentDescr).replace(/Required/gi, "Required") : "需学校同意";
};
const consentEn = raw => raw?.addConsent && raw.addConsent !== "N" ? (raw.addConsentDescr || "Consent required") : "";
const instructors = section => [...new Set((section.meetings || []).flatMap(meeting => meeting.instructors || []).map(person => [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ").trim()).filter(Boolean))];

const rosterHtml = fs.readFileSync(rosterHtmlPath, "utf8");
const htmlLocations = new Map();
for (const chunk of rosterHtml.split(/<li class="class-numbers">/i).slice(1)) {
  const classNumber = chunk.match(/data-content="(\d+)"/i)?.[1];
  const location = chunk.match(/class="facility-search"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
  if (classNumber && location) htmlLocations.set(classNumber, decode(location));
}

const apiUrl = "https://classes.cornell.edu/api/2.0/search/classes.json?roster=FA26&subject=LAW";
const response = await fetch(apiUrl, { headers:{ Accept:"application/json", "User-Agent":"Cornell-LLM-Course-Planner-v5.13-roster-refresh" } });
if (!response.ok) throw new Error(`Cornell API returned ${response.status}`);
const payload = await response.json();
const apiCourses = payload.data?.classes || [];
const apiByCode = new Map(apiCourses.map(course => [`${course.subject} ${course.catalogNbr}`, course]));

function normalizedSections(course, apiCourse, language) {
  const sections = [];
  for (const group of apiCourse.enrollGroups || []) {
    const required = new Set(group.componentsRequired || []);
    const components = new Set((group.classSections || []).map(section => section.ssrComponent || "").filter(Boolean));
    const multipleRequiredComponents = components.size > 1 && required.size > 1;
    const groupGrading = group.gradingBasisLong || group.gradingBasisShort || "";
    for (const raw of group.classSections || []) {
      const component = raw.ssrComponent || "";
      const classNumber = String(raw.classNbr || "");
      const location = htmlLocations.get(classNumber) || "";
      const labelRoot = language === "en" ? (componentEn[component] || raw.ssrComponentLong || component || "Section") : (componentZh[component] || raw.ssrComponentLong || component || "班次");
      const consent = consentZh(raw);
      const meetings = (raw.meetings || []).map(meeting => ({
        pattern:String(meeting.pattern || "").replace(/[^MTWRF]/g, ""), start:time(meeting.timeStart), end:time(meeting.timeEnd),
        startDate:iso(meeting.startDt || raw.startDt || group.sessionBeginDt), endDate:iso(meeting.endDt || raw.endDt || group.sessionEndDt),
        location, locationZh:location, locationStatus:location ? "published" : "unpublished", locationSource:location ? "Cornell FA26 roster HTML" : "", campusZh:"Ithaca主校区或课程指定校区"
      })).filter(meeting => meeting.start && meeting.end);
      sections.push({
        id:`${course.id}-${classNumber || `${component}-${raw.section || sections.length + 1}`}`,
        label:`${labelRoot}${raw.section || ""}`, classNumber, component, componentLabel:raw.ssrComponentLong || componentEn[component] || component,
        startDate:iso(raw.startDt || group.sessionBeginDt), endDate:iso(raw.endDt || group.sessionEndDt), meetings,
        instructors:instructors(raw), instructionMode:raw.instrModeDescr || "", campusZh:"Ithaca主校区或课程指定校区",
        location, locationZh:location, locationStatus:location ? "published" : "unpublished", locationSource:location ? "Cornell FA26 roster HTML" : "",
        notes:raw.notes || [], grading:groupGrading, gradingZh:gradingZh(groupGrading), addConsent:raw.addConsent || "N", addConsentDescr:raw.addConsentDescr || "", consentZh:consent, consentEn:consentEn(raw),
        selectionGroup:multipleRequiredComponents ? component.toLowerCase() : "", selectionGroupLabel:multipleRequiredComponents ? (language === "en" ? `${componentEn[component] || component} (choose one)` : `${componentZh[component] || component}（选择一节）`) : "", selectionRequired:multipleRequiredComponents ? required.has(component) : true, selectionMax:1
      });
    }
  }
  return sections;
}

function updateDataset(file, language) {
  const data = readJson(file); let matchedCourses = 0; let matchedSections = 0; let locatedSections = 0; let consentCourses = 0;
  data.courses = data.courses.map(course => {
    const apiCourse = apiByCode.get(course.code);
    if (!apiCourse) return course;
    matchedCourses += 1;
    const sections = normalizedSections(course, apiCourse, language);
    matchedSections += sections.length;
    locatedSections += sections.filter(section => section.location).length;
    const gradingValues = [...new Set(sections.map(section => section.grading).filter(Boolean))];
    const consentValues = [...new Set(sections.map(section => section.consentZh).filter(Boolean))];
    if (consentValues.length) consentCourses += 1;
    const allNeedConsent = sections.length > 0 && sections.every(section => section.addConsent && section.addConsent !== "N");
    const departmentOnly = allNeedConsent && sections.every(section => section.addConsent === "D");
    const grading = gradingValues.length === 1 ? gradingValues[0] : (gradingValues.length ? "Multiple grading options; see selected section" : course.grading || "");
    return {
      ...course,
      credits:Number(apiCourse.enrollGroups?.[0]?.unitsMaximum ?? course.credits),
      creditText:apiCourse.enrollGroups?.[0]?.unitsMaximum ? `${apiCourse.enrollGroups[0].unitsMaximum} Credits` : course.creditText,
      officialTitleEn:apiCourse.titleLong || apiCourse.titleShort || course.officialTitleEn,
      officialDescriptionEn:apiCourse.description || course.officialDescriptionEn,
      grading, gradingZh:gradingZh(grading), sections,
      instructors:[...new Set(sections.flatMap(section => section.instructors || []))],
      registrationConsentZh:consentValues.join("；"), registrationConsentEn:[...new Set(sections.map(section => section.consentEn).filter(Boolean))].join("; "),
      eligibility:course.eligibility === "open" && allNeedConsent ? (departmentOnly ? "department" : "permission") : course.eligibility,
      officialDataStatus:"offered-current-term", officialSourceTerm:"FA26", officialRosterLastChecked:new Date().toISOString(),
      rosterDataSources:{ api:apiUrl, locations:"saved official FA26 subject HTML by class number" }
    };
  });
  data.meta ||= {};
  return { data, audit:{ matchedCourses, matchedSections, locatedSections, consentCourses, unmatchedDatasetCourses:data.courses.filter(course => !apiByCode.has(course.code)).map(course => course.code) } };
}

const zh = updateDataset("cornell-law-2026-27.zh-CN.json", "zh");
const en = updateDataset("cornell-law-2026-27.en.json", "en");
const audit = {
  generatedAt:new Date().toISOString(), sourceHtml:path.resolve(rosterHtmlPath), sourceUrl:"https://classes.cornell.edu/browse/roster/FA26/subject/LAW", apiUrl,
  apiCourseCount:apiCourses.length, htmlLocationRecords:htmlLocations.size, zh:zh.audit, en:en.audit,
  note:"Only current Cornell API fields and concrete room names present in the saved official FA26 LAW roster HTML were written. No course was deleted; an API-unmatched record remains unchanged and is listed above."
};
zh.data.meta.fa26RosterDetailRefresh = audit;
en.data.meta.fa26RosterDetailRefresh = audit;
writeJson("cornell-law-2026-27.zh-CN.json", zh.data);
writeJson("cornell-law-2026-27.en.json", en.data);
writeJson("cornell-fa26-roster-detail-refresh.v5.13.json", audit);
fs.writeFileSync(path.join(dataDir, "cornell.catalog.zh-CN.js"), `window.CORNELL_COURSE_CATALOG = ${JSON.stringify(zh.data.courses)};\nwindow.CORNELL_DATA_META = ${JSON.stringify(zh.data.meta)};\n`, "utf8");
fs.writeFileSync(path.join(dataDir, "cornell.catalog.en.js"), `window.CORNELL_COURSE_CATALOG_EN = ${JSON.stringify(en.data.courses)};\nwindow.CORNELL_DATA_META_EN = ${JSON.stringify(en.data.meta)};\n`, "utf8");
console.log(JSON.stringify(audit, null, 2));
