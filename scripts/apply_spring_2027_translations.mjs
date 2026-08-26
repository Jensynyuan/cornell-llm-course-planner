import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const generatedDir = path.join(root, "scripts", "generated");
const files = {
  batch1:path.join(generatedDir, "spring_2027_translations_batch1.json"),
  batch2:path.join(generatedDir, "spring_2027_translations_batch2.json"),
  zhJson:path.join(dataDir, "cornell-law-spring-2027.zh-CN.json"),
  enJson:path.join(dataDir, "cornell-law-spring-2027.en.json"),
  zhCatalog:path.join(dataDir, "cornell.catalog.spring-2027.zh-CN.js"),
  enCatalog:path.join(dataDir, "cornell.catalog.spring-2027.en.js")
};
const hasChinese = value => /[\u3400-\u9fff]/u.test(String(value || ""));
const placeholder = value => /暂无中文|尚无.*中文|待补充|translation pending|no chinese translation/i.test(String(value || ""));
const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
const uniq = values => [...new Set(values.filter(Boolean))];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeBatch(payload) {
  if (Array.isArray(payload)) return Object.fromEntries(payload.map(item => [item.code, item]));
  return payload;
}

const batch1 = normalizeBatch(readJson(files.batch1));
const batch2 = fs.existsSync(files.batch2) ? normalizeBatch(readJson(files.batch2)) : {};
const translations = { ...batch1, ...batch2 };
const zh = readJson(files.zhJson);
const en = readJson(files.enJson);
const sortedCodes = en.courses.map(course => course.code);
if (sortedCodes.length !== 127 || JSON.stringify(sortedCodes) !== JSON.stringify([...sortedCodes].sort((a, b) => a.localeCompare(b, undefined, { numeric:true })))) throw new Error("Spring courses must be 127 records in numeric code order before translation merge.");

