/**
 * Gemensam rapporttjänst: rapportkatalog, rapportregister, ärende- och diarienummer, versioner,
 * statusflöde och leveranser (PM Kundadministration och rapporthantering v0.1, avsnitt 7 och
 * införandesteg 5).
 *
 * Bärande regler:
 * - Rapport-ID är permanent och följer rapporten genom alla versioner och format.
 * - Diarienummer är ett separat fält på ärendet. Flera rapporter kan höra till samma ärende och
 *   en ny version skapar aldrig ett nytt nummer.
 * - ELSA:s interna ärendenummer är inte ett diarienummer och visas aldrig som ett. Ett externt
 *   diarienummer visas bara när det är bekräftat från det diarieförande systemet.
 * - Nummertilldelning är skyddad mot samtidiga kollisioner och omförsök (villkorad skrivning och
 *   idempotensnyckel). Lagret är utbytbart; en databas ska ge samma garantier.
 * - Versioner: 0.x för utkast, 1.0 för första fastställda, därefter nya nummer. Rapportversion,
 *   mallversion och dataversion hålls isär.
 * - Godkännande avser en bestämd innehållsversion (innehållshash) och ett låst dataunderlag.
 * - Ingen publicerad fil skrivs över. Leveranser är append-only.
 * - En ändrad källa ger en varning om möjlig inaktualitet men ändrar aldrig en publicerad rapport.
 *
 * Inga Word-, PDF- eller presentationsmallar är byggda. Exporten är en deterministisk rendering av
 * den godkända rapportmodellen med kontrollsumma, så att samma innehåll ger samma fil.
 */
import { createHash } from 'node:crypto';
import type { Session } from './atkomst.js';
import type { Dokumentmottagning, Informationsklass, Objektreferens } from './dokumentmottagning.js';
import type { Resultat } from './metod.js';
import type { Plattform } from './plattform.js';

// ---------------------------------------------------------------- Katalog

export type Rapportformat = 'word' | 'pdf' | 'presentation' | 'tabellbilaga';
export const FORMATNAMN: Record<Rapportformat, string> = { word: 'Redigerbar Word-rapport', pdf: 'Fastställd PDF', presentation: 'Presentation', tabellbilaga: 'Tabellbilaga' };

export interface Rapporttyp {
  id: string;
  namn: string;
  syfte: string;
  malgrupp: string;
  /** Ansvarig mallägare. Ingen är utsedd ännu. */
  mallagare: string | null;
  mallversion: string;
  obligatoriskaAvsnitt: string[];
  indata: string[];
  kvalitetskrav: string[];
  granskningsroller: string[];
  publiceringsregler: string;
  format: Rapportformat[];
  /** Katalogposten är ett förslag tills mallägare och pilotrapport är beslutade. */
  katalogstatus: 'forslag' | 'faststalld';
}

const FORSLAG = { mallagare: null, mallversion: '0.1-förslag', katalogstatus: 'forslag' as const };

/** Rapporttyper som PM:et nämner. Alla är förslag; vilken som blir pilot är ett öppet beslut. */
export const RAPPORTKATALOG: readonly Rapporttyp[] = [
  { id: 'pm', namn: 'PM', syfte: 'Underlag för intern beredning eller beslut', malgrupp: 'Ledning och beredande tjänstepersoner', obligatoriskaAvsnitt: ['Syfte', 'Bakgrund', 'Analys', 'Förslag', 'Källor och osäkerheter'], indata: ['Godkända dokument', 'Granskade uppgifter'], kvalitetskrav: ['Varje faktapåstående har källa', 'Luckor redovisas'], granskningsroller: ['Sakgranskare'], publiceringsregler: 'Publiceras internt efter godkännande', format: ['word', 'pdf'], ...FORSLAG },
  { id: 'styrelserapport', namn: 'Styrelse- och ledningsrapport', syfte: 'Lägesbild och beslutsunderlag för styrelse eller ledning', malgrupp: 'Styrelse, ledningsgrupp', obligatoriskaAvsnitt: ['Sammanfattning', 'Nyckeltal', 'Risker', 'Förslag till beslut', 'Källor och osäkerheter'], indata: ['Granskade nyckeltal', 'Beslutslogg'], kvalitetskrav: ['Nyckeltal har baslinje och period', 'Risker har ansvarig'], granskningsroller: ['Sakgranskare', 'Godkännare hos kunden'], publiceringsregler: 'Kundens godkännare fastställer', format: ['word', 'pdf', 'presentation'], ...FORSLAG },
  { id: 'energirapport', namn: 'Energi- och ekonomirapport', syfte: 'Förbrukning, kostnad och trend per objekt och period', malgrupp: 'Förvaltning och ekonomi', obligatoriskaAvsnitt: ['Sammanfattning', 'Förbrukning per period', 'Kostnad', 'Datakvalitet och bortfall', 'Metod'], indata: ['Granskad mätserie', 'Godkända fakturor'], kvalitetskrav: ['Saknade värden redovisas som bortfall', 'Besparing räknas bara mot godkänd baslinje'], granskningsroller: ['Dataansvarig', 'Sakgranskare'], publiceringsregler: 'Publiceras efter granskning av dataansvarig', format: ['word', 'pdf', 'tabellbilaga'], ...FORSLAG },
  { id: 'projektstatus', namn: 'Projekt- och statusrapport', syfte: 'Status, tidplan, risker och nästa steg i ett uppdrag', malgrupp: 'Projektägare och styrgrupp', obligatoriskaAvsnitt: ['Status', 'Tidplan', 'Risker', 'Beslut som behövs'], indata: ['Kundresans steg och beslut'], kvalitetskrav: ['Status följer kundresan'], granskningsroller: ['Projektledare'], publiceringsregler: 'Publiceras till styrgruppen', format: ['word', 'pdf', 'presentation'], ...FORSLAG },
  { id: 'avvikelserapport', namn: 'Kontroll- och avvikelserapport', syfte: 'Utförda kontroller, avvikelser och åtgärder', malgrupp: 'Verksamhetsansvarig och revision', obligatoriskaAvsnitt: ['Omfattning', 'Kontroller', 'Avvikelser', 'Åtgärder och ansvar'], indata: ['Kontrollresultat', 'Godkända dokument'], kvalitetskrav: ['Varje avvikelse har källa och ansvarig'], granskningsroller: ['Sakgranskare', 'Godkännare'], publiceringsregler: 'Fastställs av verksamhetsansvarig', format: ['word', 'pdf', 'tabellbilaga'], ...FORSLAG },
];

