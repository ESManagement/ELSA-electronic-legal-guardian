# Kravmatris – ELSA, hemsida, ELSA START och moduler

Källor: utvecklingsprompten "Promnt texter moduler" (15 november 2026), avsnitt 1–16, och PM:et
"Kundadministration och rapporthantering i ELSA" v0.1 (15 november 2026), avsnitt 1–8 (krav K-01–K-47, avsnitt 5 nedan). Matrisen skiljer på
**beskriven** (krav dokumenterat), **implementerad** (kod finns), **testad** (automatiskt test körts och
passerat) och **godkänd** (verksamheten har godkänt). Ingenting i matrisen är godkänt av verksamheten.
Avsnitt 1–4 gäller sammanslagen PR #3 (`claude/project-thread-4u4qiq`). Avsnitt 5 gäller grenen `claude/project-thread-onw3r0`.

Testkörning 2026-11-15, Node 22.23, Linux, Chromium (Playwright):

| Kontroll | Kommando | Resultat |
|---|---|---|
| Enhets- och integrationstester | `npm test` | 149 av 149 godkända (107 tidigare + 42 för PM:et) |
| Typkontroll motor | `npm run typecheck` | Inga fel |
| Typkontroll och bygge gränssnitt | `cd frontend && npm run typecheck && npm run build:demo` | Inga fel |
| Användarflöden i webbläsare | `cd frontend && npm run e2e` | 49 av 49 godkända (39 tidigare + 10 för PM:et) |
| Säkerhetsgranskning, beroenden, återställning, driftsättning | – | **Ej körda** (ingen driftmiljö eller beslutade krav) |

## 1. Gemensamma krav

