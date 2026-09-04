"use client";

import { CheckoutCartCleanup } from "@/components/CheckoutCartCleanup";
import { CartProvider } from "@/components/CartContext";
import { MenuProvider } from "@/components/MenuContext";
import { SiteSettingsProvider } from "@/components/SiteSettingsContext";
import { ToastProvider } from "@/components/ToastContext";
import type { MenuItem } from "@/lib/menu-types";
import type { SitePublicSettings } from "@/lib/site-settings-shared";
import type { ReactNode } from "react";

export function Providers({
  children,
  initialMenuItems,
  siteSettings,
}: {
  children: ReactNode;
  initialMenuItems?: MenuItem[];
  siteSettings: SitePublicSettings;
}) {
  return (
    <SiteSettingsProvider value={siteSettings}>
      <MenuProvider initialMenuItems={initialMenuItems}>
        <CartProvider>
          <CheckoutCartCleanup />
          <ToastProvider>{children}</ToastProvider>
        </CartProvider>
      </MenuProvider>
    </SiteSettingsProvider>
  );
}
