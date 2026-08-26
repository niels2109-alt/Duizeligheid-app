/**
 * Sessie + sessie-samenvatting (requirements §1.5, §2.3).
 *
 * Functioneel expliciet géén dossiervoering: geen langdurige bewaarplicht
 * (90 dagen, of direct bij export — §5.1), geen koppeling aan een lopend
 * EPD. Bedoeld als sessiegebonden weergave die de therapeut zelf kan
 * overnemen in het eigen (bestaande) patiëntdossier (referentiedocument
 * §22/§27).
 */

import { Router, Request, Response } from "express";
import { StapType, ReasoningEngineVersie } from "@prisma/client";
import { prisma } from "./prisma";
import { requireAuth } from "./auth";
import { encrypt, decrypt } from "./crypto";
import { parseJsonField } from "./serialize";

export const sessiesRouter = Router();
sessiesRouter.use(requireAuth);

const NEGENTIG_DAGEN_MS = 90 * 24 * 60 * 60 * 1000;

const STAP_LABELS: Record<StapType, string> = {
  triage: "Triage",
  anamnese: "Anamnese",
  test: "Testselectie",
  interpretatie: "Interpretatie",
  strategie: "Behandelstrategie",
  educatie: "Patiënteducatie",
  followup: "Follow-up",
};

function isEigenSessie(sessie: { therapeutId: string } | null, therapeutId?: string) {
  return sessie != null && sessie.therapeutId === therapeutId;
}

// ---------------------------------------------------------------------
// POST /api/sessies — start een nieuwe sessie
//
// reasoningEngineVersie: optioneel, requirements §11.1/§11.2 (keuzescherm
// "Snelle route"/"Brede verkenning"). Ontbreekt het veld (alle bestaande
// V1-aanroepen), dan valt Prisma terug op het schema-default v1 — geen
// enkele bestaande caller hoeft aangepast te worden.
// ---------------------------------------------------------------------
sessiesRouter.post("/", async (req: Request, res: Response) => {
  const versieRaw = req.body?.reasoningEngineVersie;
  const reasoningEngineVersie =
    versieRaw === "v2" ? ReasoningEngineVersie.v2 : versieRaw === "v1" ? ReasoningEngineVersie.v1 : undefined;

  const sessie = await prisma.sessie.create({
    data: {
      therapeutId: req.therapeutId!,
      vervaltOp: new Date(Date.now() + NEGENTIG_DAGEN_MS),
      ...(reasoningEngineVersie ? { reasoningEngineVersie } : {}),
    },
  });
  res.status(201).json({
    id: sessie.id,
    gestartOp: sessie.gestartOp,
    vervaltOp: sessie.vervaltOp,
    reasoningEngineVersie: sessie.reasoningEngineVersie,
  });
});

// ---------------------------------------------------------------------
// GET /api/sessies — eigen (niet-verlopen) sessies, nieuwste eerst
// ---------------------------------------------------------------------
sessiesRouter.get("/", async (req: Request, res: Response) => {
  const sessies = await prisma.sessie.findMany({
    where: { therapeutId: req.therapeutId!, vervaltOp: { gt: new Date() } },
    orderBy: { gestartOp: "desc" },
    include: { aandoening: true, _count: { select: { stappen: true } } },
  });
  res.json(
    sessies.map((s) => ({
      id: s.id,
      gestartOp: s.gestartOp,
      aandoeningNaam: s.aandoening?.naam ?? null,
      aantalStappen: s._count.stappen,
      geëxporteerdOp: s.geëxporteerdOp,
      vervaltOp: s.vervaltOp,
    }))
  );
});

// ---------------------------------------------------------------------
// PATCH /api/sessies/:id — aandoening_id zetten zodra de flow convergeert
// ---------------------------------------------------------------------
sessiesRouter.patch("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const sessie = await prisma.sessie.findUnique({ where: { id: req.params.id } });
  if (!isEigenSessie(sessie, req.therapeutId)) {
    res.status(404).json({ error: "Sessie niet gevonden." });
    return;
  }
  const aandoeningId = typeof req.body?.aandoeningId === "string" ? req.body.aandoeningId : undefined;

  // Requirements §8.4: koppelt deze sessie aan een Behandelepisode
  // (trendweergave, PPPD) — optioneel, alleen relevant voor items met
  // vereistEpisodeTrend (zie flow.ts). vervaltOp van de episode verlengt
  // mee met deze sessie, nooit verkort (zelfde principe als schema.prisma
  // bij Behandelepisode toegelicht) — zo bestaat de episode nooit korter
  // dan haar laatst gekoppelde sessie.
  const episodeId = typeof req.body?.episodeId === "string" ? req.body.episodeId : undefined;
  if (episodeId) {
    const episode = await prisma.behandelepisode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.therapeutId !== req.therapeutId) {
      res.status(404).json({ error: "Behandeltraject niet gevonden." });
      return;
    }
    if (episode.vervaltOp < sessie!.vervaltOp) {
      await prisma.behandelepisode.update({ where: { id: episodeId }, data: { vervaltOp: sessie!.vervaltOp } });
    }
  }

  const updated = await prisma.sessie.update({
    where: { id: req.params.id },
    data: { aandoeningId, episodeId },
  });
  res.json({ id: updated.id, aandoeningId: updated.aandoeningId, episodeId: updated.episodeId });
});

