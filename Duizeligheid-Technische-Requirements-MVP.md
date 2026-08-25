# Technische Requirements — BPPD-MVP
### Vertaling van het theoretisch referentiemodel naar een bouwbare specificatie

Dit document vertaalt `Duizeligheid-Referentiemodel.md` naar requirements die een developer of AI-coding-omgeving kan gebruiken om de MVP te bouwen. Geen technologiekeuzes (geen framework/database/hosting-advies) — dat is een aparte, latere beslissing. Scope: uitsluitend wat in §13 van het referentiedocument is vastgesteld als MVP.

---

## 1. Datamodel

### 1.1 Entiteit: KnowledgeObject

| Veld | Type | Verplicht | Toelichting |
|---|---|---|---|
| `id` | string, uniek | ja | Nooit hergebruiken, ook niet na verwijdering |
| `naam` | string | ja | |
| `type_object` | enum (10 waarden, zie 1.2) | ja | Gesloten lijst |
| `behandelverantwoordelijkheid` | enum: zelfstandig-fysio / gedeeld-multidisciplinair / niet-fysio-verwijzen | ja (bij type=aandoening) | |
| `behandeldiepte` | enum: volledig / beperkt / geen | ja (bij type=aandoening) | |
| `tier` | int (1/2/3), afgeleid | ja (bij type=aandoening) | Afgeleid uit bovenstaande twee, niet los invoerbaar |
| `uitkomsttype` | enum: enkelvoudig / samengesteld | ja (bij type=aandoening) | Stuurt reasoning-flow-gedrag, zie §3 |
| `kernbeschrijving` | text | ja | |
| `klinische_kenmerken` | text | nee | |
| `evidence_niveau` | enum: richtlijn / systematic-review / rct / observationeel / consensus / expert-opinion / eigen-klinische-expertise | ja | Verplicht zichtbaar in elke weergave, nooit weggelaten |
| `bronnen` | array van {auteur, jaar, type, link} | nee | |
| `status` | enum: concept / in-review / gepubliceerd / verouderd | ja | |
| `laatst_gecontroleerd_op` | datum | ja | |
| `zichtbaar_therapeut` | boolean | ja | Vrijwel altijd true |
| `zichtbaar_patient` | boolean | ja | False voor alle Tier 3-objecten, geen uitzondering |

### 1.2 Gesloten lijst `type_object`
aandoening, symptoom, onderzoekstest, interventie, red-flag, patiënteducatie-item, clinical-pearl, prognostische-factor, contra-indicatie, anamnese-item

**Subtype-toevoeging**: `FACTOR-xxx`-objecten (aggregatie-relaties bij samengestelde aandoeningen) zijn `type_object = prognostische-factor`, geen apart hoofdtype.

### 1.3 Entiteit: Relatie

| Veld | Type | Toelichting |
|---|---|---|
| `id` | string, uniek | |
| `van_object_id` | FK → KnowledgeObject | |
| `naar_object_id` | FK → KnowledgeObject | |
| `relatie_type` | enum: bevinding-interpretatie / voorwaarde / aggregatie / signalering-opvolging / differentiaal | Bepaalt welke overige velden van toepassing zijn |
| `kwalificatie` | key-value set (bijv. subtype=posterior, fase=acuut, lateraliteit=bilateraal) | Vrij uitbreidbaar per aandoening, niet hardcoded per type |
| `bevinding` | text, nullable | Bij bevinding-interpretatie |
| `interpretatie` | text, nullable | Bij bevinding-interpretatie |
| `diagnostische_waarde` | enum: hoog / matig / laag, nullable | Kan **conditioneel** zijn (afhankelijk van een andere relatie — zie PPPD-voorbeeld in referentiedocument §19). Implementatie: veld mag een verwijzing naar een voorwaarde-relatie bevatten i.p.v. een vaste waarde |
| `relatietype_differentiaal` | enum: uitsluitend / comorbide, nullable | Alleen bij relatie_type=differentiaal |
| `bijdrage_gewicht` | enum: hoog / matig-hoog / matig, nullable | Alleen bij relatie_type=aggregatie |
| `patroon_type` | enum: verwachte-fluctuatie / afwijkend-beloop, nullable | Alleen bij follow-up-gerelateerde relaties |
| `actietype` | enum: acuut-verwijzen / hypothese-heroverwegen / samenwerking-adviseren, nullable | Alleen bij relaties naar red-flag-objecten |
| `evidence_niveau` | zelfde enum als 1.1 | Kan afwijken van het evidence-niveau van de gekoppelde objecten zelf (subvraag-niveau, zie referentiedocument §21 — blijft voorlopig vrije tekst, geen apart veld) |

