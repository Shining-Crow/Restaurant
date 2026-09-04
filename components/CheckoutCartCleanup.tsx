"use client";

import { useCart } from "@/components/CartContext";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function CheckoutCartCleanup() {
  const pathname = usePathname();
  const { clear } = useCart();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const orderId =
      params.get("order_id")?.trim() || params.get("OrderID")?.trim();
    if (orderId?.startsWith("ord_")) {
      clear();
    }
  }, [pathname, clear]);

  return null;
}
