/**
 * Gemensam kundresa: sex faser och 19 metodsteg enligt "Vår kundresa med ELSA"
 * (utvecklingsprompten avsnitt 4). Stegens ursprungliga namn behålls i registret;
 * visningstexten kan anpassas per vertikal. Beroenden modelleras uttryckligen,
 * så steg 15–17 kan pågå parallellt med steg 14.
 *
 * Bärande regler:
 * - Ett steg kan bara startas när dess beroenden är klara eller ej tillämpliga.
 * - Inget steg efter 11 får startas eller avslutas utan kundens uttryckliga
 *   godkännande i steg 11. Återkallas godkännandet spärras steg 12–19 igen.
 * - "Ej tillämpligt" kräver motivering.
 * - AI-förslag hålls isär från beslut. Bara en människa kan göra ett förslag till beslut.
 * - Varje ändring blir en ny version i stegets historik.
 */
import type { VertikalId } from './modulregister.js';

export type FasId = 'forsta' | 'analysera' | 'forankra' | 'forbereda' | 'genomfora' | 'forvalta';

export const FASER: readonly { id: FasId; namn: string; steg: number[] }[] = Object.freeze([
  { id: 'forsta', namn: 'Förstå', steg: [1, 2, 3] },
  { id: 'analysera', namn: 'Analysera', steg: [4, 5, 6, 7] },
  { id: 'forankra', namn: 'Förankra', steg: [8, 9, 10, 11] },
  { id: 'forbereda', namn: 'Förbereda', steg: [12, 13] },
  { id: 'genomfora', namn: 'Genomföra', steg: [14, 15, 16, 17] },
  { id: 'forvalta', namn: 'Förvalta & fira', steg: [18, 19] },
]);

export interface Metodsteg {
  nr: number;
  namn: string;
  beskrivning: string;
  fas: FasId;
  beroenden: number[];
}

const s = (nr: number, namn: string, fas: FasId, beskrivning: string, beroenden: number[] = nr > 1 ? [nr - 1] : []): Metodsteg => ({
  nr,
  namn,
  fas,
  beskrivning,
  beroenden,
});

export const METODSTEG: readonly Metodsteg[] = Object.freeze([
  s(1, 'Lyssna på kunden', 'forsta', 'Fånga problem, behov, vad som inte fungerar, projektägare och önskat resultat.'),
  s(2, 'Samla in all data', 'forsta', 'Relevanta dokument, avtal, fakturor, verksamhetsdata, besiktningar, foto och verifierade systemkopplingar.'),
  s(3, 'Strukturera datan', 'forsta', 'Sammanställ, rensa, koppla ihop och kvalitetssäkra en gemensam faktabas med spårbara källor.'),
  s(4, 'Analysera nuläget', 'analysera', 'Verksamhetens status, ekonomi, risker och förbättringsområden.'),
  s(5, 'Konkretisera målbilden', 'analysera', 'Mål, strategi, ägarkrav och mätbara målnivåer.'),
  s(6, 'Analysera GAP:et', 'analysera', 'Skillnader mellan nuläge och mål, datakvalitet och prioriteringsbehov.'),
  s(7, 'Ta fram förslag på djupet', 'analysera', 'Jämförbara alternativ med underlag, kostnader, nytta, risker och tydliga antaganden.'),
  s(8, 'Diskutera med kunden', 'forankra', 'Presentera nuläge, målbild och GAP för granskning och feedback.'),
  s(9, 'Förbättra efter feedback', 'forankra', 'Versionshantera synpunkter och uppdatera analys och förslag.'),
  s(10, 'Föreslå nästa steg', 'forankra', 'Prioriterad handlingsordning och beslutsunderlag.'),
  s(11, 'Bekräfta med kunden', 'forankra', 'Dokumentera uttryckligt godkännande innan genomförandet går vidare.'),
  s(12, 'Tekniska utredningar och underlag', 'forbereda', 'Detaljerade utredningar, krav och förfrågningsunderlag anpassade till verksamheten.'),
  s(13, 'Planera åtgärderna', 'forbereda', 'Ansvar, ordningsföljd, tidplan, beroenden och hur störningar begränsas.'),
  s(14, 'Upphandla och bygga', 'genomfora', 'Upphandling, avtal, genomförande och löpande kontroll av mål.'),
  s(15, 'Informera anställda och styrelse', 'genomfora', 'Planera och följ information om mål, syfte, strategi och läge.', [13]),
  s(16, 'Förhandlingar och tillstånd', 'genomfora', 'Intressenter, finansiering, prövningar och tillstånd.', [13]),
  s(17, 'Sök bidrag', 'genomfora', 'Relevanta stöd, krav, ansökningsdatum och uppföljning. Inga bidrag eller utfall garanteras.', [13]),
  s(18, 'AI-fiera förvaltningen', 'forvalta', 'Inför godkända automatiseringar successivt, följ upp effekt och behåll mänsklig kontroll.', [14]),
  s(19, 'Fira segrarna', 'forvalta', 'Synliggör verifierade delmål, dokumentera lärdomar och planera fortsatt förbättring.', [18]),
]);

