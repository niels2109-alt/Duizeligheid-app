# Duizeligheid-app lokaal draaien op Windows 11

Stap-voor-stap handleiding voor **PowerShell** op Windows 11, geschreven
voor iemand zonder programmeerervaring. Je hebt al Node.js 26 en npm 11
geïnstalleerd; Git nog niet — dat installeren we hieronder als eerste stap.

> **Wat ik wel en niet heb kunnen testen** (zie ook de kanttekeningen
> verderop): de onderliggende commando's (git clone, npm install, Prisma
> migreren + seeden, de servers starten) heb ik echt laten draaien, op een
> volledig schone kopie van deze branch, in een Linux-omgeving — dat
> bevestigt dat de commando's zelf en hun volgorde kloppen, en wat de
> output precies hoort te zijn. Ik heb **geen** Windows 11 of PowerShell ter
> beschikking, dus de PowerShell-specifieke syntax (met name de
> `.env`-bewerking in stap 4 en eventuele Execution-Policy-foutmeldingen in
> stap 2/5/7) heb ik zorgvuldig uitgeschreven maar niet zelf kunnen
> uitvoeren. Loop je daar tegen iets anders aan dan hier beschreven, meld
> het dan terug.

---

## 1. Git installeren

Git ontbreekt nog op dit systeem. Download en installeer het:

1. Ga naar **https://git-scm.com/download/win** — de download start automatisch.
2. Open het gedownloade installatiebestand en klik steeds **Next** (de
   standaardinstellingen zijn prima), daarna **Install**, dan **Finish**.
3. **Sluit elk open PowerShell-venster** en open een **nieuw**
   PowerShell-venster (Start-menu → typ "PowerShell" → Enter) — dit is
   nodig omdat Windows pas na een nieuw venster weet dat Git erbij staat.
4. Controleer dat het werkt:
   ```powershell
   git --version
   ```
   Je zou iets moeten zien als `git version 2.4x.x.windows.x`.

---

## 2. Project ophalen

Kies in PowerShell een map waar je het project wilt zetten, bijvoorbeeld je
Documenten-map:
```powershell
cd ~\Documents
git clone https://github.com/niels2109-alt/Duizeligheid-app.git
cd Duizeligheid-app
git checkout claude/duizeligheid-datamodel-setup-czkp77
```

Is de repository privé, dan opent Git een inlogvenster voor GitHub (of
vraagt om een personal access token als wachtwoord) — volg dat scherm.

**Mogelijke foutmelding**: als PowerShell meldt dat het uitvoeren van
scripts is uitgeschakeld (`... cannot be loaded because running scripts is
disabled on this system`), zie de **Probleemoplossing** onderaan dit
document (punt A) — dat los je eenmalig op, daarna werkt alles verder
normaal.

---

## 3. Backend: dependencies installeren

In hetzelfde PowerShell-venster:
```powershell
cd server
npm install
```
Dit duurt een minuut of wat. Je ziet aan het eind regels over
"vulnerabilities" en "packages looking for funding" — dat zijn normale
meldingen van npm, geen fouten. Zolang er geen rode foutmelding met
`npm ERR!` verschijnt, is de installatie geslaagd.

---

## 4. Backend: `.env`-bestand aanmaken en invullen

De app heeft een configuratiebestand `.env` nodig met twee geheime
sleutels (voor versleuteling en voor inlog-sessies). Kopieer eerst het
voorbeeldbestand:
```powershell
Copy-Item .env.example .env
```

Vul nu de twee sleutels automatisch in met willekeurige, veilige waarden
(geen handmatig typen nodig):
```powershell
$enc = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$jwt = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
(Get-Content .env) -replace 'vervang-dit-met-64-hex-tekens', $enc | Set-Content .env
(Get-Content .env) -replace 'vervang-dit-met-een-lange-willekeurige-string', $jwt | Set-Content .env
```

Controleer dat het gelukt is (je zou twee lange, willekeurige tekenreeksen
moeten zien, niet meer de tekst "vervang-dit-met..."):
```powershell
Get-Content .env
```

De regel `ANTHROPIC_API_KEY` mag je overslaan/leeg laten — die is optioneel
en de app werkt er volledig zonder (zie de toelichting in het bestand
zelf).

---

## 5. Database aanmaken en vullen

