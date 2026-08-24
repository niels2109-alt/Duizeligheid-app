/**
 * Seed-script — vult de database met de volledige BPPV-content uit
 * Duizeligheid-Referentiemodel.md §2-6, conform Duizeligheid-Technische-
 * Requirements-MVP.md §6.2 stap 1.
 *
 * Objecten: AAND-001 (BPPV), TEST-001/002, INT-001 t/m 004, RF-001 t/m 006,
 * EDU-001, PEARL-001, plus CI-001 t/m 005 (contra-indicaties) en zes
 * differentiaaldiagnose-stubs.
 *
 * ---------------------------------------------------------------------
 * MODELLERINGSBESLISSINGEN (afgestemd met opdrachtgever vóór het bouwen)
 * ---------------------------------------------------------------------
 * Het requirements-datamodel (§1.3) kent maar vijf relatie_type-waarden:
 * bevinding_interpretatie / voorwaarde / aggregatie / signalering_opvolging
 * / differentiaal. Voor drie soorten koppelingen die wél in het
 * referentiedocument voorkomen maar geen eigen relatietype hebben, is in
 * overleg gekozen om relatie_type = bevinding_interpretatie te hergebruiken
 * (bevinding = de triggerende conditie/bevestiging, interpretatie = het
 * gevolg/advies):
 *   1. Interventie-indicatie (AAND → INT, bijv. "bevestigde posterior
 *      canalolithiasis" → "Epley geïndiceerd")
 *   2. Contra-indicatie-koppeling (CI → INT, bijv. "cervicale instabiliteit"
 *      → "niet toepassen / aanpassen")
 *   3. Clinical-pearl-koppeling (PEARL → TEST, het aanvullende
 *      interpretatieprincipe bij een grensgeval)
 *
 * Daarnaast: BPPV↔PPPD kreeg relatietype_differentiaal = uitsluitend (de
 * enige differentiaal uit referentiedocument §6/§18 waarvoor deze waarde
 * niet expliciet in het brondocument stond — met opdrachtgever afgestemd).
 *
 * ---------------------------------------------------------------------
 * AANNAMES DIE NOG CONTROLE VERDIENEN (zie ook het overzicht dat na het
 * bouwen aan de opdrachtgever is voorgelegd)
 * ---------------------------------------------------------------------
 * - `laatst_gecontroleerd_op`: overal op de datum van data-invoer gezet
 *   (geen aparte klinische revisiedatum in het brondocument aanwezig).
 * - `evidence_niveau` op RF-001 t/m RF-006, CI-001 t/m CI-005 en EDU-001:
 *   niet expliciet per object vermeld in het brondocument; hier ingevuld
 *   met een voorzichtige, beargumenteerde default (zie inline commentaar).
 * - CI-001 t/m CI-004 zijn expliciet gekoppeld aan INT-001 (Epley) en
 *   INT-003 (Barbecue-roll, "vergelijkbaar met Epley"); INT-002 (Semont)
 *   krijgt in het brondocument alléén CI-005 — de vier andere CI's zijn NIET
 *   stilzwijgend ook aan Semont gekoppeld, om niets te verzinnen dat niet
 *   letterlijk in de tabel staat.
 * - Zes differentiaaldiagnose-objecten (vestibulaire hypofunctie, PPPD,
 *   vestibulaire migraine, Menière, CVA/TIA, orthostatische hypotensie)
 *   zijn als STUB aangemaakt — alleen wat requirements §1.1 verplicht stelt
 *   (behandelverantwoordelijkheid/-diepte/tier/evidence-niveau) is ingevuld,
 *   geen volledige Tier 1-uitwerking. Vestibulaire hypofunctie en PPPD
 *   krijgen bewust de id's AAND-002/AAND-003 die het referentiedocument zelf
 *   al voor hun toekomstige volledige uitwerking reserveert (§14, §15).
 */

import {
  PrismaClient,
  TypeObject,
  Behandelverantwoordelijkheid,
  Behandeldiepte,
  Uitkomsttype,
  EvidenceNiveau,
  ObjectStatus,
  RelatieType,
  DiagnostischeWaarde,
  RelatietypeDifferentiaal,
  ActieType,
} from "@prisma/client";

