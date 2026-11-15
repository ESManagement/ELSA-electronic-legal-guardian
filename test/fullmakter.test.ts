import { describe, expect, it } from 'vitest';
import { valideraDatapost, motstridiga, markeraInaktuella, type Datapost } from '../src/plattform/datapost.js';
import { aterkallaFullmakt, bevakaUtgang, kanKoraSkarmflode, provaHamtning, utvarderaSkarmobservation, valjInsamlingsvag, type Anslutning, type Fullmakt, type Hamtningsbegaran, type Skarmflode } from '../src/plattform/fullmakter.js';

// Endast modell: ingen källa är ansluten och ingen hämtning körs.
const FULLMAKT: Fullmakt = {
  id: 'FM-1', organisationId: 'fast', fullmaktsgivare: 'Demo Fastighets AB', behorigUndertecknare: 'Fia Fastighet', ombud: 'ES Management',
  kallaId: 'nat-demo', bolag: ['fast'], objekt: ['TEST-BYGGNAD-01'], uppgiftstyper: ['elforbrukning'], andamal: 'Energiuppföljning',
  uppgiftsperiod: { fran: '2024-01-01', till: '2027-12-31' }, giltighet: { fran: '2027-01-01', till: '2027-04-10' }, aterkallbar: true,
  status: 'signerad', signeradHandling: 'DOK-000001', leverantorskravVerifierade: true,
};
const ANSLUTNING: Anslutning = {
  id: 'AN-1', organisationId: 'fast', kallaId: 'nat-demo', metod: 'api', bolag: ['fast'], objekt: ['TEST-BYGGNAD-01'], uppgiftstyper: ['elforbrukning'],
  rattighet: 'lasande', ansvarig: 'frida', godkandAvKund: { av: 'fia', tid: 't' }, verifieradAvEsm: { av: 'erik', tid: 't' },
  provhamtning: { tid: 't', utfall: 'godkand', tillsammansMed: 'frida', kommentar: 'Stämmer mot faktura' }, tekniskBehorighet: 'giltig',
  schema: { intervall: 'manad', aktivt: true }, pausad: false, fel: [],
};
const BEGARAN: Hamtningsbegaran = { anslutningId: 'AN-1', bolag: 'fast', objekt: 'TEST-BYGGNAD-01', uppgiftstyp: 'elforbrukning', period: { fran: '2026-01-01', till: '2026-12-31' }, datum: '2027-03-15', schemalagd: true };

describe('Fullmakt och teknisk åtkomst hålls isär', () => {
  it('hämtning tillåts bara med både giltigt mandat och fungerande teknisk behörighet', () => {
    expect(provaHamtning(BEGARAN, [ANSLUTNING], [FULLMAKT])).toEqual({ tillats: true, fullmaktId: 'FM-1' });
    const utanMandat = provaHamtning(BEGARAN, [ANSLUTNING], []);
    expect(utanMandat).toEqual({ tillats: false, skal: ['Ingen fullmakt finns för källan'] });
    const utanTeknik = provaHamtning(BEGARAN, [{ ...ANSLUTNING, tekniskBehorighet: 'saknas' }], [FULLMAKT]);
    expect(utanTeknik).toEqual({ tillats: false, skal: ['Teknisk behörighet: saknas'] });
  });

  it('ingen ny hämtning efter återkallelse, utgång eller paus', () => {
    const aterkallad = aterkallaFullmakt(FULLMAKT, 'fia', '2027-03-15T10:00:00Z');
    expect(provaHamtning(BEGARAN, [ANSLUTNING], [aterkallad])).toMatchObject({ tillats: false, skal: ['Fullmakten är inte giltig (aterkallad)'] });
    expect(provaHamtning({ ...BEGARAN, datum: '2027-04-11' }, [ANSLUTNING], [FULLMAKT])).toMatchObject({ tillats: false, skal: ['Fullmakten är inte giltig (utgangen)'] });
    expect(provaHamtning(BEGARAN, [{ ...ANSLUTNING, pausad: true }], [FULLMAKT])).toMatchObject({ tillats: false, skal: ['Hämtningen är pausad av kunden'] });
  });

  it('omfattning, period och leverantörskrav prövas; schema kräver provhämtning', () => {
    expect(provaHamtning({ ...BEGARAN, period: { fran: '2020-01-01', till: '2020-12-31' } }, [ANSLUTNING], [FULLMAKT])).toMatchObject({ tillats: false });
    expect(provaHamtning(BEGARAN, [ANSLUTNING], [{ ...FULLMAKT, leverantorskravVerifierade: false }])).toMatchObject({ skal: ['Leverantörens fullmaktskrav är inte verifierade'] });
    const r = provaHamtning(BEGARAN, [{ ...ANSLUTNING, provhamtning: undefined }], [FULLMAKT]);
    expect(r).toMatchObject({ skal: ['Schemalagd hämtning kräver godkänd provhämtning tillsammans med kunden'] });
    expect(provaHamtning(BEGARAN, [ANSLUTNING], [{ ...FULLMAKT, signeradHandling: undefined }])).toMatchObject({ skal: ['Fullmakten är inte giltig (saknar_handling)'] });
  });

  it('bevakar utgångsdatum och visar berörda anslutningar', () => {
    expect(bevakaUtgang([FULLMAKT], [ANSLUTNING], '2027-03-15', 30)).toEqual([{ fullmakt: FULLMAKT, gar_ut: '2027-04-10', anslutningar: ['AN-1'] }]);
    expect(bevakaUtgang([FULLMAKT], [ANSLUTNING], '2027-03-15', 7)).toEqual([]);
  });

  it('väljer API före export före skärm', () => {
    expect(valjInsamlingsvag(['skarm', 'export', 'api'])).toBe('api');
    expect(valjInsamlingsvag(['skarm', 'export'])).toBe('export');
    expect(valjInsamlingsvag([])).toBeNull();
  });
});

