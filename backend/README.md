# Backend (placeholder)

Här ska ELSA:s backend byggas. Mappen innehåller bara struktur och stubbar, ingen fungerande server.
Beskrivningen av vad backend ska göra, funktion för funktion, finns i [docs/backend.md](../docs/backend.md).

| Fil | Innehåll |
|---|---|
| `src/portar.ts` | Gränssnitt mot lagring, identitet, filarkiv, skanner, utskick, diarium, AI och schemaläggning |
| `src/rutter.ts` | Föreslaget API som tabell; varje rad pekar ut befintlig domänfunktion i `../src` |
| `src/jobb.ts` | Schemalagda jobb |
| `src/server.ts` | Startpunkt; listar API:t |
| `test/rutter.test.ts` | Kontrollerar att tabellen och dokumentet hänger ihop |

```bash
npm run backend:typecheck   # typkontroll av backend mot domänkoden
npm run backend:rutter      # lista föreslagna rutter och jobb
npm test                    # tar med backend/test
```

Domänlogiken i `../src` är redan skriven för att ligga bakom en server: behörighet prövas i varje
anrop och sessionen kommer från anroparen. Backend ska därför inte skriva om reglerna, bara ge dem
lagring, identitet och ett API.
