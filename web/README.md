# Duizeligheid — web (stap 2 t/m 5)

React/Vite-frontend, achter een individueel therapeut-login (`src/auth/`,
stap 4), met drie tabs:

- **Modus A — Reasoning-flow** (`src/flow/`, stap 3, requirements §2.1): de
  interactieve BPPV-triage-tot-behandelstrategie-flow — logt sinds stap 4
  elke stap live weg naar een Sessie, en toont sinds stap 5 een
  AI-samengestelde patiëntvriendelijke uitleg vóór de vrijgave.
- **Modus B — Kennisbank raadplegen** (`src/components/KennisbankModus.tsx`,
  stap 2, requirements §2.2): een vrije zoek-/filterfunctie over de gevulde
  BPPV-kennisbank, los van elke reasoning-flow, met sinds stap 5 ook een
  vrije-tekst-vraagpaneel (`src/ai/`) bovenaan. Geen sessies, geen logging.
- **Mijn sessies** (`src/sessies/`, stap 4, requirements §27): eerdere,
  nog niet-verlopen sessies terugkijken en exporteren.

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

**Sessie-koppeling (stap 4)**: `ReasoningFlow.tsx` start bij de eerste echte
handeling (meestal de triagekeuze — niet zomaar bij het openen van de tab,
anders zou elke paginaherlaad een lege sessie achterlaten) een `Sessie` via
`POST /api/sessies`, synchroniseert daarna elke nieuwe redeneerspoor-entry
als `StapLog`, en koppelt `aandoening_id` zodra een subtype bevestigd wordt.
Op de afsluitende schermen (afgerond/verwezen/follow-up-resultaat) toont
`SamenvattingPaneel.tsx` de live opgebouwde sessie-samenvatting met
kopieer-, print- en exporteerknoppen (requirements §2.3).

## Modus B — Kennisbank raadplegen

- **Rol-wisselknop** (Therapeut-weergave / Patiënt-weergave): een
  contentweergave-schakelaar, los van de echte authenticatie — patiënten
  hebben in dit product geen eigen account (referentiedocument §24), dus
  er valt voor die kant niets te authenticeren. De backend dwingt de
  zichtbaarheidsregel (`zichtbaar_therapeut`/`zichtbaar_patient`) af op
  basis van deze rol — zie `server/src/visibility.ts`.
- **Zoeken** op naam/kernbeschrijving/klinische kenmerken, **filteren** op
  objecttype en tier (requirements §2.2).
- **Detailweergave** per object: alle velden plus de relaties in beide
  richtingen (bevinding/interpretatie, diagnostische waarde, actietype,
  differentiaaltype, etc.), met doorklikbare links naar gerelateerde
  objecten. Red-flag-relaties met `actietype = acuut_verwijzen` zijn visueel
  gemarkeerd.

## Authenticatie + Mijn sessies (stap 4)

- **`src/auth/`**: `AuthProvider`/`useAuth` (haalt `/api/auth/me` op bij
  laden), `AuthScreen.tsx` (login/registratie-formulier, toont er één
  tegelijk). De hele `AppShell` rendert pas na een geldige sessie.
- **`src/sessies/SessiesOverzicht.tsx`**: lijst van eigen, nog niet-verlopen
  sessies (§5.1) + detailweergave met samenvatting, alle stappen, en een
  exporteerknop — requirements §27 ("terugkijken op een eerder consult").

## AI-laag (stap 5)

- **`src/ai/VraagPaneel.tsx`** (in Modus B): vrije-tekst-vraag aan de
  kennisbank. Toont altijd het antwoord mét de gebruikte object-id's en
  evidence-niveaus (traceerbaarheid), een expliciete melding bij geen match,
  en een rode waarschuwingskaart bij escalatie (een gedeeltelijke match met
  een `actietype = acuut_verwijzen`-relatie) — nooit stil weggelaten of
  afgezwakt.
- **`src/ai/AiEducatieBlok.tsx`** (in Modus A, stap "Patiënteducatie"): de
  AI-samengestelde, patiëntvriendelijke versie van het educatie-item + zijn
  samengevoegde alarmsignalen, zichtbaar vóór de vrijgave-knop — de
  therapeut ziet dus precies wat er zou worden vrijgegeven, met bron-
  object-id's, vóórdat vrijgave een aparte, expliciete handeling is
  (ongewijzigd t.o.v. stap 3).

## Structuur

```
src/api.ts                       Fetch-helpers naar de Modus B-API
src/types.ts                     Types die de Modus B-API-responses spiegelen
src/App.tsx                      Shell: auth-gate + modus-tabs (A/B/Sessies)
src/components/KennisbankModus.tsx    Modus B: zoeken/filteren/detail + vraagpaneel
src/components/SearchFilters.tsx Zoekbalk, rol-wisselknop, type-/tier-filters
src/components/ResultsList.tsx   Resultatenlijst
src/components/ObjectDetailPanel.tsx  Detailweergave inclusief relaties
src/flow/types.ts                Types voor de flow-databundel + flow-state
src/flow/reducer.ts              De reasoning-flow-stapmachine
src/flow/logic.ts                Kleine pure helpers (hypothesen, redeneerspoor)
src/flow/ReasoningFlow.tsx       Modus A: rendert elke stap + sessie-sync-effects
src/flow/HypothesePanel.tsx      Doorlopend zichtbare hypothesenlijst + redeneerspoor
src/flow/RedFlagModal.tsx        De blokkerende rode-vlag-interrupt
src/flow/SamenvattingPaneel.tsx  Live/geëxporteerde sessie-samenvatting + kopiëren/printen
src/auth/AuthContext.tsx         AuthProvider/useAuth
src/auth/AuthScreen.tsx          Login-/registratieformulier
src/auth/api.ts                  Fetch-helpers naar /api/auth/*
src/sessies/SessiesOverzicht.tsx "Mijn sessies": lijst + detail + exporteren
src/ai/VraagPaneel.tsx           Vrije-tekst-vraag met traceerbaar/escalerend antwoord
src/ai/AiEducatieBlok.tsx        AI-samengestelde patiëntuitleg in de flow
src/ai/api.ts                    Fetch-helpers naar /api/ai/*
src/sessies/api.ts               Fetch-helpers naar /api/sessies/*
```
