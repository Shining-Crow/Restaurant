import type { MenuItemModel } from "@/lib/generated/prisma/models/MenuItem";
import { catOrder } from "@/lib/menu-config";
import type { MenuCategory, MenuItem } from "@/lib/menu-types";

function isMenuCategory(s: string): s is MenuCategory {
  return (catOrder as readonly string[]).includes(s);
}

function decimalToNumber(price: MenuItemModel["price"]): number {
  if (price != null && typeof price === "object" && "toNumber" in price) {
    return (price as { toNumber: () => number }).toNumber();
  }
  const n = Number(price);
  return Number.isFinite(n) ? n : 0;
}

export function menuRowToClient(row: MenuItemModel): MenuItem {
  const cat = isMenuCategory(row.category) ? row.category : "starters";
  return {
    id: row.id,
    name: row.name,
    desc: row.description,
    price: decimalToNumber(row.price),
    cat,
    tags: row.tags ?? [],
    available: row.available,
    popular: row.popular,
    img: row.imageUrl ?? "",
    extras: row.extras ?? undefined,
  };
}
