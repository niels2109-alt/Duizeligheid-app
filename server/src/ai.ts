/**
 * AI-laag — requirements §3, implementatie van referentiedocument §12/§20.
 *
 * Kernprincipe: de kennisbank is de bron, AI is een vertaal-/presentatie-
 * laag — nooit zelfstandige bron van medische waarheid. Concreet vertaald
 * naar vijf toetsbare eisen (§3):
 *
 *   1. Traceerbaarheid: elk antwoord draagt een verplichte object_ids-lijst.
 *   2. Geen-antwoord-scenario: geen match in de kennisbank → expliciete
 *      melding, nooit een door het taalmodel zelf aangevulde tekst.
 *   3. Escalatie bij twijfel: een gedeeltelijke match met een
 *      acuut-verwijzen-relatie toont altijd de voorzichtigste interpretatie
 *      het eerst, ongeacht ruwe matchscore.
 *   4. Gepersonaliseerde/samengestelde educatie: alleen bevestigde
 *      variabele content-blokken opnemen (voor BPPV/EDU-001 een no-op —
 *      samengesteld=false — maar het mechanisme is generiek geïmplementeerd
 *      voor toekomstige samengestelde items, zie /educatie/:id hieronder).
 *   5. Geen vrije generatie: zowel de deterministische tekst als de
 *      optionele Claude-verfijning (src/claude.ts) mogen uitsluitend
 *      bestaande KnowledgeObject-/Relatie-content parafraseren/samenvoegen.
 *
 * Matching is bewust eenvoudig (tokenoverlap, geen embeddings/vector search
 * — buiten scope voor deze MVP-stap) en toont nooit een numerieke score aan
 * de gebruiker: dezelfde "geen kwantitatieve kansberekening"-lijn als de
 * reasoning-flow (referentiedocument §8).
 */

import { Router, Request, Response } from "express";
import { prisma } from "./prisma";
import { parseRol, isZichtbaarVoor, type Rol } from "./visibility";
import { parseJsonField } from "./serialize";
import { verfijnMetClaude } from "./claude";
import { requireAuth } from "./auth";

export const aiRouter = Router();
// Professioneel gereedschap binnen de ingelogde app (Modus B-uitbreiding),
// geen publiek patiënt-chatkanaal — patiënten hebben in dit product geen
// eigen account en krijgen kennisbankinhoud alleen via een door de
// therapeut vrijgegeven educatie-item (referentiedocument §24). De
// `rol`-parameter hieronder simuleert alleen hoe content voor een patiënt
// zou ogen, net als in Modus B — geen eigen toegangspad voor patiënten.
aiRouter.use(requireAuth);

const MIN_TOKEN_LENGTH = 3;

// Veelvoorkomende Nederlandse functiewoorden die anders als "match" tellen
// puur omdat ze toevallig in bijna elke tekst voorkomen (bijv. "wat", "hoe",
// "het" zijn alle drie ≥3 tekens) — zonder deze lijst matcht elke vraag met
// vrijwel alle content, wat de traceerbaarheid inhoudsloos zou maken. Ook
// "patiënt(en)" staat erin: geen functiewoord, maar in déze kennisbank (over
// patiëntenzorg) een woord dat in bijna elke zin voorkomt en dus zelf geen
// onderscheidend signaal draagt — vergelijkbaar met "the" in een corpus dat
// toevallig alleen Engelse tekst bevat.
const STOPWOORDEN = new Set([
  "aan", "als", "bij", "dan", "dat", "deze", "die", "dit", "door", "een",
  "en", "er", "had", "heb", "heeft", "het", "hoe", "hun", "in", "is", "ja",
  "kan", "kunnen", "maar", "me", "met", "mijn", "moet", "na", "naar",
  "niet", "nog", "nu", "of", "om", "ook", "op", "over", "te", "tot",
  "tussen", "uit", "van", "voor", "waar", "wanneer", "want", "wat", "we",
  "wel", "wie", "wil", "worden", "wordt", "zal", "ze", "zelf", "zijn",
  "zonder", "zou", "the", "and", "for", "are", "what", "how",
  "patient", "patienten", "patients", "last",
]);

