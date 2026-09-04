"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  FALLBACK_SITE_PUBLIC_SETTINGS,
  type SitePublicSettings,
} from "@/lib/site-settings-shared";

const SiteSettingsContext = createContext<SitePublicSettings>(
  FALLBACK_SITE_PUBLIC_SETTINGS,
);

export function SiteSettingsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SitePublicSettings;
}) {
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SitePublicSettings {
  return useContext(SiteSettingsContext);
}
