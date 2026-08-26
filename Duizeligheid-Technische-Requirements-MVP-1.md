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

**Omgekeerde red-flag-logica bij TEST-003 (Head Impulse Test) — contextafhankelijk, niet generiek**: de betekenis van een normale HIT-uitslag hangt af van de klinische context, niet van de test alleen. Twee scenario's, beide evidence-based, die **niet** met elkaar verward mogen worden:

1. **Normale HIT + acuut vestibulair syndroom** (aanhoudende, heftige vertigo van recente datum, vaak met misselijkheid/braken) → alarmerend, verdacht centraal, `actietype = acuut-verwijzen` (RF-007). Bron: HINTS-examenliteratuur (o.a. Newman-Toker et al. 2008/2009) — een normale VOR bij dit klachtenbeeld wijst juist op een centrale in plaats van perifere oorzaak, omdat de perifere VOR-route bij een centraal probleem intact blijft.
2. **Normale HIT, buiten de acute-vertigo-context** (bijv. vervolgconsult, chronische/compensatiefase, routinematige controle zonder acute presentatie) → geruststellend, gebruikelijke interpretatie, past bij herstel/compensatie. **Nieuw scenario, staat niet in tegenspraak met scenario 1** — het is een ander klinisch moment met een andere, eveneens correcte betekenis.

**Implementatie-eis**: de interpretatielogica moet **altijd eerst de klinische context vaststellen** (is er sprake van een acuut vestibulair syndroom: ja/nee — dit volgt uit de `fase`-kwalificatie en de anamnese, niet uit de testuitslag zelf) vóórdat de HIT-uitslag wordt geïnterpreteerd. Dit mag nooit als generieke "afwijkend = alarm" of "normaal = alarm"-regel worden gecodeerd, en de twee scenario's mogen nooit tot één regel worden samengevoegd — de context bepaalt welke van de twee van toepassing is, niet een vaste aanname.

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

## 8. Aanvulling: PPPD (derde item)

Voortbouwend op §1-7. In tegenstelling tot vestibulaire hypofunctie (§7, grotendeels hergebruik van bestaande patronen) vraagt dit item **één echte datamodel-aanvulling** (zie 8.4) — de rest is toepassing van al bestaande relatietypes.

### 8.1 Voorwaarde-relatie — geen bevestigende test

PPPD heeft geen fysieke test die de aandoening aantoont (zoals Dix-Hallpike of HIT), maar een **voorwaarde**: de hypothese mag pas als geldig worden getoond als (a) een differentiaaldiagnostisch traject is afgerond (andere Tier 1/2/3-hypothesen zijn overwogen/uitgesloten) én (b) het klachtenpatroon ≥3 maanden aanhoudt op de meeste dagen.

**Implementatie-eis**: `relatie_type = voorwaarde` (al aanwezig in datamodel §1.3) wordt hier voor het eerst daadwerkelijk gebruikt. De reasoning-flow (Modus A) mag PPPD niet als hypothese tonen totdat aan de voorwaarde is voldaan — dit is een harde gate, geen suggestie. TEST-005 (Bárány-criteria) is functioneel een checklist, geen fysieke testinvoer: implementeer als een set aanvinkbare criteria, niet als een test-uitslagformulier zoals bij TEST-001/003.

**Conditionele diagnostische waarde** (al genoemd in §1.3, hier concreet): de `diagnostische_waarde` van TEST-005 is alleen "hoog" als de voorwaarde-relatie is vervuld — implementeer dit als een verwijzing naar de voorwaarde-relatie, niet als vaste waarde.

### 8.2 Interventies — let op classificatie INT-010

INT-010 (psycho-educatie over het functionele karakter) is `type_object = interventie`, **niet** `patiënteducatie-item`, ondanks de inhoudelijke gelijkenis. Reden: het wordt actief tijdens het consult ingezet door de therapeut, in tegenstelling tot EDU-003 dat zelfstandig leesmateriaal voor de patiënt is. Implementatie-eis: zorg dat deze twee objecten in de interface duidelijk gescheiden blijven (INT-010 hoort bij modus A, stap 5 "behandelstrategie"; EDU-003 bij stap 6 "patiënteducatie vrijgeven") — niet laten samenvallen omdat de tekst inhoudelijk overlapt.

