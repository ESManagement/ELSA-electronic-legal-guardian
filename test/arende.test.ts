import { describe, expect, it } from 'vitest';
import { filtreraSoktraffar, provaAtkomst, type Anvandare } from '../src/arende/behorighet.js';
import { bevakaKo } from '../src/arende/kobevakning.js';
import { foreslaKoppling } from '../src/arende/mottagning.js';
import { provaOvergang, type Delegation } from '../src/arende/status.js';
import type { Arende, Handling } from '../src/domain/typer.js';
import { Regelregister, type Regelkort } from '../src/regler/regelkort.js';

const arende: Arende = {
  id: 'AR-1',
  doman: 'overformyndare',
  typ: 'redovisningsgranskning',
  uppdragId: 'U1',
  huvudmanId: 'P-1',
  agare: 'handlaggare-1',
  status: 'underlagskontroll_pagar',
  mottaget: '2027-02-20T08:00:00Z',
};
const nu = new Date('2027-03-10T09:00:00Z');

describe('A-01: personkoppling sker inte på namnlikhet', () => {
  const handling: Handling = {
    id: 'D-1',
    arendeId: null,
    checksumma: 'abc',
    ankomsttid: '2027-02-21T08:00:00Z',
    avsandare: 'post',
    typ: 'arsrakning',
    lasstatus: 'last',
    uppgivetNamn: 'Anna Andersson',
    uppgivenPersonId: 'P-1',
  };

  it('lägger overifierad handling i utredningskö', () => {
    expect(foreslaKoppling(handling, [arende], [])).toMatchObject({ utfall: 'utredningsko' });
  });

  it('kopplar när personen är verifierad och ärendet entydigt', () => {
    expect(foreslaKoppling({ ...handling, verifieradPersonId: 'P-1' }, [arende], [])).toEqual({
      utfall: 'koppla',
      arendeId: 'AR-1',
      grund: 'verifierad_person_och_arende',
    });
  });

  it('kopplar inte automatiskt när två ärenden är möjliga', () => {
    expect(foreslaKoppling({ ...handling, verifieradPersonId: 'P-1' }, [arende, { ...arende, id: 'AR-2' }], [])).toMatchObject({ utfall: 'utredningsko' });
  });

  it('känner igen redan registrerad handling', () => {
    expect(foreslaKoppling(handling, [arende], [{ ...handling, id: 'D-0' }])).toEqual({ utfall: 'redan_registrerad', handlingId: 'D-0' });
  });
});

