import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Anmelden – Postradamus",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message, next } = await searchParams;
  const redirect = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="auth-wrap">
      <section className="auth-card panel">
        <div>
          <div className="eyebrow">Konto erstellen oder anmelden</div>
          <h2>Zugang zu Postradamus</h2>
        </div>

        {error && <div className="form-message form-message-error">{error}</div>}
        {message && <div className="form-message form-message-success">{message}</div>}

        <form className="form" method="POST" action={`/api/auth/signin${redirect ? `?next=${encodeURIComponent(next!)}` : ""}`}>
          <div className="field">
            <label htmlFor="fullName">Name oder Studio</label>
            <input id="fullName" name="fullName" autoComplete="name" placeholder="Tobias Köstl" />
          </div>
          <div className="field">
            <label htmlFor="email">E-Mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
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
            <span className="field-hint">Mindestens 8 Zeichen. Empfohlen: Groß- &amp; Kleinbuchstaben, Zahl und Sonderzeichen.</span>
          </div>
          <div className="auth-actions">
            <button
              className="button"
              type="submit"
              formMethod="POST"
              formAction="/api/auth/signup"
            >
              Konto erstellen
            </button>
            <button className="button-secondary" type="submit">
              Anmelden
            </button>
          </div>
        </form>
        <p className="helper">
          Schon ein Konto? Gib deine E-Mail und dein Passwort ein und klick auf &bdquo;Anmelden&ldquo;.
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
