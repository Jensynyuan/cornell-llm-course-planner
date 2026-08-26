(() => {
  const REMOTE_PATTERN = /\bonline\b|\bremote\b|\bzoom\b|distance(?:\s+learning)?|web[-\s]?based|asynchronous|synchronous\s+online|线上|远程|网络授课/i;
  const HYBRID_PATTERN = /\bhybrid\b|\bblended\b|mixed[-\s]?mode|partially\s+online|混合授课/i;
  const IN_PERSON_PATTERN = /\bin[-\s]?person\b|face[-\s]?to[-\s]?face|on[-\s]?campus|线下|面授/i;
  const UNPUBLISHED_MODE_PATTERN = /^(?:not\s+published|unpublished|unknown|tba|to\s+be\s+announced|未公布|待公布|待定)$/i;
  const INDEPENDENT_PATTERN = /independent(?:\s+study)?|directed\s+reading|supervised\s+writing|independent\s+research|独立研究|指导性学习|指导阅读/i;
  const PRACTICE_PATTERN = /\bclinic(?:al)?\b|\bpracticum\b|field\s+(?:placement|study|work)|externship|诊所|实践课|实习/i;
  const CLASSROOM_PATTERN = /\blecture\b|\bseminar\b|\bdiscussion\b|\bcolloquium\b|讲授|研讨|讨论|专题讨论/i;
  const CLASSROOM_COMPONENTS = new Set(["LEC", "SEM", "DIS", "COL"]);
  const INDEPENDENT_COMPONENTS = new Set(["IND", "DR", "DIR", "RSC"]);
  const PRACTICE_COMPONENTS = new Set(["CLN", "CLI", "PRA", "PRC", "FLD", "EXT", "LAB"]);

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function officialLocationText(section) {
    const sectionValues = [section?.location, section?.locationZh];
    const meetingValues = (section?.meetings || []).flatMap(meeting => [
      meeting?.location,
      meeting?.locationZh,
      meeting?.facilityDescrLong,
      meeting?.facilityDescr,
      meeting?.buildingDescr,
      meeting?.facilityName,
      meeting?.room
    ]);
    return [...sectionValues, ...meetingValues].map(text).filter(Boolean).join(" ");
  }

  function componentKind(section, course) {
    const code = text(section?.component).toUpperCase();
    if (INDEPENDENT_COMPONENTS.has(code)) return "independent";
    if (PRACTICE_COMPONENTS.has(code)) return "practice";
    if (CLASSROOM_COMPONENTS.has(code)) return "classroom";

    const fallback = `${text(section?.componentLabel)} ${text(section?.label)} ${text(section?.courseFormat)} ${text(course?.courseFormat)}`;
    if (INDEPENDENT_PATTERN.test(fallback)) return "independent";
    if (PRACTICE_PATTERN.test(fallback)) return "practice";
    if (CLASSROOM_PATTERN.test(fallback)) return "classroom";
    return "unknown";
  }

  function classifySection(section, course = {}) {
    const mode = text(section?.instructionMode);
    const location = officialLocationText(section);
    const kind = componentKind(section, course);

    // Only raw course/meeting fields are inspected. Browser-entered or locally
    // synchronized room overrides are deliberately outside this pure helper.
    if (REMOTE_PATTERN.test(`${mode} ${location}`)) return { status:"ineligible", code:"online-distance" };
    if (INDEPENDENT_PATTERN.test(mode) || kind === "independent") return { status:"ineligible", code:"independent-study" };
    if (kind === "practice") return { status:"review", code:"clinic-practicum" };
    if (HYBRID_PATTERN.test(mode)) return { status:"review", code:"hybrid-delivery" };
    if (IN_PERSON_PATTERN.test(mode) && kind === "classroom") return { status:"eligible", code:"in-person-classroom" };

    const modeNotPublished = !mode || UNPUBLISHED_MODE_PATTERN.test(mode);
    if (kind === "classroom" && modeNotPublished) {
      return { status:"eligible", code:"classroom-no-online-designation" };
    }
    if (kind === "classroom") return { status:"review", code:"unrecognized-delivery-mode" };
    return { status:"review", code:"unrecognized-course-format" };
  }

  function notesText(course, sections) {
    const sectionNotes = sections.flatMap(section => section?.notes || []).map(note =>
      typeof note === "string" ? note : (note?.descrlong || note?.text || "")
    );
    return [
      ...sectionNotes,
      course?.registrationConsentEn,
      course?.registrationConsentZh,
      course?.restriction,
      course?.restrictionZh
    ].map(text).filter(Boolean).join(" ").toLowerCase();
  }

  function result(status, code, reasonEn, reasonZh) {
    return { status, code, reasonEn, reasonZh };
  }

  function classifyCourse({ course = {}, sections = [], schoolId = "cornell" } = {}) {
    const selectedSections = (sections || []).filter(Boolean);
    const notes = notesText(course, selectedSections);
    const sectionResults = selectedSections.map(section => classifySection(section, course));

    if (course.barClassroomEligible === false || course.barStatus === "ineligible") {
      return result("ineligible", "official-exclusion", "official record excludes this course or section", "官方记录已明确排除该课程或班次");
    }
    if (sectionResults.some(item => item.code === "online-distance")) {
      return result("ineligible", "online-distance", "the selected section is explicitly online or distance learning", "所选班次已明确标为线上或远程授课");
    }
    if (sectionResults.some(item => item.code === "independent-study")) {
      return result("ineligible", "independent-study", "the selected section is independent study or directed work", "所选班次为独立研究或指导性学习");
    }
    if (/enrollment\s+limited\s+to:\s*undergraduates?|undergraduate-only/.test(notes)) {
      return result("ineligible", "undergraduate-only", "the selected section is limited to undergraduates", "所选班次仅限本科生");
    }
    if (/cornell\s+tech/.test(notes) || course.eligibility === "restricted") {
      return result("review", "program-restriction", "the selected section has a program or enrollment restriction", "所选班次存在项目或选课身份限制");
    }
    if (course.barClassroomEligible === true || course.barStatus === "eligible") {
      return result("eligible", "official-eligible", "officially classified as eligible", "已由官方分类为可计入");
    }
    if (schoolId !== "cornell") {
      return result("review", "external-school", "imported schools require an explicit official NY Bar classification", "外校导入课程须有明确的官方 NY Bar 分类");
    }
    if (!selectedSections.length) {
      return result("review", "missing-section", "a section must be selected before classroom credit can be determined", "须先选择班次才能判断课堂学分");
    }
    if (sectionResults.every(item => item.status === "eligible")) {
      const provisional = sectionResults.some(item => item.code === "classroom-no-online-designation");
      return provisional
        ? result("eligible", "classroom-no-online-designation", "Cornell classroom section with no online or distance-learning designation", "Cornell 课堂班次，且未标为线上或远程授课")
        : result("eligible", "in-person-classroom", "selected in-person Cornell Law classroom section", "所选康奈尔法学院线下课堂班次");
    }
    if (sectionResults.some(item => item.code === "clinic-practicum")) {
      return result("review", "clinic-practicum", "clinic, practicum, fieldwork, or laboratory credit requires school confirmation", "诊所、实践、实习或实验类学分须向学院确认");
    }
    if (sectionResults.some(item => item.code === "hybrid-delivery")) {
      return result("review", "hybrid-delivery", "hybrid delivery requires confirmation of the classroom-contact requirement", "混合授课须确认是否满足课堂面授时数要求");
    }
    if (sectionResults.some(item => item.code === "unrecognized-delivery-mode")) {
      return result("review", "unrecognized-delivery-mode", "the published delivery mode requires school confirmation", "已公布的授课方式须向学院确认");
    }
    return result("review", "unrecognized-course-format", "the selected section is not identified as a standard classroom course", "所选班次未被标识为标准课堂课程");
  }

  window.NY_BAR_ELIGIBILITY = Object.freeze({
    classifyCourse,
    classifySection,
    officialLocationText
  });
})();
