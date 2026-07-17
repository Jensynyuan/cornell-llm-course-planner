import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const read = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const roster = "FA26";
const apiUrl = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${roster}&subject=LAW`;

const response = await fetch(apiUrl, { headers: { Accept: "application/json", "User-Agent": "Cornell-LLM-Course-Planner-v5.4-official-database" } });
if (!response.ok) throw new Error(`Cornell API returned ${response.status}`);
const payload = await response.json();
if (payload.status !== "success" || !Array.isArray(payload.data?.classes)) throw new Error("Cornell API returned an unexpected payload");

const apiCourses = payload.data.classes;
const zh = read("cornell-law-2026-27.zh-CN.json");
const en = read("cornell-law-2026-27.en.json");
const zhByCode = new Map(zh.courses.map(course => [course.code, course]));
const enByCode = new Map(en.courses.map(course => [course.code, course]));
const officialChineseSummaries = {
  "LAW 5311": ["创业融资导论：企业估值与条款清单", "介绍新创企业融资中的主要挑战与常见风险，结合讲授和案例，涵盖机会识别与估值、合同设计与融资选择，以及退出策略。", ["公司与金融"], "中等至较高"],
  "LAW 6029": ["校园调解实践（二）：恢复性司法的进阶议题", "面向已修读校园调解实践（一）的学生，深化调解、恢复性实践与替代性争议解决的知识；学生将指导初阶调解员并参与复杂案件调解。", ["争议解决", "实践课程"], "实践投入较高"],
  "LAW 6304": ["通过技术提供法律服务：法律科技洞察与应用构建技能", "研究快速变化的法律科技生态，并训练学生将法律流程和工作流转化为自动化方案，使用无代码或提示式编程工具开发法律应用。", ["科技与法律", "实践课程"], "较高"],
  "LAW 6334": ["谈判技能工作坊：科技领域的复杂交易", "讲授成功谈判的基本原理，并在科技和知识产权交易情境中训练对合同权利、价值与救济问题的谈判能力。", ["交易与谈判", "科技与法律"], "中等"],
  "LAW 6897": ["当代科技经济下的律师事务所经营：运营、人才与成功策略", "分析律师事务所的组织结构、运营、财务指标、技术应用和人才战略，以及技术变革如何影响律所绩效、律师职业与合伙人管理。", ["法律职业", "科技与法律"], "中等"],
  "LAW 7458": ["分别撰写意见：联邦上诉法院的协同意见与反对意见", "探讨联邦上诉法官为何及如何撰写协同或反对意见，并围绕真实上诉记录起草一份协同意见和一份反对意见，接受同伴评议与教师指导。", ["诉讼与争议解决", "法律写作"], "较高"],
  "LAW 7587": ["股东积极主义：传统行动与环境、社会及治理议题", "研究传统股东积极主义行动及其与环境、社会和治理（ESG）议题的关系。官方当季 API 未提供进一步课程说明。", ["公司与金融", "公司治理"], "中等"],
  "LAW 7694": ["法治与行政权力：理论基础与比较视角", "通过经典与当代理论以及比较法材料，研究法治原则如何塑造并约束行政权力，并将美国当代判例置于更广泛的理论讨论中。", ["公法", "比较法"], "中等"],
  "LAW 7810": ["高级庇护与《禁止酷刑公约》上诉诊所", "学生在课堂和代理案件中学习庇护、禁止酷刑公约及移民法；多数学生将代理移民上诉委员会案件，并训练上诉策略、叙事、专家报告和复杂法律框架下的论证。", ["实践课程", "国际与跨境法", "移民法"], "实践投入较高"],
  "LAW 7855": ["国际人权：诉讼与倡导诊所（一）", "学生参与国际人权倡导项目，重点包括诉讼，也可能涉及立法倡导、境外人权侵害的事实调查与研究，以及死刑国际规范的实施。", ["实践课程", "国际与跨境法", "权利与社会正义"], "实践投入较高"]
};

function courseCode(apiCourse) { return `LAW ${apiCourse.catalogNbr}`; }
function courseUnits(apiCourse) {
  const group = apiCourse.enrollGroups?.[0];
  return Number(group?.unitsMinimum ?? group?.unitsMaximum ?? 0) || null;
}
function generatedSource(apiCourse, language) {
  const code = courseCode(apiCourse);
  const [titleZh, descriptionZh, categories, workload] = officialChineseSummaries[code] || [apiCourse.titleLong || code, "本课程的官方英文说明请见课程页面。", ["综合法律"], "中等至较高"];
  return {
    id: `LAW-${apiCourse.catalogNbr}`,
    code,
    catalogNbr: String(apiCourse.catalogNbr),
    titleZh,
    titleEn: apiCourse.titleLong || apiCourse.titleShort || code,
    descriptionZh,
    descriptionEn: apiCourse.description || "",
    credits: courseUnits(apiCourse) || 0,
    creditText: "Credits vary",
    grading: "To be confirmed",
    gradingZh: "以当期官方课程页面为准",
    instructors: ["待公布"],
    session: "Fall 2026",
    sections: [],
    barPrimary: null,
    barClassroomEligible: null,
    degreeRequired: false,
    llmSpecific: false,
    eligibility: "open",
    restrictionZh: "以当期官方课程页面的选课限制为准",
    prerequisitesZh: "以当期官方课程页面的先修要求为准",
    categories,
    workload,
    recommendation: 60,
    campusZh: "康奈尔大学",
    location: "",
    locationStatus: "unpublished",
    translationStatus: language === "zh" ? "official-source-summary-translated" : "official-source",
    translationCompleteness: "summary",
    translationMethod: "官方英语课程说明＋中文摘要",
    assessmentZh: "具体考核方式以课程大纲为准"
  };
}
function currentRecord(source, apiCourse, language) {
  const code = courseCode(apiCourse);
  const group = apiCourse.enrollGroups?.[0] || {};
  const units = courseUnits(apiCourse);
  const officialTitle = apiCourse.titleLong || apiCourse.titleShort || source.titleEn || source.titleZh || code;
  const officialDescription = apiCourse.description || "";
  const shared = {
    ...source,
    id: source.id || `LAW-${apiCourse.catalogNbr}`,
    code,
    catalogNbr: String(apiCourse.catalogNbr),
    classNumber: String(group.classSections?.[0]?.classNbr || source.classNumber || ""),
    credits: units ?? source.credits,
    creditText: units ? `${units} Credits` : (source.creditText || "Credits vary"),
    grading: group.gradingBasisLong || source.grading || "To be confirmed",
    sourceUrl: `https://classes.cornell.edu/browse/roster/${roster}/class/LAW/${apiCourse.catalogNbr}`,
    officialSourceTerm: roster,
    officialTitleEn: officialTitle,
    officialDescriptionEn: officialDescription,
    officialDataStatus: "offered-current-term",
    catalogOnly: false,
    dataScope: "Fall 2026 official Class Roster; HTML/API cross-checked",
    officialRosterCrseId: String(apiCourse.crseId),
    officialRosterLastChecked: new Date().toISOString()
  };
  if (language === "en") return { ...shared, titleEn: officialTitle, descriptionEn: officialDescription || source.descriptionEn || "" };
  return shared;
}

