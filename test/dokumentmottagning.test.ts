import { beforeEach, describe, expect, it } from 'vitest';
import { Granskningslogg } from '../src/audit/granskningslogg.js';
import type { Organisation, Session } from '../src/plattform/atkomst.js';
import { DEMOSKANNER, Dokumentmottagning, INGEN_SKANNER, type Filinlamning, type Mottagningskontext } from '../src/plattform/dokumentmottagning.js';
import { Plattform } from '../src/plattform/plattform.js';
import { plattform } from './hjalp/kunder.js';

const klocka = () => new Date('2027-03-15T09:00:00Z');
const s = (anvandarId: string): Session => ({ anvandarId, metod: 'demo', verifierad: false });
const txt = (t: string) => new TextEncoder().encode(t);
const PDF = (extra = '') => txt(`%PDF-1.7\n${extra}\n%%EOF`);
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

const KTX: Mottagningskontext = { organisationId: 'fast', uppdragId: 'U-FAST', vag: 'dra_och_slapp', gemensamt: { informationsklass: 'intern', objekt: [{ typ: 'byggnad', id: 'TEST-BYGGNAD-01' }] } };
const fil = (filnamn: string, innehall: Uint8Array, mime = 'application/pdf', extra: Partial<Filinlamning> = {}): Filinlamning => ({ filnamn, mime, innehall, ...extra });

let p: Plattform;
let m: Dokumentmottagning;
beforeEach(() => {
  p = plattform();
  m = new Dokumentmottagning(p, DEMOSKANNER, undefined, klocka);
});

