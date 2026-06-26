"use client";

import { useEffect, useState } from "react";

export function EarlyBirdBanner() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/early-bird")
      .then((res) => res.json())
      .then((data: { remaining: number; active: boolean }) => {
        if (data.active) setRemaining(data.remaining);
      })
      .catch(() => {});
  }, []);

  if (remaining === null || remaining <= 0) return null;

  return (
    <div className="early-bird-banner">
      <div className="early-bird-banner-inner">
        <span className="early-bird-icon">🎉</span>
        <div>
          <strong>Early-Bird-Aktion</strong>
          <p>
            Die ersten 50 Kunden zahlen nur{" "}
            <em>19,90 €</em> statt 24,90 € – <strong>für immer</strong>.
            Noch{" "}
            <span className="early-bird-count">{remaining}</span>{" "}
            {remaining === 1 ? "Platz" : "Plätze"} frei.
          </p>
        </div>
      </div>
    </div>
  );
}
