/**
 * Individuele authenticatie per therapeut (requirements §5.2).
 *
 * Keuze: e-mail + wachtwoord (bcrypt-hash), niet magic link — zelfstandig
 * end-to-end te testen zonder een externe e-mailprovider, wat voor magic
 * link wel nodig zou zijn. Geen 2FA/SSO, conform §5.2 ("niet nodig bij een
 * kleine pilot"). Individueel account is wél niet-onderhandelbaar (geen
 * gedeeld/generiek account) — vandaar de registratie- en login-endpoints
 * hieronder, en waarom elke Sessie aan precies één Therapeut hangt.
 */

import bcrypt from "bcryptjs";
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

export const authRouter = Router();

const COOKIE_NAME = "duizeligheid_token";
const TOKEN_TTL = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET ontbreekt. Zie server/.env.example.");
  return secret;
}

function normaliseerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function setSessionCookie(res: Response, therapeutId: string) {
  const token = jwt.sign({ sub: therapeutId }, getJwtSecret(), { expiresIn: TOKEN_TTL });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // secure: alleen over HTTPS versturen. Lokale dev draait over http://
    // localhost, dus hier bewust uit — bij een echte (EU-)deployment achter
    // TLS (§5.3) hoort dit op true te staan.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

authRouter.post("/register", async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? normaliseerEmail(req.body.email) : "";
  const wachtwoord = typeof req.body?.wachtwoord === "string" ? req.body.wachtwoord : "";

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Ongeldig e-mailadres." });
    return;
  }
  if (wachtwoord.length < 8) {
    res.status(400).json({ error: "Wachtwoord moet minimaal 8 tekens zijn." });
    return;
  }

  const bestaat = await prisma.therapeut.findUnique({ where: { email } });
  if (bestaat) {
    res.status(409).json({ error: "Er bestaat al een account met dit e-mailadres." });
    return;
  }

  const wachtwoordHash = await bcrypt.hash(wachtwoord, 12);
  const therapeut = await prisma.therapeut.create({ data: { email, wachtwoordHash } });

  setSessionCookie(res, therapeut.id);
  res.status(201).json({ id: therapeut.id, email: therapeut.email });
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? normaliseerEmail(req.body.email) : "";
  const wachtwoord = typeof req.body?.wachtwoord === "string" ? req.body.wachtwoord : "";

  const therapeut = await prisma.therapeut.findUnique({ where: { email } });
  const klopt = therapeut ? await bcrypt.compare(wachtwoord, therapeut.wachtwoordHash) : false;

  if (!therapeut || !klopt) {
    // Zelfde foutmelding voor "onbekend e-mailadres" en "fout wachtwoord" —
    // voorkomt dat het endpoint gebruikt kan worden om te achterhalen welke
    // e-mailadressen een account hebben.
    res.status(401).json({ error: "E-mailadres of wachtwoord onjuist." });
    return;
  }

  setSessionCookie(res, therapeut.id);
  res.json({ id: therapeut.id, email: therapeut.email });
});

authRouter.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  const therapeut = await prisma.therapeut.findUnique({ where: { id: req.therapeutId } });
  if (!therapeut) {
    res.status(401).json({ error: "Niet ingelogd." });
    return;
  }
  res.json({ id: therapeut.id, email: therapeut.email });
});

/** Express-middleware: vereist een geldige sessie-cookie, zet req.therapeutId. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Niet ingelogd." });
    return;
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub: string };
    req.therapeutId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Sessie verlopen of ongeldig — log opnieuw in." });
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      therapeutId?: string;
    }
  }
}
