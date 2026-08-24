/**
 * Automatische verwijdering van verlopen sessies (requirements §5.1/§2.3):
 * "Moet, bij het bereiken van vervalt_op, automatisch verwijderd worden —
 * geen handmatige actie van de therapeut vereist."
 *
 * Een losstaande cronjob/scheduled function is de gebruikelijke productie-
 * opzet hiervoor, maar dat is een hosting-beslissing die buiten deze
 * lokale codebase valt. Voor deze bouwstap draait een simpele in-process
 * interval, zodat het gedrag zelf (verlopen sessies verdwijnen echt)
 * aantoonbaar en testbaar is zonder externe infrastructuur.
 */

import { prisma } from "./prisma";

const CONTROLE_INTERVAL_MS = 60 * 60 * 1000; // elk uur

export async function ruimVerlopenSessiesOp(): Promise<number> {
  const result = await prisma.sessie.deleteMany({
    where: { vervaltOp: { lte: new Date() } },
  });
  if (result.count > 0) {
    console.log(`Opschoning: ${result.count} verlopen sessie(s) verwijderd.`);
  }
  return result.count;
}

export function startSessieOpschoning() {
  // Direct bij opstarten één keer, daarna periodiek.
  ruimVerlopenSessiesOp().catch((e) => console.error("Sessie-opschoning mislukt:", e));
  setInterval(() => {
    ruimVerlopenSessiesOp().catch((e) => console.error("Sessie-opschoning mislukt:", e));
  }, CONTROLE_INTERVAL_MS).unref();
}
