import { createHmac, randomInt } from "node:crypto";

/** HMAC-SHA256 headers used by SUNMI OpenAPI v2. */
export function sunmiHmacHeaders(
  appId: string,
  appKey: string,
  bodyJson: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const sign = createHmac("sha256", appKey)
    .update(bodyJson + appId + timestamp + nonce)
    .digest("hex");

  return {
    "Sunmi-Appid": appId,
    "Sunmi-Timestamp": timestamp,
    "Sunmi-Nonce": nonce,
    "Sunmi-Sign": sign,
  };
}
