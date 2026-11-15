# ELSA – gränssnitt

Klickbar webbapplikation för modulen, uppbyggd på samma sätt som ELSA Social: val av demoanvändare per roll,
sidomeny med grupper och sökning, principrad, rollanpassad startsida (aktiv vy, nästa åtgärd, notiser och block)
och samma formgivning (`src/styles.css` är hämtad från ELSA Social).

Gränssnittet kör domänmotorn i `../src` direkt i webbläsaren. Reglerna är alltså desamma som i testerna:
motorn föreslår och handläggaren fastställer, avslutsgrinden stoppar avslut, beslut kräver delegation,
behörighet styr vilka ärenden som syns och granskningsloggen har en hashkedja. `node:crypto` ersätts i
webbläsaren av `src/shim/crypto.ts`.

```bash
npm install
npm run dev          # http://localhost:5174
npm run typecheck
npm run build:demo   # en enda HTML-fil i dist-demo/ som fungerar utan server
npm run e2e          # bygger demon och kör 49 användarflödestester i Chromium (kräver Playwright)
```

Före inloggning visas den offentliga startsidan med två dörrar ("Jag är kund", "Jag är anställd på ESM"),
sökning, Boka demo, priser (märkta som förslag) och offertförfrågan. Inloggningen är simulerad och märkt så.

| Vy | Vem | Vad den visar |
|---|---|---|
| Startsida | Alla, före inloggning | Budskap, sök modul eller uppgift, ELSA START-katalog, Boka demo, offertförfrågan, kontakt |
| ELSA START | Inloggade | Alla 32 moduler från modulregistret, sökning, vertikalsidor, låsmarkering |
| Modulsida `/modul/:id` | Inloggade | Profil, status, connectorer, kandidatrepon, projekt (bara med åtkomst), "← ELSA START" |
| Projekt och kundresa | Kundorganisationer | 19 metodsteg, underlag, ELSA-förslag, beslut, kundgodkännande, uppföljning |
| Dokument och underlag | Kundorganisationer | Filval och dra-och-släpp, kvittens per fil, förslag att bekräfta, granskning för analys, ny version |
| Rapportbibliotek | Kundorganisationer | Sökning, rapport-ID, ärendenummer, versioner, granskning, godkännande, publicering, export, diariekoppling |
| Energitrend | Med modulen Energi | Import, felkö, trend, granskning |
| Användare och roller | Kundens administratör | Bjud in, stäng av, roll, moduler, aktivitetslogg |
| CRM och inbjudningar | ESM | Lead till Kund i drift, inbjudningsutkast, klickräknare |
| Leveransstatus | Inloggade | Status per modul och vertikal, bildregister |

## Vyer

| Vy | Vem | Vad den visar |
|---|---|---|
| Översikt Val & Ö (`/oversikt`) | Val & Överförmyndare | Rollanpassad startsida med nästa åtgärd, notiser och block per roll |
| Ärenden | Överförmyndare | Arbetskö med status, ansvarig och kösignaler (problemkort 1) |
| Granskning av årsräkning | Handläggare, beslutsfattare | Motorförslag, checklista CP-01–CP-19, verifiering av oläsligt belopp, avvikelser, komplettering, avslutsgrind |
| Behovsprövning | Överförmyndare | Årlig prövning av förvaltarskap, skild från årsräkningen (Ö-04, Ö-23) |
| Valplanering | Valadministratör | Aktiviteter och lokaler inför nästa val, utan röstprövning eller resultat |
| Mina uppdrag | Ställföreträdare | Egna uppdrag och frågor från överförmyndaren; e-legitimation utan uppdrag visar inget (A-11) |
| Regelkort | Styrning | Versionskort och regelval; inget är juridiskt verifierat, så regelvalet stoppar |
| Granskningslogg | Processägare, systemadministratör | Alla händelser och kontroll av hashkedjan |
| Administration | Systemadministratör | Konton, domäner och tillfällig åtkomst |

Alla personer och ärenden är syntetiska. Demodatumet är 15 mars 2027 och ingenting sparas när sidan laddas om.
