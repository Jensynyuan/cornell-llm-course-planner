(() => {
  "use strict";

  const DEFAULT_TIME_ZONE = "America/New_York";
  const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  function pad(value) { return String(value).padStart(2, "0"); }

  function isoDateFromParts(year, month, day) {
    return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
  }

  function parseIsoDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  function addIsoDays(value, days) {
    const date = parseIsoDate(value);
    if (!date) return "";
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return isoDateFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  function daysBetween(first, second) {
    const a = parseIsoDate(first), b = parseIsoDate(second);
    return a && b ? Math.round((b - a) / 86400000) : 0;
  }

  function monthsBetween(first, second) {
    const a = parseIsoDate(first), b = parseIsoDate(second);
    return a && b ? (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() : 0;
  }

  function weekdayCode(value) {
    const date = parseIsoDate(value);
    return date ? WEEKDAY_CODES[date.getUTCDay()] : "";
  }

  function timeToMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  function minutesToTime(value) {
    const minutes = Math.max(0, Math.min(1440, Number(value || 0)));
    if (minutes === 1440) return "24:00";
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }

  function wallMinutes(date, time) {
    const parsed = parseIsoDate(date);
    return (parsed ? parsed.getTime() / 60000 : 0) + timeToMinutes(time);
  }

  function unfoldIcs(text) {
    return String(text || "").replace(/^\uFEFF/, "").replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").replace(/\r/g, "");
  }

  function parseContentLine(line) {
    const colon = line.indexOf(":");
    if (colon < 1) return null;
    const head = line.slice(0, colon), value = line.slice(colon + 1);
    const parts = head.split(";"), name = parts.shift().toUpperCase();
    const params = {};
    parts.forEach(part => {
      const equals = part.indexOf("=");
      if (equals > 0) params[part.slice(0, equals).toUpperCase()] = part.slice(equals + 1).replace(/^"|"$/g, "");
    });
    return { name, params, value };
  }

  function unescapeIcsText(value) {
    return String(value || "").replace(/\\[nN]/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
  }

  function zoneParts(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23"
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    return { year:Number(parts.year), month:Number(parts.month), day:Number(parts.day), hour:Number(parts.hour), minute:Number(parts.minute), second:Number(parts.second) };
  }

  function wallTimeToInstant(parts, timeZone) {
    const requested = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
    let guess = requested;
    for (let index = 0; index < 3; index++) {
      const actual = zoneParts(new Date(guess), timeZone);
      const actualWall = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
      guess += requested - actualWall;
    }
    return new Date(guess);
  }

  function temporalInTargetZone(rawValue, params = {}, targetTimeZone = DEFAULT_TIME_ZONE) {
    const value = String(rawValue || "").trim();
    const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (dateOnly || String(params.VALUE || "").toUpperCase() === "DATE") {
      const match = dateOnly || value.match(/^(\d{4})(\d{2})(\d{2})/);
      if (!match) return null;
      return { date:isoDateFromParts(match[1], match[2], match[3]), time:"00:00", allDay:true };
    }
    const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i);
    if (!match) return null;
    const sourceParts = { year:Number(match[1]), month:Number(match[2]), day:Number(match[3]), hour:Number(match[4]), minute:Number(match[5]), second:Number(match[6] || 0) };
    const sourceTimeZone = params.TZID || targetTimeZone;
    if (!match[7] && sourceTimeZone === targetTimeZone) {
      return { date:isoDateFromParts(sourceParts.year, sourceParts.month, sourceParts.day), time:`${pad(sourceParts.hour)}:${pad(sourceParts.minute)}`, allDay:false };
    }
    let instant;
    try {
      instant = match[7] ? new Date(Date.UTC(sourceParts.year, sourceParts.month - 1, sourceParts.day, sourceParts.hour, sourceParts.minute, sourceParts.second)) : wallTimeToInstant(sourceParts, sourceTimeZone);
      const target = zoneParts(instant, targetTimeZone);
      return { date:isoDateFromParts(target.year, target.month, target.day), time:`${pad(target.hour)}:${pad(target.minute)}`, allDay:false };
    } catch {
      return { date:isoDateFromParts(sourceParts.year, sourceParts.month, sourceParts.day), time:`${pad(sourceParts.hour)}:${pad(sourceParts.minute)}`, allDay:false };
    }
  }

  function parseRule(value) {
    const rule = {};
    String(value || "").split(";").forEach(part => {
      const equals = part.indexOf("=");
      if (equals > 0) rule[part.slice(0, equals).toUpperCase()] = part.slice(equals + 1);
    });
    return rule;
  }

  function properties(component, name) {
    return component.properties.filter(property => property.name === name);
  }

  function firstProperty(component, name) {
    return properties(component, name)[0] || null;
  }

  function splitTemporalValues(property, targetTimeZone) {
    if (!property) return [];
    return String(property.value || "").split(",").map(value => temporalInTargetZone(value, property.params, targetTimeZone)).filter(Boolean);
  }

  function eventComponents(text) {
    const components = [];
    let current = null;
    unfoldIcs(text).split("\n").forEach(rawLine => {
      const line = rawLine.trimEnd();
      if (line.toUpperCase() === "BEGIN:VEVENT") { current = { properties:[] }; return; }
      if (line.toUpperCase() === "END:VEVENT") { if (current) components.push(current); current = null; return; }
      if (!current) return;
      const property = parseContentLine(line);
      if (property) current.properties.push(property);
    });
    return components;
  }

  function hashText(value) {
    let hash = 2166136261;
    for (const character of String(value || "")) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function candidateDates(baseDate, rule, rangeEnd) {
    const frequency = String(rule.FREQ || "").toUpperCase();
    if (!frequency) return [baseDate];
    const interval = Math.max(1, Number(rule.INTERVAL || 1));
    const countLimit = Math.max(0, Number(rule.COUNT || 0));
    const byDays = String(rule.BYDAY || "").split(",").map(value => value.replace(/^[+-]?\d+/, "").toUpperCase()).filter(value => WEEKDAY_CODES.includes(value));
    const byMonthDays = String(rule.BYMONTHDAY || "").split(",").map(Number).filter(value => Number.isFinite(value) && value > 0 && value <= 31);
    const output = [];
    let generated = 0, cursor = baseDate;
    for (let guard = 0; guard < 3700 && cursor <= rangeEnd; guard++, cursor = addIsoDays(cursor, 1)) {
      const dayDelta = daysBetween(baseDate, cursor);
      const weekDelta = Math.floor((dayDelta + WEEKDAY_CODES.indexOf(weekdayCode(baseDate))) / 7);
      const monthDelta = monthsBetween(baseDate, cursor);
      const dayOfMonth = Number(cursor.slice(8, 10));
      let matches = false;
      if (frequency === "DAILY") matches = dayDelta % interval === 0 && (!byDays.length || byDays.includes(weekdayCode(cursor)));
      else if (frequency === "WEEKLY") matches = weekDelta % interval === 0 && (byDays.length ? byDays.includes(weekdayCode(cursor)) : weekdayCode(cursor) === weekdayCode(baseDate));
      else if (frequency === "MONTHLY") matches = monthDelta % interval === 0 && (byMonthDays.length ? byMonthDays.includes(dayOfMonth) : dayOfMonth === Number(baseDate.slice(8, 10)));
      else if (frequency === "YEARLY") matches = cursor.slice(5) === baseDate.slice(5) && Number(cursor.slice(0, 4)) >= Number(baseDate.slice(0, 4)) && (Number(cursor.slice(0, 4)) - Number(baseDate.slice(0, 4))) % interval === 0;
      if (!matches) continue;
      generated++;
      if (countLimit && generated > countLimit) break;
      output.push(cursor);
      if (countLimit && generated === countLimit) break;
    }
    return output;
  }

  function splitOccurrence(base, date, startTime, durationMinutes, allDayDays = 0) {
    const pieces = [];
    if (allDayDays > 0) {
      for (let offset = 0; offset < allDayDays; offset++) pieces.push({ ...base, date:addIsoDays(date, offset), start:"00:00", end:"24:00", allDay:true });
      return pieces;
    }
    let remaining = Math.max(1, durationMinutes), cursorDate = date, cursorStart = timeToMinutes(startTime);
    for (let guard = 0; remaining > 0 && guard < 14; guard++) {
      const available = 1440 - cursorStart;
      const used = Math.min(remaining, available || 1440);
      pieces.push({ ...base, date:cursorDate, start:minutesToTime(cursorStart), end:minutesToTime(cursorStart + used), allDay:false });
      remaining -= used;
      cursorDate = addIsoDays(cursorDate, 1);
      cursorStart = 0;
    }
    return pieces;
  }

  function parseIcs(text, options = {}) {
    const targetTimeZone = options.targetTimeZone || DEFAULT_TIME_ZONE;
    const rangeStart = options.rangeStart || "1900-01-01";
    const rangeEnd = options.rangeEnd || "2100-12-31";
    const warnings = [];
    const parsed = eventComponents(text).map((component, index) => {
      const startProperty = firstProperty(component, "DTSTART"), endProperty = firstProperty(component, "DTEND");
      const start = startProperty ? temporalInTargetZone(startProperty.value, startProperty.params, targetTimeZone) : null;
      const end = endProperty ? temporalInTargetZone(endProperty.value, endProperty.params, targetTimeZone) : null;
      const uid = unescapeIcsText(firstProperty(component, "UID")?.value) || `imported-${index}-${hashText(JSON.stringify(component.properties))}`;
      const recurrenceId = splitTemporalValues(firstProperty(component, "RECURRENCE-ID"), targetTimeZone)[0] || null;
      return {
        component, uid, start, end, recurrenceId,
        title:unescapeIcsText(firstProperty(component, "SUMMARY")?.value) || "Busy",
        location:unescapeIcsText(firstProperty(component, "LOCATION")?.value),
        description:unescapeIcsText(firstProperty(component, "DESCRIPTION")?.value),
        status:String(firstProperty(component, "STATUS")?.value || "").toUpperCase(),
        transparent:String(firstProperty(component, "TRANSP")?.value || "").toUpperCase() === "TRANSPARENT",
        rule:parseRule(firstProperty(component, "RRULE")?.value)
      };
    });
    const overrideKeysByUid = new Map();
    parsed.filter(item => item.recurrenceId).forEach(item => {
      const keys = overrideKeysByUid.get(item.uid) || new Set();
      keys.add(`${item.recurrenceId.date}|${item.recurrenceId.time}`);
      overrideKeysByUid.set(item.uid, keys);
    });
    const occurrences = [];
    let skipped = 0;
    parsed.forEach(item => {
      if (!item.start || item.transparent || (item.status === "CANCELLED" && !item.recurrenceId)) { skipped++; return; }
      if (item.status === "CANCELLED") { skipped++; return; }
      const start = item.start;
      const end = item.end || (start.allDay ? { date:addIsoDays(start.date, 1), time:"00:00", allDay:true } : { date:start.date, time:minutesToTime(timeToMinutes(start.time) + 60), allDay:false });
      const durationMinutes = Math.max(1, wallMinutes(end.date, end.time) - wallMinutes(start.date, start.time));
      const allDayDays = start.allDay ? Math.max(1, daysBetween(start.date, end.date)) : 0;
      const untilRaw = item.rule.UNTIL;
      const until = untilRaw ? temporalInTargetZone(untilRaw, {}, targetTimeZone) : null;
      const recurrenceRangeEnd = [rangeEnd, until?.date || rangeEnd].sort()[0];
      const dates = item.recurrenceId ? [start.date] : candidateDates(start.date, item.rule, recurrenceRangeEnd);
      properties(item.component, "RDATE").flatMap(property => splitTemporalValues(property, targetTimeZone)).forEach(value => dates.push(value.date));
      const excluded = new Set(properties(item.component, "EXDATE").flatMap(property => splitTemporalValues(property, targetTimeZone)).map(value => `${value.date}|${value.time}`));
      const overridden = overrideKeysByUid.get(item.uid) || new Set();
      [...new Set(dates)].sort().forEach(date => {
        const occurrenceKey = `${date}|${start.time}`;
        if ((!item.recurrenceId && overridden.has(occurrenceKey)) || excluded.has(occurrenceKey)) return;
        if (date > rangeEnd || addIsoDays(date, Math.max(0, allDayDays - 1)) < rangeStart) return;
        const base = { uid:item.uid, title:item.title, location:item.location, description:item.description, source:"ics" };
        splitOccurrence(base, date, start.time, durationMinutes, allDayDays).filter(piece => piece.date >= rangeStart && piece.date <= rangeEnd).forEach(piece => {
          piece.id = `cal-${hashText(`${piece.uid}|${piece.date}|${piece.start}|${piece.end}|${piece.title}`)}`;
          occurrences.push(piece);
        });
      });
      if (!dates.length) warnings.push(`Unsupported recurrence for ${item.title}`);
    });
    const unique = [...new Map(occurrences.map(event => [`${event.uid}|${event.date}|${event.start}|${event.end}|${event.title}`, event])).values()]
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
    return { events:unique, skipped, warnings };
  }

  function escapeIcsText(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  }

  function foldIcsLine(line) {
    const encoder = new TextEncoder(), output = [];
    let current = "", currentBytes = 0, limit = 75;
    for (const character of String(line)) {
      const bytes = encoder.encode(character).length;
      if (current && currentBytes + bytes > limit) {
        output.push(current);
        current = ` ${character}`;
        currentBytes = 1 + bytes;
        limit = 75;
      } else {
        current += character;
        currentBytes += bytes;
      }
    }
    output.push(current);
    return output.join("\r\n");
  }

  function compactDate(value) { return String(value || "").replace(/-/g, ""); }
  function compactTime(value) { return String(value || "00:00").replace(":", "") + "00"; }

  function buildIcs(events, options = {}) {
    const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
    const calendarName = options.calendarName || "LL.M. Course Planner";
    const stampDate = options.now instanceof Date ? options.now : new Date();
    const stamp = stampDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "PRODID:-//LL.M. Course Planner//Calendar Export v5.25//EN",
      `X-WR-CALNAME:${escapeIcsText(calendarName)}`, `X-WR-TIMEZONE:${timeZone}`,
      "BEGIN:VTIMEZONE", `TZID:${timeZone}`, `X-LIC-LOCATION:${timeZone}`,
      "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0400", "TZNAME:EDT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0500", "TZNAME:EST", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD", "END:VTIMEZONE"
    ];
    [...events].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title)).forEach((event, index) => {
      const uid = event.uid || `planner-${hashText(`${event.date}|${event.start}|${event.title}|${index}`)}@llmcornell.pages.dev`;
      lines.push("BEGIN:VEVENT", `UID:${escapeIcsText(uid)}`, `DTSTAMP:${stamp}`, "STATUS:CONFIRMED", "TRANSP:OPAQUE");
      if (event.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`, `DTEND;VALUE=DATE:${compactDate(addIsoDays(event.date, 1))}`);
      } else {
        lines.push(`DTSTART;TZID=${timeZone}:${compactDate(event.date)}T${compactTime(event.start)}`);
        const endDate = event.end === "24:00" ? addIsoDays(event.date, 1) : event.date;
        const endTime = event.end === "24:00" ? "00:00" : event.end;
        lines.push(`DTEND;TZID=${timeZone}:${compactDate(endDate)}T${compactTime(endTime)}`);
      }
      lines.push(`SUMMARY:${escapeIcsText(event.title || "Scheduled event")}`);
      if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
      if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.map(foldIcsLine).join("\r\n") + "\r\n";
  }

  function mergeEvents(existing, incoming) {
    const merged = new Map((Array.isArray(existing) ? existing : []).map(event => [`${event.uid}|${event.date}|${event.start}|${event.end}|${event.title}`, event]));
    let added = 0;
    (Array.isArray(incoming) ? incoming : []).forEach(event => {
      const key = `${event.uid}|${event.date}|${event.start}|${event.end}|${event.title}`;
      if (!merged.has(key)) added++;
      merged.set(key, event);
    });
    return { events:[...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title)), added };
  }

  const api = { DEFAULT_TIME_ZONE, parseIcs, buildIcs, mergeEvents, addIsoDays, timeToMinutes, minutesToTime };
  if (typeof window !== "undefined") window.LLM_CALENDAR = Object.freeze(api);
  if (typeof globalThis !== "undefined" && !globalThis.LLM_CALENDAR) globalThis.LLM_CALENDAR = Object.freeze(api);
})();
