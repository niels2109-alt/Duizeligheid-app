# Proefmigratie: BPPD → Gedeeld Symptoomvocabulaire
### Proof of concept voor Clinical Reasoning Engine V2 (§6, aanbevolen eerste stap)

Doel: de huidige, samengevoegde "klinische kenmerken" van BPPD (referentiedocument §2) opsplitsen in losse, herbruikbare objecten en elk daarvan afzetten tegen alle vier aandoeningen — als test of dit werk behapbaar is.

---

## Stap 1-2: bestaande tekst opgesplitst in losse objecten

Uitgangstekst (referentiedocument §2): *"Kortdurende (seconden – <1 min), heftige rotatoire vertigo. Uitgelokt door specifieke bewegingen. Geen gehoorverlies, geen klachten tussen episodes door. Vaak recidiverend."*

Opgesplitst in zes losse objecten:

| ID | Naam | Type |
|---|---|---|
| ANAM-002 | Duur van de episode: seconden – <1 minuut | Anamnese-item |
| SYMP-002 | Aard van de klacht: heftige rotatoire vertigo | Symptoom |
| ANAM-003 | Uitlokkende factor: specifieke hoofd-/houdingsbeweging (omdraaien in bed, hoofd achterover, bukken) | Anamnese-item |
| ANAM-004 | Gehoorklachten: afwezig | Anamnese-item |
| ANAM-005 | Klachtenvrije intervallen tussen episodes | Anamnese-item |
| ANAM-006 | Recidiverend beloop | Anamnese-item |

---

## Stap 3-4: polariteit en diagnostische waarde per aandoening

