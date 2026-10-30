import type { Granskningslogg } from '../audit/granskningslogg.js';
import type { Aktor, Avvikelse, Kallposition } from '../domain/typer.js';

/**
 * Kommunicering, komplettering och svar (krav Ö-15, G-03, P-01, testfall A-10).
 *
 * En fråga per verifierad lucka. Utkast, godkänd fråga och skickad fråga är
 * olika statusar. Inget markeras som skickat utan registrerad expediering.
 * "Uteblivet svar", "oklart svar" och "svar som motsäger originalet" hålls isär.
 */
export type Fragestatus =
  | 'utkast'
  | 'godkand'
  | 'skickad'
  | 'besvarad_lost'
  | 'uteblivet_svar'
  | 'oklart_svar'
  | 'motsager_original';

export interface Kompletteringsfraga {
  id: string;
  avvikelseId: string;
  fragetext: string;
  /** Varför underlaget behövs, i begriplig form. */
  motivering: string;
  underlag: Kallposition[];
  status: Fragestatus;
  svarBedomning?: string;
}

export interface Expediering {
  id: string;
  tid: string;
  mottagare: string;
  mottagarroll: 'stallforetradare' | 'huvudman' | 'annan';
  kanal: 'post' | 'e_post' | 'e_tjanst' | 'annan';
  skickadVersion: string;
  aktorId: string;
}

/**
 * Mallar för frågor till ställföreträdaren. De använder bara avvikelsens neutrala
 * postbeskrivning, aldrig den interna avvikelsetexten med arbetsinstruktioner.
 */
type Mall = (post: string) => { fraga: string; motivering: string };

const FRAGEMALL: Record<string, Mall> = {
  'K-KONTOBALANS': () => ({
    fraga: 'Kan du skicka kontoutdrag för hela perioden för kontot?',
    motivering: 'Vi behöver kunna stämma av kontot från ingående till utgående saldo, och de redovisade beloppen går inte ihop.',
  }),
  'K-UTGAENDE': () => ({
    fraga: 'Kan du skicka ett bankbesked som visar saldot på periodens sista dag?',
    motivering: 'Utgående saldo behöver kunna jämföras med bankens uppgift för samma datum.',
  }),
  'K-INGAENDE': () => ({
    fraga: 'Kan du förklara varför ingående saldo skiljer sig från förra årets utgående saldo?',
    motivering: 'Ingående saldo ska normalt vara detsamma som det utgående saldo som granskades förra året.',
  }),
  'K-INTERN-OVERFORING': (post) => ({
    fraga: `Vart fördes pengarna i ${post}? Skicka gärna kontoutdrag för det mottagande kontot.`,
    motivering: 'Vi hittar ingen motsvarande insättning på något av de redovisade kontona.',
  }),
  'K-DISPOSITION': (post) => ({
    fraga: `Kan du beskriva vad ${post} avsåg och om överförmyndaren har lämnat samtycke?`,
    motivering: 'Vissa åtgärder kräver överförmyndarens samtycke.',
  }),
  'K-KATEGORI': (post) => ({
    fraga: `Kan du förklara vad ${post} avser och skicka kvitto eller annat underlag?`,
    motivering: 'Vi behöver veta vad pengarna har använts till.',
  }),
  'K-PERIOD': (post) => ({
    fraga: `Kan du förklara varför ${post} finns med i redovisningen?`,
    motivering: 'Datumet ligger utanför redovisningsperioden.',
  }),
};

function standardfraga(): { fraga: string; motivering: string } {
  return { fraga: 'Kan du komplettera med underlag för den uppgift handläggaren har markerat?', motivering: 'Uppgiften behövs för att granskningen ska kunna slutföras.' };
}

export class Kompletteringsbegaran {
  readonly #fragor: Kompletteringsfraga[] = [];
  #expediering?: Expediering;

  constructor(
    readonly arendeId: string,
    private readonly logg: Granskningslogg,
    private readonly klocka: () => Date = () => new Date(),
  ) {}

