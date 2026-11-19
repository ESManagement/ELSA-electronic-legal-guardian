/**
 * Schemalagda jobb (B-20). Bara namn och tänkt intervall. Inget körs.
 */
import { ejImplementerat } from './ej-implementerat.js';

export interface Jobb {
  namn: string;
  /** Föreslaget intervall i cron-format, tidszon Europe/Stockholm. */
  cron: string;
  beskrivning: string;
  karna: string;
}

export const JOBB: readonly Jobb[] = Object.freeze([
  { namn: 'kobevakning', cron: '0 6 * * 1-5', beskrivning: 'Hitta ägarlösa och liggande överförmyndarärenden, skapa notiser', karna: 'bevakaKo' },
  { namn: 'arlig-behovsbevakning', cron: '0 5 2 1 *', beskrivning: 'Skapa årets behovsgranskningar av förvaltarskap', karna: 'Behovsbevakningar.skapaArliga' },
  { namn: 'regelkort-bevakning', cron: '0 6 * * 1', beskrivning: 'Regelkort vars bevakningsdatum passerats', karna: 'Regelregister.forfallnaBevakningar' },
  { namn: 'fullmakt-utgang', cron: '0 6 * * 1', beskrivning: 'Fullmakter som snart går ut (PR #4)', karna: 'bevakaUtgang' },
  { namn: 'loggkedja-verifiering', cron: '0 3 * * *', beskrivning: 'Verifiera granskningsloggens hashkedja, larma vid brott', karna: 'Granskningslogg.verifieraKedja' },
]);

export function korJobb(namn: string): never {
  return ejImplementerat('B-20', `jobb ${namn}`);
}
