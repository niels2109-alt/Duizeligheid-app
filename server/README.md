# Duizeligheid — server (stap 1 + 2 + 3 + 4)

Bevat het datamodel + BPPV-content (**stap 1**), de API voor Modus B,
kennisbank raadplegen (**stap 2**), de databundel voor Modus A, de
reasoning-flow (**stap 3**), en Sessie-opslag + authenticatie + encryptie
(**stap 4**), uit `Duizeligheid-Technische-Requirements-MVP.md` §6.2. Voor
de bijbehorende interfaces, zie `../web`.

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
  1.3, 1.4. `Sessie`/`StapLog` (§1.5) en `Therapeut` (§5.2) zijn toegevoegd
  in stap 4 — zie de sectie daarover onderaan dit document.
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

**Over de `rol`-parameter**: dit blijft een contentweergave-schakelaar
(therapeut/patiënt), los van de echte authenticatie die stap 4 toevoegt —
patiënten hebben in dit product geen eigen account (referentiedocument §24:
toegang alleen via een door de therapeut vrijgegeven educatie-item, geen
zelfstandige kennisbanktoegang), dus er valt voor die kant niets te
authenticeren. De `rol` komt daarom nog steeds uit de request zelf (gezet
door de rol-wisselknop in `../web`); Modus B blijft bewust een puur
read-only naslagfunctie zonder sessiekoppeling (§2.2). De echte
authenticatie uit stap 4 beschermt wél de Sessie-endpoints hieronder (elke
Sessie hoort bij precies één ingelogde therapeut). Zichtbaarheidsregels
zelf worden zowel op het opgevraagde object als op elke relatie
ernaartoe/vanuit afgedwongen — zie `src/visibility.ts`.

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
zonder echte sessiehistorie-lookup — zie hieronder voor hoe de sessie er nu
wél echt naast bijgehouden wordt.

## Authenticatie + Sessie-opslag + encryptie (stap 4)

Drie eisen uit §6.2 die "vanaf het begin meebouwen" moesten, niet los erbij:

### Authenticatie (§5.2)

Individueel account per therapeut, e-mail + wachtwoord (bcrypt, 12 rounds)
— geen magic link (zou een externe e-mailprovider vereisen, niet
zelfstandig end-to-end testbaar in deze omgeving), geen 2FA/SSO. Sessie-
cookie met een JWT (7 dagen geldig, `httpOnly`, `sameSite=lax`). Zie
`src/auth.ts`.

| Endpoint | Omschrijving |
|---|---|
| `POST /api/auth/register` | `{email, wachtwoord}` → account + ingelogd |
| `POST /api/auth/login` | `{email, wachtwoord}` → ingelogd |
| `POST /api/auth/logout` | Cookie wissen |
| `GET /api/auth/me` | Huidige therapeut, of 401 |

### Sessie + sessie-samenvatting (§1.5, §2.3)

Elke Sessie hoort bij precies één therapeut (`requireAuth`-middleware op
`src/sessies.ts`, met een expliciete eigenaarschapscheck per request — een
andere therapeut krijgt 404, niet 403, om niet te lekken dát de sessie
bestaat). Bevat bewust geen patiëntnaam (§1.5).

| Endpoint | Omschrijving |
|---|---|
| `POST /api/sessies` | Start een sessie, zet `vervalt_op` = nu + 90 dagen |
| `GET /api/sessies` | Eigen, nog niet-verlopen sessies |
| `PATCH /api/sessies/:id` | `{aandoeningId}` — gezet zodra de flow convergeert |
| `POST /api/sessies/:id/stappen` | Eén StapLog toevoegen |
| `GET /api/sessies/:id` | Detail + live opgebouwde samenvatting (of de bevroren versie, ná export) |
| `POST /api/sessies/:id/export` | Genereert + bewaart de definitieve samenvatting, zet `vervalt_op` = nu |

### Bewaartermijn (§5.1)

90 dagen na start, of direct bij export. Een simpele in-process opschoning
(`src/cleanup.ts`, elk uur + eenmaal bij opstarten) verwijdert sessies waarvan
`vervalt_op` is bereikt — `StapLog`-rijen verdwijnen automatisch mee
(`onDelete: Cascade`). Een losstaande cronjob is de gebruikelijke
productie-opzet hiervoor; dat is een hostingbeslissing die buiten deze
lokale codebase valt, vandaar de in-process aanpak voor deze bouwstap.

### Encryptie bij opslag (§5.3)

`StapLog.bevinding` en `Sessie.samenvatting` — de klinische inhoud van een
sessie (referentiedocument §23: bijzondere persoonsgegevens, ook zonder
patiëntnaam) — worden versleuteld opgeslagen met AES-256-GCM
(`src/crypto.ts`, sleutel uit `ENCRYPTION_KEY`). Wachtwoorden staan als
bcrypt-hash, nooit in leesbare vorm. TLS bij verzending en een EU-gevestigde
hostingprovider (de andere twee onderdelen van §5.3) zijn deployment-
beslissingen die pas relevant worden bij een echte hosting-omgeving — niet
iets dat vanuit deze lokale codebase af te dwingen valt.

**Verifiëren dat het echt versleuteld is:**
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.stapLog.findMany().then(rows => { rows.forEach(r => console.log(r.bevindingEnc)); return p.\$disconnect(); });
"
```
Dit toont onleesbare tekst — de API (via `src/crypto.ts`) ontsleutelt pas bij
het uitlezen.
