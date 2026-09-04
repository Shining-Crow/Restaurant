import { menuRowToClient } from "@/lib/menu-map";
import type { MenuItem } from "@/lib/menu-types";
import { getPrisma } from "@/lib/prisma";

export type LoadMenuResult =
  | { ok: true; items: MenuItem[] }
  | { ok: false; reason: "no_database_url" | "query_failed" };

export async function loadMenuItemsFromDatabase(): Promise<LoadMenuResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, reason: "no_database_url" };
  }
  try {
    const prisma = getPrisma();
    const rows = await prisma.menuItem.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    });
    return { ok: true, items: rows.map(menuRowToClient) };
  } catch (e) {
    console.error("[loadMenuItemsFromDatabase]", e);
    return { ok: false, reason: "query_failed" };
  }
}
