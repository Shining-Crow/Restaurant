import { createHmac, timingSafeEqual } from "node:crypto";

function returnKeySecret(): string {
  return (
    process.env.WORLDPAY_RETURN_KEY_SECRET?.trim() ||
    process.env.WORLDPAY_API_PASSWORD?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-only-return-key-secret"
  );
}

export function signPaymentReturnKey(orderId: string): string {
  return createHmac("sha256", returnKeySecret())
    .update(orderId)
    .digest("hex")
    .slice(0, 32);
}

export function verifyPaymentReturnKey(
  orderId: string,
  key: string | undefined | null,
): boolean {
  if (!key || key.length !== 32 || !orderId.startsWith("ord_")) {
    return false;
  }
  const expected = signPaymentReturnKey(orderId);
  try {
    return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  } catch {
    return false;
  }
}
