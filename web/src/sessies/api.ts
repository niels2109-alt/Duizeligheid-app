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

// reasoningEngineVersie: optioneel (requirements §11.1/§11.2, keuzescherm)
// — ongebruikt laten (V1's bestaande aanroep) geeft server-side het
// schema-default v1, exact het bestaande gedrag.
export async function startSessie(
  reasoningEngineVersie?: "v1" | "v2"
): Promise<{ id: string; gestartOp: string; vervaltOp: string; reasoningEngineVersie: string }> {
  const res = await fetch("/api/sessies", {
    method: "POST",
    credentials: "include",
    ...(reasoningEngineVersie
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reasoningEngineVersie }) }
      : {}),
  });
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

// Requirements §8.4: koppelt een sessie aan een Behandelepisode (trend-
// weergave, PPPD) — hergebruikt dezelfde PATCH-route als zetAandoening.
export async function koppelEpisode(sessieId: string, episodeId: string): Promise<void> {
  const res = await fetch(`/api/sessies/${sessieId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ episodeId }),
  });
  await json(res, "Kon behandeltraject niet koppelen aan sessie.");
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
