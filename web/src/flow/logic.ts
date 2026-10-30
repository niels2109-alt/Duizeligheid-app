import type {
  FlowData,
  FlowTestBevinding,
  HypotheseState,
  ReasoningTrailEntry,
} from "./types";

/** Bouwt de initiële (niet-gewogen) hypothesenlijst op uit de flow-data: BPPV + alle differentiaaldiagnose-kandidaten. */
export function bouwHypothesen(flow: FlowData): HypotheseState[] {
  return [
    {
      id: flow.aandoening.id,
      naam: flow.aandoening.naam,
      weging: "matig",
      redenen: [],
      volledigUitgewerkt: true,
    },
    ...flow.differentialen.map((d) => ({
      id: d.id,
      naam: d.naam,
      weging: "matig" as const,
      redenen: [],
      volledigUitgewerkt: d.volledigUitgewerkt,
    })),
  ];
}

export function zetWeging(
  hypotheses: HypotheseState[],
  id: string,
  weging: HypotheseState["weging"],
  reden: string
): HypotheseState[] {
  return hypotheses.map((h) =>
    h.id === id ? { ...h, weging, redenen: [...h.redenen, reden] } : h
  );
}

export function trailEntry(
  stap: string,
  stapType: ReasoningTrailEntry["stapType"],
  tekst: string,
  objectIds: string[],
  evidenceNiveau: string | null
): ReasoningTrailEntry {
  return { stap, stapType, tekst, objectIds, evidenceNiveau };
}

export function fmtLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return v.replace(/_/g, " ");
}

/**
 * Requirements §8.1: sommige bevindingen hebben geen vaste diagnostische
 * waarde, maar een verwijzing naar een voorwaarde-relatie (bijv. TEST-005's
 * Bárány-criteria — pas "hoog" zodra de PPPD-voorwaarde is vervuld). Nooit
 * als vaste waarde geïmplementeerd: dit leest de daadwerkelijke, in déze
 * flow-sessie bevestigde staat.
 */
export function effectieveDiagnostischeWaarde(
  bevinding: FlowTestBevinding,
  voorwaardenBevestigd: Record<string, boolean>
): string | null {
  if (bevinding.diagnostischeWaarde) return bevinding.diagnostischeWaarde;
  if (bevinding.diagnostischeWaardeVoorwaardeRelatieId) {
    return voorwaardenBevestigd[bevinding.diagnostischeWaardeVoorwaardeRelatieId] ? "hoog" : null;
  }
  return null;
}
