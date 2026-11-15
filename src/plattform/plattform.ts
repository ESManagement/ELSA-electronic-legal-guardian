/**
 * Plattformstjänsten: den enda vägen till organisationer, projekt, kundresor och
 * CRM. Varje anrop prövar behörigheten själv, så ett direkt anrop som kringgår
 * gränssnittet nekas på samma sätt (avsnitt 8: "även via direkta anrop").
 *
 * Lagring är i minnet. Persistens (t.ex. Dataverse/SharePoint) är inte vald och
 * ska läggas bakom samma metoder.
 */
import { Granskningslogg, type Granskningshandelse } from '../audit/granskningslogg.js';
import {
  effektivaModuler,
  medlemskapFor,
  provaPlattformsatkomst,
  type Plattformsbeslut,
  type Medlemskap,
  type Operation,
  type Organisation,
  type Plattformsroll,
  type Session,
} from './atkomst.js';
import { kontrolleraEpost, kontrolleraOrgnr, tillatenCrmovergang, type Crmsteg, type Demotyp, type Inbjudan, type Klickhandelse, type Kontaktkalla, type Lead } from './crm.js';
import { foljUpp, Kundresa, METODSTEG, visningsnamn, type Aktorsreferens, type Nyckeltal, type Resultat, type Stegtillstand, type Uppfoljning } from './metod.js';
import { hamtaModul, type VertikalId } from './modulregister.js';

export interface Anvandarkonto {
  id: string;
  namn: string;
}

export interface Projekt {
  id: string;
  organisationId: string;
  namn: string;
  vertikal: VertikalId;
  moduler: string[];
  teamId?: string;
  demo: boolean;
}

export interface Kundresevy {
  projektId: string;
  vertikal: VertikalId;
  godkantForGenomforande: boolean;
  startbara: number[];
  steg: (Stegtillstand & { namn: string; visningsnamn: string; hinder: string | null })[];
  nyckeltal: Nyckeltal[];
  uppfoljning: Uppfoljning[];
}

const fel = (skal: string): { ok: false; skal: string } => ({ ok: false, skal });
const ok = <T>(varde: T): { ok: true; varde: T } => ({ ok: true, varde });
const manniska = (s: Session): Aktorsreferens => ({ id: s.anvandarId, typ: 'manniska' });

export class Plattform {
  readonly logg: Granskningslogg;
  #org: Organisation[] = [];
  #medlemskap: Medlemskap[] = [];
  #konton: Anvandarkonto[] = [];
  #projekt: Projekt[] = [];
  #kundresor = new Map<string, Kundresa>();
  #leads: Lead[] = [];
  #inbjudningar: Inbjudan[] = [];
  #klick: Record<Klickhandelse, number> = { pris: 0, referenser: 0, boka_demo: 0, se_elsa_start: 0, sok: 0 };
  #lopnr = 0;

  constructor(private readonly klocka: () => Date = () => new Date()) {
    this.logg = new Granskningslogg(klocka);
  }

