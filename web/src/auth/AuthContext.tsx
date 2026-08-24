import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMe, login as apiLogin, register as apiRegister, logout as apiLogout } from "./api";
import type { Therapeut } from "./types";

interface AuthState {
  therapeut: Therapeut | null;
  laden: boolean;
  fout: string | null;
  login: (email: string, wachtwoord: string) => Promise<void>;
  registreer: (email: string, wachtwoord: string) => Promise<void>;
  uitloggen: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [therapeut, setTherapeut] = useState<Therapeut | null>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setTherapeut)
      .catch((e) => setFout(String(e)))
      .finally(() => setLaden(false));
  }, []);

  const login = useCallback(async (email: string, wachtwoord: string) => {
    setFout(null);
    const t = await apiLogin(email, wachtwoord);
    setTherapeut(t);
  }, []);

  const registreer = useCallback(async (email: string, wachtwoord: string) => {
    setFout(null);
    const t = await apiRegister(email, wachtwoord);
    setTherapeut(t);
  }, []);

  const uitloggen = useCallback(async () => {
    await apiLogout();
    setTherapeut(null);
  }, []);

  return (
    <AuthContext.Provider value={{ therapeut, laden, fout, login, registreer, uitloggen }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth moet binnen een AuthProvider gebruikt worden.");
  return ctx;
}