| Id | Krav (avsnitt) | Nuläge före | Ändring | Test | Status |
|---|---|---|---|---|---|
| G-01 | Inventera kod och repon (2) | Ett repo med Val & Överförmyndare | Namninventering av 50 repon i ESManagement och ESMELSA; sambandet modul → kandidatrepo registrerat i `KANDIDATREPON`. Innehållet i övriga repon ligger utanför sessionens behörighet och är inte läst | modulregister.test.ts | Delvis: innehållsinventering blockerad |
| G-02 | Gemensamt modulregister: stabil identitet, exakt namn, vertikal, ingång, status, behörighetskrav (3) | 18 moduler hårdkodade i ELSA START | `src/plattform/modulregister.ts`, 32 moduler, 7 vertikaler | `test/modulregister.test.ts` | Testad |
| G-03 | Alla namngivna moduler under rätt vertikal, går att hitta, tillbaka till ELSA START (3, 8) | – | ELSA START, vertikalsidor, modulsida `/modul/:id` med "← ELSA START" | modulregister.test.ts; e2e "Alla 32 modulsidor" | Testad |
| G-04 | Nya förslag (Hotell, Kulturarv, Hållbarhet, Idrott och bad, Industri, BRF, Energi, Projektering) framställs inte som färdiga (3) | – | Märkning "Nytt förslag", leveransstatus aldrig Klar | modulregister.test.ts | Testad |
| G-05 | Sökning efter modul eller uppgift (3, 5) | Menysökning | `sokModuler` på namn, vertikal, uppgift, profil; i ELSA START och på hemsidan | modulregister.test.ts; e2e | Testad |
| G-06 | Visa alla moduler men skydda data och funktioner; låsta moduler med tydlig status (3) | – | Låsmarkering och skäl från plattformens åtkomstkontroll; modulsidan visar bara profil när modulen är låst | e2e "Låst modul" | Testad |
| G-07 | Projekt kopplas till moduler med bibehållen kund- och projektkontext (3, 8) | – | `Plattform.skapaProjekt`, `kopplaModul`, `listaProjekt(modulId)` | plattform.test.ts "Projekt, team och modultilldelning" | Testad |
| G-08 | Gemensamma tjänster för identitet, filer, datakvalitet, arbetsflöde, loggning (3) | Logg och behörighet i OF-modulen | Plattformstjänst med gemensam åtkomst, hashkedjad logg, kundresa; Energi använder gemensam datakvalitetsmodell | plattform.test.ts | Delvis: filer och identitetstjänst ej anslutna |
| G-09 | Kundresa: 19 steg, sex faser, originalnamn i registret, vertikalanpassad visningstext (4) | – | `src/plattform/metod.ts` | metod.test.ts | Testad |
| G-10 | Verkliga beroenden; steg 15–17 parallellt med 14 (4) | – | Beroendegraf, `startbara()` | metod.test.ts "parallellt" | Testad |
| G-11 | Godkännande i steg 11 före genomförande; återtaget beslut spärrar igen (4, 8) | – | `registreraKundgodkannande`, `aterkallaKundgodkannande`, kräver kundens administratör | metod.test.ts; plattform.test.ts; e2e "Steg 12 spärrat" | Testad |
| G-12 | Varje steg: ansvarig, status, tidsplan, underlag, källa, versionshistorik, beslut, kommentarer, nästa aktivitet (4) | – | `Stegtillstand` | metod.test.ts | Testad |
| G-13 | "Ej tillämpligt" bara med motivering (4) | – | Minst 10 tecken, aldrig för steg 11 | metod.test.ts | Testad |
| G-14 | AI-förslag skiljs från godkända beslut (4, 14) | Motorn föreslår i OF-modulen | `foresla` / `hanteraForslag`, AI kan inte godkänna | metod.test.ts | Testad |
| G-15 | Uppföljning mot överenskommen baslinje, mål och utfall (4) | – | `foljUpp`, deterministisk | metod.test.ts | Testad |
| G-16 | Regelkontroller med källa och datum, avvikelser följs upp (4) | Regelkort i OF-modulen | `registreraKontroll`, `foljUppAvvikelse`, blockerar avslut | metod.test.ts | Testad. Inga verifierade regelkällor för andra vertikaler |
| G-17 | Startsida: budskap, sök, Boka demo, Se ELSA START, sand/djupgrönt/teal, Tjänster, Priser, Referenser, Kunskap, Om oss, Kontakt (5) | Ingen offentlig sida i appen | `frontend/src/pages/Hemsida.tsx` | e2e "Hemsida" | Testad (demo). Målbildens layout från pptx ej tillgänglig |
| G-18 | Två dörrar; metoden beskrivs före klick; ingen simulerad inloggning som ser verklig ut (5) | Demoval per roll | `/logga-in/kund`, `/logga-in/esm`, text "Simulerad inloggning" | e2e "Login" | Testad. **Blockerad** för verklig inloggning: metod för kunder ej beslutad, Entra ID ej anslutet |
| G-19 | Roller Administratör, Redigerare, Läsare; team; åtkomst bakom gränssnittet per kund, projekt, modul (5, 8) | Domänroller i OF-modulen | `src/plattform/atkomst.ts`, `Plattform` prövar varje anrop | plattform.test.ts "Roller", "Kundisolering"; e2e | Testad |
| G-20 | En kund kan inte läsa eller ändra annan kunds data, även via direkta anrop (8) | – | Samma svar för okänt och otillåtet projekt | plattform.test.ts "Kundisolering" | Testad |
| G-21 | Kommersiellt flöde, varukorg = offertförfrågan, orgnr bara via verifierad källa (5) | Beskrivning i KomIgang | `tavInKontakt`, orgnr-kontroll med kontrollsiffra, ingen automatisk hämtning | plattform.test.ts; e2e "Offert" | Testad (demo) |
| G-22 | Priser och demo: Kort demo, Vertikaldemo, Pilot; pris markerat som förslag (5) | Pris angivet som faktum | Pris "förslag, inte fastställt"; demotyper | e2e | Testad |
| G-23 | CRM Lead → Demo bokad → Demo klar → Offert → Avtal → Kund i drift; inbjudan vid avtal efter godkännande (5) | – | `src/plattform/crm.ts`, `flyttaLead`, `godkannInbjudan` | plattform.test.ts; e2e "CRM" | Testad (demo). **Blockerad** mot verifierat CRM (Kundradar) |
| G-24 | Referenser bara styrkta och godkända (5) | – | Inga referenser publicerade | e2e | Testad |
| G-25 | Mobil, tangentbord, tydliga fel, uppföljning utan personuppgifter (5, 8) | – | Responsiv CSS, synligt fokus, klickräknare utan personuppgifter | e2e "Mobil", "Tangentbord"; plattform.test.ts "klickuppföljning" | Testad (grundläggande). Full tillgänglighetsgranskning ej körd |
| G-26 | Bildregister med användning, ursprung, godkännande, alternativtext (6) | Inga bilder | `src/plattform/bildregister.ts`, 9 poster, alla "Original saknas" | modulregister.test.ts "Bildregistret" | Testad. **Blockerad**: originalen ej levererade |
| G-27 | Källbelagt skiljs från bedömning; reproducerbara, testade beräkningar (6) | OF-motorn | Energi: källreferens per månad, heltal i Wh, kända indata och facit | energi.test.ts | Testad |
| G-28 | Säkerhetskrav före lansering: minsta behörighet, kundisolering, 2FA, kryptering, loggning, EU/EES (6) | – | Kundisolering och minsta behörighet i koden | plattform.test.ts | **Blockerad**: driftmiljö, identitetstjänst och beslut saknas |
| G-29 | Versionshantering, arbetsgren, granskningsbar PR (7) | – | Gren `claude/project-thread-4u4qiq` och PR | – | Implementerad |
| G-30 | Connectorkatalog och skill-specifikationer (11–14) | – | `src/plattform/connectorer.ts`; modulprofiler med C- och S-koder; inga anslutningar | modulregister.test.ts | Beskriven och registrerad. Inga connectorer anslutna |

