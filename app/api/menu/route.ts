import { NextResponse } from "next/server";
import { loadMenuItemsFromDatabase } from "@/lib/menu-data";
import { requireAdminMenuKey } from "@/lib/admin-menu-auth";
import { getPrisma } from "@/lib/prisma";
import { menuRowToClient } from "@/lib/menu-map";
import { createMenuItemBodySchema } from "@/lib/validators/menu";

export const runtime = "nodejs";

export async function GET() {
  const result = await loadMenuItemsFromDatabase();
  if (!result.ok) {
    if (result.reason === "no_database_url") {
      return NextResponse.json(
        { error: "DATABASE_URL not set", items: [] as const },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not load menu.", items: [] as const }, { status: 500 });
  }
  return NextResponse.json({ items: result.items });
}

export async function POST(request: Request) {
  const denied = requireAdminMenuKey(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }

  try {
    const json: unknown = await request.json();
    const parsed = createMenuItemBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const p = parsed.data;
    const prisma = getPrisma();
    const row = await prisma.menuItem.create({
      data: {
        name: p.name,
        description: p.desc,
        price: p.price,
        category: p.cat,
        tags: p.tags,
        available: p.available,
        popular: p.popular,
        imageUrl: p.img.trim() || null,
        extras: p.extras.trim() || null,
        sortOrder: p.sortOrder,
      },
    });
    return NextResponse.json({ item: menuRowToClient(row) });
  } catch (e) {
    console.error("[menu POST]", e);
    return NextResponse.json({ error: "Could not create item." }, { status: 500 });
  }
}
