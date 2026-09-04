import {
  type OpeningHourDisplay,
  prismaWeekdayFromJsDate,
} from "@/lib/opening-hours-shared";

export const FALLBACK_OPENING_HOURS: OpeningHourDisplay[] = [
  { weekday: 1, label: "Monday", openTime: "16:00", closeTime: "22:00", isClosed: true, note: null },
  { weekday: 2, label: "Tuesday", openTime: "16:00", closeTime: "22:00", isClosed: false, note: null },
  { weekday: 3, label: "Wednesday", openTime: "16:00", closeTime: "22:00", isClosed: false, note: null },
  { weekday: 4, label: "Thursday", openTime: "16:00", closeTime: "22:00", isClosed: false, note: null },
  { weekday: 5, label: "Friday", openTime: "16:00", closeTime: "23:00", isClosed: false, note: null },
  { weekday: 6, label: "Saturday", openTime: "16:00", closeTime: "23:00", isClosed: false, note: null },
  { weekday: 7, label: "Sunday", openTime: "16:00", closeTime: "22:00", isClosed: false, note: null },
];

export function londonYmd(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function dateFromYmd(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}

export function weekdayFromYmd(ymd: string): number {
  return prismaWeekdayFromJsDate(dateFromYmd(ymd));
}

function parseHhMm(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function formatDisplayTime(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function hoursForDate(
  ymd: string,
  hours: OpeningHourDisplay[],
): OpeningHourDisplay | undefined {
  const weekday = weekdayFromYmd(ymd);
  return hours.find((h) => h.weekday === weekday);
}

function londonMinutesNow(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = Number.parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const minute = Number.parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );
  return hour * 60 + minute;
}

export function timeSlotsForDate(
  ymd: string,
  hours: OpeningHourDisplay[],
): { value: string; label: string }[] {
  const day = hoursForDate(ymd, hours);
  if (!day || day.isClosed) return [];

  const start = parseHhMm(day.openTime);
  const end = parseHhMm(day.closeTime);
  const minSlot =
    ymd === londonYmd() ? londonMinutesNow() : -1;
  const slots: { value: string; label: string }[] = [];

  for (let t = start; t < end; t += 30) {
    if (minSlot >= 0 && t <= minSlot) continue;
    const h = Math.floor(t / 60);
    const m = t % 60;
    const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    slots.push({ value, label: formatDisplayTime(t) });
  }
  return slots;
}

export function formatPreferredTimeLabel(ymd: string, hhmm: string): string {
  const date = dateFromYmd(ymd);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const mins = parseHhMm(hhmm);
  return `${dateLabel}, ${formatDisplayTime(mins)}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = dateFromYmd(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nextOpenYmd(
  hours: OpeningHourDisplay[],
  fromYmd = londonYmd(),
  maxLookahead = 21,
): string {
  for (let i = 0; i < maxLookahead; i++) {
    const ymd = addDaysYmd(fromYmd, i);
    const day = hoursForDate(ymd, hours);
    if (day && !day.isClosed) return ymd;
  }
  return fromYmd;
}