function ruweWoorden(tekst: string): string[] {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diakritische tekens (bijv. é → e)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);
}

function tokenize(tekst: string): string[] {
  return ruweWoorden(tekst).filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOPWOORDEN.has(t));
}

/**
 * Telt matches in `primair` dubbel (bijv. de naam van een object) t.o.v.
 * `secundair`. Matcht op hele woorden (niet op ruwe substring) — anders zou
 * bijv. queryterm "last" ("last van...") onterecht matchen binnen
 * "belasten", puur omdat het toevallig een substring is.
 */
function scoreVelden(queryTokens: string[], primair: string | null | undefined, secundair: string | null | undefined): number {
  const telMatches = (tekst: string | null | undefined) => {
    if (!tekst) return 0;
    const woorden = new Set(ruweWoorden(tekst));
    return queryTokens.reduce((acc, t) => acc + (woorden.has(t) ? 1 : 0), 0);
  };
  return telMatches(primair) * 2 + telMatches(secundair);
}

interface Match {
  objectIds: string[];
  tekst: string;
  evidenceNiveau: string | null;
  isRedFlag: boolean;
  score: number;
}

function geenAntwoordRespons(vraag: string) {
  return {
    vraag,
    geenAntwoord: true,
    escalatie: false,
    antwoordtekst:
      "Dit staat niet in de kennisbank. Om geen informatie te verzinnen die niet is geverifieerd, " +
      "geeft het systeem hier bewust geen antwoord op — raadpleeg de behandelend fysiotherapeut.",
    bron: "geen-match" as const,
    objectIds: [] as string[],
    evidenceNiveaus: [] as string[],
  };
}

async function vindMatches(queryTokens: string[], rol: Rol): Promise<Match[]> {
  const objecten = await prisma.knowledgeObject.findMany();
  const relaties = await prisma.relatie.findMany({ include: { vanObject: true, naarObject: true } });

  // actietype leeft alleen op Relatie, niet op KnowledgeObject — een
  // red-flag-object is dus alleen écht "acuut verwijzen"-waardig als er een
  // relatie naartoe met dat actietype bestaat. Zonder deze check zou een
  // KnowledgeObject-match op elk red-flag-object (bijv. RF-006, dat
  // hypothese_heroverwegen is, geen acuut_verwijzen) onterecht escaleren.
  const acuutVerwijzenObjectIds = new Set(
    relaties.filter((r) => r.actietype === "acuut_verwijzen").map((r) => r.naarObjectId)
  );

  const matches: Match[] = [];

  for (const o of objecten) {
    if (!isZichtbaarVoor(rol, o)) continue;
    const score = scoreVelden(queryTokens, o.naam, [o.kernbeschrijving, o.klinischeKenmerken].filter(Boolean).join(" "));
    if (score > 0) {
      matches.push({
        objectIds: [o.id],
        tekst: o.kernbeschrijving,
        evidenceNiveau: o.evidenceNiveau,
        isRedFlag: acuutVerwijzenObjectIds.has(o.id),
        score,
      });
    }
  }

  for (const r of relaties) {
    if (!isZichtbaarVoor(rol, r.vanObject) || !isZichtbaarVoor(rol, r.naarObject)) continue;
    if (!r.bevinding || !r.interpretatie) continue;
    // Contra-indicatie→interventie-relaties dragen generieke, structurele
    // tekst ("Patiënt heeft CI-001") in plaats van beschrijvende inhoud —
    // matchen daarop levert vooral ruis op (bijv. het woord "patiënt" laat
    // dan bijna elke CI-relatie meematchen). De CI-objecten zelf hebben wél
    // beschrijvende kernbeschrijving-tekst en blijven daarmee gewoon
    // vindbaar via de object-matching hierboven.
    if (r.vanObject.typeObject === "contra_indicatie") continue;
    const score = scoreVelden(queryTokens, null, `${r.bevinding} ${r.interpretatie}`);
    if (score > 0) {
      matches.push({
        objectIds: [r.vanObjectId, r.naarObjectId],
        tekst: `${r.bevinding} → ${r.interpretatie}`,
        evidenceNiveau: r.evidenceNiveau,
        isRedFlag: r.actietype === "acuut_verwijzen",
        score,
      });
    }
  }

  return matches;
}

