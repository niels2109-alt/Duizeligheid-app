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

export interface VocabulaireCategorie {
  categorie: string;
  items: VocabulaireItem[];
}

export async function haalSymptoomVocabulaireOp(rol: Rol): Promise<{
  categorieen: VocabulaireCategorie[];
  aandoeningen: { id: string; naam: string }[];
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

  const aandoeningen = await prisma.knowledgeObject.findMany({
    where: { id: { in: ["AAND-001", "AAND-002", "AAND-003", "AAND-004"] } },
    select: { id: true, naam: true },
    orderBy: { id: "asc" },
  });

  return { categorieen, aandoeningen };
}
