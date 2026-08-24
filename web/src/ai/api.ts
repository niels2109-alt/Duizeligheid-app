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

export async function fetchPatientEducatie(eduId: string, rol: Rol): Promise<AIEducatieAntwoord> {
  const res = await fetch(`/api/ai/educatie/${encodeURIComponent(eduId)}?rol=${rol}`, {
    credentials: "include",
  });
  return json(res, "Kon patiëntuitleg niet ophalen.");
}
