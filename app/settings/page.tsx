"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const IG_CREDS_KEY = "weddingflow.instagram.v1";
const INSTAGRAM_CLIENT_ID = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;

type InstagramConfig = {
  accessToken: string;
  accountId: string;
  username: string;
};

export default function SettingsPage() {
  const [config, setConfig] = useState<InstagramConfig>({ accessToken: "", accountId: "", username: "" });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IG_CREDS_KEY);
      if (stored) setConfig(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function save() {
    localStorage.setItem(IG_CREDS_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function connectInstagram() {
    if (!INSTAGRAM_CLIENT_ID) {
      setTestResult("❌ Instagram App-ID fehlt. Bitte NEXT_PUBLIC_INSTAGRAM_CLIENT_ID konfigurieren.");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/instagram/callback`;
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish&response_type=code`;
  }

  function disconnect() {
    localStorage.removeItem(IG_CREDS_KEY);
    setConfig({ accessToken: "", accountId: "", username: "" });
    setTestResult("");
  }

  async function testConnection() {
    setTesting(true);
    setTestResult("");
    try {
      // Check token AND auto-refresh if close to expiry
      const checkRes = await fetch("/api/instagram/check-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: config.accessToken, autoRefresh: true })
      });
      const checkData = await checkRes.json();

      if (!checkData.valid) {
        setTestResult(`❌ ${checkData.message || "Token ungültig. Bitte neu verbinden."}`);
        setTesting(false);
        return;
      }

      // If token was refreshed, auto-save the new one
      if (checkData.refreshed && checkData.accessToken) {
        const updated = { ...config, accessToken: checkData.accessToken };
        setConfig(updated);
        localStorage.setItem(IG_CREDS_KEY, JSON.stringify(updated));
      }

      // Also verify posting capability
      const res = await fetch("/api/instagram/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: [],
          caption: "Test",
          accessToken: checkData.accessToken || config.accessToken,
          instagramAccountId: config.accountId,
          testOnly: true
        })
      });
      if (res.ok) {
        const daysInfo = checkData.daysLeft ? ` (gültig für ~${checkData.daysLeft} Tage)` : "";
        const refreshInfo = checkData.refreshed ? " 🔄 Token erneuert!" : "";
        setTestResult(`✅ Verbindung erfolgreich!${daysInfo}${refreshInfo}`);
      } else {
        const data = await res.json();
        setTestResult(`❌ ${data.error}`);
      }
    } catch {
      setTestResult("❌ Verbindung fehlgeschlagen.");
    } finally {
      setTesting(false);
    }
  }

  const isConfigured = config.accessToken && config.accountId;

  return (
    <div className="narrow-page" style={{ marginBottom: 40 }}>
      <Link className="button-secondary" href="/projects" style={{ width: "fit-content" }}>
        ← Projekte
      </Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>Einstellungen</div>
      <h1>Instagram</h1>

      <div className="settings-section">
        <h3>Business-Konto verbinden</h3>
        <p>Damit Postradamus direkt für dich posten kann, verbinde dein Instagram Business-Konto.</p>

        {/* Primary action: always visible connect/reconnect button */}
        <button
          className="button publish-button"
          onClick={connectInstagram}
          style={{ margin: "16px 0" }}
          type="button"
        >
          {isConfigured ? "🔄 Instagram neu verbinden" : "🔗 Mit Instagram verbinden (1-Klick)"}
        </button>

        {/* Status */}
        {isConfigured ? (
          <div className="panel" style={{ padding: 14, borderRadius: 12, background: "#edfaef", border: "1px solid #c6e9c9", marginBottom: 16, fontSize: ".9rem" }}>
            ✅ Verbunden als <strong>@{config.username || "Instagram Business"}</strong>
            {" · "}
            <button
              className="button-secondary"
              disabled={testing}
              onClick={testConnection}
              style={{ fontSize: ".82rem", padding: "3px 10px" }}
              type="button"
            >
              {testing ? "Prüfe …" : "Status prüfen"}
            </button>
            {" · "}
            <button
              className="button-secondary"
              onClick={disconnect}
              style={{ fontSize: ".82rem", padding: "3px 10px", color: "var(--error, #c00)", borderColor: "var(--error, #c00)" }}
              type="button"
            >
              Trennen
            </button>
          </div>
        ) : (
          <div className="panel" style={{ padding: 18, borderRadius: 14, marginBottom: 16, background: "#fffbe6", border: "1px solid #fde68a", lineHeight: 1.6 }}>
            Klicke auf den Button, um dich mit deinem Facebook-Konto anzumelden. Dein Instagram Business-Konto wird automatisch erkannt.
          </div>
        )}

        {testResult ? (
          <p className={`form-message ${testResult.startsWith("✅") ? "form-message-success" : "form-message-error"}`}>
            {testResult}
          </p>
        ) : null}

        {/* Manual config (collapsed by default) */}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: ".85rem", color: "var(--muted)", marginBottom: 12 }}>
            Manuelle Konfiguration
          </summary>
          <div className="form">
            <div className="field">
              <label htmlFor="igUser">Instagram @Benutzername</label>
              <input
                id="igUser"
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                placeholder="z.B. besterfotografderwelt"
                value={config.username}
              />
            </div>
            <div className="field">
              <label htmlFor="igAccountId">Instagram Account ID</label>
              <input
                id="igAccountId"
                onChange={(e) => setConfig({ ...config, accountId: e.target.value })}
                placeholder="1784140xxxxxxxxx"
                value={config.accountId}
              />
            </div>
            <div className="field">
              <label htmlFor="igToken">Access Token</label>
              <input
                id="igToken"
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                placeholder="EAA..."
                type="password"
                value={config.accessToken}
              />
            </div>
            <button className="button-secondary" onClick={save} type="button" style={{ marginTop: 8 }}>
              {saved ? "✓ Gespeichert" : "Manuell speichern"}
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