### 1.4 Entiteit: PatiëntEducatieObject (specialisatie van KnowledgeObject, type=patiënteducatie-item)

| Veld | Type | Toelichting |
|---|---|---|
| `verwachtingsmanagement` | text | **Verplicht veld**, nadruk mag licht zijn |
| `rationale_uitleg_counterintuitief` | text, nullable | Alleen invullen waar van toepassing |
| `samengesteld` | boolean | True bij EDU-004-achtige, per-patiënt samengestelde educatie |
| `bron_object_ids` | array van FK | Objecten waaruit dit is opgebouwd |
| `signalering_object_ids` | array van FK → red-flag-objecten | Vertaalde, samengevoegde alarmsignalen |
| `leesniveau` | **niet geïmplementeerd in MVP** | Open modelveld, zie referentiedocument §1 — wacht op meer contentvoorbeelden |

### 1.5 Entiteit: Sessie (nieuw, uit §27-precisering)

| Veld | Type | Toelichting |
|---|---|---|
| `sessie_id` | string, uniek | |
| `gestart_op` | timestamp | |
| `aandoening_id` | FK, nullable | Pas gezet zodra de flow convergeert |
| `stappen` | array van StapLog | |
| `samenvatting` | text, gegenereerd | Zie §3.3 |
| `vervalt_op` | datum | **Verplicht, geen default** — zie §5.1, expliciete open beslissing |

**StapLog** (sub-object van Sessie): `stap_type` (triage/anamnese/test/interpretatie/strategie/educatie/followup), `object_ids_gebruikt` (array), `bevinding` (text), `timestamp`.

**Expliciete eis**: Sessie bevat geen patiëntnaam of ander direct identificerend gegeven — alleen klinische inhoud van de sessie zelf. Identificatie (welke patiënt) is de verantwoordelijkheid van het bestaande EPD van de therapeut, niet van deze tool.

---

## 2. Functionele requirements per modus

### 2.1 Modus A — Reasoning-flow (referentiedocument §22, stappen 1-7)

1. Triagevraag opent **meerdere** hypothese-sets tegelijk (nooit één pad forceren) — implementatie: eerste vraag retourneert een set van kandidaat-`aandoening`-objecten, geen enkele
2. Adaptieve anamnese: elke ingevoerde `bevinding` triggert herberekening van de gewogen hypothese-lijst (hoog/matig/laag) op basis van gekoppelde `bevinding-interpretatie`-relaties
3. Testselectie: sorteer beschikbare testen op `diagnostische_waarde` (aflopend) t.o.v. de hoogst gewogen hypothese; bij `uitkomsttype = samengesteld` toon in plaats daarvan een prioriteitenlijst van te screenen `FACTOR`-objecten
4. Interpretatiescherm toont verplicht: bevinding, interpretatie, gebruikte `object_ids`, `evidence_niveau` — nooit een kale conclusie zonder deze drie
5. **Rode-vlag-interrupt**: zodra een relatie met `actietype = acuut-verwijzen` matcht, moet de normale flow-voortgang geblokkeerd worden totdat de therapeut dit expliciet heeft gezien/bevestigd — dit is een harde eis, geen dismissible melding
6. Behandelstrategie: bij `uitkomsttype = enkelvoudig` één interventievoorstel + verplichte contra-indicatie-check vóór het scherm als "afgerond" geldt; bij `samengesteld` een tabel per factor
7. Patiënteducatie-vrijgave is een losse, expliciete actie van de therapeut — nooit automatisch getoond aan een patiëntaccount
8. Follow-up-consult: systeem haalt het `uitkomsttype` en gekoppelde `patroon_type`-relaties van de eerdere sessie op en past het bijbehorende follow-up-patroon toe (hertest / fase+interventie-effect / trendmatig / per-factor)

