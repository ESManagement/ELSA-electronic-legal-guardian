/**
 * Säker dokumentmottagning (PM Kundadministration och rapporthantering v0.1, avsnitt 3 och
 * införandesteg 2). Filval och dra-och-släpp går genom samma metod `taEmot`, samma kontroller
 * och ger en kvittens per fil. Ett fel i en fil påverkar inte de andra.
 *
 * Bärande regler:
 * - Åtkomst prövas i varje anrop mot plattformens uppdrag (projekt), aldrig mot inskickad text.
 *   Okänt och otillåtet dokument ger samma svar, så att andra kunders dokument-id inte avslöjas.
 * - Originalet bevaras oförändrat. Ingen metod skriver över eller raderar ett original.
 * - Dubblettkontroll sker per kund på innehållets SHA-256. Samma fil vid omförsök ger samma
 *   dokument-ID och skapar inget nytt underlag. Kontrollen avslöjar aldrig om en annan kund har filen.
 * - ELSA:s förslag på dokumenttyp är ett förslag tills kunden bekräftat det.
 * - Skanning mot skadlig kod görs av en utbytbar skanner. Utan ansluten skanner kan dokumentet
 *   inte godkännas för analys.
 *
 * Lagring är i minnet. Originalarkivet (föreslaget: kundavskilt i SharePoint) är inte anslutet.
 */
import { createHash } from 'node:crypto';
import type { Granskningslogg } from '../audit/granskningslogg.js';
import type { Session } from './atkomst.js';
import type { Resultat } from './metod.js';
import type { Plattform } from './plattform.js';

export type Dokumentstatus =
  | 'mottagen'
  | 'kontrolleras'
  | 'behover_kompletteras'
  | 'granskas'
  | 'godkand_for_analys'
  | 'ersatt';

export const DOKUMENTSTATUSNAMN: Record<Dokumentstatus, string> = {
  mottagen: 'Mottagen',
  kontrolleras: 'Kontrolleras',
  behover_kompletteras: 'Behöver kompletteras',
  granskas: 'Granskas',
  godkand_for_analys: 'Godkänd för analys',
  ersatt: 'Ersatt av ny version',
};

export type Inlamningsvag = 'filval' | 'dra_och_slapp' | 'massuppladdning';
export type Informationsklass = 'oppen' | 'intern' | 'konfidentiell' | 'skyddad';
export type Objekttyp = 'bolag' | 'fastighet' | 'byggnad' | 'projekt' | 'arende' | 'avtal';

export interface Objektreferens {
  typ: Objekttyp;
  id: string;
}

/** Stöd per filtyp. Möjligheten att lagra en fil anges separat från stöd för innehållsextraktion. */
export interface Filtypsregel {
  filandelse: string;
  namn: string;
  mime: string[];
  stod: 'extraktion' | 'endast_lagring';
}

/** Tänkta indataformat enligt pilotunderlaget. DWG och IFC lagras men extraheras inte. */
export const FILTYPER: readonly Filtypsregel[] = [
  { filandelse: 'pdf', namn: 'PDF', mime: ['application/pdf'], stod: 'extraktion' },
  { filandelse: 'docx', namn: 'Word', mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], stod: 'extraktion' },
  { filandelse: 'xlsx', namn: 'Excel', mime: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], stod: 'extraktion' },
  { filandelse: 'pptx', namn: 'PowerPoint', mime: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], stod: 'extraktion' },
  { filandelse: 'csv', namn: 'CSV', mime: ['text/csv', 'application/vnd.ms-excel'], stod: 'extraktion' },
  { filandelse: 'txt', namn: 'Text', mime: ['text/plain'], stod: 'extraktion' },
  { filandelse: 'xml', namn: 'XML', mime: ['application/xml', 'text/xml'], stod: 'extraktion' },
  { filandelse: 'json', namn: 'JSON', mime: ['application/json'], stod: 'extraktion' },
  { filandelse: 'png', namn: 'PNG-bild', mime: ['image/png'], stod: 'extraktion' },
  { filandelse: 'jpg', namn: 'JPEG-bild', mime: ['image/jpeg'], stod: 'extraktion' },
  { filandelse: 'jpeg', namn: 'JPEG-bild', mime: ['image/jpeg'], stod: 'extraktion' },
  { filandelse: 'tif', namn: 'TIFF-bild', mime: ['image/tiff'], stod: 'extraktion' },
  { filandelse: 'tiff', namn: 'TIFF-bild', mime: ['image/tiff'], stod: 'extraktion' },
  { filandelse: 'dwg', namn: 'DWG-ritning', mime: ['image/vnd.dwg', 'application/acad', 'application/octet-stream'], stod: 'endast_lagring' },
  { filandelse: 'ifc', namn: 'IFC-modell', mime: ['application/x-step', 'model/ifc', 'application/octet-stream'], stod: 'endast_lagring' },
];

