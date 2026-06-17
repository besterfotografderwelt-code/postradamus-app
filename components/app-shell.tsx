import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { NavMenu } from "@/components/nav-menu";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const configured = isSupabaseConfigured();
  const user = configured
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  const navLinks: Array<{ href: string; label: string; primary?: boolean }> = [
    { href: "/", label: "Start" },
    { href: "/preise", label: "Preise" },
    { href: "/kundenbereich", label: "Kundenbereich" },
    { href: "/faq", label: "FAQ" },
    { href: "/kontakt", label: "Kontakt" },
    ...(user ? [] : [{ href: "/login", label: "Login", primary: true }]),
    ...(user
      ? [{ href: "/projects", label: "Projekte", primary: true }]
      : []),
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Postradamus Startseite">
          <Image className="brand-logo" src="/brand/postradamus-mark.png" alt="" width={219} height={256} aria-hidden="true" />
          <strong>Postradamus</strong>
        </Link>
        <NavMenu links={navLinks} />
        {user && (
          <form action="/api/signout" method="get">
            <button className="nav-button" type="submit">Abmelden</button>
          </form>
        )}
      </header>

      <main>{children}</main>
      <footer className="site-footer" aria-label="Footer">
        <div>
          <strong>Postradamus</strong>
          <span>Deine Posts automatisiert für die Zukunft.</span>
        </div>
        <nav aria-label="Rechtliches und Kontakt">
          <Link href="/kontakt">Kontakt</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/agb">AGB</Link>
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">DSGVO</Link>
          <Link href="/cookies">Cookies</Link>
        </nav>
      </footer>
    </div>
  );
}