```powershell
npx prisma migrate dev
```
De eerste keer dat je dit uitvoert, doet dit commando **twee dingen
tegelijk**: het maakt de database aan (een bestand `dev.db`) en vult hem
meteen met de volledige inhoud. Je weet dat het gelukt is als je aan het
eind deze regel ziet:
```
🌱  The seed command has been executed.
```
en daarboven iets als `Seed voltooid: 81 knowledge_objects, ...`.

**Belangrijk**: voer **geen** los `npx prisma db seed` commando uit
hierna — dat is niet nodig (de seed is hierboven al gebeurd) en geeft een
foutmelding (`Unique constraint failed`) als je het toch probeert, simpelweg
omdat de data er dan al staat. Zie je die foutmelding per ongeluk toch,
dan is er niets kapot — de data staat er gewoon al.

---

## 6. Backend starten

Nog in hetzelfde venster:
```powershell
npm run dev
```
Je zou moeten zien:
```
Duizeligheid-API luistert op http://localhost:4000
```
**Laat dit venster openstaan** — dit is de backend, die moet blijven
draaien. Windows kan bij de allereerste keer een firewall-melding tonen
("Windows Defender Firewall heeft bepaalde functies van Node.js
geblokkeerd") — klik op **Toegang toestaan** (voor privénetwerken volstaat).

---

## 7. Frontend: nieuw PowerShell-venster

Open een **tweede, nieuw** PowerShell-venster (het eerste met de backend
blijft gewoon open staan — daar hoef je niets meer in te doen). Ga naar
dezelfde projectmap, maar nu de `web`-map:
```powershell
cd ~\Documents\Duizeligheid-app\web
npm install
npm run dev
```
Je zou moeten zien:
```
VITE vX.X.X  ready in XXX ms
➜  Local:   http://localhost:5173/
```
Ook dit venster laat je openstaan.

---

## 8. Openen en testen

Open je browser (Chrome, Edge, …) en ga naar:
```
http://localhost:5173
```
Registreer een account (een willekeurig e-mailadres + wachtwoord van
minimaal 8 tekens — er is geen demo-account, en er wordt niets verstuurd,
het blijft lokaal). Je ziet daarna **Modus A · Reasoning-flow** met het
keuzescherm: **Snelle route** (V1) en **Brede verkenning** (V2).

---

## De volgende keer: app opnieuw starten

`node_modules` en de database staan er al — je hoeft **stap 1 t/m 5 niet
te herhalen**. Elke volgende keer volstaat:

**Venster 1 (backend)**
```powershell
cd ~\Documents\Duizeligheid-app\server
npm run dev
```
**Venster 2 (frontend)**
```powershell
cd ~\Documents\Duizeligheid-app\web
npm run dev
```
Daarna weer naar `http://localhost:5173`.

---

## Probleemoplossing

**A. "running scripts is disabled on this system"**
PowerShell blokkeert standaard het uitvoeren van scripts, wat ook
`npm`/`npx` op Windows raakt. Los dit eenmalig op (in een PowerShell-venster
**als gewone gebruiker**, geen administrator-rechten nodig):
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Typ `J` (Ja) als daarom gevraagd wordt, en probeer het commando dat eerst
faalde opnieuw.

**B. `npm install` geeft een rode foutmelding (`npm ERR!`)**
Plak de volledige foutmelding terug zodat die gericht opgelost kan worden
— "vulnerabilities"/"funding"-regels zijn geen fouten, alleen regels met
`npm ERR!` wel.

**C. `npm run dev` (backend) geeft een fout over `.env` of een sleutel**
Controleer met `Get-Content .env` (in de `server`-map) dat `ENCRYPTION_KEY`
en `JWT_SECRET` echt een lange, willekeurige tekenreeks bevatten en niet
meer de oorspronkelijke placeholder-tekst — herhaal anders stap 4.

**D. De pagina op `localhost:5173` laadt niet**
Controleer dat **beide** vensters (backend én frontend) nog open staan en
geen foutmelding tonen — sluit je een venster, dan stopt de bijbehorende
server. Start ze dan opnieuw zoals bij "De volgende keer" hierboven.

**E. Node.js-versie-problemen**
Deze stappen zijn bevestigd te werken met de hier gebruikte
commando-volgorde; Node.js 26 is nieuwer dan waarmee dit is getest.
Krijg je een foutmelding die verwijst naar een ontbrekende functie in een
Node-kernmodule (bijvoorbeeld iets met `node:util` of `styleText`), installeer
dan Node.js 22 LTS via **https://nodejs.org** (de "LTS"-knop) naast je
huidige versie, en gebruik die voor dit project.
