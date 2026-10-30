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

// Multifactorieel-uitbreiding (vervolg op §11-stap 7's bevinding): FACTOR-
// 001 t/m 006/RF-004/TEST-003 (addendum migratie 4) — apart van de
// symptoom-categorieën, zie server/src/vocabulaire.ts voor de toelichting.
export interface RisicofactorItem extends VocabulaireItem {
  typeObject: "prognostische_factor" | "red_flag" | "onderzoekstest";
  /** Alleen relevant voor typeObject=red_flag (RF-004) — zie server/src/vocabulaire.ts. */
  actietype: string | null;
}

// Requirements §8.1: sommige aandoeningen (PPPD) mogen pas als hypothese
// getoond worden nadat aan een voorwaarde is voldaan — een harde gate, niet
// alleen in V1 (server/src/flow.ts) maar nu ook hier in V2.
export interface AandoeningVoorwaarde {
  relatieId: string;
  anamneseItemId: string;
  anamneseItemNaam: string;
  bevinding: string | null;
  interpretatie: string | null;
}

export interface AandoeningInfo {
  id: string;
  naam: string;
  voorwaarde: AandoeningVoorwaarde | null;
}

export interface VocabulaireData {
  categorieen: VocabulaireCategorie[];
  risicofactoren: RisicofactorItem[];
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
  /**
   * Requirements §8.1 — als niet-null én vervuld=false: deze hypothese mag
   * (nog) niet getoond/meegewogen worden. weging/ondersteunend/tegensprekend
   * zijn dan niet geëvalueerd (leeg/betekenisloos) — de UI moet in dat geval
   * de gate tonen, niet de normale weging-badge.
   */
  voorwaarde: (AandoeningVoorwaarde & { vervuld: boolean }) | null;
}