describe('Behörighet (T-03)', () => {
  const valadmin: Anvandare = { id: 'v1', identifieradMedELeg: true, roller: [{ roll: 'valadministrator', doman: 'val', giltigFran: '2026-01-01' }] };
  const handlaggareVal: Anvandare = { id: 'v2', identifieradMedELeg: true, roller: [{ roll: 'handlaggare', doman: 'val', giltigFran: '2026-01-01' }] };
  const handlaggare: Anvandare = { id: 'h1', identifieradMedELeg: true, roller: [{ roll: 'handlaggare', doman: 'overformyndare', giltigFran: '2026-01-01' }] };
  const sysadmin: Anvandare = { id: 's1', identifieradMedELeg: true, roller: [{ roll: 'systemadministrator', doman: 'overformyndare', giltigFran: '2026-01-01' }] };

  it('A-02: valdomänen får inga träffar från överförmyndarärenden', () => {
    expect(provaAtkomst(valadmin, arende, 'sok', nu).tillats).toBe(false);
    expect(provaAtkomst(handlaggareVal, arende, 'las', nu).tillats).toBe(false);
    expect(filtreraSoktraffar(valadmin, [{ arende, utdrag: 'årsräkning' }], nu)).toEqual([]);
  });

  it('handläggare i överförmyndardomänen får läsa', () => {
    expect(provaAtkomst(handlaggare, arende, 'las', nu).tillats).toBe(true);
  });

  it('systemadministratör läser inte ärendeinnehåll genom sin roll', () => {
    expect(provaAtkomst(sysadmin, arende, 'las', nu).tillats).toBe(false);
  });

  it('tillfällig åtkomst kräver ändamål och upphör vid tidsgränsen', () => {
    const support: Anvandare = { ...sysadmin, tillfalligAtkomst: [{ arendeId: 'AR-1', andamal: 'felsökning INC-9', godkandAv: 'processagare-1', giltigTill: '2027-03-10T10:00:00Z' }] };
    expect(provaAtkomst(support, arende, 'las', nu).tillats).toBe(true);
    expect(provaAtkomst(support, arende, 'andra', nu).tillats).toBe(false);
    expect(provaAtkomst(support, arende, 'las', new Date('2027-03-10T11:00:00Z')).tillats).toBe(false);
  });

  it('A-11: e-legitimation utan företrädaruppdrag ger ingen åtkomst', () => {
    const person: Anvandare = { id: 'x', identifieradMedELeg: true, roller: [{ roll: 'stallforetradare', doman: 'overformyndare', giltigFran: '2020-01-01' }] };
    expect(provaAtkomst(person, arende, 'las', nu).tillats).toBe(false);
    const medUppdrag = { ...person, egnaUppdrag: [{ uppdragId: 'U1', giltigFran: '2020-01-01' }] };
    expect(provaAtkomst(medUppdrag, arende, 'las', nu).tillats).toBe(true);
    expect(provaAtkomst(medUppdrag, { ...arende, uppdragId: 'U-annan' }, 'las', nu).tillats).toBe(false);
  });

  it('A-14: återkallad behörighet slår igenom direkt', () => {
    const aterkallad: Anvandare = { ...handlaggare, roller: [{ ...handlaggare.roller[0]!, aterkallad: true }] };
    expect(provaAtkomst(aterkallad, arende, 'las', nu).tillats).toBe(false);
    expect(filtreraSoktraffar(aterkallad, [{ arende }], nu)).toEqual([]);
  });
});

describe('Statusmaskin (T-02, G-02)', () => {
  const delegation: Delegation = { delegatId: 'beslutsfattare-1', arendetyper: ['redovisningsgranskning'], giltigFran: '2027-01-01', beslutsreferens: 'Delegationsordning 2027 p. 4.2' };
  const bas = { arendetyp: 'redovisningsgranskning' as const, datum: '2027-03-10', delegationer: [delegation] };

  it('AI kan aldrig föra ett utkast till beslut', () => {
    expect(provaOvergang('beslutsutkast', 'beslutat', { ...bas, aktor: { id: 'modell', typ: 'ai' } }).ok).toBe(false);
  });

  it('beslut kräver giltig delegation, inte bara en roll', () => {
    expect(provaOvergang('beslutsutkast', 'beslutat', { ...bas, aktor: { id: 'handlaggare-1', typ: 'manniska' } }).ok).toBe(false);
    expect(provaOvergang('beslutsutkast', 'beslutat', { ...bas, aktor: { id: 'beslutsfattare-1', typ: 'manniska' } }).ok).toBe(true);
    expect(provaOvergang('beslutsutkast', 'beslutat', { ...bas, datum: '2026-12-31', aktor: { id: 'beslutsfattare-1', typ: 'manniska' } }).ok).toBe(false);
  });

  it('komplettering kan inte markeras skickad utan expediering', () => {
    const aktor = { id: 'handlaggare-1', typ: 'manniska' as const };
    expect(provaOvergang('komplettering_forbereds', 'komplettering_skickad', { ...bas, aktor }).ok).toBe(false);
    expect(provaOvergang('komplettering_forbereds', 'komplettering_skickad', { ...bas, aktor, expedieringId: 'EXP-1' }).ok).toBe(true);
  });

  it('redovisningsgranskning kan inte avslutas innan granskningen passerat avslutsgrinden', () => {
    const aktor = { id: 'handlaggare-1', typ: 'manniska' as const };
    expect(provaOvergang('sakuppgifter_verifierade', 'avslutat', { ...bas, aktor }).ok).toBe(false);
    expect(provaOvergang('sakuppgifter_verifierade', 'avslutat', { ...bas, aktor, granskningAvslutad: true }).ok).toBe(true);
  });

  it('otillåtna hopp nekas', () => {
    expect(provaOvergang('mottaget', 'beslutat', { ...bas, aktor: { id: 'beslutsfattare-1', typ: 'manniska' } }).ok).toBe(false);
  });
});

