"use client";

import { useCart } from "@/components/CartContext";
import { useToast } from "@/components/ToastContext";

type Props = {
  id: number;
  name: string;
  price: number;
};

export function MenuAddButton({ id, name, price }: Props) {
  const { addItem } = useCart();
  const showToast = useToast();
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
