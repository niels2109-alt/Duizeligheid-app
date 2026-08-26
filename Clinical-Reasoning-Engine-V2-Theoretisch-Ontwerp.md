# Clinical Reasoning Engine V2 — Theoretisch Herontwerp

*Status: zuiver theoretisch. Geen code, geen implementatie, geen UI-ontwerp. Blauwdruk voor latere bouw.*

---

## 1. Executive summary

V2 verschuift het startpunt van de reasoning-flow van **"welke duizeligheidsvorm is dit?"** naar **"hoe presenteert deze patiënt zich?"**. In plaats van vroeg te vertakken naar één van de vier bestaande aandoeningen, verzamelt de flow eerst een breed, gedeeld beeld van de presentatie en weegt daarna **alle** hypothesen tegelijk — inclusief de mogelijkheid dat geen enkele duidelijk dominant is.

Dit is minder een volledige herbouw dan het op het eerste gezicht lijkt: het bestaande kennismodel (knowledge object + gekwalificeerde relaties, vier relatietypes, evidence-niveau per item) hoeft niet te veranderen. Wat wél moet veranderen: symptomen en anamnese-items moeten van *vrije tekst binnen één aandoening* naar *gedeelde, herbruikbare objecten met relaties naar meerdere aandoeningen tegelijk* — dit is het zwaarste, makkelijk te onderschatten onderdeel van dit herontwerp.

---

## 2. Waarom het huidige model onvoldoende is

Eerlijke analyse, niet alleen bevestiging van het probleem zoals gesteld:

Het huidige model is **minder eng ontworpen dan het aanvoelt**. De therapeut-workflow (§22, Stap 1) legt al vast dat de eerste triagevraag "meerdere hypothese-sets tegelijk moet openhouden, nooit één pad forceren" — dat principe staat er dus al. Het probleem zit niet in de intentie, maar in de **uitvoering**: zodra een hypothese-set is geopend, zijn de vervolg-anamnese-items in de praktijk per aandoening apart gemodelleerd (elke `bevinding→interpretatie`-relatie hangt aan één specifieke aandoening). Er is geen gedeeld vocabulaire waarmee een symptoom gelijktijdig tegen alle vier aandoeningen wordt afgezet.

**Concrete, aantoonbare bevestiging van dit gat**: in de consistentie-ronde (referentiedocument §17) hebben we zelf al vastgesteld dat *Symptoom* en *Anamnese-item* als objecttypes weliswaar zijn getoetst (één voorbeeldobject: SYMP-001, ANAM-001, tegen BPPD), maar nooit daadwerkelijk zijn gebruikt om de vier bestaande items met elkaar te verbinden. Dat is precies de makkelijk-te-onderschatten oorzaak van de beperking die deze opdracht beschrijft.

---

## 3. Nieuw conceptueel model

```
GEDEELD SYMPTOOM-/ANAMNESE-VOCABULAIRE
        ↓
ALLE AANDOENING-OBJECTEN TEGELIJK GERAADPLEEGD
        ↓
KWALITATIEVE RANGSCHIKKING (nooit numeriek)
        ↓
GERICHT ONDERZOEK (cross-hypothese geselecteerd)
        ↓
HERWEGING MET EXPLICIETE VERKLARING
        ↓
CONCLUSIE: dominant | meerdere relevante | geen dominante
        ↓
BEHANDELPLAN (gekoppeld aan gekozen hypothese)
        ↓
KENNISBANK (bidirectioneel gekoppeld, niet los)
```

Kernprincipe: elke relatie tussen een symptoom/test en een aandoening krijgt een **polariteit** (nieuw veld, zie §7) — ondersteunt / spreekt tegen / neutraal — zodat één ingevoerde bevinding gelijktijdig tegen meerdere hypothesen kan worden afgewogen, in plaats van sequentieel per aandoening.

---

## 4. Volledige gebruikersflow