// ---------------------------------------------------------------------
// POST /api/sessies/:id/stappen — een StapLog toevoegen
// ---------------------------------------------------------------------
sessiesRouter.post("/:id/stappen", async (req: Request<{ id: string }>, res: Response) => {
  const sessie = await prisma.sessie.findUnique({ where: { id: req.params.id } });
  if (!isEigenSessie(sessie, req.therapeutId)) {
    res.status(404).json({ error: "Sessie niet gevonden." });
    return;
  }

  const stapType = req.body?.stapType as StapType | undefined;
  const objectIdsGebruikt = Array.isArray(req.body?.objectIdsGebruikt) ? req.body.objectIdsGebruikt : [];
  const bevinding = typeof req.body?.bevinding === "string" ? req.body.bevinding : undefined;

  if (!stapType || !(stapType in STAP_LABELS)) {
    res.status(400).json({ error: "Ongeldig of ontbrekend stapType." });
    return;
  }

  const log = await prisma.stapLog.create({
    data: {
      sessieId: sessie!.id,
      stapType,
      objectIdsGebruikt: JSON.stringify(objectIdsGebruikt),
      bevindingEnc: encrypt(bevinding),
    },
  });
  res.status(201).json({ id: log.id, stapType: log.stapType, timestamp: log.timestamp });
});

// ---------------------------------------------------------------------
// GET /api/sessies/:id — volledig detail + live samenvatting
// ---------------------------------------------------------------------
sessiesRouter.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const sessie = await prisma.sessie.findUnique({
    where: { id: req.params.id },
    include: { aandoening: true, stappen: { orderBy: { timestamp: "asc" } } },
  });
  if (!isEigenSessie(sessie, req.therapeutId)) {
    res.status(404).json({ error: "Sessie niet gevonden." });
    return;
  }

  const stappen = sessie!.stappen.map((s) => ({
    id: s.id,
    stapType: s.stapType,
    objectIdsGebruikt: parseJsonField<string[]>(s.objectIdsGebruikt, []),
    bevinding: decrypt(s.bevindingEnc),
    timestamp: s.timestamp,
  }));

  res.json({
    id: sessie!.id,
    gestartOp: sessie!.gestartOp,
    aandoeningId: sessie!.aandoeningId,
    aandoeningNaam: sessie!.aandoening?.naam ?? null,
    geëxporteerdOp: sessie!.geëxporteerdOp,
    vervaltOp: sessie!.vervaltOp,
    stappen,
    samenvatting: sessie!.samenvattingEnc ? decrypt(sessie!.samenvattingEnc) : bouwSamenvatting(stappen),
  });
});

// ---------------------------------------------------------------------
// POST /api/sessies/:id/export — genereert + bewaart de vaste samenvatting,
// zet vervalt_op op nu (§5.1: "direct zodra de therapeut heeft geëxporteerd")
// ---------------------------------------------------------------------
sessiesRouter.post("/:id/export", async (req: Request<{ id: string }>, res: Response) => {
  const sessie = await prisma.sessie.findUnique({
    where: { id: req.params.id },
    include: { stappen: { orderBy: { timestamp: "asc" } } },
  });
  if (!isEigenSessie(sessie, req.therapeutId)) {
    res.status(404).json({ error: "Sessie niet gevonden." });
    return;
  }

  const stappen = sessie!.stappen.map((s) => ({
    id: s.id,
    stapType: s.stapType,
    objectIdsGebruikt: parseJsonField<string[]>(s.objectIdsGebruikt, []),
    bevinding: decrypt(s.bevindingEnc),
    timestamp: s.timestamp,
  }));
  const samenvatting = bouwSamenvatting(stappen);

  await prisma.sessie.update({
    where: { id: sessie!.id },
    data: {
      samenvattingEnc: encrypt(samenvatting),
      geëxporteerdOp: new Date(),
      vervaltOp: new Date(), // direct vervallen na export, §5.1
    },
  });

  res.json({ samenvatting });
});

function bouwSamenvatting(
  stappen: { stapType: StapType; objectIdsGebruikt: string[]; bevinding: string | null; timestamp: Date }[]
): string {
  if (stappen.length === 0) return "Geen stappen geregistreerd in deze sessie.";
  const regels = stappen.map((s) => {
    const label = STAP_LABELS[s.stapType];
    const ids = s.objectIdsGebruikt.length > 0 ? ` (${s.objectIdsGebruikt.join(", ")})` : "";
    return `${label}${ids}: ${s.bevinding ?? "—"}`;
  });
  return regels.join("\n");
}
