import type { Metadata, Viewport } from "next";
import { getMessages } from "@zwf/i18n";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const m = getMessages("uk");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${m.brand.name} — облік продуктів і рецепти із залишків`,
    template: `%s · ${m.brand.name}`,
  },
  description: m.landing.subtitle,
  keywords: ["zero waste", "холодильник", "термін придатності", "рецепти із залишків", "список покупок", "харчові відходи"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: m.brand.name,
    title: m.landing.title,
    description: m.landing.subtitle,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: m.landing.title, description: m.landing.subtitle },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#006948",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