### 8.3 Derde actietype voor het eerst zichtbaar: samenwerking-adviseren

RF-010/011 gebruiken `actietype = samenwerking-adviseren` (naast de twee die al bij BPPD/vestibulaire hypofunctie gebruikt worden). **UI-eis**: dit moet visueel duidelijk anders zijn dan `acuut-verwijzen` — geen rode/alarmerende styling, want dit is geen spoedsignaal maar een niet-acuut advies om er niet alleen voor te staan. Gebruik van dezelfde visuele urgentie als bij acute red flags zou het signaal onterecht zwaarder laten aanvoelen dan bedoeld.

### 8.4 Datamodel-aanvulling: behandelepisode-koppeling (nieuw, niet eerder nodig)

Bij BPPD en vestibulaire hypofunctie was follow-up steeds een vergelijking met de **vorige** sessie. PPPD's follow-up (referentiedocument §15) is **trendmatig**: de NPQ-score moet over meerdere sessies, mogelijk maanden, gevolgd worden om een patroon te herkennen (geleidelijke verbetering versus stabiel hoog versus terugval-bij-stress). De huidige `Sessie`-entiteit (§1.5) staat sessies los van elkaar, zonder een manier om ze als opeenvolgende sessies van hetzelfde behandeltraject te groeperen.

**Nieuwe entiteit: Behandelepisode**

| Veld | Type | Toelichting |
|---|---|---|
| `episode_id` | string, uniek | |
| `aandoening_id` | FK | |
| `gestart_op` | timestamp | |
| `sessie_ids` | array van FK → Sessie | Alle sessies binnen dit traject, chronologisch |
| `status` | enum: actief / afgesloten | |

`Sessie` (§1.5) krijgt een nieuw veld `episode_id` (FK, nullable — bij BPPD/hypofunctie niet verplicht, bij PPPD wel functioneel nodig voor de trendweergave).

**Waarom dit geen omkering van eerdere beslissingen is**: dit blijft binnen de bestaande afspraak (§13: geen volledige dossiervoering) — een episode is een groepering van kortdurende, vervallende sessies (zelfde `vervalt_op`-principe als §1.5), geen permanent patiëntdossier. Het voegt structuur toe aan iets dat al tijdelijk is, het maakt niets minder tijdelijk.

**`patroon_type`-gebruik**: het reeds bestaande veld (§1.3, generiek sinds §18) wordt hier voor het eerst op trendniveau toegepast — een reeks sessies binnen een episode kan gezamenlijk "verwachte fluctuatie" laten zien, ook al wijkt een individuele sessie op zichzelf af. Implementatie-eis: patroonherkenning moet op episode-niveau kunnen kijken, niet alleen per sessie.

### 8.5 Bouwplan

1. `Behandelepisode`-entiteit + `episode_id` op `Sessie` toevoegen (enige structurele datamodel-wijziging van dit item)
2. Datamodel vullen met PPPD-content (referentiedocument §15): AAND-003, TEST-005/006, INT-008/009/010, RF-010/011/012, differentiaaldiagnose (overwegend comorbide), EDU-003
3. Voorwaarde-relatie-logica in de reasoning-flow: PPPD mag pas verschijnen als hypothese na bevestiging van de voorwaarde
4. Trendweergave op episode-niveau bouwen (nieuw scherm-onderdeel, niet eerder nodig geweest)
5. Testen met fictieve casussen — inclusief een meerdere-sessies-casus over "tijd" (bijv. drie opeenvolgende sessies met wisselende NPQ-scores) om de trendlogica en het fluctuatie/afwijkend-onderscheid te controleren, en een casus die de voorwaarde-relatie test (te vroeg PPPD overwegen vóór het differentiaaldiagnostisch traject is afgerond, moet geblokkeerd worden)

