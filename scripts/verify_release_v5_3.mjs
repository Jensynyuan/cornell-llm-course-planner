import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const zh = JSON.parse(fs.readFileSync(path.join(dataDir, "cornell-law-2026-27.zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(dataDir, "cornell-law-2026-27.en.json"), "utf8"));
const fail = message => { throw new Error(`v5.3 release check failed: ${message}`); };
if (zh.courses.length !== 425 || en.courses.length !== 425) fail("both language datasets must contain 425 courses");
const zhCodes = new Set(zh.courses.map(course => course.code));
for (const course of en.courses) {
  if (!zhCodes.has(course.code)) fail(`English course missing from Chinese catalog: ${course.code}`);
  if (!String(course.titleEn || "").trim() || !String(course.descriptionEn || "").trim()) fail(`English text incomplete: ${course.code}`);
}
const sandbox = { window:{} };
for (const file of ["cornell.catalog.zh-CN.js", "cornell.catalog.en.js"]) vm.runInNewContext(fs.readFileSync(path.join(dataDir, file), "utf8"), sandbox);
if (sandbox.window.CORNELL_COURSE_CATALOG?.length !== 425 || sandbox.window.CORNELL_COURSE_CATALOG_EN?.length !== 425) fail("browser language catalogs are incomplete");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const marker of ["languageToggleBtn", "assistantImportPrompt", "generateRecommendedPlanBtn", "cornell.catalog.en.js"]) if (!index.includes(marker)) fail(`interface marker absent: ${marker}`);
console.log("PASS: v5.3 bilingual catalogs=425/425, import prompt and preference controls present.");
