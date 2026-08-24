# Duizeligheid — web (stap 2 + 3: Modus A + Modus B)

React/Vite-frontend met twee modi, geschakeld via de tabs bovenaan:

- **Modus A — Reasoning-flow** (`src/flow/`, stap 3, requirements §2.1): de
  interactieve BPPV-triage-tot-behandelstrategie-flow.
- **Modus B — Kennisbank raadplegen** (`src/components/KennisbankModus.tsx`,
  stap 2, requirements §2.2): een vrije zoek-/filterfunctie over de gevulde
  BPPV-kennisbank, los van elke reasoning-flow. Geen sessies, geen logging.

## Draaien

Vereist dat de API in `../server` draait (`npm run dev` daar, op poort 4000
— zie `vite.config.ts` voor de proxy-configuratie).

```bash
npm install
npm run dev   # http://localhost:5173
```

## Modus A — Reasoning-flow

Een stap-machine (`src/flow/reducer.ts`, `useReducer`) die de zeven
workflow-stappen uit referentiedocument §22 doorloopt, specifiek voor BPPV
(`uitkomsttype = enkelvoudig` — de samengesteld-uitkomst-logica is bewust nog
niet gebouwd, zie requirements §6.2 stap 3):

1. **Triage**: opent bewust meerdere hypothesen tegelijk — BPPV + alle
   differentiaaldiagnose-kandidaten uit de database. Kies je een pad buiten
   BPPV, dan toont het systeem eerlijk "nog niet volledig uitgewerkt" i.p.v.
   te doen alsof er geredeneerd wordt.
2. **Anamnese**: checklist op basis van de bestaande red-flag-relaties.
3. **Testselectie**: testen gesorteerd op diagnostische waarde.
4. **Interpretatie**: toont altijd bevinding, interpretatie, object-id's en
   evidence-niveau — nooit een kale conclusie (requirements §2.1 punt 4).
5. **Rode-vlag-interrupt**: een blokkerende modal (`RedFlagModal.tsx`) zodra
   een `actietype = acuut_verwijzen`-relatie matcht — niet wegklikbaar zonder
   expliciete bevestiging (requirements §2.1 punt 5). Na bevestiging kiest de
   therapeut zelf: traject beëindigen of doorgaan op eigen klinisch oordeel.
6. **Behandelstrategie**: interventievoorstel + verplichte contra-indicatie-
   check. Voor het anterior kanaal (geen gevalideerde standaardinterventie in
   de kennisbank) toont het systeem dat eveneens eerlijk, i.p.v. iets te
   verzinnen.
7. **Patiënteducatie-vrijgave**: losse, expliciete actie.
8. **Follow-up-consult**: lichte, handmatige instap (geen sessiehistorie —
   die komt bij stap 4) die het BPPV-hertest-patroon toont.

De doorlopend zichtbare `HypothesePanel` toont de gewogen hypothesenlijst
(hoog/matig/laag, nooit een score) mét redenen, en een redeneerspoor van elke
stap — het "geen black box"-principe uit referentiedocument §12/§22.

Er is in deze bouwstap geen sessie-opslag: de flow-state leeft alleen in de
browser zolang de pagina open staat (`src/flow/reducer.ts`); dat komt bij
stap 4 met de `Sessie`-entiteit.

## Modus B — Kennisbank raadplegen

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
src/types.ts                     Types die de Modus B-API-responses spiegelen
src/App.tsx                      Shell met modus-tabs (A/B)
src/components/KennisbankModus.tsx    Modus B: zoeken/filteren/detail
src/components/SearchFilters.tsx Zoekbalk, rol-wisselknop, type-/tier-filters
src/components/ResultsList.tsx   Resultatenlijst
src/components/ObjectDetailPanel.tsx  Detailweergave inclusief relaties
src/flow/types.ts                Types voor de flow-databundel + flow-state
src/flow/reducer.ts              De reasoning-flow-stapmachine
src/flow/logic.ts                Kleine pure helpers (hypothesen, redeneerspoor)
src/flow/ReasoningFlow.tsx       Modus A: rendert elke stap
src/flow/HypothesePanel.tsx      Doorlopend zichtbare hypothesenlijst + redeneerspoor
src/flow/RedFlagModal.tsx        De blokkerende rode-vlag-interrupt
```
