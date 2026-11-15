import { describe, expect, it } from 'vitest';
import { granskaTrend, lasEnergiCsv, PILOTPROFIL, TESTFIL_TEST_BYGGNAD_01, tolkaKwh } from '../src/moduler/energi/energitrend.js';

const nu = new Date('2027-03-15T09:00:00Z');
const anna = { id: 'anna', typ: 'manniska' as const };

describe('Energi pilotfall 15.2: TEST-BYGGNAD-01, el, jan–dec 2025', () => {
  const t = lasEnergiCsv(TESTFIL_TEST_BYGGNAD_01, 'FIL-1', PILOTPROFIL, nu);

  it('ger en validerad trend med källreferenser', () => {
    expect(t.status).toBe('kraver_granskning');
    expect(t.validationResults).toEqual([]);
    expect(t.serie).toHaveLength(12);
    expect(t.serie[0]).toEqual({ manad: '2025-01', wh: 18_420_500, kalla: { filId: 'FIL-1', rad: 2 } });
    expect(t.summaKwh).toBe(156_286.5);
    expect(t.manaderMedVarde).toBe(12);
    expect(t.forandring[1]).toEqual({ manad: '2025-02', motForegaendeKwh: -1440.5 });
    expect(t.evidence).toEqual({ kallId: 'FIL-1', hamtad: nu.toISOString(), rader: 12 });
    expect(t.tidszon).toBe('Europe/Stockholm');
  });

  it('varnar för saknad baslinje och räknar ingen besparing', () => {
    expect(t.besparing).toBeNull();
    expect(t.warnings).toContain('Baslinje saknas eller är inte godkänd – ingen besparing beräknas.');
    expect(t.missingInputs).toContain('Godkänd baslinje och normaliseringsmetod');
  });

  it('kan bara fastställas av en människa med kommentar', () => {
    expect(granskaTrend(t, { id: 'agent', typ: 'ai' }, 'ok', nu).ok).toBe(false);
    expect(granskaTrend(t, anna, '', nu).ok).toBe(false);
    const g = granskaTrend(t, anna, 'Rimlig säsongsprofil', nu);
    expect(g.ok && g.trend).toMatchObject({ status: 'godkand', granskning: { av: 'anna' } });
  });
});

describe('S03 datakvalitet', () => {
  const rad = (r: string[]) => ['manad;energibarare;enhet;varde', ...r].join('\n');

  it('skiljer noll från saknat värde', () => {
    const t = lasEnergiCsv(rad(['2025-01;el;kWh;0', '2025-02;el;kWh;']), 'F', { ...PILOTPROFIL, period: { start: '2025-01', slut: '2025-03' } }, nu);
    expect(t.serie.map((x) => x.wh)).toEqual([0, null, null]);
    expect(t.luckor).toEqual(['2025-02', '2025-03']);
    expect(t.status).toBe('delvis');
    expect(t.summaKwh).toBe(0);
  });

  it('tolkar decimalkomma, decimalpunkt och tusentalsmellanslag', () => {
    expect(tolkaKwh('1 234,5')).toBe(1_234_500);
    expect(tolkaKwh('1234.5')).toBe(1_234_500);
    expect(tolkaKwh('12,345')).toBe(12_345);
    expect(tolkaKwh('')).toBeNull();
    expect(tolkaKwh('1.234,5')).toBe('ogiltigt');
    expect(tolkaKwh('abc')).toBe('ogiltigt');
  });

  it('avvisar effekt (kW) som energi och räknar om MWh', () => {
    const t = lasEnergiCsv(rad(['2025-01;el;kW;120', '2025-02;el;MWh;1,5']), 'F', { ...PILOTPROFIL, period: { start: '2025-01', slut: '2025-02' } }, nu);
    expect(t.validationResults).toEqual([{ rad: 2, falt: 'enhet', fel: 'kW är effekt, inte energi', forslag: 'Ange energi i kWh' }]);
    expect(t.serie[1]!.wh).toBe(1_500_000);
  });

  it('flaggar dubbletter utan att välja en av dem', () => {
    const t = lasEnergiCsv(rad(['2025-01;el;kWh;10', '2025-01;el;kWh;11']), 'F', { ...PILOTPROFIL, period: { start: '2025-01', slut: '2025-01' } }, nu);
    expect(t.validationResults[0]!.fel).toBe('Dubblett för 2025-01 (rad 2, 3)');
    expect(t.serie[0]!.wh).toBeNull();
    expect(t.status).toBe('blockerad');
  });

  it('avvisar fel energibärare, månad utanför perioden och negativa värden', () => {
    const t = lasEnergiCsv(rad(['2025-01;fjarrvarme;kWh;10', '2026-01;el;kWh;10', '2025-02;el;kWh;-5', '2025-13;el;kWh;1']), 'F', PILOTPROFIL, nu);
    expect(t.validationResults.map((f) => f.falt)).toEqual(['energibarare', 'manad', 'varde', 'manad']);
    expect(granskaTrend(t, anna, 'x', nu).ok).toBe(false);
  });

  it('stoppar okänt filformat', () => {
    const t = lasEnergiCsv('datum,kwh\n2025-01,5', 'F', PILOTPROFIL, nu);
    expect(t.status).toBe('fel');
    expect(t.serie).toEqual([]);
  });

  it('ger samma resultat vid återinläsning av samma fil', () => {
    const a = lasEnergiCsv(TESTFIL_TEST_BYGGNAD_01, 'FIL-1', PILOTPROFIL, nu);
    const b = lasEnergiCsv(TESTFIL_TEST_BYGGNAD_01, 'FIL-1', PILOTPROFIL, nu);
    expect(b).toEqual(a);
  });
});
