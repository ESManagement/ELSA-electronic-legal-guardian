/**
 * Modell för fullmakter, källanslutningar och skärmbaserad insamling (PM Kundadministration och
 * rapporthantering v0.1, avsnitt 4 och 5). Endast modell och regler: ingen anslutning mot en
 * riktig källa finns, ingen hämtning körs och inget skickas externt. Införandesteg 3 och 6 kräver
 * beslut om grundmodell, en överenskommen källa och separat godkännande av skärmflöden.
 *
 * Bärande regler:
 * - Fullmakt (mandat) och teknisk behörighet hålls isär. Varje hämtning kräver båda.
 * - En fullmakt är aldrig en API-anslutning eller ett obegränsat åtkomsttillstånd.
 * - Anslutningar är läsande. Skrivning tillbaka kräver ett separat beslut och stöds inte.
 * - Schemalagd hämtning kräver ESM:s verifiering och en godkänd provhämtning tillsammans med kunden.
 * - Pausad anslutning eller återkallad/utgången fullmakt stoppar nya hämtningar. Redan hämtade
 *   uppgifter raderas inte här; de hanteras enligt beslutade bevarande- och gallringsregler.
 * - Prioritet: dokumenterat API, sedan strukturerad export eller filimport, sist skärmbaserad insamling.
 * - Ett misslyckat värde är bortfall, aldrig noll.
 */

export interface Datum {
  /** ÅÅÅÅ-MM-DD */
  fran: string;
  till: string;
}

export type Fullmaktsstatus = 'utkast' | 'signerad' | 'aterkallad';

export interface Fullmakt {
  id: string;
  organisationId: string;
  fullmaktsgivare: string;
  behorigUndertecknare: string;
  ombud: string;
  /** Leverantör eller källa som fullmakten avser. */
  kallaId: string;
  bolag: string[];
  objekt: string[];
  uppgiftstyper: string[];
  andamal: string;
  /** Vilken period uppgifterna får avse. */
  uppgiftsperiod: Datum;
  /** Hur länge fullmakten gäller. */
  giltighet: Datum;
  aterkallbar: true;
  status: Fullmaktsstatus;
  /** Dokument-ID för signerad handling i dokumentmottagningen. */
  signeradHandling?: string;
  mottagarkvitto?: string;
  /** Leverantörens fullmaktskrav är verifierade för källan. */
  leverantorskravVerifierade: boolean;
  aterkallad?: { av: string; tid: string };
}

export type Insamlingsmetod = 'api' | 'export' | 'skarm';
export const METODPRIORITET: readonly Insamlingsmetod[] = ['api', 'export', 'skarm'];
export const METODNAMN: Record<Insamlingsmetod, string> = { api: 'Dokumenterat API', export: 'Strukturerad export eller filimport', skarm: 'Skärmbaserad insamling' };

export interface Anslutning {
  id: string;
  organisationId: string;
  kallaId: string;
  metod: Insamlingsmetod;
  bolag: string[];
  objekt: string[];
  uppgiftstyper: string[];
  rattighet: 'lasande';
  ansvarig: string;
  /** Behörig person hos kunden som godkänt åtkomsten. */
  godkandAvKund?: { av: string; tid: string };
  verifieradAvEsm?: { av: string; tid: string };
  provhamtning?: { tid: string; utfall: 'godkand' | 'underkand'; tillsammansMed: string; kommentar: string };
  tekniskBehorighet: 'saknas' | 'giltig' | 'utgangen';
  /** Autentiseringsuppgifter hålls i en skyddad nyckelhantering, aldrig i registret. */
  hemlighetsreferens?: string;
  schema?: { intervall: 'dag' | 'vecka' | 'manad'; aktivt: boolean };
  pausad: boolean;
  senasteLyckade?: string;
  fel: { tid: string; text: string }[];
}

export interface Hamtningsbegaran {
  anslutningId: string;
  bolag: string;
  objekt: string;
  uppgiftstyp: string;
  /** Den period uppgifterna avser. */
  period: Datum;
  datum: string;
  schemalagd: boolean;
}

export type Hamtningsbeslut = { tillats: true; fullmaktId: string } | { tillats: false; skal: string[] };

const inom = (d: string, p: Datum) => d >= p.fran && d <= p.till;
const tacker = (yttre: Datum, inre: Datum) => inre.fran >= yttre.fran && inre.till <= yttre.till;

