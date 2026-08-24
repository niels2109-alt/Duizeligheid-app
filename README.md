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
- ⬜ Stap 4 — Sessie + samenvatting, authenticatie, encryptie
- ⬜ Stap 5 — AI-laag

## Structuur

```
server/   Datamodel (Prisma/SQLite) + seed met BPPV-content + Express-API
web/      React/Vite-frontend: Modus A (reasoning-flow) + Modus B (kennisbank)
```

## Draaien (stap 1-3)

```bash
# Backend + database
cd server
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev              # API op http://localhost:4000

# Frontend (aparte terminal)
cd web
npm install
npm run dev               # interface op http://localhost:5173 (proxyt /api naar :4000)
```

Zie `server/README.md` en de map `web/` voor meer detail per onderdeel.
