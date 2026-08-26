import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const sourceUrl = "https://community.lawschool.cornell.edu/wp-content/uploads/2026/05/NYS-Bar-Requirements-for-LLMs_Fall-2026.pdf";
const sourceDescription = "Cornell Law 2026-27 NYS Bar Examination Memorandum, page 3, Spring column";
const generatedAt = new Date().toISOString();
const expectedCourseCount = 127;

// LAW 5001 appears in the Spring column as an academic-year course with fall
// enrollment. It therefore remains in the official map, but it must not be
// manufactured as a separate SP27 offering when the Spring catalog omits it.
const CATEGORY_MAP = new Map([
  ["LAW 6641", { categories:["professional", "core"], primary:"professional" }],
  ["LAW 6761", { categories:["writing"], primary:"writing" }],
  ["LAW 5001", { categories:["american", "core"], primary:"american", academicYearWithFallEnrollment:true }],
  ["LAW 6011", { categories:["core"], primary:"core" }],
  ["LAW 6131", { categories:["core"], primary:"core" }],
  ["LAW 5061", { categories:["core"], primary:"core" }],
  ["LAW 6264", { categories:["core"], primary:"core", memoCredits:3 }],
  ["LAW 6401", { categories:["core"], primary:"core" }],
  ["LAW 6431", { categories:["core"], primary:"core" }],
  ["LAW 6203", { categories:["core"], primary:"core" }],
  ["LAW 5121", { categories:["core"], primary:"core" }]
]);

const datasetSpecs = [
  {
    language:"zh-CN",
    jsonFile:"cornell-law-spring-2027.zh-CN.json",
    catalogFile:"cornell.catalog.spring-2027.zh-CN.js",
    catalogGlobal:"CORNELL_SPRING_2027_COURSE_CATALOG",
    metaGlobal:"CORNELL_SPRING_2027_DATA_META"
  },
  {
    language:"en",
    jsonFile:"cornell-law-spring-2027.en.json",
    catalogFile:"cornell.catalog.spring-2027.en.js",
    catalogGlobal:"CORNELL_SPRING_2027_COURSE_CATALOG_EN",
    metaGlobal:"CORNELL_SPRING_2027_DATA_META_EN"
  }
];

const fail = message => { throw new Error(`Spring 2027 NY Bar enrichment failed: ${message}`); };
const readJson = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const ids = dataset => dataset.courses.map(course => course.id);
const codes = dataset => dataset.courses.map(course => course.code);
const sectionIds = dataset => dataset.courses.flatMap(course => (course.sections || []).map(section => section.id));

function validateBaseDataset(dataset, spec) {
  if (!dataset || !Array.isArray(dataset.courses)) fail(`${spec.jsonFile} has no courses array`);
  if (dataset.courses.length !== expectedCourseCount) fail(`${spec.jsonFile} must contain exactly ${expectedCourseCount} courses`);
  if (dataset.meta?.termCode !== "SP27") fail(`${spec.jsonFile} must identify term SP27`);
  if (dataset.meta?.language !== spec.language) fail(`${spec.jsonFile} language metadata must be ${spec.language}`);
  if (new Set(ids(dataset)).size !== dataset.courses.length) fail(`${spec.jsonFile} contains duplicate course IDs`);
  if (new Set(codes(dataset)).size !== dataset.courses.length) fail(`${spec.jsonFile} contains duplicate course codes`);
  if (new Set(sectionIds(dataset)).size !== sectionIds(dataset).length) fail(`${spec.jsonFile} contains duplicate section IDs`);

  const presentCodes = new Set(codes(dataset));
  for (const [code, mapping] of CATEGORY_MAP) {
    if (!mapping.academicYearWithFallEnrollment && !presentCodes.has(code)) fail(`${spec.jsonFile} is missing mapped Spring offering ${code}`);
  }
  const law5001Present = presentCodes.has("LAW 5001");
  if (law5001Present !== dataset.courses.some(course => course.id === "LAW-5001-SP27")) {
    fail(`${spec.jsonFile} has an inconsistent LAW 5001 Spring offering identity`);
  }
  const law6264 = dataset.courses.find(course => course.code === "LAW 6264");
  if (Number(law6264?.credits) !== 2) fail(`${spec.jsonFile} must preserve the current LAW 6264 offering at 2 credits`);
}

