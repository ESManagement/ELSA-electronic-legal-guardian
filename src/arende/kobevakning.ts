import type { Arende } from '../domain/typer.js';

/**
 * Bevakning av ärenden som blir liggande (problemkort 1, JO 5473-2024).
 * Varningsnivåerna är lokala parametrar, inte lagstadgade frister.
 */
export interface Koparametrar {
  dagarUtanMateriellAktivitet: number;
  dagarSvarInvantas: number;
}

export type Kosignal =
  | { arendeId: string; signal: 'agarlost' }
  | { arendeId: string; signal: 'ingen_materiell_aktivitet'; dagar: number }
  | { arendeId: string; signal: 'svar_invantas_lange'; dagar: number };

function dagar(fran: string, till: Date): number {
  return Math.floor((till.getTime() - Date.parse(fran)) / 86_400_000);
}

export function bevakaKo(arenden: readonly Arende[], nu: Date, p: Koparametrar): Kosignal[] {
  const signaler: Kosignal[] = [];
  for (const a of arenden) {
    if (a.status === 'avslutat') continue;
    if (!a.agare) signaler.push({ arendeId: a.id, signal: 'agarlost' });
    const senast = a.senasteMateriellaAktivitet ?? a.mottaget;
    const d = dagar(senast, nu);
    if (a.status === 'svar_invantas' && d > p.dagarSvarInvantas) {
      signaler.push({ arendeId: a.id, signal: 'svar_invantas_lange', dagar: d });
    } else if (d > p.dagarUtanMateriellAktivitet) {
      signaler.push({ arendeId: a.id, signal: 'ingen_materiell_aktivitet', dagar: d });
    }
  }
  return signaler;
}
