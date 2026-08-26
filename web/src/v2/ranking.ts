import type {
  Fase,
  HypotheseRanking,
  Lateraliteit,
  RangschikkingReden,
  VocabulaireData,
  VocabulaireItem,
  VocabulaireRelatie,
  Weging,
} from "./types";

/**
 * Cross-hypothese rangschikkingsengine — requirements §11.3 punt 2, V2-
 * ontwerp §7-10. Puur client-side, op de volledige vocabulaire-bundel die
 * eenmalig wordt opgehaald (zelfde architectuurprincipe als V1's flow-
 * reducer: de server blijft dun, alle redeneerlogica staat hier).
 *
 * BELANGRIJKE SCOPE-AANTEKENING (requirements §11.5, expliciet zo
 * geadviseerd): de exacte aggregatieregel is nog niet uitputtend
 * gedefinieerd. Wat wél vaststaat en hier is geïmplementeerd: (a) een
 * hoog-gewicht spreekt-tegen-kenmerk plafonneert een hypothese altijd op
 * "matig", ongeacht de ondersteuning (V2-ontwerp §10) — de enige
 * voorgeschreven regel. Voor de rest gebruikt dit een eenvoudige, interne
 * puntenscore (nooit aan de gebruiker getoond — alleen hoog/matig/laag +
 * natuurlijke taal, conform "geen score, geen percentage") om "meer/hogere
 * ondersteuning → hoger, meer/hogere tegenspraak → lager" concreet te
 * maken. Dit is bewust een voorlopige basisregel, te herzien op basis van
 * de testresultaten uit stap 7 (§11.5) — niet de uiteindelijke, uitputtend
 * geteste aggregatielogica.
 */

const GEWICHT_SCORE: Record<"hoog" | "matig" | "laag", number> = { hoog: 2, matig: 1, laag: 0.5 };

export const WEGING_LABEL: Record<Weging, string> = { hoog: "Hoog", matig: "Matig", laag: "Laag" };

/**
 * Sommige relaties gelden alleen onder een specifieke fase/lateraliteit
 * (bijv. ANAM-011 → AAND-002: spreekt-tegen bij fase=acuut, neutraal bij
 * fase=chronisch — zie addendum migratie 3). Zolang de therapeut die
 * kwalificatie niet heeft opgegeven, telt zo'n relatie bewust NIET mee —
 * conservatiever dan gokken, en consistent met "geen black box".
 */
function relatieVanToepassing(rel: VocabulaireRelatie, fase: Fase, lateraliteit: Lateraliteit): boolean {
  const kwal = rel.kwalificatie;
  if (!kwal) return true;
  if (kwal.fase && kwal.fase !== fase) return false;
  if (kwal.lateraliteit && kwal.lateraliteit !== lateraliteit) return false;
  return true;
}

export function berekenRangschikking(
  vocabulaire: VocabulaireData,
  antwoorden: Record<string, boolean | undefined>,
  fase: Fase,
  lateraliteit: Lateraliteit
): HypotheseRanking[] {
  const alleItems = vocabulaire.categorieen.flatMap((c) => c.items);

  return vocabulaire.aandoeningen.map((aand) => {
    const ondersteunend: RangschikkingReden[] = [];
    const tegensprekend: RangschikkingReden[] = [];

    for (const item of alleItems) {
      if (!antwoorden[item.id]) continue; // alleen bevestigde ("aanwezig") items tellen mee
      for (const rel of item.relaties) {
        if (rel.naarObjectId !== aand.id) continue;
        if (rel.polariteit === "neutraal" || !rel.diagnostischeWaarde) continue;
        if (!relatieVanToepassing(rel, fase, lateraliteit)) continue;
        const reden: RangschikkingReden = {
          itemNaam: item.naam,
          polariteit: rel.polariteit,
          gewicht: rel.diagnostischeWaarde,
          interpretatie: rel.interpretatie,
        };
        (rel.polariteit === "ondersteunt" ? ondersteunend : tegensprekend).push(reden);
      }
    }

    const score =
      ondersteunend.reduce((s, r) => s + GEWICHT_SCORE[r.gewicht], 0) -
      tegensprekend.reduce((s, r) => s + GEWICHT_SCORE[r.gewicht], 0);

    let weging: Weging = score > 1.5 ? "hoog" : score >= -0.5 ? "matig" : "laag";

    // De enige vooraf vastgestelde regel (V2-ontwerp §10/requirements §11.5).
    let geplafonneerd = false;
    if (weging === "hoog" && tegensprekend.some((r) => r.gewicht === "hoog")) {
      weging = "matig";
      geplafonneerd = true;
    }

    return { id: aand.id, naam: aand.naam, weging, ondersteunend, tegensprekend, geplafonneerd };
  });
}

