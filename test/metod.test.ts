import { describe, expect, it } from 'vitest';
import { FASER, foljUpp, Kundresa, METODSTEG, visningsnamn, type Aktorsreferens } from '../src/plattform/metod.js';

const nu = () => new Date('2027-03-15T09:00:00Z');
const anna: Aktorsreferens = { id: 'anna', typ: 'manniska' };
const ai: Aktorsreferens = { id: 'agent', typ: 'ai' };

/** För kundresan fram till och med steg n (alla steg klara i ordning). */
function framTill(k: Kundresa, n: number) {
  for (let nr = 1; nr <= n; nr++) {
    expect(k.starta(nr, anna, 'Anna').ok, `starta ${nr}`).toBe(true);
    if (nr === 11) expect(k.registreraKundgodkannande(anna, 'Kunden godkänner förslag B').ok).toBe(true);
    expect(k.avsluta(nr, anna).ok, `avsluta ${nr}`).toBe(true);
  }
}

describe('Metodregistret', () => {
  it('har 19 steg i sex faser med ursprungliga namn', () => {
    expect(METODSTEG).toHaveLength(19);
    expect(FASER.flatMap((f) => f.steg)).toEqual(METODSTEG.map((s) => s.nr));
    expect(FASER.map((f) => f.namn)).toEqual(['Förstå', 'Analysera', 'Förankra', 'Förbereda', 'Genomföra', 'Förvalta & fira']);
    expect(METODSTEG[13]!.namn).toBe('Upphandla och bygga');
  });

  it('anpassar visningstext per vertikal men behåller registernamnet', () => {
    expect(visningsnamn(14, 'vard')).toBe('Införa förändringen i verksamheten');
    expect(visningsnamn(14, 'fastighet')).toBe('Upphandla och bygga');
    expect(visningsnamn(14)).toBe('Upphandla och bygga');
  });
});

describe('Kundresans beroenden och grindar', () => {
  it('tillåter inte hopp förbi beroenden', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    expect(k.startbara()).toEqual([1]);
    expect(k.starta(3, anna, 'Anna')).toEqual({ ok: false, skal: 'Steg 3 väntar på steg 2' });
  });

  it('blockerar genomförande utan kundgodkännande i steg 11', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    framTill(k, 10);
    expect(k.starta(11, anna, 'Anna').ok).toBe(true);
    expect(k.avsluta(11, anna)).toMatchObject({ ok: false });
    expect(k.hinderForStart(12)).toBe('Steg 12 väntar på steg 11');
    expect(k.markeraEjTillampligt(11, anna, 'Behövs inte i detta projekt')).toMatchObject({ ok: false });
  });

  it('låter steg 15–17 pågå parallellt med steg 14', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    framTill(k, 13);
    expect(k.startbara()).toEqual([14, 15, 16, 17]);
    for (const nr of [14, 15, 16, 17]) expect(k.starta(nr, anna, 'Anna').ok).toBe(true);
    expect(k.avsluta(16, anna).ok).toBe(true);
    expect(k.hinderForStart(18)).toBe('Steg 18 väntar på steg 14');
    expect(k.avsluta(14, anna).ok).toBe(true);
    expect(k.startbara()).toEqual([18]);
  });

  it('spärrar steg 12–19 igen när godkännandet återkallas', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    framTill(k, 12);
    expect(k.starta(13, anna, 'Anna').ok).toBe(true);
    expect(k.aterkallaKundgodkannande(anna, 'Styrelsen vill se ny kalkyl').ok).toBe(true);
    expect(k.godkantForGenomforande).toBe(false);
    expect(k.stegtillstand(11).status).toBe('pagar');
    expect(k.avsluta(13, anna)).toEqual({ ok: false, skal: 'Steg 13 kräver kundens godkännande i steg 11' });
    expect(k.registreraKundgodkannande(anna, 'Ny kalkyl godkänd').ok).toBe(true);
    expect(k.avsluta(13, anna).ok).toBe(true);
  });

  it('kräver motivering för Ej tillämpligt', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    framTill(k, 13);
    expect(k.markeraEjTillampligt(17, anna, '')).toEqual({ ok: false, skal: 'Ej tillämpligt kräver en motivering' });
    expect(k.markeraEjTillampligt(17, anna, 'Inga relevanta bidrag för privat fastighetsägare').ok).toBe(true);
    expect(k.stegtillstand(17)).toMatchObject({ status: 'ej_tillampligt', motivering: 'Inga relevanta bidrag för privat fastighetsägare' });
  });

  it('låter inte AI starta, avsluta, besluta eller godkänna', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    expect(k.starta(1, ai, 'agent').ok).toBe(false);
    expect(k.starta(1, anna, 'Anna').ok).toBe(true);
    expect(k.besluta(1, ai, 'x').ok).toBe(false);
    const f = k.foresla(1, ai, 'Intervjua fastighetschefen');
    expect(f.ok).toBe(true);
    const id = f.ok ? f.varde.id : '';
    expect(k.hanteraForslag(1, id, ai, true).ok).toBe(false);
    const b = k.hanteraForslag(1, id, anna, true);
    expect(b).toMatchObject({ ok: true, varde: { franAiForslag: id, beslutadAv: 'anna', typ: 'beslut' } });
    expect(k.stegtillstand(1).aiForslag[0]!.status).toBe('godkant');
    expect(k.hanteraForslag(1, id, anna, false)).toEqual({ ok: false, skal: 'Förslaget är redan hanterat' });
    expect(k.avsluta(1, ai).ok).toBe(false);
  });

  it('versionshanterar underlag och för historik', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    expect(k.laggTillUnderlag(2, anna, 'Energideklaration', '').ok).toBe(false);
    k.laggTillUnderlag(2, anna, 'Energideklaration', 'fil:ED-2024.pdf');
    const v2 = k.laggTillUnderlag(2, anna, 'Energideklaration', 'fil:ED-2024-rev.pdf');
    expect(v2).toMatchObject({ ok: true, varde: { version: 2, kalla: 'fil:ED-2024-rev.pdf' } });
    k.kommentera(2, anna, 'Revision från förvaltaren');
    expect(k.stegtillstand(2).historik.map((h) => h.version)).toEqual([1, 2, 3]);
  });

  it('kräver källa och uppföljning för regelkontroller', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    k.starta(1, anna, 'Anna');
    expect(k.registreraKontroll(1, anna, { krav: 'Brandskydd', kalla: '', kallDatum: '2026-01-01', utfall: 'uppfylld' }).ok).toBe(false);
    const r = k.registreraKontroll(1, anna, { krav: 'Tillgänglighet', kalla: 'BBR 3:1 (version att verifiera)', kallDatum: '2026-01-01', utfall: 'avvikelse' });
    expect(k.avsluta(1, anna)).toMatchObject({ ok: false });
    k.foljUppAvvikelse(1, r.ok ? r.varde.id : '', anna, 'Anna', '2027-05-01');
    expect(k.avsluta(1, anna).ok).toBe(true);
  });
});