export interface Mottagningsparametrar {
  /** Största tillåtna filstorlek i byte. Gränsen är inte beslutad; standardvärdet är ett förslag. */
  maxStorlekByte: number;
  maxStorlekStatus: 'forslag' | 'beslutad';
  /** Största antal filer per inlämning. */
  maxFilerPerInlamning: number;
}

export const STANDARDMOTTAGNING: Mottagningsparametrar = {
  maxStorlekByte: 100 * 1024 * 1024,
  maxStorlekStatus: 'forslag',
  maxFilerPerInlamning: 200,
};

export type Skanningsutfall = 'ren' | 'skadlig' | 'ej_utford';

/** Utbytbar skanner mot skadlig kod. Den riktiga tjänsten är inte vald eller ansluten. */
export interface Skanner {
  namn: string;
  /** true bara för en verklig, driftsatt skanningstjänst. */
  produktion: boolean;
  skanna(innehall: Uint8Array): Skanningsutfall;
}

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

/**
 * Demoskanner som bara känner igen EICAR-teststrängen. Den används för att visa flödet och är
 * ingen verklig skanning. Dokument som skannats med den kan inte godkännas för analys i drift.
 */
export const DEMOSKANNER: Skanner = {
  namn: 'Demoskanner (känner bara igen EICAR-teststrängen)',
  produktion: false,
  skanna(innehall) {
    const text = new TextDecoder('latin1').decode(innehall.slice(0, 4096));
    return text.includes(EICAR) ? 'skadlig' : 'ren';
  },
};

/** Ingen skanner ansluten: alla filer stannar i "kontrolleras". */
export const INGEN_SKANNER: Skanner = { namn: 'Ingen skanner ansluten', produktion: false, skanna: () => 'ej_utford' };

export interface Filinlamning {
  filnamn: string;
  mime: string;
  innehall: Uint8Array;
  /** Dokument-ID som den här filen ersätter (versionsbyte). */
  ersatter?: string;
  /** Uppgifter som gäller just den här filen och går före de gemensamma. */
  metadata?: Partial<Dokumentmetadata>;
}

export interface Dokumentmetadata {
  dokumenttyp: string;
  /** Period som ÅÅÅÅ, ÅÅÅÅ-MM eller ÅÅÅÅ-MM-DD–ÅÅÅÅ-MM-DD. */
  period: string;
  informationsklass: Informationsklass;
  objekt: Objektreferens[];
}

export interface Mottagningskontext {
  organisationId: string;
  /** Uppdraget (projektet) som underlaget lämnas till. Styr behörigheten. */
  uppdragId: string;
  vag: Inlamningsvag;
  /** Gemensamma uppgifter för alla filer i inlämningen. */
  gemensamt?: Partial<Dokumentmetadata>;
}

