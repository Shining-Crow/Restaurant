import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId =
    searchParams.get("order_id")?.trim() ||
    searchParams.get("OrderID")?.trim();

  if (!orderId || !orderId.startsWith("ord_")) {
    return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    const order = await prisma.order.findUnique({
      where: { paymentReference: orderId },
      select: {
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        orderType: true,
        deliveryAddress: true,
        preferredTime: true,
        items: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found yet" }, { status: 404 });
    }

    const dec = (v: unknown) =>
      v == null ? null : typeof v === "object" && "toString" in v ? v.toString() : Number(v);

    return NextResponse.json({
      order: {
        ...order,
        subtotal: dec(order.subtotal),
        deliveryFee: dec(order.deliveryFee),
        total: dec(order.total),
      },
    });
  } catch (e) {
    console.error("[order-summary]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
