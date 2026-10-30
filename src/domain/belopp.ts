import type { Ore } from './typer.js';

/**
 * Tolkar ett belopp skrivet på svenskt sätt ("1 234,50", "-12,5", "1234") till öre.
 * Returnerar null om strängen inte entydigt är ett belopp. Gissar aldrig.
 */
export function tolkaBelopp(text: string): Ore | null {
  const rensad = text.replace(/[\s ]/g, '').replace(/kr$/i, '').replace(/−/g, '-');
  const m = /^([+-])?(\d+)(?:,(\d{1,2}))?$/.exec(rensad);
  if (!m) return null;
  const tecken = m[1] === '-' ? -1 : 1;
  const kronor = Number(m[2]);
  const oren = m[3] ? Number(m[3].padEnd(2, '0')) : 0;
  const varde = tecken * (kronor * 100 + oren);
  return Number.isSafeInteger(varde) ? varde : null;
}

export function formateraBelopp(ore: Ore): string {
  const tecken = ore < 0 ? '-' : '';
  const abs = Math.abs(ore);
  const kronor = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const oren = (abs % 100).toString().padStart(2, '0');
  return `${tecken}${kronor},${oren} kr`;
}

export function summa(belopp: readonly Ore[]): Ore {
  let s = 0;
  for (const b of belopp) s += b;
  if (!Number.isSafeInteger(s)) throw new RangeError('Summan överskrider säkert heltalsintervall');
  return s;
}
