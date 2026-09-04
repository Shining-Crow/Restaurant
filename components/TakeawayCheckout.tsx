"use client";

import { useEffect, useMemo, useState } from "react";
import { MIN_CHECKOUT_AMOUNT_GBP } from "@/lib/checkout-constants";
import type { OpeningHourDisplay } from "@/lib/opening-hours-shared";
import {
  addDaysYmd,
  FALLBACK_OPENING_HOURS,
  formatPreferredTimeLabel,
  hoursForDate,
  londonYmd,
  nextOpenYmd,
  timeSlotsForDate,
} from "@/lib/preferred-time";
import { scrollToSection } from "@/lib/scroll";
import { useCart } from "@/components/CartContext";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import { useToast } from "@/components/ToastContext";

type CheckoutConfig = {
  deliveryFee: number;
  minCheckoutGbp: number;
  paymentsReady: boolean;
  baseUrlConfigured: boolean;
  openingHours?: OpeningHourDisplay[];
};

type CheckoutFieldErrors = Partial<
  Record<"name" | "phone" | "email" | "time" | "address", string>
>;

type PaymentMethod = "card" | "cash";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="form-field-error" role="alert">
      {message}
    </p>
  );
}

export function TakeawayCheckout() {
  const site = useSiteSettings();
  const { lines, subtotal, setQty, removeLine, clear } = useCart();
  const showToast = useToast();
  const [orderType, setOrderType] = useState<"collection" | "delivery">(
    "collection",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(
    null,
  );
  const [configLoadFailed, setConfigLoadFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});

  const openingHours =
    checkoutConfig?.openingHours?.length
      ? checkoutConfig.openingHours
      : FALLBACK_OPENING_HOURS;

  const minDate = useMemo(() => nextOpenYmd(openingHours), [openingHours]);
  const maxDate = useMemo(() => addDaysYmd(londonYmd(), 14), []);

  const timeSlots = useMemo(
    () => (preferredDate ? timeSlotsForDate(preferredDate, openingHours) : []),
    [preferredDate, openingHours],
  );

  const preferredTimeLabel =
    preferredDate && preferredSlot
      ? formatPreferredTimeLabel(preferredDate, preferredSlot)
      : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/checkout-config");
        if (!res.ok) {
          if (!cancelled) setConfigLoadFailed(true);
          return;
        }
        const data = (await res.json()) as CheckoutConfig;
        if (!cancelled) {
          setCheckoutConfig(data);
          const hours = data.openingHours?.length
            ? data.openingHours
            : FALLBACK_OPENING_HOURS;
          setPreferredDate((prev) => prev || nextOpenYmd(hours));
        }
      } catch {
        if (!cancelled) {
          setConfigLoadFailed(true);
          setPreferredDate((prev) => prev || nextOpenYmd(FALLBACK_OPENING_HOURS));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferredDate) return;
    const day = hoursForDate(preferredDate, openingHours);
    if (day?.isClosed) {
      setPreferredDate(nextOpenYmd(openingHours, preferredDate));
      setPreferredSlot("");
      return;
    }
    if (timeSlots.length === 0) {
      const tomorrow = addDaysYmd(preferredDate, 1);
      const next = nextOpenYmd(openingHours, tomorrow);
      if (next !== preferredDate) {
        setPreferredDate(next);
        setPreferredSlot("");
      }
      return;
    }
    if (preferredSlot && !timeSlots.some((s) => s.value === preferredSlot)) {
      setPreferredSlot("");
    }
  }, [preferredDate, preferredSlot, openingHours, timeSlots]);

  const deliveryFeeDefault =
    Number.parseFloat(process.env.NEXT_PUBLIC_DELIVERY_FEE || "2.5") || 2.5;
  const deliveryFee =
    orderType === "delivery"
      ? (checkoutConfig?.deliveryFee ?? deliveryFeeDefault)
      : 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  const minCard =
    checkoutConfig?.minCheckoutGbp ?? MIN_CHECKOUT_AMOUNT_GBP;
  const belowMin = paymentMethod === "card" && total > 0 && total < minCard;
  const formDisabled = paying;
  const cardUnavailable = checkoutConfig?.paymentsReady === false;
  const cashLabel =
    orderType === "delivery"
      ? "Pay cash on delivery"
      : "Pay cash on collection";

  function validateRequiredFields(): CheckoutFieldErrors {
    const errors: CheckoutFieldErrors = {};
    if (!name.trim()) errors.name = "Please enter your name";
    if (!phone.trim()) errors.phone = "Please enter your phone number";
    if (!email.trim()) {
      errors.email = "Please enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    if (!preferredDate || !preferredSlot) {
      errors.time = "Please choose a preferred date and time";
    } else {
      const day = hoursForDate(preferredDate, openingHours);
      if (!day || day.isClosed) {
        errors.time = "We are closed on that day — please choose another date";
      } else if (!timeSlotsForDate(preferredDate, openingHours).some((s) => s.value === preferredSlot)) {
        errors.time = "Please choose a time within opening hours";
      }
    }
    if (orderType === "delivery" && !address.trim()) {
      errors.address = "Please enter your delivery address";
    }
    return errors;
  }

  function clearFieldError(field: keyof CheckoutFieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function checkoutPayload() {
    return {
      lines: lines.map((l) => ({ id: l.id, qty: l.qty })),
      orderType,
      customerDetails: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim() || undefined,
        time: preferredTimeLabel,
        notes: notes.trim() || undefined,
      },
    };
  }

  async function handlePay() {
    if (!lines.length) {
      showToast("Add items from the menu first");
      scrollToSection("menu");
      return;
    }
    const errors = validateRequiredFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast("Please fill in the required fields highlighted below");
      return;
    }
    setFieldErrors({});

    if (paymentMethod === "card") {
      if (cardUnavailable) {
        showToast(
          "Card payments are not configured yet — choose cash or phone the restaurant.",
        );
        return;
      }
      if (total < minCard) {
        showToast(
          `Minimum card payment is £${minCard.toFixed(2)} — add another dish, choose cash, or call ${site.phone}.`,
        );
        return;
      }
    }

    setPaying(true);
    try {
      if (paymentMethod === "cash") {
        const res = await fetch("/api/create-cash-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkoutPayload()),
        });
        const raw = await res.text();
        let data: {
          orderId?: string;
          error?: string;
          details?: Record<string, string[] | undefined>;
        } = {};
        if (raw) {
          try {
            data = JSON.parse(raw) as typeof data;
          } catch {
            throw new Error(
              res.ok
                ? "Order server returned an invalid response."
                : `Order could not be placed (HTTP ${res.status}). Please try again or call ${site.phone}.`,
            );
          }
        }
        if (!res.ok) {
          const detail =
            data.details && typeof data.details === "object"
              ? Object.values(data.details).flat().filter(Boolean)[0]
              : undefined;
          throw new Error(
            data.error ||
              (typeof detail === "string" ? detail : null) ||
              "Order could not be placed",
          );
        }
        if (!data.orderId) {
          throw new Error("No order reference returned");
        }
        clear();
        window.location.href = `/order-confirmed?order_id=${encodeURIComponent(data.orderId)}`;
        return;
      }

      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload()),
      });
      const raw = await res.text();
      let data: {
        url?: string;
        error?: string;
        details?: Record<string, string[] | undefined>;
      } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          throw new Error(
            res.ok
              ? "Payment server returned an invalid response."
              : `Payment could not be started (HTTP ${res.status}). Please try again or call ${site.phone}.`,
          );
        }
      }
      if (!res.ok) {
        const detail =
          data.details && typeof data.details === "object"
            ? Object.values(data.details).flat().filter(Boolean)[0]
            : undefined;
        throw new Error(
          data.error ||
            (typeof detail === "string" ? detail : null) ||
            "Payment could not be started",
        );
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPaying(false);
    }
  }

  const submitDisabled =
    paying ||
    (paymentMethod === "card" &&
      (belowMin ||
        (checkoutConfig === null && !configLoadFailed) ||
        cardUnavailable));

  const submitLabel = (() => {
    if (paying) {
      return paymentMethod === "cash"
        ? "Placing order…"
        : "Redirecting to secure payment…";
    }
    if (paymentMethod === "cash") return "Place cash order →";
    return "Pay securely online →";
  })();

  return (
    <div className="form-card">
      <h3 className="form-title">Basket &amp; pay</h3>
      <p className="form-subtitle">
        Add dishes from the menu above, then pay by card online or choose cash
        on collection / delivery. We&apos;ll email you a confirmation.
      </p>

      {cardUnavailable && paymentMethod === "card" ? (
        <p
          style={{
            padding: "12px 14px",
            marginBottom: "16px",
            borderRadius: "8px",
            background: "rgba(176, 48, 47, 0.08)",
            border: "1px solid var(--border)",
            color: "var(--crimson)",
            fontSize: "0.9rem",
          }}
        >
          Online card payment is unavailable (Worldpay is not configured on the
          server). Choose cash below, or call{" "}
          <a href={site.phoneTelHref} style={{ color: "inherit", fontWeight: 700 }}>
            {site.phone}
          </a>
          .
        </p>
      ) : null}

      {checkoutConfig?.baseUrlConfigured === false && paymentMethod === "card" ? (
        <p
          style={{
            padding: "10px 12px",
            marginBottom: "14px",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.04)",
            fontSize: "0.82rem",
            color: "var(--text-light)",
          }}
        >
          Set <code style={{ fontSize: "0.78em" }}>NEXT_PUBLIC_URL</code> in
          production so Worldpay returns customers to the correct site after
          checkout.
        </p>
      ) : null}

      {belowMin ? (
        <p
          style={{
            padding: "10px 12px",
            marginBottom: "14px",
            borderRadius: "8px",
            background: "rgba(176, 48, 47, 0.06)",
            fontSize: "0.88rem",
            color: "var(--text-light)",
          }}
        >
          Basket total is under the £{minCard.toFixed(2)} card minimum — add
          another item, choose cash, or phone{" "}
          <a href={site.phoneTelHref} style={{ color: "var(--crimson)" }}>
            {site.phone}
          </a>
          .
        </p>
      ) : null}

      {lines.length === 0 ? (
        <p style={{ color: "var(--text-light)", marginBottom: "20px" }}>
          Your basket is empty — scroll to{" "}
          <button
            type="button"
            onClick={() => scrollToSection("menu")}
            style={{
              background: "none",
              border: "none",
              color: "var(--crimson)",
              textDecoration: "underline",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Our Full Menu
          </button>{" "}
          and tap <strong>+ Add</strong> on any dish.
        </p>
      ) : (
        <div style={{ marginBottom: "22px" }}>
          <ul style={{ listStyle: "none", marginBottom: "12px" }}>
            {lines.map((l) => (
              <li
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ flex: 1, fontWeight: 600 }}>{l.name}</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={l.qty}
                  disabled={formDisabled}
                  className="form-input"
                  style={{ width: "64px", padding: "8px" }}
                  onChange={(e) =>
                    setQty(l.id, Number.parseInt(e.target.value, 10) || 1)
                  }
                />
                <span style={{ minWidth: "72px", textAlign: "right" }}>
                  £{(l.price * l.qty).toFixed(2)}
                </span>
                <button
                  type="button"
                  className="btn-outline-dark"
                  style={{ padding: "6px 12px", fontSize: "0.72rem" }}
                  disabled={formDisabled}
                  onClick={() => removeLine(l.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
            }}
          >
            <span>Subtotal</span>
            <span>£{subtotal.toFixed(2)}</span>
          </div>
          {orderType === "delivery" ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
              }}
            >
              <span>Delivery</span>
              <span>£{deliveryFee.toFixed(2)}</span>
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
              fontSize: "1.1rem",
              fontFamily: "var(--font-playfair), serif",
            }}
          >
            <span>Total</span>
            <span>£{total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            className="btn-outline-dark"
            style={{ marginTop: "12px", fontSize: "0.78rem" }}
            disabled={formDisabled}
            onClick={() => {
              clear();
              showToast("Basket cleared");
            }}
          >
            Clear basket
          </button>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input
            className={`form-input${fieldErrors.name ? " form-input-invalid" : ""}`}
            value={name}
            disabled={formDisabled}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
            placeholder="Your name"
            aria-invalid={fieldErrors.name ? true : undefined}
          />
          <FieldError message={fieldErrors.name} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone *</label>
          <input
            className={`form-input${fieldErrors.phone ? " form-input-invalid" : ""}`}
            value={phone}
            disabled={formDisabled}
            onChange={(e) => {
              setPhone(e.target.value);
              clearFieldError("phone");
            }}
            placeholder="07xxx xxxxxx"
            aria-invalid={fieldErrors.phone ? true : undefined}
          />
          <FieldError message={fieldErrors.phone} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Email *</label>
        <input
          type="email"
          className={`form-input${fieldErrors.email ? " form-input-invalid" : ""}`}
          value={email}
          disabled={formDisabled}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          placeholder="your@email.com"
          aria-invalid={fieldErrors.email ? true : undefined}
          required
        />
        <FieldError message={fieldErrors.email} />
      </div>
      <div className="form-group">
        <label className="form-label">Collection or delivery *</label>
        <select
          className="form-select"
          value={orderType}
          disabled={formDisabled}
          onChange={(e) => {
            setOrderType(e.target.value as "collection" | "delivery");
            if (e.target.value === "collection") clearFieldError("address");
          }}
        >
          <option value="collection">Collection — I&apos;ll pick it up</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>
      {orderType === "delivery" ? (
        <div className="form-group">
          <label className="form-label">Delivery address *</label>
          <input
            className={`form-input${fieldErrors.address ? " form-input-invalid" : ""}`}
            value={address}
            disabled={formDisabled}
            onChange={(e) => {
              setAddress(e.target.value);
              clearFieldError("address");
            }}
            placeholder="Full address including postcode"
            aria-invalid={fieldErrors.address ? true : undefined}
          />
          <FieldError message={fieldErrors.address} />
        </div>
      ) : null}
      <div className="form-group">
        <label className="form-label">Preferred time *</label>
        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="preferred-date" style={{ fontSize: "0.85em", opacity: 0.85 }}>
              Date
            </label>
            <input
              id="preferred-date"
              type="date"
              className={`form-input${fieldErrors.time ? " form-input-invalid" : ""}`}
              value={preferredDate}
              min={minDate}
              max={maxDate}
              disabled={formDisabled}
              onChange={(e) => {
                setPreferredDate(e.target.value);
                setPreferredSlot("");
                clearFieldError("time");
              }}
              aria-invalid={fieldErrors.time ? true : undefined}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="preferred-slot" style={{ fontSize: "0.85em", opacity: 0.85 }}>
              Time
            </label>
            <select
              id="preferred-slot"
              className={`form-select${fieldErrors.time ? " form-input-invalid" : ""}`}
              value={preferredSlot}
              disabled={formDisabled || !preferredDate || timeSlots.length === 0}
              onChange={(e) => {
                setPreferredSlot(e.target.value);
                clearFieldError("time");
              }}
              aria-invalid={fieldErrors.time ? true : undefined}
            >
              <option value="">
                {timeSlots.length === 0 ? "Closed / no times" : "Select a time"}
              </option>
              {timeSlots.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <FieldError message={fieldErrors.time} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          value={notes}
          disabled={formDisabled}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Allergies, extra instructions…"
        />
      </div>

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 8px" }}>
        <legend className="form-label" style={{ marginBottom: "10px" }}>
          Payment method *
        </legend>
        <div className="checkout-pay-methods" role="radiogroup" aria-label="Payment method">
          <label className="checkout-pay-option">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === "card"}
              disabled={formDisabled}
              onChange={() => setPaymentMethod("card")}
            />
            <span>
              <span className="checkout-pay-option-title">
                Pay securely online (card)
              </span>
              <span className="checkout-pay-option-desc">
                Enter card details on Worldpay&apos;s secure payment page.
              </span>
            </span>
          </label>
          <label className="checkout-pay-option">
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === "cash"}
              disabled={formDisabled}
              onChange={() => setPaymentMethod("cash")}
            />
            <span>
              <span className="checkout-pay-option-title">{cashLabel}</span>
              <span className="checkout-pay-option-desc">
                We&apos;ll prepare your order — pay cash when you{" "}
                {orderType === "delivery" ? "receive delivery" : "collect"}.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        className="form-submit"
        disabled={submitDisabled}
        onClick={handlePay}
      >
        {submitLabel}
      </button>
      <p style={{ fontSize: "0.8rem", color: "var(--text-light)", marginTop: "12px" }}>
        Prefer to order by phone? Call{" "}
        <a href={site.phoneTelHref} style={{ color: "var(--crimson)" }}>
          {site.phone}
        </a>
        .
      </p>
    </div>
  );
}
