import { NextResponse } from "next/server";
import { requireAdminMenuKey } from "@/lib/admin-menu-auth";
import { getPrisma } from "@/lib/prisma";
import {
  mapQueryLastEventToWebhookType,
  recordOrderFromPaymentEvent,
} from "@/lib/record-payment-order";
import { isWorldpayConfigured } from "@/lib/worldpay/config";
import { queryPaymentByTransactionReference } from "@/lib/worldpay/query";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireAdminMenuKey(request);
  if (denied) return denied;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  let orderId: string | undefined;
  let forcePaid = false;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
      forcePaid?: boolean;
    };
    orderId = body.orderId?.trim();
    forcePaid = body.forcePaid === true;
  } catch {
    orderId = undefined;
  }

  if (forcePaid) {
    if (!orderId?.startsWith("ord_")) {
      return NextResponse.json(
        { error: "forcePaid requires a valid orderId" },
        { status: 400 },
      );
    }
    const recorded = await recordOrderFromPaymentEvent({
      transactionReference: orderId,
      eventType: "authorized",
    });
    return NextResponse.json({
      checked: 1,
      results: [
        {
          orderId,
          result:
            recorded.status === "recorded"
              ? recorded.paid
                ? "paid"
                : "failed"
              : recorded.status,
        },
      ],
    });
  }

  if (!isWorldpayConfigured()) {
    return NextResponse.json(
      { error: "Worldpay is not configured" },
      { status: 503 },
    );
  }

  const prisma = getPrisma();
  const pending = orderId
    ? await prisma.order.findMany({
        where: { paymentReference: orderId, status: "pending" },
        select: { paymentReference: true, createdAt: true },
        take: 1,
      })
    : await prisma.order.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        select: { paymentReference: true, createdAt: true },
        take: 40,
      });

  const results: {
    orderId: string;
    result: string;
    lastEvent?: string;
  }[] = [];

  for (const row of pending) {
    const ref = row.paymentReference;
    if (!ref?.startsWith("ord_")) continue;

    try {
      const query = await queryPaymentByTransactionReference(ref);
      if (query.status === "paid" || query.status === "failed") {
        const eventType = mapQueryLastEventToWebhookType(query.lastEvent);
        if (!eventType) {
          results.push({
            orderId: ref,
            result: "unmapped_event",
            lastEvent: query.lastEvent,
          });
          continue;
        }
        const recorded = await recordOrderFromPaymentEvent({
          transactionReference: ref,
          eventType,
          downstreamReference: query.paymentId,
        });
        results.push({
          orderId: ref,
          result:
            recorded.status === "recorded"
              ? recorded.paid
                ? "paid"
                : "failed"
              : recorded.status,
          lastEvent: query.lastEvent,
        });
        continue;
      }

      results.push({
        orderId: ref,
        result: query.status,
        lastEvent: "lastEvent" in query ? query.lastEvent : undefined,
      });
    } catch (e) {
      console.error("[reconcile-pending]", ref, e);
      results.push({
        orderId: ref,
        result: "error",
      });
    }
  }

  return NextResponse.json({
    checked: results.length,
    results,
  });
}
