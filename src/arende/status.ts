import type { Aktor, Arendetyp, IsoDatum } from '../domain/typer.js';

/** Ärendestatusar enligt krav T-02. Alla används inte i varje ärendetyp. */
export const ARENDESTATUSAR = [
  'mottaget',
  'identitet_oklar',
  'registrerat',
  'underlagskontroll_pagar',
  'komplettering_forbereds',
  'komplettering_skickad',
  'svar_invantas',
  'sakuppgifter_verifierade',
  'rattslig_fraga_oppen',
  'beslutsutkast',
  'beslutat',
  'expedierat',
  'uppfoljning_pagar',
  'avslutat',
] as const;

export type Arendestatus = (typeof ARENDESTATUSAR)[number];

const TILLATNA: Record<Arendestatus, readonly Arendestatus[]> = {
  mottaget: ['identitet_oklar', 'registrerat'],
  identitet_oklar: ['registrerat'],
  registrerat: ['underlagskontroll_pagar'],
  underlagskontroll_pagar: ['komplettering_forbereds', 'sakuppgifter_verifierade', 'rattslig_fraga_oppen'],
  komplettering_forbereds: ['komplettering_skickad', 'underlagskontroll_pagar'],
  komplettering_skickad: ['svar_invantas'],
  // Inkommet svar återför ärendet till aktiv kö (problemkort 1).
  svar_invantas: ['underlagskontroll_pagar'],
  sakuppgifter_verifierade: ['beslutsutkast', 'rattslig_fraga_oppen', 'avslutat', 'komplettering_forbereds'],
  rattslig_fraga_oppen: ['underlagskontroll_pagar', 'beslutsutkast', 'sakuppgifter_verifierade'],
  beslutsutkast: ['beslutat', 'underlagskontroll_pagar'],
  beslutat: ['expedierat'],
  expedierat: ['uppfoljning_pagar', 'avslutat'],
  uppfoljning_pagar: ['avslutat', 'underlagskontroll_pagar'],
  avslutat: [],
};

/** Delegationsbeslut (krav G-02). Beslutsrätt kommer härifrån, aldrig från en teknisk roll. */
export interface Delegation {
  delegatId: string;
  arendetyper: Arendetyp[];
  giltigFran: IsoDatum;
  giltigTill?: IsoDatum;
  beslutsreferens: string;
}

export interface Overgangskontext {
  aktor: Aktor;
  arendetyp: Arendetyp;
  datum: IsoDatum;
  delegationer: readonly Delegation[];
  /** Krävs för övergång till "komplettering_skickad": id för registrerad expediering. */
  expedieringId?: string;
  /** Krävs för övergång till "expedierat". */
  expedieringshandelseId?: string;
  /** Krävs för "avslutat" i redovisningsgranskning: granskningen är stängd enligt avslutsgrinden. */
  granskningAvslutad?: boolean;
}

export type Overgangsresultat = { ok: true } | { ok: false; skal: string };

export function harBeslutsratt(aktor: Aktor, arendetyp: Arendetyp, datum: IsoDatum, delegationer: readonly Delegation[]): boolean {
  if (aktor.typ !== 'manniska') return false;
  return delegationer.some(
    (d) =>
      d.delegatId === aktor.id &&
      d.arendetyper.includes(arendetyp) &&
      d.giltigFran <= datum &&
      (d.giltigTill === undefined || datum <= d.giltigTill),
  );
}

export function provaOvergang(fran: Arendestatus, till: Arendestatus, ktx: Overgangskontext): Overgangsresultat {
  if (!TILLATNA[fran].includes(till)) {
    return { ok: false, skal: `Övergången ${fran} → ${till} är inte tillåten` };
  }
  // Materiella steg kräver alltid en människa. AI och system får bara föreslå.
  if (ktx.aktor.typ !== 'manniska' && till !== 'identitet_oklar' && till !== 'underlagskontroll_pagar') {
    return { ok: false, skal: 'Endast en människa får föra ärendet till denna status' };
  }
  if (till === 'beslutat' && !harBeslutsratt(ktx.aktor, ktx.arendetyp, ktx.datum, ktx.delegationer)) {
    return { ok: false, skal: 'Aktören saknar giltig delegation för att besluta i ärendetypen' };
  }
  if (till === 'komplettering_skickad' && !ktx.expedieringId) {
    return { ok: false, skal: 'Komplettering kan inte markeras som skickad utan registrerad expediering' };
  }
  if (till === 'expedierat' && !ktx.expedieringshandelseId) {
    return { ok: false, skal: 'Beslut kan inte markeras som expedierat utan expedieringshändelse' };
  }
  if (till === 'avslutat' && ktx.arendetyp === 'redovisningsgranskning' && !ktx.granskningAvslutad) {
    return { ok: false, skal: 'Redovisningsgranskningen har inte passerat avslutsgrinden' };
  }
  return { ok: true };
}

export function tillatnaOvergangar(fran: Arendestatus): readonly Arendestatus[] {
  return TILLATNA[fran];
}
