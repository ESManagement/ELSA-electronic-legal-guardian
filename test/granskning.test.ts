import { describe, expect, it } from 'vitest';
import { Granskningslogg } from '../src/audit/granskningslogg.js';
import type { Aktor } from '../src/domain/typer.js';
import { korKontroller } from '../src/engine/kontroller.js';
import { STANDARDPARAMETRAR } from '../src/engine/redovisning.js';
import { exempelArsrakning, kr, v } from '../src/exempeldata.js';
import { Behovsbevakningar } from '../src/granskning/behovsbevakning.js';
import { CHECKLISTA, RIMLIGHETSPUNKT } from '../src/granskning/checklista.js';
import { Granskning, type Granskningsanteckning } from '../src/granskning/granskning.js';
import { Kompletteringsbegaran } from '../src/granskning/komplettering.js';

const handlaggare: Aktor = { id: 'handlaggare-1', typ: 'manniska' };
const ai: Aktor = { id: 'modell', typ: 'ai' };
const original = [{ handlingId: 'HANDLING-SYNT-ARSRAKNING-2026', sida: 1 }];

const ANTECKNING: Granskningsanteckning = {
  granskadHandling: 'Årsräkning 2026',
  period: '2026-01-01–2026-12-31',
  genomfordaKontroller: 'Samtliga punkter CP-01–CP-19',
  identifieradeAvvikelser: 'Se avvikelselista',
  kompletteringarOchSvar: 'Komplettering skickad och besvarad',
  sjalvstandigBedomning: 'Utgifterna avser huvudmannens boende och vård och bedöms rimliga',
  kvarstaendeFragor: 'Inga',
  nastaAtgard: 'Ingen',
  ansvarig: 'handlaggare-1',
};

function nyGranskning(verifieraT7 = true) {
  const logg = new Granskningslogg(() => new Date('2027-03-10T09:00:00Z'));
  const r = exempelArsrakning();
  if (verifieraT7) r.transaktioner.find((t) => t.id === 'T7')!.belopp = v(kr(-850), '-850,00', 2, 'rad 6');
  const g = new Granskning('AR-SYNT-1', r.id, 'Granskningsrutin 2027-01', logg, () => new Date('2027-03-10T09:00:00Z'));
  g.foreslaFranMotor(korKontroller(r, STANDARDPARAMETRAR));
  return { g, logg };
}

function faststallAllaUtom(g: Granskning, undantag: string[] = []) {
  for (const ps of g.punkter()) {
    if (undantag.includes(ps.punkt.id)) continue;
    const forslag = ps.foreslagetUtfall;
    if (ps.punkt.materiell) {
      g.faststall(ps.punkt.id, handlaggare, { utfall: 'utford_utan_avvikelse', hanvisningar: original, bedomning: ANTECKNING.sjalvstandigBedomning });
    } else if (forslag === 'ej_tillamplig') {
      g.faststall(ps.punkt.id, handlaggare, { utfall: 'ej_tillamplig', motivering: 'Motorn fann inga sådana poster; kontrollerat mot original' });
    } else if (forslag === 'avvikelse' || forslag === 'kan_inte_bedomas') {
      g.faststall(ps.punkt.id, handlaggare, { utfall: 'avvikelse', hanvisningar: original });
    } else {
      g.faststall(ps.punkt.id, handlaggare, { utfall: 'utford_utan_avvikelse', hanvisningar: original });
    }
  }
}

function hanteraAllaAvvikelser(g: Granskning) {
  for (const a of g.avvikelser()) g.hanteraAvvikelse(a.id, handlaggare, { status: 'lost', atgard: 'Förklarat med kontoutdrag och beslut' });
}

describe('Granskningschecklista', () => {
  it('innehåller PM:ets 19 kontrollpunkter med en materiell rimlighetspunkt', () => {
    expect(CHECKLISTA).toHaveLength(19);
    expect(CHECKLISTA.filter((p) => p.materiell).map((p) => p.id)).toEqual([RIMLIGHETSPUNKT]);
  });

  it('motorn ger förslag men fastställer ingenting', () => {
    const { g } = nyGranskning();
    expect(g.punkter().every((p) => p.faststalltUtfall === undefined)).toBe(true);
    expect(g.punkter().find((p) => p.punkt.id === 'CP-14')!.foreslagetUtfall).toBe('avvikelse');
  });
});

