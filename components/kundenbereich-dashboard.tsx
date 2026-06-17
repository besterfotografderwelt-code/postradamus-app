"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const IG_CREDS_KEY = "weddin…m.v1";
const INSTAGRAM_CLIENT_ID = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;

/* ── Demo-Daten (später via API/Supabase) ── */
const DEMO_USER = {
  name: "Max Mustermann",
  email: "max@example.com",
  plan: "Growth",
  planPrice: "49,90 €",
  nextBilling: "15.07.2026",
  quotaUsed: 47,
  quotaTotal: 150,
};

const DEMO_INVOICES = [
  { id: "INV-2026-06", date: "01.06.2026", amount: "49,90 €", status: "Bezahlt" },
  { id: "INV-2026-05", date: "01.05.2026", amount: "49,90 €", status: "Bezahlt" },
  { id: "INV-2026-04", date: "01.04.2026", amount: "29,90 €", status: "Bezahlt" },
  { id: "INV-2026-03", date: "01.03.2026", amount: "29,90 €", status: "Bezahlt" },
];

const PLANS = [
  { name: "Starter", price: "29,90 €", quota: "50 Bilder/Monat" },
  { name: "Growth", price: "49,90 €", quota: "150 Bilder/Monat", current: true },
  { name: "Studio", price: "129,90 €", quota: "Unlimited (Fair-Use)" },
];

/* ── Sub-Views ── */
type SubView = "overview" | "password-saved" | "password-reset";

