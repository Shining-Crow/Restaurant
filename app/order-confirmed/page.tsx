"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";
import { useSiteSettings } from "@/components/SiteSettingsContext";

function BackToMenuLink() {
  const { clear } = useCart();
  return (
    <Link
      href="/#menu"
      className="btn-primary"
      style={{ display: "inline-flex" }}
      onClick={() => clear()}
    >
      Back to menu
    </Link>
  );
}

type OrderSummary = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  orderType: string;
  deliveryAddress: string | null;
  preferredTime: string | null;
  items: unknown;
  subtotal: string | null;
  deliveryFee: string | null;
  total: string | null;
  status: string;
  createdAt: string;
};

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

function OrderConfirmedInner() {
  const site = useSiteSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = resolveOrderId(searchParams);
  const returnKey = resolveReturnKey(searchParams);

  if (!orderId) {
    return (
      <div className="container" style={{ padding: "100px 24px 80px", maxWidth: "640px" }}>
        <h1 className="about-h2" style={{ marginBottom: "12px" }}>
          Thank you!
        </h1>
        <p style={{ color: "var(--text-mid)", lineHeight: 1.7 }}>
          Missing order reference. If you completed a payment, check your email
          or call <strong>{site.phone}</strong>.
        </p>
        <p style={{ marginTop: "32px" }}>
          <BackToMenuLink />
        </p>
      </div>
    );
  }

  return (
    <OrderLoaded
      orderId={orderId}
      returnKey={returnKey}
      onFailed={() => router.replace("/order-failed")}
    />
  );
}

function OrderLoaded({
  orderId,
  returnKey,
  onFailed,
}: {
  orderId: string;
  returnKey: string | null;
  onFailed: () => void;
}) {
  const site = useSiteSettings();
  const { clear } = useCart();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId.startsWith("ord_")) {
      clear();
    }
  }, [orderId, clear]);

  useEffect(() => {
    let cancelled = false;

    async function syncOnce() {
      const res = await fetch("/api/orders/sync-from-worldpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, returnKey, outcome: "success" }),
      });
      if (!res.ok && process.env.NODE_ENV === "development") {
        const j: unknown = await res.json().catch(() => ({}));
        console.warn("[order-confirmed] sync-from-worldpay", res.status, j);
      }
      return res;
    }

    function isReadyStatus(status: string) {
      return status === "paid" || status === "awaiting_cash";
    }

    (async () => {
      try {
        try {
          await syncOnce();
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[order-confirmed] initial sync failed", e);
          }
        }

        for (let i = 0; i < 15; i++) {
          if (cancelled) return;

          const res = await fetch(
            `/api/order-summary?order_id=${encodeURIComponent(orderId)}`,
          );
          if (res.ok) {
            const data = (await res.json()) as { order: OrderSummary };
            if (cancelled) return;
            if (data.order.status === "failed") {
              onFailed();
              return;
            }
            if (isReadyStatus(data.order.status)) {
              setOrder(data.order);
              setError(null);
              return;
            }
          } else if (res.status !== 404) {
            if (!cancelled) setError("Could not load order details.");
            return;
          }

          if (i > 0 && i % 3 === 0) {
            try {
              await syncOnce();
            } catch (e) {
              if (process.env.NODE_ENV === "development") {
                console.warn("[order-confirmed] sync-from-worldpay request failed", e);
              }
            }
          }

          await new Promise((r) => setTimeout(r, 800));
        }
        if (!cancelled) {
          setError(
            `Your payment may still be processing. If this persists, call ${site.phone} with your name and phone number.`,
          );
        }
      } catch {
        if (!cancelled) setError("Could not load order details.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, returnKey, site.phone, onFailed]);

  const isCash = order?.status === "awaiting_cash";
  const cashPayHint =
    order?.orderType === "delivery"
      ? "Please have cash ready when your order is delivered."
      : "Please bring cash when you collect your order.";

  return (
    <div className="container" style={{ padding: "100px 24px 80px", maxWidth: "640px" }}>
      <h1 className="about-h2" style={{ marginBottom: "12px" }}>
        Thank you!
      </h1>
      {error && !order ? (
        <p style={{ color: "var(--text-mid)", lineHeight: 1.7 }}>{error}</p>
      ) : null}
      {order ? (
        <>
          <p style={{ color: "var(--text-mid)", marginBottom: "24px" }}>
            {isCash ? (
              <>
                We&apos;ve received your order. {cashPayHint} A confirmation has
                been sent to the restaurant
                {order.customerEmail ? ` and to ${order.customerEmail}` : ""}.
              </>
            ) : (
              <>
                We&apos;ve received your payment. A confirmation has been sent to
                the restaurant
                {order.customerEmail ? ` and to ${order.customerEmail}` : ""}.
              </>
            )}
          </p>
          <div
            style={{
              background: "var(--cream-dark)",
              borderRadius: "var(--r-md)",
              padding: "24px",
              border: "1px solid var(--border)",
            }}
          >
            <p>
              <strong>Name:</strong> {order.customerName}
            </p>
            <p>
              <strong>Phone:</strong> {order.customerPhone}
            </p>
            <p>
              <strong>Type:</strong> {order.orderType}
            </p>
            <p>
              <strong>Payment:</strong>{" "}
              {isCash ? "Cash (pay on collection / delivery)" : "Card (paid online)"}
            </p>
            {order.total ? (
              <p style={{ marginTop: "12px" }}>
                <strong>{isCash ? "Total due:" : "Total paid:"}</strong> £
                {order.total}
              </p>
            ) : null}
          </div>
        </>
      ) : !error ? (
        <p style={{ color: "var(--text-light)" }}>Loading your order…</p>
      ) : null}
      <p style={{ marginTop: "32px" }}>
        <BackToMenuLink />
      </p>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "120px 24px" }}>
          Loading…
        </div>
      }
    >
      <OrderConfirmedInner />
    </Suspense>
  );
}
