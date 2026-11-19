# Backend för ELSA – hur den ska fungera

Status 2026-11-19: **beskrivning och placeholder, ingen implementation.** Koden i `backend/` är stubbar
som kastar `EjImplementerat`. Själva bygget görs av Simon. Öppna frågor finns sist i dokumentet
(F-01–F-24) och i pull requesten där dokumentet lades till.

## Utgångsläge

- **Domänlogiken finns redan och är testad** i `src/` (107 tester). Den är skriven för att ligga bakom
  en server: varje metod tar emot en `Session`, prövar behörighet själv och returnerar `Resultat`
  (`{ ok: true, varde }` eller `{ ok: false, skal }`). Backend ska alltså **inte skriva om reglerna**,
  utan ge dem lagring, identitet, filer, utskick och ett API.
- **Allt ligger i minnet i dag.** Gränssnittet i `frontend/` kör samma domänkod direkt i webbläsaren
  (`frontend/src/store.tsx`). Inget sparas när sidan laddas om.
- **Två delar finns bara i PR #4** (ej sammanslagen): dokumentmottagning, rapportregister, fullmakter
  och dataposter. De är märkta "PR #4" nedan och i `backend/src/rutter.ts`.
- Underlaget (Token_optimering) föreslår TypeScript/Node, React, Azure Functions, Dataverse och
  SharePoint. **Inget av det är beslutat.** Se F-01–F-04.

## Principer som backend måste hålla

Dessa regler är bärande i domänkoden och får inte försvagas av ett API-lager:

1. **Identitet och roll kommer från sessionen**, aldrig från fält i anropet. Klienten får inte skicka
   `anvandarId`, `roll` eller `organisationId` som grund för behörighet.
2. **Behörighet prövas i domänmetoden**, även om API-lagret gör en tidig kontroll. Direkta anrop som
   kringgår gränssnittet ska nekas på samma sätt (kravmatris G-19).
3. **Okänt och otillåtet ger samma svar** (404, inte 403) när svaret annars avslöjar att ett objekt
   finns hos en annan kund eller i en annan domän.
4. **Kundavskildhet:** varje fråga mot lagret filtreras på organisation. Demoorganisationer får aldrig
   innehålla verkliga data.
5. **Domänseparation:** överförmyndardata, valdata och CRM-data hålls isär (PM: domänseparation, A-02).
6. **AI och system beslutar aldrig.** Bara en människa fastställer, godkänner utskick, kvitterar och
   beslutar. Beslut kräver giltig delegation, inte bara en roll.
7. **Inga gissade värden.** Belopp i öre som heltal. Oläsligt, saknat och ej tillämpligt räknas aldrig
   som noll. Bara verifierade uppgifter räknas.
8. **Allt som ändrar något loggas** i den hashkedjade granskningsloggen, och loggen är append-only.
9. **Original bevaras oförändrade.** Inget API skriver över eller raderar ett original.
10. **Idempotens:** omförsök (samma fil, samma ärendenummerbegäran) ger samma resultat, inte en dubblett.

## Lager i backend

```
Klient (frontend/)
   │  HTTPS, session-cookie eller token
   ▼
API-lager (backend/src/rutter.ts)       tolkar anrop, hämtar session, validerar indata, mappar fel
   ▼
Domänlogik (src/)                        behörighet, regler, statusövergångar, hashkedja  ← finns
   ▼
Portar (backend/src/portar.ts)           lagring, identitet, arkiv, skanner, utskick, diarium, AI
   ▼
Adaptrar                                 Dataverse/Postgres, SharePoint/Blob, Entra ID, BankID ... ← saknas
```

`Resultat` mappas till HTTP så här (förslag): `ok: true` → 200/201, `ok: false` med behörighetsskäl → 404
eller 403 enligt princip 3, övriga `ok: false` → 409 (regelbrott, t.ex. avslutsgrind) eller 422 (ogiltig
indata). `skal` skickas med till klienten; texterna är redan skrivna för användare.

Domänklasserna (`Plattform`, `Granskning`, `Kompletteringsbegaran` m.fl.) håller tillstånd i privata fält.
Två vägar finns, och valet är Simons (F-05):

