import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { defaultDeliveryFee, resolveCheckoutLines } from "@/lib/order-pricing";
import {
  sendCustomerCashOrderEmail,
  sendRestaurantCashOrderEmail,
} from "@/lib/resend";
import { releaseOrderToKitchen } from "@/lib/sunmi/print-order";
import { createOrderReference } from "@/lib/worldpay/client";
import { createPaymentBodySchema } from "@/lib/validators/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured (missing DATABASE_URL)." },
      { status: 503 },
    );
  }

  try {
    const json = await request.json();
    const parsed = createPaymentBodySchema.safeParse(json);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const hint =
        parsed.error.issues[0]?.message || "Invalid request body.";
      return NextResponse.json(
        { error: hint, details: flat.fieldErrors },
        { status: 400 },
      );
    }
    const body = parsed.data;

    if (body.orderType === "delivery" && !body.customerDetails.address?.trim()) {
      return NextResponse.json(
        { error: "Delivery address is required for delivery orders" },
        { status: 400 },
      );
    }

    const resolved = await resolveCheckoutLines(body);
    if (!resolved.length) {
      return NextResponse.json(
        { error: "Your basket is empty or items are unavailable." },
        { status: 400 },
      );
    }

    const subtotal =
      Math.round(resolved.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    const deliveryFee =
      body.orderType === "delivery" ? defaultDeliveryFee() : 0;
    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    const d = body.customerDetails;
    const orderId = createOrderReference();
    const email = d.email.trim();

    const prisma = getPrisma();
    const order = await prisma.order.create({
      data: {
        customerName: d.name.trim(),
        customerPhone: d.phone.trim(),
        customerEmail: email,
        orderType: body.orderType,
        deliveryAddress: d.address?.trim() || null,
        preferredTime: d.time.trim(),
        notes: d.notes?.trim() || null,
        items: resolved.map((item) => ({
          name: item.name,
          qty: item.qty,
          lineTotal: item.lineTotal,
        })),
        subtotal,
        deliveryFee,
        total,
        paymentReference: orderId,
        status: "awaiting_cash",
      },
    });

    const emailPayload = {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      orderType: order.orderType,
      deliveryAddress: order.deliveryAddress,
      preferredTime: order.preferredTime,
      notes: order.notes,
      items: resolved.map((item) => ({
        name: item.name,
        qty: item.qty,
        lineTotal: item.lineTotal,
      })),
      subtotal,
      deliveryFee,
      total,
      paymentReference: orderId,
    };

    try {
      await sendRestaurantCashOrderEmail(emailPayload);
    } catch (e) {
      console.error("[create-cash-order] Restaurant email failed", e);
    }
    try {
      await sendCustomerCashOrderEmail(emailPayload);
    } catch (e) {
      console.error("[create-cash-order] Customer email failed", e);
    }

    try {
      const printResult = await releaseOrderToKitchen(order);
      console.info("[create-cash-order] Kitchen print", orderId, printResult);
    } catch (e) {
      console.error("[create-cash-order] Kitchen print failed", e);
    }

    return NextResponse.json({ orderId });
  } catch (e) {
    console.error("[create-cash-order]", e);
    const message =
      e instanceof Error ? e.message : "Could not place cash order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
