import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = file => JSON.parse(fs.readFileSync(path.join(root, "data", file), "utf8")).courses;
const fallEn = load("cornell-law-2026-27.en.json");
const fallZh = load("cornell-law-2026-27.zh-CN.json");
const springEn = load("cornell-law-spring-2027.en.json");
const springZh = load("cornell-law-spring-2027.zh-CN.json");
const excluded = new Set(["LAW 4013", "LAW 4051", "LAW 4081", "LAW 4131", "LAW 4330", "LAW 6332"]);
const fail = message => { throw new Error(`student simulation failed: ${message}`); };

function rng(seed) {
  let value = seed >>> 0;
  return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function shuffle(list, random) {
  const out = [...list];
  for (let index = out.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [out[index], out[target]] = [out[target], out[index]];
  }
  return out;
}

const days = meeting => new Set(String(meeting.pattern || "").match(/[MTWRF]/g) || []);
const datesOverlap = (a, b) => String(a.startDate || "0000-00-00") <= String(b.endDate || "9999-99-99") && String(b.startDate || "0000-00-00") <= String(a.endDate || "9999-99-99");
const timesOverlap = (a, b) => String(a.start || "00:00") < String(b.end || "24:00") && String(b.start || "00:00") < String(a.end || "24:00");
function sectionsConflict(first, second) {
  return (first?.meetings || []).some(a => (second?.meetings || []).some(b => [...days(a)].some(day => days(b).has(day)) && datesOverlap(a, b) && timesOverlap(a, b)));
}

function firstUsableSection(course) {
  return (course.sections || []).find(section => (section.meetings || []).some(meeting => meeting.pattern && meeting.start && meeting.end)) || null;
}

const FORMAT_PATTERNS = new Map([
  ["lecture", /\bLEC\b|lecture|讲授课/i],
  ["seminar", /\bSEM\b|seminar|研讨课/i],
  ["clinic", /\bCLN\b|clinic|clinical|诊所/i],
  ["practicum", /\bPRA\b|\bPRC\b|\bFLD\b|practicum|field studies|实践课/i],
  ["discussion", /\bDIS\b|discussion|讨论课/i],
  ["independent", /\bIND\b|independent|directed (?:study|work)|独立研究/i]
]);

function courseFormats(course) {
  const structured = [
    ...(Array.isArray(course.courseFormats) ? course.courseFormats : []),
    course.courseFormat,
    ...(course.sections || []).flatMap(section => [section.courseFormat, section.component, section.componentLabel, section.label])
  ].filter(Boolean).join(" ");
  return [...FORMAT_PATTERNS].filter(([, pattern]) => pattern.test(structured)).map(([format]) => format);
}

function buildPlan({ name, catalog, seed, dayChoices = [], barFirst = false }) {
  const random = rng(seed);
  let candidates = catalog.filter(course => !excluded.has(course.code) && course.eligibility !== "restricted" && Number(course.credits || 0) > 0 && firstUsableSection(course));
  if (dayChoices.length) candidates = candidates.filter(course => (firstUsableSection(course).meetings || []).some(meeting => [...days(meeting)].some(day => dayChoices.includes(day))));
  candidates = shuffle(candidates, random);
  if (barFirst) candidates.sort((a, b) => Number(Boolean(b.barCategories?.length)) - Number(Boolean(a.barCategories?.length)));
  const picked = [];
  let credits = 0;
  for (const course of candidates) {
    const section = firstUsableSection(course);
    const value = Number(course.credits || 0);
    if (credits + value > 15) continue;
    if (picked.some(item => sectionsConflict(item.section, section))) continue;
    picked.push({ course, section });
    credits += value;
    if (credits >= 12) break;
  }
  if (credits < 10 || credits > 15) fail(`${name} has ${credits} credits`);
  if (new Set(picked.map(item => item.course.id)).size !== picked.length) fail(`${name} contains a duplicate offering ID`);
  if (picked.some(item => excluded.has(item.course.code))) fail(`${name} contains an excluded course`);
  for (let i = 0; i < picked.length; i++) for (let j = i + 1; j < picked.length; j++) if (sectionsConflict(picked[i].section, picked[j].section)) fail(`${name} has a time conflict`);
  if (barFirst && !picked.some(item => item.course.barCategories?.length)) fail(`${name} did not select an official NY Bar category course`);
  return { name, credits, courses:picked.map(item => `${item.course.code} (${item.course.id})`) };
}

if (fallEn.length !== 136 || fallZh.length !== 136) fail(`Fall database count is ${fallEn.length}/${fallZh.length}, expected 136/136`);
if (springEn.length !== 127 || springZh.length !== 127) fail(`Spring database count is ${springEn.length}/${springZh.length}, expected 127/127`);
if (new Set([...fallEn, ...springEn].map(course => course.id)).size !== 263) fail("combined Fall/Spring offering IDs are not unique");
if (springEn.some(course => excluded.has(course.code))) fail("Spring database contains an undergraduate-, JD-, or Cornell Tech LL.M.-only course");
if (!springEn.some(course => course.code === "LAW 7028")) fail("current official Spring LAW 7028 offering is missing");
if (springEn.map(course => course.id).sort().join("|") !== springZh.map(course => course.id).sort().join("|")) fail("Spring bilingual offering IDs do not align");
for (const course of springZh) {
  if (!/[\u3400-\u9fff]/u.test(String(course.titleZh || ""))) fail(`${course.code} lacks a Chinese title`);
  if (!/[\u3400-\u9fff]/u.test(String(course.descriptionZh || ""))) fail(`${course.code} lacks a Chinese description or an explicit Chinese no-description status`);
  if (/暂无中文译文|中文待翻译|pending translation/i.test(String(course.descriptionZh || ""))) fail(`${course.code} still exposes a translation placeholder`);
}

const termFormatCounts = Object.fromEntries([["Fall 2026", fallEn], ["Spring 2027", springEn]].map(([term, catalog]) => [term, Object.fromEntries([...FORMAT_PATTERNS].map(([format]) => [format, catalog.filter(course => courseFormats(course).includes(format)).length]))]));
const expectedTermFormatCounts = {
  "Fall 2026": { lecture:57, seminar:30, clinic:31, practicum:15, discussion:0, independent:5 },
  "Spring 2027": { lecture:54, seminar:18, clinic:32, practicum:22, discussion:8, independent:1 }
};
for (const [term, expectedCounts] of Object.entries(expectedTermFormatCounts)) {
  for (const [format, expected] of Object.entries(expectedCounts)) {
    if (termFormatCounts[term][format] !== expected) fail(`${term} + ${format} expected ${expected} courses, found ${termFormatCounts[term][format]}`);
  }
}

const thursday = springEn.filter(course => (course.sections || []).some(section => (section.meetings || []).some(meeting => days(meeting).has("R"))));
const friday = springEn.filter(course => (course.sections || []).some(section => (section.meetings || []).some(meeting => days(meeting).has("F"))));
const thursdayFriday = springEn.filter(course => (course.sections || []).some(section => (section.meetings || []).some(meeting => [...days(meeting)].some(day => day === "R" || day === "F"))));
if (thursdayFriday.length < Math.max(thursday.length, friday.length)) fail("Thu + Fri OR filter lost courses");
if (!thursdayFriday.every(course => thursday.includes(course) || friday.includes(course))) fail("Thu + Fri OR filter included a nonmatching course");

const plans = [
  buildPlan({ name:"Student A · Fall general LL.M.", catalog:fallEn, seed:53101 }),
  buildPlan({ name:"Student B · Spring NY Bar focus", catalog:springEn, seed:53102, barFirst:true }),
  buildPlan({ name:"Student C · Spring Thu/Fri preference", catalog:springEn, seed:53103, dayChoices:["R", "F"] })
];

for (const plan of plans) console.log(`PASS: ${plan.name} · ${plan.credits} credits · ${plan.courses.join("; ")}`);
console.log(`PASS: term × format matrix · ${JSON.stringify(termFormatCounts)}`);
console.log(`PASS: Spring multi-day OR filter · Thu ${thursday.length} · Fri ${friday.length} · Thu/Fri union ${thursdayFriday.length}`);
console.log("PASS: Spring bilingual coverage · 127/127 titles and descriptions/statuses");
