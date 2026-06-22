"use client";

import { useState } from "react";

type TrialButtonProps = { plan?: string };

export function TrialButton({ plan = "trial" }: TrialButtonProps) {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const res = await fetch("/api/stripe/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          returnUrl: `${origin}/kundenbereich?subscribed=true`,
          cancelUrl: `${origin}/preise?cancelled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = "/login?next=/preise";
      } else {
        alert("Fehler: " + (data.error ?? "Unbekannt"));
      }
    } catch {
      alert("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="button pricing-button" onClick={start} disabled={loading} type="button">
      {loading ? "Wird geladen …" : "14 Tage gratis testen"}
    </button>
  );
}
