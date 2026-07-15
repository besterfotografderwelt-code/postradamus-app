"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function getUrlParams() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  return {
    accessToken:
      url.searchParams.get("access_token") ?? hashParams.get("access_token"),
    code: url.searchParams.get("code") ?? hashParams.get("code"),
    error:
      url.searchParams.get("error_description") ??
      hashParams.get("error_description") ??
      url.searchParams.get("error") ??
      hashParams.get("error"),
    refreshToken:
      url.searchParams.get("refresh_token") ?? hashParams.get("refresh_token"),
    tokenHash:
      url.searchParams.get("token_hash") ?? hashParams.get("token_hash"),
    type: url.searchParams.get("type") ?? hashParams.get("type"),
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Supabase recovery links can arrive as token_hash, code, or URL hash session params
  // depending on the email template and auth flow configured in the dashboard.
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError("Supabase ist nicht konfiguriert.");
      setVerifying(false);
      return;
    }

    const params = getUrlParams();

    if (params.error) {
      setError(params.error);
      setVerifying(false);
      return;
    }

    async function verify() {
      try {
        const supabase = createClient();
        let verifyError: { message?: string } | null = null;

        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          verifyError = error;
        } else if (params.accessToken && params.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          verifyError = error;
        } else if (params.tokenHash && params.type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: params.tokenHash,
            type: "recovery",
          });
          verifyError = error;
        } else {
          setError("Ungültiger oder abgelaufener Link. Bitte fordere einen neuen Link zum Zurücksetzen an.");
          return;
        }

        if (verifyError) {
          setError(verifyError.message || "Der Link ist ungültig oder abgelaufen.");
        } else {
          setVerified(true);
          window.history.replaceState(null, "", "/auth/reset-password");
        }
      } catch {
        setError("Verbindungsfehler. Bitte versuch es später noch einmal.");
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, []);

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
        ) : verifying ? (
          <>
            <div className="eyebrow">Passwort zurücksetzen</div>
            <h2>Link wird geprüft …</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20 }}>
              Einen Moment bitte, wir verifizieren deinen Link.
            </p>
          </>
        ) : error && !verified ? (
          <>
            <div className="eyebrow">Passwort zurücksetzen</div>
            <h2>Link ungültig</h2>
            <div className="form-message form-message-error" role="alert">
              {error}
            </div>
            <p style={{ marginTop: 16 }}>
              <a href="/kundenbereich?view=password-reset" style={{ color: "var(--accent)" }}>
                Neuen Link anfordern →
              </a>
            </p>
          </>
        ) : (
          <>
            <div className="eyebrow">Passwort zurücksetzen</div>
            <h2>Neues Passwort wählen</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20 }}>
              Mindestens 8 Zeichen. Empfohlen: Groß- &amp; Kleinbuchstaben, Zahl und Sonderzeichen.
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
                <span className="field-hint">Mindestens 8 Zeichen. Empfohlen: Groß- &amp; Kleinbuchstaben, Zahl und Sonderzeichen.</span>
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
