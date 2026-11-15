import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '../src/plattform/atkomst.js';
import { DEMOSKANNER, Dokumentmottagning } from '../src/plattform/dokumentmottagning.js';
import type { Plattform } from '../src/plattform/plattform.js';
import { arendebeteckning, Minnesnummerlager, nastaVersion, Rapportregister, STANDARDRAPPORT, tilldelaArendenummer, type Rapportblock, type Rapportversion } from '../src/plattform/rapportregister.js';
import { klocka, plattform } from './hjalp/kunder.js';

const s = (anvandarId: string): Session => ({ anvandarId, metod: 'demo', verifierad: false });
const PDF = (t: string) => new TextEncoder().encode(`%PDF-1.7\n${t}`);
const FORMAT = STANDARDRAPPORT.nummerformat;

const INNEHALL: Rapportblock[] = [
  { id: 'b1', rubrik: 'Sammanfattning', text: 'Elanvändningen följer säsongsprofilen.', ursprung: 'ai_utkast', kallor: [] },
  { id: 'b2', rubrik: 'Förbrukning per period', text: '156 MWh under 2025.', ursprung: 'manniska', kallor: [] },
  { id: 'b3', rubrik: 'Kostnad', text: null, ursprung: 'manniska', kallor: [] },
  { id: 'b4', rubrik: 'Datakvalitet och bortfall', text: 'Inga luckor.', ursprung: 'manniska', kallor: [] },
  { id: 'b5', rubrik: 'Metod', text: 'Summa av månadsvärden.', ursprung: 'manniska', kallor: [] },
];

let p: Plattform;
let dok: Dokumentmottagning;
let reg: Rapportregister;
let kallaId: string;

function godkantDokument(namn: string, innehall: string) {
  const r = dok.taEmot(s('frida'), { organisationId: 'fast', uppdragId: 'U-FAST', vag: 'filval', gemensamt: { dokumenttyp: 'Förbrukningsdata', period: '2025', informationsklass: 'intern', objekt: [{ typ: 'byggnad', id: 'TEST-BYGGNAD-01' }] } }, [{ filnamn: namn, mime: 'application/pdf', innehall: PDF(innehall) }]);
  const id = r.ok ? r.varde[0]!.dokumentId! : '';
  dok.godkannForAnalys(s('fia'), id, 'Kontrollerad');
  return id;
}

async function nyRapport(arendenyckel = 'form-1') {
  const a = await reg.skapaArende(s('frida'), 'U-FAST', 'Energiuppföljning 2025', arendenyckel);
  if (!a.ok) throw new Error(a.skal);
  const r = reg.skapaRapport(s('frida'), { arendeId: a.varde.arendeId, typ: 'energirapport', titel: 'Energirapport 2025', objekt: [{ typ: 'byggnad', id: 'TEST-BYGGNAD-01' }], period: '2025', mottagare: ['Förvaltningschef'], informationsklass: 'intern', innehall: INNEHALL, kallor: [kallaId], berakningsmetod: 'Summa 1.0' });
  if (!r.ok) throw new Error(r.skal);
  return r.varde;
}

beforeEach(() => {
  p = plattform();
  dok = new Dokumentmottagning(p, DEMOSKANNER, undefined, klocka);
  reg = new Rapportregister(p, dok, new Minnesnummerlager(), STANDARDRAPPORT, klocka);
  kallaId = godkantDokument('el-2025.pdf', 'v1');
});