describe('Uppföljning mot baslinje, mål och utfall', () => {
  it('räknar inte mot en baslinje som inte är överenskommen', () => {
    expect(foljUpp({ id: 'n', namn: 'Energi', enhet: 'kWh', baslinje: { varde: 100, kalla: 'x', datum: '2025', overenskommen: false }, mal: { varde: 80, datum: '2027', riktning: 'lagre_battre' }, utfall: [{ varde: 90, datum: '2026', kalla: 'y' }] }).status).toBe('baslinje_ej_overenskommen');
    expect(foljUpp({ id: 'n', namn: 'Energi', enhet: 'kWh', utfall: [] }).status).toBe('saknar_baslinje');
  });
  it('beräknar måluppfyllelse deterministiskt åt rätt håll', () => {
    const bas = { id: 'n', namn: 'Energi', enhet: 'kWh', baslinje: { varde: 100, kalla: 'x', datum: '2025', overenskommen: true }, mal: { varde: 80, datum: '2027', riktning: 'lagre_battre' as const } };
    expect(foljUpp({ ...bas, utfall: [{ varde: 90, datum: '2026', kalla: 'y' }] })).toMatchObject({ status: 'pa_vag', maluppfyllelse: 0.5 });
    expect(foljUpp({ ...bas, utfall: [{ varde: 78, datum: '2026', kalla: 'y' }] })).toMatchObject({ status: 'mal_natt', maluppfyllelse: 1.1 });
    expect(foljUpp({ ...bas, utfall: [{ varde: 105, datum: '2026', kalla: 'y' }] })).toMatchObject({ status: 'samre_an_baslinje' });
    expect(foljUpp({ ...bas, mal: { varde: 120, datum: '2027', riktning: 'hogre_battre' }, utfall: [{ varde: 110, datum: '2026', kalla: 'y' }] })).toMatchObject({ maluppfyllelse: 0.5 });
  });
  it('kräver källa och tal för utfall', () => {
    const k = new Kundresa('P', 'fastighet', nu);
    k.laggTillNyckeltal({ id: 'e', namn: 'Energi', enhet: 'kWh' });
    expect(k.registreraUtfall('e', Number.NaN, '2026', 'x').ok).toBe(false);
    expect(k.registreraUtfall('e', 5, '2026', '').ok).toBe(false);
    expect(k.registreraUtfall('e', 5, '2026', 'Fil').ok).toBe(true);
  });
});