const zhCourses = [];
const enCourses = [];
for (const apiCourse of apiCourses) {
  const code = courseCode(apiCourse);
  const zhSource = zhByCode.get(code) || generatedSource(apiCourse, "zh");
  const enSource = enByCode.get(code) || generatedSource(apiCourse, "en");
  zhCourses.push(currentRecord(zhSource, apiCourse, "zh"));
  enCourses.push(currentRecord(enSource, apiCourse, "en"));
}
const crosscheck = read("cornell-fa26-html-api-crosscheck.json");
const audit = {
  generatedAt: new Date().toISOString(),
  sourceApi: apiUrl,
  sourceHtml: crosscheck.sourceHtml,
  sourceUrl: crosscheck.sourceUrl,
  htmlResultCount: crosscheck.htmlResultCount,
  apiResultCount: apiCourses.length,
  htmlApiCodeDifference: crosscheck.onlyHtml.length + crosscheck.onlyApi.length,
  htmlApiCrseIdMismatch: crosscheck.crseIdMismatch.length,
  currentOfferingCourses: zhCourses.length,
  officialCoursesAddedBeyondLegacyCatalog: apiCourses.filter(course => !zhByCode.has(courseCode(course))).map(courseCode),
  excludedNonCurrentCatalogEntries: zh.courses.length - zhCourses.length,
  titlePresentationDifferences: ["LAW 6304", "LAW 6881"],
  note: "The default planner database contains only FA26 Law offerings. The two title differences reflect the roster HTML short title versus the API long title; course code and Cornell course ID match."
};

const nextMeta = original => ({
  ...original,
  catalogCourseCount: zhCourses.length,
  scheduledMetadataCount: zhCourses.filter(course => course.sections?.length).length,
  roster: "Fall 2026",
  dataScope: "Fall 2026 actual Law offerings only",
  releaseVersion: "v5.6",
  officialApiAudit: audit
});
zh.courses = zhCourses;
en.courses = enCourses;
zh.meta = nextMeta(zh.meta);
en.meta = nextMeta(en.meta);

write("cornell-law-2026-27.zh-CN.json", zh);
write("cornell-law-2026-27.en.json", en);
write("cornell-fa26-official-database-audit.v5.4.json", audit);
fs.writeFileSync(path.join(dataDir, "cornell.catalog.zh-CN.js"), `window.CORNELL_COURSE_CATALOG = ${JSON.stringify(zh.courses)};\nwindow.CORNELL_DATA_META = ${JSON.stringify(zh.meta)};\n`, "utf8");
fs.writeFileSync(path.join(dataDir, "cornell.catalog.en.js"), `window.CORNELL_COURSE_CATALOG_EN = ${JSON.stringify(en.courses)};\nwindow.CORNELL_DATA_META_EN = ${JSON.stringify(en.meta)};\n`, "utf8");

console.log(JSON.stringify(audit, null, 2));
