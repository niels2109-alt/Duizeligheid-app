# Duizeligheid-app

Webapplicatie op basis van `Duizeligheid-Referentiemodel.md` (het klinische
kennismodel) en `Duizeligheid-Technische-Requirements-MVP.md` (de technische
requirements, bouwplan in §6). Wordt stapsgewijs gebouwd volgens de
bouwvolgorde in §6.2 — elke stap losstaand opgeleverd en getest voordat de
volgende begint.

## Voortgang

- ✅ **Stap 1 — Datamodel + BPPV-content** (`server/`): database opgezet
  volgens requirements §1, gevuld met de volledige BPPV-content uit het
  referentiedocument §2-6.
- ✅ **Stap 2 — Modus B: kennisbank raadplegen** (`server/` API + `web/`):
  zoek-/filterinterface over de gevulde data, los van elke reasoning-flow.
- ✅ **Stap 3 — Modus A: reasoning-flow** (`server/` API + `web/`): de
  interactieve BPPV-triage-tot-behandelstrategie-flow, met rode-vlag-
  interrupt en een doorlopend zichtbaar redeneerspoor.
- ✅ **Stap 4 — Sessie + samenvatting, authenticatie, encryptie**
  (`server/` + `web/`): individueel therapeut-account, elke reasoning-flow
  logt live weg naar een versleutelde Sessie, met een 90-dagen-bewaartermijn
  (automatisch, of direct bij export) en een "Mijn sessies"-overzicht.
- ✅ **Stap 5 — AI-laag** (`server/` + `web/`): een deterministische kern
  (tokenoverlap-matching over de kennisbank) die op elke vraag altijd
  traceerbaar antwoordt — met de gebruikte object-id's en evidence-niveaus,
  een expliciete melding bij geen match, en escalatie vooraan bij een
  gedeeltelijke match met een `actietype = acuut_verwijzen`-relatie — plus
  een optionele Claude-verfijningslaag die alleen herformuleert, nooit
  nieuwe inhoud toevoegt (valt zonder API-sleutel automatisch terug op de
  deterministische tekst). Zichtbaar in Modus B (vrije-tekst-vraagpaneel) en
  in Modus A (samengestelde patiëntuitleg vóór de vrijgave-knop).

## Structuur

```
server/   Datamodel (Prisma/SQLite) + seed + Express-API (kennisbank, flow-data, auth, sessies, AI-laag)
web/      React/Vite-frontend: Modus A (reasoning-flow) + Modus B (kennisbank) + Mijn sessies, achter login
```

## Draaien (stap 1-5)

```bash
# Backend + database
cd server
npm install
cp .env.example .env
# Vul in .env je eigen ENCRYPTION_KEY en JWT_SECRET in — zie de
# genereer-commando's in .env.example, of gebruik zonder wijzigen de
# placeholders niet (die werken niet echt).
# ANTHROPIC_API_KEY is optioneel (stap 5) — zonder sleutel blijft de AI-laag
# volledig functioneel op de deterministische kern, zie server/README.md.
npx prisma migrate dev
npx prisma db seed
npm run dev              # API op http://localhost:4000

# Frontend (aparte terminal)
cd web
npm install
npm run dev               # interface op http://localhost:5173 (proxyt /api naar :4000)
```

Open de interface, registreer een therapeut-account (e-mail + wachtwoord,
géén demo-account vooraf aangemaakt), en je bent binnen.

Zie `server/README.md` en de map `web/` voor meer detail per onderdeel.
