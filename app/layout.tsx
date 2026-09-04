import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { loadMenuItemsFromDatabase } from "@/lib/menu-data";
import { loadSitePublicSettings } from "@/lib/site-settings-data";

const playfair = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
      weight: "400 900",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2",
      weight: "400 900",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-playfair",
});

const cormorant = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2",
      weight: "300 700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2",
      weight: "300 700",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-cormorant",
});

const dmSans = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
      weight: "100 1000",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-italic.woff2",
      weight: "100 1000",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-dm-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await loadSitePublicSettings();
  return {
    title: `${s.restaurantName} — ${s.restaurantTagline} | Clay Cross`,
    description: `${s.restaurantName} Italian Restaurant & Takeaway. Authentic Italian food in Clay Cross, Derbyshire. Fresh pasta, stone-baked pizza, classic Italian dishes. Order takeaway or book a table.`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const menuLoad = await loadMenuItemsFromDatabase();
  const initialMenuItems = menuLoad.ok ? menuLoad.items : undefined;
  const siteSettings = await loadSitePublicSettings();

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${cormorant.variable} ${dmSans.variable}`}
    >
      <body>
        <Providers initialMenuItems={initialMenuItems} siteSettings={siteSettings}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
