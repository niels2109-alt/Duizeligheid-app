/**
 * Eenmalig verificatiescript (niet onderdeel van de seed) — controleert
 * referentiële integriteit en toont een overzicht per objecttype, om
 * handmatig te kunnen valideren dat stap 1 correct is opgeleverd.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const objects = await prisma.knowledgeObject.findMany({
    orderBy: { id: "asc" },
  });
  const relaties = await prisma.relatie.findMany();

  console.log("=== KnowledgeObjects per type ===");
  const byType: Record<string, string[]> = {};
  for (const o of objects) {
    (byType[o.typeObject] ??= []).push(o.id);
  }
  for (const [type, ids] of Object.entries(byType)) {
    console.log(`${type} (${ids.length}): ${ids.join(", ")}`);
  }

  console.log("\n=== Referentiële integriteit relaties ===");
  const ids = new Set(objects.map((o) => o.id));
  let broken = 0;
  for (const r of relaties) {
    if (!ids.has(r.vanObjectId) || !ids.has(r.naarObjectId)) {
      console.log(`GEBROKEN: ${r.id} (${r.vanObjectId} -> ${r.naarObjectId})`);
      broken++;
    }
  }
  console.log(broken === 0 ? "OK: alle relaties verwijzen naar bestaande objecten." : `${broken} gebroken relatie(s) gevonden.`);

  console.log("\n=== Verplichte velden check (naam/kernbeschrijving/evidence/status/datum) ===");
  let missing = 0;
  for (const o of objects) {
    const problems: string[] = [];
    if (!o.naam) problems.push("naam");
    if (!o.kernbeschrijving) problems.push("kernbeschrijving");
    if (!o.evidenceNiveau) problems.push("evidence_niveau");
    if (!o.status) problems.push("status");
    if (!o.laatstGecontroleerdOp) problems.push("laatst_gecontroleerd_op");
    if (o.typeObject === "aandoening") {
      if (!o.behandelverantwoordelijkheid) problems.push("behandelverantwoordelijkheid");
      if (!o.behandeldiepte) problems.push("behandeldiepte");
      if (o.tier === null) problems.push("tier");
    }
    if (problems.length) {
      console.log(`${o.id}: ontbreekt ${problems.join(", ")}`);
      missing++;
    }
  }
  console.log(missing === 0 ? "OK: geen verplichte velden ontbreken." : `${missing} object(en) met ontbrekende verplichte velden.`);

  console.log("\n=== Tier 3 zichtbaar_patient check ===");
  const tier3Wrong = objects.filter((o) => o.tier === 3 && o.zichtbaarPatient);
  console.log(
    tier3Wrong.length === 0
      ? "OK: alle Tier 3-objecten hebben zichtbaar_patient = false."
      : `FOUT bij: ${tier3Wrong.map((o) => o.id).join(", ")}`
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