export interface Filkontroll {
  kontroll: 'filtyp' | 'storlek' | 'lasbarhet' | 'skadlig_kod' | 'dubblett' | 'versionsbyte';
  utfall: 'godkand' | 'avvisad' | 'varning' | 'ej_utford';
  detalj: string;
}

export interface Forslag<T> {
  varde: T;
  kalla: string;
  sakerhet: 'lag' | 'medel' | 'hog';
  bekraftad: boolean;
}

export interface Dokument {
  dokumentId: string;
  /** Stabil identitet för alla versioner av samma handling. */
  handlingsId: string;
  version: number;
  ersatter?: string;
  ersattAv?: string;
  organisationId: string;
  uppdragId: string;
  filnamn: string;
  mime: string;
  storlekByte: number;
  kontrollsumma: string;
  stod: Filtypsregel['stod'];
  status: Dokumentstatus;
  metadata: Partial<Dokumentmetadata>;
  forslag: { dokumenttyp?: Forslag<string>; period?: Forslag<string> };
  kalla: { typ: 'uppladdning'; vag: Inlamningsvag; inlamnadAv: string; tid: string };
  skanning: { skanner: string; produktion: boolean; utfall: Skanningsutfall };
  kontroller: Filkontroll[];
  saknas: string[];
  historik: { tid: string; aktor: string; handelse: string; status: Dokumentstatus; kommentar?: string }[];
}

export interface Kvittens {
  filnamn: string;
  utfall: 'mottagen' | 'dubblett' | 'avvisad';
  dokumentId?: string;
  status?: Dokumentstatus;
  kontrollsumma?: string;
  kontroller: Filkontroll[];
  meddelande: string;
}

export type Kallandringslyssnare = (h: { organisationId: string; tidigareDokumentId: string; nyttDokumentId: string; handlingsId: string }) => void;

const OBLIGATORISKA: (keyof Dokumentmetadata)[] = ['dokumenttyp', 'period', 'informationsklass', 'objekt'];
const FALTNAMN: Record<keyof Dokumentmetadata, string> = { dokumenttyp: 'Dokumenttyp', period: 'Period', informationsklass: 'Informationsklass', objekt: 'Objektkoppling' };
const NEUTRALT = 'Dokumentet finns inte eller du saknar behörighet';

const fel = (skal: string): { ok: false; skal: string } => ({ ok: false, skal });
const ok = <T>(varde: T): { ok: true; varde: T } => ({ ok: true, varde });

export function sha256(innehall: Uint8Array): string {
  return createHash('sha256').update(innehall).digest('hex');
}

export function filandelse(filnamn: string): string {
  const i = filnamn.lastIndexOf('.');
  return i < 0 ? '' : filnamn.slice(i + 1).toLowerCase();
}

/** Ordlista för förslag på dokumenttyp utifrån filnamnet. Förslaget ska alltid bekräftas. */
const TYPORD: [RegExp, string][] = [
  [/faktura|invoice/i, 'Faktura'],
  [/avtal|kontrakt/i, 'Avtal'],
  [/energidekl/i, 'Energideklaration'],
  [/(förbruk|forbruk|mätar|matar|energi|el-?data)/i, 'Förbrukningsdata'],
  [/ritning|plan-?ritning|\.dwg$/i, 'Ritning'],
  [/årsredov|arsredov|bokslut/i, 'Årsredovisning'],
  [/protokoll/i, 'Protokoll'],
  [/besiktning|ovk|kontroll/i, 'Besiktnings- eller kontrollprotokoll'],
  [/budget/i, 'Budget'],
];

export function foreslaDokumenttyp(filnamn: string): Forslag<string> | undefined {
  for (const [m, typ] of TYPORD) if (m.test(filnamn)) return { varde: typ, kalla: 'filnamn', sakerhet: 'lag', bekraftad: false };
  const regel = FILTYPER.find((f) => f.filandelse === filandelse(filnamn));
  if (regel?.filandelse === 'ifc') return { varde: 'Byggnadsmodell', kalla: 'filtyp', sakerhet: 'medel', bekraftad: false };
  return undefined;
}

