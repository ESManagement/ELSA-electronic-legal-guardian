# ELSA Överförmyndare – granskningsstöd för årsräkning (MVP)

Första versionen av ELSA-modulen för överförmyndare. Den stödjer handläggarens
granskning av årsräkning, årsberättelse och slutredovisning enligt kravbilden i
*ELSA_Modul_formyndare* (PM v2, 2026-10-30). Valdomänen ingår inte i den här
versionen.

> **Status:** syntetiska data, ingen produktion. Regelkorten är inte juridiskt
> verifierade (`regelversion: "… (ej juridiskt verifierad)"`). Inga verkliga
> personuppgifter får användas förrän dataskyddsbedömning, AI-klassificering
> och tillämplighetsmatris är godkända (PM: "Kvarstående rättsliga
> verifieringsgrindar").

## Vad modulen gör

| Del | Krav i PM:et | Fil |
|---|---|---|
| Deterministisk redovisningsmotor: kontobalans, ingående och utgående saldo, bankbesked, period, ägande, dubbelposter, interna överföringar, kategorier, dispositioner, värden | Ö-20, kontrollbiblioteket, Ö-14 | `src/engine/kontroller.ts` |
| Indatamodell med originalvärde, status och källposition per uppgift | T-01, Ö-20 steg 2–4 | `src/engine/redovisning.ts`, `src/domain/typer.ts` |
| Granskningschecklista med PM:ets 19 kontrollpunkter | Ö-20, checklistan | `src/granskning/checklista.ts` |
| Granskning: motorn föreslår, människan fastställer, avslutsgrind | Ö-20, D-04, avslutskontroll, JO 5473-2024 | `src/granskning/granskning.ts` |
| Kompletteringsbegäran: utkast → godkänd → expedierad → bedömt svar | Ö-15, G-03, P-01 | `src/granskning/komplettering.ts` |
| Årlig behovsgranskning av förvaltarskap, skild från årsräkningen | Ö-04, Ö-23 | `src/granskning/behovsbevakning.ts` |
| Ärendestatus med tillåtna övergångar och delegationskrav | T-02, G-02 | `src/arende/status.ts` |
| Behörighet per domän, uppdrag och tidsbegränsad åtkomst | T-03, Ö-01 | `src/arende/behorighet.ts` |
| Mottagning: personkoppling bara på verifierad identitet | Ö-10 | `src/arende/mottagning.ts` |
| Köbevakning: ägarlösa och liggande ärenden | Problemkort 1 | `src/arende/kobevakning.ts` |
| Rättsligt versionskort och regelval per datum | Rättsligt versionskort, A-04 | `src/regler/regelkort.ts` |
| Granskningslogg med hashkedja | S-01, revisionspaket | `src/audit/granskningslogg.ts` |

## Bärande regler i koden

- **Inga gissade värden.** Motorn räknar bara på uppgifter med status
  `verifierad`. Oläsligt, saknat och ej tillämpligt hålls isär och räknas aldrig
  som noll.
- **Öre som heltal.** Alla belopp lagras som heltal i öre.
- **Toleranser är beslut.** Tolerans och dess motivering är parametrar
  (`Granskningsparametrar`), standardvärdet är 0.
- **AI och system beslutar aldrig.** Bara en människa kan fastställa en
  kontrollpunkt, godkänna utskick, kvittera bevakning eller föra ett ärende till
  `beslutat`. Beslutsrätt kräver giltig delegation, inte en roll.
- **Balans är inte godkännande.** Rimlighetsbedömningen (CP-18) kan inte sättas
  till "ej tillämplig", kräver skriftlig bedömning och blockerar avslut.
- **Avvikelser försvinner inte tyst.** Öppna avvikelser blockerar avslut. De kan
  föras vidare bara med skäl, ansvarig och uppföljningsdatum.
- **Brev innehåller inga interna arbetsinstruktioner.** Frågor till
  ställföreträdaren byggs från en neutral postbeskrivning.

## Gränssnitt

I `frontend/` finns en klickbar webbapplikation uppbyggd som ELSA Social (inloggning per roll,
sidomeny, rollanpassad startsida) som kör motorn direkt i webbläsaren. Se
[frontend/README.md](frontend/README.md).

## Kom igång

```bash
npm install
npm test          # 55 tester, testfall A-01–A-11, A-14 m.fl.
npm run typecheck
npm run demo      # genomkörning med syntetisk årsräkning
```

Kräver Node 22. Inga körtidsberoenden.

## Testfall från PM:et som täcks

| Test | Var |
|---|---|
| A-01 Samma namn, olika personer | `test/arende.test.ts` |
| A-02 Valdomänen söker överförmyndarärende | `test/arende.test.ts` |
| A-04 Framtida regelversion | `test/arende.test.ts` |
| A-05 Oläsligt belopp | `test/motor.test.ts` |
| A-06 Samma underlag igen | `test/motor.test.ts` |
| A-07 Intern överföring | `test/motor.test.ts` |
| A-08 Balans men disposition utan beslut | `test/motor.test.ts` |
| A-09 Behovsgranskning kvarstår | `test/granskning.test.ts` |
| A-10 Brevutkast är inte kommunicering | `test/granskning.test.ts` |
| A-11 E-legitimation utan uppdrag | `test/arende.test.ts` |
| A-14 Återkallad behörighet | `test/arende.test.ts` |

A-03 (instruktion i uppladdad handling) blir aktuellt först när en
utläsningstjänst med språkmodell kopplas in. A-12, A-13 gäller valdomänen.
A-15–A-18 kräver lagring, drift och gränssnitt som inte finns i denna version.

## Medvetet utanför MVP

- **Utläsning med AI** av inskannade årsräkningar. Motorn tar emot uppgifter med
  status `utlast_ej_verifierad` men räknar inte på dem förrän handläggaren
  verifierat dem mot originalet. Tjänsten ska prövas mot D-01–D-07, S-03 och
  AI-01 innan den byggs.
- **Lagring, API och gränssnitt.** Domänlogiken är skriven för att kunna läggas
  bakom valfri persistens; den är ännu inte kopplad till Dataverse, SharePoint
  eller kommunens verksamhetssystem (T-04).
- **Förordnande, rekrytering, samtyckesärenden, arvode, ensamkommande barn och
  hela valdomänen.**

## Juridisk status

Kontroll-id:n (`OF-20-05` m.fl.) är interna namn, inte lagrum. Innan pilot ska
regelkorten fyllas med verifierad lydelse (föräldrabalken 14 kap.,
ställföreträdarförordningen, lokala rutiner) och godkännas av jurist.
