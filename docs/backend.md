# Backend – funktioner som behövs

Enkel översikt. Domänlogiken finns redan i `src/` och körs i dag i webbläsaren utan lagring. Backend ska
ge den lagring, inloggning och ett API. Själva arbetet görs av Simon.

| # | Funktion | Vad backend behöver göra | Befintlig kod |
|---|---|---|---|
| 1 | Inloggning och session | Logga in ESM och kunder, hålla session | `src/plattform/atkomst.ts` |
| 2 | Behörighet | Spara roller, team, modultilldelning, uppdrag och delegationer | `src/plattform/atkomst.ts`, `src/arende/behorighet.ts` |
| 3 | Organisation och användare | Medlemmar, roller, inbjudningar, avstängning | `src/plattform/plattform.ts` |
| 4 | Projekt och kundresa | Spara projekt och de 19 metodstegen | `src/plattform/plattform.ts`, `metod.ts` |
| 5 | Modulregister / ELSA START | Visa moduler med låsmarkering per användare | `src/plattform/modulregister.ts` |
| 6 | Kontakt och CRM | Ta emot kontaktformulär från hemsidan, spara leads | `src/plattform/crm.ts` |
| 7 | Överförmyndare: ärenden | Spara ärenden, mottagning, statusbyten, köbevakning | `src/arende/` |
| 8 | Överförmyndare: granskning | Spara redovisning, motorkörning och granskning | `src/engine/`, `src/granskning/` |
| 9 | Komplettering | Spara begäran och skicka godkända brev | `src/granskning/komplettering.ts` |
| 10 | Behovsbevakning | Spara årliga bevakningar och kvitteringar | `src/granskning/behovsbevakning.ts` |
| 11 | Regelkort | Spara regelkort med versioner | `src/regler/regelkort.ts` |
| 12 | Granskningslogg | Spara loggen så att den inte kan ändras | `src/audit/granskningslogg.ts` |
| 13 | Notiser | Notiser och Nästa åtgärd per roll | `frontend/src/store.tsx` |
| 14 | Energi | Ta emot CSV, spara trend och granskning | `src/moduler/energi/` |
| 15 | Dokumentmottagning | Ta emot filer, lagra original, skanna | PR #4 |
| 16 | Rapporter | Spara rapporter och versioner, ärendenummer, Word/PDF | PR #4 |
| 17 | Fullmakter | Spara fullmakter och bevaka utgång | PR #4 |
| 18 | Schemalagda jobb | Köbevakning, årlig behovsbevakning, kontroll av loggen | – |
| 19 | Connectorer och AI | Senare etapp | `src/plattform/connectorer.ts` |
| 20 | Mognad och stegbevis | Spara bevis per modul och steg (avtal, release, mätning) med dokumentreferens | `src/plattform/mognad.ts` |
| 21 | Driftgrind Val & Överförmyndare | Spara läget för steg 5–7 och visa vad som saknas | `src/drift/valOverformyndare.ts` |
| 22 | Effektmätning | Spara mätpunkter för baslinje och pilot och vem som granskat | `src/drift/effektmatning.ts` |
