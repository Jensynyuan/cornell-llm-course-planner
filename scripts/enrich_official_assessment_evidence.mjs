import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const roster = "FA26";
const apiUrl = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${roster}&subject=LAW`;
const read = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");

function splitSentences(text) {
  return String(text || "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(item => item.trim()).filter(Boolean) || [];
}

function unique(items) {
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

function finalMethod(sentence) {
  const text = sentence.toLowerCase();
  if (!/\bfinal\b/.test(text)) return null;
  if (/\b(?:take[- ]home )?(?:final )?(?:exam|examination)\b/.test(text)) return { type:"exam", labelZh:"期末考试", labelEn:"Final examination" };
  if (/\bfinal (?:research )?(?:paper|essay|written (?:assignment|work))\b/.test(text)) return { type:"written", labelZh:"期末书面作业／论文", labelEn:"Final written work" };
  if (/\bfinal project\b/.test(text)) return { type:"project", labelZh:"期末项目", labelEn:"Final project" };
  if (/\bfinal presentation\b/.test(text)) return { type:"presentation", labelZh:"期末展示", labelEn:"Final presentation" };
  if (/\bfinal (?:requirement|assessment|evaluation)\b/.test(text)) return { type:"other", labelZh:"其他明确的期末要求", labelEn:"Other stated final requirement" };
  return null;
}

function assessmentEvidence(description, sourceUrl, checkedAt) {
  const sentences = splitSentences(description);
  const assignment = /\b(assign(?:ed|ment|ments)|written exercise|paper(?:s)?|memorand(?:um|a)|memo(?:s)?|draft(?:ing)?|brief(?:s)?|project(?:s)?|presentation(?:s)?|problem set(?:s)?|class participation|participate in class|participation)\b/i;
  const assignments = unique(sentences.filter(sentence => assignment.test(sentence)));
  const finalMethods = sentences.map(sentence => ({ sentence, method:finalMethod(sentence) })).filter(item => item.method).map(item => ({ ...item.method, evidence:item.sentence }));
  const finals = unique(finalMethods.map(item => item.evidence));
  return {
    source: "Cornell Fall 2026 Class Roster API course description",
    sourceUrl,
    checkedAt,
    assignments,
    finalAssessment: finals,
    finalMethods,
    status: assignments.length || finals.length ? "explicit-in-official-description" : "not-stated-in-official-description"
  };
}

const response = await fetch(apiUrl, { headers: { Accept: "application/json", "User-Agent": "Cornell-LLM-Course-Planner-v5.7" } });
if (!response.ok) throw new Error(`Cornell API returned ${response.status}`);
const payload = await response.json();
if (payload.status !== "success" || !Array.isArray(payload.data?.classes)) throw new Error("Cornell API returned an unexpected payload");

const checkedAt = new Date().toISOString();
const apiByCode = new Map(payload.data.classes.map(course => [`LAW ${course.catalogNbr}`, course]));
const report = { checkedAt, apiUrl, courseCount: payload.data.classes.length, explicitAssignments: 0, explicitFinalAssessment: 0, finalMethodCounts:{exam:0,written:0,project:0,presentation:0,other:0}, noFinalMethodStated: 0 };

for (const file of ["cornell-law-2026-27.zh-CN.json", "cornell-law-2026-27.en.json"]) {
  const dataset = read(file);
  for (const course of dataset.courses || []) {
    const official = apiByCode.get(course.code);
    if (!official) continue;
    const sourceUrl = `https://classes.cornell.edu/browse/roster/${roster}/class/LAW/${official.catalogNbr}`;
    const officialDescriptionEn = String(official.description || "").trim();
    const evidence = assessmentEvidence(officialDescriptionEn, sourceUrl, checkedAt);
    course.officialTitleEn = official.titleLong || official.titleShort || course.officialTitleEn || course.titleEn || course.code;
    course.officialDescriptionEn = officialDescriptionEn;
    course.assessmentEvidence = evidence;
    course.translationStatus = course.descriptionZh ? "source-grounded-chinese-translation" : "official-english-description";
    course.translationMethod = course.descriptionZh ? "Chinese translation shown alongside the current official English source." : "Official English source is available; Chinese translation is pending.";
    course.generatedChineseOverviewRemoved = false;
    if (file.endsWith("zh-CN.json")) {
      if (evidence.assignments.length) report.explicitAssignments += 1;
      if (evidence.finalAssessment.length) report.explicitFinalAssessment += 1;
      if (!evidence.finalMethods.length) report.noFinalMethodStated += 1;
      for (const method of evidence.finalMethods) report.finalMethodCounts[method.type] += 1;
    }
  }
  dataset.meta = {
    ...dataset.meta,
    releaseVersion: "v5.9",
    assessmentEvidenceSource: "Cornell Fall 2026 Class Roster API course descriptions",
    assessmentEvidenceCheckedAt: checkedAt,
    chineseNarrativePolicy: "Chinese translations are shown only when grounded in stored course-source material; the current official English source remains available in the course detail."
  };
  write(file, dataset);
  const variable = file.includes("zh-CN") ? "CORNELL_COURSE_CATALOG" : "CORNELL_COURSE_CATALOG_EN";
  const metaVariable = file.includes("zh-CN") ? "CORNELL_DATA_META" : "CORNELL_DATA_META_EN";
  fs.writeFileSync(path.join(dataDir, file.includes("zh-CN") ? "cornell.catalog.zh-CN.js" : "cornell.catalog.en.js"), `window.${variable} = ${JSON.stringify(dataset.courses)};\nwindow.${metaVariable} = ${JSON.stringify(dataset.meta)};\n`, "utf8");
}

fs.writeFileSync(path.join(dataDir, "cornell-fa26-assessment-evidence-audit.v5.9.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
