import { randomUUID } from 'node:crypto';
import type { Granskningslogg } from '../audit/granskningslogg.js';
import type { Aktor, Avvikelse, IsoDatum, Kallposition, Kontrollresultat, Kontrollutfall } from '../domain/typer.js';
import type { Motorkorning } from '../engine/kontroller.js';
import { CHECKLISTA, RIMLIGHETSPUNKT, type Kontrollpunkt } from './checklista.js';

/**
 * Granskning av en redovisningshandling (krav Ö-20, avslutskontroll, D-04).
 *
 * Motorn ger förslag. Varje kontrollpunkt fastställs av en namngiven människa.
 * Avslut kräver att avslutsgrinden passeras: alla punkter fastställda, materiell
 * rimlighetsbedömning gjord, och inga kritiska avvikelser som tyst försvinner.
 */

export interface Punktstatus {
  punkt: Kontrollpunkt;
  foreslagetUtfall?: Kontrollutfall;
  motorresultat: Kontrollresultat[];
  faststalltUtfall?: Kontrollutfall;
  granskare?: string;
  datum?: string;
  hanvisningar: Kallposition[];
  motivering?: string;
  bedomning?: string;
}

export interface Granskningsanteckning {
  granskadHandling: string;
  period: string;
  genomfordaKontroller: string;
  identifieradeAvvikelser: string;
  kompletteringarOchSvar: string;
  sjalvstandigBedomning: string;
  kvarstaendeFragor: string;
  nastaAtgard: string;
  ansvarig: string;
}

export type Avslutsresultat = { ok: true; avslutad: string } | { ok: false; hinder: string[] };

const ALLVARLIGHETSORDNING: Kontrollutfall[] = ['avvikelse', 'kan_inte_bedomas', 'utford_utan_avvikelse', 'ej_tillamplig'];

function samladBedomning(utfall: Kontrollutfall[]): Kontrollutfall | undefined {
  for (const u of ALLVARLIGHETSORDNING) if (utfall.includes(u)) return u;
  return undefined;
}

export class Granskning {
  readonly id = randomUUID();
  readonly #punkter = new Map<string, Punktstatus>();
  readonly #avvikelser: Avvikelse[] = [];
  #korning?: Motorkorning;
  #avslutad?: string;
  #anteckning?: Granskningsanteckning;

  constructor(
    readonly arendeId: string,
    readonly redovisningId: string,
    readonly rutinversion: string,
    private readonly logg: Granskningslogg,
    private readonly klocka: () => Date = () => new Date(),
  ) {
    for (const p of CHECKLISTA) this.#punkter.set(p.id, { punkt: p, motorresultat: [], hanvisningar: [] });
    logg.registrera({ id: 'system', typ: 'system' }, 'granskning_skapad', this.id, { arendeId, redovisningId, rutinversion });
  }

  get avslutad(): boolean {
    return this.#avslutad !== undefined;
  }