function evidenceFor(course, mapping) {
  const multiple = mapping.categories.length > 1;
  const evidence = {
    source:sourceDescription,
    sourceZh:"康奈尔法学院 2026—2027 学年纽约州律师资格考试备忘录第3页（Spring 栏）",
    sourceUrl,
    categories:[...mapping.categories],
    note:multiple
      ? "The course is listed in more than one official Spring category. The primary category is the default one-time allocation, and the user may move that allocation without double counting."
      : "Officially listed in the Spring column for this category.",
    noteZh:multiple
      ? "该课程同时列入官方 Spring 栏的多个类别；主类别为默认的唯一计入项，用户可调整归类，但不得重复计算学分。"
      : "该课程已由官方备忘录 Spring 栏列入本类别。"
  };
  if (course.code === "LAW 6264") {
    evidence.note = "The May 4, 2026 memorandum lists this Spring course at 3 credits, while the current Spring 2027 Course Offerings snapshot lists 2 credits. The planner preserves the current offering at 2 credits and flags this source conflict for confirmation.";
    evidence.noteZh = "2026年5月4日的备忘录将该春季课程列为3学分，而当前 Spring 2027 Course Offerings 快照列为2学分。本工具保留当前开课数据的2学分，并标记该来源冲突，供进一步确认。";
    evidence.creditConflict = {
      memoCredits:mapping.memoCredits,
      currentOfferingCredits:Number(course.credits),
      status:"source-conflict-needs-confirmation"
    };
  }
  return evidence;
}

function enrichDataset(dataset) {
  const originalCredits = new Map(dataset.courses.map(course => [course.id, course.credits]));
  const courses = dataset.courses.map(course => {
    const mapping = CATEGORY_MAP.get(course.code);
    if (!mapping) return course;
    return {
      ...course,
      barPrimary:mapping.primary,
      barClassroomEligible:true,
      barCategories:[...mapping.categories],
      barEvidence:evidenceFor(course, mapping)
    };
  });

  for (const course of courses) {
    if (course.credits !== originalCredits.get(course.id)) fail(`${course.code} credits changed during NY Bar enrichment`);
  }

  const applied = courses.filter(course => CATEGORY_MAP.has(course.code));
  const categoryCounts = Object.fromEntries(
    ["professional", "writing", "american", "core"].map(category => [category, applied.filter(course => course.barCategories.includes(category)).length])
  );
  const law5001Present = applied.some(course => course.code === "LAW 5001");
  const audit = {
    generatedAt,
    sourceUrl,
    sourceDescription,
    officialMapCourseCodes:[...CATEGORY_MAP.keys()],
    appliedSpringOfferingCodes:applied.map(course => course.code),
    officialAcademicYearCoursesNotSeparateSpringOfferings:law5001Present ? [] : [{
      code:"LAW 5001",
      titleEn:"Civil Procedure",
      reason:"Spring memo lists an academic-year course with fall enrollment; no separate SP27 offering exists in the current Course Offerings dataset."
    }],
    officialCategoryCourseCount:applied.length,
    categoryCounts,
    creditConflicts:applied.filter(course => course.barEvidence?.creditConflict).map(course => ({
      code:course.code,
      ...course.barEvidence.creditConflict
    }))
  };
  return { ...dataset, meta:{ ...dataset.meta, springNyBarCategoryAudit:audit }, courses };
}

