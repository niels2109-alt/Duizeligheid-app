# Duizeligheid — server (stap 1 + 2 + 3)

Bevat het datamodel + BPPV-content (**stap 1**), de API voor Modus B,
kennisbank raadplegen (**stap 2**), en de databundel voor Modus A, de
reasoning-flow (**stap 3**), uit `Duizeligheid-Technische-Requirements-
MVP.md` §6.2. Voor de bijbehorende interfaces, zie `../web`.

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

## API (stap 2 — Modus B: kennisbank raadplegen)

Lichte Express-API bovenop dezelfde database, voor requirements §2.2: vrije
zoek-/filterfunctie, filterbaar op `type_object` en `tier`, met afdwinging
van `zichtbaar_therapeut`/`zichtbaar_patient` per rol. Puur read-only — geen
koppeling aan een Sessie, geen logging.

```bash
npm run dev     # start de API op http://localhost:4000 (auto-reload)
```

Endpoints:

| Endpoint | Omschrijving |
|---|---|
| `GET /api/meta` | Beschikbare `type_object`- en tier-waarden, voor de filter-UI |
| `GET /api/objects?q=&type=&tier=&rol=` | Zoeken/filteren. `rol` = `therapeut` (default) of `patient`; `type` accepteert een komma-gescheiden lijst |
| `GET /api/objects/:id?rol=` | Volledig detail van één object, inclusief relaties in beide richtingen. 404 als het object niet bestaat of niet zichtbaar is voor de opgegeven rol |
| `GET /api/health` | Health check |

**Over de `rol`-parameter**: er is in deze bouwstap nog geen echte
authenticatie (die hoort bij stap 4, §5.2) — de rol komt hier voorlopig uit
de request zelf (gezet door de rol-wisselknop in `../web`). De
zichtbaarheidsregel zélf wordt al wel echt afgedwongen (zowel op het
opgevraagde object als op elke relatie ernaartoe/vanuit), alleen de identiteit
van de gebruiker nog niet geverifieerd. Zie `src/visibility.ts`.

## Reasoning-flow-databundel (stap 3 — Modus A)

`GET /api/flow/bppv` (`src/flow.ts`) levert één samengestelde bundel met alle
KnowledgeObjects/relaties die de BPPV-reasoning-flow nodig heeft (hypothesen,
anamnese-checks, testen met hun bevindingen, interventies met hun
contra-indicaties, patiënteducatie) — zodat de frontend niet zelf meerdere
calls hoeft te combineren. De reasoning zelf (hypotheseweging, rode-vlag-
interrupt, stapmachine) gebeurt client-side in `../web/src/flow/` — deze
route levert alleen de brondata.

Scope-beslissingen (afgestemd met opdrachtgever): de triage houdt bewust
meerdere hypothesen open (BPPV + alle differentiaaldiagnose-kandidaten uit
stap 1), maar alleen BPPV heeft in deze bouwronde echte anamnese-/test-/
interventiecontent — voor de overige (stub-)hypothesen toont de frontend
expliciet "nog niet volledig uitgewerkt" i.p.v. te doen alsof er geredeneerd
wordt. Follow-up-consult (workflow-stap 7) is een lichte, handmatige instap
zonder echte sessiehistorie — Sessie-opslag hoort bij stap 4.
