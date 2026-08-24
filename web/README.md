# Duizeligheid — web (stap 2: Modus B, kennisbank raadplegen)

React/Vite-frontend voor requirements §2.2: een vrije zoek-/filterfunctie
over de gevulde BPPV-kennisbank uit `../server`, los van elke reasoning-flow.
Geen sessies, geen logging — puur raadplegen.

## Draaien

Vereist dat de API in `../server` draait (`npm run dev` daar, op poort 4000
— zie `vite.config.ts` voor de proxy-configuratie).

```bash
npm install
npm run dev   # http://localhost:5173
```

## Wat erin zit

- **Rol-wisselknop** (Therapeut-weergave / Patiënt-weergave): simuleert de
  gebruikersrol zolang er nog geen echte authenticatie is (die hoort bij
  stap 4). De backend dwingt de zichtbaarheidsregel (`zichtbaar_therapeut`/
  `zichtbaar_patient`) af op basis van deze rol — zie `server/src/visibility.ts`.
- **Zoeken** op naam/kernbeschrijving/klinische kenmerken, **filteren** op
  objecttype en tier (requirements §2.2).
- **Detailweergave** per object: alle velden plus de relaties in beide
  richtingen (bevinding/interpretatie, diagnostische waarde, actietype,
  differentiaaltype, etc.), met doorklikbare links naar gerelateerde
  objecten. Red-flag-relaties met `actietype = acuut_verwijzen` zijn visueel
  gemarkeerd.

## Structuur

```
src/api.ts                       Fetch-helpers naar de API
src/types.ts                     Types die de API-responses spiegelen
src/components/SearchFilters.tsx Zoekbalk, rol-wisselknop, type-/tier-filters
src/components/ResultsList.tsx   Resultatenlijst
src/components/ObjectDetailPanel.tsx  Detailweergave inclusief relaties
```
