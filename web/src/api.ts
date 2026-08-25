import type { ObjectDetail, ObjectSummary, Rol, TypeObject } from "./types";
import type { FlowData } from "./flow/types";

export async function fetchMeta(): Promise<{ types: TypeObject[]; tiers: number[] }> {
  const res = await fetch("/api/meta");
  if (!res.ok) throw new Error("Kon filterwaarden niet ophalen.");
  return res.json();
}

export async function searchObjects(params: {
  rol: Rol;
  q?: string;
  types?: TypeObject[];
  tier?: number;
}): Promise<{ count: number; resultaten: ObjectSummary[] }> {
  const search = new URLSearchParams();
  search.set("rol", params.rol);
  if (params.q) search.set("q", params.q);
  if (params.types && params.types.length > 0) search.set("type", params.types.join(","));
  if (params.tier) search.set("tier", String(params.tier));

  const res = await fetch(`/api/objects?${search.toString()}`);
  if (!res.ok) throw new Error("Zoeken is mislukt.");
  return res.json();
}

export async function fetchObjectDetail(id: string, rol: Rol): Promise<ObjectDetail | null> {
  const res = await fetch(`/api/objects/${encodeURIComponent(id)}?rol=${rol}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Kon detail niet ophalen.");
  return res.json();
}

// aandoeningId: welke aandoening als hoofdhypothese van de bundel dient
// (requirements §7.4 stap 3 — de route is gegeneraliseerd, niet meer
// hardcoded op BPPV). Default AAND-001, want de flow start altijd bij BPPV's
// triagevraag (referentiedocument §22 stap 1).
export async function fetchFlowData(aandoeningId: string = "AAND-001"): Promise<FlowData> {
  const res = await fetch(`/api/flow/${encodeURIComponent(aandoeningId)}`);
  if (!res.ok) throw new Error("Kon reasoning-flow-data niet ophalen.");
  return res.json();
}
