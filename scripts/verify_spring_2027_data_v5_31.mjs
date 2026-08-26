import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const readJson = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const fail = message => { throw new Error(`Spring 2027 data v5.31 check failed: ${message}`); };
const hasChinese = value => /[\u3400-\u9fff]/u.test(String(value || ""));
const placeholder = value => /暂无中文|尚无.*中文|待补充|translation pending|no chinese translation/i.test(String(value || ""));
const isoDate = value => /^2027-\d{2}-\d{2}$/.test(String(value || ""));
const genericPrerequisiteEn = /do(?:es)? not publish a separate prerequisite/i;
const genericRestrictionEn = /do(?:es)? not publish a separate enrollment restriction/i;
const genericFallbackZh = /完整条件已在|完整中文内容已并入|具体选课或安排条件已在/u;

function sentenceUnits(value) {
  return (String(value || "").match(/[^.!?。！？]+[.!?。！？]+(?:[”’"'）)\]]*)|[^.!?。！？]+$/gu) || []).map(item => item.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function hasAdjacentExactBlock(value, minimumCharacters = 40) {
  const text = String(value || "").trim();
  if (!text) return false;
  const paragraphs = text.split(/\n+/).map(item => item.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (let index = 1; index < paragraphs.length; index += 1) if (paragraphs[index].length >= minimumCharacters && paragraphs[index] === paragraphs[index - 1]) return true;
  const sentences = sentenceUnits(text);
  for (let index = 0; index < sentences.length; index += 1) {
    for (let size = 1; index + (size * 2) <= sentences.length; size += 1) {
      const first = sentences.slice(index, index + size);
      const second = sentences.slice(index + size, index + (size * 2));
      if (first.join(" ").length >= minimumCharacters && first.every((sentence, offset) => sentence === second[offset])) return true;
    }
  }
  return false;
}

const zh = readJson("cornell-law-spring-2027.zh-CN.json");
const en = readJson("cornell-law-spring-2027.en.json");
for (const [label, dataset] of [["zh-CN", zh], ["en", en]]) {
  if (dataset.courses.length !== 127 || dataset.meta.courseCount !== 127) fail(`${label} must contain 127 courses.`);
  if (dataset.meta.sectionCount !== 146) fail(`${label} metadata must report 146 included sections.`);
  if (dataset.meta.sourceCourseRecordCount !== 136 || dataset.meta.sourceSectionCount !== 152) fail(`${label} current source counts must be 136 records / 152 sections.`);
  if (dataset.meta.excludedSourceRecordCount !== 6 || dataset.meta.includedSourceRecordCount !== 130) fail(`${label} current inclusion/exclusion record counts are incorrect.`);
  if (dataset.meta.componentCoverage?.sectionsWithComponent !== 146) fail(`${label} component coverage must be 146/146 sections.`);
  if (dataset.meta.descriptionCoverage?.currentOfficial !== 126 || dataset.meta.descriptionCoverage?.explicitOfficialNoDescription !== 1) fail(`${label} description coverage must be 126 current + 1 explicit no-description status.`);
  if (dataset.meta.translationCoverage?.titleZh !== 127 || dataset.meta.translationCoverage?.descriptionZh !== 127) fail(`${label} translation coverage must be 127/127.`);
}

const expectedExcluded = ["LAW 4013", "LAW 4051", "LAW 4081", "LAW 4131", "LAW 4330", "LAW 6332"];
const actualExcluded = en.meta.excludedCourses.map(item => item.code).sort();
if (JSON.stringify(actualExcluded) !== JSON.stringify([...expectedExcluded].sort())) fail(`excluded course list differs: ${actualExcluded.join(", ")}`);
for (const code of expectedExcluded) if (en.courses.some(course => course.code === code)) fail(`${code} re-entered the LL.M. planning dataset.`);
if (!en.courses.some(course => course.code === "LAW 6365")) fail("LAW 6365 must remain included; it is not undergraduate-only or JD-only.");

const enById = new Map(en.courses.map(course => [course.id, course]));
const zhById = new Map(zh.courses.map(course => [course.id, course]));
if (enById.size !== 127 || zhById.size !== 127 || [...enById.keys()].some(id => !zhById.has(id))) fail("bilingual course IDs do not match exactly.");
const orderedCodes = en.courses.map(course => course.code);
if (JSON.stringify(orderedCodes) !== JSON.stringify([...orderedCodes].sort((a, b) => a.localeCompare(b, undefined, { numeric:true })))) fail("courses are not in numeric code order.");

const formatCounts = { lecture:0, seminar:0, clinic:0, practicum:0, discussion:0, independent:0 };
let sections = 0;
for (const [id, enCourse] of enById) {
  const zhCourse = zhById.get(id);
  if (enCourse.term !== "SP27" || enCourse.session !== "Spring 2027" || enCourse.officialSourceTerm !== "SP27") fail(`${enCourse.code} has the wrong term identity.`);
  if (!enCourse.sourceUrl?.startsWith("https://support.law.cornell.edu/CourseOfferings")) fail(`${enCourse.code} lacks the current official source URL.`);
  if (!hasChinese(zhCourse.titleZh) || !hasChinese(zhCourse.descriptionZh) || placeholder(zhCourse.titleZh) || placeholder(zhCourse.descriptionZh)) fail(`${enCourse.code} lacks complete Chinese title/description.`);
  for (const field of ["gradingZh", "restrictionZh", "prerequisitesZh", "locationZh"]) if (!hasChinese(zhCourse[field])) fail(`${enCourse.code} ${field} lacks Chinese display text.`);
  if (genericFallbackZh.test(`${zhCourse.prerequisitesZh} ${zhCourse.restrictionZh} ${(zhCourse.additionalInformationZh || []).join(" ")}`)) fail(`${enCourse.code} contains a generic Chinese translation fallback.`);
  if (genericPrerequisiteEn.test(enCourse.prerequisitesEn) !== (enCourse.prerequisitesProvenance?.kind === "official-no-separate-prerequisite-status")) fail(`${enCourse.code} prerequisite status/provenance disagree.`);
  if (genericRestrictionEn.test(enCourse.restrictionEn) !== (enCourse.restrictionProvenance?.kind === "official-no-separate-restriction-status")) fail(`${enCourse.code} restriction status/provenance disagree.`);
  if ((enCourse.additionalInformationEn || []).length !== (zhCourse.additionalInformationZh || []).length || !(zhCourse.additionalInformationZh || []).every(hasChinese)) fail(`${enCourse.code} additional information is not fully translated.`);
  for (const [field, value] of [["officialDescriptionEn", enCourse.officialDescriptionEn], ["descriptionEn", enCourse.descriptionEn], ["descriptionZh", zhCourse.descriptionZh], ["restrictionEn", enCourse.restrictionEn], ["restrictionZh", zhCourse.restrictionZh]]) if (hasAdjacentExactBlock(value)) fail(`${enCourse.code} ${field} contains an adjacent exact repeated block.`);
  for (const value of [...(enCourse.additionalInformationEn || []), ...(zhCourse.additionalInformationZh || [])]) if (hasAdjacentExactBlock(value)) fail(`${enCourse.code} additional information contains an adjacent exact repeated block.`);
  if (!Array.isArray(enCourse.concentrationsEn) || !Array.isArray(zhCourse.concentrationsZh)) fail(`${enCourse.code} concentrations are not structured.`);
  if (!enCourse.restrictionProvenance?.kind || !enCourse.prerequisitesProvenance?.kind || !enCourse.descriptionProvenance?.kind) fail(`${enCourse.code} lacks field provenance.`);
  if (!Array.isArray(enCourse.sections) || !enCourse.sections.length || enCourse.sections.length !== zhCourse.sections.length) fail(`${enCourse.code} bilingual sections are incomplete.`);
  const formats = new Set([...(enCourse.courseFormats || []), enCourse.courseFormat].filter(Boolean));
  for (const format of formats) if (Object.hasOwn(formatCounts, format)) formatCounts[format] += 1;
  const zhSections = new Map(zhCourse.sections.map(section => [section.id, section]));
  for (const section of enCourse.sections) {
    sections += 1;
    const zhSection = zhSections.get(section.id);
    if (!zhSection) fail(`${enCourse.code} section ${section.section} is missing in Chinese.`);
    if (!section.section || !section.component || !section.componentLabel || !section.courseFormat) fail(`${enCourse.code} section ${section.section} lacks component/courseFormat.`);
    if (!Number.isFinite(section.credits) || section.credits !== enCourse.credits || !section.creditText || !hasChinese(zhSection.creditTextZh)) fail(`${enCourse.code} section ${section.section} lacks consistent bilingual credit data.`);
    if (!section.scheduleDateStatus || !section.daysTimesStatus || !section.meetingStatus) fail(`${enCourse.code} section ${section.section} lacks explicit schedule publication status.`);
    if (!section.componentProvenance?.kind || !section.componentProvenance?.sourceUrl) fail(`${enCourse.code} section ${section.section} lacks component provenance.`);
    if (section.componentProvenance.kind === "historical-official-roster" && !/used only for the section component\/course format/i.test(section.componentProvenance.note || "")) fail(`${enCourse.code} section ${section.section} does not limit historical usage to format.`);
    if (!isoDate(section.startDate) || !isoDate(section.endDate)) fail(`${enCourse.code} section ${section.section} lacks Spring dates.`);
    if (!Array.isArray(section.instructors) || !section.instructorStatus) fail(`${enCourse.code} section ${section.section} instructors are not explicitly structured.`);
    if (!Array.isArray(section.meetings)) fail(`${enCourse.code} section ${section.section} meetings are not structured.`);
    if (!section.officialSourceUrl?.startsWith("https://support.law.cornell.edu/CourseOfferings")) fail(`${enCourse.code} section ${section.section} lacks current official link.`);
    if (!hasChinese(zhSection.titleZh) || !hasChinese(zhSection.descriptionZh) || !hasChinese(zhSection.locationZh)) fail(`${enCourse.code} section ${section.section} lacks Chinese display fields.`);
    if (section.additionalInformationEn && !hasChinese(zhSection.additionalInformationZh)) fail(`${enCourse.code} section ${section.section} additional information is not translated.`);
    if (hasAdjacentExactBlock(section.descriptionEn) || hasAdjacentExactBlock(zhSection.descriptionZh)) fail(`${enCourse.code} section ${section.section} description contains an adjacent exact repeated block.`);
    for (const meeting of section.meetings) {
      if (!meeting.pattern || !meeting.start || !meeting.end || !isoDate(meeting.startDate) || !isoDate(meeting.endDate)) fail(`${enCourse.code} section ${section.section} has an incomplete meeting.`);
      if (/historical/i.test(`${meeting.locationSource || ""} ${meeting.scheduleDateStatus || ""}`)) fail(`${enCourse.code} section ${section.section} improperly uses a historical meeting fact.`);
    }
  }
}
if (sections !== 146) fail(`expected 146 included sections, found ${sections}.`);
for (const [format, count] of Object.entries(formatCounts)) if (count < 1) fail(`${format} filter would return zero Spring courses.`);

const noDescription = en.courses.filter(course => course.officialDescriptionStatus === "official-no-description");
if (noDescription.length !== 1 || noDescription[0].code !== "LAW 7591") fail(`LAW 7591 must be the sole official no-description record; found ${noDescription.map(course => course.code).join(", ")}.`);
if (noDescription[0].officialDescriptionEn !== "" || noDescription[0].descriptionStatus !== "not-published" || !/当前课程设置/u.test(zhById.get(noDescription[0].id).descriptionZh) || !/官方历史/u.test(zhById.get(noDescription[0].id).descriptionZh)) fail("LAW 7591 no-description field convention is incorrect.");

for (const code of ["LAW 7760", "LAW 7876"]) {
  const course = en.courses.find(item => item.code === code);
  if (!course?.descriptionNormalization || course.descriptionNormalization.kind !== "adjacent-exact-repeat-removal" || !course.officialDescriptionRawEn || course.officialDescriptionRawEn === course.officialDescriptionEn) fail(`${code} must retain raw official description text and document exact-repeat normalization.`);
}

const law7028 = en.courses.find(course => course.code === "LAW 7028");
if (!law7028 || !/LL\.?M/i.test(`${law7028.restrictionEn} ${law7028.llmEligibilityEvidence?.evidence}`) || law7028.llmSpecific !== true) fail("LAW 7028 LL.M. eligibility evidence is incomplete.");
if (en.courses.some(course => course.code === "LAW 7655")) fail("LAW 7655 is a Fall 2026 course and must not appear in the Spring 2027 dataset.");
const law6051En = en.courses.find(course => course.code === "LAW 6051");
const law6051Zh = zh.courses.find(course => course.code === "LAW 6051");
if (!law6051En?.officialDescriptionEn || !hasChinese(law6051Zh?.titleZh) || !hasChinese(law6051Zh?.descriptionZh)) fail("LAW 6051 bilingual detail content is incomplete.");

const falseRestrictionPatterns = new Map([
  ["LAW 6734", /evaluation may be limited/i],
  ["LAW 7021", /application of antitrust law/i],
  ["LAW 7374", /including but not limited to/i],
  ["LAW 7854", /including but not limited to/i],
  ["LAW 7891", /including but not limited to/i],
  ["LAW 7892", /including but not limited to/i],
  ["LAW 7893", /including but not limited to/i]
]);
for (const [code, falsePattern] of falseRestrictionPatterns) {
  const course = en.courses.find(item => item.code === code);
  if (!course || falsePattern.test(course.restrictionEn)) fail(`${code} contains a false enrollment restriction extracted from descriptive text.`);
  if (code !== "LAW 6734" && (course.restrictionProvenance?.kind !== "official-no-separate-restriction-status" || !genericRestrictionEn.test(course.restrictionEn))) fail(`${code} should retain the explicit no-separate-restriction status.`);
}
const law6734 = en.courses.find(course => course.code === "LAW 6734");
if (law6734.restrictionProvenance?.kind !== "current-official-course-offerings" || !/attendance at first class required/i.test(law6734.restrictionEn)) fail("LAW 6734 must retain its genuine first-class attendance rule while excluding the former false restriction.");

const law7839Restriction = en.courses.find(course => course.code === "LAW 7839")?.restrictionEn || "";
if ((law7839Restriction.match(/to apply:/gi) || []).length !== 1) fail("LAW 7839 restriction extraction contains a duplicated application sentence.");

const law6654Zh = zh.courses.find(course => course.code === "LAW 6654")?.prerequisitesZh || "";
if (!["LAW 6470", "NBAY 5300", "NBAY 5301", "LAW 6131", "二选一", "均须满足"].every(token => law6654Zh.includes(token))) fail("LAW 6654 prerequisite translation does not preserve its AND/OR grouping.");
const law7876Zh = zh.courses.find(course => course.code === "LAW 7876")?.prerequisitesZh || "";
if (!["AEM 4531", "LAW 6441", "AEM 4940", "AEM 6940"].every(token => law7876Zh.includes(token)) || (law7876Zh.match(/二选一/g) || []).length !== 2) fail("LAW 7876 prerequisite translation does not preserve both alternative groups.");
const law7927Zh = zh.courses.find(course => course.code === "LAW 7927")?.prerequisitesZh || "";
if (!/许可/u.test(law7927Zh) || !/证据法/u.test(law7927Zh) || !/刑事诉讼法/u.test(law7927Zh) || !/建议/u.test(law7927Zh) || !/并非/u.test(law7927Zh)) fail("LAW 7927 prerequisite translation must distinguish required permission from recommended courses.");

const expectedAdditionalCodes = ["LAW 5102", "LAW 6025", "LAW 6158", "LAW 6209", "LAW 6299", "LAW 6306", "LAW 6461", "LAW 6465", "LAW 6746", "LAW 6985", "LAW 7028", "LAW 7113", "LAW 7189", "LAW 7678", "LAW 7766", "LAW 7805", "LAW 7810", "LAW 7842", "LAW 7843", "LAW 7848", "LAW 7890", "LAW 7905", "LAW 7906", "LAW 7907", "LAW 7915", "LAW 7916", "LAW 7917", "LAW 7938", "LAW 7954", "LAW 7955"];
const actualAdditionalCodes = en.courses.filter(course => (course.additionalInformationEn || []).length).map(course => course.code);
if (JSON.stringify(actualAdditionalCodes) !== JSON.stringify(expectedAdditionalCodes)) fail(`additional-information course set differs: ${actualAdditionalCodes.join(", ")}.`);

const expectedBar = new Map([
  ["LAW 5061", ["core"]], ["LAW 5121", ["core"]], ["LAW 6011", ["core"]], ["LAW 6131", ["core"]],
  ["LAW 6203", ["core"]], ["LAW 6264", ["core"]], ["LAW 6401", ["core"]], ["LAW 6431", ["core"]],
  ["LAW 6641", ["professional", "core"]], ["LAW 6761", ["writing"]]
]);
for (const [code, categories] of expectedBar) {
  const course = en.courses.find(item => item.code === code);
  if (!course || JSON.stringify(course.barCategories) !== JSON.stringify(categories) || course.barClassroomEligible !== true) fail(`${code} NY Bar mapping is incorrect.`);
}
const law6264 = en.courses.find(course => course.code === "LAW 6264");
if (law6264.credits !== 2 || !/memo.*3|3.*memo/i.test(`${law6264.barEvidence?.note || ""} ${law6264.barEvidence?.noteZh || ""}`)) fail("LAW 6264 credit conflict evidence is missing.");

for (const [file, courseGlobal, metaGlobal, expected] of [
  ["cornell.catalog.spring-2027.zh-CN.js", "CORNELL_SPRING_2027_COURSE_CATALOG", "CORNELL_SPRING_2027_DATA_META", zh],
  ["cornell.catalog.spring-2027.en.js", "CORNELL_SPRING_2027_COURSE_CATALOG_EN", "CORNELL_SPRING_2027_DATA_META_EN", en]
]) {
  const source = fs.readFileSync(path.join(dataDir, file), "utf8");
  const sandbox = { window:{} };
  vm.runInNewContext(source, sandbox, { filename:file });
  if (JSON.stringify(sandbox.window[courseGlobal]) !== JSON.stringify(expected.courses)) fail(`${file} course global or JSON parity is incorrect.`);
  if (JSON.stringify(sandbox.window[metaGlobal]) !== JSON.stringify(expected.meta)) fail(`${file} metadata global or JSON parity is incorrect.`);
}

for (const [file, jsonFile, courseGlobal, metaGlobal] of [
  ["cornell.catalog.zh-CN.js", "cornell-law-2026-27.zh-CN.json", "CORNELL_COURSE_CATALOG", "CORNELL_DATA_META"],
  ["cornell.catalog.en.js", "cornell-law-2026-27.en.json", "CORNELL_COURSE_CATALOG_EN", "CORNELL_DATA_META_EN"]
]) {
  const expected = readJson(jsonFile);
  const sandbox = { window:{} };
  vm.runInNewContext(fs.readFileSync(path.join(dataDir, file), "utf8"), sandbox, { filename:file });
  if (JSON.stringify(sandbox.window[courseGlobal]) !== JSON.stringify(expected.courses) || JSON.stringify(sandbox.window[metaGlobal]) !== JSON.stringify(expected.meta)) fail(`${file} Fall catalog/meta globals no longer match the bilingual Fall JSON.`);
}

console.log(`PASS: Spring 2027 data has 127 courses / 146 sections; translations=127/127; formats=${JSON.stringify(formatCounts)}; current descriptions=126 plus LAW 7591 explicit no-description status.`);
