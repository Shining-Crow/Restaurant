import { getPrisma } from "@/lib/prisma";
import { getSunmiConfig, isSunmiConfigured } from "@/lib/sunmi/config";
import { pushPrintContent, queryTicketPrintStatus } from "@/lib/sunmi/client";
import {
  buildKitchenTicketHex,
  kitchenVoiceText,
  type KitchenTicketOrder,
} from "@/lib/sunmi/ticket";

const MAX_ATTEMPTS = 6;
const RETRY_BASE_MS = 60_000;

export type ReleasePrintResult =
  | { status: "skipped"; reason: string }
  | { status: "duplicate"; tradeNo: string }
  | { status: "submitted"; tradeNo: string; jobId: string }
  | { status: "failed"; tradeNo: string; jobId: string; error: string };

function decimalValue(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toString" in v) {
    return Number.parseFloat(String(v));
  }
  return Number(v);
}

function toTicketOrder(order: {
  paymentReference: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  orderType: string;
  deliveryAddress: string | null;
  preferredTime: string | null;
  notes: string | null;
  items: unknown;
  subtotal: unknown;
  deliveryFee: unknown;
  total: unknown;
  status: string;
  createdAt?: Date;
}): KitchenTicketOrder | null {
  if (!order.paymentReference) return null;
  const items = Array.isArray(order.items)
    ? (order.items as { name: string; qty: number; lineTotal: number }[])
    : [];
  return {
    paymentReference: order.paymentReference,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    orderType: order.orderType,
    deliveryAddress: order.deliveryAddress,
    preferredTime: order.preferredTime,
    notes: order.notes,
    items,
    subtotal: decimalValue(order.subtotal),
    deliveryFee: decimalValue(order.deliveryFee),
    total: decimalValue(order.total),
    status: order.status,
    createdAt: order.createdAt,
  };
}

function nextRetryDate(attemptCount: number): Date {
  const delay = RETRY_BASE_MS * Math.pow(2, Math.max(0, attemptCount - 1));
  return new Date(Date.now() + Math.min(delay, 60 * 60_000));
}

async function attemptPush(jobId: bigint, ticket: KitchenTicketOrder, reprint: boolean) {
  const prisma = getPrisma();
  const config = getSunmiConfig();
  if (!config) {
    await prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: "skipped",
        lastError: "SUNMI is not configured",
        lastAttemptAt: new Date(),
      },
    });
    return { ok: false as const, error: "SUNMI is not configured" };
  }

  const contentHex = buildKitchenTicketHex(ticket, { reprint });
  const job = await prisma.printJob.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false as const, error: "Print job missing" };

  const attemptCount = job.attemptCount + 1;
  console.info("[sunmi] Pushing ticket", {
    tradeNo: job.tradeNo,
    sn: config.printerSn,
    attempt: attemptCount,
    reprint,
  });

  try {
    const result = await pushPrintContent({
      sn: config.printerSn,
      tradeNo: job.tradeNo,
      contentHex,
      mediaText: kitchenVoiceText(ticket),
      count: 1,
      orderType: 1,
      cycle: 1,
    });

    if (result.ok) {
      await prisma.printJob.update({
        where: { id: jobId },
        data: {
          status: "submitted",
          attemptCount,
          lastAttemptAt: new Date(),
          nextRetryAt: null,
          printerSn: config.printerSn,
          sunmiCode: result.code != null ? String(result.code) : null,
          sunmiMsg: result.msg ?? null,
          lastError: null,
        },
      });
      console.info("[sunmi] Ticket submitted", job.tradeNo);
      return { ok: true as const };
    }

    const error =
      result.msg ||
      `SUNMI push failed (http ${result.httpStatus}, code ${String(result.code)})`;
    const giveUp = attemptCount >= MAX_ATTEMPTS;
    await prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        attemptCount,
        lastAttemptAt: new Date(),
        nextRetryAt: giveUp ? null : nextRetryDate(attemptCount),
        printerSn: config.printerSn,
        sunmiCode: result.code != null ? String(result.code) : null,
        sunmiMsg: result.msg ?? null,
        lastError: error,
      },
    });
    console.error("[sunmi] Ticket push failed", job.tradeNo, error, result.raw);
    return { ok: false as const, error };
  } catch (e) {
    const error = e instanceof Error ? e.message : "SUNMI request failed";
    const giveUp = attemptCount >= MAX_ATTEMPTS;
    await prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        attemptCount,
        lastAttemptAt: new Date(),
        nextRetryAt: giveUp ? null : nextRetryDate(attemptCount),
        printerSn: config.printerSn,
        lastError: error,
      },
    });
    console.error("[sunmi] Ticket push exception", job.tradeNo, e);
    return { ok: false as const, error };
  }
}

/**
 * Release an order to the kitchen printer after payment (or cash placement).
 * Idempotent for the first print: same paymentReference → one primary trade_no.
 */