// ---------------------------------------------------------------- Ärende- och diarienummer

/**
 * Lager för löpserier. Måste ge villkorad skrivning (compare-and-set) och unik idempotensnyckel,
 * t.ex. via ETag i Dataverse eller en unik nyckel i SQL. Det asynkrona gränssnittet speglar en
 * riktig databas, där en annan skrivning kan hinna emellan läsning och skrivning.
 */
export interface Nummerlager {
  las(serie: string): Promise<{ varde: number; version: number }>;
  /** Skriver bara om versionen är oförändrad. Returnerar false vid krock. */
  skrivOmOforandrad(serie: string, varde: number, forvantadVersion: number): Promise<boolean>;
  /** Knyter en idempotensnyckel till ett nummer. Returnerar det redan knutna numret om nyckeln finns. */
  reservera(nyckel: string, nummer: string): Promise<string>;
  hamtaReservation(nyckel: string): Promise<string | undefined>;
}

/** Minneslager. Varje anrop väntar en händelseloop så att samtidiga anrop faktiskt kan krocka. */
export class Minnesnummerlager implements Nummerlager {
  #serier = new Map<string, { varde: number; version: number }>();
  #nycklar = new Map<string, string>();
  krockar = 0;
  async las(serie: string) {
    await Promise.resolve();
    return { ...(this.#serier.get(serie) ?? { varde: 0, version: 0 }) };
  }
  async skrivOmOforandrad(serie: string, varde: number, forvantadVersion: number) {
    await Promise.resolve();
    const nu = this.#serier.get(serie) ?? { varde: 0, version: 0 };
    if (nu.version !== forvantadVersion) {
      this.krockar += 1;
      return false;
    }
    this.#serier.set(serie, { varde, version: forvantadVersion + 1 });
    return true;
  }
  async reservera(nyckel: string, nummer: string) {
    await Promise.resolve();
    const fanns = this.#nycklar.get(nyckel);
    if (fanns) return fanns;
    this.#nycklar.set(nyckel, nummer);
    return nummer;
  }
  async hamtaReservation(nyckel: string) {
    await Promise.resolve();
    return this.#nycklar.get(nyckel);
  }
}

export interface Nummerformat {
  /** Kod per kund i löpserien, t.ex. DEMOSTAD. Själva formatet är inte beslutat. */
  kundkod: (organisationId: string) => string;
  siffror: number;
}

/**
 * Tilldelar internt ärendenummer ur en unik löpserie per kund och år. Omförsök med samma
 * idempotensnyckel ger samma nummer. Vid krock läses serien om och tilldelningen görs om.
 */
export async function tilldelaArendenummer(lager: Nummerlager, format: Nummerformat, organisationId: string, ar: number, idempotensnyckel: string, maxForsok = 50): Promise<string> {
  const nyckel = `${organisationId}:${idempotensnyckel}`;
  const redan = await lager.hamtaReservation(nyckel);
  if (redan) return redan;
  const serie = `${organisationId}:${ar}`;
  for (let forsok = 0; forsok < maxForsok; forsok++) {
    const { varde, version } = await lager.las(serie);
    const nasta = varde + 1;
    if (await lager.skrivOmOforandrad(serie, nasta, version)) {
      const nummer = `ELSA-${format.kundkod(organisationId)}-${ar}-${String(nasta).padStart(format.siffror, '0')}`;
      // Om ett parallellt omförsök med samma nyckel hann före vinner dess nummer; vårt blir ett
      // oanvänt hål i serien, vilket är tillåtet, men samma nyckel får aldrig två nummer.
      return lager.reservera(nyckel, nummer);
    }
  }
  throw new Error('Kunde inte tilldela ärendenummer efter upprepade krockar');
}

export type Registreringsstatus = 'ej_begard' | 'vantande' | 'bekraftad' | 'avvisad';
export const REGISTRERINGSNAMN: Record<Registreringsstatus, string> = { ej_begard: 'Ej begärd', vantande: 'Registrering väntar', bekraftad: 'Bekräftad', avvisad: 'Avvisad av diariet' };

export interface ExternDiariekoppling {
  diarieforandeOrganisation: string;
  system: string;
  registreringsstatus: Registreringsstatus;
  arendeId?: string;
  /** Sätts bara när numret återlästs från det diarieförande systemet. */
  diarienummer?: string;
  aterlastFran?: string;
  aterlastTid?: string;
}

export interface Rapportarende {
  arendeId: string;
  organisationId: string;
  uppdragId: string;
  rubrik: string;
  /** ELSA:s interna ärendenummer. Inte ett diarienummer. */
  internt: string;
  extern?: ExternDiariekoppling;
  skapat: string;
}

/** Vad som får visas som ärendebeteckning. Ett väntande externt nummer visas aldrig som genomfört. */
export function arendebeteckning(a: Rapportarende): { etikett: string; varde: string; bekraftad: boolean } {
  if (a.extern?.registreringsstatus === 'bekraftad' && a.extern.diarienummer) return { etikett: `Diarienummer (${a.extern.diarieforandeOrganisation})`, varde: a.extern.diarienummer, bekraftad: true };
  if (a.extern) return { etikett: `Internt ärendenummer · diarieregistrering: ${REGISTRERINGSNAMN[a.extern.registreringsstatus].toLowerCase()}`, varde: a.internt, bekraftad: false };
  return { etikett: 'Internt ärendenummer (inte diarienummer)', varde: a.internt, bekraftad: true };
}

// ---------------------------------------------------------------- Rapporter och versioner

export type Versionsstatus = 'utkast' | 'under_granskning' | 'godkand' | 'publicerad' | 'ersatt' | 'arkiverad' | 'aterkallad';
export const VERSIONSSTATUSNAMN: Record<Versionsstatus, string> = {
  utkast: 'Utkast',
  under_granskning: 'Under granskning',
  godkand: 'Godkänd',
  publicerad: 'Publicerad',
  ersatt: 'Ersatt',
  arkiverad: 'Arkiverad',
  aterkallad: 'Återkallad',
};

export interface Rapportblock {
  id: string;
  rubrik: string;
  /** null betyder lucka: uppgiften saknas och visas som lucka, aldrig som antagande. */
  text: string | null;
  ursprung: 'manniska' | 'ai_utkast' | 'ai_granskad';
  kallor: string[];
}

export interface Kallversion {
  dokumentId: string;
  handlingsId: string;
  version: number;
  kontrollsumma: string;
}

export interface Rapportversion {
  version: string;
  status: Versionsstatus;
  innehall: Rapportblock[];
  innehallshash: string;
  mallversion: string;
  datamodell: string;
  berakningsmetod: string;
  kallversioner: Kallversion[];
  /** Underlagets bryttidpunkt. */
  bryttidpunkt: string;
  genererad: string;
  andringsbeskrivning: string;
  forfattare: string;
  granskare?: string;
  godkannare?: string;
  godkand?: { av: string; tid: string; innehallshash: string };
  underkannanden: { av: string; tid: string; skal: string }[];
  publicerad?: string;
  ersattAv?: string;
  aterkallelse?: { av: string; tid: string; skal: string; rattadVersion?: string };
}

export interface Leverans {
  version: string;
  format: Rapportformat;
  filreferens: string;
  kontrollsumma: string;
  skapad: string;
  skapadAv: string;
  /** true när exporten är en ny export av oförändrat innehåll som redan exporterats. */
  aterexport: boolean;
}

export interface Inaktualitetsvarning {
  tid: string;
  version: string;
  dokumentId: string;
  nyttDokumentId: string;
  text: string;
}

export interface Rapport {
  rapportId: string;
  organisationId: string;
  uppdragId: string;
  arendeId: string;
  typ: string;
  titel: string;
  objekt: Objektreferens[];
  period: string;
  mottagare: string[];
  informationsklass: Informationsklass;
  ursprung: 'elsa' | 'manuell' | 'extern';
  ursprungsbeskrivning?: string;
  ansvarig: string;
  skapad: string;
  versioner: Rapportversion[];
  leveranser: Leverans[];
  varningar: Inaktualitetsvarning[];
  distribution: { tid: string; mottagare: string; version: string; av: string }[];
  bevarande: string;
}

export interface Rapportparametrar {
  /** Godkännaren får inte vara författare till versionen. Förslag, inte beslutat. */
  krav4ogon: boolean;
  datamodell: string;
  nummerformat: Nummerformat;
}

export const STANDARDRAPPORT: Rapportparametrar = {
  krav4ogon: true,
  datamodell: 'ELSA-datamodell 0.1 (förslag)',
  nummerformat: { kundkod: (id) => id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), siffror: 4 },
};

export interface Sokfilter {
  text?: string;
  typ?: string;
  objektId?: string;
  period?: string;
  diarienummer?: string;
  ansvarig?: string;
  status?: Versionsstatus;
  uppdragId?: string;
}

export interface Rapportvy {
  rapport: Rapport;
  arende: Rapportarende;
  beteckning: ReturnType<typeof arendebeteckning>;
  aktuell: Rapportversion;
  gallande?: Rapportversion;
  luckor: string[];
}

const NEUTRALT = 'Rapporten finns inte eller du saknar behörighet';
const fel = (skal: string): { ok: false; skal: string } => ({ ok: false, skal });
const ok = <T>(varde: T): { ok: true; varde: T } => ({ ok: true, varde });

export function hashaInnehall(innehall: Rapportblock[], kallor: Kallversion[], mallversion: string, berakningsmetod: string): string {
  return createHash('sha256').update(JSON.stringify([innehall, kallor, mallversion, berakningsmetod])).digest('hex');
}

/** Nästa versionsnummer. Utkast före första fastställda: 0.x. Efter: major.(minor+1), väsentlig ändring: (major+1).0. */
export function nastaVersion(versioner: readonly Rapportversion[], vasentlig = false): string {
  const faststallda = versioner.filter((v) => !v.version.startsWith('0.'));
  const senaste = versioner.at(-1);
  if (!senaste) return '0.1';
  const [maj, min] = senaste.version.split('.').map(Number) as [number, number];
  if (!faststallda.length && maj === 0) return `0.${min + 1}`;
  return vasentlig ? `${maj + 1}.0` : `${maj}.${min + 1}`;
}

export class Rapportregister {
  #rapporter: Rapport[] = [];
  #arenden: Rapportarende[] = [];
  #lopnr = 0;

