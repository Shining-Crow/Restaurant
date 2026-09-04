import * as z from "zod";
import { SITE_SETTING_KEYS } from "@/lib/site-settings-shared";

const allowedKeys = new Set<string>(Object.values(SITE_SETTING_KEYS));

export const patchSiteSettingsBodySchema = z
  .object({
    settings: z.record(z.string(), z.string().max(20_000)),
  })
  .strict()
  .refine(
    (body) => Object.keys(body.settings).every((k) => allowedKeys.has(k)),
    "Unknown setting key",
  );
