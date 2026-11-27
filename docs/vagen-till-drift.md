# Vägen till drift

Underlag: "ELSA tre steg närmare drift" (ELSA Ledning, 2026-11-27). Koden finns i
`src/plattform/mognad.ts`, `src/drift/` och vyn `/mognad` ("Vägen till drift").

## Mognadsskalan

Åtta steg: 1 Idé, 2 Förslag, 3 Demo, 4 Krav och ägare, 5 Pilotkund med avtal,
6 Pilot med mätt effekt, 7 I drift, 8 Skalad. Varje steg har ett bevis. Koden räknar
uppnått steg ur registrerade bevis (`bedomMognad`), i följd, och steg 7 kräver att
ELSA START själv är i drift. Skalan och gränsen på sex ledande moduler är förslag tills
Daniel beslutat (senast 2026-12-04).

`STEGPLANER` innehåller plattformen, de sex ledande modulerna och övriga moduler med
"bedömd nu" från mognadsgenomgången 2026-11-26 och tre planerade steg.
`kontrolleraStegplaner` prövar att varje plan har tre steg i följd, att datum ligger i
ordning, att högst sex moduler är ledande och att ingen modul når drift före plattformen.

## Val & Överförmyndare

Steg 4 i dag. Kvar: 5 pilot med nämnd, 6 mätt, 7 drift, tidigast 2028.
`provaDriftgrind` prövar kraven per steg:

| Id | Steg | Krav | Läge 2026-11-27 |
|---|---|---|---|
| VO-5-REPO | 5 | Repot är privat | Saknas: repot är publikt |
| VO-5-REGEL | 5 | Motorns regelkort granskade av jurist | Saknas: 0 av 11 verifierade |
| VO-5-NAMND | 5 | Pilotnämnd utsedd | Saknas |
| VO-5-AVTAL | 5 | Signerad beställning eller avrop | Saknas |
| VO-5-PUB | 5 | PUB-avtal | Saknas |
| VO-5-MATA | 5 | Rätt att mäta | Saknas |
| VO-5-DPIA | 5 | Konsekvensbedömning | Saknas |
| VO-5-EU | 5 | EU-drift beslutad | Saknas |
| VO-6-DATA | 6 | Verkliga data importerade | Saknas |
| VO-6-BASLINJE | 6 | Baslinje mätt före ELSA | Saknas |
| VO-6-EFFEKT | 6 | Effekt mätt och granskad (fyra ögon) | Saknas |
| VO-7-PLATTFORM | 7 | ELSA START i drift | Saknas |
| VO-7-RELEASE | 7 | Godkänd release med nummer | Saknas |
| VO-7-INLOGG | 7 | Kunden loggar in med e-legitimation | Saknas |
| VO-7-SUPPORT | 7 | Support bemannad | Saknas |
| VO-7-BACKUP | 7 | Backup testad | Saknas |
| VO-7-LOGG | 7 | Granskningsloggens hashkedja hel | Saknas |

Effektmätningen (`beraknaEffekt`) jämför baslinje och pilot på arbetstid per granskning,
ledtid och andel kompletteringar (median). Minst 20 granskningar per period är ett förslag
som ska fastställas med pilotnämnden. Effekten märks verifierad först när en granskare som
inte själv registrerat mätpunkterna har godkänt den. Mätpunkterna bär bara pseudonyma
ärende-ID.

## Inte gjort

Säljdelarna i underlaget (instegsköp, LOU-gräns, kundlistor) hör till plattformens CRM och
är inte byggda här. DPIA och EU-drift är tillagda krav utöver underlagets villkor, eftersom
modulen hanterar särskilt skyddsvärda uppgifter.
