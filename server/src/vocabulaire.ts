/**
 * Gedeeld symptoomvocabulaire als losstaande, herbruikbare databron voor de
 * V2-flow — requirements §11.3 punt 1 ("Symptoom-first intake: brede invoer
 * volgens de categorieën uit V2 §6, gekoppeld aan de nu ingevoerde gedeelde
 * symptoom-objecten") en §11.4 stap 4.
 *
 * Puur leeswerk op de content die stap 1 al heeft ingevoerd (ANAM-002 t/m
 * 015, SYMP-002 t/m 006, met hun polariteit-relaties naar alle vier
 * AAND-00X) — geen nieuwe content, geen schemawijziging.
 *
 * AANNAME (net als bij redFlags.ts's RF-010-categorisering, expliciet
 * gemarkeerd): Clinical-Reasoning-Engine-V2-Theoretisch-Ontwerp.md §6 noemt
 * vier categorieën (Aard van de klacht, Tijdspatroon, Triggers, Begeleidende
 * symptomen) als voorbeeldstructuur, geen uitputtende, per-item vastgelegde
 * indeling. De toewijzing hieronder is mijn eigen, beargumenteerde invulling
 * van die structuur op de 19 daadwerkelijk ingevoerde vocabulaire-items —
 * geen letterlijk overgenomen indeling uit een brondocument. Eén item
 * (ANAM-015, een precipiterend-event-anamnese-item) past bij geen van de
 * vier genoemde categorieën; hier ondergebracht in een vijfde, expliciet
 * gemarkeerde "Overig"-categorie in plaats van kunstmatig ingepast.
 *
 * UITGEBREID (vervolg op stap 7's bevinding, na de PPPD-voorwaarde-gate-
 * uitbreiding): naast `categorieen` levert dit ook `risicofactoren` —
 * FACTOR-001 t/m 006/RF-004/TEST-003, de multifactorieel-groep uit
 * addendum-migratie 4 — zie de toelichting bij haalRisicofactorenOp
 * hieronder voor waarom dit apart staat van de symptoom-categorieën.
 */

import { TypeObject } from "@prisma/client";
import { prisma } from "./prisma";
import { Rol, isZichtbaarVoor } from "./visibility";
import { parseJsonField } from "./serialize";

export const SYMPTOOM_CATEGORIEEN: { categorie: string; itemIds: string[] }[] = [
  { categorie: "Aard van de klacht", itemIds: ["SYMP-002", "SYMP-003", "SYMP-004", "SYMP-006", "ANAM-010"] },
  { categorie: "Tijdspatroon", itemIds: ["ANAM-002", "ANAM-005", "ANAM-006", "ANAM-007", "ANAM-011"] },
  { categorie: "Triggers", itemIds: ["ANAM-003", "ANAM-008", "ANAM-012", "ANAM-013", "ANAM-014"] },
  { categorie: "Begeleidende symptomen", itemIds: ["ANAM-004", "ANAM-009", "SYMP-005"] },
  // ANAM-015 hoort bij geen van de vier V2 §6-categorieën — zie AANNAME hierboven.
  { categorie: "Overig", itemIds: ["ANAM-015"] },
];

export interface VocabulaireRelatie {
  naarObjectId: string;
  polariteit: string;
  diagnostischeWaarde: string | null;
  kwalificatie: Record<string, string> | null;
  interpretatie: string | null;
}

export interface VocabulaireItem {
  id: string;
  naam: string;
  kernbeschrijving: string;
  relaties: VocabulaireRelatie[];
}

export interface RisicofactorItem extends VocabulaireItem {
  typeObject: TypeObject;
  /**
   * Alleen relevant voor typeObject=red_flag (RF-004): het actietype uit de
   * bestaande, V1-achtige inkomende relaties (zelfde bron als redFlags.ts's
   * RodeVlagInfo.actietype) — nodig om bij "aanwezig" dezelfde rode-vlag-
   * interrupt te tonen als V1, niet alleen een neutrale toggle. Null voor
   * de overige typeObject-waarden (die hebben geen actietype-semantiek).
   */
  actietype: string | null;
}

export interface VocabulaireCategorie {
  categorie: string;
  items: VocabulaireItem[];
}

export interface AandoeningVoorwaarde {
  relatieId: string;
  anamneseItemId: string;
  anamneseItemNaam: string;
  bevinding: string | null;
  interpretatie: string | null;
}

export interface VocabulaireAandoening {
  id: string;
  naam: string;
  /**
   * Requirements §8.1: PPPD (en elk toekomstig item met dezelfde datavorm)
   * mag pas als hypothese getoond worden nadat aan deze voorwaarde is
   * voldaan — een harde gate, geen suggestie. V1 (server/src/flow.ts)
   * implementeert dit al voor de eigen flow; dit is dezelfde, datagedreven
   * opzoeking (relatieType=voorwaarde naar dit object), nu ook voor V2 zodat
   * dezelfde gate in de cross-hypothese-rangschikking geldt. Null als deze
   * aandoening geen voorwaarde-gate heeft.
   */
  voorwaarde: AandoeningVoorwaarde | null;
}

