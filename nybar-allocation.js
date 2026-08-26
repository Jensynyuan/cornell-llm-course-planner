(() => {
  const VALID_CATEGORIES = Object.freeze(["professional", "writing", "american", "core"]);

  function categories(course) {
    const raw = Array.isArray(course?.barCategories) ? course.barCategories : [course?.barPrimary];
    return [...new Set(raw.filter(category => VALID_CATEGORIES.includes(category)))];
  }

  function assignedCategory(course, allocations = {}) {
    const available = categories(course);
    const requested = allocations && typeof allocations === "object" ? allocations[course?.id] : null;
    if (available.includes(requested)) return requested;
    if (available.includes(course?.barPrimary)) return course.barPrimary;
    return available[0] || null;
  }

  function creditsByCategory(courses, allocations = {}, isEligible = () => true) {
    const totals = Object.fromEntries(VALID_CATEGORIES.map(category => [category, 0]));
    for (const course of courses || []) {
      if (!isEligible(course)) continue;
      const category = assignedCategory(course, allocations);
      if (category) totals[category] += Number(course?.credits || 0);
    }
    return totals;
  }

  window.NY_BAR_ALLOCATION = Object.freeze({ VALID_CATEGORIES, categories, assignedCategory, creditsByCategory });
})();