/** Natuurlijke-taal-uitleg — exact het formaat uit V2-ontwerp §8. */
export function verklaring(r: HypotheseRanking): string {
  const delen: string[] = [];
  if (r.ondersteunend.length > 0) {
    delen.push(
      `${r.naam} staat op ${WEGING_LABEL[r.weging].toLowerCase()} omdat: ` +
        r.ondersteunend.map((o) => `${o.itemNaam} (ondersteunt, ${o.gewicht})`).join(", ") +
        "."
    );
  } else {
    delen.push(`${r.naam} staat op ${WEGING_LABEL[r.weging].toLowerCase()} — nog geen ondersteunende kenmerken bevestigd.`);
  }
  if (r.tegensprekend.length > 0) {
    delen.push(
      "Wel tegensprekend: " +
        r.tegensprekend.map((t) => `${t.itemNaam} (spreekt tegen, ${t.gewicht})`).join(", ") +
        (r.geplafonneerd ? " — dit plafonneert de rangschikking op matig, ongeacht de ondersteuning." : ".")
    );
  }
  return delen.join(" ");
}

// --- "Geen dominante hypothese" (V2-ontwerp §14, requirements §11.3 punt 3) --
//
// Volwaardige, geaccepteerde uitkomst — geen foutstatus. Precies één "hoog"
// betekent een duidelijke koploper; nul (nog niets overtuigend) of twee-of-
// meer tegelijk (co-dominant, geen winnaar) betekenen allebei dat er nog
// geen dominante hypothese is.
export function geenDominanteHypothese(ranking: HypotheseRanking[]): boolean {
  return ranking.filter((r) => r.weging === "hoog").length !== 1;
}

// --- Herweging-met-verklaring (V2-ontwerp §13, requirements §11.3 punt 4) ---
//
// Voor/na-vergelijking + gegenereerde verklaring van *waarom* de
// rangschikking veranderde. Bewust puur tekstueel (geen balk/percentage/
// scoreweergave) — zie de expliciete waarschuwing in V2-ontwerp §13/§24 dat
// een voor/na-hoog/matig/laag-lijst al snel als score kan aanvoelen; de
// informatiearchitectuur van dit scherm staat daar zelf nog als "onvoldoende
// gedefinieerd" genoemd, dus hier bewust een simpele, oplopende tekstlog in
// plaats van een visueel score-achtig element.
export function vergelijkRangschikking(
  vorige: HypotheseRanking[],
  huidige: HypotheseRanking[],
  gewijzigdItemNaam: string
): string[] {
  const log: string[] = [];
  for (const nu of huidige) {
    const was = vorige.find((v) => v.id === nu.id);
    if (!was || was.weging === nu.weging) continue;
    const reden =
      nu.ondersteunend.find((r) => r.itemNaam === gewijzigdItemNaam) ??
      nu.tegensprekend.find((r) => r.itemNaam === gewijzigdItemNaam);
    const redenTekst = reden
      ? ` — ${gewijzigdItemNaam} (${reden.polariteit === "ondersteunt" ? "ondersteunt" : "spreekt tegen"}, ${reden.gewicht})`
      : ` — na wijziging van "${gewijzigdItemNaam}"`;
    log.push(`${nu.naam}: ${WEGING_LABEL[was.weging]} → ${WEGING_LABEL[nu.weging]}${redenTekst}.`);
  }
  return log;
}

// --- Doorvraag-prioriteit bij het "chronische cluster" (V2-ontwerp §9,
// bijgewerkt; requirements §11.3 punt 2) --------------------------------
//
// Addendum-bevinding: vestibulaire hypofunctie (chronische fase), PPPD en
// multifactorieel delen zwakke, overlappende basiskenmerken (duur, vage
// onbalans) en houden elkaar daardoor vaak dicht bij elkaar. Concrete,
// onderbouwde regel: vraag in dat geval gericht door naar uitlokkingstype
// (ANAM-012/013/014), met name gevoeligheid voor complexe visuele prikkels
// (ANAM-014) — een scherpe PPPD-discriminator (addendum migratie 3).
const CHRONISCH_CLUSTER = ["AAND-002", "AAND-003", "AAND-004"];
const UITLOKKINGSTYPE_PRIORITEIT = ["ANAM-014", "ANAM-012", "ANAM-013"];

export function volgendeVraagSuggestie(
  vocabulaire: VocabulaireData,
  ranking: HypotheseRanking[],
  antwoorden: Record<string, boolean | undefined>
): VocabulaireItem | null {
  const clusterWegingen = ranking.filter((r) => CHRONISCH_CLUSTER.includes(r.id)).map((r) => r.weging);
  // Alle drie gelijk staan is alleen "vastgelopen" als ze nog concurrerend
  // zijn (matig/hoog) — alle drie op "laag" betekent juist dat ze correct
  // en eensluidend zijn uitgesloten, geen ambiguïteit om op door te vragen.
  const uniekeWegingen = new Set(clusterWegingen);
  const vastgelopen = uniekeWegingen.size === 1 && !uniekeWegingen.has("laag");
  if (!vastgelopen) return null;

  const alleItems = vocabulaire.categorieen.flatMap((c) => c.items);
  for (const id of UITLOKKINGSTYPE_PRIORITEIT) {
    if (antwoorden[id] === undefined) {
      const item = alleItems.find((i) => i.id === id);
      if (item) return item;
    }
  }
  return null;
}