describe('Mänsklig kontroll (D-04)', () => {
  it('AI får inte fastställa en kontrollpunkt', () => {
    const { g } = nyGranskning();
    expect(() => g.faststall('CP-11', ai, { utfall: 'utford_utan_avvikelse' })).toThrow(/människa/);
  });

  it('"ej tillämplig" kräver motivering och får inte användas för rimlighetsbedömningen', () => {
    const { g } = nyGranskning();
    expect(() => g.faststall('CP-13', handlaggare, { utfall: 'ej_tillamplig' })).toThrow(/motivering/);
    expect(() => g.faststall(RIMLIGHETSPUNKT, handlaggare, { utfall: 'ej_tillamplig', motivering: 'x' })).toThrow(/ej tillämplig/);
  });

  it('rimlighetsbedömningen kräver skriftlig bedömning', () => {
    const { g } = nyGranskning();
    expect(() => g.faststall(RIMLIGHETSPUNKT, handlaggare, { utfall: 'utford_utan_avvikelse', hanvisningar: original })).toThrow(/skriftlig bedömning/);
  });

  it('att avvika från motorns förslag kräver motivering och loggas', () => {
    const { g, logg } = nyGranskning();
    expect(() => g.faststall('CP-14', handlaggare, { utfall: 'utford_utan_avvikelse' })).toThrow(/motivering/);
    g.faststall('CP-14', handlaggare, { utfall: 'utford_utan_avvikelse', motivering: 'Samtycke finns i beslut 2026-412, kopplas i nästa steg' });
    const h = logg.handelser(g.id).find((x) => x.handelse === 'kontrollpunkt_faststalld')!;
    expect(h.data).toMatchObject({ punktId: 'CP-14', avvikerFranForslag: true });
  });

  it('genomförd kontroll utan motorstöd kräver hänvisning till original', () => {
    const { g } = nyGranskning();
    expect(() => g.faststall('CP-01', handlaggare, { utfall: 'utford_utan_avvikelse' })).toThrow(/hänvisning/);
  });
});

describe('Avslutsgrind', () => {
  it('nekar avslut när rimlighetsbedömningen saknas (JO 5473-2024, problemkort 2)', () => {
    const { g } = nyGranskning();
    faststallAllaUtom(g, [RIMLIGHETSPUNKT]);
    hanteraAllaAvvikelser(g);
    const res = g.avsluta(handlaggare, ANTECKNING);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.hinder.join(' ')).toContain('CP-18');
  });

  it('nekar avslut när en kritisk avvikelse är öppen', () => {
    const { g } = nyGranskning();
    faststallAllaUtom(g);
    const res = g.avsluta(handlaggare, ANTECKNING);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.hinder.some((h) => h.includes('inte hanterad'))).toBe(true);
  });

  it('tillåter att avvikelse förs vidare bara med skäl, ansvarig och uppföljning', () => {
    const { g } = nyGranskning();
    const a = g.avvikelser()[0]!;
    expect(() =>
      g.hanteraAvvikelse(a.id, handlaggare, { status: 'overford_till_uppfoljning', ansvarig: '', skal: '', uppfoljningsdatum: '2027-06-01', atgard: 'x' }),
    ).toThrow(/skäl och ansvarig/);
  });

  it('nekar avslut när granskningsanteckningen är ofullständig', () => {
    const { g } = nyGranskning();
    faststallAllaUtom(g);
    hanteraAllaAvvikelser(g);
    const res = g.avsluta(handlaggare, { ...ANTECKNING, sjalvstandigBedomning: ' ' });
    expect(res.ok).toBe(false);
  });

  it('avslutar när allt är gjort och låser sedan granskningen', () => {
    const { g, logg } = nyGranskning();
    faststallAllaUtom(g);
    hanteraAllaAvvikelser(g);
    expect(g.avsluta(handlaggare, ANTECKNING)).toMatchObject({ ok: true });
    expect(() => g.faststall('CP-01', handlaggare, { utfall: 'avvikelse' })).toThrow(/avslutad/);
    expect(Granskningslogg.verifieraKedja(logg.handelser()).ok).toBe(true);
  });
});

describe('Granskningslogg', () => {
  it('upptäcker ändring i efterhand', () => {
    const { logg } = nyGranskning();
    const export_ = logg.handelser();
    export_[1]!.data = { manipulerad: true };
    expect(Granskningslogg.verifieraKedja(export_)).toEqual({ ok: false, brottVid: 2 });
  });
});

