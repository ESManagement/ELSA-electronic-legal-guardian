import type { IsoDatum } from '../domain/typer.js';
import { KONTROLLER } from '../engine/kontroller.js';
import type { Regelregister } from '../regler/regelkort.js';
import type { Steg } from '../plattform/mognad.js';
import type { Effektrapport } from './effektmatning.js';

/**
 * Driftgrind för Val & Överförmyndare: steg 5, 6 och 7 på mognadsskalan.
 *
 * Underlaget "ELSA tre steg närmare drift" (2026-11-27) placerar modulen på
 * steg 4 (Krav och ägare) med tre steg kvar: 5 pilot med nämnd, 6 mätt,
 * 7 drift, tidigast 2028. Villkoren är att repot är privat och att regelkorten
 * är granskade av jurist. Till det kommer skalans egna bevis per steg och
 * modulens tidigare beslutspunkter (pilotkommun, EU-drift, e-legitimation).
 *
 * Grinden prövar fakta som registreras av människor. Den sätter aldrig ett
 * steg som taget själv, och den ersätter inte nämndens eller juristens beslut.
 */

export interface VoLage {
  /** Repots synlighet enligt GitHub. Underlaget kräver privat repo före pilot. */
  repoSynlighet: 'privat' | 'publik' | 'okand';
  pilotnamnd?: { kommun: string; namnd: 'overformyndarnamnd' | 'gemensam_overformyndarnamnd' | 'valnamnd' };
  /** Diarienummer eller avtalsnummer. Tomt = saknas. */
  signeradBestallning?: string;
  pubAvtal?: string;
  rattAttMata?: string;
  /** Konsekvensbedömning enligt art. 35 GDPR. Särskilt skyddsvärda uppgifter om huvudmän. */
  dpia?: string;
  euDriftBeslutad?: string;
  verkligaDataImporterade?: string;
  effekt?: Effektrapport;
  /** Plattformens (ELSA START) uppnådda steg. Modulen kan inte nå steg 7 före plattformen. */
  plattformsSteg: Steg | 0;
  release?: string;
  kundinloggningEleg?: string;
  support?: string;
  backupTestad?: string;
  granskningsloggKedjaHel?: boolean;
}

export interface Grindkrav {
  id: string;
  steg: 5 | 6 | 7;
  krav: string;
  uppfyllt: boolean;
  /** Varifrån kravet kommer. */
  kalla: string;
  detalj?: string;
}

export interface Driftgrind {
  krav: Grindkrav[];
  /** Högsta steg där alla krav för steget och de tidigare stegen är uppfyllda. Lägst 4. */
  tillatetSteg: 4 | 5 | 6 | 7;
  /** Krav som stoppar nästa steg. */
  hinder: Grindkrav[];
}

const UNDERLAG = 'Tre steg närmare drift 2026-11-27';
const SKALAN = 'Mognadsskalan, steg';
const har = (s?: string) => Boolean(s && s.trim());

/** Regel-ID som redovisningsmotorns kontroller använder. Alla måste vara verifierade före pilot. */
export function motornsRegler(): string[] {
  return [...new Set(Object.values(KONTROLLER).map((k) => k.regel))].sort();
}

export function regelkortStatus(regler: Regelregister, datum: IsoDatum): { verifierade: string[]; ejVerifierade: string[] } {
  const verifierade: string[] = [];
  const ejVerifierade: string[] = [];
  for (const id of motornsRegler()) (regler.valj(id, datum).status === 'ok' ? verifierade : ejVerifierade).push(id);
  return { verifierade, ejVerifierade };
}