// ---------------------------------------------------------------------
// POST /api/ai/vraag — vrije-tekst-vraag, traceerbaar antwoord
// ---------------------------------------------------------------------
aiRouter.post("/vraag", async (req: Request, res: Response) => {
  const rol = parseRol(req.query.rol ?? req.body?.rol);
  const vraag = typeof req.body?.vraag === "string" ? req.body.vraag.trim() : "";

  if (!vraag) {
    res.status(400).json({ error: "Vraag ontbreekt." });
    return;
  }

  const queryTokens = tokenize(vraag);
  if (queryTokens.length === 0) {
    res.json(geenAntwoordRespons(vraag));
    return;
  }

  const matches = await vindMatches(queryTokens, rol);
  if (matches.length === 0) {
    res.json(geenAntwoordRespons(vraag));
    return;
  }

  matches.sort((a, b) => b.score - a.score);

  // Dedupliceren: een object en de relatie die naar dat object verwijst
  // leveren vaak (bijna) dezelfde tekst op (bijv. RF-001's kernbeschrijving
  // vs. de AAND-001→RF-001-relatie) — zonder dit zou hetzelfde signaal
  // dubbel in het antwoord staan. Normaliseren (kleine letters, geen
  // eindpunt) en de eerste (hoogst-scorende) versie houden.
  const geziene = new Set<string>();
  const unieke = matches.filter((m) => {
    const genormaliseerd = m.tekst.toLowerCase().trim().replace(/\.$/, "");
    if (geziene.has(genormaliseerd)) return false;
    geziene.add(genormaliseerd);
    return true;
  });

  const redFlagMatches = unieke.filter((m) => m.isRedFlag);
  // Eis 3 (escalatie): rode-vlag-gerelateerde bevindingen altijd vooraan
  // tonen zodra ze ergens in de matches voorkomen — ook als een niet-
  // rode-vlag-match toevallig een hogere ruwe score haalde.
  const escalatie = redFlagMatches.length > 0;
  const geordend = escalatie ? [...redFlagMatches, ...unieke.filter((m) => !m.isRedFlag)] : unieke;
  const top = geordend.slice(0, 5);

  const objectIds = Array.from(new Set(top.flatMap((m) => m.objectIds)));
  const evidenceNiveaus = Array.from(new Set(top.map((m) => m.evidenceNiveau).filter((e): e is string => e != null)));

  const deterministischeTekst =
    (escalatie
      ? "Let op: dit kan wijzen op een signaal dat om voorzichtigheid vraagt — de voorzichtigste " +
        "interpretatie staat hieronder als eerste.\n\n"
      : "") + top.map((m) => m.tekst).join("\n\n");

  // Eis 5: de optionele verfijning krijgt uitsluitend de al-bepaalde
  // deterministische tekst als toegestane inhoud, nooit de ruwe vraag als
  // vrije-generatie-opdracht.
  const verfijnd = await verfijnMetClaude(vraag, deterministischeTekst, rol);

  res.json({
    vraag,
    geenAntwoord: false,
    escalatie,
    antwoordtekst: verfijnd?.tekst ?? deterministischeTekst,
    bron: verfijnd ? "ai-verfijnd" : "deterministisch",
    objectIds,
    evidenceNiveaus,
  });
});

