# ELSA Val & Överförmyndare – gränssnitt

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
```

## Vyer

| Vy | Vem | Vad den visar |
|---|---|---|
| ELSA START | Alla utom ställföreträdare | Samlingsmodulen med alla 18 ELSA-moduler, sektorsidor och "Så kommer ni igång" (enligt presentationen *ELSA moduler 18 st*). Första sidan efter inloggning. |
| Översikt | Alla | Rollanpassad startsida med nästa åtgärd, notiser och block per roll |
| Ärenden | Överförmyndare | Arbetskö med status, ansvarig och kösignaler (problemkort 1) |
| Granskning av årsräkning | Handläggare, beslutsfattare | Motorförslag, checklista CP-01–CP-19, verifiering av oläsligt belopp, avvikelser, komplettering, avslutsgrind |
| Behovsprövning | Överförmyndare | Årlig prövning av förvaltarskap, skild från årsräkningen (Ö-04, Ö-23) |
| Valplanering | Valadministratör | Aktiviteter och lokaler inför nästa val, utan röstprövning eller resultat |
| Mina uppdrag | Ställföreträdare | Egna uppdrag och frågor från överförmyndaren; e-legitimation utan uppdrag visar inget (A-11) |
| Regelkort | Styrning | Versionskort och regelval; inget är juridiskt verifierat, så regelvalet stoppar |
| Granskningslogg | Processägare, systemadministratör | Alla händelser och kontroll av hashkedjan |
| Administration | Systemadministratör | Konton, domäner och tillfällig åtkomst |

Alla personer och ärenden är syntetiska. Demodatumet är 15 mars 2027 och ingenting sparas när sidan laddas om.