export function provaDriftgrind(lage: VoLage, regler: Regelregister, datum: IsoDatum): Driftgrind {
  const rk = regelkortStatus(regler, datum);
  const k = (id: string, steg: 5 | 6 | 7, krav: string, uppfyllt: boolean, kalla: string, detalj?: string): Grindkrav => ({
    id, steg, krav, uppfyllt, kalla, ...(detalj ? { detalj } : {}),
  });
  const krav: Grindkrav[] = [
    // Steg 5: Pilotkund med avtal
    k('VO-5-REPO', 5, 'Repot är privat', lage.repoSynlighet === 'privat', UNDERLAG,
      lage.repoSynlighet === 'publik' ? 'Repot är publikt i dag. Ändras av repoägaren i GitHub.' : lage.repoSynlighet === 'okand' ? 'Synligheten är inte kontrollerad' : undefined),
    k('VO-5-REGEL', 5, 'Regelkorten som motorn använder är granskade av jurist', rk.ejVerifierade.length === 0, UNDERLAG,
      rk.ejVerifierade.length ? `${rk.ejVerifierade.length} av ${motornsRegler().length} ej verifierade: ${rk.ejVerifierade.join(', ')}` : undefined),
    k('VO-5-NAMND', 5, 'Pilotnämnd utsedd', Boolean(lage.pilotnamnd?.kommun.trim()), UNDERLAG),
    k('VO-5-AVTAL', 5, 'Signerad beställning eller avrop', har(lage.signeradBestallning), `${SKALAN} 5`),
    k('VO-5-PUB', 5, 'PUB-avtal', har(lage.pubAvtal), `${SKALAN} 5`),
    k('VO-5-MATA', 5, 'Rätt att mäta', har(lage.rattAttMata), `${SKALAN} 5`),
    k('VO-5-DPIA', 5, 'Konsekvensbedömning (DPIA) gjord', har(lage.dpia), 'Särskilt skyddsvärda uppgifter, modulregistret'),
    k('VO-5-EU', 5, 'EU-drift beslutad', har(lage.euDriftBeslutad), 'ELSA START steg 5 i underlaget'),
    // Steg 6: Pilot med mätt effekt
    k('VO-6-DATA', 6, 'Verkliga data importerade från pilotnämnden', har(lage.verkligaDataImporterade), `${SKALAN} 6`),
    k('VO-6-BASLINJE', 6, 'Baslinje mätt före ELSA', (lage.effekt?.antal.baslinje ?? 0) > 0 && lage.effekt?.status !== 'otillrackligt_underlag', `${SKALAN} 6`,
      lage.effekt?.status === 'otillrackligt_underlag' ? lage.effekt.skal.join('; ') : undefined),
    k('VO-6-EFFEKT', 6, 'Effekt mätt och granskad', lage.effekt?.status === 'verifierad', `${SKALAN} 6`,
      lage.effekt && lage.effekt.status !== 'verifierad' ? lage.effekt.skal.join('; ') : undefined),
    // Steg 7: I drift
    k('VO-7-PLATTFORM', 7, 'ELSA START är i drift', lage.plattformsSteg >= 7, UNDERLAG, `Plattformen har nått steg ${lage.plattformsSteg}`),
    k('VO-7-RELEASE', 7, 'Godkänd release med nummer', har(lage.release), `${SKALAN} 7`),
    k('VO-7-INLOGG', 7, 'Kunden loggar in med e-legitimation', har(lage.kundinloggningEleg), `${SKALAN} 7`),
    k('VO-7-SUPPORT', 7, 'Support bemannad', har(lage.support), `${SKALAN} 7`),
    k('VO-7-BACKUP', 7, 'Backup testad', har(lage.backupTestad), `${SKALAN} 7`),
    k('VO-7-LOGG', 7, 'Granskningsloggens hashkedja är hel', lage.granskningsloggKedjaHel === true, 'Krav S-01'),
  ];
  let tillatetSteg: Driftgrind['tillatetSteg'] = 4;
  for (const s of [5, 6, 7] as const) {
    if (krav.filter((x) => x.steg === s).every((x) => x.uppfyllt)) tillatetSteg = s;
    else break;
  }
  const nasta = tillatetSteg < 7 ? tillatetSteg + 1 : null;
  return { krav, tillatetSteg, hinder: nasta ? krav.filter((x) => x.steg === nasta && !x.uppfyllt) : [] };
}

/** Läget 2026-11-27 så som det är känt i projektet. Inget av stegen 5–7 är taget. */
export const VO_LAGE_2026_11_27: VoLage = Object.freeze({
  repoSynlighet: 'publik',
  /** Bedömningen 2026-11-26, inte bevisat steg. */
  plattformsSteg: 4,
}) as VoLage;
