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
  title: "Postradamus",
  description: "Die KI, die in die Zukunft deiner Social-Media-Posts schaut. Captions, Postingplan und Veröffentlichung – alles aus einer Hand.",
  icons: {
    icon: "/brand/postradamus-mark.png"
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
