import {
  getWorldpayConfig,
  worldpayAuthHeader,
} from "@/lib/worldpay/config";
import {
  isWorldpayQueryFailure,
  isWorldpayQuerySuccess,
  normalizePaymentQueryLastEvent,
} from "@/lib/worldpay/events";

const QUERY_MEDIA = "application/vnd.worldpay.payment-queries-v1.hal+json";

export type WorldpayPaymentQueryResult =
  | { status: "paid"; paymentId?: string; lastEvent?: string }
  | { status: "failed"; paymentId?: string; lastEvent?: string }
  | { status: "pending"; paymentId?: string; lastEvent?: string }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string };

type PaymentSummary = {
  paymentId?: string;
  lastEvent?: string;
};

export async function queryPaymentByTransactionReference(
  transactionReference: string,
): Promise<WorldpayPaymentQueryResult> {
  const config = getWorldpayConfig();
  if (!config) {
    throw new Error("Worldpay is not configured");
  }

  const url = new URL(`${config.apiBaseUrl}/paymentQueries/payments`);
  url.searchParams.set("transactionReference", transactionReference);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: worldpayAuthHeader(config),
      Accept: QUERY_MEDIA,
      "User-Agent": "AmoreMio-Website/1.0 (Worldpay-Query)",
    },
  });

  if (res.status === 404) {
    return { status: "not_found" };
  }

  const bodyText = await res.text();
  const contentType = res.headers.get("content-type") ?? "";

  if (
    res.status === 403 ||
    (!contentType.includes("json") &&
      !bodyText.trimStart().startsWith("{") &&
      !bodyText.trimStart().startsWith("["))
  ) {
    return {
      status: "unavailable",
      reason:
        res.status === 403
          ? "Worldpay Payment Queries API is not enabled for this account"
          : `Unexpected response (${res.status})`,
    };
  }

  let data: {
    _embedded?: { payments?: PaymentSummary[] };
    message?: string;
  };
  try {
    data = JSON.parse(bodyText) as typeof data;
  } catch {
    return {
      status: "unavailable",
      reason: "Worldpay payment query returned invalid JSON",
    };
  }

  if (!res.ok) {
    throw new Error(
      data.message || `Worldpay payment query failed (${res.status})`,
    );
  }

  const payment = data._embedded?.payments?.[0];
  if (!payment) {
    return { status: "not_found" };
  }

  const { paymentId } = payment;
  const lastEvent = normalizePaymentQueryLastEvent(payment.lastEvent);

  if (isWorldpayQuerySuccess(lastEvent)) {
    return { status: "paid", paymentId, lastEvent };
  }
  if (isWorldpayQueryFailure(lastEvent)) {
    return { status: "failed", paymentId, lastEvent };
  }
  return { status: "pending", paymentId, lastEvent };
}
