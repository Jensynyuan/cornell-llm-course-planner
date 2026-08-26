import fs from "node:fs";

const start = Number(process.argv[2] || 0);
const end = Number(process.argv[3] || 127);
const dataset = JSON.parse(fs.readFileSync(new URL("../data/cornell-law-spring-2027.en.json", import.meta.url), "utf8"));

if (process.argv[2] === "aux") {
  for (const course of dataset.courses) {
    const details = {
      additionalInformationEn:course.additionalInformationEn,
      restrictionEn:course.restrictionEn,
      prerequisitesEn:course.prerequisitesEn,
      degreeRequirementsEn:course.degreeRequirementsEn
    };
    const material = (course.additionalInformationEn || []).length || !/does not publish a separate enrollment restriction/i.test(course.restrictionEn || "") || !/does not publish a separate prerequisite/i.test(course.prerequisitesEn || "") || (course.degreeRequirementsEn || []).length;
    if (material) console.log(`\n### ${course.code}\n${JSON.stringify(details, null, 2)}`);
  }
  process.exit(0);
}

if (process.argv[2] === "formats") {
  for (const course of dataset.courses) for (const section of course.sections || []) if (section.componentStatus !== "historical-official-roster") console.log(`${course.code}\t${course.titleEn}\t${section.section}\t${section.component}\t${section.componentLabel}\t${section.courseFormat}\t${section.componentStatus}`);
  process.exit(0);
}

if (process.argv[2] === "addinfo") {
  for (const course of dataset.courses) if ((course.additionalInformationEn || []).length) console.log(`${course.code}\t${JSON.stringify(course.additionalInformationEn)}`);
  process.exit(0);
}

if (process.argv[2] === "prereqs") {
  for (const course of dataset.courses) if (!/does not publish a separate prerequisite/i.test(course.prerequisitesEn || "")) console.log(`${course.code}\t${JSON.stringify(course.prerequisitesEn)}`);
  process.exit(0);
}

if (process.argv[2] === "restrictions") {
  for (const course of dataset.courses) if (!/does not publish a separate enrollment restriction/i.test(course.restrictionEn || "")) console.log(`${course.code}\t${JSON.stringify(course.restrictionEn)}`);
  process.exit(0);
}

if (process.argv[2] === "history") {
  const wanted = new Set(process.argv.slice(3));
  for (const term of ["FA26", "SP26", "FA25", "SP25", "FA24", "SP24"]) {
    const payload = await (await fetch(`https://classes.cornell.edu/api/2.0/search/classes.json?roster=${term}&subject=LAW`)).json();
    for (const course of payload.data.classes || []) if (wanted.has(String(course.catalogNbr))) console.log(`${term}\tLAW ${course.catalogNbr}\t${JSON.stringify({ prerequisite:course.catalogPrereq, prerequisiteCorequisite:course.catalogPrereqCoreq, enrollment:course.catalogEnrollmentPriority, description:course.description })}`);
  }
  process.exit(0);
}

for (const course of dataset.courses.slice(start, end)) {
  console.log(`\n### ${course.code} | ${course.titleEn}\n${course.officialDescriptionEn}\n`);
}
