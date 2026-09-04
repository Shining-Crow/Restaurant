import { getPrisma } from "@/lib/prisma";
import {
  type OpeningHourDisplay,
  WEEKDAY_LABELS,
} from "@/lib/opening-hours-shared";

function rowToDisplay(row: {
  weekday: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  note: string | null;
}): OpeningHourDisplay {
  const label =
    row.weekday >= 1 && row.weekday <= 7
      ? WEEKDAY_LABELS[row.weekday - 1]
      : `Day ${row.weekday}`;
  return {
    weekday: row.weekday,
    label,
    openTime: row.openTime,
    closeTime: row.closeTime,
    isClosed: row.isClosed,
    note: row.note,
  };
}

export async function loadOpeningHoursForSite(): Promise<OpeningHourDisplay[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }
  try {
    const prisma = getPrisma();
    const rows = await prisma.openingHour.findMany({
      orderBy: { weekday: "asc" },
    });
    return rows.map(rowToDisplay);
  } catch (e) {
    console.error("[loadOpeningHoursForSite]", e);
    return [];
  }
}