  constructor(
    private readonly plattform: Plattform,
    private readonly dokument: Dokumentmottagning | null,
    private readonly lager: Nummerlager = new Minnesnummerlager(),
    private readonly parametrar: Rapportparametrar = STANDARDRAPPORT,
    private readonly klocka: () => Date = () => new Date(),
    private readonly katalog: readonly Rapporttyp[] = RAPPORTKATALOG,
  ) {
    dokument?.vidKallandring((h) => this.#kallandring(h.organisationId, h.tidigareDokumentId, h.nyttDokumentId));
  }

  get rapportkatalog() {
    return this.katalog;
  }

  #nu() {
    return this.klocka().toISOString();
  }

  #logga(session: Session, handelse: string, objektId: string, organisationId: string, data: Record<string, unknown> = {}) {
    this.plattform.logg.registrera({ id: session.anvandarId, typ: 'manniska' }, handelse, objektId, { organisationId, ...data });
  }

  // --- Ärenden

  /**
   * Skapar ett ärende med internt ärendenummer. `idempotensnyckel` ska komma från klienten (t.ex.
   * formulärets id) så att ett omförsök efter nätverksfel ger samma ärende.
   */
  async skapaArende(session: Session | null, uppdragId: string, rubrik: string, idempotensnyckel: string): Promise<Resultat<Rapportarende>> {
    const u = this.plattform.provaUppdrag(session, uppdragId, 'andra');
    if (!u.ok) return u;
    if (!rubrik.trim()) return fel('Ärendet behöver en rubrik');
    if (!idempotensnyckel.trim()) return fel('Idempotensnyckel saknas');
    const org = u.varde.organisationId;
    const nummer = await tilldelaArendenummer(this.lager, this.parametrar.nummerformat, org, this.klocka().getUTCFullYear(), idempotensnyckel);
    const fanns = this.#arenden.find((a) => a.organisationId === org && a.internt === nummer);
    if (fanns) return ok(structuredClone(fanns));
    const a: Rapportarende = { arendeId: `ARD-${nummer}`, organisationId: org, uppdragId, rubrik: rubrik.trim(), internt: nummer, skapat: this.#nu() };
    this.#arenden.push(a);
    this.#logga(session!, 'arende_skapat', a.arendeId, org, { internt: nummer });
    return ok(structuredClone(a));
  }

  #arende(session: Session | null, arendeId: string, operation: 'las' | 'andra'): Resultat<Rapportarende> {
    const a = this.#arenden.find((x) => x.arendeId === arendeId);
    if (!a) return fel('Ärendet finns inte eller du saknar behörighet');
    if (!this.plattform.provaUppdrag(session, a.uppdragId, 'las').ok) return fel('Ärendet finns inte eller du saknar behörighet');
    if (operation === 'andra') {
      const b = this.plattform.provaUppdrag(session, a.uppdragId, 'andra');
      if (!b.ok) return b;
    }
    return ok(a);
  }

