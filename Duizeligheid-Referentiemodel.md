# Duizeligheid — Theoretisch Productdossier & Kennisreferentiemodel
### Fysiotherapieplatform Duizeligheid/Vestibulaire Klachten — Theoretische/Conceptuele Fase

Dit document bevat het volledige theoretische fundament van het platform: kennisarchitectuur en knowledge-object-model (§1), alle vier volledig uitgewerkte Tier 1/2-items (BPPV, vestibulaire hypofunctie, PPPD, multifactoriële duizeligheid met valrisico — §2-6, 14-16), probleemdefinitie/doelgroepen/businessmodel (§10-11), AI-interactiemodel (§12, 20), MVP-definitie (§13), reasoning-flow (§8, 19), therapeut- en patiëntworkflows (§22, 24), veiligheids-/privacymodel (§23), en personas/journey/roadmap (§25). Dient als levend referentiedocument voor de verdere ontwikkeling.

---

## 1. Kernstructuur knowledge object (gehanteerd model)

**Identiteit**: `id`, `naam`, `type object` (gesloten lijst)
**Classificatie**: `behandelverantwoordelijkheid`, `behandeldiepte`, `tier` (afgeleid), `uitkomsttype` (enkelvoudig/samengesteld — bepaalt gedrag van reasoning-flow fase 3-5, zie §19)
**Inhoud**: `kernbeschrijving`, `klinische kenmerken`, `evidence-niveau`, `bronnen`, `status`, `laatst gecontroleerd op`
**Relaties**: gekwalificeerd, vier vastgestelde relatietypes (zie §17): (a) gekwalificeerde bevinding→interpretatie (subtype/variant/fase/lateraliteit + bevinding + interpretatie + evidence-niveau + **diagnostische waarde**: hoog/matig/laag, evt. conditioneel — zie §19), (b) voorwaarde-relatie, (c) aggregatie-relatie (bijdrage-gewicht per factor), (d) signalering→opvolgingsstatus. Differentiaaldiagnose-relaties dragen daarnaast `relatietype` (uitsluitend/comorbide)
**Gebruikscontext**: `zichtbaar voor therapeut`, `zichtbaar voor patiënt`
**Follow-up-relaties** (aanvullend op bovenstaande): dragen `patroon-type` (verwachte fluctuatie/afwijkend beloop — ook bij niet-fluctuerende beelden, zie §18)
**Patiënteducatie-objecten** (aanvullend): twee vaste velden naast bovenstaande — `verwachtingsmanagement` (verplicht, nadruk varieert per item) en `rationale-uitleg-counterintuïtief-advies` (optioneel, alleen waar van toepassing)
**Signaal-objecten** (red flag e.d.): `actietype` met drie vastgestelde waarden — acuut-verwijzen, hypothese-heroverwegen, samenwerking-adviseren (zie §15)

**Gesloten `type object`-lijst**:
1. Aandoening/klachtenpatroon
2. Symptoom
3. Anamnese-item
4. Onderzoekstest
5. Interventie/behandeltechniek
6. Red flag
7. Patiënteducatie-item
8. Clinical pearl
9. Prognostische factor
10. Contra-indicatie

Differentiaaldiagnose en verwijsmoment zijn **geen** aparte types — dit zijn relaties tussen objecten. `FACTOR-xxx`-objecten (bijdragende factoren bij aggregatie-relaties, zie AAND-004/§16) zijn definitief getypeerd als subtype van **prognostische factor** — geen nieuw hoofdtype nodig; ze beïnvloeden beloop/risico, wat aansluit bij de aard van dit bestaande type.

**Openstaand modelveld** (bewust nog niet vastgelegd):
- Leesniveau patiënteducatie (B1 = werkhypothese, wacht op meer voorbeelditems)

---

## 2. AAND-001 — BPPV (hoofdobject)

- **Tier**: 1 | **Behandelverantwoordelijkheid**: zelfstandig fysio | **Behandeldiepte**: volledig
- **Mechanisme**: otoconia-verplaatsing (canalolithiasis) of -aanhechting aan de cupula (cupulolithiasis) in een van de booggangen
- **Evidence-niveau**: richtlijn

**Klinische kenmerken (gedeeld over subtypes)**:
- Kortdurende (seconden – <1 min), heftige rotatoire vertigo
- Uitgelokt door specifieke bewegingen (omdraaien in bed, hoofd achterover, bukken)
- Geen gehoorverlies, geen klachten tussen episodes door
- Vaak recidiverend

**Subtypes** (veld `subtype`, geen aparte objecten):

| Subtype | Prevalentie | Test | Interventie |
|---|---|---|---|
| Posterior kanaal | ~85-90% | Dix-Hallpike | Epley / Semont |
| Horizontaal kanaal | ~10-15% | Supine roll test | Barbecue-roll (canalolithiasis) / Gufoni (cupulolithiasis) |
| Anterior kanaal | <5%, diagnostisch controversieel | Dix-Hallpike (minder betrouwbaar) | Geen breed gevalideerde standaard (Yacovino: zwakke evidence) |

---

## 3. Onderzoekstesten

### TEST-001 — Dix-Hallpike
Gekoppeld aan subtype posterior (primair) en anterior (secundair). Evidence: systematic review, gouden standaard voor posterior.

| Bevinding | Interpretatie |
|---|---|
| Upbeat + torsioneel, geotroop, latentie 1-5s, habitueert | Posterior canalolithiasis, aangedane zijde = onderste oor |
| Downbeat + torsioneel, vergelijkbaar patroon | Verdacht anterior kanaal — lage specificiteit |
| Downbeat zonder torsie, geen latentie/habituatie | **→ RF-002: verdacht centraal** |
| Geen nystagmus | Negatief (fout-negatief mogelijk bij eenmalige test) |

### TEST-002 — Supine Roll Test (Pagnini-McClure)
Gekoppeld aan subtype horizontaal. Evidence: systematic review, iets minder robuust dan Dix-Hallpike.

| Bevinding | Interpretatie |
|---|---|
| Horizontale geotrope nystagmus, sterker één zijde | Canalolithiasis horizontaal, sterkste kant = aangedane zijde |
| Horizontale apogeotrope nystagmus, sterker één zijde | Cupulolithiasis horizontaal — zijdigheid minder eenduidig in literatuur |
| Geen nystagmus | Negatief |

**Relatiepatroon** (generiek, herbruikbaar voor alle testen/anamnese-items in het platform):
```
relatie { van: TEST-xxx, naar: AAND-xxx, kwalificatie: subtype/variant,
          bevinding: "...", interpretatie: "...", evidence_niveau: "..." }
```
Een test kan meerdere van dit soort relaties hebben — inclusief relaties náár een red flag-object in plaats van naar de onderzochte aandoening.

---

## 4. Interventies