const expectedBatch1 = sortedCodes.slice(0, 64);
const expectedBatch2 = sortedCodes.slice(64);
function validateBatch(label, expected, batch) {
  const actual = Object.keys(batch).sort((a, b) => a.localeCompare(b, undefined, { numeric:true }));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} codes do not match the assigned numeric slice. Expected ${expected.length}, found ${actual.length}.`);
}
validateBatch("batch1", expectedBatch1, batch1);
for (const code of expectedBatch1) {
  const item = batch1[code];
  if (!item || !hasChinese(item.titleZh) || !hasChinese(item.descriptionZh) || placeholder(item.titleZh) || placeholder(item.descriptionZh)) throw new Error(`${code} failed batch1 Chinese content validation.`);
}
if (process.argv.includes("--batch1-only-check")) {
  console.log(`PASS: batch1 contains ${expectedBatch1.length} assigned courses with non-placeholder Chinese titles and descriptions.`);
  process.exit(0);
}
validateBatch("batch2", expectedBatch2, batch2);

for (const code of sortedCodes) {
  const item = translations[code];
  if (!item || !hasChinese(item.titleZh) || !hasChinese(item.descriptionZh)) throw new Error(`${code} lacks a Chinese title or description.`);
  if (placeholder(item.titleZh) || placeholder(item.descriptionZh)) throw new Error(`${code} contains a translation placeholder.`);
  if (clean(item.titleZh) === clean(en.courses.find(course => course.code === code)?.titleEn)) throw new Error(`${code} Chinese title duplicates the English title.`);
}

const byCode = new Map(Object.entries(translations));
const titleZhByEnglish = new Map(en.courses.map(course => [clean(course.titleEn), byCode.get(course.code).titleZh]));

function courseLabel(code) {
  const translated = byCode.get(code);
  return translated ? `${code}（${translated.titleZh}）` : code;
}

const GENERIC_PREREQUISITE_ZH = "Cornell 当前课程设置页面及最新可用的 2026—2027 学年官方 Catalog 记录均未单列本课程的先修要求。";
const GENERIC_RESTRICTION_ZH = "Cornell 当前课程设置页面及最新可用的 2026—2027 学年官方 Catalog 记录均未单列本课程的选课限制。";

// These mappings deliberately preserve conjunctions, alternatives, recommendations,
// application materials, dates, and attendance rules instead of reducing them to labels.
const PREREQUISITE_ZH = new Map(Object.entries({
  "LAW 6011":"先修：LAW 5021（宪法）。",
  "LAW 6101":"无需预先接受经济学训练。",
  "LAW 6203":"先修：宪法。",
  "LAW 6264":"先修：LAW 5021（宪法）。",
  "LAW 6431":"先修：宪法及两个学期的民事诉讼法。强烈建议修读行政法，但行政法并非严格的先修要求。",
  "LAW 6564":"先修：LAW 6441（联邦所得税法）。",
  "LAW 6654":"先修：LAW 6470；NBAY 5300 或 NBAY 5301（二选一）；以及 LAW 6131。上述三组要求均须满足。",
  "LAW 6734":"熟悉知识产权基本概念和合同解释会有所帮助，但并非必需条件。",
  "LAW 6739":"对于 J.D. 学生，先修：Lawyering。",
  "LAW 6768":"本课程无正式先修要求。",
  "LAW 6891":"先修：联邦所得税法。",
  "LAW 7021":"无需预先掌握反垄断法、知识产权法或经济学知识。",
  "LAW 7152":"学生须已经修完或正在同时修读以下任一门课程：LAW 6131（商业组织法）、LAW 6241（联邦白领犯罪）、LAW 5061（刑法）、LAW 6067（合规体系），或 LAW 6632（跨国腐败与法律）。",
  "LAW 7189":"先修：LAW 6592（劳动法、实务与政策）。",
  "LAW 7295":"熟悉美国劳动与雇佣法会有所帮助，但并非必需条件。",
  "LAW 7805":"先修：劳动法诊所，并须取得任课教师许可。",
  "LAW 7810":"先修：LAW 7801 或 LAW 7841（二选一）。",
  "LAW 7826":"无需既有技术背景；具有人工智能、实证方法或计算机科学方面的经验会受到欢迎，但并非必需条件。",
  "LAW 7839":"先修：LAW 6131。",
  "LAW 7842":"先修：LAW 7841 或 LAW 7857（二选一）。",
  "LAW 7843":"先修：LAW 7842。",
  "LAW 7845":"先修：创业法律诊所（一），并须取得任课教师许可。",
  "LAW 7848":"先修：LAW 7844。",
  "LAW 7851":"先修：须取得任课教师许可。",
  "LAW 7858":"先修：LAW 7857。",
  "LAW 7859":"先修：LAW 7858。",
  "LAW 7860":"先修：LAW 7847 或 LAW 7855（二选一）。",
  "LAW 7876":"先修须同时满足两组要求：第一组为 AEM 4531 或 LAW 6441（二选一）；第二组为 AEM 4940 或 AEM 6940（二选一）。",
  "LAW 7878":"先修：须取得任课教师许可，并已修读国际人权：诉讼与倡导（一）和（二）。",
  "LAW 7891":"先修：LAW 7854。",
  "LAW 7892":"先修：LAW 7854 和 LAW 7891，两门均须完成。",
  "LAW 7905":"先修：须取得任课教师许可。",
  "LAW 7906":"先修：完成 LGBT 社群实践（一）。",
  "LAW 7907":"先修：完成 LGBT 社群实践（一）。",
  "LAW 7915":"先修：性别正义诊所（一），并须取得任课教师许可。",
  "LAW 7916":"先修：性别正义诊所（一）和性别正义诊所（二），两门均须完成。",
  "LAW 7917":"先修：性别正义诊所（一）、（二）和（三），三门均须完成。",
  "LAW 7927":"须取得任课教师许可。建议修读证据法和刑事诉讼法（侦查），但这两门课程并非必修的先修要求。",
  "LAW 7938":"先修：公民权利与公民自由诊所；或者取得任课教师许可。",
  "LAW 7953":"先修：须取得任课教师许可。",
  "LAW 7954":"先修：须取得任课教师许可。证券法诊所（二）仅向已完成证券法诊所（一）的学生开放。",
  "LAW 7955":"先修：须取得任课教师许可。证券法诊所（三）仅向已完成证券法诊所（二）的学生开放。",
  "LAW 7965":"先修：退伍军人法实践（一），并须取得任课教师许可。"
}));

const RESTRICTION_ZH = new Map(Object.entries({
  "LAW 6158":"LAW 6158（客户咨询）于 2027 年 1 月 20 日至 2 月 8 日的周一、周三上课；第一次课必须出席。",
  "LAW 6209":"法学院学生须在 9 月 1 日前向 Mizutani 教授发送课程兴趣陈述及简历（resume/CV）提出申请。",
  "LAW 6365":"对本课程感兴趣的非法学院学生，须向任课教师提交申请；申请材料应包括课程兴趣陈述，以及本人在法律或气候政策方面的任何相关经历（学术或其他经历）。",
  "LAW 6465":"LAW 6465（全球并购实务）采用集中授课形式。Cornell 官方补充文字写明 2026 年 3 月 22 日至 25 日，但本记录为 Spring 2027，实际日期以当前班次日期字段为准。四次课均须出席，不设例外。",
  "LAW 6569":"学生必须在学期末预留一个周六上午参加此次证词录取。",
  "LAW 6734":"第一次课必须出席。",
  "LAW 6761":"仅限通用 LL.M. 项目学生选修；第一次课必须出席。",
  "LAW 7028":"LAW 7028 仅限三年级 J.D. 学生及 LL.M. 学生选修。",
  "LAW 7652":"申请时，学生须提交一份专门针对本实践课程的兴趣陈述及一份简历。",
  "LAW 7760":"学生须提交兴趣陈述。",
  "LAW 7763":"学生须提交兴趣陈述。",
  "LAW 7767":"学生须提交兴趣陈述。",
  "LAW 7805":"先修：劳动法诊所，并须取得任课教师许可。",
  "LAW 7810":"有意选课的学生须在尝试注册前联系任课教师。",
  "LAW 7839":"所有已选课学生必须能够参加一整天的诊所“训练营”；训练营很可能在正式开课前不久或开课第一周举行。申请材料包括简历、成绩单及简短的兴趣陈述，并提交给任课教师。",
  "LAW 7842":"经任课教师许可，学生可按 2 至 4 学分选修。",
  "LAW 7843":"经任课教师许可，学生可按 2 至 4 学分选修。",
  "LAW 7844":"经任课教师许可，学生可按 2 至 3 学分选修。",
  "LAW 7845":"先修：创业法律诊所（一），并须取得任课教师许可。",
  "LAW 7848":"学生按 2 至 3 学分选修，具体学分取决于任课教师许可。",
  "LAW 7851":"须取得任课教师许可。",
  "LAW 7855":"有意选课的学生必须提交个人简历（CV）。",
  "LAW 7857":"须取得任课教师许可。申请时，学生须通过在线申请流程提交简历及简短的兴趣陈述。",
  "LAW 7858":"须取得任课教师许可。",
  "LAW 7859":"须取得任课教师许可。",
  "LAW 7860":"国际人权：诉讼与倡导（二）的先修要求为国际人权：诉讼与倡导（一），并须取得任课教师许可。只有已完成国际人权：诉讼与倡导（一）的学生才有资格申请。",
  "LAW 7862":"仅接受申请入课。",
  "LAW 7878":"须取得任课教师许可，并已修读国际人权：诉讼与倡导（一）和（二）。",
  "LAW 7905":"须取得任课教师许可。有意选课的学生须提交简历、成绩单及兴趣函。",
  "LAW 7906":"须取得任课教师许可。",
  "LAW 7907":"须取得任课教师许可。",
  "LAW 7915":"先修：性别正义诊所（一），并须取得任课教师许可。",
  "LAW 7916":"已完成性别正义诊所（二）的学生，可申请任课教师许可，以 2、4 或 6 学分选修性别正义诊所（三）；学分数取决于承担的工作量。",
  "LAW 7917":"已完成性别正义诊所（三）的学生，可申请任课教师许可，以 2、4 或 6 学分选修性别正义诊所（四）；学分数取决于承担的工作量。",
  "LAW 7927":"须取得任课教师许可。建议修读证据法和刑事诉讼法（侦查），但并非必需的先修要求。申请时，学生须提交简历、兴趣陈述及成绩单。",
  "LAW 7938":"先修：公民权利与公民自由诊所；或者取得任课教师许可。",
  "LAW 7945":"注册须取得任课教师许可。",
  "LAW 7946":"注册须取得任课教师许可。",
  "LAW 7949":"注册须取得任课教师许可。",
  "LAW 7953":"须取得任课教师许可。",
  "LAW 7954":"须取得任课教师许可。证券法诊所（二）仅向已完成证券法诊所（一）的学生开放。",
  "LAW 7955":"须取得任课教师许可。证券法诊所（三）仅向已完成证券法诊所（二）的学生开放。",
  "LAW 7964":"学生须提交兴趣陈述。",
  "LAW 7965":"先修：退伍军人法实践（一），并须取得任课教师许可。"
}));

const ADDITIONAL_INFORMATION_ZH = new Map(Object.entries({
  "LAW 5102":"LAW 5102 全学期仅上课四次，具体日期待课程方确定。",
  "LAW 6025":"LAW 6025（私募基金）的上课日期为 2027 年 2 月 11 日至 3 月 12 日。",
  "LAW 6158":"LAW 6158（客户咨询）于 2027 年 1 月 20 日至 2 月 8 日的周一、周三上课；第一次课必须出席。",
  "LAW 6209":"LAW 6209（康奈尔监狱教育项目教学实践）的具体上课安排由任课教师确定。",
  "LAW 6299":"LAW 6299 的上课日期为 3 月 17 日至 4 月 28 日。",
  "LAW 6306":"LAW 6306（数字财产）遵循 Cornell 大学校历，而非法学院校历。",
  "LAW 6461":"LAW 6461 与 NBA 6460 交叉开设。",
  "LAW 6465":"LAW 6465（全球并购实务）采用集中授课形式。Cornell 官方补充文字写明 2026 年 3 月 22 日至 25 日，但本记录为 Spring 2027，实际日期以当前班次日期字段为准。四次课均须出席，不设例外。",
  "LAW 6746":"LAW 6746（在欧盟开展业务：法律框架）于 2027 年 3 月 17 日至 4 月 14 日上课；考试于 2027 年 4 月 15 日举行。",
  "LAW 6985":"LAW 6985（成为蓬勃发展的律师）于 2027 年 1 月 19 日至 2 月 3 日上课；考试于 2027 年 2 月 5 日举行。",
  "LAW 7028":"LAW 7028 仅限三年级 J.D. 学生及 LL.M. 学生选修。",
  "LAW 7113":"LAW 7113 与 INFO 4113、INFO 6113 交叉开设。",
  "LAW 7189":"LAW 7189（集体谈判前沿问题）的 Cornell 官方补充文字写明 2026 年 4 月 20 日至 23 日，但本记录为 Spring 2027，实际日期以当前班次日期字段为准。",
  "LAW 7678":"LAW 7678（金融机构并购）的上课日期为 2027 年 1 月 22 日至 3 月 5 日。",
  "LAW 7766":"LAW 7766（并购税务）的上课日期为 3 月 15 日至 4 月 27 日。",
  "LAW 7805":"LAW 7805（高级劳动法诊所）的上课时间请直接向任课教师确认。",
  "LAW 7810":"根据任课教师安排，LAW 7810 与 LAW 7801 在同一教室上课。",
  "LAW 7842":"LAW 7842（移民法与倡导诊所（二））的上课时间请直接向任课教师确认。",
  "LAW 7843":"LAW 7843（移民法与倡导诊所（三））的上课时间请直接向任课教师确认。",
  "LAW 7848":"Cornell 官方补充文字写为“LAW 7842 的上课时间将根据学生可参加的时段确定”；本字段忠实保留该课程号表述，未据此改动 LAW 7848 的班次数据。",
  "LAW 7890":"LAW 7890 遵循 Cornell 大学校历，而非法学院校历。",
  "LAW 7905":"LAW 7905（LGBT 社群倡导实践）的学生每周五 10:00 至 16:00 须有空，以便往返纽约州锡拉丘兹。",
  "LAW 7906":"LAW 7906（LGBT 社群倡导实践（二））的学生每周五 10:00 至 17:00 须有空，以便往返纽约州锡拉丘兹。",
  "LAW 7907":"LAW 7907（LGBT 社群倡导实践（三））的学生每周五 10:00 至 17:00 须有空，以便往返纽约州锡拉丘兹。",
  "LAW 7915":"LAW 7915（性别正义诊所（二））的上课时间请直接向任课教师确认。",
  "LAW 7916":"LAW 7916（性别正义诊所（三））的上课时间请直接向任课教师确认。",
  "LAW 7917":"LAW 7917（性别正义诊所（四））的上课时间请直接向任课教师确认。",
  "LAW 7938":"LAW 7938 的上课时间由学生与任课教师协调确定。",
  "LAW 7954":"LAW 7954（证券法诊所（二））的上课时间请直接向任课教师确认。",
  "LAW 7955":"LAW 7955（证券法诊所（三））的上课时间请直接向任课教师确认。"
}));

function translatePrerequisite(value, course) {
  const text = clean(value);
  if (!text || course.prerequisitesProvenance?.kind === "official-no-separate-prerequisite-status") return GENERIC_PREREQUISITE_ZH;
  const translated = PREREQUISITE_ZH.get(course.code);
  if (!translated) throw new Error(`${course.code} has a published prerequisite without an exact Chinese mapping: ${text}`);
  return translated;
}

function translateRestriction(value, course) {
  const text = clean(value);
  if (!text || course.restrictionProvenance?.kind === "official-no-separate-restriction-status") return GENERIC_RESTRICTION_ZH;
  const translated = RESTRICTION_ZH.get(course.code);
  if (!translated) throw new Error(`${course.code} has a published enrollment restriction without an exact Chinese mapping: ${text}`);
  return translated;
}

function translateAdditional(value, course) {
  const text = clean(value);
  if (!text) return "";
  const translated = ADDITIONAL_INFORMATION_ZH.get(course.code);
  if (!translated) throw new Error(`${course.code} has official additional information without an exact Chinese mapping: ${text}`);
  return translated;
}

function translatedSectionTitle(section, course, translation) {
  if (clean(section.titleEn) === clean(course.titleEn)) return translation.titleZh;
  if (/Cornell Tech/i.test(section.titleEn || "")) return `${translation.titleZh}—Cornell Tech 校区`;
  return titleZhByEnglish.get(clean(section.titleEn)) || translation.titleZh;
}

function applyTranslations(dataset) {
  for (const course of dataset.courses) {
    const translation = byCode.get(course.code);
    course.titleZh = translation.titleZh;
    course.descriptionZh = translation.descriptionZh;
    course.restrictionZh = translateRestriction(course.restrictionEn, course);
    course.restriction = course.restrictionZh;
    course.prerequisitesZh = translatePrerequisite(course.prerequisitesEn, course);
    course.prerequisites = course.prerequisitesZh;
    course.restrictionTranslationComplete = true;
    course.prerequisiteTranslationComplete = true;
    course.gradingTranslationComplete = true;
    course.translationStatus = "verified";
    course.translationMethod = "Faithful Chinese translation of current official Course Offerings text; official English is retained. Explicit no-description status is translated without inventing a description.";
    course.additionalInformationZh = (course.additionalInformationEn || []).map(value => translateAdditional(value, course));
    for (const section of course.sections || []) {
      section.titleZh = translatedSectionTitle(section, course, translation);
      section.descriptionZh = translation.descriptionZh;
      section.additionalInformationZh = translateAdditional(section.additionalInformationEn, course);
      section.gradingZh = course.grading === "Varies by section" ? section.gradingZh : course.gradingZh;
      if (!hasChinese(section.locationZh)) section.locationZh = section.location ? `课程地点：${section.location}` : "官方未公布具体地点";
      for (const meeting of section.meetings || []) if (!hasChinese(meeting.locationZh)) meeting.locationZh = meeting.location ? `课程地点：${meeting.location}` : "官方未公布具体地点";
    }
  }
  dataset.meta.translationCoverage = {
    titleZh:dataset.courses.filter(course => hasChinese(course.titleZh) && !placeholder(course.titleZh)).length,
    descriptionZh:dataset.courses.filter(course => hasChinese(course.descriptionZh) && !placeholder(course.descriptionZh)).length,
    restrictionZh:dataset.courses.filter(course => hasChinese(course.restrictionZh)).length,
    prerequisitesZh:dataset.courses.filter(course => hasChinese(course.prerequisitesZh)).length,
    gradingZh:dataset.courses.filter(course => hasChinese(course.gradingZh)).length,
    total:dataset.courses.length,
    batch1Count:Object.keys(batch1).length,
    batch2Count:Object.keys(batch2).length
  };
}

applyTranslations(zh);
applyTranslations(en);

const structural = course => ({ id:course.id, code:course.code, credits:course.credits, term:course.term, sections:(course.sections || []).map(section => ({ id:section.id, section:section.section, component:section.component, componentLabel:section.componentLabel, courseFormat:section.courseFormat, credits:section.credits, instructors:section.instructors, daysTimesRaw:section.daysTimesRaw, daysTimesStatus:section.daysTimesStatus, meetingStatus:section.meetingStatus, startDate:section.startDate, endDate:section.endDate, scheduleDateStatus:section.scheduleDateStatus, meetings:section.meetings })) });
if (JSON.stringify(zh.courses.map(structural)) !== JSON.stringify(en.courses.map(structural))) throw new Error("Bilingual structures changed during translation merge.");
for (const dataset of [zh, en]) for (const course of dataset.courses) {
  if (!hasChinese(course.titleZh) || !hasChinese(course.descriptionZh) || placeholder(course.titleZh) || placeholder(course.descriptionZh)) throw new Error(`${course.code} failed final translation validation.`);
  if (!course.sections?.every(section => section.component && section.componentLabel && section.courseFormat)) throw new Error(`${course.code} has incomplete section format data.`);
  if (/完整条件已在|完整中文内容已并入|具体选课或安排条件已在/u.test(`${course.prerequisitesZh} ${course.restrictionZh} ${(course.additionalInformationZh || []).join(" ")}`)) throw new Error(`${course.code} contains a generic translation fallback.`);
  if ((course.additionalInformationEn || []).length !== (course.additionalInformationZh || []).length || !(course.additionalInformationZh || []).every(hasChinese)) throw new Error(`${course.code} has incomplete additional-information translation.`);
}

fs.writeFileSync(files.zhJson, `${JSON.stringify(zh, null, 2)}\n`);
fs.writeFileSync(files.enJson, `${JSON.stringify(en, null, 2)}\n`);
fs.writeFileSync(files.zhCatalog, `window.CORNELL_SPRING_2027_COURSE_CATALOG = ${JSON.stringify(zh.courses)};\nwindow.CORNELL_SPRING_2027_DATA_META = ${JSON.stringify(zh.meta)};\n`);
fs.writeFileSync(files.enCatalog, `window.CORNELL_SPRING_2027_COURSE_CATALOG_EN = ${JSON.stringify(en.courses)};\nwindow.CORNELL_SPRING_2027_DATA_META_EN = ${JSON.stringify(en.meta)};\n`);

for (const [file, courseGlobal, metaGlobal, expected] of [
  [files.zhCatalog, "CORNELL_SPRING_2027_COURSE_CATALOG", "CORNELL_SPRING_2027_DATA_META", zh],
  [files.enCatalog, "CORNELL_SPRING_2027_COURSE_CATALOG_EN", "CORNELL_SPRING_2027_DATA_META_EN", en]
]) {
  const source = fs.readFileSync(file, "utf8");
  const sandbox = { window:{} };
  vm.runInNewContext(source, sandbox, { filename:path.basename(file) });
  if (JSON.stringify(sandbox.window[courseGlobal]) !== JSON.stringify(expected.courses)) throw new Error(`${path.basename(file)} course global or JSON parity check failed.`);
  if (JSON.stringify(sandbox.window[metaGlobal]) !== JSON.stringify(expected.meta)) throw new Error(`${path.basename(file)} metadata global or JSON parity check failed.`);
}

console.log(JSON.stringify({ courses:en.courses.length, sections:en.courses.reduce((sum, course) => sum + course.sections.length, 0), translationCoverage:en.meta.translationCoverage }, null, 2));
