import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  mapQueryLastEventToWebhookType,
  recordOrderFromPaymentEvent,
} from "@/lib/record-payment-order";
import { isWorldpayConfigured } from "@/lib/worldpay/config";
import { queryPaymentByTransactionReference } from "@/lib/worldpay/query";
import { verifyPaymentReturnKey } from "@/lib/worldpay/return-key";

export const runtime = "nodejs";

type SyncBody = {
  orderId?: string;
  returnKey?: string;
  outcome?: "success" | "failure";
};

async function confirmFromSuccessReturn(orderId: string) {
  return recordOrderFromPaymentEvent({
    transactionReference: orderId,
    eventType: "authorized",
  });
}

async function confirmFromFailureReturn(orderId: string) {
  return recordOrderFromPaymentEvent({
    transactionReference: orderId,
    eventType: "refused",
  });
}

function resultStatus(
  recorded: Awaited<ReturnType<typeof recordOrderFromPaymentEvent>>,
  fallback: string,
): string {
  if (recorded.status === "duplicate") {
    return fallback === "failed" ? "failed" : "paid";
  }
  if (recorded.status === "recorded") {
    return recorded.paid ? "paid" : "failed";
  }
  return fallback;
}

export async function POST(request: Request) {
  if (!isWorldpayConfigured()) {
    return NextResponse.json(
      { error: "Worldpay is not configured" },
      { status: 503 },
    );
  }

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const returnKey = body.returnKey?.trim();
  const outcome = body.outcome === "failure" ? "failure" : "success";

  if (!orderId?.startsWith("ord_")) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    const existing = await prisma.order.findUnique({
      where: { paymentReference: orderId },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (
      existing.status === "paid" ||
      existing.status === "failed" ||
      existing.status === "awaiting_cash"
    ) {
      return NextResponse.json({ status: existing.status });
    }

    if (verifyPaymentReturnKey(orderId, returnKey)) {
      const result =
        outcome === "failure"
          ? await confirmFromFailureReturn(orderId)
          : await confirmFromSuccessReturn(orderId);
      const status = resultStatus(
        result,
        outcome === "failure" ? "failed" : "paid",
      );
      if (status === "paid" || status === "failed") {
        return NextResponse.json({ status });
      }
    }

    const query = await queryPaymentByTransactionReference(orderId);

    if (query.status === "paid" || query.status === "failed") {
      const eventType = mapQueryLastEventToWebhookType(query.lastEvent);
      if (eventType) {
        const result = await recordOrderFromPaymentEvent({
          transactionReference: orderId,
          eventType,
          downstreamReference: query.paymentId,
        });

        return NextResponse.json({
          status: resultStatus(result, existing.status),
        });
      }
    }

    if (query.status === "unavailable") {
      console.warn("[sync-from-worldpay] Query unavailable:", query.reason);
    }

    return NextResponse.json({ status: "pending" });
  } catch (e) {
    console.error("[sync-from-worldpay]", e);

    if (verifyPaymentReturnKey(orderId, returnKey)) {
      try {
        const result =
          outcome === "failure"
            ? await confirmFromFailureReturn(orderId)
            : await confirmFromSuccessReturn(orderId);
        const status = resultStatus(
          result,
          outcome === "failure" ? "failed" : "paid",
        );
        if (status === "paid" || status === "failed") {
          return NextResponse.json({ status });
        }
      } catch (inner) {
        console.error("[sync-from-worldpay] Return-key fallback failed", inner);
      }
    }

    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
