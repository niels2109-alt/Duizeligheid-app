// Spiegelt GET /api/v2/vocabulaire (server/src/vocabulaire.ts) —
// requirements §11.3 punt 1/§11.4 stap 4.

export interface VocabulaireRelatie {
  naarObjectId: string;
  polariteit: "ondersteunt" | "spreekt_tegen" | "neutraal";
  diagnostischeWaarde: "hoog" | "matig" | "laag" | null;
  kwalificatie: Record<string, string> | null;
  interpretatie: string | null;
}

export interface VocabulaireItem {
  id: string;
  naam: string;
  kernbeschrijving: string;
  relaties: VocabulaireRelatie[];
}

export interface VocabulaireCategorie {
  categorie: string;
  items: VocabulaireItem[];
}

export interface AandoeningInfo {
  id: string;
  naam: string;
}

export interface VocabulaireData {
  categorieen: VocabulaireCategorie[];
  aandoeningen: AandoeningInfo[];
}

// --- Rangschikkingsmodel (§11.3 punt 2 / V2-ontwerp §7-10) --------------

export type Weging = "hoog" | "matig" | "laag";

export type Fase = "acuut" | "chronisch" | null;
export type Lateraliteit = "unilateraal" | "bilateraal" | null;

export interface RangschikkingReden {
  itemNaam: string;
  polariteit: "ondersteunt" | "spreekt_tegen";
  gewicht: "hoog" | "matig" | "laag";
  interpretatie: string | null;
}

// Bidirectionele kennisbank-koppeling (§11.3 punt 5/V2-ontwerp §17,
// §11.4 stap 6) — gedeeld tussen KeuzeScherm en V2Flow.
export interface V2StartFocus {
  id: string;
  naam: string;
}

export interface HypotheseRanking {
  id: string;
  naam: string;
  weging: Weging;
  ondersteunend: RangschikkingReden[];
  tegensprekend: RangschikkingReden[];
  /** V2-ontwerp §10: cap toegepast omdat er minstens één hoog-gewicht spreekt-tegen kenmerk is. */
  geplafonneerd: boolean;
}