/** Steg 11 är grinden före genomförande. */
export const GODKANNANDESTEG = 11;

/**
 * Vertikalanpassad visningstext. Bara steg där fastighetsbegreppen inte passar
 * byts ut; stegets registernamn är oförändrat.
 */
const VISNINGSTEXT: Partial<Record<VertikalId, Partial<Record<number, string>>>> = {
  kommun: { 14: 'Upphandla och genomföra beslutad förändring', 15: 'Informera medarbetare och nämnd' },
  vard: { 14: 'Införa förändringen i verksamheten', 15: 'Informera medarbetare och ledning' },
  'vatten-kultur': { 14: 'Upphandla och genomföra' },
  finans: { 14: 'Upphandla och införa', 15: 'Informera anställda och styrelse' },
  konsument: { 14: 'Beställa och genomföra', 15: 'Informera hushållet' },
  manniskor: { 14: 'Upphandla och införa' },
};

export function visningsnamn(nr: number, vertikal?: VertikalId): string {
  const steg = METODSTEG.find((x) => x.nr === nr);
  if (!steg) throw new Error(`Okänt metodsteg ${nr}`);
  return (vertikal && VISNINGSTEXT[vertikal]?.[nr]) ?? steg.namn;
}

export type Stegstatus = 'ej_startad' | 'pagar' | 'klar' | 'ej_tillampligt';

export interface Underlag {
  id: string;
  titel: string;
  /** Källa: fil-, system- eller dokumentreferens. Krävs alltid. */
  kalla: string;
  version: number;
  tillagd: string;
  tillagdAv: string;
}

export interface AiForslag {
  id: string;
  text: string;
  skapad: string;
  status: 'forslag' | 'godkant' | 'avvisat';
  hanteradAv?: string;
}

export interface Beslut {
  id: string;
  text: string;
  beslutadAv: string;
  tid: string;
  /** Kundgodkännande i steg 11 är en egen beslutstyp. */
  typ: 'beslut' | 'kundgodkannande';
  /** Ursprung om beslutet bygger på ett AI-förslag. */
  franAiForslag?: string;
  aterkallat?: { av: string; tid: string; skal: string };
}

export interface Regelkontroll {
  id: string;
  krav: string;
  kalla: string;
  kallDatum: string;
  utfall: 'ej_kontrollerad' | 'uppfylld' | 'avvikelse';
  uppfoljning?: { ansvarig: string; senast: string };
}

export interface Stegversion {
  version: number;
  tid: string;
  av: string;
  andring: string;
}

export interface Stegtillstand {
  nr: number;
  status: Stegstatus;
  ansvarig?: string;
  tidsplan?: { start: string; slut: string };
  underlag: Underlag[];
  aiForslag: AiForslag[];
  beslut: Beslut[];
  kommentarer: { av: string; tid: string; text: string }[];
  kontroller: Regelkontroll[];
  nastaAktivitet?: string;
  motivering?: string;
  historik: Stegversion[];
}

