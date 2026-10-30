import { describe, expect, it } from 'vitest';
import { formateraBelopp, tolkaBelopp } from '../src/domain/belopp.js';
import { korKontroller, matchaInternaOverforingar, sammanstall } from '../src/engine/kontroller.js';
import { STANDARDPARAMETRAR, type Redovisning } from '../src/engine/redovisning.js';
import { exempelArsrakning, kr, v } from '../src/exempeldata.js';

const P = STANDARDPARAMETRAR;

function medVerifieratT7(r: Redovisning, kronor = -850): Redovisning {
  const t7 = r.transaktioner.find((t) => t.id === 'T7')!;
  t7.belopp = v(kr(kronor), `${kronor},00`, 2, 'rad 6');
  return r;
}

function utfall(r: Redovisning, kontrollId: string) {
  return korKontroller(r, P).resultat.filter((x) => x.kontrollId === kontrollId);
}

describe('belopp', () => {
  it('tolkar svenska belopp till öre utan flyttal', () => {
    expect(tolkaBelopp('1 234,50')).toBe(123450);
    expect(tolkaBelopp('-12,5')).toBe(-1250);
    expect(tolkaBelopp('1234 kr')).toBe(123400);
    expect(tolkaBelopp('12.34')).toBeNull();
    expect(tolkaBelopp('-?.?00')).toBeNull();
    expect(formateraBelopp(-123450)).toBe('-1 234,50 kr');
  });
});

describe('A-05: oläsligt belopp gissas inte', () => {
  it('ger kan_inte_bedomas med originalreferens och ingen avstämning av kontot', () => {
    const r = exempelArsrakning();
    const underlag = utfall(r, 'K-UNDERLAG');
    expect(underlag).toHaveLength(1);
    expect(underlag[0]!.utfall).toBe('kan_inte_bedomas');
    expect(underlag[0]!.belagg[0]).toMatchObject({ sida: 2, plats: 'rad 6' });
    expect(underlag[0]!.beskrivning).toContain('-?.?00');

    const k1 = utfall(r, 'K-KONTOBALANS').find((x) => x.avser === 'K1')!;
    expect(k1.utfall).toBe('kan_inte_bedomas');
    expect(k1.berakning).toBeUndefined();
  });

  it('räknar inte ett saknat värde som noll i sammanställningen', () => {
    const s = sammanstall(exempelArsrakning(), P);
    expect(s.ejMedraknadePoster).toBe(1);
  });

  it('balanserar när handläggaren verifierat beloppet', () => {
    const k1 = utfall(medVerifieratT7(exempelArsrakning()), 'K-KONTOBALANS').find((x) => x.avser === 'K1')!;
    expect(k1.utfall).toBe('utford_utan_avvikelse');
    expect(k1.berakning).toMatchObject({ differens: 0 });
  });
});

describe('Kontobalans', () => {
  it('visar differens när utgående saldo inte stämmer', () => {
    const r = medVerifieratT7(exempelArsrakning(), -1_850);
    const k1 = utfall(r, 'K-KONTOBALANS').find((x) => x.avser === 'K1')!;
    expect(k1.utfall).toBe('avvikelse');
    expect(k1.berakning).toMatchObject({ differens: kr(1_000) });
  });

  it('använder bara beslutad tolerans', () => {
    const r = medVerifieratT7(exempelArsrakning(), -851);
    expect(utfall(r, 'K-KONTOBALANS').find((x) => x.avser === 'K1')!.utfall).toBe('avvikelse');
    const medTolerans = korKontroller(r, { ...P, toleransOre: 100, toleransMotivering: 'Lokalt beslut, test' });
    expect(medTolerans.resultat.find((x) => x.kontrollId === 'K-KONTOBALANS' && x.avser === 'K1')!.utfall).toBe('utford_utan_avvikelse');
  });
});

describe('A-06: dubbelposter', () => {
  it('flaggar samma underlag som laddats upp igen men raderar inget', () => {
    const r = medVerifieratT7(exempelArsrakning());
    const t2 = r.transaktioner.find((t) => t.id === 'T2')!;
    t2.underlagChecksumma = 'sha256-faktura-1';
    r.transaktioner.push({ ...structuredClone(t2), id: 'T2b', referens: 'R-002b' });
    const res = utfall(r, 'K-DUBBELPOST');
    expect(res).toHaveLength(1);
    expect(res[0]!.utfall).toBe('avvikelse');
    expect(res[0]!.avser).toBe('T2,T2b');
    expect(r.transaktioner.some((t) => t.id === 'T2b')).toBe(true);
  });

  it('flaggar inte lika belopp som ensamt kännetecken', () => {
    const r = medVerifieratT7(exempelArsrakning());
    const t2 = r.transaktioner.find((t) => t.id === 'T2')!;
    r.transaktioner.push({ ...structuredClone(t2), id: 'T2-feb', referens: 'R-020', datum: v('2026-02-28', '2026-02-28', 2, 'rad 7') });
    expect(utfall(r, 'K-DUBBELPOST')[0]!.utfall).toBe('utford_utan_avvikelse');
  });
});

