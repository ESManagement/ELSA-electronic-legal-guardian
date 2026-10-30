import { createHash } from 'node:crypto';

/**
 * Append-only granskningslogg med hashkedja. En ändring av en tidigare händelse
 * bryter kedjan och upptäcks av `verifieraKedja` (krav S-01: loggar får inte
 * kunna ändras utan spår).
 */
export interface Granskningshandelse {
  lopnummer: number;
  tid: string;
  aktorId: string;
  aktortyp: 'manniska' | 'system' | 'ai';
  handelse: string;
  objektId: string;
  data: Record<string, unknown>;
  foregaendeHash: string;
  hash: string;
}

const START_HASH = '0'.repeat(64);

function beraknaHash(h: Omit<Granskningshandelse, 'hash'>): string {
  const innehall = JSON.stringify([
    h.lopnummer,
    h.tid,
    h.aktorId,
    h.aktortyp,
    h.handelse,
    h.objektId,
    h.data,
    h.foregaendeHash,
  ]);
  return createHash('sha256').update(innehall).digest('hex');
}

export class Granskningslogg {
  readonly #handelser: Granskningshandelse[] = [];

  constructor(private readonly klocka: () => Date = () => new Date()) {}

  registrera(
    aktor: { id: string; typ: 'manniska' | 'system' | 'ai' },
    handelse: string,
    objektId: string,
    data: Record<string, unknown> = {},
  ): Granskningshandelse {
    const foregaende = this.#handelser.at(-1);
    const utan: Omit<Granskningshandelse, 'hash'> = {
      lopnummer: this.#handelser.length + 1,
      tid: this.klocka().toISOString(),
      aktorId: aktor.id,
      aktortyp: aktor.typ,
      handelse,
      objektId,
      data: structuredClone(data),
      foregaendeHash: foregaende?.hash ?? START_HASH,
    };
    const post = Object.freeze({ ...utan, hash: beraknaHash(utan) });
    this.#handelser.push(post);
    return post;
  }

  /** Returnerar kopior så att anroparen inte kan ändra loggen. */
  handelser(objektId?: string): Granskningshandelse[] {
    return this.#handelser
      .filter((h) => objektId === undefined || h.objektId === objektId)
      .map((h) => structuredClone(h));
  }

  /** Används av tester och revision för att verifiera en exporterad logg. */
  static verifieraKedja(handelser: readonly Granskningshandelse[]): { ok: boolean; brottVid?: number } {
    let foregaende = START_HASH;
    for (const h of handelser) {
      const { hash, ...utan } = h;
      if (h.foregaendeHash !== foregaende || beraknaHash(utan) !== hash) {
        return { ok: false, brottVid: h.lopnummer };
      }
      foregaende = hash;
    }
    return { ok: true };
  }
}