export interface Nyckeltal {
  id: string;
  namn: string;
  enhet: string;
  baslinje?: { varde: number; kalla: string; datum: string; overenskommen: boolean };
  mal?: { varde: number; datum: string; riktning: 'hogre_battre' | 'lagre_battre' };
  utfall: { varde: number; datum: string; kalla: string }[];
}

export type Resultat<T = void> = { ok: true; varde: T } | { ok: false; skal: string };
const fel = (skal: string): { ok: false; skal: string } => ({ ok: false, skal });
const ok = <T>(varde: T): { ok: true; varde: T } => ({ ok: true, varde });

export interface Aktorsreferens {
  id: string;
  typ: 'manniska' | 'system' | 'ai';
}

/**
 * En kundresa för ett projekt. Klassen är ren domänlogik; behörighet prövas i
 * plattformstjänsten innan någon metod här anropas.
 */
export class Kundresa {
  readonly steg: Stegtillstand[];
  readonly nyckeltal: Nyckeltal[] = [];
  #lopnr = 0;

  constructor(
    readonly projektId: string,
    readonly vertikal: VertikalId,
    private readonly klocka: () => Date = () => new Date(),
    readonly metodversion = '1.0',
  ) {
    this.steg = METODSTEG.map((m) => ({ nr: m.nr, status: 'ej_startad', underlag: [], aiForslag: [], beslut: [], kommentarer: [], kontroller: [], historik: [] }));
  }

