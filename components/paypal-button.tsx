"use client";

import { useState } from "react";

type PlanButtonProps = { plan: string; label?: string };

export function PayPalButton({ plan, label = "Jetzt abonnieren" }: PlanButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const res = await fetch("/api/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          returnUrl: `${origin}/kundenbereich?subscribed=true&plan=${plan}`,
          cancelUrl: `${origin}/preise?cancelled=true`,
        }),
      });
      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
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
    <button className="button" onClick={handleSubscribe} disabled={loading} type="button" style={{ background: "#ffc439", borderColor: "#ffc439", color: "#111", fontWeight: 700 }}>
      {loading ? "Wird geladen …" : `💳 ${label}`}
    </button>
  );
}
