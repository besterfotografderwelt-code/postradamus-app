"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrialButton({ plan }: { plan: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/start-trial", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.push("/projects");
      } else if (res.status === 401) {
        router.push("/login");
      } else {
        router.push(`/login?error=${encodeURIComponent(data.error || "Fehler")}`);
      }
    } catch {
      router.push("/login?error=Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="button pricing-button" onClick={start} disabled={loading} type="button">
      {loading ? "Wird gestartet …" : "14 Tage gratis testen"}
    </button>
  );
}
