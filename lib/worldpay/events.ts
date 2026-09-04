/** Webhook `eventDetails.type` values that mean the customer paid successfully. */
const WEBHOOK_SUCCESS_TYPES = new Set([
  "authorized",
  "sentForSettlement",
]);

/** Webhook `eventDetails.type` values that mean the payment did not complete. */
const WEBHOOK_FAILURE_TYPES = new Set([
  "refused",
  "error",
  "cancelled",
  "expired",
]);

/** Payment Queries `lastEvent` values that mean the customer paid successfully. */
const QUERY_SUCCESS_EVENTS = new Set([
  "authorizationSucceeded",
  "saleSucceeded",
  "settlementRequestSubmitted",
  "settlementRequested",
]);

/** Card Payments API `lastEvent` labels (also seen on some query responses). */
const CARD_PAYMENTS_SUCCESS_EVENTS = new Set([
  "authorized",
  "sent for settlement",
  "settled",
]);

const CARD_PAYMENTS_FAILURE_EVENTS = new Set([
  "refused",
  "error",
  "expired",
  "settlement failed",
  "refund failed",
]);

/** Payment Queries `lastEvent` values that mean the payment did not complete. */
const QUERY_FAILURE_EVENTS = new Set([
  "authorizationRefused",
  "authorizationFailed",
  "authorizationTimedOut",
  "saleRefused",
  "saleFailed",
  "saleTimedOut",
]);

export function isWorldpayWebhookSuccess(type: string | undefined): boolean {
  return Boolean(type && WEBHOOK_SUCCESS_TYPES.has(type));
}

export function isWorldpayWebhookFailure(type: string | undefined): boolean {
  return Boolean(type && WEBHOOK_FAILURE_TYPES.has(type));
}

/** Normalise query `lastEvent` to Payment Queries camelCase where possible. */
export function normalizePaymentQueryLastEvent(
  lastEvent: string | undefined,
): string | undefined {
  if (!lastEvent) return undefined;
  if (QUERY_SUCCESS_EVENTS.has(lastEvent) || QUERY_FAILURE_EVENTS.has(lastEvent)) {
    return lastEvent;
  }

  const lower = lastEvent.toLowerCase();
  if (CARD_PAYMENTS_SUCCESS_EVENTS.has(lower)) {
    switch (lower) {
      case "authorized":
        return "authorizationSucceeded";
      case "sent for settlement":
      case "settled":
        return "settlementRequestSubmitted";
    }
  }
  if (CARD_PAYMENTS_FAILURE_EVENTS.has(lower)) {
    switch (lower) {
      case "refused":
        return "authorizationRefused";
      case "error":
        return "authorizationFailed";
      case "expired":
        return "authorizationTimedOut";
      case "settlement failed":
        return "settlementRequestSubmissionFailed";
      case "refund failed":
        return "refundRequestSubmissionFailed";
    }
  }

  return lastEvent;
}

export function isWorldpayQuerySuccess(lastEvent: string | undefined): boolean {
  return Boolean(lastEvent && QUERY_SUCCESS_EVENTS.has(lastEvent));
}

export function isWorldpayQueryFailure(lastEvent: string | undefined): boolean {
  return Boolean(lastEvent && QUERY_FAILURE_EVENTS.has(lastEvent));
}
