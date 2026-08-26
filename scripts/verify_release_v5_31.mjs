import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

await import("./verify_spring_2027_data_v5_31.mjs");
await import("./verify_calendar_integration.mjs");
await import("./verify_nybar_allocation.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const json = file => JSON.parse(read(path.join("data", file)));
const fail = message => { throw new Error(`v5.31 release check failed: ${message}`); };
const hasChinese = value => /[\u3400-\u9fff]/u.test(String(value || ""));
const placeholder = value => /暂无中文|尚无.*中文|中文.{0,8}待翻译|待补充|translation pending|no chinese translation/i.test(String(value || ""));
const genericAuxiliaryTranslation = value => /完整(?:申请材料|条件|中文内容).*(?:见本页|已并入)|已在本页.*完整列明|详见官方英文原文|完整条件已在简介/u.test(String(value || ""));
function hasAdjacentRepeatedSentenceBlock(value) {
  const sentences = String(value || "").split(/(?<=[.!?。！？])/u).map(sentence => sentence.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (let start = 0; start < sentences.length; start += 1) {
    for (let size = Math.floor((sentences.length - start) / 2); size >= 1; size -= 1) {
      const first = sentences.slice(start, start + size).join(" ");
      const second = sentences.slice(start + size, start + size * 2).join(" ");
      if (first.length >= 30 && first === second) return true;
    }
  }
  return false;
}

const fallZh = json("cornell-law-2026-27.zh-CN.json");
const fallEn = json("cornell-law-2026-27.en.json");
const springZh = json("cornell-law-spring-2027.zh-CN.json");
const springEn = json("cornell-law-spring-2027.en.json");
const index = read("index.html");
const app = read("app.js");
const styles = read("styles.css");
const calendar = read("calendar-integration.js");

if (!index.includes("LL.M. Course Planner v5.31") || !app.includes('const APP_VERSION = "v5.31"')) fail("v5.31 markers are missing");
if (!app.includes('const CURRENT_CORNELL_DATASET_VERSION = "v5.31"')) fail("stale Cornell import snapshots could still override the bundled v5.31 database");
if (!/parsed\?\.bundledDatabaseVersion !== CURRENT_CORNELL_DATASET_VERSION[\s\S]{0,160}removeItem\("llm-course-planner-cornell-import"\)/.test(app)) fail("startup must discard stale imported Cornell snapshots");
if (!/function languagePreferredLocation\(englishValue, chineseValue,[\s\S]*?isEnglish\(\)[\s\S]*?englishValue[\s\S]*?chineseValue/.test(app) || !app.includes("languagePreferredLocation(meeting?.location, meeting?.locationZh")) fail("course locations must prefer the active interface language");
for (const marker of ['["官方未公布具体地点", "Teaching location not published"]', '["班次地点不同，请查看具体班次", "Location varies by section; see section details"]']) if (!app.includes(marker)) fail(`English location placeholder mapping is missing: ${marker}`);
if (!/function isPendingLocation\(value\)[\s\S]*?未公布\|待公布[\s\S]*?location varies by section\|班次地点不同/.test(app) || !app.includes('const validLocation = isPendingLocation(locationText) ? "" : locationText')) fail("bilingual unpublished locations must be excluded from maps and calendar export");
if (!/function toggleLanguage\(\)[\s\S]*?courses = bundledCornellCourses\(\)[\s\S]*?applyLocalCourseEdits\(\);[\s\S]*?renderSchoolIdentity\(\)/.test(app)) fail("language switching must preserve local course overrides and custom courses");
if (fallZh.courses.length !== 136 || fallEn.courses.length !== 136) fail("Fall bilingual catalogs must remain 136/136");
if (fallZh.courses.map(course => course.id).join("|") !== fallEn.courses.map(course => course.id).join("|")) fail("Fall bilingual offering order must match");
if (fallZh.courses.flatMap(course => course.sections || []).map(section => section.id).join("|") !== fallEn.courses.flatMap(course => course.sections || []).map(section => section.id).join("|")) fail("Fall bilingual section order must match");
for (const dataset of [fallZh, fallEn]) {
  const law7202 = dataset.courses.find(course => course.code === "LAW 7202");
  const law7259 = dataset.courses.find(course => course.code === "LAW 7259");
  if (!law7202 || law7202.credits !== 1 || law7202.classNumber !== "19470") fail("LAW 7202 must remain class 19470 for one credit");
  if (!law7259 || law7259.credits !== 1 || law7259.classNumber !== "19463") fail("LAW 7259 must remain class 19463 for one credit");
}
if (springZh.courses.length !== 127 || springEn.courses.length !== 127) fail(`Spring bilingual catalogs must contain the 127 current eligible offerings, found ${springZh.courses.length}/${springEn.courses.length}`);
if (springZh.meta.courseCount !== 127 || springEn.meta.courseCount !== 127) fail("Spring metadata must report 127 courses");
if (springZh.meta.sectionCount !== 146 || springEn.meta.sectionCount !== 146) fail("Spring metadata must report 146 current sections");
for (const dataset of [springZh, springEn]) {
  if (dataset.meta.componentCoverage?.sectionsWithComponent !== 146 || dataset.meta.componentCoverage?.sectionCount !== 146) fail("all 146 Spring sections must have a structured component");
  if (dataset.meta.descriptionCoverage?.currentOfficial !== 126 || dataset.meta.descriptionCoverage?.explicitOfficialNoDescription !== 1 || dataset.meta.descriptionCoverage?.total !== 127) fail("Spring description provenance coverage must remain 126 current official plus one explicit official-no-description status");
  const translated = dataset.meta.translationCoverage || {};
  for (const field of ["titleZh", "descriptionZh", "restrictionZh", "prerequisitesZh", "gradingZh"]) if (translated[field] !== 127) fail(`Spring translation coverage for ${field} must be 127/127`);
  if (translated.total !== 127 || translated.batch1Count !== 64 || translated.batch2Count !== 63) fail("Spring translation batches must cover all 127 courses exactly once");
}

const combined = [...fallEn.courses, ...springEn.courses];
if (combined.length !== 263) fail("combined Cornell catalog must contain 263 term-specific offerings");
if (new Set(combined.map(course => course.id)).size !== 263) fail("combined offering IDs must be unique across terms");
const fallCodes = new Set(fallEn.courses.map(course => course.code));
const overlap = springEn.courses.filter(course => fallCodes.has(course.code));
if (overlap.length !== 48) fail(`expected 48 course codes offered in both terms, found ${overlap.length}`);
if (!fallEn.courses.some(course => course.code === "LAW 6641") || !springEn.courses.some(course => course.code === "LAW 6641")) fail("LAW 6641 must remain separate Fall and Spring offerings");

const excludedCodes = ["LAW 4013", "LAW 4051", "LAW 4081", "LAW 4131", "LAW 4330", "LAW 6332"];
for (const code of excludedCodes) if (springEn.courses.some(course => course.code === code)) fail(`${code} must remain excluded from the LL.M. planning catalog`);
for (const dataset of [springZh, springEn]) {
  const recorded = new Set((dataset.meta.excludedCourses || []).map(course => course.code));
  if (excludedCodes.some(code => !recorded.has(code))) fail("Spring exclusion audit list is incomplete");
}
const law7028 = springEn.courses.find(course => course.code === "LAW 7028");
if (!law7028 || !/ll\.?m/i.test(`${law7028.restrictionEn || ""} ${law7028.officialDescriptionEn || ""} ${law7028.additionalInformationEn || ""}`)) fail("new official LAW 7028 offering and its LL.M. eligibility evidence are required");

const expectedSpringCategories = new Map([
  ["LAW 5061", ["core"]], ["LAW 5121", ["core"]], ["LAW 6011", ["core"]], ["LAW 6131", ["core"]],
  ["LAW 6203", ["core"]], ["LAW 6264", ["core"]], ["LAW 6401", ["core"]], ["LAW 6431", ["core"]],
  ["LAW 6641", ["professional", "core"]], ["LAW 6761", ["writing"]]
]);
for (const dataset of [springZh, springEn]) {
  for (const [code, categories] of expectedSpringCategories) {
    const course = dataset.courses.find(item => item.code === code);
    if (!course || JSON.stringify(course.barCategories) !== JSON.stringify(categories) || course.barClassroomEligible !== true) fail(`${code} Spring NY Bar categories or classroom eligibility are incorrect`);
  }
  if (dataset.courses.filter(course => course.barCategories?.length).length !== 10) fail("Spring must contain exactly 10 actually offered NY Bar memo-category courses");
  const law6264 = dataset.courses.find(course => course.code === "LAW 6264");
  if (law6264?.credits !== 2 || !/memo.*3|3.*memo/i.test(`${law6264?.barEvidence?.note || ""} ${law6264?.barEvidence?.noteZh || ""}`)) fail("LAW 6264 must preserve the current two-credit offering and the memo/current-offering conflict evidence");
}

const enById = new Map(springEn.courses.map(course => [course.id, course]));
const zhById = new Map(springZh.courses.map(course => [course.id, course]));
if (enById.size !== 127 || zhById.size !== 127 || [...enById.keys()].some(id => !zhById.has(id))) fail("Spring bilingual course IDs must match exactly");

for (const [id, enCourse] of enById) {
  const zhCourse = zhById.get(id);
  if (!hasChinese(zhCourse.titleZh) || placeholder(zhCourse.titleZh)) fail(`${enCourse.code} lacks a real Chinese title`);
  const hasOfficialDescription = Boolean(String(enCourse.officialDescriptionEn || "").trim());
  const hasExplicitNoDescriptionStatus = enCourse.officialDescriptionStatus === "official-no-description" && enCourse.descriptionStatus === "not-published" && /do not publish a course description/i.test(String(enCourse.descriptionEn || ""));
  if (!hasOfficialDescription && !hasExplicitNoDescriptionStatus) fail(`${enCourse.code} lacks an official English description or an explicit official no-description status`);
  if (!hasChinese(zhCourse.descriptionZh) || placeholder(zhCourse.descriptionZh)) fail(`${enCourse.code} lacks a real Chinese description`);
  if (hasAdjacentRepeatedSentenceBlock(enCourse.officialDescriptionEn) || hasAdjacentRepeatedSentenceBlock(zhCourse.descriptionZh)) fail(`${enCourse.code} contains an adjacent duplicated description block`);
  if (zhCourse.translationStatus !== "verified") fail(`${enCourse.code} Chinese translation is not marked verified`);
  for (const [field, value] of [["restrictionZh", zhCourse.restrictionZh], ["prerequisitesZh", zhCourse.prerequisitesZh]]) {
    if (!hasChinese(value) || placeholder(value) || genericAuxiliaryTranslation(value)) fail(`${enCourse.code} ${field} is missing, generic, or untranslated`);
  }
  if (hasAdjacentRepeatedSentenceBlock(enCourse.restrictionEn) || hasAdjacentRepeatedSentenceBlock(zhCourse.restrictionZh) || hasAdjacentRepeatedSentenceBlock(enCourse.prerequisitesEn) || hasAdjacentRepeatedSentenceBlock(zhCourse.prerequisitesZh)) fail(`${enCourse.code} contains duplicated restriction or prerequisite text`);
  if ((enCourse.additionalInformationEn || []).length !== (zhCourse.additionalInformationZh || []).length) fail(`${enCourse.code} bilingual additional-information counts differ`);
  for (const value of enCourse.additionalInformationEn || []) if (hasAdjacentRepeatedSentenceBlock(value)) fail(`${enCourse.code} has duplicated official additional information`);
  for (const value of zhCourse.additionalInformationZh || []) if (!hasChinese(value) || placeholder(value) || genericAuxiliaryTranslation(value) || hasAdjacentRepeatedSentenceBlock(value)) fail(`${enCourse.code} has missing, generic, or duplicated Chinese additional information`);
  if (!Array.isArray(enCourse.sections) || !enCourse.sections.length) fail(`${enCourse.code} has no Spring section records`);
  if (enCourse.sections.length !== zhCourse.sections.length) fail(`${enCourse.code} bilingual section counts differ`);
  const zhSections = new Map(zhCourse.sections.map(section => [section.id, section]));
  for (const section of enCourse.sections) {
    const zhSection = zhSections.get(section.id);
    if (!zhSection) fail(`${enCourse.code} section ${section.id} is missing from Chinese data`);
    if (!String(section.section || "").trim()) fail(`${enCourse.code} section number is missing`);
    if (!String(section.component || "").trim() || !String(section.componentLabel || "").trim()) fail(`${enCourse.code} section ${section.section} lacks component/course-format data`);
    if (!Array.isArray(section.instructors)) fail(`${enCourse.code} section ${section.section} instructors must be structured`);
    if (!Array.isArray(section.meetings)) fail(`${enCourse.code} section ${section.section} meetings must be structured`);
  }
}

const formatPatterns = new Map([
  ["lecture", /\bLEC\b|lecture|讲授课/i],
  ["seminar", /\bSEM\b|seminar|研讨课/i],
  ["clinic", /\bCLN\b|clinic|clinical|诊所/i],
  ["practicum", /\bPRA\b|\bPRC\b|\bFLD\b|practicum|field studies|实践课/i],
  ["discussion", /\bDIS\b|discussion|讨论课/i],
  ["independent", /\bIND\b|independent|directed (?:study|work)|独立研究/i]
]);
const formatCounts = Object.fromEntries([...formatPatterns].map(([format, pattern]) => [format, springEn.courses.filter(course => pattern.test(`${(course.courseFormats || []).join(" ")} ${course.courseFormat || ""} ${(course.sections || []).map(section => `${section.courseFormat || ""} ${section.component || ""} ${section.componentLabel || ""} ${section.label || ""}`).join(" ")}`)).length]));
if (formatCounts.lecture < 1) fail("Spring lecture filter would return zero courses");
for (const format of ["seminar", "clinic", "practicum", "independent"]) if (formatCounts[format] < 1) fail(`Spring ${format} filter would return zero courses`);
const expectedFormatCounts = { lecture:54, seminar:18, clinic:32, practicum:22, discussion:8, independent:1 };
for (const [format, expected] of Object.entries(expectedFormatCounts)) if (formatCounts[format] !== expected) fail(`Spring ${format} format count drifted: expected ${expected}, found ${formatCounts[format]}`);

const law6051En = enById.get("LAW-6051-SP27");
const law6051Zh = zhById.get("LAW-6051-SP27");
if (!law6051En || !law6051Zh || !hasChinese(law6051Zh.titleZh) || !hasChinese(law6051Zh.descriptionZh)) fail("LAW 6051 must have complete English and Chinese detail content");

const sandbox = { window:{} };
for (const file of ["cornell.catalog.zh-CN.js", "cornell.catalog.en.js", "cornell.catalog.spring-2027.zh-CN.js", "cornell.catalog.spring-2027.en.js"]) vm.runInNewContext(read(path.join("data", file)), sandbox);
for (const [globalName, expected] of [
  ["CORNELL_COURSE_CATALOG", fallZh.courses],
  ["CORNELL_COURSE_CATALOG_EN", fallEn.courses],
  ["CORNELL_SPRING_2027_COURSE_CATALOG", springZh.courses],
  ["CORNELL_SPRING_2027_COURSE_CATALOG_EN", springEn.courses]
]) {
  if (!Array.isArray(sandbox.window[globalName])) fail(`${globalName} browser catalog is missing`);
  if (JSON.stringify(sandbox.window[globalName]) !== JSON.stringify(expected)) fail(`${globalName} browser catalog does not match its JSON database`);
}
for (const [globalName, expected] of [["CORNELL_SPRING_2027_DATA_META", springZh.meta], ["CORNELL_SPRING_2027_DATA_META_EN", springEn.meta]]) {
  if (!sandbox.window[globalName] || JSON.stringify(sandbox.window[globalName]) !== JSON.stringify(expected)) fail(`${globalName} browser metadata is missing or does not match its JSON database`);
}
if (sandbox.window.CORNELL_COURSE_CATALOG.length + sandbox.window.CORNELL_SPRING_2027_COURSE_CATALOG.length !== 263) fail("browser catalogs do not expose 263 offerings");

if (app.includes('<span aria-hidden="true">⌄</span>')) fail("multi-select summaries still contain the duplicate inline arrow");
if (!styles.includes(".filter-multiselect > summary::after")) fail("the single standardized filter arrow style is missing");
if (!app.includes("state.barCategoryAllocations[course.id] = category")) fail("explicit NY Bar allocation, including barPrimary, must be persisted");
if (/category === course\.barPrimary[^\n]+delete state\.barCategoryAllocations/.test(app)) fail("barPrimary allocation must not be deleted and replaced by the smart default");
if (!index.includes("term-switch-hint") || !app.includes("Click to switch term") || !app.includes("点击切换学期")) fail("bilingual term-switch guidance is missing");
if (!app.includes('version:"v5.31"')) fail("bilingual v5.31 release notes are missing");
if (!app.includes("263 term-specific offerings: 136 for Fall 2026 and 127 for Spring 2027")) fail("the current-data FAQ still exposes stale course counts");
if (!app.includes("当前数据库按学期保留 263 条开课记录") || !index.includes("127 planning courses")) fail("the Chinese FAQ or term switcher still exposes stale Spring counts");
if (!index.includes('<html lang="en">') || !app.includes('safeLocalStorageGet("llm-course-planner-ui-language") === "zh" ? "zh" : "en"')) fail("new visitors must default to English while preserving a saved Chinese preference");
if (index.indexOf("./nybar-allocation.js") < 0 || index.indexOf("./nybar-allocation.js") > index.indexOf("./app.js")) fail("NY Bar allocation helper must load before app.js");
for (const file of ["./data/cornell.catalog.spring-2027.zh-CN.js", "./data/cornell.catalog.spring-2027.en.js", "./calendar-integration.js"]) if (index.indexOf(file) < 0 || index.indexOf(file) > index.indexOf("./app.js")) fail(`${file} must load before app.js`);
for (const script of ["cornell.catalog.zh-CN.js", "cornell.catalog.en.js", "cornell.catalog.spring-2027.zh-CN.js", "cornell.catalog.spring-2027.en.js"]) if (index.indexOf(script) < 0 || index.indexOf(script) > index.indexOf("./app.js")) fail(`${script} must load before app.js`);
for (const id of ["termFilter", "termSwitchOverlay", "fallWeekBtn", "springWeekBtn"]) if (!index.includes(`id="${id}"`)) fail(`term-aware UI marker missing: ${id}`);
for (const id of ["termFilter", "barFilter", "gradingFilter", "creditsFilter", "meetingDayFilter", "topicFilter", "courseFormatFilter"]) if (!new RegExp(`id="${id}"[^>]*multiple[^>]*multi-filter-source|id="${id}"[^>]*multi-filter-source[^>]*multiple`).test(index)) fail(`${id} must remain a checkbox-backed multi-select source`);
if (!app.includes("termValues.size") || !app.includes("meetingDayValues.size") || !app.includes("some(day => courseDays.has(day))")) fail("OR-within-facet and AND-across-facets filter logic is missing");
if (!app.includes("state.scheduleWeekStart = currentUserWeekStart()")) fail("My Schedule must open on the user's current local week");
if (!styles.includes(".overlay:not(#detailOverlay) { display: grid; place-items: center") || !styles.includes(".overlay[hidden] { display: none !important; }")) fail("non-detail dialogs must be centered and hidden overlays must stay hidden");
if (!styles.includes(".multi-filter-menu") || !styles.includes(".badge-term-sp27")) fail("multi-select or Spring term-badge styles are missing");
if (!styles.includes(".topbar-actions { display:flex; width:100%") || !styles.includes(".school-switcher-button small { display:block; }")) fail("narrow screens must keep term and language controls reachable");
for (const marker of ["detailAdditionalInformationHtml", "Additional official information", "官方补充信息", "detailOfficialAttributesHtml", "detailOfficialLinksHtml", "course-specific official catalog or prior roster record"]) if (!app.includes(marker)) fail(`complete official detail rendering is missing: ${marker}`);
for (const marker of ["parseIcs", "buildIcs", "mergeEvents", "RRULE", "EXDATE", "VTIMEZONE"]) if (!calendar.includes(marker)) fail(`calendar helper marker missing: ${marker}`);
for (const marker of ["importCalendarFiles", "selectedScheduleOccurrences", "importedCalendarConflicts", "exportCalendarForGoogle", "calendarEvents"]) if (!app.includes(marker)) fail(`calendar app marker missing: ${marker}`);
for (const marker of ['id="calendarImportBtn"', 'id="calendarExportBtn"', 'id="authorAnnouncementBtn"', 'id="authorAnnouncementOverlay"']) if (!index.includes(marker)) fail(`bilingual calendar/announcement UI marker missing: ${marker}`);
if (!styles.includes(".schedule-block.is-imported-calendar") || !styles.includes(".calendar-export-options") || !styles.includes(".author-announcement-dialog")) fail("calendar or author-announcement visual styles are missing");
for (const marker of ["normalizedCourseTitle", "pickedTitles.has(titleKey)"]) if (!app.includes(marker)) fail(`recommendation de-duplication marker absent: ${marker}`);
if (app.includes("})) || course.sections?.[0];")) fail("recommendation generation must skip a course when every section conflicts");

console.log(`PASS: v5.31 Spring database=${springEn.courses.length} courses; translations complete; formats=${JSON.stringify(formatCounts)}; LAW 6641 allocation and term guidance guards present.`);
