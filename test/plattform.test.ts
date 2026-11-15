import { beforeEach, describe, expect, it } from 'vitest';
import { Granskningslogg } from '../src/audit/granskningslogg.js';
import type { Organisation, Session } from '../src/plattform/atkomst.js';
import { kontrolleraOrgnr } from '../src/plattform/crm.js';
import { Plattform } from '../src/plattform/plattform.js';

const klocka = () => new Date('2027-03-15T09:00:00Z');
const s = (anvandarId: string): Session => ({ anvandarId, metod: 'demo', verifierad: false });

const ORG: Organisation[] = [
  { id: 'kommun', namn: 'Demostad (fiktiv)', typ: 'kund', demo: true, moduler: ['val-overformyndare', 'politik-styrning', 'project-management'], team: [{ id: 'ofn', namn: 'Överförmyndarenheten', typ: 'forvaltning' }, { id: 'kf', namn: 'Kommunledningskontoret', typ: 'forvaltning' }] },
  { id: 'fast', namn: 'Demo Fastighets AB (fiktiv)', typ: 'kund', demo: true, moduler: ['property', 'energi', 'project-management'], team: [] },
  { id: 'esm', namn: 'ES Management', typ: 'esm', demo: true, moduler: [], team: [] },
];

let p: Plattform;
beforeEach(() => {
  p = new Plattform(klocka);
  p.seed({
    organisationer: ORG,
    konton: ['sigge', 'anna', 'lars', 'fia', 'erik', 'eva', 'kim'].map((id) => ({ id, namn: id })),
    medlemskap: [
      { anvandarId: 'sigge', organisationId: 'kommun', roll: 'administrator', teamIds: [], moduler: [], aktiv: true },
      { anvandarId: 'anna', organisationId: 'kommun', roll: 'redigerare', teamIds: ['ofn'], moduler: ['val-overformyndare', 'project-management'], aktiv: true },
      { anvandarId: 'lars', organisationId: 'kommun', roll: 'lasare', teamIds: ['ofn'], moduler: ['val-overformyndare', 'project-management'], aktiv: true },
      { anvandarId: 'kim', organisationId: 'kommun', roll: 'redigerare', teamIds: ['kf'], moduler: ['project-management'], aktiv: true },
      { anvandarId: 'fia', organisationId: 'fast', roll: 'administrator', teamIds: [], moduler: [], aktiv: true },
      { anvandarId: 'erik', organisationId: 'esm', roll: 'redigerare', teamIds: [], moduler: [], aktiv: true },
      { anvandarId: 'eva', organisationId: 'esm', roll: 'administrator', teamIds: [], moduler: [], aktiv: true },
    ],
    projekt: [
      { id: 'P-KOMMUN', organisationId: 'kommun', namn: 'Införa digital årsräkningsgranskning', vertikal: 'kommun', moduler: ['val-overformyndare', 'project-management'], teamId: 'ofn', demo: true },
      { id: 'P-FAST', organisationId: 'fast', namn: 'Energiöversyn Kv. Testet', vertikal: 'fastighet', moduler: ['energi', 'property'], demo: true },
    ],
  });
});

describe('Kundisolering', () => {
  it('en kund kan inte läsa eller ändra en annan kunds projekt, ens via direkta anrop', () => {
    expect(p.hamtaProjekt(s('fia'), 'P-KOMMUN')).toEqual({ ok: false, skal: 'Projektet finns inte eller du saknar behörighet' });
    expect(p.lasKundresa(s('fia'), 'P-KOMMUN').ok).toBe(false);
    expect(p.andraKundresa(s('fia'), 'P-KOMMUN', 'starta', (k, a) => k.starta(1, a, 'x')).ok).toBe(false);
    expect(p.listaProjekt(s('fia'), 'kommun')).toEqual({ ok: false, skal: 'Ingen behörighet till organisationen' });
    expect(p.kopplaModul(s('fia'), 'P-KOMMUN', 'energi').ok).toBe(false);
    expect(p.aktivitetslogg(s('fia'), 'kommun').ok).toBe(false);
    // Okänt och otillåtet projekt ger samma svar.
    expect(p.hamtaProjekt(s('fia'), 'P-FINNS-INTE')).toEqual(p.hamtaProjekt(s('fia'), 'P-KOMMUN'));
  });

  it('ESM-anställda får inte kunddata automatiskt', () => {
    expect(p.hamtaProjekt(s('erik'), 'P-FAST').ok).toBe(false);
    expect(p.listaProjekt(s('eva'), 'fast').ok).toBe(false);
  });

  it('ett inloggat anrop utan session nekas', () => {
    expect(p.listaProjekt(null, 'kommun')).toEqual({ ok: false, skal: 'Inte inloggad' });
  });
});