describe('Skärmbaserad insamling (modell, ej godkänd för införande)', () => {
  const FLODE: Skarmflode = {
    id: 'SK-1', organisationId: 'fast', kallaId: 'portal-demo', andamal: 'Månadsförbrukning', godkandaVyer: [{ id: 'matarlista', layoutavtryck: 'abc' }],
    tillatnaFalt: ['matare', 'kwh'], intervall: 'manad', ansvarig: 'erik', kontrollplan: { typ: 'totalsumma', beskrivning: 'Summa mot faktura' },
    mandatVerifierat: true, leverantorsvillkorVerifierade: true, godkantForInforande: false,
  };
  const OBS = { vyId: 'matarlista', layoutavtryck: 'abc', oforvantadInloggningsruta: false, listanKomplett: true, antalRader: 12, forvantatAntal: { min: 10, max: 14 }, falt: [{ namn: 'matare', varde: 'M1' }, { namn: 'kwh', varde: '' }, { namn: 'personnummer', varde: '19000101-0000' }] };

  it('kan inte köras utan separat godkännande', () => {
    expect(kanKoraSkarmflode(FLODE)).toEqual({ ok: false, skal: ['Skärmbaserad insamling är inte godkänd för införande'] });
  });

  it('ändrad layout och oväntad inloggningsruta stoppar; avvikande mängd går till manuell kontroll', () => {
    expect(utvarderaSkarmobservation(FLODE, { ...OBS, layoutavtryck: 'xyz' })).toEqual({ utfall: 'stoppa', skal: ['Sidlayouten har ändrats'] });
    expect(utvarderaSkarmobservation(FLODE, { ...OBS, oforvantadInloggningsruta: true }).utfall).toBe('stoppa');
    expect(utvarderaSkarmobservation(FLODE, { ...OBS, antalRader: 3 }).utfall).toBe('manuell_kontroll');
    expect(utvarderaSkarmobservation(FLODE, { ...OBS, listanKomplett: false }).utfall).toBe('manuell_kontroll');
  });

  it('kasserar otillåtna fält och markerar saknat värde som bortfall, inte noll', () => {
    expect(utvarderaSkarmobservation(FLODE, OBS)).toEqual({ utfall: 'fortsatt', poster: [{ falt: 'matare', varde: 'M1', bortfall: false }, { falt: 'kwh', varde: null, bortfall: true }] });
  });
});

describe('Minsta datapost', () => {
  const POST: Datapost = {
    kundId: 'fast', objektId: 'TEST-BYGGNAD-01', uppgiftstyp: 'elforbrukning', originalvarde: '12 900', normaliseratVarde: 12900, enhet: 'kWh', period: '2025-01',
    kalla: { typ: 'dokument', id: 'DOK-000001', version: '1' }, position: { typ: 'sida', sida: 2 }, hamtad: '2027-03-15T09:00:00Z',
    metod: { namn: 'manuell', version: '1' }, status: 'extraherad',
  };
  it('saknat värde får inte bli noll', () => {
    expect(valideraDatapost(POST)).toEqual([]);
    expect(valideraDatapost({ ...POST, originalvarde: null, normaliseratVarde: 0 }).map((f) => f.fel)).toContain('Saknat värde får inte omvandlas till noll');
    expect(valideraDatapost({ ...POST, status: 'verifierad' }).map((f) => f.falt)).toEqual(['granskning']);
  });
  it('motstridiga värden visas med källor och ändrad källa gör posten inaktuell', () => {
    const annan = { ...POST, normaliseratVarde: 13000, kalla: { typ: 'kallsystem' as const, id: 'nat-demo', version: '7' } };
    expect(motstridiga([POST, annan])).toEqual([[POST, annan]]);
    expect(markeraInaktuella([POST], 'DOK-000001', '2')[0]!.status).toBe('inaktuell');
  });
});
