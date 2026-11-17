"use client";

import { useCart } from "@/components/CartContext";
import { useToast } from "@/components/ToastContext";
import { ORDERING_PAUSED } from "@/lib/ordering-status";

type Props = {
  id: number;
  name: string;
  price: number;
};

export function MenuAddButton({ id, name, price }: Props) {
  const { addItem } = useCart();
  const showToast = useToast();

  if (ORDERING_PAUSED) {
    return (
      <button
        type="button"
        className="menu-add-btn"
        disabled
        title="Online ordering is paused while we're closed"
      >
        Closed
      </button>
    );
  }

  return (
    <button
      type="button"
      className="menu-add-btn"
      onClick={() => {
        addItem({ id, name, price, qty: 1 });
        showToast(`Added: ${name}`);
      }}
    >
      + Add
    </button>
  );
}