/** Fullmaktens giltighetsläge ett visst datum. */
export function fullmaktslage(f: Fullmakt, datum: string): 'giltig' | 'utkast' | 'aterkallad' | 'ej_borjat' | 'utgangen' | 'saknar_handling' {
  if (f.status === 'aterkallad') return 'aterkallad';
  if (f.status === 'utkast') return 'utkast';
  if (!f.signeradHandling) return 'saknar_handling';
  if (datum < f.giltighet.fran) return 'ej_borjat';
  if (datum > f.giltighet.till) return 'utgangen';
  return 'giltig';
}

/**
 * Prövar en hämtning. Kräver både giltigt mandat som täcker bolag, objekt, uppgiftstyp och period,
 * och en fungerande teknisk behörighet. Alla skäl redovisas, inte bara det första.
 */
export function provaHamtning(begaran: Hamtningsbegaran, anslutningar: readonly Anslutning[], fullmakter: readonly Fullmakt[]): Hamtningsbeslut {
  const a = anslutningar.find((x) => x.id === begaran.anslutningId);
  if (!a) return { tillats: false, skal: ['Okänd anslutning'] };
  const skal: string[] = [];
  // Teknisk behörighet
  if (a.tekniskBehorighet !== 'giltig') skal.push(`Teknisk behörighet: ${a.tekniskBehorighet === 'saknas' ? 'saknas' : 'utgången'}`);
  if (!a.godkandAvKund) skal.push('Kundens behöriga person har inte godkänt anslutningen');
  if (!a.verifieradAvEsm) skal.push('ESM har inte verifierat anslutningen');
  if (a.pausad) skal.push('Hämtningen är pausad av kunden');
  if (begaran.schemalagd && a.provhamtning?.utfall !== 'godkand') skal.push('Schemalagd hämtning kräver godkänd provhämtning tillsammans med kunden');
  if (begaran.schemalagd && !a.schema?.aktivt) skal.push('Schemat är inte aktiverat');
  if (a.metod === 'skarm') skal.push('Skärmbaserad insamling är inte godkänd för införande (kräver separat beslut och test)');
  if (!a.bolag.includes(begaran.bolag) || !a.objekt.includes(begaran.objekt) || !a.uppgiftstyper.includes(begaran.uppgiftstyp)) skal.push('Begäran ligger utanför anslutningens omfattning');
  // Mandat
  const kandidater = fullmakter.filter((f) => f.organisationId === a.organisationId && f.kallaId === a.kallaId);
  const giltig = kandidater.find(
    (f) =>
      fullmaktslage(f, begaran.datum) === 'giltig' &&
      f.leverantorskravVerifierade &&
      f.bolag.includes(begaran.bolag) &&
      f.objekt.includes(begaran.objekt) &&
      f.uppgiftstyper.includes(begaran.uppgiftstyp) &&
      tacker(f.uppgiftsperiod, begaran.period),
  );
  if (!giltig) {
    if (!kandidater.length) skal.push('Ingen fullmakt finns för källan');
    else {
      const lagen = [...new Set(kandidater.map((f) => fullmaktslage(f, begaran.datum)))];
      if (!lagen.includes('giltig')) skal.push(`Fullmakten är inte giltig (${lagen.join(', ')})`);
      else if (!kandidater.some((f) => f.leverantorskravVerifierade)) skal.push('Leverantörens fullmaktskrav är inte verifierade');
      else skal.push('Fullmakten täcker inte bolag, objekt, uppgiftstyp eller period');
    }
  }
  return skal.length ? { tillats: false, skal } : { tillats: true, fullmaktId: giltig!.id };
}

/** Återkallar en fullmakt. Stoppar nya och framtida hämtningar. Inga hämtade data raderas. */
export function aterkallaFullmakt(f: Fullmakt, av: string, tid: string): Fullmakt {
  return { ...f, status: 'aterkallad', aterkallad: { av, tid } };
}

/** Fullmakter som går ut inom `dagar` dagar, med de anslutningar som berörs. */
export function bevakaUtgang(fullmakter: readonly Fullmakt[], anslutningar: readonly Anslutning[], datum: string, dagar: number): { fullmakt: Fullmakt; gar_ut: string; anslutningar: string[] }[] {
  const grans = new Date(Date.parse(`${datum}T00:00:00Z`) + dagar * 86_400_000).toISOString().slice(0, 10);
  return fullmakter
    .filter((f) => fullmaktslage(f, datum) === 'giltig' && f.giltighet.till <= grans)
    .map((f) => ({ fullmakt: f, gar_ut: f.giltighet.till, anslutningar: anslutningar.filter((a) => a.organisationId === f.organisationId && a.kallaId === f.kallaId).map((a) => a.id) }));
}

