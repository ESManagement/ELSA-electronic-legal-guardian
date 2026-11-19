/**
 * Startpunkt för backend. Placeholder: här ska ramverket väljas, adaptrarna för portarna
 * (portar.ts) kopplas in och rutterna (rutter.ts) registreras. Se docs/backend.md.
 *
 * Kör `npm run backend:rutter` för att lista det föreslagna API:t.
 */
import { JOBB } from './jobb.js';
import { RUTTER } from './rutter.js';

export function beskrivApi(): string {
  const rader = RUTTER.map((r) => `${r.avsnitt}  ${r.metod.padEnd(6)} ${r.sokvag.padEnd(58)} ${r.atkomst.padEnd(24)} ${r.pr4 ? '(PR #4) ' : ''}${r.beskrivning}`);
  const jobb = JOBB.map((j) => `B-20  JOBB   ${j.namn.padEnd(58)} ${j.cron.padEnd(24)} ${j.beskrivning}`);
  return [...rader, ...jobb, '', `${RUTTER.length} rutter och ${JOBB.length} jobb, alla ej implementerade.`].join('\n');
}

if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  console.log(beskrivApi());
}
