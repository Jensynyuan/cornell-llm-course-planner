import { readFile, writeFile } from "node:fs/promises";

const root = new URL("..\\", import.meta.url);
const apiUrl = "https://classes.cornell.edu/api/2.0/search/classes.json?roster=FA26&subject=LAW&acadCareer[]=LA&acadGroup[]=LA";
const componentZh = { LEC:"讲授课", DIS:"讨论课", SEM:"研讨课", CLN:"诊所", LAB:"实验课", IND:"独立研究", PRC:"实践课" };
const componentEn = { LEC:"Lecture", DIS:"Discussion", SEM:"Seminar", CLN:"Clinic", LAB:"Laboratory", IND:"Independent Study", PRC:"Practicum" };

function iso(value) {
  const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : "";
}
function time(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})(AM|PM)/i);
  if (!match) return "";
  let hour = Number(match[1]); if (/PM/i.test(match[3]) && hour !== 12) hour += 12; if (/AM/i.test(match[3]) && hour === 12) hour = 0;
  return `${String(hour).padStart(2,"0")}:${match[2]}`;
}
function instructors(section) {
  return [...new Set((section.meetings || []).flatMap(meeting => meeting.instructors || []).map(item => [item.firstName,item.middleName,item.lastName].filter(Boolean).join(" ").trim()).filter(Boolean))];
}
function priorLocations(course) {
  const map = new Map();
  for (const section of course.sections || []) {
    const location = section.location || section.locationZh || section.meetings?.find(meeting => meeting.location || meeting.locationZh)?.location || "";
    if (location) map.set(String(section.classNumber || ""), location);
  }
  return map;
}
function normalizeSections(course, apiClass, language) {
  const prior = priorLocations(course); const sections = [];
  for (const group of apiClass.enrollGroups || []) {
    const required = new Set(group.componentsRequired || []);
    const components = new Set((group.classSections || []).map(section => section.ssrComponent || ""));
    const needsComponentGroups = components.size > 1 && required.size > 1;
    for (const raw of group.classSections || []) {
      const component = raw.ssrComponent || "";
      const meetings = (raw.meetings || []).map(meeting => ({
        pattern:String(meeting.pattern || "").replace(/[^MTWRF]/g, ""), start:time(meeting.timeStart), end:time(meeting.timeEnd),
        startDate:iso(meeting.startDt || raw.startDt || group.sessionBeginDt), endDate:iso(meeting.endDt || raw.endDt || group.sessionEndDt),
        location:prior.get(String(raw.classNbr || "")) || "", locationStatus:prior.has(String(raw.classNbr || "")) ? "published" : "unpublished", campusZh:"Ithaca主校区或课程指定校区"
      })).filter(meeting => meeting.start && meeting.end);
      const labelBase = language === "en" ? (componentEn[component] || raw.ssrComponentLong || component || "Section") : (componentZh[component] || raw.ssrComponentLong || component || "班次");
      sections.push({
        id:`${course.id}-${raw.classNbr || `${component}-${raw.section || sections.length+1}`}`, label:`${labelBase}${raw.section || ""}`, classNumber:String(raw.classNbr || ""),
        startDate:iso(raw.startDt || group.sessionBeginDt), endDate:iso(raw.endDt || group.sessionEndDt), meetings, instructors:instructors(raw),
        instructionMode:raw.instrModeDescr || "", campusZh:"Ithaca主校区或课程指定校区", location:prior.get(String(raw.classNbr || "")) || "", locationStatus:prior.has(String(raw.classNbr || "")) ? "published" : "unpublished", notes:raw.notes || [],
        selectionGroup:needsComponentGroups ? component.toLowerCase() : "", selectionGroupLabel:needsComponentGroups ? (language === "en" ? `${componentEn[component] || component} (choose one)` : `${componentZh[component] || component}（选择一节）`) : "", selectionRequired:needsComponentGroups ? required.has(component) : true, selectionMax:1
      });
    }
  }
  return sections;
}
async function load(relative) { return JSON.parse(await readFile(new URL(relative, root), "utf8")); }
async function save(relative, value) { await writeFile(new URL(relative, root), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
async function updateDataset(relative, language, byCode) {
  const data = await load(relative); let hydrated = 0;
  for (const course of data.courses) {
    const apiClass = byCode.get(course.code); if (!apiClass) continue;
    const sections = normalizeSections(course, apiClass, language);
    if (sections.length) hydrated += 1;
    course.sections = sections;
    course.instructors = [...new Set(sections.flatMap(section => section.instructors || []))];
    course.grading = apiClass.enrollGroups?.[0]?.gradingBasisLong || course.grading;
    course.officialRosterLastChecked = new Date().toISOString();
  }
  data.releaseVersion = "v5.9";
  data.scheduleHydration = { apiUrl, checkedAt:new Date().toISOString(), note:"All currently published FA26 class sections and meeting times are hydrated directly from the Cornell roster API; concrete rooms are retained only when present in the saved official roster HTML." };
  await save(relative, data);
  return hydrated;
}
async function writeCatalog(jsonRelative, jsRelative, catalogName, metaName) {
  const data = await load(jsonRelative); const meta = { ...(data.meta || {}), releaseVersion:"v5.9", appVersion:"5.9", catalogCourseCount:data.courses.length, scheduleHydration:data.scheduleHydration };
  await writeFile(new URL(jsRelative, root), `window.${catalogName} = ${JSON.stringify(data.courses)};\nwindow.${metaName} = ${JSON.stringify(meta)};\n`, "utf8");
}

const response = await fetch(apiUrl); if (!response.ok) throw new Error(`Cornell API ${response.status}`);
const payload = await response.json(); const apiCourses = payload.data?.classes || [];
const byCode = new Map(apiCourses.map(item => [`${item.subject} ${item.catalogNbr}`, item]));
const zh = await updateDataset("data/cornell-law-2026-27.zh-CN.json", "zh", byCode);
const en = await updateDataset("data/cornell-law-2026-27.en.json", "en", byCode);
await writeCatalog("data/cornell-law-2026-27.zh-CN.json", "data/cornell.catalog.zh-CN.js", "CORNELL_COURSE_CATALOG", "CORNELL_DATA_META");
await writeCatalog("data/cornell-law-2026-27.en.json", "data/cornell.catalog.en.js", "CORNELL_COURSE_CATALOG_EN", "CORNELL_DATA_META_EN");
console.log(JSON.stringify({ apiCourses:apiCourses.length, zhHydrated:zh, enHydrated:en }, null, 2));