  listaArenden(session: Session | null, organisationId: string): Resultat<Rapportarende[]> {
    const b = this.plattform.provaOrganisation(session, organisationId, 'las');
    if (!b.tillats) return fel(b.skal);
    return ok(structuredClone(this.#arenden.filter((a) => a.organisationId === organisationId && this.plattform.provaUppdrag(session, a.uppdragId, 'las').ok)));
  }

  /** Registrerar att ärendet ska diarieföras i kundens diarium. Ingen anslutning finns; status blir väntande. */
  begarExternRegistrering(session: Session | null, arendeId: string, diarieforandeOrganisation: string, system: string): Resultat<Rapportarende> {
    const r = this.#arende(session, arendeId, 'andra');
    if (!r.ok) return r;
    if (r.varde.extern?.registreringsstatus === 'bekraftad') return fel('Ärendet är redan registrerat i diariet');
    r.varde.extern = { diarieforandeOrganisation, system, registreringsstatus: 'vantande' };
    this.#logga(session!, 'diarieregistrering_begard', arendeId, r.varde.organisationId, { system });
    return ok(structuredClone(r.varde));
  }

  /**
   * Återläser bekräftat diarienummer. I drift kommer anropet från adaptern mot kundens diarium;
   * här registreras det manuellt med källhänvisning och märks som manuellt återläst.
   */
  aterlasDiarienummer(session: Session | null, arendeId: string, svar: { diarienummer: string; arendeIdExternt?: string; kalla: string } | { avvisad: string }): Resultat<Rapportarende> {
    const r = this.#arende(session, arendeId, 'andra');
    if (!r.ok) return r;
    const e = r.varde.extern;
    if (!e || e.registreringsstatus !== 'vantande') return fel('Ingen väntande diarieregistrering');
    if ('avvisad' in svar) {
      e.registreringsstatus = 'avvisad';
    } else {
      if (!svar.diarienummer.trim() || !svar.kalla.trim()) return fel('Diarienummer och källa krävs');
      const krock = this.#arenden.find((a) => a !== r.varde && a.extern?.diarieforandeOrganisation === e.diarieforandeOrganisation && a.extern.diarienummer === svar.diarienummer.trim());
      if (krock) return fel(`Diarienumret är redan kopplat till ${krock.internt}`);
      Object.assign(e, { registreringsstatus: 'bekraftad', diarienummer: svar.diarienummer.trim(), aterlastFran: svar.kalla.trim(), aterlastTid: this.#nu(), ...(svar.arendeIdExternt ? { arendeId: svar.arendeIdExternt } : {}) });
    }
    this.#logga(session!, 'diarienummer_aterlast', arendeId, r.varde.organisationId, { status: e.registreringsstatus });
    return ok(structuredClone(r.varde));
  }

  // --- Rapporter

  #nyttRapportId() {
    this.#lopnr += 1;
    return `RAP-${String(this.#lopnr).padStart(6, '0')}`;
  }

  #kallversioner(session: Session, dokumentIds: string[], organisationId: string): Resultat<Kallversion[]> {
    const ut: Kallversion[] = [];
    for (const id of dokumentIds) {
      if (!this.dokument) return fel('Dokumentmottagningen är inte ansluten');
      const d = this.dokument.hamta(session, id);
      if (!d.ok || d.varde.organisationId !== organisationId) return fel(`Källdokumentet ${id} finns inte eller du saknar behörighet`);
      if (d.varde.status !== 'godkand_for_analys') return fel(`Källdokumentet ${id} är inte godkänt för analys`);
      ut.push({ dokumentId: id, handlingsId: d.varde.handlingsId, version: d.varde.version, kontrollsumma: d.varde.kontrollsumma });
    }
    return ok(ut);
  }

  /**
   * Skapar en rapport med version 0.1. Rapporten kopplas till ett befintligt ärende. Källdokument
   * måste vara godkända för analys. Saknade fakta anges som block med `text: null` (lucka).
   */
  skapaRapport(
    session: Session | null,
    data: {
      arendeId: string;
      typ: string;
      titel: string;
      objekt: Objektreferens[];
      period: string;
      mottagare: string[];
      informationsklass: Informationsklass;
      ursprung?: Rapport['ursprung'];
      ursprungsbeskrivning?: string;
      innehall: Rapportblock[];
      kallor: string[];
      berakningsmetod: string;
      bevarande?: string;
    },
  ): Resultat<Rapportvy> {
    const a = this.#arende(session, data.arendeId, 'andra');
    if (!a.ok) return a;
    const typ = this.katalog.find((t) => t.id === data.typ);
    if (!typ) return fel('Okänd rapporttyp');
    if (!data.titel.trim()) return fel('Rapporten behöver en titel');
    if (!data.period.trim()) return fel('Ange period');
    if ((data.ursprung ?? 'elsa') !== 'elsa' && !data.ursprungsbeskrivning?.trim()) return fel('Ange ursprung för manuellt upprättad eller externt framtagen rapport');
    const k = this.#kallversioner(session!, data.kallor, a.varde.organisationId);
    if (!k.ok) return k;
    const nu = this.#nu();
    const v: Rapportversion = this.#nyVersion('0.1', data.innehall, k.varde, typ.mallversion, data.berakningsmetod, 'Första utkast', session!.anvandarId);
    const r: Rapport = {
      rapportId: this.#nyttRapportId(),
      organisationId: a.varde.organisationId,
      uppdragId: a.varde.uppdragId,
      arendeId: a.varde.arendeId,
      typ: typ.id,
      titel: data.titel.trim(),
      objekt: structuredClone(data.objekt),
      period: data.period.trim(),
      mottagare: [...data.mottagare],
      informationsklass: data.informationsklass,
      ursprung: data.ursprung ?? 'elsa',
      ...(data.ursprungsbeskrivning ? { ursprungsbeskrivning: data.ursprungsbeskrivning.trim() } : {}),
      ansvarig: session!.anvandarId,
      skapad: nu,
      versioner: [v],
      leveranser: [],
      varningar: [],
      distribution: [],
      bevarande: data.bevarande ?? 'Ej beslutat',
    };
    this.#rapporter.push(r);
    this.#logga(session!, 'rapport_skapad', r.rapportId, r.organisationId, { arendeId: r.arendeId, version: v.version, typ: r.typ });
    return ok(this.#vy(r));
  }

  #nyVersion(version: string, innehall: Rapportblock[], kallor: Kallversion[], mallversion: string, berakningsmetod: string, andringsbeskrivning: string, forfattare: string): Rapportversion {
    const nu = this.#nu();
    return {
      version,
      status: 'utkast',
      innehall: structuredClone(innehall),
      innehallshash: hashaInnehall(innehall, kallor, mallversion, berakningsmetod),
      mallversion,
      datamodell: this.parametrar.datamodell,
      berakningsmetod,
      kallversioner: kallor,
      bryttidpunkt: nu,
      genererad: nu,
      andringsbeskrivning,
      forfattare,
      underkannanden: [],
    };
  }

  #vy(r: Rapport): Rapportvy {
    const arende = this.#arenden.find((a) => a.arendeId === r.arendeId)!;
    const aktuell = r.versioner.at(-1)!;
    const gallande = [...r.versioner].reverse().find((v) => v.status === 'publicerad');
    return {
      rapport: structuredClone(r),
      arende: structuredClone(arende),
      beteckning: arendebeteckning(arende),
      aktuell: structuredClone(aktuell),
      ...(gallande ? { gallande: structuredClone(gallande) } : {}),
      luckor: aktuell.innehall.filter((b) => b.text === null).map((b) => b.rubrik),
    };
  }

  /** Läsare ser bara publicerade versioner. Redigerare ser alla. */
  #hitta(session: Session | null, rapportId: string, operation: 'las' | 'andra'): Resultat<Rapport> {
    const r = this.#rapporter.find((x) => x.rapportId === rapportId);
    if (!r) return fel(NEUTRALT);
    if (!this.plattform.provaUppdrag(session, r.uppdragId, 'las').ok) return fel(NEUTRALT);
    if (operation === 'las' && this.plattform.rollI(session, r.organisationId) === 'lasare' && !r.versioner.some((v) => v.status === 'publicerad')) return fel(NEUTRALT);
    if (operation === 'andra') {
      const b = this.plattform.provaUppdrag(session, r.uppdragId, 'andra');
      if (!b.ok) return b;
    }
    return ok(r);
  }

