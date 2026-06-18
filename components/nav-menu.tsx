"use client";

import Link from "next/link";
import { useState } from "react";

type NavMenuProps = {
  links: Array<{ href: string; label: string; primary?: boolean }>;
  signOut?: boolean;
};

export function NavMenu({ links, signOut }: NavMenuProps) {
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
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={item.primary ? "nav-primary" : ""}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        {signOut ? (
          <form action="/api/signout" method="get">
            <button className="nav-button" type="submit" onClick={() => setOpen(false)}>Abmelden</button>
          </form>
        ) : null}
      </nav>
    </>
  );
}
