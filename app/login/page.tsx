"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function readForm(): { email: string; password: string; fullName: string } {
    if (!formRef.current) return { email: "", password: "", fullName: "" };
    const fd = new FormData(formRef.current);
    return {
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      fullName: String(fd.get("fullName") ?? "").trim(),
    };
  }

  async function handleSignIn(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    setLoading(true);
    const { email: mail, password: pw } = readForm();
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail, password: pw }),
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

  async function handleSignUp(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const { email: mail, password: pw, fullName: n } = readForm();
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail, password: pw, fullName: n }),
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

        <form className="form" ref={formRef} onSubmit={handleSignIn}>
          <div className="field">
            <label htmlFor="fullName">Name oder Studio</label>
            <input
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder="Tobias Köstl"
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
