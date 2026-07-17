import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const fail = (message) => { throw new Error(`v5.2 release check failed: ${message}`); };
const data = readJson("cornell-law-2026-27.zh-CN.json");
const releaseQa = readJson("qa/release-legal-translation-qa-v5.2.json");
const terminologyQa = readJson("qa/strict-legal-terminology-qa-v5.2.json");
const glossary = readJson("qa/legal-terminology-glossary-v5.2.json");
const legacyEnglishFields = ["titleEn", "descriptionEn", "restriction", "restrictionEn", "prerequisites", "prerequisitesEn", "corequisitesEn", "grading"];

if (data?.meta?.releaseVersion !== "v5.2") fail("dataset releaseVersion must be v5.2");
if (data?.meta?.fallbackCourseCount !== 0) fail("fallbackCourseCount must be zero");
if (!Array.isArray(data.courses) || data.courses.length !== 425) fail("dataset must contain 425 courses");
if (releaseQa.courseCount !== data.courses.length || releaseQa.failureCount !== 0 || releaseQa.failures?.length) fail("translation QA manifest is not clean");
if (terminologyQa.failureCount !== 0 || terminologyQa.failures?.length || terminologyQa.termOccurrences < 1) fail("terminology QA manifest is not clean");
if (glossary?.meta?.version !== "v5.2" || !Array.isArray(glossary.legalTerms) || glossary.legalTerms.length < 180) fail("locked legal glossary is incomplete");

const codeSet = new Set();
for (const course of data.courses) {
  if (!course.code || codeSet.has(course.code)) fail(`invalid or duplicate course code: ${course.code}`);
  codeSet.add(course.code);
  for (const field of ["titleZh", "descriptionZh", "gradingZh", "restrictionZh", "prerequisitesZh", "assessmentZh"]) {
    if (!String(course[field] || "").trim()) fail(`${course.code} missing ${field}`);
  }
  if (course.translationStatus !== "verified") fail(`${course.code} is not verified`);
  for (const field of legacyEnglishFields) if (Object.hasOwn(course, field)) fail(`${course.code} contains prohibited fallback field ${field}`);
}
for (const code of releaseQa.requiredLegalCourseChecks || []) if (!codeSet.has(code)) fail(`required legal course missing: ${code}`);

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(dataDir, "cornell.catalog.zh-CN.js"), "utf8"), sandbox);
const catalog = sandbox.window.CORNELL_COURSE_CATALOG;
if (!Array.isArray(catalog) || catalog.length !== data.courses.length) fail("catalog JS does not match dataset count");
for (let index = 0; index < catalog.length; index += 1) {
  const catalogCourse = catalog[index], dataCourse = data.courses[index];
  if (catalogCourse.code !== dataCourse.code || catalogCourse.titleZh !== dataCourse.titleZh || catalogCourse.descriptionZh !== dataCourse.descriptionZh) fail(`catalog JS mismatch at index ${index}`);
}
console.log(`PASS: v5.2 data=${data.courses.length}, glossary=${glossary.legalTerms.length}, locked-term occurrences=${terminologyQa.termOccurrences}.`);
