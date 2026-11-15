import { describe, expect, it } from 'vitest';
import { connector, CONNECTORER, SKILLS } from '../src/plattform/connectorer.js';
import { hamtaModul, kontrolleraRegister, MODULER, modulerIVertikal, sokModuler, VERTIKALER } from '../src/plattform/modulregister.js';
import { anvandbaraBilder, BILDREGISTER, saknadeBilder } from '../src/plattform/bildregister.js';

// Målbilden i utvecklingsprompten 2026-11-15, avsnitt 3. Exakta namn och gruppering.
const MALBILD: Record<string, string[]> = {
  'Kommun & styrning': ['Politik & Styrning', 'Val & Överförmyndare', 'Revision', 'Tillsyn', 'Municipality development'],
  'Vård & omsorg': ['Social', 'Care'],
  'Vatten, kultur & fritid': ['Vatten & Avfall', 'Kultur & Fritid', 'Idrott och bad', 'Kulturarv'],
  'Fastighet, bygg & energi': ['Property', 'Project management', 'Projektering', 'BRF', 'Energi', 'Power', 'Hållbarhet'],
  'Finans, juridik & inköp': ['Bank & Finance', 'Economy', 'Procurement', 'Legal', 'Jetleasing', 'ELSA Bidrag'],
  'Konsument & lantbruk': ['Hemvist', 'Hemklang', 'Bovärde', 'ELSA Lantbruk'],
  'Människor, hotell & industri': ['Learning', 'HR & People Development', 'Hotell', 'Industri'],
};
const NYA_FORSLAG = ['Hotell', 'Kulturarv', 'Hållbarhet', 'Idrott och bad', 'Industri', 'BRF', 'Energi', 'Projektering'];

describe('Modulregistret', () => {
  it('innehåller exakt de 32 namngivna modulerna under rätt vertikal och i rätt ordning', () => {
    expect(MODULER).toHaveLength(32);
    for (const v of VERTIKALER) expect(modulerIVertikal(v.id).map((m) => m.namn), v.namn).toEqual(MALBILD[v.namn]);
    expect(VERTIKALER.map((v) => v.namn)).toEqual(Object.keys(MALBILD));
  });

  it('är internt konsekvent', () => {
    expect(kontrolleraRegister()).toEqual([]);
  });

  it('markerar presentationens nya förslag och kallar ingen av dem klar', () => {
    expect(MODULER.filter((m) => m.nyttForslag).map((m) => m.namn).sort()).toEqual([...NYA_FORSLAG].sort());
    for (const m of MODULER.filter((x) => x.nyttForslag)) expect(m.leverans).not.toBe('klar');
  });

  it('har ingen modul som kallas klar, och alla som inte är klara har blockerare', () => {
    for (const m of MODULER) {
      expect(m.leverans).not.toBe('klar');
      expect(m.implementering).not.toBe('godkand');
      expect(m.blockerare.length, m.id).toBeGreaterThan(0);
    }
  });

  it('har ingång för varje modul och arbetsyta bara där kod finns', () => {
    for (const m of MODULER) expect(m.ingang).toBe(`/modul/${m.id}`);
    expect(MODULER.filter((m) => m.arbetsyta).map((m) => m.id).sort()).toEqual(['energi', 'val-overformyndare']);
  });

  it('refererar bara till connectorer och skills som finns i katalogen', () => {
    for (const m of MODULER) {
      for (const c of m.connectorer) expect(connector(c), `${m.id} ${c}`).toBeDefined();
      for (const s of m.skills) expect(SKILLS[s], `${m.id} ${s}`).toBeDefined();
    }
    expect(CONNECTORER.every((c) => c.ansluten === false)).toBe(true);
  });

  it('hittar modul på namn, vertikal och uppgift', () => {
    expect(sokModuler('överförm')[0]?.modul.id).toBe('val-overformyndare');
    expect(sokModuler('granska årsräkning')[0]).toMatchObject({ traff: 'uppgift', modul: { id: 'val-overformyndare' } });
    expect(sokModuler('energitrend')[0]?.modul.id).toBe('energi');
    expect(sokModuler('Vård').map((t) => t.modul.id)).toEqual(['social', 'care']);
    expect(sokModuler('upphandling').map((t) => t.modul.id)).toContain('procurement');
    expect(sokModuler('   ')).toEqual([]);
    expect(sokModuler('finns-inte-xyz')).toEqual([]);
  });

  it('har stabila id:n', () => {
    expect(hamtaModul('val-overformyndare')?.namn).toBe('Val & Överförmyndare');
    expect(hamtaModul('hr-people')?.namn).toBe('HR & People Development');
  });
});

describe('Bildregistret', () => {
  it('använder ingen bild utan inlämnat och godkänt original', () => {
    expect(anvandbaraBilder()).toEqual([]);
    expect(saknadeBilder()).toHaveLength(BILDREGISTER.length);
  });
  it('kräver fil, godkännande och alternativtext för att en bild ska användas', () => {
    const reg = [
      { ...BILDREGISTER[0]!, status: 'godkand' as const, fil: 'bilder/start.webp', alternativtext: 'Två personer vid en skärm' },
      { ...BILDREGISTER[1]!, status: 'godkand' as const, alternativtext: 'x' },
      { ...BILDREGISTER[2]!, status: 'inlamnad' as const, fil: 'bilder/v.webp', alternativtext: 'x' },
    ];
    expect(anvandbaraBilder(reg).map((b) => b.id)).toEqual(['IMG-START-HERO']);
  });
});