1. Rode vlaggen (doorlopend actief, niet alleen bij intake)
2. Brede symptoom-/klachtinventarisatie (gedeeld vocabulaire, geen keuze voor één aandoeningsfamilie vooraf)
3. Initiële hypotheserangschikking (alle vier aandoeningen + relevante Tier 3-stubs tegelijk gewogen)
4. Uitleg per hypothese: waarom wel/niet passend, wat ontbreekt
5. Testselectie (cross-hypothese, niet per aandoening apart)
6. Testresultaten invoeren
7. Herweging + verklaring van de verandering
8. Klinische conclusie (dominant / meerdere / geen dominante)
9. Behandelplan
10. Kennisbank (bidirectioneel bereikbaar vanuit elk punt in de flow)

---

## 5. Rode-vlaggenarchitectuur

**Grotendeels hergebruik, andere positionering.** Alle bestaande red-flag-objecten (RF-001 t/m RF-013, alle vier items) bestaan al met `actietype` (acuut-verwijzen / hypothese-heroverwegen / samenwerking-adviseren). Wat verandert: dit wordt nu een **losstaande, altijd-actieve module aan het begin**, niet iets dat pas "ontdekt" wordt binnen het pad van één specifieke aandoening.

**Categorieën** (gegroepeerd, herbruikt uit bestaande content):
- Acuut-neurologisch (RF-001, RF-007)
- Cardiovasculair (RF-004)
- Otologisch/gehoor (RF-003, RF-009)
- Hoofdpijn/intracranieel (RF-005)
- Atypisch testpatroon (RF-002)
- Gedrags-/psychisch op de voorgrond (RF-011)
- Beloop wijkt af van verwacht (RF-006, RF-008, RF-012, RF-013)

**Wat dit concreet vraagt**: de al geplande, maar nog niet uitgevoerde **gedeelde Tier 3-stub-bibliotheek** (referentiedocument §18, punt 4 — "overweeg gedeelde stub-bibliotheek, nog niet uitgevoerd") wordt hier de ruggengraat. Dit herontwerp maakt die eerdere, uitgestelde opschoning nu functioneel noodzakelijk in plaats van optioneel.

**Gedrag**: elk aangevinkt rode-vlag-kenmerk toont direct het gekoppelde `actietype` met uitleg — nooit "rode vlag = automatisch verwijzen", zoals expliciet geëist. Bij `hypothese-heroverwegen`/`samenwerking-adviseren` blijft de flow doorlopen (met het signaal zichtbaar); bij `acuut-verwijzen` wordt de flow geblokkeerd, conform het bestaande interrupt-principe (referentiedocument §22, stap 5).

---

## 6. Symptoom- en klachtarchitectuur

Dit is het zwaarste inhoudelijke werk van V2 — een echte contentmigratie, geen herontwerp van het datamodel.

**Structuur, in lijn met de opdracht:**
- Aard van de klacht (rotatoir, licht-in-hoofd, onbalans, instabiliteit, visueel-geïnduceerd, ruimtelijke desoriëntatie)
- Tijdspatroon (acuut/subacuut/chronisch, episodisch/continu/fluctuerend, duur: seconden/minuten/uren/dagen)
- Triggers (hoofdbeweging, positieverandering, opstaan, lopen, visuele prikkels, inspanning, spontaan, stress)
- Begeleidende symptomen (misselijkheid/braken, hoofdpijn/migrainekenmerken, gehoorklachten/tinnitus, visuele klachten, neurologisch, angst/spanning, oscillopsie)