// ---------------------------------------------------------------------
// GET /api/ai/educatie/:id — samengevoegde, patiëntvriendelijke
// presentatie van een patiënteducatie-item + zijn signaleringsrelaties
// (referentiedocument §12: "bijv. meerdere red flags samenvoegen tot
// patiëntvriendelijke lijst, zoals bij EDU-001")
// ---------------------------------------------------------------------
aiRouter.get("/educatie/:id", async (req: Request<{ id: string }>, res: Response) => {
  const rol = parseRol(req.query.rol);
  const eduObject = await prisma.knowledgeObject.findUnique({
    where: { id: req.params.id },
    include: { patientEducatieObject: true },
  });

  if (!eduObject || !eduObject.patientEducatieObject || !isZichtbaarVoor(rol, eduObject)) {
    res.status(404).json({ error: "Patiënteducatie-item niet gevonden." });
    return;
  }
  const peo = eduObject.patientEducatieObject;

  // Eis 4: bij samengestelde educatie alleen content opnemen voor factoren
  // die in déze sessie daadwerkelijk bevestigd zijn — voor EDU-001
  // (samengesteld=false) is dit een no-op, maar het mechanisme is generiek:
  // een toekomstig samengesteld item geeft bevestigdeFactorIds mee.
  const bevestigdeFactorIds = Array.isArray(req.query.bevestigd)
    ? (req.query.bevestigd as string[])
    : typeof req.query.bevestigd === "string"
      ? [req.query.bevestigd]
      : [];

  const signaleringIds = parseJsonField<string[]>(peo.signaleringObjectIds, []);
  const relevanteSignaleringIds = peo.samengesteld
    ? signaleringIds.filter((id) => bevestigdeFactorIds.includes(id))
    : signaleringIds;

  const signaleringObjecten = await prisma.knowledgeObject.findMany({
    where: { id: { in: relevanteSignaleringIds } },
  });
  const alarmsignalen = signaleringObjecten.map((rf) => ({ objectId: rf.id, tekst: rf.kernbeschrijving }));

  // Requirements §10.4: bij samengesteld-type educatie kan signaleringObjectIds
  // twee soorten content-blokken bevatten — echte alarmsignalen (typeObject=
  // red_flag, "neem contact op bij...") en algemene per-factor-uitleg
  // (typeObject=prognostische_factor, "voor jou relevant..."). Type-gedreven
  // onderscheid, niet op specifieke object-id's — werkt zo automatisch mee
  // voor elk toekomstig samengesteld item met dezelfde datavorm.
  const echteAlarmsignalen = alarmsignalen.filter((a) => signaleringObjecten.find((o) => o.id === a.objectId)?.typeObject === "red_flag");
  const factorUitleg = alarmsignalen.filter((a) => signaleringObjecten.find((o) => o.id === a.objectId)?.typeObject !== "red_flag");

  const deterministischeTekst = [
    eduObject.kernbeschrijving,
    `Verwachtingsmanagement: ${peo.verwachtingsmanagement}`,
    peo.rationaleUitlegCounterintuitief ? `Waarom dit advies: ${peo.rationaleUitlegCounterintuitief}` : null,
    factorUitleg.length > 0 ? "Voor jou relevant: " + factorUitleg.map((a) => a.tekst).join(" — ") : null,
    echteAlarmsignalen.length > 0
      ? "Neem contact op met je fysiotherapeut of huisarts bij: " + echteAlarmsignalen.map((a) => a.tekst).join(" — ")
      : null,
  ]
    .filter((x): x is string => x != null)
    .join("\n\n");

  const objectIds = [eduObject.id, ...relevanteSignaleringIds];
  const verfijnd = await verfijnMetClaude(`Patiëntvriendelijke samenvatting van ${eduObject.naam}`, deterministischeTekst, "patient");

  res.json({
    antwoordtekst: verfijnd?.tekst ?? deterministischeTekst,
    bron: verfijnd ? "ai-verfijnd" : "deterministisch",
    objectIds,
    alarmsignalen,
  });
});
