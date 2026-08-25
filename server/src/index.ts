/**
 * Server-ingang — bundelt Modus B (§2.2, stap 2), Modus A-databundel
 * (§2.1, stap 3), authenticatie + sessies (§5.2, §1.5/§2.3, stap 4), en de
 * AI-laag (§3, stap 5).
 *
 * Modus B zelf blijft puur read-only: geen koppeling aan een Sessie, geen
 * sessie-logging (§2.2) — dat gedrag is ongewijzigd t.o.v. stap 2.
 */

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import { TypeObject } from "@prisma/client";
import { prisma } from "./prisma";
import { parseRol, zichtbaarheidsFilter, isZichtbaarVoor } from "./visibility";
import { parseJsonField } from "./serialize";
import { flowRouter } from "./flow";
import { authRouter } from "./auth";
import { sessiesRouter } from "./sessies";
import { episodesRouter } from "./episodes";
import { aiRouter } from "./ai";
import { startSessieOpschoning } from "./cleanup";

const app = express();
// origin: true weerspiegelt de Origin-header van het verzoek — nodig omdat
// een wildcard-CORS-origin niet samengaat met credentials (de sessie-cookie).
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/flow", flowRouter);
app.use("/api/auth", authRouter);
app.use("/api/sessies", sessiesRouter);
app.use("/api/episodes", episodesRouter);
app.use("/api/ai", aiRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// ---------------------------------------------------------------------
// GET /api/objects — zoeken/filteren
// Query: q (vrije tekst, naam+kernbeschrijving), type (type_object,
// meerdere via komma), tier (1/2/3), rol (therapeut|patient)
// ---------------------------------------------------------------------
app.get("/api/objects", async (req: Request, res: Response) => {
  const rol = parseRol(req.query.rol);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const typeParam = typeof req.query.type === "string" ? req.query.type : "";
  const tierParam = typeof req.query.tier === "string" ? req.query.tier : "";

  const requestedTypes = typeParam
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is TypeObject => (Object.values(TypeObject) as string[]).includes(t));

  const tier = tierParam && /^[123]$/.test(tierParam) ? Number(tierParam) : undefined;

  const objects = await prisma.knowledgeObject.findMany({
    where: {
      ...zichtbaarheidsFilter(rol),
      ...(requestedTypes.length > 0 ? { typeObject: { in: requestedTypes } } : {}),
      ...(tier !== undefined ? { tier } : {}),
      ...(q
        ? {
            OR: [
              { naam: { contains: q } },
              { kernbeschrijving: { contains: q } },
              { klinischeKenmerken: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ typeObject: "asc" }, { id: "asc" }],
    select: {
      id: true,
      naam: true,
      typeObject: true,
      tier: true,
      evidenceNiveau: true,
      status: true,
      kernbeschrijving: true,
    },
  });

  res.json({ rol, count: objects.length, resultaten: objects });
});

// ---------------------------------------------------------------------
// GET /api/objects/:id — detail, inclusief relaties in beide richtingen
// ---------------------------------------------------------------------
app.get("/api/objects/:id", async (req: Request<{ id: string }>, res: Response) => {
  const rol = parseRol(req.query.rol);
  const id = req.params.id;

  const object = await prisma.knowledgeObject.findUnique({
    where: { id },
    include: {
      patientEducatieObject: true,
      relatiesVanuit: { include: { naarObject: true } },
      relatiesNaartoe: { include: { vanObject: true } },
    },
  });

  if (!object || !isZichtbaarVoor(rol, object)) {
    res.status(404).json({ error: "Object niet gevonden of niet zichtbaar voor deze rol." });
    return;
  }

  const relatiesVanuit = object.relatiesVanuit
    .filter((r) => isZichtbaarVoor(rol, r.naarObject))
    .map((r) => ({
      id: r.id,
      relatieType: r.relatieType,
      naarObjectId: r.naarObjectId,
      naarObjectNaam: r.naarObject.naam,
      naarObjectType: r.naarObject.typeObject,
      kwalificatie: parseJsonField<Record<string, string> | null>(r.kwalificatie, null),
      bevinding: r.bevinding,
      interpretatie: r.interpretatie,
      diagnostischeWaarde: r.diagnostischeWaarde,
      relatietypeDifferentiaal: r.relatietypeDifferentiaal,
      bijdrageGewicht: r.bijdrageGewicht,
      patroonType: r.patroonType,
      actietype: r.actietype,
      evidenceNiveau: r.evidenceNiveau,
    }));

  const relatiesNaartoe = object.relatiesNaartoe
    .filter((r) => isZichtbaarVoor(rol, r.vanObject))
    .map((r) => ({
      id: r.id,
      relatieType: r.relatieType,
      vanObjectId: r.vanObjectId,
      vanObjectNaam: r.vanObject.naam,
      vanObjectType: r.vanObject.typeObject,
      kwalificatie: parseJsonField<Record<string, string> | null>(r.kwalificatie, null),
      bevinding: r.bevinding,
      interpretatie: r.interpretatie,
      diagnostischeWaarde: r.diagnostischeWaarde,
      relatietypeDifferentiaal: r.relatietypeDifferentiaal,
      bijdrageGewicht: r.bijdrageGewicht,
      patroonType: r.patroonType,
      actietype: r.actietype,
      evidenceNiveau: r.evidenceNiveau,
    }));

  res.json({
    id: object.id,
    naam: object.naam,
    typeObject: object.typeObject,
    behandelverantwoordelijkheid: object.behandelverantwoordelijkheid,
    behandeldiepte: object.behandeldiepte,
    tier: object.tier,
    uitkomsttype: object.uitkomsttype,
    kernbeschrijving: object.kernbeschrijving,
    klinischeKenmerken: object.klinischeKenmerken,
    evidenceNiveau: object.evidenceNiveau,
    bronnen: parseJsonField<unknown[] | null>(object.bronnen, null),
    status: object.status,
    laatstGecontroleerdOp: object.laatstGecontroleerdOp,
    zichtbaarTherapeut: object.zichtbaarTherapeut,
    zichtbaarPatient: object.zichtbaarPatient,
    patientEducatie: object.patientEducatieObject
      ? {
          verwachtingsmanagement: object.patientEducatieObject.verwachtingsmanagement,
          rationaleUitlegCounterintuitief:
            object.patientEducatieObject.rationaleUitlegCounterintuitief,
          samengesteld: object.patientEducatieObject.samengesteld,
          bronObjectIds: parseJsonField<string[]>(object.patientEducatieObject.bronObjectIds, []),
          signaleringObjectIds: parseJsonField<string[]>(
            object.patientEducatieObject.signaleringObjectIds,
            []
          ),
        }
      : null,
    relatiesVanuit,
    relatiesNaartoe,
  });
});

// ---------------------------------------------------------------------
// GET /api/meta — beschikbare filterwaarden voor de interface
// ---------------------------------------------------------------------
app.get("/api/meta", async (_req: Request, res: Response) => {
  res.json({
    types: Object.values(TypeObject),
    tiers: [1, 2, 3],
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Duizeligheid-API luistert op http://localhost:${PORT}`);
  startSessieOpschoning();
});