describe('A-04: rätt regelversion utifrån tillämpningsdatum', () => {
  const bas: Omit<Regelkort, 'version' | 'giltigFran' | 'giltigTill' | 'verifieringsstatus'> = {
    regelId: 'OF-ARSRAKNING-INNEHALL',
    forfattning: 'Ställföreträdarförordningen (2026:667)',
    lagrum: '2 kap.',
    kalltyp: 'forordning',
    beskrivning: 'Innehåll i årsräkning',
  };

  it('väljer gällande version, inte framtida', () => {
    const reg = new Regelregister([
      { ...bas, version: '1', giltigFran: '2026-07-01', giltigTill: '2027-12-31', verifieringsstatus: 'verifierad', granskare: 'jurist-1', godkannandedatum: '2026-10-30' },
      { ...bas, version: '2', giltigFran: '2028-01-01', verifieringsstatus: 'verifierad', granskare: 'jurist-1', godkannandedatum: '2026-10-30' },
    ]);
    expect(reg.valj(bas.regelId, '2027-03-10')).toMatchObject({ status: 'ok', regel: { version: '1' } });
    expect(reg.valj(bas.regelId, '2028-02-01')).toMatchObject({ status: 'ok', regel: { version: '2' } });
  });

  it('stoppar när regeln inte är juridiskt verifierad, saknas eller är i konflikt', () => {
    const reg = new Regelregister([{ ...bas, version: '1', giltigFran: '2026-07-01', verifieringsstatus: 'ej_verifierad' }]);
    expect(reg.valj(bas.regelId, '2027-03-10')).toMatchObject({ status: 'stopp', skal: 'ej_verifierad' });
    expect(reg.valj('OKAND', '2027-03-10')).toMatchObject({ status: 'stopp', skal: 'underlag_saknas' });
    const konflikt = new Regelregister([
      { ...bas, version: 'a', giltigFran: '2026-07-01', verifieringsstatus: 'verifierad', granskare: 'j', godkannandedatum: '2026-10-01' },
      { ...bas, version: 'b', giltigFran: '2027-01-01', verifieringsstatus: 'verifierad', granskare: 'j', godkannandedatum: '2026-10-01' },
    ]);
    expect(konflikt.valj(bas.regelId, '2027-03-10')).toMatchObject({ status: 'stopp', skal: 'kallkonflikt' });
  });

  it('kräver granskare för att en regel ska kunna registreras som verifierad', () => {
    expect(() => new Regelregister([{ ...bas, version: '1', giltigFran: '2026-07-01', verifieringsstatus: 'verifierad' }])).toThrow(/granskare/);
  });
});

describe('Köbevakning (problemkort 1)', () => {
  it('signalerar ägarlösa och liggande ärenden', () => {
    const signaler = bevakaKo(
      [
        { ...arende, id: 'A', agare: undefined },
        { ...arende, id: 'B', senasteMateriellaAktivitet: '2026-12-01T00:00:00Z' },
        { ...arende, id: 'C', status: 'svar_invantas', senasteMateriellaAktivitet: '2027-01-15T00:00:00Z' },
        { ...arende, id: 'D', status: 'avslutat', agare: undefined },
      ],
      nu,
      { dagarUtanMateriellAktivitet: 60, dagarSvarInvantas: 30 },
    );
    expect(signaler).toEqual([
      { arendeId: 'A', signal: 'agarlost' },
      { arendeId: 'B', signal: 'ingen_materiell_aktivitet', dagar: 99 },
      { arendeId: 'C', signal: 'svar_invantas_lange', dagar: 54 },
    ]);
  });
});
