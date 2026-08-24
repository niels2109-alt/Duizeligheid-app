import type {
  FlowData,
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
  tekst: string,
  objectIds: string[],
  evidenceNiveau: string | null
): ReasoningTrailEntry {
  return { stap, tekst, objectIds, evidenceNiveau };
}

export function fmtLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return v.replace(/_/g, " ");
}
