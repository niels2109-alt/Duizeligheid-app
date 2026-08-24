import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

/**
 * Login/registratie — requirements §5.2: individueel account per
 * therapeut (e-mail + wachtwoord), geen gedeeld account, geen 2FA/SSO.
 */
export function AuthScreen() {
  const { login, registreer } = useAuth();
  const [modus, setModus] = useState<"login" | "registreer">("login");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    try {
      if (modus === "login") await login(email, wachtwoord);
      else await registreer(email, wachtwoord);
    } catch (err) {
      setFout(String(err instanceof Error ? err.message : err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Duizeligheid</h1>
        <p className="hint">
          {modus === "login"
            ? "Log in met je therapeut-account."
            : "Maak een individueel therapeut-account aan (geen gedeeld account, §5.2)."}
        </p>

        <label className="auth-field">
          <span>E-mailadres</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Wachtwoord</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={modus === "login" ? "current-password" : "new-password"}
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
          />
        </label>

        {fout && <p className="error">{fout}</p>}

        <button type="submit" className="btn-primary" disabled={bezig}>
          {bezig ? "Bezig…" : modus === "login" ? "Inloggen" : "Account aanmaken"}
        </button>

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setModus(modus === "login" ? "registreer" : "login");
            setFout(null);
          }}
        >
          {modus === "login" ? "Nog geen account? Registreren" : "Al een account? Inloggen"}
        </button>
      </form>
    </div>
  );
}