### 2.2 Modus B — Kennisbank raadplegen

- Vrije zoek-/filterfunctie over `KnowledgeObject`, filterbaar op `type_object` en `tier`
- Respecteert `zichtbaar_therapeut`/`zichtbaar_patient` per gebruikersrol
- Geen koppeling aan een Sessie — puur read-only raadplegen
- Geen sessie-logging nodig voor deze modus (geen privacyrelevante opslag)

### 2.3 Sessie-samenvatting

- Genereert leesbare samenvatting uit `Sessie.stappen`: gewogen hypothesen, uitgevoerde testen + bevindingen, gekozen interventie, vervolgadvies
- Exporteerbaar (kopieerbaar/printbaar) door de therapeut, voor overname in eigen EPD
- **Geen structurele API-koppeling met externe EPD-systemen in MVP** — export is handmatig (kopiëren/printen), geen geautomatiseerde integratie
- Moet, bij het bereiken van `vervalt_op`, automatisch verwijderd worden — zie §5.1

---

## 3. AI-interactie — concrete implementatie-eisen

Vertaling van referentiedocument §12/§20 naar toetsbare eisen:

1. **Traceerbaarheid**: elke AI-gegenereerde tekst bevat een verplichte lijst van gebruikte `object_ids`. Een antwoord zonder deze lijst is een implementatiefout, geen acceptabele output.
2. **Geen-antwoord-scenario**: als een vraag niet dekt wordt door bestaande `KnowledgeObject`-relaties, retourneert het systeem een expliciete "niet in kennisbank"-melding — nooit een door het onderliggende taalmodel zelf aangevulde tekst.
3. **Escalatie bij twijfel**: bij dubbelzinnige input die gedeeltelijk matcht met een `actietype = acuut-verwijzen`-relatie, wordt de voorzichtigste interpretatie getoond, niet de meest waarschijnlijke.
4. **Gepersonaliseerde educatie** (EDU-004-achtig): alleen variabele content-blokken tonen die corresponderen met `FACTOR`-objecten die in déze sessie daadwerkelijk zijn bevestigd — nooit ongebruikte factoren "voor de zekerheid" meenemen.
5. **Geen vrije generatie van klinische claims**: AI-laag mag uitsluitend parafraseren/samenvoegen/vertalen van bestaande `KnowledgeObject`-content, nooit nieuwe klinische beweringen toevoegen die niet herleidbaar zijn tot een object-id.

---

## 4. Expliciet buiten scope voor deze bouwfase

Ongewijzigd t.o.v. referentiedocument §13: patiëntapp, overige drie aandoeningen, verwijzersfunctionaliteit, volledige dossiervoering/EPD-integratie (behalve de lichte, tijdelijke sessie-samenvatting uit §1.5/2.3), praktijkbeheer (multi-user/meerdere therapeuten per account), brede logging/analytics, geautomatiseerde EPD-koppeling.

---

## 5. Vastgestelde beslissingen (voorheen open)

**5.1 Bewaartermijn sessie-samenvatting** (`vervalt_op`)
**Besluit**: automatisch verwijderen 90 dagen na sessie-einde, of direct zodra de therapeut heeft geëxporteerd (dan al overgenomen in eigen EPD, kopie hier niet langer nodig). **Waarom**: 90 dagen dekt een realistisch BPPD-vervolgtraject (doorgaans 1-3 sessies, enkele weken) ruim, zonder tegen AVG-dataminimalisatie in te gaan. Geen handmatige actie van de therapeut vereist — verval gebeurt automatisch.

**5.2 Authenticatie/toegang**
**Besluit**: individueel account per therapeut (e-mail + wachtwoord of magic link), geen gedeeld/generiek account. Geen 2FA/SSO vereist in deze fase. **Waarom**: passend bij klein/zelfstandig beginnen (§11) — zwaardere authenticatie is toe te voegen bij opschaling, niet nodig bij een kleine pilot. Individueel (niet gedeeld) account is wel niet-onderhandelbaar, gezien de tijdelijk opgeslagen bijzondere persoonsgegevens.