| Object | Gekoppeld aan | Evidence | Contra-indicaties/aandacht |
|---|---|---|---|
| INT-001 Epley | Posterior, canalolithiasis | Systematic review/meta-analyse (sterkst) | Cervicale instabiliteit, ernstige rugklachten, cardiovasculair risico bij snelle positiewisseling, zwangerschap (aanpassen) |
| INT-002 Semont | Posterior (alternatief) | Systematic review | Minder geschikt bij kwetsbare/oudere patiënten (dynamischer) |
| INT-003 Barbecue-roll | Horizontaal, canalolithiasis | Systematic review (kleinere basis dan Epley) | Vergelijkbaar met Epley |
| INT-004 Gufoni | Horizontaal, cupulolithiasis | Zwakker, deels expert-consensus | — |

Recidiefkans (~15-50%, studieafhankelijk) hoort bij `prognostische factoren`, niet bij de interventie zelf.

---

## 5. Red flags (gekoppeld aan BPPV-differentiaaldiagnostiek)

Elk red flag-object heeft veld `actietype`. Op dit punt in het document waren nog maar twee waarden vastgesteld — **acuut-verwijzen** en **hypothese-heroverwegen** — de derde waarde (**samenwerking-adviseren**) is pas bij PPPD geïntroduceerd (§15) en met terugwerkende kracht in het kernmodel opgenomen (§1). Geen van de BPPV-red flags gebruikt die derde waarde.

| ID | Kenmerken | Interpretatie | Actietype |
|---|---|---|---|
| RF-001 | Dubbelzien, dysartrie, ataxie, eenzijdige uitval, nieuwe ernstige hoofdpijn | CVA/TIA vertebrobasilair | Acuut-verwijzen |
| RF-002 | Downbeat/zuiver torsioneel zonder latentie/habituatie, gaze-evoked multidirectioneel | Centrale origine | Acuut-verwijzen |
| RF-003 | Acuut eenzijdig gehoorverlies + duizeligheid | Labyrintitis/vasculair/acusticusneurinoom | Acuut-verwijzen (spoed afh. van beloop) |
| RF-004 | Sterke bloeddrukdaling bij houdingsverandering, syncope, palpitaties, pijn op de borst | Orthostatisch/cardiaal | Acuut-verwijzen (ook relevant bij multifactoriële-duizeligheid-met-valrisico-item) |
| RF-005 | Nieuwe/progressieve/ongebruikelijke hoofdpijn | Mogelijke intracraniële pathologie | Acuut-verwijzen |
| RF-006 | Geen enkele houdings-/bewegingsuitlokking bij "aanvalsgewijze" duizeligheid | Past niet bij BPPV | Hypothese-heroverwegen |

Red flag-monitoring is **doorlopend** gedurende het hele traject (anamnese, onderzoek, én follow-up) — geen eenmalige check aan het begin.

---

## 6. Differentiaaldiagnose (stub-relaties naar Tier 3, tenzij anders vermeld)

| Object | Onderscheidend kenmerk t.o.v. BPPV | Tier |
|---|---|---|
| Vestibulaire hypofunctie/neuritis | Continue duizeligheid, niet houdingsgebonden aanvallen | 1 |
| Menière | Fluctuerend gehoorverlies, tinnitus, oorvol gevoel, minuten-uren | 3 |
| Vestibulaire migraine | Langere episodes, migraine-anamnese | 2 |
| PPPD | Chronisch, visueel/proprioceptief uitgelokt, geen korte draaiaanvallen | 1 |
| CVA/TIA vertebrobasilair | Acuut, andere neurologische symptomen | 3 |
| Orthostatische hypotensie | Uitgelokt door opstaan, meetbare bloeddrukdaling | 3 |

**Stub-object-principe**: Tier 3-differentialen krijgen alleen minimale structuur (naam, onderscheidende kenmerken, tier, verwijsactie) — géén volledige Tier 1-uitwerking. Voorkomt onbeheersbare scope.

---

## 7. Patiënteducatie (EDU-001)

- **Bronrelatie**: AAND-001 (algemene uitleg, geen subtype-detail)
- **Signaleringsrelatie**: samengevoegde, vertaalde versie van RF-001, RF-002, RF-003, RF-005 (RF-004 niet relevant bij BPPV-context, RF-006 is therapeut-intern)
- **Inhoud**: wat het is, geruststelling (goedaardig/goed behandelbaar), wat er gebeurt tijdens manoeuvre, zelfmanagement bij recidief, alarmsignalen in lekentaal
- **Nooit opgenomen**: subtype/variant-detail, testinterpretatie, volledige differentiaaldiagnose-lijst, contra-indicaties in klinische taal
- **Principe**: patiënteducatie-objecten kunnen meerdere bronobjecten samenvoegen — geen verplichte 1-op-1 spiegeling

---

## 8. Clinical reasoning flow (getoetst aan BPPV)

```
ANAMNESE → hypothesen genereren/wegen
   ↓
GERICHT ONDERZOEK → test met hoogste a-priori-waarschijnlijkheid eerst
   ↓
BEVINDING → INTERPRETATIE → bevestiging | andere hypothese | RED FLAG (interrupt, altijd mogelijk)
   ↓
BEHANDELSTRATEGIE → interventie gekoppeld aan subtype/variant, contra-indicatie-check verplicht
   ↓
FOLLOW-UP (lus, geen eindpunt) → hertest → succes | herhaal interventie | kanaalconversie → terug naar onderzoek | falen → heroverweeg hypothese / verwijs
```

**Kernprincipes**:
- Anamnese-items volgen hetzelfde bevinding→interpretatie-patroon als testen (generiek, herbruikbaar)
- Elke fase kan terugspringen naar een eerdere fase — de flow is een lus, geen rechte lijn
- Red flag-triggers kunnen op élk moment het proces onderbreken, ook tijdens follow-up
- Geen kwantitatieve kansberekening (geen schijnprecisie) — kwalitatieve weging (hoog/matig/laag) met expliciete, uitlegbare redenen

---

## 9. Noot bij documentherziening

Een eerdere versie van dit document had hier een sectie "openstaande punten" direct na de BPPV-uitwerking. Die punten zijn ingehaald door de latere consistentie-ronde (§18/21) en zijn daar verwerkt, met één uitzondering die alsnog is meegenomen — zie §21, punt over evidence-niveau op subvraag-niveau.

---

## 10. Probleemdefinitie & doelgroepen

**Kernprobleem**: Duizeligheid komt veel voor in de bevolking — de huisarts ziet het zeer regelmatig, en bij ouderen boven de 75 is het zelfs de meest voorkomende reden voor een huisartsbezoek — maar wordt naar verhouding weinig gezien in de fysiotherapiepraktijk. Die combinatie (hoge prevalentie, lage praktijkzichtbaarheid) is de kern van waarom dit een structureel, geen toevallig probleem is: het is klinisch complex en differentiaaldiagnostisch veeleisend, en de meeste fysiotherapeuten bouwen er nooit voldoende routine in op — met als gevolg klinische onzekerheid, onvoldoende begrijpelijke patiëntbegeleiding, en zorgroutes die niet altijd de fysiotherapeut bereiken terwijl die wel geschikt zou zijn.

