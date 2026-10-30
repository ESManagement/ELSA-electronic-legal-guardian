import type { IsoDatum } from '../domain/typer.js';

/**
 * Rättsligt versionskort (PM avsnitt "Rättsligt versionskort").
 *
 * En regel får bara användas när den är juridiskt verifierad, gäller på
 * tillämpningsdagen och inte krockar med en annan verifierad version.
 * Saknad källa eller konflikt stoppar svaret i stället för att gissa.
 */
export type Kalltyp =
  | 'lag'
  | 'forordning'
  | 'foreskrift'
  | 'allmant_rad'
  | 'handledning'
  | 'rattspraxis'
  | 'jo'
  | 'lokal_rutin'
  | 'lokalt_beslut';

export interface Regelkort {
  regelId: string;
  version: string;
  forfattning: string;
  lagrum: string;
  kalltyp: Kalltyp;
  giltigFran: IsoDatum;
  giltigTill?: IsoDatum;
  verifieringsstatus: 'ej_verifierad' | 'verifierad';
  granskare?: string;
  godkannandedatum?: IsoDatum;
  nastaBevakning?: IsoDatum;
  beskrivning: string;
}

export type Regelval =
  | { status: 'ok'; regel: Regelkort }
  | { status: 'stopp'; skal: 'underlag_saknas' | 'ej_verifierad' | 'kallkonflikt'; detaljer: string; kandidater: Regelkort[] };

export class Regelregister {
  readonly #kort: Regelkort[] = [];

  constructor(kort: readonly Regelkort[] = []) {
    for (const k of kort) this.lagg(k);
  }

  lagg(kort: Regelkort): void {
    if (this.#kort.some((k) => k.regelId === kort.regelId && k.version === kort.version)) {
      throw new Error(`Regel ${kort.regelId} version ${kort.version} finns redan`);
    }
    if (kort.verifieringsstatus === 'verifierad' && (!kort.granskare || !kort.godkannandedatum)) {
      throw new Error(`Regel ${kort.regelId}: verifierad regel kräver granskare och godkännandedatum`);
    }
    this.#kort.push(structuredClone(kort));
  }

  /** Väljer den version som gäller på `datum` (krav A-04: framtida lydelse används inte i dag). */
  valj(regelId: string, datum: IsoDatum): Regelval {
    const giltiga = this.#kort.filter(
      (k) => k.regelId === regelId && k.giltigFran <= datum && (k.giltigTill === undefined || datum <= k.giltigTill),
    );
    if (giltiga.length === 0) {
      return { status: 'stopp', skal: 'underlag_saknas', detaljer: `Ingen version av ${regelId} gäller ${datum}`, kandidater: [] };
    }
    const verifierade = giltiga.filter((k) => k.verifieringsstatus === 'verifierad');
    if (verifierade.length === 0) {
      return {
        status: 'stopp',
        skal: 'ej_verifierad',
        detaljer: `${regelId} är inte juridiskt verifierad för ${datum}`,
        kandidater: giltiga.map((k) => structuredClone(k)),
      };
    }
    if (verifierade.length > 1) {
      return {
        status: 'stopp',
        skal: 'kallkonflikt',
        detaljer: `Flera verifierade versioner av ${regelId} gäller ${datum}; juridisk granskning krävs`,
        kandidater: verifierade.map((k) => structuredClone(k)),
      };
    }
    return { status: 'ok', regel: structuredClone(verifierade[0]!) };
  }

  /** Regler vars nästa bevakningsdatum har passerats. */
  forfallnaBevakningar(datum: IsoDatum): Regelkort[] {
    return this.#kort.filter((k) => k.nastaBevakning !== undefined && k.nastaBevakning <= datum).map((k) => structuredClone(k));
  }
}
