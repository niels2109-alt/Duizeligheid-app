/**
 * Behandelepisode — requirements §8.4/§8.5 stap 4 (trendweergave, PPPD).
 *
 * Groepeert opeenvolgende Sessies van hetzelfde behandeltraject zodat een
 * trend (bijv. NPQ-score over meerdere sessies, referentiedocument §15)
 * zichtbaar wordt — niet eerder nodig geweest bij BPPV/vestibulaire
 * hypofunctie, waar follow-up steeds een vergelijking met de vorige sessie
 * was (§8.4). Blijft, net als Sessie zelf, een tijdelijke groepering (§13:
 * geen dossiervoering): vervaltOp verlengt mee met elke nieuw gekoppelde
 * sessie (zie PATCH /api/sessies/:id), wordt nooit verkort.
 *
 * De NPQ-score/patroon-type/notitie van een individueel vervolgconsult
 * worden bewust NIET als los schemaveld opgeslagen (§8.4: "de enige
 * structurele datamodel-wijziging van dit item" is Behandelepisode +
 * Sessie.episode_id) — die klinische inhoud loopt via het bestaande
 * StapLog.bevinding_enc-mechanisme, zelfde patroon als elke andere
 * trail-entry. Deze router levert de episode-structuur + de gedecodeerde
 * followup-StapLogs voor de trendweergave, classificeert zelf niets.
 */

import { Router, Request, Response } from "express";
import { EpisodeStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { requireAuth } from "./auth";
import { decrypt } from "./crypto";

export const episodesRouter = Router();
episodesRouter.use(requireAuth);

const NEGENTIG_DAGEN_MS = 90 * 24 * 60 * 60 * 1000;

function isEigenEpisode(episode: { therapeutId: string } | null, therapeutId?: string) {
  return episode != null && episode.therapeutId === therapeutId;
}

// ---------------------------------------------------------------------
// POST /api/episodes — nieuw behandeltraject starten
// ---------------------------------------------------------------------
episodesRouter.post("/", async (req: Request, res: Response) => {
  const aandoeningId = typeof req.body?.aandoeningId === "string" ? req.body.aandoeningId : undefined;
  if (!aandoeningId) {
    res.status(400).json({ error: "aandoeningId is verplicht." });
    return;
  }
  const episode = await prisma.behandelepisode.create({
    data: {
      aandoeningId,
      therapeutId: req.therapeutId!,
      vervaltOp: new Date(Date.now() + NEGENTIG_DAGEN_MS),
    },
  });
  res.status(201).json({
    id: episode.id,
    aandoeningId: episode.aandoeningId,
    gestartOp: episode.gestartOp,
    status: episode.status,
  });
});

// ---------------------------------------------------------------------
// GET /api/episodes?aandoeningId= — eigen actieve, niet-vervallen trajecten
// (voor de "koppel aan bestaand traject"-keuze bij een vervolgconsult)
// ---------------------------------------------------------------------
episodesRouter.get("/", async (req: Request, res: Response) => {
  const aandoeningId = typeof req.query.aandoeningId === "string" ? req.query.aandoeningId : undefined;
  const episodes = await prisma.behandelepisode.findMany({
    where: {
      therapeutId: req.therapeutId!,
      status: EpisodeStatus.actief,
      vervaltOp: { gt: new Date() },
      ...(aandoeningId ? { aandoeningId } : {}),
    },
    orderBy: { gestartOp: "desc" },
    include: { _count: { select: { sessies: true } }, aandoening: true },
  });
  res.json(
    episodes.map((e) => ({
      id: e.id,
      aandoeningId: e.aandoeningId,
      aandoeningNaam: e.aandoening.naam,
      gestartOp: e.gestartOp,
      aantalSessies: e._count.sessies,
    }))
  );
});

// ---------------------------------------------------------------------
// PATCH /api/episodes/:id — traject afsluiten
// ---------------------------------------------------------------------
episodesRouter.patch("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const episode = await prisma.behandelepisode.findUnique({ where: { id: req.params.id } });
  if (!isEigenEpisode(episode, req.therapeutId)) {
    res.status(404).json({ error: "Behandeltraject niet gevonden." });
    return;
  }
  const status = req.body?.status === "afgesloten" ? EpisodeStatus.afgesloten : undefined;
  const updated = await prisma.behandelepisode.update({ where: { id: episode!.id }, data: { status } });
  res.json({ id: updated.id, status: updated.status });
});

// ---------------------------------------------------------------------
// GET /api/episodes/:id/trend — chronologisch overzicht van de gekoppelde
// sessies + hun follow-up-bevindingen, voor de trendweergave (§8.5 stap 4)
// ---------------------------------------------------------------------
episodesRouter.get("/:id/trend", async (req: Request<{ id: string }>, res: Response) => {
  const episode = await prisma.behandelepisode.findUnique({
    where: { id: req.params.id },
    include: {
      aandoening: true,
      sessies: {
        orderBy: { gestartOp: "asc" },
        include: { stappen: { where: { stapType: "followup" }, orderBy: { timestamp: "asc" } } },
      },
    },
  });
  if (!isEigenEpisode(episode, req.therapeutId)) {
    res.status(404).json({ error: "Behandeltraject niet gevonden." });
    return;
  }

  res.json({
    id: episode!.id,
    aandoeningId: episode!.aandoeningId,
    aandoeningNaam: episode!.aandoening.naam,
    gestartOp: episode!.gestartOp,
    status: episode!.status,
    sessies: episode!.sessies.map((s) => ({
      id: s.id,
      gestartOp: s.gestartOp,
      followup: s.stappen.map((stap) => ({
        id: stap.id,
        bevinding: decrypt(stap.bevindingEnc),
        timestamp: stap.timestamp,
      })),
    })),
  });
});