// Requirements §8.1-vervolg (multifactorieel-uitbreiding, na stap-7-
// bevinding): FACTOR-001 t/m 006/RF-004/TEST-003 (typeObject prognostische_
// factor/red_flag/onderzoekstest) kregen in stap 1 óók polariteit-relaties
// naar alle vier AAND-00X (addendum migratie 4), maar vielen buiten de
// symptoom-first-intake hierboven (die bewust beperkt is tot anamnese_item/
// symptoom, conform §11.3 punt 1's eigen tekst). Zonder deze objecten kon
// AAND-004 in V2 nooit op "Hoog" uitkomen — precies de bevinding uit stap 7
// (casus 4). Bewust een APARTE lijst (`risicofactoren`), niet toegevoegd aan
// `categorieen`: dit zijn geen symptomen volgens V2 §6, maar risicofactoren/
// bevindingen — zelfde onderscheid dat het addendum zelf al maakte
// ("ander uitgangspunt dan de vorige drie", migratie 4).
const RISICOFACTOR_TYPES = [TypeObject.prognostische_factor, TypeObject.red_flag, TypeObject.onderzoekstest];

async function haalRisicofactorenOp(rol: Rol): Promise<RisicofactorItem[]> {
  const objecten = await prisma.knowledgeObject.findMany({
    where: {
      typeObject: { in: RISICOFACTOR_TYPES },
      relatiesVanuit: { some: { relatieType: "bevinding_interpretatie", polariteit: { not: null } } },
    },
    include: {
      relatiesVanuit: {
        where: { relatieType: "bevinding_interpretatie", polariteit: { not: null } },
        select: { naarObjectId: true, polariteit: true, diagnostischeWaarde: true, kwalificatie: true, interpretatie: true },
      },
      // Zelfde bron als redFlags.ts's RodeVlagInfo.actietype — nodig zodat
      // RF-004 in V2 dezelfde interrupt kan tonen als V1, i.p.v. een kale
      // toggle voor een acuut-verwijzen-signaal.
      relatiesNaartoe: { select: { actietype: true } },
    },
  });

  return objecten
    .filter((o) => isZichtbaarVoor(rol, o))
    .map((o) => ({
      id: o.id,
      naam: o.naam,
      kernbeschrijving: o.kernbeschrijving,
      typeObject: o.typeObject,
      actietype: o.relatiesNaartoe.find((r) => r.actietype !== null)?.actietype ?? null,
      relaties: o.relatiesVanuit.map((r) => ({
        naarObjectId: r.naarObjectId,
        polariteit: r.polariteit as string,
        diagnostischeWaarde: r.diagnostischeWaarde,
        kwalificatie: parseJsonField<Record<string, string> | null>(r.kwalificatie, null),
        interpretatie: r.interpretatie,
      })),
    }));
}

export async function haalSymptoomVocabulaireOp(rol: Rol): Promise<{
  categorieen: VocabulaireCategorie[];
  risicofactoren: RisicofactorItem[];
  aandoeningen: VocabulaireAandoening[];
}> {
  const objecten = await prisma.knowledgeObject.findMany({
    where: {
      typeObject: { in: [TypeObject.anamnese_item, TypeObject.symptoom] },
      relatiesVanuit: { some: { relatieType: "bevinding_interpretatie", polariteit: { not: null } } },
    },
    include: {
      relatiesVanuit: {
        where: { relatieType: "bevinding_interpretatie", polariteit: { not: null } },
        select: { naarObjectId: true, polariteit: true, diagnostischeWaarde: true, kwalificatie: true, interpretatie: true },
      },
    },
  });

  const infoPerId = new Map<string, VocabulaireItem>();
  for (const o of objecten) {
    if (!isZichtbaarVoor(rol, o)) continue;
    infoPerId.set(o.id, {
      id: o.id,
      naam: o.naam,
      kernbeschrijving: o.kernbeschrijving,
      relaties: o.relatiesVanuit.map((r) => ({
        naarObjectId: r.naarObjectId,
        polariteit: r.polariteit as string,
        diagnostischeWaarde: r.diagnostischeWaarde,
        kwalificatie: parseJsonField<Record<string, string> | null>(r.kwalificatie, null),
        interpretatie: r.interpretatie,
      })),
    });
  }

  const categorieen = SYMPTOOM_CATEGORIEEN.map((cat) => ({
    categorie: cat.categorie,
    items: cat.itemIds.map((id) => infoPerId.get(id)).filter((item): item is VocabulaireItem => item !== undefined),
  })).filter((cat) => cat.items.length > 0);

  const risicofactoren = await haalRisicofactorenOp(rol);

  const AANDOENING_IDS = ["AAND-001", "AAND-002", "AAND-003", "AAND-004"];
  const [aandoeningObjecten, voorwaardeRelaties] = await Promise.all([
    prisma.knowledgeObject.findMany({
      where: { id: { in: AANDOENING_IDS } },
      select: { id: true, naam: true },
      orderBy: { id: "asc" },
    }),
    prisma.relatie.findMany({
      where: { naarObjectId: { in: AANDOENING_IDS }, relatieType: "voorwaarde" },
      include: { vanObject: true },
    }),
  ]);

  const aandoeningen: VocabulaireAandoening[] = aandoeningObjecten.map((a) => {
    const vw = voorwaardeRelaties.find((r) => r.naarObjectId === a.id);
    return {
      id: a.id,
      naam: a.naam,
      voorwaarde: vw
        ? {
            relatieId: vw.id,
            anamneseItemId: vw.vanObjectId,
            anamneseItemNaam: vw.vanObject.naam,
            bevinding: vw.bevinding,
            interpretatie: vw.interpretatie,
          }
        : null,
    };
  });

  return { categorieen, risicofactoren, aandoeningen };
}
