"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "amore-mio-cart";

export type CartLine = {
  id: number;
  name: string;
  price: number;
  qty: number;
};

type CartCtx = {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (id: number, qty: number) => void;
  removeLine: (id: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const CartContext = createContext<CartCtx | null>(null);

function isCartLine(v: unknown): v is CartLine {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.name === "string" &&
    typeof o.price === "number" &&
    typeof o.qty === "number" &&
    o.id > 0 &&
    o.name.length > 0 &&
    o.price >= 0 &&
    o.price < 5000 &&
    o.qty >= 1 &&
    o.qty <= 99
  );
}

function mergeLine(prev: CartLine[], line: CartLine): CartLine[] {
  const idx = prev.findIndex((p) => p.id === line.id);
  if (idx === -1) return [...prev, line];
  const next = [...prev];
  next[idx] = {
    ...next[idx],
    qty: Math.min(99, next[idx].qty + line.qty),
  };
  return next;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setBootstrapped(true);
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          setBootstrapped(true);
          return;
        }
        const next = parsed.filter(isCartLine).slice(0, 80);
        if (next.length) setLines(next);
      } catch {
      }
      setBootstrapped(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
    }
  }, [lines, bootstrapped]);

  const addItem = useCallback((line: Omit<CartLine, "qty"> & { qty?: number }) => {
    const qty = line.qty ?? 1;
    setLines((prev) =>
      mergeLine(prev, {
        id: line.id,
        name: line.name,
        price: line.price,
        qty,
      }),
    );
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setLines((prev) => {
      if (qty < 1) return prev.filter((l) => l.id !== id);
      return prev.map((l) =>
        l.id === id ? { ...l, qty: Math.min(99, qty) } : l,
      );
    });
  }, []);

  const removeLine = useCallback((id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const { subtotal, count } = useMemo(() => {
    const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const c = lines.reduce((s, l) => s + l.qty, 0);
    return { subtotal: Math.round(sub * 100) / 100, count: c };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      addItem,
      setQty,
      removeLine,
      clear,
      subtotal,
      count,
    }),
    [lines, addItem, setQty, removeLine, clear, subtotal, count],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