- **A. Ladda–kör–spara:** läs aggregatet från lagret, återskapa objektet, kör metoden, spara med
  optimistisk låsning (`Forrad.spara` med förväntad version). Kräver att klasserna får
  `frånTillstånd`/`tillTillstånd`.
- **B. Händelser:** spara varje domänhändelse (finns redan i loggen) och återskapa tillstånd genom att
  spela upp dem. Passar loggkravet men är mer arbete.

## Funktioner som behöver backend

Varje avsnitt anger vad användaren gör, vad som finns i dag, vad backend ska göra och vad som är öppet.
Rutterna per avsnitt finns i `backend/src/rutter.ts` (`npm run backend:rutter`).

### B-01 Inloggning och session

**Användaren:** väljer dörr på hemsidan (kund eller ESM) och loggar in. I dag: simulerad inloggning per
demoroll (`/logga-in/kund`, `/logga-in/esm`).

**Finns:** `Session { anvandarId, metod, verifierad }` och `INLOGGNINGSVAGAR` i `src/plattform/atkomst.ts`.
Demo är aldrig `verifierad`.

**Backend ska:**
- ESM-personal: jobbkonto via Entra ID (OIDC).
- Kundanvändare: inbjudan + kundens egen katalog (Entra ID B2B/External ID) eller e-legitimation. Inte beslutat.
- Ställföreträdare (överförmyndare): e-legitimation (BankID/Freja). Identitet räcker inte för åtkomst;
  uppdrag krävs (A-11).
- Skapa session på servern, skicka `HttpOnly`/`Secure`/`SameSite`-cookie. Sessionen bär `verifierad: true`
  bara när identiteten kommer från en verifierad tjänst.
- `GET /api/me` ger organisationer, roller och moduler via `Plattform.minaOrganisationer`.
- Koppla extern identitet till internt `anvandarId` (tabell externt-id → användare).

**Öppet:** F-06, F-07, F-08.

### B-02 Behörighet (tvärgående)

Två modeller finns och båda ska användas:

- **Plattform** (`src/plattform/atkomst.ts`): roll Administratör/Redigerare/Läsare per organisation,
  team och modultilldelning. Operationerna `las`, `sok`, `andra`, `administrera`.
- **Ärende** (`src/arende/behorighet.ts`, `src/arende/status.ts`): roll per domän (val/överförmyndare),
  uppdrag, tidsbegränsad åtkomst och delegation för beslut. Återkallad behörighet gäller direkt (A-14).

**Backend ska:** lagra medlemskap, rolltilldelningar, tillfälliga åtkomster och delegationer, och ladda
dem till varje anrop. Ingen cache som gör att en återkallad behörighet lever kvar (F-09).

### B-03 Organisation, medlemmar och inbjudningar

**Användaren:** kundens administratör ser medlemmar, sätter roll, tilldelar moduler, stänger av konton
och bjuder in (sidan Organisation och Admin). ESM godkänner inbjudningar.

**Finns:** `Plattform.listaMedlemmar`, `sattRoll`, `tilldelaModuler`, `stangAv`, `bjudIn`,
`listaInbjudningar`, `godkannInbjudan`, `accepteraInbjudan`, `aktivitetslogg`.

**Backend ska:** lagra organisationer, medlemskap och inbjudningar. Vid godkännande skicka inbjudan med
engångslänk (utskicksport). Vid accept: kräv inloggning först, koppla kontot, förbruka länken.
Organisationens avtalade moduler sätts bara via CRM-flödet (avtal), aldrig från kundens admin.

**Öppet:** F-10.

### B-04 Projekt och kundresa

**Användaren:** skapar projekt, kopplar moduler och arbetar i kundresans 19 metodsteg (sidan Projekt).
Steg 11 kräver kundens uttryckliga godkännande innan genomförande.

**Finns:** `Plattform.listaProjekt`, `skapaProjekt`, `hamtaProjekt`, `kopplaModul`, `lasKundresa`,
`andraKundresa` och klassen `Kundresa` i `src/plattform/metod.ts`.

**Backend ska:** spara projekt och kundresans tillstånd per projekt (stegtillstånd, versionshistorik,
beslut, kommentarer, nyckeltal, uppföljning). `andraKundresa` tar en funktion; i API:t blir det en
uppsättning namngivna åtgärder (starta steg, avsluta, godkänn steg 11, återkalla, ej tillämpligt med
motivering, registrera kontroll). Underlag per steg kopplas till dokument (B-16).