  hamta(session: Session | null, rapportId: string): Resultat<Rapportvy> {
    const r = this.#hitta(session, rapportId, 'las');
    if (!r.ok) return r;
    const vy = this.#vy(r.varde);
    if (this.plattform.rollI(session, r.varde.organisationId) === 'lasare') {
      vy.rapport.versioner = vy.rapport.versioner.filter((v) => ['publicerad', 'ersatt', 'aterkallad', 'arkiverad'].includes(v.status) && v.publicerad);
      vy.aktuell = vy.gallande ?? vy.rapport.versioner.at(-1)!;
    }
    return ok(vy);
  }

  /** Sökning och filtrering i rapportbiblioteket inom en organisation. */
  sok(session: Session | null, organisationId: string, filter: Sokfilter = {}): Resultat<Rapportvy[]> {
    const b = this.plattform.provaOrganisation(session, organisationId, 'las');
    if (!b.tillats) return fel(b.skal);
    const q = filter.text?.trim().toLowerCase();
    const ut: Rapportvy[] = [];
    for (const r of this.#rapporter) {
      if (r.organisationId !== organisationId) continue;
      const h = this.hamta(session, r.rapportId);
      if (!h.ok) continue;
      const vy = h.varde;
      const a = vy.arende;
      if (filter.typ && r.typ !== filter.typ) continue;
      if (filter.uppdragId && r.uppdragId !== filter.uppdragId) continue;
      if (filter.objektId && !r.objekt.some((o) => o.id === filter.objektId)) continue;
      if (filter.period && !r.period.includes(filter.period)) continue;
      if (filter.ansvarig && r.ansvarig !== filter.ansvarig) continue;
      if (filter.status && vy.aktuell.status !== filter.status) continue;
      if (filter.diarienummer && ![a.internt, a.extern?.registreringsstatus === 'bekraftad' ? a.extern.diarienummer : undefined].some((n) => n?.includes(filter.diarienummer!))) continue;
      if (q && !`${r.rapportId} ${r.titel} ${r.period} ${a.internt} ${a.extern?.diarienummer ?? ''} ${r.objekt.map((o) => o.id).join(' ')}`.toLowerCase().includes(q)) continue;
      ut.push(vy);
    }
    return ok(ut);
  }