const prisma = new PrismaClient();

// Vaste "invoerdatum" voor laatst_gecontroleerd_op — zie aannames hierboven.
const INGEVOERD_OP = new Date("2026-08-24T00:00:00.000Z");

function j(value: unknown): string {
  return JSON.stringify(value);
}

async function main() {
  // -------------------------------------------------------------------
  // AAND-001 — BPPV (referentiedocument §2)
  // -------------------------------------------------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "AAND-001",
      naam: "BPPV (benigne paroxysmale positieduizeligheid)",
      typeObject: TypeObject.aandoening,
      behandelverantwoordelijkheid: Behandelverantwoordelijkheid.zelfstandig_fysio,
      behandeldiepte: Behandeldiepte.volledig,
      tier: 1,
      uitkomsttype: Uitkomsttype.enkelvoudig,
      kernbeschrijving:
        "Otoconia-verplaatsing (canalolithiasis) of -aanhechting aan de cupula " +
        "(cupulolithiasis) in één van de booggangen (posterior, horizontaal of " +
        "anterior).",
      klinischeKenmerken:
        "Kortdurende (seconden – <1 min), heftige rotatoire vertigo. Uitgelokt " +
        "door specifieke bewegingen (omdraaien in bed, hoofd achterover, " +
        "bukken). Geen gehoorverlies, geen klachten tussen episodes door. Vaak " +
        "recidiverend (recidiefkans ~15-50%, studieafhankelijk — zie " +
        "prognostische context bij de interventies).",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // -------------------------------------------------------------------
  // TEST-001 — Dix-Hallpike (referentiedocument §3)
  // -------------------------------------------------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "TEST-001",
      naam: "Dix-Hallpike",
      typeObject: TypeObject.onderzoekstest,
      kernbeschrijving:
        "Gekoppeld aan subtype posterior (primair) en anterior (secundair, " +
        "diagnostisch minder betrouwbaar). Gouden standaard voor posterior " +
        "BPPV.",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // TEST-002 — Supine Roll Test (Pagnini-McClure)
  await prisma.knowledgeObject.create({
    data: {
      id: "TEST-002",
      naam: "Supine Roll Test (Pagnini-McClure)",
      typeObject: TypeObject.onderzoekstest,
      kernbeschrijving:
        "Gekoppeld aan subtype horizontaal. Iets minder robuuste evidence dan " +
        "Dix-Hallpike, nog altijd systematic-review-niveau.",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // -------------------------------------------------------------------
  // INT-001 t/m INT-004 — Interventies (referentiedocument §4)
  // -------------------------------------------------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-001",
      naam: "Epley-manoeuvre",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Repositiemanoeuvre voor posterior-kanaal canalolithiasis. Sterkste " +
        "evidence van de vier BPPV-interventies (systematic review/meta-" +
        "analyse).",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  await prisma.knowledgeObject.create({
    data: {
      id: "INT-002",
      naam: "Semont-manoeuvre",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Repositiemanoeuvre voor posterior-kanaal, alternatief voor Epley. " +
        "Dynamischer van aard, daardoor minder geschikt bij kwetsbare/oudere " +
        "patiënten.",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  await prisma.knowledgeObject.create({
    data: {
      id: "INT-003",
      naam: "Barbecue-roll",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Repositiemanoeuvre voor horizontaal-kanaal canalolithiasis. " +
        "Systematic-review-niveau, kleinere evidencebasis dan Epley.",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  await prisma.knowledgeObject.create({
    data: {
      id: "INT-004",
      naam: "Gufoni-manoeuvre",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Repositiemanoeuvre voor horizontaal-kanaal cupulolithiasis. Zwakkere " +
        "evidence, deels expert-consensus.",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // -------------------------------------------------------------------
  // CI-001 t/m CI-005 — Contra-indicaties (referentiedocument §4-tabel)
  // evidence_niveau: niet expliciet vermeld in het brondocument voor deze
  // items afzonderlijk — hier op expert_opinion gezet (algemene klinische
  // veiligheidskennis, geen specifiek onderzoek/richtlijn genoemd).
  // -------------------------------------------------------------------
  const contraIndicaties = [
    {
      id: "CI-001",
      naam: "Cervicale instabiliteit",
      kernbeschrijving:
        "Contra-indicatie voor repositiemanoeuvres met snelle/uitgesproken " +
        "hoofd-halsbewegingen.",
    },
    {
      id: "CI-002",
      naam: "Ernstige rugklachten",
      kernbeschrijving:
        "Contra-indicatie voor repositiemanoeuvres die de rug belasten.",
    },
    {
      id: "CI-003",
      naam: "Cardiovasculair risico bij snelle positiewisseling",
      kernbeschrijving:
        "Contra-indicatie/aandachtspunt bij manoeuvres met snelle " +
        "houdingsveranderingen.",
    },
    {
      id: "CI-004",
      naam: "Zwangerschap",
      kernbeschrijving:
        "Geen absolute contra-indicatie, wel reden om de manoeuvre aan te " +
        "passen.",
    },
    {
      id: "CI-005",
      naam: "Kwetsbare/oudere patiënt (bij dynamische manoeuvres)",
      kernbeschrijving:
        "De Semont-manoeuvre is dynamischer van aard, en daardoor minder " +
        "geschikt bij kwetsbare/oudere patiënten.",
    },
  ];
  for (const ci of contraIndicaties) {
    await prisma.knowledgeObject.create({
      data: {
        id: ci.id,
        naam: ci.naam,
        typeObject: TypeObject.contra_indicatie,
        kernbeschrijving: ci.kernbeschrijving,
        evidenceNiveau: EvidenceNiveau.expert_opinion,
        status: ObjectStatus.gepubliceerd,
        laatstGecontroleerdOp: INGEVOERD_OP,
        zichtbaarTherapeut: true,
        zichtbaarPatient: false,
      },
    });
  }

  // -------------------------------------------------------------------
  // RF-001 t/m RF-006 — Red flags (referentiedocument §5)
  // evidence_niveau: niet expliciet per red flag vermeld — hier op richtlijn
  // gezet, consistent met het richtlijn-niveau van BPPV zelf en omdat
  // differentiaaldiagnostische alarmsymptomen bij duizeligheid doorgaans
  // richtlijn-gebaseerd zijn (bijv. NHG-Standaard Duizeligheid).
  // -------------------------------------------------------------------
  const redFlags = [
    {
      id: "RF-001",
      naam: "Focale neurologische uitval / nieuwe ernstige hoofdpijn",
      kenmerken:
        "Dubbelzien, dysartrie, ataxie, eenzijdige uitval, nieuwe ernstige " +
        "hoofdpijn",
      interpretatie: "CVA/TIA vertebrobasilair",
      actietype: ActieType.acuut_verwijzen,
    },
    {
      id: "RF-003",
      naam: "Acuut eenzijdig gehoorverlies bij duizeligheid",
      kenmerken: "Acuut eenzijdig gehoorverlies + duizeligheid",
      interpretatie: "Labyrintitis/vasculair/acusticusneurinoom (spoed afhankelijk van beloop)",
      actietype: ActieType.acuut_verwijzen,
    },
    {
      id: "RF-004",
      naam: "Orthostatisch/cardiaal beeld",
      kenmerken:
        "Sterke bloeddrukdaling bij houdingsverandering, syncope, " +
        "palpitaties, pijn op de borst",
      interpretatie: "Orthostatisch/cardiaal",
      actietype: ActieType.acuut_verwijzen,
    },
    {
      id: "RF-005",
      naam: "Nieuwe/progressieve/ongebruikelijke hoofdpijn",
      kenmerken: "Nieuwe/progressieve/ongebruikelijke hoofdpijn",
      interpretatie: "Mogelijke intracraniële pathologie",
      actietype: ActieType.acuut_verwijzen,
    },
    {
      id: "RF-006",
      naam: "Geen houdings-/bewegingsuitlokking bij aanvalsgewijze duizeligheid",
      kenmerken:
        "Geen enkele houdings-/bewegingsuitlokking bij \"aanvalsgewijze\" " +
        "duizeligheid",
      interpretatie: "Past niet bij BPPV",
      actietype: ActieType.hypothese_heroverwegen,
    },
  ];
  // RF-002 apart (zie relaties hieronder — wordt vanuit TEST-001 getriggerd,
  // niet vanuit AAND-001 zoals de overige red flags).
  await prisma.knowledgeObject.create({
    data: {
      id: "RF-002",
      naam: "Centraal nystagmuspatroon (geen posterior-kenmerken)",
      typeObject: TypeObject.red_flag,
      kernbeschrijving:
        "Downbeat/zuiver torsioneel zonder latentie/habituatie, gaze-evoked " +
        "multidirectioneel → centrale origine.",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  for (const rf of redFlags) {
    await prisma.knowledgeObject.create({
      data: {
        id: rf.id,
        naam: rf.naam,
        typeObject: TypeObject.red_flag,
        kernbeschrijving: `${rf.kenmerken} → ${rf.interpretatie}.`,
        evidenceNiveau: EvidenceNiveau.richtlijn,
        status: ObjectStatus.gepubliceerd,
        laatstGecontroleerdOp: INGEVOERD_OP,
        zichtbaarTherapeut: true,
        zichtbaarPatient: true,
      },
    });
  }

  // -------------------------------------------------------------------
  // EDU-001 — Patiënteducatie (referentiedocument §7)
  // Let op: het brondocument geeft de inhoudsopgave/eisen voor deze educatie
  // (wat wel/niet erin hoort), geen kant-en-klare patiëntentekst. Om geen
  // klinische patiëntcontent te verzinnen die niet in de kennisbank staat
  // (zie AI-interactiemodel-principe, referentiedocument §12), is hier de
  // structurele inhoudsbeschrijving vastgelegd, geen afgeronde marketing-/
  // voorlichtingscopy. status = concept om dat zichtbaar te houden.
  // -------------------------------------------------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "EDU-001",
      naam: "Patiënteducatie BPPV",
      typeObject: TypeObject.patienteducatie_item,
      kernbeschrijving:
        "Patiëntgerichte uitleg over BPPV: wat het is, geruststelling dat het " +
        "goedaardig en goed behandelbaar is, wat er gebeurt tijdens de " +
        "manoeuvre, zelfmanagement bij recidief, en alarmsignalen in " +
        "lekentaal. Bevat bewust geen subtype/variant-detail, " +
        "testinterpretatie, volledige differentiaaldiagnose-lijst of " +
        "contra-indicaties in klinische taal.",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.concept,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.patientEducatieObject.create({
    data: {
      id: "EDU-001-PEO",
      knowledgeObjectId: "EDU-001",
      verwachtingsmanagement:
        "BPPV is goed behandelbaar: vaak volstaan 1-3 behandelingen met een " +
        "repositiemanoeuvre. Recidief komt regelmatig voor (~15-50%, " +
        "studieafhankelijk) en is op zichzelf geen reden tot ongerustheid.",
      samengesteld: false,
      bronObjectIds: j(["AAND-001"]),
      signaleringObjectIds: j(["RF-001", "RF-002", "RF-003", "RF-005"]),
    },
  });

  // -------------------------------------------------------------------
  // PEARL-001 — Clinical pearl (referentiedocument §17)
  // -------------------------------------------------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "PEARL-001",
      naam: "Nystagmus leidend bij subjectief-objectief-discrepantie",
      typeObject: TypeObject.clinical_pearl,
      kernbeschrijving:
        "Bij discrepantie tussen subjectieve vertigo en objectieve nystagmus " +
        "is nystagmus leidend. Een patiënt kan tijdens Dix-Hallpike/supine " +
        "roll test herkenbare draaiduizeligheid rapporteren zonder " +
        "waarneembare nystagmus — in dat geval weegt de objectieve bevinding " +
        "(afwezigheid nystagmus) zwaarder dan het subjectieve symptoom voor " +
        "de diagnostische interpretatie.",
      evidenceNiveau: EvidenceNiveau.eigen_klinische_expertise,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: false,
    },
  });

  // -------------------------------------------------------------------
  // Differentiaaldiagnose-stubs (referentiedocument §6, relatietype §18)
  // -------------------------------------------------------------------
  await prisma.knowledgeObject.create({
    data: {
      // Reserveert bewust de id die het referentiedocument (§14) al voor de
      // toekomstige volledige uitwerking van dit item gebruikt.
      id: "AAND-002",
      naam: "Vestibulaire hypofunctie/neuritis (stub)",
      typeObject: TypeObject.aandoening,
      behandelverantwoordelijkheid: Behandelverantwoordelijkheid.zelfstandig_fysio,
      behandeldiepte: Behandeldiepte.volledig,
      tier: 1,
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. BPPV: continue duizeligheid, niet " +
        "houdingsgebonden aanvallen. Volledige uitwerking volgt in een " +
        "latere bouwfase (referentiedocument §14, roadmap §25 punt 3).",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.concept,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  await prisma.knowledgeObject.create({
    data: {
      // Reserveert bewust de id die het referentiedocument (§15) al voor de
      // toekomstige volledige uitwerking van dit item gebruikt.
      id: "AAND-003",
      naam: "PPPD (stub)",
      typeObject: TypeObject.aandoening,
      behandelverantwoordelijkheid: Behandelverantwoordelijkheid.zelfstandig_fysio,
      behandeldiepte: Behandeldiepte.volledig,
      tier: 1,
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. BPPV: chronisch, visueel/proprioceptief " +
        "uitgelokt, geen korte draaiaanvallen. Volledige uitwerking volgt in " +
        "een latere bouwfase (referentiedocument §15, roadmap §25 punt 3).",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.concept,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  await prisma.knowledgeObject.create({
    data: {
      id: "STUB-VEST-MIGRAINE",
      naam: "Vestibulaire migraine (stub)",
      typeObject: TypeObject.aandoening,
      behandelverantwoordelijkheid: Behandelverantwoordelijkheid.gedeeld_multidisciplinair,
      behandeldiepte: Behandeldiepte.beperkt,
      tier: 2,
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. BPPV: langere episodes, migraine-" +
        "anamnese. Niet één van de vier volledig uitgewerkte items; " +
        "behandelverantwoordelijkheid/-diepte zijn hier een voorzichtige " +
        "placeholder, niet uit het brondocument overgenomen.",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.concept,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  const tier3Stubs = [
    {
      id: "STUB-MENIERE",
      naam: "Menière (stub)",
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. BPPV: fluctuerend gehoorverlies, " +
        "tinnitus, oorvol gevoel, minuten-uren.",
    },
    {
      id: "STUB-CVA-TIA",
      naam: "CVA/TIA vertebrobasilair (stub)",
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. BPPV: acuut, andere neurologische " +
        "symptomen.",
    },
    {
      id: "STUB-ORTHOSTASE",
      naam: "Orthostatische hypotensie (stub)",
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. BPPV: uitgelokt door opstaan, " +
        "meetbare bloeddrukdaling. Ook relevant binnen het toekomstige " +
        "multifactoriële-duizeligheid-met-valrisico-item.",
    },
  ];
  for (const s of tier3Stubs) {
    await prisma.knowledgeObject.create({
      data: {
        id: s.id,
        naam: s.naam,
        typeObject: TypeObject.aandoening,
        behandelverantwoordelijkheid: Behandelverantwoordelijkheid.niet_fysio_verwijzen,
        behandeldiepte: Behandeldiepte.geen,
        tier: 3,
        kernbeschrijving: s.kernbeschrijving,
        evidenceNiveau: EvidenceNiveau.consensus,
        status: ObjectStatus.concept,
        laatstGecontroleerdOp: INGEVOERD_OP,
        zichtbaarTherapeut: true,
        zichtbaarPatient: false, // Tier 3 → altijd false (requirements §1.1)
      },
    });
  }

  // =====================================================================
  // RELATIES
  // =====================================================================
  let relatieCounter = 1;
  function nextRelatieId(): string {
    return `REL-${String(relatieCounter++).padStart(3, "0")}`;
  }

  // --- TEST-001 (Dix-Hallpike) → AAND-001 / RF-002 --------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-001",
      naarObjectId: "AAND-001",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ subtype: "posterior" }),
      bevinding: "Upbeat + torsioneel, geotroop, latentie 1-5s, habitueert",
      interpretatie: "Posterior canalolithiasis, aangedane zijde = onderste oor",
      diagnostischeWaarde: DiagnostischeWaarde.hoog,
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-001",
      naarObjectId: "AAND-001",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ subtype: "anterior" }),
      bevinding: "Downbeat + torsioneel, vergelijkbaar patroon",
      interpretatie: "Verdacht anterior kanaal — lage specificiteit",
      diagnostischeWaarde: DiagnostischeWaarde.laag,
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-001",
      naarObjectId: "RF-002",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Downbeat zonder torsie, geen latentie/habituatie",
      interpretatie: "Verdacht centraal — zie RF-002",
      actietype: ActieType.acuut_verwijzen,
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-001",
      naarObjectId: "AAND-001",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ resultaat: "negatief" }),
      bevinding: "Geen nystagmus",
      interpretatie: "Negatief (fout-negatief mogelijk bij eenmalige test)",
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });

  // --- TEST-002 (Supine Roll Test) → AAND-001 -------------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-002",
      naarObjectId: "AAND-001",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ subtype: "horizontaal", variant: "canalolithiasis" }),
      bevinding: "Horizontale geotrope nystagmus, sterker één zijde",
      interpretatie: "Canalolithiasis horizontaal, sterkste kant = aangedane zijde",
      diagnostischeWaarde: DiagnostischeWaarde.matig,
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-002",
      naarObjectId: "AAND-001",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({
        subtype: "horizontaal",
        variant: "cupulolithiasis",
        notitie: "zijdigheid minder eenduidig in literatuur",
      }),
      bevinding: "Horizontale apogeotrope nystagmus, sterker één zijde",
      interpretatie: "Cupulolithiasis horizontaal — zijdigheid minder eenduidig in literatuur",
      diagnostischeWaarde: DiagnostischeWaarde.matig,
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-002",
      naarObjectId: "AAND-001",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ resultaat: "negatief" }),
      bevinding: "Geen nystagmus",
      interpretatie: "Negatief",
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });

  // --- AAND-001 → INT-xxx (interventie-indicatie) ----------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-001",
      naarObjectId: "INT-001",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ subtype: "posterior", variant: "canalolithiasis" }),
      bevinding: "Bevestigde posterior-kanaal canalolithiasis",
      interpretatie: "Epley-manoeuvre geïndiceerd",
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-001",
      naarObjectId: "INT-002",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ subtype: "posterior" }),
      bevinding: "Bevestigde posterior-kanaal BPPV",
      interpretatie: "Semont-manoeuvre geïndiceerd (alternatief voor Epley)",
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-001",
      naarObjectId: "INT-003",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ subtype: "horizontaal", variant: "canalolithiasis" }),
      bevinding: "Bevestigde horizontaal-kanaal canalolithiasis",
      interpretatie: "Barbecue-roll geïndiceerd",
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-001",
      naarObjectId: "INT-004",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ subtype: "horizontaal", variant: "cupulolithiasis" }),
      bevinding: "Bevestigde horizontaal-kanaal cupulolithiasis",
      interpretatie: "Gufoni-manoeuvre geïndiceerd",
      evidenceNiveau: EvidenceNiveau.consensus,
    },
  });

  // --- CI-xxx → INT-xxx (contra-indicatie-koppeling) --------------------
  // CI-001 t/m CI-004: expliciet bij Epley (INT-001); Barbecue-roll (INT-003)
  // is expliciet "vergelijkbaar met Epley" en krijgt dezelfde vier.
  for (const ciId of ["CI-001", "CI-002", "CI-003", "CI-004"]) {
    for (const intId of ["INT-001", "INT-003"]) {
      await prisma.relatie.create({
        data: {
          id: nextRelatieId(),
          vanObjectId: ciId,
          naarObjectId: intId,
          relatieType: RelatieType.bevinding_interpretatie,
          bevinding: `Patiënt heeft ${ciId}`,
          interpretatie:
            ciId === "CI-004"
              ? "Manoeuvre aanpassen (geen absolute contra-indicatie)"
              : "Manoeuvre niet toepassen",
        },
      });
    }
  }
  // CI-005: alleen bij Semont (INT-002)
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "CI-005",
      naarObjectId: "INT-002",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Kwetsbare/oudere patiënt",
      interpretatie: "Terughoudend zijn met Semont-manoeuvre (dynamischer karakter)",
    },
  });

  // --- AAND-001 → RF-xxx (red flags, exclusief RF-002) ------------------
  for (const rf of redFlags) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: "AAND-001",
        naarObjectId: rf.id,
        relatieType: RelatieType.bevinding_interpretatie,
        bevinding: rf.kenmerken,
        interpretatie: rf.interpretatie,
        actietype: rf.actietype,
        evidenceNiveau: EvidenceNiveau.richtlijn,
      },
    });
  }

  // --- PEARL-001 → TEST-001 / TEST-002 -----------------------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "PEARL-001",
      naarObjectId: "TEST-001",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding:
        "Patiënt rapporteert herkenbare draaiduizeligheid tijdens Dix-Hallpike " +
        "zonder waarneembare nystagmus",
      interpretatie:
        "Afwezigheid nystagmus weegt zwaarder dan het subjectieve symptoom " +
        "voor de diagnostische interpretatie",
      evidenceNiveau: EvidenceNiveau.eigen_klinische_expertise,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "PEARL-001",
      naarObjectId: "TEST-002",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding:
        "Patiënt rapporteert herkenbare draaiduizeligheid tijdens supine roll " +
        "test zonder waarneembare nystagmus",
      interpretatie:
        "Afwezigheid nystagmus weegt zwaarder dan het subjectieve symptoom " +
        "voor de diagnostische interpretatie",
      evidenceNiveau: EvidenceNiveau.eigen_klinische_expertise,
    },
  });

  // --- AAND-001 → differentiaaldiagnose-stubs ----------------------------
  const differentialen: Array<{
    naar: string;
    kenmerk: string;
    type: RelatietypeDifferentiaal;
  }> = [
    {
      naar: "AAND-002",
      kenmerk: "Continue duizeligheid, niet houdingsgebonden aanvallen",
      type: RelatietypeDifferentiaal.uitsluitend,
    },
    {
      naar: "STUB-MENIERE",
      kenmerk: "Fluctuerend gehoorverlies, tinnitus, oorvol gevoel, minuten-uren",
      type: RelatietypeDifferentiaal.uitsluitend,
    },
    {
      naar: "STUB-VEST-MIGRAINE",
      kenmerk: "Langere episodes, migraine-anamnese",
      type: RelatietypeDifferentiaal.comorbide,
    },
    {
      naar: "AAND-003",
      kenmerk: "Chronisch, visueel/proprioceptief uitgelokt, geen korte draaiaanvallen",
      type: RelatietypeDifferentiaal.uitsluitend,
    },
    {
      naar: "STUB-CVA-TIA",
      kenmerk: "Acuut, andere neurologische symptomen",
      type: RelatietypeDifferentiaal.uitsluitend,
    },
    {
      naar: "STUB-ORTHOSTASE",
      kenmerk: "Uitgelokt door opstaan, meetbare bloeddrukdaling",
      type: RelatietypeDifferentiaal.comorbide,
    },
  ];
  for (const d of differentialen) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: "AAND-001",
        naarObjectId: d.naar,
        relatieType: RelatieType.differentiaal,
        bevinding: d.kenmerk,
        relatietypeDifferentiaal: d.type,
      },
    });
  }

  const totalObjects = await prisma.knowledgeObject.count();
  const totalRelaties = await prisma.relatie.count();
  const totalEdu = await prisma.patientEducatieObject.count();
  console.log(
    `Seed voltooid: ${totalObjects} knowledge_objects, ${totalRelaties} relaties, ${totalEdu} patient_educatie_objecten.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
