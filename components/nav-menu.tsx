"use client";

import Link from "next/link";
import { useState } from "react";

type NavMenuProps = {
  menu: Array<{ href: string; label: string; primary?: boolean; action?: "signOut" }>;
};

export function NavMenu({ menu }: NavMenuProps) {
  const [open, setOpen] = useState(false);

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
        {menu.map((item) =>
          item.action === "signOut" ? (
            <form key="signout" action="/auth/signout" method="post">
              <button className="nav-button" type="submit">Abmelden</button>
            </form>
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
