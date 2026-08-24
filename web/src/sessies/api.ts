import type { SessieDetail, SessieSummary, StapType } from "./types";

async function json<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let message = fallbackError;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // negeer
    }
    throw new Error(message);
  }
  return res.json();
}

export async function startSessie(): Promise<{ id: string; gestartOp: string; vervaltOp: string }> {
  const res = await fetch("/api/sessies", { method: "POST", credentials: "include" });
  return json(res, "Kon sessie niet starten.");
}

export async function postStap(
  sessieId: string,
  stap: { stapType: StapType; objectIdsGebruikt: string[]; bevinding?: string }
): Promise<void> {
  const res = await fetch(`/api/sessies/${sessieId}/stappen`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stap),
  });
  await json(res, "Kon stap niet registreren.");
}

export async function zetAandoening(sessieId: string, aandoeningId: string): Promise<void> {
  const res = await fetch(`/api/sessies/${sessieId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aandoeningId }),
  });
  await json(res, "Kon aandoening niet koppelen aan sessie.");
}

export async function fetchSessie(sessieId: string): Promise<SessieDetail> {
  const res = await fetch(`/api/sessies/${sessieId}`, { credentials: "include" });
  return json(res, "Kon sessie niet ophalen.");
}

export async function fetchSessies(): Promise<SessieSummary[]> {
  const res = await fetch("/api/sessies", { credentials: "include" });
  return json(res, "Kon sessies niet ophalen.");
}

export async function exporteerSessie(sessieId: string): Promise<{ samenvatting: string }> {
  const res = await fetch(`/api/sessies/${sessieId}/export`, { method: "POST", credentials: "include" });
  return json(res, "Kon sessie niet exporteren.");
}
