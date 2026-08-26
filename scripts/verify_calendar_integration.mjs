import assert from "node:assert/strict";

await import(new URL("../calendar-integration.js", import.meta.url));
const calendar = globalThis.LLM_CALENDAR;
assert.ok(calendar, "calendar helper should load");

const googleAppleSample = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:weekly-office-hours\r
DTSTART;TZID=America/New_York:20260824T090000\r
DTEND;TZID=America/New_York:20260824T100000\r
RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260904T235959Z\r
EXDATE;TZID=America/New_York:20260831T090000\r
SUMMARY:Office\\, Hours\r
LOCATION:Myron Taylor Hall 184\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:utc-interview\r
DTSTART:20260825T170000Z\r
DTEND:20260825T180000Z\r
SUMMARY:Interview\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:transparent-holiday\r
DTSTART;VALUE=DATE:20260827\r
DTEND;VALUE=DATE:20260828\r
SUMMARY:Reference holiday\r
TRANSP:TRANSPARENT\r
END:VEVENT\r
END:VCALENDAR\r
`;

const parsed = calendar.parseIcs(googleAppleSample, {
  rangeStart:"2026-08-24", rangeEnd:"2026-09-04", targetTimeZone:"America/New_York"
});
assert.equal(parsed.events.length, 4, "weekly recurrence, EXDATE, and UTC conversion should expand exactly");
assert.equal(parsed.events.filter(event => event.uid === "weekly-office-hours").length, 3);
assert.ok(!parsed.events.some(event => event.date === "2026-08-31"), "EXDATE should remove the occurrence");
assert.deepEqual(parsed.events.find(event => event.uid === "utc-interview"), {
  uid:"utc-interview", title:"Interview", location:"", description:"", source:"ics",
  date:"2026-08-25", start:"13:00", end:"14:00", allDay:false, id:parsed.events.find(event => event.uid === "utc-interview").id
});
assert.equal(parsed.skipped, 1, "transparent event should be skipped");

const exported = calendar.buildIcs([
  { uid:"law-6641-20260825@llmcornell.pages.dev", title:"LAW 6641 · 宪法诉讼 / Constitutional Litigation", location:"Myron Taylor Hall 184", description:"教师: Whorton\nClass 11918", date:"2026-08-25", start:"13:25", end:"14:20", allDay:false }
], { calendarName:"康奈尔 LL.M. 课表", timeZone:"America/New_York", now:new Date("2026-08-26T12:00:00Z") });

assert.ok(exported.includes("BEGIN:VCALENDAR"));
assert.ok(exported.includes("TZID:America/New_York"));
assert.ok(exported.includes("UID:law-6641-20260825@llmcornell.pages.dev"));
for (const line of exported.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, `folded ICS line exceeds 75 bytes: ${line}`);

const roundTrip = calendar.parseIcs(exported, {
  rangeStart:"2026-08-25", rangeEnd:"2026-08-25", targetTimeZone:"America/New_York"
});
assert.equal(roundTrip.events.length, 1);
assert.equal(roundTrip.events[0].title, "LAW 6641 · 宪法诉讼 / Constitutional Litigation");
assert.equal(roundTrip.events[0].location, "Myron Taylor Hall 184");
assert.equal(roundTrip.events[0].start, "13:25");
assert.equal(roundTrip.events[0].end, "14:20");

const merged = calendar.mergeEvents(roundTrip.events, roundTrip.events);
assert.equal(merged.events.length, 1, "reimport should not duplicate an event");
assert.equal(merged.added, 0, "duplicate event should report zero additions");

console.log("PASS: calendar import/export handles Google/Apple ICS recurrence, exclusions, time zones, UTF-8 folding, and duplicate imports.");