describe('Kollisionssäker nummertilldelning', () => {
  it('100 samtidiga tilldelningar ger 100 unika nummer i obruten serie, trots krockar', async () => {
    const lager = new Minnesnummerlager();
    const nummer = await Promise.all(Array.from({ length: 100 }, (_, i) => tilldelaArendenummer(lager, FORMAT, 'fast', 2027, `nyckel-${i}`, 500)));
    expect(new Set(nummer).size).toBe(100);
    expect(lager.krockar).toBeGreaterThan(0);
    expect([...nummer].sort().at(-1)).toBe('ELSA-FAST-2027-0100');
  });

  it('omförsök med samma idempotensnyckel ger samma nummer, även samtidigt', async () => {
    const lager = new Minnesnummerlager();
    const nummer = await Promise.all(Array.from({ length: 10 }, () => tilldelaArendenummer(lager, FORMAT, 'fast', 2027, 'samma-formular', 500)));
    expect(new Set(nummer).size).toBe(1);
    expect(await tilldelaArendenummer(lager, FORMAT, 'fast', 2027, 'samma-formular')).toBe(nummer[0]);
  });

  it('löpserien är unik per kund och år', async () => {
    const lager = new Minnesnummerlager();
    expect(await tilldelaArendenummer(lager, FORMAT, 'fast', 2027, 'a')).toBe('ELSA-FAST-2027-0001');
    expect(await tilldelaArendenummer(lager, FORMAT, 'bolag2', 2027, 'a')).toBe('ELSA-BOLAG2-2027-0001');
    expect(await tilldelaArendenummer(lager, FORMAT, 'fast', 2028, 'b')).toBe('ELSA-FAST-2028-0001');
  });

  it('skapaArende vid omförsök ger samma ärende', async () => {
    const a = await reg.skapaArende(s('frida'), 'U-FAST', 'X', 'k1');
    const b = await reg.skapaArende(s('frida'), 'U-FAST', 'X', 'k1');
    expect(a.ok && b.ok && a.varde.arendeId === b.varde.arendeId).toBe(true);
    expect((reg.listaArenden(s('frida'), 'fast') as any).varde).toHaveLength(1);
  });
});

describe('Diarienummer skilt från rapport-ID', () => {
  it('internt ärendenummer visas aldrig som diarienummer, och väntande registrering visas inte som genomförd', async () => {
    const vy = await nyRapport();
    expect(vy.beteckning).toEqual({ etikett: 'Internt ärendenummer (inte diarienummer)', varde: 'ELSA-FAST-2027-0001', bekraftad: true });
    const v = reg.begarExternRegistrering(s('frida'), vy.arende.arendeId, 'Demo Fastighets AB', 'Kundens diarium (ej anslutet)');
    expect(v.ok && arendebeteckning(v.varde)).toMatchObject({ varde: 'ELSA-FAST-2027-0001', bekraftad: false });
    expect(v.ok && arendebeteckning(v.varde).etikett).toContain('registrering väntar');
    const b = reg.aterlasDiarienummer(s('frida'), vy.arende.arendeId, { diarienummer: 'DF 2027/123', kalla: 'Kvittens från diariet' });
    expect(b.ok && arendebeteckning(b.varde)).toMatchObject({ varde: 'DF 2027/123', bekraftad: true });
  });

  it('flera rapporter kan höra till samma ärende, och versioner skapar inga nya nummer', async () => {
    const vy = await nyRapport();
    const r2 = reg.skapaRapport(s('frida'), { arendeId: vy.arende.arendeId, typ: 'pm', titel: 'PM om baslinje', objekt: [], period: '2025', mottagare: [], informationsklass: 'intern', innehall: [], kallor: [], berakningsmetod: '-' });
    expect(r2.ok && r2.varde.rapport.rapportId).not.toBe(vy.rapport.rapportId);
    expect(r2.ok && r2.varde.arende.internt).toBe(vy.arende.internt);
    reg.andra(s('frida'), vy.rapport.rapportId, { innehall: [...INNEHALL, { id: 'b6', rubrik: 'Bilaga', text: 'x', ursprung: 'manniska', kallor: [] }], andringsbeskrivning: 'Bilaga tillagd' });
    expect((reg.listaArenden(s('frida'), 'fast') as any).varde).toHaveLength(1);
  });

  it('samma externa diarienummer kan inte kopplas till två ärenden', async () => {
    const a = await reg.skapaArende(s('frida'), 'U-FAST', 'A', 'a');
    const b = await reg.skapaArende(s('frida'), 'U-FAST', 'B', 'b');
    for (const x of [a, b]) if (x.ok) reg.begarExternRegistrering(s('frida'), x.varde.arendeId, 'Kund', 'Diarium');
    reg.aterlasDiarienummer(s('frida'), (a as any).varde.arendeId, { diarienummer: 'DF 1', kalla: 'k' });
    expect(reg.aterlasDiarienummer(s('frida'), (b as any).varde.arendeId, { diarienummer: 'DF 1', kalla: 'k' }).ok).toBe(false);
  });
});