export async function releaseOrderToKitchen(
  order: {
    id: bigint | number | string;
    paymentReference: string | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    orderType: string;
    deliveryAddress: string | null;
    preferredTime: string | null;
    notes: string | null;
    items: unknown;
    subtotal: unknown;
    deliveryFee: unknown;
    total: unknown;
    status: string;
    createdAt?: Date;
  },
  opts?: { reprint?: boolean },
): Promise<ReleasePrintResult> {
  if (!isSunmiConfigured()) {
    console.info("[sunmi] Skip print — not configured");
    return { status: "skipped", reason: "not_configured" };
  }

  const ticket = toTicketOrder(order);
  if (!ticket) {
    return { status: "skipped", reason: "missing_payment_reference" };
  }

  const prisma = getPrisma();
  const orderId = BigInt(order.id);
  const reprint = Boolean(opts?.reprint);

  if (!reprint) {
    const existing = await prisma.printJob.findFirst({
      where: {
        paymentReference: ticket.paymentReference,
        isReprint: false,
      },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      if (existing.status === "submitted" || existing.status === "printed") {
        return { status: "duplicate", tradeNo: existing.tradeNo };
      }
      const pushed = await attemptPush(existing.id, ticket, false);
      return pushed.ok
        ? {
            status: "submitted",
            tradeNo: existing.tradeNo,
            jobId: existing.id.toString(),
          }
        : {
            status: "failed",
            tradeNo: existing.tradeNo,
            jobId: existing.id.toString(),
            error: pushed.error,
          };
    }
  }

  const tradeNo = reprint
    ? `${ticket.paymentReference}_r${Date.now()}`
    : ticket.paymentReference;

  let job;
  try {
    job = await prisma.printJob.create({
      data: {
        orderId,
        paymentReference: ticket.paymentReference,
        tradeNo,
        status: "pending",
        isReprint: reprint,
        printerSn: getSunmiConfig()?.printerSn ?? null,
      },
    });
  } catch (e) {
    // Unique trade_no race → treat as duplicate
    console.warn("[sunmi] Print job create conflict", tradeNo, e);
    return { status: "duplicate", tradeNo };
  }

  const pushed = await attemptPush(job.id, ticket, reprint);
  if (pushed.ok) {
    return {
      status: "submitted",
      tradeNo: job.tradeNo,
      jobId: job.id.toString(),
    };
  }
  return {
    status: "failed",
    tradeNo: job.tradeNo,
    jobId: job.id.toString(),
    error: pushed.error,
  };
}

/** Retry failed jobs whose nextRetryAt is due. */
export async function processDuePrintRetries(limit = 20): Promise<{
  processed: number;
  submitted: number;
  failed: number;
}> {
  if (!isSunmiConfigured()) {
    return { processed: 0, submitted: 0, failed: 0 };
  }

  const prisma = getPrisma();
  const due = await prisma.printJob.findMany({
    where: {
      status: "failed",
      nextRetryAt: { lte: new Date() },
      attemptCount: { lt: MAX_ATTEMPTS },
    },
    include: { order: true },
    orderBy: { nextRetryAt: "asc" },
    take: limit,
  });

  let submitted = 0;
  let failed = 0;

  for (const job of due) {
    const ticket = toTicketOrder(job.order);
    if (!ticket) {
      failed += 1;
      continue;
    }
    const result = await attemptPush(job.id, ticket, job.isReprint);
    if (result.ok) submitted += 1;
    else failed += 1;
  }

  return { processed: due.length, submitted, failed };
}

export async function refreshPrintJobStatus(tradeNo: string) {
  const prisma = getPrisma();
  const job = await prisma.printJob.findUnique({ where: { tradeNo } });
  if (!job) return null;

  const result = await queryTicketPrintStatus(tradeNo);
  const raw = result.raw as { data?: { status?: string | number } } | null;
  const remoteStatus = raw?.data?.status;

  // Best-effort: mark printed when remote indicates success
  if (
    result.ok &&
    (remoteStatus === 1 ||
      remoteStatus === "1" ||
      remoteStatus === "printed" ||
      remoteStatus === "success")
  ) {
    return prisma.printJob.update({
      where: { tradeNo },
      data: {
        status: "printed",
        sunmiCode: result.code != null ? String(result.code) : job.sunmiCode,
        sunmiMsg: result.msg ?? job.sunmiMsg,
      },
    });
  }

  await prisma.printJob.update({
    where: { tradeNo },
    data: {
      sunmiCode: result.code != null ? String(result.code) : job.sunmiCode,
      sunmiMsg: result.msg ?? job.sunmiMsg,
      lastError: result.ok ? job.lastError : result.msg || job.lastError,
    },
  });

  return prisma.printJob.findUnique({ where: { tradeNo } });
}
