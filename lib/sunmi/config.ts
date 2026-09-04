export type SunmiConfig = {
  appId: string;
  appKey: string;
  printerSn: string;
  shopId: number | null;
  baseUrl: string;
};

export function isSunmiConfigured(): boolean {
  return Boolean(
    process.env.SUNMI_APP_ID?.trim() &&
      process.env.SUNMI_APP_KEY?.trim() &&
      process.env.SUNMI_PRINTER_SN?.trim(),
  );
}

export function getSunmiConfig(): SunmiConfig | null {
  const appId = process.env.SUNMI_APP_ID?.trim();
  const appKey = process.env.SUNMI_APP_KEY?.trim();
  const printerSn = process.env.SUNMI_PRINTER_SN?.trim();
  if (!appId || !appKey || !printerSn) return null;

  const env = process.env.SUNMI_ENV?.trim().toLowerCase();
  const baseUrl =
    env === "uat" || env === "test"
      ? "https://uat.openapi.sunmi.com"
      : "https://openapi.sunmi.com";

  const shopRaw = process.env.SUNMI_SHOP_ID?.trim();
  const shopId = shopRaw ? Number.parseInt(shopRaw, 10) : null;

  return {
    appId,
    appKey,
    printerSn,
    shopId: Number.isFinite(shopId) ? shopId : null,
    baseUrl,
  };
}
