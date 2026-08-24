/**
 * Modus A — Reasoning-flow (requirements §2.1, bouwstap 3 uit §6.2).
 *
 * Deze module bouwt geen reasoning zelf — dat gebeurt client-side in de
 * frontend (de flow is interactief/stapsgewijs, met terugsprongen, zoals
 * referentiedocument §8 voorschrijft). Wat hier gebeurt is het samenstellen
 * van één "flow-graaf" bundel: alle KnowledgeObjects en relaties die de
 * BPPV-reasoning-flow nodig heeft, in een vorm die de frontend direct kan
 * gebruiken zonder zelf meerdere calls te hoeven combineren.
 *
 * Scope-beslissing (afgestemd met opdrachtgever): de triage houdt bewust
 * meerdere hypothesen open (§22 stap 1, §5.1 — "belangrijkste UX-risico van
 * de hele tool"), maar alleen BPPV (AAND-001) heeft in deze bouwronde
 * werkelijke anamnese-/test-/interventie-content. Voor de overige
 * hypothesen (uit AAND-001's differentiaaldiagnose-relaties) geeft deze
 * bundel alleen de onderscheidende kenmerken + tier + status mee, zodat de
 * frontend eerlijk kan tonen dat die paden nog niet uitgewerkt zijn, i.p.v.
 * te doen alsof er geredeneerd wordt (consistent met het "geen antwoord in
 * kennisbank"-principe, referentiedocument §12).
 *
 * Follow-up-consult (workflow-stap 7, §22) hoort normaliter bij een eerdere
 * Sessie te horen — die entiteit bestaat pas vanaf bouwstap 4. Hier dus
 * bewust een lichte, handmatige instap: de therapeut geeft zelf aan welk
 * eerder subtype/interventie het betrof, geen echte historie-lookup.
 */

import { Router } from "express";
import { prisma } from "./prisma";
import { parseJsonField } from "./serialize";

export const flowRouter = Router();

const AANDOENING_ID = "AAND-001";
const TEST_IDS = ["TEST-001", "TEST-002"];
const INTERVENTIE_IDS = ["INT-001", "INT-002", "INT-003", "INT-004"];