## 2. Moduler

Kolumner: stabil identitet, namn, vertikal, arbetsyta, implementering, leverans och vad som återstår.
Moduler utan arbetsyta har modulsida, profil, behörighetsstyrning och kan bära projekt i den gemensamma
kundresan, men inget modulspecifikt huvudflöde. Inga verksamhetsregler har hittats på.

| Id | Modul | Vertikal | Arbetsyta | Implementering | Leverans | Kandidatrepon (ej kontrollerade) | Kvar |
|---|---|---|---|---|---|---|---|
| politik-styrning | Politik & Styrning | Kommun & styrning | – | Beskriven | Blockerad | ESManagement/ELSA-governance, ESMELSA/politiskt | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-governance, ESMELSA/politiskt är inte inventerad |
| val-overformyndare | Val & Överförmyndare | Kommun & styrning | `/oversikt` | Testad | Delvis klar | ESManagement/ELSA-electronic-legal-guardian | Regelkorten är inte juridiskt verifierade; Pilotkommun saknas; svaren i frågelistan 2026-11-14 är ej verifierade; Valdomänen har bara planeringsstöd; Lagring, verksamhetssystem (C18) och e-legitimation (C04) är inte anslutna |
| revision | Revision | Kommun & styrning | – | Beskriven | Blockerad | ESManagement/ELSA-political-accountant | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-political-accountant är inte inventerad |
| tillsyn | Tillsyn | Kommun & styrning | – | Beskriven | Blockerad | ESManagement/ELSA-Tillsyn, ESMELSA/ELSA-Tillsyn | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Tillsyn, ESMELSA/ELSA-Tillsyn är inte inventerad |
| municipality-development | Municipality development | Kommun & styrning | – | Beskriven | Blockerad | ESManagement/ELSA-Samhallsbyggnad, ESMELSA/ELSA-Samhallsbyggnad-App, ESMELSA/elsa-samhallsbyggnad | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Samhallsbyggnad, ESMELSA/ELSA-Samhallsbyggnad-App, ESMELSA/elsa-samhallsbyggnad är inte inventerad |
| social | Social | Vård & omsorg | – | Beskriven | Blockerad | ESManagement/ELSA-Social, ESMELSA/ELSA-Social | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Social, ESMELSA/ELSA-Social är inte inventerad |
| care | Care | Vård & omsorg | – | Beskriven | Blockerad | ESMELSA/ELSA-care | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESMELSA/ELSA-care är inte inventerad |
| vatten-avfall | Vatten & Avfall | Vatten, kultur & fritid | – | Beskriven | Blockerad | ESManagement/ELSA-water-waste | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-water-waste är inte inventerad |
| kultur-fritid | Kultur & Fritid | Vatten, kultur & fritid | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| idrott-bad | Idrott och bad (nytt förslag) | Vatten, kultur & fritid | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| kulturarv | Kulturarv (nytt förslag) | Vatten, kultur & fritid | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| property | Property | Fastighet, bygg & energi | – | Beskriven | Blockerad | ESManagement/ELSA-Property, ESMELSA/ELSA-Property | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Property, ESMELSA/ELSA-Property är inte inventerad |
| project-management | Project management | Fastighet, bygg & energi | – | Beskriven | Blockerad | ESManagement/Project-management | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/Project-management är inte inventerad |
| projektering | Projektering (nytt förslag) | Fastighet, bygg & energi | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| brf | BRF (nytt förslag) | Fastighet, bygg & energi | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| energi | Energi (nytt förslag) | Fastighet, bygg & energi | `/energi` | Testad | Delvis klar | – | Bara pilotfallet i avsnitt 15.2 är byggt: månadsvis CSV-import, kvalitetskontroll och trend; Baslinje och normaliseringsmetod är inte godkända, så ingen besparing räknas; Mätkoppling (C21), väder (C09) och energibasdata (C10) är inte anslutna; Pilotkund och verifierad datakälla saknas |
| power | Power | Fastighet, bygg & energi | – | Beskriven | Blockerad | ESManagement/ELSA-Power, ESMELSA/ELSA-Power | Gränsen mot modulen Energi är inte fastställd; Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Power, ESMELSA/ELSA-Power är inte inventerad |
| hallbarhet | Hållbarhet (nytt förslag) | Fastighet, bygg & energi | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| bank-finance | Bank & Finance | Finans, juridik & inköp | – | Beskriven | Blockerad | ESMELSA/ELSA-Bank-Finance | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESMELSA/ELSA-Bank-Finance är inte inventerad |
| economy | Economy | Finans, juridik & inköp | – | Beskriven | Blockerad | ESManagement/ELSA-Economy, ESMELSA/ELSA-Economy | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Economy, ESMELSA/ELSA-Economy är inte inventerad |
| procurement | Procurement | Finans, juridik & inköp | – | Beskriven | Blockerad | ESManagement/ELSA-Procurement, ESMELSA/ELSA-Procurement | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Procurement, ESMELSA/ELSA-Procurement är inte inventerad |
| legal | Legal | Finans, juridik & inköp | – | Beskriven | Blockerad | ESManagement/ELSA-Legal, ESMELSA/ELSA-Legal | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Legal, ESMELSA/ELSA-Legal är inte inventerad |
| jetleasing | Jetleasing | Finans, juridik & inköp | – | Beskriven | Blockerad | ESManagement/ELSA-Jetleasing, ESMELSA/ELSA-Jetleasing | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Jetleasing, ESMELSA/ELSA-Jetleasing är inte inventerad |
| elsa-bidrag | ELSA Bidrag | Finans, juridik & inköp | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| hemvist | Hemvist | Konsument & lantbruk | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| hemklang | Hemklang | Konsument & lantbruk | – | Beskriven | Blockerad | ESMELSA/hemklang | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESMELSA/hemklang är inte inventerad |
| bovarde | Bovärde | Konsument & lantbruk | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| elsa-lantbruk | ELSA Lantbruk | Konsument & lantbruk | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| learning | Learning | Människor, hotell & industri | – | Beskriven | Blockerad | ESManagement/ELSA-Learning, ESMELSA/ELSA-Learning | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas; Befintlig kod i ESManagement/ELSA-Learning, ESMELSA/ELSA-Learning är inte inventerad |
| hr-people | HR & People Development | Människor, hotell & industri | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| hotell | Hotell (nytt förslag) | Människor, hotell & industri | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |
| industri | Industri (nytt förslag) | Människor, hotell & industri | – | Beskriven | Blockerad | – | Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda; Pilotkund och verifierad datakälla saknas |