  #id(prefix: string) {
    this.#lopnr += 1;
    return `${prefix}-${this.#lopnr}`;
  }
  #nu() {
    return this.klocka().toISOString();
  }
  #s(nr: number): Stegtillstand {
    const t = this.steg.find((x) => x.nr === nr);
    if (!t) throw new Error(`Okänt metodsteg ${nr}`);
    return t;
  }
  #logga(t: Stegtillstand, av: string, andring: string) {
    t.historik.push({ version: t.historik.length + 1, tid: this.#nu(), av, andring });
  }

  stegtillstand(nr: number): Stegtillstand {
    return structuredClone(this.#s(nr));
  }

  /** Giltigt kundgodkännande i steg 11 (inte återkallat). */
  get godkantForGenomforande(): boolean {
    return this.#s(GODKANNANDESTEG).beslut.some((b) => b.typ === 'kundgodkannande' && !b.aterkallat);
  }

  #avklarat(nr: number) {
    const st = this.#s(nr).status;
    return st === 'klar' || st === 'ej_tillampligt';
  }

  /** Varför ett steg inte kan startas, eller null om det kan. */
  hinderForStart(nr: number): string | null {
    const m = METODSTEG.find((x) => x.nr === nr);
    if (!m) return `Okänt metodsteg ${nr}`;
    const t = this.#s(nr);
    if (t.status !== 'ej_startad') return `Steg ${nr} är redan ${t.status}`;
    const ej = m.beroenden.filter((b) => !this.#avklarat(b));
    if (ej.length) return `Steg ${nr} väntar på steg ${ej.join(', ')}`;
    if (nr > GODKANNANDESTEG && !this.godkantForGenomforande) return `Steg ${nr} kräver kundens godkännande i steg ${GODKANNANDESTEG}`;
    return null;
  }

  /** Steg som kan startas nu. Efter steg 13 är 14, 15, 16 och 17 startbara samtidigt. */
  startbara(): number[] {
    return METODSTEG.filter((m) => this.hinderForStart(m.nr) === null).map((m) => m.nr);
  }

  starta(nr: number, aktor: Aktorsreferens, ansvarig: string, tidsplan?: { start: string; slut: string }): Resultat {
    if (aktor.typ !== 'manniska') return fel('Bara en människa kan starta ett metodsteg');
    if (!ansvarig.trim()) return fel('Ansvarig krävs');
    const hinder = this.hinderForStart(nr);
    if (hinder) return fel(hinder);
    if (tidsplan && tidsplan.slut < tidsplan.start) return fel('Tidsplanens slut ligger före start');
    const t = this.#s(nr);
    t.status = 'pagar';
    t.ansvarig = ansvarig;
    if (tidsplan) t.tidsplan = tidsplan;
    this.#logga(t, aktor.id, `Startat, ansvarig ${ansvarig}`);
    return ok(undefined);
  }

  avsluta(nr: number, aktor: Aktorsreferens): Resultat {
    if (aktor.typ !== 'manniska') return fel('Bara en människa kan avsluta ett metodsteg');
    const t = this.#s(nr);
    if (t.status !== 'pagar') return fel(`Steg ${nr} pågår inte`);
    if (nr === GODKANNANDESTEG && !this.godkantForGenomforande) return fel('Steg 11 kan inte avslutas utan registrerat kundgodkännande');
    if (nr > GODKANNANDESTEG && !this.godkantForGenomforande) return fel(`Steg ${nr} kräver kundens godkännande i steg ${GODKANNANDESTEG}`);
    const oppna = t.kontroller.filter((k) => k.utfall === 'avvikelse' && !k.uppfoljning);
    if (oppna.length) return fel(`Avvikelse utan uppföljning: ${oppna.map((k) => k.krav).join(', ')}`);
    t.status = 'klar';
    this.#logga(t, aktor.id, 'Avslutat');
    return ok(undefined);
  }

  /** "Ej tillämpligt" kräver motivering (minst 10 tecken) och samma beroenden som start. */
  markeraEjTillampligt(nr: number, aktor: Aktorsreferens, motivering: string): Resultat {
    if (aktor.typ !== 'manniska') return fel('Bara en människa kan markera ett steg som ej tillämpligt');
    if (motivering.trim().length < 10) return fel('Ej tillämpligt kräver en motivering');
    if (nr === GODKANNANDESTEG) return fel('Steg 11 kan inte vara ej tillämpligt; genomförande kräver godkännande');
    const t = this.#s(nr);
    if (t.status === 'klar') return fel(`Steg ${nr} är redan klart`);
    if (t.status === 'ej_startad') {
      const hinder = this.hinderForStart(nr);
      if (hinder) return fel(hinder);
    }
    t.status = 'ej_tillampligt';
    t.motivering = motivering.trim();
    this.#logga(t, aktor.id, `Ej tillämpligt: ${t.motivering}`);
    return ok(undefined);
  }

  laggTillUnderlag(nr: number, aktor: Aktorsreferens, titel: string, kalla: string): Resultat<Underlag> {
    if (!kalla.trim()) return fel('Underlag kräver källa');
    const t = this.#s(nr);
    const tidigare = t.underlag.filter((u) => u.titel === titel);
    const u: Underlag = { id: this.#id('UL'), titel, kalla, version: tidigare.length + 1, tillagd: this.#nu(), tillagdAv: aktor.id };
    t.underlag.push(u);
    this.#logga(t, aktor.id, `Underlag "${titel}" version ${u.version} (${kalla})`);
    return ok(u);
  }

  kommentera(nr: number, aktor: Aktorsreferens, text: string): Resultat {
    if (!text.trim()) return fel('Tom kommentar');
    const t = this.#s(nr);
    t.kommentarer.push({ av: aktor.id, tid: this.#nu(), text: text.trim() });
    this.#logga(t, aktor.id, 'Kommentar');
    return ok(undefined);
  }

  sattNastaAktivitet(nr: number, aktor: Aktorsreferens, text: string): Resultat {
    const t = this.#s(nr);
    t.nastaAktivitet = text.trim();
    this.#logga(t, aktor.id, `Nästa aktivitet: ${t.nastaAktivitet}`);
    return ok(undefined);
  }

  /** AI eller system kan bara lämna förslag. */
  foresla(nr: number, aktor: Aktorsreferens, text: string): Resultat<AiForslag> {
    const t = this.#s(nr);
    const f: AiForslag = { id: this.#id('AI'), text, skapad: this.#nu(), status: 'forslag' };
    t.aiForslag.push(f);
    this.#logga(t, aktor.id, `Förslag från ${aktor.typ}: ${text}`);
    return ok(f);
  }

  /** En människa godkänner eller avvisar ett förslag. Godkänt förslag blir ett beslut med spårbart ursprung. */
  hanteraForslag(nr: number, forslagId: string, aktor: Aktorsreferens, godkann: boolean): Resultat<Beslut | null> {
    if (aktor.typ !== 'manniska') return fel('AI får inte godkänna sitt eget eller andras förslag');
    const t = this.#s(nr);
    const f = t.aiForslag.find((x) => x.id === forslagId);
    if (!f) return fel('Okänt förslag');
    if (f.status !== 'forslag') return fel('Förslaget är redan hanterat');
    f.status = godkann ? 'godkant' : 'avvisat';
    f.hanteradAv = aktor.id;
    this.#logga(t, aktor.id, `Förslag ${f.id} ${f.status}`);
    if (!godkann) return ok(null);
    const b: Beslut = { id: this.#id('B'), text: f.text, beslutadAv: aktor.id, tid: this.#nu(), typ: 'beslut', franAiForslag: f.id };
    t.beslut.push(b);
    return ok(b);
  }

  besluta(nr: number, aktor: Aktorsreferens, text: string): Resultat<Beslut> {
    if (aktor.typ !== 'manniska') return fel('Bara en människa kan fatta beslut');
    if (!text.trim()) return fel('Beslut kräver text');
    const t = this.#s(nr);
    const b: Beslut = { id: this.#id('B'), text: text.trim(), beslutadAv: aktor.id, tid: this.#nu(), typ: 'beslut' };
    t.beslut.push(b);
    this.#logga(t, aktor.id, `Beslut: ${b.text}`);
    return ok(b);
  }

  /**
   * Steg 11: kundens uttryckliga godkännande. Kräver att steg 11 pågår och att
   * godkännaren är en människa på kundsidan (prövas av plattformstjänsten).
   */
  registreraKundgodkannande(aktor: Aktorsreferens, text: string): Resultat<Beslut> {
    if (aktor.typ !== 'manniska') return fel('Kundgodkännande kan bara lämnas av en människa');
    const t = this.#s(GODKANNANDESTEG);
    if (t.status !== 'pagar') return fel('Steg 11 måste pågå för att godkännande ska kunna registreras');
    if (text.trim().length < 5) return fel('Godkännandet ska beskriva vad som godkänns');
    const b: Beslut = { id: this.#id('B'), text: text.trim(), beslutadAv: aktor.id, tid: this.#nu(), typ: 'kundgodkannande' };
    t.beslut.push(b);
    this.#logga(t, aktor.id, `Kundgodkännande: ${b.text}`);
    return ok(b);
  }

  /** Återkallat godkännande spärrar steg 12–19 igen och öppnar steg 11. */
  aterkallaKundgodkannande(aktor: Aktorsreferens, skal: string): Resultat {
    if (aktor.typ !== 'manniska') return fel('Bara en människa kan återkalla');
    if (!skal.trim()) return fel('Skäl krävs');
    const t = this.#s(GODKANNANDESTEG);
    const giltiga = t.beslut.filter((b) => b.typ === 'kundgodkannande' && !b.aterkallat);
    if (!giltiga.length) return fel('Inget giltigt godkännande att återkalla');
    for (const b of giltiga) b.aterkallat = { av: aktor.id, tid: this.#nu(), skal: skal.trim() };
    if (t.status === 'klar') t.status = 'pagar';
    this.#logga(t, aktor.id, `Godkännande återkallat: ${skal.trim()}`);
    return ok(undefined);
  }

  /** Regelkontroll kopplad till källa och datum. Avvikelser måste få uppföljning innan steget avslutas. */
  registreraKontroll(nr: number, aktor: Aktorsreferens, k: Omit<Regelkontroll, 'id'>): Resultat<Regelkontroll> {
    if (!k.kalla.trim() || !k.kallDatum) return fel('Regelkontroll kräver källa och källdatum');
    if (k.utfall === 'avvikelse' && k.uppfoljning && (!k.uppfoljning.ansvarig || !k.uppfoljning.senast))
      return fel('Uppföljning kräver ansvarig och datum');
    const t = this.#s(nr);
    const post = { ...k, id: this.#id('K') };
    t.kontroller.push(post);
    this.#logga(t, aktor.id, `Regelkontroll "${k.krav}": ${k.utfall}`);
    return ok(post);
  }

  foljUppAvvikelse(nr: number, kontrollId: string, aktor: Aktorsreferens, ansvarig: string, senast: string): Resultat {
    const t = this.#s(nr);
    const k = t.kontroller.find((x) => x.id === kontrollId);
    if (!k) return fel('Okänd kontroll');
    if (k.utfall !== 'avvikelse') return fel('Bara avvikelser följs upp');
    if (!ansvarig.trim() || !senast) return fel('Uppföljning kräver ansvarig och datum');
    k.uppfoljning = { ansvarig, senast };
    this.#logga(t, aktor.id, `Avvikelse ${k.id} följs upp av ${ansvarig} senast ${senast}`);
    return ok(undefined);
  }

  // Uppföljning: överenskommen baslinje, mål och faktiskt utfall.

  laggTillNyckeltal(n: Omit<Nyckeltal, 'utfall'>): Resultat<Nyckeltal> {
    if (this.nyckeltal.some((x) => x.id === n.id)) return fel('Nyckeltalet finns redan');
    if (!n.enhet.trim()) return fel('Enhet krävs');
    const post: Nyckeltal = { ...n, utfall: [] };
    this.nyckeltal.push(post);
    return ok(post);
  }

  registreraUtfall(id: string, varde: number, datum: string, kalla: string): Resultat {
    const n = this.nyckeltal.find((x) => x.id === id);
    if (!n) return fel('Okänt nyckeltal');
    if (!Number.isFinite(varde)) return fel('Utfall måste vara ett tal');
    if (!kalla.trim()) return fel('Utfall kräver källa');
    n.utfall.push({ varde, datum, kalla });
    n.utfall.sort((a, b) => a.datum.localeCompare(b.datum));
    return ok(undefined);
  }
}

export interface Uppfoljning {
  nyckeltalId: string;
  namn: string;
  enhet: string;
  status: 'saknar_baslinje' | 'baslinje_ej_overenskommen' | 'saknar_mal' | 'saknar_utfall' | 'mal_natt' | 'pa_vag' | 'samre_an_baslinje';
  baslinje?: number;
  mal?: number;
  senasteUtfall?: number;
  /** Andel av vägen från baslinje till mål, 0–1 eller mer. Bara när allt är överenskommet. */
  maluppfyllelse?: number;
}

/** Deterministisk jämförelse. Inga utfall räknas mot en baslinje som inte är överenskommen. */
export function foljUpp(n: Nyckeltal): Uppfoljning {
  const bas = { nyckeltalId: n.id, namn: n.namn, enhet: n.enhet };
  if (!n.baslinje) return { ...bas, status: 'saknar_baslinje' };
  if (!n.baslinje.overenskommen) return { ...bas, status: 'baslinje_ej_overenskommen', baslinje: n.baslinje.varde };
  if (!n.mal) return { ...bas, status: 'saknar_mal', baslinje: n.baslinje.varde };
  const senaste = n.utfall.at(-1);
  if (!senaste) return { ...bas, status: 'saknar_utfall', baslinje: n.baslinje.varde, mal: n.mal.varde };
  const b = n.baslinje.varde;
  const mal = n.mal.varde;
  const u = senaste.varde;
  const riktning = n.mal.riktning === 'hogre_battre' ? 1 : -1;
  const sträcka = (mal - b) * riktning;
  const gjort = (u - b) * riktning;
  const maluppfyllelse = sträcka === 0 ? (gjort >= 0 ? 1 : 0) : Math.round((gjort / sträcka) * 1000) / 1000;
  const status: Uppfoljning['status'] = gjort < 0 ? 'samre_an_baslinje' : maluppfyllelse >= 1 ? 'mal_natt' : 'pa_vag';
  return { ...bas, status, baslinje: b, mal, senasteUtfall: u, maluppfyllelse };
}