describe('Versionsregler och statusflöde', () => {
  it('nastaVersion följer 0.x, 1.0 och därefter nya nummer', () => {
    const v = (version: string): Rapportversion => ({ version }) as Rapportversion;
    expect(nastaVersion([])).toBe('0.1');
    expect(nastaVersion([v('0.1')])).toBe('0.2');
    expect(nastaVersion([v('0.2'), v('1.0')])).toBe('1.1');
    expect(nastaVersion([v('0.2'), v('1.0')], true)).toBe('2.0');
  });

  it('utkast → granskning → godkänd 1.0 → publicerad, med rapport-ID oförändrat', async () => {
    const vy = await nyRapport();
    const id = vy.rapport.rapportId;
    expect(vy.aktuell.version).toBe('0.1');
    expect(vy.luckor).toEqual(['Kostnad']);
    const v2 = reg.andra(s('frida'), id, { innehall: INNEHALL.map((b) => (b.id === 'b5' ? { ...b, text: 'Summa av verifierade månadsvärden.' } : b)), andringsbeskrivning: 'Förtydligad metod' });
    expect(v2.ok && v2.varde.aktuell.version).toBe('0.2');
    expect(reg.andra(s('frida'), id, { innehall: (v2 as any).varde.aktuell.innehall, andringsbeskrivning: 'Inget' })).toEqual({ ok: false, skal: 'Innehållet är oförändrat. Ingen ny version skapas.' });
    const g = reg.skickaTillGranskning(s('frida'), id, 'fia');
    expect(g.ok).toBe(true);
    // AI-text måste granskas, och författaren kan inte godkänna.
    const hash0 = (g as any).varde.aktuell.innehallshash;
    expect(reg.godkann(s('fia'), id, hash0)).toEqual({ ok: false, skal: 'AI-genererad text är inte granskad: Sammanfattning' });
    const gb = reg.granskaBlock(s('fia'), id, 'b1');
    const hash = (gb as any).varde.aktuell.innehallshash;
    expect(reg.godkann(s('fia'), id, hash0).ok).toBe(false); // gammal hash avser annat innehåll
    expect(reg.godkann(s('frida'), id, hash)).toEqual({ ok: false, skal: 'Den som skrivit versionen kan inte godkänna den' });
    const ok = reg.godkann(s('fia'), id, hash);
    expect(ok.ok && ok.varde.aktuell).toMatchObject({ version: '1.0', status: 'godkand', godkannare: 'fia' });
    expect(ok.ok && ok.varde.rapport.versioner.map((v) => `${v.version}:${v.status}`)).toEqual(['0.1:ersatt', '0.2:ersatt', '1.0:godkand']);
    const pub = reg.publicera(s('fia'), id);
    expect(pub.ok && pub.varde.gallande?.version).toBe('1.0');
    expect(pub.ok && pub.varde.rapport.rapportId).toBe(id);
  });

  it('underkänt utkast återgår för rättning med skäl', async () => {
    const vy = await nyRapport();
    reg.skickaTillGranskning(s('frida'), vy.rapport.rapportId, 'fia');
    const u = reg.underkann(s('fia'), vy.rapport.rapportId, 'Kostnad saknas');
    expect(u.ok && u.varde.aktuell.status).toBe('utkast');
    expect(u.ok && u.varde.aktuell.underkannanden[0]?.skal).toBe('Kostnad saknas');
  });

  it('obligatoriska avsnitt krävs före granskning', async () => {
    const vy = await nyRapport();
    reg.andra(s('frida'), vy.rapport.rapportId, { innehall: INNEHALL.slice(0, 2), andringsbeskrivning: 'Kortad' });
    expect(reg.skickaTillGranskning(s('frida'), vy.rapport.rapportId, 'fia')).toEqual({ ok: false, skal: 'Obligatoriska avsnitt saknas: Kostnad, Datakvalitet och bortfall, Metod' });
  });

  async function publicerad() {
    const vy = await nyRapport();
    const id = vy.rapport.rapportId;
    reg.skickaTillGranskning(s('frida'), id, 'fia');
    const h = (reg.granskaBlock(s('fia'), id, 'b1') as any).varde.aktuell.innehallshash;
    reg.godkann(s('fia'), id, h);
    reg.publicera(s('fia'), id);
    return id;
  }

  it('ändring efter publicering ger 1.1; publicering ersätter 1.0 utan att skriva över den', async () => {
    const id = await publicerad();
    const a = reg.andra(s('frida'), id, { innehall: INNEHALL.map((b) => (b.id === 'b3' ? { ...b, text: '1,2 Mkr' } : b.id === 'b1' ? { ...b, ursprung: 'manniska' as const } : b)), andringsbeskrivning: 'Kostnad tillagd från faktura' });
    expect(a.ok && a.varde.aktuell).toMatchObject({ version: '1.1', status: 'utkast' });
    expect(a.ok && a.varde.gallande?.version).toBe('1.0');
    reg.skickaTillGranskning(s('frida'), id, 'fia');
    reg.godkann(s('fia'), id, (reg.hamta(s('fia'), id) as any).varde.aktuell.innehallshash);
    const pub = reg.publicera(s('fia'), id);
    expect(pub.ok && pub.varde.rapport.versioner.map((v) => `${v.version}:${v.status}`)).toEqual(['0.1:ersatt', '1.0:ersatt', '1.1:publicerad']);
    expect(pub.ok && pub.varde.rapport.versioner.find((v) => v.version === '1.0')?.innehall.find((b) => b.id === 'b3')?.text).toBeNull();
  });

  it('ny export av oförändrat innehåll knyts till samma version och kontrollsumma', async () => {
    const id = await publicerad();
    const a = reg.exportera(s('fia'), id, 'pdf');
    const b = reg.exportera(s('fia'), id, 'pdf');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.varde).toMatchObject({ version: '1.0', kontrollsumma: a.varde.kontrollsumma, filreferens: a.varde.filreferens, aterexport: true });
    expect(reg.exportera(s('fia'), id, 'presentation').ok).toBe(false); // ej tillåtet format för energirapport
    const w = reg.exportera(s('fia'), id, 'word');
    expect(w.ok && w.varde.version).toBe('1.0');
  });

  it('återkallelse kräver synlig orsak och kan hänvisa till rättad version', async () => {
    const id = await publicerad();
    expect(reg.aterkalla(s('fia'), id, '1.0', 'fel').ok).toBe(false);
    const r = reg.aterkalla(s('fia'), id, '1.0', 'Fel byggnad angiven i sammanfattningen');
    expect(r.ok && r.varde.rapport.versioner.find((v) => v.version === '1.0')?.aterkallelse?.skal).toBe('Fel byggnad angiven i sammanfattningen');
    expect(r.ok && r.varde.gallande).toBeUndefined();
  });
});

