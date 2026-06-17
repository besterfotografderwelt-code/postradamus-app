"use client";

import Link from "next/link";
import { useState } from "react";

type NavMenuProps = {
  menu: Array<{ href: string; label: string; primary?: boolean; action?: "signOut" }>;
};

export function NavMenu({ menu }: NavMenuProps) {
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    // Client-only signout: clear everything and redirect
    try { await fetch("/api/signout", { method: "POST" }); } catch { /* ignore */ }
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
    window.location.href = "/login";
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