*(Bron prevalentie: NHG-Standaard Duizeligheid — 11,8% van de patiënten consulteerde de huisarts in 2013 vanwege duizeligheid; boven de 75 jaar is het de meest voorkomende contactreden. De lage zichtbaarheid in de fysiopraktijk specifiek is een eigen klinische observatie, geen apart gepubliceerd cijfer.)*

**Doelgroepen**:
- **Fysiotherapeut (primair)**: alle fysiotherapeuten, ongeacht ervaring — *"Geeft elke fysiotherapeut, ongeacht ervaring, toegang tot gestructureerde, evidence-informed klinische ondersteuning bij duizeligheidsklachten — van snelle kernroute tot complexe diepte."* Kennisbank moet daarom laagsgewijs opvraagbaar zijn (kernroute vs. diepte-theorie).
- **Patiënt (secundair)**: toegankelijk voor iedereen (kan wijzigen naar therapeut-geactiveerd) — *"Helpt patiënten hun duizeligheidsklachten te begrijpen, hun behandeling te volgen, én te herkennen wanneer de fysiotherapeut een geschikte eerste zorgverlener kan zijn."* Twee functies: educatie tijdens lopend traject, én bekendheid met directe toegang fysiotherapie (DTF), los van een traject.
- **Verwijzer (tertiair, afgebakend)**: *"Ondersteunt verwijzers bij het herkennen welk type duizeligheid bij welke zorgverlener hoort — inclusief wanneer dat de fysiotherapeut zelf is."* Uitdrukkelijk géén diagnostische ondersteuning voor eigen gebruik — dat zou een ander product, ander regulatoir risico en ander auteurschap vereisen dan nu binnen scope past.

## 11. Businessmodel-richting

**Eindrichting**: B2B2C-platform, fysiotherapeut-tool als kern met patiëntapp eraan gekoppeld, gericht op zowel breed bereik als versterking van klinische positionering — expertise zichtbaar als kwaliteitsfundament, niet noodzakelijk als merknaam.

**Huidige fase (bewust tijdelijk, geen eindmodel)**: klein en zelfstandig, therapeut-tool eerst, geen patiëntapp, geen investeerders/instellingen nu. Dit is een opstap, geen definitieve keuze — niets in deze fase mag een latere overstap naar de eindrichting blokkeren.

**Aandachtspunten voor omkeerbaarheid**:
- Merk-/naamskeuze bewust uitstellen (voorkomt een te beperkende naam)
- Bij gratis/laag-geprijsde start: expliciet framen als pilot/vroege toegang, niet als permanente belofte

## 12. AI-interactiemodel

**Grondprincipe**: de kennisbank is de bron, AI is een vertaal- en presentatielaag — nooit zelfstandige bron van medische waarheid.

**AI mag wel**: kennis ophalen/presenteren, structureren/contextualiseren (bijv. meerdere red flags samenvoegen tot patiëntvriendelijke lijst, zoals bij EDU-001), taalkundig aanpassen aan doelgroep, redenering uitleggen (geen black box), vervolgacties suggereren.

**AI mag nooit**: feiten genereren die niet in de kennisbank staan, zelf diagnosticeren/behandelbeslissingen nemen, onzekerheid gladstrijken, Tier 3-informatie naar patiënten laten doorlekken, red flags afzwakken.

**Architectuurprincipe**: elk AI-antwoord traceerbaar naar specifieke knowledge-object-id's — geen vrije generatie. Dit is dezelfde structuur (gekwalificeerde relaties, bevinding→interpretatie) die al voor de kennisbank is ontworpen.

**Escalatieprincipe bij twijfel**: *Bij onzekerheid kiest de AI altijd de voorzichtigste interpretatie en maakt die zichtbaar, in plaats van de meest waarschijnlijke of de meest geruststellende. Twijfel wordt nooit stilzwijgend opgelost in het voordeel van een vlot antwoord.* Geldt bij: mogelijke red flag-signalen (bij twijfel benoemen, niet wachten op zekerheid), concurrerende hypothesen waarvan één Tier 3 is (zichtbaar houden richting therapeut tot uitgesloten), patiëntvragen om geruststelling (nooit eigen geruststellende conclusie, verwijzen naar therapeut).

**"Geen antwoord in kennisbank"-principe**: *Ontbrekende kennis wordt altijd expliciet benoemd, nooit stilzwijgend aangevuld vanuit de algemene taalvaardigheid van het model.* Geldt ook bij ogenschijnlijk onschuldige vragen buiten de kennisbank — geen uitzondering maken, want de grens vervaagt snel.

**Openstaand voor fase 2 (patiëntomgeving)**: content-richtlijn voor emotioneel geladen patiëntvragen (angst, geruststellingsbehoefte) — principe ligt vast (niet zelf geruststellen, verwijzen), toon/formulering nog niet uitgewerkt.

## 13. MVP-definitie (versie 1)

**MVP bevat uitsluitend BPPV**, volledig uitgewerkt zoals in dit document — kennisbank, reasoning flow, red flags met actietype, AI-laag met traceerbaarheid en escalatieprincipes. Geen patiëntapp, geen overige aandoeningen, geen verwijzersfunctionaliteit, geen **volledige dossiervoering/EPD-integratie**, geen praktijkbeheer, geen brede logging/analytics.

**Precisering na validatieronde (§27)**: twee functies zijn **alsnog binnen MVP-scope gehaald**, want zonder deze twee is adoptie volgens alle vijf geraadpleegde collega's twijfelachtig — (a) **kennisbank-raadpleegmodus**, los van de reasoning-flow (§22, Modus B); (b) **lichte sessie-samenvatting** van één reasoning-flow-doorloop (§22). Beide zijn functioneel lichter dan het nog altijd uitgesloten "volledige dossiervoering/EPD-integratie": geen langdurige bewaarplicht, geen juridische dossierstatus, geen koppeling aan andere patiëntgegevens buiten die ene sessie. Dit is een precisering van de oorspronkelijke uitsluiting, geen omkering ervan — zie §23 voor de privacy-consequentie die dit alsnog met zich meebrengt, ook al is de omvang klein.

**Dit is geen scope-verkleining maar een volgordekeuze**: de overige drie Tier 1/2-items (vestibulaire hypofunctie, PPPD, multifactoriële duizeligheid met valrisico) blijven volledig onderdeel van de productvisie en worden na validatie van de MVP op hetzelfde kwaliteits- en structuurniveau als BPPV uitgewerkt — zelfde diepte, zelfde structuur, zelfde AI-veiligheidsprincipes. Reden voor "smal maar diep" boven "breed maar ondiep": consistent met laag-risico-uitgangspunt, en een half afgewerkt breed product is lastiger later te verdiepen dan een sterk smal product uit te breiden.

---

## 14. AAND-002 — Vestibulaire hypofunctie (tweede volledig item)