| Kenmerk | → BPPD | → Vestibulaire hypofunctie | → PPPD | → Multifactorieel/valrisico |
|---|---|---|---|---|
| **ANAM-002** Duur seconden–<1 min | Ondersteunt, **hoog** | Spreekt tegen, **hoog** (duurt dagen, niet seconden) | Spreekt tegen, **matig** (PPPD is chronisch-aanhoudend, geen korte episodes) | Spreekt tegen, **laag** (chronisch/continu beeld, geen kenmerkende korte duur) |
| **SYMP-002** Heftige rotatoire vertigo | Ondersteunt, **hoog** | Ondersteunt, **matig** (kan ook rotatoir zijn in acute fase — zwakkere discriminatie) | Spreekt tegen, **matig** (PPPD kenmerkt zich juist door niet-vertigineuze klachten — onvastheid, zwaarte) | Spreekt tegen, **matig** (doorgaans vage onbalans, geen heftige rotatoire aanval) |
| **ANAM-003** Houdingsuitlokking | Ondersteunt, **hoog** (kernkenmerk) | Spreekt tegen, **hoog** (niet houdingsafhankelijk, continu) | Spreekt tegen, **matig** (PPPD verergert wel bij beweging, maar als aanhoudende overgevoeligheid — ander mechanisme dan BPPD's korte provocatie) | Neutraal (geen kenmerkende houdingsuitlokking, ook geen duidelijke tegenspraak) |
| **ANAM-004** Geen gehoorklachten | Neutraal* | Neutraal* | Neutraal* | Neutraal* |
| **ANAM-005** Klachtenvrije intervallen | Ondersteunt, **hoog** | Spreekt tegen, **hoog** (continu, geen klachtenvrije tussenpozen) | Spreekt tegen, **hoog** (per definitie chronisch aanwezig op de meeste dagen — kerncriterium) | Spreekt tegen, **matig** (chronisch/fluctuerend, geen scherpe klachtenvrije intervallen) |
| **ANAM-006** Recidiverend beloop | Ondersteunt, **matig** | Neutraal | Neutraal tot licht spreekt-tegen, **laag** | Neutraal |

*\*Toelichting ANAM-004, zie bevinding hieronder.*

---

## Belangrijkste bevinding uit deze proef

**ANAM-004 (afwezigheid van gehoorklachten) bleek neutraal te zijn tegenover alle vier de aandoeningen** — geen van de vier Tier 1/2-items wordt gekenmerkt door de aan- of afwezigheid van gehoorklachten. De werkelijke onderscheidende waarde van dit kenmerk ligt **buiten deze vier items**: het helpt vooral om BPPD te onderscheiden van Menière (een Tier 3-stub), niet om de vier hoofditems onderling te onderscheiden.

**Consequentie voor V2**: niet elk klinisch kenmerk dat nu in de vrije tekst van een aandoening staat, is per se een goede kandidaat voor het cross-hypothese-vocabulaire tussen de vier hoofditems. Sommige kenmerken zijn juist relevant voor de **differentiatie met Tier 3** (bijvoorbeeld: uitsluiten van een gevaarlijkere/andere oorzaak), niet voor het onderling rangschikken van de vier fysio-behandelbare hypothesen. Dit onderscheid stond nog niet expliciet in het V2-ontwerp en is nu, dankzij deze proef, aan het licht gekomen — dat is precies waar zo'n kleine proef voor bedoeld is.

---

## Antwoord op de kernvraag: is dit behapbaar?

**Voor dit ene item (6 kenmerken, 4 aandoeningen = 24 polariteit-beoordelingen)**: ja, dit was in één keer te doen, met heldere, beargumenteerde uitkomsten — geen enkel geval waarbij ik moest gokken zonder klinische onderbouwing.

**Realistische inschatting voor alle vier items samen**: BPPD had 6 kenmerken. Vestibulaire hypofunctie en PPPD hebben vergelijkbare of iets grotere aantallen (gezien hun extra kwalificatie-dimensies), multifactoriële duizeligheid heeft al 8 aparte factoren die zich deels al als losse objecten gedragen. Grove inschatting: **25-30 kenmerken totaal, elk tegen 4 aandoeningen beoordeeld =​ ruim 100 polariteit-relaties**. Dat is behapbaar in meerdere sessies zoals deze, maar geen werk van vijf minuten — reken op een vergelijkbaar aantal stappen als het uitwerken van één van de oorspronkelijke vier items zelf.

---

## Aanbeveling

Dit bevestigt dat de aanpak werkt en overzichtelijk blijft. Ik zou voorstellen de overige drie items op dezelfde manier te migreren — één voor één, net als deze proef — vóórdat de rangschikkingsengine zelf wordt gebouwd. Bij elk volgend item extra op letten: expliciet checken welke kenmerken écht onderscheidend zijn tussen de vier hoofditems, en welke (zoals ANAM-004 hier) eigenlijk een Tier 3-differentiator zijn — dat onderscheid nu meteen goed labelen voorkomt ruis in de latere rangschikkingslogica.

---

# Migratie 2: Vestibulaire hypofunctie

Uitgangstekst (referentiedocument §14): *"Continue duizeligheid/onbalans (niet aanvalsgewijs, niet houdingsafhankelijk). Unilateraal: acuut vaak hevige rotatoire vertigo + misselijkheid/braken, later vaag onbalansgevoel. Bilateraal: geen vertigo-aanval, wel chronische onbalans + oscillopsie."*

## Opgesplitst in zeven losse objecten

| ID | Naam | Kwalificatie |
|---|---|---|
| ANAM-007 | Continue duizeligheid, niet aanvalsgewijs | — |
| ANAM-008 | Niet houdingsafhankelijk | — |
| SYMP-003 | Hevige rotatoire vertigo | fase=acuut, lateraliteit=unilateraal |
| ANAM-009 | Misselijkheid/braken | fase=acuut |
| SYMP-004 | Vaag onbalansgevoel | fase=chronisch |
| ANAM-010 | Afwezigheid van vertigo-aanval | lateraliteit=bilateraal |
| SYMP-005 | Oscillopsie (wazig zien bij hoofdbeweging) | lateraliteit=bilateraal |

## Polariteit en diagnostische waarde per aandoening

| Kenmerk | → BPPD | → Vest. hypofunctie | → PPPD | → Multifactorieel |
|---|---|---|---|---|
| **ANAM-007** Continue, niet aanvalsgewijs | Spreekt tegen, **hoog** | Ondersteunt, **hoog** | Ondersteunt, **matig*** | Ondersteunt, **matig*** |
| **ANAM-008** Niet houdingsafhankelijk | Spreekt tegen, **hoog** | Ondersteunt, **matig** (deels redundant met ANAM-007) | Neutraal | Neutraal |
| **SYMP-003** Hevige rotatoire vertigo *(fase=acuut, lateraliteit=unilateraal)* | Ondersteunt, **matig** (overlap, zwakke discriminator — zelfde patroon als bij BPPD-migratie) | Ondersteunt, **hoog** (alleen bij deze kwalificatie) | Spreekt tegen, **matig** | Spreekt tegen, **matig** |
| **ANAM-009** Misselijkheid/braken *(fase=acuut)* | Neutraal | Ondersteunt, **matig** (alleen bij fase=acuut) | Spreekt tegen, **laag** | Neutraal |
| **SYMP-004** Vaag onbalansgevoel *(fase=chronisch)* | Spreekt tegen, **matig** | Ondersteunt, **hoog** (bij fase=chronisch) | Ondersteunt, **matig*** | Ondersteunt, **matig*** |
| **ANAM-010** Afwezigheid vertigo-aanval *(lateraliteit=bilateraal)* | Spreekt tegen, **matig** | Ondersteunt, **matig** (bij lateraliteit=bilateraal) | Neutraal | Ondersteunt, **laag** |
| **SYMP-005** Oscillopsie *(lateraliteit=bilateraal)* | Spreekt tegen, **matig** | Ondersteunt, **hoog** (bij lateraliteit=bilateraal) | Neutraal | Ondersteunt, **laag** |

*\*Toelichting, zie bevinding hieronder.*

## Belangrijkste bevindingen uit deze proef

**Bevinding 1 — bevestiging van de vooraf verwachte complexiteit**: drie van de zeven kenmerken (SYMP-003, ANAM-009, ANAM-010, SYMP-005) hebben inderdaad, zoals voorzien, een polariteit die alleen bij een specifieke fase/lateraliteit-kwalificatie geldt. Dit is precies het patroon dat we vooraf signaleerden — het model kan dit aan (de kwalificatie stond al in het datamodel), maar het betekent wel dat dit item meer nauwkeurigheid vraagt bij het invullen dan BPPD deed.

**Bevinding 2 — een nieuw, onverwacht inzicht: zwakke onderlinge discriminatie tussen de drie "chronische" aandoeningen**. ANAM-007 ("continue, niet aanvalsgewijs") en SYMP-004 ("vaag onbalansgevoel") discrimineren beide sterk tegen BPPD, maar zijn **zwak onderscheidend tussen vestibulaire hypofunctie, PPPD, en multifactoriële duizeligheid onderling** — alle drie kunnen chronisch en vaag-onbalans-achtig presenteren. Dit is een reëel klinisch gegeven (geen modelfout), maar het betekent dat de rangschikkingsengine (§10 V2-ontwerp) bij een chronische presentatie waarschijnlijk vaker in "geen duidelijke dominante hypothese" terechtkomt, tenzij er scherpere, meer specifieke onderscheidende kenmerken worden toegevoegd (bijv. de al bestaande testen zoals HIT, DVA, NPQ) om deze drie uit elkaar te trekken. Dit bevestigt een zorg die al in de kritische review van het V2-ontwerp stond (punt 2: risico dat "geen dominante hypothese" te vaak de uitkomst wordt) — nu met een concreet, aanwijsbaar voorbeeld in plaats van alleen een principieel risico.

## Antwoord op de kernvraag

Dit item was **iets bewerkelijker** dan BPPD (kwalificaties moeten worden meegenomen), maar nog steeds in één sessie te doen. Belangrijker dan de tijdsinvestering: deze proef heeft een concreet, klinisch relevant risico blootgelegd dat in het V2-ontwerp nog alleen theoretisch was benoemd.

---

# Migratie 3: PPPD

Uitgangstekst (referentiedocument §15): *"Chronisch (≥3 maanden), niet-vertigineus (onvastheid/zwaarte i.p.v. draaiduizeligheid), uitgelokt door rechtop staan/lopen/beweging/complexe visuele prikkels, vaak vervolgdiagnose na ander (hersteld) organisch event."*

**Vooraf, apart van de gewone kenmerken**: PPPD heeft ook de bestaande **voorwaarde-relatie** (differentiaaldiagnostisch traject afgerond, referentiedocument §15/requirements §8.1) — dit is geen symptoom met een polariteit, maar een randvoorwaarde die los blijft staan van onderstaande tabel. Dat verandert niet door deze migratie.

## Opgesplitst in zes losse objecten (excl. de voorwaarde zelf)

| ID | Naam | Kwalificatie |
|---|---|---|
| ANAM-011 | Duur ≥3 maanden, meeste dagen | — |
| SYMP-006 | Niet-vertigineus: onvastheid/zwaarte i.p.v. draaiduizeligheid | — |
| ANAM-012 | Uitgelokt door rechtop staan/lopen | — |
| ANAM-013 | Uitgelokt door actieve/passieve eigen beweging | — |
| ANAM-014 | Uitgelokt door complexe/bewegende visuele prikkels | — |
| ANAM-015 | Precipiterend organisch event in voorgeschiedenis, al hersteld | — |

## Polariteit en diagnostische waarde per aandoening

| Kenmerk | → BPPD | → Vest. hypofunctie | → PPPD | → Multifactorieel |
|---|---|---|---|---|
| **ANAM-011** Duur ≥3 maanden | Spreekt tegen, **hoog** | Spreekt tegen, **hoog** *(fase=acuut)* / Neutraal *(fase=chronisch — overlap)* | Ondersteunt, **hoog** | Ondersteunt, **matig** (overlap, ook chronisch) |
| **SYMP-006** Niet-vertigineus (onvastheid/zwaarte) | Spreekt tegen, **hoog** | Spreekt tegen, **matig** *(fase=acuut)* / Ondersteunt, **matig** *(fase=chronisch — overlap, zelfde patroon als SYMP-004)* | Ondersteunt, **hoog** | Ondersteunt, **matig** (overlap) |
| **ANAM-012** Uitgelokt door staan/lopen | Neutraal | Neutraal | Ondersteunt, **hoog** | Ondersteunt, **matig** (overlap — ook kenmerkend bij valrisico-beeld) |
| **ANAM-013** Uitgelokt door eigen beweging | Neutraal | Neutraal | Ondersteunt, **hoog** | Neutraal |
| **ANAM-014** Uitgelokt door complexe visuele prikkels | Spreekt tegen, **laag** | Ondersteunt, **laag** *(alleen lateraliteit=bilateraal, oscillopsie-gerelateerd)* | Ondersteunt, **hoog** | Neutraal |
| **ANAM-015** Precipiterend event in voorgeschiedenis | Neutraal | Neutraal | Ondersteunt, **hoog** | Neutraal |

## Belangrijkste bevinding: het "chronisch-cluster"-probleem is deels op te lossen, maar niet met duur alleen

Dit bevestigt én nuanceert de bevinding uit migratie 2. **Duur/chronisch-zijn (ANAM-011) en niet-vertigineuze aard (SYMP-006) blijven zwak onderscheidend** tussen PPPD, chronische vestibulaire hypofunctie, en multifactoriële duizeligheid — precies het risico dat al was gesignaleerd.

**Maar**: de **uitlokkende factoren** (ANAM-012/013/014, met name de complexe visuele prikkels) blijken wél scherp en vrijwel uniek onderscheidend voor PPPD, met nauwelijks overlap naar de andere drie. Dat betekent dat het "chronisch-cluster"-probleem **niet onoplosbaar is**, maar wel vraagt dat de rangschikkingsengine (en de vraagvolgorde in de flow) gericht doorvraagt naar het **type uitlokking**, niet alleen naar duur en aard van de klacht — duur alleen zou bij een chronische presentatie inderdaad vaak op "geen dominante hypothese" uitkomen, maar een gerichte vraag naar visuele-prikkel-gevoeligheid kan dat direct doorbreken.

**Concrete aanbeveling voor de flow-ontwerp (§9, V2 ontbrekende-informatie-model)**: bij een chronische presentatie waar de rangschikking vastloopt tussen twee of drie "chronische" hypothesen, moet het systeem specifiek ANAM-012/013/014 (uitlokkingstype) als hoogst-prioritaire vervolgvraag voorstellen — dit is nu een concrete, onderbouwde regel in plaats van een abstract principe.

## Antwoord op de kernvraag

Ook dit item bleef behapbaar. Belangrijker: deze derde migratie heeft niet alleen bevestigd wát het risico uit migratie 2 was, maar ook **hoe het opgelost kan worden** — een concreet, bruikbaar resultaat dat je zonder deze drie proeven pas tijdens het bouwen van de rangschikkingsengine zelf zou zijn tegengekomen, op een duurder moment.

---

# Migratie 4: Multifactoriële duizeligheid met valrisico

Ander uitgangspunt dan de vorige drie: dit item heeft al eigen `FACTOR-xxx`-objecten (referentiedocument §16) in plaats van één blok vrije tekst. De oefening hier is dus niet "opsplitsen", maar elk bestaand factor-object alsnog expliciet afzetten tegen de andere drie hoofditems.

## Polariteit en diagnostische waarde per aandoening

| Factor | → BPPD | → Vest. hypofunctie | → PPPD | → Multifactorieel |
|---|---|---|---|---|
| **FACTOR-001** Propriocepsis | Neutraal | Neutraal | Neutraal | Ondersteunt, **hoog** |
| **FACTOR-002** Spierzwakte | Neutraal | Neutraal | Neutraal | Ondersteunt, **hoog** |
| **FACTOR-003** Visusachteruitgang (objectief) | Neutraal | Neutraal | Neutraal* | Ondersteunt, **hoog** |
| **FACTOR-004** Polyfarmacie | Neutraal | Neutraal | Neutraal | Ondersteunt, **hoog** |
| **FACTOR-005** Orthostatische hypotensie | Neutraal | Neutraal | Neutraal | Ondersteunt, **hoog** |
| **FACTOR-006** Milde vestibulaire achteruitgang | Spreekt tegen, **laag** | Ondersteunt, **matig** (overlap, m.n. bilateraal/geleidelijk) | Neutraal | Ondersteunt, **hoog** |
| **FACTOR-007** Valangst | Neutraal | Neutraal | Ondersteunt, **laag** (conceptuele overlap met bewegingsangst) | Ondersteunt, **hoog** |
| **FACTOR-008** Cognitieve achteruitgang | Neutraal | Neutraal | Neutraal | Ondersteunt, **matig** (signalerend, niet primair diagnostisch — al zo vastgelegd) |

*\*Zie bevinding 1 hieronder — expliciete waarschuwing, geen simpele "neutraal".*

## Belangrijkste bevindingen

**Bevinding 1 — verwarringsrisico tussen FACTOR-003 en ANAM-014**: visusachteruitgang (FACTOR-003, een objectief, meetbaar gegeven — verminderde gezichtsscherpte) en de visuele-prikkel-gevoeligheid uit de PPPD-migratie (ANAM-014, een functionele overgevoeligheid voor complexe visuele input, geen acuity-probleem) zijn **fundamenteel verschillende constructen**, ook al gebruiken beide het woord "visueel". Ik markeer dit expliciet als contentrisico: bij het bouwen van de daadwerkelijke vragenlijst/interface moet dit onderscheid glashelder blijven, anders beantwoordt een therapeut per ongeluk de verkeerde vraag voor de verkeerde hypothese.

**Bevinding 2 — bevestiging van een al bestaande, nu opnieuw aangetoonde relatie**: FACTOR-006 (milde vestibulaire achteruitgang) overlapt reëel met vestibulaire hypofunctie, met name de bilaterale/geleidelijk-ontstane variant. Dit **bevestigt** de al bestaande comorbide-differentiaaldiagnose-relatie tussen deze twee items (referentiedocument §14) — een nuttige consistentiecheck, geen nieuw risico.

**Bevinding 3 — structureel inzicht voor de V2-engine**: in tegenstelling tot de eerdere drie migraties, waar veel kenmerken elkaar onderling raakten, zijn de meeste `FACTOR`-objecten **neutraal** tegenover BPPD/vestibulaire hypofunctie/PPPD, en andersom. Dat betekent dat de samengestelde aggregatielogica van dit item **grotendeels los** staat van de rangschikkingslogica van de andere drie, op twee expliciete overlappunten na (FACTOR-006 met vestibulaire hypofunctie, FACTOR-007 met PPPD). **Consequentie voor het V2-ontwerp**: de rangschikkingsengine hoeft geen volledig verweven berekening te zijn tussen alle vier items — voor dit vierde item kan de factor-screening grotendeels parallel lopen aan de hypothese-rangschikking van de andere drie, met slechts twee expliciete kruisverwijzingen. Dat is eenvoudiger te bouwen dan wanneer alles even sterk met elkaar verweven zou zijn geweest.

---

# Eindsynthese: vier migraties voltooid

Alle vier items zijn nu doorlopen. Samengevat wat dit opleverde, los van de individuele tabellen:

1. **Haalbaarheid bevestigd**: alle vier pasten in behapbare, losse sessies — geen van de vier liep vast of bleek te complex om te doen.
2. **Eén contentles**: niet elk bestaand kenmerk is een goede kandidaat voor cross-hypothese-vocabulaire — sommige (zoals BPPD's gehoorverlies-afwezigheid) zijn eigenlijk Tier 3-differentiators, geen onderlinge discriminator tussen de vier hoofditems.
3. **Eén reëel risico, concreet aangetoond**: chronische presentaties (vestibulaire hypofunctie-chronisch, PPPD, multifactorieel) delen zwakke, overlappende basiskenmerken (duur, vage onbalans) — de rangschikkingsengine zal hier zonder aanvullende sturing vaak op "geen dominante hypothese" uitkomen.
4. **Eén concrete oplossing voor dat risico**: PPPD's uitlokkingstype (met name visuele complexiteit) is wél scherp onderscheidend — dit levert een directe, onderbouwde regel op voor de vraagvolgorde bij vastgelopen rangschikkingen.
5. **Eén structureel inzicht**: het vierde, samengestelde item hangt losser samen met de andere drie dan gedacht, met slechts twee expliciete overlappunten — dat vereenvoudigt de bouw van de rangschikkingsengine voor dit specifieke item.
6. **Eén contentrisico voor de bouwfase**: visusachteruitgang (objectief) en visuele-prikkel-gevoeligheid (functioneel) gebruiken vergelijkbare taal maar zijn andere constructen — moet scherp gescheiden blijven in de uiteindelijke interface.

**Dit is precies het soort resultaat dat de aanbevolen eerste stap uit het V2-ontwerp (§"Mijn aanbeveling voor de volgende stap") moest opleveren**: geen enkele verrassing die de haalbaarheid van V2 in twijfel trekt, wel drie concrete, bruikbare inzichten die de latere rangschikkingsengine slimmer en beter onderbouwd maken dan wanneer die blind vanuit het oorspronkelijke ontwerp was gebouwd.
