export interface AIAntwoord {
  vraag: string;
  geenAntwoord: boolean;
  escalatie: boolean;
  antwoordtekst: string;
  bron: "deterministisch" | "ai-verfijnd" | "geen-match";
  objectIds: string[];
  evidenceNiveaus: string[];
}

export interface AIEducatieAntwoord {
  antwoordtekst: string;
  bron: "deterministisch" | "ai-verfijnd";
  objectIds: string[];
  alarmsignalen: { objectId: string; tekst: string }[];
}
