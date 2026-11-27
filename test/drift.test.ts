import { describe, expect, it } from 'vitest';
import { beraknaEffekt, type Matpunkt } from '../src/drift/effektmatning.js';
import { motornsRegler, provaDriftgrind, VO_LAGE_2026_11_27, type VoLage } from '../src/drift/valOverformyndare.js';
import { Regelregister, type Regelkort } from '../src/regler/regelkort.js';

const punkter = (period: Matpunkt['period'], n: number, minuter: number, dagar: number, kompl: number, av = 'anna'): Matpunkt[] =>
  Array.from({ length: n }, (_, i) => ({ arendeId: `${period}-${i}`, period, arbetstidMinuter: minuter, ledtidDagar: dagar, komplettering: i < kompl, registreradAv: av }));

const kort = (status: Regelkort['verifieringsstatus']): Regelkort[] =>
  motornsRegler().map((regelId) => ({
    regelId, version: '1.0.0', forfattning: 'FB 14 kap.', lagrum: '–', kalltyp: 'lag', giltigFran: '2026-01-01', verifieringsstatus: status,
    beskrivning: regelId, ...(status === 'verifierad' ? { granskare: 'jurist', godkannandedatum: '2026-12-01' } : {}),
  }));

describe('Effektmätning', () => {
  const data = [...punkter('baslinje', 20, 120, 40, 10), ...punkter('pilot', 20, 75, 25, 5)];

  it('räknar median och förändring mot baslinjen', () => {
    const r = beraknaEffekt(data, { granskare: 'rebecka', datum: '2027-03-01' });
    expect(r.status).toBe('verifierad');
    expect(r.matt[0]).toMatchObject({ baslinje: 120, pilot: 75, forandringProcent: -37.5 });
    expect(r.matt[2]).toMatchObject({ baslinje: 50, pilot: 25, forandringProcent: -50 });
  });

  it('redovisar ingen effekt med för litet underlag', () => {
    expect(beraknaEffekt(data.slice(0, 30)).status).toBe('otillrackligt_underlag');
  });

  it('kräver granskare som inte själv registrerat mätpunkter', () => {
    expect(beraknaEffekt(data).status).toBe('matt_ej_granskad');
    expect(beraknaEffekt(data, { granskare: 'anna', datum: '2027-03-01' }).status).toBe('matt_ej_granskad');
  });

  it('flaggar dubblerade ärenden', () => {
    const r = beraknaEffekt([...data, data[0]!], { granskare: 'rebecka', datum: '2027-03-01' });
    expect(r.status).toBe('otillrackligt_underlag');
  });
});

describe('Driftgrind Val & Överförmyndare', () => {
  it('läget i dag: kvar på steg 4, publikt repo och overifierade regelkort stoppar piloten', () => {
    const g = provaDriftgrind(VO_LAGE_2026_11_27, new Regelregister(kort('ej_verifierad')), '2026-11-27');
    expect(g.tillatetSteg).toBe(4);
    expect(g.hinder.map((h) => h.id)).toEqual(expect.arrayContaining(['VO-5-REPO', 'VO-5-REGEL', 'VO-5-AVTAL', 'VO-5-PUB']));
    expect(g.hinder.find((h) => h.id === 'VO-5-REGEL')!.detalj).toMatch(/ej verifierade/);
  });

  const steg5: VoLage = {
    repoSynlighet: 'privat', pilotnamnd: { kommun: 'Pilotkommun', namnd: 'overformyndarnamnd' }, signeradBestallning: 'AVT-1', pubAvtal: 'PUB-1',
    rattAttMata: 'AVT-1 §4', dpia: 'DPIA-1', euDriftBeslutad: 'Beslut 2026-12', plattformsSteg: 5,
  };

  it('ger steg 5 när avtal, repo och regelkort är på plats', () => {
    expect(provaDriftgrind(steg5, new Regelregister(kort('verifierad')), '2027-01-10').tillatetSteg).toBe(5);
  });

  it('steg 7 kräver att plattformen är i drift', () => {
    const effekt = beraknaEffekt([...punkter('baslinje', 20, 120, 40, 10), ...punkter('pilot', 20, 75, 25, 5)], { granskare: 'rebecka', datum: '2027-06-01' });
    const lage: VoLage = { ...steg5, verkligaDataImporterade: 'IMP-1', effekt, release: '1.0.0', kundinloggningEleg: 'BankID', support: 'ESM support', backupTestad: 'Test 2027-09', granskningsloggKedjaHel: true };
    const regler = new Regelregister(kort('verifierad'));
    expect(provaDriftgrind(lage, regler, '2027-10-01').tillatetSteg).toBe(6);
    expect(provaDriftgrind({ ...lage, plattformsSteg: 7 }, regler, '2027-10-01').tillatetSteg).toBe(7);
  });
});