### B-05 Modulregister och ELSA START

**Användaren:** ser alla 32 moduler i 7 vertikaler; låsta moduler visas med skäl.

**Finns:** `src/plattform/modulregister.ts` (statiskt) och `Plattform.modulatkomst`.

**Backend ska:** inte mycket. Registret kan ligga kvar i koden. Backend behöver bara svara med
låsmarkering per inloggad användare. Om registret ska kunna ändras utan release är det en egen fråga (F-11).

### B-06 CRM och kontakt från hemsidan

**Användaren:** en besökare fyller i Boka demo / kontakt / offert. ESM följer leads i CRM-sidan.

**Finns:** `Plattform.tavInKontakt`, `registreraKlick`, `listaLeads`, `uppdateraLead`, `flyttaLead`,
`klickstatistik`, `kontrolleraOrgnr`, `kontrolleraEpost`.

**Backend ska:** ta emot publika anrop med skydd mot missbruk (hastighetsbegränsning, captcha eller
honungsfält), spara leads, och bara visa CRM för ESM. Klick sparas anonymt utan personuppgifter.
CRM-data hålls skild från modulernas data (princip 5).

**Öppet:** F-12 (eget CRM eller Dynamics/HubSpot).

### B-07 Överförmyndare: ärenden, mottagning, status och köbevakning

**Användaren:** handläggaren ser ärendelistan och sina uppdrag, registrerar inkommen handling, för ärendet
genom statuskedjan och ser liggande ärenden (sidorna Ärenden, Ärendedetalj, Mina uppdrag).

**Finns:** `Arende` (`src/domain/typer.ts`), `foreslaKoppling` (personkoppling bara på verifierad
identitet, Ö-10), `provaOvergang` + `harBeslutsratt` (statuskedja och delegation), `provaAtkomst` och
`filtreraSoktraffar`, `bevakaKo`.

**Backend ska:**
- Lagra ärenden, huvudmän, ställföreträdare, uppdrag, handlingar och delegationer.
- Sökning som filtrerar på behörighet **innan** träffar returneras, så att valdomänen aldrig ser
  överförmyndarärenden (A-02).
- Statusbyte: läs ärendet, pröva övergången med aktuell delegation, spara med versionskontroll, logga.
- Köbevakningen körs som schemalagt jobb (B-20) och ger notiser (B-13).

**Öppet:** F-13 (koppling till kommunens verksamhetssystem, t.ex. Wärna, Provisum), F-14.

### B-08 Överförmyndare: redovisning, motor och granskning

**Användaren:** granskar en årsräkning: ser motorns förslag per kontrollpunkt, fastställer, hanterar
avvikelser och avslutar när avslutsgrinden tillåter.

**Finns:** `Redovisning` med uppgifter som bär originalvärde, status och källposition; `korKontroller`
(deterministisk, inga externa beroenden); `Granskning` med `foreslaFranMotor`, `faststall`,
`hanteraAvvikelse`, `avslutshinder`, `avsluta`; checklistan med 19 punkter.

**Backend ska:**
- Spara redovisningen och varje motorkörning med parametrar och tidpunkt, så att ett resultat kan
  återskapas exakt (samma indata och parametrar ger samma utfall).
- Spara granskningens tillstånd per ärende (F-05).
- `avsluta` kräver beslutsrätt; avslutsgrinden i domänkoden avgör, inte API:t.
- Toleranser är parametrar med motivering. Standard 0. Ändring loggas.

### B-09 Överförmyndare: komplettering och expediering

**Användaren:** skapar kompletteringsbegäran från avvikelser, redigerar och godkänner frågor, skickar
brevet och registrerar svar.

**Finns:** `Kompletteringsbegaran` (`skapaUtkast`, `redigera`, `stryk`, `godkann`,
`registreraExpediering`, `registreraSvar`, `brevtext`). Brevtexten byggs från neutral beskrivning, inga
interna arbetsinstruktioner (A-10).

