import {
  buildSitePublicSettings,
  getDefaultSiteSettingsMap,
} from "@/lib/site-settings-shared";
import type { SitePublicSettings } from "@/lib/site-settings-shared";
import { getPrisma } from "@/lib/prisma";

export async function loadSitePublicSettings(): Promise<SitePublicSettings> {
  if (!process.env.DATABASE_URL) {
    return buildSitePublicSettings({});
  }
  try {
    const prisma = getPrisma();
    const rows = await prisma.siteSetting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return buildSitePublicSettings(map);
  } catch (e) {
    console.error("[loadSitePublicSettings]", e);
    return buildSitePublicSettings({});
  }
}

export async function loadSiteSettingsRecord(): Promise<Record<string, string>> {
  const merged = getDefaultSiteSettingsMap();
  if (!process.env.DATABASE_URL) {
    return merged;
  }
  try {
    const prisma = getPrisma();
    const rows = await prisma.siteSetting.findMany();
    for (const r of rows) {
      merged[r.key] = r.value;
    }
    return merged;
  } catch (e) {
    console.error("[loadSiteSettingsRecord]", e);
    return merged;
  }
}
