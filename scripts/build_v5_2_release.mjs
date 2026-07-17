import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const inputPath = process.argv[2];

if (!inputPath) throw new Error("Usage: node scripts/build_v5_2_release.mjs <approved-cornell-json>");

const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const omittedFields = new Set([
  "titleEn", "descriptionEn", "restriction", "restrictionEn",
  "prerequisites", "prerequisitesEn", "corequisitesEn", "grading"
]);
const localizedFields = ["titleZh", "descriptionZh", "gradingZh", "restrictionZh", "prerequisitesZh", "assessmentZh"];

if (source?.meta?.releaseVersion !== "v5.2") throw new Error("Approved source is not a v5.2 dataset.");
if (!Array.isArray(source?.courses) || source.courses.length !== 425) throw new Error("Expected exactly 425 Cornell LAW courses.");

const courses = source.courses.map((course) => {
  const cleaned = Object.fromEntries(Object.entries(course).filter(([key]) => !omittedFields.has(key)));
  for (const field of localizedFields) {
    if (!String(cleaned[field] || "").trim()) throw new Error(`${cleaned.code || cleaned.id}: missing ${field}`);
  }
  if (cleaned.translationStatus !== "verified") throw new Error(`${cleaned.code || cleaned.id}: translation is not verified`);
  return cleaned;
});

const uniqueCodes = new Set(courses.map((course) => course.code));
if (uniqueCodes.size !== courses.length) throw new Error("Duplicate course code found.");

const meta = {
  ...source.meta,
  catalogCourseCount: courses.length,
  releaseVersion: "v5.2",
  appVersion: "5.2",
  buildPolicy: "课程中文字段在构建阶段固化；前端不保留英文文本回退字段。",
  sourceSha256: crypto.createHash("sha256").update(fs.readFileSync(inputPath)).digest("hex")
};
const output = { meta, courses };
const dataJson = `${JSON.stringify(output, null, 2)}\n`;
const catalogJs = `window.CORNELL_COURSE_CATALOG = ${JSON.stringify(courses, null, 2)};\nwindow.CORNELL_DATA_META = ${JSON.stringify(meta)};\n`;

fs.writeFileSync(path.join(dataDir, "cornell-law-2026-27.zh-CN.json"), dataJson, "utf8");
fs.writeFileSync(path.join(dataDir, "cornell.catalog.zh-CN.js"), catalogJs, "utf8");
console.log(`Built v5.2 offline catalog: ${courses.length} courses.`);
