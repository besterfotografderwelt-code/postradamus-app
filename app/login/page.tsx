"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Anmeldung fehlgeschlagen.");
        return;
      }
      if (data.redirect) router.push(data.redirect);
      else router.push("/projects");
      router.refresh();
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, fullName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registrierung fehlgeschlagen.");
        return;
      }
      setMessage(data.message || "Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.");
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-card panel">
        <div>
          <div className="eyebrow">Anmelden oder starten</div>
          <h2>Zugang zu Postradamus</h2>
        </div>

        {error && <div className="form-message form-message-error">{error}</div>}
        {message && <div className="form-message form-message-success">{message}</div>}

        <form className="form" onSubmit={handleSignIn}>
          <div className="field">
            <label htmlFor="fullName">Name oder Studio</label>
            <input
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder="Tobias Köstl"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
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
              minLength={8}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="auth-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Wird angemeldet …" : "Anmelden"}
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={loading}
              onClick={handleSignUp}
            >
              Konto erstellen
            </button>
          </div>
        </form>
        <p className="helper">
          Neu hier? Gib deinen Namen ein und klick auf &bdquo;Konto erstellen&ldquo;.
        </p>
        <p className="helper" style={{ marginTop: 8 }}>
          <a href="/kundenbereich?view=password-reset" style={{ color: "var(--accent)" }}>
            Passwort vergessen?
          </a>
        </p>
      </section>
    </div>
  );
}