**Implementatie-principe**: elk van deze wordt een `symptoom`- of `anamnese-item`-object (bestaande types, §1 datamodel), met relaties naar **alle** aandoening-objecten waarvoor het relevant is — niet naar één. Bijvoorbeeld: "duur: seconden–<1 min" heeft een relatie naar BPPD (ondersteunend, hoog) én naar vestibulaire hypofunctie (tegensprekend, want die presenteert continu) én naar PPPD (neutraal/niet-onderscheidend, want PPPD's tijdspatroon zit op een ander niveau — chronisch aanwezig, niet per episode).

**Praktisch, niet theoretisch risico**: dit vraagt dat de klinische kenmerken die nu als vrije tekst in AAND-001 t/m AAND-004 staan, worden "uitgepakt" tot losse, herbruikbare objecten met expliciete polariteit per aandoening. Dat is voor vier items, elk met meerdere kenmerken, een aanzienlijke hoeveelheid content-werk — niet een technische herstructurering die "vanzelf" gebeurt.

**Status: uitgevoerd als proof of concept voor alle vier items** (zie `Symptoomvocabulaire-Addendum-BPPD-Proefmigratie.md`). Resultaat: haalbaar gebleken voor alle vier items in behapbare, losse sessies (~25-30 kenmerken totaal, ruim 100 polariteit-relaties). Belangrijkste inhoudelijke les uit die proef: niet elk kenmerk is een goede kandidaat voor dit vocabulaire — sommige (zoals BPPD's afwezigheid van gehoorverlies) discrimineren niet tussen de vier hoofditems onderling, maar vooral tegen Tier 3-stubs. Dat onderscheid moet bij de daadwerkelijke, volledige migratie steeds expliciet gemaakt worden.

---

## 7. Hypothesemodel

**Nieuw veld nodig**: `polariteit` op elke `bevinding-interpretatie`-relatie (§1.3 van het requirements-document) — waarden: ondersteunt / spreekt-tegen / neutraal. Dit bestond nog niet expliciet; tot nu toe was een relatie impliciet altijd "bevestigend" richting één aandoening.

Elke aandoening krijgt daarmee, afgeleid uit haar relaties: een lijst ondersteunende kenmerken, een lijst tegensprekende kenmerken, en (§9) een lijst nog-onbekende, potentieel onderscheidende kenmerken.

---

## 8. Model voor ondersteunende en tegenstrijdige kenmerken

De uitleg per hypothese (stap 4/7 van de flow) wordt gegenereerd uit de polariteit-gelabelde relaties, in natuurlijke taal — niet als kale lijst van object-id's. Voorbeeld van de gewenste vorm (inhoud illustratief):

> "BPPD staat hoog omdat: kortdurende episodes (ondersteunt, hoog), houdingsuitlokking (ondersteunt, hoog). Wel tegensprekend: patiënt meldt ook aanhoudende onbalans tussen episodes door (spreekt tegen, matig) — dit past beter bij een bijkomende factor dan bij zuivere BPPD."

Dit is een directe toepassing van het al bestaande "geen black box"-principe, nu op rangschikkingsniveau in plaats van alleen op testinterpretatieniveau.

---

## 9. Model voor ontbrekende informatie

Nieuw gebruik van het bestaande `diagnostische_waarde`-veld (hoog/matig/laag, §1.3): voor elke actieve hypothese wordt bijgehouden welke hoog-onderscheidende symptomen/testen **nog niet** zijn uitgevraagd. Dit voedt twee dingen tegelijk:
1. De volgende-vraag-suggestie in de flow (welke vraag brengt het meeste onderscheidend vermogen)
2. De expliciete "wat nog onbekend is"-tekst in de hypothese-uitleg (stap 4), zodat onzekerheid zichtbaar blijft in plaats van verzwegen

**Concrete regel uit de proefmigratie**: bij een chronische presentatie waar de rangschikking vastloopt tussen twee of meer "chronische" hypothesen (vestibulaire hypofunctie-chronisch, PPPD, multifactorieel — deze delen zwakke, overlappende basiskenmerken zoals duur en vage onbalans, zie addendum), moet het systeem specifiek doorvragen naar **uitlokkingstype** (met name gevoeligheid voor complexe visuele prikkels, een scherp PPPD-discriminator) als hoogst-prioritaire vervolgvraag. Dit is niet langer alleen een abstract mechanisme, maar een onderbouwde, concrete prioriteitsregel.

---

## 10. Hypotheserangschikking

**Blijft kwalitatief** (hoog/matig/laag), consistent met het al langer bestaande principe tegen schijnprecisie (referentiedocument, meermaals herhaald). Geen score, geen percentage — expliciet afgewezen, ook nu.

**Rangschikkingslogica** (theoretisch, niet als formule): een hypothese staat hoger naarmate er meer hoog-diagnostische-waarde-kenmerken met polariteit "ondersteunt" zijn bevestigd, en lager naarmate er kenmerken met polariteit "spreekt-tegen" zijn bevestigd — met een aandoening die minstens één hoog-gewicht tegensprekend kenmerk heeft, nooit hoger dan "matig" kan staan, ongeacht hoeveel ondersteunende kenmerken er verder zijn. Dit laatste is een expliciete regel om te voorkomen dat veel zwakke ondersteuning één sterke tegenspraak overstemt.

**Bevestigd risico uit de proefmigratie**: bij chronische presentaties (vestibulaire hypofunctie-chronisch, PPPD, multifactorieel) is de basale rangschikking op duur/aard van de klacht zwak — deze drie zullen elkaar vaak dicht bij elkaar houden op "matig", tenzij gerichte doorvraag (§9) wordt toegepast. Dit was in §18-kritische-review al als risico benoemd (punt 2); het is nu met concrete voorbeelden bevestigd, niet langer alleen een vermoeden.

**Structurele bevinding voor het vierde item**: multifactoriële duizeligheid (`uitkomsttype = samengesteld`) blijkt in de praktijk **grotendeels los** te staan van de rangschikkingslogica van de andere drie — de meeste `FACTOR`-objecten zijn neutraal tegenover BPPD/vestibulaire hypofunctie/PPPD, met slechts twee expliciete overlappunten (milde vestibulaire achteruitgang met vestibulaire hypofunctie; valangst met PPPD's bewegingsangst). De rangschikkingsengine kan dit item dus grotendeels **parallel** verwerken aan de andere drie, in plaats van als volledig verweven berekening — dat vereenvoudigt de bouw aanzienlijk ten opzichte van wat vooraf werd aangenomen.

---

## 11. Testselectie

**Cross-hypothese, niet per aandoening**: een test wordt geselecteerd op basis van de gecombineerde onderscheidende waarde over **alle** momenteel actieve hypothesen, niet alleen de hoogst gerangschikte. Een test die twee concurrerende hypothesen tegelijk kan onderscheiden (zoals we al zagen bij hergebruik van HIT en RF-004 tussen items) krijgt voorrang boven een test die alleen de topholpothese bevestigt maar niets zegt over de nummer twee.

Voor elke voorgestelde test blijft zichtbaar: welke hypothese(n) hij informeert, waarom nu relevant, en wat een positieve/negatieve bevinding voor elk van die hypothesen betekent — vooraf, niet pas achteraf bij de interpretatie.

---

## 12. Testresultaten

Zelfde principe als al gehanteerd bij de bestaande testen (Dix-Hallpike, HIT): waar een binaire uitkomst (positief/negatief) onvoldoende nuance geeft, worden rijkere velden gebruikt (type nystagmus, richting, duur, latentie, reproduceerbaarheid, symptoomrespons). Dit is geen nieuw principe, maar een expliciete bevestiging dat het ook voor toekomstige testen/symptomen zo moet blijven, niet alleen voor de reeds gebouwde items.

---

## 13. Herweging

Voor-en-na-rangschikking wordt getoond, mét een gegenereerde verklaring van *waarom* de rangschikking veranderde (welke bevinding welke hypothese ondersteunde of verzwakte) — directe uitbreiding van het bestaande `bevinding→interpretatie`-patroon en het escalatieprincipe, nu toegepast op de volledige hypotheseset in plaats van op één aandoening.

**Waarschuwing (zie ook §18.3-18.4)**: een voor/na-lijst met "hoog/matig/laag" kan visueel al snel als een score aanvoelen, ook zonder cijfers. Dit is een aandachtspunt voor de latere UI-fase, niet iets wat nu opgelost hoeft te worden — maar wel iets om nu al te benoemen zodat het niet per ongeluk als percentage wordt geïmplementeerd "voor de duidelijkheid."

---

## 14. Klinische onzekerheid

**"Geen duidelijke dominante hypothese" wordt een volwaardige, geaccepteerde uitkomst** — niet een foutstatus of een teken dat de flow heeft gefaald. Dit is nieuw ten opzichte van V1, waar de flow (afgezien van AAND-004's samengestelde uitkomst) altijd naar één aandoening of één Tier 3-verwijzing convergeerde.

Weergave (illustratief): *"De huidige presentatie ondersteunt meerdere hypothesen ongeveer gelijk. Aanvullend onderzoek op [specifiek kenmerk X] kan onderscheid maken."* — gekoppeld aan de ontbrekende-informatie-lijst uit §9, zodat onzekerheid altijd samen met een concreet vervolgpad wordt getoond, nooit als doodlopend eindpunt.

---

## 15. Klinische conclusie

Drieledig, altijd: meest waarschijnlijke verklaring / relevante alternatieven / nog onvoldoende uitgesloten verklaringen — plus, indien van toepassing, welke aanvullende diagnostiek nog zou kunnen helpen. Taalgebruik moet consequent onderscheid maken tussen een **klinische hypothese** en een **definitieve diagnose** — dit is een directe voortzetting van het al bestaande AI-interactieprincipe (referentiedocument §12/§20: AI concludeert nooit zelf, therapeut blijft verantwoordelijk).

---

## 16. Behandeloutput

Ongewijzigd gekoppeld aan de uiteindelijk gekozen hypothese. Bij `uitkomsttype = samengesteld` (AAND-004) blijft het bestaande per-factor-overzicht (referentiedocument §16) van toepassing — dat mechanisme hoeft niet opnieuw ontworpen te worden, V2 verandert alleen hoe je bij die hypothese uitkomt, niet wat je ermee doet zodra hij is vastgesteld.

---

## 17. Koppeling met de kennisbank

**Nieuw, niet eerder ontworpen**: bidirectionele koppeling tussen Modus A (reasoning-flow) en Modus B (kennisbank raadplegen), die tot nu toe bewust gescheiden waren (referentiedocument §22/§2.2). Vanuit elk object dat in de flow wordt getoond (hypothese, test, interventie) moet direct doorgeklikt kunnen worden naar de volledige kennisbankpagina — en andersom moet een kennisbankpagina kunnen aanbieden "start de reasoning-flow met dit als uitgangspunt."

Dit is functioneel nieuw, maar technisch goedkoop: beide modi wijzen al naar dezelfde onderliggende `KnowledgeObject`-tabel, dus het is een koppeling tussen bestaande weergaven, geen nieuwe datastructuur.

---

## 18. Omgaan met atypische casussen

Bouwt voort op patronen die al gedeeltelijk bestaan (comorbide `relatietype` bij PPPD/AAND-004; aggregatie bij AAND-004) maar veralgemeniseert ze:
- Gedeeltelijk passende hypothesen blijven zichtbaar, gerangschikt als "matig" — nooit stilzwijgend weggelaten
- Tegensprekende kenmerken worden altijd getoond, nooit verborgen omdat ze "niet bij de topholpothese passen"
- Het ontbreken van een typisch kenmerk is zelf een onderscheidend gegeven (bijv. "geen houdingsuitlokking" spreekt tegen BPPD) en moet als zodanig meewegen, niet als neutrale afwezigheid van informatie

---

## 19. Veiligheidsmechanismen

Rode vlaggen blijven **doorlopend actief gedurende de hele flow**, niet alleen bij intake en follow-up (waar dit al gold, referentiedocument §22 stap 7) — dit moet nu expliciet ook gelden tijdens de herwegingsstap zelf: een testresultaat dat binnenkomt tijdens stap 6 kan een rode vlag triggeren die niets met de huidige topholpothese te maken heeft, en moet dan alsnog onderbreken.

Tegenstrijdige bevindingen worden getoond, nooit gladgestreken (zie §18). Onzekerheid wordt gecommuniceerd via de kwalitatieve labels + expliciete tekst, nooit via een getal dat precisie suggereert die er niet is (§10, §13).

---

## 20. Schaalbaarheid naar nieuwe aandoeningen

Bevestiging van referentiedocument §17 (kernmodel viermaal getoetst, nooit gebroken) blijft grotendeels overeind. **Eén concrete aanvulling**: schaalbaarheid van V2 hangt af van of nieuwe aandoeningen hun symptomen/kenmerken vanaf het begin als gedeelde objecten met polariteit-relaties modelleren, in plaats van als vrije tekst zoals nu bij de vier bestaande items grotendeels het geval is. Als dat niet gebeurt, ontstaat bij elk nieuw item opnieuw hetzelfde gat dat in §2 is beschreven — schaalbaarheid van het dátamodel is bewezen, schaalbaarheid van de **content-discipline** nog niet.

---

## 21. Vijf voorbeeldcasussen

**Casus 1 — Klassiek (BPPD)**: kortdurende, houdingsuitgelokte rotatoire vertigo. Symptoom-invoer wijst direct sterk naar BPPD (hoog), overige drie hypothesen laag door tegensprekende tijdspatroon-kenmerken. Dix-Hallpike bevestigt. Geen bijzonderheden — laat zien dat V2 voor klassieke gevallen even snel/duidelijk blijft als V1.

**Casus 2 — Klassiek (vestibulaire hypofunctie, acuut unilateraal)**: continue, niet-houdingsgebonden hevige vertigo met braken, recent begin. Tijdspatroon-kenmerk spreekt direct tegen BPPD (hoog gewicht), ondersteunt vestibulaire hypofunctie. HIT afwijkend eenzijdig bevestigt.

**Casus 3 — Atypisch, overlappende presentatie**: chronische, deels houdingsgebonden, deels visueel uitgelokte klachten na een vestibulaire episode maanden geleden. Initiële rangschikking: PPPD (matig, voorwaarde nog niet volledig getoetst) en vestibulaire migraine (matig, Tier 2/stub) ongeveer gelijk — geen van beide hoog. Systeem toont "geen duidelijke dominante hypothese", stelt gerichte vervolgvragen voor (migraine-anamnese, exact tijdspatroon). Na aanvullende informatie: PPPD stijgt naar hoog zodra aan de voorwaarde is voldaan (§8.1 requirements-document).

**Casus 4 — Multifactorieel met tussentijdse rode vlag**: oudere patiënt, chronische onbalans, past bij AAND-004 (samengesteld). Tijdens screening van de factor "orthostase" komt een sterke bloeddrukdaling met syncope naar voren → RF-004 triggert, flow onderbreekt ondanks dat de overkoepelende hypothese (multifactorieel) intact blijft — laat zien dat een rode vlag een deelfactor kan raken zonder de hele samengestelde hypothese ongeldig te maken.

**Casus 5 — Klassiek beeld met onverwacht testresultaat**: presentatie lijkt sterk op BPPD-achtige acute vertigo, maar bij navraag continue in plaats van kortdurend — hypothese verschuift al vóór testen naar vestibulaire hypofunctie. HIT wordt voorgesteld (cross-hypothese ook relevant om centrale oorzaak uit te sluiten) en toont een **normale** uitslag → triggert RF-007 (acuut verwijzen) ondanks dat de leidende hypothese "vestibulaire hypofunctie" was — laat zien dat het omgekeerde-HIT-principe (requirements-document §8.1) correct blijft functioneren binnen de nieuwe cross-hypothese-architectuur, en dat een rode vlag altijd voorrang krijgt boven de op dat moment leidende hypothese.

---

## 22. Wat moet behouden blijven

Kennisbank-kernmodel (knowledge object + gekwalificeerde relaties, vier relatietypes), strikte scheiding evidence-niveau/expert-opinion, "geen black box"-uitlegplicht, escalatie-bij-twijfel-principe, de (nog te centraliseren) Tier 3-stub-aanpak, generieke patiënteducatie-velden (verwachtingsmanagement/rationale-uitleg), het principe tegen schijnprecisie, "therapeut blijft verantwoordelijk"-grondhouding, en MVP-scope-discipline (nog steeds geen patiëntapp/volledige EPD).

## 23. Wat moet fundamenteel worden aangepast

Startpunt van de flow (symptoom-first, niet aandoening-first); daadwerkelijke bouw van gedeeld Symptoom-/Anamnese-vocabulaire (grootste content-taak, zie §6); nieuw `polariteit`-veld op relaties; cross-hypothese rangschikkingsengine (gelijktijdig, niet sequentieel per aandoening); "geen dominante hypothese" als eersteklas uitkomst; bidirectionele kennisbank-koppeling; doorlopende rode-vlag-controle óók tijdens herweging, niet alleen bij intake/follow-up.

## 24. Onvoldoende gedefinieerd

- ~~Omvang van de contentmigratie per bestaand item~~ — **opgelost door proefmigratie**: alle vier items gemigreerd, ~25-30 kenmerken, ruim 100 polariteit-relaties totaal, behapbaar gebleken (zie `Symptoomvocabulaire-Addendum-BPPD-Proefmigratie.md`)
- Exacte aggregatieregel voor de kwalitatieve rangschikking (§10 geeft een principe — "één sterk tegensprekend kenmerk plafonneert op matig" — maar niet uitgewerkt voor alle combinaties) — **nog open**, al wel scherper: de proefmigratie liet zien wélke combinaties in de praktijk vaak zullen voorkomen (het chronische cluster), dus de regel kan nu tegen realistische voorbeelden getoetst worden in plaats van in abstracto
- Informatiearchitectuur van het voor/na-rangschikkingsscherm, zodanig dat het niet als score aanvoelt (§13) — functioneel probleem, nog geen oplossing
- Precieze volgordelogica bij testselectie wanneer meerdere tests een gelijke gecombineerde onderscheidende waarde hebben (§11)
- Ondergrens: hoeveel ingevoerde informatie is minimaal nodig voordat een rangschikking zinvol getoond mag worden (zie ook §18.3 in de kritische review)

## 25. Beslissingen vóór implementatie

Zie "Top 10" hieronder — dit zijn dezelfde beslissingen, hier niet dubbel opgesomd.

---

# Kritische review

**1. Is dit concept klinisch sterker dan de huidige aanpak?**
Ja, principieel. Het sluit aan bij hoe ervaren clinici daadwerkelijk redeneren (parallelle hypothesegeneratie, niet eerst kiezen en dan pas nadenken) en pakt precies de doelgroep aan die je zelf als primair hebt gedefinieerd (referentiedocument §10: de generalist, niet alleen de specialist). Dit is geen cosmetische verbetering.

**2. Waar zitten de grootste risico's?**
- **Contentmigratie wordt onderschat.** Dit voelt als een architectuurwijziging, maar is grotendeels een grote hoeveelheid herschrijfwerk van bestaande, al goedgekeurde content (vier items, elk met meerdere kenmerken) naar een nieuwe structuur. Dat is geen technische refactor die "vanzelf" gaat.
- **Interfacecomplexiteit.** Meerdere gelijktijdige hypothesen, met uitleg, met voor/na-vergelijking, met ontbrekende-informatie-hints — dat is veel informatie tegelijk, in een tool die volgens je eigen productfilosofie (masterprompt, oorspronkelijk) "praktisch bruikbaar moet blijven in een drukke praktijk." Dat spanningsveld is nog nergens opgelost, alleen benoemd.
- **"Geen dominante hypothese" kan een makkelijke uitweg worden.** Als de rangschikkingslogica te conservatief is afgesteld, zegt het systeem al snel "onduidelijk" — en een triagetool die te vaak "kan van alles zijn" zegt, verliest zijn waarde. Dit vraagt zorgvuldige kalibratie, niet alleen het principieel toestaan van de uitkomst.

**3. Waar kan de reasoning-engine onbetrouwbaar worden?**
Bij te weinig ingevoerde informatie (cold start) — een rangschikking tonen op basis van 1-2 ingevoerde kenmerken oogt net zo gezaghebbend als eentje op basis van tien, ook met alleen kwalitatieve labels. Er moet een ondergrens komen voordat er überhaupt gerangschikt wordt. Ook bij innerlijk tegenstrijdige invoer (bijv. per ongeluk tegenstrijdige triggers aangevinkt) — dit moet gesignaleerd worden, niet stilzwijgend verwerkt.

**4. Waar dreigt schijnprecisie?**
Het voor/na-rangschikkingsscherm (§13) is het grootste risico — een geordende lijst "1/2/3" met hoog/matig/laag kán in de UI-fase makkelijk verglijden naar iets dat aanvoelt als een score, zeker als iemand later "voor de duidelijkheid" toch een percentage wil toevoegen. Dit verdient een expliciete ontwerprichtlijn later, niet alleen een principe nu.

**5. Welke informatie moet absoluut evidence-based worden onderbouwd?**
De polariteit en diagnostische waarde van elke symptoom-hypothese-relatie (§7) — en realistisch: een groot deel hiervan zal, net als eerder bij bijvoorbeeld PPPD, op consensus- of expert-opinion-niveau staan in plaats van sterke publicaties. Dat moet eerlijk zo gelabeld blijven, niet impliciet gelijkgesteld worden aan bijvoorbeeld de Dix-Hallpike-evidence.

**6. Welke onderdelen moeten door ervaren fysiotherapeuten worden gevalideerd?**
Specifiek de atypische-casus-scenario's (§21, casus 3-5) en de kalibratie van wanneer "geen dominante hypothese" terecht is — dit zijn precies de gebieden waar gepubliceerde evidence dun is en klinisch oordeel het zwaarst weegt. Hier is externe validatie belangrijker dan bij de vier losse aandoeningen, waar je al een stevige ronde hebt gehad.

**7. Wat kan eenvoudig zijn, wat is conceptueel complex?**
Eenvoudig: de rode-vlaggenmodule herpositioneren (grotendeels hergebruik). Complex-maar-mechanisch: de contentmigratie naar gedeeld vocabulaire. Conceptueel het lastigst: de cross-hypothese rangschikkings- en verklaringsengine zelf — dat verdient de meeste aandacht vóór bouw, niet de meeste haast.

**8. Grootste kans om dit product echt waardevol te maken?**
Precies het atypische-casus-scenario. Dat is het gat dat vrijwel geen bestaand hulpmiddel voor fysiotherapeuten vult, en het sluit direct aan bij je oorspronkelijke waardepropositie: een generalist zeker maken, juist bij de patiënt die niet netjes in het leerboek past.

---

# Top 10 beslissingen die nu genomen moeten worden

1. Hoeveel van de bestaande vrije-tekst-symptomen ga je daadwerkelijk uitpakken naar gedeelde objecten — alle vier items in één keer, of gefaseerd?
2. Welke concrete aggregatieregel geldt voor de kwalitatieve rangschikking (naast het "één sterk tegensprekend kenmerk plafonneert"-principe uit §10)?
3. Wat is de minimale hoeveelheid ingevoerde informatie voordat er een rangschikking getoond mag worden?
4. Hoe voorkom je dat "geen dominante hypothese" te vaak de uitkomst wordt — welke drempel geldt daarvoor?
5. Hoe wordt het voor/na-rangschikkingsscherm vormgegeven zonder dat het als score aanvoelt (nu bewust nog open gelaten)?
6. Wordt de gedeelde Tier 3-stub-bibliotheek (al eerder gepland, nooit uitgevoerd) nu een harde voorwaarde vóór dit herontwerp, of parallel opgepakt?
7. Hoeveel externe validatie (welke collega's, hoeveel atypische casussen) wil je vóór bouw, gezien het zwaardere gewicht van klinisch oordeel in dit onderdeel?
8. Blijft de bidirectionele kennisbank-koppeling (§17) onderdeel van deze fase, of een latere uitbreiding?
9. Hoe wordt omgegaan met testselectie bij gelijke onderscheidende waarde tussen kandidaat-testen (§11, nog onbeslist)?
10. Bouw je dit als vervanging van de bestaande flow, of als parallelle, uittestbare variant naast de huidige (werkende) flow totdat V2 bewezen is?

---

# Mijn aanbeveling voor de volgende stap

*Bijgewerkt na uitvoering van de eerder aanbevolen proefmigratie — zie `Symptoomvocabulaire-Addendum-BPPD-Proefmigratie.md`.*

De oorspronkelijke aanbeveling (contentmigratie op één item, als proof of concept voor het grootste risico) is uitgevoerd — en niet alleen voor BPPD, maar voor alle vier items. Resultaat: haalbaar bevestigd, en drie concrete inzichten opgeleverd (het chronische-cluster-risico met een bijbehorende oplossing, een structurele vereenvoudiging voor item 4, en een contentrisico rond "visueel"-verwarring). Die zijn verwerkt in §6, §9, §10 en §24 hierboven.

**Niet: begin nu met de volledige bouw van de rangschikkingsengine.**

**Wel: werk eerst de exacte aggregatieregel (§24, eerste open punt) verder uit, getoetst tegen de concrete casussen uit de proefmigratie** — met name het chronische cluster (vestibulaire hypofunctie-chronisch / PPPD / multifactorieel) als expliciete testcasus voor de rangschikkingsregel, inclusief de nieuw gevonden oplossing (doorvragen naar uitlokkingstype). Dit is nog steeds klein en theoretisch, maar dichter bij een bouwbare specificatie dan het huidige, alleen principiële "één sterk tegensprekend kenmerk plafonneert op matig". Pas daarna is de rangschikkingsengine zelf aan de beurt.
