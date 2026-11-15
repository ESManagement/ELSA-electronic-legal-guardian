# Kravmatris – ELSA, hemsida, ELSA START och moduler

Källa: utvecklingsprompten "Promnt texter moduler" (15 november 2026), avsnitt 1–16. Matrisen skiljer på
**beskriven** (krav dokumenterat), **implementerad** (kod finns), **testad** (automatiskt test körts och
passerat) och **godkänd** (verksamheten har godkänt). Ingenting i matrisen är godkänt av verksamheten.
Status gäller grenen `claude/project-thread-4u4qiq`.

Testkörning 2026-11-15, Node 22.23, Linux, Chromium (Playwright):

| Kontroll | Kommando | Resultat |
|---|---|---|
| Enhets- och integrationstester | `npm test` | 107 av 107 godkända |
| Typkontroll motor | `npm run typecheck` | Inga fel |
| Typkontroll och bygge gränssnitt | `cd frontend && npm run typecheck && npm run build:demo` | Inga fel |
| Användarflöden i webbläsare | `cd frontend && npm run e2e` | 39 av 39 godkända |
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
