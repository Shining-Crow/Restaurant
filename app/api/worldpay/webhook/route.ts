import { NextResponse } from "next/server";
import { recordOrderFromPaymentEvent } from "@/lib/record-payment-order";
import { verifyWorldpayWebhookSignature } from "@/lib/worldpay/webhook-signature";

export const runtime = "nodejs";

type WorldpayWebhookPayload = {
  eventId?: string;
  eventDetails?: {
    classification?: string;
    transactionReference?: string;
    type?: string;
    downstreamReference?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.WORLDPAY_WEBHOOK_SECRET?.trim();
  if (secret) {
    const signature = request.headers.get("Event-Signature") || "";
    if (!verifyWorldpayWebhookSignature(rawBody, signature, secret)) {
      console.warn("[worldpay-webhook] Invalid Event-Signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: WorldpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WorldpayWebhookPayload;
  } catch (e) {
    console.error("[worldpay-webhook] Invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const details = payload.eventDetails;
  if (!details?.transactionReference || !details.type) {
    console.warn("[worldpay-webhook] Missing eventDetails", payload.eventId);
    return NextResponse.json({ received: true });
  }

  if (details.classification && details.classification !== "payment") {
    return NextResponse.json({ received: true });
  }

  try {
    const result = await recordOrderFromPaymentEvent({
      transactionReference: details.transactionReference,
      eventType: details.type,
      downstreamReference: details.downstreamReference,
    });

    if (result.status === "not_found") {
      console.warn(
        "[worldpay-webhook] Order not found",
        details.transactionReference,
      );
    } else if (result.status === "recorded") {
      console.info(
        "[worldpay-webhook] Recorded",
        details.transactionReference,
        details.type,
        result.paid ? "paid" : "failed",
      );
    } else if (result.status === "ignored") {
      console.info(
        "[worldpay-webhook] Ignored event type",
        details.transactionReference,
        details.type,
      );
    }
  } catch (e) {
    console.error("[worldpay-webhook] Handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
