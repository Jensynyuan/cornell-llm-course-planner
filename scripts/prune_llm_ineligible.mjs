import { readFile, writeFile } from "node:fs/promises";

const root = new URL("..\\", import.meta.url);
const dataFiles = ["data/cornell-law-2026-27.zh-CN.json", "data/cornell-law-2026-27.en.json"];
const catalogFiles = ["data/cornell.catalog.zh-CN.js", "data/cornell.catalog.en.js"];
const isUndergraduateOnly = course => /(?:undergraduates?|本科生)/i.test(`${course.restriction || ""} ${course.restrictionZh || ""}`);

async function pruneJson(relative) {
  const url = new URL(relative, root);
  const dataset = JSON.parse(await readFile(url, "utf8"));
  const removed = dataset.courses.filter(isUndergraduateOnly).map(course => course.code);
  dataset.courses = dataset.courses.filter(course => !isUndergraduateOnly(course));
  dataset.llmEligibilityPolicy = "v5.8 excludes offerings explicitly restricted to undergraduates; they cannot be treated as normal LL.M. degree-credit options.";
  dataset.releaseVersion = "v5.8";
  await writeFile(url, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  return removed;
}

async function pruneCatalog(relative) {
  const url = new URL(relative, root);
  const source = await readFile(url, "utf8");
  const match = source.match(/^window\.CORNELL_COURSE_CATALOG(?:_EN)? = (.*?);\s*window\.CORNELL_DATA_META(?:_EN)? = (.*);\s*$/s);
  if (!match) throw new Error(`Unexpected catalog file: ${relative}`);
  const courses = JSON.parse(match[1]).filter(course => !isUndergraduateOnly(course));
  const meta = JSON.parse(match[2]);
  meta.catalogCourseCount = courses.length;
  meta.releaseVersion = "v5.8";
  meta.appVersion = "5.8";
  meta.llmEligibilityPolicy = "Explicit undergraduate-only offerings are excluded from the planner.";
  const catalogName = /\.en\.js$/.test(relative) ? "CORNELL_COURSE_CATALOG_EN" : "CORNELL_COURSE_CATALOG";
  const metaName = /\.en\.js$/.test(relative) ? "CORNELL_DATA_META_EN" : "CORNELL_DATA_META";
  await writeFile(url, `window.${catalogName} = ${JSON.stringify(courses)};\nwindow.${metaName} = ${JSON.stringify(meta)};\n`, "utf8");
}

const removed = await Promise.all(dataFiles.map(pruneJson));
await Promise.all(catalogFiles.map(pruneCatalog));
console.log(JSON.stringify({ removed: [...new Set(removed.flat())].sort(), remaining: 134 }, null, 2));
