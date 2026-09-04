import { getPrisma } from "@/lib/prisma";
import {
  sendCustomerPaymentFailedEmail,
  sendCustomerPaymentSuccessEmail,
  sendRestaurantEmail,
} from "@/lib/resend";
import { releaseOrderToKitchen } from "@/lib/sunmi/print-order";
import {
  isWorldpayWebhookFailure,
  isWorldpayWebhookSuccess,
} from "@/lib/worldpay/events";

export type RecordPaymentOrderResult =
  | { status: "duplicate"; orderId: string }
  | { status: "recorded"; orderId: string; paid: boolean }
  | { status: "not_found"; orderId: string }
  | { status: "ignored"; orderId: string };

type PaymentEvent = {
  transactionReference: string;
  eventType: string;
  downstreamReference?: string;
};

function decimalValue(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toString" in v) {
    return Number.parseFloat(String(v));
  }
  return Number(v);
}

function buildOrderEmailPayload(order: {
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
  paymentReference: string | null;
}) {
  const items = Array.isArray(order.items)
    ? (order.items as { name: string; qty: number; lineTotal: number }[])
    : [];

  return {
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
    paymentReference: order.paymentReference ?? "—",
  };
}

async function sendPaidOrderEmails(order: {
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
  paymentReference: string | null;
}) {
  const emailPayload = buildOrderEmailPayload(order);

  try {
    await sendRestaurantEmail(emailPayload);
  } catch (e) {
    console.error("[record-payment-order] Restaurant email failed", e);
  }
  try {
    await sendCustomerPaymentSuccessEmail(emailPayload);
  } catch (e) {
    console.error("[record-payment-order] Customer success email failed", e);
  }
}

async function sendFailedOrderEmail(order: {
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
  paymentReference: string | null;
}) {
  try {
    await sendCustomerPaymentFailedEmail(buildOrderEmailPayload(order));
  } catch (e) {
    console.error("[record-payment-order] Customer failure email failed", e);
  }
}

export async function recordOrderFromPaymentEvent(
  event: PaymentEvent,
): Promise<RecordPaymentOrderResult> {
  const paid = isWorldpayWebhookSuccess(event.eventType);
  const failed = isWorldpayWebhookFailure(event.eventType);

  if (!paid && !failed) {
    return { status: "ignored", orderId: event.transactionReference };
  }

  const prisma = getPrisma();
  const existing = await prisma.order.findUnique({
    where: { paymentReference: event.transactionReference },
  });

  if (!existing) {
    return { status: "not_found", orderId: event.transactionReference };
  }

  if (existing.status === "paid" || existing.status === "failed") {
    return { status: "duplicate", orderId: event.transactionReference };
  }

  const nextStatus = paid ? "paid" : "failed";
  const crossReference =
    event.downstreamReference ?? existing.paymentCrossReference ?? undefined;

  if (
    existing.status === nextStatus &&
    existing.paymentCrossReference === crossReference
  ) {
    return { status: "duplicate", orderId: event.transactionReference };
  }

  const updated = await prisma.order.update({
    where: { paymentReference: event.transactionReference },
    data: {
      status: nextStatus,
      paymentCrossReference: crossReference,
    },
  });

  if (!paid) {
    console.warn(
      "[record-payment-order] Payment not approved",
      event.transactionReference,
      event.eventType,
    );
    await sendFailedOrderEmail(updated);
    return {
      status: "recorded",
      orderId: event.transactionReference,
      paid: false,
    };
  }

  await sendPaidOrderEmails(updated);

  try {
    const printResult = await releaseOrderToKitchen(updated);
    console.info(
      "[record-payment-order] Kitchen print",
      event.transactionReference,
      printResult,
    );
  } catch (e) {
    console.error("[record-payment-order] Kitchen print failed", e);
  }

  return {
    status: "recorded",
    orderId: event.transactionReference,
    paid: true,
  };
}

export function mapQueryLastEventToWebhookType(
  lastEvent: string | undefined,
): string | undefined {
  switch (lastEvent) {
    case "authorizationSucceeded":
    case "saleSucceeded":
      return "authorized";
    case "settlementRequestSubmitted":
      return "sentForSettlement";
    case "authorizationRefused":
    case "saleRefused":
      return "refused";
    case "authorizationFailed":
    case "saleFailed":
      return "error";
    case "authorizationTimedOut":
    case "saleTimedOut":
      return "expired";
    default:
      return undefined;
  }
}
