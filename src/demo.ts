/**
 * Genomkörning med syntetiska data: `npm run demo`.
 * Visar hela kedjan från motorkörning till avslutad granskning.
 */
import { Granskningslogg } from './audit/granskningslogg.js';
import { formateraBelopp } from './domain/belopp.js';
import type { Aktor } from './domain/typer.js';
import { korKontroller } from './engine/kontroller.js';
import { STANDARDPARAMETRAR } from './engine/redovisning.js';
import { exempelArsrakning, kr, v } from './exempeldata.js';
import { RIMLIGHETSPUNKT } from './granskning/checklista.js';
import { Granskning } from './granskning/granskning.js';
import { Kompletteringsbegaran } from './granskning/komplettering.js';

const handlaggare: Aktor = { id: 'handlaggare-synt-1', typ: 'manniska' };
const logg = new Granskningslogg();
const rubrik = (t: string) => console.log(`\n=== ${t} ===`);

const redovisning = exempelArsrakning();

rubrik('1. Första motorkörning');
let korning = korKontroller(redovisning, STANDARDPARAMETRAR);
for (const r of korning.resultat.filter((x) => x.utfall !== 'utford_utan_avvikelse')) {
  console.log(`[${r.utfall}] ${r.kontrollId}: ${r.beskrivning}`);
}

rubrik('2. Handläggaren verifierar det oläsliga beloppet mot originalet');
redovisning.transaktioner.find((t) => t.id === 'T7')!.belopp = v(kr(-850), '-850,00', 2, 'rad 6');
korning = korKontroller(redovisning, STANDARDPARAMETRAR);
const s = korning.sammanstallning;
console.log(`Externa inbetalningar: ${formateraBelopp(s.externaInbetalningar)}`);
console.log(`Externa utbetalningar: ${formateraBelopp(s.externaUtbetalningar)}`);
console.log(`Interna överföringar (ej medräknade): ${formateraBelopp(s.interntOverfort)}`);
for (const r of korning.resultat.filter((x) => x.kontrollId === 'K-KONTOBALANS')) console.log(`[${r.utfall}] ${r.beskrivning}`);

rubrik('3. Granskning: motorns förslag per kontrollpunkt');
const g = new Granskning(redovisning.arendeId, redovisning.id, 'Granskningsrutin (syntetisk) 2027-01', logg);
g.foreslaFranMotor(korning);
for (const p of g.punkter()) console.log(`${p.punkt.id} ${p.punkt.rubrik}: ${p.foreslagetUtfall ?? 'kräver manuell bedömning'}`);
console.log('\nAvvikelser:');
for (const a of g.avvikelser()) console.log(`${a.id} (${a.allvarlighet}): ${a.beskrivning}`);

rubrik('4. Kompletteringsutkast');
const k = new Kompletteringsbegaran(redovisning.arendeId, logg);
k.skapaUtkast(g.avvikelser());
console.log(k.brevtext());
for (const f of k.fragor()) k.godkann(f.id, handlaggare);
const exp = k.registreraExpediering(handlaggare, { mottagare: 'Ställföreträdare (syntetisk)', mottagarroll: 'stallforetradare', kanal: 'post' });
console.log(`\nExpedierad: ${exp.id}`);
for (const f of k.fragor()) k.registreraSvar(f.id, handlaggare, 'besvarad_lost', 'Svar med kontoutdrag och samtyckesbeslut stämmer med originalen');

rubrik('5. Försök att avsluta utan rimlighetsbedömning');
const original = [{ handlingId: 'HANDLING-SYNT-ARSRAKNING-2026', sida: 1 }];
for (const p of g.punkter()) {
  if (p.punkt.id === RIMLIGHETSPUNKT) continue;
  if (p.foreslagetUtfall === 'ej_tillamplig') g.faststall(p.punkt.id, handlaggare, { utfall: 'ej_tillamplig', motivering: 'Inga sådana poster i originalet' });
  else if (p.foreslagetUtfall === 'avvikelse') g.faststall(p.punkt.id, handlaggare, { utfall: 'avvikelse', hanvisningar: original });
  else g.faststall(p.punkt.id, handlaggare, { utfall: 'utford_utan_avvikelse', hanvisningar: original });
}
for (const a of g.avvikelser()) g.hanteraAvvikelse(a.id, handlaggare, { status: 'lost', atgard: 'Förklarad genom komplettering' });
const anteckning = {
  granskadHandling: 'Årsräkning 2026 (syntetisk)',
  period: '2026-01-01–2026-12-31',
  genomfordaKontroller: 'CP-01–CP-19 enligt rutin 2027-01',
  identifieradeAvvikelser: g.avvikelser().map((a) => a.id).join(', '),
  kompletteringarOchSvar: `${exp.id}, samtliga frågor besvarade`,
  sjalvstandigBedomning: 'Utgifterna avser huvudmannens boende, vård och vardag och bedöms rimliga. Kontantuttaget är förklarat med kvitton.',
  kvarstaendeFragor: 'Inga',
  nastaAtgard: 'Ingen',
  ansvarig: handlaggare.id,
};
const forsok = g.avsluta(handlaggare, anteckning);
if (!forsok.ok) for (const h of forsok.hinder) console.log(`Hinder: ${h}`);

rubrik('6. Materiell bedömning görs och granskningen avslutas');
g.faststall(RIMLIGHETSPUNKT, handlaggare, { utfall: 'utford_utan_avvikelse', hanvisningar: original, bedomning: anteckning.sjalvstandigBedomning });
console.log(g.avsluta(handlaggare, anteckning));
console.log(`\n${korning.forbehall}`);

rubrik('7. Granskningslogg');
const handelser = logg.handelser();
console.log(`${handelser.length} händelser, hashkedja ${Granskningslogg.verifieraKedja(handelser).ok ? 'intakt' : 'BRUTEN'}`);