describe('A-10: komplettering räknas inte som skickad förrän den expedierats', () => {
  it('kräver godkännande och expediering', () => {
    const { g, logg } = nyGranskning();
    const k = new Kompletteringsbegaran('AR-SYNT-1', logg);
    const fragor = k.skapaUtkast(g.avvikelser());
    expect(fragor.length).toBeGreaterThan(0);
    expect(k.kommuniceringUtford).toBe(false);
    expect(() => k.registreraExpediering(handlaggare, { mottagare: 'Ställföreträdare', mottagarroll: 'stallforetradare', kanal: 'post' })).toThrow(/inte godkända/);
    expect(() => k.godkann(fragor[0]!.id, ai)).toThrow();
    for (const f of fragor) k.godkann(f.id, handlaggare);
    expect(k.kommuniceringUtford).toBe(false);
    const exp = k.registreraExpediering(handlaggare, { mottagare: 'Ställföreträdare', mottagarroll: 'stallforetradare', kanal: 'post' });
    expect(k.kommuniceringUtford).toBe(true);
    expect(exp.skickadVersion).toContain('Varför vi frågar');
    expect(() => k.godkann(fragor[0]!.id, handlaggare)).toThrow(/redan skickad/);
  });

  it('håller isär uteblivet svar, oklart svar och svar som motsäger originalet', () => {
    const { g, logg } = nyGranskning();
    const k = new Kompletteringsbegaran('AR-SYNT-1', logg);
    const [f1] = k.skapaUtkast(g.avvikelser());
    expect(() => k.registreraSvar(f1!.id, handlaggare, 'oklart_svar', 'x')).toThrow(/inte skickats/);
    for (const f of k.fragor()) k.godkann(f.id, handlaggare);
    k.registreraExpediering(handlaggare, { mottagare: 'S', mottagarroll: 'stallforetradare', kanal: 'e_tjanst' });
    k.registreraSvar(f1!.id, handlaggare, 'motsager_original', 'Svaret anger annat belopp än kontoutdraget');
    expect(k.fragor()[0]!.status).toBe('motsager_original');
  });

  it('formulerar frågor utan att påstå fel', () => {
    const { g, logg } = nyGranskning();
    const text = new Kompletteringsbegaran('AR-SYNT-1', logg);
    text.skapaUtkast(g.avvikelser());
    expect(text.brevtext()).not.toMatch(/misstänk|felaktig|oegentlig|pröva|handläggaren prövat/i);
    expect(text.brevtext()).toContain('posten "Kontantuttag" 2026-06-14');
  });
});

describe('A-09: årlig behovsgranskning av förvaltarskap', () => {
  const uppdrag = [
    { id: 'U1', kategori: 'forvaltarskap' as const, huvudmanId: 'H1', stallforetradareId: 'S1', omfattning: ['förvalta egendom'], giltigFran: '2020-05-01', beslutsreferens: 'TR Ä 1-20' },
    { id: 'U2', kategori: 'godmanskap' as const, huvudmanId: 'H2', stallforetradareId: 'S2', omfattning: ['bevaka rätt'], giltigFran: '2021-01-01', beslutsreferens: 'ÖF 2021-3' },
  ];

  it('skapar bevakning bara för förvaltarskap och låter den leva vidare efter godkänd årsräkning', () => {
    const { g, logg } = nyGranskning();
    const bb = new Behovsbevakningar(logg);
    expect(bb.skapaArliga(uppdrag, 2027, '2027-06-30').map((b) => b.uppdragId)).toEqual(['U1']);
    faststallAllaUtom(g);
    hanteraAllaAvvikelser(g);
    expect(g.avsluta(handlaggare, ANTECKNING).ok).toBe(true);
    expect(bb.aktiva()).toHaveLength(1);
  });

  it('kräver komplett bedömning för att kvitteras', () => {
    const { logg } = nyGranskning();
    const bb = new Behovsbevakningar(logg);
    const [b] = bb.skapaArliga(uppdrag, 2027, '2027-06-30');
    const bedomning = {
      uppdateradeOmstandigheter: 'Läkarintyg 2027-04',
      begransningEllerUpphorandeProvat: 'Prövat; behovet kvarstår',
      handlaggarensBedomning: 'Förvaltarskapet behövs i nuvarande omfattning',
      nastaAtgard: 'Ny prövning 2028',
      aktanteckningId: 'AKT-77',
    };
    expect(() => bb.kvittera(b!.id, handlaggare, { ...bedomning, handlaggarensBedomning: '' })).toThrow();
    bb.kvittera(b!.id, handlaggare, bedomning);
    expect(bb.aktiva()).toHaveLength(0);
  });
});