function validateEnrichedPair(zh, en) {
  if (zh.courses.length !== expectedCourseCount || en.courses.length !== expectedCourseCount) fail(`both enriched datasets must retain ${expectedCourseCount} courses`);
  if (JSON.stringify(ids(zh)) !== JSON.stringify(ids(en))) fail("Chinese and English course IDs or order differ");
  if (JSON.stringify(codes(zh)) !== JSON.stringify(codes(en))) fail("Chinese and English course codes or order differ");
  if (JSON.stringify(sectionIds(zh)) !== JSON.stringify(sectionIds(en))) fail("Chinese and English section IDs or order differ");

  for (let index = 0; index < zh.courses.length; index += 1) {
    const zhCourse = zh.courses[index];
    const enCourse = en.courses[index];
    const mapping = CATEGORY_MAP.get(zhCourse.code);
    if (!mapping) continue;
    for (const course of [zhCourse, enCourse]) {
      if (course.barPrimary !== mapping.primary) fail(`${course.code} has an incorrect primary category`);
      if (course.barClassroomEligible !== true) fail(`${course.code} must be marked classroom eligible`);
      if (JSON.stringify(course.barCategories) !== JSON.stringify(mapping.categories)) fail(`${course.code} has incorrect category order`);
      if (course.barEvidence?.source !== sourceDescription || course.barEvidence?.sourceUrl !== sourceUrl) fail(`${course.code} has incomplete Spring memo evidence`);
      if (!course.barEvidence?.note || !course.barEvidence?.noteZh) fail(`${course.code} must retain bilingual evidence notes`);
    }
    if (JSON.stringify(zhCourse.barCategories) !== JSON.stringify(enCourse.barCategories) || zhCourse.barPrimary !== enCourse.barPrimary) {
      fail(`${zhCourse.code} NY Bar mapping differs between languages`);
    }
  }

  const expectedApplied = [...CATEGORY_MAP.entries()].filter(([code, mapping]) => !mapping.academicYearWithFallEnrollment || zh.courses.some(course => course.code === code)).map(([code]) => code);
  const actualApplied = zh.courses.filter(course => CATEGORY_MAP.has(course.code)).map(course => course.code);
  if (actualApplied.length !== expectedApplied.length || expectedApplied.some(code => !actualApplied.includes(code)) || actualApplied.some(code => !expectedApplied.includes(code))) {
    fail("the enriched Spring mapping is incomplete or out of dataset order");
  }
  const zh6264 = zh.courses.find(course => course.code === "LAW 6264");
  const en6264 = en.courses.find(course => course.code === "LAW 6264");
  for (const course of [zh6264, en6264]) {
    if (course.credits !== 2 || course.barEvidence?.creditConflict?.memoCredits !== 3 || course.barEvidence?.creditConflict?.currentOfferingCredits !== 2) {
      fail("LAW 6264 credit-source conflict is not preserved explicitly");
    }
  }
}

const originalDatasets = datasetSpecs.map(spec => ({ spec, dataset:readJson(spec.jsonFile) }));
originalDatasets.forEach(({ spec, dataset }) => validateBaseDataset(dataset, spec));
const enrichedDatasets = originalDatasets.map(({ spec, dataset }) => ({ spec, dataset:enrichDataset(dataset) }));
validateEnrichedPair(enrichedDatasets[0].dataset, enrichedDatasets[1].dataset);

const outputs = enrichedDatasets.map(({ spec, dataset }) => {
  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  const catalog = `window.${spec.catalogGlobal} = ${JSON.stringify(dataset.courses)};\nwindow.${spec.metaGlobal} = ${JSON.stringify(dataset.meta)};\n`;
  const sandbox = { window:{} };
  vm.runInNewContext(catalog, sandbox);
  if (JSON.stringify(sandbox.window[spec.catalogGlobal]) !== JSON.stringify(dataset.courses)) fail(`${spec.catalogFile} catalog serialization failed`);
  if (JSON.stringify(sandbox.window[spec.metaGlobal]) !== JSON.stringify(dataset.meta)) fail(`${spec.catalogFile} metadata serialization failed`);
  return { spec, dataset, json, catalog };
});

if (!process.argv.includes("--check")) {
  for (const output of outputs) {
    fs.writeFileSync(path.join(dataDir, output.spec.jsonFile), output.json, "utf8");
    fs.writeFileSync(path.join(dataDir, output.spec.catalogFile), output.catalog, "utf8");
  }
}

const appliedCodes = outputs[0].dataset.courses.filter(course => CATEGORY_MAP.has(course.code)).map(course => course.code);
const coreCount = outputs[0].dataset.courses.filter(course => course.barCategories?.includes("core")).length;
console.log(`${process.argv.includes("--check") ? "CHECK" : "UPDATED"}: Spring 2027 NY Bar data · ${expectedCourseCount}/${expectedCourseCount} courses · ${appliedCodes.length} mapped offerings · ${coreCount} core offerings · LAW 6264 remains 2 credits with a 3-credit memo conflict note.`);