**5.3 Beveiligingsniveau data-opslag**
**Besluit**: standaard encryptie bij opslag én tijdens verzending (HTTPS), bij een EU-gevestigde hostingprovider. **Waarom**: dit niveau is bij vrijwel elke gerenommeerde moderne provider standaard aanwezig, vraagt geen aparte investering of beveiligingsexpertise. EU-vestiging vereenvoudigt de AVG-verwerkersovereenkomst aanzienlijk t.o.v. een niet-EU-provider. Geen zwaardere certificeringseisen nodig op deze schaal.

## 6. Bouwplan voor Claude Code

Dit is een aanvulling op §1-5, specifiek bedoeld om als startpunt mee te geven aan een AI-coding-omgeving. Doel: klein beginnen, bij elke stap iets testbaars opleveren, niet alles tegelijk laten bouwen.

### 6.1 Technologiekeuze (licht, geen zware architectuurdiscussie)
- **Webapplicatie** — werkt op elk apparaat, geen aparte iOS/Android-bouw nodig voor een pilot
- Gangbare, eenvoudige stack (bijv. React voor de interface, een lichte backend + database) — concrete versie/library-keuzes aan Claude Code overlaten, dat past bij wat op het moment van bouwen actueel en goed ondersteund is
- Datamodel uit §1 rechtstreeks vertaald naar databasetabellen: `knowledge_objects`, `relaties`, `patient_educatie_objecten`, `sessies`, `staplog`

### 6.2 Bouwvolgorde

**Stap 1 — Datamodel + BPPD-content**
Database opzetten volgens §1, gevuld met de volledige BPPD-content uit `Duizeligheid-Referentiemodel.md` (§2-6): AAND-001, alle subtypes, TEST-001/002, INT-001 t/m 004, RF-001 t/m 006, differentiaaldiagnose-relaties, EDU-001, PEARL-001. Oplevering: een gevulde database, nog geen interface.

**Stap 2 — Modus B: kennisbank raadplegen**
Eenvoudigste functionaliteit, geen flow-logica — goede eerste test of stap 1 correct werkt. Zoek-/filterinterface over de gevulde BPPD-data (§2.2).

**Stap 3 — Modus A: reasoning-flow**
De kern van het product, de zeven stappen uit §2.1, bovenop de in stap 1-2 geteste data. Voor BPPD is `uitkomsttype = enkelvoudig`, dus de samengesteld-uitkomst-logica (relevant voor het latere ouderenduizeligheid-item) hoeft in deze eerste bouwronde nog niet gebouwd te worden.

**Stap 4 — Sessie + samenvatting**
`Sessie`-entiteit (§1.5), sessie-samenvatting (§2.3), met de vastgestelde bewaartermijn (90 dagen/na export, §5.1), individuele authenticatie (§5.2), en encryptie bij een EU-provider (§5.3) — deze drie vanaf het begin meebouwen, niet achteraf toevoegen.

**Stap 5 — AI-laag**
Traceerbaarheid, geen-antwoord-scenario, escalatieprincipe (§3) — bovenop een reeds werkend, geteste basissysteem uit stap 1-4. Bewust als laatste stap: een AI-laag testen op een nog wankel fundament levert onbetrouwbare resultaten op.

### 6.3 Werkwijze-advies
Elke stap afzonderlijk aan Claude Code voorleggen, testen, en pas dan door naar de volgende — niet dit hele document in één keer laten bouwen. Dat is dezelfde "klein en behapbaar" filosofie die dit hele project vanaf de businessmodel-beslissing (§11) heeft gestuurd.

---

## 7. Aanvulling: Vestibulaire hypofunctie (tweede item)

Voortbouwend op §1-6. Datamodel (§1) en modi (§2) blijven ongewijzigd — dit item test primair de flexibiliteit van het bestaande model, niet een herontwerp.

### 7.1 Datamodel-aanvulling