export function foreslaPeriod(filnamn: string): Forslag<string> | undefined {
  const manad = filnamn.match(/(20\d{2})[-_ ]?(0[1-9]|1[0-2])(?!\d)/);
  if (manad) return { varde: `${manad[1]}-${manad[2]}`, kalla: 'filnamn', sakerhet: 'lag', bekraftad: false };
  const ar = filnamn.match(/(?<!\d)(20\d{2})(?!\d)/);
  if (ar) return { varde: ar[1]!, kalla: 'filnamn', sakerhet: 'lag', bekraftad: false };
  return undefined;
}

function lasbar(innehall: Uint8Array, regel: Filtypsregel): { ok: boolean; detalj: string } {
  if (innehall.length === 0) return { ok: false, detalj: 'Filen är tom' };
  const b = innehall;
  const borjar = (...x: number[]) => x.every((v, i) => b[i] === v);
  switch (regel.filandelse) {
    case 'pdf':
      return borjar(0x25, 0x50, 0x44, 0x46) ? { ok: true, detalj: 'PDF-huvud finns' } : { ok: false, detalj: 'Filen saknar PDF-huvud och verkar inte vara en PDF' };
    case 'docx':
    case 'xlsx':
    case 'pptx':
      return borjar(0x50, 0x4b) ? { ok: true, detalj: 'Office-paket (zip) känns igen' } : { ok: false, detalj: 'Filen är inte ett Office-paket' };
    case 'png':
      return borjar(0x89, 0x50, 0x4e, 0x47) ? { ok: true, detalj: 'PNG-huvud finns' } : { ok: false, detalj: 'Filen saknar PNG-huvud' };
    case 'jpg':
    case 'jpeg':
      return borjar(0xff, 0xd8) ? { ok: true, detalj: 'JPEG-huvud finns' } : { ok: false, detalj: 'Filen saknar JPEG-huvud' };
    case 'csv':
    case 'txt':
    case 'xml':
    case 'json': {
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(b);
        if (regel.filandelse === 'json') JSON.parse(text);
        return { ok: true, detalj: 'Texten kan läsas som UTF-8' };
      } catch {
        return { ok: false, detalj: regel.filandelse === 'json' ? 'Filen är inte giltig JSON i UTF-8' : 'Texten kan inte läsas som UTF-8' };
      }
    }
    default:
      return { ok: true, detalj: 'Innehållet lagras; läsbarheten prövas vid särskild hantering' };
  }
}

export class Dokumentmottagning {
  #dok: Dokument[] = [];
  #original = new Map<string, Uint8Array>();
  #lopnr = 0;
  #lyssnare: Kallandringslyssnare[] = [];

  constructor(
    private readonly plattform: Plattform,
    private readonly skanner: Skanner = INGEN_SKANNER,
    private readonly parametrar: Mottagningsparametrar = STANDARDMOTTAGNING,
    private readonly klocka: () => Date = () => new Date(),
  ) {}

  get logg(): Granskningslogg {
    return this.plattform.logg;
  }

  get skannerinfo() {
    return { namn: this.skanner.namn, produktion: this.skanner.produktion };
  }

  /** Anmäl intresse för versionsbyten, t.ex. rapportregistret som ska varna för inaktualitet. */
  vidKallandring(fn: Kallandringslyssnare) {
    this.#lyssnare.push(fn);
  }

