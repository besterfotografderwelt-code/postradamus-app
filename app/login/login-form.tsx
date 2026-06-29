"use client";

import { useState } from "react";
import Link from "next/link";

type LoginFormProps = {
  initialError?: string;
  initialMessage?: string;
  next?: string;
};

export function LoginForm({ initialError, initialMessage, next }: LoginFormProps) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState("");
  const [loading, setLoading] = useState(false);

  const error = initialError || clientError;
  const message = initialMessage;
  const redirect = next ? `?next=${encodeURIComponent(next)}` : "";
  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError("");

    if (!email || password.length < 8) {
      setClientError("E-Mail und ein Passwort mit mindestens 8 Zeichen sind erforderlich.");
      return;
    }
    if (isSignup && !fullName.trim()) {
      setClientError("Bitte gib deinen Namen oder Studio-Namen ein.");
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);
    if (isSignup) fd.set("fullName", fullName.trim());

    const endpoint = isSignup ? "/api/auth/signup" : `/api/auth/signin${redirect}`;

    const res = await fetch(endpoint, { method: "POST", body: fd });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    if (res.url && res.url !== window.location.href) {
      window.location.href = res.url;
      return;
    }

    setClientError("Ein unerwarteter Fehler ist aufgetreten.");
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <section className="auth-card panel">
        <div>
          <div className="eyebrow">Konto erstellen oder anmelden</div>
          <h2>Zugang zu Postradamus</h2>
        </div>

        {error && <div className="form-message form-message-error">{error}</div>}
        {message && <div className="form-message form-message-success">{message}</div>}

        {/* Mode toggle tabs */}
        <div className="auth-mode-tabs">
          <button
            className={`auth-mode-tab ${isSignup ? "is-active" : ""}`}
            onClick={() => { setMode("signup"); setClientError(""); }}
            type="button"
          >
            Konto erstellen
          </button>
          <button
            className={`auth-mode-tab ${!isSignup ? "is-active" : ""}`}
            onClick={() => { setMode("signin"); setClientError(""); }}
            type="button"
          >
            Anmelden
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="field">
              <label htmlFor="fullName">Name oder Studio</label>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Tobias Köstl"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field-hint">Mindestens 8 Zeichen. Empfohlen: Groß- &amp; Kleinbuchstaben, Zahl und Sonderzeichen.</span>
          </div>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Wird verarbeitet …" : isSignup ? "Konto erstellen" : "Anmelden"}
          </button>
        </form>
        <p className="helper">
          {isSignup
            ? `Du hast schon ein Konto? Wechsle oben zu „Anmelden“.`
            : `Noch kein Konto? Wechsle oben zu „Konto erstellen“.`
          }
        </p>
        <p className="helper" style={{ marginTop: 8 }}>
          <Link href="/kundenbereich?view=password-reset" style={{ color: "var(--accent)" }}>
            Passwort vergessen?
          </Link>
        </p>
      </section>
    </div>
  );
}