describe('Mottagning: filval och dra-och-släpp', () => {
  it('ger en kvittens per fil, och fel i en fil påverkar inte de andra', () => {
    const r = m.taEmot(s('frida'), KTX, [
      fil('faktura-2025-03.pdf', PDF('a')),
      fil('makro.exe', txt('MZ'), 'application/x-msdownload'),
      fil('trasig.pdf', txt('inte en pdf'), 'application/pdf'),
      fil('virus.txt', txt(EICAR), 'text/plain'),
      fil('el-2025.csv', txt('manad;varde\n2025-01;100'), 'text/csv'),
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.varde.map((k) => k.utfall)).toEqual(['mottagen', 'avvisad', 'avvisad', 'avvisad', 'mottagen']);
    expect(r.varde[1]!.meddelande).toContain('Filtypen är inte tillåten');
    expect(r.varde[2]!.meddelande).toContain('PDF-huvud');
    expect(r.varde[3]!.meddelande).toContain('skadlig kod');
    expect((m.lista(s('frida'), 'fast') as any).varde).toHaveLength(2);
  });

  it('filval och dra-och-släpp går genom samma kontroller', () => {
    const a = m.taEmot(s('frida'), { ...KTX, vag: 'filval' }, [fil('tom.pdf', new Uint8Array(), 'application/pdf')]);
    const b = m.taEmot(s('frida'), { ...KTX, vag: 'dra_och_slapp' }, [fil('tom.pdf', new Uint8Array(), 'application/pdf')]);
    expect(a.ok && b.ok && a.varde[0]!.kontroller).toEqual(b.ok && b.varde[0]!.kontroller);
  });

  it('föreslår dokumenttyp och period som kunden bekräftar; gemensamma uppgifter gäller alla filer', () => {
    const r = m.taEmot(s('frida'), KTX, [fil('faktura-2025-03.pdf', PDF('x'))]);
    const id = r.ok ? r.varde[0]!.dokumentId! : '';
    const d = m.hamta(s('frida'), id);
    expect(d.ok && d.varde.status).toBe('behover_kompletteras');
    expect(d.ok && d.varde.forslag.dokumenttyp).toMatchObject({ varde: 'Faktura', bekraftad: false });
    expect(d.ok && d.varde.metadata.objekt).toEqual([{ typ: 'byggnad', id: 'TEST-BYGGNAD-01' }]);
    const k = m.komplettera(s('frida'), id, { bekraftaForslag: ['dokumenttyp', 'period'] });
    expect(k.ok && k.varde.status).toBe('granskas');
    expect(k.ok && k.varde.metadata).toMatchObject({ dokumenttyp: 'Faktura', period: '2025-03' });
  });

  it('DWG lagras men anges som utan innehållsextraktion', () => {
    const r = m.taEmot(s('frida'), KTX, [fil('plan-ritning.dwg', txt('AC1032...'), 'image/vnd.dwg')]);
    const id = r.ok ? r.varde[0]!.dokumentId! : '';
    expect(m.hamta(s('frida'), id).ok && (m.hamta(s('frida'), id) as any).varde.stod).toBe('endast_lagring');
  });

  it('stoppar för stora filer och för många filer', () => {
    const liten = new Dokumentmottagning(p, DEMOSKANNER, { maxStorlekByte: 10, maxStorlekStatus: 'forslag', maxFilerPerInlamning: 2 }, klocka);
    const r = liten.taEmot(s('frida'), KTX, [fil('stor.pdf', PDF('x'.repeat(50)))]);
    expect(r.ok && r.varde[0]!.meddelande).toContain('för stor');
    expect(liten.taEmot(s('frida'), KTX, [fil('a.pdf', PDF()), fil('b.pdf', PDF()), fil('c.pdf', PDF())])).toEqual({ ok: false, skal: 'Högst 2 filer per inlämning' });
  });
});

describe('Dubbletter och omförsök', () => {
  it('samma fil vid omförsök ger samma dokument-ID och inget nytt underlag', () => {
    const f = fil('avtal.pdf', PDF('samma'));
    const a = m.taEmot(s('frida'), KTX, [f]);
    const b = m.taEmot(s('frida'), { ...KTX, vag: 'filval' }, [{ ...f, filnamn: 'avtal (1).pdf' }]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.varde[0]!.utfall).toBe('dubblett');
    expect(b.varde[0]!.dokumentId).toBe(a.varde[0]!.dokumentId);
    expect(m.lista(s('frida'), 'fast').ok && (m.lista(s('frida'), 'fast') as any).varde).toHaveLength(1);
  });

  it('en annan kunds identiska fil är ingen dubblett och avslöjar inget', () => {
    const f = fil('avtal.pdf', PDF('samma'));
    const a = m.taEmot(s('frida'), KTX, [f]);
    const b = m.taEmot(s('otto'), { organisationId: 'bolag2', uppdragId: 'U-B2', vag: 'filval' }, [f]);
    expect(b.ok && b.varde[0]!.utfall).toBe('mottagen');
    expect(b.ok && a.ok && b.varde[0]!.dokumentId).not.toBe(a.ok && a.varde[0]!.dokumentId);
  });
});

describe('Versionsbyte', () => {
  it('ny version ersätter tidigare, behåller handlings-ID och meddelar beroende tjänster', () => {
    const handelser: string[] = [];
    m.vidKallandring((h) => handelser.push(`${h.tidigareDokumentId}->${h.nyttDokumentId}`));
    const a = m.taEmot(s('frida'), KTX, [fil('energidekl-2024.pdf', PDF('v1'))]);
    const id1 = a.ok ? a.varde[0]!.dokumentId! : '';
    const b = m.taEmot(s('frida'), KTX, [fil('energidekl-2024-rev.pdf', PDF('v2'), 'application/pdf', { ersatter: id1 })]);
    const id2 = b.ok ? b.varde[0]!.dokumentId! : '';
    const d1 = m.hamta(s('frida'), id1);
    const d2 = m.hamta(s('frida'), id2);
    expect(d1.ok && d1.varde.status).toBe('ersatt');
    expect(d2.ok && d1.ok && d2.varde.handlingsId).toBe(d1.ok && d1.varde.handlingsId);
    expect(d2.ok && d2.varde.version).toBe(2);
    expect(handelser).toEqual([`${id1}->${id2}`]);
    // Originalet för version 1 finns kvar oförändrat.
    const o = m.oppnaOriginal(s('frida'), id1);
    expect(o.ok && new TextDecoder().decode(o.varde)).toContain('v1');
    // En redan ersatt version kan inte ersättas igen.
    const c = m.taEmot(s('frida'), KTX, [fil('x.pdf', PDF('v3'), 'application/pdf', { ersatter: id1 })]);
    expect(c.ok && c.varde[0]!.utfall).toBe('avvisad');
  });
});

describe('Status och granskning', () => {
  it('utan skanner stannar dokumentet i kontrolleras och kan inte godkännas', () => {
    const utan = new Dokumentmottagning(p, INGEN_SKANNER, undefined, klocka);
    const r = utan.taEmot(s('frida'), { ...KTX, gemensamt: { ...KTX.gemensamt, dokumenttyp: 'Faktura', period: '2025' } }, [fil('a.pdf', PDF())]);
    const id = r.ok ? r.varde[0]!.dokumentId! : '';
    expect(r.ok && r.varde[0]!.status).toBe('kontrolleras');
    expect(utan.godkannForAnalys(s('frida'), id, 'ok').ok).toBe(false);
  });

  it('granskare godkänner för analys eller skickar tillbaka; läsare kan inte ändra', () => {
    const r = m.taEmot(s('frida'), { ...KTX, gemensamt: { ...KTX.gemensamt, dokumenttyp: 'Faktura', period: '2025' } }, [fil('a.pdf', PDF())]);
    const id = r.ok ? r.varde[0]!.dokumentId! : '';
    expect(m.godkannForAnalys(s('lena'), id, 'ok')).toEqual({ ok: false, skal: 'Läsare får inte ändra' });
    expect(m.begarKomplettering(s('fia'), id, 'Period stämmer inte med fakturan').ok).toBe(true);
    expect(m.komplettera(s('frida'), id, { metadata: { period: '2025-03' } }).ok).toBe(true);
    const g = m.godkannForAnalys(s('fia'), id, 'Kontrollerad mot original');
    expect(g.ok && g.varde.status).toBe('godkand_for_analys');
    expect(g.ok && g.varde.historik.map((h) => h.status)).toEqual(['mottagen', 'granskas', 'behover_kompletteras', 'granskas', 'godkand_for_analys']);
    expect(m.komplettera(s('frida'), id, { metadata: { period: '2024' } }).ok).toBe(false);
  });
});

describe('Kundisolering (negativt test, införandesteg 2)', () => {
  it('en kund kan inte läsa, öppna, lista, ändra eller ersätta en annan kunds underlag', () => {
    const r = m.taEmot(s('frida'), KTX, [fil('hemligt-avtal.pdf', PDF('hemligt'))]);
    const id = r.ok ? r.varde[0]!.dokumentId! : '';
    const neutralt = { ok: false, skal: 'Dokumentet finns inte eller du saknar behörighet' };
    expect(m.hamta(s('otto'), id)).toEqual(neutralt);
    expect(m.hamta(s('otto'), 'DOK-999999')).toEqual(neutralt);
    expect(m.oppnaOriginal(s('otto'), id)).toEqual(neutralt);
    expect(m.komplettera(s('otto'), id, { metadata: { period: '2020' } })).toEqual(neutralt);
    expect(m.godkannForAnalys(s('otto'), id, 'x')).toEqual(neutralt);
    expect(m.lista(s('otto'), 'fast').ok).toBe(false);
    // Lämna in till fel kunds uppdrag eller ange egen organisation med annans uppdrag.
    expect(m.taEmot(s('otto'), KTX, [fil('a.pdf', PDF())]).ok).toBe(false);
    expect(m.taEmot(s('otto'), { ...KTX, organisationId: 'bolag2' }, [fil('a.pdf', PDF())]).ok).toBe(false);
    // Ersätta annans dokument från eget uppdrag.
    const e = m.taEmot(s('otto'), { organisationId: 'bolag2', uppdragId: 'U-B2', vag: 'filval' }, [fil('b.pdf', PDF('b'), 'application/pdf', { ersatter: id })]);
    expect(e.ok && e.varde[0]!.utfall).toBe('avvisad');
    expect(m.hamta(s('frida'), id).ok && (m.hamta(s('frida'), id) as any).varde.status).not.toBe('ersatt');
  });

  it('ESM-anställda får inte kundens underlag utan uppdrag, och utloggad nekas', () => {
    const r = m.taEmot(s('frida'), KTX, [fil('a.pdf', PDF())]);
    const id = r.ok ? r.varde[0]!.dokumentId! : '';
    expect(m.hamta(s('erik'), id).ok).toBe(false);
    expect(m.hamta(null, id).ok).toBe(false);
  });

  it('öppning av original loggas i hashkedjan', () => {
    const r = m.taEmot(s('frida'), KTX, [fil('a.pdf', PDF())]);
    m.oppnaOriginal(s('fia'), r.ok ? r.varde[0]!.dokumentId! : '');
    expect(p.logg.handelser().some((h) => h.handelse === 'dokument_original_oppnat' && h.aktorId === 'fia')).toBe(true);
    expect(Granskningslogg.verifieraKedja(p.logg.handelser()).ok).toBe(true);
  });
});
