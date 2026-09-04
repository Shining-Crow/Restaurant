import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { recordOrderFromPaymentEvent } from "@/lib/record-payment-order";
import { requestOriginBase } from "@/lib/worldpay/config";
import { verifyPaymentReturnKey } from "@/lib/worldpay/return-key";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId =
    searchParams.get("order_id")?.trim() ||
    searchParams.get("OrderID")?.trim() ||
    "";
  const returnKey = searchParams.get("key")?.trim() || "";
  const outcomeRaw = (searchParams.get("outcome")?.trim() || "success").toLowerCase();
  const outcome =
    outcomeRaw === "failure" || outcomeRaw === "error" || outcomeRaw === "expiry"
      ? "failure"
      : "success";

  const base = requestOriginBase(request);

  if (!orderId.startsWith("ord_") || !verifyPaymentReturnKey(orderId, returnKey)) {
    console.warn("[complete-return] Invalid order or return key", orderId);
    const failed = new URL(`${base}/order-failed`);
    if (orderId) failed.searchParams.set("order_id", orderId);
    failed.searchParams.set(
      "message",
      "We could not confirm your payment return. If you were charged, please call the restaurant with your name and phone number.",
    );
    return NextResponse.redirect(failed.toString(), 303);
  }

  try {
    const prisma = getPrisma();
    const existing = await prisma.order.findUnique({
      where: { paymentReference: orderId },
      select: { status: true },
    });

    if (!existing) {
      console.warn("[complete-return] Order not found", orderId);
      const failed = new URL(`${base}/order-failed`);
      failed.searchParams.set("order_id", orderId);
      return NextResponse.redirect(failed.toString(), 303);
    }

    if (
      existing.status !== "paid" &&
      existing.status !== "failed" &&
      existing.status !== "awaiting_cash"
    ) {
      const result = await recordOrderFromPaymentEvent({
        transactionReference: orderId,
        eventType: outcome === "failure" ? "refused" : "authorized",
      });
      console.info("[complete-return]", orderId, outcome, result.status);
    }
  } catch (e) {
    console.error("[complete-return] Failed to record payment", orderId, e);
  }

  if (outcome === "failure") {
    const failed = new URL(`${base}/order-failed`);
    failed.searchParams.set("order_id", orderId);
    return NextResponse.redirect(failed.toString(), 303);
  }

  const confirmed = new URL(`${base}/order-confirmed`);
  confirmed.searchParams.set("order_id", orderId);
  confirmed.searchParams.set("key", returnKey);
  return NextResponse.redirect(confirmed.toString(), 303);
}
