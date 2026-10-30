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

  // Requirements §8.1/§8.4: is dit ZELF een voorwaarde-gated item (bijv.
  // PPPD)? Datagedreven, niet hardcoded op een item-id — elk toekomstig
  // item met dezelfde datavorm (een voorwaarde-relatie die naar dit object
  // wijst) krijgt hierdoor automatisch dezelfde trendmatige follow-up i.p.v.
  // de binaire/twee-lussen-varianten (zie ReasoningFlow.tsx).
  const eigenVoorwaarde = await prisma.relatie.findFirst({
    where: { naarObjectId: AANDOENING_ID, relatieType: "voorwaarde" },
    include: { vanObject: true },
  });

  // --- Hypothesen: deze aandoening zelf + alle differentiaaldiagnose-
  // kandidaten. "volledigUitgewerkt" dynamisch: alleen items die zelf ook
  // als volledig item zijn gebouwd (status=gepubliceerd, behandeldiepte=
  // volledig) hebben een eigen bundel om naartoe te wisselen — stubs niet.
  const differentialenRuw = relatiesVanuit
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

  // Requirements §8.1: sommige differentialen worden pas als hypothese
  // "vrijgegeven" nadat aan een voorwaarde-relatie is voldaan (PPPD/AAND-003
  // is het eerste voorbeeld). Dit is een harde gate — de frontend moet dit
  // kunnen tonen en afdwingen VÓÓR er naar de volledige bundel van dat item
  // wordt gewisseld, dus de voorwaarde-info wordt hier al meegegeven, niet
  // pas in de bundel van het item zelf.
  const voorwaardeRelaties = await prisma.relatie.findMany({
    where: {
      naarObjectId: { in: differentialenRuw.map((d) => d.id) },
      relatieType: "voorwaarde",
    },
    include: { vanObject: true },
  });
  const differentialen = differentialenRuw.map((d) => {
    const vw = voorwaardeRelaties.find((r) => r.naarObjectId === d.id);
    return {
      ...d,
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
  //
  // `polariteit: null` hier en bij `relatiesVanuit` hieronder is bewust: de
  // §11-polariteit-relaties (Clinical Reasoning Engine V2) hergebruiken
  // relatieType=bevinding_interpretatie op dezelfde objecten (o.a. TEST-003,
  // dat nu ook naar AAND-001/003/004 wijst t.b.v. V2), maar horen NIET in
  // deze V1-flow-bundel thuis — alleen V2-relaties hebben polariteit gezet
  // (V1-relaties hebben dit veld altijd null, zie schema-toelichting).
  // Zonder deze filter zou TEST-003 onterecht als nieuwe test bij BPPD/PPPD
  // verschijnen, puur door de nieuwe §11-content — precies de wijziging in
  // bestaande V1-functionaliteit die niet mag optreden.
  const testRelatiesNaarAandoening = await prisma.relatie.findMany({
    where: {
      naarObjectId: AANDOENING_ID,
      relatieType: "bevinding_interpretatie",
      vanObject: { typeObject: "onderzoekstest" },
      polariteit: null,
    },
    select: { vanObjectId: true },
  });
  testRelatiesNaarAandoening.forEach((r) => testIds.add(r.vanObjectId));

  const testObjecten = await prisma.knowledgeObject.findMany({
    where: { id: { in: Array.from(testIds) } },
    include: { relatiesVanuit: { where: { polariteit: null }, include: { naarObject: true } } },
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
        // Requirements §8.1 (TEST-005/Bárány-criteria): conditionele
        // diagnostische waarde — null hierboven + een verwijzing naar de
        // voorwaarde-relatie i.p.v. een vaste waarde. De frontend lost dit
        // op aan de hand van of die voorwaarde in de huidige flow-sessie is
        // bevestigd.
        diagnostischeWaardeVoorwaardeRelatieId: r.diagnostischeWaardeVoorwaardeRelatieId,
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

  // --- Factoren (requirements §10.1, alleen bij uitkomsttype=samengesteld):
  // elk FACTOR-xxx-object (of hergebruikt object, bijv. RF-004/TEST-003) met
  // een aggregatie-relatie naar deze aandoening, met zijn bijdrage_gewicht,
  // gekoppelde interventie (fysio zelf) of signalering-opvolging (extern) —
  // §10.1: "geen hoofdhypothese maar een factorenprofiel". Datagedreven op
  // relatieType=aggregatie, niet op AAND-004's id — elk toekomstig
  // samengesteld-item werkt hierdoor automatisch mee.
  const aggregatieRelaties = await prisma.relatie.findMany({
    where: { naarObjectId: AANDOENING_ID, relatieType: "aggregatie" },
    include: { vanObject: true },
  });
  const factorIds = aggregatieRelaties.map((r) => r.vanObjectId);
  const [interventieRelatiesFactoren, signaleringRelatiesFactoren] = await Promise.all([
    prisma.relatie.findMany({
      // polariteit: null — zie toelichting bij testRelatiesNaarAandoening
      // hierboven; dezelfde §11-isolatie geldt hier voor FACTOR-xxx/RF-004/
      // TEST-003, die nu ook §11-polariteit-relaties naar AAND-00X hebben.
      where: { vanObjectId: { in: factorIds }, relatieType: "bevinding_interpretatie", polariteit: null },
      include: { naarObject: true },
    }),
    prisma.relatie.findMany({
      where: { vanObjectId: { in: factorIds }, naarObjectId: AANDOENING_ID, relatieType: "signalering_opvolging" },
    }),
  ]);
  const factoren = aggregatieRelaties.map((agg) => {
    const interventieRel = interventieRelatiesFactoren.find(
      (r) => r.vanObjectId === agg.vanObjectId && r.naarObject.typeObject === "interventie"
    );
    const signaleringRel = signaleringRelatiesFactoren.find((r) => r.vanObjectId === agg.vanObjectId);
    return {
      id: agg.vanObjectId,
      naam: agg.vanObject.naam,
      kernbeschrijving: agg.vanObject.kernbeschrijving,
      bijdrageGewicht: agg.bijdrageGewicht,
      bevinding: agg.bevinding,
      // Requirements §10.1 ("elk met eigen screening"): een hergebruikt
      // red-flag-object (RF-004) wordt al via de bestaande anamneseChecks-
      // stap uitgevraagd (interrupt-pad blijft ongewijzigd, §19) — geen
      // aparte factor-vraag ervoor, de frontend leest de bevestiging uit de
      // anamnese-antwoorden i.p.v. een eigen toggle te tonen.
      viaAnamnese: agg.vanObject.typeObject === "red_flag",
      interventie: interventieRel
        ? {
            id: interventieRel.naarObjectId,
            naam: interventieRel.naarObject.naam,
            kernbeschrijving: interventieRel.naarObject.kernbeschrijving,
            evidenceNiveau: interventieRel.naarObject.evidenceNiveau,
          }
        : null,
      signalering: signaleringRel ? { interpretatie: signaleringRel.interpretatie } : null,
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
      // Bijvangst §8.5 stap 4: als deze aandoening ZELF een voorwaarde-gated
      // item is (bijv. na een eerdere wissel is PPPD de "huidige bundel"
      // geworden), moet de primaire triagekaart dezelfde gate afdwingen als
      // een differentiaal-keuze — anders omzeilt een tweede sessie op
      // dezelfde geladen bundel de voorwaarde-bevestiging volledig (§8.1:
      // "harde gate, geen suggestie"). Zie ReasoningFlow.tsx kiesTriage().
      voorwaarde: eigenVoorwaarde
        ? {
            relatieId: eigenVoorwaarde.id,
            anamneseItemId: eigenVoorwaarde.vanObjectId,
            anamneseItemNaam: eigenVoorwaarde.vanObject.naam,
            bevinding: eigenVoorwaarde.bevinding,
            interpretatie: eigenVoorwaarde.interpretatie,
          }
        : null,
      // Requirements §10.3: "Hergebruik Behandelepisode (§8.4)" — het
      // samengesteld-type profiteert van dezelfde episode-structuur als
      // PPPD (per-factor-voortgang over meerdere sessies volgen), dus de
      // trendmatige follow-up geldt nu voor BEIDE gevallen: een voorwaarde-
      // gated item (PPPD) óf een samengesteld-type item (AAND-004) —
      // datagedreven op uitkomsttype, niet op een specifiek item-id.
      vereistEpisodeTrend: eigenVoorwaarde !== null || aandoening.uitkomsttype === "samengesteld",
    },
    differentialen,
    anamneseChecks,
    testen,
    interventies,
    factoren,
    educatie,
  });
});