export function KundenbereichDashboard() {
  const [subView, setSubView] = useState<SubView>("overview");
  const [cancelOpen, setCancelOpen] = useState(false);

  /* Password form */
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");

  /* Password reset */
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  /* Instagram */
  const [igConfig, setIgConfig] = useState({ accessToken: "", accountId: "", username: "" });
  const [igTesting, setIgTesting] = useState(false);
  const [igTestResult, setIgTestResult] = useState("");

  /* Projects */
  const [projects, setProjects] = useState<Array<{ id: string; couple_name: string | null; business_type: string; location: string | null; uploaded_image_count: number; status: string }>>([]);
  const [profile, setProfile] = useState<{ full_name: string; plan: string; trial_start: string | null; trial_end: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  /* Auth check */
  const [authed, setAuthed] = useState<boolean | null>(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => {
        if (!r.ok) { setAuthed(false); setLoaded(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data === null) return;
        setProjects(data?.projects ?? []);
        setProfile(data?.profile ?? null);
        setAuthed(true);
        setLoaded(true);
      })
      .catch(() => { setAuthed(false); setLoaded(true); });
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IG_CREDS_KEY);
      if (stored) setIgConfig(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Supabase auth.resetPasswordForEmail(resetEmail)
    setResetSent(true);
  }

  function connectInstagram() {
    if (!INSTAGRAM_CLIENT_ID) {
      setIgTestResult("❌ Instagram App-ID fehlt.");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/instagram/callback`;
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish&response_type=code`;
  }

  function disconnectInstagram() {
    localStorage.removeItem(IG_CREDS_KEY);
    setIgConfig({ accessToken: "", accountId: "", username: "" });
    setIgTestResult("");
  }

  async function testIgConnection() {
    setIgTesting(true);
    setIgTestResult("");
    try {
      const checkRes = await fetch("/api/instagram/check-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: igConfig.accessToken, autoRefresh: true })
      });
      const checkData = await checkRes.json();
      if (!checkData.valid) {
        setIgTestResult(`❌ ${checkData.message || "Token ungültig."}`);
        setIgTesting(false);
        return;
      }
      if (checkData.refreshed && checkData.accessToken) {
        const updated = { ...igConfig, accessToken: checkData.accessToken };
        setIgConfig(updated);
        localStorage.setItem(IG_CREDS_KEY, JSON.stringify(updated));
      }
      const daysInfo = checkData.daysLeft ? ` (${checkData.daysLeft} Tage gültig)` : "";
      const refreshInfo = checkData.refreshed ? " 🔄 Token erneuert!" : "";
      setIgTestResult(`✅ Verbunden${daysInfo}${refreshInfo}`);
    } catch {
      setIgTestResult("❌ Verbindung fehlgeschlagen.");
    } finally {
      setIgTesting(false);
    }
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwNew.length < 8) {
      setPwError("Das neue Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("Die Passwörter stimmen nicht überein.");
      return;
    }
    // TODO: Supabase auth.updateUser({ password: pwNew })
    setSubView("password-saved");
  }

  if (subView === "password-saved") {
    return (
      <section className="content-page">
        <div className="eyebrow">Kundenbereich</div>
        <h1>Passwort geändert</h1>
        <p className="lead">Dein neues Passwort ist ab sofort aktiv.</p>
        <div className="content-actions">
          <button className="button" onClick={() => setSubView("overview")} type="button">
            Zurück zum Kundenbereich
          </button>
        </div>
      </section>
    );
  }

  if (subView === "password-reset") {
    return (
      <section className="content-page">
        <div className="eyebrow">Kundenbereich</div>
        <h1>Passwort vergessen?</h1>
        <p className="lead">
          Kein Problem. Gib deine E-Mail-Adresse ein und wir schicken dir einen Link zum Zurücksetzen.
        </p>
        {!resetSent ? (
          <form className="kunden-form" onSubmit={handlePasswordReset} style={{ marginTop: 24 }}>
            <label className="contact-field">
              <span>E-Mail</span>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={DEMO_USER.email}
                autoComplete="email"
              />
            </label>
            <button className="button" type="submit" style={{ marginTop: 8 }}>
              Link zusenden
            </button>
          </form>
        ) : (
          <div className="contact-success" style={{ marginTop: 24 }}>
            <div className="contact-success-icon" aria-hidden="true">✉</div>
            <h2>E-Mail gesendet</h2>
            <p>
              Falls ein Konto mit dieser Adresse existiert, haben wir eine E-Mail mit einem
              Link zum Zurücksetzen deines Passworts verschickt.
            </p>
          </div>
        )}
        <div className="content-actions" style={{ marginTop: 24 }}>
          <button className="button-secondary" onClick={() => { setSubView("overview"); setResetSent(false); }} type="button">
            ← Zurück zum Login
          </button>
        </div>
      </section>
    );
  }

  if (authed === false) {
    return (
      <section className="content-page" style={{ paddingBottom: 60 }}>
        <div className="eyebrow">Kundenbereich</div>
        <h1>Dein Cockpit wartet auf dich.</h1>
        <p className="lead">
          Melde dich an, um deine Projekte, Rechnungen und Einstellungen zu sehen.
        </p>

        <div className="content-actions">
          <Link className="button" href="/login">Anmelden</Link>
          <Link className="button-secondary" href="/preise">Preise ansehen</Link>
        </div>

        <div className="kunden-teaser">
          <h2>14 Tage kostenlos – alle Features</h2>
          <div className="kunden-teaser-grid">
            {[
              { title: "KI-Captions", desc: "Passend zu deinen Bildern generiert" },
              { title: "Postingplan", desc: "Woche für Woche automatisch" },
              { title: "Instagram", desc: "Direkt veröffentlichen mit einem Klick" },
            ].map((f) => (
              <article key={f.title}>
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </article>
            ))}
          </div>
          <Link className="button" href="/login?trial=14" style={{ marginTop: 20, display: "inline-flex" }}>
            14 Tage gratis starten
          </Link>
        </div>
      </section>
    );
  }


  return (
    <section className="content-page" style={{ paddingBottom: 60 }}>
      {/* ── Header ── */}
      <div className="eyebrow">Kundenbereich</div>
      <h1>Hallo, {profile?.full_name?.split(" ")[0] || "Kunde"} 👋</h1>

      {/* ── Projekte ── */}
      {loaded && projects.length > 0 && (
        <section className="kunden-section">
          <h2>Deine Projekte</h2>
          <div className="project-list">
            {projects.slice(0, 5).map((p) => (
              <Link key={p.id} className="project-list-item" href={`/projects/${p.id}`}>
                <div>
                  <strong>{p.couple_name || p.business_type || "Unbenannt"}</strong>
                  <span className="kunden-meta">{p.location || `${p.uploaded_image_count} Bilder`}</span>
                </div>
                <span className="project-status-badge">{p.status === "brief" ? "Neu" : p.status === "selection" ? "Bilder" : p.status}</span>
              </Link>
            ))}
          </div>
          <Link className="button-secondary" href="/projects" style={{ marginTop: 12, display: "inline-flex" }}>
            {projects.length > 5 ? `Alle ${projects.length} Projekte →` : "Zum Projekt-Dashboard →"}
          </Link>
        </section>
      )}
      {loaded && projects.length === 0 && (
        <section className="kunden-section">
          <h2>Deine Projekte</h2>
          <p className="kunden-section-desc">Noch keine Projekte. Leg gleich dein erstes an.</p>
          <Link className="button" href="/projects/new">Neues Projekt starten</Link>
        </section>
      )}

      {/* ── Account Card ── */}
      <div className="kunden-card">
        <div className="kunden-card-main">
          <div>
            <span className="kunden-meta">Aktuelles Paket</span>
            <strong className="kunden-plan">{profile?.plan === "trial" && profile?.trial_end && new Date(profile.trial_end) > new Date() ? "14-Tage-Trial" : profile?.plan || "-"}</strong>
            <span className="kunden-meta">
              {profile?.trial_end && new Date(profile.trial_end) > new Date()
                ? `Trial bis ${new Date(profile.trial_end).toLocaleDateString("de")}`
                : "Aktives Paket"}
            </span>
          </div>
          <div className="kunden-quota">
            <div className="kunden-quota-bar">
              <div
                className="kunden-quota-fill"
                style={{ width: `${Math.round((DEMO_USER.quotaUsed / DEMO_USER.quotaTotal) * 100)}%` }}
              />
            </div>
            <span className="kunden-meta">
              {DEMO_USER.quotaUsed} / {DEMO_USER.quotaTotal} Bilder diesen Monat
            </span>
          </div>
        </div>
        <div className="kunden-card-side">
          <span className="kunden-meta">Nächste Abbuchung</span>
          <strong>{DEMO_USER.nextBilling}</strong>
        </div>
      </div>

      {/* ── Paket wechseln ── */}
      <section className="kunden-section">
        <h2>Paket wechseln</h2>
        <p className="kunden-section-desc">
          Du kannst jederzeit upgraden oder downgraden. Die Restlaufzeit wird anteilig verrechnet.
        </p>
        <div className="plan-switch-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`plan-switch-card ${plan.current ? "plan-switch-current" : ""}`}
            >
              <h3>{plan.name}</h3>
              <strong className="plan-switch-price">{plan.price}</strong>
              <span className="kunden-meta">{plan.quota}</span>
              {plan.current ? (
                <span className="plan-badge-current">Aktuell</span>
              ) : (
                <button className="button-secondary" type="button" style={{ marginTop: 8 }}>
                  {PLANS.findIndex((p) => p.current) < PLANS.findIndex((p) => p.name === plan.name)
                    ? "Upgraden"
                    : "Downgraden"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Rechnungen ── */}
      <section className="kunden-section">
        <h2>Rechnungen</h2>
        <p className="kunden-section-desc">
          Deine Rechnungen der letzten Monate zum Herunterladen.
        </p>
        <div className="invoice-table">
          <div className="invoice-row invoice-head">
            <span>Rechnung</span>
            <span>Datum</span>
            <span>Betrag</span>
            <span>Status</span>
            <span />
          </div>
          {DEMO_INVOICES.map((inv) => (
            <div key={inv.id} className="invoice-row">
              <span className="invoice-id">{inv.id}</span>
              <span className="kunden-meta">{inv.date}</span>
              <span>{inv.amount}</span>
              <span className="invoice-status">{inv.status}</span>
              <button className="button-secondary invoice-dl" type="button" style={{ fontSize: ".8rem", padding: "4px 12px" }}>
                PDF
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Passwort ändern ── */}
      <section className="kunden-section">
        <h2>Passwort ändern</h2>
        <form className="kunden-form" onSubmit={handlePasswordChange}>
          <label className="contact-field">
            <span>Aktuelles Passwort</span>
            <input
              type="password"
              required
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="contact-field">
            <span>Neues Passwort</span>
            <input
              type="password"
              required
              minLength={8}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="contact-field">
            <span>Neues Passwort bestätigen</span>
            <input
              type="password"
              required
              minLength={8}
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {pwError && <p className="contact-error" role="alert">{pwError}</p>}
          <button className="button" type="submit" style={{ marginTop: 8 }}>
            Passwort speichern
          </button>
          <button
            className="button-secondary"
            type="button"
            style={{ marginTop: 4, fontSize: ".88rem", width: "fit-content" }}
            onClick={() => setSubView("password-reset")}
          >
            Passwort vergessen?
          </button>
        </form>
      </section>

      {/* ── Instagram ── */}
      <section className="kunden-section">
        <h2>Mit Instagram verbinden</h2>
        <p className="kunden-section-desc">
          Verbinde dein Instagram Business-Konto, damit Postradamus direkt für dich posten kann.
        </p>
        {igConfig.accessToken && igConfig.accountId ? (
          <div className="kunden-card" style={{ alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span>✅ Verbunden als <strong>@{igConfig.username || "Instagram Business"}</strong></span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="button-secondary" disabled={igTesting} onClick={testIgConnection} type="button" style={{ fontSize: ".85rem" }}>
                {igTesting ? "Prüfe …" : "Status prüfen"}
              </button>
              <button className="button-secondary" onClick={connectInstagram} type="button" style={{ fontSize: ".85rem" }}>
                Neu verbinden
              </button>
              <button className="button-secondary" onClick={disconnectInstagram} type="button" style={{ fontSize: ".85rem", color: "var(--error)", borderColor: "var(--error)" }}>
                Trennen
              </button>
            </div>
          </div>
        ) : (
          <button className="button" onClick={connectInstagram} type="button">
            🔗 Mit Instagram verbinden
          </button>
        )}
        {igTestResult && (
          <p className={`form-message ${igTestResult.startsWith("✅") ? "form-message-success" : "form-message-error"}`} style={{ marginTop: 12 }}>
            {igTestResult}
          </p>
        )}
      </section>

      {/* ── Vertrag kündigen ── */}
      <section className="kunden-section kunden-danger">
        <h2>Vertrag kündigen</h2>
        <p className="kunden-section-desc">
          Du kannst deinen Vertrag jederzeit zum Ende des laufenden Monats kündigen. Deine Daten bleiben 30 Tage erhalten.
        </p>
        {!cancelOpen ? (
          <button
            className="button"
            type="button"
            style={{ background: "var(--error, #d32f2f)", borderColor: "var(--error, #d32f2f)" }}
            onClick={() => setCancelOpen(true)}
          >
            Vertrag kündigen
          </button>
        ) : (
          <div className="cancel-confirm">
            <p>
              Bist du sicher? Dein Zugang läuft am {DEMO_USER.nextBilling} ab. Du kannst bis dahin
              weiterhin alle Funktionen nutzen.
            </p>
            <div className="content-actions">
              <button
                className="button"
                type="button"
                style={{ background: "var(--error, #d32f2f)", borderColor: "var(--error, #d32f2f)" }}
              >
                Ja, endgültig kündigen
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setCancelOpen(false)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
