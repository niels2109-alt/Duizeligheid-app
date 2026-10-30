/**
 * Rode-vlaggenmodule als losstaand, herbruikbaar component — requirements
 * §11.1/§11.4 stap 2 ("Rode-vlaggenmodule ombouwen tot herbruikbaar
 * component, losse stap, laag risico, test dat V1 hierdoor niet breekt").
 *
 * Grotendeels hergebruik, geen nieuwe content (§11.1): RF-001 t/m RF-013
 * bestaan al als KnowledgeObject (typeObject=red_flag) met hun bestaande
 * bevinding_interpretatie-relaties en actietype. Wat hier nieuw is, is
 * uitsluitend een CODE-module — geen schemawijziging, geen nieuwe
 * KnowledgeObjects/relaties — die deze objecten aandoening-onafhankelijk
 * ophaalt en in klinische categorieën groepeert (Clinical-Reasoning-
 * Engine-V2-Theoretisch-Ontwerp.md §5), zodat zowel V1 (via de bestaande,
 * ongewijzigde per-aandoening logica in flow.ts) als de toekomstige V2
 * "losstaande, altijd-actieve module aan het begin" (§11.1) dezelfde
 * onderliggende data kunnen gebruiken zonder duplicatie.
 *
 * Bewuste, lage-risico-keuze: flow.ts's bestaande per-aandoening
 * rode-vlag-logica (anamneseChecks, testen[].bevindingen) wordt door deze
 * stap NIET aangeraakt — die was al datagedreven en correct. Dit bestand is
 * zuiver additief: een nieuwe, generieke ophaalfunctie plus een nieuw
 * endpoint (GET /api/rode-vlaggen), die V1's bestaande output-vorm op geen
 * enkele manier kan beïnvloeden.
 *
 * AANNAME (afwijking van het brondocument, hier expliciet gemarkeerd omdat
 * hij niet stilzwijgend hoort te worden opgelost): het theoretisch ontwerp
 * (§5) noemt zeven categorieën met in totaal twaalf van de dertien
 * RF-objecten. RF-010 ("Uitblijvend herstel ondanks correcte uitvoering",
 * actietype=samenwerking_adviseren) wordt in geen enkele categorie genoemd —
 * een ontbrekend geval in het brondocument, geen bewuste uitsluiting. Hier
 * ondergebracht bij "Beloop wijkt af van verwacht" (samen met RF-006/008/
 * 012/013), omdat uitblijvend herstel inhoudelijk hetzelfde is als een
 * afwijking van het verwachte klinische beloop — maar dit is mijn eigen
 * invulling van een gat in het brondocument, geen letterlijk overgenomen
 * indeling, en verdient bevestiging bij het voorleggen van deze stap.
 */

import { ActieType } from "@prisma/client";
import { prisma } from "./prisma";
import { Rol, isZichtbaarVoor } from "./visibility";

export const RODE_VLAG_CATEGORIEEN: { categorie: string; redFlagIds: string[] }[] = [
  { categorie: "Acuut-neurologisch", redFlagIds: ["RF-001", "RF-007"] },
  { categorie: "Cardiovasculair", redFlagIds: ["RF-004"] },
  { categorie: "Otologisch/gehoor", redFlagIds: ["RF-003", "RF-009"] },
  { categorie: "Hoofdpijn/intracranieel", redFlagIds: ["RF-005"] },
  { categorie: "Atypisch testpatroon", redFlagIds: ["RF-002"] },
  { categorie: "Gedrags-/psychisch", redFlagIds: ["RF-011"] },
  // RF-010 hier toegevoegd — zie AANNAME hierboven.
  { categorie: "Beloop wijkt af van verwacht", redFlagIds: ["RF-006", "RF-008", "RF-010", "RF-012", "RF-013"] },
];

export interface RodeVlagInfo {
  id: string;
  naam: string;
  kernbeschrijving: string;
  /**
   * Een RF-object heeft in de praktijk één consistent actietype over al
   * zijn binnenkomende relaties (geverifieerd tegen de huidige database) —
   * hier voor het gemak als één veld per object ontsloten, i.p.v. per
   * relatie. Null als het object (nog) geen enkele binnenkomende relatie
   * heeft.
   */
  actietype: ActieType | null;
}

export interface RodeVlagCategorie {
  categorie: string;
  redFlaggen: RodeVlagInfo[];
}

/**
 * Alle rode-vlag-objecten, aandoening-onafhankelijk opgehaald en gegroepeerd
 * in de klinische categorieën hierboven — de "losstaande, altijd-actieve
 * module" uit §11.1. Respecteert dezelfde rol-gebaseerde zichtbaarheid als
 * de rest van de kennisbank (requirements §2.2).
 */
export async function haalAlleRodeVlaggenOp(rol: Rol): Promise<RodeVlagCategorie[]> {
  const objecten = await prisma.knowledgeObject.findMany({
    where: { typeObject: "red_flag" },
    include: { relatiesNaartoe: { select: { actietype: true } } },
  });

  const infoPerId = new Map<string, RodeVlagInfo>();
  for (const o of objecten) {
    if (!isZichtbaarVoor(rol, o)) continue;
    const actietype = o.relatiesNaartoe.find((r) => r.actietype !== null)?.actietype ?? null;
    infoPerId.set(o.id, {
      id: o.id,
      naam: o.naam,
      kernbeschrijving: o.kernbeschrijving,
      actietype,
    });
  }

  return RODE_VLAG_CATEGORIEEN.map((cat) => ({
    categorie: cat.categorie,
    redFlaggen: cat.redFlagIds
      .map((id) => infoPerId.get(id))
      .filter((info): info is RodeVlagInfo => info !== undefined),
  })).filter((cat) => cat.redFlaggen.length > 0);
}
