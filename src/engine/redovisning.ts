import type { IsoDatum, Kallposition, Ore, Period, Uppgift } from '../domain/typer.js';

/** Indatamodell för en årsräkning, slutredovisning eller förteckning (krav Ö-14, Ö-20). */

export type Handlingstyp = 'arsrakning' | 'slutredovisning' | 'forteckning';

export interface Konto {
  id: string;
  benamning: string;
  /** Maskerat kontonummer; används för att upptäcka samma konto under olika namn. */
  kontonummer: string;
  bank: string;
  agare: 'huvudman' | 'annan';
  omfattasAvForvaltningen: boolean;
  sarskildForvaltning?: boolean;
}

export interface Kontosaldo {
  kontoId: string;
  ingaende: Uppgift<Ore>;
  utgaende: Uppgift<Ore>;
  /** Saldo enligt bankbesked på periodens sista dag. */
  enligtBankbesked?: Uppgift<Ore>;
  bankbeskedDatum?: IsoDatum;
}

export type Transaktionskategori =
  | 'inkomst'
  | 'utgift'
  | 'intern_overforing'
  | 'avgift'
  | 'okand';

export interface Transaktion {
  id: string;
  kontoId: string;
  datum: Uppgift<IsoDatum>;
  /** Positivt = inbetalning, negativt = utbetalning. */
  belopp: Uppgift<Ore>;
  text: string;
  kategori: Transaktionskategori;
  /** Bankens transaktionsreferens om den finns. */
  referens?: string;
  /** Checksumma för den stödhandling posten bygger på. */
  underlagChecksumma?: string;
  /** Satt när posten enligt kontrollregel kan kräva överförmyndarens samtycke. */
  kanKravaSamtycke?: boolean;
  beslutId?: string;
}

export type Varderingstyp = 'saldo' | 'marknadsvarde' | 'anskaffningsvarde' | 'taxeringsvarde';

export interface OvrigTillgang {
  id: string;
  beskrivning: string;
  varde: Uppgift<Ore>;
  varderingstyp?: Varderingstyp;
  varderingsdatum?: IsoDatum;
}

export interface Skuld {
  id: string;
  borgenar: string;
  belopp: Uppgift<Ore>;
  datum?: IsoDatum;
}

export interface Redovisning {
  id: string;
  arendeId: string;
  handlingstyp: Handlingstyp;
  period: Period;
  konton: Konto[];
  saldon: Kontosaldo[];
  transaktioner: Transaktion[];
  ovrigaTillgangar: OvrigTillgang[];
  skulder: Skuld[];
  /** Föregående verifierade utgående saldo per konto-id (från förra årets granskning). */
  foregaendeVerifieradBalans?: Record<string, { belopp: Ore; kalla: Kallposition }>;
}

/**
 * Beslutade parametrar. Toleranser ligger aldrig dolda i koden utan är
 * ett lokalt beslut med motivering (Ö-20 stoppregel).
 */
export interface Granskningsparametrar {
  regelversion: string;
  toleransOre: Ore;
  toleransMotivering: string;
  /** Högsta antal dagar mellan uttag och insättning för att matcha en intern överföring. */
  overforingMaxDagar: number;
}

export const STANDARDPARAMETRAR: Granskningsparametrar = {
  regelversion: 'ELSA-OF-KONTROLL 0.1.0 (ej juridiskt verifierad)',
  toleransOre: 0,
  toleransMotivering: 'Ingen tolerans är beslutad. Varje differens visas.',
  overforingMaxDagar: 3,
};
