import { NextResponse } from "next/server";
import { requireAdminMenuKey } from "@/lib/admin-menu-auth";
import { getPrisma } from "@/lib/prisma";
import { releaseOrderToKitchen } from "@/lib/sunmi/print-order";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const denied = requireAdminMenuKey(request);
  if (denied) return denied;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { id } = await params;
  const orderId = BigInt(id);
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "paid" && order.status !== "awaiting_cash") {
    return NextResponse.json(
      { error: "Only paid or cash orders can be reprinted." },
      { status: 400 },
    );
  }

  try {
    const result = await releaseOrderToKitchen(order, { reprint: true });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[admin/orders/reprint]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reprint failed" },
      { status: 500 },
    );
  }
}