## 3. Vertikaler

| Vertikal | Moduler | Testat huvudflöde | Status |
|---|---|---|---|
| Kommun & styrning | 5 | Val & Överförmyndare (årsräkningsgranskning) | Delvis klar |
| Vård & omsorg | 2 | – | Blockerad |
| Vatten, kultur & fritid | 4 | – | Blockerad |
| Fastighet, bygg & energi | 7 | Energi (pilotfall 15.2) | Delvis klar |
| Finans, juridik & inköp | 6 | – | Blockerad |
| Konsument & lantbruk | 4 | – | Blockerad |
| Människor, hotell & industri | 4 | – | Blockerad |

## 4. Beslutspunkter som blockerar

1. Inloggningsmetod för kunder (inbjudan, kundens katalog eller e-legitimation) och anslutning av ESM:s jobbkonto (Entra ID).
2. Verksamhetskrav per modul: målgrupp, arbetsuppgifter, nyckeltal och acceptanskriterier för de 30 moduler som saknar dem.
3. Pilotkund per prioriterad vertikal och dess datakällor.
4. Verifierat CRM (Kundradar) och sändtjänst för inbjudningar och notiser.
5. Driftmiljö, lagring och dataskyddsbeslut (EU/EES, gallring).
6. Pris, bindningstid och referenser för webbplatsen.
7. Bildoriginal från Daniels Copilot-bibliotek.
8. Vilket repo som är plattformens hem (detta repo eller ESMELSA/elsa-portal-och-demo m.fl.) och innehållsinventering av modulrepona.
9. Presentationerna "Hur ska hemsida och ELSA se ut 20261111.pptx" och "Vår kundresa med ELSA.pptx" för layout och exakt målbild.

