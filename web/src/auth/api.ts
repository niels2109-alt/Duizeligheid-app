import type { Therapeut } from "./types";

async function parseErrorOrJson<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let message = fallbackError;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // negeer — geen JSON-body
    }
    throw new Error(message);
  }
  return res.json();
}

export async function fetchMe(): Promise<Therapeut | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  return parseErrorOrJson<Therapeut>(res, "Kon accountgegevens niet ophalen.");
}

export async function login(email: string, wachtwoord: string): Promise<Therapeut> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, wachtwoord }),
  });
  return parseErrorOrJson<Therapeut>(res, "Inloggen is mislukt.");
}

export async function register(email: string, wachtwoord: string): Promise<Therapeut> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, wachtwoord }),
  });
  return parseErrorOrJson<Therapeut>(res, "Registreren is mislukt.");
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
