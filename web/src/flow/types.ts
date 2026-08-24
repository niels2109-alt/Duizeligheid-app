// Spiegelt de respons van GET /api/flow/bppv (server/src/flow.ts).

export interface FlowDifferentiaal {
  id: string;
  naam: string;
  tier: number | null;
  status: string;
  kenmerk: string | null;
  relatietypeDifferentiaal: string | null;
  volledigUitgewerkt: boolean;
}

export interface FlowAnamneseCheck {
  relatieId: string;
  redFlagId: string;
  redFlagNaam: string;
  bevinding: string | null;
  interpretatie: string | null;
  actietype: string | null;
  evidenceNiveau: string | null;
}

export interface FlowTestBevinding {
  relatieId: string;
  naarObjectId: string;
  naarObjectType: string;
  kwalificatie: Record<string, string> | null;
  bevinding: string | null;
  interpretatie: string | null;
  diagnostischeWaarde: string | null;
  actietype: string | null;
  evidenceNiveau: string | null;
}

export interface FlowTest {
  id: string;
  naam: string;
  kernbeschrijving: string;
  evidenceNiveau: string;
  bevindingen: FlowTestBevinding[];
}

export interface FlowContraIndicatie {
  id: string;
  naam: string;
  kernbeschrijving: string;
  interpretatie: string | null;
}

export interface FlowInterventie {
  id: string;
  naam: string;
  kernbeschrijving: string;
  evidenceNiveau: string;
  indicatieKwalificatie: Record<string, string> | null;
  contraIndicaties: FlowContraIndicatie[];
}

export interface FlowEducatie {
  id: string;
  naam: string;
  kernbeschrijving: string;
  verwachtingsmanagement: string;
  rationaleUitlegCounterintuitief: string | null;
  signaleringObjectIds: string[];
}

export interface FlowData {
  aandoening: {
    id: string;
    naam: string;
    kernbeschrijving: string;
    klinischeKenmerken: string | null;
    uitkomsttype: string | null;
    tier: number | null;
    evidenceNiveau: string;
  };
  differentialen: FlowDifferentiaal[];
  anamneseChecks: FlowAnamneseCheck[];
  testen: FlowTest[];
  interventies: FlowInterventie[];
  educatie: FlowEducatie | null;
}

// --- Interne flow-state (client-side, geen persistentie in deze bouwstap —
// dat komt bij stap 4 met de Sessie-entiteit) -------------------------------

export type HypotheseWeging = "hoog" | "matig" | "laag" | "uitgesloten";

export interface HypotheseState {
  id: string;
  naam: string;
  weging: HypotheseWeging;
  redenen: string[];
  volledigUitgewerkt: boolean;
}

export type FlowStap =
  | "triage"
  | "dead-end"
  | "verwezen"
  | "anamnese"
  | "test-select"
  | "test-interpretatie"
  | "behandelstrategie"
  | "educatie"
  | "afgerond"
  | "followup-entry"
  | "followup-uitkomst";

export interface Interrupt {
  bron: string; // bv. "Anamnese: RF-001" of "Test: Dix-Hallpike"
  interpretatie: string;
  actietype: string;
  bevestigd: boolean;
}

/**
 * stapType: de StapLog.stap_type-waarde (requirements §1.5) die deze
 * trail-entry vertegenwoordigt, voor synchronisatie naar de sessie-opslag
 * (stap 4). `null` voor entries die geen eigen StapLog-rij krijgen (bijv.
 * "Rode vlag"-acknowledgement-entries — die voegen geen nieuwe klinische
 * bevinding toe naast de anamnese-/test-entry die de rode vlag al triggerde).
 */
export interface ReasoningTrailEntry {
  stap: string;
  stapType: "triage" | "anamnese" | "test" | "interpretatie" | "strategie" | "educatie" | "followup" | null;
  tekst: string;
  objectIds: string[];
  evidenceNiveau: string | null;
}

export interface FollowupState {
  vorigeInterventieId: string | null;
  uitkomst: "succes" | "herhaling" | "kanaalconversie" | "falen" | null;
}

export interface FlowState {
  flow: FlowData | null;
  laden: boolean;
  fout: string | null;

  /// Id van de gekoppelde Sessie (§1.5) — null totdat de omringende
  /// component (ReasoningFlow.tsx) er een heeft aangemaakt. Persistentie
  /// zelf (het daadwerkelijk wegschrijven) gebeurt buiten de reducer, in
  /// een effect dat nieuwe trail-entries synchroniseert.
  sessieId: string | null;

  stap: FlowStap;
  hypotheses: HypotheseState[];
  gekozenTriageId: string | null;
  interrupt: Interrupt | null;

  anamneseAntwoorden: Record<string, boolean>;

  gekozenTestId: string | null;
  gekozenBevindingRelatieId: string | null;
  bevestigdeKwalificatie: Record<string, string> | null;

  gekozenInterventieId: string | null;
  contraIndicatieAntwoorden: Record<string, boolean>;

  eduVrijgegeven: boolean;
  trail: ReasoningTrailEntry[];
  followup: FollowupState;
}

export type FlowAction =
  | { type: "LADEN_START" }
  | { type: "LADEN_OK"; flow: FlowData }
  | { type: "LADEN_FOUT"; fout: string }
  | { type: "SESSIE_GESTART"; sessieId: string }
  | { type: "KIES_TRIAGE"; id: string }
  | { type: "TRIGGER_INTERRUPT"; interrupt: Interrupt }
  | { type: "BEVESTIG_INTERRUPT" }
  | { type: "NA_INTERRUPT_VERWEZEN" }
  | { type: "NA_INTERRUPT_DOORGAAN" }
  | { type: "ANAMNESE_ANTWOORD"; redFlagId: string; aanwezig: boolean }
  | { type: "GA_NAAR_TESTSELECTIE" }
  | { type: "KIES_TEST"; testId: string }
  | { type: "KIES_BEVINDING"; relatieId: string }
  | { type: "TERUG_NAAR_TESTSELECTIE" }
  | { type: "GA_NAAR_BEHANDELSTRATEGIE" }
  | { type: "KIES_INTERVENTIE"; interventieId: string }
  | { type: "CI_ANTWOORD"; ciId: string; aanwezig: boolean }
  | { type: "BEVESTIG_BEHANDELSTRATEGIE" }
  | { type: "VRIJGEVEN_EDUCATIE" }
  | { type: "AFRONDEN" }
  | { type: "START_FOLLOWUP" }
  | { type: "FOLLOWUP_INTERVENTIE"; interventieId: string }
  | { type: "FOLLOWUP_UITKOMST"; uitkomst: NonNullable<FollowupState["uitkomst"]> }
  | { type: "RESET" };
