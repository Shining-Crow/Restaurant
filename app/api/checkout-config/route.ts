import { NextResponse } from "next/server";
import { defaultDeliveryFee } from "@/lib/order-pricing";
import { MIN_CHECKOUT_AMOUNT_GBP } from "@/lib/checkout-constants";
import { loadOpeningHoursForSite } from "@/lib/opening-hours-data";
import { FALLBACK_OPENING_HOURS } from "@/lib/preferred-time";
import { appBaseUrl, isWorldpayConfigured } from "@/lib/worldpay/config";

export const runtime = "nodejs";

export async function GET() {
  const baseUrl = appBaseUrl();
  const configuredExplicit = Boolean(process.env.NEXT_PUBLIC_URL?.trim());
  const hours = await loadOpeningHoursForSite();

  return NextResponse.json({
    deliveryFee: defaultDeliveryFee(),
    minCheckoutGbp: MIN_CHECKOUT_AMOUNT_GBP,
    paymentsReady: isWorldpayConfigured(),
    baseUrlConfigured:
      configuredExplicit || Boolean(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    baseUrl,
    openingHours: hours.length ? hours : FALLBACK_OPENING_HOURS,
  });
}
