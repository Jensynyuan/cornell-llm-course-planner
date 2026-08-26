import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const courseOfferingsUrl = "https://support.law.cornell.edu/CourseOfferings/";
const academicCalendarUrl = "https://community.lawschool.cornell.edu/academics/2026-27-academic-calendar/";
const historyTerms = ["FA26", "SP26", "FA25", "SP25", "FA24", "SP24", "FA23", "SP23", "FA22", "SP22", "FA21", "SP21", "FA20", "SP20"];
const instructionStart = "2027-01-19";
const instructionEnd = "2027-04-28";
const examEnd = "2027-05-14";
const noClassDates = ["2027-01-18", "2027-02-15", "2027-02-16", "2027-03-29", "2027-03-30", "2027-03-31", "2027-04-01", "2027-04-02"];
const calendarPeriods = [
  { start:"2027-01-18", end:"2027-01-18", type:"holiday", noClass:true, labelEn:"Martin Luther King, Jr. Holiday", labelZh:"马丁·路德·金纪念日" },
  { start:"2027-02-15", end:"2027-02-16", type:"break", noClass:true, labelEn:"February Break", labelZh:"二月假期" },
  { start:"2027-03-29", end:"2027-04-02", type:"break", noClass:true, labelEn:"Spring Break", labelZh:"春假" }
];
const specialScheduleDays = { "2027-04-28":"M" };
const explicitlyExcluded = new Map([
  ["4013", "undergraduate-only"],
  ["4051", "undergraduate-only"],
  ["4081", "undergraduate-only"],
  ["4131", "undergraduate-only"],
  ["4330", "undergraduate-only"],
  ["6332", "cornell-tech-llm-only"]
]);
const datasets = [
  { language:"zh-CN", json:"cornell-law-spring-2027.zh-CN.json", catalog:"cornell.catalog.spring-2027.zh-CN.js", catalogGlobal:"CORNELL_SPRING_2027_COURSE_CATALOG", metaGlobal:"CORNELL_SPRING_2027_DATA_META" },
  { language:"en", json:"cornell-law-spring-2027.en.json", catalog:"cornell.catalog.spring-2027.en.js", catalogGlobal:"CORNELL_SPRING_2027_COURSE_CATALOG_EN", metaGlobal:"CORNELL_SPRING_2027_DATA_META_EN" }
];

