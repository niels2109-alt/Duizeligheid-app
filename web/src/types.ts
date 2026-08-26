// Spiegelt de API-responses uit server/src/index.ts.

export type Rol = "therapeut" | "patient";

export type TypeObject =
  | "aandoening"
  | "symptoom"
  | "onderzoekstest"
  | "interventie"
  | "red_flag"
  | "patienteducatie_item"
  | "clinical_pearl"
  | "prognostische_factor"
  | "contra_indicatie"
  | "anamnese_item";

export const TYPE_LABELS: Record<TypeObject, string> = {
  aandoening: "Aandoening",
  symptoom: "Symptoom",
  onderzoekstest: "Onderzoekstest",
  interventie: "Interventie",
  red_flag: "Red flag",
  patienteducatie_item: "Patiënteducatie-item",
  clinical_pearl: "Clinical pearl",
  prognostische_factor: "Prognostische factor",
  contra_indicatie: "Contra-indicatie",
  anamnese_item: "Anamnese-item",
};

export interface ObjectSummary {
  id: string;
  naam: string;
  typeObject: TypeObject;
  tier: number | null;
  evidenceNiveau: string;
  status: string;
  kernbeschrijving: string;
}

export interface RelatieView {
  id: string;
  relatieType: string;
  naarObjectId?: string;
  naarObjectNaam?: string;
  naarObjectType?: TypeObject;
  vanObjectId?: string;
  vanObjectNaam?: string;
  vanObjectType?: TypeObject;
  kwalificatie: Record<string, string> | null;
  bevinding: string | null;
  interpretatie: string | null;
  diagnostischeWaarde: string | null;
  relatietypeDifferentiaal: string | null;
  bijdrageGewicht: string | null;
  patroonType: string | null;
  actietype: string | null;
  evidenceNiveau: string | null;
}

export interface ObjectDetail {
  id: string;
  naam: string;
  typeObject: TypeObject;
  behandelverantwoordelijkheid: string | null;
  behandeldiepte: string | null;
  tier: number | null;
  uitkomsttype: string | null;
  kernbeschrijving: string;
  klinischeKenmerken: string | null;
  evidenceNiveau: string;
  bronnen: unknown[] | null;
  status: string;
  laatstGecontroleerdOp: string;
  zichtbaarTherapeut: boolean;
  zichtbaarPatient: boolean;
  patientEducatie: {
    verwachtingsmanagement: string;
    rationaleUitlegCounterintuitief: string | null;
    samengesteld: boolean;
    bronObjectIds: string[];
    signaleringObjectIds: string[];
  } | null;
  relatiesVanuit: RelatieView[];
  relatiesNaartoe: RelatieView[];
}

// Requirements §11.1/§11.4 stap 2 — GET /api/rode-vlaggen (server/src/redFlags.ts):
// de losstaande, herbruikbare rode-vlaggenmodule, aandoening-onafhankelijk
// en gegroepeerd in klinische categorieën. Los van de FlowAnamneseCheck/
// FlowTestBevinding-vormen in flow/types.ts, die V1's bestaande, per-
// aandoening rode-vlag-weergave blijven aansturen (ongewijzigd).
export interface RodeVlagInfo {
  id: string;
  naam: string;
  kernbeschrijving: string;
  actietype: string | null;
}

export interface RodeVlagCategorie {
  categorie: string;
  redFlaggen: RodeVlagInfo[];
}