describe('Ändrad källa', () => {
  it('ger varning om möjlig inaktualitet men ändrar inte den publicerade rapportens låsta underlag', async () => {
    const vy = await nyRapport();
    const id = vy.rapport.rapportId;
    reg.skickaTillGranskning(s('frida'), id, 'fia');
    reg.godkann(s('fia'), id, (reg.granskaBlock(s('fia'), id, 'b1') as any).varde.aktuell.innehallshash);
    reg.publicera(s('fia'), id);
    const fore = (reg.hamta(s('fia'), id) as any).varde.gallande;
    dok.taEmot(s('frida'), { organisationId: 'fast', uppdragId: 'U-FAST', vag: 'filval' }, [{ filnamn: 'el-2025-rättad.pdf', mime: 'application/pdf', innehall: PDF('v2'), ersatter: kallaId }]);
    const efter = (reg.hamta(s('fia'), id) as any).varde;
    expect(efter.rapport.varningar.some((w: any) => w.version === '1.0' && w.text.includes('låsta underlaget är oförändrat'))).toBe(true);
    expect(efter.gallande).toEqual(fore);
    const d = (dok.hamta(s('frida'), kallaId) as any).varde;
    expect((reg.beroende(s('fia'), 'fast', d.handlingsId) as any).varde.map((x: any) => x.version)).toContain('1.0');
  });

  it('en rapport kan bara bygga på dokument som är godkända för analys', async () => {
    const r = dok.taEmot(s('frida'), { organisationId: 'fast', uppdragId: 'U-FAST', vag: 'filval' }, [{ filnamn: 'ogranskad.pdf', mime: 'application/pdf', innehall: PDF('o') }]);
    const a = await reg.skapaArende(s('frida'), 'U-FAST', 'X', 'x');
    const ny = reg.skapaRapport(s('frida'), { arendeId: (a as any).varde.arendeId, typ: 'pm', titel: 'T', objekt: [], period: '2025', mottagare: [], informationsklass: 'intern', innehall: [], kallor: [(r as any).varde[0].dokumentId], berakningsmetod: '-' });
    expect(ny.ok).toBe(false);
  });
});

