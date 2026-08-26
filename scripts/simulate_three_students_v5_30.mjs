import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = file => JSON.parse(fs.readFileSync(path.join(root, "data", file), "utf8")).courses;
const fall = load("cornell-law-2026-27.en.json");
const spring = load("cornell-law-spring-2027.en.json");
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

const thursday = spring.filter(course => (course.sections || []).some(section => (section.meetings || []).some(meeting => days(meeting).has("R"))));
const friday = spring.filter(course => (course.sections || []).some(section => (section.meetings || []).some(meeting => days(meeting).has("F"))));
const thursdayFriday = spring.filter(course => (course.sections || []).some(section => (section.meetings || []).some(meeting => [...days(meeting)].some(day => day === "R" || day === "F"))));
if (thursdayFriday.length < Math.max(thursday.length, friday.length)) fail("Thu + Fri OR filter lost courses");
if (!thursdayFriday.every(course => thursday.includes(course) || friday.includes(course))) fail("Thu + Fri OR filter included a nonmatching course");

const plans = [
  buildPlan({ name:"Student A · Fall general LL.M.", catalog:fall, seed:53001 }),
  buildPlan({ name:"Student B · Spring NY Bar focus", catalog:spring, seed:53002, barFirst:true }),
  buildPlan({ name:"Student C · Spring Thu/Fri preference", catalog:spring, seed:53003, dayChoices:["R", "F"] })
];

for (const plan of plans) console.log(`PASS: ${plan.name} · ${plan.credits} credits · ${plan.courses.join("; ")}`);
console.log(`PASS: Spring multi-day OR filter · Thu ${thursday.length} · Fri ${friday.length} · Thu/Fri union ${thursdayFriday.length}`);
