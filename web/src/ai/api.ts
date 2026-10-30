import type { AIAntwoord, AIEducatieAntwoord } from "./types";
import type { Rol } from "../types";

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

export async function stelVraag(vraag: string, rol: Rol): Promise<AIAntwoord> {
  const res = await fetch(`/api/ai/vraag?rol=${rol}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vraag }),
  });
  return json(res, "Vraag kon niet worden beantwoord.");
}

// bevestigdeFactorIds: requirements §10.4/§20 — bij samengesteld-type
// educatie alleen de daadwerkelijk bevestigde factoren meesturen, zodat de
// server nooit ongebruikte factoren "voor de zekerheid" opneemt.
export async function fetchPatientEducatie(
  eduId: string,
  rol: Rol,
  bevestigdeFactorIds?: string[]
): Promise<AIEducatieAntwoord> {
  const params = new URLSearchParams({ rol });
  (bevestigdeFactorIds ?? []).forEach((id) => params.append("bevestigd", id));
  const res = await fetch(`/api/ai/educatie/${encodeURIComponent(eduId)}?${params.toString()}`, {
    credentials: "include",
  });
  return json(res, "Kon patiëntuitleg niet ophalen.");
}