**Backend ska:** spara begäran, skapa brev (PDF) från `brevtext`, skicka genom utskicksporten **först
efter mänskligt godkännande**, och registrera expedieringen med vad som faktiskt skickades (version,
kanal, mottagare, tid). Ett utkast är aldrig en kommunicering.

**Öppet:** F-15 (kanal: brev, e-post, digital brevlåda via Mina meddelanden).

### B-10 Överförmyndare: behovsbevakning

**Användaren:** ser årets behovsgranskningar av förvaltarskap och kvitterar med bedömning (sidan
Behovsprövning). Hålls skild från årsräkningen (Ö-04, Ö-23).

**Finns:** `Behovsbevakningar` (`skapaArliga`, `kvittera`, `aktiva`, `forfallna`).

**Backend ska:** spara bevakningarna, skapa årets bevakningar i ett schemalagt jobb (B-20) och visa
förfallna som notiser.

### B-11 Regelkort

**Användaren:** ser gällande regelkort med källa och version (sidan Regelkort).

**Finns:** `Regelregister` (`lagg`, `valj` per datum, `forfallnaBevakningar`). Inga kort är juridiskt
verifierade.

**Backend ska:** spara regelkort versionerat (aldrig skriva över), välja version efter ärendets datum, och
bara låta behörig jurist lägga till kort. Bevakning av regeländringar som jobb.

### B-12 Granskningslogg

**Användaren:** ser händelser per ärende och organisation (sidan Logg). Revision kan exportera.

**Finns:** `Granskningslogg` med SHA-256-kedja, `handelser`, `Granskningslogg.verifieraKedja`.

**Backend ska:**
- Spara loggen append-only. Lagret får inte tillåta ändring eller radering (behörighet i databasen,
  inte bara i koden).
- Skrivning måste vara seriell per kedja (löpnummer + föregående hash). Antingen en kedja totalt eller
  en per organisation (F-16).
- Verifiera kedjan varje natt och larma vid brott.
- Export för revision: JSON med kedjan, så att mottagaren kan verifiera själv.
- Loggen får inte innehålla mer personuppgifter än nödvändigt; gallring ska följa beslutad gallringsplan (F-20).

### B-13 Notiser och Nästa åtgärd

**Användaren:** ser rollanpassade notiser och "Nästa åtgärd" på startsidan.

**Finns:** räknas i dag i `frontend/src/store.tsx` från köbevakning, behovsbevakning och ärendestatus.

**Backend ska:** räkna samma sak på servern per användare (eller låta klienten fortsätta räkna från data
den får). Eventuellt e-postavisering. Ingen ny regel behövs.

### B-14 Val

**Användaren:** ser valplanering (sidan Valplanering, i dag statisk text).

**Finns:** ingen domänlogik för val. Ärendemodellen har domänen `val`.

**Backend ska:** inget i första etappen utöver att domänseparationen redan gäller. Valdomänen byggs senare
(nästa ordinarie val 2030). Lagringen ska ändå förberedas så att valdata hamnar skilt från
överförmyndardata.

### B-15 Energi

**Användaren:** importerar en CSV med mätvärden, ser trend och datakvalitet, granskar (sidan Energi).

**Finns:** `lasEnergiCsv`, `granskaTrend`, importprofiler, källreferens per värde.

**Backend ska:** ta emot filen via dokumentmottagningen (B-16), köra importen på servern, spara trenden och
granskningen. Senare: hämtning från mätvärdesleverantör via connector (B-19).

### B-16 Dokumentmottagning (PR #4)

**Användaren:** laddar upp en eller flera filer (filval, dra och släpp, massuppladdning) och får kvittens
per fil. Kompletterar metadata, bekräftar ELSA:s förslag på dokumenttyp och period, godkänner för analys.

**Finns (PR #4):** `Dokumentmottagning` (`taEmot`, `hamta`, `oppnaOriginal`, `lista`, `komplettera`,
`godkannForAnalys`, `begarKomplettering`), filtypsregler, SHA-256-dubblettkontroll per kund, utbytbar
`Skanner`.

**Backend ska:**
- Ta emot uppladdning strömmande (inte hela filen i minnet), med storleksgräns och kontroll av filtyp
  både på filändelse och innehåll.
