export type StapType = "triage" | "anamnese" | "test" | "interpretatie" | "strategie" | "educatie" | "followup";

export interface SessieSummary {
  id: string;
  gestartOp: string;
  aandoeningNaam: string | null;
  aantalStappen: number;
  geëxporteerdOp: string | null;
  vervaltOp: string;
}

export interface StapLogView {
  id: string;
  stapType: StapType;
  objectIdsGebruikt: string[];
  bevinding: string | null;
  timestamp: string;
}

export interface SessieDetail {
  id: string;
  gestartOp: string;
  aandoeningId: string | null;
  aandoeningNaam: string | null;
  geëxporteerdOp: string | null;
  vervaltOp: string;
  stappen: StapLogView[];
  samenvatting: string;
}
