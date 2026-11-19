/**
 * Portar: de gränssnitt som backend behöver mot omvärlden. Domänlogiken i ../src är redan
 * skriven för att kunna ligga bakom valfri persistens. Varje port här ska få en verklig
 * adapter (t.ex. Dataverse, Postgres, SharePoint, Entra ID). Inget är valt ännu, se
 * docs/backend.md, avsnittet "Öppna beslut".
 *
 * Endast typer. Ingen adapter finns, och inget i denna fil ansluter till något.
 */
import type {
  Arende,
  Granskningshandelse,
  Inbjudan,
  Lead,
  Medlemskap,
  Organisation,
  Projekt,
  Regelkort,
  Redovisning,
  Session,
} from '../../src/index.js';

// --- B-01 Identitet och session -------------------------------------------------------

/** Verifierad identitet från en extern identitetstjänst. Backend skapar sessionen, aldrig klienten. */
export interface VerifieradIdentitet {
  /** Stabilt id hos identitetstjänsten (t.ex. Entra ID objekt-id, eller hash av personnummer för e-legitimation). */
  externtId: string;
  metod: Session['metod'];
  namn: string;
  epost?: string;
}

export interface Identitetstjanst {
  /** Startar inloggning och returnerar adressen klienten ska skickas till. */
  paborja(metod: Session['metod'], aterkomst: string): Promise<{ omdirigering: string; tillstand: string }>;
  /** Tar emot svaret från identitetstjänsten och verifierar det. */
  slutfor(tillstand: string, svar: Record<string, string>): Promise<VerifieradIdentitet>;
}

export interface Sessionslager {
  skapa(anvandarId: string, identitet: VerifieradIdentitet): Promise<{ sessionId: string; session: Session; gallerTill: string }>;
  hamta(sessionId: string): Promise<Session | null>;
  avsluta(sessionId: string): Promise<void>;
}

// --- Lagring --------------------------------------------------------------------------

/** Optimistisk låsning: varje skrivning anger den version den läste. */
export interface Versionerad<T> {
  varde: T;
  version: number;
}

export interface Forrad<T, Id = string> {
  hamta(id: Id): Promise<Versionerad<T> | null>;
  spara(id: Id, varde: T, forvantadVersion: number | null): Promise<{ ok: true; version: number } | { ok: false; konflikt: true }>;
}

/** Plattformsdata (B-03–B-06). Ska vara kundavskilt: varje fråga filtreras på organisationId. */
export interface Plattformslager {
  organisationer: Forrad<Organisation>;
  medlemskap: { listaForAnvandare(anvandarId: string): Promise<Medlemskap[]>; listaForOrganisation(organisationId: string): Promise<Medlemskap[]> } & Forrad<Medlemskap, `${string}:${string}`>;
  projekt: { listaForOrganisation(organisationId: string): Promise<Projekt[]> } & Forrad<Projekt>;
  /** Kundresan sparas som serialiserat tillstånd per projekt tills datamodellen är beslutad. */
  kundresor: Forrad<unknown>;
  inbjudningar: Forrad<Inbjudan>;
  leads: Forrad<Lead>;
}

/**
 * Överförmyndardata (B-07–B-11). Ska ligga skilt från valdata och från CRM (PM: domänseparation).
 * Om det blir separata databaser, scheman eller bara separata tabeller är en öppen fråga.
 */
export interface Overformyndarlager {
  arenden: { sok(fraga: { organisationId: string; status?: Arende['status']; agare?: string }): Promise<Arende[]> } & Forrad<Arende>;
  redovisningar: Forrad<Redovisning>;
  /** Granskning, komplettering och behovsbevakning sparas som händelser eller tillstånd, se B-08. */
  granskningar: Forrad<unknown>;
  kompletteringar: Forrad<unknown>;
  behovsbevakningar: Forrad<unknown>;
  regelkort: { listaGallande(datum: string): Promise<Regelkort[]> } & Forrad<Regelkort>;
}

// --- B-12 Granskningslogg -------------------------------------------------------------

/** Append-only. Lagret får inte erbjuda ändring eller radering. */
export interface Logglager {
  lagg(handelse: Granskningshandelse): Promise<void>;
  senaste(): Promise<Granskningshandelse | null>;
  lasa(filter: { objektId?: string; organisationId?: string; fran?: string; till?: string }): AsyncIterable<Granskningshandelse>;
}

// --- B-16 Dokument och original -------------------------------------------------------

/** Originalarkiv: skriv en gång, läs många. Ingen metod skriver över eller raderar. */
export interface Originalarkiv {
  lagra(organisationId: string, sha256: string, innehall: Uint8Array, metadata: Record<string, string>): Promise<{ arkivreferens: string }>;
  oppna(organisationId: string, arkivreferens: string): Promise<Uint8Array>;
}

export interface Virusskanner {
  readonly namn: string;
  skanna(innehall: Uint8Array): Promise<'ren' | 'skadlig' | 'ej_utford'>;
}

// --- B-09 och B-17 Utskick och diarium ------------------------------------------------

export interface Utskickstjanst {
  /** Skickar ett godkänt brev eller meddelande. Anropas bara efter mänskligt godkännande. */
  skicka(kanal: 'brev' | 'epost' | 'digital_brevlada', mottagare: string, amne: string, innehall: string, bilagor?: { namn: string; innehall: Uint8Array }[]): Promise<{ utskicksId: string; tid: string }>;
}

export interface Diariekoppling {
  /** Begär registrering i kommunens eller kundens diarium. Svaret kommer asynkront. */
  begarRegistrering(arende: { id: string; rubrik: string; organisationId: string }): Promise<{ begaranId: string }>;
}

// --- B-19 AI och utläsning ------------------------------------------------------------

/** Utläsning av inskannade handlingar. Resultat får status utlast_ej_verifierad och räknas aldrig på direkt. */
export interface Utlasningstjanst {
  lasUt(dokument: Uint8Array, mime: string): Promise<{ falt: { namn: string; varde: string; sakerhet: number; position?: string }[]; modell: string; version: string }>;
}

// --- B-20 Schemalagda jobb ------------------------------------------------------------

export interface Schemalaggare {
  registrera(namn: string, cron: string, jobb: () => Promise<void>): void;
}

/** Allt backend behöver, samlat. Byggs i server.ts när adaptrarna finns. */
export interface Beroenden {
  identitet: Identitetstjanst;
  sessioner: Sessionslager;
  plattform: Plattformslager;
  overformyndare: Overformyndarlager;
  logg: Logglager;
  arkiv: Originalarkiv;
  skanner: Virusskanner;
  utskick: Utskickstjanst;
  diarium: Diariekoppling;
  utlasning?: Utlasningstjanst;
  schema: Schemalaggare;
  klocka: () => Date;
}
