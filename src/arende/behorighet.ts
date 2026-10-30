import type { Arende, Doman, IsoDatum } from '../domain/typer.js';

/**
 * Behörighetskontroll i varje led (krav T-03, Ö-01, A-02, A-11, A-14).
 *
 * - Domänerna val och överförmyndare är helt åtskilda.
 * - Systemadministratör och leverantörssupport får aldrig läsa ärendeinnehåll
 *   genom sin roll; de behöver tidsbegränsad åtkomst med ändamål och godkännande.
 * - En ställföreträdare ser bara ärenden i sina egna giltiga uppdrag.
 *   E-legitimation bevisar identitet, inte rätt att företräda.
 * - Återkallad behörighet slår igenom direkt, även via gamla länkar och sök.
 */
export type Roll =
  | 'handlaggare'
  | 'registrator'
  | 'beslutsfattare'
  | 'processagare'
  | 'systemadministrator'
  | 'leverantorssupport'
  | 'stallforetradare'
  | 'valadministrator';

export type Atgard = 'sok' | 'las' | 'andra' | 'exportera';

export interface Rolltilldelning {
  roll: Roll;
  doman: Doman;
  giltigFran: IsoDatum;
  giltigTill?: IsoDatum;
  aterkallad?: boolean;
}

export interface TillfalligAtkomst {
  arendeId: string;
  andamal: string;
  godkandAv: string;
  giltigTill: string;
}

export interface Anvandare {
  id: string;
  /** Inloggning med e-legitimation. Ger identitet men inga rättigheter i sig. */
  identifieradMedELeg: boolean;
  roller: Rolltilldelning[];
  /** Uppdrag-id där användaren är förordnad ställföreträdare. */
  egnaUppdrag?: { uppdragId: string; giltigFran: IsoDatum; giltigTill?: IsoDatum }[];
  tillfalligAtkomst?: TillfalligAtkomst[];
}

const HANDLAGGANDE_ROLLER: readonly Roll[] = ['handlaggare', 'registrator', 'beslutsfattare', 'processagare'];

function aktivRoll(r: Rolltilldelning, doman: Doman, datum: IsoDatum): boolean {
  return !r.aterkallad && r.doman === doman && r.giltigFran <= datum && (r.giltigTill === undefined || datum <= r.giltigTill);
}

export type Atkomstbeslut = { tillats: true; grund: string } | { tillats: false };

export function provaAtkomst(anv: Anvandare, arende: Arende, atgard: Atgard, tid: Date): Atkomstbeslut {
  const datum = tid.toISOString().slice(0, 10);

  const handlaggande = anv.roller.find((r) => HANDLAGGANDE_ROLLER.includes(r.roll) && aktivRoll(r, arende.doman, datum));
  if (handlaggande) {
    if (atgard === 'andra' && handlaggande.roll === 'registrator' && arende.status !== 'mottaget') {
      return { tillats: false };
    }
    return { tillats: true, grund: `roll:${handlaggande.roll}` };
  }

  const uppdrag = anv.egnaUppdrag?.find(
    (u) => u.uppdragId === arende.uppdragId && u.giltigFran <= datum && (u.giltigTill === undefined || datum <= u.giltigTill),
  );
  const arStallforetradare = anv.roller.some((r) => r.roll === 'stallforetradare' && aktivRoll(r, arende.doman, datum));
  if (uppdrag && arStallforetradare && (atgard === 'las' || atgard === 'sok')) {
    return { tillats: true, grund: `uppdrag:${uppdrag.uppdragId}` };
  }

  const tillfallig = anv.tillfalligAtkomst?.find((t) => t.arendeId === arende.id && tid.toISOString() <= t.giltigTill);
  if (tillfallig && atgard === 'las') {
    return { tillats: true, grund: `tillfallig:${tillfallig.andamal}` };
  }

  return { tillats: false };
}

/**
 * Filtrerar sökträffar. Obehöriga ärenden tas bort helt: varken träfftext,
 * antal eller annan indirekt bekräftelse lämnas ut (A-02).
 */
export function filtreraSoktraffar<T extends { arende: Arende }>(anv: Anvandare, traffar: readonly T[], tid: Date): T[] {
  return traffar.filter((t) => provaAtkomst(anv, t.arende, 'sok', tid).tillats);
}
