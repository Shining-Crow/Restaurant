import {
  appBaseUrl,
  getWorldpayConfig,
  worldpayAuthHeader,
  type WorldpayConfig,
} from "@/lib/worldpay/config";
import { signPaymentReturnKey } from "@/lib/worldpay/return-key";

const HPP_MEDIA = "application/vnd.worldpay.payment_pages-v1.hal+json";

type WorldpaySetupResponse = {
  url?: string;
  message?: string;
  validationErrors?: unknown;
  _links?: { self?: { href?: string } };
};

export function createOrderReference(): string {
  return `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export type SetupPaymentPageInput = {
  transactionReference: string;
  amountPence: number;
  description?: string;
  customerEmail: string;
};

export type SetupPaymentPageResult = {
  url: string;
  queryLink?: string;
};

function extractSupportReference(bodyText: string): string | undefined {
  const decoded = bodyText.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code)),
  );
  const match = decoded.match(/Reference\s*#\s*([\d.a-f]+)/i);
  return match?.[1];
}

function worldpayErrorMessage(
  status: number,
  bodyText: string,
  entity?: string,
): string {
  const trimmed = bodyText.trim();
  const titleMatch = trimmed.match(/<TITLE>([^<]+)<\/TITLE>/i);
  const title = titleMatch?.[1]?.trim();
  const supportRef = extractSupportReference(trimmed);
  const entityLabel = entity ? ` entity ${entity}` : " your merchant entity";

  if (status === 404) {
    return (
      "Worldpay payment setup failed (404): Not Found. " +
      "Check WORLDPAY_ENV (try vs live) and that Hosted Payment Pages is enabled for" +
      `${entityLabel}. Live uses https://access.worldpay.com with Live API credentials.`
    );
  }

  if (status === 401 || status === 403) {
    if (/access denied/i.test(trimmed) || title === "Access Denied") {
      const refHint = supportRef
        ? ` Quote reference ${supportRef} when contacting Worldpay.`
        : "";
      const modeHint =
        process.env.WORLDPAY_ENV === "live"
          ? "Live API Credentials"
          : "Try mode credentials";
      return (
        "Worldpay blocked the payment API request (403 access denied)." +
        refHint +
        ` In dashboard.worldpay.com go to Developer Tools → API Credentials → ${modeHint},` +
        ` and ask Worldpay to enable Hosted Payment Pages for${entityLabel}.`
      );
    }
    return (
      "Worldpay rejected the API credentials (401/403). " +
      "In dashboard.worldpay.com use Developer Tools → API Credentials matching WORLDPAY_ENV (try or live)."
    );
  }

  if (status >= 500) {
    return `Worldpay payment service is unavailable (${status}). Please try again shortly.`;
  }

  if (title) {
    return `Worldpay payment setup failed (${status}): ${title}`;
  }

  return `Worldpay payment setup failed (${status}). Check your Worldpay API configuration.`;
}

async function parseWorldpayResponse(
  res: Response,
  entity?: string,
): Promise<WorldpaySetupResponse> {
  const bodyText = await res.text();
  const contentType = res.headers.get("content-type") ?? "";

  if (
    contentType.includes("json") ||
    bodyText.trimStart().startsWith("{") ||
    bodyText.trimStart().startsWith("[")
  ) {
    try {
      return JSON.parse(bodyText) as WorldpaySetupResponse;
    } catch {
      throw new Error(worldpayErrorMessage(res.status, bodyText, entity));
    }
  }

  throw new Error(worldpayErrorMessage(res.status, bodyText, entity));
}

export async function setupPaymentPage(
  input: SetupPaymentPageInput,
): Promise<SetupPaymentPageResult> {
  const config = getWorldpayConfig();
  if (!config) {
    throw new Error("Worldpay is not configured");
  }

  const baseUrl = appBaseUrl();
  const orderRef = encodeURIComponent(input.transactionReference);
  const returnKey = signPaymentReturnKey(input.transactionReference);
  const completeBase = `${baseUrl}/api/orders/complete-return?order_id=${orderRef}&key=${returnKey}`;

  const body: Record<string, unknown> = {
    transactionReference: input.transactionReference,
    merchant: { entity: config.entity },
    narrative: { line1: config.narrativeLine1 },
    value: { currency: "GBP", amount: input.amountPence },
    resultURLs: {
      successURL: `${completeBase}&outcome=success`,
      pendingURL: `${completeBase}&outcome=success`,
      failureURL: `${completeBase}&outcome=failure`,
      errorURL: `${completeBase}&outcome=failure`,
      cancelURL: `${baseUrl}/#order`,
      expiryURL: `${completeBase}&outcome=expiry&message=${encodeURIComponent("Payment session expired. Please try again.")}`,
    },
  };

  if (input.description) {
    body.description = input.description.slice(0, 128);
  }

  body.riskData = { account: { email: input.customerEmail } };

  const res = await fetch(`${config.apiBaseUrl}/payment_pages`, {
    method: "POST",
    headers: worldpayHeaders(config, HPP_MEDIA),
    body: JSON.stringify(body),
  });

  const data = await parseWorldpayResponse(res, config.entity);

  if (!res.ok) {
    const detail =
      data.message ||
      (data.validationErrors
        ? JSON.stringify(data.validationErrors)
        : res.statusText);
    throw new Error(`Worldpay payment setup failed (${res.status}): ${detail}`);
  }

  if (!data.url) {
    throw new Error("Worldpay did not return a payment page URL");
  }

  return {
    url: data.url,
    queryLink: data._links?.self?.href,
  };
}

export function worldpayHeaders(
  config: WorldpayConfig,
  mediaType: string,
): HeadersInit {
  return {
    Authorization: worldpayAuthHeader(config),
    "Content-Type": mediaType,
    Accept: mediaType,
    "User-Agent": "AmoreMio-Website/1.0 (Worldpay-HPP)",
  };
}