**Tier**: 1 | **Behandelverantwoordelijkheid**: zelfstandig fysio | **Behandeldiepte**: volledig
**Mechanisme**: verminderde/uitgevallen functie vestibulair orgaan/nervus vestibularis, uni- of bilateraal. Meest voorkomende oorzaak: neuritis vestibularis; ook chirurgie, ototoxiciteit, onbekend.
**Evidence-niveau**: richtlijn (vestibulaire revalidatie sterk onderbouwd)

**Klinische kenmerken**: continue duizeligheid/onbalans (niet aanvalsgewijs, niet houdingsafhankelijk — belangrijkste onderscheid met BPPV). Unilateraal: acuut vaak hevige rotatoire vertigo + misselijkheid/braken, later vaag onbalansgevoel. Bilateraal: geen vertigo-aanval, wel chronische onbalans + oscillopsie.

**Twee onafhankelijke kwalificerende velden** (nieuw t.o.v. BPPV's enkelvoudige subtype):
- `fase`: acuut / chronisch-compensatie / "geen duidelijke acute fase" (dit laatste met name bij geleidelijk ontstane bilaterale hypofunctie — fase is een tijdgebonden state, geen vast kenmerk zoals BPPV's subtype)
- `lateraliteit`: unilateraal / bilateraal — objectief vast te stellen via test, i.t.t. fase (die via samengestelde anamnese/observatie wordt bepaald, geen aparte test)

**Testen**:
- TEST-003 Head Impulse Test (HIT): systematic review, kern voor lateraliteitsbepaling. **Belangrijk: bij acute heftige vertigo is een normale HIT juist verdacht voor centrale oorzaak** (omgekeerde logica t.o.v. BPPV) → RF-007
- TEST-004 Dynamic Visual Acuity Test: systematic review, met name relevant bij bilaterale hypofunctie/oscillopsie; gekoppeld aan interventie-uitkomst (INT-006)

**Interventies** (gekoppeld aan fase × lateraliteit):
- INT-005 Habituatie: fase=chronisch, m.n. unilateraal. Contra-indicatie: niet starten in acute fase met sterke autonome symptomen
- INT-006 Adaptatie/gaze stability: fase=chronisch (lichte opbouw al richting einde acuut), zowel uni- als bilateraal, essentieel bij bilateraal
- INT-007 Substitutie: fase=chronisch, m.n. bilateraal (geen "gezonde kant" om op te compenseren) — inhoudelijk raakvlak met toekomstig multifactoriële-duizeligheid-met-valrisico-item

**Red flags**:
| ID | Kenmerken | Interpretatie | Actietype |
|---|---|---|---|
| RF-007 | Normale HIT bij acute heftige vertigo | Verdacht centraal (bijv. cerebellair infarct) | Acuut-verwijzen |
| RF-008 | Geen verwachte fase-voortgang, verslechtering, nieuwe neurologische symptomen | Wijkt af van verwacht beloop | Hypothese-heroverwegen |
| RF-009 | Asymmetrisch gehoorverlies/tinnitus bij het beeld | Neuritis vestibularis geeft normaliter geen gehoorverlies | Hypothese-heroverwegen / kan escaleren |

**Differentiaaldiagnose** (eerste gebruik van `relatietype`: uitsluitend vs. comorbide):
BPPV (uitsluitend), centraal vestibulair syndroom (uitsluitend, acuut), labyrintitis (uitsluitend), acusticusneurinoom (uitsluitend, minder acuut), multifactoriële duizeligheid met valrisico (comorbide mogelijk). Met terugwerkende kracht op BPPV's tabel toegepast, zie §18.

**Patiënteducatie (EDU-002)**: nieuw element t.o.v. EDU-001: expliciet "verwachtingsmanagement"-blok (langduriger traject, tijdelijke verergering tijdens habituatie-oefeningen normaal). Verwacht ook relevant bij PPPD.

**Follow-up**: twee gekoppelde evaluatielussen i.p.v. BPPV's ene — (1) fase-voortgang: is patiënt toe aan intensievere training, (2) interventie-effectiviteit: slaat adaptatie/substitutie aan (DVA-hermeting). Lussen kunnen los van elkaar afwijken (bijv. correcte fase-overgang maar geen interventie-effect → wijst op gemiste bilaterale component of therapietrouw-probleem, niet op fase-fout).

**Bevestigde modelconclusie**: gekwalificeerde-relatiepatroon (bevinding→interpretatie) blijft overeind bij twee onafhankelijke kwalificerende assen en een tweeledige follow-up-structuur — geen aanpassing aan het onderliggend model nodig, alleen uitbreiding van toepassing.

## 15. AAND-003 — PPPD (derde volledig item)

**Tier**: 1 | **Behandelverantwoordelijkheid**: zelfstandig fysio, met eventuele samenwerking | **Behandeldiepte**: volledig, met randvoorwaarde
**Mechanisme**: functionele aanpassingsstoornis — geen structurele afwijking, verhoogde alertheid op beweging/visuele prikkels na een precipiterend event, in stand gehouden door bewegingsangst/vermijding
**Evidence-niveau**: consensus (Bárány Society-criteria, 2017) — expliciet géén richtlijn-niveau, moet zichtbaar blijven per gekoppeld object

**Klinische kenmerken**: chronisch (≥3 maanden), niet-vertigineus (onvastheid/zwaarte i.p.v. draaiduizeligheid), uitgelokt door rechtop staan/lopen/beweging/complexe visuele prikkels, vaak vervolgdiagnose na ander (hersteld) organisch event.

**Nieuw relatietype: voorwaarde-relatie** (i.p.v. bevestigende test): PPPD vereist afgerond differentiaaldiagnostisch traject + tijdscriterium — leunt op afwezigheid van aanhoudende organische verklaring, niet op aanwezigheid van een positieve bevinding.

**Diagnostisch raamwerk**: TEST-005 Bárány-criteria (checklist, geen fysieke test, consensus-niveau), TEST-006 Niigata PPPD Questionnaire (ondersteunend/monitorend, observationeel niveau).

**Interventies**:
- INT-008 Exposure-training (systematic review, kwalificatie: mate van vermijdingsgedrag)
- INT-009 Visuele desensitisatie (observationeel/consensus)
- INT-010 Psycho-educatie functioneel karakter — geclassificeerd als **interventie**, niet patiënteducatie-item: onderscheid zit in gebruik (actieve behandelcomponent tijdens consult) niet in inhoud

**Derde actietype op signaal-object geïntroduceerd**: naast acuut-verwijzen en hypothese-heroverwegen nu ook **samenwerking-adviseren** (niet-acuut, functioneel — fysio blijft betrokken maar niet alleen):
| ID | Kenmerken | Actietype |
|---|---|---|
| RF-010 | Uitblijvend herstel ondanks correcte uitvoering | Samenwerking-adviseren |
| RF-011 | Angststoornis/depressie op voorgrond i.p.v. instandhoudend | Samenwerking-adviseren |
| RF-012 | Voldoet niet meer aan Bárány-criteria bij nadere evaluatie | Hypothese-heroverwegen |

**Differentiaaldiagnose**: overwegend `relatietype`=comorbide (vestibulaire migraine, vestibulaire hypofunctie, angststoornis, depressie) — eerste item waar comorbide-relaties in de meerderheid zijn t.o.v. uitsluitend.

**Patiënteducatie (EDU-003)**: bevestigt verwachtingsmanagement als generiek element (nog nadrukkelijker dan bij AAND-002). Nieuw generiek element: **rationale-uitleg bij counter-intuïtieve adviezen** (waarom bewegen ondanks klachten helpt). Extra zorgvuldigheid nodig: "geen structurele afwijking" mag niet aanvoelen als "niet serieus genomen."

**Follow-up**: trendmatige evaluatie (NPQ over tijd + functionele maten) i.p.v. binaire hertest. Nieuw onderscheid: `patroon-type` — **verwachte fluctuatie** (terugval bij stress hoort bij het beloop, geen escalatiesignaal) vs. **afwijkend beloop** (wel escaleren). Zonder dit onderscheid zou de flow bij elke terugval onterecht alarmeren.

## 16. AAND-004 — Multifactoriële duizeligheid met valrisico (vierde volledig item)

**Tier**: 2 | **Behandelverantwoordelijkheid**: gedeeld-multidisciplinair, per factor verschillend | **Behandeldiepte**: hoog
**Mechanisme**: optelsom van bijdragende factoren, geen dominante oorzaak
**Evidence-niveau**: richtlijn per behandelcomponent (bijv. kracht-/balanstraining), consensus voor het geheel als syndroom

**Vierde relatietype: aggregatie-relatie** (i.p.v. bevestiging, voorwaarde, of kwalificatie): meerdere `FACTOR-xxx`-objecten dragen elk met een eigen gewicht bij, geen van allen noodzakelijk of voldoende op zichzelf. Voorbeeld bijdragende factoren: propriocepsis, spierzwakte, visus, polyfarmacie, orthostase, milde vestibulaire achteruitgang, cognitie, valangst — elk met eigen screening en eigen "wie behandelt" (fysio zelf, of extern met signalering).

**Bevestigd hergebruik**: RF-004 (cardiovasculair, uit BPPV) en TEST-003 (HIT, uit vestibulaire hypofunctie) worden hier letterlijk hergebruikt als bijdragende factor — concreet bewijs voor herbruikbaarheid van het generieke model tussen items.

**Interventies**: gekoppeld aan factoren, niet aan de aandoening als geheel — balanstraining (INT-011), krachttraining (INT-012, sterkst onderbouwd van alle interventies in dit document), graduele blootstelling bij valangst (INT-013, inhoudelijk sterk vergelijkbaar met INT-008/PPPD — bewust niet geconsolideerd, zie §18). Niet-fysio-factoren krijgen signaleringsrelatie i.p.v. interventie (zelfde patroon als red-flag-verwijzing, nu niet-acuut toegepast).

**Reasoning-consequentie**: output is niet één hypothese/plan maar een **samengesteld advies met meerdere gelijktijdige actielijnen** — teruggekoppeld naar het generieke reasoning-flow-ontwerp, zie §19.

**Patiënteducatie (EDU-004)**: eerste item met **gepersonaliseerde samenstelling** i.p.v. vaste tekst — uitbreiding van "educatie combineert meerdere bronnen" naar "educatie is configuratie-afhankelijk per patiënt." Vast deel: erkenning + kernboodschap (bewegen/kracht/balans verkleint valrisico aantoonbaar) + uitleg waarom meerdere zorgverleners betrokken zijn. Variabel deel per relevante factor. Rationale-uitleg-element (uit PPPD) hier hergebruikt bij valangst — bevestigt generieke status.

**Follow-up**: per-factor voortgang, geen enkelvoudig succescriterium. Nieuwe relatie: **signalering→opvolgingsstatus** (voor extern gesignaleerde factoren: is de verwijzing opgevolgd, niet: is het klinisch effect direct meetbaar door fysio). Patroon-type-onderscheid (uit PPPD) hier herbevestigd als generiek, niet itemspecifiek.

## 17. Conclusie stress-testronde

Alle vier geplande stress-tests doorlopen: subtype-variatie (BPPV), dubbele tijdgebonden kwalificatie (vestibulaire hypofunctie), voorwaarde-/uitsluitingsstructuur (PPPD), aggregatie van gelijkwaardige factoren (multifactoriële duizeligheid met valrisico). Het kernmodel (knowledge object + gekwalificeerde relaties + evidence-niveau per item) is bij geen van de vier gebroken — telkens uitgebreid met een nieuw relatietype (gekwalificeerde bevinding→interpretatie / voorwaarde-relatie / aggregatie-relatie / signalering→opvolgingsstatus), nooit herontworpen.

**Kanttekening — objecttype-toetsing alsnog uitgevoerd**: de eerder gesignaleerde aanname is getoetst met concrete voorbeeldobjecten tegen BPPV: SYMP-001 (rotatoire vertigo, met kwalificerende relaties naar meerdere aandoeningen), ANAM-001 (duur van de episode, bevinding→interpretatie-patroon zoals bij testen), CI-001 (cervicale instabiliteit, één keer gedefinieerd i.p.v. driemaal herhaald in interventietabellen), PEARL-001 (kanaalconversie bij persisterende klachten). Alle vier werken structureel zonder wrijving — de aanname uit de eerdere versie van deze paragraaf blijkt te kloppen. Retroactieve omzetting van bestaande vrije tekst naar deze objecttypes voor alle vier items is bewust **niet** nu uitgevoerd — dat is werk voor de technische bouwfase, niet voor dit theoretische document.

**Inhoudelijk gat blootgelegd door deze toets**: clinical pearls (jouw eigen klinische expertise, expliciet los van gepubliceerde evidence — een kernonderscheid uit de oorspronkelijke opzet) zijn in geen van de vier volledig uitgewerkte items daadwerkelijk vastgelegd. Alle content tot nu toe is aan evidence (richtlijn/systematic review/consensus) toegeschreven; nergens staat iets expliciet gelabeld als eigen inzicht apart van een bron.

**Eerste clinical pearl opgehaald en vastgelegd**:
**PEARL-001 — Bij discrepantie tussen subjectieve vertigo en objectieve nystagmus is nystagmus leidend.** Een patiënt kan tijdens Dix-Hallpike/supine roll test herkenbare draaiduizeligheid rapporteren zonder waarneembare nystagmus — in dat geval weegt de objectieve bevinding (afwezigheid nystagmus) zwaarder dan het subjectieve symptoom voor de diagnostische interpretatie. **Bron: eigen klinische expertise, expliciet géén evidence-niveau toegekend.** Gekoppeld aan TEST-001/TEST-002 als aanvullend interpretatieprincipe bij een grensgeval dat de bestaande bevinding→interpretatie-tabellen niet dekken (die gaan uit van nystagmus als uitgangspunt, niet van een subjectief-objectief-conflict).

Drie andere destijds opgehaalde punten zijn bewust **niet** als apart pearl-object toegevoegd: uitvoeringsdetail bij de test (al gedekt door TEST-001), educatie/geruststelling bij angstige patiënten (al gedekt door EDU-001), en "1-3x behandelen" (dit is al aan de literatuur toegeschreven in §4/follow-up, niet aan eigen expertise — zou het evidence/expertise-onderscheid ondermijnen als het hier alsnog als pearl werd gelabeld). Verzamelen van meer pearls blijft een open actiepunt voor een volgende contentronde, met name bij de overige drie items.

## 18. Consistentie-ronde — resultaat

**Toegepast:**
- `relatietype` (uitsluitend/comorbide) nu ook op BPPV's differentiaaldiagnose-tabel: Menière (uitsluitend), vestibulaire migraine (comorbide), CVA/TIA (uitsluitend, acuut), orthostatische hypotensie (comorbide — link naar AAND-004), vestibulaire hypofunctie (uitsluitend)
- Gedeelde Tier 3-stub-bibliotheek ingevoerd: CVA/centraal-vestibulair-syndroom, Menière, labyrintitis worden nu één keer gedefinieerd en door alle hoofditems gerefereerd, niet per item gedupliceerd
- Verwachtingsmanagement: vast verplicht veld op elk patiënteducatie-object (nadruk varieert per item)
- Rationale-uitleg bij counter-intuïtieve adviezen: vast veld, optioneel invulbaar (niet elk item heeft dit nodig)
- `patroon-type` (verwachte fluctuatie/afwijkend beloop): vast onderdeel van elke follow-up-relatie, ook bij niet-fluctuerende beelden (daar simpelweg altijd "afwijkend beloop" bij onverwachte terugval)
- Fase-heroverwegingssignaal nu consistent over alle vier items: RF-006 (BPPV), RF-008 (hypofunctie), RF-012 (PPPD), en nieuw toegevoegd **RF-013 — patroon wijkt af van verwacht multifactorieel beloop** (multifactoriële duizeligheid met valrisico), actietype hypothese-heroverwegen

**Bewust niet toegepast:**
- Consolidatie INT-008/INT-013: afgewezen na overweging — verschillende evidence-lijnen (PPPD-exposure- vs. valpreventieliteratuur) en niet-overlappende populaties rechtvaardigen twee aparte objecten met een "verwant aan"-relatie, geen samenvoeging

**Blijft bewust open:**
- Leesniveau-veld patiënteducatie — nog onvoldoende voorbeelden voor een definitieve keuze

**Doorgeschoven naar eigen vervolgstappen (geen datamodel-opschoning maar inhoudelijke uitbreiding):**
- "Diagnostische waarde"-veld op test-/anamnese-relaties → onderdeel van reasoning-flow-update
- AI-interactiemodel aanvullen met richtlijn voor gepersonaliseerd-samengestelde patiënteducatie (nieuw bij EDU-004) → aparte AI-model-update
- Reasoning-flow-ontwerp aanvullen: enkelvoudige vs. meervoudige/samengestelde uitkomsten → aparte reasoning-flow-update

## 19. Reasoning-flow-update: uitkomsttype en diagnostische waarde

**Probleem opgelost**: het oorspronkelijke flow-ontwerp (§8) ging impliciet uit van één uitkomst per casus. AAND-004 vereist een samengestelde uitkomst (meerdere factoren, elk met eigen status/actie).

**Oplossing — `uitkomsttype` als eigenschap van de aandoening, flow-fasen zelf ongewijzigd**:
- **Enkelvoudig** (BPPV, vestibulaire hypofunctie, PPPD): één hoofdhypothese → één interventiepad → één follow-up-oordeel (eventueel intern gekwalificeerd via subtype/fase/lateraliteit)
- **Samengesteld** (multifactoriële duizeligheid met valrisico en vergelijkbare toekomstige items): geen hoofdhypothese, set relevante factoren met elk eigen interventie/signalering/follow-up — output is een overzicht, geen conclusie

**Effect op de flow**: bij samengesteld-type stopt fase 3 (interpretatie) niet bij de eerste bevestigde factor maar screent door tot het volledige factorenprofiel in beeld is; fase 4/5 leveren een tabel/lijst i.p.v. een lineair vervolgpad. Red-flag-interrupt-logica blijft ongewijzigd op beide typen van toepassing.

**Diagnostische-waarde-veld** (hoog/matig/laag onderscheidend vermogen, geen numerieke scores tenzij hard gepubliceerd) toegevoegd aan elke test-/anamnese-relatie, stuurt testvolgorde in fase 2. Toegepast op alle vier items. **Belangrijke nuance ontdekt bij PPPD**: diagnostische waarde kan **conditioneel** zijn — de Bárány-criteria hebben pas hoge diagnostische waarde als aan de voorwaarde-relatie (afgerond differentiaaldiagnostisch traject) is voldaan. Dit is een afhankelijkheid tussen relaties, geen uitzondering op het veld.

## 20. AI-model-aanvulling: gepersonaliseerd-samengestelde patiënteducatie

Aanvulling op §12: bij samengesteld-type educatie (zoals EDU-004) mag de AI alleen variabele componenten opnemen die corresponderen met factoren die in de reasoning-flow daadwerkelijk als relevant zijn vastgesteld voor de specifieke patiënt — nooit factoren "voor de zekerheid" meenemen zonder bevestiging. Zelfde traceerbaarheidsprincipe als bij gewone AI-antwoorden, nu toegepast op educatie-samenstelling: elk onderdeel herleidbaar tot een vastgestelde bevinding, niet tot een generieke mogelijkheid. Het vaste kerndeel wordt altijd getoond, ongeacht welke variabele factoren van toepassing zijn.

## 21. Status na consistentie-ronde

Alle elf punten verwerkt: zeven direct toegepast (§18), één bewust afgewezen (INT-008/013-consolidatie), één bewust open gelaten (leesniveau-veld — wacht op meer voorbeelden), twee uitgewerkt als vervolgstappen (§19 reasoning-flow, §20 AI-model). Het kennisarchitectuur-fundament is hiermee inhoudelijk compleet voor deze fase: vier volledig uitgewerkte Tier 1/2-items, een generiek en viermaal getoetst kennismodel (vier relatietypes: gekwalificeerde bevinding→interpretatie, voorwaarde-relatie, aggregatie-relatie, signalering→opvolgingsstatus), een reasoning-flow die zowel enkelvoudige als samengestelde uitkomsten aankan, en een AI-interactiemodel met expliciete veiligheids- en traceerbaarheidsprincipes.

**Alsnog toegevoegd punt (twaalfde, eerder verweesd geraakt uit een vroege versie van dit document)**: evidence-niveau op subvraag-niveau (bijv. de canalolithiasis/cupulolithiasis-zijdigheidsbepaling bij BPPV's horizontale kanaal, §3) is nooit als apart veld geformaliseerd — momenteel alleen als toelichtende tekstnoot aanwezig. Blijft **open**: wachten op meer van dit soort gevallen (net als het leesniveau-veld) voordat een generieke veldstructuur wordt vastgesteld, om te voorkomen dat er een veld wordt ontworpen op basis van te weinig voorbeelden.

## 22. Therapeut-workflow (functioneel, geen UI)

Zeven stappen, getoetst aan BPPV, generiek toepasbaar op alle vier items (content/sub-stappen verschillen, workflow-stramien niet):

1. **Intake/aanleiding**: gestructureerde eerste triagevraag (aanvalsgewijs/houdingsafhankelijk vs. continu vs. chronisch >3 maanden) opent een voorlopige hypothese-set — **houdt bewust meerdere hypothese-sets tegelijk open** i.p.v. één pad dwingend te kiezen, om verkeerde vroege sturing te voorkomen (belangrijkste UX-risico van de hele tool)
2. **Gestructureerde anamnese**: adaptief, diagnostische-waarde-volgorde, toont doorlopend de gewogen hypothese-lijst + eventuele getriggerde red flags
3. **Testselectie en -uitvoering**: systeem stelt hoogste-diagnostische-waarde-test voor; bij samengesteld-type (multifactoriële duizeligheid met valrisico) toont het een prioriteitenlijst van te screenen factoren i.p.v. één volgende test
4. **Interpretatie en (bij)stelling**: resultaat + redenering + object-id's + evidence-niveau zichtbaar (geen black box); red-flag-trigger onderbreekt de flow nadrukkelijk, functioneel anders dan een gewone bevinding
5. **Behandelstrategie**: enkelvoudig → één interventievoorstel + contra-indicatie-check; samengesteld → per-factor-overzicht (zelf behandelen/signaleren)
6. **Patiënteducatie genereren**: expliciete therapeut-actie om vrij te geven, nooit automatisch — consistent met therapeut-controle-principe
7. **Follow-up-consult**: toont vorige episode + het bij dat item/uitkomsttype horende follow-up-patroon (hertest / fase+interventie-effect / trendmatig / per-factor) — vereist dat het systeem het eerder vastgestelde item en uitkomsttype herkent en het juiste patroon koppelt

**Bevestiging**: workflow-stramien is itemonafhankelijk — nieuw bewijs dat het fundament schaalt zonder herontwerp per aandoening.

**Modus B — Kennisbank raadplegen (toegevoegd na validatieronde, §27)**
Losstaand van de reasoning-flow: therapeut kan kennisbank-content (aandoeningen, testen, interventies, contra-indicaties) direct doorzoeken/opzoeken zonder een triage of patiëntsessie te starten — functioneel een naslagfunctie op dezelfde onderliggende objecten, geen aparte contentlaag. Geen patiëntkoppeling, dus geen extra privacy-overweging (§23) nodig voor deze modus.

**Sessie-samenvatting (toegevoegd na validatieronde, §27)**
Na (of tijdens) een doorlopen reasoning-flow kan de therapeut een samenvatting oproepen van de genomen stappen binnen die ene sessie: welke hypothesen zijn overwogen en hoe gewogen, welke testen zijn gedaan met welke bevindingen, welke interventie is gekozen, welk vervolgadvies. Functioneel expliciet **geen** dossiervoering: geen langdurige bewaarplicht, geen juridisch-dossierstatus, geen koppeling aan een lopend EPD-systeem — bedoeld als sessiegebonden weergave die de therapeut zelf, indien gewenst, kan overnemen in het eigen (bestaande) patiëntdossier. Zie §13 voor de precieze MVP-afbakening en §23 voor de privacy-consequentie van deze toevoeging.

## 23. Veiligheids- en privacymodel

**Regulatoire classificatie (SaMD/MDR)**: mogelijk van toepassing zodra software klinische hypothesen weegt en behandeladvies structureert; classificatie hangt af van hoe autonoom het systeem oogt. Reeds gunstig geborgd door ontwerp: geen black box, expliciete therapeutverantwoordelijkheid, AI concludeert nooit zelf. Exacte MDR-klasse vereist juridisch advies vóór lancering — niet nu op te lossen.

**Patiëntveiligheid**: grotendeels al geborgd (verplichte red-flag-weergave, escalatie-bij-twijfel, Tier 3 onzichtbaar voor patiënten, traceerbaarheid). Ontbrekend: protocol voor therapeut die AI-suggestie afwijkt (loggen? bevestigingsstap?) — relevant zodra dossiervoering/logging concreet wordt (nu buiten MVP-scope).

**Privacy/AVG**: MVP-risico beperkt (geen patiëntapp, geen volledige dossiervoering). Aandachtspunten voor later: anamnese-/testgegevens zijn bijzondere persoonsgegevens (grondslag, beveiligingsniveau, verwerkersovereenkomst bij cloud/AI-verwerking door derden); bij patiëntapp (fase 2) apart uit te werken: dataeigenaarschap, bewaartermijn, inzage/correctie.

**Precisering na validatieronde (§27)**: de sessie-samenvatting (§22) verwerkt onvermijdelijk hetzelfde soort bijzondere persoonsgegevens als hierboven beschreven, ook al is de opslag bewust kortdurend/sessiegebonden en niet dossiervormend. Dit betekent dat het "beperkt AVG-risico"-uitgangspunt van MVP niet langer volledig klopt zonder nuance: er moet, óók voor deze lichte functie, een concrete bewaartermijn en verwijderprincipe worden vastgesteld (bijv. automatisch verwijderen na X dagen, of direct na export door de therapeut) — dit is niet meer uit te stellen tot fase 2 zoals eerder verondersteld, en verdient aandacht vóór technische bouw van deze specifieke functie, ook al blijft de rest van het AVG-vraagstuk (patiëntapp, langdurige opslag) terecht bij fase 2 liggen.

**Informed consent/transparantie**: therapeut moet weten dat AI ondersteunend, niet beslissend is — zichtbaar te maken richting eindgebruiker, niet alleen intern in het model. Patiënt moet (bij patiëntapp) weten dat gepersonaliseerde educatie AI-samengesteld is op basis van therapeut-vastgestelde bevindingen, om "AI-diagnose"-misverstand te voorkomen.

**Kanttekening**: geen concreet AVG-nalevingsplan of MDR-classificatie hier uitgewerkt — vereist gespecialiseerd juridisch advies met actuele bronnen. De reeds gemaakte ontwerpkeuzes (transparantie, therapeutverantwoordelijkheid) sluiten toevallig al goed aan bij wat zulk beleid vereist, maar dat moet niet als garantie voor toekomstige, andere ontwerpkeuzes worden aangenomen.

## 24. Patiënt-workflow (functioneel, geen UI)

Twee functioneel losstaande workflows, conform het onderscheid uit §10.

**Workflow A — patiënt binnen lopend fysiotraject:**
1. Toegang tot educatie pas na expliciete therapeut-vrijgave — geen zelfstandige toegang tot ruwe kennisbank
2. Op elk moment terug te vinden/herlezen (ondersteunt therapietrouw)
3. Oefeningen/behandeladvies gekoppeld aan vrijgegeven interventie, incl. rationale-uitleg waar van toepassing
4. Symptoomregistratie: gestructureerd (gekoppeld aan knowledge objects), nooit vrije tekst — anders niet bruikbaar in therapeut-follow-up
5. Signalering: patroon dat overeenkomt met vertaalde red-flag-indicatie triggert een vooraf vastgelegde boodschap + signaal naar therapeut vóór het volgende consult — **nooit** zelf beoordeeld door de patiëntapp. Eerste toepassing van het escalatie-bij-twijfel-principe (§12) op patiënt-gegenereerde data.

**Workflow B — losstaande patiënt (geen fysiotraject):**
1. Sterk vereenvoudigde triagevraag, met fundamenteel ander doel dan de therapeut-triage: geen hypothese-weging, alleen globaal aangeven of de klacht past bij wat de fysio rechtstreeks kan beoordelen — **nooit een aandoening noemen**, puur een verwijzingsfilter. Bewust smaller dan wat de kennisbank technisch zou toelaten, om te voorkomen dat dit een ongecontroleerde zelfdiagnose-tool wordt.
2. Bij "past bij fysio": informatie over directe toegang fysiotherapie (DTF) — concrete uitwerking van het bekendheidsprobleem uit §10. Bij "vraagt andere beoordeling": generieke verwijzing naar huisarts, zonder aandoening te suggereren.
3. Workflow eindigt hier — bewust geen educatie/oefeningen/registratie zonder therapeutrelatie, om te voorkomen dat de app zelfstandig behandeladvies geeft zonder klinische controle.

**Modelconsequentie**: workflow B introduceert een beperkte "verwijzingsfilter-vraag" — geen nieuw `type object`, wel een aparte, bewust ondiepe functie die slechts raadpleegt welke hoofdklachtpatronen bij welke tier horen, zonder de volledige reasoning-flow-machinerie te gebruiken.

## 25. Personas, user journey & roadmap

**Personas** (functioneel, geen uitgebreide fictieve biografieën):
- **De generalist** (fysiotherapeut): breed, weinig routine met duizeligheid. Behoefte: vertrouwen niets te missen + duidelijk stappenplan, gebruikt vooral de kernroute.
- **De verdiepende collega** (fysiotherapeut): interesse zonder specialisatie. Behoefte: het waarom, gebruikt actief de diepte-laag als leermoment.
- **De patiënt met lopend traject**: wil begrijpen, gerustgesteld worden waar terecht, weten wat er verwacht wordt.
- **De onzekere zoeker** (losstaande patiënt, workflow B): weet niet welke zorgverlener passend is, behoefte aan snelle betrouwbare richting zonder overweldiging.

**Geïntegreerde user journey (BPPV, ter demonstratie dat de onderdelen als keten werken)**:
Triage → adaptieve anamnese versmalt naar BPPV (hoog) → Dix-Hallpike bevestigt posterior → Epley + contra-indicatiecheck → EDU-001 vrijgegeven → patiënt volgt zelfmanagement → vervolgconsult: hertest negatief → afgesloten met recidief-/alarmsignaal-informatie. Eerste keer dat kennismodel, reasoning-flow, en beide workflows in één ononderbroken lijn zijn doorlopen in plaats van per onderdeel apart.

**Roadmap** (samenvattend, verwijst naar eerder vastgestelde stappen):
1. Theoretische fase (huidig) — grotendeels afgerond
2. MVP: BPPV-only, therapeut-tool, klein/zelfstandig
3. Na MVP-validatie: overige drie items (content al gereed in dit document) op hetzelfde niveau uitbouwen
4. Fase 2: patiëntapp, workflow A operationeel
5. Fase 3: losstaande patiëntfunctie (workflow B) — bewust later vanwege de verwijzingsfilter-gevoeligheid
6. Doorlopend: eindrichting B2B2C met specialist-positionering als stip op de horizon, opschalingstempo afhankelijk van MVP-resultaat

## 26. Dossierstatus

Vrijwel alle 24 onderdelen uit de oorspronkelijke opzet zijn nu gedekt op het niveau passend bij deze theoretische fase. Bewust nog niet gedaan: therapeut dashboard/patiëntomgeving als schermontwerp (UI-werk, technische fase), apart behandelplanmodel-format (overlapt al met interventie-/follow-up-structuur), technisch vertaalbare requirements (bewust uitgesteld sinds de start van dit traject).

## 27. Validatieronde met collega-fysiotherapeuten

Eerste externe toetsing van het concept (BPPV-samenvatting) bij vijf fysiotherapeuten, buiten dit project ontstaan.

**Bevestigd**:
- Kernprobleem herkend: collega's verwijzen duizeligheidspatiënten vaak door bij gebrek aan specialisatie, zouden de tool zelf gebruiken en verwachten er ook van te leren
- Stap-voor-stap-redenering met zichtbare onderbouwing wordt gewaardeerd: geeft overzicht, voorkomt het missen van stappen — bevestigt het "geen black box"-principe in de praktijk, niet alleen in theorie

**Nieuwe, concrete eis — twee gebruiksmodi ontbraken**:
1. **Losstaand kennisbank-raadplegen**, los van een actief reasoning-proces — puur iets opzoeken
2. **Terugkijken op een eerder consult**: alle genomen stappen + een samenvattende conclusie van het doorlopen redeneerproces, raadpleegbaar ná het consult wanneer er tijdens het consult zelf geen ruimte was

**Precisering, geen omkering, van de MVP-beslissing** (§13: "geen dossiervoering/EPD-integratie, geen logging"): dat uitgangspunt blijft staan voor volledige, juridisch dossiervormende patiëntregistratie. Wat hier gevraagd wordt is functioneel lichter: een sessiegebonden samenvatting van één doorloop van de reasoning-flow — geen vervanging van het bestaande EPD van de therapeut, wel iets dat er eenvoudig in te kopiëren is. Dit onderscheid wordt hieronder uitgewerkt (§22, §13, §23).

**Adoptievoorwaarde expliciet uitgesproken**: alle vijf zouden de tool gebruiken, **op voorwaarde dat** kennisbank-raadplegen en naslag/samenvatting mogelijk zijn — niet alleen de live-reasoning-modus. Dit is dus geen "nice to have" maar een voorwaarde voor het bereiken van het bereik-doel uit het businessmodel (§11).

---

*Dit document dient als levend referentiemodel. Bij aanpassingen aan het onderliggende datamodel (n.a.v. volgende items) dient dit document herzien te worden.*
