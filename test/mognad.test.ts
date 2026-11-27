import { describe, expect, it } from 'vitest';
import {
  bedomMognad, hamtaStegplan, kontrolleraStegplaner, MAX_LEDANDE_SAMTIDIGT, MOGNADSSKALA, STEGPLANER,
  type Stegbevis, type Stegplan,
} from '../src/plattform/mognad.js';
import { hamtaModul } from '../src/plattform/modulregister.js';

const bevis = (planId: string, ...typer: Stegbevis['typ'][]): Stegbevis[] =>
  typer.map((typ) => ({ planId, typ, datum: '2026-11-27', registreradAv: 'daniel', dokumentref: `REF-${typ}` }));

const TILL_STEG_4 = ['registerpost', 'specifikation', 'prototyp_fiktiva_data', 'verksamhetsagare_utsedd', 'krav_godkanda', 'floden_testade_i_kod'] as const;

describe('Mognadsskalan', () => {
  it('har åtta steg i ordning från Idé till Skalad', () => {
    expect(MOGNADSSKALA.map((s) => s.namn)).toEqual(['Idé', 'Förslag', 'Demo', 'Krav och ägare', 'Pilotkund med avtal', 'Pilot med mätt effekt', 'I drift', 'Skalad']);
  });

  it('stegplanen följer underlagets principer', () => {
    expect(kontrolleraStegplaner()).toEqual([]);
    expect(STEGPLANER.filter((p) => p.ledande && p.id !== 'elsa-start')).toHaveLength(MAX_LEDANDE_SAMTIDIGT);
  });

  it('alla registerkopplingar pekar på moduler som finns', () => {
    for (const p of STEGPLANER) if (p.modulId) expect(hamtaModul(p.modulId), p.id).toBeDefined();
  });

  it('Val och överförmyndare står på steg 4 med pilot, mätt och drift kvar', () => {
    const p = hamtaStegplan('val-overformyndare')!;
    expect(p.bedomtNu).toBe(4);
    expect(p.treSteg.map((s) => s.steg)).toEqual([5, 6, 7]);
    expect(p.villkor).toMatch(/Repot privat/);
  });

  it('upptäcker för många ledande moduler och drift före plattformen', () => {
    const extra: Stegplan = { ...hamtaStegplan('energi')!, id: 'x', treSteg: [{ steg: 5, nar: '2026-12', bevis: '' }, { steg: 6, nar: '2027-01', bevis: '' }, { steg: 7, nar: '2027-01', bevis: '' }] };
    const fel = kontrolleraStegplaner([...STEGPLANER, extra]);
    expect(fel.some((f) => f.includes('högst 6'))).toBe(true);
    expect(fel).toContain('x: når drift före plattformen');
  });
});

describe('Stegbedömning ur bevis', () => {
  const plan = hamtaStegplan('val-overformyndare')!;

  it('räknar ingenting utan bevis, även om planen säger steg 4', () => {
    const b = bedomMognad(plan, [], 4);
    expect(b.uppnatt).toBe(0);
    expect(b.bedomningUtanBevis).toBe(4);
  });

  it('en demo ger högst steg 3', () => {
    expect(bedomMognad(plan, bevis(plan.id, 'registerpost', 'saljsida', 'prototyp_fiktiva_data'), 7).uppnatt).toBe(3);
  });

  it('steg räknas i följd: ett avtal utan krav och ägare ger inte steg 5', () => {
    const b = bedomMognad(plan, bevis(plan.id, 'registerpost', 'saljsida', 'prototyp_fiktiva_data', 'signerad_bestallning', 'pub_avtal', 'ratt_att_mata'), 7);
    expect(b.uppnatt).toBe(3);
    expect(b.nasta?.saknas).toEqual(['verksamhetsagare_utsedd', 'krav_godkanda', 'floden_testade_i_kod']);
  });

  it('bevis utan dokumentreferens räknas inte', () => {
    const b = bedomMognad(plan, [{ planId: plan.id, typ: 'registerpost', datum: '2026-11-27', registreradAv: 'daniel', dokumentref: ' ' }], 7);
    expect(b.uppnatt).toBe(0);
  });

  it('steg 7 blockeras tills plattformen själv är i drift', () => {
    const alla = bevis(plan.id, ...TILL_STEG_4, 'signerad_bestallning', 'pub_avtal', 'ratt_att_mata', 'verkliga_data', 'baslinje', 'effekt_matt_och_granskad', 'godkand_release', 'kund_loggar_in', 'support', 'backup_testad');
    const fore = bedomMognad(plan, alla, 6);
    expect(fore.uppnatt).toBe(6);
    expect(fore.nasta).toMatchObject({ steg: 7, saknas: [], blockeradAvPlattform: true });
    expect(bedomMognad(plan, alla, 7).uppnatt).toBe(7);
  });
});
