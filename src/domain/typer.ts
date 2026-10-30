/**
 * Gemensam informationsstruktur (krav T-01).
 *
 * Objekten hålls åtskilda: ärende, uppdrag, personroll, handling, extraherad
 * uppgift, kontrollresultat, avvikelse, beslut, expediering och regel.
 * Belopp lagras alltid som heltal i öre för att undvika flyttalsfel.
 */

export type Doman = 'overformyndare' | 'val';

export type Arendetyp =
  | 'forordnande'
  | 'tillsyn'
  | 'redovisningsgranskning'
  | 'disposition'
  | 'arvode'
  | 'insyn';

/** Uppdragskategorier hålls isär (krav Ö-01). */
export type Uppdragskategori =
  | 'godmanskap'
  | 'forvaltarskap'
  | 'formynderskap'
  | 'framtidsfullmakt'
  | 'anhorigbehorighet';

/** Öre som heltal. Positivt = inbetalning, negativt = utbetalning. */
export type Ore = number;

/** ISO-datum, ÅÅÅÅ-MM-DD. */
export type IsoDatum = string;

/**
 * Status för en utläst uppgift. "saknas", "olaslig" och "ej_tillampligt" är
 * olika tillstånd och får aldrig tolkas som noll (krav Ö-20 steg 3, T-01).
 */
export type Uppgiftsstatus =
  | 'verifierad'
  | 'utlast_ej_verifierad'
  | 'olaslig'
  | 'saknas'
  | 'ej_tillampligt';

export interface Kallposition {
  handlingId: string;
  sida?: number;
  /** Fri beskrivning av platsen i handlingen, t.ex. "rad 4, kolumn Belopp". */
  plats?: string;
}

/**
 * En uppgift ur en handling. Originalvärdet sparas alltid. `varde` är bara satt
 * när uppgiften gått att läsa; den räknas först när status är "verifierad".
 */
export interface Uppgift<T> {
  originalvarde: string;
  varde: T | null;
  status: Uppgiftsstatus;
  kalla: Kallposition;
  verifieradAv?: string;
  verifieradTid?: string;
}

export interface Period {
  fran: IsoDatum;
  till: IsoDatum;
}

export interface Uppdrag {
  id: string;
  kategori: Uppdragskategori;
  huvudmanId: string;
  stallforetradareId: string;
  /** Omfattning enligt förordnandet, t.ex. "bevaka rätt, förvalta egendom". */
  omfattning: string[];
  giltigFran: IsoDatum;
  giltigTill?: IsoDatum;
  beslutsreferens: string;
}

export interface Arende {
  id: string;
  doman: Doman;
  typ: Arendetyp;
  uppdragId: string;
  huvudmanId: string;
  agare?: string;
  status: import('../arende/status.js').Arendestatus;
  mottaget: string;
  senasteMateriellaAktivitet?: string;
}

export interface Handling {
  id: string;
  arendeId: string | null;
  checksumma: string;
  ankomsttid: string;
  avsandare: string;
  typ: string;
  lasstatus: 'last' | 'delvis_olaslig' | 'olaslig';
  /** Personkoppling som avsändaren uppger respektive som verifierats. */
  uppgivenPersonId?: string;
  uppgivetNamn?: string;
  verifieradPersonId?: string;
}

export type Kontrollutfall =
  | 'utford_utan_avvikelse'
  | 'avvikelse'
  | 'kan_inte_bedomas'
  | 'ej_tillamplig';

export interface Kontrollresultat {
  kontrollId: string;
  regelId: string;
  regelversion: string;
  utfall: Kontrollutfall;
  beskrivning: string;
  /** Avser konto, tillgång eller transaktion när kontrollen gäller en enskild post. */
  avser?: string;
  belagg: Kallposition[];
  /** Deterministiskt beräknade värden som ligger till grund för utfallet. */
  berakning?: Record<string, number | string>;
  /**
   * Neutral beskrivning av berörd post för brev till ställföreträdaren, utan
   * interna arbetsinstruktioner, t.ex. 'posten "Kontantuttag" 2026-06-14, -1 350,00 kr'.
   */
  postbeskrivning?: string;
}

export type Avvikelsestatus = 'oppen' | 'utreds' | 'lost' | 'overford_till_uppfoljning';

export interface Avvikelse {
  id: string;
  kontrollId: string;
  beskrivning: string;
  belagg: Kallposition[];
  postbeskrivning?: string;
  allvarlighet: 'kritisk' | 'vasentlig' | 'mindre';
  status: Avvikelsestatus;
  ansvarig?: string;
  atgard?: string;
  uppfoljningsdatum?: IsoDatum;
  /** Skäl när avvikelsen förs vidare i stället för att lösas. */
  skalForOverforing?: string;
}

/** Aktör som utför en handling i systemet. AI och system kan aldrig besluta. */
export interface Aktor {
  id: string;
  typ: 'manniska' | 'system' | 'ai';
}
