/**
 * Modus A — Reasoning-flow (requirements §2.1, bouwstap 3 uit §6.2).
 * Uitgebreid in requirements §7 (stap 3 van 7.4) om een tweede volledig
 * item — vestibulaire hypofunctie (AAND-002) — te kunnen dragen, bovenop
 * dezelfde route/bundel-vorm als BPPV.
 *
 * Deze module bouwt geen reasoning zelf — dat gebeurt client-side in de
 * frontend (de flow is interactief/stapsgewijs, met terugsprongen, zoals
 * referentiedocument §8 voorschrijft). Wat hier gebeurt is het samenstellen
 * van één "flow-graaf" bundel: alle KnowledgeObjects en relaties die de
 * reasoning-flow voor één gegeven aandoening nodig heeft, in een vorm die de
 * frontend direct kan gebruiken zonder zelf meerdere calls te hoeven
 * combineren.
 *
 * Generalisatie t.o.v. de oorspronkelijke /bppv-route (stap 3): de route
 * accepteert nu elke aandoening_id, en testen/interventies/educatie worden
 * niet meer als hardcoded id-lijst meegegeven maar afgeleid uit de relaties
 * zelf — zo werkt dezelfde route ongewijzigd voor elk toekomstig item, geen
 * aparte kopie per aandoening (requirements §7.4: "bouw dit bovenop de
 * werkende BPPD-flow, niet als apart nieuw systeem").
 *
 * Scope-beslissing (afgestemd met opdrachtgever): de triage houdt bewust
 * meerdere hypothesen open (§22 stap 1, §5.1 — "belangrijkste UX-risico van
 * de hele tool"). "volledigUitgewerkt" wordt nu dynamisch bepaald (status =
 * gepubliceerd + behandeldiepte = volledig) i.p.v. hardcoded false, zodat de
 * frontend weet welke differentialen een eigen, volwaardig vervolgtraject
 * hebben (op dit moment: BPPV en vestibulaire hypofunctie) en welke nog
 * stub zijn — consistent met het "geen antwoord in kennisbank"-principe,
 * referentiedocument §12.
 *
 * Follow-up-consult (workflow-stap 7, §22) hoort normaliter bij een eerdere
 * Sessie te horen — die entiteit bestaat pas vanaf bouwstap 4. Hier dus
 * bewust een lichte, handmatige instap: de therapeut geeft zelf aan welk
 * eerder subtype/interventie het betrof, geen echte historie-lookup.
 */

import { Router, Request, Response } from "express";
import { prisma } from "./prisma";
import { parseJsonField } from "./serialize";

export const flowRouter = Router();

flowRouter.get("/:aandoeningId", async (req: Request<{ aandoeningId: string }>, res: Response) => {
  const AANDOENING_ID = req.params.aandoeningId;

  const aandoening = await prisma.knowledgeObject.findUnique({
    where: { id: AANDOENING_ID },
    include: {
      relatiesVanuit: { include: { naarObject: true } },
    },
  });

  if (!aandoening || aandoening.typeObject !== "aandoening") {
    res.status(404).json({ error: `Aandoening ${AANDOENING_ID} niet gevonden.` });
    return;
  }

  const relatiesVanuit = aandoening.relatiesVanuit;

  // --- Hypothesen: deze aandoening zelf + alle differentiaaldiagnose-
  // kandidaten. "volledigUitgewerkt" dynamisch: alleen items die zelf ook
  // als volledig item zijn gebouwd (status=gepubliceerd, behandeldiepte=
  // volledig) hebben een eigen bundel om naartoe te wisselen — stubs niet.
  const differentialen = relatiesVanuit
    .filter((r) => r.relatieType === "differentiaal")
    .map((r) => ({
      id: r.naarObjectId,
      naam: r.naarObject.naam,
      tier: r.naarObject.tier,
      status: r.naarObject.status,
      kenmerk: r.bevinding,
      relatietypeDifferentiaal: r.relatietypeDifferentiaal,
      volledigUitgewerkt:
        r.naarObject.status === "gepubliceerd" && r.naarObject.behandeldiepte === "volledig",
    }));

  // --- Anamnese: red-flag-checks die niet uit een test komen (test-
  // getriggerde red flags, zoals RF-002/RF-007, komen via `testen` hieronder)
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

  // --- Testen: elke onderzoekstest die minstens één bevinding_interpretatie-
  // relatie rechtstreeks naar deze aandoening heeft, met al zijn bevindingen
  // (incl. de bevindingen die naar een red-flag-object wijzen, bijv. TEST-001
  // → RF-002 of TEST-003 → RF-007) ------------------------------------------
  const testIds = new Set(
    relatiesVanuit
      .filter((r) => r.relatieType === "bevinding_interpretatie" && r.naarObject.typeObject === "onderzoekstest")
      .map((r) => r.naarObjectId)
  );
  // Bovenstaande dekt "AANDOENING -> TEST"-relaties, maar de daadwerkelijke
  // testbevindingen lopen andersom (TEST -> AANDOENING / TEST -> RF), dus
  // testen bepalen we via de relaties die NAAR deze aandoening toe wijzen.
  const testRelatiesNaarAandoening = await prisma.relatie.findMany({
    where: {
      naarObjectId: AANDOENING_ID,
      relatieType: "bevinding_interpretatie",
      vanObject: { typeObject: "onderzoekstest" },
    },
    select: { vanObjectId: true },
  });
  testRelatiesNaarAandoening.forEach((r) => testIds.add(r.vanObjectId));

  const testObjecten = await prisma.knowledgeObject.findMany({
    where: { id: { in: Array.from(testIds) } },
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

  // --- Interventies: elke interventie met minstens één indicatie-relatie
  // vanuit deze aandoening, met AL zijn indicatie-kwalificaties (meervoud —
  // requirements §7.1: twee onafhankelijke assen kunnen tot meerdere,
  // los gekwalificeerde relaties naar dezelfde interventie leiden, bijv.
  // INT-006 bij zowel fase=acuut als fase=chronisch-compensatie) en zijn
  // contra-indicaties (vanuit CI-xxx) --------------------------------------
  const interventieIds = Array.from(
    new Set(
      relatiesVanuit
        .filter((r) => r.relatieType === "bevinding_interpretatie" && r.naarObject.typeObject === "interventie")
        .map((r) => r.naarObjectId)
    )
  );
  const interventieObjecten = await prisma.knowledgeObject.findMany({
    where: { id: { in: interventieIds } },
    include: { relatiesNaartoe: { include: { vanObject: true } } },
  });
  const interventies = interventieIds.map((id) => {
    const obj = interventieObjecten.find((o) => o.id === id)!;
    const indicatieRelaties = relatiesVanuit.filter(
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
      indicatieKwalificaties: indicatieRelaties.map((r) =>
        parseJsonField<Record<string, string> | null>(r.kwalificatie, null)
      ),
      contraIndicaties,
    };
  });

  // --- Patiënteducatie: het patiënteducatie-item wiens bron_object_ids deze
  // aandoening bevat (geen aparte Relatie-rij hiervoor, zie EDU-001/EDU-002
  // in seed.ts) --------------------------------------------------------------
  const eduKandidaten = await prisma.knowledgeObject.findMany({
    where: { typeObject: "patienteducatie_item" },
    include: { patientEducatieObject: true },
  });
  const eduObject = eduKandidaten.find((o) =>
    o.patientEducatieObject
      ? parseJsonField<string[]>(o.patientEducatieObject.bronObjectIds, []).includes(AANDOENING_ID)
      : false
  );
  const educatie =
    eduObject && eduObject.patientEducatieObject
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
