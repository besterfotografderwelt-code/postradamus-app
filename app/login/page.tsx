import { signIn, signUp } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <div className="auth-wrap">
      <section className="auth-card panel">
        <div>
          <div className="eyebrow">Anmelden oder starten</div>
          <h2>Zugang zu Postradamus</h2>
        </div>

        {!configured && (
          <div className="form-message form-message-warning">
            Der Login ist noch nicht live geschaltet. Wir arbeiten daran – in Kürze kannst du dich hier registrieren.
          </div>
        )}
        {error && <div className="form-message form-message-error">{error}</div>}
        {message && <div className="form-message form-message-success">{message}</div>}

        <form className="form">
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
          </div>
          <div className="auth-actions">
            <button className="button" formAction={signIn} disabled={!configured}>
              Anmelden
            </button>
            <button className="button-secondary" formAction={signUp} disabled={!configured}>
              Konto erstellen
            </button>
          </div>
        </form>
        <p className="helper">
          Neu hier? Gib deinen Namen ein und klick auf &bdquo;Konto erstellen&ldquo;.
        </p>
      </section>
    </div>
  );
}
