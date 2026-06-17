"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type NavMenuProps = {
  menu: Array<{ href: string; label: string; primary?: boolean; action?: "signOut" }>;
};

export function NavMenu({ menu }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        className="hamburger"
        aria-label="Menü öffnen"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      {open && <div className="nav-overlay" onClick={() => setOpen(false)} />}

      <nav className={`nav ${open ? "nav-open" : ""}`} aria-label="Hauptnavigation">
        <Link className="nav-home" href="/" onClick={() => setOpen(false)}>Home</Link>
        {menu.map((item) =>
          item.action === "signOut" ? (
            <button key="signout" className="nav-button" type="button" onClick={handleSignOut}>Abmelden</button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={item.primary ? "nav-primary" : ""}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          )
        )}
      </nav>
    </>
  );
}
