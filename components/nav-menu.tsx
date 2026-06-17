"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";

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
        <Link className="nav-home" href="/" onClick={() => setOpen(false)}>Home</Link>
        {menu.map((item) =>
          item.action === "signOut" ? (
            <form key="signout" action={signOut}>
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
