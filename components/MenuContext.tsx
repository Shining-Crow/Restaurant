"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { MenuItem } from "@/lib/menu-types";

const STORAGE_KEY = "amore_mio_menu";

type MenuCtx = {
  items: MenuItem[];
  setItems: (up: MenuItem[] | ((prev: MenuItem[]) => MenuItem[])) => void;
  hydrated: boolean;
};

const MenuItemsContext = createContext<MenuCtx | null>(null);

export function MenuProvider({
  children,
  initialMenuItems,
}: {
  children: ReactNode;
  /** From server layout when DB read succeeds — including an empty list. */
  initialMenuItems?: MenuItem[];
}) {
  const [items, setItemsState] = useState<MenuItem[]>(() =>
    initialMenuItems !== undefined ? initialMenuItems : [],
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyLocalFallback = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as MenuItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItemsState(parsed);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      setItemsState([]);
    };

    async function load() {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        const data: unknown = await res.json().catch(() => ({}));
        if (cancelled) return;
        const list =
          typeof data === "object" &&
          data !== null &&
          "items" in data &&
          Array.isArray((data as { items: unknown }).items)
            ? (data as { items: MenuItem[] }).items
            : null;
        // Any 2xx response with a proper `items` array is the source of truth (including empty).
        if (res.ok && list !== null) {
          setItemsState(list);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          } catch {
          }
          setHydrated(true);
          return;
        }
      } catch {
      }
      if (cancelled) return;
      if (initialMenuItems === undefined) {
        applyLocalFallback();
      }
      setHydrated(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialMenuItems]);

  const setItems = useCallback(
    (up: MenuItem[] | ((prev: MenuItem[]) => MenuItem[])) => {
      setItemsState((prev) => {
        const next = typeof up === "function" ? up(prev) : up;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  return (
    <MenuItemsContext.Provider value={{ items, setItems, hydrated }}>
      {children}
    </MenuItemsContext.Provider>
  );
}

export function useMenuItems() {
  const c = useContext(MenuItemsContext);
  if (!c) throw new Error("useMenuItems must be used within MenuProvider");
  return c;
}