  /**
   * Ändrar innehållet. Ett utkast i 0.x eller efter fastställd version ersätts av en ny
   * utkastversion så att varje ändring har ett versionsnummer och en beskrivning. Godkända och
   * publicerade versioner ändras aldrig.
   */
  andra(session: Session | null, rapportId: string, andring: { innehall: Rapportblock[]; kallor?: string[]; berakningsmetod?: string; andringsbeskrivning: string; vasentlig?: boolean }): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const r = h.varde;
    if (!andring.andringsbeskrivning.trim()) return fel('Beskriv vad som ändrats och varför');
    const senaste = r.versioner.at(-1)!;
    if (senaste.status === 'under_granskning') return fel('Versionen granskas. Underkänn den för att kunna ändra.');
    const kallor = andring.kallor ? this.#kallversioner(session!, andring.kallor, r.organisationId) : ok(senaste.kallversioner);
    if (!kallor.ok) return kallor;
    const metod = andring.berakningsmetod ?? senaste.berakningsmetod;
    const hash = hashaInnehall(andring.innehall, kallor.varde, senaste.mallversion, metod);
    if (hash === senaste.innehallshash) return fel('Innehållet är oförändrat. Ingen ny version skapas.');
    const nummer = senaste.status === 'utkast' && senaste.version.startsWith('0.') ? nastaVersion(r.versioner) : senaste.status === 'utkast' ? null : nastaVersion(r.versioner, andring.vasentlig);
    if (nummer === null) {
      // Utkast efter fastställd version: ändras på plats men får ny innehållshash och historik i beskrivningen.
      senaste.innehall = structuredClone(andring.innehall);
      senaste.kallversioner = kallor.varde;
      senaste.berakningsmetod = metod;
      senaste.innehallshash = hash;
      senaste.andringsbeskrivning = `${senaste.andringsbeskrivning}; ${andring.andringsbeskrivning.trim()}`;
      senaste.genererad = this.#nu();
    } else {
      const typ = this.katalog.find((t) => t.id === r.typ)!;
      if (senaste.status === 'utkast') {
        senaste.status = 'ersatt';
        senaste.ersattAv = nummer;
      }
      r.versioner.push(this.#nyVersion(nummer, andring.innehall, kallor.varde, typ.mallversion, metod, andring.andringsbeskrivning.trim(), session!.anvandarId));
    }
    this.#logga(session!, 'rapport_andrad', rapportId, r.organisationId, { version: r.versioner.at(-1)!.version });
    return ok(this.#vy(r));
  }

  skickaTillGranskning(session: Session | null, rapportId: string, granskare: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const v = h.varde.versioner.at(-1)!;
    if (v.status !== 'utkast') return fel('Bara utkast kan skickas till granskning');
    const typ = this.katalog.find((t) => t.id === h.varde.typ)!;
    const saknade = typ.obligatoriskaAvsnitt.filter((a) => !v.innehall.some((b) => b.rubrik === a));
    if (saknade.length) return fel(`Obligatoriska avsnitt saknas: ${saknade.join(', ')}`);
    v.status = 'under_granskning';
    v.granskare = granskare;
    this.#logga(session!, 'rapport_till_granskning', rapportId, h.varde.organisationId, { version: v.version, granskare });
    return ok(this.#vy(h.varde));
  }

  /** Granskaren markerar ett AI-utkastblock som granskat. */
  granskaBlock(session: Session | null, rapportId: string, blockId: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const v = h.varde.versioner.at(-1)!;
    if (v.status !== 'under_granskning') return fel('Versionen är inte under granskning');
    const b = v.innehall.find((x) => x.id === blockId);
    if (!b) return fel('Okänt block');
    if (b.ursprung !== 'ai_utkast') return fel('Blocket är inte ett AI-utkast');
    b.ursprung = 'ai_granskad';
    v.innehallshash = hashaInnehall(v.innehall, v.kallversioner, v.mallversion, v.berakningsmetod);
    this.#logga(session!, 'rapportblock_granskat', rapportId, h.varde.organisationId, { version: v.version, blockId });
    return ok(this.#vy(h.varde));
  }

  underkann(session: Session | null, rapportId: string, skal: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const v = h.varde.versioner.at(-1)!;
    if (v.status !== 'under_granskning') return fel('Bara en version under granskning kan underkännas');
    if (!skal.trim()) return fel('Ange skäl');
    v.status = 'utkast';
    v.underkannanden.push({ av: session!.anvandarId, tid: this.#nu(), skal: skal.trim() });
    this.#logga(session!, 'rapport_underkand', rapportId, h.varde.organisationId, { version: v.version, skal: skal.trim() });
    return ok(this.#vy(h.varde));
  }

  /**
   * Godkänner en bestämd innehållsversion. `innehallshash` måste stämma med versionen, så att
   * godkännandet inte kan avse innehåll som ändrats efter att godkännaren läste det. Ett godkänt
   * utkast i 0.x blir 1.0 (första fastställda) med samma innehåll och låst underlag.
   */
  godkann(session: Session | null, rapportId: string, innehallshash: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const r = h.varde;
    const v = r.versioner.at(-1)!;
    if (v.status !== 'under_granskning') return fel('Bara en version under granskning kan godkännas');
    if (v.innehallshash !== innehallshash) return fel('Innehållet har ändrats sedan du läste det. Läs om versionen innan du godkänner.');
    if (this.parametrar.krav4ogon && v.forfattare === session!.anvandarId) return fel('Den som skrivit versionen kan inte godkänna den');
    const ai = v.innehall.filter((b) => b.ursprung === 'ai_utkast');
    if (ai.length) return fel(`AI-genererad text är inte granskad: ${ai.map((b) => b.rubrik).join(', ')}`);
    const nu = this.#nu();
    if (v.version.startsWith('0.')) {
      // Utkastet behålls i historiken som granskat underlag; 1.0 är samma innehåll fastställt.
      v.status = 'ersatt';
      v.ersattAv = '1.0';
      const fast: Rapportversion = { ...structuredClone(v), version: '1.0', status: 'godkand', andringsbeskrivning: `Fastställd från ${v.version}`, underkannanden: [] };
      delete fast.ersattAv;
      fast.godkannare = session!.anvandarId;
      fast.godkand = { av: session!.anvandarId, tid: nu, innehallshash: v.innehallshash };
      r.versioner.push(Object.freeze(fast) as Rapportversion);
    } else {
      v.status = 'godkand';
      v.godkannare = session!.anvandarId;
      v.godkand = { av: session!.anvandarId, tid: nu, innehallshash: v.innehallshash };
    }
    this.#logga(session!, 'rapport_godkand', rapportId, r.organisationId, { version: r.versioner.at(-1)!.version, innehallshash });
    return ok(this.#vy(r));
  }

  /** Publicerar den godkända versionen. En tidigare publicerad version blir ersatt, aldrig överskriven. */
  publicera(session: Session | null, rapportId: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const r = h.varde;
    const idx = r.versioner.length - 1;
    const v = r.versioner[idx]!;
    if (v.status !== 'godkand') return fel('Bara en godkänd version kan publiceras');
    const nu = this.#nu();
    for (const tidigare of r.versioner) if (tidigare.status === 'publicerad') this.#ersattVersion(r, tidigare, v.version);
    r.versioner[idx] = Object.freeze({ ...v, status: 'publicerad', publicerad: nu }) as Rapportversion;
    this.#logga(session!, 'rapport_publicerad', rapportId, r.organisationId, { version: v.version });
    return ok(this.#vy(r));
  }

  #ersattVersion(r: Rapport, v: Rapportversion, av: string) {
    const i = r.versioner.indexOf(v);
    r.versioner[i] = Object.freeze({ ...v, status: 'ersatt', ersattAv: av }) as Rapportversion;
  }

  /**
   * Exporterar den godkända eller publicerade versionen. Samma version och format ger samma
   * kontrollsumma och filreferens; varje export registreras ändå som leverans.
   */
  exportera(session: Session | null, rapportId: string, format: Rapportformat): Resultat<Leverans> {
    const h = this.#hitta(session, rapportId, 'las');
    if (!h.ok) return h;
    const r = h.varde;
    const v = [...r.versioner].reverse().find((x) => x.status === 'publicerad' || x.status === 'godkand');
    if (!v) return fel('Det finns ingen godkänd version att exportera');
    const typ = this.katalog.find((t) => t.id === r.typ)!;
    if (!typ.format.includes(format)) return fel(`${FORMATNAMN[format]} är inte tillåtet för rapporttypen`);
    const rendering = JSON.stringify({ rapportId: r.rapportId, version: v.version, format, mallversion: v.mallversion, datatidpunkt: v.bryttidpunkt, innehallshash: v.innehallshash, innehall: v.innehall });
    const kontrollsumma = createHash('sha256').update(rendering).digest('hex');
    const tidigare = r.leveranser.find((l) => l.version === v.version && l.format === format);
    if (tidigare && tidigare.kontrollsumma !== kontrollsumma) return fel('Exporten skiljer sig från tidigare export av samma version. Ingen fil skrivs över.');
    const l: Leverans = {
      version: v.version,
      format,
      filreferens: `${r.rapportId}/v${v.version}/${format}-${kontrollsumma.slice(0, 12)}`,
      kontrollsumma,
      skapad: this.#nu(),
      skapadAv: session!.anvandarId,
      aterexport: !!tidigare,
    };
    r.leveranser.push(l);
    this.#logga(session!, 'rapport_exporterad', rapportId, r.organisationId, { version: v.version, format, kontrollsumma });
    return ok({ ...l });
  }

  /** Återkallar en publicerad version vid allvarlig felaktighet, med synlig orsak. */
  aterkalla(session: Session | null, rapportId: string, version: string, skal: string, rattadVersion?: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const r = h.varde;
    const v = r.versioner.find((x) => x.version === version);
    if (!v || v.status !== 'publicerad') return fel('Bara en publicerad version kan återkallas');
    if (skal.trim().length < 10) return fel('Beskriv orsaken till återkallelsen');
    if (rattadVersion && !r.versioner.some((x) => x.version === rattadVersion)) return fel('Den rättade versionen finns inte');
    const i = r.versioner.indexOf(v);
    r.versioner[i] = Object.freeze({ ...v, status: 'aterkallad', aterkallelse: { av: session!.anvandarId, tid: this.#nu(), skal: skal.trim(), ...(rattadVersion ? { rattadVersion } : {}) } }) as Rapportversion;
    this.#logga(session!, 'rapport_aterkallad', rapportId, r.organisationId, { version, skal: skal.trim(), rattadVersion });
    return ok(this.#vy(r));
  }

  arkivera(session: Session | null, rapportId: string, version: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const r = h.varde;
    const v = r.versioner.find((x) => x.version === version);
    if (!v || !['publicerad', 'ersatt'].includes(v.status) || !v.publicerad) return fel('Bara publicerade eller ersatta versioner kan arkiveras');
    r.versioner[r.versioner.indexOf(v)] = Object.freeze({ ...v, status: 'arkiverad' }) as Rapportversion;
    this.#logga(session!, 'rapport_arkiverad', rapportId, r.organisationId, { version });
    return ok(this.#vy(r));
  }

  /** Registrerar distribution. Inget skickas; en extern sändtjänst är inte ansluten. */
  registreraDistribution(session: Session | null, rapportId: string, mottagare: string): Resultat<Rapportvy> {
    const h = this.#hitta(session, rapportId, 'andra');
    if (!h.ok) return h;
    const v = [...h.varde.versioner].reverse().find((x) => x.status === 'publicerad');
    if (!v) return fel('Bara publicerade rapporter kan distribueras');
    h.varde.distribution.push({ tid: this.#nu(), mottagare, version: v.version, av: session!.anvandarId });
    this.#logga(session!, 'rapport_distribution_registrerad', rapportId, h.varde.organisationId, { version: v.version });
    return ok(this.#vy(h.varde));
  }

  /** Rapporter som bygger på en viss handling (alla versioner av dokumentet). */
  beroende(session: Session | null, organisationId: string, handlingsId: string): Resultat<{ rapportId: string; version: string }[]> {
    const s = this.sok(session, organisationId);
    if (!s.ok) return s;
    return ok(s.varde.flatMap((vy) => vy.rapport.versioner.filter((v) => v.kallversioner.some((k) => k.handlingsId === handlingsId)).map((v) => ({ rapportId: vy.rapport.rapportId, version: v.version }))));
  }

  #kallandring(organisationId: string, tidigare: string, nytt: string) {
    for (const r of this.#rapporter) {
      if (r.organisationId !== organisationId) continue;
      for (const v of r.versioner) {
        if (!v.kallversioner.some((k) => k.dokumentId === tidigare)) continue;
        r.varningar.push({
          tid: this.#nu(),
          version: v.version,
          dokumentId: tidigare,
          nyttDokumentId: nytt,
          text: `Källan ${tidigare} har ersatts av ${nytt}. Version ${v.version} kan vara inaktuell. ${['publicerad', 'godkand', 'ersatt', 'arkiverad', 'aterkallad'].includes(v.status) ? 'Det låsta underlaget är oförändrat.' : 'Utkastet bör uppdateras.'}`,
        });
      }
    }
  }
}
