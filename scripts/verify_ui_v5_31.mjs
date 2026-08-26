import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const app = read("app.js");
const index = read("index.html");
const styles = read("styles.css");
const frontendOnly = process.argv.includes("--frontend-only");

assert.match(app, /const APP_VERSION = "v5\.31"/);
assert.match(app, /const CURRENT_CORNELL_DATASET_VERSION = "v5\.31"/, "a stale v5.30 Cornell import must not override the bundled v5.31 database");
assert.match(app, /parsed\?\.bundledDatabaseVersion !== CURRENT_CORNELL_DATASET_VERSION[\s\S]{0,160}removeItem\("llm-course-planner-cornell-import"\)/, "stale imported Cornell snapshots must be removed during startup");
assert.match(app, /version:"v5\.31"[\s\S]*?zh:\[[\s\S]*?en:\[/, "v5.31 release note must be bilingual");
assert.match(index, /LL\.M\. Course Planner v5\.31/);
assert.match(index, /<span>v5\.31<\/span>/);

assert.doesNotMatch(app, /<span aria-hidden="true">[⌄∨v]<\/span>/, "multi-select summary must not render its own duplicate arrow");
assert.match(styles, /\.filter-multiselect\s*>\s*summary::after\s*\{/, "the shared CSS arrow must remain present");

for (const marker of [
  "course.courseFormats",
  "course.courseFormat",
  "course.componentLabel",
  "section.courseFormat",
  "section.componentLabel"
]) assert.ok(app.includes(marker), `structured course-format field is not consumed: ${marker}`);

assert.match(app, /function languagePreferredLocation\(englishValue, chineseValue,[\s\S]*?isEnglish\(\)[\s\S]*?englishValue[\s\S]*?chineseValue/, "meeting locations must prefer the active language");
assert.match(app, /languagePreferredLocation\(meeting\?\.location, meeting\?\.locationZh/, "meetingLocation must use the language-aware location selector");
assert.match(app, /\["官方未公布具体地点", "Teaching location not published"\]/, "English UI must translate the official unpublished-location placeholder");
assert.match(app, /\["班次地点不同，请查看具体班次", "Location varies by section; see section details"\]/, "English UI must translate the per-section location placeholder");
assert.match(app, /function isPendingLocation\(value\)[\s\S]*?未公布\|待公布[\s\S]*?location varies by section\|班次地点不同/, "all location consumers must share a bilingual pending-location predicate");
assert.match(app, /const validLocation = isPendingLocation\(locationText\) \? "" : locationText/, "calendar export must omit unpublished location placeholders");
assert.match(app, /function locationLinkHtml\(location\)[\s\S]*?if \(isPendingLocation\(text\)\)/, "unpublished location placeholders must not become map links");
assert.match(app, /function sectionHasPublishedLocation\(section\)[\s\S]*?!isPendingLocation\(value\)/, "unpublished placeholders must not be reported as published rooms");
assert.match(app, /function toggleLanguage\(\)[\s\S]*?courses = bundledCornellCourses\(\)[\s\S]*?applyLocalCourseEdits\(\);[\s\S]*?renderSchoolIdentity\(\)/, "language switching must reapply local overrides and custom courses before rendering");

const sandbox = { window:{} };
vm.runInNewContext(read("data/cornell.catalog.spring-2027.en.js"), sandbox);
const spring = sandbox.window.CORNELL_SPRING_2027_COURSE_CATALOG_EN;
assert.ok(Array.isArray(spring) && spring.length, "Spring browser catalog must load");
const formatPatterns = [
  ["lecture", /\blec\b|lecture|讲授课/i],
  ["seminar", /\bsem\b|seminar|研讨课/i],
  ["clinic", /\bcln\b|clinic|clinical|诊所/i],
  ["practicum", /\bpra\b|\bprc\b|\bfld\b|practicum|field studies|实践课/i],
  ["discussion", /\bdis\b|discussion|讨论课/i],
  ["independent", /\bind\b|independent|directed (?:study|work)|独立研究/i]
];
function courseFormats(course) {
  const sections = course.sections || [];
  const structured = [...(Array.isArray(course.courseFormats) ? course.courseFormats : []), course.courseFormat, course.component, course.componentLabel, ...sections.flatMap(section => [section.courseFormat, section.component, section.componentLabel])].filter(Boolean).join(" ");
  const matches = formatPatterns.filter(([, pattern]) => pattern.test(structured)).map(([id]) => id);
  if (matches.length) return [...new Set(matches)];
  const fallback = [course.officialTitleEn, course.titleEn, course.titleZh, ...sections.map(section => section.label)].filter(Boolean).join(" ");
  return [...new Set(formatPatterns.filter(([, pattern]) => pattern.test(fallback)).map(([id]) => id))];
}
const springLectures = spring.filter(course => courseFormats(course).includes("lecture"));
assert.ok(courseFormats({ courseFormat:"lecture", sections:[{ component:"", componentLabel:"Lecture" }] }).includes("lecture"), "Lecture must remain filterable when section.component is missing");
if (!frontendOnly) assert.ok(springLectures.length > 0, "SP27 + Lecture must return at least one course");

assert.match(app, /state\.barCategoryAllocations\[course\.id\] = category;[\s\S]{0,120}saveState\(\);[\s\S]{0,120}refreshBarAllocationSurfaces\(course\);/, "an explicit allocation must persist before dependent UI refreshes");
assert.doesNotMatch(app, /category === course\.barPrimary[\s\S]{0,100}delete state\.barCategoryAllocations/, "choosing barPrimary must not delete the user's explicit allocation");
const refreshBody = app.match(/function refreshBarAllocationSurfaces\(course\) \{([\s\S]*?)\n  \}/)?.[1] || "";
for (const renderer of ["renderProgress", "renderCourseList", "renderMiniSchedule", "renderRecommendations", "renderSchedule", "renderScheduleCourseTray", "renderDetail"])
  assert.ok(refreshBody.includes(`${renderer}(`), `allocation refresh is missing ${renderer}`);
assert.ok(app.includes("schedule-allocation-badge"), "the schedule tray must expose the current allocation badge");

const nyBarSandbox = { window:{} };
vm.runInNewContext(read("nybar-allocation.js"), nyBarSandbox);
const allocation = nyBarSandbox.window.NY_BAR_ALLOCATION;
const fall = JSON.parse(read("data/cornell-law-2026-27.en.json")).courses;
const law6641 = fall.find(course => course.code === "LAW 6641");
assert.ok(law6641 && allocation.categories(law6641).includes("professional") && allocation.categories(law6641).includes("core"), "LAW 6641 must remain a professional/core multi-category fixture");
const state = { barCategoryAllocations:{} };
for (const category of ["core", "professional", "core"]) {
  state.barCategoryAllocations[law6641.id] = category;
  const reloaded = JSON.parse(JSON.stringify(state));
  assert.equal(allocation.assignedCategory(law6641, reloaded.barCategoryAllocations), category, `LAW 6641 ${category} allocation must survive refresh/reload`);
}

assert.match(index, /id="termSwitchHint"[^>]*>点击切换学期 \/ Click to switch term</);
assert.match(app, /els\.termSwitchHint\.textContent[\s\S]{0,160}点击切换学期 \/ Click to switch term/);
assert.match(styles, /\.school-switcher-hint\s*\{/);
assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.topbar-actions \.school-switcher-button \{[^}]*flex-basis:100%/, "term helper must have a narrow-screen layout");

for (const marker of ["chineseCourseDescription", "englishCourseDescription", "detailDescriptionHtml", "中文待翻译", "官方英文原文", "description-translation-pending"])
  assert.ok(app.includes(marker), `description language guard is missing: ${marker}`);
for (const marker of ["detailAdditionalInformationHtml", "Additional official information", "官方补充信息", "detailOfficialAttributesHtml", "Official course attributes", "官方课程属性", "detailOfficialLinksHtml", "course-specific official catalog or prior roster record", "官方目录／历史开课记录"])
  assert.ok(app.includes(marker), `complete Spring detail rendering is missing: ${marker}`);
assert.doesNotMatch(app, /<h4 class="translation-heading">中文译文<\/h4><p>\$\{esc\(c\.descriptionZh/, "English text must not be rendered under the Chinese-translation heading");

assert.ok(app.includes("sectionIdentityHtml"), "section identity formatter must be shared by picker and detail UI");
assert.doesNotMatch(app, /classNumber \|\| "—"/, "an absent official class number must not render as a dash");
assert.match(app, /classNumber \? ` · \$\{isEnglish\(\) \? "Class number" : "课程班号"\}/, "class number label must render only when official data provides a value");
assert.match(app, /section\?\.label \|\| \(officialSection \? `Section \$\{officialSection\}`/, "the official Section value must remain visible when no display label is available");

console.log(`PASS: v5.31 UI guards; SP27 lecture courses=${springLectures.length}${frontendOnly ? " (catalog assertion deferred)" : ""}; LAW 6641 professional/core round trips persisted; bilingual detail and term hint present.`);