  #id(prefix: string) {
    this.#lopnr += 1;
    return `${prefix}-${this.#lopnr}`;
  }

  #prova(session: Session | null, organisationId: string, operation: Operation, modulId?: string, projekt?: Projekt): Plattformsbeslut {
    return provaPlattformsatkomst(session, { organisationId, operation, ...(modulId ? { modulId } : {}), ...(projekt ? { projekt } : {}) }, this.#org, this.#medlemskap);
  }

  #logga(session: Session, handelse: string, objektId: string, organisationId: string, data: Record<string, unknown> = {}) {
    this.logg.registrera(manniska(session), handelse, objektId, { organisationId, ...data });
  }

  // --- Uppsättning (används av demo och tester; i drift via avtal och inbjudan) ---

  seed(data: { organisationer: Organisation[]; konton: Anvandarkonto[]; medlemskap: Medlemskap[]; projekt?: Projekt[] }) {
    this.#org.push(...structuredClone(data.organisationer));
    this.#konton.push(...structuredClone(data.konton));
    this.#medlemskap.push(...structuredClone(data.medlemskap));
    for (const p of data.projekt ?? []) {
      this.#projekt.push(structuredClone(p));
      this.#kundresor.set(p.id, new Kundresa(p.id, p.vertikal, this.klocka));
    }
  }

  /** Ger tillgång till kundresan för demons förifyllda data. Används inte av gränssnittets åtgärder. */
  seedKundresa(projektId: string, fn: (k: Kundresa) => void) {
    const k = this.#kundresor.get(projektId);
    if (k) fn(k);
  }

  // --- Läsning av egen kontext ---

  /** Organisationer som sessionen är aktiv medlem i. */
  minaOrganisationer(session: Session | null): { organisation: Organisation; roll: Plattformsroll; moduler: string[] }[] {
    if (!session) return [];
    return this.#medlemskap
      .filter((m) => m.anvandarId === session.anvandarId && m.aktiv)
      .map((m) => {
        const organisation = this.#org.find((o) => o.id === m.organisationId)!;
        return { organisation: structuredClone(organisation), roll: m.roll, moduler: effektivaModuler(organisation, m) };
      });
  }

  /** Modulåtkomst för en användare i en organisation, för katalogens låsmarkering. */
  modulatkomst(session: Session | null, organisationId: string, modulId: string): Plattformsbeslut {
    return this.#prova(session, organisationId, 'las', modulId);
  }

  // --- Projekt ---

  listaProjekt(session: Session | null, organisationId: string, modulId?: string): Resultat<Projekt[]> {
    const b = this.#prova(session, organisationId, 'las');
    if (!b.tillats) return fel(b.skal);
    const ut = this.#projekt.filter(
      (p) => p.organisationId === organisationId && (!modulId || p.moduler.includes(modulId)) && this.#provaProjekt(session, p, 'las').tillats,
    );
    return ok(structuredClone(ut));
  }

  #provaProjekt(session: Session | null, p: Projekt, operation: Operation, modulId?: string): Plattformsbeslut {
    // Projektet kräver åtkomst till minst en av sina moduler (eller den angivna).
    if (modulId) return this.#prova(session, p.organisationId, operation, modulId, p);
    let senaste: Plattformsbeslut = { tillats: false, skal: 'Projektet saknar moduler' };
    for (const m of p.moduler) {
      senaste = this.#prova(session, p.organisationId, operation, m, p);
      if (senaste.tillats) return senaste;
    }
    return senaste;
  }

  hamtaProjekt(session: Session | null, projektId: string): Resultat<Projekt> {
    const p = this.#projekt.find((x) => x.id === projektId);
    // Samma svar för okänt och otillåtet projekt, så att andra kunders projekt-id inte kan avslöjas.
    if (!p) return fel('Projektet finns inte eller du saknar behörighet');
    const b = this.#provaProjekt(session, p, 'las');
    if (!b.tillats) return fel('Projektet finns inte eller du saknar behörighet');
    return ok(structuredClone(p));
  }

  /**
   * Prövar en operation på ett uppdrag (projekt) åt andra plattformstjänster, t.ex. dokumentmottagning och
   * rapportregister. Okänt och otillåtet uppdrag ger samma svar, så att andra kunders id inte avslöjas.
   */
  provaUppdrag(session: Session | null, projektId: string, operation: Operation): Resultat<Projekt> {
    const p = this.#projekt.find((x) => x.id === projektId);
    if (!p) return fel('Uppdraget finns inte eller du saknar behörighet');
    const las = this.#provaProjekt(session, p, 'las');
    if (!las.tillats) return fel('Uppdraget finns inte eller du saknar behörighet');
    if (operation !== 'las') {
      const b = this.#provaProjekt(session, p, operation);
      if (!b.tillats) return fel(b.skal);
    }
    return ok(structuredClone(p));
  }

  /** Prövar en operation på organisationsnivå åt andra plattformstjänster. */
  provaOrganisation(session: Session | null, organisationId: string, operation: Operation): Plattformsbeslut {
    return this.#prova(session, organisationId, operation);
  }

  /** Roll i en organisation för en aktiv medlem, annars null. */
  rollI(session: Session | null, organisationId: string): Plattformsroll | null {
    if (!session) return null;
    const m = medlemskapFor(this.#medlemskap, session.anvandarId, organisationId);
    return m?.aktiv ? m.roll : null;
  }

  skapaProjekt(session: Session | null, organisationId: string, namn: string, vertikal: VertikalId, moduler: string[], teamId?: string): Resultat<Projekt> {
    if (!namn.trim()) return fel('Projektnamn krävs');
    if (!moduler.length) return fel('Minst en modul krävs');
    for (const m of moduler) {
      if (!hamtaModul(m)) return fel(`Okänd modul ${m}`);
      const b = this.#prova(session, organisationId, 'andra', m);
      if (!b.tillats) return fel(b.skal);
    }
    const org = this.#org.find((o) => o.id === organisationId)!;
    if (teamId && !org.team.some((t) => t.id === teamId)) return fel('Okänt team');
    const p: Projekt = { id: this.#id('PRJ'), organisationId, namn: namn.trim(), vertikal, moduler: [...new Set(moduler)], demo: org.demo, ...(teamId ? { teamId } : {}) };
    this.#projekt.push(p);
    this.#kundresor.set(p.id, new Kundresa(p.id, vertikal, this.klocka));
    this.#logga(session!, 'projekt_skapat', p.id, organisationId, { moduler: p.moduler });
    return ok(structuredClone(p));
  }

  kopplaModul(session: Session | null, projektId: string, modulId: string): Resultat {
    const p = this.#projekt.find((x) => x.id === projektId);
    if (!p) return fel('Projektet finns inte eller du saknar behörighet');
    if (!hamtaModul(modulId)) return fel('Okänd modul');
    const b1 = this.#provaProjekt(session, p, 'andra');
    if (!b1.tillats) return fel(b1.skal);
    const b2 = this.#prova(session, p.organisationId, 'andra', modulId, p);
    if (!b2.tillats) return fel(b2.skal);
    if (!p.moduler.includes(modulId)) p.moduler.push(modulId);
    this.#logga(session!, 'modul_kopplad', p.id, p.organisationId, { modulId });
    return ok(undefined);
  }

  // --- Kundresa ---

  lasKundresa(session: Session | null, projektId: string): Resultat<Kundresevy> {
    const p = this.hamtaProjekt(session, projektId);
    if (!p.ok) return p;
    const k = this.#kundresor.get(projektId)!;
    return ok({
      projektId,
      vertikal: k.vertikal,
      godkantForGenomforande: k.godkantForGenomforande,
      startbara: k.startbara(),
      steg: METODSTEG.map((m) => ({ ...k.stegtillstand(m.nr), namn: m.namn, visningsnamn: visningsnamn(m.nr, k.vertikal), hinder: k.hinderForStart(m.nr) })),
      nyckeltal: structuredClone(k.nyckeltal),
      uppfoljning: k.nyckeltal.map(foljUpp),
    });
  }

  /**
   * Ändring i kundresan. Prövar "ändra" på projektet innan åtgärden körs, och
   * loggar resultatet. Kundgodkännande i steg 11 kräver dessutom administratör
   * i kundorganisationen.
   */
  andraKundresa<T>(session: Session | null, projektId: string, beskrivning: string, atgard: (k: Kundresa, aktor: Aktorsreferens) => Resultat<T>, kraver: 'redigerare' | 'kundadministrator' = 'redigerare'): Resultat<T> {
    const p = this.#projekt.find((x) => x.id === projektId);
    if (!p) return fel('Projektet finns inte eller du saknar behörighet');
    const b = this.#provaProjekt(session, p, kraver === 'kundadministrator' ? 'administrera' : 'andra');
    if (!b.tillats) return fel(b.skal);
    if (kraver === 'kundadministrator' && this.#org.find((o) => o.id === p.organisationId)?.typ !== 'kund')
      return fel('Kundgodkännande måste lämnas av kundens administratör');
    const r = atgard(this.#kundresor.get(projektId)!, manniska(session!));
    this.#logga(session!, r.ok ? 'kundresa_andrad' : 'kundresa_nekad', projektId, p.organisationId, { beskrivning, ...(r.ok ? {} : { skal: r.skal }) });
    return r;
  }

  // --- Administration inom egen organisation ---

  #admin(session: Session | null, organisationId: string): Plattformsbeslut {
    return this.#prova(session, organisationId, 'administrera');
  }

  listaMedlemmar(session: Session | null, organisationId: string): Resultat<(Medlemskap & { namn: string })[]> {
    const b = this.#admin(session, organisationId);
    if (!b.tillats) return fel(b.skal);
    return ok(
      this.#medlemskap
        .filter((m) => m.organisationId === organisationId)
        .map((m) => ({ ...structuredClone(m), namn: this.#konton.find((k) => k.id === m.anvandarId)?.namn ?? m.anvandarId })),
    );
  }

  sattRoll(session: Session | null, organisationId: string, anvandarId: string, roll: Plattformsroll): Resultat {
    const b = this.#admin(session, organisationId);
    if (!b.tillats) return fel(b.skal);
    const m = medlemskapFor(this.#medlemskap, anvandarId, organisationId);
    if (!m) return fel('Användaren är inte medlem i organisationen');
    if (anvandarId === session!.anvandarId && roll !== 'administrator' && this.#antalAdmin(organisationId) <= 1)
      return fel('Organisationen måste ha minst en aktiv administratör');
    m.roll = roll;
    this.#logga(session!, 'roll_andrad', anvandarId, organisationId, { roll });
    return ok(undefined);
  }

  #antalAdmin(organisationId: string) {
    return this.#medlemskap.filter((m) => m.organisationId === organisationId && m.roll === 'administrator' && m.aktiv).length;
  }

  tilldelaModuler(session: Session | null, organisationId: string, anvandarId: string, moduler: string[]): Resultat {
    const b = this.#admin(session, organisationId);
    if (!b.tillats) return fel(b.skal);
    const org = this.#org.find((o) => o.id === organisationId)!;
    const utanforAvtal = moduler.filter((x) => !org.moduler.includes(x));
    if (utanforAvtal.length) return fel(`Modulen ingår inte i organisationens avtal: ${utanforAvtal.join(', ')}`);
    const m = medlemskapFor(this.#medlemskap, anvandarId, organisationId);
    if (!m) return fel('Användaren är inte medlem i organisationen');
    m.moduler = [...new Set(moduler)];
    this.#logga(session!, 'moduler_tilldelade', anvandarId, organisationId, { moduler: m.moduler });
    return ok(undefined);
  }

  stangAv(session: Session | null, organisationId: string, anvandarId: string, aktiv: boolean): Resultat {
    const b = this.#admin(session, organisationId);
    if (!b.tillats) return fel(b.skal);
    const m = medlemskapFor(this.#medlemskap, anvandarId, organisationId);
    if (!m) return fel('Användaren är inte medlem i organisationen');
    if (!aktiv && m.roll === 'administrator' && this.#antalAdmin(organisationId) <= 1) return fel('Organisationen måste ha minst en aktiv administratör');
    m.aktiv = aktiv;
    this.#logga(session!, aktiv ? 'konto_aktiverat' : 'konto_avstangt', anvandarId, organisationId);
    return ok(undefined);
  }

  /** Administratör bjuder in. Inbjudan blir ett utkast; utskick finns inte i den här versionen. */
  bjudIn(session: Session | null, organisationId: string, epost: string, roll: Plattformsroll, moduler: string[]): Resultat<Inbjudan> {
    const b = this.#admin(session, organisationId);
    if (!b.tillats) return fel(b.skal);
    if (!kontrolleraEpost(epost)) return fel('Ogiltig e-postadress');
    const org = this.#org.find((o) => o.id === organisationId)!;
    const utanforAvtal = moduler.filter((x) => !org.moduler.includes(x));
    if (utanforAvtal.length) return fel(`Modulen ingår inte i organisationens avtal: ${utanforAvtal.join(', ')}`);
    const inb = this.#skapaInbjudan(session!, organisationId, epost, roll, moduler);
    return ok(structuredClone(inb));
  }

  #skapaInbjudan(session: Session, organisationId: string, epost: string, roll: Plattformsroll, moduler: string[]): Inbjudan {
    const org = this.#org.find((o) => o.id === organisationId)!;
    const inb: Inbjudan = {
      id: this.#id('INB'),
      organisationId,
      epost: epost.trim(),
      roll,
      moduler: [...moduler],
      status: 'utkast',
      skapadAv: session.anvandarId,
      forhandsgranskning: `Du är inbjuden till ELSA för ${org.namn} som ${roll}. Moduler: ${moduler.map((x) => hamtaModul(x)?.namn ?? x).join(', ') || 'inga'}.`,
    };
    this.#inbjudningar.push(inb);
    this.#logga(session, 'inbjudan_utkast', inb.id, organisationId, { roll });
    return inb;
  }

  aktivitetslogg(session: Session | null, organisationId: string): Resultat<Granskningshandelse[]> {
    const b = this.#admin(session, organisationId);
    if (!b.tillats) return fel(b.skal);
    return ok(this.logg.handelser().filter((h) => h.data['organisationId'] === organisationId));
  }

  // --- Webbplats och CRM ---

  /** Offentlig: räknare utan personuppgifter. */
  registreraKlick(typ: Klickhandelse) {
    this.#klick[typ] += 1;
  }

  /** Offentlig: demobokning, kontaktformulär eller offertförfrågan från webbplatsen. */
  tavInKontakt(data: {
    organisation: string;
    kontakt: { namn: string; epost: string; roll?: string };
    kalla: Exclude<Kontaktkalla, 'manuell'>;
    vertikal?: string;
    moduler?: string[];
    demotyp?: Demotyp;
    orgnr?: string;
    meddelande?: string;
  }): Resultat<{ id: string }> {
    if (!data.organisation.trim()) return fel('Organisation krävs');
    if (!data.kontakt.namn.trim()) return fel('Namn krävs');
    if (!kontrolleraEpost(data.kontakt.epost)) return fel('Ogiltig e-postadress');
    if (data.kalla === 'boka_demo' && !data.demotyp) return fel('Välj typ av demo');
    let orgnr: string | undefined;
    if (data.orgnr) {
      const o = kontrolleraOrgnr(data.orgnr);
      if (!o.ok) return fel(o.skal);
      orgnr = o.normaliserat;
    }
    if (data.kalla === 'offertforfragan') {
      if (!orgnr) return fel('Organisationsnummer krävs för offertförfrågan');
      if (!data.moduler?.length) return fel('Välj minst en modul');
    }
    for (const m of data.moduler ?? []) if (!hamtaModul(m)) return fel(`Okänd modul ${m}`);
    const steg: Crmsteg = data.kalla === 'boka_demo' ? 'demo_bokad' : 'lead';
    const lead: Lead = {
      id: this.#id('LEAD'),
      steg,
      organisation: data.organisation.trim(),
      ...(orgnr ? { orgnr, orgnrKalla: 'angiven_av_kund' as const } : {}),
      kontakt: { namn: data.kontakt.namn.trim(), epost: data.kontakt.epost.trim(), ...(data.kontakt.roll ? { roll: data.kontakt.roll } : {}) },
      ...(data.vertikal ? { vertikal: data.vertikal } : {}),
      moduler: [...new Set(data.moduler ?? [])],
      ...(data.demotyp ? { demotyp: data.demotyp } : {}),
      kalla: data.kalla,
      datum: this.klocka().toISOString(),
      ...(data.meddelande ? { meddelande: data.meddelande.slice(0, 2000) } : {}),
      historik: [{ tid: this.klocka().toISOString(), av: 'webbplats', fran: null, till: steg }],
    };
    this.#leads.push(lead);
    if (data.kalla === 'boka_demo') this.#klick.boka_demo += 1;
    return ok({ id: lead.id });
  }

  #esm(session: Session | null, operation: Operation): Plattformsbeslut {
    const esm = this.#org.find((o) => o.typ === 'esm');
    if (!esm) return { tillats: false, skal: 'ESM-organisationen saknas' };
    return this.#prova(session, esm.id, operation);
  }

  listaLeads(session: Session | null): Resultat<Lead[]> {
    const b = this.#esm(session, 'las');
    if (!b.tillats) return fel(b.skal);
    return ok(structuredClone(this.#leads));
  }

  klickstatistik(session: Session | null): Resultat<Record<Klickhandelse, number>> {
    const b = this.#esm(session, 'las');
    if (!b.tillats) return fel(b.skal);
    return ok({ ...this.#klick });
  }

  uppdateraLead(session: Session | null, leadId: string, andring: { ansvarig?: string; nastaSteg?: string }): Resultat {
    const b = this.#esm(session, 'andra');
    if (!b.tillats) return fel(b.skal);
    const l = this.#leads.find((x) => x.id === leadId);
    if (!l) return fel('Okänd lead');
    if (andring.ansvarig !== undefined) l.ansvarig = andring.ansvarig;
    if (andring.nastaSteg !== undefined) l.nastaSteg = andring.nastaSteg;
    return ok(undefined);
  }

  /**
   * Flytta en lead i CRM. Vid avtal skapas kundorganisationen med avtalade
   * moduler och ett inbjudningsutkast till kundens administratör.
   */
  flyttaLead(session: Session | null, leadId: string, till: Crmsteg, extra: { avtalsreferens?: string; skal?: string } = {}): Resultat {
    const b = this.#esm(session, 'andra');
    if (!b.tillats) return fel(b.skal);
    const l = this.#leads.find((x) => x.id === leadId);
    if (!l) return fel('Okänd lead');
    if (!tillatenCrmovergang(l.steg, till)) return fel(`Otillåten övergång från ${l.steg} till ${till}`);
    if (till === 'forlorad') {
      if (!extra.skal?.trim()) return fel('Skäl krävs');
      l.forlorad = { skal: extra.skal.trim() };
    }
    if (till === 'avtal') {
      if (!extra.avtalsreferens?.trim()) return fel('Avtalsreferens krävs');
      if (!l.orgnr) return fel('Organisationsnummer krävs före avtal');
      if (!l.moduler.length) return fel('Avtalet måste omfatta minst en modul');
      const org: Organisation = { id: this.#id('ORG'), namn: l.organisation, typ: 'kund', demo: true, orgnr: l.orgnr, moduler: [...l.moduler], team: [] };
      this.#org.push(org);
      l.avtalsreferens = extra.avtalsreferens.trim();
      l.kundOrganisationId = org.id;
      const inb = this.#skapaInbjudan(session!, org.id, l.kontakt.epost, 'administrator', l.moduler);
      l.inbjudanId = inb.id;
    }
    if (till === 'kund_i_drift') {
      const inb = this.#inbjudningar.find((x) => x.id === l.inbjudanId);
      if (!inb || inb.status !== 'accepterad') return fel('Kunden är i drift först när administratörens inbjudan är godkänd och accepterad');
    }
    l.historik.push({ tid: this.klocka().toISOString(), av: session!.anvandarId, fran: l.steg, till });
    l.steg = till;
    this.#logga(session!, 'crm_steg', l.id, this.#org.find((o) => o.typ === 'esm')!.id, { till });
    return ok(undefined);
  }

  listaInbjudningar(session: Session | null, organisationId?: string): Resultat<Inbjudan[]> {
    if (organisationId) {
      const b = this.#admin(session, organisationId);
      if (!b.tillats) return fel(b.skal);
      return ok(structuredClone(this.#inbjudningar.filter((x) => x.organisationId === organisationId)));
    }
    const b = this.#esm(session, 'las');
    if (!b.tillats) return fel(b.skal);
    return ok(structuredClone(this.#inbjudningar));
  }

  /**
   * Godkänn ett inbjudningsutkast. ESM-administratör för inbjudningar från avtal,
   * kundens administratör för egna inbjudningar. Status blir "godkänd, ej skickad"
   * eftersom ingen godkänd sändtjänst finns.
   */
  godkannInbjudan(session: Session | null, inbjudanId: string): Resultat {
    const inb = this.#inbjudningar.find((x) => x.id === inbjudanId);
    if (!inb) return fel('Okänd inbjudan');
    const egen = this.#admin(session, inb.organisationId);
    const esm = this.#esm(session, 'administrera');
    if (!egen.tillats && !esm.tillats) return fel('Endast administratör kan godkänna inbjudan');
    if (inb.status !== 'utkast') return fel('Inbjudan är inte ett utkast');
    if (inb.skapadAv === session!.anvandarId && !esm.tillats && this.#antalAdmin(inb.organisationId) > 1)
      return fel('En annan administratör ska godkänna inbjudan');
    inb.status = 'godkand_ej_skickad';
    inb.godkandAv = session!.anvandarId;
    this.#logga(session!, 'inbjudan_godkand', inb.id, inb.organisationId);
    return ok(undefined);
  }

  /**
   * Demo: den inbjudna accepterar. I drift sker det via verifierad inloggning.
   * Skapar konto och medlemskap med inbjudans roll och moduler.
   */
  accepteraInbjudan(inbjudanId: string, konto: Anvandarkonto): Resultat<Medlemskap> {
    const inb = this.#inbjudningar.find((x) => x.id === inbjudanId);
    if (!inb) return fel('Okänd inbjudan');
    if (inb.status !== 'godkand_ej_skickad') return fel('Inbjudan är inte godkänd');
    if (!this.#konton.some((k) => k.id === konto.id)) this.#konton.push({ ...konto });
    if (medlemskapFor(this.#medlemskap, konto.id, inb.organisationId)) return fel('Redan medlem');
    const m: Medlemskap = { anvandarId: konto.id, organisationId: inb.organisationId, roll: inb.roll, teamIds: [], moduler: [...inb.moduler], aktiv: true };
    this.#medlemskap.push(m);
    inb.status = 'accepterad';
    this.logg.registrera({ id: konto.id, typ: 'manniska' }, 'inbjudan_accepterad', inb.id, { organisationId: inb.organisationId });
    return ok(structuredClone(m));
  }
}