const checkedAt = new Date().toISOString();
const readJson = file => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
const clean = value => String(value ?? "").replace(/\r\n<p>\r\n/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
const uniq = values => [...new Set(values.filter(value => value !== "" && value !== null && value !== undefined))];
const codeOf = number => `LAW ${number}`;
const idOf = number => `LAW-${number}-SP27`;

function sentenceUnits(value) {
  return (clean(value).match(/[^.!?。！？]+[.!?。！？]+(?:[”’"'）)\]]*)|[^.!?。！？]+$/gu) || []).map(clean).filter(Boolean);
}

function dedupeStableSentences(value) {
  const text = clean(value);
  const sentences = sentenceUnits(text);
  if (!sentences.length) return text;
  const seen = new Set();
  const kept = [];
  for (const sentence of sentences) {
    const key = clean(sentence).replace(/\s+to the instructors?(?=[.!?]?$)/i, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(sentence);
  }
  return kept.join(" ");
}

function dedupeAdjacentSentenceBlocks(paragraph) {
  const sentences = sentenceUnits(paragraph);
  if (sentences.length < 2) return { text:paragraph, changed:false };
  let changed = false;
  for (let index = 0; index < sentences.length; index += 1) {
    for (let size = Math.floor((sentences.length - index) / 2); size >= 1; size -= 1) {
      const first = sentences.slice(index, index + size);
      const second = sentences.slice(index + size, index + (size * 2));
      if (first.join(" ").length < 160 || first.some((sentence, offset) => sentence !== second[offset])) continue;
      sentences.splice(index + size, size);
      changed = true;
      index = Math.max(-1, index - 1);
      break;
    }
  }
  return { text:changed ? sentences.join(" ") : paragraph, changed };
}

function dedupeAdjacentRepeatedDescriptionBlocks(value) {
  const text = clean(value);
  if (!text) return "";
  const paragraphs = text.split(/\n+/).map(clean).filter(Boolean);
  const deduped = [];
  let changed = false;
  let previousParagraph = "";
  for (const paragraph of paragraphs) {
    if (previousParagraph && paragraph.length >= 160 && paragraph === previousParagraph) {
      changed = true;
      continue;
    }
    const processed = dedupeAdjacentSentenceBlocks(paragraph);
    if (processed.changed) changed = true;
    deduped.push(processed.text);
    previousParagraph = paragraph;
  }
  return changed ? deduped.join("\n\n") : text;
}
const officialRosterUrl = (term, number) => `https://classes.cornell.edu/browse/roster/${term}/class/LAW/${number}`;

function extractEmbeddedCourses(html) {
  const marker = html.indexOf("courses:");
  const start = html.indexOf("[", marker);
  if (marker < 0 || start < 0) throw new Error("Could not locate the embedded Course Offerings data array.");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "[") depth += 1;
    else if (char === "]" && --depth === 0) return JSON.parse(html.slice(start, index + 1));
  }
  throw new Error("Could not find the end of the embedded Course Offerings data array.");
}

function normalizeGrading(value) {
  if (/letter grade only/i.test(value)) return "Letter grades only";
  if (/s\/u only|^s\/u$/i.test(value)) return "Satisfactory/Unsatisfactory";
  if (/s\/u or letter grade/i.test(value)) return "Letter or S/U grades";
  return clean(value) || "Not published";
}

function gradingZh(value) {
  if (value === "Letter grades only") return "仅采用字母等级评分";
  if (value === "Satisfactory/Unsatisfactory") return "仅采用 S/U（合格／不合格）评分";
  if (value === "Letter or S/U grades") return "可采用字母等级或 S/U（合格／不合格）评分";
  if (value === "Varies by section") return "评分方式因班次而异";
  return "官方尚未公布评分方式";
}

const attrLabelsEn = {
  ExperientialLearning:"Experiential Learning",
  ProfessionalResponsibility:"Professional Responsibility",
  Writing:"Writing",
  ILA1:"International Law and Practice",
  ILA2:"International Comparative and Foreign Law",
  ILA3:"International Legal Studies",
  JDLLM1:"JD/LLM elective",
  JDLLM2:"JD/LLM elective",
  AdvocacyConcentration:"Advocacy",
  BusinessConcentration:"Business Law and Regulation",
  GeneralConcentration:"General Practice",
  PublicConcentration:"Public Law",
  ConflictResolutionConcentration:"Conflict Resolution",
  TechnologyConcentration:"Law, Technology and Entrepreneurship",
  LawAndInequityConcentration:"Law, Inequity and Structural Exclusion"
};
const attrLabelsZh = {
  ExperientialLearning:"体验式学习",
  ProfessionalResponsibility:"律师职业责任",
  Writing:"写作要求",
  ILA1:"国际法与实务",
  ILA2:"国际法、比较法与外国法",
  ILA3:"国际法律研究",
  JDLLM1:"JD／LL.M. 选修",
  JDLLM2:"JD／LL.M. 选修",
  AdvocacyConcentration:"诉讼与倡导方向",
  BusinessConcentration:"商业法与监管方向",
  GeneralConcentration:"一般法律实务方向",
  PublicConcentration:"公法方向",
  ConflictResolutionConcentration:"争议解决方向",
  TechnologyConcentration:"法律、科技与创业方向",
  LawAndInequityConcentration:"法律、不平等与结构性排斥方向"
};
const concentrationKeys = ["AdvocacyConcentration", "BusinessConcentration", "GeneralConcentration", "PublicConcentration", "ConflictResolutionConcentration", "TechnologyConcentration", "LawAndInequityConcentration"];

function sourceAttributes(record) {
  return Object.fromEntries(Object.keys(attrLabelsEn).concat(["NYTechCourse", "TwentyCreditLimit"]).map(key => [key, Boolean(record[key])]));
}

function parseTime(value) {
  const match = clean(value).match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function locationFromRoom(room) {
  const value = clean(room);
  if (!value) return { location:"", locationZh:"官方未公布具体地点", status:"unpublished", mode:"Not published" };
  if (/online/i.test(value)) return { location:"Online", locationZh:"线上授课", status:"published", mode:"Online" };
  if (/off.?site/i.test(value)) return { location:"Offsite", locationZh:"校外地点", status:"published", mode:"Not published" };
  return { location:`Myron Taylor Hall ${value}`, locationZh:`迈伦·泰勒楼 ${value} 室`, status:"published", mode:"Not published" };
}

function parseMeetings(raw, dates, location) {
  const text = clean(raw);
  if (!text) return [];
  const meetings = [];
  for (const segment of text.split(/\s*,\s*/)) {
    const match = segment.match(/^([MTWRFSU]+)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)$/i);
    if (!match) continue;
    meetings.push({
      pattern:match[1].toUpperCase(),
      start:parseTime(match[2]),
      end:parseTime(match[3]),
      startDate:dates.startDate,
      endDate:dates.endDate,
      scheduleDateStatus:dates.status,
      location:location.location,
      locationZh:location.locationZh,
      locationStatus:location.status,
      locationSource:"Cornell Law Course Offerings",
      campusZh:"康奈尔大学伊萨卡主校区或课程指定地点"
    });
  }
  return meetings;
}

function sectionDates(record, existingSection) {
  if (existingSection?.daysTimesRaw === clean(record.section.DaysTimes) && existingSection.startDate && existingSection.endDate) {
    const existingStatus = existingSection.meetings?.[0]?.scheduleDateStatus || existingSection.scheduleDateStatus || "current-course-offerings-date";
    if (existingSection.startDate === "2027-01-25" && existingSection.endDate === "2027-05-11" && existingStatus !== "current-course-offerings-specific-date") {
      return { startDate:instructionStart, endDate:instructionEnd, status:"regular-spring-term" };
    }
    return { startDate:existingSection.startDate, endDate:existingSection.endDate, status:existingStatus };
  }
  const evidence = clean(`${record.Description} ${record.AddInfo}`);
  const numeric = evidence.match(/(?:meets?|format[, ]+)\s*(\d{1,2})\/(\d{1,2})(?:\/2027)?\s*(?:-|through|to)\s*(\d{1,2})\/(\d{1,2})\/2027/i);
  if (numeric) return { startDate:`2027-${String(numeric[1]).padStart(2,"0")}-${String(numeric[2]).padStart(2,"0")}`, endDate:`2027-${String(numeric[3]).padStart(2,"0")}-${String(numeric[4]).padStart(2,"0")}`, status:"current-course-offerings-specific-date" };
  const monthNames = { january:"01", february:"02", march:"03", april:"04", may:"05" };
  const named = evidence.match(/(January|February|March|April|May)\s+(\d{1,2})\s*(?:-|through|to)\s*(?:(January|February|March|April|May)\s+)?(\d{1,2}),?\s*2027/i);
  if (named) {
    const startMonth = monthNames[named[1].toLowerCase()];
    const endMonth = monthNames[(named[3] || named[1]).toLowerCase()];
    return { startDate:`2027-${startMonth}-${String(named[2]).padStart(2,"0")}`, endDate:`2027-${endMonth}-${String(named[4]).padStart(2,"0")}`, status:"current-course-offerings-specific-date" };
  }
  return { startDate:instructionStart, endDate:instructionEnd, status:"regular-spring-term" };
}

function inferComponent(record) {
  const evidence = clean(`${record.CourseTitle} ${record.Description} ${record.AddInfo}`);
  if (/independent study|directed reading|supervised writing/i.test(evidence)) return { component:"IND", componentLabel:"Independent Study", courseFormat:"independent", basis:"current-official-title-description" };
  if (/clinic/i.test(record.CourseTitle)) return { component:"CLN", componentLabel:"Clinical", courseFormat:"clinic", basis:"current-official-title" };
  if (/practicum|externship|field placement|\blab\b/i.test(record.CourseTitle) || /\bproject-based course\b/i.test(record.Description)) return { component:"PRA", componentLabel:"Practicum", courseFormat:"practicum", basis:"current-official-title-description" };
  if (/seminar|colloquium/i.test(evidence)) return { component:"SEM", componentLabel:"Seminar", courseFormat:"seminar", basis:"current-official-title-description" };
  return { component:"LEC", componentLabel:"Lecture", courseFormat:"lecture", basis:"current-official-course-record" };
}

const formatByComponent = component => ({ LEC:"lecture", SEM:"seminar", CLN:"clinic", PRA:"practicum", PRC:"practicum", FLD:"practicum", DIS:"discussion", IND:"independent" }[component] || "lecture");
const labelByComponent = component => ({ LEC:"Lecture", SEM:"Seminar", CLN:"Clinical", PRA:"Practicum", PRC:"Practicum", FLD:"Field Studies", DIS:"Discussion", IND:"Independent Study" }[component] || "Lecture");

function chooseHistoricalComponent(historyCourse, currentSection) {
  if (!historyCourse) return null;
  const sections = historyCourse.course.enrollGroups.flatMap(group => group.classSections || []);
  const graded = sections.filter(section => section.isComponentGraded !== false);
  const candidates = graded.length ? graded : sections;
  const currentNumber = String(Number(currentSection.Section));
  const exact = candidates.find(section => String(Number(section.section)) === currentNumber);
  const chosen = exact || candidates.sort((a, b) => String(a.section).localeCompare(String(b.section), undefined, { numeric:true }))[0];
  if (!chosen?.ssrComponent) return null;
  return {
    component:clean(chosen.ssrComponent).toUpperCase(),
    componentLabel:clean(chosen.ssrComponentLong) || labelByComponent(clean(chosen.ssrComponent).toUpperCase()),
    courseFormat:formatByComponent(clean(chosen.ssrComponent).toUpperCase()),
    basis:"historical-official-roster",
    sourceTerm:historyCourse.term,
    sourceUrl:officialRosterUrl(historyCourse.term, historyCourse.course.catalogNbr)
  };
}

function leadingEvidence(text, pattern) {
  const source = clean(text);
  const sentences = source.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  return uniq(sentences.filter(sentence => pattern.test(sentence))).join(" ");
}

function structuredEnrollment(records, historyCourse) {
  const combined = records.map(record => clean(`${record.Description} ${record.AddInfo}`)).join("\n");
  const sentences = combined.split(/(?<=[.!?])\s+|\n+/).map(clean).filter(Boolean);
  const currentPrereq = uniq(sentences.filter(sentence => /^\[?(?:pre-?req(?:uisite)?s?(?: info)?|prerequisite(?:s| info)?)\s*:/i.test(sentence) || /^students should have\b/i.test(sentence) || /only open to students who have completed/i.test(sentence) || /^no prior\b.*\brequired\b/i.test(sentence) || /^(?:some )?familiarity\b.*\bnot required\b/i.test(sentence) || /^prior work\b.*\bnot required\b/i.test(sentence))).join(" ");
  const restrictionPattern = /\benrollment\s+(?:is\s+)?limited to\b|\blimited to\s+(?:(?:general\s+)?LL\.?M\.?|J\.?D\.?|3L|law students?|students? who|undergraduates?)\b|\bonly open to\b|\bpermission (?:of|from) (?:the )?instructor\b|\binstructors?' permission to enroll\b|\binstructor permission\b|\bby application\b|\bapplication (?:is )?(?:required|only)\b|\b(?:submit|send|complete|file)\b.{0,120}\bapplication\b|\bto apply\b|\bstudents? (?:must|should) (?:submit|contact|apply)\b|\bstudents? (?:are )?(?:requested|required) to (?:submit|contact|apply)\b|\ball enrolled students? must be available\b|\bstudents? must set aside\b|\bmust contact\b|\binterested students?\b.{0,120}\b(?:must|should|contact|apply|submit)\b|\battendance\b.{0,80}\b(?:mandatory|required)\b|\bby arrangement\b|\bdepartment consent\b|\bmust submit\b/i;
  const currentRestrictionRaw = uniq([
    ...records.map(record => clean(record.AddInfo)).filter(value => restrictionPattern.test(value)),
    ...sentences.filter(sentence => restrictionPattern.test(sentence))
  ]).join(" ");
  const currentRestriction = dedupeStableSentences(currentRestrictionRaw);
  const currentAcademicYearCatalog = /^(?:FA26|SP26)$/.test(historyCourse?.term || "");
  const catalogPrerequisite = currentAcademicYearCatalog ? clean(historyCourse?.course.catalogPrereqCoreq || historyCourse?.course.catalogPrereq || "") : "";
  const catalogRestriction = currentAcademicYearCatalog ? clean(historyCourse?.course.catalogEnrollmentPriority || "") : "";
  return {
    prerequisitesEn:currentPrereq || catalogPrerequisite || "Cornell's current Course Offerings page and the latest available 2026-27 official Catalog record do not publish a separate prerequisite for this course.",
    prerequisitesProvenance:currentPrereq ? { kind:"current-official-course-offerings", sourceUrl:courseOfferingsUrl, checkedAt } : catalogPrerequisite ? { kind:"current-academic-year-official-catalog", sourceTerm:historyCourse.term, sourceUrl:officialRosterUrl(historyCourse.term, historyCourse.course.catalogNbr), checkedAt, note:"The current Course Offerings page does not expose a separate prerequisite field; the latest available 2026-27 official Catalog field is used." } : { kind:"official-no-separate-prerequisite-status", sourceUrl:courseOfferingsUrl, latestCatalogSourceUrl:currentAcademicYearCatalog ? officialRosterUrl(historyCourse.term, historyCourse.course.catalogNbr) : null, checkedAt, note:"Older prerequisite text is not promoted to a Spring 2027 requirement. Current sources do not publish one." },
    restrictionEn:currentRestriction || catalogRestriction || "Cornell's current Course Offerings page and the latest available 2026-27 official Catalog record do not publish a separate enrollment restriction for this course.",
    restrictionRawEn:currentRestrictionRaw || catalogRestriction || "",
    restrictionProvenance:currentRestriction ? { kind:"current-official-course-offerings", sourceUrl:courseOfferingsUrl, checkedAt, normalization:currentRestrictionRaw !== currentRestriction ? "Exact duplicate sentences from overlapping official description/additional-information extraction were removed; the first occurrence is retained in restrictionEn and the raw combined text is retained in restrictionRawEn." : "none" } : catalogRestriction ? { kind:"current-academic-year-official-catalog", sourceTerm:historyCourse.term, sourceUrl:officialRosterUrl(historyCourse.term, historyCourse.course.catalogNbr), checkedAt, note:"The current Course Offerings page does not expose a separate restriction field; the latest available 2026-27 official Catalog field is used." } : { kind:"official-no-separate-restriction-status", sourceUrl:courseOfferingsUrl, latestCatalogSourceUrl:currentAcademicYearCatalog ? officialRosterUrl(historyCourse.term, historyCourse.course.catalogNbr) : null, checkedAt, note:"Older enrollment text is not promoted to a Spring 2027 restriction. Current sources do not publish one." }
  };
}

function createSection(record, course, existingSection, historyCourse) {
  const dates = sectionDates(record, existingSection);
  const location = locationFromRoom(record.section.Room);
  const historical = chooseHistoricalComponent(historyCourse, record.section);
  const component = historical || inferComponent(record);
  const raw = clean(record.section.DaysTimes);
  const meetings = existingSection?.daysTimesRaw === raw ? (existingSection.meetings || []).map(meeting => ({ ...meeting, location:location.location, locationZh:location.locationZh, locationStatus:location.status, locationSource:"Cornell Law Course Offerings", startDate:dates.startDate, endDate:dates.endDate, scheduleDateStatus:dates.status, campusZh:"康奈尔大学伊萨卡主校区或课程指定地点" })) : parseMeetings(raw, dates, location);
  const sectionNumber = clean(record.section.Section);
  const grade = normalizeGrading(record.GradeOption);
  const credits = Number(record.Credits);
  const descriptionRawEn = clean(record.Description);
  const descriptionEn = dedupeAdjacentRepeatedDescriptionBlocks(descriptionRawEn);
  return {
    ...(existingSection || {}),
    id:`${idOf(record.CourseNumber)}-${sectionNumber}`,
    label:`${component.componentLabel} ${sectionNumber}`,
    section:sectionNumber,
    classNumber:"",
    component:component.component,
    componentLabel:component.componentLabel,
    courseFormat:component.courseFormat,
    componentStatus:component.basis,
    componentProvenance:{ kind:component.basis, sourceTerm:component.sourceTerm || "SP27", sourceUrl:component.sourceUrl || courseOfferingsUrl, checkedAt, note:component.basis === "historical-official-roster" ? "Historical roster data is used only for the section component/course format; Spring 2027 dates and times come exclusively from current Course Offerings." : "The current official title/description establishes the course format." },
    startDate:dates.startDate,
    endDate:dates.endDate,
    scheduleDateStatus:dates.status,
    meetings,
    daysTimesRaw:raw,
    daysTimesStatus:raw ? "published-as-source-text" : "not-published",
    meetingStatus:meetings.length ? "published" : "not-published",
    credits,
    creditText:`${credits} ${credits === 1 ? "Credit" : "Credits"}`,
    creditTextZh:`${credits} 学分`,
    instructors:clean(record.section.Professor).split(/\s*\/\s*/).map(clean).filter(Boolean),
    instructorStatus:clean(record.section.Professor) ? "published" : "not-published",
    instructionMode:clean(record.section.ModeOfInstructionDescription) || location.mode,
    campusZh:"康奈尔大学伊萨卡主校区或课程指定地点",
    location:location.location,
    locationZh:location.locationZh,
    locationStatus:location.status,
    locationSource:"Cornell Law Course Offerings",
    roomRaw:clean(record.section.Room),
    notes:[],
    grading:grade,
    gradingZh:gradingZh(grade),
    titleEn:clean(record.CourseTitle),
    descriptionEn,
    descriptionRawEn,
    descriptionNormalization:descriptionRawEn !== descriptionEn ? { kind:"adjacent-exact-repeat-removal", sourceTextRetainedIn:"descriptionRawEn", note:"Only an immediately repeated exact sentence/paragraph block of at least 160 characters was removed from the display description." } : null,
    additionalInformationEn:clean(record.AddInfo),
    degreeRequirementsEn:clean(record.DegreeRequirements),
    syllabusUrl:clean(record.section.Syllabus),
    preRegistration:Boolean(record.section.PreReg),
    dropDate:clean(record.section.DropDate),
    sourceAttributes:sourceAttributes(record),
    officialSourceUrl:courseOfferingsUrl,
    officialSourceTerm:"SP27",
    officialSourceCheckedAt:checkedAt
  };
}

function combineGrading(sections) {
  const values = uniq(sections.map(section => section.grading));
  return values.length === 1 ? values[0] : "Varies by section";
}

function defaultChineseStatus(kind, english) {
  if (kind === "prerequisite") {
    if (/do(?:es)? not publish a separate prerequisite/i.test(english)) return "Cornell 当前课程设置未单列本课程的先修要求。";
    return `先修要求详见官方英文原文：${english}`;
  }
  if (/do(?:es)? not publish a separate enrollment restriction/i.test(english)) return "Cornell 当前课程设置未单列本课程的选课限制。";
  return `选课限制详见官方英文原文：${english}`;
}

function buildCourse(number, records, existing, historyCourse) {
  const flattened = records.flatMap(record => (record.Sections || []).filter(section => section.SectionSemester === "S" && String(section.SectionYear) === "2027").map(section => ({ ...record, section })));
  const existingBySection = new Map((existing?.sections || []).map(section => [String(section.section), section]));
  const sections = flattened.map(record => createSection(record, existing, existingBySection.get(clean(record.section.Section)), historyCourse)).sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric:true }));
  const titles = uniq(records.map(record => clean(record.CourseTitle)));
  const descriptions = uniq(records.map(record => clean(record.Description)));
  const longestDescription = descriptions.slice().sort((a, b) => b.length - a.length)[0] || "";
  const historicalDescription = !longestDescription ? clean(historyCourse?.descriptionFallback?.course?.description) : "";
  const officialDescriptionRawEn = longestDescription || historicalDescription;
  const officialDescriptionEn = dedupeAdjacentRepeatedDescriptionBlocks(officialDescriptionRawEn);
  const descriptionNormalization = officialDescriptionRawEn !== officialDescriptionEn ? { kind:"adjacent-exact-repeat-removal", sourceTextRetainedIn:"officialDescriptionRawEn", note:"Only an immediately repeated exact sentence/paragraph block of at least 160 characters was removed from the display description; the current official source text is retained verbatim." } : null;
  const noDescription = !officialDescriptionRawEn;
  const officialDescriptionStatus = longestDescription ? "current-official-description" : historicalDescription ? "historical-official-description" : "official-no-description";
  const displayDescriptionEn = noDescription ? "Cornell's current Course Offerings page and the official historical Cornell Class Roster/Catalog records checked for this course do not publish a course description." : officialDescriptionEn;
  const offeringAttributes = Object.fromEntries(Object.keys(sourceAttributes(records[0])).map(key => [key, records.some(record => Boolean(record[key]))]));
  const concentrationsEn = concentrationKeys.filter(key => offeringAttributes[key]).map(key => attrLabelsEn[key]);
  const concentrationsZh = concentrationKeys.filter(key => offeringAttributes[key]).map(key => attrLabelsZh[key]);
  const enrollment = structuredEnrollment(records, historyCourse);
  const credits = Number(records[0].Credits);
  const grading = combineGrading(sections);
  const formats = uniq(sections.map(section => section.courseFormat));
  const currentFormatEvidence = clean(records.map(record => `${record.CourseTitle} ${record.Description} ${record.AddInfo}`).join(" "));
  if (/\bcolloquium\b|\bclass discussions?\b|\bgroup discussions?\b|\binteractive discussions?\b/i.test(currentFormatEvidence) && !formats.includes("discussion")) formats.push("discussion");
  const courseFormat = formats.includes("clinic") ? "clinic" : formats.includes("practicum") ? "practicum" : formats.includes("seminar") ? "seminar" : formats.includes("independent") ? "independent" : formats[0] || "lecture";
  const addInfo = uniq(records.map(record => clean(record.AddInfo)));
  const staleYearDetails = addInfo.filter(value => /\b2026\b/.test(value));
  const is7028 = number === "7028";
  const course = {
    ...(existing || {}),
    id:idOf(number),
    code:codeOf(number),
    catalogNbr:number,
    classNumber:"",
    titleEn:titles[0],
    officialTitleEn:titles[0],
    credits,
    creditText:`${credits} ${credits === 1 ? "Credit" : "Credits"}`,
    grading,
    gradingZh:gradingZh(grading),
    instructors:uniq(sections.flatMap(section => section.instructors)),
    session:"Spring 2027",
    term:"SP27",
    sections,
    barPrimary:existing?.barPrimary ?? null,
    barClassroomEligible:existing?.barClassroomEligible ?? null,
    degreeRequired:existing?.degreeRequired ?? false,
    llmSpecific:is7028 || existing?.llmSpecific || false,
    eligibility:is7028 ? "open" : (existing?.eligibility || "review"),
    restrictionEn:enrollment.restrictionEn,
    restrictionRawEn:enrollment.restrictionRawEn,
    restriction:existing?.restriction && !/^选课资格与许可要求待确认$/.test(existing.restriction) ? existing.restriction : defaultChineseStatus("restriction", enrollment.restrictionEn),
    restrictionProvenance:enrollment.restrictionProvenance,
    prerequisitesEn:enrollment.prerequisitesEn,
    prerequisites:existing?.prerequisites && !/^No separate structured prerequisite/i.test(existing.prerequisites) ? existing.prerequisites : defaultChineseStatus("prerequisite", enrollment.prerequisitesEn),
    prerequisitesProvenance:enrollment.prerequisitesProvenance,
    categories:existing?.categories || [],
    courseFormat,
    courseFormats:formats,
    courseFormatProvenance:{ primary:{ kind:sections[0]?.componentStatus || "current-official-course-record", sourceUrl:sections[0]?.componentProvenance?.sourceUrl || courseOfferingsUrl, sourceTerm:sections[0]?.componentProvenance?.sourceTerm || "SP27" }, secondaryDiscussion:formats.includes("discussion") ? { kind:"current-official-title-description", sourceUrl:courseOfferingsUrl, checkedAt, evidencePattern:"colloquium or expressly published class/group/interactive discussion" } : null },
    concentrationsEn,
    concentrationsZh,
    sourceUrl:courseOfferingsUrl,
    catalogUrl:historyCourse ? officialRosterUrl(historyCourse.term, number) : courseOfferingsUrl,
    currentOfferingUrl:courseOfferingsUrl,
    campusZh:"康奈尔大学伊萨卡主校区或课程指定地点",
    location:uniq(sections.map(section => section.location)).length === 1 ? sections[0].location : "",
    locationZh:uniq(sections.map(section => section.locationZh)).length === 1 ? sections[0].locationZh : "班次地点不同，请查看具体班次",
    translationStatus:existing?.translationStatus || "translation-pending",
    locationStatus:sections.every(section => section.locationStatus === "published") ? "published" : "partially-published",
    lastTermsOffered:"Spring 2027",
    catalogOnly:false,
    dataScope:"Current Spring 2027 Cornell Law Course Offerings; historical official roster/catalog data is used only where explicitly identified by provenance.",
    officialSourceTerm:"SP27",
    officialDescriptionEn,
    officialDescriptionRawEn,
    descriptionEn:displayDescriptionEn,
    officialDescriptionStatus,
    descriptionStatus:noDescription ? "not-published" : "published",
    descriptionProvenance:longestDescription ? { kind:"current-official-course-offerings", sourceUrl:courseOfferingsUrl, checkedAt, normalization:descriptionNormalization } : historicalDescription ? { kind:"historical-official-class-roster-catalog", sourceTerm:historyCourse.descriptionFallback.term, sourceUrl:officialRosterUrl(historyCourse.descriptionFallback.term, number), checkedAt, note:"Only the historical official description is reused; Spring 2027 section facts remain current-source only.", normalization:descriptionNormalization } : { kind:"official-no-description-status", currentSourceUrl:courseOfferingsUrl, historicalSourceUrls:(historyCourse?.descriptionCheckedTerms || []).map(term => officialRosterUrl(term, number)), checkedAt, normalization:null },
    descriptionNormalization,
    officialDataStatus:"announced-by-law-school",
    officialRosterCrseId:historyCourse ? String(historyCourse.course.crseId || "") : "",
    officialRosterLastChecked:checkedAt,
    descriptionZh:existing?.descriptionZh || (noDescription ? "Cornell 当前课程设置及已查阅的官方历史 Class Roster／Catalog 均未提供本课程简介。" : ""),
    registrationConsentZh:is7028 ? "本课程仅限三年级 JD 学生及 LL.M. 学生选修。" : (existing?.registrationConsentZh || "待 Cornell SP27 Class Roster 发布后确认具体许可代码"),
    registrationConsentEn:is7028 ? "Enrollment is limited to 3Ls and LL.M. students." : (existing?.registrationConsentEn || "Consent code will be confirmed when the Cornell SP27 Class Roster is published."),
    additionalInformationEn:addInfo,
    additionalInformationZh:existing?.additionalInformationZh || [],
    officialTitleVariantsEn:titles,
    officialDescriptionVariantsEn:descriptions,
    courseOfferingAttributes:offeringAttributes,
    degreeRequirementsEn:uniq(records.map(record => clean(record.DegreeRequirements))).flatMap(value => value ? value.split(/\s*,\s*/) : []),
    degreeRequirementsZh:uniq(Object.keys(attrLabelsZh).filter(key => offeringAttributes[key] && !concentrationKeys.includes(key)).map(key => attrLabelsZh[key])),
    rosterDataSources:{ courseOfferings:courseOfferingsUrl, historicalRosterComponent:historyCourse ? officialRosterUrl(historyCourse.term, number) : "No matching historical roster course; current official title/description used for course format only." },
    sourceProvenance:{ currentOffering:{ sourceUrl:courseOfferingsUrl, term:"SP27", checkedAt }, historicalCatalog:historyCourse ? { sourceUrl:officialRosterUrl(historyCourse.term, number), term:historyCourse.term, usage:"component/course format only; not Spring 2027 dates, times, instructors, restrictions, prerequisites, grading, or location" } : null },
    sourceConflicts:staleYearDetails.length ? [{ field:"supplemental-date-text", status:"current-source-year-conflict", officialTerm:"SP27", publishedText:staleYearDetails, resolution:"Spring 2027 section dates use the current term-specific schedule/date fields; the conflicting source text is retained verbatim in additionalInformationEn and is not used as a 2026 schedule." }] : (existing?.sourceConflicts || []),
    barCategories:existing?.barCategories || [],
    barEvidence:existing?.barEvidence ?? null
  };
  if (is7028) {
    course.restrictionEn = "LAW 7028 is limited to third-year J.D. students and LL.M. students.";
    course.restriction = "LAW 7028 仅限三年级 J.D. 学生及 LL.M. 学生选修。";
    course.restrictionProvenance = { kind:"current-official-course-offerings", sourceUrl:courseOfferingsUrl, checkedAt, evidence:records.map(record => clean(record.AddInfo)).filter(Boolean) };
    course.llmEligibilityEvidence = { status:"eligible", evidence:"LAW 7028 is for 3Ls & LLMs only.", sourceUrl:courseOfferingsUrl, checkedAt };
  }
  return course;
}

function structuralProjection(course) {
  return {
    id:course.id, code:course.code, catalogNbr:course.catalogNbr, credits:course.credits, term:course.term,
    sections:course.sections.map(section => ({ id:section.id, section:section.section, component:section.component, componentLabel:section.componentLabel, courseFormat:section.courseFormat, credits:section.credits, startDate:section.startDate, endDate:section.endDate, scheduleDateStatus:section.scheduleDateStatus, daysTimesRaw:section.daysTimesRaw, daysTimesStatus:section.daysTimesStatus, meetingStatus:section.meetingStatus, instructors:section.instructors, meetings:section.meetings.map(meeting => ({ pattern:meeting.pattern, start:meeting.start, end:meeting.end, startDate:meeting.startDate, endDate:meeting.endDate, location:meeting.location })) }))
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers:{ "user-agent":"Cornell-LLM-Course-Planner-data-refresh/5.32" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

const sourceResponse = await fetch(courseOfferingsUrl, { headers:{ "user-agent":"Cornell-LLM-Course-Planner-data-refresh/5.32" } });
if (!sourceResponse.ok) throw new Error(`Course Offerings returned HTTP ${sourceResponse.status}`);
const sourceHtml = await sourceResponse.text();
const sourceRecords = extractEmbeddedCourses(sourceHtml);
const springRecords = sourceRecords.filter(record => record.Semester === "Spring" && (record.Sections || []).some(section => section.SectionSemester === "S" && String(section.SectionYear) === "2027"));
const excludedRecords = springRecords.filter(record => explicitlyExcluded.has(String(record.CourseNumber)));
const includedRecords = springRecords.filter(record => !explicitlyExcluded.has(String(record.CourseNumber)));
const grouped = new Map();
for (const record of includedRecords) {
  const number = String(record.CourseNumber);
  if (!grouped.has(number)) grouped.set(number, []);
  grouped.get(number).push(record);
}
if (grouped.size !== 127) throw new Error(`Expected 127 current eligible Spring courses; found ${grouped.size}.`);
if (!grouped.has("7028") || !grouped.get("7028").some(record => /LLM/i.test(clean(record.AddInfo)))) throw new Error("LAW 7028 and its current LL.M. eligibility evidence are required.");

const historyByCode = new Map();
const allHistoryByCode = new Map();
for (const term of historyTerms) {
  const payload = await fetchJson(`https://classes.cornell.edu/api/2.0/search/classes.json?roster=${term}&subject=LAW`);
  for (const course of payload?.data?.classes || []) {
    const number = String(course.catalogNbr);
    if (!grouped.has(number)) continue;
    if (!historyByCode.has(number)) historyByCode.set(number, { term, course });
    if (!allHistoryByCode.has(number)) allHistoryByCode.set(number, []);
    allHistoryByCode.get(number).push({ term, course });
  }
}
for (const [number, records] of allHistoryByCode) {
  const primary = historyByCode.get(number);
  primary.descriptionCheckedTerms = records.map(record => record.term);
  primary.descriptionFallback = records.find(record => clean(record.course.description));
}

const original = Object.fromEntries(datasets.map(dataset => [dataset.language, readJson(dataset.json)]));
const refreshed = {};
for (const dataset of datasets) {
  const current = original[dataset.language];
  const currentByCode = new Map(current.courses.map(course => [course.catalogNbr, course]));
  const courses = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric:true })).map(([number, records]) => buildCourse(number, records, currentByCode.get(number), historyByCode.get(number)));
  refreshed[dataset.language] = {
    meta:{
      ...current.meta,
      sourceUrl:courseOfferingsUrl,
      sourceCheckedAt:checkedAt,
      sourceSha256:crypto.createHash("sha256").update(sourceHtml).digest("hex"),
      sourceCourseRecordCount:springRecords.length,
      sourceSectionCount:springRecords.reduce((sum, record) => sum + (record.Sections || []).filter(section => section.SectionSemester === "S" && String(section.SectionYear) === "2027").length, 0),
      excludedSourceRecordCount:excludedRecords.length,
      excludedCourses:excludedRecords.map(record => ({ code:codeOf(record.CourseNumber), titleEn:clean(record.CourseTitle), reason:explicitlyExcluded.get(String(record.CourseNumber)) })),
      includedSourceRecordCount:includedRecords.length,
      courseCount:courses.length,
      sectionCount:courses.reduce((sum, course) => sum + course.sections.length, 0),
      mergedDuplicateCourseCodes:[...grouped.entries()].filter(([, records]) => records.length > 1).map(([number]) => codeOf(number)),
      instructionStart,
      instructionEnd,
      examEnd,
      noClassDates,
      calendarPeriods,
      specialScheduleDays,
      academicCalendarUrl,
      academicCalendarScope:"Cornell Law JD and Ithaca LL.M. 2026-27 academic calendar",
      academicCalendarCheckedAt:checkedAt,
      sourceDrift:{ previousCourseCount:126, currentCourseCount:127, addedCourses:[{ code:"LAW 7028", titleEn:"Bar Exam Fundamentals", evidence:"LAW 7028 is for 3Ls & LLMs only.", sourceUrl:courseOfferingsUrl }], removedCourses:[], checkedAt },
      componentCoverage:{ historicalOfficialRoster:courses.filter(course => course.sections.every(section => section.componentStatus === "historical-official-roster")).length, currentOfficialInference:courses.filter(course => course.sections.some(section => section.componentStatus !== "historical-official-roster")).length, sectionCount:courses.reduce((sum, course) => sum + course.sections.length, 0), sectionsWithComponent:courses.reduce((sum, course) => sum + course.sections.filter(section => section.component && section.componentLabel).length, 0) },
      descriptionCoverage:{ currentOfficial:courses.filter(course => course.officialDescriptionStatus === "current-official-description").length, historicalOfficial:courses.filter(course => course.officialDescriptionStatus === "historical-official-description").length, explicitOfficialNoDescription:courses.filter(course => course.officialDescriptionStatus === "official-no-description").length, total:courses.length },
      language:dataset.language
    },
    courses
  };
}

const enProjection = refreshed.en.courses.map(structuralProjection);
const zhProjection = refreshed["zh-CN"].courses.map(structuralProjection);
if (JSON.stringify(enProjection) !== JSON.stringify(zhProjection)) throw new Error("Bilingual Spring structural projections differ; refusing to write.");
if (refreshed.en.courses.length !== 127 || refreshed["zh-CN"].courses.length !== 127) throw new Error("Bilingual Spring course counts must both equal 127.");
if (refreshed.en.meta.sectionCount !== refreshed["zh-CN"].meta.sectionCount) throw new Error("Bilingual Spring section counts differ.");

for (const dataset of datasets) {
  const payload = refreshed[dataset.language];
  fs.writeFileSync(path.join(dataDir, dataset.json), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, dataset.catalog), `window.${dataset.catalogGlobal} = ${JSON.stringify(payload.courses)};\nwindow.${dataset.metaGlobal} = ${JSON.stringify(payload.meta)};\n`);
}

for (const dataset of datasets) {
  const source = fs.readFileSync(path.join(dataDir, dataset.catalog), "utf8");
  const sandbox = { window:{} };
  vm.runInNewContext(source, sandbox, { filename:dataset.catalog });
  if (JSON.stringify(sandbox.window[dataset.catalogGlobal]) !== JSON.stringify(refreshed[dataset.language].courses)) throw new Error(`${dataset.catalog} course global does not exactly match ${dataset.json}.`);
  if (JSON.stringify(sandbox.window[dataset.metaGlobal]) !== JSON.stringify(refreshed[dataset.language].meta)) throw new Error(`${dataset.catalog} metadata global does not exactly match ${dataset.json}.`);
}

const formatCounts = {};
for (const course of refreshed.en.courses) for (const format of course.courseFormats) formatCounts[format] = (formatCounts[format] || 0) + 1;
console.log(JSON.stringify({ courseCount:refreshed.en.meta.courseCount, sectionCount:refreshed.en.meta.sectionCount, sourceRecordCount:springRecords.length, sourceSectionCount:refreshed.en.meta.sourceSectionCount, excluded:excludedRecords.map(record => codeOf(record.CourseNumber)), componentCoverage:refreshed.en.meta.componentCoverage, descriptionCoverage:refreshed.en.meta.descriptionCoverage, formatCounts }, null, 2));
