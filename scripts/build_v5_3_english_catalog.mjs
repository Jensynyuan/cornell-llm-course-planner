import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: node scripts/build_v5_3_english_catalog.mjs <approved-English-source-json>");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (!Array.isArray(source.courses) || source.courses.length !== 425) throw new Error("Expected 425 English Cornell courses.");
for (const course of source.courses) {
  if (!String(course.code || "").trim() || !String(course.titleEn || "").trim()) throw new Error(`${course.code || course.id}: missing code or English title`);
  if (!String(course.descriptionEn || "").trim()) course.descriptionEn = "No official course description is available in the current catalog snapshot.";
}

const output = {
  meta: { ...source.meta, releaseVersion:"v5.3", language:"en", purpose:"offline English course presentation dataset" },
  courses: source.courses
};
fs.writeFileSync(path.join(dataDir, "cornell-law-2026-27.en.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(dataDir, "cornell.catalog.en.js"), `window.CORNELL_COURSE_CATALOG_EN = ${JSON.stringify(output.courses)};\nwindow.CORNELL_DATA_META_EN = ${JSON.stringify(output.meta)};\n`, "utf8");
console.log(`Built v5.3 English catalog: ${output.courses.length} courses.`);
