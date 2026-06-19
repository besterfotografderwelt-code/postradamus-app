"use client";

import { useEffect, useState } from "react";

type StatsData = {
  waitlistCount: number;
  instagramConnected: boolean;
  hasOpenAI: boolean;
  hasDeepSeek: boolean;
  hasSupabase: boolean;
  apiRoutes: Array<{ path: string; method: string; status: string }>;
};

function StatCard({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className={`stat-card ${good === true ? "is-good" : good === false ? "is-bad" : ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function AdminStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Stats nicht verfügbar");
        return res.json() as Promise<StatsData>;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="admin-stats" style={{ marginTop: 32 }}>
        <h2>System-Status</h2>
        <p className="form-message form-message-error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-stats" style={{ marginTop: 32 }}>
        <h2>System-Status</h2>
        <p className="helper">Lade Statistiken …</p>
      </div>
    );
  }

  return (
    <div className="admin-stats" style={{ marginTop: 32 }}>
      <h2>System-Status</h2>
      <div className="stat-grid">
        <StatCard
          label="Waitlist-Anmeldungen"
          value={String(data.waitlistCount)}
        />
        <StatCard
          label="Instagram"
          value={data.instagramConnected ? "Verbunden" : "Nicht verbunden"}
          good={data.instagramConnected}
        />
        <StatCard
          label="OpenAI API"
          value={data.hasOpenAI ? "Key vorhanden" : "Kein Key"}
          good={data.hasOpenAI}
        />
        <StatCard
          label="DeepSeek API"
          value={data.hasDeepSeek ? "Key vorhanden" : "Kein Key"}
          good={data.hasDeepSeek}
        />
        <StatCard
          label="Supabase"
          value={data.hasSupabase ? "Konfiguriert" : "Nicht konfiguriert"}
          good={data.hasSupabase}
        />
      </div>

      <h3 style={{ marginTop: 24 }}>API-Routen</h3>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Route</th>
            <th>Methode</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.apiRoutes.map((route) => (
            <tr key={route.path}>
              <td><code>{route.path}</code></td>
              <td>{route.method}</td>
              <td>
                <span
                  className={`status-badge ${route.status === "ready" ? "is-ready" : "is-warning"}`}
                >
                  {route.status === "ready"
                    ? "✅ Bereit"
                    : route.status === "needs_auth"
                      ? "⚠️ Auth nötig"
                      : "❌ Fehler"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