flowRouter.get("/bppv", async (_req, res) => {
  const aandoening = await prisma.knowledgeObject.findUnique({
    where: { id: AANDOENING_ID },
    include: {
      relatiesVanuit: { include: { naarObject: true } },
    },
  });

  if (!aandoening) {
    res.status(500).json({ error: "AAND-001 ontbreekt in de database — draai eerst de seed." });
    return;
  }

  const relatiesVanuit = aandoening.relatiesVanuit;

  // --- Hypothesen: BPPV zelf + alle differentiaaldiagnose-kandidaten -----
  const differentialen = relatiesVanuit
    .filter((r) => r.relatieType === "differentiaal")
    .map((r) => ({
      id: r.naarObjectId,
      naam: r.naarObject.naam,
      tier: r.naarObject.tier,
      status: r.naarObject.status,
      kenmerk: r.bevinding,
      relatietypeDifferentiaal: r.relatietypeDifferentiaal,
      volledigUitgewerkt: false, // in deze bouwronde is alleen AAND-001 volledig uitgewerkt
    }));

  // --- Anamnese: red-flag-checks die niet uit een test komen (RF-002 komt
  // uit TEST-001, zie hieronder) ------------------------------------------
  const anamneseChecks = relatiesVanuit
    .filter((r) => r.relatieType === "bevinding_interpretatie" && r.naarObject.typeObject === "red_flag")
    .map((r) => ({
      relatieId: r.id,
      redFlagId: r.naarObjectId,
      redFlagNaam: r.naarObject.naam,
      bevinding: r.bevinding,
      interpretatie: r.interpretatie,
      actietype: r.actietype,
      evidenceNiveau: r.evidenceNiveau,
    }));

  // --- Testen: elke test + zijn mogelijke bevindingen, incl. richting naar
  // AAND-001 én (voor Dix-Hallpike) naar RF-002 ----------------------------
  const testObjecten = await prisma.knowledgeObject.findMany({
    where: { id: { in: TEST_IDS } },
    include: { relatiesVanuit: { include: { naarObject: true } } },
  });
  const testen = testObjecten.map((t) => ({
    id: t.id,
    naam: t.naam,
    kernbeschrijving: t.kernbeschrijving,
    evidenceNiveau: t.evidenceNiveau,
    bevindingen: t.relatiesVanuit
      .filter((r) => r.naarObjectId === AANDOENING_ID || r.naarObject.typeObject === "red_flag")
      .map((r) => ({
        relatieId: r.id,
        naarObjectId: r.naarObjectId,
        naarObjectType: r.naarObject.typeObject,
        kwalificatie: parseJsonField<Record<string, string> | null>(r.kwalificatie, null),
        bevinding: r.bevinding,
        interpretatie: r.interpretatie,
        diagnostischeWaarde: r.diagnostischeWaarde,
        actietype: r.actietype,
        evidenceNiveau: r.evidenceNiveau,
      })),
  }));

  // --- Interventies: elke interventie + zijn indicatie-kwalificatie (vanuit
  // AAND-001) en zijn contra-indicaties (vanuit CI-xxx) --------------------
  const interventieObjecten = await prisma.knowledgeObject.findMany({
    where: { id: { in: INTERVENTIE_IDS } },
    include: { relatiesNaartoe: { include: { vanObject: true } } },
  });
  const interventies = INTERVENTIE_IDS.map((id) => {
    const obj = interventieObjecten.find((o) => o.id === id)!;
    const indicatieRelatie = relatiesVanuit.find(
      (r) => r.naarObjectId === id && r.relatieType === "bevinding_interpretatie"
    );
    const contraIndicaties = obj.relatiesNaartoe
      .filter((r) => r.vanObject.typeObject === "contra_indicatie")
      .map((r) => ({
        id: r.vanObjectId,
        naam: r.vanObject.naam,
        kernbeschrijving: r.vanObject.kernbeschrijving,
        interpretatie: r.interpretatie,
      }));
    return {
      id: obj.id,
      naam: obj.naam,
      kernbeschrijving: obj.kernbeschrijving,
      evidenceNiveau: obj.evidenceNiveau,
      indicatieKwalificatie: indicatieRelatie
        ? parseJsonField<Record<string, string> | null>(indicatieRelatie.kwalificatie, null)
        : null,
      contraIndicaties,
    };
  });

  // --- Patiënteducatie -----------------------------------------------------
  const eduObject = await prisma.knowledgeObject.findUnique({
    where: { id: "EDU-001" },
    include: { patientEducatieObject: true },
  });
  const educatie = eduObject && eduObject.patientEducatieObject
    ? {
        id: eduObject.id,
        naam: eduObject.naam,
        kernbeschrijving: eduObject.kernbeschrijving,
        verwachtingsmanagement: eduObject.patientEducatieObject.verwachtingsmanagement,
        rationaleUitlegCounterintuitief: eduObject.patientEducatieObject.rationaleUitlegCounterintuitief,
        signaleringObjectIds: parseJsonField<string[]>(
          eduObject.patientEducatieObject.signaleringObjectIds,
          []
        ),
      }
    : null;

  res.json({
    aandoening: {
      id: aandoening.id,
      naam: aandoening.naam,
      kernbeschrijving: aandoening.kernbeschrijving,
      klinischeKenmerken: aandoening.klinischeKenmerken,
      uitkomsttype: aandoening.uitkomsttype,
      tier: aandoening.tier,
      evidenceNiveau: aandoening.evidenceNiveau,
    },
    differentialen,
    anamneseChecks,
    testen,
    interventies,
    educatie,
  });
});
