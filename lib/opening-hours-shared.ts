export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type OpeningHourDisplay = {
  weekday: number;
  label: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  note: string | null;
};

export function prismaWeekdayFromJsDate(d = new Date()): number {
  const londonDay = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[londonDay] ?? (() => {
    const js = d.getDay();
    return js === 0 ? 7 : js;
  })();
}

export function formatOpeningHourSlot(row: OpeningHourDisplay): string {
  if (row.isClosed) {
    const n = row.note?.trim();
    return n ? `Closed (${n})` : "Closed";
  }
  return `${row.openTime} – ${row.closeTime}`;
}