---

## 9. Openstaand: bewuste polijstronde na item 4

Na validatie van PPPD (8 casussen, 5 collega's, geslaagd) is een wens genoteerd voor een **latere, aparte polijstronde**: een andere indeling van de weergave, en herziening van tekst die op meerdere plekken in de interface terugkomt. Bewust **niet nu** opgelost — expliciete keuze om eerst het vierde en laatste item (multifactoriële duizeligheid met valrisico) uit te werken.

**Waarom dit hier wordt vastgelegd in plaats van alleen mondeling afgesproken**: bij de twee eerdere polijstmomenten (BPPD: tier-terminologie/symptomenweergave; vestibulaire hypofunctie: normaal/afwijkend-verwarring) werd dat werk direct opgelost. Dit keer is bewust gekozen om te wachten — dat risico is dat het vierde item dezelfde, nog niet gecorrigeerde indeling/tekstpatronen zal hergebruiken. **Aanbeveling voor de polijstronde, zodra die komt**: behandel dan alle vier items in één keer, niet opnieuw per item apart, aangezien de patronen zich door de hele app herhalen.

---

## 10. Aanvulling: Multifactoriële duizeligheid met valrisico (vierde en laatste item)

Voortbouwend op §1-8. **Belangrijkste risico van deze aanvulling**: dit is het eerste item met `uitkomsttype = samengesteld` (§1.1) dat daadwerkelijk gebouwd wordt — BPPD, vestibulaire hypofunctie en PPPD waren alle drie `enkelvoudig`. De samengesteld-tak van de reasoning-flow bestaat tot nu toe alleen als datamodelveld, niet als geteste functionaliteit.

### 10.1 Aggregatie-relatie — geen hoofdhypothese maar factorenprofiel

AAND-004 heeft geen bevestigende test en geen voorwaarde, maar een set `FACTOR-xxx`-objecten (`type_object = prognostische-factor`, zie §1.2) die elk met een `bijdrage_gewicht` (hoog/matig-hoog/matig) meewegen — geen van allen is op zichzelf noodzakelijk of voldoende.

**Implementatie-eis fase 3 (interpretatie)**: bij `uitkomsttype = samengesteld` mag de reasoning-flow **niet stoppen bij de eerste bevestigde factor** zoals bij de andere drie items. De flow moet doorgaan met screenen tot het volledige relevante-factorenprofiel in beeld is. Dit is een andere stopregel dan bij enkelvoudige items en moet expliciet als aparte flow-tak geïmplementeerd worden, niet als variant op de bestaande.

**Implementatie-eis fase 4/5 (behandelstrategie/output)**: output is een **tabel/overzicht per factor**, geen lineair vervolgpad. Elke rij: factor, `bijdrage_gewicht`, wie behandelt (fysio zelf / extern), gekoppelde interventie of signalering.

### 10.2 Gemengd behandelmodel — fysio zelf vs. extern signaleren

Interventies (INT-011/012/013) zijn gekoppeld aan specifieke `FACTOR`-objecten, niet aan AAND-004 als geheel. Factoren die de fysio niet zelf behandelt (visus, polyfarmacie, orthostase, cognitie) krijgen een **signalering-opvolgingsstatus-relatie** (§1.3, `relatie_type = signalering-opvolging`) — dit relatietype is tot nu toe nog niet echt gebouwd.

**Implementatie-eis**: dit is geen automatische test/hertest, maar een handmatig na te vragen status ("heeft de patiënt de medicatiereview met de huisarts gehad — ja/nee/nog niet"). Bouw dit als een simpel vraag-antwoord-veld bij follow-up, niet als geautomatiseerde koppeling met externe systemen (buiten scope, zie §4).

### 10.3 Follow-up: per-factor, geen enkelvoudig succescriterium

In tegenstelling tot alle drie eerdere items heeft dit item **geen** samenvattend "hersteld: ja/nee"-oordeel. De sessie-samenvatting (§2.3) moet hier een overzicht per factor tonen (bijv. kracht/balans verbeterd, valangst afnemend, medicatiereview nog niet gebeurd) — geen enkel gecombineerd eindoordeel forceren.

**Hergebruik `Behandelepisode`** (§8.4): dit item profiteert van dezelfde structuur als PPPD — per-factor-voortgang over meerdere sessies volgen vraagt dezelfde episode-groepering, geen nieuwe entiteit nodig.

**RF-013**: patroon wijkt af van verwacht multifactorieel beloop (bijv. snelle acute verslechtering i.p.v. geleidelijke verandering) → `actietype = hypothese-heroverwegen`. `patroon_type` (verwachte-fluctuatie/afwijkend-beloop, al generiek sinds §18) is ook hier van toepassing, nu op per-factor-niveau in plaats van op episode-niveau zoals bij PPPD.

### 10.4 Patiënteducatie EDU-004 — reeds voorbereid, nu voor het eerst gebruikt

De AI-interactie-eis voor gepersonaliseerd-samengestelde educatie stond al gereed in §3, punt 4 ("Gepersonaliseerde educatie") — geen nieuwe eis nodig, dit is het eerste moment waarop die daadwerkelijk wordt toegepast. Controleer bij het testen expliciet: worden alleen variabele content-blokken getoond die corresponderen met daadwerkelijk bevestigde factoren bij déze patiënt, nooit ongebruikte factoren "voor de zekerheid".

### 10.5 Bouwplan

1. `FACTOR`-objecten + aggregatie-relaties vullen met content uit referentiedocument §16 (propriocepsis, spierzwakte, visus, polyfarmacie, orthostase, milde vestibulaire achteruitgang, cognitie, valangst), inclusief hergebruikte objecten (RF-004 uit BPPD, TEST-003 uit vestibulaire hypofunctie — controleer dat hergebruik correct verwijst, niet gedupliceerd wordt)
2. Reasoning-flow: nieuwe samengesteld-tak bouwen voor fase 3-5 (10.1) — dit is het zwaarste bouwonderdeel van dit item, apart testen vóór de rest
3. Signalering-opvolgingsstatus-mechanisme (10.2)
4. Follow-up-scherm: per-factor-overzicht (10.3), met episode-koppeling
5. Testen: expliciet controleren dat de flow bij een samengestelde casus **niet** stopt bij de eerste bevestigde factor (10.1), dat de output een overzicht is en geen enkele conclusie, en dat gepersonaliseerde educatie (10.4) alleen bevestigde factoren toont

### 10.6 Na dit item: alle vier voltooid

Zodra dit item is gebouwd en getest, is de volledige scope van het oorspronkelijke duizeligheidsspectrum (referentiedocument, gehele masterprompt) functioneel gereed. De in §9 vastgelegde polijstronde (indeling/tekst, alle vier items in één keer) is dan de logische vervolgstap, samen met de eerder besproken deploy-stap (permanent online zetten).

---

## 11. Aanvulling: Clinical Reasoning Engine V2 (parallelle modus)

Voortbouwend op §1-10, en op `Clinical-Reasoning-Engine-V2-Theoretisch-Ontwerp.md` + `Symptoomvocabulaire-Addendum-BPPD-Proefmigratie.md`. **Besluit**: V2 wordt gebouwd als **parallelle, schakelbare modus** naast de bestaande, werkende flow (hierna "V1") — geen vervanging. Dit beschermt het reeds gevalideerde werk (16 casussen, meerdere collega's) tegen risico's in de nieuwe rangschikkingslogica.

### 11.1 Datamodel-aanvulling

**Nieuw veld op relaties**: `polariteit` (enum: ondersteunt / spreekt-tegen / neutraal) op elke `relatie_type = bevinding-interpretatie`-relatie. Vult aan op het al bestaande `diagnostische_waarde`-veld — beide samen sturen de rangschikking.

**Content om in te voeren**: de ~100 polariteit-relaties uit de proefmigratie (addendum-document), voor alle vier items. Dit is invoerwerk, geen ontwerpwerk — de klinische inhoud ligt al vast en is door jou bevestigd.

**Nieuw veld op Sessie**: `reasoning_engine_versie` (enum: v1 / v2). Bepaalt welke flow-logica een sessie gebruikt; bestaande en toekomstige V1-sessies blijven ongewijzigd functioneren.

**Rode-vlaggenmodule als losstaand, herbruikbaar component**: alle bestaande RF-001 t/m RF-013-objecten worden zo aangeroepen dat ze zowel in V1 als V2 werken zonder duplicatie — dit is grotendeels hergebruik, geen nieuwe content.

### 11.2 Toegangspunt: keuzescherm

Bij het starten van een nieuwe sessie kiest de therapeut tussen:
- **Snelle route** (bestaande V1-flow) — voor herkenbare, klassieke presentaties
- **Brede verkenning** (nieuwe V2-flow) — voor atypische, overlappende, of onduidelijke presentaties

Dit is geen technisch detail maar een productbeslissing die nu vastligt: V2 vervangt niet de snelheid van V1 voor duidelijke gevallen, het vult het gat voor de gevallen waar V1 tekortschiet (referentiedocument V2, §2).

### 11.3 Kernonderdelen om te bouwen (nieuw, niet herbruikt)

1. **Symptoom-first intake**: brede invoer volgens de categorieën uit V2 §6, gekoppeld aan de nu ingevoerde gedeelde symptoom-objecten
2. **Cross-hypothese rangschikking**: alle vier aandoeningen tegelijk gewogen (V2 §10), inclusief de vastgestelde regel "één sterk tegensprekend kenmerk plafonneert op matig" en de concrete doorvraag-prioriteit bij het chronische cluster (V2 §9, bijgewerkt)
3. **"Geen dominante hypothese"-uitkomst**: eersteklas resultaatscherm, geen foutstatus (V2 §14)
4. **Herweging-met-verklaring**: voor/na-weergave met natuurlijke-taal-uitleg (V2 §13) — expliciet **geen** score/percentage-vormgeving, zie waarschuwing in V2 §13/§18.4
5. **Bidirectionele kennisbank-koppeling**: Modus A ↔ Modus B doorklikbaar (V2 §17) — technisch goedkoop, beide wijzen al naar dezelfde `KnowledgeObject`-tabel

### 11.4 Bouwplan

1. Datamodel: `polariteit`-veld + `reasoning_engine_versie`-veld toevoegen, alle ~100 relaties uit het addendum invoeren
2. Rode-vlaggenmodule ombouwen tot herbruikbaar component (losse stap, laag risico, test dat V1 hierdoor niet breekt)
3. Keuzescherm (11.2) bouwen
4. Symptoom-first intake + cross-hypothese rangschikking (11.3, punt 1-2) — zwaarste stap, apart testen vóórdat de rest volgt
5. Herweging-met-verklaring + "geen dominante hypothese"-uitkomst (11.3, punt 3-4)
6. Bidirectionele kennisbank-koppeling (11.3, punt 5)
7. Testen met de vijf voorbeeldcasussen uit V2 §21 (mix klassiek/atypisch), specifiek controlerend of V1 ongewijzigd blijft werken naast de nieuwe V2-modus

### 11.5 Wat nog moet worden vastgesteld vóór stap 4

De exacte aggregatieregel (V2 §24, eerste punt) is nog niet uitputtend gedefinieerd voor alle combinaties — alleen het hoofdprincipe staat vast. Aanbeveling: stap 4 starten met alleen dat hoofdprincipe, en de regel verder aanscherpen op basis van de testresultaten uit stap 7, in plaats van te wachten tot de regel volledig sluitend is voordat er gebouwd wordt.

---

*Dit document is afgeleid van `Duizeligheid-Referentiemodel.md`, `Clinical-Reasoning-Engine-V2-Theoretisch-Ontwerp.md`, en `Symptoomvocabulaire-Addendum-BPPD-Proefmigratie.md`, en dient herzien te worden bij wijzigingen aan het onderliggende model.*
