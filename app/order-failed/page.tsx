"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSiteSettings } from "@/components/SiteSettingsContext";

function resolveOrderId(searchParams: URLSearchParams): string | null {
  return (
    searchParams.get("order_id")?.trim() ||
    searchParams.get("OrderID")?.trim() ||
    null
  );
}

function resolveReturnKey(searchParams: URLSearchParams): string | null {
  return searchParams.get("key")?.trim() || null;
}

function OrderFailedInner() {
  const site = useSiteSettings();
  const searchParams = useSearchParams();
  const message =
    searchParams.get("message")?.trim() ||
    searchParams.get("Message")?.trim() ||
    "Your card payment was not completed.";
  const orderId = resolveOrderId(searchParams);
  const returnKey = resolveReturnKey(searchParams);

  useEffect(() => {
    if (!orderId?.startsWith("ord_")) return;

    void fetch("/api/orders/sync-from-worldpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, returnKey, outcome: "failure" }),
    }).catch((e) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[order-failed] sync-from-worldpay request failed", e);
      }
    });
  }, [orderId, returnKey]);

  return (
    <div className="container" style={{ padding: "100px 24px 80px", maxWidth: "640px" }}>
      <h1 className="about-h2" style={{ marginBottom: "12px" }}>
        Payment not completed
      </h1>
      <p style={{ color: "var(--text-mid)", lineHeight: 1.7, marginBottom: "16px" }}>
        {message}
      </p>
      <p style={{ color: "var(--text-mid)", lineHeight: 1.7 }}>
        {orderId ? (
          <>
            We&apos;ve sent a confirmation to your email address if we have it on
            file. You can try again from the menu, or call{" "}
          </>
        ) : (
          <>You can try again from the menu, or call </>
        )}
        <a href={site.phoneTelHref} style={{ color: "var(--crimson)", fontWeight: 700 }}>
          {site.phone}
        </a>{" "}
        to place your order by phone.
      </p>
      <p style={{ marginTop: "32px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link href="/#order" className="btn-primary" style={{ display: "inline-flex" }}>
          Try again
        </Link>
        <Link href="/#menu" className="btn-outline-dark" style={{ display: "inline-flex" }}>
          Back to menu
        </Link>
      </p>
    </div>
  );
}

export default function OrderFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "120px 24px" }}>
          Loading…
        </div>
      }
    >
      <OrderFailedInner />
    </Suspense>
  );
}