describe('Roller: Administratör, Redigerare och Läsare', () => {
  it('läsare kan läsa men inte ändra', () => {
    expect(p.lasKundresa(s('lars'), 'P-KOMMUN').ok).toBe(true);
    const r = p.andraKundresa(s('lars'), 'P-KOMMUN', 'starta', (k, a) => k.starta(1, a, 'Lars'));
    expect(r).toEqual({ ok: false, skal: 'Läsare får inte ändra' });
    expect(p.skapaProjekt(s('lars'), 'kommun', 'X', 'kommun', ['project-management']).ok).toBe(false);
  });

  it('redigerare kan ändra men inte administrera', () => {
    expect(p.andraKundresa(s('anna'), 'P-KOMMUN', 'starta', (k, a) => k.starta(1, a, 'Anna')).ok).toBe(true);
    expect(p.listaMedlemmar(s('anna'), 'kommun').ok).toBe(false);
    expect(p.bjudIn(s('anna'), 'kommun', 'ny@demostad.example', 'lasare', []).ok).toBe(false);
    expect(p.stangAv(s('anna'), 'kommun', 'lars', false).ok).toBe(false);
  });

  it('administratör bjuder in, stänger av, väljer roll och moduler och ser loggen inom sin organisation', () => {
    const admin = s('sigge');
    const inb = p.bjudIn(admin, 'kommun', 'ny@demostad.example', 'lasare', ['politik-styrning']);
    expect(inb).toMatchObject({ ok: true, varde: { status: 'utkast' } });
    expect(p.bjudIn(admin, 'kommun', 'ny@demostad.example', 'lasare', ['energi'])).toEqual({ ok: false, skal: 'Modulen ingår inte i organisationens avtal: energi' });
    expect(p.sattRoll(admin, 'kommun', 'lars', 'redigerare').ok).toBe(true);
    expect(p.tilldelaModuler(admin, 'kommun', 'lars', ['politik-styrning']).ok).toBe(true);
    expect(p.tilldelaModuler(admin, 'kommun', 'lars', ['property'])).toMatchObject({ ok: false });
    expect(p.stangAv(admin, 'kommun', 'anna', false).ok).toBe(true);
    expect(p.hamtaProjekt(s('anna'), 'P-KOMMUN').ok).toBe(false);
    const logg = p.aktivitetslogg(admin, 'kommun');
    expect(logg.ok && logg.varde.map((h) => h.handelse)).toEqual(['inbjudan_utkast', 'roll_andrad', 'moduler_tilldelade', 'konto_avstangt']);
    expect(logg.ok && Granskningslogg.verifieraKedja(p.logg.handelser()).ok).toBe(true);
  });

  it('organisationen kan inte lämnas utan aktiv administratör', () => {
    expect(p.sattRoll(s('sigge'), 'kommun', 'sigge', 'lasare').ok).toBe(false);
    expect(p.stangAv(s('sigge'), 'kommun', 'sigge', false).ok).toBe(false);
  });

  it('återkallad åtkomst nekas direkt', () => {
    expect(p.lasKundresa(s('lars'), 'P-KOMMUN').ok).toBe(true);
    p.tilldelaModuler(s('sigge'), 'kommun', 'lars', []);
    expect(p.lasKundresa(s('lars'), 'P-KOMMUN').ok).toBe(false);
  });
});