describe('A-07: interna överföringar', () => {
  it('matchar uttag och insättning och räknar dem inte som extern in- eller utbetalning', () => {
    const r = medVerifieratT7(exempelArsrakning());
    expect(matchaInternaOverforingar(r, P).par).toEqual([{ uttagId: 'T3', insattningId: 'T4', belopp: kr(5_000) }]);
    const s = sammanstall(r, P);
    expect(s.interntOverfort).toBe(kr(5_000));
    expect(s.externaInbetalningar).toBe(kr(14_200 + 10_000));
    expect(s.externaUtbetalningar).toBe(kr(-9_800 - 1_350 - 850));
  });

  it('flaggar överföring utan motpost inom förvaltningen', () => {
    const r = medVerifieratT7(exempelArsrakning());
    r.transaktioner = r.transaktioner.filter((t) => t.id !== 'T4');
    const res = utfall(r, 'K-INTERN-OVERFORING');
    expect(res).toEqual([expect.objectContaining({ utfall: 'avvikelse', avser: 'T3' })]);
  });

  it('matchar inte mot konto utanför förvaltningen', () => {
    const r = medVerifieratT7(exempelArsrakning());
    r.konton[1]!.agare = 'annan';
    expect(matchaInternaOverforingar(r, P).par).toHaveLength(0);
  });
});

describe('A-08: aritmetiskt korrekt är inte rättsligt godkänt', () => {
  it('flaggar disposition utan beslut även när allt balanserar', () => {
    const korning = korKontroller(medVerifieratT7(exempelArsrakning()), P);
    expect(korning.resultat.filter((x) => x.kontrollId === 'K-KONTOBALANS').every((x) => x.utfall === 'utford_utan_avvikelse')).toBe(true);
    expect(korning.resultat.find((x) => x.kontrollId === 'K-DISPOSITION')).toMatchObject({ utfall: 'avvikelse', avser: 'T6' });
    expect(korning.forbehall).toContain('inte att förvaltningen är rättsligt godkänd');
  });
});

describe('Period, ägande, ingående och bankbesked', () => {
  it('flaggar transaktion utanför perioden', () => {
    const r = medVerifieratT7(exempelArsrakning());
    r.transaktioner[0]!.datum = v('2025-12-30', '2025-12-30', 2, 'rad 1');
    expect(utfall(r, 'K-PERIOD')).toEqual([expect.objectContaining({ utfall: 'avvikelse', avser: 'T1' })]);
  });

  it('flaggar samma konto under två namn', () => {
    const r = medVerifieratT7(exempelArsrakning());
    r.konton.push({ ...r.konton[0]!, id: 'K1-dubblett', benamning: 'Lönekonto', kontonummer: '1111 22-333-44' });
    r.saldon.push({ ...structuredClone(r.saldon[0]!), kontoId: 'K1-dubblett' });
    expect(utfall(r, 'K-AGANDE').some((x) => x.utfall === 'avvikelse' && x.avser === 'K1,K1-dubblett')).toBe(true);
  });

  it('jämför ingående saldo med föregående verifierade balans', () => {
    const r = medVerifieratT7(exempelArsrakning());
    r.foregaendeVerifieradBalans!.K2!.belopp = kr(49_000);
    expect(utfall(r, 'K-INGAENDE').find((x) => x.avser === 'K2')).toMatchObject({ utfall: 'avvikelse', berakning: { differens: kr(1_000) } });
  });

  it('kräver bankbesked för periodens sista dag', () => {
    const r = medVerifieratT7(exempelArsrakning());
    r.saldon[1]!.bankbeskedDatum = '2026-11-30';
    expect(utfall(r, 'K-UTGAENDE').find((x) => x.avser === 'K2')!.utfall).toBe('avvikelse');
    delete r.saldon[0]!.enligtBankbesked;
    expect(utfall(r, 'K-UTGAENDE').find((x) => x.avser === 'K1')!.utfall).toBe('kan_inte_bedomas');
  });

  it('kräver värdetyp och värderingsdatum för övriga tillgångar', () => {
    const r = medVerifieratT7(exempelArsrakning());
    delete r.ovrigaTillgangar[0]!.varderingsdatum;
    expect(utfall(r, 'K-VARDEN')[0]!.utfall).toBe('avvikelse');
  });

  it('ger samma resultat vid upprepad körning (deterministisk)', () => {
    const tid = new Date('2027-02-01T10:00:00Z');
    const a = korKontroller(exempelArsrakning(), P, tid);
    const b = korKontroller(exempelArsrakning(), P, tid);
    expect(a).toEqual(b);
  });
});
