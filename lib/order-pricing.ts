import { menuRowToClient } from "@/lib/menu-map";
import { getPrisma } from "@/lib/prisma";
import type { MenuItem } from "@/lib/menu-types";
import type { CreatePaymentBody } from "@/lib/validators/checkout";

export type ResolvedLine = {
  id: number;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
};

function buildMenuLookup(dbRows: MenuItem[]): Map<number, MenuItem> {
  return new Map<number, MenuItem>(dbRows.map((r) => [r.id, r]));
}

export async function resolveCheckoutLines(
  body: CreatePaymentBody,
): Promise<ResolvedLine[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Menu database not configured (missing DATABASE_URL)");
  }

  const prisma = getPrisma();
  const ids = [...new Set(body.lines.map((l) => l.id))];
  const rows = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
  });
  const dbRows = rows.map(menuRowToClient);

  const menuById = buildMenuLookup(dbRows);
  const out: ResolvedLine[] = [];
  for (const l of body.lines) {
    const item = menuById.get(l.id);
    if (!item?.available) {
      throw new Error(`Invalid or unavailable menu item: ${l.id}`);
    }
    const lineTotal = Math.round(item.price * l.qty * 100) / 100;
    out.push({
      id: l.id,
      name: item.name,
      price: item.price,
      qty: l.qty,
      lineTotal,
    });
  }
  return out;
}

export function defaultDeliveryFee(): number {
  const raw = process.env.DELIVERY_FEE;
  const n = raw ? Number.parseFloat(raw) : 2.5;
  return Number.isFinite(n) && n >= 0 ? n : 2.5;
}