describe('Projekt, team och modultilldelning', () => {
  it('projekt i ett annat team syns inte för redigerare utanför teamet', () => {
    expect(p.hamtaProjekt(s('kim'), 'P-KOMMUN').ok).toBe(false);
    const lista = p.listaProjekt(s('kim'), 'kommun');
    expect(lista.ok && lista.varde).toEqual([]);
    expect(p.hamtaProjekt(s('sigge'), 'P-KOMMUN').ok).toBe(true);
  });

  it('modul utanför avtalet kan inte kopplas eller kringgås', () => {
    expect(p.kopplaModul(s('sigge'), 'P-KOMMUN', 'energi')).toEqual({ ok: false, skal: 'Modulen ingår inte i organisationens avtal' });
    expect(p.skapaProjekt(s('anna'), 'kommun', 'Nytt', 'kommun', ['politik-styrning'])).toEqual({ ok: false, skal: 'Modulen är inte tilldelad användaren' });
    expect(p.modulatkomst(s('anna'), 'kommun', 'politik-styrning').tillats).toBe(false);
    expect(p.modulatkomst(s('sigge'), 'kommun', 'politik-styrning').tillats).toBe(true);
  });

  it('projekt kopplas till flera moduler utan att kontexten tappas', () => {
    const r = p.skapaProjekt(s('fia'), 'fast', 'Underhållsplan 2028', 'fastighet', ['property', 'project-management']);
    expect(r.ok).toBe(true);
    const id = r.ok ? r.varde.id : '';
    expect(p.kopplaModul(s('fia'), id, 'energi').ok).toBe(true);
    const via = p.listaProjekt(s('fia'), 'fast', 'energi');
    expect(via.ok && via.varde.map((x) => x.id)).toContain(id);
    const proj = p.hamtaProjekt(s('fia'), id);
    expect(proj).toMatchObject({ ok: true, varde: { organisationId: 'fast', moduler: ['property', 'project-management', 'energi'], vertikal: 'fastighet', demo: true } });
  });
});

describe('Kundresa via plattformen', () => {
  it('kundgodkännande kräver kundens administratör, inte redigerare', () => {
    p.seedKundresa('P-FAST', (k) => {
      for (let nr = 1; nr <= 10; nr++) {
        k.starta(nr, { id: 'fia', typ: 'manniska' }, 'Fia');
        k.avsluta(nr, { id: 'fia', typ: 'manniska' });
      }
      k.starta(11, { id: 'fia', typ: 'manniska' }, 'Fia');
    });
    const vy = p.lasKundresa(s('fia'), 'P-FAST');
    expect(vy.ok && vy.varde.steg[11]!.hinder).toBe('Steg 12 väntar på steg 11');
    expect(p.andraKundresa(s('fia'), 'P-FAST', 'godkänn', (k, a) => k.registreraKundgodkannande(a, 'Förslag B godkänt'), 'kundadministrator').ok).toBe(true);
    const efter = p.lasKundresa(s('fia'), 'P-FAST');
    expect(efter.ok && efter.varde.godkantForGenomforande).toBe(true);
  });
});