  /** Skapar frågeutkast från öppna avvikelser. Texten är neutral och påstår inga fel. */
  skapaUtkast(avvikelser: readonly Avvikelse[]): Kompletteringsfraga[] {
    for (const a of avvikelser.filter((x) => x.status === 'oppen' || x.status === 'utreds')) {
      if (this.#fragor.some((f) => f.avvikelseId === a.id)) continue;
      const mall = FRAGEMALL[a.kontrollId];
      const { fraga, motivering } = mall ? mall(a.postbeskrivning ?? 'posten') : standardfraga();
      this.#fragor.push({ id: `F-${this.#fragor.length + 1}`, avvikelseId: a.id, fragetext: fraga, motivering, underlag: a.belagg, status: 'utkast' });
    }
    this.logg.registrera({ id: 'system', typ: 'system' }, 'kompletteringsutkast_skapat', this.arendeId, { antal: this.#fragor.length });
    return this.fragor();
  }

  redigera(fragaId: string, aktor: Aktor, fragetext: string, motivering: string): void {
    this.#kraEjSkickad();
    const f = this.#hitta(fragaId);
    f.fragetext = fragetext;
    f.motivering = motivering;
    f.status = 'utkast';
    this.logg.registrera(aktor, 'kompletteringsfraga_redigerad', this.arendeId, { fragaId });
  }

  /** Strykning av en fråga som handläggaren inte vill ställa. */
  stryk(fragaId: string, aktor: Aktor, skal: string): void {
    this.#kraEjSkickad();
    const i = this.#fragor.findIndex((f) => f.id === fragaId);
    if (i < 0) throw new Error(`Okänd fråga ${fragaId}`);
    this.#fragor.splice(i, 1);
    this.logg.registrera(aktor, 'kompletteringsfraga_struken', this.arendeId, { fragaId, skal });
  }

  godkann(fragaId: string, aktor: Aktor): void {
    this.#kraEjSkickad();
    if (aktor.typ !== 'manniska') throw new Error('Endast handläggare får godkänna utskick');
    this.#hitta(fragaId).status = 'godkand';
    this.logg.registrera(aktor, 'kompletteringsfraga_godkand', this.arendeId, { fragaId });
  }

  /** Registrerar faktisk expediering. Först då räknas frågorna som skickade. */
  registreraExpediering(aktor: Aktor, uppgifter: Omit<Expediering, 'id' | 'tid' | 'aktorId' | 'skickadVersion'>): Expediering {
    this.#kraEjSkickad();
    if (aktor.typ !== 'manniska') throw new Error('Expediering registreras av människa');
    if (this.#fragor.length === 0) throw new Error('Det finns inga frågor att skicka');
    const ejGodkanda = this.#fragor.filter((f) => f.status !== 'godkand');
    if (ejGodkanda.length > 0) throw new Error(`Frågor är inte godkända: ${ejGodkanda.map((f) => f.id).join(', ')}`);
    this.#expediering = {
      ...uppgifter,
      id: `EXP-${this.arendeId}-${this.klocka().getTime()}`,
      tid: this.klocka().toISOString(),
      aktorId: aktor.id,
      skickadVersion: this.brevtext(),
    };
    for (const f of this.#fragor) f.status = 'skickad';
    this.logg.registrera(aktor, 'komplettering_expedierad', this.arendeId, { expedieringId: this.#expediering.id, mottagare: uppgifter.mottagare, kanal: uppgifter.kanal });
    return structuredClone(this.#expediering);
  }

  registreraSvar(fragaId: string, aktor: Aktor, utfall: Exclude<Fragestatus, 'utkast' | 'godkand' | 'skickad'>, bedomning: string): void {
    if (!this.#expediering) throw new Error('Svar kan inte registreras på en fråga som inte skickats');
    if (aktor.typ !== 'manniska') throw new Error('Bedömning av svar görs av handläggare');
    if (!bedomning.trim()) throw new Error('Bedömning av svaret krävs');
    const f = this.#hitta(fragaId);
    f.status = utfall;
    f.svarBedomning = bedomning;
    this.logg.registrera(aktor, 'kompletteringssvar_bedomt', this.arendeId, { fragaId, utfall });
  }

  /** Sant först när en expediering har registrerats (A-10). */
  get kommuniceringUtford(): boolean {
    return this.#expediering !== undefined;
  }

  get expediering(): Expediering | undefined {
    return this.#expediering && structuredClone(this.#expediering);
  }

  fragor(): Kompletteringsfraga[] {
    return this.#fragor.map((f) => structuredClone(f));
  }

  brevtext(): string {
    const rader = this.#fragor.map((f, i) => `${i + 1}. ${f.fragetext}\n   Varför vi frågar: ${f.motivering}`);
    return [
      'Begäran om komplettering',
      '',
      'Vi har gått igenom redovisningen och behöver några uppgifter till för att kunna slutföra granskningen.',
      '',
      ...rader,
      '',
      'Du kan svara skriftligt eller kontakta handläggaren om du behöver hjälp.',
    ].join('\n');
  }

  #hitta(id: string): Kompletteringsfraga {
    const f = this.#fragor.find((x) => x.id === id);
    if (!f) throw new Error(`Okänd fråga ${id}`);
    return f;
  }

  #kraEjSkickad(): void {
    if (this.#expediering) throw new Error('Begäran är redan skickad. Ny fråga kräver ny begäran.');
  }
}