describe('Sökning, läsare och kundisolering', () => {
  it('söker på diarienummer, typ, objekt, period, ansvarig och status', async () => {
    const vy = await nyRapport();
    const sok = (f: object) => ((reg.sok(s('fia'), 'fast', f) as any).varde as any[]).map((x) => x.rapport.rapportId);
    expect(sok({ diarienummer: 'ELSA-FAST-2027-0001' })).toEqual([vy.rapport.rapportId]);
    expect(sok({ typ: 'energirapport', objektId: 'TEST-BYGGNAD-01', period: '2025', ansvarig: 'frida', status: 'utkast' })).toEqual([vy.rapport.rapportId]);
    expect(sok({ typ: 'pm' })).toEqual([]);
    expect(sok({ text: 'energirapport 2025' })).toEqual([vy.rapport.rapportId]);
  });

  it('läsare ser bara publicerade versioner', async () => {
    const vy = await nyRapport();
    const id = vy.rapport.rapportId;
    expect(reg.hamta(s('lena'), id).ok).toBe(false);
    reg.skickaTillGranskning(s('frida'), id, 'fia');
    reg.godkann(s('fia'), id, (reg.granskaBlock(s('fia'), id, 'b1') as any).varde.aktuell.innehallshash);
    reg.publicera(s('fia'), id);
    const l = reg.hamta(s('lena'), id);
    expect(l.ok && l.varde.rapport.versioner.map((v) => v.version)).toEqual(['1.0']);
    expect(reg.andra(s('lena'), id, { innehall: [], andringsbeskrivning: 'x' })).toEqual({ ok: false, skal: 'Läsare får inte ändra' });
  });

  it('en annan kund kan inte läsa, söka, ändra eller exportera rapporten (negativt test)', async () => {
    const vy = await nyRapport();
    const id = vy.rapport.rapportId;
    const neutralt = { ok: false, skal: 'Rapporten finns inte eller du saknar behörighet' };
    expect(reg.hamta(s('otto'), id)).toEqual(neutralt);
    expect(reg.hamta(s('otto'), 'RAP-999999')).toEqual(neutralt);
    expect(reg.exportera(s('otto'), id, 'pdf')).toEqual(neutralt);
    expect(reg.andra(s('otto'), id, { innehall: [], andringsbeskrivning: 'x' })).toEqual(neutralt);
    expect(reg.sok(s('otto'), 'fast').ok).toBe(false);
    expect((reg.sok(s('otto'), 'bolag2') as any).varde).toEqual([]);
    expect((await reg.skapaArende(s('otto'), 'U-FAST', 'X', 'x')).ok).toBe(false);
    expect(reg.hamta(s('erik'), id).ok).toBe(false);
  });
});
