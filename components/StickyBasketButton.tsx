"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";
import { scrollToSection } from "@/lib/scroll";

export function StickyBasketButton() {
  const { lines, count, subtotal } = useCart();
  const [orderInView, setOrderInView] = useState(true);

  useEffect(() => {
    const el = document.getElementById("order");
    if (!el || typeof IntersectionObserver === "undefined") {
      setOrderInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setOrderInView(entry.isIntersecting);
      },
      { root: null, threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!lines.length || orderInView) return null;

  return (
    <button
      type="button"
      className="sticky-basket-btn"
      onClick={() => scrollToSection("order")}
      aria-label={`Open basket, ${count} items, £${subtotal.toFixed(2)}`}
    >
      <span className="sticky-basket-label">Basket</span>
      <span className="sticky-basket-meta">
        {count} · £{subtotal.toFixed(2)}
      </span>
    </button>
  );
}
