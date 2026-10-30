import type { Granskningslogg } from '../audit/granskningslogg.js';
import type { Aktor, IsoDatum, Uppdrag } from '../domain/typer.js';

/**
 * Årlig behovsgranskning av förvaltarskap (krav Ö-04, Ö-23, testfall A-09).
 *
 * Bevakningen är ett eget arbetsmoment. Den kan inte kvitteras av att en
 * årsräkning har godkänts, utan kräver en daterad bedömning av fortsatt behov
 * och omfattning, nästa åtgärd och aktanteckning.
 */
export interface Behovsbevakning {
  id: string;
  uppdragId: string;
  ar: number;
  forfaller: IsoDatum;
  status: 'aktiv' | 'kvitterad';
  bedomning?: {
    uppdateradeOmstandigheter: string;
    begransningEllerUpphorandeProvat: string;
    handlaggarensBedomning: string;
    nastaAtgard: string;
    aktanteckningId: string;
    aktorId: string;
    tid: string;
  };
}

export class Behovsbevakningar {
  readonly #bevakningar: Behovsbevakning[] = [];

  constructor(
    private readonly logg: Granskningslogg,
    private readonly klocka: () => Date = () => new Date(),
  ) {}

  /** Skapar årets bevakning för varje aktivt förvaltarskap som saknar en. */
  skapaArliga(uppdrag: readonly Uppdrag[], ar: number, forfaller: IsoDatum): Behovsbevakning[] {
    const nya: Behovsbevakning[] = [];
    for (const u of uppdrag) {
      if (u.kategori !== 'forvaltarskap') continue;
      if (u.giltigTill !== undefined && u.giltigTill < `${ar}-01-01`) continue;
      if (this.#bevakningar.some((b) => b.uppdragId === u.id && b.ar === ar)) continue;
      const b: Behovsbevakning = { id: `BB-${u.id}-${ar}`, uppdragId: u.id, ar, forfaller, status: 'aktiv' };
      this.#bevakningar.push(b);
      nya.push(structuredClone(b));
      this.logg.registrera({ id: 'system', typ: 'system' }, 'behovsbevakning_skapad', b.id, { uppdragId: u.id, ar });
    }
    return nya;
  }

  kvittera(id: string, aktor: Aktor, bedomning: Omit<NonNullable<Behovsbevakning['bedomning']>, 'aktorId' | 'tid'>): void {
    if (aktor.typ !== 'manniska') throw new Error('Behovsgranskning görs av handläggare');
    const b = this.#bevakningar.find((x) => x.id === id);
    if (!b) throw new Error(`Okänd bevakning ${id}`);
    if (b.status === 'kvitterad') throw new Error('Bevakningen är redan kvitterad');
    for (const [falt, varde] of Object.entries(bedomning)) {
      if (!varde.trim()) throw new Error(`Behovsgranskningen saknar "${falt}"`);
    }
    b.bedomning = { ...bedomning, aktorId: aktor.id, tid: this.klocka().toISOString() };
    b.status = 'kvitterad';
    this.logg.registrera(aktor, 'behovsbevakning_kvitterad', b.id, { nastaAtgard: bedomning.nastaAtgard });
  }

  aktiva(): Behovsbevakning[] {
    return this.#bevakningar.filter((b) => b.status === 'aktiv').map((b) => structuredClone(b));
  }

  forfallna(datum: IsoDatum): Behovsbevakning[] {
    return this.aktiva().filter((b) => b.forfaller <= datum);
  }
}
