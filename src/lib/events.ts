import type { UpdateEvent } from "@/content/schema";

/**
 * Event helpers. All event dates/times are India time (Asia/Kolkata), the
 * timezone mini-golf events on this site are held in. Pure functions: safe on
 * the server and in the browser.
 */
export const EVENT_TZ = "Asia/Kolkata";
const DEFAULT_DURATION_H = 3;

/** Today's date in India as YYYY-MM-DD. */
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export type EventStatus = { kind: "upcoming"; days: number } | { kind: "today" } | { kind: "ongoing" } | { kind: "completed" };

export function eventStatus(e: Pick<UpdateEvent, "startDate" | "endDate">, today = todayInIndia()): EventStatus {
  const t = dayNumber(today);
  const start = dayNumber(e.startDate);
  const end = dayNumber(e.endDate ?? e.startDate);
  if (t < start) return { kind: "upcoming", days: start - t };
  if (t === start && start === end) return { kind: "today" };
  if (t <= end) return { kind: "ongoing" };
  return { kind: "completed" };
}

export function statusLabel(s: EventStatus): string {
  switch (s.kind) {
    case "upcoming":
      return s.days === 1 ? "Tomorrow" : `In ${s.days} days`;
    case "today":
      return "Today";
    case "ongoing":
      return "On now";
    case "completed":
      return "Completed";
  }
}

const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/** "Sat, 12 December 2026 · 10:00–13:00 IST" or a date range. */
export function formatEventWhen(e: UpdateEvent): string {
  const days = e.endDate && e.endDate !== e.startDate ? `${fmtDay(e.startDate)} – ${fmtDay(e.endDate)}` : fmtDay(e.startDate);
  if (!e.startTime) return days;
  return `${days} · ${e.startTime}${e.endTime ? `–${e.endTime}` : ""} IST`;
}

export function formatEventWhere(e: UpdateEvent): string {
  return [e.venue, e.city].filter(Boolean).join(", ");
}

/* ------------------------------------------------------------ calendars */

const compact = (iso: string) => iso.replace(/-/g, "");
const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Start/end as UTC instants for timed events (IST = UTC+5:30, no DST). */
function instants(e: UpdateEvent): { start: Date; end: Date } | null {
  if (!e.startTime) return null;
  const toUtc = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
  const start = toUtc(e.startDate, e.startTime);
  const end = e.endTime ? toUtc(e.endDate ?? e.startDate, e.endTime) : new Date(start.getTime() + DEFAULT_DURATION_H * 3_600_000);
  return { start, end: end > start ? end : new Date(start.getTime() + DEFAULT_DURATION_H * 3_600_000) };
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl(title: string, e: UpdateEvent, details: string): string {
  const t = instants(e);
  const dates = t ? `${utcStamp(t.start)}/${utcStamp(t.end)}` : `${compact(e.startDate)}/${compact(addDays(e.endDate ?? e.startDate, 1))}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates, details, location: formatEventWhere(e), ctz: EVENT_TZ });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function outlookCalendarUrl(title: string, e: UpdateEvent, details: string): string {
  const t = instants(e);
  const q = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    body: details,
    location: formatEventWhere(e),
    startdt: t ? t.start.toISOString() : e.startDate,
    enddt: t ? t.end.toISOString() : addDays(e.endDate ?? e.startDate, 1),
    ...(t ? {} : { allday: "true" }),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** iCalendar file (Apple Calendar, Outlook desktop, others). */
export function icsFile(opts: { uid: string; title: string; event: UpdateEvent; details: string; url: string; stamp: string }): string {
  const { event: e } = opts;
  const t = instants(e);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SL Mini Golf Association//Updates//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${opts.stamp}`,
    ...(t
      ? [`DTSTART:${utcStamp(t.start)}`, `DTEND:${utcStamp(t.end)}`]
      : [`DTSTART;VALUE=DATE:${compact(e.startDate)}`, `DTEND;VALUE=DATE:${compact(addDays(e.endDate ?? e.startDate, 1))}`]),
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(`${opts.details}\n\n${opts.url}`)}`,
    `LOCATION:${icsEscape(formatEventWhere(e))}`,
    `URL:${opts.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
