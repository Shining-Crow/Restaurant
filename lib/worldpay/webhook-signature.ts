import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWorldpayWebhookSignature(
  rawBody: string,
  eventSignatureHeader: string,
  secret: string,
): boolean {
  const signatures = eventSignatureHeader.split(",").map((s) => s.trim());

  for (const sig of signatures) {
    const parts = sig.split("/");
    if (parts.length !== 3) continue;

    const [, hashFunction, signature] = parts;
    if (hashFunction.toUpperCase() !== "SHA256") continue;

    const computed = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    try {
      if (
        timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(signature, "utf8"))
      ) {
        return true;
      }
    } catch {
    }
  }

  return false;
}
