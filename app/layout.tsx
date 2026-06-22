import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Postradamus – Instagram-Posts automatisch planen & posten",
  description: "Die KI, die in die Zukunft deiner Social-Media-Posts schaut. Captions, Postingplan und Veröffentlichung – alles aus einer Hand. 14 Tage kostenlos testen.",
  metadataBase: new URL("https://postradamus.ai"),
  icons: {
    icon: "/brand/postradamus-mark.png"
  },
  openGraph: {
    title: "Postradamus – Instagram-Posts automatisch planen & posten",
    description: "Bilder hochladen, Stil wählen – Postradamus übernimmt den Rest. KI-Captions, Postingplan, Instagram-Veröffentlichung. 14 Tage gratis.",
    url: "https://postradamus.ai",
    siteName: "Postradamus",
    images: [
      {
        url: "/marketing/postradamus-og.png",
        width: 1729,
        height: 910,
        alt: "Postradamus – Deine Posts perfekt für die Zukunft automatisiert"
      }
    ],
    locale: "de_AT",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Postradamus – Instagram-Posts automatisch planen",
    description: "Bilder hochladen, Stil wählen – Postradamus übernimmt den Rest. 14 Tage kostenlos testen.",
    images: ["/marketing/postradamus-og.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      <body className={body.variable}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
