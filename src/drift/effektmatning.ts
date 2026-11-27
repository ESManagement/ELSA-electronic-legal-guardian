/**
 * Effektmätning för pilot (mognadssteg 6: "Pilot med mätt effekt").
 *
 * Underlaget 2026-11-27 kräver verkliga data, en baslinje och en effekt som är
 * mätt och granskad. Mätningen jämför samma mått före ELSA (baslinje) och med
 * ELSA (pilot). Koden räknar bara; effekten märks "verifierad" först när en
 * namngiven granskare, som inte själv registrerat mätpunkterna, har godkänt den.
 * Inga mätpunkter innehåller personuppgifter: ärende-ID är pseudonymt.
 */

export type Matperiod = 'baslinje' | 'pilot';

export interface Matpunkt {
  /** Pseudonymt ärende-ID, aldrig personnummer eller namn. */
  arendeId: string;
  period: Matperiod;
  /** Handläggarens arbetstid för granskningen, i minuter. */
  arbetstidMinuter: number;
  /** Kalenderdagar från inkommen årsräkning till avslutad granskning. */
  ledtidDagar: number;
  /** Begärdes komplettering från ställföreträdaren? */
  komplettering: boolean;
  registreradAv: string;
}

export interface Matt {
  namn: string;
  enhet: string;
  baslinje: number | null;
  pilot: number | null;
  /** Förändring i procent mot baslinjen. Negativ = minskning. */
  forandringProcent: number | null;
}

export type Effektstatus = 'otillrackligt_underlag' | 'matt_ej_granskad' | 'verifierad';

export interface Effektrapport {
  status: Effektstatus;
  antal: Record<Matperiod, number>;
  matt: Matt[];
  skal: string[];
  granskadAv?: string;
}

/** Minsta antal granskningar per period innan någon effekt redovisas. Förslag, ska fastställas med pilotnämnden. */
export const MINSTA_ANTAL_PER_PERIOD = 20;

function median(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const avrunda = (x: number) => Math.round(x * 10) / 10;

function matt(namn: string, enhet: string, b: number | null, p: number | null): Matt {
  return {
    namn,
    enhet,
    baslinje: b === null ? null : avrunda(b),
    pilot: p === null ? null : avrunda(p),
    forandringProcent: b === null || p === null || b === 0 ? null : avrunda(((p - b) / b) * 100),
  };
}

export function beraknaEffekt(
  punkter: readonly Matpunkt[],
  granskning?: { granskare: string; datum: string },
  minstaAntal = MINSTA_ANTAL_PER_PERIOD,
): Effektrapport {
  const skal: string[] = [];
  const ogiltiga = punkter.filter((x) => !(x.arbetstidMinuter >= 0) || !(x.ledtidDagar >= 0) || !x.arendeId.trim());
  if (ogiltiga.length) skal.push(`${ogiltiga.length} mätpunkter saknar ärende-ID eller har negativa värden och räknas inte`);
  const giltiga = punkter.filter((x) => !ogiltiga.includes(x));
  const dubbletter = new Set<string>();
  const sedda = new Set<string>();
  for (const x of giltiga) {
    const nyckel = `${x.period}:${x.arendeId}`;
    if (sedda.has(nyckel)) dubbletter.add(nyckel);
    sedda.add(nyckel);
  }
  if (dubbletter.size) skal.push(`Samma ärende förekommer flera gånger i en period: ${[...dubbletter].join(', ')}`);

  const per = (p: Matperiod) => giltiga.filter((x) => x.period === p);
  const b = per('baslinje');
  const pi = per('pilot');
  const antal = { baslinje: b.length, pilot: pi.length };
  const andel = (xs: Matpunkt[]) => (xs.length ? (xs.filter((x) => x.komplettering).length / xs.length) * 100 : null);

  const resultat: Matt[] = [
    matt('Arbetstid per granskning (median)', 'minuter', median(b.map((x) => x.arbetstidMinuter)), median(pi.map((x) => x.arbetstidMinuter))),
    matt('Ledtid till avslutad granskning (median)', 'dagar', median(b.map((x) => x.ledtidDagar)), median(pi.map((x) => x.ledtidDagar))),
    matt('Andel med komplettering', 'procent', andel(b), andel(pi)),
  ];

  if (antal.baslinje < minstaAntal) skal.push(`Baslinjen har ${antal.baslinje} granskningar, minst ${minstaAntal} krävs`);
  if (antal.pilot < minstaAntal) skal.push(`Piloten har ${antal.pilot} granskningar, minst ${minstaAntal} krävs`);
  if (skal.length) return { status: 'otillrackligt_underlag', antal, matt: resultat, skal };

  if (!granskning?.granskare.trim()) {
    return { status: 'matt_ej_granskad', antal, matt: resultat, skal: ['Effekten är mätt men inte granskad'] };
  }
  const registrerare = new Set(giltiga.map((x) => x.registreradAv));
  if (registrerare.has(granskning.granskare)) {
    return { status: 'matt_ej_granskad', antal, matt: resultat, skal: ['Granskaren har själv registrerat mätpunkter; fyra ögon krävs'] };
  }
  return { status: 'verifierad', antal, matt: resultat, skal: [], granskadAv: granskning.granskare };
}
