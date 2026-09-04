export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (production) {
    return production.startsWith("http")
      ? production
      : `https://${production}`;
  }

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) {
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }

  return "http://localhost:3000";
}

export function requestOriginBase(request: Request): string {
  try {
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    if (forwardedHost) {
      return `${forwardedProto || "https"}://${forwardedHost}`.replace(
        /\/$/,
        "",
      );
    }
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return appBaseUrl();
  }
}

export type WorldpayConfig = {
  username: string;
  password: string;
  entity: string;
  narrativeLine1: string;
  apiBaseUrl: string;
};

export function getWorldpayConfig(): WorldpayConfig | null {
  const username = process.env.WORLDPAY_API_USERNAME?.trim();
  const password = process.env.WORLDPAY_API_PASSWORD?.trim();
  const entity = process.env.WORLDPAY_MERCHANT_ENTITY?.trim();
  if (!username || !password || !entity) return null;

  const useLive = process.env.WORLDPAY_ENV === "live";
  const restaurantName =
    process.env.WORLDPAY_NARRATIVE_LINE1?.trim() || "Restaurant order";

  return {
    username,
    password,
    entity,
    narrativeLine1: restaurantName.slice(0, 24),
    apiBaseUrl: useLive
      ? "https://access.worldpay.com"
      : "https://try.access.worldpay.com",
  };
}

export function isWorldpayConfigured(): boolean {
  return getWorldpayConfig() !== null;
}

export function worldpayAuthHeader(config: WorldpayConfig): string {
  const encoded = Buffer.from(`${config.username}:${config.password}`).toString(
    "base64",
  );
  return `Basic ${encoded}`;
}
