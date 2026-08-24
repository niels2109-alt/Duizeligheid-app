# Duizeligheid — server (stap 1: datamodel + BPPV-content)

Dit is **stap 1** uit `Duizeligheid-Technische-Requirements-MVP.md` §6.2:
het datamodel (§1) opzetten en vullen met de volledige BPPV-content uit
`Duizeligheid-Referentiemodel.md` §2-6. Er is nog geen interface en geen
reasoning-flow — alleen een gevulde, controleerbare database.

## Stack

- Node.js + TypeScript
- [Prisma](https://www.prisma.io/) (versie 6.19.3 — bewust niet op de op dit
  moment nieuwste major, Prisma 7, gezet omdat die een nieuwe
  `prisma.config.ts`/driver-adapter-opzet vereist die voor deze MVP-stap
  onnodige complexiteit toevoegt)
- SQLite (lokaal databasebestand, `server/prisma/dev.db` — makkelijk in te
  zien, later voor productie te vervangen door een EU-gehoste Postgres o.i.d.,
  zie requirements §5.3)

## Installeren en opnieuw opbouwen

```bash
cd server
npm install
cp .env.example .env      # als .env nog niet bestaat
npx prisma migrate dev    # bouwt het schema op (leeg)
npx prisma db seed        # vult de database met de BPPV-content
```

`npx prisma db seed` mag je opnieuw draaien op een lege database; op een
database die de content al bevat, geeft dat een fout op de unieke id's (dat
is bedoeld — geen dubbele content).

## De database controleren

**Optie A — visueel (aanbevolen):**

```bash
npx prisma studio
```

Opent een lokale webinterface (standaard op `localhost:5555`) waarin je alle
tabellen kunt doorbladeren, filteren en de relaties tussen objecten kunt
volgen.

**Optie B — geautomatiseerde verificatie:**

```bash
npx ts-node prisma/verify.ts
```

Controleert: telling per objecttype, of alle relaties naar bestaande
objecten verwijzen, of verplichte velden overal ingevuld zijn, en of alle
Tier 3-objecten `zichtbaar_patient = false` hebben.

## Wat zit erin

- **Schema** (`prisma/schema.prisma`): `KnowledgeObject`, `Relatie`,
  `PatientEducatieObject` — rechtstreekse vertaling van requirements §1.1,
  1.3, 1.4. De `Sessie`/`StapLog`-entiteiten (§1.5) zijn hier bewust nog niet
  gebouwd; die horen bij bouwstap 4 (§6.2).
- **Seed** (`prisma/seed.ts`): 26 knowledge objects, 33 relaties, 1
  patiënteducatie-object. Zie de uitgebreide toelichting bovenaan dat bestand
  voor de modelleringsbeslissingen (afgestemd met de opdrachtgever) en de
  aannames die nog controle verdienen.

### Objectenoverzicht (26)

| Type | Aantal | Id's |
|---|---|---|
| aandoening | 7 | AAND-001 (BPPV, volledig uitgewerkt), AAND-002/AAND-003/STUB-* (differentiaaldiagnose-stubs) |
| onderzoekstest | 2 | TEST-001, TEST-002 |
| interventie | 4 | INT-001 t/m INT-004 |
| contra-indicatie | 5 | CI-001 t/m CI-005 |
| red-flag | 6 | RF-001 t/m RF-006 |
| patiënteducatie-item | 1 | EDU-001 |
| clinical-pearl | 1 | PEARL-001 |

### Relaties (33)

Testbevindingen → interpretaties, interventie-indicaties, contra-indicatie-
koppelingen, red-flag-triggers, de clinical-pearl-koppeling, en de zes
differentiaaldiagnose-relaties — zie `prisma/seed.ts` voor de volledige
inhoud per relatie.