  #nyttId() {
    this.#lopnr += 1;
    return `DOK-${String(this.#lopnr).padStart(6, '0')}`;
  }

  /**
   * Tar emot en eller flera filer. Filval, dra-och-släpp och massuppladdning går hit.
   * Returnerar en kvittens per fil i samma ordning som filerna.
   */
  taEmot(session: Session | null, kontext: Mottagningskontext, filer: readonly Filinlamning[]): Resultat<Kvittens[]> {
    const u = this.plattform.provaUppdrag(session, kontext.uppdragId, 'andra');
    if (!u.ok) return u;
    if (u.varde.organisationId !== kontext.organisationId) return fel('Uppdraget finns inte eller du saknar behörighet');
    if (!filer.length) return fel('Välj minst en fil');
    if (filer.length > this.parametrar.maxFilerPerInlamning) return fel(`Högst ${this.parametrar.maxFilerPerInlamning} filer per inlämning`);
    const kvittenser = filer.map((f) => this.#taEmotFil(session!, kontext, f));
    this.logg.registrera({ id: session!.anvandarId, typ: 'manniska' }, 'dokument_inlamning', kontext.uppdragId, {
      organisationId: kontext.organisationId,
      vag: kontext.vag,
      antal: filer.length,
      mottagna: kvittenser.filter((k) => k.utfall === 'mottagen').length,
      dubbletter: kvittenser.filter((k) => k.utfall === 'dubblett').length,
      avvisade: kvittenser.filter((k) => k.utfall === 'avvisad').length,
    });
    return ok(kvittenser);
  }

  #taEmotFil(session: Session, kontext: Mottagningskontext, fil: Filinlamning): Kvittens {
    const kontroller: Filkontroll[] = [];
    const avvisa = (meddelande: string): Kvittens => ({ filnamn: fil.filnamn, utfall: 'avvisad', kontroller, meddelande });
    const andelse = filandelse(fil.filnamn);
    const regel = FILTYPER.find((r) => r.filandelse === andelse);
    if (!regel) {
      kontroller.push({ kontroll: 'filtyp', utfall: 'avvisad', detalj: andelse ? `Filtypen .${andelse} är inte tillåten` : 'Filen saknar filändelse' });
      return avvisa('Filtypen är inte tillåten. Inget har sparats för den här filen.');
    }
    if (fil.mime && !regel.mime.includes(fil.mime))
      kontroller.push({ kontroll: 'filtyp', utfall: 'varning', detalj: `${regel.namn}, men webbläsaren angav ${fil.mime}. Innehållet prövas nedan.` });
    else kontroller.push({ kontroll: 'filtyp', utfall: 'godkand', detalj: `${regel.namn}${regel.stod === 'endast_lagring' ? ' – lagras, innehållet extraheras inte utan särskild hantering' : ''}` });
    if (fil.innehall.length > this.parametrar.maxStorlekByte) {
      kontroller.push({ kontroll: 'storlek', utfall: 'avvisad', detalj: `${fil.innehall.length} byte överstiger gränsen ${this.parametrar.maxStorlekByte} byte` });
      return avvisa('Filen är för stor. Inget har sparats för den här filen.');
    }
    kontroller.push({ kontroll: 'storlek', utfall: 'godkand', detalj: `${fil.innehall.length} byte` });
    const las = lasbar(fil.innehall, regel);
    if (!las.ok) {
      kontroller.push({ kontroll: 'lasbarhet', utfall: 'avvisad', detalj: las.detalj });
      return avvisa(`Filen kan inte läsas: ${las.detalj}.`);
    }
    kontroller.push({ kontroll: 'lasbarhet', utfall: 'godkand', detalj: las.detalj });
    const skanning = this.skanner.skanna(fil.innehall);
    if (skanning === 'skadlig') {
      kontroller.push({ kontroll: 'skadlig_kod', utfall: 'avvisad', detalj: `${this.skanner.namn}: skadlig kod hittad` });
      this.logg.registrera({ id: 'dokumentmottagning', typ: 'system' }, 'dokument_skadlig_kod', kontext.uppdragId, { organisationId: kontext.organisationId, filnamn: fil.filnamn });
      return avvisa('Filen stoppades vid kontroll av skadlig kod. Inget har sparats.');
    }
    kontroller.push({
      kontroll: 'skadlig_kod',
      utfall: skanning === 'ren' ? 'godkand' : 'ej_utford',
      detalj: skanning === 'ren' ? `${this.skanner.namn}: inget hittat` : 'Ingen skanner är ansluten. Dokumentet kan inte godkännas för analys förrän det skannats.',
    });

    const kontrollsumma = sha256(fil.innehall);
    // Dubblettkontroll inom kunden. En annan kunds identiska fil påverkar aldrig utfallet.
    const dubblett = this.#dok.find((d) => d.organisationId === kontext.organisationId && d.kontrollsumma === kontrollsumma);
    if (dubblett) {
      kontroller.push({ kontroll: 'dubblett', utfall: 'varning', detalj: `Samma innehåll finns redan som ${dubblett.dokumentId}` });
      return { filnamn: fil.filnamn, utfall: 'dubblett', dokumentId: dubblett.dokumentId, status: dubblett.status, kontrollsumma, kontroller, meddelande: `Filen finns redan som ${dubblett.dokumentId}. Inget nytt underlag har skapats.` };
    }
    kontroller.push({ kontroll: 'dubblett', utfall: 'godkand', detalj: 'Ingen dubblett hos kunden' });

    let foregaende: Dokument | undefined;
    if (fil.ersatter) {
      foregaende = this.#dok.find((d) => d.dokumentId === fil.ersatter && d.organisationId === kontext.organisationId && d.uppdragId === kontext.uppdragId);
      if (!foregaende) {
        kontroller.push({ kontroll: 'versionsbyte', utfall: 'avvisad', detalj: 'Dokumentet som ska ersättas finns inte i uppdraget' });
        return avvisa('Dokumentet som ska ersättas finns inte i uppdraget eller du saknar behörighet.');
      }
      if (foregaende.status === 'ersatt') {
        kontroller.push({ kontroll: 'versionsbyte', utfall: 'avvisad', detalj: `${foregaende.dokumentId} är redan ersatt av ${foregaende.ersattAv}` });
        return avvisa(`${foregaende.dokumentId} är redan ersatt. Ersätt den gällande versionen ${foregaende.ersattAv}.`);
      }
      kontroller.push({ kontroll: 'versionsbyte', utfall: 'godkand', detalj: `Ersätter ${foregaende.dokumentId} (version ${foregaende.version})` });
    }

    const tid = this.klocka().toISOString();
    const dokumentId = this.#nyttId();
    const metadata: Partial<Dokumentmetadata> = { ...(foregaende?.metadata ?? {}), ...(kontext.gemensamt ?? {}), ...(fil.metadata ?? {}) };
    const forslag: Dokument['forslag'] = {};
    if (!metadata.dokumenttyp) {
      const f = foreslaDokumenttyp(fil.filnamn);
      if (f) forslag.dokumenttyp = f;
    }
    if (!metadata.period) {
      const f = foreslaPeriod(fil.filnamn);
      if (f) forslag.period = f;
    }
    const d: Dokument = {
      dokumentId,
      handlingsId: foregaende?.handlingsId ?? `HND-${dokumentId.slice(4)}`,
      version: (foregaende?.version ?? 0) + 1,
      ...(foregaende ? { ersatter: foregaende.dokumentId } : {}),
      organisationId: kontext.organisationId,
      uppdragId: kontext.uppdragId,
      filnamn: fil.filnamn,
      mime: fil.mime,
      storlekByte: fil.innehall.length,
      kontrollsumma,
      stod: regel.stod,
      status: 'mottagen',
      metadata,
      forslag,
      kalla: { typ: 'uppladdning', vag: kontext.vag, inlamnadAv: session.anvandarId, tid },
      skanning: { skanner: this.skanner.namn, produktion: this.skanner.produktion, utfall: skanning },
      kontroller,
      saknas: [],
      historik: [{ tid, aktor: session.anvandarId, handelse: 'Mottagen', status: 'mottagen' }],
    };
    this.#original.set(dokumentId, new Uint8Array(fil.innehall));
    this.#dok.push(d);
    this.#bedom(d, session.anvandarId, 'Mottagningskontroller klara');
    if (foregaende) {
      foregaende.ersattAv = dokumentId;
      this.#satt(foregaende, 'ersatt', session.anvandarId, `Ersatt av ${dokumentId}`);
      for (const fn of this.#lyssnare) fn({ organisationId: d.organisationId, tidigareDokumentId: foregaende.dokumentId, nyttDokumentId: dokumentId, handlingsId: d.handlingsId });
    }
    this.logg.registrera({ id: session.anvandarId, typ: 'manniska' }, 'dokument_mottaget', dokumentId, {
      organisationId: d.organisationId,
      uppdragId: d.uppdragId,
      kontrollsumma,
      version: d.version,
      ...(foregaende ? { ersatter: foregaende.dokumentId } : {}),
    });
    return {
      filnamn: fil.filnamn,
      utfall: 'mottagen',
      dokumentId,
      status: d.status,
      kontrollsumma,
      kontroller,
      meddelande: d.status === 'behover_kompletteras' ? `Mottagen som ${dokumentId}. Komplettera: ${d.saknas.join(', ')}.` : d.status === 'kontrolleras' ? `Mottagen som ${dokumentId}. Väntar på skanning.` : `Mottagen som ${dokumentId}. Väntar på granskning.`,
    };
  }

  #satt(d: Dokument, status: Dokumentstatus, aktor: string, kommentar?: string) {
    d.status = status;
    d.historik.push({ tid: this.klocka().toISOString(), aktor, handelse: DOKUMENTSTATUSNAMN[status], status, ...(kommentar ? { kommentar } : {}) });
  }

  /** Sätter kontrolleras, behöver kompletteras eller granskas utifrån skanning och metadata. */
  #bedom(d: Dokument, aktor: string, kommentar: string) {
    d.saknas = OBLIGATORISKA.filter((f) => {
      const v = d.metadata[f];
      return v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
    }).map((f) => FALTNAMN[f]);
    const ny: Dokumentstatus = d.skanning.utfall !== 'ren' ? 'kontrolleras' : d.saknas.length ? 'behover_kompletteras' : 'granskas';
    if (ny !== d.status) this.#satt(d, ny, aktor, kommentar);
  }

  #hitta(session: Session | null, dokumentId: string, operation: 'las' | 'andra'): Resultat<Dokument> {
    const d = this.#dok.find((x) => x.dokumentId === dokumentId);
    if (!d) return fel(NEUTRALT);
    const u = this.plattform.provaUppdrag(session, d.uppdragId, 'las');
    if (!u.ok) return fel(NEUTRALT);
    if (operation === 'andra') {
      const a = this.plattform.provaUppdrag(session, d.uppdragId, 'andra');
      if (!a.ok) return a;
    }
    return ok(d);
  }

  hamta(session: Session | null, dokumentId: string): Resultat<Dokument> {
    const d = this.#hitta(session, dokumentId, 'las');
    return d.ok ? ok(structuredClone(d.varde)) : d;
  }

  /** Öppnar originalet. Varje öppning loggas. */
  oppnaOriginal(session: Session | null, dokumentId: string): Resultat<Uint8Array> {
    const d = this.#hitta(session, dokumentId, 'las');
    if (!d.ok) return d;
    this.logg.registrera({ id: session!.anvandarId, typ: 'manniska' }, 'dokument_original_oppnat', dokumentId, { organisationId: d.varde.organisationId });
    return ok(new Uint8Array(this.#original.get(dokumentId)!));
  }

  /** Dokument i en organisation som sessionen får läsa, valfritt filtrerade på uppdrag och status. */
  lista(session: Session | null, organisationId: string, filter: { uppdragId?: string; status?: Dokumentstatus; baraGallande?: boolean } = {}): Resultat<Dokument[]> {
    const b = this.plattform.provaOrganisation(session, organisationId, 'las');
    if (!b.tillats) return fel(b.skal);
    const ut = this.#dok.filter(
      (d) =>
        d.organisationId === organisationId &&
        (!filter.uppdragId || d.uppdragId === filter.uppdragId) &&
        (!filter.status || d.status === filter.status) &&
        (!filter.baraGallande || d.status !== 'ersatt') &&
        this.plattform.provaUppdrag(session, d.uppdragId, 'las').ok,
    );
    return ok(structuredClone(ut));
  }

  /** Kompletterar metadata och bekräftar eller avvisar ELSA:s förslag. */
  komplettera(session: Session | null, dokumentId: string, andring: { metadata?: Partial<Dokumentmetadata>; bekraftaForslag?: ('dokumenttyp' | 'period')[] }): Resultat<Dokument> {
    const r = this.#hitta(session, dokumentId, 'andra');
    if (!r.ok) return r;
    const d = r.varde;
    if (d.status === 'ersatt' || d.status === 'godkand_for_analys') return fel(`Ett dokument med status ${DOKUMENTSTATUSNAMN[d.status].toLowerCase()} kan inte ändras. Lämna en ny version.`);
    for (const f of andring.bekraftaForslag ?? []) {
      const fs = d.forslag[f];
      if (!fs) return fel(`Det finns inget förslag på ${FALTNAMN[f].toLowerCase()}`);
      fs.bekraftad = true;
      d.metadata[f] = fs.varde;
    }
    Object.assign(d.metadata, andring.metadata ?? {});
    for (const f of ['dokumenttyp', 'period'] as const) if (andring.metadata?.[f] !== undefined) delete d.forslag[f];
    this.logg.registrera({ id: session!.anvandarId, typ: 'manniska' }, 'dokument_kompletterat', dokumentId, { organisationId: d.organisationId, falt: Object.keys(andring.metadata ?? {}), bekraftade: andring.bekraftaForslag ?? [] });
    this.#bedom(d, session!.anvandarId, 'Metadata kompletterad');
    return ok(structuredClone(d));
  }

  /** Granskaren godkänner dokumentet för analys. Kräver ren skanning i en produktionsskanner eller uttrycklig demomarkering. */
  godkannForAnalys(session: Session | null, dokumentId: string, kommentar: string): Resultat<Dokument> {
    const r = this.#hitta(session, dokumentId, 'andra');
    if (!r.ok) return r;
    const d = r.varde;
    if (d.status !== 'granskas') return fel(`Bara dokument som granskas kan godkännas (status: ${DOKUMENTSTATUSNAMN[d.status].toLowerCase()})`);
    if (d.skanning.utfall !== 'ren') return fel('Dokumentet är inte skannat mot skadlig kod');
    if (!kommentar.trim()) return fel('Ange vad som granskats');
    this.#satt(d, 'godkand_for_analys', session!.anvandarId, kommentar.trim());
    this.logg.registrera({ id: session!.anvandarId, typ: 'manniska' }, 'dokument_godkant_for_analys', dokumentId, { organisationId: d.organisationId, demoskanning: !d.skanning.produktion });
    return ok(structuredClone(d));
  }

  /** Granskaren skickar tillbaka dokumentet för komplettering med en fråga till kunden. */
  begarKomplettering(session: Session | null, dokumentId: string, fraga: string): Resultat<Dokument> {
    const r = this.#hitta(session, dokumentId, 'andra');
    if (!r.ok) return r;
    const d = r.varde;
    if (d.status !== 'granskas') return fel('Bara dokument som granskas kan skickas tillbaka');
    if (!fraga.trim()) return fel('Skriv vad som ska kompletteras');
    this.#satt(d, 'behover_kompletteras', session!.anvandarId, fraga.trim());
    return ok(structuredClone(d));
  }
}
