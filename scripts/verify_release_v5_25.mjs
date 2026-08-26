import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./verify_release_v5_24.mjs");
await import("./verify_calendar_integration.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const fail = message => { throw new Error(`v5.25 release check failed: ${message}`); };
const index = read("index.html"), app = read("app.js"), calendar = read("calendar-integration.js"), styles = read("styles.css");

if (!/LL\.M\. Course Planner v5\.(?:25|30)/.test(index)) fail("v5.25-or-later page version marker is missing");
if (!index.includes('<html lang="en">')) fail("new visitors must start with English document metadata");
if (!app.includes('safeLocalStorageGet("llm-course-planner-ui-language") === "zh" ? "zh" : "en"')) fail("English must be the default unless a saved Chinese choice exists");
if (!app.includes("toggleLanguage") || !index.includes('id="languageToggleBtn"')) fail("language switching must remain available");

for (const marker of ['id="calendarImportBtn"', 'id="calendarExportBtn"', 'id="calendarFileInput"', 'id="calendarExportOverlay"']) if (!index.includes(marker)) fail(`calendar UI marker missing: ${marker}`);
if (index.includes("exportPlanBackupBtn") || index.includes("restorePlanBackupBtn") || index.includes("planBackupFileInput")) fail("legacy backup buttons must be replaced by calendar actions");
if (index.indexOf("./calendar-integration.js") < 0 || index.indexOf("./calendar-integration.js") > index.indexOf("./app.js")) fail("calendar helper must load before app.js");
for (const marker of ["parseIcs", "buildIcs", "mergeEvents", "RRULE", "EXDATE", "VTIMEZONE"]) if (!calendar.includes(marker)) fail(`calendar helper marker missing: ${marker}`);
for (const marker of ["importCalendarFiles", "selectedScheduleOccurrences", "importedCalendarConflicts", "exportCalendarForGoogle", "calendarEvents"]) if (!app.includes(marker)) fail(`calendar app marker missing: ${marker}`);
if (!styles.includes(".schedule-block.is-imported-calendar") || !styles.includes(".calendar-export-options")) fail("calendar visual styles are missing");

for (const marker of ['id="authorAnnouncementBtn"', 'id="authorAnnouncementOverlay"', 'id="authorAnnouncementList"']) if (!index.includes(marker)) fail(`author announcement marker missing: ${marker}`);
if (index.includes('id="syncBtn"')) fail("top update-data button must be replaced by Author Updates");
if (!app.includes("RELEASE_NOTES") || !app.includes('en:["Added two-way calendar support')) fail("bilingual release notes are missing");
if (!app.includes("Yuan Jingxuan (袁敬轩)") || !app.includes("jy2279@cornell.edu") || !app.includes("欢迎大家扩列交流")) fail("author name, email, or invitation is missing");
if (!styles.includes(".author-announcement-dialog") || !styles.includes(".announcement-release")) fail("announcement visual styles are missing");

console.log("PASS: v5.25 defaults to English, preserves bilingual switching, publishes bilingual author updates, and supports local two-way calendar integration.");