describe('Webbplats, CRM och inbjudan', () => {
  it('validerar organisationsnummer med kontrollsiffra', () => {
    expect(kontrolleraOrgnr('556677-8890')).toMatchObject({ ok: false });
    expect(kontrolleraOrgnr('5560000002')).toMatchObject({ ok: false });
    expect(kontrolleraOrgnr('556016-0680')).toEqual({ ok: true, normaliserat: '556016-0680' });
    expect(kontrolleraOrgnr('12345')).toMatchObject({ ok: false });
  });

  it('demobokning kräver demotyp och giltig e-post och hamnar som Demo bokad', () => {
    expect(p.tavInKontakt({ organisation: 'X', kontakt: { namn: 'Y', epost: 'fel' }, kalla: 'boka_demo', demotyp: 'kort_demo' }).ok).toBe(false);
    expect(p.tavInKontakt({ organisation: 'X', kontakt: { namn: 'Y', epost: 'y@x.example' }, kalla: 'boka_demo' }).ok).toBe(false);
    const r = p.tavInKontakt({ organisation: 'Testkommun (fiktiv)', kontakt: { namn: 'Y', epost: 'y@x.example' }, kalla: 'boka_demo', demotyp: 'vertikaldemo', vertikal: 'kommun' });
    expect(r.ok).toBe(true);
    const leads = p.listaLeads(s('erik'));
    expect(leads.ok && leads.varde[0]).toMatchObject({ steg: 'demo_bokad', demotyp: 'vertikaldemo', kalla: 'boka_demo' });
  });

  it('bara ESM ser CRM', () => {
    expect(p.listaLeads(s('fia')).ok).toBe(false);
    expect(p.listaLeads(null).ok).toBe(false);
    expect(p.klickstatistik(s('sigge')).ok).toBe(false);
  });

  it('offertförfrågan → avtal → godkänd inbjudan → kund i drift, utan automatiskt utskick', () => {
    expect(p.tavInKontakt({ organisation: 'Ny Kund AB (fiktiv)', kontakt: { namn: 'Ola', epost: 'ola@ny.example' }, kalla: 'offertforfragan', moduler: ['energi'] })).toEqual({ ok: false, skal: 'Organisationsnummer krävs för offertförfrågan' });
    const r = p.tavInKontakt({ organisation: 'Ny Kund AB (fiktiv)', orgnr: '5560160680', kontakt: { namn: 'Ola', epost: 'ola@ny.example' }, kalla: 'offertforfragan', moduler: ['energi', 'property'] });
    const id = r.ok ? r.varde.id : '';
    expect(p.flyttaLead(s('erik'), id, 'avtal')).toMatchObject({ ok: false });
    expect(p.flyttaLead(s('erik'), id, 'offert').ok).toBe(true);
    expect(p.flyttaLead(s('erik'), id, 'avtal')).toEqual({ ok: false, skal: 'Avtalsreferens krävs' });
    expect(p.flyttaLead(s('erik'), id, 'avtal', { avtalsreferens: 'AVT-TEST-1' }).ok).toBe(true);
    const lead = (p.listaLeads(s('erik')) as { ok: true; varde: any[] }).varde.find((l) => l.id === id);
    expect(p.flyttaLead(s('erik'), id, 'kund_i_drift')).toMatchObject({ ok: false });
    const inb = p.listaInbjudningar(s('erik'));
    expect(inb.ok && inb.varde.find((x) => x.id === lead.inbjudanId)).toMatchObject({ status: 'utkast', roll: 'administrator', moduler: ['energi', 'property'] });
    expect(p.godkannInbjudan(s('erik'), lead.inbjudanId)).toEqual({ ok: false, skal: 'Endast administratör kan godkänna inbjudan' });
    expect(p.godkannInbjudan(s('eva'), lead.inbjudanId).ok).toBe(true);
    const efter = p.listaInbjudningar(s('eva'));
    expect(efter.ok && efter.varde.find((x) => x.id === lead.inbjudanId)?.status).toBe('godkand_ej_skickad');
    expect(p.accepteraInbjudan(lead.inbjudanId, { id: 'ola', namn: 'Ola' }).ok).toBe(true);
    expect(p.flyttaLead(s('erik'), id, 'kund_i_drift').ok).toBe(true);
    const org = p.minaOrganisationer(s('ola'));
    expect(org).toHaveLength(1);
    expect(org[0]).toMatchObject({ roll: 'administrator', moduler: ['energi', 'property'], organisation: { orgnr: '556016-0680' } });
  });

  it('förlorad kräver skäl och avslutade steg kan inte backas', () => {
    const r = p.tavInKontakt({ organisation: 'Z (fiktiv)', kontakt: { namn: 'Z', epost: 'z@z.example' }, kalla: 'kontaktformular' });
    const id = r.ok ? r.varde.id : '';
    expect(p.flyttaLead(s('erik'), id, 'forlorad').ok).toBe(false);
    expect(p.flyttaLead(s('erik'), id, 'forlorad', { skal: 'Valde annan leverantör' }).ok).toBe(true);
    expect(p.flyttaLead(s('erik'), id, 'lead').ok).toBe(false);
  });

  it('klickuppföljning lagrar bara räknare', () => {
    p.registreraKlick('pris');
    p.registreraKlick('pris');
    p.registreraKlick('referenser');
    expect(p.klickstatistik(s('erik'))).toEqual({ ok: true, varde: { pris: 2, referenser: 1, boka_demo: 0, se_elsa_start: 0, sok: 0 } });
  });
});
