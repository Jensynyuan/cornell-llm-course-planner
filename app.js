(() => {
  const DAY_MAP = { M: "周一", T: "周二", W: "周三", R: "周四", F: "周五" };
  const DAY_MAP_EN = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" };
  const DAY_KEYS = ["M", "T", "W", "R", "F"];
  const DEFAULT_TERM = { orientationStart: "2026-08-06", instructionStart: "2026-08-24", instructionEnd: "2026-12-03", examEnd: "2026-12-18" };
  const CORNELL_TERM_PROFILES = {
    FA26: {
      code:"FA26", label:"Fall 2026", labelZh:"2026 秋季", orientationStart:"2026-08-06", instructionStart:"2026-08-24", instructionEnd:"2026-12-03", examEnd:"2026-12-18",
      noClassDates:["2026-09-07", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-11-25", "2026-11-26", "2026-11-27"], specialScheduleDays:{"2026-12-01":"F"}
    },
    SP27: {
      code:"SP27", label:"Spring 2027", labelZh:"2027 春季", orientationStart:"2027-01-18", instructionStart:"2027-01-19", instructionEnd:"2027-04-28", examEnd:"2027-05-14",
      calendarPeriods:[
        { start:"2027-01-18", end:"2027-01-18", type:"holiday", noClass:true, labelEn:"Martin Luther King, Jr. Holiday", labelZh:"马丁·路德·金纪念日" },
        { start:"2027-02-15", end:"2027-02-16", type:"break", noClass:true, labelEn:"February Break", labelZh:"二月假期" },
        { start:"2027-03-29", end:"2027-04-02", type:"break", noClass:true, labelEn:"Spring Break", labelZh:"春假" }
      ],
      noClassDates:["2027-01-18", "2027-02-15", "2027-02-16", "2027-03-29", "2027-03-30", "2027-03-31", "2027-04-01", "2027-04-02"], specialScheduleDays:{"2027-04-28":"M"}, specialScheduleLabels:{"2027-04-28":{ labelEn:"Monday class schedule", labelZh:"按周一课表上课" }}
    }
  };
  const CORNELL_NO_CLASS_DATES = Object.values(CORNELL_TERM_PROFILES).flatMap(term => term.noClassDates);
  const CORNELL_ACADEMIC_YEAR_TERM = { ...CORNELL_TERM_PROFILES.FA26, instructionEnd:CORNELL_TERM_PROFILES.SP27.instructionEnd, examEnd:CORNELL_TERM_PROFILES.SP27.examEnd };
  const NY_BAR_ALLOCATION = window.NY_BAR_ALLOCATION;
  const CALENDAR = window.LLM_CALENDAR;
  const APP_VERSION = "v5.32";
  if (!NY_BAR_ALLOCATION) throw new Error("NY Bar allocation helper failed to load.");
  if (!CALENDAR) throw new Error("Calendar integration helper failed to load.");

  const SCHOOL_PRESETS = [
    { id:"cornell", nameZh:"康奈尔法学院", nameEn:"Cornell Law School", shortZh:"康奈尔", termLabel:"Fall 2026 + Spring 2027", sourceKind:"offline", sourceLabel:"经核验的 2026–27 课程库", catalogUrl:"https://support.law.cornell.edu/CourseOfferings/", apiGuideUrl:"https://classes.cornell.edu/content/FA26/api-details", term:{...CORNELL_ACADEMIC_YEAR_TERM}, noClassDates:CORNELL_NO_CLASS_DATES, specialScheduleDays:{...CORNELL_TERM_PROFILES.FA26.specialScheduleDays}, autoEnrollCodes:["LAW 6091"], degreeCreditTarget:20, degreeCreditLabel:"Cornell 其他法学分", degreeExcludeCodes:["LAW 6091"] },
    { id:"yale", nameZh:"耶鲁法学院", nameEn:"Yale Law School", shortZh:"耶鲁", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方课程系统／文件导入", catalogUrl:"https://courses.law.yale.edu/" },
    { id:"stanford", nameZh:"斯坦福法学院", nameEn:"Stanford Law School", shortZh:"斯坦福", termLabel:"自定义学期", sourceKind:"api-available", sourceLabel:"官方课程接口（需转为 JSON）", catalogUrl:"https://law.stanford.edu/courses/", apiGuideUrl:"https://explorecourses.stanford.edu/about" },
    { id:"harvard", nameZh:"哈佛法学院", nameEn:"Harvard Law School", shortZh:"哈佛", termLabel:"自定义学期", sourceKind:"api-key", sourceLabel:"官方 API 需申请密钥", catalogUrl:"https://hls.harvard.edu/courses/", apiGuideUrl:"https://data.harvard.edu/apis" },
    { id:"chicago", nameZh:"芝加哥大学法学院", nameEn:"University of Chicago Law School", shortZh:"芝加哥", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方目录／文件导入", catalogUrl:"https://www.law.uchicago.edu/courses" },
    { id:"columbia", nameZh:"哥伦比亚法学院", nameEn:"Columbia Law School", shortZh:"哥大", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方目录／文件导入", catalogUrl:"https://www.law.columbia.edu/academics/courses" },
    { id:"nyu", nameZh:"纽约大学法学院", nameEn:"NYU School of Law", shortZh:"NYU", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"公开课表／文件导入", catalogUrl:"https://www.law.nyu.edu/recordsandregistration/courseinformation" },
    { id:"penn", nameZh:"宾夕法尼亚大学凯里法学院", nameEn:"Penn Carey Law School", shortZh:"宾大", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方 Course Finder／文件导入", catalogUrl:"https://goat.law.upenn.edu/cf/coursefinder/" },
    { id:"uva", nameZh:"弗吉尼亚大学法学院", nameEn:"University of Virginia School of Law", shortZh:"UVA", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方目录／文件导入", catalogUrl:"https://www.law.virginia.edu/courses" },
    { id:"duke", nameZh:"杜克大学法学院", nameEn:"Duke University School of Law", shortZh:"杜克", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方 Course Browser／文件导入", catalogUrl:"https://law.duke.edu/academics/courses" },
    { id:"michigan", nameZh:"密歇根大学法学院", nameEn:"University of Michigan Law School", shortZh:"密歇根", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方目录／文件导入", catalogUrl:"https://michigan.law.umich.edu/courses" },
    { id:"berkeley", nameZh:"加州大学伯克利分校法学院", nameEn:"UC Berkeley School of Law", shortZh:"伯克利", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方目录／文件导入", catalogUrl:"https://www.law.berkeley.edu/academics/courses/" },
    { id:"northwestern", nameZh:"西北大学普利兹克法学院", nameEn:"Northwestern Pritzker School of Law", shortZh:"西北", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方目录／文件导入", catalogUrl:"https://www.law.northwestern.edu/academics/coursecatalog/" },
    { id:"georgetown", nameZh:"乔治城大学法律中心", nameEn:"Georgetown University Law Center", shortZh:"乔治城", termLabel:"自定义学期", sourceKind:"catalog", sourceLabel:"官方目录／文件导入", catalogUrl:"https://www.law.georgetown.edu/curriculum/course-schedule-updates/course-catalog/" },
    { id:"custom", nameZh:"其他法学院", nameEn:"Other Law School", shortZh:"自定义", termLabel:"自定义学期", sourceKind:"custom", sourceLabel:"自定义 API／JSON／CSV", catalogUrl:"" }
  ];
  const CAREER_DIRECTIONS = [
    { id:"corporate", label:"公司／资本市场／并购", labelEn:"Corporate, Capital Markets & M&A", keywords:["公司","商事","证券","并购","融资","资本","交易","corporate","securities","business","finance","transaction"] },
    { id:"litigation", label:"诉讼／争议解决", labelEn:"Litigation & Dispute Resolution", keywords:["诉讼","证据","审判","救济","仲裁","调解","litigation","evidence","trial","arbitration","remedies"] },
    { id:"tech", label:"科技／数据／AI／知识产权", labelEn:"Technology, Data, AI & IP", keywords:["科技","网络","数据","隐私","人工智能","知识产权","专利","商标","版权","cyber","privacy","technology","intellectual property","ai"] },
    { id:"international", label:"国际法／跨境交易／仲裁", labelEn:"International & Cross-border", keywords:["国际","跨境","比较法","人权","移民","international","transnational","comparative","human rights","immigration"] },
    { id:"public", label:"公共利益／人权／政府", labelEn:"Public Interest, Human Rights & Government", keywords:["公共利益","人权","宪法","行政","政府","环境","civil rights","constitutional","administrative","government","environment"] },
    { id:"taxfinance", label:"税法／金融监管／破产", labelEn:"Tax, Financial Regulation & Bankruptcy", keywords:["税","金融","银行","破产","监管","tax","banking","bankruptcy","financial regulation"] },
    { id:"criminal", label:"刑事司法／检察／辩护", labelEn:"Criminal Justice", keywords:["刑事","警察","检察","犯罪","criminal","police","prosecution"] },
    { id:"academic", label:"学术研究／法理／法律史", labelEn:"Academic Research & Legal Theory", keywords:["法理","法律史","理论","研究","jurisprudence","legal history","theory","research"] }
  ];
  const COURSE_TOPICS = [
    { id:"corporate", label:"公司／交易／金融", labelEn:"Corporate, transactions & finance", categories:["公司与金融法","公司与金融","交易实务","交易方向","公司法","公司交易","公司治理","证券法","IPO","创业","合规"], keywords:["corporate","finance","securities","transaction","m&a","venture","startup"] },
    { id:"litigation", label:"诉讼／争议解决", labelEn:"Litigation & dispute resolution", categories:["争议解决","诉讼与争议解决","证据法","诉讼技能"], keywords:["litigation","dispute","arbitration","trial","evidence"] },
    { id:"tech", label:"科技／数据／知识产权", labelEn:"Technology, data & IP", categories:["科技与知识产权法","科技与法律","科技法","知识产权","商标法","网络安全"], keywords:["technology","cyber","intellectual property","patent","trademark","privacy"] },
    { id:"international", label:"国际／跨境", labelEn:"International & cross-border", categories:["国际与跨境法","比较法","移民法"], keywords:["international","cross-border","comparative","immigration"] },
    { id:"public", label:"公法／公共利益", labelEn:"Public law & public interest", categories:["公法","权利与社会正义","行政法","环境与资源法","公共政策","职业伦理"], keywords:["constitutional","administrative","public interest","human rights","government","environment"] },
    { id:"research", label:"研究／理论", labelEn:"Research & theory", categories:["研究与理论","法律史","法理"], keywords:["jurisprudence","legal history","legal theory"] },
    { id:"criminal", label:"刑事法", labelEn:"Criminal law", categories:["刑事法","刑事诉讼"], keywords:["criminal","prosecution","defense"] },
    { id:"practice", label:"实务技能", labelEn:"Practice skills", categories:["实践课程","律师技能","交易实务","诉讼技能","独立研究","指导教学","指导写作"], keywords:["clinic","practicum","workshop","simulation","negotiation","drafting","advocacy"] }
  ];
  const COURSE_PREFERENCES = [
    { id:"lowWorkload", label:"较少课时／学分", labelEn:"Lighter scheduled load" }, { id:"bar", label:"NY Bar 优先", labelEn:"NY Bar priority" }, { id:"su", label:"S/U 优先", labelEn:"S/U preferred" },
    { id:"writing", label:"书面作业", labelEn:"Written assignments" }, { id:"skills", label:"实务技能", labelEn:"Practice skills" }, { id:"finalExam", label:"期末考试", labelEn:"Final examination" }, { id:"finalWritten", label:"期末书面作业", labelEn:"Final written work" }
  ];
  const COURSE_FORMATS = [
    { id:"lecture", zh:"讲授课", en:"Lecture", patterns:[/\blec\b/i,/lecture/i,/讲授课/u] },
    { id:"seminar", zh:"研讨课", en:"Seminar", patterns:[/\bsem\b/i,/seminar/i,/研讨课/u] },
    { id:"clinic", zh:"诊所", en:"Clinic", patterns:[/\bcln\b/i,/clinic/i,/clinical/i,/诊所/u] },
    { id:"practicum", zh:"实践课", en:"Practicum", patterns:[/\bpra\b/i,/\bprc\b/i,/\bfld\b/i,/practicum/i,/field studies/i,/实践课/u] },
    { id:"discussion", zh:"讨论课", en:"Discussion", patterns:[/\bdis\b/i,/discussion/i,/讨论课/u] },
    { id:"independent", zh:"独立研究", en:"Independent study", patterns:[/\bind\b/i,/independent/i,/directed (?:study|work)/i,/独立研究/u] }
  ];
  const RELEASE_NOTES = [
    { version:"v5.32", zh:["修复切换课程学期后另一学期记录看似丢失的问题：Fall 与 Spring 继续保存在同一份个人课表中，NY Bar 24 学分及四项分类按 2026–27 学年统一累计。","LL.M. 每学期 10–15 学分要求现分别显示 Fall 与 Spring 两条进度，课程库学期筛选不会再改变个人年度进度。","按 Cornell Law 的 JD／Ithaca LL.M. 2026–27 官方校历校正 Spring 日期，并在周课表中标出马丁·路德·金纪念日、二月假期与春假；4 月 28 日按周一课表运行。","修复已选课程卡片的“学分当前计入”标签溢出，中文和英文长标签均会完整包在课程卡内。"], en:["Fixed the apparent loss of another term's record after switching the catalog term. Fall and Spring remain in one personal schedule, while the 24 NY Bar credits and four required categories now aggregate across the 2026–27 academic year.","The 10–15 LL.M. registration-credit rule is now shown separately for Fall and Spring. Filtering the catalog by term no longer changes the student's academic-year progress.","Aligned Spring dates with Cornell Law's official 2026–27 JD/Ithaca LL.M. calendar and labeled the Martin Luther King, Jr. Holiday, February Break, and Spring Break in the weekly schedule; April 28 follows a Monday class schedule.","Fixed the selected-course allocation badge so long English and Chinese labels stay fully inside their course cards."] },
    { version:"v5.31", zh:["按 Cornell Law 当前 Course Offerings 重建 Spring 2027 数据库：127 门符合 LL.M. 规划范围的课程、146 个班次及结构化上课形式已接入，修复选择 Spring 讲授课却返回 0 的严重问题。","补齐 127 门 Spring 课程的中文课程名与课程说明；官方当前及已查历史来源均未发布简介的课程会明确显示官方未发布，不再保留“暂无中文译文”。","修复多选筛选器重复箭头；顶部学期入口新增“点击切换学期”提示；没有官方课程班号时不再显示破折号。","修复 LAW 6641 等多分类课程的学分归类：切换后立即更新左侧进度、课程徽标和课表，并在刷新后保留用户的明确选择。"], en:["Rebuilt Spring 2027 from the current Cornell Law Course Offerings source: 127 LL.M.-eligible planning courses, 146 sections, and structured course formats are now loaded, fixing the severe zero-result Spring Lecture filter bug.","Completed Chinese titles and descriptions for all 127 Spring courses. When neither the current nor checked historical official source publishes a description, the detail page states that status instead of showing a missing-translation placeholder.","Removed duplicate arrows from multi-select filters, added a clear term-switch hint, and stopped displaying a dash as a nonexistent official class number.","Fixed one-time NY Bar allocation for multi-category courses such as LAW 6641: changes immediately refresh progress, badges, and the schedule, and the explicit choice persists after reload."] },
    { version:"v5.30", zh:["修复 Spring 2027 课程未接入页面的严重问题：课程库现同时提供 136 门 Fall 与 126 门 Spring 课程，并在卡片、搜索和课表中明确标注学期。","新增学期多选及所有筛选器的多选逻辑；顶部学期入口可切换 Fall、Spring 或同时查看，NY Bar 官方春季分类也已接入。","课表每次打开会定位到用户当前日期所在周，并提供一键跳转 Fall 2026 与 Spring 2027 第一周；公告和操作提示统一在屏幕中央打开。"], en:["Fixed the Spring 2027 catalog integration: Course Search now includes 136 Fall and 126 Spring offerings, with term labels across cards, search, and schedule views.","Added multi-select term and facet filters. The top term control switches between Fall, Spring, or both, and official Spring NY Bar categories are now searchable.","My Schedule now opens on the user's current local week and includes one-click jumps to the first Fall 2026 and Spring 2027 instructional weeks. Notices and action dialogs now open in the center of the screen."] },
    { version:"v5.25", zh:["新增双向日历功能：可从 Google／Apple 导出的 .ics 文件读取个人日程并纳入冲突检测，也可把已选课程导出到 Google Calendar、Apple Calendar 或 Outlook。","新增中英文作者公告与版本记录；首次访问默认使用英文界面，仍可随时切换中文。"], en:["Added two-way calendar support: import personal events from Google or Apple .ics files for conflict checking, and export selected classes to Google Calendar, Apple Calendar, or Outlook.","Added bilingual author updates and release history. New visitors now start in English and can still switch to Chinese at any time."] },
    { version:"v5.24", zh:["修复 LAW 6641 多分类学分归类与推荐方案冲突兜底；新增 LAW 7202、LAW 7259，并建立中英文 Spring 2027 独立课程库。"], en:["Fixed LAW 6641 multi-category credit allocation and recommendation conflict handling; added LAW 7202 and LAW 7259 plus separate bilingual Spring 2027 catalogs."] },
    { version:"v5.23", zh:["恢复“1 学分及以下”筛选，中英文界面同步支持。"], en:["Restored the 1-credit-or-less filter in both languages."] },
    { version:"v5.22", zh:["已选课程可直接切换班次，课表、地点、冲突提示和 NY Bar 学分即时更新。"], en:["Selected courses can switch sections directly, immediately updating the schedule, location, conflicts, and NY Bar credits."] },
    { version:"v5.21", zh:["按实际所选班次重新计算 NY Bar 课堂学分，并区分线下、线上、独立研究及需确认课程。"], en:["Rebuilt NY Bar classroom-credit calculations around the selected section, distinguishing in-person, online, independent-study, and review-required courses."] },
    { version:"v5.20", zh:["增加浏览器本地保存说明、可迁移备份及 Cloudflare Pages 安全部署；后续版本已将主操作升级为日历导入导出。"], en:["Added browser-local persistence guidance, portable backups, and secure Cloudflare Pages deployment. Later releases replaced the main backup actions with calendar import and export."] },
    { version:"v5.19", zh:["搜索支持 NY Bar 分类名称；短课与冲突课表块更紧凑；超出注册学分上限时明确警示。"], en:["Added NY Bar category search, denser short/conflicting schedule blocks, and clear over-credit warnings."] },
    { version:"v5.18", zh:["完善英文界面；已选课程卡显示完整时间、教师和地点；重叠课程采用并排红框显示。"], en:["Completed the English interface, expanded selected-course details, and displayed overlapping classes side by side inside a red conflict frame."] },
    { version:"v5.17", zh:["压缩课程库标题与操作区，减少留白并上移课程卡。"], en:["Compacted the catalog header and actions to reduce empty space and move course cards higher."] },
    { version:"v5.16", zh:["重排新建课程、联系作者和快捷标签区域，并优化窄屏布局。"], en:["Reorganized new-course, contact, and quick-tag controls with improved narrow-screen layout."] },
    { version:"v5.15", zh:["依据 Cornell 2026–27 NY Bar memo 重新核验分类，并清除旧快照及无依据的推测简介。"], en:["Re-audited categories against Cornell's 2026–27 NY Bar memo and removed stale snapshots and unsupported inferred descriptions."] },
    { version:"v5.14", zh:["新增联系作者入口、邮箱与项目支持页面。"], en:["Added the author contact entry, email, and project-support page."] },
    { version:"v5.13", zh:["重做课程库控制区、拖拽课表与上课形式筛选，并按 Cornell 官方数据刷新课程、班次、教室和同意要求。"], en:["Rebuilt catalog controls, drag scheduling, and format filters, and refreshed courses, sections, rooms, and consent requirements from official Cornell data."] },
    { version:"v5.12", zh:["修复课程列表横向溢出，统一课程卡视觉高度，并接入 CU Reviews 历史聚合信息。"], en:["Fixed horizontal overflow, normalized course-card heights, and added historical aggregate CU Reviews information."] },
    { version:"v5.11", zh:["已选课程侧栏可收起；强化拖拽排课、课程方向筛选、外校导入及打印布局。"], en:["Made the selected-course rail collapsible and strengthened drag scheduling, course-focus filters, external-school imports, and printing."] },
    { version:"v5.10 及更早", versionEn:"v5.10 and earlier", zh:["完成离线双语课程库、课程检索、NY Bar 进度、推荐、周课表和外校数据导入等基础能力。"], en:["Established the offline bilingual catalog, course search, NY Bar progress, recommendations, weekly scheduling, and external-school import foundations."] }
  ];
  const customSchoolStore = loadCustomSchoolStore();
  // Imports are tied to a data build so a prior browser snapshot cannot silently
  // replace the current verified Cornell dataset.
  const CURRENT_CORNELL_DATASET_VERSION = "v5.32";
  const BUNDLED_CORNELL_DATABASE_VERSION = CURRENT_CORNELL_DATASET_VERSION;
  let cornellImportedDataset = loadCornellImportedDataset();
  let currentSchoolId = safeLocalStorageGet("llm-course-planner-current-school") || "cornell";
  if (currentSchoolId !== "cornell" && !customSchoolStore[currentSchoolId]) currentSchoolId = "cornell";
  let currentSchoolProfile = getSchoolProfile(currentSchoolId);
  let TERM = { ...DEFAULT_TERM, ...(currentSchoolProfile.term || {}) };
  let NO_CLASS_DATES = new Set(currentSchoolProfile.noClassDates || []);
  let SPECIAL_SCHEDULE_DAYS = { ...(currentSchoolProfile.specialScheduleDays || {}) };
  const BAR_LABELS = {
    professional: "NY Bar · 职业责任",
    writing: "NY Bar · 法律写作",
    american: "NY Bar · 美国法",
    core: "NYLE / Bar 考试科目"
  };
  const BAR_SHORT_LABELS = { professional:"职业责任", writing:"法律研究与写作", american:"美国法体系", core:"NYLE / Bar 考试科目" };
  const BAR_STATUS_LABELS = {
    eligible: "NY Bar 课堂学分",
    ineligible: "不计入 NY Bar",
    review: "需院系确认",
    core: "NYLE / Bar 考试科目"
  };
  const ENROLLMENT_LABELS = {
    automatic: "自动注册",
    open: "LLM 直选课",
    application: "需申请",
    permission: "需教师许可",
    department: "需院系同意",
    restricted: "限特定项目"
  };
  const BAR_STATUS_LABELS_EN = { eligible:"NY Bar classroom credit", ineligible:"Does not count toward NY Bar", review:"School confirmation required", core:"NYLE / Bar tested subjects" };
  const BAR_LABELS_EN = { professional:"NY Bar · Professional Responsibility", writing:"NY Bar · Legal Writing", american:"NY Bar · U.S. Law", core:"NYLE / Bar tested subjects" };
  const BAR_SHORT_LABELS_EN = { professional:"Professional Responsibility", writing:"Legal Research & Writing", american:"American legal system", core:"NYLE / Bar tested subjects" };
  const ENROLLMENT_LABELS_EN = { automatic:"Auto-enrolled", open:"LL.M. direct enrollment", application:"Application required", permission:"Instructor permission", department:"Department consent required", restricted:"Restricted program" };
  const FAQ_ITEMS = [
    {
      category: "评分",
      question: "Satisfactory/Unsatisfactory（S/U）是什么？",
      answer: "S/U 是合格／不合格评分，不显示 A、B 等具体字母等级。按照 Cornell Law 的规则，在允许学生选择 S/U 的课程中，原本达到 C- 或以上通常记为 S，D+ 或以下记为 U。课程若本身规定为 S/U only，不需要另行选择。",
      sourceLabel: "Cornell Law Student Handbook：Academic Policies and Procedures",
      sourceUrl: "https://publications.lawschool.cornell.edu/student-handbook/academic-policies-and-procedures/"
    },
    {
      category: "评分",
      question: "S/U 与 LL.M. 默认评分、JD 评分有什么区别？",
      answer: "General LL.M. 默认采用 HH／H／S／U 等级；学生也可在学校规定期限内选择整学年使用 JD 字母等级与曲线。单门课程的 S/U 选择与“整学年改用 JD 评分制”是两件不同的事。",
      sourceLabel: "Cornell Law：My Information 与 Student Handbook",
      sourceUrl: "https://community.lawschool.cornell.edu/academics/my-information/"
    },
    {
      category: "NY Bar",
      question: "24 个 NY Bar 学分是不是全部都要选 Bar 考试科目？",
      answer: "不是。24 学分是符合 Rule 520.6 的课堂课程总量；其中至少应包括职业责任 2 学分、法律研究／写作／分析 2 学分、美国法研究或美国法律体系 2 学分，以及 NY Bar／NYLE 考试科目 6 学分。软件会在进度面板将这些法定类别单列显示；多分类课程一次只能归入其中一栏。",
      sourceLabel: "Cornell Law：New York State Bar Examination Memorandum",
      sourceUrl: "https://community.lawschool.cornell.edu/wp-content/uploads/2026/05/NYS-Bar-Requirements-for-LLMs_Fall-2026.pdf"
    },
    {
      category: "NY Bar",
      question: "NY Bar 筛选的四个状态分别是什么意思？",
      answer: "“NY Bar 课堂学分”会按你所选班次计入 24 个课堂学分统计：一般是康奈尔法学院线下讲授、研讨或讨论班次，且没有明确排除原因。线上、独立研究及明确不适用的班次不会计入；诊所、实践课和项目限制班次会显示“需院系确认”。“NYLE／Bar 考试科目”是 Cornell memo 列示的课程，可任选组合以满足至少 6 学分，并同时计入 24 学分。职业责任、法律研究与写作和美国法体系是另列的法定类别；多分类课程可在学分进度中选择归类，但不会重复计入。",
      sourceLabel: "Cornell Law：NY Bar Memorandum",
      sourceUrl: "https://community.lawschool.cornell.edu/wp-content/uploads/2026/05/NYS-Bar-Requirements-for-LLMs_Fall-2026.pdf"
    },
    {
      category: "学位",
      question: "IALS 为什么会自动加入？会不会与普通课程冲突？",
      answer: "IALS 是 General LL.M. 的固定课程，在 Orientation 期间集中进行。软件按课程实际起止日期显示，因此它只会出现在 Orientation 周，不会占据 8 月 24 日以后每一周的普通课表，也不会与日期不重叠的普通课程构成冲突。",
      sourceLabel: "Cornell Law：General LL.M. Curricular Requirements",
      sourceUrl: "https://community.lawschool.cornell.edu/student-life/student-handbook/"
    },
    {
      category: "选课",
      question: "放入 Shopping Cart 是否等于选课成功？",
      answer: "不是。Shopping Cart 只是预先保存课程。选课窗口开放后仍需点击 ENROLL，并确认系统显示注册成功。课程按先到先得方式处理，应提前准备首选和备选课表。",
      sourceLabel: "Cornell University：Guide to Enrollment",
      sourceUrl: "https://registrar.cornell.edu/students/enrollment"
    },
    {
      category: "课程负担",
      question: "软件如何显示作业与期末考核？推荐会不会猜测工作量？",
      answer: "v5.9 从 Cornell Fall 2026 官方课程说明中保留中文译文和可展开的英文原文。日常作业与最终考核分开处理：只有明确写出 final requirement、final examination、final paper、final project 或 final presentation 的语句，才进入“最终考核方式”筛选。期中作业、课堂活动或泛泛的写作提及不会被误算为最终考核。",
      sourceLabel: "Cornell Law：Course Offerings",
      sourceUrl: "https://support.law.cornell.edu/CourseOfferings/"
    },
    {
      category: "日历",
      question: "为什么同一门课在某些周不显示？",
      answer: "周课表按照每个 meeting pattern 的实际 start date 与 end date 计算，并处理法学院无课日期。七周课、Orientation 集中课和提前结课课程只在实际发生的周出现。",
      sourceLabel: "Cornell Law：2026-27 Academic Calendar",
      sourceUrl: "https://community.lawschool.cornell.edu/academics/2026-27-academic-calendar/"
    },
    {
      category: "地点",
      question: "为什么有的课程只显示校区，没有具体教室？",
      answer: "课程地点以已导入的康奈尔官方课表班次信息为准。学校尚未公布房间时，软件会明确显示“教室尚未公布”，不会把“Ithaca主校区”或“Cornell Law School”冒充具体教室。如发现官方地点或课程信息已经调整，请通过“作者公告”联系作者提交更新；外校数据仍可在“学校与数据”中按官方来源导入。",
      sourceLabel: "Cornell University：Fall 2026 Class Roster",
      sourceUrl: "https://classes.cornell.edu/browse/roster/FA26/subject/LAW"
    }
,
    {
      category: "数据",
      question: "打开软件需要配置 OpenAI API 或联网吗？",
      answer: "不需要。软件已经预装经核对的 Cornell 2026–27 Fall 与 Spring LAW 课程快照，打开后即可离线搜索、查看和排课。只有主动导入其他学校或更新后的课程数据时才需要联网。",
      sourceLabel: "v5.32 离线双语课程数据说明",
      sourceUrl: "./README.md"
    },
    {
      category: "数据",
      question: "当前 Cornell 数据库包含什么？",
      answer: "当前数据库按学期保留 263 条开课记录，包括 Fall 2026 的 136 门与 Spring 2027 的 127 门。春季数据已按要求剔除仅限本科生、仅限 JD 及仅限 Cornell Tech LL.M. 的课程；每条记录均标明学期，同一课程号在春秋两季开设时会分别显示。",
      sourceLabel: "Cornell Law Course Offerings 与 Cornell Class Roster",
      sourceUrl: "https://support.law.cornell.edu/CourseOfferings/"
    },
    {
      category: "数据",
      question: "网页刷新后课表会消失吗？其他用户能看到我的课表吗？",
      answer: "不会。课表会自动保存在当前浏览器对应网站域名的本地存储中，正常刷新或关闭后重新打开仍会保留；其他设备或浏览器上的访问者不能读取。若多人共用同一浏览器用户资料，他们也会看到这份本地数据。换设备或浏览器时，可在“我的课表”使用“导入日历”下载 .ics，再导入 Google、Apple 或 Outlook；也可用“从日历导入”读取个人忙碌时段。日历文件只在本机处理。",
      sourceLabel: "本项目浏览器本地保存说明",
      sourceUrl: "./CLOUDFLARE_DEPLOY.md"
    }
  ];
  const FAQ_EN = [
    { category:"Grading", question:"What is Satisfactory/Unsatisfactory (S/U)?", answer:"S/U is a pass/fail-style grade that does not show a letter grade. Under Cornell Law's rules, a grade of C- or better in an eligible course is generally recorded as S, while D+ or below is U. A course designated S/U only does not require a separate election." },
    { category:"Grading", question:"How does S/U differ from the LL.M. default grading system and JD letter grades?", answer:"The General LL.M. default grading system uses HH/H/S/U. Students may also elect the JD letter-grade and curve system for the entire academic year by the stated deadline. A course-level S/U election and an annual switch to the JD grading system are separate choices." },
    { category:"NY Bar", question:"Do all 24 NY Bar credits have to be bar-exam subjects?", answer:"No. The 24 credits are the total qualifying classroom credits under Rule 520.6. They include at least 2 credits each in Professional Responsibility, Legal Research/Writing/Analysis, and American legal studies or the American legal system, plus at least 6 credits in NY Bar or NYLE tested subjects. The planner lists these requirements separately, and a multi-category course is allocated to only one category at a time." },
    { category:"NY Bar", question:"What do the four NY Bar filter states mean?", answer:"'NY Bar classroom credit' is calculated from the section you selected: ordinarily an in-person Cornell Law lecture, seminar, or discussion section without an official exclusion. Online and independent-study sections do not count; clinics, practica, and restricted sections require confirmation. 'NYLE / Bar tested subjects' identifies Cornell-listed tested-subject courses. Choose a combination totaling at least 6 credits; these credits also count toward the 24-credit total. Professional Responsibility, Legal Writing, and American legal studies appear separately in Credit Progress. A course listed in more than one category can be reallocated there, but it is never counted twice." },
    { category:"Degree", question:"Why is IALS added automatically, and can it conflict with regular courses?", answer:"IALS is a required General LL.M. course delivered during Orientation. The planner uses its actual dates, so it appears only during Orientation and does not create a conflict with regular classes beginning on August 24 unless dates truly overlap." },
    { category:"Enrollment", question:"Does putting a course in the Shopping Cart mean I am enrolled?", answer:"No. The Shopping Cart only saves a course in advance. When enrollment opens, you must still click ENROLL and confirm that the system reports successful enrollment. Prepare both first-choice and backup schedules." },
    { category:"Workload", question:"How are assignments and final assessments shown, and does the planner guess workload?", answer:"v5.9 separates ordinary coursework from final assessment. Only an expressly stated final requirement, final examination, final paper, final project, or final presentation appears in the final-assessment filter. Mid-course work, class activities, and generic writing references do not. Chinese translations are shown with the current official English original available in the detail page." },
    { category:"Calendar", question:"Why does the same course not appear in every week?", answer:"The weekly calendar follows each meeting pattern's actual start and end dates and excludes law-school no-class dates. Seven-week, Orientation, and early-ending courses appear only in the weeks when they actually meet." },
    { category:"Location", question:"Why do some courses show only a campus rather than a room?", answer:"Locations follow Cornell's official roster. When a specific room is not published, the planner says so rather than treating Ithaca campus or Cornell Law School as a room. Published building and room information is included in the bundled official roster data where available." },
    { category:"Data", question:"Do I need an OpenAI API key or internet access to open the planner?", answer:"No. The Cornell 2026-27 law-course dataset is bundled for offline search, review, and scheduling. Internet access is only needed when you choose to import or update an external school dataset." },
    { category:"Data", question:"What does the current Cornell dataset include?", answer:"The bundled database contains 263 term-specific offerings: 136 for Fall 2026 and 127 for Spring 2027. Spring offerings explicitly limited to undergraduates, JD students, or Cornell Tech LL.M. students are excluded. Each offering carries a term label, so a course taught in both terms appears separately." },
    { category:"Data", question:"Will refreshing erase my schedule, or can another user see it?", answer:"No. The planner automatically saves the schedule in this browser under the current site domain, so a normal refresh or reopening the page keeps it. Visitors on another device or browser cannot read it, but people sharing the same browser profile will see the same local data. Use Export to calendar in My Schedule to download an .ics file for Google, Apple, or Outlook; use Import from calendar to add personal busy times. Calendar files are processed only on this device." }
  ];
  const palette = [
    ["#edf4ff", "#c7dafd"], ["#f4edff", "#ddcdfb"], ["#eaf7ef", "#c4e7d2"],
    ["#fff2e8", "#f5d2b8"], ["#fff8df", "#eedb9e"], ["#ecf7f7", "#c8e5e5"],
    ["#fbeef4", "#edcbda"], ["#f0f1f3", "#d6d8dc"]
  ];

  let uiLanguage = safeLocalStorageGet("llm-course-planner-ui-language") === "zh" ? "zh" : "en";
  const cornellFallCatalog = Array.isArray(window.CORNELL_COURSE_CATALOG) ? window.CORNELL_COURSE_CATALOG : [];
  const cornellFallCatalogEn = Array.isArray(window.CORNELL_COURSE_CATALOG_EN) ? window.CORNELL_COURSE_CATALOG_EN : [];
  const cornellSpringCatalog = Array.isArray(window.CORNELL_SPRING_2027_COURSE_CATALOG) ? window.CORNELL_SPRING_2027_COURSE_CATALOG : [];
  const cornellSpringCatalogEn = Array.isArray(window.CORNELL_SPRING_2027_COURSE_CATALOG_EN) ? window.CORNELL_SPRING_2027_COURSE_CATALOG_EN : [];
  const cornellCatalog = [...cornellFallCatalog, ...cornellSpringCatalog];
  const cornellCatalogEn = [...cornellFallCatalogEn, ...cornellSpringCatalogEn];
  const cornellMeta = window.CORNELL_DATA_META || {};
  const cornellSpringMeta = window.CORNELL_SPRING_2027_DATA_META || {};
  const cureviewsSnapshot = window.CUREVIEWS_LAW_CURRENT || {};
  const cureviewsRecords = cureviewsSnapshot.records && typeof cureviewsSnapshot.records === "object" ? cureviewsSnapshot.records : {};
  const generatedRaw = [];
  const seed = cornellCatalog;
  const generated = [];
  let courses = currentSchoolId === "cornell" ? bundledCornellCourses() : (customSchoolStore[currentSchoolId]?.courses || []);
  courses = courses.map(course => ({ ...course, schoolId: course.schoolId || currentSchoolId }));
  let pendingImportedDataset = null;
  let pendingImportReport = null;
  let pendingAddRequest = null;
  let pendingPlacement = null;
  let activeDraggedCourseId = null;
  let pointerDragState = null;

  function sanitizeGeneratedCourses(raw, seedCourses) {
    const allowed = new Set(["llm","jd","su","s","u","ai","defi","esg","ny","bar","nyle","ip","us","sec","mba","tech"]);
    const hasEnglishResidue = value => {
      const words = String(value || "").match(/[A-Za-z][A-Za-z.'’/-]*/g) || [];
      return words.some(word => {
        const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
        return normalized.length > 1 && !allowed.has(normalized);
      });
    };
    const valid = c => c && c.translationStatus === "verified" && c.titleZh && c.descriptionZh && !hasEnglishResidue(c.titleZh) && !hasEnglishResidue(c.descriptionZh);
    const seedByCode = new Map(seedCourses.map(c => [c.code, c]));
    const result = [];
    for (const fresh of raw) {
      const editorial = seedByCode.get(fresh.code);
      if (editorial) {
        result.push({
          ...fresh,
          ...Object.fromEntries(["titleZh","descriptionZh","gradingZh","restrictionZh","prerequisitesZh","assessmentZh","translationStatus","recommendation","workload","categories","barPrimary","barCategories","barEvidence","barClassroomEligible","degreeRequired","llmSpecific","eligibility"].map(k => [k, editorial[k] ?? fresh[k]]))
        });
      } else if (valid(fresh)) result.push(fresh);
    }
    return result;
  }
  let state = loadState();
  let currentView = "courses";
  let currentDetailCourseId = null;
  let selectedDetailSectionId = null;
  let pendingCalendarExportEvents = [];

  function safeLocalStorageGet(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }

  function bundledCornellCourses() {
    const imported = Array.isArray(cornellImportedDataset?.courses) && cornellImportedDataset.courses.length ? cornellImportedDataset.courses : null;
    if (imported) return imported.map(course => isEnglish() ? ({ ...course, titleZh:course.titleEn || course.titleZh, descriptionZh:course.descriptionEn || course.descriptionZh, gradingZh:course.grading || course.gradingZh, restrictionZh:course.restrictionEn || course.restriction || course.restrictionZh, prerequisitesZh:course.prerequisitesEn || course.prerequisites || course.prerequisitesZh, assessmentZh:course.assessmentEn || course.assessmentZh, displayLanguage:"en" }) : ({ ...course }));
    if (uiLanguage !== "en" || !cornellCatalogEn.length) return [...cornellCatalog];
    const englishByOffering = new Map(cornellCatalogEn.map(course => [catalogOfferingKey(course), course]));
    return cornellCatalog.map(course => {
      const english = englishByOffering.get(catalogOfferingKey(course)) || {};
      return {
        ...course,
        titleZh: english.titleEn || course.titleZh,
        descriptionZh: english.descriptionEn || course.descriptionZh,
        gradingZh: english.grading || course.gradingZh,
        restrictionZh: english.restrictionEn || english.restriction || course.restrictionZh,
        prerequisitesZh: english.prerequisitesEn || english.prerequisites || course.prerequisitesZh,
        assessmentZh: english.assessmentEn || course.assessmentZh,
        campusZh: english.campusZh || course.campusZh,
        displayLanguage: "en"
      };
    });
  }

  function isEnglish() { return uiLanguage === "en"; }
  function courseTermCode(course) {
    const explicit = String(course?.officialSourceTerm || course?.term || "").toUpperCase();
    if (explicit.includes("SP27") || explicit.includes("SPRING 2027")) return "SP27";
    if (explicit.includes("FA26") || explicit.includes("FALL 2026")) return "FA26";
    if (/-SP27(?:-|$)/i.test(String(course?.id || "")) || /spring\s*2027/i.test(String(course?.session || ""))) return "SP27";
    return currentSchoolId === "cornell" ? "FA26" : explicit || "CUSTOM";
  }
  function catalogOfferingKey(course) { return String(course?.id || `${courseTermCode(course)}:${course?.code || ""}`); }
  function termProfileForCourse(course) { return currentSchoolId === "cornell" ? (CORNELL_TERM_PROFILES[courseTermCode(course)] || CORNELL_TERM_PROFILES.FA26) : TERM; }
  function termProfileForDate(date) {
    if (currentSchoolId !== "cornell") return TERM;
    const iso = toIsoDate(date);
    return Object.values(CORNELL_TERM_PROFILES).find(term => iso >= term.orientationStart && iso <= term.examEnd) || null;
  }
  function calendarPeriodForDate(date) {
    const iso = toIsoDate(date);
    const profiles = currentSchoolId === "cornell" ? Object.values(CORNELL_TERM_PROFILES) : [TERM];
    return profiles.flatMap(term => term?.calendarPeriods || []).find(period => iso >= period.start && iso <= period.end) || null;
  }
  function noClassPeriodLabelForDate(date) {
    const period = calendarPeriodForDate(date);
    return period?.noClass ? (isEnglish() ? period.labelEn : period.labelZh) : "";
  }
  function specialScheduleLabelForDate(date) {
    const iso = toIsoDate(date);
    const profile = termProfileForDate(date);
    const label = profile?.specialScheduleLabels?.[iso];
    return label ? (isEnglish() ? label.labelEn : label.labelZh) : "";
  }
  function termLabel(code, short = false) {
    const term = CORNELL_TERM_PROFILES[code];
    if (!term) return code;
    if (short) return code === "FA26" ? (isEnglish() ? "Fall" : "秋季") : (isEnglish() ? "Spring" : "春季");
    return isEnglish() ? term.label : term.labelZh;
  }
  function courseTermLabel(course, short = false) { return termLabel(courseTermCode(course), short); }
  function dayLabel(day) { return (isEnglish() ? DAY_MAP_EN : DAY_MAP)[day] || day; }
  function localizedLabel(item) { return isEnglish() ? (item.labelEn || item.label) : item.label; }
  function creditCount(value) { const count = Number(value || 0); return isEnglish() ? `${count} ${count === 1 ? "credit" : "credits"}` : `${count} 学分`; }
  function courseCount(value) { const count = Number(value || 0); return isEnglish() ? `${count} ${count === 1 ? "course" : "courses"}` : `${count} 门`; }
  function barStatusLabel(status) { return (isEnglish() ? BAR_STATUS_LABELS_EN : BAR_STATUS_LABELS)[status] || status; }
  function barPrimaryLabel(primary) { return (isEnglish() ? BAR_LABELS_EN : BAR_LABELS)[primary] || primary; }
  function barCategoryShortLabel(category) { return (isEnglish() ? BAR_SHORT_LABELS_EN : BAR_SHORT_LABELS)[category] || category; }
  function enrollmentLabel(value) { return (isEnglish() ? ENROLLMENT_LABELS_EN : ENROLLMENT_LABELS)[value] || (isEnglish() ? "To confirm" : "资格待核实"); }
  function courseTitle(c) { return isEnglish() ? (c.officialTitleEn || c.titleEn || c.titleZh || "Course title pending") : (c.titleZh || c.officialTitleEn || "课程中文名待补充"); }
  function normalizedCourseTitle(c) { return String(c.officialTitleEn || c.titleEn || c.titleZh || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
  function officialCourseDescription(c) { return c.officialDescriptionEn || c.descriptionEn || ""; }
  function hasChineseText(value) { return /[\u3400-\u9fff]/u.test(String(value || "")); }
  function chineseCourseDescription(c) {
    const description = String(c.descriptionZh || "").trim();
    if (!description || !hasChineseText(description) || /(?:暂无|尚无).{0,12}中文|中文.{0,8}待翻译/u.test(description)) return "";
    return description;
  }
  function englishCourseDescription(c) {
    const official = String(officialCourseDescription(c) || "").trim();
    if (official) return official;
    const mislabeledEnglish = String(c.descriptionZh || "").trim();
    return mislabeledEnglish && !hasChineseText(mislabeledEnglish) ? mislabeledEnglish : "";
  }
  function courseDescription(c) {
    if (isEnglish()) return englishCourseDescription(c) || "No official course description is available.";
    return chineseCourseDescription(c) || "中文课程说明待翻译；请在详情查看单独列示的官方英文原文。";
  }
  function detailDescriptionHtml(c, en = isEnglish()) {
    const english = englishCourseDescription(c);
    if (en) return `<section class="detail-section"><h3>Official course description</h3><p lang="en">${esc(english || "No official course description is available.")}</p></section>`;
    const chinese = chineseCourseDescription(c);
    if (chinese) return `<section class="detail-section"><h3>课程说明</h3><h4 class="translation-heading">中文课程说明</h4><p lang="zh-CN">${esc(chinese)}</p>${english ? `<h4 class="translation-heading official-english-heading">官方英文原文</h4><p lang="en">${esc(english)}</p>` : ""}</section>`;
    return `<section class="detail-section description-translation-pending"><h3>课程说明</h3><div class="translation-pending-notice" role="status"><strong>中文待翻译</strong><span>当前数据尚无中文课程说明；补齐后将自动优先显示中文。</span></div>${english ? `<h4 class="translation-heading official-english-heading">官方英文原文</h4><p lang="en">${esc(english)}</p>` : `<p>暂无官方英文课程说明。</p>`}</section>`;
  }
  function detailAdditionalInformationHtml(c, en = isEnglish()) {
    const english = Array.isArray(c.additionalInformationEn) ? c.additionalInformationEn.filter(Boolean) : [];
    const chinese = Array.isArray(c.additionalInformationZh) ? c.additionalInformationZh.filter(value => hasChineseText(value)) : [];
    const values = en ? english : chinese;
    if (!values.length) return "";
    return `<section class="detail-section official-additional-information"><h3>${en ? "Additional official information" : "官方补充信息"}</h3><ul>${values.map(value => `<li>${esc(value)}</li>`).join("")}</ul></section>`;
  }
  function detailOfficialAttributesHtml(c, en = isEnglish()) {
    const asList = value => Array.isArray(value) ? value.filter(Boolean) : (String(value || "").trim() ? [String(value).trim()] : []);
    const concentrations = asList(en ? c.concentrationsEn : c.concentrationsZh);
    const requirements = asList(en ? c.degreeRequirementsEn : c.degreeRequirementsZh);
    if (!concentrations.length && !requirements.length) return "";
    return `<section class="detail-section official-course-attributes"><h3>${en ? "Official course attributes" : "官方课程属性"}</h3>${concentrations.length ? `<p><strong>${en ? "Concentrations:" : "课程方向："}</strong> ${esc(concentrations.join(en ? ", " : "、"))}</p>` : ""}${requirements.length ? `<p><strong>${en ? "Degree requirements:" : "学位要求标签："}</strong> ${esc(requirements.join(en ? ", " : "、"))}</p>` : ""}</section>`;
  }
  function detailOfficialLinksHtml(c, en = isEnglish()) {
    const currentUrl = c.currentOfferingUrl || c.sourceUrl || currentSchoolProfile.catalogUrl || "";
    const catalogUrl = c.catalogUrl && c.catalogUrl !== currentUrl ? c.catalogUrl : "";
    const links = [
      currentUrl ? `<a href="${esc(currentUrl)}" target="_blank" rel="noreferrer">${en ? "Open the current official offering" : "打开当前官方开课页面"} ↗</a>` : "",
      catalogUrl ? `<a href="${esc(catalogUrl)}" target="_blank" rel="noreferrer">${en ? "Open the course-specific official catalog or prior roster record" : "打开本课程官方目录／历史开课记录"} ↗</a>` : ""
    ].filter(Boolean);
    if (!links.length) return "";
    return `<section class="detail-section official-source-links"><h3>${en ? "Official sources" : "官方来源"}</h3>${links.map(link => `<p>${link}</p>`).join("")}</section>`;
  }
  function courseOfficialText(c) { return `${c.officialTitleEn || c.titleEn || ""} ${officialCourseDescription(c)} ${(c.categories || []).join(" ")}`.toLowerCase(); }
  function barCategories(c) { return NY_BAR_ALLOCATION.categories(c); }
  function assignedBarCategory(c) {
    const categories = barCategories(c);
    const explicit = state?.barCategoryAllocations?.[c.id];
    if (categories.includes(explicit)) return explicit;
    if (categories.length <= 1) return NY_BAR_ALLOCATION.assignedCategory(c, {});
    const targets = { professional:2, writing:2, american:2, core:6 };
    const otherSelected = selectedCourses().filter(course => course.id !== c.id && barStatus(course, state.selected[course.id]) === "eligible");
    const totals = NY_BAR_ALLOCATION.creditsByCategory(otherSelected, state?.barCategoryAllocations || {}, course => barStatus(course, state.selected[course.id]) === "eligible");
    const credits = Number(c.credits || 0);
    return [...categories].sort((a, b) => {
      const gainA = Math.min(credits, Math.max(0, (targets[a] || 0) - (totals[a] || 0)));
      const gainB = Math.min(credits, Math.max(0, (targets[b] || 0) - (totals[b] || 0)));
      if (gainA !== gainB) return gainB - gainA;
      return a === c.barPrimary ? -1 : b === c.barPrimary ? 1 : categories.indexOf(a) - categories.indexOf(b);
    })[0] || NY_BAR_ALLOCATION.assignedCategory(c, {});
  }
  function nyBarFilterBucket(c, sectionId = undefined) { return barCategories(c).includes("core") ? "core" : barStatus(c, sectionId === undefined ? sectionSelectionId(defaultSectionSelection(c)) : sectionId); }
  function assessmentEvidence(c) {
    const source = c.assessmentEvidence && typeof c.assessmentEvidence === "object" ? c.assessmentEvidence : {};
    return { assignments:Array.isArray(source.assignments) ? source.assignments : [], finalAssessment:Array.isArray(source.finalAssessment) ? source.finalAssessment : [], finalMethods:Array.isArray(source.finalMethods) ? source.finalMethods : [], status:source.status || "not-stated-in-official-description", sourceUrl:source.sourceUrl || c.sourceUrl || "" };
  }
  function hasAssignmentEvidence(c) { return assessmentEvidence(c).assignments.length > 0; }
  function finalMethods(c) { return assessmentEvidence(c).finalMethods; }
  function hasFinalAssessmentEvidence(c) { return finalMethods(c).length > 0; }
  function assessmentSummary(c) {
    const methods = finalMethods(c);
    if (!methods.length) return isEnglish() ? "Final assessment method not stated in official description" : "官方说明未载明最终考核方式";
    const labels = [...new Set(methods.map(item => isEnglish() ? item.labelEn : item.labelZh).filter(Boolean))];
    return labels.join(isEnglish() ? "; " : "、");
  }
  const els = {
    courseList: document.getElementById("courseList"), courseCountText: document.getElementById("courseCountText"),
    searchInput: document.getElementById("searchInput"), termFilter:document.getElementById("termFilter"), barFilter: document.getElementById("barFilter"),
    gradingFilter: document.getElementById("gradingFilter"), creditsFilter: document.getElementById("creditsFilter"), meetingDayFilter: document.getElementById("meetingDayFilter"), topicFilter: document.getElementById("topicFilter"), llmFilter: document.getElementById("llmFilter"), courseFormatFilter: document.getElementById("courseFormatFilter"), sortSelect: document.getElementById("sortSelect"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"), languageToggleBtn:document.getElementById("languageToggleBtn"), scheduleNavDropTarget: document.getElementById("scheduleNavDropTarget"),
    creditProgress: document.getElementById("creditProgress"), miniSchedule: document.getElementById("miniSchedule"),
    selectedSummary: document.getElementById("selectedSummary"), recommendationGroups: document.getElementById("recommendationGroups"),
    fullSchedule: document.getElementById("fullSchedule"), unscheduledCourses: document.getElementById("unscheduledCourses"), selectedCourseTrayCount:document.getElementById("selectedCourseTrayCount"),
    conflictStatus: document.getElementById("conflictStatus"), detailOverlay: document.getElementById("detailOverlay"),
    detailContent: document.getElementById("detailContent"), toast: document.getElementById("toast"),
    pageTitle: document.getElementById("pageTitle"), pageSubtitle: document.getElementById("pageSubtitle"),
    tagHelpOverlay: document.getElementById("tagHelpOverlay"),
    previousWeekBtn: document.getElementById("previousWeekBtn"), nextWeekBtn: document.getElementById("nextWeekBtn"),
    scheduleDateInput: document.getElementById("scheduleDateInput"), fallWeekBtn: document.getElementById("fallWeekBtn"), springWeekBtn: document.getElementById("springWeekBtn"),
    scheduleWeekLabel: document.getElementById("scheduleWeekLabel"), scheduleWeekNumber: document.getElementById("scheduleWeekNumber"),
    scheduleWeekCaption: document.getElementById("scheduleWeekCaption"), faqList: document.getElementById("faqList"),
    faqSearchInput: document.getElementById("faqSearchInput"), locationAgenda: document.getElementById("locationAgenda"), faqIntroEyebrow:document.getElementById("faqIntroEyebrow"), faqIntroTitle:document.getElementById("faqIntroTitle"), faqIntroCopy:document.getElementById("faqIntroCopy"),
    travelStatus: document.getElementById("travelStatus"), localDataStatus: document.getElementById("localDataStatus"), scheduleStorageStatus:document.getElementById("scheduleStorageStatus"),
    brandSubtitle: document.getElementById("brandSubtitle"), schoolSwitcherBtn: document.getElementById("schoolSwitcherBtn"),
    currentSchoolShort: document.getElementById("currentSchoolShort"), currentTermShort: document.getElementById("currentTermShort"), termSwitchHint: document.getElementById("termSwitchHint"),
    careerDirectionChips: document.getElementById("careerDirectionChips"), coursePreferenceChips: document.getElementById("coursePreferenceChips"),
    careerProfileSummary: document.getElementById("careerProfileSummary"), randomCareerBtn: document.getElementById("randomCareerBtn"), clearCareerProfileBtn: document.getElementById("clearCareerProfileBtn"),
    scheduleCourseTray: document.getElementById("scheduleCourseTray"),
    scheduleDropShell: document.getElementById("scheduleDropShell"), scheduleDropMessage: document.getElementById("scheduleDropMessage"),
    schoolPresetGrid: document.getElementById("schoolPresetGrid"), importWorkbench: document.getElementById("importWorkbench"), currentSchoolFullName: document.getElementById("currentSchoolFullName"),
    currentSchoolDataStatus: document.getElementById("currentSchoolDataStatus"), currentSchoolCourseCount: document.getElementById("currentSchoolCourseCount"), currentSchoolCatalogLink: document.getElementById("currentSchoolCatalogLink"),
    importSchoolNameZh: document.getElementById("importSchoolNameZh"), importSchoolNameEn: document.getElementById("importSchoolNameEn"), importTermLabel: document.getElementById("importTermLabel"),
    importInstructionStart: document.getElementById("importInstructionStart"), importInstructionEnd: document.getElementById("importInstructionEnd"), importCatalogUrl: document.getElementById("importCatalogUrl"),
    importSourceType: document.getElementById("importSourceType"), importApiUrl: document.getElementById("importApiUrl"), importApiHeaders: document.getElementById("importApiHeaders"), importFieldMapping: document.getElementById("importFieldMapping"),
    remoteApiFields: document.getElementById("remoteApiFields"), fileImportFields: document.getElementById("fileImportFields"), pasteImportFields: document.getElementById("pasteImportFields"),
    importFileInput: document.getElementById("importFileInput"), importPasteText: document.getElementById("importPasteText"), importTranslateCheckbox: document.getElementById("importTranslateCheckbox"),
    fetchImportBtn: document.getElementById("fetchImportBtn"), commitImportBtn: document.getElementById("commitImportBtn"), importPreview: document.getElementById("importPreview"), importPreviewStatus: document.getElementById("importPreviewStatus"),
    sectionPickerOverlay: document.getElementById("sectionPickerOverlay"), sectionPickerCourseTitle: document.getElementById("sectionPickerCourseTitle"), sectionPickerOptions: document.getElementById("sectionPickerOptions"),
    conflictOverlay: document.getElementById("conflictOverlay"), conflictMessage: document.getElementById("conflictMessage"), conflictDetails: document.getElementById("conflictDetails"),
    assistantImportPrompt:document.getElementById("assistantImportPrompt"), copyImportPromptBtn:document.getElementById("copyImportPromptBtn"),
    printScheduleBtn:document.getElementById("printScheduleBtn"), newCourseBtn:document.getElementById("newCourseBtn"), miniSchedulePanel:document.getElementById("miniSchedulePanel"), courseContentGrid:document.getElementById("courseContentGrid"), miniScheduleCollapseBtn:document.getElementById("miniScheduleCollapseBtn"),
    courseEditorOverlay:document.getElementById("courseEditorOverlay"), courseEditorForm:document.getElementById("courseEditorForm"), editorCourseId:document.getElementById("editorCourseId"), editorCourseCode:document.getElementById("editorCourseCode"), editorCourseCredits:document.getElementById("editorCourseCredits"), editorTitleZh:document.getElementById("editorTitleZh"), editorTitleEn:document.getElementById("editorTitleEn"), editorMeetingDay:document.getElementById("editorMeetingDay"), editorStartTime:document.getElementById("editorStartTime"), editorEndTime:document.getElementById("editorEndTime"), editorLocation:document.getElementById("editorLocation"), editorDescriptionZh:document.getElementById("editorDescriptionZh"), deleteCourseBtn:document.getElementById("deleteCourseBtn"), supportAuthorOverlay:document.getElementById("supportAuthorOverlay"),
    calendarImportBtn:document.getElementById("calendarImportBtn"), calendarExportBtn:document.getElementById("calendarExportBtn"), calendarFileInput:document.getElementById("calendarFileInput"), clearImportedCalendarBtn:document.getElementById("clearImportedCalendarBtn"), calendarExportOverlay:document.getElementById("calendarExportOverlay"),
    authorAnnouncementOverlay:document.getElementById("authorAnnouncementOverlay"), authorAnnouncementList:document.getElementById("authorAnnouncementList"),
    termSwitchOverlay:document.getElementById("termSwitchOverlay"), termSwitchDescription:document.getElementById("termSwitchDescription")
  };

  init();

  function init() {
    applyLocalCourseEdits();
    ensureIalsSelected();
    initializeMultiSelectControls();
    bindEvents();
    renderSchoolIdentity();
    renderLocalDataStatus();
    renderAll();
    applyLanguageChrome();
  }

  function loadState() {
    try {
      const root = JSON.parse(localStorage.getItem("llm-course-planner-state-v5") || "{}");
      const schoolState = root.schools?.[currentSchoolId];
      if (schoolState) return {
        selected: schoolState.selected || {}, scheduleWeekStart: schoolState.scheduleWeekStart || TERM.instructionStart,
        locationOverrides: schoolState.locationOverrides || {}, roomSyncLocations: schoolState.roomSyncLocations || {}, roomSyncMeta: schoolState.roomSyncMeta || {}, recommendationProfile: schoolState.recommendationProfile || { directions:[], preferences:[] }, manualPlacements: schoolState.manualPlacements || {}, courseOverrides: schoolState.courseOverrides || {}, customCourses: schoolState.customCourses || [], barCategoryAllocations:schoolState.barCategoryAllocations || {}, calendarEvents:Array.isArray(schoolState.calendarEvents) ? schoolState.calendarEvents : [], miniScheduleCollapsed:Boolean(schoolState.miniScheduleCollapsed)
      };
      if (currentSchoolId === "cornell") {
        const legacy = JSON.parse(localStorage.getItem("llm-course-planner-state") || "{}");
        return { selected: legacy.selected || {}, scheduleWeekStart: legacy.scheduleWeekStart || TERM.instructionStart, locationOverrides: legacy.locationOverrides || {}, roomSyncLocations: legacy.roomSyncLocations || {}, roomSyncMeta: legacy.roomSyncMeta || {}, recommendationProfile:{ directions:[], preferences:[] }, manualPlacements:{}, courseOverrides:{}, customCourses:[], barCategoryAllocations:{}, calendarEvents:[], miniScheduleCollapsed:false };
      }
    } catch {}
    return { selected: {}, scheduleWeekStart: TERM.instructionStart, locationOverrides: {}, roomSyncLocations: {}, roomSyncMeta: {}, recommendationProfile:{ directions:[], preferences:[] }, manualPlacements:{}, courseOverrides:{}, customCourses:[], barCategoryAllocations:{}, calendarEvents:[], miniScheduleCollapsed:false };
  }

  function saveState() {
    let root = {};
    try { root = JSON.parse(localStorage.getItem("llm-course-planner-state-v5") || "{}"); } catch {}
    root.schools ||= {};
    root.schools[currentSchoolId] = state;
    try {
      localStorage.setItem("llm-course-planner-state-v5", JSON.stringify(root));
      localStorage.setItem("llm-course-planner-last-saved-at", new Date().toISOString());
      updateScheduleStorageStatus();
    } catch (error) {
      updateScheduleStorageStatus(true);
      showToast(isEnglish() ? "This browser could not save the plan. Export the schedule to your calendar and check site-storage settings." : "浏览器未能保存课表，请先导入日历并检查网站存储设置。", true);
      console.error("Unable to save planner state", error);
    }
  }

  function ensureIalsSelected() {
    for (const code of currentSchoolProfile.autoEnrollCodes || []) {
      const course = courses.find(c => c.code === code);
      if (course && !state.selected[course.id]) state.selected[course.id] = course.sections?.[0]?.id || null;
    }
    saveState();
  }

  function selectedFilterValues(select) {
    if (!select) return new Set();
    return new Set([...select.selectedOptions].map(option => option.value).filter(value => value && value !== "all"));
  }

  function setFilterValues(select, values = []) {
    if (!select) return;
    const wanted = new Set(values);
    [...select.options].forEach(option => { option.selected = option.value !== "all" && wanted.has(option.value); });
    refreshMultiSelectControls();
  }

  function initializeMultiSelectControls() {
    document.querySelectorAll("select.multi-filter-source").forEach(select => {
      [...select.options].forEach(option => { if (option.value === "all") option.selected = false; });
      if (select.nextElementSibling?.classList.contains("filter-multiselect")) return;
      const details = document.createElement("details");
      details.className = "filter-multiselect";
      details.dataset.filterFor = select.id;
      const options = [...select.options].filter(option => option.value !== "all");
      details.innerHTML = `<summary><span class="multi-filter-summary"></span></summary><div class="multi-filter-menu">${options.map(option => `<label class="multi-filter-option"><input type="checkbox" value="${esc(option.value)}"><span>${esc(option.textContent)}</span></label>`).join("")}</div>`;
      select.insertAdjacentElement("afterend", details);
      details.querySelectorAll("input[type=checkbox]").forEach(checkbox => checkbox.addEventListener("change", () => {
        const option = [...select.options].find(item => item.value === checkbox.value);
        if (option) option.selected = checkbox.checked;
        refreshMultiSelectControls();
        select.dispatchEvent(new Event("input", { bubbles:true }));
      }));
    });
    document.addEventListener("click", event => document.querySelectorAll("details.filter-multiselect[open]").forEach(details => {
      if (!details.contains(event.target)) details.open = false;
    }));
    refreshMultiSelectControls();
  }

  function refreshMultiSelectControls() {
    document.querySelectorAll("details.filter-multiselect").forEach(details => {
      const select = document.getElementById(details.dataset.filterFor);
      if (!select) return;
      const selected = selectedFilterValues(select);
      details.querySelectorAll("input[type=checkbox]").forEach(checkbox => {
        const option = [...select.options].find(item => item.value === checkbox.value);
        checkbox.checked = selected.has(checkbox.value);
        checkbox.disabled = Boolean(option?.disabled);
        const label = checkbox.nextElementSibling;
        if (label && option) label.textContent = option.textContent;
      });
      const summary = details.querySelector(".multi-filter-summary");
      const selectedLabels = [...select.options].filter(option => selected.has(option.value)).map(option => option.textContent);
      if (summary) summary.textContent = !selectedLabels.length ? (isEnglish() ? "All" : "全部") : selectedLabels.length === 1 ? selectedLabels[0] : (isEnglish() ? `${selectedLabels.length} selected` : `已选 ${selectedLabels.length} 项`);
      details.classList.toggle("has-selection", selectedLabels.length > 0);
    });
  }

  function activePlanningTermCode() {
    if (currentSchoolId !== "cornell") return "CUSTOM";
    const selectedTerms = [...selectedFilterValues(els.termFilter)];
    if (selectedTerms.length === 1) return selectedTerms[0];
    const currentTerm = termProfileForDate(new Date());
    if (currentTerm?.code) return currentTerm.code;
    const scheduleTerm = termProfileForDate(parseIsoDate(state?.scheduleWeekStart || CORNELL_TERM_PROFILES.FA26.instructionStart));
    return scheduleTerm?.code || "FA26";
  }

  function planningTermCourses(list = courses) {
    if (currentSchoolId !== "cornell") return list;
    const code = activePlanningTermCode();
    return list.filter(course => courseTermCode(course) === code);
  }

  function currentUserWeekStart(now = new Date()) { return toIsoDate(startOfWeek(now)); }

  function chooseTermFilter(choice) {
    setFilterValues(els.termFilter, choice === "all" ? [] : [choice]);
    els.termFilter?.dispatchEvent(new Event("input", { bubbles:true }));
    closeTermSwitch();
    switchView("courses");
  }

  function renderTermSwitchDialog() {
    if (!els.termSwitchOverlay) return;
    if (els.termSwitchDescription) els.termSwitchDescription.textContent = isEnglish()
      ? "This choice filters Course Search and term-specific recommendations only. Your Fall and Spring selections remain together, and NY Bar progress always covers the full 2026–27 academic year."
      : "这里仅筛选课程库及当学期推荐。秋季与春季选课始终保存在同一份个人记录中，NY Bar 进度按整个 2026–27 学年统一计算。";
    const selected = selectedFilterValues(els.termFilter);
    document.querySelectorAll("[data-term-choice]").forEach(button => {
      const choice = button.dataset.termChoice;
      button.classList.toggle("is-active", choice === "all" ? selected.size === 0 || selected.size === 2 : selected.size === 1 && selected.has(choice));
      button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
      if (choice === "all") button.innerHTML = `<strong>${isEnglish() ? "Fall + Spring" : "秋季 + 春季"}</strong><span>${isEnglish() ? `${cornellCatalog.length} term-specific offerings` : `共 ${cornellCatalog.length} 条分学期开课记录`}</span>`;
      if (choice === "FA26") button.innerHTML = `<strong>${isEnglish() ? "Fall 2026" : "2026 秋季"}</strong><span>${isEnglish() ? `${cornellFallCatalog.length} planning courses` : `${cornellFallCatalog.length} 门候选课程`}</span>`;
      if (choice === "SP27") button.innerHTML = `<strong>${isEnglish() ? "Spring 2027" : "2027 春季"}</strong><span>${isEnglish() ? `${cornellSpringCatalog.length} planning courses` : `${cornellSpringCatalog.length} 门候选课程`}</span>`;
    });
    const title = document.getElementById("termSwitchTitle");
    if (title) title.textContent = isEnglish() ? "Choose catalog term" : "选择课程学期";
    const manage = document.getElementById("manageSchoolDataBtn");
    if (manage) manage.textContent = isEnglish() ? "Schools & Data" : "学校与数据";
  }

  function openTermSwitch() {
    if (!els.termSwitchOverlay) return switchView("schools");
    renderTermSwitchDialog();
    els.termSwitchOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeTermSwitch() {
    if (els.termSwitchOverlay) els.termSwitchOverlay.hidden = true;
    if ((!els.authorAnnouncementOverlay || els.authorAnnouncementOverlay.hidden) && (!els.calendarExportOverlay || els.calendarExportOverlay.hidden)) document.body.style.overflow = "";
  }

  function bindEvents() {
    [els.searchInput, els.barFilter, els.gradingFilter, els.creditsFilter, els.meetingDayFilter, els.topicFilter, els.llmFilter, els.courseFormatFilter, els.sortSelect].filter(Boolean).forEach(el => el.addEventListener("input", renderCourseList));
    els.termFilter?.addEventListener("input", () => { renderCourseList(); renderProgress(); renderMiniSchedule(); renderRecommendations(); renderSchoolIdentity(); renderTermSwitchDialog(); });
    els.resetFiltersBtn?.addEventListener("click", resetCourseFilters);
    document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
    document.querySelectorAll("[data-view-target]").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.viewTarget)));
    document.getElementById("closeDrawerBtn").addEventListener("click", closeDrawer);
    els.detailOverlay.addEventListener("click", e => { if (e.target === els.detailOverlay) closeDrawer(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeTagHelp(); closeCalendarExport(); closeAuthorAnnouncement(); closeTermSwitch(); } });
    document.getElementById("clearScheduleBtn").addEventListener("click", clearSchedule);
    els.printScheduleBtn?.addEventListener("click", printSchedule);
    els.calendarImportBtn?.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.calendarFileInput?.click(); } });
    els.calendarFileInput?.addEventListener("change", importCalendarFiles);
    els.calendarExportBtn?.addEventListener("click", openCalendarExport);
    els.clearImportedCalendarBtn?.addEventListener("click", clearImportedCalendar);
    document.getElementById("closeCalendarExportBtn")?.addEventListener("click", closeCalendarExport);
    document.getElementById("googleCalendarExportBtn")?.addEventListener("click", exportCalendarForGoogle);
    document.getElementById("icsCalendarExportBtn")?.addEventListener("click", downloadSelectedScheduleIcs);
    els.calendarExportOverlay?.addEventListener("click", event => { if (event.target === els.calendarExportOverlay) closeCalendarExport(); });
    els.newCourseBtn?.addEventListener("click", () => openCourseEditor());
    els.miniScheduleCollapseBtn?.addEventListener("click", toggleMiniSchedulePanel);
    document.getElementById("resetPlanBtn").addEventListener("click", clearSchedule);
    document.getElementById("loadRecommendedBtn").addEventListener("click", () => { switchView("recommendations"); showToast(isEnglish() ? "Choose one or more tags, then generate a recommendation plan." : "请先选择一个或多个偏好标签，再生成推荐方案。", false); });
    document.getElementById("generateRecommendedPlanBtn")?.addEventListener("click", loadRecommendedPlan);
    document.getElementById("authorAnnouncementBtn")?.addEventListener("click", openAuthorAnnouncement);
    els.languageToggleBtn?.addEventListener("click", toggleLanguage);
    els.copyImportPromptBtn?.addEventListener("click", copyAssistantImportPrompt);
    document.getElementById("tagHelpBtn")?.addEventListener("click", openTagHelp);
    document.getElementById("closeTagHelpBtn")?.addEventListener("click", closeTagHelp);
    els.tagHelpOverlay?.addEventListener("click", e => { if (e.target === els.tagHelpOverlay) closeTagHelp(); });
    document.addEventListener("click", handleBadgeFilterClick);
    els.previousWeekBtn?.addEventListener("click", () => moveScheduleWeek(-7));
    els.nextWeekBtn?.addEventListener("click", () => moveScheduleWeek(7));
    els.fallWeekBtn?.addEventListener("click", () => setScheduleWeek(CORNELL_TERM_PROFILES.FA26.instructionStart));
    els.springWeekBtn?.addEventListener("click", () => setScheduleWeek(CORNELL_TERM_PROFILES.SP27.instructionStart));
    els.scheduleDateInput?.addEventListener("change", () => setScheduleWeek(els.scheduleDateInput.value));
    els.faqSearchInput?.addEventListener("input", renderFaq);
    els.schoolSwitcherBtn?.addEventListener("click", () => currentSchoolId === "cornell" ? openTermSwitch() : switchView("schools"));
    document.getElementById("closeTermSwitchBtn")?.addEventListener("click", closeTermSwitch);
    document.getElementById("manageSchoolDataBtn")?.addEventListener("click", () => { closeTermSwitch(); switchView("schools"); });
    document.querySelectorAll("[data-term-choice]").forEach(button => button.addEventListener("click", () => chooseTermFilter(button.dataset.termChoice)));
    els.termSwitchOverlay?.addEventListener("click", event => { if (event.target === els.termSwitchOverlay) closeTermSwitch(); });
    els.randomCareerBtn?.addEventListener("click", randomizeCareerProfile);
    els.clearCareerProfileBtn?.addEventListener("click", () => { state.recommendationProfile = { directions:[], preferences:[] }; saveState(); renderCareerControls(); renderRecommendations(); });
    els.importSourceType?.addEventListener("change", updateImportSourceFields);
    els.fetchImportBtn?.addEventListener("click", previewImportSource);
    els.commitImportBtn?.addEventListener("click", commitImportedDataset);
    document.getElementById("downloadImportTemplateBtn")?.addEventListener("click", downloadImportTemplates);
    document.getElementById("downloadImportChecklistBtn")?.addEventListener("click", downloadImportChecklist);
    document.getElementById("closeSectionPickerBtn")?.addEventListener("click", closeSectionPicker);
    document.getElementById("closeConflictBtn")?.addEventListener("click", closeConflictDialog);
    document.getElementById("cancelConflictBtn")?.addEventListener("click", closeConflictDialog);
    document.getElementById("forceAddConflictBtn")?.addEventListener("click", forcePendingAdd);
    els.sectionPickerOverlay?.addEventListener("click", e => { if (e.target === els.sectionPickerOverlay) closeSectionPicker(); });
    els.conflictOverlay?.addEventListener("click", e => { if (e.target === els.conflictOverlay) closeConflictDialog(); });
    document.getElementById("closeCourseEditorBtn")?.addEventListener("click", closeCourseEditor);
    document.getElementById("cancelCourseEditorBtn")?.addEventListener("click", closeCourseEditor);
    els.courseEditorOverlay?.addEventListener("click", e => { if (e.target === els.courseEditorOverlay) closeCourseEditor(); });
    els.courseEditorForm?.addEventListener("submit", saveCourseEditor);
    els.deleteCourseBtn?.addEventListener("click", deleteCustomCourse);
    document.getElementById("supportAuthorBtn")?.addEventListener("click", openSupportAuthor);
    document.getElementById("contactAuthorBtnInline")?.addEventListener("click", openSupportAuthor);
    document.getElementById("closeSupportAuthorBtn")?.addEventListener("click", closeSupportAuthor);
    els.supportAuthorOverlay?.addEventListener("click", event => { if (event.target === els.supportAuthorOverlay) closeSupportAuthor(); });
    document.getElementById("closeAuthorAnnouncementBtn")?.addEventListener("click", closeAuthorAnnouncement);
    els.authorAnnouncementOverlay?.addEventListener("click", event => { if (event.target === els.authorAnnouncementOverlay) closeAuthorAnnouncement(); });
    setupDropzone(els.miniSchedule);
    setupScheduleDropzone();
    setupScheduleNavDropzone();
    window.addEventListener("pointermove", handlePointerDragMove, { passive:false });
    window.addEventListener("pointerup", finishPointerDrag, true);
    window.addEventListener("pointercancel", finishPointerDrag, true);
    // Some embedded desktop browsers surface a mouse sequence without Pointer
    // Events for a drag that starts in a horizontally scrolling tray. Keep the
    // same drop path for that case instead of silently doing nothing.
    window.addEventListener("mousemove", handleMouseDragMove, { passive:false });
    window.addEventListener("mouseup", finishMouseDrag, true);
  }

  function switchView(view) {
    const priorView = currentView;
    currentView = view;
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("is-active", v.id === `view-${view}`));
    document.querySelectorAll(".nav-item").forEach(v => v.classList.toggle("is-active", v.dataset.view === view));
    const titles = isEnglish() ? {
      courses: ["Course Search", "Offline course catalog, NY Bar labels and conflict checks"],
      recommendations: ["Recommendations", "Choose your priorities before generating a plan"],
      schedule: ["My Schedule", "Drag courses in and place them using official meeting times"],
      schools: ["Schools & Data", "Switch schools or import an approved course dataset"],
      faq: ["New Student FAQ", "Understand grading, credits, enrollment and workload"]
    } : {
      courses: ["课程检索", "官方课程说明、NY Bar 标识与实时冲突检查"],
      recommendations: ["课程推荐", "依据硬性要求、职业方向与低压力估算生成"],
      schedule: ["我的课表", "直接拖入课程并按官方时间自动排课"],
      schools: ["学校与数据", "切换法学院、接入官方数据源或导入课程文件"],
      faq: ["新生 FAQ", "用中文理解评分、学分、选课和课程负担"]
    };
    [els.pageTitle.textContent, els.pageSubtitle.textContent] = titles[view];
    if (view === "schedule") {
      if (priorView !== "schedule") state.scheduleWeekStart = currentUserWeekStart();
      saveState(); renderSchedule(); renderScheduleCourseTray();
    }
    if (view === "schools") renderSchoolManager();
    if (view === "faq") renderFaq();
  }

  function getFilteredCourses() {
    const q = els.searchInput.value.trim().toLowerCase();
    const termValues = selectedFilterValues(els.termFilter);
    const barValues = selectedFilterValues(els.barFilter);
    const gradingValues = selectedFilterValues(els.gradingFilter);
    const creditValues = selectedFilterValues(els.creditsFilter);
    const meetingDayValues = selectedFilterValues(els.meetingDayFilter);
    const topicValues = selectedFilterValues(els.topicFilter);
    const llmValues = selectedFilterValues(els.llmFilter);
    const formatValues = selectedFilterValues(els.courseFormatFilter);
    let list = courses.filter(c => {
      const locationText = (c.sections || []).flatMap(section => (section.meetings || []).map(m => meetingLocation(m, section, c))).join(" ");
      const barCategoryAliases = barCategories(c).flatMap(category => ({
        professional:["职业责任", "professional responsibility"],
        writing:["法律研究与写作", "法律研究、写作与分析", "法律研究", "法律写作", "legal research and writing", "legal research writing analysis"],
        american:["美国法体系", "美国法律体系", "american legal system", "american legal studies"],
        core:["nyle", "bar 考试科目", "ny bar tested subjects"]
      })[category] || []);
      const courseTerm = courseTermCode(c);
      const termAliases = courseTerm === "SP27" ? ["spring", "spring 2027", "2027 spring", "春季", "2027 春季"] : courseTerm === "FA26" ? ["fall", "fall 2026", "2026 fall", "秋季", "2026 秋季"] : [];
      const hay = [c.code, c.titleZh, c.titleEn, c.officialTitleEn, officialCourseDescription(c), c.officialSourceTerm, c.session, courseTerm, ...termAliases, ...(c.instructors || []), ...(c.categories || []), ...barCategoryAliases, locationText].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (termValues.size && !termValues.has(courseTerm)) return false;
      if (barValues.size && !barValues.has(nyBarFilterBucket(c))) return false;
      const isSu = /s\/u|satisfactory/i.test(String(c.grading || c.gradingZh));
      if (gradingValues.size && ![...gradingValues].some(value => value === "su" ? isSu : value === "graded" ? !isSu : true)) return false;
      const credits = Number(c.credits || 0);
      const creditMatches = value => value === "0-1" ? credits >= 0 && credits <= 1 : value === "5+" ? credits >= 5 : credits === Number(value);
      if (creditValues.size && ![...creditValues].some(creditMatches)) return false;
      const courseDays = new Set((c.sections || []).flatMap(section => (section.meetings || []).flatMap(meeting => parsePattern(meeting.pattern))));
      if (meetingDayValues.size && ![...meetingDayValues].some(day => courseDays.has(day))) return false;
      const topics = courseTopics(c);
      if (topicValues.size && ![...topicValues].some(topic => topics.includes(topic))) return false;
      if (llmValues.size && ![...llmValues].some(value => value === "specific" ? c.llmSpecific : value === "direct" ? c.eligibility === "open" : true)) return false;
      const formats = courseFormats(c);
      if (formatValues.size && ![...formatValues].some(format => formats.includes(format))) return false;
      return true;
    });
    const sort = els.sortSelect.value;
    list.sort((a,b) => {
      if (sort === "creditsAsc") return a.credits - b.credits;
      if (sort === "creditsDesc") return b.credits - a.credits;
      if (sort === "code") return a.code.localeCompare(b.code, undefined, { numeric: true });
      return recommendationScore(b) - recommendationScore(a);
    });
    return list;
  }

  function courseTopics(course) {
    const categoryText = (course.categories || []).join(" ").toLowerCase();
    const titleText = `${course.titleZh || ""} ${course.officialTitleEn || ""}`.toLowerCase();
    return COURSE_TOPICS.filter(topic => topic.categories.some(category => categoryText.includes(category.toLowerCase())) || topic.keywords.some(keyword => titleText.includes(keyword.toLowerCase()))).map(topic => topic.id);
  }

  function courseFormats(course) {
    const sections = course.sections || [];
    const structuredText = [
      ...(Array.isArray(course.courseFormats) ? course.courseFormats : []),
      course.courseFormat,
      course.component,
      course.componentLabel,
      ...sections.flatMap(section => [section.courseFormat, section.component, section.componentLabel])
    ].filter(Boolean).join(" ");
    const structuredMatches = COURSE_FORMATS.filter(format => format.patterns.some(pattern => pattern.test(structuredText))).map(format => format.id);
    if (structuredMatches.length) return [...new Set(structuredMatches)];
    const fallbackText = [course.officialTitleEn, course.titleEn, course.titleZh, ...sections.map(section => section.label)].filter(Boolean).join(" ");
    return [...new Set(COURSE_FORMATS.filter(format => format.patterns.some(pattern => pattern.test(fallbackText))).map(format => format.id))];
  }

  function pruneEmptyFilterOptions() {
    const availability = {
      termFilter: value => value === "all" || courses.some(course => courseTermCode(course) === value),
      barFilter: value => value === "all" || courses.some(course => nyBarFilterBucket(course) === value),
      gradingFilter: value => value === "all" || courses.some(course => value === "su" ? /s\/u|satisfactory/i.test(String(course.gradingZh || course.grading)) : !/s\/u|satisfactory/i.test(String(course.gradingZh || course.grading))),
      creditsFilter: value => value === "all" || courses.some(course => value === "0-1" ? Number(course.credits || 0) >= 0 && Number(course.credits || 0) <= 1 : value === "5+" ? Number(course.credits || 0) >= 5 : Number(course.credits || 0) === Number(value)),
      meetingDayFilter: value => value === "all" || courses.some(course => (course.sections || []).some(section => (section.meetings || []).some(meeting => parsePattern(meeting.pattern).includes(value)))),
      topicFilter: value => value === "all" || courses.some(course => courseTopics(course).includes(value)),
      llmFilter: value => value === "all" || courses.some(course => value === "specific" ? course.llmSpecific : course.eligibility === "open"),
      courseFormatFilter: value => value === "all" || courses.some(course => courseFormats(course).includes(value))
    };
    Object.entries(availability).forEach(([key, hasCourses]) => {
      const select = els[key];
      if (!select) return;
      [...select.options].forEach(option => {
        const available = hasCourses(option.value);
        option.hidden = !available;
        option.disabled = !available;
        if (!available) option.selected = false;
      });
    });
    refreshMultiSelectControls();
  }

  function renderMiniSchedulePanelState() {
    const collapsed = Boolean(state.miniScheduleCollapsed);
    els.miniSchedulePanel?.classList.toggle("is-collapsed", collapsed);
    els.courseContentGrid?.classList.toggle("course-rail-collapsed", collapsed);
    if (els.miniScheduleCollapseBtn) els.miniScheduleCollapseBtn.textContent = collapsed ? (isEnglish() ? "Show" : "展开") : (isEnglish() ? "Hide" : "收起");
  }

  function toggleMiniSchedulePanel() {
    state.miniScheduleCollapsed = !state.miniScheduleCollapsed;
    saveState();
    renderMiniSchedulePanelState();
  }

  function renderAll() {
    renderCourseList(); renderProgress(); renderMiniSchedule(); renderCareerControls(); renderRecommendations(); renderSchedule(); renderScheduleCourseTray(); renderSchoolManager(); renderFaq(); applyLanguageChrome();
  }

  function renderCourseList() {
    pruneEmptyFilterOptions();
    renderMiniSchedulePanelState();
    const list = getFilteredCourses();
    const fallCount = courses.filter(course => courseTermCode(course) === "FA26").length;
    const springCount = courses.filter(course => courseTermCode(course) === "SP27").length;
    const snapshotLabel = currentSchoolId === "cornell" ? (isEnglish() ? `${fallCount} Fall · ${springCount} Spring` : `${fallCount} 门秋季 · ${springCount} 门春季`) : (isEnglish() ? "locally imported courses" : "用户导入课程");
    els.courseCountText.textContent = isEnglish() ? `${list.length} of ${courses.length} courses · ${currentSchoolProfile.nameEn || currentSchoolProfile.nameZh} · ${snapshotLabel}` : `显示 ${list.length} / ${courses.length} 门课程 · ${currentSchoolProfile.shortZh || currentSchoolProfile.nameZh} · ${snapshotLabel}`;
    els.courseList.innerHTML = list.map(courseCardHtml).join("");
    els.courseList.querySelectorAll(".course-card").forEach(card => {
      card.addEventListener("click", e => { if (!e.target.closest("button, a")) openCourseDetail(card.dataset.courseId); });
      bindDraggableElement(card);
    });
    els.courseList.querySelectorAll(".add-course-btn").forEach(btn => btn.addEventListener("click", e => {
      e.stopPropagation(); toggleCourse(btn.dataset.courseId);
    }));
    els.courseList.querySelectorAll(".edit-course-btn").forEach(btn => btn.addEventListener("click", e => {
      e.stopPropagation(); openCourseEditor(btn.dataset.courseId);
    }));
  }

  function courseCardHtml(c) {
    const selected = Boolean(state.selected[c.id]);
    // Once the student has picked a section, every quick-glance field must
    // reflect that choice rather than the catalog's first listed section.
    // Otherwise a successful section switch looks as if it did nothing.
    const selectedSection = selected ? getSection(c, state.selected[c.id]) : null;
    const title = courseTitle(c);
    const description = courseDescription(c);
    const classNumber = selectedSection?.classNumber || c.sections?.[0]?.classNumber;
    const meetings = selectedSection ? formatSectionMeetings(selectedSection) : formatAllMeetingSummary(c);
    const instructors = selectedSection?.instructors?.length ? selectedSection.instructors : c.instructors;
    const location = selectedSection ? sectionLocationSummary(selectedSection, c) : courseLocationSummary(c);
    return `<article class="course-card ${selected ? "is-selected" : ""}" draggable="true" data-course-id="${esc(c.id)}">
      <div class="course-card-top">
        <div class="course-card-content">
          <div class="course-code">${esc(c.code)}${classNumber ? ` · ${isEnglish() ? "Class number" : "课程班号"} ${esc(classNumber)}` : ""}</div>
          <div class="course-title-row"><h3 class="course-title">${esc(title)}</h3>${badgesHtml(c)}</div>
          <div class="course-meta">
            <span>◷ ${esc(meetings)}</span><span>◫ ${creditCount(c.credits)}</span>
            <span>◎ ${instructorsHtml(instructors)}</span><span>▱ ${esc(formatGrading(c.grading || c.gradingZh))}</span>${c.registrationConsentZh || c.registrationConsentEn ? `<span>▣ ${esc(isEnglish() ? (c.registrationConsentEn || c.registrationConsentZh) : c.registrationConsentZh)}</span>` : ""}
          </div>
          <div class="course-location-line"><strong>${isEnglish() ? "Teaching location" : "授课地点"}</strong> · ${locationLinkHtml(location)}</div>
          <div class="course-assessment-line"><strong>${isEnglish() ? "Final assessment" : "最终考核"}</strong> · ${esc(assessmentSummary(c))}</div>
          ${cuReviewsCompactHtml(c)}
          <p class="course-summary">${esc(description)}</p>
        </div>
        <div class="course-actions">
          <span class="score-chip">${isEnglish() ? "Match" : "推荐度"} ${recommendationScore(c)}</span>
          <span class="drag-course-handle" aria-hidden="true">⋮⋮ ${isEnglish() ? "Drag to schedule" : "拖入课表"}</span>
          <button class="edit-course-btn secondary-button" data-course-id="${esc(c.id)}">${isEnglish() ? "Edit" : "编辑"}</button>
          <button class="add-course-btn ${selected ? "remove" : ""}" data-course-id="${esc(c.id)}">${selected ? (isEnglish() ? "Remove" : "移除") : (isEnglish() ? "Add to schedule" : "加入课表")}</button>
        </div>
      </div>
    </article>`;
  }

  function cuReviewsCourseUrl(c) {
    if (currentSchoolId !== "cornell") return "";
    const match = String(c.code || "").match(/^([A-Za-z]+)\s*(\d+)/);
    if (!match) return "";
    return `https://www.cureviews.org/course/${encodeURIComponent(match[1].toUpperCase())}/${encodeURIComponent(match[2])}`;
  }

  function cuReviewsRecord(c) {
    return cureviewsRecords[String(c.code || "").toUpperCase()] || null;
  }

  function formatCuReviewsRating(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number.toFixed(1).replace(/\.0$/, "") : "";
  }

  function cuReviewsCompactHtml(c) {
    const url = cuReviewsCourseUrl(c);
    if (!url) return "";
    const record = cuReviewsRecord(c);
    const rating = formatCuReviewsRating(record?.rating);
    const label = rating
      ? (isEnglish() ? `CU Reviews rating ${rating}/5` : `CU Reviews 评分 ${rating}/5`)
      : (isEnglish() ? "View CU Reviews" : "查看 CU Reviews 课程评价");
    return `<div class="course-review-line"><strong>CU Reviews</strong> · <a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)} ↗</a></div>`;
  }

  function badgesHtml(c, sectionId = undefined) {
    const out = [];
    if (currentSchoolId === "cornell") out.push(`<span class="badge badge-term badge-term-${courseTermCode(c).toLowerCase()}" title="${isEnglish() ? "Course term" : "开课学期"}">${esc(courseTermLabel(c))}</span>`);
    const bucket = nyBarFilterBucket(c, sectionId);
    out.push(`<button type="button" class="badge badge-clickable badge-${bucket === "core" ? "core" : `bar-${bucket}`}" data-badge-filter="${bucket}" title="${isEnglish() ? "Filter: " : "点击筛选："}${barStatusLabel(bucket)}">${barStatusLabel(bucket)}</button>`);
    const categories = barCategories(c);
    categories.filter(category => category !== "core").forEach(category => out.push(`<span class="badge badge-mandatory" title="${isEnglish() ? "Official NY Bar category; credits are assigned once in progress." : "官方 NY Bar 分类；学分进度只会分配一次，避免重复计算。"}">${barPrimaryLabel(category)}</span>`));
    if (categories.length > 1) {
      const assigned = assignedBarCategory(c);
      out.push(`<span class="badge badge-allocation" title="${isEnglish() ? "This course is listed in more than one official category. Change its one-time allocation in Credit Progress." : "本课同时属于多个官方类别；可在学分进度中调整唯一归类。"}">${isEnglish() ? "Credits allocated to: " : "学分当前计入："}${esc(barCategoryShortLabel(assigned))}</span>`);
    }
    const enrollment = c.eligibility || "open";
    out.push(`<span class="badge badge-enrollment badge-enrollment-${esc(enrollment)}" title="${isEnglish() ? "Enrollment: " : "选课权限："}${esc(enrollmentLabel(enrollment))}">${esc(enrollmentLabel(enrollment))}</span>`);
    if (String(c.grading).toLowerCase().includes("s/u") || String(c.grading).toLowerCase().includes("satisfactory")) out.push(`<span class="badge badge-su">S/U</span>`);
    if (c.degreeRequired && c.code !== "LAW 6091") out.push(`<span class="badge badge-writing">${isEnglish() ? "Degree writing" : "学位写作"}</span>`);
    if (c.llmSpecific) out.push(`<span class="badge badge-muted">${isEnglish() ? "LL.M. specific" : "LL.M. 专设"}</span>`);
    if (c.catalogOnly) out.push(`<span class="badge badge-muted" title="${isEnglish() ? "Official record without a published meeting time" : "官方记录尚未公布可排课的具体时间"}">${isEnglish() ? "Time pending" : "时间待公布"}</span>`);
    return out.join("");
  }

  function toggleCourse(courseId, sectionId = null) {
    const course = courses.find(x => x.id === courseId); if (!course) return;
    if (state.selected[courseId]) {
      if ((currentSchoolProfile.autoEnrollCodes || []).includes(course.code)) return showToast(`${course.code} 为自动注册课程，已保留在规划中。`, true);
      delete state.selected[courseId];
      showToast(`已移除 ${course.code}`);
      saveState(); renderAll();
      return;
    }
    beginAddCourse(courseId, sectionId, "button");
  }

  function beginAddCourse(courseId, sectionId = null, origin = "drag", placement = null) {
    const course = courses.find(x => x.id === courseId); if (!course) return;
    if (state.selected[courseId]) {
      if (placement) setManualPlacement(courseId, placement);
      else showToast(`${course.code} 已在课表中。`);
      return;
    }
    const sections = course.sections || [];
    if (!sections.length) {
      showToast(isEnglish() ? `${course.code} is in the ${courseTermLabel(course)} catalog, but no schedulable section time is currently published.` : `${course.code} 已收录于${courseTermLabel(course)}课程库，但当前未公布可排入课表的班次时间。`, true);
      openCourseDetail(course.id);
      return;
    }
    if (!sectionId && sections.length > 1) {
      openSectionPicker(course, origin, placement);
      return;
    }
    attemptAddCourse(course, sectionId || sectionSelectionId(defaultSectionSelection(course)), origin, Boolean(placement), placement);
  }

  function attemptAddCourse(course, sectionId, origin = "drag", force = false, placement = null) {
    const conflicts = findConflicts(course, sectionId);
    if (conflicts.length && !force) {
      pendingAddRequest = { courseId:course.id, sectionId, origin, conflicts:conflicts.map(c => c.id), placement };
      openConflictDialog(course, sectionId, conflicts);
      return false;
    }
    state.selected[course.id] = sectionId;
    // A new official section must control the schedule again. A prior manual
    // drag placement belongs to the old section and would otherwise mask it.
    if (origin === "switch") delete state.manualPlacements?.[course.id];
    saveState();
    renderAll();
    if (placement) setManualPlacement(course.id, placement, true);
    else if (origin === "switch") showToast(isEnglish() ? `${course.code} section updated in your schedule.` : `${course.code} 已切换班次，课表已更新。`);
    else showToast(origin === "drag" ? `已按官方时间排入 ${course.code}` : `已加入 ${course.code}`);
    return true;
  }

  function bindDraggableElement(element) {
    if (!element || element.dataset.dragBound === "true") return;
    element.dataset.dragBound = "true";
    // Use one pointer-driven drag path on every desktop browser. Native HTML
    // drag loses its payload when the app switches from the course list to the
    // schedule, which was the reason drops could appear to do nothing.
    // Native drag is retained as a fallback for embedded browsers which do
    // not emit Pointer Events from a horizontally scrolling course tray.
    element.draggable = true;
    element.classList.add("course-draggable");

    // Pointer drag works for mouse, touch and pen, including across the sidebar.
    element.addEventListener("pointerdown", event => startPointerDrag(element, event, "pointer"));
    element.addEventListener("mousedown", event => startPointerDrag(element, event, "mouse"));
    element.addEventListener("dragstart", event => {
      const id = element.dataset.courseId;
      if (!id) return event.preventDefault();
      activeDraggedCourseId = id;
      element.classList.add("native-drag-active");
      event.dataTransfer?.setData("text/course-id", id);
      event.dataTransfer?.setData("text/plain", id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
    });
    element.addEventListener("dragend", () => {
      element.classList.remove("native-drag-active");
      activeDraggedCourseId = null;
      clearAllDropHighlights();
    });
    element.addEventListener("click", event => {
      if (element.dataset.justDragged === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function startPointerDrag(element, event, input = "pointer") {
    if (event.button !== 0 || event.target.closest("button, a, input, select, textarea")) return;
    // A normal desktop click fires pointerdown followed by mousedown. The
    // latter must not replace the pointer session; it is only a fallback for
    // hosts that never surface pointer events for tray drags.
    if (input === "mouse" && pointerDragState?.element === element && pointerDragState.input === "pointer") return;
    pointerDragState = {
      element, courseId:element.dataset.courseId, pointerId:event.pointerId,
      input, startX:event.clientX, startY:event.clientY, dragging:false, ghost:null, lastTarget:null
    };
  }

  function dragEventMatches(event) {
    const drag = pointerDragState;
    if (!drag) return false;
    return drag.input === "mouse" ? /^mouse/.test(event.type) : drag.pointerId === event.pointerId;
  }

  function handlePointerDragMove(event) {
    const drag = pointerDragState;
    if (!drag || !dragEventMatches(event)) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance < 7) return;
    if (!drag.dragging) {
      drag.dragging = true;
      activeDraggedCourseId = drag.courseId;
      drag.ghost = document.createElement("div");
      drag.ghost.className = "course-drag-ghost";
      const course = courses.find(item => item.id === drag.courseId);
      drag.ghost.innerHTML = `<strong>${esc(course?.code || "课程")}</strong><span>${esc(course?.titleZh || "拖入课表")}</span>`;
      document.body.appendChild(drag.ghost);
      drag.element?.classList.add("is-dragging");
      document.body.classList.add("is-course-dragging");
    }
    event.preventDefault();
    positionPointerGhost(drag.ghost, event.clientX, event.clientY);
    updatePointerDropTarget(event.clientX, event.clientY);
  }

  function finishPointerDrag(event) {
    const drag = pointerDragState;
    if (!drag || !dragEventMatches(event)) return;
    const wasDragging = drag.dragging;
    // Keep the last verified target as well. A few desktop webviews report an
    // empty elementFromPoint during pointerup after a horizontal tray scroll.
    const target = wasDragging ? (drag.lastTarget || document.elementFromPoint(event.clientX, event.clientY)) : null;
    const courseId = drag.courseId;
    cleanupPointerDrag();
    if (!wasDragging) return;
    drag.element.dataset.justDragged = "true";
    setTimeout(() => { if (drag.element) delete drag.element.dataset.justDragged; }, 0);
    event.preventDefault();
    event.stopPropagation();
    performCourseDrop(target, courseId, { x:event.clientX, y:event.clientY });
  }

  function handleMouseDragMove(event) { handlePointerDragMove(event); }
  function finishMouseDrag(event) { finishPointerDrag(event); }

  function performCourseDrop(target, courseId, point = null) {
    if (!courseId) return false;
    const scheduleNav = target?.closest?.('[data-view="schedule"]');
    const scheduleArea = target?.closest?.("#scheduleDropShell, #miniSchedule, #view-schedule");
    if (scheduleNav || scheduleArea) {
      const placement = point ? placementFromPoint(target, point.x, point.y) : null;
      beginAddCourse(courseId, null, "drag", placement);
      if (scheduleNav) switchView("schedule");
      return true;
    }
    showToast("请把课程放到“我的课表”、右侧已选课程区或周课表中");
    return false;
  }

  function positionPointerGhost(ghost, x, y) {
    if (!ghost) return;
    ghost.style.left = `${x + 14}px`;
    ghost.style.top = `${y + 14}px`;
  }

  function updatePointerDropTarget(x, y) {
    const target = document.elementFromPoint(x, y);
    if (pointerDragState?.dragging && target) pointerDragState.lastTarget = target;
    const schedule = target?.closest?.("#scheduleDropShell, #view-schedule");
    const mini = target?.closest?.("#miniSchedule");
    const scheduleNav = target?.closest?.('[data-view="schedule"]');
    els.scheduleDropShell?.classList.toggle("is-drag-over", Boolean(schedule));
    els.miniSchedule?.classList.toggle("is-over", Boolean(mini));
    els.scheduleNavDropTarget?.classList.toggle("is-drop-target", Boolean(scheduleNav));
    if (scheduleNav && currentView !== "schedule") switchView("schedule");
    document.querySelectorAll(".schedule-day-column").forEach(column => column.classList.toggle("is-drop-target", Boolean(schedule && target.closest?.(".schedule-day-column") === column)));
  }

  function clearAllDropHighlights() {
    els.scheduleDropShell?.classList.remove("is-drag-over");
    els.miniSchedule?.classList.remove("is-over");
    els.scheduleNavDropTarget?.classList.remove("is-drop-target");
    document.querySelectorAll(".schedule-day-column").forEach(column => column.classList.remove("is-drop-target"));
  }

  function cleanupPointerDrag() {
    const drag = pointerDragState;
    if (drag?.ghost) drag.ghost.remove();
    drag?.element?.classList.remove("is-dragging");
    document.body.classList.remove("is-course-dragging");
    clearAllDropHighlights();
    activeDraggedCourseId = null;
    pointerDragState = null;
  }

  function openSectionPicker(course, origin = "drag", placement = null) {
    pendingAddRequest = { courseId:course.id, sectionId:null, origin, conflicts:[], placement };
    els.sectionPickerCourseTitle.textContent = `${course.code} · ${courseTitle(course)}`;
    const groups = sectionSelectionGroups(course);
    els.sectionPickerOptions.innerHTML = `${groups.map(group => `<fieldset class="section-selection-group"><legend>${esc(formatSectionGroupLabel(group.label))}</legend>${group.sections.map((section, index) => `<label class="section-picker-option"><input type="radio" name="picker-${esc(group.id)}" data-section-group="${esc(group.id)}" value="${esc(section.id)}" ${index === 0 ? "checked" : ""}><span><strong>${sectionIdentityHtml(section)}</strong><small>${esc(formatSectionMeetings(section))} · ⌖ ${esc(sectionLocationSummary(section, course))}</small></span></label>`).join("")}</fieldset>`).join("")}<button type="button" class="primary-button section-picker-confirm">${isEnglish() ? "Confirm section combination" : "确认班次组合"}</button>`;
    els.sectionPickerOptions.querySelector(".section-picker-confirm")?.addEventListener("click", () => {
      const chosen = [...els.sectionPickerOptions.querySelectorAll("input[data-section-group]:checked")].map(input => input.value);
      if (chosen.length !== groups.filter(group => group.required).length) return showToast(isEnglish() ? "Choose one option for every required group." : "请为每个必选班次组选择一项。", true);
      const request = pendingAddRequest;
      closeSectionPicker(false);
      if (request) attemptAddCourse(course, sectionSelectionId(chosen), request.origin, Boolean(request.placement), request.placement);
    });
    els.sectionPickerOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeSectionPicker(clear = true) {
    if (els.sectionPickerOverlay) els.sectionPickerOverlay.hidden = true;
    document.body.style.overflow = "";
    if (clear) pendingAddRequest = null;
  }

  function openConflictDialog(course, sectionId, conflicts) {
    const section = getSection(course, sectionId);
    const hasCalendarConflict = conflicts.some(item => item.importedCalendar);
    els.conflictMessage.textContent = isEnglish()
      ? `${course.code} overlaps with ${hasCalendarConflict ? "an imported personal event or selected course" : "a selected course"}. Choose another section or course if possible.`
      : `${course.code} 与${hasCalendarConflict ? "导入的个人日程或已选课程" : "已选课程"}存在时间重叠。建议取消，并改选其他班次或课程。`;
    els.conflictDetails.innerHTML = conflicts.map(existing => {
      if (existing.importedCalendar) return `<div class="conflict-detail-row"><strong>${esc(course.code)} ${esc(formatSectionMeetings(section))}</strong><br>${isEnglish() ? "Conflicts with imported event" : "冲突于导入日程"} <strong>${esc(existing.title)} · ${esc(existing.date)} ${esc(existing.start)}–${esc(existing.end)}</strong></div>`;
      const existingSection = getSection(existing, state.selected[existing.id]);
      return `<div class="conflict-detail-row"><strong>${esc(course.code)} ${esc(formatSectionMeetings(section))}</strong><br>${isEnglish() ? "Conflicts with" : "冲突于"} <strong>${esc(existing.code)} ${esc(formatSectionMeetings(existingSection))}</strong></div>`;
    }).join("");
    els.conflictOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeConflictDialog() {
    if (els.conflictOverlay) els.conflictOverlay.hidden = true;
    document.body.style.overflow = "";
    pendingAddRequest = null;
  }

  function forcePendingAdd() {
    const request = pendingAddRequest;
    if (!request) return closeConflictDialog();
    const course = courses.find(c => c.id === request.courseId);
    els.conflictOverlay.hidden = true;
    document.body.style.overflow = "";
    pendingAddRequest = null;
    if (course) {
      const changed = attemptAddCourse(course, request.sectionId, request.origin, true, request.placement || null);
      if (changed && request.origin === "switch") closeDrawer();
    }
  }

  function findConflicts(course, sectionId) {
    const newSection = getSection(course, sectionId);
    if (!newSection) return [];
    const selectedConflicts = selectedCourses().filter(existing => existing.id !== course.id).filter(existing => {
      const sec = getSection(existing, state.selected[existing.id]);
      return sectionsConflict(newSection, sec);
    });
    const calendarConflicts = importedCalendarConflicts(course, newSection).map(event => ({ ...event, importedCalendar:true }));
    return [...selectedConflicts, ...calendarConflicts];
  }

  function importedCalendarEvents() {
    return Array.isArray(state?.calendarEvents) ? state.calendarEvents : [];
  }

  function calendarEventsForDate(date) {
    const iso = typeof date === "string" ? date : toIsoDate(date);
    return importedCalendarEvents().filter(event => event.date === iso && event.start && event.end);
  }

  function calendarPseudoCourse(event) {
    return { id:`calendar-${event.id}`, code:isEnglish() ? "CAL" : "日程", titleZh:event.title, titleEn:event.title, officialTitleEn:event.title, importedCalendar:true };
  }

  function calendarPseudoSection(event) {
    return { id:`calendar-section-${event.id}`, instructors:[], location:event.location || "", meetings:[{ pattern:"", start:event.start, end:event.end, startDate:event.date, endDate:event.date, location:event.location || "", importedCalendar:true }] };
  }

  function importedCalendarConflicts(course, section, dates = null) {
    const events = dates ? dates.flatMap(date => calendarEventsForDate(date)) : importedCalendarEvents();
    return events.filter(event => {
      const date = parseIsoDate(event.date);
      const meetings = getScheduleMeetingsForDate(course, section, date);
      return meetings.some(meeting => timeToMinutes(meeting.start) < timeToMinutes(event.end) && timeToMinutes(event.start) < timeToMinutes(meeting.end));
    });
  }

  function sectionsConflict(a, b) {
    if (!a || !b) return false;
    for (const ma of a.meetings || []) for (const mb of b.meetings || []) {
      const daysA = parsePattern(ma.pattern), daysB = parsePattern(mb.pattern);
      if (!daysA.some(d => daysB.includes(d))) continue;
      if (!meetingDateRangesOverlap(ma, mb)) continue;
      if (timeToMinutes(ma.start) < timeToMinutes(mb.end) && timeToMinutes(mb.start) < timeToMinutes(ma.end)) return true;
    }
    return false;
  }

  function selectedCourses() { return Object.keys(state.selected).map(id => courses.find(c => c.id === id)).filter(Boolean); }
  function sectionSelectionGroups(course) {
    const sections = course?.sections || [];
    const explicit = sections.some(section => section.selectionGroup);
    if (explicit) {
      return [...new Map(sections.map(section => [section.selectionGroup || "main", { id:section.selectionGroup || "main", label:section.selectionGroupLabel || section.selectionGroup || "Section", required:section.selectionRequired !== false, max:Number(section.selectionMax || 1), sections:sections.filter(item => (item.selectionGroup || "main") === (section.selectionGroup || "main")) }])).values()];
    }
    const lectures = sections.filter(section => /(?:lecture|讲授课)/i.test(section.label || ""));
    const discussions = sections.filter(section => /(?:discussion|讨论课)/i.test(section.label || ""));
    if (lectures.length && discussions.length) return [
      { id:"lecture", label:isEnglish() ? "Required lecture (choose one)" : "讲授课（必选一节）", required:true, max:1, sections:lectures },
      { id:"discussion", label:isEnglish() ? "Required discussion (choose one)" : "讨论课（必选一节）", required:true, max:1, sections:discussions }
    ];
    return [{ id:"main", label:isEnglish() ? "Choose one section" : "选择一个班次", required:true, max:1, sections }];
  }

  function defaultSectionSelection(course, requested = null) {
    if (requested) return String(requested).split("|").filter(Boolean);
    return sectionSelectionGroups(course).flatMap(group => group.sections[0] ? [group.sections[0].id] : []);
  }

  function sectionSelectionId(ids) { return [...new Set(ids || [])].filter(Boolean).sort().join("|"); }

  function getSection(c, sid) {
    const selectedIds = String(sid || "").split("|").filter(Boolean);
    if (selectedIds.length > 1) {
      const parts = selectedIds.map(id => c.sections?.find(s => s.id === id)).filter(Boolean);
      if (parts.length) return { id:sectionSelectionId(parts.map(part => part.id)), label:parts.map(part => formatSectionLabel(part.label || part.id)).join(" + "), classNumber:parts.map(part => part.classNumber).filter(Boolean).join(" / "), meetings:parts.flatMap(part => part.meetings || []), sourceSections:parts, location:"", locationStatus:parts.some(part => sectionHasPublishedLocation(part)) ? "published" : "unpublished" };
    }
    return c.sections?.find(s => s.id === selectedIds[0]) || c.sections?.[0] || null;
  }

  function calculateCornellAcademicYearProgress(selected) {
    const registrationCredits = { FA26:0, SP27:0 };
    selected.forEach(course => {
      const term = courseTermCode(course);
      if (term in registrationCredits) registrationCredits[term] += Number(course.credits || 0);
    });
    const eligibleCourses = selected.filter(course => barStatus(course, state.selected[course.id]) === "eligible");
    const categoryTotals = Object.fromEntries(NY_BAR_ALLOCATION.VALID_CATEGORIES.map(category => [category, 0]));
    eligibleCourses.forEach(course => {
      const category = assignedBarCategory(course);
      if (category) categoryTotals[category] += Number(course.credits || 0);
    });
    return {
      registrationCredits,
      eligibleCredits:eligibleCourses.reduce((sum, course) => sum + Number(course.credits || 0), 0),
      categoryTotals
    };
  }

  function renderProgress() {
    const selected = selectedCourses();
    const selectedCredits = selected.reduce((sum, course) => sum + Number(course.credits || 0), 0);
    if (currentSchoolId === "cornell") {
      const annual = calculateCornellAcademicYearProgress(selected);
      const categoryCredits = type => annual.categoryTotals[type] || 0;
      const barItems = [
        [isEnglish() ? "Professional Responsibility" : "职业责任", categoryCredits("professional"), 2],
        [isEnglish() ? "Legal Research & Writing" : "法律研究与写作", categoryCredits("writing"), 2],
        [isEnglish() ? "American legal system" : "美国法体系", categoryCredits("american"), 2],
        [isEnglish() ? "NYLE / Bar tested subjects" : "NYLE / Bar 考试科目", categoryCredits("core"), 6]
      ];
      els.creditProgress.innerHTML = `<p class="progress-term-context"><strong>${isEnglish() ? "2026–27 academic-year record" : "2026–27 秋春学年个人记录"}</strong><span>${isEnglish() ? "The catalog term filter never removes another term's selections or progress." : "课程库学期筛选不会移除另一学期的选课或进度。"}</span></p>${rangeProgressHtml(isEnglish() ? "Fall 2026 LL.M. registration (10–15)" : "2026 秋季 LL.M. 注册学分（10–15）", annual.registrationCredits.FA26, 10, 15)}${rangeProgressHtml(isEnglish() ? "Spring 2027 LL.M. registration (10–15)" : "2027 春季 LL.M. 注册学分（10–15）", annual.registrationCredits.SP27, 10, 15)}${progressHtml(isEnglish() ? "2026–27 NY Bar qualifying classroom credits" : "2026–27 学年 NY Bar 课堂课程学分", annual.eligibleCredits, 24)}<p class="progress-policy-note">${isEnglish() ? "NY Bar credits and categories aggregate all selected Fall and Spring offerings. Section eligibility is still checked from the section you selected: in-person Cornell Law lecture, seminar, or discussion sections count unless an official restriction excludes them. Online and independent-study sections do not count; clinics, practica, and restricted sections require confirmation." : "NY Bar 课堂学分及分类统一累计全部秋季与春季已选课程。班次资格仍按你所选班次判断：康奈尔法学院线下讲授、研讨或讨论班次会计入，除非官方明确排除；线上和独立研究不计入，诊所、实践课及项目限制班次须确认。"}</p><div class="progress-subheading">${isEnglish() ? "NY Bar required categories · full academic year" : "NY Bar 分类要求 · 秋春学年累计"}</div>${barItems.map(([label, value, target]) => progressHtml(label, value, target)).join("")}${barAllocationControlsHtml(selected)}<p class="progress-policy-note">${isEnglish() ? "Where Cornell lists a course in more than one category, the planner counts it once in the category selected above. Confirm your final allocation with Cornell Law and BOLE." : "若 Cornell 将同一课程列入多个类别，工具仅按上方所选归类计入一次；最终学分分配请向 Cornell Law 和 BOLE 确认。"}</p><p class="progress-policy-note">${isEnglish() ? "Cornell states that LL.M. students register for 10–15 credits in each semester unless the Dean of Students approves otherwise. The two semester bars are separate; they are not added against one 10–15 threshold. This planner does not determine immigration status." : "Cornell 公布的 LL.M. 每学期注册范围为 10–15 学分；秋季与春季分别判断，不会把两学期相加后套用一次 10–15 学分门槛。超出范围需向 Dean of Students 申请。本工具不判断个人移民／签证身份。"}</p>`;
      bindBarAllocationControls();
      return;
    }
    const importedBarCredits = selected.filter(c => barStatus(c, state.selected[c.id]) === "eligible").reduce((sum, course) => sum + Number(course.credits || 0), 0);
    els.creditProgress.innerHTML = `<div class="progress-item"><div class="progress-label-row"><span class="progress-label">${isEnglish() ? "Selected-course credits" : "已选课程学分"}</span><span class="progress-value">${selectedCredits}</span></div><div class="progress-remaining">${isEnglish() ? "Degree and bar rules vary by school; verify them with your school's official LL.M. guidance." : "学位与 Bar 要求因学校而异，请以本校 LLM 官方指引为准。"}</div></div>${importedBarCredits ? progressHtml(isEnglish() ? "Imported NY Bar classroom credits" : "导入标注的 NY Bar 课堂学分", importedBarCredits, 24) : ""}`;
  }

  function barAllocationControlsHtml(selected) {
    const multiCategoryCourses = selected.filter(course => barCategories(course).length > 1 && barStatus(course, state.selected[course.id]) === "eligible");
    if (!multiCategoryCourses.length) return "";
    return `<section class="bar-allocation-panel" aria-label="${isEnglish() ? "Multi-category NY Bar credit allocation" : "NY Bar 多分类课程学分归类"}">
      <strong>${isEnglish() ? "Choose one category for each multi-category course" : "多分类课程：选择唯一计入栏"}</strong>
      <p>${isEnglish() ? "Changing this selection moves the course credits between category bars. It never changes the 24-credit classroom total or counts the course twice." : "切换后，课程学分会在分类进度条之间移动；不影响 24 个课堂学分总数，也不会重复计算。"}</p>
      ${multiCategoryCourses.map(course => {
        const assigned = assignedBarCategory(course);
        const options = barCategories(course).map(category => `<option value="${category}" ${category === assigned ? "selected" : ""}>${esc(barCategoryShortLabel(category))}</option>`).join("");
        return `<label class="bar-allocation-row"><span><b>${esc(course.code)}</b><small>${creditCount(course.credits)}</small></span><select data-bar-allocation-course="${esc(course.id)}" aria-label="${esc(`${course.code} ${isEnglish() ? "credit category" : "学分归类"}`)}">${options}</select></label>`;
      }).join("")}
    </section>`;
  }

  function bindBarAllocationControls() {
    els.creditProgress.querySelectorAll("select[data-bar-allocation-course]").forEach(select => select.addEventListener("change", event => {
      const course = courses.find(item => item.id === event.currentTarget.dataset.barAllocationCourse);
      const category = event.currentTarget.value;
      if (!course || !barCategories(course).includes(category)) return;
      state.barCategoryAllocations ||= {};
      // A value chosen by the student is explicit even when it equals the
      // catalog's primary category. Deleting it would re-run the smart default
      // and could immediately move LAW 6641 back to another unmet category.
      state.barCategoryAllocations[course.id] = category;
      saveState();
      refreshBarAllocationSurfaces(course);
      showToast(isEnglish() ? `${course.code}: credits allocated once to ${barCategoryShortLabel(category)}.` : `${course.code} 的学分已改为仅计入“${barCategoryShortLabel(category)}”。`);
    }));
  }

  function refreshBarAllocationSurfaces(course) {
    renderProgress();
    renderCourseList();
    renderMiniSchedule();
    renderRecommendations();
    renderSchedule();
    renderScheduleCourseTray();
    if (currentDetailCourseId === course.id && !els.detailOverlay.hidden) renderDetail(course);
  }

  function rangeProgressHtml(label, value, minimum, maximum) {
    const capped = Math.min(100, (value / maximum) * 100);
    const belowMinimum = value < minimum;
    const overMaximum = value > maximum;
    const status = belowMinimum ? (isEnglish() ? `${creditCount(minimum - value)} below the published minimum` : `距公布下限还差 ${minimum - value} 学分`) : (isEnglish() ? "Within the published 10–15 credit range" : "处于公布的 10–15 学分范围内");
    const threshold = Math.min(100, Math.max(0, (minimum / maximum) * 100));
    const limitAlert = overMaximum ? `<div class="progress-limit-alert" role="status"><span aria-hidden="true">⚠</span><strong>${isEnglish() ? `Over the ${maximum}-credit limit by ${value - maximum}` : `超过上限 ${value - maximum} 学分`}</strong><small>${isEnglish() ? "Approval required" : "需申请批准"}</small></div>` : "";
    const stateClass = overMaximum ? "is-over-limit" : belowMinimum ? "is-below-minimum" : "is-in-range";
    return `<div class="progress-item progress-item-range ${stateClass}"><div class="progress-label-row"><span class="progress-label">${esc(label)}</span><span class="progress-value">${value} / ${minimum}–${maximum}</span></div>${limitAlert}<div class="progress-track progress-track-range"><div class="progress-fill ${value >= minimum && value <= maximum ? "is-done" : ""} ${overMaximum ? "is-over-limit" : ""}" style="width:${capped}%"></div><i class="progress-min-marker" style="left:${threshold}%" aria-label="${minimum} ${isEnglish() ? "credit minimum" : "学分下限"}"></i></div>${overMaximum ? "" : `<div class="progress-remaining">${esc(status)}</div>`}</div>`;
  }

  function progressHtml(label, value, target) {
    const capped = Math.min(100, (value / target) * 100);
    const remaining = Math.max(0, target - value);
    return `<div class="progress-item">
      <div class="progress-label-row"><span class="progress-label">${esc(label)}</span><span class="progress-value">${value} / ${target}</span></div>
      <div class="progress-track"><div class="progress-fill ${remaining === 0 ? "is-done" : ""}" style="width:${capped}%"></div></div>
      <div class="progress-remaining">${remaining === 0 ? (isEnglish() ? "Complete" : "已满足") : (isEnglish() ? `${creditCount(remaining)} remaining` : `还差 ${remaining} 学分`)}</div>
    </div>`;
  }

  function setupDropzone(zone) {
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("is-over"); e.dataTransfer.dropEffect = "copy"; });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
    zone.addEventListener("drop", e => {
      e.preventDefault(); zone.classList.remove("is-over");
      const id = e.dataTransfer.getData("text/course-id") || e.dataTransfer.getData("text/plain") || activeDraggedCourseId; if (id) beginAddCourse(id, null, "drag");
    });
  }

  function setupScheduleNavDropzone() {
    const nav = els.scheduleNavDropTarget;
    if (!nav) return;
    const acceptsCourse = event => activeDraggedCourseId || Array.from(event.dataTransfer?.types || []).some(type => type === "text/course-id" || type === "text/plain");
    nav.addEventListener("dragenter", event => {
      if (!acceptsCourse(event)) return;
      event.preventDefault();
      nav.classList.add("is-drop-target");
      // Keep the native drag alive while moving from the sidebar target into a
      // specific day/time cell. The course is not added merely by entering.
      if (currentView !== "schedule") switchView("schedule");
    });
    nav.addEventListener("dragover", event => {
      if (!acceptsCourse(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      nav.classList.add("is-drop-target");
    });
    nav.addEventListener("dragleave", event => {
      if (!nav.contains(event.relatedTarget)) nav.classList.remove("is-drop-target");
    });
    nav.addEventListener("drop", event => {
      event.preventDefault();
      event.stopPropagation();
      nav.classList.remove("is-drop-target");
      const courseId = event.dataTransfer.getData("text/course-id") || event.dataTransfer.getData("text/plain") || activeDraggedCourseId;
      if (!courseId) return;
      switchView("schedule");
      beginAddCourse(courseId, null, "drag");
    });
  }

  function resetCourseFilters() {
    if (els.searchInput) els.searchInput.value = "";
    for (const select of [els.termFilter, els.barFilter, els.gradingFilter, els.creditsFilter, els.meetingDayFilter, els.topicFilter, els.llmFilter, els.courseFormatFilter]) setFilterValues(select, []);
    if (els.sortSelect) els.sortSelect.value = "recommended";
    renderSchoolIdentity(); renderProgress(); renderMiniSchedule(); renderRecommendations();
    renderCourseList();
    els.searchInput?.focus();
  }

  function renderMiniSchedule() {
    const selected = selectedCourses();
    els.miniSchedulePanel?.classList.toggle("is-empty", !selected.length);
    if (!selected.length) els.miniSchedule.innerHTML = `<div class="drop-hint">${isEnglish() ? "Drag a course here to add it to your schedule" : "将课程拖到此处加入课表"}</div>`;
    else els.miniSchedule.innerHTML = selected.map((c,i) => {
      const sec = getSection(c, state.selected[c.id]); const color = palette[i % palette.length][1];
      return `<div class="mini-course-item" style="--item-color:${color}" data-course-id="${esc(c.id)}"><strong>${esc(c.code)} · ${esc(courseTitle(c))}</strong><span>${currentSchoolId === "cornell" ? `${esc(courseTermLabel(c))} · ` : ""}${esc(formatSectionMeetings(sec))}</span><small>⌖ ${esc(sectionLocationSummary(sec, c))}</small></div>`;
    }).join("");
    els.miniSchedule.querySelectorAll(".mini-course-item").forEach(x => x.addEventListener("click", () => openCourseDetail(x.dataset.courseId)));
    const fallSelected = selected.filter(course => courseTermCode(course) === "FA26");
    const springSelected = selected.filter(course => courseTermCode(course) === "SP27");
    const creditsFor = list => list.reduce((sum, course) => sum + Number(course.credits || 0), 0);
    const eligible = selected.filter(c => barStatus(c, state.selected[c.id]) === "eligible").reduce((s,c) => s + Number(c.credits || 0), 0);
    els.selectedSummary.innerHTML = `<div class="summary-row"><span>${isEnglish() ? "Selected offerings" : "已选课程"}</span><strong>${courseCount(selected.length)}</strong></div>${currentSchoolId === "cornell" ? `<div class="summary-row"><span>${isEnglish() ? "Fall 2026 credits" : "2026 秋季学分"}</span><strong>${creditsFor(fallSelected)}</strong></div><div class="summary-row"><span>${isEnglish() ? "Spring 2027 credits" : "2027 春季学分"}</span><strong>${creditsFor(springSelected)}</strong></div>` : `<div class="summary-row"><span>${isEnglish() ? "Total credits" : "总学分"}</span><strong>${creditsFor(selected)}</strong></div>`}<div class="summary-row"><span>${currentSchoolId === "cornell" ? (isEnglish() ? "2026–27 NY Bar credits" : "2026–27 学年 NY Bar 学分") : (isEnglish() ? "NY Bar credits" : "NY Bar 学分")}</span><strong>${eligible}</strong></div>`;
  }

  function renderCareerControls() {
    if (!els.careerDirectionChips) return;
    state.recommendationProfile ||= { directions:[], preferences:[] };
    const directionSet = new Set(state.recommendationProfile.directions || []);
    const preferenceSet = new Set(state.recommendationProfile.preferences || []);
    els.careerDirectionChips.innerHTML = CAREER_DIRECTIONS.map(item => `<button type="button" class="career-chip ${directionSet.has(item.id) ? "is-active" : ""}" data-career-id="${item.id}">${esc(localizedLabel(item))}</button>`).join("");
    els.coursePreferenceChips.innerHTML = COURSE_PREFERENCES.map(item => `<button type="button" class="career-chip ${preferenceSet.has(item.id) ? "is-active" : ""}" data-preference-id="${item.id}">${esc(localizedLabel(item))}</button>`).join("");
    els.careerDirectionChips.querySelectorAll("[data-career-id]").forEach(button => button.addEventListener("click", () => toggleProfileValue("directions", button.dataset.careerId)));
    els.coursePreferenceChips.querySelectorAll("[data-preference-id]").forEach(button => button.addEventListener("click", () => toggleProfileValue("preferences", button.dataset.preferenceId)));
    const labels = (state.recommendationProfile.directions || []).map(id => CAREER_DIRECTIONS.find(item => item.id === id)).filter(Boolean).map(localizedLabel);
    const preferenceLabels = (state.recommendationProfile.preferences || []).map(id => COURSE_PREFERENCES.find(item => item.id === id)).filter(Boolean).map(localizedLabel);
    els.careerProfileSummary.textContent = [...labels, ...preferenceLabels].join(" ＋ ") || (isEnglish() ? "No preferences selected" : "尚未选择");
  }

  function toggleProfileValue(field, value) {
    state.recommendationProfile ||= { directions:[], preferences:[] };
    const values = new Set(state.recommendationProfile[field] || []);
    values.has(value) ? values.delete(value) : values.add(value);
    state.recommendationProfile[field] = [...values];
    saveState();
    renderCareerControls();
    renderRecommendations();
  }

  function randomizeCareerProfile() {
    const shuffled = [...CAREER_DIRECTIONS].sort(() => Math.random() - .5).slice(0, 2).map(item => item.id);
    const preference = COURSE_PREFERENCES[Math.floor(Math.random() * COURSE_PREFERENCES.length)]?.id;
    state.recommendationProfile = { directions:shuffled, preferences:preference ? [preference] : [] };
    saveState();
    renderCareerControls();
    renderRecommendations();
    showToast("已生成随机职业方向组合");
  }

  function structuralRecommendationBase(course) {
    let score = 48;
    if (course.eligibility === "open") score += 10;
    if (course.eligibility === "automatic") score += 8;
    if (["application","permission"].includes(course.eligibility)) score -= 8;
    if (course.eligibility === "restricted") score -= 18;
    if (course.llmSpecific) score += 12;
    if (course.degreeRequired) score += 8;
    return score;
  }

  function recommendationScore(course) {
    return Math.max(0, Math.min(100, Math.round(careerMatchScore(course))));
  }

  function inferredWorkloadLabel(course) {
    const score = scheduledLoadScore(course);
    if (score >= 92) return isEnglish() ? "Low" : "较低";
    if (score >= 76) return isEnglish() ? "Low–moderate" : "中低";
    if (score >= 58) return isEnglish() ? "Moderate" : "中等";
    return isEnglish() ? "High" : "较高";
  }

  function careerMatchScore(course) {
    const profile = state.recommendationProfile || { directions:[], preferences:[] };
    const text = courseOfficialText(course);
    let score = structuralRecommendationBase(course);
    for (const directionId of profile.directions || []) {
      const direction = CAREER_DIRECTIONS.find(item => item.id === directionId);
      if (!direction) continue;
      const hits = direction.keywords.filter(keyword => text.includes(keyword.toLowerCase())).length;
      score += Math.min(26, hits * 8);
    }
    const preferences = new Set(profile.preferences || []);
    if (preferences.has("lowWorkload")) score += scheduledLoadScore(course) - 60;
    if (preferences.has("bar")) score += course.barPrimary ? 24 : barStatus(course) === "eligible" ? 14 : barStatus(course) === "ineligible" ? -12 : 0;
    if (preferences.has("su")) score += /s\/u|satisfactory/i.test(String(course.gradingZh || course.grading)) ? 22 : 0;
    if (preferences.has("writing")) score += assessmentEvidence(course).assignments.some(item => /written|paper|memo|memorand|draft|brief/i.test(item)) ? 22 : 0;
    if (preferences.has("skills")) score += courseTopics(course).includes("practice") ? 20 : 0;
    if (preferences.has("finalExam")) score += finalMethods(course).some(method => method.type === "exam") ? 26 : 0;
    if (preferences.has("finalWritten")) score += finalMethods(course).some(method => method.type === "written") ? 26 : 0;
    return score;
  }

  function renderRecommendations() {
    const profile = state.recommendationProfile || { directions:[], preferences:[] };
    if (!(profile.directions || []).length && !(profile.preferences || []).length) {
      els.recommendationGroups.innerHTML = `<div class="empty-state recommendation-empty"><strong>${isEnglish() ? "Choose your priorities first" : "请先选择偏好"}</strong><p>${isEnglish() ? "Select one or more career directions or course preferences above. Then choose Generate recommendation plan." : "从上方选择一个或多个职业方向或课程偏好，再点击“生成推荐方案”。"}</p></div>`;
      return;
    }
    const termCourses = planningTermCourses(courses);
    const ranked = [...termCourses].filter(course => course.sections?.length && !(currentSchoolProfile.autoEnrollCodes || []).includes(course.code)).sort((a,b) => careerMatchScore(b) - careerMatchScore(a));
    const selectedDirections = (profile.directions || []).map(id => CAREER_DIRECTIONS.find(item => item.id === id)).filter(Boolean);
    const directionCourses = selectedDirections.length ? ranked.filter(course => {
        const text = courseOfficialText(course);
      return selectedDirections.some(direction => direction.keywords.some(keyword => text.includes(keyword.toLowerCase())));
    }) : ranked;
    const groups = [
      {
        title: selectedDirections.length ? `${isEnglish() ? "Career profile: " : "职业组合："}${selectedDirections.map(localizedLabel).join(" ＋ ")}` : (isEnglish() ? "Preference-based recommendations" : "偏好推荐"),
        desc: isEnglish() ? "Ranked from the directions and preferences you selected." : "按照你勾选的职业方向与课程偏好排序，方便比较不同组合。",
        courses: directionCourses.slice(0, 8)
      },
      {
        title: isEnglish() ? "NY Bar progress priority" : "NY Bar 进度优先",
        desc: isEnglish() ? "Prioritizes statutory categories and NYLE / Bar tested subjects. Any qualifying combination must reach at least 6 credits; confirm eligibility with the school's official guidance." : "优先展示法定分类要求与 NYLE / Bar 考试科目；该类别任选组合达到至少 6 学分，具体资格仍以学校官方指引为准。",
        courses: ranked.filter(course => course.barPrimary || barStatus(course) === "eligible").slice(0, 8)
      },
      {
        title: isEnglish() ? "Lighter scheduled load" : "较少课时与学分",
        desc: isEnglish() ? "Ranks only published credits and classroom time; it does not infer actual assignments or grading from the course category." : "仅按已公布的学分和课堂时间排序；不从课程类别推断实际作业量或给分。",
        courses: [...termCourses].filter(course => course.sections?.length && !(currentSchoolProfile.autoEnrollCodes || []).includes(course.code)).sort((a,b) => scheduledLoadScore(b)-scheduledLoadScore(a)).slice(0, 8)
      }
    ];
    els.recommendationGroups.innerHTML = groups.map(group => `<section class="recommendation-group"><h3>${esc(group.title)}</h3><p>${esc(group.desc)}</p><div class="recommendation-card-grid">${group.courses.map(recommendationCardHtml).join("")}</div></section>`).join("");
    els.recommendationGroups.querySelectorAll(".add-course-btn").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); toggleCourse(button.dataset.courseId); }));
    els.recommendationGroups.querySelectorAll(".recommendation-card").forEach(card => {
      card.addEventListener("click", event => { if (!event.target.closest("button, a")) openCourseDetail(card.dataset.courseId); });
      bindDraggableElement(card);
    });
  }

  function scheduledLoadScore(course) {
    let score = 60;
    if (Number(course.credits || 0) <= 2) score += 18;
    if (Number(course.credits || 0) >= 4) score -= 18;
    const section = course.sections?.[0];
    const weeklyDays = (section?.meetings || []).reduce((total, meeting) => total + parsePattern(meeting.pattern).length, 0);
    if (weeklyDays <= 1) score += 10;
    if (weeklyDays >= 4) score -= 12;
    return score;
  }

  function recommendationCardHtml(c) {
    const selected = Boolean(state.selected[c.id]);
    const topics = courseTopics(c).slice(0, 2).map(id => COURSE_TOPICS.find(topic => topic.id === id)).filter(Boolean);
    return `<article class="recommendation-card ${selected ? "is-selected" : ""}" draggable="true" data-course-id="${esc(c.id)}"><div class="course-code">${esc(c.code)} · ${creditCount(c.credits)}</div><h4>${esc(courseTitle(c))}</h4><div>${badgesHtml(c)}</div>${topics.length ? `<div class="topic-chip-row">${topics.map(topic => `<span class="topic-chip">${esc(localizedLabel(topic))}</span>`).join("")}</div>` : ""}<p>${esc(recommendReason(c))}</p><div class="recommendation-card-actions"><span class="drag-course-handle" aria-hidden="true">⋮⋮ ${isEnglish() ? "Drag to schedule" : "拖入课表"}</span><button class="add-course-btn ${selected ? "remove" : ""}" data-course-id="${esc(c.id)}">${selected ? (isEnglish() ? "Remove" : "移除") : (isEnglish() ? "Add to schedule" : "加入课表")}</button></div></article>`;
  }

  function recommendReason(c) {
    const en = isEnglish();
    const parts = [];
    const profile = state.recommendationProfile || { directions:[], preferences:[] };
    if (/s\/u|satisfactory/i.test(String(c.grading || c.gradingZh))) parts.push(en ? "S/U reduces letter-grade competition" : "S/U 降低具体等级竞争");
    if (Number(c.credits || 0) <= 2) parts.push(en ? creditCount(c.credits) : `${c.credits} 学分`);
    if (c.llmSpecific) parts.push(en ? "Designed for LL.M. students" : "面向 LL.M. 设计");
    if (c.barPrimary) parts.push(en ? "Advances an NY Bar category requirement" : "可推进 NY Bar 分类要求");
    if (hasAssignmentEvidence(c)) parts.push(en ? "Official description mentions written assignments" : "说明提及书面作业");
    if (hasFinalAssessmentEvidence(c)) parts.push(en ? `Final assessment: ${assessmentSummary(c)}` : `最终考核：${assessmentSummary(c)}`);
    const text = courseOfficialText(c);
    for (const id of profile.directions || []) {
      const direction = CAREER_DIRECTIONS.find(item => item.id === id);
      if (direction?.keywords.some(keyword => text.includes(keyword.toLowerCase()))) parts.push(en ? `Matches ${direction.labelEn}` : `匹配${direction.label}`);
    }
    if (scheduledLoadScore(c) < 58) parts.push(en ? "More published credits or classroom time" : "已公布的学分或课时较多");
    return [...new Set(parts)].join(en ? "; " : "；") || (en ? "Ranked by LL.M. enrollment, course focus, and your selected preferences." : "按 LLM 选课权限、课程方向和已选择偏好排序。");
  }

  function renderScheduleCourseTray() {
    if (!els.scheduleCourseTray) return;
    const list = selectedCourses().sort((a,b) => a.code.localeCompare(b.code, undefined, { numeric:true }));
    if (els.selectedCourseTrayCount) els.selectedCourseTrayCount.textContent = isEnglish() ? `${list.length} selected` : `${list.length} 门`;
    if (!list.length) {
      els.scheduleCourseTray.innerHTML = `<div class="selected-course-empty">${isEnglish() ? "No course is selected yet. Add or drag courses from Course Search, then use this panel to compare them with the weekly schedule." : "暂未选择课程。请在“课程检索”页加入或直接拖入课程；选择后会在这里与下方周课表对应显示。"}</div>`;
      return;
    }
    const conflictsByCourse = new Map(list.map(course => [course.id, []]));
    detectAllConflicts(list).forEach(([first, second]) => { conflictsByCourse.get(first)?.push(second); conflictsByCourse.get(second)?.push(first); });
    els.scheduleCourseTray.innerHTML = list.map((course, index) => {
      const section = getSection(course, state.selected[course.id]);
      const room = sectionLocationSummary(section, course);
      const instructors = (section?.instructors?.length ? section.instructors : course.instructors || []).join(isEnglish() ? ", " : "、") || (isEnglish() ? "TBA" : "待定");
      const [bg,border] = palette[index % palette.length];
      const conflictCodes = (conflictsByCourse.get(course.id) || []).map(id => courses.find(item => item.id === id)?.code).filter(Boolean);
      const calendarTitles = [...new Set(importedCalendarConflicts(course, section).map(event => event.title))];
      const conflictLabels = [...conflictCodes, ...calendarTitles.map(title => isEnglish() ? `Calendar: ${title}` : `日程：${title}`)];
      const conflictNote = conflictLabels.length ? `<em class="schedule-token-conflict">⚠ ${isEnglish() ? `Conflicts with ${conflictLabels.join(", ")}` : `与 ${conflictLabels.join("、")} 时间冲突`}</em>` : "";
      const allocationBadge = barCategories(course).length > 1 ? `<span class="badge badge-allocation schedule-allocation-badge">${isEnglish() ? "Credits allocated to: " : "学分当前计入："}${esc(barCategoryShortLabel(assignedBarCategory(course)))}</span>` : "";
      return `<article class="schedule-course-token is-selected ${conflictLabels.length ? "has-schedule-conflict" : ""}" data-course-id="${esc(course.id)}" style="--token-bg:${bg};--token-border:${border}">
        <div><strong>${esc(course.code)} · ${esc(courseTitle(course))}</strong><span>${currentSchoolId === "cornell" ? `${esc(courseTermLabel(course))} · ` : ""}◷ ${esc(formatSectionMeetings(section))}</span><small>◎ ${esc(instructors)} · ⌖ ${esc(room)}</small>${allocationBadge}</div>
        ${conflictNote}<button type="button" class="schedule-token-remove ${conflictLabels.length ? "is-conflict-remove" : ""}" data-tray-remove="${esc(course.id)}">${conflictLabels.length ? (isEnglish() ? "Remove conflict" : "移除冲突课程") : (isEnglish() ? "Remove" : "移除")}</button>
      </article>`;
    }).join("");
    els.scheduleCourseTray.querySelectorAll(".schedule-course-token").forEach(token => token.addEventListener("click", event => {
      if (!event.target.closest("button")) openCourseDetail(token.dataset.courseId);
    }));
    els.scheduleCourseTray.querySelectorAll("[data-tray-remove]").forEach(button => button.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation(); toggleCourse(button.dataset.trayRemove);
    }));
  }

  function setupScheduleDropzone() {
    const shell = els.scheduleDropShell;
    if (!shell) return;
    shell.addEventListener("dragenter", event => {
      if (!activeDraggedCourseId && !Array.from(event.dataTransfer?.types || []).some(type => type === "text/course-id" || type === "text/plain")) return;
      event.preventDefault();
      shell.classList.add("is-drag-over");
    });
    shell.addEventListener("dragover", event => {
      if (!activeDraggedCourseId && !Array.from(event.dataTransfer?.types || []).some(type => type === "text/course-id" || type === "text/plain")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      shell.classList.add("is-drag-over");
      const target = event.target.closest?.(".schedule-day-column");
      document.querySelectorAll(".schedule-day-column").forEach(column => column.classList.toggle("is-drop-target", column === target));
    });
    shell.addEventListener("dragleave", event => {
      if (shell.contains(event.relatedTarget)) return;
      shell.classList.remove("is-drag-over");
      document.querySelectorAll(".schedule-day-column").forEach(column => column.classList.remove("is-drop-target"));
    });
    shell.addEventListener("drop", event => {
      event.preventDefault();
      shell.classList.remove("is-drag-over");
      document.querySelectorAll(".schedule-day-column").forEach(column => column.classList.remove("is-drop-target"));
      const courseId = event.dataTransfer.getData("text/course-id") || event.dataTransfer.getData("text/plain") || activeDraggedCourseId;
      const placement = placementFromPoint(event.target, event.clientX, event.clientY);
      if (courseId) beginAddCourse(courseId, null, "drag", placement);
    });
  }

  function placementFromPoint(target, clientX, clientY) {
    const column = target?.closest?.(".schedule-day-column");
    if (!column) return null;
    const day = column.dataset.day;
    const gridScroll = column.closest(".schedule-grid-scroll");
    if (!day || !gridScroll) return null;
    const hourHeight = 44, startHour = 8;
    const rect = column.getBoundingClientRect();
    const relative = Math.max(0, Math.min(12.5 * hourHeight, clientY - rect.top));
    const minutes = startHour * 60 + Math.round((relative / hourHeight) * 2) * 30;
    const start = minutesToTime(Math.min(minutes, 20 * 60 + 30));
    return { day, start, droppedAt:new Date().toISOString() };
  }

  function setManualPlacement(courseId, placement, silent = false) {
    const course = courses.find(item => item.id === courseId);
    const section = course ? getSection(course, state.selected[courseId]) : null;
    const original = section?.meetings?.[0];
    const duration = original ? Math.max(30, Math.min(180, timeToMinutes(original.end) - timeToMinutes(original.start))) : 60;
    state.manualPlacements ||= {};
    state.manualPlacements[courseId] = { ...placement, end:minutesToTime(timeToMinutes(placement.start) + duration), duration };
    saveState();
    renderAll();
    if (!silent) showToast(isEnglish() ? `${course?.code || "Course"} placed as a personal schedule override.` : `${course?.code || "课程"} 已按所放时间作为个人课表安排。`);
    else showToast(isEnglish() ? `${course?.code || "Course"} added at the dropped time.` : `${course?.code || "课程"} 已按拖放时间加入课表。`);
  }

  function scheduleInstructorSummary(section, course) {
    const names = section?.instructors?.length ? section.instructors : (course.instructors || []);
    const compact = names.map(name => {
      const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      return parts.length ? parts[parts.length - 1] : "";
    }).filter(Boolean);
    return compact.slice(0, 2).join("/") || (isEnglish() ? "TBA" : "待定");
  }

  function scheduleLocationSummary(location) {
    return String(location || "").replace(/^Myron Taylor Hall\s+/i, "MTH ").replace(/^Ithaca主校区或课程指定校区$/u, isEnglish() ? "Room pending" : "教室待公布");
  }

  function groupOverlappingScheduleEntries(entries) {
    const ordered = [...entries].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes || a.course.code.localeCompare(b.course.code));
    const groups = [], current = [];
    let latestEnd = -Infinity;
    ordered.forEach(entry => {
      if (current.length && entry.startMinutes >= latestEnd) {
        groups.push(current.splice(0));
        latestEnd = -Infinity;
      }
      current.push(entry);
      latestEnd = Math.max(latestEnd, entry.endMinutes);
    });
    if (current.length) groups.push(current);
    return groups;
  }

  function renderSchedule() {
    const selected = selectedCourses();
    const weekStart = startOfWeek(parseIsoDate(state.scheduleWeekStart || currentUserWeekStart()));
    state.scheduleWeekStart = toIsoDate(weekStart);
    saveState();
    const weekDates = DAY_KEYS.map((_, i) => addDays(weekStart, i));
    const activeConflicts = detectWeekConflicts(selected, weekDates);
    const activeCalendarConflicts = selected.flatMap(course => {
      const section = getSection(course, state.selected[course.id]);
      return importedCalendarConflicts(course, section, weekDates).map(event => ({ course, event }));
    });
    const activeConflictCount = activeConflicts.length + activeCalendarConflicts.length;
    const activeConflictCodes = [...new Set(activeConflicts.flat().map(id => selected.find(course => course.id === id)?.code).filter(Boolean))];
    activeCalendarConflicts.forEach(item => activeConflictCodes.push(`${item.course.code}/${isEnglish() ? "Calendar" : "个人日程"}`));
    els.conflictStatus.textContent = activeConflictCount ? (isEnglish() ? `${activeConflictCount} weekly conflict${activeConflictCount > 1 ? "s" : ""}: ${[...new Set(activeConflictCodes)].join(" / ")}` : `${activeConflictCount} 组本周时间冲突：${[...new Set(activeConflictCodes)].join("／")}`) : (isEnglish() ? "No weekly time conflicts" : "本周无时间冲突");
    els.conflictStatus.title = activeConflictCount ? (isEnglish() ? "Red outlines mark overlapping classes or imported personal events. Use the highlighted Remove conflict button above to resolve a class conflict." : "红框标出课程或导入个人日程的重叠；可在上方已选课程卡中使用高亮的“移除冲突课程”处理。") : "";
    els.conflictStatus.classList.toggle("has-conflict", Boolean(activeConflictCount));
    renderWeekNavigator(weekStart, weekDates);

    const startHour = 8, endHour = 21, hourHeight = 44;
    const intensiveMeetings = [];
    weekDates.forEach((date, dayIndex) => selected.forEach((course, courseIndex) => {
      const section = getSection(course, state.selected[course.id]);
      getScheduleMeetingsForDate(course, section, date).forEach(meeting => {
        if (timeToMinutes(meeting.end) - timeToMinutes(meeting.start) >= 240) intensiveMeetings.push({ date, dayIndex, course, section, meeting, courseIndex });
      });
    }));
    weekDates.forEach((date, dayIndex) => calendarEventsForDate(date).forEach((event, eventIndex) => {
      if (event.allDay || timeToMinutes(event.end) - timeToMinutes(event.start) >= 240) intensiveMeetings.push({ date, dayIndex, course:calendarPseudoCourse(event), section:calendarPseudoSection(event), meeting:{ start:event.start, end:event.end, location:event.location || "", importedCalendar:true }, courseIndex:selected.length + eventIndex, calendarEvent:event });
    }));
    const intensiveHtml = intensiveMeetings.length ? `<section class="intensive-course-strip"><div><strong>${isEnglish() ? "Intensive sessions and all-day events" : "全天／集中课程与日程"}</strong><span>${isEnglish() ? "Shown compactly so they do not hide the hourly grid." : "已紧凑显示，不再遮挡左侧时间表格。"}</span></div><div class="intensive-course-list">${intensiveMeetings.map(item => `<button type="button" class="intensive-course-chip ${item.calendarEvent ? "is-imported-calendar" : ""}" ${item.calendarEvent ? `data-calendar-event-id="${esc(item.calendarEvent.id)}"` : `data-course-id="${esc(item.course.id)}"`}><strong>${esc(dayLabel(DAY_KEYS[item.dayIndex]))} ${item.date.getMonth()+1}/${item.date.getDate()} · ${esc(item.course.code)}</strong><span>${esc(courseTitle(item.course))} · ${item.calendarEvent?.allDay ? (isEnglish() ? "All day" : "全天") : `${item.meeting.start}–${item.meeting.end}`}</span></button>`).join("")}</div></section>` : "";
    let grid = `<div class="schedule-header schedule-corner"></div>${weekDates.map((date, index) => {
      const specialLabel = specialScheduleLabelForDate(date);
      return `<div class="schedule-header ${specialLabel ? "has-special-schedule" : ""}"><strong>${dayLabel(DAY_KEYS[index])}</strong><span>${date.getMonth()+1}/${date.getDate()}</span>${specialLabel ? `<small>${esc(specialLabel)}</small>` : ""}</div>`;
    }).join("")}`;
    grid += `<div class="schedule-time-column">${Array.from({length:endHour-startHour+1},(_,i)=>`<div class="time-label ${i === 0 ? "is-first" : ""}" style="top:${i*hourHeight}px">${String(startHour+i).padStart(2,"0")}:00</div>`).join("")}</div>`;

    weekDates.forEach((date, dayIndex) => {
      const meetingEntries = [];
      selected.forEach((c, courseIndex) => {
        const sec = getSection(c, state.selected[c.id]);
        getScheduleMeetingsForDate(c, sec, date).forEach(m => {
          if (timeToMinutes(m.end) - timeToMinutes(m.start) >= 240) return;
          const top = (timeToMinutes(m.start) - startHour*60) / 60 * hourHeight;
          const duration = timeToMinutes(m.end) - timeToMinutes(m.start);
          const height = Math.max(36, duration/60*hourHeight);
          meetingEntries.push({ course:c, section:sec, meeting:m, courseIndex, top, height, duration, startMinutes:timeToMinutes(m.start), endMinutes:timeToMinutes(m.end) });
        });
      });
      calendarEventsForDate(date).forEach((event, eventIndex) => {
        const originalStart = timeToMinutes(event.start), originalEnd = timeToMinutes(event.end);
        if (event.allDay || originalEnd - originalStart >= 240 || originalEnd <= startHour * 60 || originalStart >= endHour * 60) return;
        const displayStart = Math.max(startHour * 60, originalStart), displayEnd = Math.min(endHour * 60, originalEnd);
        const meeting = { start:minutesToTime(displayStart), end:minutesToTime(displayEnd), location:event.location || "", importedCalendar:true };
        const duration = displayEnd - displayStart, top = (displayStart - startHour * 60) / 60 * hourHeight;
        meetingEntries.push({ course:calendarPseudoCourse(event), section:calendarPseudoSection(event), meeting, courseIndex:selected.length + eventIndex, top, height:Math.max(36, duration / 60 * hourHeight), duration, startMinutes:displayStart, endMinutes:displayEnd, calendarEvent:event });
      });
      const frames = [], blocks = [];
      groupOverlappingScheduleEntries(meetingEntries).forEach(group => {
        const overlaps = group.length > 1;
        if (overlaps) {
          const frameTop = Math.min(...group.map(item => item.top));
          const frameBottom = Math.max(...group.map(item => item.top + item.height));
          frames.push(`<div class="schedule-conflict-frame" style="top:${frameTop}px;height:${frameBottom-frameTop}px" aria-label="${isEnglish() ? "Overlapping courses" : "课程时间重叠"}"></div>`);
        }
        group.forEach((item, conflictIndex) => {
          const { course:c, section:sec, meeting:m, courseIndex, top, height, duration, calendarEvent } = item;
          const [bg,border] = palette[courseIndex % palette.length];
          const room = meetingLocation(m, sec, c);
          const roomShort = scheduleLocationSummary(room);
          const instructor = scheduleInstructorSummary(sec, c);
          const density = duration < 70 ? "compact" : duration < 100 ? "standard" : "spacious";
          const compactVisual = density === "compact" || overlaps;
          const customLabel = m.manualPlacement ? (isEnglish() ? "Personal placement" : "个人课表安排") : "";
          const tooltip = `${c.code} ${courseTitle(c)} · ${m.start}–${m.end} · ${room}${customLabel ? ` · ${customLabel}` : ""}`;
          const overlapStyle = overlaps ? `left:${4 + conflictIndex * (92 / group.length)}%;width:${92 / group.length}%;right:auto;` : "";
          const conflictWith = overlaps ? group.filter(other => other.course.id !== c.id).map(other => other.course.code).join(", ") : "";
          const blockDetails = calendarEvent
            ? `<span class="schedule-course-title">${esc(calendarEvent.title)}</span><span class="schedule-time">${esc(calendarEvent.start)}–${esc(calendarEvent.end)}</span>${calendarEvent.location ? `<span class="schedule-location">⌖ ${esc(calendarEvent.location)}</span>` : ""}`
            : compactVisual
              ? `<div class="schedule-compact-details"><span class="schedule-time">${m.start}–${m.end}</span><span class="schedule-instructor">◎ ${esc(instructor)}</span><span class="schedule-location">⌖ ${esc(roomShort)}</span></div>`
              : `<span class="schedule-course-title">${esc(courseTitle(c))}</span><span class="schedule-time">${m.start}–${m.end}</span>${customLabel ? `<span class="schedule-custom-note">${customLabel}</span>` : ""}<span class="schedule-instructor">◎ ${esc(instructor)}</span><span class="schedule-location">⌖ ${esc(roomShort)}</span>`;
          const dataAttribute = calendarEvent ? `data-calendar-event-id="${esc(calendarEvent.id)}"` : `data-course-id="${esc(c.id)}"`;
          blocks.push(`<div class="schedule-block is-${density} ${compactVisual ? "is-compact-visual" : ""} ${calendarEvent ? "is-imported-calendar" : ""} ${overlaps ? "is-conflict in-conflict-group" : ""}" ${dataAttribute} data-conflict-with="${esc(conflictWith)}" title="${esc(tooltip)}" aria-label="${esc(tooltip)}" style="top:${top}px;height:${height}px;--block-bg:${bg};--block-border:${border};${overlapStyle}"><strong>${esc(c.code)}</strong>${blockDetails}</div>`);
        });
      });
      const noClass = isNoClassDate(date);
      const noClassPeriodLabel = noClassPeriodLabelForDate(date);
      const noClassHtml = noClass ? `<div class="no-class-label">${noClassPeriodLabel ? `<strong>${esc(noClassPeriodLabel)}</strong><span>${isEnglish() ? "No classes" : "无课"}</span>` : `<strong>${isEnglish() ? "No classes" : "无课"}</strong>`}</div>` : "";
      grid += `<div class="schedule-day-column ${noClass ? "is-no-class" : ""}" data-day="${DAY_KEYS[dayIndex]}">${Array.from({length:endHour-startHour},(_,i)=>`<div class="hour-line" style="top:${i*hourHeight}px"></div><div class="half-hour-line" style="top:${i*hourHeight+hourHeight/2}px"></div>`).join("")}${noClassHtml}${frames.join("")}${blocks.join("")}</div>`;
    });
    els.fullSchedule.innerHTML = `${intensiveHtml}<div class="schedule-grid-scroll" aria-label="${isEnglish() ? "Weekly calendar" : "每周课表"}"><div class="weekly-grid">${grid}</div></div>`;
    els.fullSchedule.querySelectorAll(".schedule-block[data-course-id], .intensive-course-chip[data-course-id]").forEach(b => b.addEventListener("click", () => openCourseDetail(b.dataset.courseId)));
    els.fullSchedule.querySelectorAll("[data-calendar-event-id]").forEach(block => block.addEventListener("click", () => {
      const event = importedCalendarEvents().find(item => item.id === block.dataset.calendarEventId);
      if (event) showToast(`${event.title} · ${event.date} · ${event.allDay ? (isEnglish() ? "All day" : "全天") : `${event.start}–${event.end}`}`, false);
    }));

    const activeCourseIds = new Set();
    selected.forEach(c => {
      const sec = getSection(c, state.selected[c.id]);
      if (weekDates.some(date => getScheduleMeetingsForDate(c, sec, date).length)) activeCourseIds.add(c.id);
    });
    const noTimedMeetings = selected.filter(c => !(getSection(c, state.selected[c.id])?.meetings || []).length);
    const notThisWeek = selected.filter(c => !activeCourseIds.has(c.id) && (getSection(c, state.selected[c.id])?.meetings || []).length);
    const parts = [];
    if (noTimedMeetings.length) parts.push(`<div><h3>${isEnglish() ? "No published meeting time / not displayed in the standard weekly grid" : "时间未公布或不进入普通周课表"}</h3>${noTimedMeetings.map(c=>`<span class="unscheduled-chip">${esc(c.code)} · ${esc(courseTitle(c))}</span>`).join("")}</div>`);
    if (notThisWeek.length) parts.push(`<div><h3>${isEnglish() ? "No class this week" : "本周没有上课"}</h3>${notThisWeek.map(c=>`<span class="unscheduled-chip muted">${esc(c.code)} · ${esc(courseTitle(c))}</span>`).join("")}</div>`);
    els.unscheduledCourses.innerHTML = parts.join("");
    renderLocationAgenda(selected, weekDates);
  }

  function renderWeekNavigator(weekStart, weekDates) {
    const weekEnd = weekDates[4];
    const noClassLabels = [...new Set(weekDates.map(noClassPeriodLabelForDate).filter(Boolean))];
    els.scheduleWeekLabel.textContent = isEnglish() ? `${weekStart.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month:"short", day:"numeric" })}` : `${weekStart.getFullYear()}年${weekStart.getMonth()+1}月${weekStart.getDate()}日—${weekEnd.getMonth()+1}月${weekEnd.getDate()}日`;
    els.scheduleWeekNumber.textContent = semesterWeekLabel(weekStart);
    els.scheduleDateInput.value = toIsoDate(weekStart);
    const calendarNotice = noClassLabels.length ? (isEnglish() ? `This week: ${noClassLabels.join(" / ")}. ` : `本周校历：${noClassLabels.join("／")}。`) : "";
    els.scheduleWeekCaption.textContent = isEnglish() ? `${semesterWeekLabel(weekStart)} · ${calendarNotice}Only meetings that occur this week are shown; Law School no-class days stay empty.` : `${semesterWeekLabel(weekStart)} · ${calendarNotice}仅显示本周实际发生的课程；法学院无课日会自动留空。`;
  }

  function semesterWeekLabel(weekStart) {
    const profile = termProfileForDate(addDays(weekStart, 2));
    if (!profile) {
      return isEnglish() ? "Calendar week" : "日历周";
    }
    const orientation = parseIsoDate(profile.orientationStart || profile.instructionStart);
    const instruction = startOfWeek(parseIsoDate(profile.instructionStart));
    const termEnd = startOfWeek(parseIsoDate(profile.examEnd));
    if (weekStart < startOfWeek(orientation) || weekStart > termEnd) return isEnglish() ? "Calendar week" : "日历周";
    if (weekStart < instruction) {
      const n = Math.floor((weekStart - startOfWeek(orientation)) / 604800000) + 1;
      return isEnglish() ? `${profile.label} · Orientation · Week ${Math.max(1,n)}` : `${profile.labelZh} · Orientation 第${Math.max(1,n)}周`;
    }
    const n = Math.floor((weekStart - instruction) / 604800000) + 1;
    return isEnglish() ? `${profile.label} · Instruction · Week ${Math.max(1,n)}` : `${profile.labelZh} · 正式课程第${Math.max(1,n)}周`;
  }

  function moveScheduleWeek(days) {
    const base = parseIsoDate(state.scheduleWeekStart || currentUserWeekStart());
    setScheduleWeek(toIsoDate(addDays(base, days)));
  }

  function setScheduleWeek(value) {
    if (!value) return;
    state.scheduleWeekStart = toIsoDate(startOfWeek(parseIsoDate(value)));
    saveState();
    renderSchedule();
    renderMiniSchedule();
  }

  function getMeetingsForDate(section, date, course = null) {
    if (!section || isNoClassDate(date)) return [];
    const iso = toIsoDate(date);
    const term = course ? termProfileForCourse(course) : (termProfileForDate(date) || TERM);
    const scheduleDay = term?.specialScheduleDays?.[iso] || SPECIAL_SCHEDULE_DAYS[iso] || DAY_KEYS[date.getDay()-1];
    if (!scheduleDay) return [];
    return (section.meetings || []).filter(m => {
      if (!parsePattern(m.pattern).includes(scheduleDay)) return false;
      const start = parseIsoDate(m.startDate || section.startDate || term.instructionStart);
      const end = parseIsoDate(m.endDate || section.endDate || term.instructionEnd);
      return date >= start && date <= end;
    });
  }

  function getScheduleMeetingsForDate(course, section, date) {
    const manual = state.manualPlacements?.[course?.id];
    if (!manual) return getMeetingsForDate(section, date, course);
    if (isNoClassDate(date)) return [];
    const iso = toIsoDate(date);
    const term = termProfileForCourse(course);
    const scheduleDay = term?.specialScheduleDays?.[iso] || SPECIAL_SCHEDULE_DAYS[iso] || DAY_KEYS[date.getDay()-1];
    if (scheduleDay !== manual.day) return [];
    const isoDate = toIsoDate(date);
    if (isoDate < term.instructionStart || isoDate > term.instructionEnd) return [];
    return [{ pattern:manual.day, start:manual.start, end:manual.end, startDate:term.instructionStart, endDate:term.instructionEnd, location:meetingLocation(section?.meetings?.[0], section, course), manualPlacement:true }];
  }

  function detectWeekConflicts(selected, weekDates) {
    const pairs = [];
    for (let i=0;i<selected.length;i++) for (let j=i+1;j<selected.length;j++) {
      const a = getSection(selected[i], state.selected[selected[i].id]);
      const b = getSection(selected[j], state.selected[selected[j].id]);
      const conflict = weekDates.some(date => {
        const ma = getScheduleMeetingsForDate(selected[i], a, date), mb = getScheduleMeetingsForDate(selected[j], b, date);
        return ma.some(x => mb.some(y => timeToMinutes(x.start) < timeToMinutes(y.end) && timeToMinutes(y.start) < timeToMinutes(x.end)));
      });
      if (conflict) pairs.push([selected[i].id, selected[j].id]);
    }
    return pairs;
  }

  function detectAllConflicts(selected) {
    const pairs = [];
    for (let i=0;i<selected.length;i++) for (let j=i+1;j<selected.length;j++) {
      if (sectionsConflict(getSection(selected[i], state.selected[selected[i].id]), getSection(selected[j], state.selected[selected[j].id]))) pairs.push([selected[i].id, selected[j].id]);
    }
    return pairs;
  }

  function openCourseDetail(courseId) {
    const c = courses.find(x => x.id === courseId); if (!c) return;
    currentDetailCourseId = courseId;
    selectedDetailSectionId = state.selected[c.id] || sectionSelectionId(defaultSectionSelection(c));
    renderDetail(c);
    els.detailOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function renderDetail(c) {
    const selected = Boolean(state.selected[c.id]);
    const sectionChanged = selected && state.selected[c.id] !== selectedDetailSectionId;
    const profile = workloadProfile(c, getSection(c, selectedDetailSectionId));
    const en = isEnglish();
    els.detailContent.innerHTML = `<div class="detail-code">${esc(c.code)}</div><h2 class="detail-title">${esc(courseTitle(c))}</h2><div class="detail-badges">${badgesHtml(c, selectedDetailSectionId)}</div>
      <div class="detail-grid">
        <div class="detail-stat"><label>${en ? "Credits" : "学分"}</label><strong>${c.credits}</strong></div>
        <div class="detail-stat"><label>${en ? "Grading" : "评分方式"}</label><strong>${esc(formatGrading(c.grading || c.gradingZh))}</strong></div>
        <div class="detail-stat"><label>${en ? "Instructor" : "教师"}</label><strong>${instructorsHtml(c.instructors)}</strong></div>
        <div class="detail-stat detail-stat-location"><label>${en ? "Teaching location" : "授课地点"}</label><strong>${courseLocationSourceHtml(c, getSection(c, selectedDetailSectionId))}</strong><button type="button" class="manual-location-button" id="manualLocationBtn">${en ? "Paste or edit location" : "粘贴／修改具体地点"}</button></div>
        <div class="detail-stat"><label>${en ? "Recommendation" : "推荐度"}</label><strong>${recommendationScore(c)} / 100</strong></div>
      </div>
      ${detailDescriptionHtml(c, en)}
      ${detailAdditionalInformationHtml(c, en)}
      ${detailOfficialAttributesHtml(c, en)}
      <section class="detail-section"><h3>${en ? "Assessment and scheduled load" : "课程负担与考核"}</h3>
        <div class="workload-grid">
          <div class="workload-item"><label>${en ? "Weekly class time" : "每周课堂时间"}</label><strong>${esc(profile.classTime)}</strong></div>
          <div class="workload-item"><label>${en ? "Coursework mentioned in description" : "课程说明提及的作业／持续性任务"}</label>${officialEvidenceHtml(profile.assignments, en ? "The official description does not state assigned work." : "官方课程说明未载明具体作业。")}</div>
          <div class="workload-item"><label>${en ? "Final assessment method" : "最终考核方式"}</label>${finalAssessmentHtml(c, en)}</div>
        </div>
        <p class="estimate-note">${en ? "A final assessment appears when it is identified in the official description; otherwise it is marked not stated." : "官方课程说明列出期末考核方式时才会显示；未列出时标为“未载明”。"}</p>
      </section>
      <section class="detail-section"><h3>${en ? "NY Bar credit" : "NY Bar 计分"}</h3><p>${barExplanation(c, selectedDetailSectionId)}</p></section>
      ${cuReviewsDetailHtml(c)}
      <section class="detail-section"><h3>${isEnglish() ? "Sections, times and locations" : "班次、时间与地点"}</h3>${selected ? `<p class="section-switch-hint">${sectionChanged ? (en ? "Ready to switch: confirm below and your schedule will immediately use this section's official time and location." : "已选新班次：点击下方按钮后，课表会立即改为该班次的官方时间和地点。") : (en ? "Choose another section to update this course in your schedule without removing it first." : "可直接选择其他班次；无需先移除课程。")}</p>` : ""}<div class="section-choice">${sectionGroupsHtml(c) || (isEnglish() ? "No standard meeting time is available." : "暂无普通上课时间")}</div></section>
      <section class="detail-section location-import-guide"><h3>${isEnglish() ? "How to add a location" : "如何补充上课地点"}</h3><p>${isEnglish() ? "Open the official course page from the location field above. After signing in to the selected school's course system, copy the building and room, return here, and choose Paste or edit location. The location is saved only on this device and appears in your schedule immediately." : "点击上方“授课地点”可打开本课程官方页面；登录本校课程系统后，复制教学楼和教室号，回到这里点击“粘贴／修改具体地点”。地点只保存在本机，并会立即显示在课表中。"}</p></section>
      <section class="detail-section"><h3>${en ? "Enrollment and prerequisites" : "限制与先修"}</h3><p><strong>${en ? "Enrollment:" : "选课限制："}</strong>${esc(localizedRestriction(c))}<br><strong>${en ? "Prerequisites:" : "先修要求："}</strong>${esc(localizedPrerequisites(c))}</p></section>
      ${detailOfficialLinksHtml(c, en)}
      <div class="detail-footer"><button id="detailAddBtn" class="primary-button ${sectionChanged ? "section-switch-button" : ""}">${selected ? (sectionChanged ? (en ? "Switch to selected section" : "切换至所选班次") : (en ? "Remove from schedule" : "从课表移除")) : (en ? "Add selected section" : "按所选班次加入课表")}</button></div>`;
    applyLanguageChrome();
    els.detailContent.querySelectorAll("input[data-detail-section-group]").forEach(r => r.addEventListener("change", () => { selectedDetailSectionId = sectionSelectionId([...els.detailContent.querySelectorAll("input[data-detail-section-group]:checked")].map(input => input.value)); renderDetail(c); }));
    document.getElementById("detailAddBtn").addEventListener("click", () => {
      if (selected && sectionChanged) {
        if (attemptAddCourse(c, selectedDetailSectionId, "switch")) closeDrawer();
        return;
      }
      toggleCourse(c.id, selectedDetailSectionId);
      closeDrawer();
    });
    document.getElementById("manualLocationBtn")?.addEventListener("click", () => setManualLocation(c, getSection(c, selectedDetailSectionId)));
  }

  function cuReviewsDetailHtml(c) {
    const url = cuReviewsCourseUrl(c);
    if (!url) return "";
    const record = cuReviewsRecord(c);
    const rating = formatCuReviewsRating(record?.rating);
    const difficulty = formatCuReviewsRating(record?.difficulty);
    const workload = formatCuReviewsRating(record?.workload);
    const metrics = rating ? `<div class="cureviews-metrics">
      <div><span>${isEnglish() ? "Rating" : "课程评分"}</span><strong>${esc(rating)} / 5</strong></div>
      ${difficulty ? `<div><span>${isEnglish() ? "Difficulty" : "难度"}</span><strong>${esc(difficulty)} / 5</strong></div>` : ""}
      ${workload ? `<div><span>${isEnglish() ? "Workload" : "工作量"}</span><strong>${esc(workload)} / 5</strong></div>` : ""}
    </div>` : "";
    const note = rating
      ? (isEnglish() ? "This historical student-review snapshot is separate from the official Fall 2026 course data." : "该历史学生评价快照独立于 Fall 2026 官方课程数据，不替代官方课程说明。")
      : (isEnglish() ? "No rating snapshot is currently available for this course. Open CU Reviews to see whether the public course page has newer information." : "当前本地快照没有这门课的评分；可打开 CU Reviews 查看公开课程页是否已有更新。")
    return `<section class="detail-section cureviews-section"><h3>CU Reviews</h3>${metrics}<p>${esc(note)}</p><p><a href="${esc(url)}" target="_blank" rel="noreferrer">${isEnglish() ? "Open this course in CU Reviews" : "在 CU Reviews 打开本课程评价"} ↗</a></p></section>`;
  }

  function sectionGroupsHtml(c) {
    const selectedIds = new Set(String(selectedDetailSectionId || "").split("|").filter(Boolean));
    return sectionSelectionGroups(c).map(group => `<fieldset class="detail-section-group"><legend>${esc(formatSectionGroupLabel(group.label))}</legend>${group.sections.map(section => sectionOptionHtml(c, section, group, selectedIds)).join("")}</fieldset>`).join("");
  }

  function sectionOptionHtml(c,s,group,selectedIds = new Set()) {
    const checked = selectedIds.has(s.id);
    const meetingRows = (s.meetings || []).length ? (s.meetings || []).map(m => `<div class="meeting-detail-row"><span>◷ ${esc(formatMeetingTime(m))}</span><span>⌖ ${locationLinkHtml(meetingLocation(m, s, c))}</span></div>`).join("") : `<div class="meeting-detail-row"><span>${isEnglish() ? "Time pending" : "时间待公布"}</span><span>⌖ ${locationLinkHtml(sectionLocationSummary(s, c))}</span></div>`;
    return `<label class="section-option"><input type="radio" name="detail-${esc(group.id)}" data-detail-section-group="${esc(group.id)}" value="${esc(s.id)}" ${checked ? "checked" : ""}><span class="section-option-content"><strong>${sectionIdentityHtml(s)}</strong>${meetingRows}<small class="location-source-note">${sectionHasPublishedLocation(s) ? `${isEnglish() ? "Location from official school data" : `教室来自${esc(currentSchoolProfile.shortZh || currentSchoolProfile.nameZh)}官方课程数据`}` : `${isEnglish() ? "Specific room not published in official school data" : `${esc(currentSchoolProfile.shortZh || currentSchoolProfile.nameZh)}官方课程数据尚未发布具体教室`}`}</small>${s.grading || s.gradingZh ? `<small class="section-enrollment-note">▱ ${esc(formatGrading(s.grading || s.gradingZh))}</small>` : ""}${s.consentZh || s.consentEn ? `<small class="section-enrollment-note">▣ ${esc(isEnglish() ? (s.consentEn || s.consentZh) : s.consentZh)}</small>` : ""}</span></label>`;
  }

  function workloadProfile(c, section) {
    const meetings = section?.meetings || [];
    const weeklyMinutes = meetings.reduce((sum, m) => sum + Math.max(0, timeToMinutes(m.end) - timeToMinutes(m.start)) * parsePattern(m.pattern).length, 0);
    const classTime = weeklyMinutes ? (isEnglish() ? `${Math.floor(weeklyMinutes/60)}h${weeklyMinutes%60 ? ` ${weeklyMinutes%60}m` : ""}` : `${Math.floor(weeklyMinutes/60)}小时${weeklyMinutes%60 ? `${weeklyMinutes%60}分钟` : ""}`) : (isEnglish() ? "Intensive course or meeting time not published" : "集中授课或时间未公布");
    const evidence = assessmentEvidence(c);
    return { classTime, assignments:evidence.assignments, finalAssessment:evidence.finalAssessment };
  }

  function officialEvidenceHtml(items, fallback) {
    if (!items.length) return `<strong>${esc(fallback)}</strong>`;
    return `<ul class="official-evidence-list">${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }

  function finalAssessmentHtml(course, en) {
    const methods = finalMethods(course);
    if (!methods.length) return `<strong>${en ? "The official description does not state a final assessment method." : "官方课程说明未载明最终考核方式。"}</strong>`;
    return `<ul class="official-evidence-list">${methods.map(method => `<li><strong>${esc(en ? method.labelEn : method.labelZh)}</strong><br>${esc(method.evidence)}</li>`).join("")}</ul>`;
  }

  function loadCustomSchoolStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem("llm-course-planner-custom-schools") || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }

  function loadCornellImportedDataset() {
    try {
      const parsed = JSON.parse(localStorage.getItem("llm-course-planner-cornell-import") || "null");
      if (parsed?.bundledDatabaseVersion !== CURRENT_CORNELL_DATASET_VERSION) {
        localStorage.removeItem("llm-course-planner-cornell-import");
        return null;
      }
      return parsed && parsed.sourceBuild === "user-import" && Array.isArray(parsed.courses) ? parsed : null;
    } catch { return null; }
  }

  function saveCornellImportedDataset(dataset) {
    cornellImportedDataset = dataset;
    localStorage.setItem("llm-course-planner-cornell-import", JSON.stringify(dataset));
  }

  function saveCustomSchoolStore() {
    localStorage.setItem("llm-course-planner-custom-schools", JSON.stringify(customSchoolStore));
  }

  function getSchoolProfile(id) {
    if (id === "cornell") return { ...SCHOOL_PRESETS.find(item => item.id === "cornell") };
    const custom = customSchoolStore[id];
    if (custom?.profile) return { ...custom.profile };
    return { ...(SCHOOL_PRESETS.find(item => item.id === id) || SCHOOL_PRESETS[0]), term:{...DEFAULT_TERM}, autoEnrollCodes:[], noClassDates:[], specialScheduleDays:{} };
  }

  function renderSchoolIdentity() {
    currentSchoolProfile = getSchoolProfile(currentSchoolId);
    const termFilterField = els.termFilter?.closest(".filter-field");
    if (termFilterField) termFilterField.hidden = currentSchoolId !== "cornell";
    const selectedTerms = selectedFilterValues(els.termFilter);
    const cornellTermSummary = selectedTerms.size === 1 ? termLabel([...selectedTerms][0]) : (isEnglish() ? "Fall 2026 + Spring 2027" : "2026 秋季 + 2027 春季");
    const identityTerm = currentSchoolId === "cornell" ? cornellTermSummary : (currentSchoolProfile.termLabel || (isEnglish() ? "Custom term" : "自定义学期"));
    if (els.brandSubtitle) els.brandSubtitle.textContent = `${isEnglish() ? (currentSchoolProfile.nameEn || currentSchoolProfile.nameZh) : (currentSchoolProfile.nameZh || currentSchoolProfile.nameEn)} · ${identityTerm} · ${APP_VERSION}`;
    if (els.currentSchoolShort) els.currentSchoolShort.textContent = isEnglish() ? (currentSchoolProfile.nameEn || currentSchoolProfile.nameZh) : (currentSchoolProfile.shortZh || currentSchoolProfile.nameZh);
    if (els.currentTermShort) els.currentTermShort.textContent = identityTerm;
    if (els.termSwitchHint) els.termSwitchHint.textContent = currentSchoolId === "cornell" ? "点击切换学期 / Click to switch term" : "切换学校 / Switch school";
    if (els.schoolSwitcherBtn) els.schoolSwitcherBtn.title = currentSchoolId === "cornell" ? (isEnglish() ? "Switch Fall/Spring term; schools and data are available inside" : "切换秋季／春季；弹窗内可进入学校与数据") : (isEnglish() ? "Switch schools or import course data" : "切换学校或导入课程数据");
    document.title = `${isEnglish() ? (currentSchoolProfile.nameEn || currentSchoolProfile.nameZh) : (currentSchoolProfile.shortZh || currentSchoolProfile.nameEn)} LL.M. Course Planner ${APP_VERSION}`;
  }

  function renderSchoolManager() {
    if (!els.schoolPresetGrid) return;
    els.currentSchoolFullName.textContent = currentSchoolProfile.nameEn || currentSchoolProfile.nameZh;
    els.currentSchoolCourseCount.textContent = courses.length;
    els.currentSchoolDataStatus.textContent = currentSchoolId === "cornell"
      ? (isEnglish() ? `${courses.length} term-specific offerings: ${cornellFallCatalog.length} Fall 2026 and ${cornellSpringCatalog.length} Spring 2027. Undergraduate-only, JD-only, and Cornell Tech LL.M.-only Spring offerings are excluded.` : `${courses.length} 条分学期开课记录：Fall 2026 共 ${cornellFallCatalog.length} 门，Spring 2027 共 ${cornellSpringCatalog.length} 门；春季已剔除仅限本科生、仅限 JD 及仅限 Cornell Tech LL.M. 的课程。`)
      : `${isEnglish() ? "Locally imported catalog" : "本地导入课程库"} · ${customSchoolStore[currentSchoolId]?.updatedAt ? `${isEnglish() ? "updated" : "更新于"} ${new Date(customSchoolStore[currentSchoolId].updatedAt).toLocaleString(isEnglish() ? "en-US" : "zh-CN")}` : (isEnglish() ? "available offline" : "离线可用")}`;
    els.currentSchoolCatalogLink.href = currentSchoolProfile.catalogUrl || "#";
    els.schoolPresetGrid.innerHTML = SCHOOL_PRESETS.map(profile => schoolPresetCardHtml(profile)).join("");
    els.schoolPresetGrid.querySelectorAll("[data-configure-school]").forEach(button => button.addEventListener("click", () => selectSchoolPresetForImport(button.dataset.configureSchool)));
    els.schoolPresetGrid.querySelectorAll("[data-switch-school]").forEach(button => button.addEventListener("click", () => switchSchool(button.dataset.switchSchool)));
    if (!els.importSchoolNameZh.value) selectSchoolPresetForImport(currentSchoolId, false);
  }

  function sourceImportInstruction(profile) {
    if (profile.id === "cornell") return isEnglish() ? "Open Cornell's official Course Roster, save the term page or API result, then give it to an AI with the prompt below. Rooms behind NetID can be left blank." : "打开 Cornell 官方 Course Roster，保存学期页面或 API 结果；连同下方提示词交给 AI。需 NetID 才显示的教室可留空。";
    if (profile.id === "custom") return isEnglish() ? "Enter the school and term, save its official course page, and use the fixed package workflow below." : "填写学校与学期，保存官方课程页面，并按下方固定压缩包流程操作。";
    if (profile.id === "stanford") return isEnglish() ? "Open ExploreCourses, save or print the selected-term results, and use the package prompt. Do not rely on an unpublished API." : "打开 ExploreCourses，保存或打印所选学期的结果，再使用压缩包提示词；不依赖未公开 API。";
    if (profile.id === "harvard") return isEnglish() ? "Open the official HLS course source, save the term results, and use the package prompt; API access is optional." : "打开 HLS 官方课程源，保存学期结果后使用压缩包提示词；API 权限不是必需条件。";
    return isEnglish() ? "Open the official course source, save the whole term page or export, then let an AI produce the standard ZIP package." : "打开官方课程源，保存整学期页面或导出文件，再让 AI 生成标准 ZIP 压缩包。";
  }

  function schoolPresetCardHtml(profile) {
    const imported = profile.id === "cornell" || Boolean(customSchoolStore[profile.id]?.courses?.length);
    const current = profile.id === currentSchoolId;
    const statusClass = profile.sourceKind === "public-api" || profile.sourceKind === "api-available" ? "api" : profile.sourceKind === "api-key" ? "key" : "";
    const sourceText = imported && profile.id !== "cornell" ? (isEnglish() ? `${customSchoolStore[profile.id].courses.length} imported` : `已导入 ${customSchoolStore[profile.id].courses.length} 门`) : sourceLabel(profile);
    const subtitle = isEnglish() ? (profile.termLabel === "自定义学期" ? "Import profile" : (profile.termLabel || "Official data profile")) : profile.nameEn;
    return `<article class="school-preset-card ${current ? "is-current" : ""}"><div><h3>${esc(isEnglish() ? profile.nameEn : profile.nameZh)}</h3><p>${esc(subtitle)}</p></div><span class="school-source-status ${statusClass}">${esc(sourceText)}</span><p>${imported && profile.id !== "cornell" ? (isEnglish() ? "Saved locally and ready for search and scheduling." : "课程已保存在本机，可离线搜索和排课。") : esc(sourceImportInstruction(profile))}</p><div class="school-preset-actions">${profile.catalogUrl ? `<a class="secondary-button link-button" href="${esc(profile.catalogUrl)}" target="_blank" rel="noreferrer">${isEnglish() ? "Official course source" : "官方课程源"}</a>` : ""}${imported ? `<button class="${current ? "secondary-button" : "primary-button"}" data-switch-school="${profile.id}" ${current ? "disabled" : ""}>${current ? (isEnglish() ? "Current school" : "当前学校") : (isEnglish() ? "Switch" : "切换")}</button>` : `<button class="primary-button" data-configure-school="${profile.id}">${isEnglish() ? "Start guided import" : "按步骤导入"}</button>`}</div></article>`;
  }

  function sourceLabel(profile) {
    if (!isEnglish()) return profile.sourceLabel;
    const labels = {
      offline:"Verified 2026–27 Fall + Spring dataset", catalog:"Official catalog / file import", "api-available":"Official course interface (convert to JSON)", "api-key":"Official API key required", custom:"Custom API / JSON / CSV"
    };
    return labels[profile.sourceKind] || "Official data source";
  }

  function selectSchoolPresetForImport(id, scroll = true) {
    const profile = getSchoolProfile(id);
    els.importSchoolNameZh.value = profile.nameZh || "";
    els.importSchoolNameEn.value = profile.nameEn || "";
    els.importTermLabel.value = profile.termLabel === "自定义学期" ? "" : (profile.termLabel || "");
    els.importInstructionStart.value = profile.term?.instructionStart || "";
    els.importInstructionEnd.value = profile.term?.instructionEnd || "";
    els.importCatalogUrl.value = profile.catalogUrl || "";
    els.importWorkbench?.setAttribute("data-preset-id", id);
    if (id === "cornell") {
      els.importSourceType.value = "api-json";
      els.importApiUrl.value = "https://classes.cornell.edu/api/2.0/search/classes.json?roster=FA26&subject=LAW&acadCareer[]=LA&acadGroup[]=LA";
    } else {
      els.importSourceType.value = profile.sourceKind === "catalog" ? "file-package" : "api-json";
      els.importApiUrl.value = "";
      if (id === "stanford") els.importApiUrl.placeholder = "Stanford ExploreCourses 数据需转换为标准 JSON，或填写可返回 JSON 的校内接口";
      else if (id === "harvard") els.importApiUrl.placeholder = "填写 Harvard Course API 地址，并在请求头中配置 API Key";
      else els.importApiUrl.placeholder = "https://.../courses.json";
    }
    updateImportSourceFields();
    if (els.assistantImportPrompt) els.assistantImportPrompt.value = buildAssistantImportPrompt(profile);
    pendingImportedDataset = null;
    els.commitImportBtn.disabled = true;
    els.importPreviewStatus.textContent = "尚未读取数据";
    els.importPreview.innerHTML = `<div class="import-instruction"><strong>建议路径</strong><p>${esc(sourceImportInstruction(profile))}</p>${profile.catalogUrl ? `<a href="${esc(profile.catalogUrl)}" target="_blank" rel="noreferrer">打开${esc(profile.nameZh)}官方课程页面 ↗</a>` : "请在左侧填写官方课程页面。"}${profile.apiGuideUrl ? `<br><a href="${esc(profile.apiGuideUrl)}" target="_blank" rel="noreferrer">查看官方 API 指引 ↗</a>` : ""}</div>`;
    if (scroll) document.getElementById("importWorkbench")?.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  function switchSchool(id) {
    if (id !== "cornell" && !customSchoolStore[id]?.courses?.length) return selectSchoolPresetForImport(id);
    activateSchool(id);
  }

  function activateSchool(id, options = {}) {
    if (id !== "cornell" && !customSchoolStore[id]?.courses?.length) return selectSchoolPresetForImport(id);
    saveState();
    currentSchoolId = id;
    try { localStorage.setItem("llm-course-planner-current-school", id); }
    catch { showToast(isEnglish() ? "The browser blocked local storage; the selected school may not persist after reopening." : "浏览器阻止了本地存储；重新打开后可能无法保留当前学校。", true); }
    currentSchoolProfile = getSchoolProfile(id);
    if (id !== "cornell") setFilterValues(els.termFilter, []);
    TERM = { ...DEFAULT_TERM, ...(currentSchoolProfile.term || {}) };
    NO_CLASS_DATES = new Set(currentSchoolProfile.noClassDates || []);
    SPECIAL_SCHEDULE_DAYS = { ...(currentSchoolProfile.specialScheduleDays || {}) };
    courses = id === "cornell" ? (generated.length ? generated : bundledCornellCourses()) : (customSchoolStore[id]?.courses || []);
    courses = courses.map(course => ({ ...course, schoolId:course.schoolId || id }));
    state = loadState();
    applyLocalCourseEdits();
    ensureIalsSelected();
    pendingImportedDataset = null;
    pendingAddRequest = null;
    currentDetailCourseId = null;
    selectedDetailSectionId = null;
    closeDrawer();
    closeSectionPicker();
    closeConflictDialog();
    renderSchoolIdentity();
    renderLocalDataStatus();
    renderAll();
    if (options.view) switchView(options.view);
    if (!options.silent) showToast(`已切换到 ${currentSchoolProfile.nameZh}`);
  }

  function updateImportSourceFields() {
    const type = els.importSourceType?.value || "api-json";
    if (els.remoteApiFields) els.remoteApiFields.hidden = type !== "api-json";
    if (els.fileImportFields) els.fileImportFields.hidden = !["file-package","file-json","file-csv"].includes(type);
    if (els.pasteImportFields) els.pasteImportFields.hidden = type !== "paste-json";
    if (els.fetchImportBtn) els.fetchImportBtn.textContent = isEnglish() ? "Read and preview" : "读取并预览";
  }

  async function previewImportSource() {
    const button = els.fetchImportBtn;
    button.disabled = true;
    button.textContent = "正在读取…";
    pendingImportedDataset = null;
    els.commitImportBtn.disabled = true;
    try {
      const sourceType = els.importSourceType.value;
      let payload;
      if (sourceType === "api-json") {
        const url = els.importApiUrl.value.trim();
        if (!url) throw new Error("请填写 API 地址");
        let headers = {};
        if (els.importApiHeaders.value.trim()) headers = JSON.parse(els.importApiHeaders.value);
        const response = await fetch("/api/fetch-source", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ url, headers }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "API 读取失败");
        payload = JSON.parse(result.text);
      } else if (["file-package","file-json","file-csv"].includes(sourceType)) {
        const file = els.importFileInput.files?.[0];
        if (!file) throw new Error("请选择文件");
        if (sourceType === "file-package") {
          const response = await fetch("/api/inspect-import-zip", { method:"POST", headers:{"Content-Type":"application/zip"}, body:file });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "压缩包读取失败");
          payload = payloadFromArchiveEntries(result.entries || []);
        } else {
          const text = await file.text();
          payload = sourceType === "file-csv" ? parseCsvToObjects(text) : JSON.parse(text);
        }
      } else {
        const text = els.importPasteText.value.trim();
        if (!text) throw new Error("请粘贴 JSON");
        payload = JSON.parse(text);
      }
      let mapping = {};
      if (els.importFieldMapping.value.trim()) mapping = JSON.parse(els.importFieldMapping.value);
      const profile = buildImportProfile();
      let normalized = normalizeImportedPayload(payload, profile, mapping);
      if (!normalized.courses.length) throw new Error("未识别到课程数组。请使用标准模板，或填写字段映射。")
      const invalid = normalized.courses.filter(course => !validateImportedCourse(course));
      const accepted = normalized.courses.filter(course => validateImportedCourse(course));
      const untranslated = accepted.filter(course => !isChineseCourseForImport(course));
      const missingTimes = accepted.filter(course => !(course.sections || []).some(section => (section.meetings || []).length));
      pendingImportReport = { sourceRecords:normalized.courses.length, accepted:accepted.length, rejected:invalid.length, untranslated:untranslated.length, missingTimes:missingTimes.length, rejectedItems:invalid.slice(0,12).map(course => ({ code:course.code || "（无课程代号）", reason:!course.code ? "缺少课程代号" : "缺少中英文课程名称" })) };
      pendingImportedDataset = { profile:normalized.profile, courses:accepted };
      renderImportPreview(accepted, invalid, untranslated, pendingImportReport);
      els.commitImportBtn.disabled = accepted.length === 0;
      els.importPreviewStatus.textContent = isEnglish() ? `${accepted.length} ready; ${invalid.length} skipped; ${untranslated.length} without Chinese fields.` : `可导入 ${accepted.length} 门；跳过 ${invalid.length} 门；${untranslated.length} 门缺少中文字段。`;
    } catch (error) {
      els.importPreviewStatus.textContent = "读取失败";
      els.importPreview.innerHTML = `<div class="import-preview-warning">${esc(error.message)}</div>`;
      showToast(`导入预览失败：${error.message}`, true);
    } finally {
      button.disabled = false;
      button.textContent = isEnglish() ? "Read and preview" : "读取并预览";
    }
  }

  function payloadFromArchiveEntries(entries) {
    const courses = []; let school = null; const ignored = [];
    for (const entry of entries) {
      try {
        const payload = /\.csv$/i.test(entry.name) ? parseCsvToObjects(entry.text) : JSON.parse(entry.text);
        if (payload?.school && !school) school = payload.school;
        const sourceCourses = Array.isArray(payload) ? payload : Array.isArray(payload?.courses) ? payload.courses : [];
        if (sourceCourses.length) courses.push(...sourceCourses); else ignored.push(entry.name);
      } catch { ignored.push(entry.name); }
    }
    if (!courses.length) throw new Error(`压缩包中没有可识别的 courses 数组或 CSV 课程记录${ignored.length ? `；无法使用：${ignored.join("、")}` : ""}`);
    return { school:school || {}, courses, importArchive:{ entries:entries.map(entry => entry.name), ignored } };
  }

  function buildImportProfile() {
    const presetId = els.importWorkbench?.getAttribute("data-preset-id") || "custom";
    const base = SCHOOL_PRESETS.find(item => item.id === presetId) || {};
    const nameZh = els.importSchoolNameZh.value.trim() || base.nameZh || "自定义法学院";
    const id = presetId !== "custom" ? presetId : slugify(els.importSchoolNameEn.value || nameZh);
    return {
      ...base, importPresetId:presetId, id, nameZh, nameEn:els.importSchoolNameEn.value.trim() || base.nameEn || nameZh,
      shortZh:base.shortZh || nameZh.replace(/法学院|大学法律中心/g, ""), termLabel:els.importTermLabel.value.trim() || "自定义学期",
      catalogUrl:els.importCatalogUrl.value.trim() || base.catalogUrl || "", sourceKind:"imported", sourceLabel:"本地导入课程库",
      term:{ orientationStart:els.importInstructionStart.value || els.importInstructionEnd.value || DEFAULT_TERM.instructionStart, instructionStart:els.importInstructionStart.value || DEFAULT_TERM.instructionStart, instructionEnd:els.importInstructionEnd.value || DEFAULT_TERM.instructionEnd, examEnd:els.importInstructionEnd.value || DEFAULT_TERM.examEnd },
      noClassDates:[], specialScheduleDays:{}, autoEnrollCodes:[], degreeCreditTarget:Number(base.degreeCreditTarget || 0), degreeCreditLabel:base.degreeCreditLabel || `${nameZh} LL.M. 学位学分`, degreeExcludeCodes:[]
    };
  }

  function normalizeImportedPayload(payload, profile, mapping = {}) {
    if (payload?.school && payload?.courses) {
      const payloadId = slugify(payload.school.id || payload.school.nameEn || payload.school.nameZh || profile.id);
      const resolvedId = profile.importPresetId === "custom" ? payloadId : profile.id;
      profile = { ...profile, ...payload.school, id:resolvedId || profile.id };
    }
    delete profile.importPresetId;
    let rawCourses;
    if (Array.isArray(payload)) rawCourses = payload;
    else rawCourses = getByPath(payload, mapping.courses || "courses") || payload?.data?.classes || payload?.classes || payload?.results || [];
    if (!Array.isArray(rawCourses)) rawCourses = [];
    const normalized = rawCourses.map((raw, index) => normalizeImportedCourse(raw, profile, mapping, index)).filter(Boolean);
    return { profile, courses:normalized };
  }

  function normalizeImportedCourse(raw, profile, mapping, index) {
    const value = (field, aliases = []) => {
      if (mapping[field]) return getByPath(raw, mapping[field]);
      for (const alias of aliases) {
        const found = getByPath(raw, alias);
        if (found !== undefined && found !== null && found !== "") return found;
      }
      return undefined;
    };
    const code = String(value("code", ["code","courseCode","course_code","courseNumber","course_number","catalogNumber","number","id"]) || "").trim();
    const titleValue = value("title", ["titleZh","title","courseTitle","course_title","name"]);
    const descriptionValue = value("description", ["descriptionZh","description","courseDescription","course_description","summary"]);
    const titleZh = String(value("titleZh", ["titleZh","title_zh"]) || (/[\u3400-\u9fff]/.test(String(titleValue || "")) ? titleValue : "")).trim();
    const titleEn = String(value("titleEn", ["titleEn","title_en"]) || (titleZh ? "" : titleValue || "")).trim();
    const descriptionZh = String(value("descriptionZh", ["descriptionZh","description_zh"]) || (/[\u3400-\u9fff]/.test(String(descriptionValue || "")) ? descriptionValue : "")).trim();
    const descriptionEn = String(value("descriptionEn", ["descriptionEn","description_en"]) || (descriptionZh ? "" : descriptionValue || "")).trim();
    const credits = Number(value("credits", ["credits","units","creditHours","credit_hours","unitsMaximum","credit"]) || 0);
    const grading = String(value("grading", ["grading","gradingBasis","grading_basis","gradeMode"]) || "未公布");
    const restrictionRaw = String(value("restriction", ["restriction","enrollmentNotes","enrollment_notes"]) || "").trim();
    const prerequisiteRaw = String(value("prerequisites", ["prerequisites","prerequisite","catalogPrereq"]) || "").trim();
    const explicitRestrictionZh = String(value("restrictionZh", ["restrictionZh","restriction_zh"]) || "").trim();
    const explicitPrerequisiteZh = String(value("prerequisitesZh", ["prerequisitesZh","prerequisites_zh"]) || "").trim();
    const explicitGradingZh = String(value("gradingZh", ["gradingZh","grading_zh"]) || "").trim();
    const instructors = toArray(value("instructors", ["instructors","faculty","professors","teacher","instructor"])).flatMap(item => typeof item === "object" ? [item.name || [item.firstName,item.lastName].filter(Boolean).join(" ")] : String(item).split(/[,;|]/)).map(item => String(item).trim()).filter(Boolean);
    const rawSections = toArray(value("sections", ["sections","classSections","classes","offerings"]));
    const sections = rawSections.length ? rawSections.map((section, sectionIndex) => normalizeImportedSection(section, raw, profile, mapping, code, sectionIndex)).filter(Boolean) : [normalizeImportedSection(raw, raw, profile, mapping, code, 0)];
    const barRaw = String(value("barStatus", ["barStatus","nyBarStatus","ny_bar_status"]) || "review").toLowerCase();
    const barClassroomEligible = ["eligible","yes","true","计入"].some(item => barRaw.includes(item)) ? true : ["ineligible","no","false","不计"].some(item => barRaw.includes(item)) ? false : null;
    const barPrimaryRaw = String(value("barPrimary", ["barPrimary","barCategory","nyBarCategory","ny_bar_category"]) || "").toLowerCase();
    const validPrimary = ["professional","writing","american","core"].includes(barPrimaryRaw) ? barPrimaryRaw : null;
    const eligibilityRaw = String(value("eligibility", ["eligibility","enrollmentStatus","enrollment_status"]) || "open").toLowerCase();
    const eligibility = ["automatic","open","application","permission","restricted"].includes(eligibilityRaw) ? eligibilityRaw : "open";
    const course = {
      id:`${profile.id}-${slugify(code)}-${index}`, schoolId:profile.id, code, catalogNbr:code.replace(/^\D+/, ""), titleZh, titleEn,
      descriptionZh, descriptionEn, credits, grading, gradingZh:explicitGradingZh || translateGradingLocal(grading), instructors:[...new Set(instructors)],
      sections, campusZh:String(value("campusZh", ["campusZh","campus"]) || profile.nameZh), location:sections.find(section => section.location)?.location || "",
      locationStatus:sections.some(section => section.location) ? "published" : "unpublished", barPrimary:validPrimary, barClassroomEligible,
      degreeRequired:Boolean(value("degreeRequired", ["degreeRequired","degree_required"])), llmSpecific:Boolean(value("llmSpecific", ["llmSpecific","llm_specific"])), eligibility,
      restriction:restrictionRaw, prerequisites:prerequisiteRaw,
      restrictionZh:explicitRestrictionZh || (/[\u3400-\u9fff]/.test(restrictionRaw) ? restrictionRaw : (restrictionRaw ? "选课限制尚未汉化" : "无明确选课限制")),
      prerequisitesZh:explicitPrerequisiteZh || (/[\u3400-\u9fff]/.test(prerequisiteRaw) ? prerequisiteRaw : (prerequisiteRaw ? "先修要求尚未汉化" : "无明确先修信息")),
      restrictionTranslationComplete:!restrictionRaw || Boolean(explicitRestrictionZh) || /[\u3400-\u9fff]/.test(restrictionRaw),
      prerequisiteTranslationComplete:!prerequisiteRaw || Boolean(explicitPrerequisiteZh) || /[\u3400-\u9fff]/.test(prerequisiteRaw),
      gradingTranslationComplete:Boolean(explicitGradingZh) || /[\u3400-\u9fff]/.test(grading) || translateGradingLocal(grading) !== grading,
      categories:toArray(value("categories", ["categories","areas","subjects"])).map(String), sourceUrl:String(value("sourceUrl", ["sourceUrl","url","courseUrl","course_url"]) || profile.catalogUrl || ""),
      component:String(value("component", ["component","type","courseType"]) || ""), translationStatus:titleZh && descriptionZh ? "verified" : "pending", recommendation:60, workload:"未评估"
    };
    course.recommendation = null;
    course.workload = inferredWorkloadLabel(course);
    return course;
  }

  function normalizeImportedSection(section, courseRaw, profile, mapping, code, index) {
    const get = (field, aliases = []) => {
      if (mapping[field]) return getByPath(section, mapping[field]);
      for (const alias of aliases) {
        const result = getByPath(section, alias);
        if (result !== undefined && result !== null && result !== "") return result;
      }
      for (const alias of aliases) {
        const result = getByPath(courseRaw, alias);
        if (result !== undefined && result !== null && result !== "") return result;
      }
      return undefined;
    };
    const days = get("days", ["days","pattern","meetingDays","meeting_days","day"]);
    const start = normalizeImportedTime(get("start", ["start","startTime","start_time","timeStart"]));
    const end = normalizeImportedTime(get("end", ["end","endTime","end_time","timeEnd"]));
    const location = String(get("location", ["location","room","facility","building","classroom"]) || "").trim();
    const meetings = start && end ? [{ pattern:normalizeDaysPattern(days), start, end, startDate:String(get("startDate", ["startDate","start_date"]) || profile.term?.instructionStart || ""), endDate:String(get("endDate", ["endDate","end_date"]) || profile.term?.instructionEnd || ""), location, locationStatus:location ? "published" : "unpublished", campusZh:profile.nameZh }] : [];
    return { id:String(get("id", ["id","sectionId","section_id"]) || `${profile.id}-${slugify(code)}-section-${index}`), label:String(get("sectionLabel", ["label","section","sectionLabel","section_label"]) || `班次 ${index+1}`), classNumber:String(get("classNumber", ["classNumber","class_number","classNbr","crn"]) || ""), meetings, instructors:[], startDate:meetings[0]?.startDate || "", endDate:meetings[0]?.endDate || "", instructionMode:String(get("instructionMode", ["instructionMode","mode","instruction_mode"]) || ""), selectionGroup:String(get("selectionGroup", ["selectionGroup","selection_group","group"]) || ""), selectionGroupLabel:String(get("selectionGroupLabel", ["selectionGroupLabel","selection_group_label","groupLabel"]) || ""), selectionRequired:get("selectionRequired", ["selectionRequired","selection_required"]) !== false, selectionMax:Number(get("selectionMax", ["selectionMax","selection_max"]) || 1), location, locationStatus:location ? "published" : "unpublished", campusZh:profile.nameZh, notes:[] };
  }

  function renderImportPreview(coursesToPreview, invalid, untranslated, report = pendingImportReport || {}) {
    const en = isEnglish();
    const reportHtml = `<div class="import-result-card"><strong>${en ? "Import result" : "导入结果"}</strong><p>${en ? `Recognized ${report.sourceRecords || 0}; ready to import ${report.accepted || 0}; skipped ${report.rejected || 0}; missing Chinese fields ${report.untranslated || 0}; no published meeting time ${report.missingTimes || 0}.` : `已识别 ${report.sourceRecords || 0} 门；可导入 ${report.accepted || 0} 门；跳过 ${report.rejected || 0} 门；缺少中文字段 ${report.untranslated || 0} 门；未提供上课时间 ${report.missingTimes || 0} 门。`}</p>${report.rejectedItems?.length ? `<ul>${report.rejectedItems.map(item => `<li>${esc(item.code)}：${esc(item.reason)}</li>`).join("")}</ul>` : ""}<small>${en ? "English-only official fields are retained. Missing Chinese text or meeting time does not block a valid course." : "英文官方字段会保留；缺少中文或时间不会阻止有效课程导入。"}</small></div>`;
    const warning = invalid.length || untranslated.length ? `<div class="import-preview-warning">${invalid.length ? (en ? `${invalid.length} record(s) were skipped because code or title is missing.` : `${invalid.length} 门因缺少课程代号或名称被跳过。`) : ""}${untranslated.length ? (en ? ` ${untranslated.length} course(s) have no Chinese fields; this is a warning only.` : ` ${untranslated.length} 门没有中文字段；仅提示，不阻止保存。`) : ""}</div>` : "";
    els.importPreview.innerHTML = `${reportHtml}${warning}<table class="import-preview-table"><thead><tr><th>${en ? "Course" : "课程"}</th><th>${en ? "Credits" : "学分"}</th><th>${en ? "Instructor" : "教师"}</th><th>${en ? "Time / location" : "时间／地点"}</th><th>NY Bar</th></tr></thead><tbody>${coursesToPreview.slice(0,100).map(course => `<tr><td><strong>${esc(course.code)}</strong><br>${esc(isEnglish() ? (course.titleEn || course.titleZh || "Untitled") : (course.titleZh || course.titleEn || "未命名"))}</td><td>${course.credits || "—"}</td><td>${esc((course.instructors || []).join(en ? ", " : "、") || (en ? "Not stated" : "未公布"))}</td><td>${esc(formatAllMeetingSummary(course))}<br>⌖ ${esc(courseLocationSummary(course))}</td><td>${esc(barStatusLabel(barStatus(course)))}</td></tr>`).join("")}</tbody></table>${coursesToPreview.length > 100 ? `<p>${en ? `Previewing 100 of ${coursesToPreview.length} courses.` : `仅预览前 100 门，共 ${coursesToPreview.length} 门。`}</p>` : ""}`;
  }

  function commitImportedDataset() {
    if (!pendingImportedDataset) return;
    const { profile, courses:importedCourses } = pendingImportedDataset;
    if (profile.id === "cornell") {
      const selectedCodes = new Set(selectedCourses().map(course => course.code));
      saveCornellImportedDataset({ profile, courses:importedCourses, updatedAt:new Date().toISOString(), sourceBuild:"user-import", bundledDatabaseVersion:BUNDLED_CORNELL_DATABASE_VERSION });
      currentSchoolId = "cornell";
      currentSchoolProfile = getSchoolProfile("cornell");
      courses = bundledCornellCourses().map(course => ({ ...course, schoolId:"cornell" }));
      state.selected = Object.fromEntries(courses.filter(course => selectedCodes.has(course.code)).map(course => [course.id, course.sections?.[0]?.id || null]));
      ensureIalsSelected(); saveState(); pendingImportedDataset = null; els.commitImportBtn.disabled = true;
      renderSchoolIdentity(); renderAll(); switchView("courses");
      showToast(isEnglish() ? `Imported ${importedCourses.length}; skipped ${pendingImportReport?.rejected || 0}; switched to Cornell.` : `已导入 ${importedCourses.length} 门，跳过 ${pendingImportReport?.rejected || 0} 门；已切换至康奈尔。`);
      return;
    }
    try {
      customSchoolStore[profile.id] = { profile, courses:importedCourses, updatedAt:new Date().toISOString() };
      saveCustomSchoolStore();
      pendingImportedDataset = null;
      els.commitImportBtn.disabled = true;
      activateSchool(profile.id, { view:"courses", silent:true });
      showToast(isEnglish() ? `Imported ${importedCourses.length}; skipped ${pendingImportReport?.rejected || 0}; switched to ${profile.nameEn || profile.nameZh}.` : `已导入 ${importedCourses.length} 门，跳过 ${pendingImportReport?.rejected || 0} 门；已切换至 ${profile.nameZh}。`);
    } catch (error) {
      showToast(`保存失败：${error.message}。课程数据可能超过浏览器本地存储容量。`, true);
    }
  }

  function downloadImportTemplates() {
    const sample = {
      school:{ id:"example-law", nameZh:"示例法学院", nameEn:"Example Law School", shortZh:"示例", termLabel:"Fall 2026", catalogUrl:"https://example.edu/law/courses", term:{ instructionStart:"2026-08-24", instructionEnd:"2026-12-03", examEnd:"2026-12-18" } },
      courses:[{ code:"LAW 6001", titleZh:"示例课程", titleEn:"Example Course", descriptionZh:"这里填写完整中文课程介绍。", descriptionEn:"Example description.", credits:3, gradingZh:"仅字母等级评分", instructors:["Professor Name"], barStatus:"review", barPrimary:null, eligibility:"open", sourceUrl:"https://example.edu/course/6001", sections:[{ id:"LAW-6001-001", label:"讲授课 001", classNumber:"12345", days:"MW", start:"10:00", end:"11:15", startDate:"2026-08-24", endDate:"2026-12-03", location:"Law Building 101" }] }]
    };
    const csv = "code,titleZh,titleEn,descriptionZh,descriptionEn,credits,gradingZh,instructors,barStatus,barPrimary,eligibility,days,start,end,startDate,endDate,location,sourceUrl\nLAW 6001,示例课程,Example Course,这里填写完整中文课程介绍。,Example description.,3,仅字母等级评分,Professor Name,review,,open,MW,10:00,11:15,2026-08-24,2026-12-03,Law Building 101,https://example.edu/course/6001\n";
    downloadBlob("llm-course-import-template.json", JSON.stringify(sample, null, 2), "application/json");
    setTimeout(() => downloadBlob("llm-course-import-template.csv", csv, "text/csv;charset=utf-8"), 250);
  }

  function downloadImportChecklist() {
    const id = els.importWorkbench?.getAttribute("data-preset-id") || "custom";
    const profile = getSchoolProfile(id);
    const name = profile.nameEn || profile.nameZh;
    const checklist = `# ${name} course-package checklist\n\n1. Open: ${profile.catalogUrl || "the school official course catalog"}\n2. Select the exact term and save the full results page as PDF, HTML, or copied source text. If the school offers a CSV/JSON export, include it unchanged.\n3. Do not attempt to bypass sign-in, API keys, or restricted rooms. Record only information visible to you.\n4. Give the saved materials and the Planner's copied AI prompt to an AI. Ask it to create a ZIP containing one or more JSON/CSV files, with no password protection.\n5. Return to Schools & Data, choose “Upload AI return package”, preview it, then save.\n\nExpected result: the Planner imports every record with a course code and title, reports skipped records, and switches to ${name}. English official fields are accepted; Chinese text may be added later.\n`;
    downloadBlob(`${slugify(name)}-course-package-checklist.md`, checklist, "text/markdown;charset=utf-8");
  }

  function downloadBlob(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updateScheduleStorageStatus(hasError = false) {
    const element = els.scheduleStorageStatus || document.getElementById("scheduleStorageStatus");
    if (!element) return;
    const importedCount = Array.isArray(state?.calendarEvents) ? state.calendarEvents.length : 0;
    if (els.clearImportedCalendarBtn) {
      els.clearImportedCalendarBtn.hidden = importedCount === 0;
      els.clearImportedCalendarBtn.textContent = isEnglish() ? `Clear ${importedCount} imported event${importedCount === 1 ? "" : "s"}` : `清除已导入的 ${importedCount} 项日程`;
    }
    const storageCopy = document.getElementById("scheduleStorageCopy");
    if (storageCopy) storageCopy.textContent = isEnglish()
      ? "Refreshing keeps your plan. Your schedule and imported personal events stay only in this browser; calendar files are processed locally and are not uploaded."
      : "刷新页面不会清空课表；课表及从日历导入的个人日程只保存在当前浏览器，日历文件仅在本机处理，不会上传。";
    element.classList.toggle("is-storage-error", hasError);
    if (hasError) {
      element.textContent = isEnglish() ? "Not saved — export the schedule to your calendar now" : "未能保存——请立即将课表导入日历";
      return;
    }
    let savedAt;
    try { savedAt = localStorage.getItem("llm-course-planner-last-saved-at"); }
    catch {
      element.classList.add("is-storage-error");
      element.textContent = isEnglish() ? "Browser storage is unavailable — use a regular window or allow site storage" : "浏览器本地存储不可用——请使用普通窗口或允许网站存储";
      return;
    }
    const count = Object.keys(state?.selected || {}).length;
    if (!savedAt) {
      element.textContent = isEnglish() ? "The first change will be saved automatically" : "首次修改后将自动保存";
      return;
    }
    const date = new Date(savedAt);
    const stamp = Number.isNaN(date.getTime()) ? "" : date.toLocaleString(isEnglish() ? "en-US" : "zh-CN", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" });
    const calendarPart = importedCount ? (isEnglish() ? ` · ${importedCount} imported event${importedCount === 1 ? "" : "s"}` : ` · ${importedCount} 项导入日程`) : "";
    element.textContent = isEnglish() ? `Saved locally${stamp ? ` · ${stamp}` : ""} · ${count} selected${calendarPart}` : `已保存到本地${stamp ? ` · ${stamp}` : ""} · 已选 ${count} 门${calendarPart}`;
  }

  function calendarImportRange() {
    return { rangeStart:TERM.orientationStart || TERM.instructionStart || "2026-01-01", rangeEnd:TERM.examEnd || TERM.instructionEnd || "2026-12-31", targetTimeZone:"America/New_York" };
  }

  async function importCalendarFiles(event) {
    const input = event.currentTarget;
    const files = [...(input.files || [])];
    input.value = "";
    if (!files.length) return;
    if (files.length > 10 || files.some(file => file.size > 10 * 1024 * 1024)) return showToast(isEnglish() ? "Choose at most 10 .ics files, each no larger than 10 MB." : "一次最多选择 10 个 .ics 文件，且每个文件不得超过 10 MB。", true);
    try {
      const imported = [];
      let skipped = 0;
      for (const file of files) {
        if (!/\.ics$/i.test(file.name) && file.type !== "text/calendar") throw new Error(isEnglish() ? `${file.name} is not an .ics calendar file.` : `${file.name} 不是 .ics 日历文件。`);
        const result = CALENDAR.parseIcs(await file.text(), calendarImportRange());
        imported.push(...result.events.map(item => ({ ...item, importedFrom:file.name })));
        skipped += Number(result.skipped || 0);
      }
      if (!imported.length) throw new Error(isEnglish() ? "No busy events were found in this term. Transparent events and dates outside the term are ignored." : "未找到本学期内的忙碌日程；透明事件和学期范围外的日期会被忽略。");
      const merged = CALENDAR.mergeEvents(state.calendarEvents || [], imported);
      state.calendarEvents = merged.events;
      saveState(); renderAll();
      const duplicateCount = imported.length - merged.added;
      const suffix = isEnglish()
        ? `${duplicateCount ? ` · ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} ignored` : ""}${skipped ? ` · ${skipped} transparent or cancelled event${skipped === 1 ? "" : "s"} skipped` : ""}`
        : `${duplicateCount ? ` · 已忽略 ${duplicateCount} 项重复日程` : ""}${skipped ? ` · 已跳过 ${skipped} 项透明或取消日程` : ""}`;
      showToast(isEnglish() ? `Imported ${merged.added} calendar event${merged.added === 1 ? "" : "s"}${suffix}.` : `已导入 ${merged.added} 项日程${suffix}。`, false);
    } catch (error) {
      showToast(`${isEnglish() ? "Calendar import failed" : "日历导入失败"}：${error.message}`, true);
    }
  }

  function clearImportedCalendar() {
    const count = state.calendarEvents?.length || 0;
    if (!count) return;
    const prompt = isEnglish() ? `Remove all ${count} imported personal calendar events? Selected courses will stay.` : `确认清除全部 ${count} 项导入的个人日程吗？已选课程不会被删除。`;
    if (!confirm(prompt)) return;
    state.calendarEvents = [];
    saveState(); renderAll();
    showToast(isEnglish() ? "Imported calendar events cleared." : "已清除导入的个人日程。", false);
  }

  function selectedScheduleOccurrences() {
    const selected = selectedCourses();
    const meetingStarts = selected.flatMap(course => (getSection(course, state.selected[course.id])?.meetings || []).map(meeting => meeting.startDate).filter(Boolean));
    const meetingEnds = selected.flatMap(course => (getSection(course, state.selected[course.id])?.meetings || []).map(meeting => meeting.endDate).filter(Boolean));
    const rangeStart = [TERM.orientationStart, TERM.instructionStart, ...meetingStarts].filter(Boolean).sort()[0];
    const rangeEnd = [TERM.instructionEnd, ...meetingEnds].filter(Boolean).sort().at(-1);
    if (!rangeStart || !rangeEnd) return [];
    const output = [];
    for (let dateValue = rangeStart, guard = 0; dateValue <= rangeEnd && guard < 400; dateValue = CALENDAR.addIsoDays(dateValue, 1), guard++) {
      const date = parseIsoDate(dateValue);
      selected.forEach(course => {
        const section = getSection(course, state.selected[course.id]);
        getScheduleMeetingsForDate(course, section, date).forEach(meeting => {
          if (!meeting.start || !meeting.end || timeToMinutes(meeting.end) <= timeToMinutes(meeting.start)) return;
          const titleEn = course.officialTitleEn || course.titleEn || "";
          const titleZh = course.titleZh || "";
          const localizedTitle = courseTitle(course);
          const bilingualTitle = titleEn && titleZh && titleEn !== titleZh ? `${localizedTitle} / ${isEnglish() ? titleZh : titleEn}` : localizedTitle;
          const locationText = meetingLocation(meeting, section, course);
          const validLocation = isPendingLocation(locationText) ? "" : locationText;
          const instructors = (section?.instructors?.length ? section.instructors : course.instructors || []).join(", ");
          const detailLines = [
            `${isEnglish() ? "Course" : "课程"}: ${course.code}`,
            section?.classNumber ? `${isEnglish() ? "Class number" : "课程班号"}: ${section.classNumber}` : "",
            instructors ? `${isEnglish() ? "Instructor" : "教师"}: ${instructors}` : "",
            `${isEnglish() ? "Credits" : "学分"}: ${course.credits || 0}`,
            course.sourceUrl || ""
          ].filter(Boolean);
          output.push({
            uid:`${slugify(currentSchoolId)}-${slugify(course.id)}-${slugify(section?.id || "section")}-${dateValue}-${String(meeting.start).replace(":", "")}@llmcornell.pages.dev`,
            title:`${course.code} · ${bilingualTitle}`,
            location:validLocation, description:detailLines.join("\n"), date:dateValue, start:meeting.start, end:meeting.end, allDay:false, courseId:course.id
          });
        });
      });
    }
    return [...new Map(output.map(item => [`${item.uid}|${item.start}|${item.end}`, item])).values()];
  }

  function calendarExportFilename() {
    const school = slugify(currentSchoolProfile.shortZh || currentSchoolProfile.nameEn || currentSchoolId || "law-school");
    const term = slugify(currentSchoolProfile.termLabel || "schedule");
    return `${school}-${term}-llm-schedule.ics`;
  }

  function buildSelectedScheduleIcs(events = pendingCalendarExportEvents) {
    return CALENDAR.buildIcs(events, {
      calendarName:`${currentSchoolProfile.nameEn || currentSchoolProfile.nameZh || "Law School"} · ${currentSchoolProfile.termLabel || "Schedule"}`,
      timeZone:"America/New_York"
    });
  }

  function openCalendarExport() {
    pendingCalendarExportEvents = selectedScheduleOccurrences();
    if (!pendingCalendarExportEvents.length) return showToast(isEnglish() ? "No selected course has a scheduled meeting to export." : "已选课程中没有可导出的上课时间。", true);
    renderCalendarExportDialog();
    els.calendarExportOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeCalendarExport() {
    if (els.calendarExportOverlay) els.calendarExportOverlay.hidden = true;
    if (!els.authorAnnouncementOverlay || els.authorAnnouncementOverlay.hidden) document.body.style.overflow = "";
  }

  function renderCalendarExportDialog() {
    const courseIds = new Set(pendingCalendarExportEvents.map(event => event.courseId));
    const text = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
    text("calendarExportTitle", isEnglish() ? "Export your schedule to a calendar" : "将课表导入日历");
    text("calendarExportIntro", isEnglish() ? "The file contains every actual class meeting, including irregular seminars and law-school no-class dates." : "文件会逐次写入实际上课日期，包括不规则研讨课，并自动避开法学院无课日。");
    text("calendarExportSummary", isEnglish() ? `${courseIds.size} selected course${courseIds.size === 1 ? "" : "s"} · ${pendingCalendarExportEvents.length} class meeting${pendingCalendarExportEvents.length === 1 ? "" : "s"}` : `${courseIds.size} 门已选课程 · ${pendingCalendarExportEvents.length} 次实际上课`);
    text("googleCalendarExportTitle", "Google Calendar");
    text("googleCalendarExportCopy", isEnglish() ? "Download the .ics file and open Google's Import & export page" : "下载 .ics 文件，并打开 Google 的“导入和导出”页面");
    text("icsCalendarExportTitle", isEnglish() ? "Apple Calendar / Outlook" : "Apple 日历／Outlook");
    text("icsCalendarExportCopy", isEnglish() ? "Download one universal .ics file; open it with your calendar app" : "下载一个通用 .ics 文件，并用系统日历打开");
    text("calendarExportPrivacy", isEnglish() ? "The file is generated on this device. The planner does not upload or store your schedule." : "文件在本机生成；本网站不会上传或存储你的课表。");
  }

  function downloadSelectedScheduleIcs() {
    if (!pendingCalendarExportEvents.length) pendingCalendarExportEvents = selectedScheduleOccurrences();
    if (!pendingCalendarExportEvents.length) return showToast(isEnglish() ? "No scheduled meetings to export." : "没有可导出的上课时间。", true);
    downloadBlob(calendarExportFilename(), buildSelectedScheduleIcs(), "text/calendar;charset=utf-8");
    showToast(isEnglish() ? "Calendar file downloaded." : "日历文件已下载。", false);
  }

  function exportCalendarForGoogle() {
    if (!pendingCalendarExportEvents.length) pendingCalendarExportEvents = selectedScheduleOccurrences();
    if (!pendingCalendarExportEvents.length) return showToast(isEnglish() ? "No scheduled meetings to export." : "没有可导出的上课时间。", true);
    window.open("https://calendar.google.com/calendar/u/0/r/settings/export", "_blank", "noopener,noreferrer");
    downloadBlob(calendarExportFilename(), buildSelectedScheduleIcs(), "text/calendar;charset=utf-8");
    showToast(isEnglish() ? "The .ics file is downloaded. Choose it on Google's Import & export page." : "已下载 .ics 文件，请在 Google 的“导入和导出”页面选择该文件。", false);
  }

  function renderAuthorAnnouncement() {
    const text = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
    text("authorAnnouncementEyebrow", isEnglish() ? "AUTHOR UPDATES" : "作者公告");
    text("authorAnnouncementTitle", isEnglish() ? "Yuan Jingxuan (袁敬轩)" : "袁敬轩");
    text("authorAnnouncementInvite", isEnglish() ? "Feel free to connect, report a bug, suggest a feature, or send updated course information. Every message helps improve the planner." : "欢迎大家扩列交流，也欢迎随时提交课程数据更新、功能建议和 bug 反馈；每一条消息都会帮助网站继续完善。");
    text("authorAnnouncementMailBtn", isEnglish() ? "Email the author" : "联系作者");
    text("authorAnnouncementHistoryTitle", isEnglish() ? "Release history" : "版本更新记录");
    const mail = document.getElementById("authorAnnouncementMailBtn");
    if (mail) mail.href = `mailto:jy2279@cornell.edu?subject=${encodeURIComponent(isEnglish() ? "LL.M. Planner feedback" : "LL.M. Planner 课程更新或功能建议")}`;
    if (els.authorAnnouncementList) els.authorAnnouncementList.innerHTML = RELEASE_NOTES.map(note => `<article class="announcement-release ${note.version === APP_VERSION ? "is-current" : ""}"><div><strong>${esc(isEnglish() ? (note.versionEn || note.version) : note.version)}</strong>${note.version === APP_VERSION ? `<span>${isEnglish() ? "Current" : "当前版本"}</span>` : ""}</div><ul>${(isEnglish() ? note.en : note.zh).map(item => `<li>${esc(item)}</li>`).join("")}</ul></article>`).join("");
  }

  function openAuthorAnnouncement() {
    renderAuthorAnnouncement();
    els.authorAnnouncementOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAuthorAnnouncement() {
    if (els.authorAnnouncementOverlay) els.authorAnnouncementOverlay.hidden = true;
    if (!els.calendarExportOverlay || els.calendarExportOverlay.hidden) document.body.style.overflow = "";
  }

  function parseCsvToObjects(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let index=0; index<text.length; index++) {
      const char = text[index];
      if (quoted) {
        if (char === '"' && text[index+1] === '"') { field += '"'; index++; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(field); field = ""; }
      else if (char === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += char;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const headers = (rows.shift() || []).map(header => header.trim());
    return rows.filter(rowValues => rowValues.some(value => value.trim())).map(rowValues => Object.fromEntries(headers.map((header, index) => [header, rowValues[index] ?? ""])));
  }

  function getByPath(object, path) {
    if (!path) return undefined;
    return String(path).split(".").filter(Boolean).reduce((value, key) => value == null ? undefined : value[key], object);
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
  }

  function normalizeDaysPattern(value) {
    if (Array.isArray(value)) value = value.join(" ");
    const text = String(value || "").toLowerCase();
    if (/^[mtwrf]+$/i.test(text.replace(/\s/g,""))) return text.replace(/\s/g,"").toUpperCase();
    const pairs = [[/mon(day)?/g,"M"],[/tue(s(day)?)?/g,"T"],[/wed(nesday)?/g,"W"],[/thu(r(s(day)?)?)?/g,"R"],[/fri(day)?/g,"F"]];
    return pairs.filter(([pattern]) => pattern.test(text)).map(([,day]) => day).join("");
  }

  function normalizeImportedTime(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^\d{1,2}:\d{2}$/.test(text)) { const [hour, minute] = text.split(":"); return `${String(Number(hour)).padStart(2,"0")}:${minute}`; }
    const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return text;
    let hour = Number(match[1]); const minute = match[2] || "00"; const period = match[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2,"0")}:${minute}`;
  }

  function translateGradingLocal(value) {
    const text = String(value || "");
    if (/satisfactory|s\/u|pass\/fail/i.test(text)) return "合格／不合格（S/U）";
    if (/letter|graded/i.test(text)) return "仅字母等级评分";
    return text || "未公布";
  }

  function validateImportedCourse(course) {
    return Boolean(course.code && (course.titleEn || course.titleZh));
  }

  function isChineseCourseForImport(course) {
    const allowed = new Set(["llm","jd","su","s","u","ai","defi","esg","ny","bar","nyle","ip","us","sec","mba","tech"]);
    const hasEnglishResidue = value => (String(value || "").match(/[A-Za-z][A-Za-z.'’/-]*/g) || []).some(word => {
      const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
      return normalized.length > 1 && !allowed.has(normalized);
    });
    return Boolean(
      /[\u3400-\u9fff]/.test(course.titleZh || "") &&
      /[\u3400-\u9fff]/.test(course.descriptionZh || "") &&
      !hasEnglishResidue(course.titleZh) && !hasEnglishResidue(course.descriptionZh) &&
      !hasEnglishResidue(course.gradingZh) && !hasEnglishResidue(course.restrictionZh) && !hasEnglishResidue(course.prerequisitesZh) &&
      course.restrictionTranslationComplete !== false && course.prerequisiteTranslationComplete !== false && course.gradingTranslationComplete !== false
    );
  }

  function estimateImportedRecommendation(course) {
    let score = 58;
    if (/s\/u|合格|pass\/fail/i.test(`${course.gradingZh} ${course.grading}`)) score += 22;
    if (Number(course.credits || 0) <= 2) score += 10;
    if (Number(course.credits || 0) >= 4) score -= 12;
    if (["restricted","application","permission"].includes(course.eligibility)) score -= 10;
    return Math.max(20, Math.min(99, score));
  }

  function slugify(value) {
    const slug = String(value || "school").toLowerCase().normalize("NFKD").replace(/[^a-z0-9\u3400-\u9fff]+/g,"-").replace(/^-|-$/g,"");
    return slug || `school-${Date.now()}`;
  }

  function renderFaq() {
    if (!els.faqList) return;
    const isCornell = currentSchoolId === "cornell";
    if (els.faqIntroEyebrow) els.faqIntroEyebrow.textContent = isCornell ? (isEnglish() ? "Cornell LL.M. guide" : "Cornell LLM 选课指南") : (isEnglish() ? "LL.M. course-planning guide" : "LLM 选课指南");
    if (els.faqIntroTitle) els.faqIntroTitle.textContent = isEnglish() ? "Understand the rules, then choose courses" : "先理解规则，再选择课程";
    if (els.faqIntroCopy) els.faqIntroCopy.textContent = isCornell
      ? (isEnglish() ? "Cornell-specific grading, NY Bar credits, enrollment, workload, and common labels are explained here with official sources." : "这里说明 Cornell 的评分、NY Bar 学分、选课流程、课程负担与常见标签，并附官方来源。")
      : (isEnglish() ? "This page explains the local import workflow, schedule planning, and how to verify your own school's course rules." : "这里说明本地导入、课表规划，以及如何核对你所在学校的课程规则。");
    const genericItems = isEnglish() ? [
      { category:"Multi-school data", question:"Why do some law schools require an import?", answer:"U.S. law schools do not share a single course-data interface. Some publish public interfaces; others require campus access, certificates, or API keys; and some publish only a catalog. This planner therefore supports standard JSON APIs and JSON/CSV imports.", sourceLabel:`Open the official ${currentSchoolProfile.nameEn || currentSchoolProfile.nameZh} course source`, sourceUrl:currentSchoolProfile.catalogUrl || "#" },
      { category:"Multi-school data", question:"Why are imported courses from other schools marked 'NY Bar eligibility to confirm' by default?", answer:"A similar course title does not necessarily meet New York Rule 520.6, and each school may publish a separate LL.M. course list. To avoid miscounting, imported courses are excluded from the 24-credit total unless the import explicitly classifies them using official guidance.", sourceLabel:"Current school's official course page", sourceUrl:currentSchoolProfile.catalogUrl || "#" },
      { category:"Schedule", question:"How do I drag a course into the schedule?", answer:"Hold a course card, recommendation card, or the course tag above My Schedule, then release it at a position in the weekly grid. The planner uses the selected section's official dates and times; it asks you to choose a section when necessary and warns about conflicts.", sourceLabel:"Planner schedule feature", sourceUrl:"#" }
    ] : [
      { category:"多校数据", question:"为什么有的法学院需要导入课程数据？", answer:"美国法学院没有统一的课程数据接口。部分学校提供公开接口，部分接口需要校内身份、证书或 API Key，另一些学校只提供官方课程目录。软件因此支持通用 JSON API 和 JSON/CSV 文件导入。", sourceLabel:`打开${currentSchoolProfile.shortZh || currentSchoolProfile.nameZh}官方课程源`, sourceUrl:currentSchoolProfile.catalogUrl || "#" },
      { category:"多校数据", question:"导入其他学校后，为什么 NY Bar 标签默认是“资格待确认”？", answer:"课程名称相似并不当然满足纽约州 Rule 520.6。不同学校还会发布针对外国法律学历 LL.M. 的课程清单。为避免误算，外校导入课程默认不进入 24 学分，除非导入文件明确标注或用户依据官方指引完成分类。", sourceLabel:"当前学校官方课程页面", sourceUrl:currentSchoolProfile.catalogUrl || "#" },
      { category:"课表", question:"如何把课程直接拖入课表？", answer:"按住课程卡片、课程推荐卡或“我的课表”上方的课程标签，拖到周课表任意位置后松开。软件不会按鼠标落点随意改课，而会读取所选班次的官方日期和时间自动落位；有多个班次时先弹出班次选择，有冲突时再弹出冲突提示。", sourceLabel:"本软件课表功能", sourceUrl:"#" }
    ];
    const sourceItems = isEnglish() ? FAQ_EN.map((item, index) => ({ ...FAQ_ITEMS[index], ...item })) : FAQ_ITEMS;
    const baseItems = isCornell ? sourceItems : [];
    const allItems = [...genericItems, ...baseItems];
    const query = (els.faqSearchInput?.value || "").trim().toLowerCase();
    const items = allItems.filter(item => !query || `${item.category} ${item.question} ${item.answer}`.toLowerCase().includes(query));
    const results = items.length ? items.map((item, index) => `<details class="faq-item" ${index === 0 && !query ? "open" : ""}>
      <summary><span class="faq-category">${esc(item.category)}</span><strong>${esc(item.question)}</strong><span class="faq-toggle">＋</span></summary>
      <div class="faq-answer"><p>${esc(item.answer)}</p>${item.sourceUrl && item.sourceUrl !== "#" ? `<a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">${esc(item.sourceLabel)} ↗</a>` : `<span>${esc(item.sourceLabel)}</span>`}</div>
    </details>`).join("") : `<div class="empty-state">${isEnglish() ? "No matching questions found." : "没有找到相关问题。"}</div>`;
    els.faqList.innerHTML = `${results}<section class="faq-author-card"><div><span class="faq-category">${isEnglish() ? "Contact" : "联系作者"}</span><h3>${isEnglish() ? "Feedback and support" : "反馈与支持"}</h3><p>${isEnglish() ? "Questions, corrections, or suggestions are welcome." : "欢迎提出问题、纠错或建议。"}</p></div><div class="faq-author-actions"><a class="secondary-button link-button" href="mailto:jy2279@cornell.edu">jy2279@cornell.edu</a><button id="faqSupportAuthorBtn" class="primary-button" type="button">${isEnglish() ? "Support author" : "支持作者"}</button></div></section>`;
    document.getElementById("faqSupportAuthorBtn")?.addEventListener("click", openSupportAuthor);
  }

  function barExplanation(c, sectionId = undefined) {
    const eligibility = barEligibility(c, sectionId === undefined ? state.selected[c.id] : sectionId);
    if (eligibility.status === "ineligible") return isEnglish() ? `Does not count toward the NY Bar 24-credit classroom total: ${eligibility.reasonEn}` : `不计入 NY Bar 24 个课堂学分：${eligibility.reasonZh}`;
    if (eligibility.status === "review") return isEnglish() ? `NY Bar eligibility requires confirmation: ${eligibility.reasonEn}` : `NY Bar 计分资格待确认：${eligibility.reasonZh}`;
    const categories = barCategories(c);
    const assigned = assignedBarCategory(c);
    if (categories.length > 1) return isEnglish() ? `Cornell lists this course in ${categories.map(barPrimaryLabel).join(" and ")}. Its credits are currently allocated once to ${barPrimaryLabel(assigned)}. If the course is selected, you can move that one-time allocation in Credit Progress; it is never counted twice.` : `Cornell 将本课列入${categories.map(barPrimaryLabel).join("和")}；目前学分仅计入${barPrimaryLabel(assigned)}。选课后可在“学分进度”调整这一唯一归类，但不会重复计入。`;
    if (assigned === "professional") return isEnglish() ? "Counts toward the NY Bar 24-credit total and the Professional Responsibility category." : "计入 NY Bar 24 学分，并用于职业责任类别。";
    if (assigned === "writing") return isEnglish() ? "Counts toward the NY Bar 24-credit total and Legal Research, Writing and Analysis." : "计入 NY Bar 24 学分，并用于法律研究、写作与分析类别。";
    if (assigned === "american") return isEnglish() ? "Counts toward the NY Bar 24-credit total and American legal system category." : "计入 NY Bar 24 学分，并用于美国法律体系类别。";
    if (assigned === "core") return isEnglish() ? "Counts toward the NY Bar 24-credit total and may be used toward the 6-credit NYLE / Bar tested-subject requirement." : "计入 NY Bar 24 学分，并可用于 NYLE / Bar 考试科目至少 6 学分的要求。";
    if (eligibility.status === "eligible") return isEnglish() ? "The selected section is an in-person Cornell Law classroom section and counts toward the NY Bar 24-credit classroom total." : "所选班次为康奈尔法学院线下课堂班次，计入 NY Bar 24 个课堂学分总数。";
    return isEnglish() ? "The selected section is an in-person Cornell Law classroom section and counts toward the NY Bar 24-credit classroom total." : "所选班次为康奈尔法学院线下课堂班次，计入 NY Bar 24 个课堂学分总数。";
  }

  function barEligibility(c, selectedSectionId = undefined) {
    const sectionId = selectedSectionId === undefined ? (state.selected[c.id] || sectionSelectionId(defaultSectionSelection(c))) : selectedSectionId;
    const combinedSection = getSection(c, sectionId);
    const sections = combinedSection?.sourceSections || (combinedSection ? [combinedSection] : []);
    const modes = sections.map(section => String(section.instructionMode || "").toLowerCase());
    const labels = sections.map(section => String(section.label || "").toLowerCase());
    const classroomKinds = sections.map(section => `${section.component || ""} ${section.componentLabel || ""} ${section.label || ""}`.toLowerCase());
    const notes = sections.flatMap(section => section.notes || []).map(note => typeof note === "string" ? note : (note.descrlong || note.text || "")).join(" ").toLowerCase();
    const isRemote = modes.some(mode => /distance|online|remote|zoom/.test(mode));
    const isIndependent = modes.some(mode => /independent/.test(mode)) || labels.some(label => /independent|directed reading|supervised writing/.test(label));
    const undergraduateOnly = /enrollment\s+limited\s+to:\s*undergraduates?|undergraduate-only/.test(notes);
    const cornellTechRestricted = /cornell tech/.test(notes) || /cornell tech/.test(String(c.registrationConsentEn || c.registrationConsentZh || "").toLowerCase());
    // Cornell's localized roster stores labels such as “讲授课001”; rely on the
    // stable component/componentLabel fields as well as the visible label.
    const classroomSection = sections.length > 0 && modes.every(mode => /in person/.test(mode)) && classroomKinds.every(kind => /lecture|seminar|discussion|讲授|研讨|讨论|\blec\b|\bsem\b|\bdis\b/.test(kind));

    if (c.barClassroomEligible === false || c.barStatus === "ineligible") return { status:"ineligible", reasonEn:"official record excludes this course or section", reasonZh:"官方记录已明确排除该课程或班次" };
    if (isRemote) return { status:"ineligible", reasonEn:"the selected section is online or distance learning", reasonZh:"所选班次为线上或远程授课" };
    if (isIndependent) return { status:"ineligible", reasonEn:"the selected section is independent study or directed work", reasonZh:"所选班次为独立研究或指导性学习" };
    if (undergraduateOnly) return { status:"ineligible", reasonEn:"the selected section is limited to undergraduates", reasonZh:"所选班次仅限本科生" };
    if (cornellTechRestricted || c.eligibility === "restricted") return { status:"review", reasonEn:"the selected section has a program or enrollment restriction", reasonZh:"所选班次存在项目或选课身份限制" };
    if (c.barClassroomEligible === true || c.barStatus === "eligible") return { status:"eligible", reasonEn:"officially classified as eligible", reasonZh:"已由官方分类为可计入" };
    if (currentSchoolId !== "cornell") return { status:"review", reasonEn:"imported schools require an explicit official NY Bar classification", reasonZh:"外校导入课程须有明确的官方 NY Bar 分类" };
    if (classroomSection) return { status:"eligible", reasonEn:"selected in-person Cornell Law classroom section", reasonZh:"所选康奈尔法学院线下课堂班次" };
    return { status:"review", reasonEn:"the selected section is not a standard in-person lecture, seminar, or discussion section", reasonZh:"所选班次不是标准的线下讲授、研讨或讨论班次" };
  }

  function barStatus(c, selectedSectionId = undefined) {
    return barEligibility(c, selectedSectionId).status;
  }

  function formatGrading(value) {
    const text = String(value || "").trim();
    const low = text.toLowerCase();
    if (!text || low === "unknown") return isEnglish() ? "Not published" : "未公布";
    if (isEnglish()) return text;
    if (low.includes("letter grades only") || low === "graded" || low.includes("letter graded")) return "仅字母等级评分";
    if (low.includes("satisfactory/unsatisfactory") || low === "s/u" || low.includes("sat/unsat")) return "合格／不合格（S/U）";
    if (low.includes("student option") || low.includes("letter or satisfactory")) return "学生可选字母等级或 S/U";
    return text.replace(/Letter grades only/gi, "仅字母等级评分").replace(/Satisfactory\/Unsatisfactory/gi, "合格／不合格（S/U）");
  }

  function instructorsHtml(list) {
    const names = (list || []).filter(Boolean);
    if (!names.length) return isEnglish() ? "TBA" : "待定";
    const generic = new Map([
      ["multiple sections", "多个班次，教师各异"],
      ["faculty", "教师待定"],
      ["staff", "教师待定"],
      ["tba", "教师待定"],
      ["to be announced", "教师待定"],
      ["multiple instructors", "多位教师"],
      ["多个班次，教师各异", "多个班次，教师各异"],
      ["教师待定", "教师待定"],
      ["待公布", "教师待定"],
      ["多位教师", "多位教师"]
    ]);
    return names.map(name => {
      const normalized = String(name).trim();
      const translated = generic.get(normalized.toLowerCase());
      if (translated) return esc(isEnglish() ? ({"多个班次，教师各异":"Multiple sections; instructors vary","教师待定":"Instructor TBA","多位教师":"Multiple instructors"}[translated] || translated) : translated);
      return esc(normalized);
    }).join(isEnglish() ? ", " : "、");
  }

  function formatSectionLabel(label) {
    const text = String(label || "");
    if (isEnglish()) return text
      .replace(/^讲授课\s*/u, "Lecture ")
      .replace(/^讨论课\s*/u, "Discussion ")
      .replace(/^研讨课\s*/u, "Seminar ")
      .replace(/^实验课\s*/u, "Lab ")
      .replace(/^诊所课\s*/u, "Clinic ")
      .replace(/^实践课\s*/u, "Practicum ")
      .replace(/^独立研究\s*/u, "Independent Study ")
      .replace(/^班次\s*/u, "Section ") || "Section";
    return String(label || "")
      .replace(/^Lecture\s*/i, "讲授课 ")
      .replace(/^Discussion\s*/i, "讨论课 ")
      .replace(/^Seminar\s*/i, "研讨课 ")
      .replace(/^Lab(?:oratory)?\s*/i, "实验课 ")
      .replace(/^Clinical?\s*/i, "诊所课 ")
      .replace(/^Field Studies\s*/i, "实践课 ")
      .replace(/^Independent Study\s*/i, "独立研究 ")
      .replace(/^Section\s*/i, "班次 ")
      .replace(/^班次\s*/u, "班次 ")
      .replace(/^Clinic\s*/i, "诊所课 ")
      .replace(/^Practicum\s*/i, "实践课 ");
  }

  function sectionIdentityHtml(section) {
    const officialSection = String(section?.section || "").trim();
    const sectionLabel = esc(formatSectionLabel(section?.label || (officialSection ? `Section ${officialSection}` : section?.id)));
    const classNumber = String(section?.classNumber || "").trim();
    return `${sectionLabel}${classNumber ? ` · ${isEnglish() ? "Class number" : "课程班号"} ${esc(classNumber)}` : ""}`;
  }

  function formatSectionGroupLabel(label) {
    const text = String(label || "");
    if (!isEnglish()) return text;
    return text
      .replace(/讲授课/gu, "Lecture")
      .replace(/讨论课/gu, "Discussion")
      .replace(/研讨课/gu, "Seminar")
      .replace(/必选一节/gu, "choose one")
      .replace(/多选一/gu, "choose one") || "Choose one section";
  }

  function englishAcademicField(raw, fallback, kind) {
    const text = String(raw || "").trim();
    if (!text) return fallback;
    if (!/[\u3400-\u9fff]/u.test(text)) return text;
    const compact = text.replace(/[：:。；;，,\s]/gu, "");
    if (kind === "restriction") {
      if (/未列明特殊选课限制/u.test(compact)) return "No special enrollment restriction stated.";
      if (/研究生及专业学位学生/u.test(compact)) return "Enrollment limited to graduate and professional students.";
      if (/法学院学生/u.test(compact)) return "Enrollment limited to Law School students.";
      if (/法学硕士|LLM学生/u.test(compact)) return "Enrollment limited to LL.M. students.";
      if (/教师许可/u.test(compact)) return "Instructor permission is required; see the official course page.";
      return "See the official course page for enrollment requirements.";
    }
    if (/无明确先修或共修要求|无/u.test(compact)) return "None stated.";
    if (/先修要求/u.test(compact)) return text.replace(/^先修要求[：:]?/u, "Prerequisite: ").replace(/应修读或同时修读/u, "must be taken before or concurrently with ");
    return "See the official course page for prerequisites.";
  }

  function localizedRestriction(course) {
    if (!isEnglish()) return course.restrictionZh || course.restriction || "无明确限制信息";
    return englishAcademicField(course.restrictionEn || course.restriction || course.restrictionZh, "Not stated.", "restriction");
  }

  function localizedPrerequisites(course) {
    if (!isEnglish()) return course.prerequisitesZh || course.prerequisites || "无明确先修信息";
    return englishAcademicField(course.prerequisitesEn || course.prerequisites || course.prerequisitesZh, "Not stated.", "prerequisite");
  }

  function handleBadgeFilterClick(event) {
    const badge = event.target.closest("[data-badge-filter]");
    if (!badge) return;
    event.preventDefault();
    event.stopPropagation();
    const value = badge.dataset.badgeFilter;
    if (["eligible","ineligible","review","mandatory","core"].includes(value)) {
      const selected = selectedFilterValues(els.barFilter);
      selected.has(value) ? selected.delete(value) : selected.add(value);
      setFilterValues(els.barFilter, selected);
      switchView("courses");
      renderCourseList();
    }
    if (["llm-specific","llm-direct"].includes(value)) {
      const filterValue = value === "llm-specific" ? "specific" : "direct";
      const selected = selectedFilterValues(els.llmFilter);
      selected.has(filterValue) ? selected.delete(filterValue) : selected.add(filterValue);
      setFilterValues(els.llmFilter, selected);
      switchView("courses");
      renderCourseList();
    }
  }

  function openTagHelp() {
    if (!els.tagHelpOverlay) return;
    els.tagHelpOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeTagHelp() {
    if (!els.tagHelpOverlay) return;
    els.tagHelpOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  function closeDrawer() { els.detailOverlay.hidden = true; document.body.style.overflow = ""; currentDetailCourseId = null; }

  function printSchedule() {
    switchView("schedule");
    window.print();
  }

  function applyLocalCourseEdits() {
    state.courseOverrides ||= {};
    state.customCourses ||= [];
    const overrides = state.courseOverrides;
    const base = courses.map(course => overrides[course.id] ? { ...course, ...overrides[course.id], locallyEdited:true } : course);
    const existing = new Set(base.map(course => course.id));
    courses = [...base, ...state.customCourses.filter(course => !existing.has(course.id)).map(course => ({ ...course, schoolId:currentSchoolId, locallyEdited:true }))];
  }

  function openCourseEditor(courseId = null) {
    const course = courseId ? courses.find(item => item.id === courseId) : null;
    const section = course ? getSection(course, state.selected[course.id]) : null;
    const meeting = section?.meetings?.[0] || null;
    els.editorCourseId.value = course?.id || "";
    els.editorCourseCode.value = course?.code || "";
    els.editorCourseCredits.value = course?.credits ?? 0;
    els.editorTitleZh.value = course?.titleZh || "";
    els.editorTitleEn.value = course?.titleEn || course?.officialTitleEn || "";
    els.editorDescriptionZh.value = course?.descriptionZh || "";
    els.editorMeetingDay.value = meeting ? (parsePattern(meeting.pattern)[0] || "") : "";
    els.editorStartTime.value = meeting?.start || "09:00";
    els.editorEndTime.value = meeting?.end || "10:00";
    els.editorLocation.value = meeting ? meetingLocation(meeting, section, course) : "";
    els.deleteCourseBtn.hidden = !state.customCourses.some(item => item.id === course?.id);
    document.getElementById("courseEditorTitle").textContent = course ? (isEnglish() ? `Edit ${course.code}` : `编辑 ${course.code}`) : (isEnglish() ? "New course or personal commitment" : "新建课程／安排");
    els.courseEditorOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeCourseEditor() {
    els.courseEditorOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  function openSupportAuthor() {
    const title = document.getElementById("supportAuthorTitle");
    const text = document.getElementById("supportAuthorText");
    const emailLabel = document.getElementById("supportEmailLabel");
    const invite = document.getElementById("supportAuthorInvite");
    const qr = document.querySelector(".support-author-qr");
    if (title) title.textContent = isEnglish() ? "Contact the author and support the project" : "联系作者与支持项目";
    if (emailLabel) emailLabel.textContent = isEnglish() ? "Email: " : "邮箱：";
    if (text) text.textContent = isEnglish() ? "LL.M. Planner is a local course-planning tool for Chinese LL.M. students, combining official course data, bilingual descriptions, NY Bar credit prompts, filters, and weekly scheduling." : "LL.M. Planner 是面向中国 LL.M. 学生的本地课程规划工具，整合官方课程数据、双语课程说明、NY Bar 学分提示、课程筛选与周课表安排。";
    if (invite) invite.textContent = isEnglish() ? "Contact the author with course-data questions, feature ideas, or feedback. If this project helps you, Alipay support for continued maintenance is welcome." : "欢迎就课程数据、功能建议或使用体验与作者联系；如本项目对你有帮助，也欢迎使用支付宝扫码支持后续维护。";
    if (qr) qr.alt = isEnglish() ? "Alipay QR code to support the project" : "支付宝支持项目二维码";
    els.supportAuthorOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeSupportAuthor() {
    els.supportAuthorOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  function saveCourseEditor(event) {
    event.preventDefault();
    const existingId = els.editorCourseId.value;
    const existing = existingId ? courses.find(course => course.id === existingId) : null;
    const code = els.editorCourseCode.value.trim().toUpperCase();
    const titleZh = els.editorTitleZh.value.trim();
    if (!code || !titleZh) return showToast(isEnglish() ? "Course code and Chinese title are required." : "请填写课程代号和中文名称。", true);
    const day = els.editorMeetingDay.value;
    const start = els.editorStartTime.value || "09:00";
    const end = els.editorEndTime.value || "10:00";
    if (day && timeToMinutes(end) <= timeToMinutes(start)) return showToast(isEnglish() ? "End time must be later than start time." : "结束时间必须晚于开始时间。", true);
    const id = existing?.id || `CUSTOM-${Date.now()}`;
    const editorTerm = existing ? termProfileForCourse(existing) : (currentSchoolId === "cornell" ? CORNELL_TERM_PROFILES[activePlanningTermCode()] : TERM);
    const location = cleanLocation(els.editorLocation.value);
    const originalMeeting = existing ? getSection(existing, state.selected[existing.id])?.meetings?.[0] : null;
    const scheduleChanged = !existing || day !== (originalMeeting ? parsePattern(originalMeeting.pattern)[0] || "" : "") || start !== (originalMeeting?.start || "09:00") || end !== (originalMeeting?.end || "10:00");
    let sections = existing?.sections || [];
    if (day && scheduleChanged) {
      sections = [{ id:`${id}-001`, label:isEnglish() ? "Personal schedule" : "个人安排", classNumber:"", startDate:editorTerm.instructionStart, endDate:editorTerm.instructionEnd, campusZh:currentSchoolProfile.nameZh, location, locationStatus:location ? "published" : "unpublished", meetings:[{ pattern:day, start, end, startDate:editorTerm.instructionStart, endDate:editorTerm.instructionEnd, location, locationZh:location, locationStatus:location ? "published" : "unpublished" }] }];
    } else if (day && location && sections.length) {
      sections = sections.map((section, index) => index ? section : ({ ...section, location, locationStatus:"published", meetings:(section.meetings || []).map(meeting => ({ ...meeting, location, locationZh:location, locationStatus:"published" })) }));
    } else if (!day) sections = [];
    const next = {
      ...(existing || {}), id, code, catalogNbr:code.replace(/^.*?\s/, ""), titleZh, titleEn:els.editorTitleEn.value.trim() || titleZh,
      descriptionZh:els.editorDescriptionZh.value.trim(), descriptionEn:existing?.descriptionEn || "", credits:Number(els.editorCourseCredits.value || 0), creditText:`${Number(els.editorCourseCredits.value || 0)} Credits`, sections,
      instructors:existing?.instructors || [isEnglish() ? "Personal" : "个人安排"], gradingZh:existing?.gradingZh || (isEnglish() ? "Not applicable" : "不适用"), grading:existing?.grading || "", session:existing?.session || (currentSchoolId === "cornell" ? termLabel(activePlanningTermCode()) : "Personal"), term:existing?.term || (currentSchoolId === "cornell" ? activePlanningTermCode() : "CUSTOM"), categories:existing?.categories || [isEnglish() ? "Personal" : "个人安排"], eligibility:existing?.eligibility || "open", recommendation:existing?.recommendation || 50, workload:existing?.workload || (isEnglish() ? "Custom" : "自定义"), sourceUrl:existing?.sourceUrl || "", officialDataStatus:existing?.officialDataStatus || "local-custom", locallyEdited:true, schoolId:currentSchoolId
    };
    if (state.customCourses.some(course => course.id === id)) state.customCourses = state.customCourses.map(course => course.id === id ? next : course);
    else if (existing) state.courseOverrides[id] = next;
    else state.customCourses.push(next);
    delete state.manualPlacements?.[id];
    saveState();
    if (currentSchoolId === "cornell") { courses = bundledCornellCourses().map(course => ({ ...course, schoolId:"cornell" })); applyLocalCourseEdits(); }
    else courses = (customSchoolStore[currentSchoolId]?.courses || []).map(course => ({ ...course, schoolId:currentSchoolId }));
    applyLocalCourseEdits();
    closeCourseEditor();
    renderAll();
    showToast(isEnglish() ? "Saved locally." : "已保存到本机。");
  }

  function deleteCustomCourse() {
    const id = els.editorCourseId.value;
    if (!state.customCourses.some(course => course.id === id)) return;
    state.customCourses = state.customCourses.filter(course => course.id !== id);
    delete state.selected[id];
    delete state.manualPlacements?.[id];
    saveState();
    courses = courses.filter(course => course.id !== id);
    closeCourseEditor();
    renderAll();
    showToast(isEnglish() ? "Local course deleted." : "已删除本机课程。");
  }

  function loadRecommendedPlan() {
    const profile = state.recommendationProfile || { directions:[], preferences:[] };
    if (!(profile.directions || []).length && !(profile.preferences || []).length) {
      switchView("recommendations");
      showToast(isEnglish() ? "Choose at least one direction or course preference first." : "请先选择至少一个职业方向或课程偏好。", true);
      return;
    }
    const termCourses = planningTermCourses(courses);
    const candidates = [...termCourses]
      .filter(course => course.eligibility !== "restricted" && (course.sections || []).length)
      .sort((a,b) => careerMatchScore(b) - careerMatchScore(a));
    const picked = {};
    const pickedTitles = new Set();
    let credits = 0;
    for (const code of currentSchoolProfile.autoEnrollCodes || []) {
      const course = termCourses.find(item => item.code === code);
      const section = course?.sections?.[0];
      if (course && section) {
        picked[course.id] = section.id;
        credits += Number(course.credits || 0);
        const titleKey = normalizedCourseTitle(course);
        if (titleKey) pickedTitles.add(titleKey);
      }
    }
    for (const course of candidates) {
      if (credits >= 12) break;
      const titleKey = normalizedCourseTitle(course);
      if (titleKey && pickedTitles.has(titleKey)) continue;
      const section = course.sections?.find(candidate => !importedCalendarConflicts(course, candidate).length && !Object.entries(picked).some(([courseId, sectionId]) => {
        const existing = courses.find(item => item.id === courseId);
        return existing && sectionsConflict(candidate, getSection(existing, sectionId));
      }));
      if (!section) continue;
      picked[course.id] = section.id;
      credits += Number(course.credits || 0);
      if (titleKey) pickedTitles.add(titleKey);
    }
    const retainedOtherTerms = currentSchoolId === "cornell" ? Object.fromEntries(Object.entries(state.selected).filter(([courseId]) => {
      const course = courses.find(item => item.id === courseId);
      return course && courseTermCode(course) !== activePlanningTermCode();
    })) : {};
    state.selected = { ...retainedOtherTerms, ...picked };
    saveState(); renderAll(); showToast(isEnglish() ? `Generated a ${creditCount(credits)} plan from the current career directions and preferences.` : `已按当前职业方向与偏好生成 ${credits} 学分方案`);
  }

  function clearSchedule() {
    const autoCodes = currentSchoolProfile.autoEnrollCodes || [];
    const message = autoCodes.length ? `确认清空除自动注册课程（${autoCodes.join("、")}）外的全部课程吗？` : "确认清空全部课程吗？";
    if (!confirm(message)) return;
    state.selected = {};
    ensureIalsSelected(); renderAll(); showToast("已重置课表");
  }

  function buildAssistantImportPrompt(profile) {
    const name = profile.nameEn || profile.nameZh || "the selected law school";
    const source = profile.catalogUrl || "the school’s official course catalog or roster";
    return `请把以下任务作为“法学院课程数据整理与交付”任务完成。\n\n目标学校：${name}\n官方课程源：${source}\n目标学期：${profile.termLabel || "the selected term"}\n\n【材料边界】只使用我附上的官方网页、网页打印件、HTML 源代码、CSV/JSON 导出或学校 API 返回。不得联网补充、猜测、补造课程、地点、教师、日期、学分、限制或考核方式。受登录保护而看不到的教室请留空。\n\n【先做检查】逐条提取课程。课程代号和官方英文名称缺失的记录不要放进 courses；把它们写入 import-report.txt，说明原因。可保留没有时间、地点或中文翻译的课程。对于明确写有 undergraduate only、undergraduates only、not for LL.M./JD degree credit 的课程，放入 excluded-courses.json，不得放进 courses。\n\n【输出文件】请创建一个无密码 ZIP，名称 course-import-package.zip，内部必须有：\n1. llm-course-package.json（严格 JSON，不要 Markdown）；\n2. import-report.txt（列出识别数、导入数、跳过数及每个跳过原因）；\n3. 可选的 source-notes.txt（来源 URL 与日期）。\n\nllm-course-package.json 顶层必须是：\n{\n  "school": {"id":"...","nameZh":"...","nameEn":"...","shortZh":"...","termLabel":"...","catalogUrl":"...","term":{"instructionStart":"YYYY-MM-DD","instructionEnd":"YYYY-MM-DD","examEnd":"YYYY-MM-DD"}},\n  "courses": [ ... ]\n}\n\n每门课程应尽量提供：code、titleEn、titleZh、descriptionEn、descriptionZh、credits、grading、gradingZh、instructors、restriction、restrictionZh、prerequisites、prerequisitesZh、sourceUrl、sections。\nsections 每项应尽量提供：id、label、classNumber、days（M/T/W/R/F）、start（HH:MM）、end（HH:MM）、startDate、endDate、location。\n\n【lecture + discussion 规则】若一门课要求“讲授课 + 讨论课”，请把讲授课 section 写 selectionGroup:"lecture"、selectionGroupLabel:"Required lecture"；讨论课写 selectionGroup:"discussion"、selectionGroupLabel:"Choose one discussion"。每个组 selectionRequired:true、selectionMax:1。这样软件会要求选一节 lecture，并且只允许选一节 discussion。\n\n【双语与保守原则】保留 titleEn 和 descriptionEn 的官方英文。可提供 titleZh 等中文字段，但没有可靠翻译时留空；不要为了翻译而编造。NY Bar 状态如无该校官方 LL.M. 依据，一律写 "review"。完成后只交付 ZIP 文件。`;
  }

  async function copyAssistantImportPrompt() {
    const text = els.assistantImportPrompt?.value || "";
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch { els.assistantImportPrompt?.select(); document.execCommand("copy"); }
    showToast(isEnglish() ? "Import prompt copied." : "导入提示词已复制。", false);
  }

  function toggleLanguage() {
    uiLanguage = isEnglish() ? "zh" : "en";
    try { localStorage.setItem("llm-course-planner-ui-language", uiLanguage); }
    catch { showToast(isEnglish() ? "Language changed for this session, but browser storage is blocked." : "本次已切换语言，但浏览器阻止了保存设置。", true); }
    if (currentSchoolId === "cornell") {
      courses = bundledCornellCourses().map(course => ({ ...course, schoolId:"cornell" }));
      applyLocalCourseEdits();
    }
    renderSchoolIdentity(); renderAll(); switchView(currentView);
    showToast(isEnglish() ? "English interface and English course dataset enabled." : "已切换为中文界面和中文课程数据库。", false);
  }

  function applyLanguageChrome() {
    document.documentElement.lang = isEnglish() ? "en" : "zh-CN";
    if (els.languageToggleBtn) els.languageToggleBtn.textContent = isEnglish() ? "EN / 中文" : "中文 / EN";
    renderCreatorCredit();
    const translations = new Map([["课程检索","Course Search"],["课程推荐","Recommendations"],["我的课表","My Schedule"],["学校与数据","Schools & Data"],["新生 FAQ","New Student FAQ"],["学分进度","Credit Progress"],["重置","Reset"],["标签说明","Label Guide"],["查看全部标签含义","View all label definitions"],["设置偏好并生成推荐","Set preferences"],["作者公告","Author Updates"],["课程库","Course Catalog"],["已选课程","Selected Courses"],["展开","Open"],["随机组合两个方向","Randomize two directions"],["职业方向（可多选）","Career directions (multi-select)"],["课程偏好","Course preferences"],["当前组合","Current profile"],["清空","Clear"],["生成推荐方案","Generate recommendation plan"],["按周查看课表","Weekly Schedule"],["清空课表","Clear schedule"],["打印课表","Print schedule"],["新建课程／安排","New course / commitment"],["新建课程","New course"],["跳转到日期","Go to date"],["回到正式课程第1周","Go to first instructional week"],["跳到 Fall 2026 开学周","Go to Fall 2026 opening week"],["跳到 Spring 2027 开学周","Go to Spring 2027 opening week"],["学期","Term"],["常见 T14 法学院预设","Common T14 law-school presets"],["课程数据导入","Course data import"],["复制提示词","Copy prompt"],["导入预览","Import preview"],["保存到本地并切换","Save locally and switch"],["读取并预览","Read and preview"],["全部状态","All statuses"],["推荐度优先","Recommendation score"],["课程代号","Course code"],["评分方式","Grading"],["学分","Credits"],["上课日","Meeting day"],["课程方向","Course focus"],["全部课程方向","All course focuses"],["上课形式","Course format"],["全部上课形式","All course formats"],["讲授课","Lecture"],["研讨课","Seminar"],["诊所","Clinic"],["实践课","Practicum"],["讨论课","Discussion"],["独立研究","Independent study"],["LLM 专设","LL.M. specific"],["LLM 直选课","LL.M. direct enrollment"],["快捷标签","Quick tags"],["公司／交易／金融","Corporate / transactions / finance"],["诉讼／争议解决","Litigation / dispute resolution"],["科技／数据／知识产权","Technology / data / IP"],["国际／跨境","International / cross-border"],["公法／公共利益","Public law / public interest"],["研究／理论","Research / theory"],["刑事法","Criminal law"],["实务技能","Practice skills"],["全部学分","All credits"],["0–1 学分","0–1 credits"],["1 学分及以下","1 credit or less"],["2 学分","2 credits"],["3 学分","3 credits"],["4 学分","4 credits"],["5 学分及以上","5+ credits"],["全部上课日","All meeting days"],["周一","Mon"],["周二","Tue"],["周三","Wed"],["周四","Thu"],["周五","Fri"],["学分筛选","Credit filter"],["上课日筛选","Meeting-day filter"],["排序","Sort"],["学分从低到高","Credits low to high"],["学分从高到低","Credits high to low"],["通用 LL.M. 职业方向推荐","General LL.M. career guidance"],["先选择方向，再生成组合","Choose directions, then generate a plan"],["选择一个或多个职业方向，再叠加“低负担、NY Bar、写作或实务”等偏好，系统会即时重排更适合你的课程组合。","Choose one or more career directions, then add preferences such as lower workload, NY Bar, writing, or practice skills. The planner will immediately re-rank suitable course combinations."],["中国 General LL.M. 新生指南","Guide for new Chinese General LL.M. students"],["先理解规则，再选择课程","Understand the rules before choosing courses"],["这里用中文解释评分方式、NY Bar 学分、选课流程、课程负担与常见标签。每项规则都附 Cornell 官方来源入口。","This guide explains grading, NY Bar credits, enrollment, workload, and common labels. Each rule includes an official Cornell source."],["联系作者","Contact author"],["支持作者","Support author"],["官方课程说明、NY Bar 标识与拖拽排课","Official course descriptions, NY Bar labels and drag-to-schedule"],["每门课都会显示一个 NY Bar 计分状态和一个选课权限状态。","Each course displays an NY Bar-credit status and an enrollment status."],["拖动课程卡到这里，展开后按周查看","Drag course cards here; open My Schedule for the weekly view"],["多校课程数据中心","Multi-school course data"],["康奈尔默认，其他法学院按官方数据源导入","Cornell is built in; import other schools from official data"],["康奈尔课程已经离线内置。使用其他法学院时，可按照导入向导连接学校提供的数据接口，或上传整理好的 JSON／CSV 课程文件。","Cornell data is built in for offline use. For another law school, follow the import guide to use its official data interface or upload a prepared JSON/CSV course file."],["打开当前学校官方课程页面 ↗","Open current school's official course page ↗"],["当前学校","Current school"],["门课程","courses"],["“T14”是习惯称呼，不同年份排名可能变化；这里作为常见顶尖法学院入口集合。","T14 is a customary label and rankings can change; these are common entry points for leading U.S. law schools."],["本页面由袁敬轩使用","Designed by Yuan Jingxuan with"],["设计","design"],["NYLE / Bar 考试科目","NYLE / Bar tested subjects"],["全部方式","All grading"],["评分方式筛选","Grading filter"],["NY Bar 筛选分为四个互斥状态；具体的法定类别学分在进度面板单列显示。","NY Bar filters use four mutually exclusive statuses; statutory category credits are shown separately in Credit Progress."],["自动保存在当前浏览器","Saved automatically in this browser"],["刷新页面不会清空课表；换设备、换浏览器、使用无痕窗口或清除网站数据后无法自动恢复。不同访问者不会共用课表；共用同一浏览器用户资料时则会看到同一份本地数据。","Refreshing will not erase the schedule. It will not automatically follow you to another device, browser, private window, or domain, and clearing site data removes it. Visitors do not share a plan unless they use the same browser profile."],["正在确认本地保存状态…","Checking local save status…"],["从日历导入","Import from calendar"],["导入日历","Export to calendar"]]);
    [["不计 NY Bar","Does not count toward NY Bar"],["不计入 NY Bar","Does not count toward NY Bar"],["资格待确认","School confirmation required"],["仅 S/U","S/U only"],["仅字母等级","Letter grades only"],["推荐度","Recommendation"],["学分","Credits"],["教师","Instructor"],["每周课堂时间","Weekly class time"],["作业／持续性任务","Assignments / continuous work"],["最终考核方式","Final assessment method"],["全部最终考核方式","All final assessment methods"],["期末考试","Final examination"],["期末书面作业／论文","Final written work/paper"],["期末项目","Final project"],["期末展示","Final presentation"],["其他明确的期末要求","Other stated final requirement"],["官方说明未载明最终考核方式","Final assessment method not stated"],["NY Bar 计分","NY Bar credit"],["限制与先修","Enrollment and prerequisites"],["官方页面","Official page"],["班次、时间与地点","Sections, times and locations"],["如何补充上课地点","How to add a location"],["授课地点","Teaching location"],["粘贴／修改具体地点","Paste or edit location"],["按所选班次加入课表","Add selected section"],["从课表移除","Remove from schedule"],["时间未公布或不进入普通周课表","Time not published or not shown in the weekly grid"],["本周没有上课","No meeting this week"],["无课","No class"],["全天／集中课程","Intensive sessions"],["上一步","Previous week"],["下一周 →","Next week"],["本周无时间冲突","No conflicts this week"],["课程","Courses"],["学校中文名","School name (Chinese)"],["学校英文名","School name (English)"],["学期名称","Term"],["开课日期","Instruction start"],["结课日期","Instruction end"],["官方课程页面","Official course page"],["数据源类型","Data source"],["API 地址","API URL"],["请求头（JSON，可选）","Request headers (JSON, optional)"],["字段映射（JSON，可选）","Field mapping (JSON, optional)"],["选择文件","Choose file"],["粘贴标准 JSON","Paste standard JSON"],["下载本校操作清单","Download school checklist"],["下载 JSON/CSV 模板","Download JSON/CSV templates"],["上传智能助手返回的压缩包（推荐）","Upload AI return package (recommended)"],["上传智能助手生成的 JSON","Upload AI-generated JSON"],["上传标准 CSV","Upload standard CSV"],["学校官方 JSON API","Official school JSON API"],["智能助手导入提示词","AI import prompt"],["导入结果与预览","Import result and preview"],["第一次使用：笨拙但可靠的五步导入法","First time: five reliable import steps"]].forEach(([zh,en]) => translations.set(zh,en));
    [["NY Bar 课堂学分","NY Bar classroom credit"],["需院系确认","School confirmation required"],["NYLE / Bar 考试科目","NYLE / Bar tested subjects"],["LLM 直选课","LL.M. direct enrollment"],["需院系同意","Department consent required"],["新建安排","New commitment"],["课程负担与考核","Assessment and scheduled load"],["官方课程说明","Official course description"],["中文译文","Chinese translation"],["最终考核","Final assessment"],["下方周课表与此处课程一一对应。请从“课程检索”页直接拖入或加入课程；此处用于核对和移除。","Each card corresponds to the weekly schedule below. Add or drag courses from Course Search; use this area to compare and remove them."],["暂未选择课程。请在“课程检索”页加入或直接拖入课程；选择后会在这里与下方周课表对应显示。","No course is selected yet. Add or drag courses from Course Search; selected courses will appear here alongside the weekly schedule."],["移除","Remove"],["LLM","LL.M."]].forEach(([zh,en]) => translations.set(zh,en));
    [["作者公告","Author Updates"],["从日历导入","Import from calendar"],["导入日历","Export to calendar"],["清除已导入日程","Clear imported events"]].forEach(([zh,en]) => translations.set(zh,en));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const element = node.parentElement, key = node.nodeValue.trim();
      if (element?.closest("[data-i18n-exempt]")) return;
      if (isEnglish() && translations.has(key)) { if (element) element.dataset.zhText = key; node.nodeValue = node.nodeValue.replace(key, translations.get(key)); }
      else if (!isEnglish() && element?.dataset?.zhText) node.nodeValue = node.nodeValue.replace(key, element.dataset.zhText);
    });
    const placeholderMap = { "搜索中文课程名、课程代号、教师或关键词":"Search course title, code, instructor or keyword", "筛选可拖动课程":"Filter draggable courses", "搜索 S/U、NY Bar、IALS、学分、选课……":"Search S/U, NY Bar, IALS, credits, enrollment…" };
    document.querySelectorAll("[placeholder]").forEach(el => {
      if (isEnglish() && placeholderMap[el.placeholder]) { el.dataset.zhPlaceholder = el.placeholder; el.placeholder = placeholderMap[el.placeholder]; }
      else if (!isEnglish() && el.dataset.zhPlaceholder) el.placeholder = el.dataset.zhPlaceholder;
    });
    const attributeMap = {
      "主导航":"Main navigation", "点击打开课表；也可将课程拖到这里":"Open the schedule; courses can also be dragged here",
      "清空课表":"Clear schedule", "切换学校或导入课程数据":"Switch schools or import course data", "切换中文或英文界面":"Switch Chinese or English interface",
      "课程筛选与排序":"Course filters and sorting", "NY Bar 筛选":"NY Bar filter", "评分方式筛选":"Grading filter", "学分筛选":"Credit filter",
      "上课日筛选":"Meeting-day filter", "课程方向筛选":"Course-focus filter", "上课形式筛选":"Course-format filter", "排序":"Sort",
      "清除搜索和全部筛选":"Clear search and all filters", "快捷标签筛选":"Quick-tag filters"
    };
    document.querySelectorAll("[aria-label], [title]").forEach(el => {
      for (const attribute of ["aria-label", "title"]) {
        const value = el.getAttribute(attribute);
        const dataKey = attribute === "aria-label" ? "zhAriaLabel" : "zhTitle";
        if (isEnglish() && attributeMap[value]) { el.dataset[dataKey] = value; el.setAttribute(attribute, attributeMap[value]); }
        else if (!isEnglish() && el.dataset[dataKey]) el.setAttribute(attribute, el.dataset[dataKey]);
      }
    });
    renderAuthorAnnouncement();
    renderTermSwitchDialog();
    refreshMultiSelectControls();
    if (pendingCalendarExportEvents.length) renderCalendarExportDialog();
    updateScheduleStorageStatus();
  }

  function renderCreatorCredit() {
    const prefix = document.getElementById("creatorCreditPrefix");
    const suffix = document.getElementById("creatorCreditSuffix");
    const contact = document.getElementById("creatorContactAuthor");
    const support = document.getElementById("supportAuthorBtn");
    if (prefix) prefix.textContent = isEnglish() ? "Designed by Yuan Jingxuan with" : "本页面由袁敬轩使用";
    if (suffix) suffix.textContent = isEnglish() ? "design" : "设计";
    if (contact) contact.textContent = isEnglish() ? "Contact author" : "联系作者";
    if (support) support.textContent = isEnglish() ? "Support author" : "支持作者";
  }

  async function syncCourses() {
    switchView("schools");
    selectSchoolPresetForImport(currentSchoolId, true);
    showToast(isEnglish() ? "Use the school-specific prompt to create an approved data package, then upload or paste the JSON here." : "请使用本校专属提示词生成已核对的数据包，再将 JSON 上传或粘贴到这里。", false);
  }

  function formatAllMeetingSummary(c) {
    const s = c.sections?.[0]; return formatSectionMeetings(s);
  }
  function formatSectionMeetings(s) {
    if (!s?.meetings?.length) return isEnglish() ? "Meeting time not published / not in weekly grid" : "时间未公布或不进入普通周课表";
    return s.meetings.map(formatMeetingTime).join(isEnglish() ? "; " : "；");
  }
  function formatMeetingTime(m) {
    const dates = m.startDate && m.endDate ? ` · ${formatShortDate(m.startDate)}—${formatShortDate(m.endDate)}` : "";
    return `${parsePattern(m.pattern).map(dayLabel).join(isEnglish() ? ", " : "、")} ${m.start}–${m.end}${dates}`;
  }
  function cleanLocation(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text || /^(tba|to be determined|none|unknown|n\/a)$/i.test(text)) return "";
    if (/^(ithaca|ithaca, ny|ithaca, ny \(main campus\)|cornell law school|cornell tech)$/i.test(text)) return "";
    return text;
  }
  function isPendingLocation(value) {
    const text = cleanLocation(value);
    return !text || /未公布|待公布|待定|not published|unpublished|location varies by section|班次地点不同/i.test(text);
  }
  function locationOverrideKey(section) { return section?.id || ""; }
  function manualLocation(section) {
    return cleanLocation(state.locationOverrides?.[locationOverrideKey(section)] || "");
  }
  function syncedLocation(section) {
    return cleanLocation(state.roomSyncLocations?.[locationOverrideKey(section)] || "");
  }
  function languagePreferredLocation(englishValue, chineseValue, ...fallbackValues) {
    const candidates = isEnglish()
      ? [englishValue, ...fallbackValues, chineseValue]
      : [chineseValue, englishValue, ...fallbackValues];
    for (const candidate of candidates) {
      const cleaned = cleanLocation(candidate);
      if (cleaned) return cleaned;
    }
    return "";
  }
  function meetingLocation(meeting, section, course) {
    const override = manualLocation(section);
    if (override) return localizedLocation(override);
    const synced = syncedLocation(section);
    if (synced) return localizedLocation(synced);
    const direct = languagePreferredLocation(meeting?.location, meeting?.locationZh, meeting?.facilityDescrLong, meeting?.facilityDescr, meeting?.buildingDescr, meeting?.facilityName, meeting?.room);
    if (direct) return localizedLocation(direct);
    const sectionDirect = languagePreferredLocation(section?.location, section?.locationZh);
    if (sectionDirect && !/主校区|具体教室待公布|校园/.test(sectionDirect)) return localizedLocation(sectionDirect);
    const courseDirect = languagePreferredLocation(course?.location, course?.locationZh);
    if (courseDirect && !/主校区|具体教室待公布|校园/.test(courseDirect)) return localizedLocation(courseDirect);
    if (/在线|remote|zoom/i.test(`${section?.instructionMode || ""} ${courseDirect} ${sectionDirect}`)) return isEnglish() ? "Online" : "在线授课";
    if (/协商/.test(`${courseDirect} ${sectionDirect}`)) return localizedLocation(courseDirect || sectionDirect);
    return isEnglish() ? "Teaching location not published" : "教室尚未公布";
  }
  function localizedLocation(value) {
    const text = cleanLocation(value);
    if (!isEnglish() || !text) return text;
    const exact = new Map([
      ["教室尚未公布", "Teaching location not published"], ["具体教室待公布", "Teaching location not published"],
      ["官方未公布具体地点", "Teaching location not published"], ["班次地点不同，请查看具体班次", "Location varies by section; see section details"],
      ["在线授课", "Online instruction"], ["在线同步授课", "Online synchronous instruction"],
      ["与教师协商", "Arranged with instructor"], ["与指导教师协商", "Arranged with supervising instructor"], ["与项目教师协商", "Arranged with project instructor"]
    ]);
    if (exact.has(text)) return exact.get(text);
    const englishPart = text.split(/[；;]/u).map(part => part.trim()).find(part => /[A-Za-z]/.test(part) && !/[\u3400-\u9fff]/u.test(part));
    return englishPart || text;
  }
  function sectionLocationSummary(section, course) {
    const override = manualLocation(section);
    if (override) return override;
    const synced = syncedLocation(section);
    if (synced) return synced;
    const locations = [...new Set((section?.meetings || []).map(m => meetingLocation(m, section, course)).filter(v => !isPendingLocation(v)))];
    if (locations.length) return locations.join(isEnglish() ? "; " : "；");
    return meetingLocation(null, section, course);
  }
  function courseLocationSummary(course) {
    const locations = [...new Set((course.sections || []).map(section => sectionLocationSummary(section, course)).filter(v => !isPendingLocation(v)))];
    if (!locations.length) return isEnglish() ? "Teaching location not published" : "教室尚未公布";
    return locations.length > 2 ? `${locations.slice(0,2).join(isEnglish() ? "; " : "；")}${isEnglish() ? " and more" : " 等"}` : locations.join(isEnglish() ? "; " : "；");
  }
  function sectionHasPublishedLocation(section) {
    if (manualLocation(section) || syncedLocation(section)) return true;
    const meetingPublished = (section?.meetings || []).some(m => [m?.location, m?.locationZh, m?.facilityDescrLong, m?.facilityDescr, m?.buildingDescr, m?.facilityName, m?.room].some(value => !isPendingLocation(value)));
    return meetingPublished || [section?.location, section?.locationZh].some(value => !isPendingLocation(value));
  }
  function courseHasSpecificLocation(course) {
    return (course.sections || []).some(section => sectionHasPublishedLocation(section));
  }
  function inferCampus(course) {
    const text = `${course?.campusZh || ""} ${course?.restrictionZh || course?.restriction || ""} ${course?.titleZh || ""}`.toLowerCase();
    if (currentSchoolId === "cornell") {
      if (/cornell tech|纽约市|roosevelt island/.test(text)) return "Cornell Tech（纽约市）";
      return "Ithaca 主校区";
    }
    return course?.campusZh || currentSchoolProfile.nameZh || "校区未注明";
  }
  function locationMapUrl(location) {
    const query = `${String(location || "")} ${currentSchoolProfile.nameEn || currentSchoolProfile.nameZh || ""}`.trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  function courseLocationSourceHtml(course, section) {
    const location = sectionLocationSummary(section, course);
    const sourceUrl = course.sourceUrl || currentSchoolProfile.catalogUrl || "#";
    const label = isPendingLocation(location) ? (isEnglish() ? "Open official course page to add the teaching location" : "打开官方课程页面后补充具体地点") : location;
    return `<a class="location-link" href="${esc(sourceUrl)}" target="_blank" rel="noreferrer" title="${isEnglish() ? "Open the official course page" : "打开本课程官方页面"}">${esc(label)} ↗</a>`;
  }
  function locationLinkHtml(location) {
    const text = String(location || (isEnglish() ? "Teaching location not published" : "教室尚未公布"));
    if (isPendingLocation(text)) return `<span class="location-pending">${esc(text)}</span>`;
    if (/在线授课|在线同步授课|online/i.test(text)) return `<span class="location-online">${esc(text)}</span>`;
    if (/协商/.test(text)) return `<span class="location-arranged">${esc(text)}</span>`;
    return `<a class="location-link" href="${locationMapUrl(text)}" target="_blank" rel="noreferrer" title="${isEnglish() ? "Open in map: " : "在地图中查看 "}${esc(text)}">${esc(text)} ↗</a>`;
  }
  function setManualLocation(course, section) {
    if (!section) return;
    const current = manualLocation(section);
    const value = prompt(isEnglish() ? `Paste the building and room for ${course.code} ${formatSectionLabel(section.label || section.id)} (for example, Myron Taylor Hall 184). Leave blank and confirm to remove the saved location.` : `请粘贴 ${course.code} ${formatSectionLabel(section.label || section.id)} 的教学楼和具体教室（例如 Myron Taylor Hall 184）。留空并确认可删除手动设置。`, current);
    if (value === null) return;
    state.locationOverrides ||= {};
    const cleaned = cleanLocation(value);
    if (cleaned) state.locationOverrides[locationOverrideKey(section)] = cleaned;
    else delete state.locationOverrides[locationOverrideKey(section)];
    saveState();
    renderAll();
    renderDetail(course);
    showToast(cleaned ? `已保存教室：${cleaned}` : "已删除手动教室设置");
  }
  function renderLocationAgenda(selected, weekDates) {
    if (!els.locationAgenda) return;
    const entries = [];
    weekDates.forEach((date, dayIndex) => {
      selected.forEach(course => {
        const section = getSection(course, state.selected[course.id]);
        getScheduleMeetingsForDate(course, section, date).forEach(meeting => entries.push({
          date, dayIndex, course, section, meeting,
          start: timeToMinutes(meeting.start), location: meetingLocation(meeting, section, course)
        }));
      });
    });
    entries.sort((a,b) => a.dayIndex-b.dayIndex || a.start-b.start);
    const transitions = detectTightTransitions(entries);
    if (els.travelStatus) {
      els.travelStatus.hidden = false;
      els.travelStatus.textContent = transitions.length ? (isEnglish() ? `${transitions.length} tight building transition${transitions.length > 1 ? "s" : ""}` : `${transitions.length} 处换楼时间较紧`) : (isEnglish() ? "No tight building transitions this week" : "本周相邻课程没有检测到紧张换楼安排");
      els.travelStatus.classList.toggle("has-conflict", Boolean(transitions.length));
    }
    if (!entries.length) {
      els.locationAgenda.innerHTML = `<div class="empty-state">${isEnglish() ? "No scheduled course meets this week." : "本周没有已排入课表的课程。"}</div>`;
      return;
    }
    const rows = entries.map((entry, index) => {
      const warning = transitions.some(t => t.toIndex === index);
      return `<div class="location-agenda-row ${warning ? "is-tight" : ""}"><div class="agenda-date"><strong>${dayLabel(DAY_KEYS[entry.dayIndex])}</strong><span>${entry.date.getMonth()+1}/${entry.date.getDate()}</span></div><div class="agenda-course"><strong>${esc(entry.course.code)} · ${esc(courseTitle(entry.course))}</strong><span>${entry.meeting.start}–${entry.meeting.end}</span></div><div class="agenda-location">⌖ ${locationLinkHtml(entry.location)}${warning ? `<small>${isEnglish() ? "Short interval after the prior class; confirm building distance." : "与上一节课间隔较短，请提前确认楼宇距离"}</small>` : ""}</div></div>`;
    }).join("");
    els.locationAgenda.innerHTML = `<div class="location-agenda-heading"><div><h3>${isEnglish() ? "This week's locations" : "本周上课地点清单"}</h3><p>${isEnglish() ? "Sorted by date and time; select a published location to open its map." : "按日期和时间排序；点击已公布地点可打开地图。"}</p></div></div><div class="location-agenda-list">${rows}</div>`;
  }
  function detectTightTransitions(entries) {
    const out = [];
    for (let i=1; i<entries.length; i++) {
      const prev = entries[i-1], current = entries[i];
      if (prev.dayIndex !== current.dayIndex) continue;
      const gap = current.start - timeToMinutes(prev.meeting.end);
      if (gap < 0 || gap > 15) continue;
      const a = cleanLocation(prev.location), b = cleanLocation(current.location);
      if (!a || !b || a === b || isPendingLocation(a) || isPendingLocation(b)) continue;
      out.push({ fromIndex:i-1, toIndex:i, gap });
    }
    return out;
  }
  function renderLocalDataStatus() {
    if (!els.localDataStatus) return;
    if (currentSchoolId === "cornell") {
      const scheduled = courses.reduce((sum, course) => sum + Number((course.sections || []).length), 0);
      const snapshot = cornellSpringMeta.sourceCheckedAt?.slice(0, 10) || cornellMeta.snapshotDate || "2026-08-26";
      const roomCount = Object.values(state.roomSyncLocations || {}).filter(Boolean).length;
      const roomStatus = roomCount ? (isEnglish() ? ` · ${roomCount} saved section locations` : ` · 已记录 ${roomCount} 个班次教室`) : "";
      els.localDataStatus.textContent = isEnglish()
        ? `Cornell offline course dataset: ${cornellFallCatalog.length} Fall 2026 + ${cornellSpringCatalog.length} Spring 2027 offerings · ${scheduled} sections · snapshot ${snapshot}${roomStatus} · assignments and final assessments reflect only explicit official descriptions`
        : `康奈尔离线课程库：Fall 2026 共 ${cornellFallCatalog.length} 门 + Spring 2027 共 ${cornellSpringCatalog.length} 门 · ${scheduled} 个班次 · 数据日期 ${snapshot}${roomStatus} · 作业与期末信息仅提取官方课程说明中的明示内容`;
      return;
    }
    const updatedAt = customSchoolStore[currentSchoolId]?.updatedAt;
    els.localDataStatus.textContent = isEnglish()
      ? `${currentSchoolProfile.nameEn || currentSchoolProfile.nameZh} local course dataset: ${courses.length} courses · user-imported snapshot${updatedAt ? ` · updated ${new Date(updatedAt).toLocaleString("en-US")}` : ""}`
      : `${currentSchoolProfile.nameZh}本地课程库：${courses.length} 门 · 用户导入中文快照${updatedAt ? ` · 更新于 ${new Date(updatedAt).toLocaleString("zh-CN")}` : ""}`;
  }

  function formatShortDate(value) { const d = parseIsoDate(value); return `${d.getMonth()+1}/${d.getDate()}`; }
  function parsePattern(pattern = "") { return DAY_KEYS.filter(d => pattern.includes(d)); }
  function timeToMinutes(t) { const [h,m] = String(t).split(":").map(Number); return h*60+m; }
  function minutesToTime(value) { const minutes = Math.max(0, Math.min(1440, Number(value || 0))); return minutes === 1440 ? "24:00" : `${String(Math.floor(minutes / 60)).padStart(2,"0")}:${String(minutes % 60).padStart(2,"0")}`; }
  function parseIsoDate(value) {
    const text = String(value || TERM.instructionStart);
    const normalized = /^\d{2}\/\d{2}\/\d{4}$/.test(text) ? text.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2") : text.slice(0,10);
    const [y,m,d] = normalized.split("-").map(Number);
    return new Date(y, (m || 1)-1, d || 1, 12, 0, 0, 0);
  }
  function toIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
  function addDays(date, days) { const out = new Date(date); out.setDate(out.getDate()+days); return out; }
  function startOfWeek(date) { const out = new Date(date); const day = out.getDay(); out.setDate(out.getDate() - (day === 0 ? 6 : day-1)); return out; }
  function isNoClassDate(date) { return NO_CLASS_DATES.has(toIsoDate(date)); }
  function meetingDateRangesOverlap(a, b) {
    const aStart = parseIsoDate(a.startDate || TERM.instructionStart), aEnd = parseIsoDate(a.endDate || TERM.instructionEnd);
    const bStart = parseIsoDate(b.startDate || TERM.instructionStart), bEnd = parseIsoDate(b.endDate || TERM.instructionEnd);
    return aStart <= bEnd && bStart <= aEnd;
  }
  function esc(v) { return String(v ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
  let toastTimer;
  function showToast(message, error=false) { clearTimeout(toastTimer); els.toast.textContent = message; els.toast.style.background = error ? "#a9342f" : "#222428"; els.toast.hidden = false; toastTimer = setTimeout(()=>els.toast.hidden=true, 3200); }
})();
