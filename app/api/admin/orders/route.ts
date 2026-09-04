import { NextResponse } from "next/server";
import { requireAdminMenuKey } from "@/lib/admin-menu-auth";
import { getPrisma } from "@/lib/prisma";
import { processDuePrintRetries } from "@/lib/sunmi/print-order";

export const runtime = "nodejs";

function decimalValue(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toString" in v) {
    return Number.parseFloat(String(v));
  }
  return Number(v);
}

export async function GET(request: Request) {
  const denied = requireAdminMenuKey(request);
  if (denied) return denied;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  // Opportunistic retry when admin opens the orders list
  try {
    await processDuePrintRetries(10);
  } catch (e) {
    console.error("[admin/orders] retry sweep failed", e);
  }

  const prisma = getPrisma();
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["paid", "awaiting_cash", "failed", "pending"] },
    },
    include: {
      printJobs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id.toString(),
      paymentReference: o.paymentReference,
      createdAt: o.createdAt.toISOString(),
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      orderType: o.orderType,
      preferredTime: o.preferredTime,
      total: decimalValue(o.total),
      status: o.status,
      printJobs: o.printJobs.map((j) => ({
        id: j.id.toString(),
        tradeNo: j.tradeNo,
        status: j.status,
        isReprint: j.isReprint,
        attemptCount: j.attemptCount,
        lastError: j.lastError,
        lastAttemptAt: j.lastAttemptAt?.toISOString() ?? null,
        nextRetryAt: j.nextRetryAt?.toISOString() ?? null,
        sunmiCode: j.sunmiCode,
        sunmiMsg: j.sunmiMsg,
      })),
    })),
  });
}