  /** Läser in en motorkörning som förslag. Skapar avvikelser för varje avvikande kontroll. */
  foreslaFranMotor(korning: Motorkorning): void {
    this.#kraOppen();
    this.#korning = korning;
    for (const ps of this.#punkter.values()) {
      ps.motorresultat = korning.resultat.filter((r) => (ps.punkt.motorkontroller as string[]).includes(r.kontrollId));
      ps.foreslagetUtfall = samladBedomning(ps.motorresultat.map((r) => r.utfall));
    }
    for (const r of korning.resultat.filter((x) => x.utfall === 'avvikelse')) {
      const finns = this.#avvikelser.some((a) => a.kontrollId === r.kontrollId && a.beskrivning === r.beskrivning);
      if (finns) continue;
      this.#avvikelser.push({
        id: `AV-${this.#avvikelser.length + 1}`,
        kontrollId: r.kontrollId,
        beskrivning: r.beskrivning,
        belagg: r.belagg,
        postbeskrivning: r.postbeskrivning,
        allvarlighet: r.kontrollId === 'K-KONTOBALANS' || r.kontrollId === 'K-AGANDE' || r.kontrollId === 'K-INTERN-OVERFORING' ? 'kritisk' : 'vasentlig',
        status: 'oppen',
      });
    }
    this.logg.registrera({ id: 'redovisningsmotor', typ: 'system' }, 'motorforslag_inlast', this.id, {
      redovisningId: korning.redovisningId,
      regelversion: korning.parametrar.regelversion,
      antalResultat: korning.resultat.length,
      antalAvvikelser: this.#avvikelser.length,
    });
  }

  faststall(
    punktId: string,
    aktor: Aktor,
    beslut: { utfall: Kontrollutfall; hanvisningar?: Kallposition[]; motivering?: string; bedomning?: string },
  ): void {
    this.#kraOppen();
    this.#kraManniska(aktor);
    const ps = this.#punkter.get(punktId);
    if (!ps) throw new Error(`Okänd kontrollpunkt ${punktId}`);

    if (beslut.utfall === 'ej_tillamplig' && ps.punkt.materiell) {
      throw new Error(`${ps.punkt.rubrik} kan inte sättas till "ej tillämplig"`);
    }
    if (beslut.utfall === 'ej_tillamplig' && !beslut.motivering?.trim()) {
      throw new Error('"Ej tillämplig" kräver motivering');
    }
    if (ps.punkt.materiell && beslut.utfall !== 'kan_inte_bedomas' && !beslut.bedomning?.trim()) {
      throw new Error('Den materiella kontrollpunkten kräver en skriftlig bedömning');
    }
    // Saknat underlag får inte registreras som genomförd kontroll utan avvikelse.
    const motorAvvek = ps.foreslagetUtfall === 'avvikelse' || ps.foreslagetUtfall === 'kan_inte_bedomas';
    if (beslut.utfall === 'utford_utan_avvikelse' && motorAvvek && !beslut.motivering?.trim()) {
      throw new Error(`Motorn föreslog "${ps.foreslagetUtfall}". Ändrad bedömning kräver motivering.`);
    }
    if (beslut.utfall === 'utford_utan_avvikelse' && ps.punkt.motorkontroller.length === 0 && !beslut.hanvisningar?.length) {
      throw new Error('Genomförd kontroll kräver hänvisning till originalhandling');
    }

    ps.faststalltUtfall = beslut.utfall;
    ps.granskare = aktor.id;
    ps.datum = this.klocka().toISOString();
    ps.hanvisningar = beslut.hanvisningar ?? [];
    ps.motivering = beslut.motivering;
    ps.bedomning = beslut.bedomning;
    this.logg.registrera(aktor, 'kontrollpunkt_faststalld', this.id, {
      punktId,
      foreslaget: ps.foreslagetUtfall ?? null,
      faststallt: beslut.utfall,
      avvikerFranForslag: ps.foreslagetUtfall !== undefined && ps.foreslagetUtfall !== beslut.utfall,
    });
  }

  hanteraAvvikelse(
    avvikelseId: string,
    aktor: Aktor,
    andring:
      | { status: 'utreds'; ansvarig: string }
      | { status: 'lost'; atgard: string }
      | { status: 'overford_till_uppfoljning'; ansvarig: string; skal: string; uppfoljningsdatum: IsoDatum; atgard: string },
  ): void {
    this.#kraOppen();
    this.#kraManniska(aktor);
    const a = this.#avvikelser.find((x) => x.id === avvikelseId);
    if (!a) throw new Error(`Okänd avvikelse ${avvikelseId}`);
    a.status = andring.status;
    if (andring.status === 'utreds') a.ansvarig = andring.ansvarig;
    if (andring.status === 'lost') a.atgard = andring.atgard;
    if (andring.status === 'overford_till_uppfoljning') {
      if (!andring.skal.trim() || !andring.ansvarig.trim()) throw new Error('Överföring kräver skäl och ansvarig');
      Object.assign(a, { ansvarig: andring.ansvarig, skalForOverforing: andring.skal, uppfoljningsdatum: andring.uppfoljningsdatum, atgard: andring.atgard });
    }
    this.logg.registrera(aktor, 'avvikelse_hanterad', this.id, { avvikelseId, ...andring });
  }

  /** Kontrollerar avslutsgrinden utan att avsluta. */
  avslutshinder(anteckning?: Granskningsanteckning): string[] {
    const hinder: string[] = [];
    if (!this.#korning) hinder.push('Redovisningsmotorn har inte körts på handlingen.');
    for (const ps of this.#punkter.values()) {
      if (!ps.faststalltUtfall) hinder.push(`${ps.punkt.id} ${ps.punkt.rubrik}: inte fastställd av granskare.`);
    }
    const rimlighet = this.#punkter.get(RIMLIGHETSPUNKT)!;
    if (rimlighet.faststalltUtfall === 'kan_inte_bedomas') {
      hinder.push('Den materiella rimlighetsbedömningen är inte gjord. Begär riktad komplettering eller gör bedömningen.');
    }
    for (const a of this.#avvikelser) {
      if (a.status === 'oppen' || a.status === 'utreds') {
        hinder.push(`${a.id} (${a.allvarlighet}) är inte hanterad: ${a.beskrivning}`);
      }
    }
    if (anteckning) {
      for (const [falt, varde] of Object.entries(anteckning)) {
        if (!String(varde).trim()) hinder.push(`Granskningsanteckningen saknar "${falt}".`);
      }
    } else {
      hinder.push('Granskningsanteckning saknas.');
    }
    return hinder;
  }

  avsluta(aktor: Aktor, anteckning: Granskningsanteckning): Avslutsresultat {
    this.#kraOppen();
    this.#kraManniska(aktor);
    const hinder = this.avslutshinder(anteckning);
    if (hinder.length > 0) {
      this.logg.registrera(aktor, 'avslut_nekat', this.id, { hinder });
      return { ok: false, hinder };
    }
    this.#anteckning = structuredClone(anteckning);
    this.#avslutad = this.klocka().toISOString();
    this.logg.registrera(aktor, 'granskning_avslutad', this.id, { anteckning });
    return { ok: true, avslutad: this.#avslutad };
  }

  punkter(): Punktstatus[] {
    return [...this.#punkter.values()].map((p) => structuredClone(p));
  }

  avvikelser(): Avvikelse[] {
    return this.#avvikelser.map((a) => structuredClone(a));
  }

  anteckning(): Granskningsanteckning | undefined {
    return this.#anteckning && structuredClone(this.#anteckning);
  }

  #kraOppen(): void {
    if (this.#avslutad) throw new Error('Granskningen är avslutad. Rättelse görs som ny spårbar händelse.');
  }

  #kraManniska(aktor: Aktor): void {
    if (aktor.typ !== 'manniska') throw new Error('Endast en människa får fastställa granskningsmoment');
  }
}
