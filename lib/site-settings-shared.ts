export const SITE_SETTING_KEYS = {
  restaurantName: "restaurant_name",
  restaurantTagline: "restaurant_tagline",
  phone: "phone",
  address: "address",
  announcementBar: "announcement_bar",
  restaurantEmail: "restaurant_email",
  hoursStripWeekdayLabel: "hours_strip_weekday_label",
  hoursStripWeekdayTime: "hours_strip_weekday_time",
  hoursStripWeekendLabel: "hours_strip_weekend_label",
  hoursStripWeekendTime: "hours_strip_weekend_time",
} as const;

export type SitePublicSettings = {
  restaurantName: string;
  restaurantTagline: string;
  phone: string;
  phoneTelHref: string;
  email: string;
  emailMailtoHref: string;
  addressLines: string[];
  addressSingleLine: string;
  addressMapsHref: string;
  announcementBar: string;
  hoursStripWeekdayLabel: string;
  hoursStripWeekdayTime: string;
  hoursStripWeekendLabel: string;
  hoursStripWeekendTime: string;
};

const DEFAULT_STRINGS: Record<string, string> = {
  [SITE_SETTING_KEYS.restaurantName]: "Amore Mio",
  [SITE_SETTING_KEYS.restaurantTagline]: "Italian Experience",
  [SITE_SETTING_KEYS.phone]: "01246 938793",
  [SITE_SETTING_KEYS.address]:
    "21 Market Street\nClay Cross\nDerbyshire, S45 9JE",
  [SITE_SETTING_KEYS.announcementBar]:
    "To order takeaway, call us on {phone} — we're open from 4pm (closed Mondays).",
  [SITE_SETTING_KEYS.restaurantEmail]: "hello@amoremio.co.uk",
  [SITE_SETTING_KEYS.hoursStripWeekdayLabel]: "Tue–Thu & Sun",
  [SITE_SETTING_KEYS.hoursStripWeekdayTime]: "4:00pm – 10:00pm",
  [SITE_SETTING_KEYS.hoursStripWeekendLabel]: "Fri & Saturday",
  [SITE_SETTING_KEYS.hoursStripWeekendTime]: "4:00pm – 11:00pm",
};

export function getDefaultSiteSettingsMap(): Record<string, string> {
  return { ...DEFAULT_STRINGS };
}

export function phoneToTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:${digits}` : "tel:";
}

function parseAddressLines(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  if (t.includes("\n")) {
    return t
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return [t];
}

function buildAnnouncementBar(raw: string, phone: string): string {
  const withPlaceholder = raw.replace(/\b0\d{4}\s?\d{6}\b/g, "{phone}");
  return withPlaceholder.replace(/\{phone\}/g, phone);
}

export function buildSitePublicSettings(dbMap: Record<string, string>): SitePublicSettings {
  const merged = { ...DEFAULT_STRINGS };
  for (const [k, v] of Object.entries(dbMap)) {
    if (v != null && String(v).trim() !== "") {
      merged[k] = String(v).trim();
    }
  }

  const phone = merged[SITE_SETTING_KEYS.phone] ?? DEFAULT_STRINGS.phone;
  const email = merged[SITE_SETTING_KEYS.restaurantEmail] ?? "";
  const addrRaw = merged[SITE_SETTING_KEYS.address] ?? "";
  const lines = parseAddressLines(addrRaw);
  const single = lines.length ? lines.join(", ") : parseAddressLines(DEFAULT_STRINGS[SITE_SETTING_KEYS.address]).join(", ");

  return {
    restaurantName: merged[SITE_SETTING_KEYS.restaurantName] ?? "",
    restaurantTagline: merged[SITE_SETTING_KEYS.restaurantTagline] ?? "",
    phone,
    phoneTelHref: phoneToTelHref(phone),
    email,
    emailMailtoHref: email ? `mailto:${email}` : "mailto:",
    addressLines: lines.length ? lines : parseAddressLines(DEFAULT_STRINGS[SITE_SETTING_KEYS.address]),
    addressSingleLine: single,
    addressMapsHref: `https://maps.google.com/?q=${encodeURIComponent(single)}`,
    announcementBar: buildAnnouncementBar(
      merged[SITE_SETTING_KEYS.announcementBar] ??
        DEFAULT_STRINGS[SITE_SETTING_KEYS.announcementBar],
      phone,
    ),
    hoursStripWeekdayLabel:
      merged[SITE_SETTING_KEYS.hoursStripWeekdayLabel] ?? "",
    hoursStripWeekdayTime:
      merged[SITE_SETTING_KEYS.hoursStripWeekdayTime] ?? "",
    hoursStripWeekendLabel:
      merged[SITE_SETTING_KEYS.hoursStripWeekendLabel] ?? "",
    hoursStripWeekendTime:
      merged[SITE_SETTING_KEYS.hoursStripWeekendTime] ?? "",
  };
}

export const FALLBACK_SITE_PUBLIC_SETTINGS = buildSitePublicSettings({});
