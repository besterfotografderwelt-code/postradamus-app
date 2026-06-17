import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const configured = isSupabaseConfigured();
  const user = configured
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Postradamus Startseite">
          <Image className="brand-logo" src="/brand/postradamus-mark.png" alt="" width={219} height={256} aria-hidden="true" />
          <strong>Postradamus</strong>
        </Link>
        <nav className="nav" aria-label="Hauptnavigation">
          <Link href="/">Start</Link>
          <Link href="/preise">Preise</Link>
          <Link href="/kundenbereich">Kundenbereich</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/kontakt">Kontakt</Link>
          {!configured && <Link className="nav-primary" href="/login">Login</Link>}
          {configured &&
            (user ? (
              <>
                <Link className="nav-primary" href="/projects/new">Neu</Link>
                <form action={signOut}>
                  <button className="nav-button" type="submit">
                    Abmelden
                  </button>
                </form>
              </>
            ) : (
              <Link className="nav-primary" href="/login">Login</Link>
            ))}
        </nav>
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