- Räkna SHA-256, kontrollera dubblett per kund, lagra originalet i originalarkivet (skriv en gång).
- Skanna mot skadlig kod innan dokumentet kan godkännas. Utan skanner: kan tas emot men inte godkännas.
- Kvittens per fil; fel i en fil påverkar inte de andra.
- Vid omförsök med samma fil: samma dokument-id.

**Öppet:** F-17 (arkiv: SharePoint eller Blob), F-18 (skanner, filgräns).

### B-17 Rapportregister (PR #4)

**Användaren:** skapar och redigerar rapporter med versioner, skickar på granskning (fyra ögon),
publicerar, och begär registrering i kundens diarium.

**Finns (PR #4):** `Rapportregister`, kollisionssäkra ärendenummer `ELSA-<KUND>-<ÅR>-<NNNN>` via porten
`Nummerlager` (optimistisk låsning med `skrivOmOforandrad` och idempotensnyckel), versionsstatus,
innehållshash, inaktualitetsvarning när källor ändras, `ExternDiariekoppling`.

**Backend ska:**
- Implementera `Nummerlager` mot databasen (villkorad uppdatering eller sekvens per kund och år).
  Testerna i PR #4 visar beteendet som måste hållas vid samtidiga anrop.
- Spara rapporter, versioner och leveranser. En publicerad version ändras aldrig.
- Generera Word och PDF (F-19).
- Diariekoppling: skicka begäran, ta emot svaret asynkront (webhook eller polling). Diarienumret visas
  först när diariet bekräftat det.

**Öppet:** F-19, F-21 (diarieansvar och nummerformat).

### B-18 Fullmakter och datainsamling (PR #4, bara modell)

**Användaren:** kunden ger ELSA fullmakt att hämta data från externa system (energibolag, bank,
fastighetssystem).

**Finns (PR #4):** `fullmaktslage`, `provaHamtning`, `bevakaUtgang`, `valjInsamlingsvag` (API före export
före skärm), skärmflöden med säkerhetsregler.

**Backend ska:** spara fullmakter med signerad handling, pröva varje hämtning mot giltig fullmakt, och
bevaka utgång. Själva hämtningarna hör till connectorerna (B-19). Skärmbaserad insamling bara efter
särskilt beslut.

### B-19 Connectorer och AI-utläsning

**Finns:** katalogen C01–C29 och skill-specifikationer S01–S16 i `src/plattform/connectorer.ts`. Ingen är
ansluten. Redovisningen tar emot uppgifter med status `utlast_ej_verifierad` men räknar inte på dem.

**Backend ska (senare etapp):** varje connector som en adapter bakom en port, med källreferens på varje
värde. AI-utläsning av inskannade årsräkningar via `Utlasningstjanst`; resultatet blir alltid förslag som
handläggaren verifierar mot originalet. Ska prövas mot D-01–D-07, S-03 och AI-01 innan den byggs, och
skydd mot instruktioner i uppladdade handlingar (A-03).

**Öppet:** F-22 (modelleverantör och var data behandlas).

### B-20 Schemalagda jobb

Listade i `backend/src/jobb.ts`: köbevakning, årlig behovsbevakning, bevakning av regelkort, utgång av
fullmakter, nattlig verifiering av loggkedjan. Jobben körs som system-aktör och loggar det de gör. De
beslutar aldrig något, de skapar bara bevakningar och notiser.

## Tvärgående krav

| Område | Krav |
|---|---|
| Hosting | Data i EU, helst Sverige. Kommunal kund kräver personuppgiftsbiträdesavtal. Inget beslutat (F-01). |
| Lagring | Kundavskild. Överförmyndare och val skilda. Versionskontroll på varje aggregat. Backup och återläsningsprov (A-15–A-18). |
| Säkerhet | TLS, säkra cookies, CSRF-skydd, indatavalidering, hastighetsbegränsning på publika rutter, hemligheter i nyckelvalv (repot är publikt). |
| Dataskydd | Personnummer och hälsouppgifter i överförmyndarärenden. Konsekvensbedömning (DPIA) före verkliga data. Gallring enligt plan. |
| Loggning | Granskningsloggen (B-12) är verksamhetslogg. Teknisk drift-loggning separat och utan personuppgifter i klartext. |
| Miljöer | Utveckling, test (bara syntetiska data), produktion. Demo-organisationer bara i utveckling och test. |
| Test | Befintliga tester i `test/` ska fortsätta gå. Lägg till integrationstester mot verklig lagring och API-tester för behörighet (direkta anrop). |
| Klient | Frontend ska gå från att köra domänkoden lokalt till att anropa API:t. Kan göras sida för sida (F-23). |

## Öppna frågor (till Simon)

Frågorna är numrerade så att de kan besvaras var för sig i pull requesten.

**Plattform och drift**

- **F-01 Hosting:** Azure (som underlaget föreslår) eller annat? Region? Behövs det svensk drift för kommunala kunder?
- **F-02 Databas:** Dataverse, Azure SQL/Postgres eller annat? Dataverse passar Power Platform men gör hashkedja, villkorade uppdateringar och tester svårare.
- **F-03 Ramverk:** Azure Functions, Node-server (Fastify/Express) i container, eller annat? Ett API eller ett per modul?
- **F-04 Repo:** ska backend ligga i detta repo (förslag: ja, monorepo med `src/`, `backend/`, `frontend/`) eller i något av ESMELSA-repona? Vilket repo är plattformens hem?
- **F-05 Tillstånd:** ladda–kör–spara med optimistisk låsning, eller händelselagring? (se "Lager i backend")

**Identitet och behörighet**

- **F-06 ESM-inloggning:** Entra ID i ESM:s tenant, rätt antagande?
- **F-07 Kundinloggning:** inbjudan med e-post + engångskod, kundens Entra ID (B2B/External ID), eller e-legitimation?
- **F-08 E-legitimation:** BankID, Freja eller via en broker (t.ex. Svensk e-identitet, Signicat)? Behövs det i första etappen?
- **F-09 Behörighetscache:** godtar vi att behörighet läses från databasen i varje anrop, eller behövs cache med omedelbar ogiltigförklaring?
- **F-10 Inbjudningar:** vilken e-posttjänst skickar inbjudningar och notiser?

**Funktioner**

- **F-11 Modulregister:** räcker det att det ligger i koden, eller ska det kunna ändras utan release?
- **F-12 CRM:** eget enkelt CRM i ELSA (som i dag) eller koppling till ett befintligt CRM?
- **F-13 Verksamhetssystem:** ska överförmyndarmodulen läsa ärenden från kommunens system (Wärna, Provisum m.fl.) eller vara eget ärendesystem i piloten?
- **F-14 Personnummer:** hur lagras och söks personnummer (kryptering, hashning för sökning)?
- **F-15 Utskick:** kanal för kompletteringsbrev: utskrift, e-post, Mina meddelanden? Vem står som avsändare?
- **F-16 Loggkedja:** en kedja totalt eller en per organisation? Var lagras loggen så att den inte går att ändra (t.ex. append-only tabell med nekad UPDATE/DELETE, eller oföränderlig blob-lagring)?
- **F-17 Originalarkiv:** SharePoint per kund (som PM:et föreslår) eller Blob Storage med oföränderlighetsregel?
- **F-18 Skanning och filgräns:** vilken skanningstjänst (t.ex. Defender for Storage)? Största filstorlek?
- **F-19 Rapportformat:** hur genereras Word och PDF (bibliotek på servern, Graph, mallar i SharePoint)?
- **F-20 Gallring:** finns det en gallringsplan, eller ska vi föreslå en?
- **F-21 Diarium:** vilka diariesystem behöver vi prata med först (Public 360, Ciceron, W3D3, Lex)? Webhook eller polling? Gäller ärendenummerformatet `ELSA-<KUND>-<ÅR>-<NNNN>`?
- **F-22 AI:** vilken modelleverantör och var behandlas data? Ska utläsning ingå i första etappen?

**Arbetssätt**

- **F-23 Övergång i frontend:** ska frontend byta till API:t sida för sida, eller allt på en gång? Ska demoläget (allt i webbläsaren) finnas kvar för säljdemo?
- **F-24 Omfång och tid:** vilken första leverans är rimlig, och vad behöver du från Daniel för att börja? Förslag på ordning: B-01 → B-02/B-03 → B-12 → B-07/B-08 → B-16 → B-17.
