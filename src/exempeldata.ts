import type { Ore, Uppgift } from './domain/typer.js';
import type { Redovisning } from './engine/redovisning.js';

/**
 * Syntetiska testdata. Inga verkliga personer, konton eller ärenden.
 * Scenariot: årsräkning 2026 med två konton, en intern överföring, en
 * oförklarad utgift, en post som kan kräva samtycke och ett oläsligt belopp.
 */

const H = 'HANDLING-SYNT-ARSRAKNING-2026';
const B = 'HANDLING-SYNT-BANKBESKED-2026';

export function v<T>(varde: T, original: string, sida: number, plats: string, handlingId = H): Uppgift<T> {
  return { originalvarde: original, varde, status: 'verifierad', kalla: { handlingId, sida, plats }, verifieradAv: 'handlaggare-synt-1' };
}

export function kr(kronor: number): Ore {
  return Math.round(kronor * 100);
}

export function exempelArsrakning(): Redovisning {
  return {
    id: 'RED-SYNT-1',
    arendeId: 'AR-SYNT-1',
    handlingstyp: 'arsrakning',
    period: { fran: '2026-01-01', till: '2026-12-31' },
    konton: [
      { id: 'K1', benamning: 'Transaktionskonto', kontonummer: '1111-22 333 44', bank: 'Exempelbanken', agare: 'huvudman', omfattasAvForvaltningen: true },
      { id: 'K2', benamning: 'Sparkonto', kontonummer: '1111-55 666 77', bank: 'Exempelbanken', agare: 'huvudman', omfattasAvForvaltningen: true },
    ],
    saldon: [
      {
        kontoId: 'K1',
        ingaende: v(kr(12_000), '12 000,00', 1, 'Ingående K1'),
        utgaende: v(kr(19_200), '19 200,00', 1, 'Utgående K1'),
        enligtBankbesked: v(kr(19_200), '19 200,00', 1, 'Saldo 2026-12-31', B),
        bankbeskedDatum: '2026-12-31',
      },
      {
        kontoId: 'K2',
        ingaende: v(kr(50_000), '50 000,00', 1, 'Ingående K2'),
        utgaende: v(kr(55_000), '55 000,00', 1, 'Utgående K2'),
        enligtBankbesked: v(kr(55_000), '55 000,00', 1, 'Saldo 2026-12-31', B),
        bankbeskedDatum: '2026-12-31',
      },
    ],
    transaktioner: [
      { id: 'T1', kontoId: 'K1', datum: v('2026-01-25', '2026-01-25', 2, 'rad 1'), belopp: v(kr(14_200), '14 200,00', 2, 'rad 1'), text: 'Pension', kategori: 'inkomst', referens: 'R-001' },
      { id: 'T2', kontoId: 'K1', datum: v('2026-01-28', '2026-01-28', 2, 'rad 2'), belopp: v(kr(-9_800), '-9 800,00', 2, 'rad 2'), text: 'Boendeavgift', kategori: 'utgift', referens: 'R-002' },
      { id: 'T3', kontoId: 'K1', datum: v('2026-02-02', '2026-02-02', 2, 'rad 3'), belopp: v(kr(-5_000), '-5 000,00', 2, 'rad 3'), text: 'Överföring till sparkonto', kategori: 'intern_overforing', referens: 'R-003' },
      { id: 'T4', kontoId: 'K2', datum: v('2026-02-03', '2026-02-03', 3, 'rad 1'), belopp: v(kr(5_000), '5 000,00', 3, 'rad 1'), text: 'Från transaktionskonto', kategori: 'intern_overforing', referens: 'R-101' },
      { id: 'T5', kontoId: 'K1', datum: v('2026-06-14', '2026-06-14', 2, 'rad 4'), belopp: v(kr(-1_350), '-1 350,00', 2, 'rad 4'), text: 'Kontantuttag', kategori: 'okand', referens: 'R-004' },
      { id: 'T6', kontoId: 'K1', datum: v('2026-09-01', '2026-09-01', 2, 'rad 5'), belopp: v(kr(10_000), '10 000,00', 2, 'rad 5'), text: 'Försäljning av bil', kategori: 'inkomst', referens: 'R-005', kanKravaSamtycke: true },
      {
        id: 'T7',
        kontoId: 'K1',
        datum: v('2026-11-10', '2026-11-10', 2, 'rad 6'),
        belopp: { originalvarde: '-?.?00', varde: null, status: 'olaslig', kalla: { handlingId: H, sida: 2, plats: 'rad 6' } },
        text: 'Tandvård',
        kategori: 'utgift',
        referens: 'R-006',
      },
    ],
    ovrigaTillgangar: [
      { id: 'O1', beskrivning: 'Fondandelar', varde: v(kr(23_400), '23 400', 4, 'Fonder'), varderingstyp: 'marknadsvarde', varderingsdatum: '2026-12-31' },
    ],
    skulder: [],
    foregaendeVerifieradBalans: {
      K1: { belopp: kr(12_000), kalla: { handlingId: 'HANDLING-SYNT-ARSRAKNING-2025', sida: 1, plats: 'Utgående K1' } },
      K2: { belopp: kr(50_000), kalla: { handlingId: 'HANDLING-SYNT-ARSRAKNING-2025', sida: 1, plats: 'Utgående K2' } },
    },
  };
}
