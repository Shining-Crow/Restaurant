import { NextResponse } from "next/server";
import { MIN_CHECKOUT_AMOUNT_PENCE } from "@/lib/checkout-constants";
import { getPrisma } from "@/lib/prisma";
import { defaultDeliveryFee, resolveCheckoutLines } from "@/lib/order-pricing";
import { loadSitePublicSettings } from "@/lib/site-settings-data";
import { isWorldpayConfigured } from "@/lib/worldpay/config";
import {
  createOrderReference,
  setupPaymentPage,
} from "@/lib/worldpay/client";
import { createPaymentBodySchema } from "@/lib/validators/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isWorldpayConfigured()) {
    return NextResponse.json(
      {
        error:
          "Payments are not configured (missing WORLDPAY_API_USERNAME, WORLDPAY_API_PASSWORD, or WORLDPAY_MERCHANT_ENTITY).",
      },
      { status: 503 },
    );
  }

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
    const subtotal =
      Math.round(resolved.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    const deliveryFee =
      body.orderType === "delivery" ? defaultDeliveryFee() : 0;
    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    const totalPence = Math.round(total * 100);
    if (totalPence < MIN_CHECKOUT_AMOUNT_PENCE) {
      const { phone } = await loadSitePublicSettings();
      return NextResponse.json(
        {
          error: `Minimum order for card payment is £${(MIN_CHECKOUT_AMOUNT_PENCE / 100).toFixed(2)}. Add another item or call ${phone}.`,
        },
        { status: 400 },
      );
    }

    const d = body.customerDetails;
    const orderId = createOrderReference();
    const itemSummary = resolved
      .map((item) => `${item.qty}x ${item.name}`)
      .join(", ")
      .slice(0, 240);

    const email = d.email.trim();

    const paymentPage = await setupPaymentPage({
      transactionReference: orderId,
      amountPence: totalPence,
      description: itemSummary || "Takeaway order",
      customerEmail: email,
    });

    const prisma = getPrisma();
    await prisma.order.create({
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
        status: "pending",
      },
    });

    return NextResponse.json({
      orderId,
      url: paymentPage.url,
    });
  } catch (e) {
    console.error("[create-payment]", e);
    const message = e instanceof Error ? e.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
