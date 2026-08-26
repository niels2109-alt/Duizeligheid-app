/**
 * Seed-script — vult de database met de volledige BPPV-content uit
 * Duizeligheid-Referentiemodel.md §2-6, conform Duizeligheid-Technische-
 * Requirements-MVP.md §6.2 stap 1. Uitgebreid (requirements §7, §7.4 stap 1)
 * met het volledige tweede item — vestibulaire hypofunctie — uit
 * referentiedocument §14, en (requirements §8, §8.5 stap 2) met het
 * volledige derde item — PPPD — uit referentiedocument §15.
 *
 * Objecten: AAND-001 (BPPV), TEST-001/002, INT-001 t/m 004, RF-001 t/m 006,
 * EDU-001, PEARL-001, plus CI-001 t/m 005 (contra-indicaties) en zes
 * differentiaaldiagnose-stubs — AAND-002 (Vestibulaire hypofunctie),
 * TEST-003/004, INT-005 t/m 007, CI-006, RF-007 t/m 009, EDU-002, plus
 * twee nieuwe gedeelde Tier 3-stubs (labyrintitis, acusticusneurinoom) en
 * een gereserveerde AAND-004-stub (multifactoriële duizeligheid met
 * valrisico, §19 — expliciet nog niet uitgewerkt, zie requirements §7.2) —
 * AAND-003 (PPPD), ANAM-001 (de voorwaarde-conditie, eerste echte gebruik
 * van typeObject=anamnese_item en relatieType=voorwaarde), TEST-005/006,
 * INT-008 t/m 010, RF-010 t/m 012 (eerste echte gebruik van actietype =
 * samenwerking_adviseren), EDU-003, plus twee nieuwe Tier 3-stubs
 * (angststoornis, depressie).
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
  PatroonType,
  BijdrageGewicht,
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

  // =====================================================================
  // AAND-002 — Vestibulaire hypofunctie, volledig item
  // (referentiedocument §14, requirements §7 — aanvulling tweede item)
  // =====================================================================
  await prisma.knowledgeObject.create({
    data: {
      id: "AAND-002",
      naam: "Vestibulaire hypofunctie",
      typeObject: TypeObject.aandoening,
      behandelverantwoordelijkheid: Behandelverantwoordelijkheid.zelfstandig_fysio,
      behandeldiepte: Behandeldiepte.volledig,
      tier: 1,
      // §7.2: enkelvoudig, net als BPPV — geen samengesteld-uitkomst-logica
      // nodig voor dit item (dat volgt pas bij het vierde item, AAND-004).
      uitkomsttype: Uitkomsttype.enkelvoudig,
      kernbeschrijving:
        "Verminderde/uitgevallen functie van het vestibulair orgaan/nervus " +
        "vestibularis, uni- of bilateraal. Meest voorkomende oorzaak: " +
        "neuritis vestibularis; ook chirurgie, ototoxiciteit, onbekend.",
      klinischeKenmerken:
        "Continue duizeligheid/onbalans (niet aanvalsgewijs, niet " +
        "houdingsafhankelijk — belangrijkste onderscheid met BPPV). " +
        "Unilateraal: acuut vaak hevige rotatoire vertigo + " +
        "misselijkheid/braken, later vaag onbalansgevoel. Bilateraal: geen " +
        "vertigo-aanval, wel chronische onbalans + oscillopsie.",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- TEST-003/004 (referentiedocument §14) --------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "TEST-003",
      naam: "Head Impulse Test (HIT)",
      typeObject: TypeObject.onderzoekstest,
      kernbeschrijving:
        "Kern voor lateraliteitsbepaling bij vestibulaire hypofunctie. " +
        "LET OP — omgekeerde logica t.o.v. BPPV (requirements §7.1/7.5): bij " +
        "acute heftige vertigo is een normale testuitslag hier juist het " +
        "alarmerende signaal (verdacht centraal), niet een afwijkende. Zie " +
        "de relatie naar RF-007 voor de exacte, expliciet vastgelegde " +
        "interpretatie — nooit een generieke \"afwijkend = alarm\"-aanname.",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "TEST-004",
      naam: "Dynamic Visual Acuity Test (DVA)",
      typeObject: TypeObject.onderzoekstest,
      kernbeschrijving:
        "Met name relevant bij bilaterale hypofunctie en " +
        "oscillopsie-klachten; ook gebruikt als hermeting om " +
        "interventie-effectiviteit van adaptatie/gaze-stability-training " +
        "(INT-006) te evalueren (§7.3-follow-up-lus 'interventie-" +
        "effectiviteit').",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- INT-005 t/m 007 (referentiedocument §14) ------------------------
  // Evidence-niveau: per interventie niet los vermeld in het brondocument
  // (alleen op AAND-002-niveau: "richtlijn, vestibulaire revalidatie sterk
  // onderbouwd") — hier daarom richtlijn voor alle drie aangehouden, i.p.v.
  // een niet-onderbouwd onderscheid tussen de drie te verzinnen.
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-005",
      naam: "Habituatie",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Gewenningsoefeningen bij chronische, met name unilaterale " +
        "vestibulaire hypofunctie. Niet starten in de acute fase met sterke " +
        "autonome symptomen (zie contra-indicatie CI-006).",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-006",
      naam: "Adaptatie/gaze stability",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Oefeningen gericht op vestibulo-oculaire aanpassing, bij zowel " +
        "uni- als bilaterale hypofunctie — essentieel bij bilaterale " +
        "hypofunctie. Lichte opbouw kan al starten richting het einde van " +
        "de acute fase, dus eerder dan Habituatie/Substitutie.",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-007",
      naam: "Substitutie",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Compensatiestrategieën, met name bij chronische bilaterale " +
        "hypofunctie waar geen gezonde kant beschikbaar is om op te " +
        "compenseren. Inhoudelijk raakvlak met het toekomstige " +
        "multifactoriële-duizeligheid-met-valrisico-item (AAND-004).",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- CI-006 (referentiedocument §14, alleen bij INT-005) -------------
  await prisma.knowledgeObject.create({
    data: {
      id: "CI-006",
      naam: "Acute fase met sterke autonome symptomen",
      typeObject: TypeObject.contra_indicatie,
      kernbeschrijving:
        "Contra-indicatie voor het starten van habituatie-oefeningen bij " +
        "vestibulaire hypofunctie in de acute fase met sterke autonome " +
        "symptomen (misselijkheid/braken).",
      evidenceNiveau: EvidenceNiveau.expert_opinion,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: false,
    },
  });

  // --- RF-007 t/m 009 (referentiedocument §14) --------------------------
  // RF-007: TEST-003's omgekeerde-logica-red-flag — bewust GEEN generieke
  // AAND-002 → RF-007-anamneserelatie (net als RF-002 bij BPPV): dit signaal
  // hoort uitsluitend bij de TEST-003-relatie hieronder, niet los ervan.
  await prisma.knowledgeObject.create({
    data: {
      id: "RF-007",
      naam: "Normale HIT bij acute heftige vertigo",
      typeObject: TypeObject.red_flag,
      kernbeschrijving:
        "Normale HIT bij acute heftige vertigo → Verdacht centraal (bijv. " +
        "cerebellair infarct).",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  const vestibulaireRedFlags = [
    {
      id: "RF-008",
      naam: "Geen verwachte fase-voortgang, verslechtering of nieuwe neurologische symptomen",
      kenmerken: "Geen verwachte fase-voortgang, verslechtering, nieuwe neurologische symptomen",
      interpretatie: "Wijkt af van verwacht beloop",
      actietype: ActieType.hypothese_heroverwegen,
    },
    {
      id: "RF-009",
      naam: "Asymmetrisch gehoorverlies/tinnitus bij het beeld",
      kenmerken: "Asymmetrisch gehoorverlies/tinnitus bij het beeld",
      // Brondocument geeft hier "Hypothese-heroverwegen / kan escaleren" —
      // het datamodel kent geen los "kan escaleren"-niveau naast de drie
      // vaste actietypes; hier op het letterlijk eerstgenoemde
      // hypothese_heroverwegen gezet en dit verschil expliciet benoemd
      // i.p.v. stilzwijgend een van de twee te kiezen.
      interpretatie:
        "Neuritis vestibularis geeft normaliter geen gehoorverlies — kan " +
        "wijzen op labyrintitis of een andere oorzaak (kan escaleren, zie " +
        "toelichting bij dit object)",
      actietype: ActieType.hypothese_heroverwegen,
    },
  ];
  for (const rf of vestibulaireRedFlags) {
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

  // --- EDU-002 (referentiedocument §14) ---------------------------------
  // Zelfde aanpak als EDU-001: structurele inhoudsbeschrijving vastgelegd
  // i.p.v. afgeronde marketing-/voorlichtingscopy (§12-principe, geen
  // klinische patiëntcontent verzinnen die niet in de kennisbank staat).
  // Alleen RF-007 (acuut_verwijzen) in signaleringObjectIds — RF-008/009
  // zijn hypothese_heroverwegen-signalen voor de therapeut, geen
  // patiëntgerichte alarmsignalen, analoog aan hoe RF-006 buiten EDU-001
  // is gehouden. (RF-004 buiten EDU-001 laten was een eerdere, niet aan mij
  // toegelichte keuze uit stap 1 — hier dus niet als precedent gebruikt.)
  await prisma.knowledgeObject.create({
    data: {
      id: "EDU-002",
      naam: "Patiënteducatie vestibulaire hypofunctie",
      typeObject: TypeObject.patienteducatie_item,
      kernbeschrijving:
        "Patiëntgerichte uitleg over vestibulaire hypofunctie: wat het is, " +
        "geruststelling over het herstelvermogen van het evenwichtssysteem " +
        "(centrale compensatie), wat de revalidatie-oefeningen inhouden, " +
        "zelfmanagement, en alarmsignalen in lekentaal. Bevat bewust geen " +
        "fase/lateraliteit-detail, testinterpretatie of contra-indicaties " +
        "in klinische taal.",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.concept,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.patientEducatieObject.create({
    data: {
      id: "EDU-002-PEO",
      knowledgeObjectId: "EDU-002",
      verwachtingsmanagement:
        "Vestibulaire hypofunctie vraagt om een langduriger traject dan " +
        "BPPV: revalidatie-oefeningen (adaptatie/gaze-stability, eventueel " +
        "habituatie of substitutie) kunnen weken tot maanden duren. Een " +
        "tijdelijke verergering van de klachten tijdens de oefeningen is " +
        "normaal en geen reden om te stoppen.",
      samengesteld: false,
      bronObjectIds: j(["AAND-002"]),
      signaleringObjectIds: j(["RF-007"]),
    },
  });

  // -------------------------------------------------------------------
  // Differentiaaldiagnose-stubs (referentiedocument §6, relatietype §18)
  // -------------------------------------------------------------------
  // =====================================================================
  // AAND-003 — PPPD, volledig item (referentiedocument §15, requirements §8)
  // =====================================================================
  await prisma.knowledgeObject.create({
    data: {
      id: "AAND-003",
      naam: "PPPD",
      typeObject: TypeObject.aandoening,
      // "zelfstandig fysio, met eventuele samenwerking" (§15) — het model
      // kent geen los "met eventuele samenwerking"-niveau naast de drie
      // vaste waarden; zelfstandig_fysio blijft het beste passend, want de
      // fysio blijft primair verantwoordelijk (i.t.t. niet_fysio_verwijzen)
      // en dit is geen structureel gedeeld traject vanaf dag 1 (i.t.t.
      // gedeeld_multidisciplinair). De samenwerkingscomponent wordt expliciet
      // gedragen door RF-010/011 (actietype = samenwerking_adviseren).
      behandelverantwoordelijkheid: Behandelverantwoordelijkheid.zelfstandig_fysio,
      // "volledig, met randvoorwaarde" (§15) — het model kent geen aparte
      // "met randvoorwaarde"-waarde; die randvoorwaarde wordt hier juist
      // als eigen, expliciete mechanisme geïmplementeerd via de
      // voorwaarde-relatie hieronder (§8.1), niet als bijschrift op dit veld.
      behandeldiepte: Behandeldiepte.volledig,
      tier: 1,
      // §19/§7.2-precedent: enkelvoudig, net als BPPV en vestibulaire
      // hypofunctie — geen samengesteld-uitkomst-logica nodig.
      uitkomsttype: Uitkomsttype.enkelvoudig,
      kernbeschrijving:
        "Functionele aanpassingsstoornis — geen structurele afwijking, " +
        "verhoogde alertheid op beweging/visuele prikkels na een " +
        "precipiterend event, in stand gehouden door " +
        "bewegingsangst/vermijding.",
      klinischeKenmerken:
        "Chronisch (≥3 maanden), niet-vertigineus (onvastheid/zwaarte i.p.v. " +
        "draaiduizeligheid), uitgelokt door rechtop staan/lopen/beweging/" +
        "complexe visuele prikkels, vaak vervolgdiagnose na ander (hersteld) " +
        "organisch event.",
      // Consensus (Bárány Society-criteria, 2017) — expliciet géén
      // richtlijn-niveau (§15), moet zichtbaar blijven, dus bewust niet
      // opgewaardeerd naar richtlijn.
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- ANAM-001: de voorwaarde-conditie zelf (requirements §8.1) ----------
  // Eerste echte gebruik van typeObject = anamnese_item. Representeert de
  // gate waaraan voldaan moet zijn vóórdat PPPD als hypothese getoond mag
  // worden — geen patiëntgerichte content, dus zichtbaarPatient = false.
  await prisma.knowledgeObject.create({
    data: {
      id: "ANAM-001",
      naam: "Differentiaaldiagnostisch traject afgerond + tijdscriterium (PPPD)",
      typeObject: TypeObject.anamnese_item,
      kernbeschrijving:
        "Voorwaarde voor de PPPD-hypothese (§8.1): (a) een " +
        "differentiaaldiagnostisch traject is afgerond — andere Tier 1/2/3-" +
        "hypothesen zijn overwogen/uitgesloten — én (b) het klachtenpatroon " +
        "houdt ≥3 maanden aan op de meeste dagen. Zolang hieraan niet is " +
        "voldaan, mag PPPD niet als hypothese getoond worden — een harde " +
        "gate, geen suggestie.",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: false,
    },
  });

  // --- TEST-005/006 (referentiedocument §15) -------------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "TEST-005",
      naam: "Bárány-criteria (checklist)",
      typeObject: TypeObject.onderzoekstest,
      kernbeschrijving:
        "Consensuscriteria (Bárány Society, 2017) voor PPPD — een checklist, " +
        "geen fysieke test. Diagnostische waarde is conditioneel: alleen " +
        "'hoog' zodra de voorwaarde (ANAM-001, §8.1) is vervuld — nooit als " +
        "vaste waarde (zie de relatie hieronder).",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "TEST-006",
      naam: "Niigata PPPD Questionnaire (NPQ)",
      typeObject: TypeObject.onderzoekstest,
      kernbeschrijving:
        "Ondersteunend/monitorend vragenlijst-instrument, geen diagnostisch " +
        "criterium op zichzelf. Met name gebruikt voor de trendmatige " +
        "follow-up (§8.4) — NPQ-score gevolgd over meerdere sessies binnen " +
        "een behandelepisode. Bewust niet gekoppeld aan een indicatie-" +
        "relatie voor de initiële testselectie (dat is TEST-005 se rol) — " +
        "zie requirements §15/§8.4.",
      evidenceNiveau: EvidenceNiveau.observationeel,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- INT-008 t/m 010 (referentiedocument §15) -----------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-008",
      naam: "Exposure-training",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Graduele blootstelling aan bewegings-/visuele prikkels die worden " +
        "vermeden, gekwalificeerd naar mate van vermijdingsgedrag.",
      evidenceNiveau: EvidenceNiveau.systematic_review,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-009",
      naam: "Visuele desensitisatie",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Gewenning aan complexe/bewegende visuele prikkels die klachten " +
        "uitlokken.",
      // Brondocument geeft "observationeel/consensus" — geen eenduidige
      // keuze; hier op het letterlijk eerstgenoemde niveau gezet, net als
      // bij RF-009's "kan escaleren"-nuance (stap 7).
      evidenceNiveau: EvidenceNiveau.observationeel,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-010",
      naam: "Psycho-educatie functioneel karakter",
      // Requirements §8.2: expliciet interventie, NIET patienteducatie_item
      // — actieve, therapeut-geleide inzet tijdens het consult (stap 5
      // behandelstrategie), te onderscheiden van EDU-003 (stap 6, zelfstandig
      // patiëntenmateriaal). Inhoudelijke overlap is bewust geen reden om
      // samen te voegen.
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Actieve, therapeut-geleide uitleg over het functionele (niet-" +
        "structurele) karakter van de klachten, ingezet tijdens het consult " +
        "— te onderscheiden van EDU-003 (zelfstandig patiëntenmateriaal): " +
        "zelfde onderwerp, ander gebruik (§8.2).",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- RF-010 t/m 012 (referentiedocument §15) ------------------------------
  // RF-010/011: eerste echte gebruik van actietype = samenwerking_adviseren
  // (§8.3) — niet-acuut, functioneel: fysio blijft betrokken maar niet
  // alleen. UI-eis: geen rode/alarmerende styling zoals bij acuut_verwijzen
  // — de bestaande urgent/critical-styling in Modus A/B is al strikt
  // beperkt tot actietype === "acuut_verwijzen", dus dit werkt hier
  // automatisch correct zonder extra code (geverifieerd bij stap 3/4).
  //
  // Brondocument geeft alleen kenmerken + actietype voor deze drie (geen
  // aparte interpretatietekst zoals bij RF-007/008/009) — interpretatie
  // hieronder is daarom een minimale, direct uit het actietype afgeleide
  // formulering, niets extra's verzonnen.
  const pppdRedFlags = [
    {
      id: "RF-010",
      naam: "Uitblijvend herstel ondanks correcte uitvoering",
      kenmerken: "Uitblijvend herstel ondanks correcte uitvoering",
      interpretatie:
        "Fysiotherapie alleen volstaat mogelijk niet — samenwerking met een andere discipline overwegen",
      actietype: ActieType.samenwerking_adviseren,
    },
    {
      id: "RF-011",
      naam: "Angststoornis/depressie op voorgrond i.p.v. instandhoudend",
      kenmerken: "Angststoornis/depressie op voorgrond i.p.v. instandhoudend",
      interpretatie:
        "Angststoornis/depressie kan op de voorgrond staan i.p.v. instandhoudende factor — samenwerking met een andere discipline overwegen",
      actietype: ActieType.samenwerking_adviseren,
    },
    {
      id: "RF-012",
      naam: "Voldoet niet meer aan Bárány-criteria bij nadere evaluatie",
      kenmerken: "Voldoet niet meer aan Bárány-criteria bij nadere evaluatie",
      interpretatie: "Voldoet niet meer aan de diagnostische criteria — heroverweeg de hypothese",
      actietype: ActieType.hypothese_heroverwegen,
    },
  ];
  for (const rf of pppdRedFlags) {
    await prisma.knowledgeObject.create({
      data: {
        id: rf.id,
        naam: rf.naam,
        typeObject: TypeObject.red_flag,
        kernbeschrijving: `${rf.kenmerken} → ${rf.interpretatie}.`,
        evidenceNiveau: EvidenceNiveau.consensus,
        status: ObjectStatus.gepubliceerd,
        laatstGecontroleerdOp: INGEVOERD_OP,
        zichtbaarTherapeut: true,
        zichtbaarPatient: true,
      },
    });
  }

  // --- EDU-003 (referentiedocument §15) -------------------------------------
  // Zelfde aanpak als EDU-001/002. Geen enkele PPPD-red-flag heeft
  // actietype = acuut_verwijzen (RF-010/011 = samenwerking_adviseren,
  // RF-012 = hypothese_heroverwegen), dus signaleringObjectIds blijft leeg
  // — consistent met het "alleen acuut_verwijzen wordt patiëntgericht
  // alarmsignaal"-patroon uit EDU-001/002, hier tot zijn logische
  // conclusie: geen signalering nodig omdat er simpelweg geen urgent
  // PPPD-signaal bestaat.
  await prisma.knowledgeObject.create({
    data: {
      id: "EDU-003",
      naam: "Patiënteducatie PPPD",
      typeObject: TypeObject.patienteducatie_item,
      kernbeschrijving:
        "Patiëntgerichte uitleg over PPPD: wat het is, geruststelling dat er " +
        "geen structurele afwijking is zonder dat dit als 'niet serieus " +
        "genomen' aanvoelt, de rationale achter counter-intuïtieve adviezen " +
        "(bewegen ondanks klachten), zelfmanagement, en wanneer contact op " +
        "te nemen. Bevat bewust geen testinterpretatie of contra-indicaties " +
        "in klinische taal.",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.concept,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.patientEducatieObject.create({
    data: {
      id: "EDU-003-PEO",
      knowledgeObjectId: "EDU-003",
      verwachtingsmanagement:
        "PPPD kan een langdurig traject zijn; herstel verloopt vaak " +
        "geleidelijk, niet in een rechte lijn. Terugval bij stress hoort " +
        "bij het beloop en is op zichzelf geen reden tot ongerustheid.",
      // Nieuw generiek element t.o.v. EDU-001/002 (§15): rationale-uitleg
      // bij counter-intuïtieve adviezen.
      rationaleUitlegCounterintuitief:
        "Bewegen en de vermeden situaties juist weer opzoeken helpt het " +
        "evenwichtssysteem te herstellen, ook al voelt dat tegenstrijdig " +
        "aan wanneer bewegen duizeligheid oproept.",
      samengesteld: false,
      bronObjectIds: j(["AAND-003"]),
      signaleringObjectIds: j([]),
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

  await prisma.knowledgeObject.create({
    data: {
      id: "AAND-004",
      naam: "Multifactoriële duizeligheid met valrisico",
      typeObject: TypeObject.aandoening,
      // Referentiedocument §16: "gedeeld-multidisciplinair, per factor
      // verschillend" — past hier zuiver op de bestaande enum-waarde
      // (in tegenstelling tot PPPD's "zelfstandig fysio, met eventuele
      // samenwerking"-nuance uit §8, die WEL een enum-fit-afweging vergde).
      behandelverantwoordelijkheid: Behandelverantwoordelijkheid.gedeeld_multidisciplinair,
      behandeldiepte: Behandeldiepte.volledig,
      // Referentiedocument §16: "Tier: 2" — expliciet lager dan de drie
      // eerdere Tier 1-items (BPPV/vestibulaire hypofunctie/PPPD). De stub
      // had hier voorlopig tier:1 staan; nu gecorrigeerd naar de werkelijke
      // brondocumentwaarde.
      tier: 2,
      // Requirements §10/referentiedocument §19: eerste item met
      // uitkomsttype = samengesteld — stuurt de nieuwe flow-tak (stap 2).
      uitkomsttype: Uitkomsttype.samengesteld,
      kernbeschrijving:
        "Optelsom van bijdragende factoren, geen dominante oorzaak — " +
        "meerdere prognostische factoren (elk met een eigen bijdrage-" +
        "gewicht) dragen gezamenlijk bij aan het duizeligheids-/" +
        "valrisicobeeld, geen van allen op zichzelf noodzakelijk of " +
        "voldoende (referentiedocument §16).",
      // §16: "richtlijn per behandelcomponent..., consensus voor het geheel
      // als syndroom" — net als bij PPPD's evidence-niveau-nuance wordt hier
      // het niveau voor het geheel-als-syndroom aangehouden; de individuele
      // interventies (INT-011/012) dragen zelf het sterkere richtlijn-niveau.
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- FACTOR-001 t/m 006 (referentiedocument §16) --------------------------
  // Acht bijdragende factoren totaal — zes als nieuw prognostische-factor-
  // object hieronder, twee via letterlijk hergebruik van een bestaand object
  // (RF-004 → orthostase, TEST-003 → milde vestibulaire achteruitgang, zie
  // de aggregatie-relaties verderop) — geen dubbele FACTOR-wrapper omheen,
  // om niets te dupliceren (expliciete controle-eis uit requirements §10.5).
  //
  // bijdrage_gewicht per factor: het brondocument geeft geen exacte
  // per-factor-waarde, alleen dat elke factor "met een eigen gewicht"
  // meeweegt. Hieronder een beargumenteerde, klinisch redelijke inschatting
  // (spierzwakte/propriocepsis/evenwicht gelden in de valrisico-literatuur
  // doorgaans als de sterkste modificeerbare voorspellers) — net als bij
  // eerdere niet-expliciet-gespecificeerde evidence-niveaus hier transparant
  // als aanname gemarkeerd, ter controle voorgelegd aan de opdrachtgever.
  const factoren = [
    {
      id: "FACTOR-001",
      naam: "Verminderde propriocepsis",
      kernbeschrijving:
        "Verminderd gevoel voor gewrichtsstand/-beweging in voeten/enkels, " +
        "draagt bij aan balansverlies en valrisico — vaak leeftijdsgebonden " +
        "of bij perifere neuropathie.",
    },
    {
      id: "FACTOR-002",
      naam: "Spierzwakte (onderste extremiteiten)",
      kernbeschrijving:
        "Verminderde kracht in been-/heupspieren, beperkt het vermogen om " +
        "een dreigende val te corrigeren.",
    },
    {
      id: "FACTOR-003",
      naam: "Visusproblemen",
      kernbeschrijving:
        "Verminderd gezichtsvermogen (bijv. cataract, verouderde bril) " +
        "vermindert visuele compensatie van evenwichtsverlies.",
    },
    {
      id: "FACTOR-004",
      naam: "Polyfarmacie",
      kernbeschrijving:
        "Meerdere gelijktijdig gebruikte medicijnen (met name sedativa, " +
        "bloeddrukverlagers, psychofarmaca) kunnen duizeligheid/valrisico " +
        "verhogen, los van de onderliggende duizeligheidsoorzaak.",
    },
    {
      id: "FACTOR-005",
      naam: "Cognitieve beperking",
      kernbeschrijving:
        "Verminderd vermogen om aandacht te verdelen tussen lopen en " +
        "andere taken (dual-tasking), verhoogt valrisico bij complexe " +
        "omgevingen.",
    },
    {
      id: "FACTOR-006",
      naam: "Valangst",
      kernbeschrijving:
        "Angst om te vallen leidt tot bewegingsvermijding, wat de " +
        "onderliggende factoren (spierzwakte, balans) juist verder " +
        "verslechtert — een zichzelf versterkend patroon, vergelijkbaar " +
        "met de bewegingsangst-dynamiek bij PPPD (referentiedocument §15).",
    },
  ];
  for (const f of factoren) {
    await prisma.knowledgeObject.create({
      data: {
        id: f.id,
        naam: f.naam,
        typeObject: TypeObject.prognostische_factor,
        kernbeschrijving: f.kernbeschrijving,
        evidenceNiveau: EvidenceNiveau.consensus,
        status: ObjectStatus.gepubliceerd,
        laatstGecontroleerdOp: INGEVOERD_OP,
        zichtbaarTherapeut: true,
        zichtbaarPatient: true,
      },
    });
  }

  // --- INT-011 t/m 013 (referentiedocument §16) ------------------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-011",
      naam: "Balanstraining",
      typeObject: TypeObject.interventie,
      kernbeschrijving:
        "Oefentherapie gericht op statisch/dynamisch evenwicht — " +
        "geïndiceerd bij verminderde propriocepsis.",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-012",
      naam: "Krachttraining",
      typeObject: TypeObject.interventie,
      // §16: "sterkst onderbouwd van alle interventies in dit document".
      kernbeschrijving:
        "Progressieve krachttraining van been-/heupspieren — sterkst " +
        "onderbouwde interventie in deze kennisbank, geïndiceerd bij " +
        "spierzwakte.",
      evidenceNiveau: EvidenceNiveau.richtlijn,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.knowledgeObject.create({
    data: {
      id: "INT-013",
      naam: "Graduele blootstelling bij valangst",
      typeObject: TypeObject.interventie,
      // §16: "inhoudelijk sterk vergelijkbaar met INT-008/PPPD — bewust
      // niet geconsolideerd, zie §18" — dus welbewust een apart object,
      // geen hergebruik van INT-008 ondanks de gelijkenis.
      kernbeschrijving:
        "Graduele blootstelling aan vermeden bewegingen/situaties bij " +
        "valangst — inhoudelijk sterk vergelijkbaar met INT-008 " +
        "(Exposure-training, PPPD), bewust niet met dat object " +
        "geconsolideerd tot één generiek object (referentiedocument §18: " +
        "onvoldoende precedent voor die generalisatie).",
      evidenceNiveau: EvidenceNiveau.observationeel,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- RF-013 (referentiedocument §16, follow-up-signaal) -------------------
  await prisma.knowledgeObject.create({
    data: {
      id: "RF-013",
      naam: "Afwijkend multifactorieel beloop",
      typeObject: TypeObject.red_flag,
      kernbeschrijving:
        "Patroon wijkt af van verwacht multifactorieel beloop (bijv. " +
        "snelle acute verslechtering i.p.v. geleidelijke verandering) → " +
        "heroverweeg de hypothese.",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.gepubliceerd,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });

  // --- EDU-004 (referentiedocument §16, requirements §10.4) -----------------
  // Eerste écht gebruikte gepersonaliseerd-samengestelde educatie
  // (samengesteld: true) — het mechanisme in src/ai.ts (GET
  // /api/ai/educatie/:id) stond hier al generiek op voorbereid. Vast deel in
  // kernbeschrijving/verwachtingsmanagement; variabel deel = per bevestigde
  // factor een eigen content-blok (zie signaleringObjectIds hieronder —
  // src/ai.ts filtert die op de daadwerkelijk bevestigde factoren, §10.4/§20).
  //
  // Bewuste keuze: TEST-003 (het hergebruikte object voor "milde vestibulaire
  // achteruitgang") staat NIET in signaleringObjectIds — de kernbeschrijving
  // van TEST-003 is klinisch/methodologisch geschreven (testuitvoering, "LET
  // OP — omgekeerde logica..."), niet patiëntgericht, en zou als variabel
  // content-blok verwarrend zijn. De overige zeven factor-bronnen (zes
  // FACTOR-objecten + RF-004) hebben wel patiëntgerichte tekst.
  await prisma.knowledgeObject.create({
    data: {
      id: "EDU-004",
      naam: "Patiënteducatie multifactoriële duizeligheid/valrisico",
      typeObject: TypeObject.patienteducatie_item,
      kernbeschrijving:
        "Patiëntgerichte uitleg over multifactoriële duizeligheid met " +
        "valrisico: erkenning dat er niet één simpele oorzaak is, " +
        "kernboodschap dat bewegen/kracht/balans het valrisico aantoonbaar " +
        "verkleint, en uitleg waarom meerdere zorgverleners betrokken " +
        "kunnen zijn (referentiedocument §16).",
      evidenceNiveau: EvidenceNiveau.consensus,
      status: ObjectStatus.concept,
      laatstGecontroleerdOp: INGEVOERD_OP,
      zichtbaarTherapeut: true,
      zichtbaarPatient: true,
    },
  });
  await prisma.patientEducatieObject.create({
    data: {
      id: "EDU-004-PEO",
      knowledgeObjectId: "EDU-004",
      verwachtingsmanagement:
        "Verbetering verloopt geleidelijk en per factor verschillend — " +
        "niet elke factor hoeft even snel te verbeteren, en niet elke " +
        "factor wordt door de fysiotherapeut zelf behandeld.",
      // Rationale-uitleg-element (uit PPPD, §15) hier hergebruikt bij
      // valangst — bevestigt de generieke status van dit element (§16).
      rationaleUitlegCounterintuitief:
        "Bewegen ondanks angst om te vallen voelt tegenstrijdig, maar juist " +
        "stilzitten uit angst verzwakt de spieren en het evenwicht verder " +
        "— wat het valrisico op termijn juist vergroot.",
      samengesteld: true,
      bronObjectIds: j(["AAND-004"]),
      signaleringObjectIds: j(["FACTOR-001", "FACTOR-002", "FACTOR-003", "FACTOR-004", "FACTOR-005", "FACTOR-006", "RF-004"]),
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
    // §14/§18 "gedeelde Tier 3-stub-bibliotheek": labyrintitis en
    // acusticusneurinoom worden hier voor het eerst als los object
    // aangemaakt (voorheen alleen genoemd binnen RF-003's interpretatietekst).
    {
      id: "STUB-LABYRINTITIS",
      naam: "Labyrintitis (stub)",
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. vestibulaire hypofunctie (neuritis " +
        "vestibularis): bijkomend gehoorverlies/tinnitus (zie RF-009) — " +
        "neuritis vestibularis geeft dat normaliter niet.",
    },
    {
      id: "STUB-ACUSTICUSNEURINOOM",
      naam: "Acusticusneurinoom (stub)",
      kernbeschrijving:
        "STUB — onderscheidend t.o.v. vestibulaire hypofunctie: " +
        "geleidelijker beloop, vaak met progressief eenzijdig " +
        "gehoorverlies (zie ook RF-003).",
    },
    // §15: PPPD's differentiaaldiagnose is overwegend comorbide — twee
    // nieuwe stubs voor de psychische differentialen die daar genoemd
    // worden, nog niet eerder in de kennisbank aanwezig.
    {
      id: "STUB-ANGSTSTOORNIS",
      naam: "Angststoornis (stub)",
      kernbeschrijving:
        "STUB — kan comorbide voorkomen bij PPPD (§15), of op de voorgrond " +
        "staan i.p.v. instandhoudende factor (zie RF-011).",
    },
    {
      id: "STUB-DEPRESSIE",
      naam: "Depressie (stub)",
      kernbeschrijving:
        "STUB — kan comorbide voorkomen bij PPPD (§15), of op de voorgrond " +
        "staan i.p.v. instandhoudende factor (zie RF-011).",
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

  // =====================================================================
  // RELATIES — AAND-002 (Vestibulaire hypofunctie), referentiedocument
  // §14, requirements §7
  // =====================================================================

  // --- TEST-003 (HIT) → AAND-002 (lateraliteitsbepaling) ------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-003",
      naarObjectId: "AAND-002",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ lateraliteit: "unilateraal" }),
      bevinding: "Afwijkende HIT (corrigerende saccade) eenzijdig",
      interpretatie: "Unilaterale vestibulaire hypofunctie, aangedane zijde = kant van de saccade",
      diagnostischeWaarde: DiagnostischeWaarde.hoog,
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-003",
      naarObjectId: "AAND-002",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ lateraliteit: "bilateraal" }),
      bevinding: "Afwijkende HIT (corrigerende saccade) beiderzijds",
      interpretatie: "Bilaterale vestibulaire hypofunctie",
      diagnostischeWaarde: DiagnostischeWaarde.hoog,
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  // --- TEST-003 → RF-007: DE OMGEKEERDE-LOGICA-RELATIE (§7.1/§7.5) --------
  // Bewust GEEN generieke "afwijkend = alarm"-code: deze relatie legt zelf,
  // rechtstreeks in bevinding/interpretatie, vast dat een NORMALE uitslag
  // (niet een afwijkende) hier naar de red flag leidt. Er bestaat geen
  // aparte "negatief/normaal = geruststellend"-relatie voor TEST-003 zoals
  // die wel voor TEST-001/002 bestaat — juist die afwezigheid voorkomt dat
  // een generieke aanname deze relatie zou kunnen overschrijven of
  // tegenspreken. kwalificatie.fase="acuut" legt vast dat dit specifiek de
  // context "acute heftige vertigo" betreft, niet elke HIT-afname.
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-003",
      naarObjectId: "RF-007",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ fase: "acuut" }),
      bevinding: "Normale HIT bij acute heftige vertigo",
      interpretatie: "Verdacht centraal (bijv. cerebellair infarct) — zie RF-007",
      actietype: ActieType.acuut_verwijzen,
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });

  // --- TEST-004 (DVA) → AAND-002 -------------------------------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-004",
      naarObjectId: "AAND-002",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ lateraliteit: "bilateraal" }),
      bevinding: "Verminderde visuele acuiteit tijdens hoofdbeweging (≥2 regels verlies)",
      interpretatie: "Bevestigt bilaterale vestibulaire hypofunctie, relevant bij oscillopsie-klachten",
      diagnostischeWaarde: DiagnostischeWaarde.matig,
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });

  // --- AAND-002 → INT-005/006/007 (fase × lateraliteit) --------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-002",
      naarObjectId: "INT-005",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ fase: "chronisch-compensatie", lateraliteit: "unilateraal" }),
      bevinding: "Chronische fase, unilaterale hypofunctie, geen sterke autonome symptomen meer op de voorgrond",
      interpretatie: "Habituatie geïndiceerd",
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-002",
      naarObjectId: "INT-006",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ fase: "acuut" }),
      bevinding: "Late acute fase, lichte opbouw haalbaar",
      interpretatie: "Adaptatie/gaze-stability-training kan al licht worden opgestart, ruim vóór de chronische fase",
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-002",
      naarObjectId: "INT-006",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ fase: "chronisch-compensatie" }),
      bevinding: "Chronische fase, uni- of bilaterale hypofunctie",
      interpretatie: "Adaptatie/gaze-stability-training geïndiceerd — essentieel bij bilaterale hypofunctie",
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-002",
      naarObjectId: "INT-007",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ fase: "chronisch-compensatie", lateraliteit: "bilateraal" }),
      bevinding: "Chronische fase, bilaterale hypofunctie — geen gezonde kant om op te compenseren",
      interpretatie: "Substitutie geïndiceerd",
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });

  // --- CI-006 → INT-005 (contra-indicatie-koppeling) -----------------------
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "CI-006",
      naarObjectId: "INT-005",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Patiënt heeft CI-006",
      interpretatie: "Niet starten in de acute fase met sterke autonome symptomen",
    },
  });

  // --- AAND-002 → RF-008/009 (anamnese/follow-up-red flags) ----------------
  // RF-008: expliciet patroonType=afwijkend_beloop (§18: "patroon-type vast
  // onderdeel van elke follow-up-relatie") — dit is de fase-voortgangslus
  // uit §7.3. RF-009 is geen follow-up-lus maar een anamnese-consistentie-
  // signaal, krijgt daarom bewust geen patroonType.
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-002",
      naarObjectId: "RF-008",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Geen verwachte fase-voortgang, verslechtering, nieuwe neurologische symptomen",
      interpretatie: "Wijkt af van verwacht beloop",
      actietype: ActieType.hypothese_heroverwegen,
      patroonType: PatroonType.afwijkend_beloop,
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-002",
      naarObjectId: "RF-009",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Asymmetrisch gehoorverlies/tinnitus bij het beeld",
      interpretatie: "Neuritis vestibularis geeft normaliter geen gehoorverlies — kan wijzen op labyrintitis of een andere oorzaak",
      actietype: ActieType.hypothese_heroverwegen,
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });

  // --- AAND-002 → differentiaaldiagnose (referentiedocument §14) ----------
  // BPPV staat er niet los bij: die differentiaal bestaat al (AAND-001 →
  // AAND-002 hierboven) en is via "relaties naar dit object toe" al
  // zichtbaar op AAND-002 zelf — geen dubbele relatie nodig.
  const differentialenVestibulair: Array<{
    naar: string;
    kenmerk: string;
    type: RelatietypeDifferentiaal;
  }> = [
    {
      naar: "STUB-CVA-TIA",
      kenmerk: "Acute presentatie met focale neurologische uitval (centraal vestibulair syndroom)",
      type: RelatietypeDifferentiaal.uitsluitend,
    },
    {
      naar: "STUB-LABYRINTITIS",
      kenmerk: "Bijkomend gehoorverlies/tinnitus — neuritis vestibularis geeft dat normaliter niet",
      type: RelatietypeDifferentiaal.uitsluitend,
    },
    {
      naar: "STUB-ACUSTICUSNEURINOOM",
      kenmerk: "Geleidelijker beloop, vaak progressief eenzijdig gehoorverlies",
      type: RelatietypeDifferentiaal.uitsluitend,
    },
    {
      naar: "AAND-004",
      kenmerk: "Kan comorbide voorkomen, met name bij chronische/bilaterale hypofunctie bij oudere patiënten met valrisico",
      type: RelatietypeDifferentiaal.comorbide,
    },
  ];
  for (const d of differentialenVestibulair) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: "AAND-002",
        naarObjectId: d.naar,
        relatieType: RelatieType.differentiaal,
        bevinding: d.kenmerk,
        relatietypeDifferentiaal: d.type,
      },
    });
  }

  // =====================================================================
  // RELATIES — AAND-003 (PPPD), referentiedocument §15, requirements §8
  // =====================================================================

  // --- ANAM-001 → AAND-003: DE VOORWAARDE-RELATIE (§8.1) --------------------
  // Eerste echte gebruik van relatieType = voorwaarde. Bevinding/interpretatie
  // hergebruikt zoals eerder bij bevinding_interpretatie (zie toelichting
  // bovenaan dit bestand) — er zijn geen aparte, voorwaarde-specifieke velden
  // in het schema. Het id wordt hier bewaard, want TEST-005's relatie
  // hieronder verwijst er expliciet naar (diagnostischeWaardeVoorwaardeRelatieId,
  // §1.3/§8.1 — nooit een vaste diagnostische waarde).
  const pppdVoorwaardeRelatieId = nextRelatieId();
  await prisma.relatie.create({
    data: {
      id: pppdVoorwaardeRelatieId,
      vanObjectId: "ANAM-001",
      naarObjectId: "AAND-003",
      relatieType: RelatieType.voorwaarde,
      bevinding:
        "Differentiaaldiagnostisch traject afgerond + klachtenpatroon " +
        "≥3 maanden aanhoudend op de meeste dagen",
      interpretatie:
        "Voorwaarde voor de PPPD-hypothese vervuld — mag nu als hypothese overwogen/getoond worden",
      evidenceNiveau: EvidenceNiveau.consensus,
    },
  });

  // --- TEST-005 (Bárány-criteria) → AAND-003, conditionele diagnostische
  // waarde (§8.1) — bewust GEEN vaste diagnostischeWaarde, alleen de
  // verwijzing naar de voorwaarde-relatie hierboven.
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "TEST-005",
      naarObjectId: "AAND-003",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Voldoet aan de Bárány-criteria (checklist)",
      interpretatie: "Bevestigt PPPD",
      diagnostischeWaarde: null,
      diagnostischeWaardeVoorwaardeRelatieId: pppdVoorwaardeRelatieId,
      evidenceNiveau: EvidenceNiveau.consensus,
    },
  });

  // --- AAND-003 → INT-008/009/010 (interventie-indicatie) -------------------
  // Geen fase/lateraliteit-achtige kwalificatie-assen bij PPPD — INT-008
  // krijgt wel de "mate van vermijdingsgedrag"-kwalificatie die §15 noemt.
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-003",
      naarObjectId: "INT-008",
      relatieType: RelatieType.bevinding_interpretatie,
      kwalificatie: j({ vermijdingsgedrag: "aanwezig" }),
      bevinding: "Bevestigde PPPD, met vermijdingsgedrag",
      interpretatie: "Exposure-training geïndiceerd",
      evidenceNiveau: EvidenceNiveau.systematic_review,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-003",
      naarObjectId: "INT-009",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Bevestigde PPPD, uitgelokt door complexe/bewegende visuele prikkels",
      interpretatie: "Visuele desensitisatie geïndiceerd",
      evidenceNiveau: EvidenceNiveau.observationeel,
    },
  });
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-003",
      naarObjectId: "INT-010",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Bevestigde PPPD",
      interpretatie: "Psycho-educatie functioneel karakter geïndiceerd",
      evidenceNiveau: EvidenceNiveau.consensus,
    },
  });

  // --- AAND-003 → RF-010/011/012 (anamnese-/follow-up-red flags) -----------
  for (const rf of pppdRedFlags) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: "AAND-003",
        naarObjectId: rf.id,
        relatieType: RelatieType.bevinding_interpretatie,
        bevinding: rf.kenmerken,
        interpretatie: rf.interpretatie,
        actietype: rf.actietype,
        evidenceNiveau: EvidenceNiveau.consensus,
      },
    });
  }

  // --- AAND-003 → differentiaaldiagnose (§15: overwegend comorbide) --------
  // Brondocument noemt hier geen enkele differentiaal expliciet als
  // "uitsluitend" (i.t.t. bij AAND-001/002) — alle vier hier dus comorbide,
  // consistent met "eerste item waar comorbide-relaties in de meerderheid
  // zijn t.o.v. uitsluitend".
  const differentialenPppd = [
    { naar: "STUB-VEST-MIGRAINE", kenmerk: "Kan comorbide voorkomen — langere episodes, migraine-anamnese" },
    { naar: "AAND-002", kenmerk: "Kan comorbide voorkomen — vestibulaire hypofunctie als precipiterend of blijvend event" },
    { naar: "STUB-ANGSTSTOORNIS", kenmerk: "Kan comorbide voorkomen, of op de voorgrond staan i.p.v. instandhoudende factor (zie RF-011)" },
    { naar: "STUB-DEPRESSIE", kenmerk: "Kan comorbide voorkomen, of op de voorgrond staan i.p.v. instandhoudende factor (zie RF-011)" },
  ];
  for (const d of differentialenPppd) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: "AAND-003",
        naarObjectId: d.naar,
        relatieType: RelatieType.differentiaal,
        bevinding: d.kenmerk,
        relatietypeDifferentiaal: RelatietypeDifferentiaal.comorbide,
      },
    });
  }

  // =====================================================================
  // RELATIES — AAND-004 (Multifactoriële duizeligheid met valrisico),
  // referentiedocument §16, requirements §10
  // =====================================================================

  // --- Aggregatie-relaties: FACTOR-xxx (+ hergebruikte RF-004/TEST-003) →
  // AAND-004 (§10.1) — eerste echte gebruik van relatieType = aggregatie.
  // Elke factor draagt met een eigen bijdrage_gewicht bij, geen van allen
  // op zichzelf noodzakelijk of voldoende (§16). Zie de aannametoelichting
  // bij de FACTOR-objecten hierboven voor de bijdrage_gewicht-inschatting.
  const aggregatieFactoren: Array<{ van: string; gewicht: BijdrageGewicht; bevinding: string }> = [
    { van: "FACTOR-001", gewicht: BijdrageGewicht.hoog, bevinding: "Verminderde propriocepsis vastgesteld" },
    { van: "FACTOR-002", gewicht: BijdrageGewicht.hoog, bevinding: "Spierzwakte (onderste extremiteiten) vastgesteld" },
    { van: "FACTOR-003", gewicht: BijdrageGewicht.matig_hoog, bevinding: "Visusprobleem vastgesteld" },
    { van: "FACTOR-004", gewicht: BijdrageGewicht.matig, bevinding: "Polyfarmacie vastgesteld" },
    { van: "FACTOR-005", gewicht: BijdrageGewicht.matig, bevinding: "Cognitieve beperking vastgesteld" },
    { van: "FACTOR-006", gewicht: BijdrageGewicht.matig_hoog, bevinding: "Valangst vastgesteld" },
    // Hergebruikte objecten (§16: "concreet bewijs voor herbruikbaarheid van
    // het generieke model tussen items") — geen nieuwe FACTOR-wrapper.
    { van: "RF-004", gewicht: BijdrageGewicht.matig, bevinding: "Orthostatisch/cardiaal beeld vastgesteld" },
    { van: "TEST-003", gewicht: BijdrageGewicht.matig_hoog, bevinding: "Milde vestibulaire achteruitgang vastgesteld (HIT)" },
  ];
  for (const f of aggregatieFactoren) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: f.van,
        naarObjectId: "AAND-004",
        relatieType: RelatieType.aggregatie,
        bevinding: f.bevinding,
        interpretatie: "Draagt bij aan het multifactoriële duizeligheids-/valrisicobeeld",
        bijdrageGewicht: f.gewicht,
        evidenceNiveau: EvidenceNiveau.consensus,
      },
    });
  }

  // --- Interventie-indicaties: fysio-behandelde factoren → INT-xxx (§16) —
  // hergebruikt relatieType = bevinding_interpretatie, zelfde patroon als
  // overal elders (zie modelleringsbeslissingen bovenaan dit bestand).
  // TEST-003 → INT-006: hergebruik van een bestaande vestibulaire-
  // hypofunctie-interventie (adaptatie/gaze-stability) — de indicatie-
  // relatie krijgt bewust geen kwalificatie (fase-as is hier niet van
  // toepassing), komt dus terecht als een derde, ongeclausuleerde
  // indicatieKwalificaties-entry naast INT-006's twee bestaande
  // fase-gekwalificeerde relaties (§7.1) — geen conflict, .some()-matching
  // blijft correct voor beide contexten.
  const interventieFactoren: Array<{ van: string; naar: string; bevinding: string; interpretatie: string }> = [
    { van: "FACTOR-001", naar: "INT-011", bevinding: "Verminderde propriocepsis vastgesteld", interpretatie: "Balanstraining geïndiceerd" },
    { van: "FACTOR-002", naar: "INT-012", bevinding: "Spierzwakte (onderste extremiteiten) vastgesteld", interpretatie: "Krachttraining geïndiceerd" },
    { van: "FACTOR-006", naar: "INT-013", bevinding: "Valangst vastgesteld", interpretatie: "Graduele blootstelling geïndiceerd" },
    { van: "TEST-003", naar: "INT-006", bevinding: "Milde vestibulaire achteruitgang vastgesteld (HIT)", interpretatie: "Adaptatie/gaze-stability-training geïndiceerd" },
  ];
  for (const i of interventieFactoren) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: i.van,
        naarObjectId: i.naar,
        relatieType: RelatieType.bevinding_interpretatie,
        bevinding: i.bevinding,
        interpretatie: i.interpretatie,
        evidenceNiveau: EvidenceNiveau.consensus,
      },
    });
  }

  // --- Signalering-opvolging: extern-behandelde factoren (§10.2) — eerste
  // echte gebruik van relatieType = signalering_opvolging. Bewust geen
  // geautomatiseerde koppeling (§4 buiten scope) — alleen de relatie die
  // vastlegt wélke externe opvolging relevant is; het daadwerkelijke
  // vraag-antwoord-veld ("wel/niet/nog niet gebeurd") zit in de follow-up-UI
  // (stap 3), niet in dit datamodel.
  const signaleringFactoren: Array<{ van: string; bevinding: string; interpretatie: string }> = [
    { van: "FACTOR-003", bevinding: "Visusprobleem vastgesteld", interpretatie: "Extern navragen: oogarts-/optometristcontrole" },
    { van: "FACTOR-004", bevinding: "Polyfarmacie vastgesteld", interpretatie: "Extern navragen: medicatiereview met huisarts" },
    { van: "FACTOR-005", bevinding: "Cognitieve beperking vastgesteld", interpretatie: "Extern navragen: cognitieve screening/opvolging" },
    { van: "RF-004", bevinding: "Orthostatisch/cardiaal beeld vastgesteld", interpretatie: "Extern navragen: cardiovasculaire opvolging bij huisarts" },
  ];
  for (const s of signaleringFactoren) {
    await prisma.relatie.create({
      data: {
        id: nextRelatieId(),
        vanObjectId: s.van,
        naarObjectId: "AAND-004",
        relatieType: RelatieType.signalering_opvolging,
        bevinding: s.bevinding,
        interpretatie: s.interpretatie,
        actietype: ActieType.samenwerking_adviseren,
        evidenceNiveau: EvidenceNiveau.consensus,
      },
    });
  }

  // --- AAND-004 → RF-004 (rode-vlag-interrupt, letterlijk hergebruikt) ------
  // "Red-flag-interrupt-logica blijft ongewijzigd op beide typen van
  // toepassing" (§19) — dezelfde acute-verwijs-gate als bij BPPD, nu ook
  // vanuit AAND-004's eigen anamnese bereikbaar (naast de aggregatie- en
  // signalering-relaties hierboven, die een andere, niet-acute rol van
  // hetzelfde object vastleggen).
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-004",
      naarObjectId: "RF-004",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Sterke bloeddrukdaling bij houdingsverandering, syncope, palpitaties, pijn op de borst",
      interpretatie: "Orthostatisch/cardiaal",
      actietype: ActieType.acuut_verwijzen,
      evidenceNiveau: EvidenceNiveau.richtlijn,
    },
  });

  // --- AAND-004 → RF-013 (follow-up-patroonsignaal, §10.3) ------------------
  // Zelfde patroon als AAND-002 → RF-008 (§7.3/§18: patroonType vast
  // onderdeel van elke follow-up-relatie).
  await prisma.relatie.create({
    data: {
      id: nextRelatieId(),
      vanObjectId: "AAND-004",
      naarObjectId: "RF-013",
      relatieType: RelatieType.bevinding_interpretatie,
      bevinding: "Snelle acute verslechtering i.p.v. geleidelijke verandering",
      interpretatie: "Wijkt af van verwacht multifactorieel beloop",
      actietype: ActieType.hypothese_heroverwegen,
      patroonType: PatroonType.afwijkend_beloop,
      evidenceNiveau: EvidenceNiveau.consensus,
    },
  });

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