/** Väljer insamlingsväg enligt beslutad prioritet. */
export function valjInsamlingsvag(tillgangliga: readonly Insamlingsmetod[]): Insamlingsmetod | null {
  return METODPRIORITET.find((m) => tillgangliga.includes(m)) ?? null;
}

// ---------------------------------------------------------------- Skärmbaserad insamling

export interface Skarmflode {
  id: string;
  organisationId: string;
  kallaId: string;
  andamal: string;
  godkandaVyer: { id: string; layoutavtryck: string }[];
  tillatnaFalt: string[];
  intervall: 'dag' | 'vecka' | 'manad';
  ansvarig: string;
  /** Kontrollplan för avstämning, beslutad i förväg. */
  kontrollplan: { typ: 'totalsumma' | 'stickprov'; beskrivning: string } | null;
  mandatVerifierat: boolean;
  leverantorsvillkorVerifierade: boolean;
  /** Separat godkännande för införande (steg 6). Saknas i denna version. */
  godkantForInforande: boolean;
}

export interface Skarmobservation {
  vyId: string;
  layoutavtryck: string;
  oforvantadInloggningsruta: boolean;
  listanKomplett: boolean;
  antalRader: number;
  forvantatAntal: { min: number; max: number };
  falt: { namn: string; varde: string | null }[];
}

export type Skarmutfall =
  | { utfall: 'fortsatt'; poster: { falt: string; varde: string | null; bortfall: boolean }[] }
  | { utfall: 'stoppa' | 'manuell_kontroll'; skal: string[] };

/** Förutsättningar innan ett skärmflöde får köras alls. */
export function kanKoraSkarmflode(f: Skarmflode): { ok: boolean; skal: string[] } {
  const skal: string[] = [];
  if (!f.godkantForInforande) skal.push('Skärmbaserad insamling är inte godkänd för införande');
  if (!f.mandatVerifierat) skal.push('Kundens mandat är inte verifierat av ESM');
  if (!f.leverantorsvillkorVerifierade) skal.push('Leverantörens villkor är inte verifierade');
  if (!f.kontrollplan) skal.push('Kontrollplan för avstämning saknas');
  if (!f.godkandaVyer.length) skal.push('Inga godkända vyer');
  return { ok: !skal.length, skal };
}

/**
 * Utvärderar en observation. Ändrad layout, oväntad inloggningsruta och okänd vy stoppar körningen.
 * Ofullständig lista och avvikande datamängd går till manuell kontroll. Fält som inte är tillåtna
 * kasseras. Saknade värden blir bortfall, aldrig noll.
 */
export function utvarderaSkarmobservation(f: Skarmflode, o: Skarmobservation): Skarmutfall {
  const vy = f.godkandaVyer.find((v) => v.id === o.vyId);
  const stopp: string[] = [];
  if (!vy) stopp.push('Vyn är inte godkänd');
  else if (vy.layoutavtryck !== o.layoutavtryck) stopp.push('Sidlayouten har ändrats');
  if (o.oforvantadInloggningsruta) stopp.push('Oväntad inloggningsruta. Inloggning eller flerfaktorsautentisering får inte kringgås.');
  if (stopp.length) return { utfall: 'stoppa', skal: stopp };
  const manuell: string[] = [];
  if (!o.listanKomplett) manuell.push('Listan är ofullständig');
  if (o.antalRader < o.forvantatAntal.min || o.antalRader > o.forvantatAntal.max) manuell.push(`Avvikande datamängd: ${o.antalRader} rader, förväntat ${o.forvantatAntal.min}–${o.forvantatAntal.max}`);
  if (manuell.length) return { utfall: 'manuell_kontroll', skal: manuell };
  return {
    utfall: 'fortsatt',
    poster: o.falt.filter((x) => f.tillatnaFalt.includes(x.namn)).map((x) => ({ falt: x.namn, varde: x.varde === null || x.varde.trim() === '' ? null : x.varde, bortfall: x.varde === null || x.varde.trim() === '' })),
  };
}
