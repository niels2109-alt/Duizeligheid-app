import type { Rol } from "../types";
import type { VocabulaireData } from "./types";

// Requirements §11.3 punt 1/§11.4 stap 4 — gedeeld symptoomvocabulaire voor
// de V2-flow. V1 (../api.ts, ../flow/*) blijft dit bestand volledig
// ongebruikt, exact zoals de rode-vlaggenmodule uit stap 2.
export async function fetchVocabulaire(rol: Rol): Promise<VocabulaireData> {
  const res = await fetch(`/api/v2/vocabulaire?rol=${rol}`);
  if (!res.ok) throw new Error("Kon symptoomvocabulaire niet ophalen.");
  return res.json();
}