## 5. PM Kundadministration och rapporthantering (v0.1, 15 november 2026)

PM:et är ett förslag för intern beredning, inte en beskrivning av produktion. Kolumnen **Före** anger vad som
fanns i plattformsbygget (PR #3). **Status** följer samma skala som ovan; *Modellerad* betyder att regler och
datamodell är kodade och testade men inte kopplade mot någon riktig källa. Inget skickas externt och ingen
verklig källa, skanner, diarium eller originalarkiv är ansluten.

### 5.1 Huvudkedja och kundens administration (avsnitt 1–2)

| Id | Krav (avsnitt) | Före | Ändring | Test | Status |
|---|---|---|---|---|---|
| K-01 | Huvudkedja: konto → fil/källa → mottagning → extraktion → granskning → analys → utkast → godkännande → publicering (1) | Konto, behörighet, kundresa | Mottagning, granskning för analys, rapportutkast, godkännande, publicering och arkivering byggda. Extraktion och analys mellan dem saknas | dokumentmottagning.test.ts, rapportregister.test.ts | Delvis: extraktion ej byggd |
| K-02 | Samlad översikt: organisation, användare, objekt, uppdrag, dokument, anslutningar, fullmakter, rapporter med ansvarig, status och historik (2) | Organisation, användare, projekt | Sidorna Dokument och Rapportbibliotek; status och historik per dokument och version | e2e | Delvis: objektregister, anslutnings- och fullmaktsvy saknas |
| K-03 | Kundadministratören hanterar användare, roller, objektåtkomst och vem som får godkänna anslutningar och rapporter (2) | Användare, roller, moduler | – | plattform.test.ts | Delvis: objektåtkomst och särskild godkännanderätt saknas (kräver beslut om roller) |
| K-04 | Kundens handläggare lämnar underlag, kompletterar metadata och rättar inom sitt uppdrag (2) | – | `taEmot`, `komplettera`, prövas mot uppdraget och teamet | dokumentmottagning.test.ts | Testad |
| K-05 | ESM endast avtalad åtkomst; supportåtkomst reglerad och loggad (2) | ESM får inte kunddata automatiskt | Samma regel gäller dokument och rapporter | dokumentmottagning.test.ts, rapportregister.test.ts | Delvis: tidsbegränsad supportåtkomst finns bara i Val & Ö-modulen |
| K-06 | Beslutsfattare läser godkända rapporter, ser osäkerheter (2) | Läsarroll | Läsare ser bara publicerade versioner; luckor visas | rapportregister.test.ts "läsare" | Testad |
| K-07 | Visa vad som saknas, väntar på granskning och senaste uppdatering per källa; inget intryck av automatisk genomsökning (2) | – | "Saknas" och status per dokument | e2e | Delvis: senaste uppdatering per källa kräver anslutningar |

### 5.2 Dokumentmottagning (avsnitt 3, införandesteg 2)

| Id | Krav | Före | Ändring | Test | Status |
|---|---|---|---|---|---|
| K-08 | Filval och dra-och-släpp av flera filer i samma yta, samma kontroller, kvittens per fil (3) | – | `src/plattform/dokumentmottagning.ts`, sidan `/dokument` | dokumentmottagning.test.ts; e2e "kvittens per fil", "dra-och-släpp" | Testad (demo) |
| K-09 | Välj organisation, uppdrag och objekt; organisationen styrs av behörigheten (3.1) | – | Kontext prövas mot plattformens uppdrag; fel organisation nekas | dokumentmottagning.test.ts "Kundisolering" | Testad. Objekt anges som fritt id, objektregister saknas |
| K-10 | ELSA föreslår dokumenttyp, period och objekt; kunden bekräftar; gemensamma uppgifter för många filer (3.2) | – | Förslag från filnamn märkt som förslag; `bekraftaForslag`; `gemensamt` | dokumentmottagning.test.ts "föreslår" | Testad. Förslag från innehåll kräver extraktionsmotor |
| K-11 | Kontroller: skadlig kod, filtyp, storlek, läsbarhet, dubbletter, versionsbyte; fel per fil (3.3) | – | Alla sex kontroller; skannern är utbytbar | dokumentmottagning.test.ts | Testad. **Blockerad** för drift: skanningstjänst ej vald, filgräns 100 MB är förslag |
| K-12 | Originalet bevaras, dokument-ID, metadata och källa registreras (3.4) | – | Original oföränderligt, `DOK-`id, handlings-id över versioner, SHA-256 | dokumentmottagning.test.ts "Versionsbyte" | Testad (i minnet). Originalarkiv ej anslutet |
| K-13 | Status: mottagen, kontrolleras, behöver kompletteras, granskas, godkänd för analys (3.4) | – | Statusflöde med historik; utan skanning går det inte att godkänna | dokumentmottagning.test.ts "Status" | Testad |
| K-14 | Kvittens, öppna original, extraherade uppgifter och frågor (3.5) | – | Kvittens, öppna original (loggas), begär komplettering | dokumentmottagning.test.ts | Delvis: extraherade uppgifter saknas |
| K-15 | Samma fil vid omförsök skapar inte dubbla underlag (3.5) | – | Dubblett per kund på innehållshash, samma dokument-ID | dokumentmottagning.test.ts "omförsök"; e2e | Testad |
| K-16 | Filformat; DWG och IFC: lagring anges separat från extraktion (3) | – | `FILTYPER` med `stod: extraktion / endast_lagring` | dokumentmottagning.test.ts "DWG" | Testad |
| K-17 | Kundavskilt originalarkiv i SharePoint, ELSA håller metadata; åtkomst prövas i hela kedjan (3) | – | Åtkomst prövas i varje anrop | – | **Blockerad**: originalarkiv ej beslutat/anslutet |
| K-18 | Ändrat godkänt original: berörda analyser och rapporter identifieras (3) | – | `vidKallandring` → varning i rapportregistret; `beroende()` | rapportregister.test.ts "Ändrad källa" | Testad för rapporter. Analyser saknas |
| K-19 | Negativt test: en kund kan inte läsa en annan kunds underlag (8.2) | Kundisolering för projekt | Läsa, öppna, lista, ändra, godkänna, ersätta och lämna in till annans uppdrag nekas med samma svar som okänt id; annan kunds identiska fil avslöjas inte | dokumentmottagning.test.ts "Kundisolering"; e2e | Testad |

### 5.3 Anslutningar, fullmakter och skärmbaserad insamling (avsnitt 4–5, införandesteg 3 och 6)

| Id | Krav | Före | Ändring | Test | Status |
|---|---|---|---|---|---|
| K-20 | Anslutningsflöde: källa, omfattning, kundens godkännande, ESM-verifiering, provhämtning före schema (4) | Connectorkatalog C01–C29 | `src/plattform/fullmakter.ts`: `Anslutning`, `provaHamtning` | fullmakter.test.ts | Modellerad. Ingen källa ansluten |
| K-21 | Läsande anslutningar, avgränsade rättigheter, skyddade hemligheter, ingen skrivning utan beslut (4) | – | `rattighet: 'lasande'`, endast hemlighetsreferens | – | Modellerad |
| K-22 | Fullmaktsregister med givare, undertecknare, ombud, källa, bolag, objekt, uppgiftstyper, ändamål, period, giltighet, återkallelse, signerad handling (4) | – | `Fullmakt`; signerad handling = dokument-ID i mottagningen | fullmakter.test.ts | Modellerad |
| K-23 | Hämtning kräver både giltigt mandat och fungerande teknisk behörighet; fullmakt ≠ API-anslutning (4) | – | Båda prövas, alla skäl redovisas | fullmakter.test.ts "hålls isär" | Modellerad och testad |
| K-24 | Paus och återkallelse stoppar nya hämtningar; hämtade data raderas inte utan kontroll; bevaka utgång (4) | – | `aterkallaFullmakt`, `pausad`, `bevakaUtgang` | fullmakter.test.ts | Modellerad. Gallringsregler ej beslutade |
| K-25 | Leverantörens fullmaktskrav verifieras per källa (4) | – | `leverantorskravVerifierade` krävs | fullmakter.test.ts | Modellerad |
| K-26 | Personuppgiftsbiträdesavtal och rollbedömning (4) | – | – | – | **Blockerad**: dataskyddsbeslut |
| K-27 | Prioritet API → export/filimport → skärm (5) | – | `valjInsamlingsvag` | fullmakter.test.ts | Modellerad |
| K-28 | Skärmflöde: ändamål, godkända vyer, tillåtet innehåll, intervall, ansvarig, mandat och villkor verifierade (5) | – | `Skarmflode`, `kanKoraSkarmflode` | fullmakter.test.ts | Modellerad. Kan inte köras: inte godkänt för införande |
| K-29 | Läs bara överenskomna uppgifter; inga ändringar; MFA kringgås inte (5) | – | Otillåtna fält kasseras; oväntad inloggningsruta stoppar | fullmakter.test.ts | Modellerad |
| K-30 | Stopp eller manuell kontroll vid ändrad layout, ofullständig lista, oväntad inloggning, avvikande mängd (5) | – | `utvarderaSkarmobservation` | fullmakter.test.ts | Modellerad |
| K-31 | Observation knuten till källa, objekt, tid, körning; bortfall är inte noll; avstämning mot kontrollplan (5) | – | `Datakallposition.skarmvy`, bortfall; kontrollplan krävs | fullmakter.test.ts | Modellerad. Avstämningen själv ej byggd |

### 5.4 Från underlag till analysdata (avsnitt 6, införandesteg 4)

| Id | Krav | Före | Ändring | Test | Status |
|---|---|---|---|---|---|
| K-32 | Original, extraherad observation, granskad uppgift och resultat hålls isär (6) | OF-motorn: status per uppgift | `src/plattform/datapost.ts` | fullmakter.test.ts "Minsta datapost" | Modellerad |
| K-33 | Klassificera, extrahera, normalisera, koppla, validera, godkänn, analysera (6.1–7) | Energi: CSV-import och kvalitet | Validering av minsta datapost, motstridiga värden, inaktualitet | fullmakter.test.ts | Delvis: extraktionsmotor och granskningskö saknas |
| K-34 | Minsta datapost med alla fält i PM:et (6) | – | `Datapost` | fullmakter.test.ts | Modellerad |
| K-35 | Kvalitetsstatus extraherad, behöver granskas, verifierad, avvisad, inaktuell; saknat ≠ 0 (6) | Samma regel i OF och Energi | `valideraDatapost` | fullmakter.test.ts | Testad |
| K-36 | Facit, kritiska fält och felgränser beslutas före test (8.4) | – | – | – | **Blockerad**: beslut och representativa dokument |

### 5.5 Rapportgenerator och rapportregister (avsnitt 7, införandesteg 5)

| Id | Krav | Före | Ändring | Test | Status |
|---|---|---|---|---|---|
| K-37 | Gemensam rapporttjänst för alla moduler, katalog med syfte, målgrupp, mallägare, avsnitt, indata, kvalitet, roller, regler, format (7) | – | `src/plattform/rapportregister.ts`, `RAPPORTKATALOG` med fem typer, alla förslag | rapportregister.test.ts | Testad. Mallägare ej utsedda, pilotrapport ej vald |
| K-38 | Manuella och externa rapporter registreras med ursprung (7) | – | `ursprung` + krav på beskrivning | – | Implementerad |
| K-39 | Generatorn kontrollerar fullständighet; AI-text märks som utkast; luckor visas, fylls inte (7) | – | Obligatoriska avsnitt krävs före granskning; AI-block måste granskas före godkännande; `text: null` = lucka | rapportregister.test.ts | Testad. Textgenerering med AI är inte inkopplad |
| K-40 | Rapport-ID permanent; diarienummer separat; flera rapporter per ärende; versioner skapar inga nya nummer (7) | – | `RAP-`id, ärende med internt nummer, extern diariekoppling | rapportregister.test.ts "Diarienummer"; e2e | Testad |
| K-41 | Extern diariekoppling; bekräftat nummer återläses; väntande visas inte som genomförd (7) | – | `begarExternRegistrering`, `aterlasDiarienummer`, `arendebeteckning` | rapportregister.test.ts; e2e | Testad. **Blockerad** mot riktigt diarium: ansvar ej beslutat, ingen adapter |
| K-42 | Intern löpserie per kund, skild från externt nummer; skydd mot samtidiga kollisioner och omförsök (7, 8.5) | – | `tilldelaArendenummer` med villkorad skrivning och idempotensnyckel; 100 samtidiga anrop ger 100 unika nummer | rapportregister.test.ts "Kollisionssäker" | Testad i minne. Format `ELSA-<KUND>-<ÅR>-<NNNN>` är förslag; databaslager ej valt |
| K-43 | Rapport-, versions- och leveransmetadata enligt PM:et (7) | – | `Rapport`, `Rapportversion`, `Leverans` | rapportregister.test.ts | Testad. Bevarande- och gallringsregler ej beslutade |
| K-44 | Versioner 0.x/1.0/nya; ändringsbeskrivning; rapport-, mall- och dataversion isär; oförändrad export = samma version (7) | – | `nastaVersion`, innehållshash, deterministisk export | rapportregister.test.ts "Versionsregler" | Testad |
| K-45 | Statusflöde utkast → granskning → godkänd → publicerad → ersatt/arkiverad; underkänt tillbaka; godkännande av bestämd innehållsversion och låst underlag; ingen tyst överskrivning; återkallelse med orsak (7) | – | Hela flödet; godkännande kräver innehållshash; fyra ögon (förslag) | rapportregister.test.ts; e2e | Testad |
| K-46 | Format Word, PDF, presentation, tabellbilaga från samma modell; ingen automatisk extern distribution (7) | – | Export per tillåtet format med gemensamt rapport-ID, version och datatidpunkt; distribution registreras bara | rapportregister.test.ts | Delvis: inga dokumentmallar byggda |
| K-47 | Bibliotek: sök på kund, objekt, typ, period, diarienummer, ansvarig, status; gällande version tydlig; ändrad källa ger varning, ändrar inte publicerad rapport (7) | – | `sok`, `/rapporter`, varning | rapportregister.test.ts; e2e | Testad |

### 5.6 Beslut som efterfrågas i PM:et (avsnitt 8) och blockerar nästa steg

1. **Grundmodell** (steg 1): objektstruktur, roller (vem får godkänna anslutningar och rapporter), informationsklassning, datamodell, originalarkiv, fullmaktsomfattning, bevarande och gallring.
2. **Första kundflöde och pilotrapporttyp.** Katalogen har fem förslag; energirapporten används bara som demo.
3. **Diarieansvar**: är kundens diarium huvudregister, och vilket nummerformat ska ELSA:s interna löpserie ha?
4. **Dataskydd**: personuppgiftsbiträdesavtal, parternas roller, EU/EES.
5. **Slutgodkännande** av rapporter: ska fyra ögon gälla (nu på som förslag) och vilken roll godkänner?
6. **Skanningstjänst och filgräns** för mottagningen.
7. **Vilket repo som är plattformens hem** (punkt 8 i avsnitt 4) gäller även dessa tjänster.
