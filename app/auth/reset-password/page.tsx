"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      // Supabase client exchanges the code automatically via the URL
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Zurücksetzen.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-card panel">
        {success ? (
          <>
            <div className="eyebrow">Geschafft</div>
            <h2>Passwort zurückgesetzt</h2>
            <p className="lead">
              Dein neues Passwort ist aktiv. Du wirst zur Anmeldung weitergeleitet …
            </p>
          </>
        ) : (
          <>
            <div className="eyebrow">Passwort zurücksetzen</div>
            <h2>Neues Passwort wählen</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20 }}>
              Gib dein neues Passwort ein. Mindestens 8 Zeichen.
            </p>

            {error && (
              <div className="form-message form-message-error" role="alert">
                {error}
              </div>
            )}

            <form className="form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="password">Neues Passwort</label>
                <input
                  autoFocus
                  id="password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm">Passwort bestätigen</label>
                <input
                  id="confirm"
                  minLength={8}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  type="password"
                  value={confirm}
                />
              </div>
              <button className="button" disabled={loading} type="submit">
                {loading ? "Wird gespeichert …" : "Passwort speichern"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