**Nieuwe kwalificatievelden op relaties** (binnen het bestaande `kwalificatie` key-value veld, §1.3 — geen nieuwe kolom nodig):
- `fase`: acuut / chronisch-compensatie / geen-duidelijke-acute-fase
- `lateraliteit`: unilateraal / bilateraal

**Belangrijk verschil met BPPD's `subtype`**: `fase` is geen vast kenmerk maar een **tijdgebonden state** die tijdens het traject kan wijzigen. Implementatie-eis: bij elke sessie (§1.5) moet de actuele `fase`-waarde opnieuw vastgesteld worden, niet uit een eerdere sessie automatisch overgenomen worden — dit voorkomt dat een patiënt die inmiddels chronisch is, per ongeluk nog als "acuut" wordt behandeld.

**Twee onafhankelijke assen**: interventies/testen worden gekoppeld met een combinatie van `fase` én `lateraliteit`, niet met één kwalificatie zoals bij BPPD. Dit vraagt geen nieuwe databasestructuur (het bestaande key-value `kwalificatie`-veld ondersteunt meerdere sleutels per relatie al), wel een UI-eis: het interpretatiescherm (§2.1, stap 4) moet beide assen tegelijk tonen, niet na elkaar.

**Omgekeerde red-flag-logica bij TEST-003 (Head Impulse Test)**: een *normale* testuitslag is hier het alarmerende signaal (verdacht centraal), in tegenstelling tot BPPD waar een *afwijkende* uitslag naar een red flag leidt. Implementatie-eis: dit mag niet als generieke "afwijkend = alarm"-regel worden gecodeerd — de interpretatielogica moet per relatie expliciet vastleggen welke bevinding (normaal of afwijkend) tot welke actie leidt, nooit een omgekeerde aanname op basis van andere items.

### 7.2 Uitkomsttype

`uitkomsttype = enkelvoudig` (zelfde als BPPD) — dit item vereist dus **niet** de samengesteld-uitkomst-logica die pas bij het vierde item (multifactoriële duizeligheid met valrisico) nodig wordt. Geen aanvullende reasoning-flow-wijziging nodig op dit punt.

### 7.3 Follow-up-aanvulling

Twee gekoppelde evaluatielussen in plaats van BPPD's ene (referentiedocument §14): fase-voortgang én interventie-effectiviteit, die onafhankelijk van elkaar kunnen afwijken. Implementatie-eis: de sessie-samenvatting (§2.3) moet bij dit item **beide** lussen apart tonen, niet samengevoegd tot één "goed/fout"-oordeel — anders gaat de klinisch relevante combinatie (bijv. correcte fase-overgang mét onvoldoende interventie-effect, wat op een gemiste bilaterale component kan wijzen) verloren.

### 7.4 Bouwplan (analoog aan §6.2)

1. Datamodel uitbreiden met de kwalificatievelden uit 7.1, gevuld met de vestibulaire-hypofunctie-content uit referentiedocument §14 (AAND-002, subtypes, TEST-003/004, INT-005 t/m 007, RF-007 t/m 009, differentiaaldiagnose, EDU-002)
2. Testen via Modus B (kennisbank raadplegen) of de nieuwe content correct doorzoekbaar is
3. Reasoning-flow uitbreiden met de fase×lateraliteit-logica uit 7.1 — bouw dit **bovenop** de werkende BPPD-flow, niet als apart nieuw systeem
4. Follow-up-scherm aanpassen conform 7.3
5. Testen met fictieve casussen, zoals bij BPPD gedaan — inclusief expliciet een casus met de omgekeerde HIT-logica (7.1), om te controleren of die correct is geïmplementeerd en niet per ongeluk is omgedraaid

### 7.5 Expliciete waarschuwing voor de bouwstap

Geef dit mee aan Claude Code als aandachtspunt: de omgekeerde red-flag-logica bij de Head Impulse Test (7.1) is klinisch tegenintuïtief en dus foutgevoelig bij het overnemen van patronen uit de BPPD-implementatie. Vraag om dit specifieke punt expliciet te laten bevestigen vóór commit.

---

*Dit document is afgeleid van `Duizeligheid-Referentiemodel.md` en dient herzien te worden bij wijzigingen aan het onderliggende model.*
