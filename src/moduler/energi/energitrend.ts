/**
 * ELSA Energi – pilotfallet i utvecklingsprompten avsnitt 15.2: granska
 * energitrend för en fiktiv byggnad. Kedja S01 (prövas i plattformen) → S02
 * inläsning → S03 datakvalitet → S09 mätserie.
 *
 * Regler:
 * - Saknat värde är inte noll. En tom cell eller saknad månad blir en lucka.
 * - kW är effekt, inte energi, och avvisas. MWh räknas om till kWh.
 * - Energin lagras som heltal i Wh för att undvika avrundningsfel.
 * - Ingen besparing räknas förrän baslinje och metod är godkända.
 * - Resultatet är ett utkast tills en människa granskat det.
 */

export const SKILL_VERSION = 'energitrend-0.1.0';

export interface Importprofil {
  anlaggningId: string;
  energibarare: 'el' | 'fjarrvarme' | 'fjarrkyla' | 'gas';
  period: { start: string; slut: string }; // YYYY-MM
  tidszon: string;
  syfte: string;
  /** Godkänd baslinje i kWh per år, eller null om den inte är godkänd. */
  godkandBaslinje: { kwh: number; metod: string; godkandAv: string } | null;
}

export interface Kallreferens {
  filId: string;
  rad: number;
}

export interface Manadsvarde {
  manad: string;
  /** null = saknas (lucka), aldrig 0 för saknat. */
  wh: number | null;
  kalla?: Kallreferens;
}

export interface Valideringsfel {
  rad: number;
  falt: string;
  fel: string;
  forslag?: string;
}

export type Utfallsstatus = 'utkast' | 'kraver_granskning' | 'godkand' | 'blockerad' | 'delvis' | 'fel';

export interface Energitrend {
  requestId: string;
  status: Utfallsstatus;
  anlaggningId: string;
  energibarare: string;
  enhet: 'kWh';
  tidszon: string;
  serie: Manadsvarde[];
  /** Summa över månader med värde, i kWh med en decimal. Ingen extrapolering över luckor. */
  summaKwh: number;
  manaderMedVarde: number;
  luckor: string[];
  forandring: { manad: string; motForegaendeKwh: number | null }[];
  besparing: null;
  evidence: { kallId: string; hamtad: string; rader: number };
  missingInputs: string[];
  warnings: string[];
  validationResults: Valideringsfel[];
  nextActions: string[];
  skillVersion: string;
  granskning?: { av: string; tid: string; kommentar: string };
}

function manaderIPeriod(start: string, slut: string): string[] {
  const ut: string[] = [];
  let [a, m] = start.split('-').map(Number) as [number, number];
  const [sa, sm] = slut.split('-').map(Number) as [number, number];
  while (a < sa || (a === sa && m <= sm)) {
    ut.push(`${a}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      a += 1;
    }
  }
  return ut;
}

/** Svenskt eller engelskt decimaltecken, mellanslag som tusentalsavgränsare. Returnerar Wh som heltal. */
export function tolkaKwh(text: string): number | null | 'ogiltigt' {
  const t = text.replace(/[\s ]/g, '');
  if (t === '') return null;
  if (!/^-?\d+([.,]\d{1,3})?$/.test(t)) return 'ogiltigt';
  const [heltal, decimaler = ''] = t.replace(',', '.').split('.') as [string, string?];
  const neg = heltal.startsWith('-');
  const wh = Math.abs(Number(heltal)) * 1000 + Number((decimaler ?? '').padEnd(3, '0') || 0);
  return neg ? -wh : wh;
}

const ENHETER: Record<string, number | 'effekt'> = { kwh: 1, mwh: 1000, kw: 'effekt', mw: 'effekt' };

/**
 * Läs in och kvalitetssäkra en CSV med kolumnerna
 * `manad;energibarare;enhet;varde` (semikolon, svensk standard).
 */
export function lasEnergiCsv(csv: string, filId: string, profil: Importprofil, nu: Date, requestId = `REQ-${filId}`): Energitrend {
  const fel: Valideringsfel[] = [];
  const warnings: string[] = [];
  const missingInputs: string[] = [];
  const rader = csv.replace(/^﻿/, '').split(/\r?\n/);
  const huvud = (rader[0] ?? '').toLowerCase().replace(/\s/g, '');
  const bas = {
    requestId,
    anlaggningId: profil.anlaggningId,
    energibarare: profil.energibarare,
    enhet: 'kWh' as const,
    tidszon: profil.tidszon,
    besparing: null,
    skillVersion: SKILL_VERSION,
    evidence: { kallId: filId, hamtad: nu.toISOString(), rader: 0 },
  };
  if (huvud !== 'manad;energibarare;enhet;varde') {
    return {
      ...bas,
      status: 'fel',
      serie: [],
      summaKwh: 0,
      manaderMedVarde: 0,
      luckor: [],
      forandring: [],
      missingInputs: ['CSV med kolumnerna manad;energibarare;enhet;varde'],
      warnings: [],
      validationResults: [{ rad: 1, falt: 'rubrik', fel: 'Okänt format', forslag: 'Använd rubrikraden manad;energibarare;enhet;varde' }],
      nextActions: ['Ladda upp filen i rätt format'],
    };
  }
  const forvantade = manaderIPeriod(profil.period.start, profil.period.slut);
  const traffar = new Map<string, { wh: number | null; rad: number }[]>();
  let antal = 0;
  for (let i = 1; i < rader.length; i++) {
    const rad = rader[i]!;
    if (!rad.trim()) continue;
    antal += 1;
    const radnr = i + 1;
    const kol = rad.split(';');
    if (kol.length !== 4) {
      fel.push({ rad: radnr, falt: 'rad', fel: `Fel antal kolumner (${kol.length})` });
      continue;
    }
    const [manad, barare, enhet, varde] = kol.map((x) => x.trim()) as [string, string, string, string];
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(manad)) {
      fel.push({ rad: radnr, falt: 'manad', fel: `Ogiltig månad "${manad}"`, forslag: 'Format ÅÅÅÅ-MM' });
      continue;
    }
    if (!forvantade.includes(manad)) {
      fel.push({ rad: radnr, falt: 'manad', fel: `${manad} ligger utanför perioden ${profil.period.start}–${profil.period.slut}` });
      continue;
    }
    if (barare.toLowerCase() !== profil.energibarare) {
      fel.push({ rad: radnr, falt: 'energibarare', fel: `Energibärare "${barare}" matchar inte profilen (${profil.energibarare})` });
      continue;
    }
    const faktor = ENHETER[enhet.toLowerCase()];
    if (faktor === undefined) {
      fel.push({ rad: radnr, falt: 'enhet', fel: `Okänd enhet "${enhet}"`, forslag: 'kWh eller MWh' });
      continue;
    }
    if (faktor === 'effekt') {
      fel.push({ rad: radnr, falt: 'enhet', fel: `${enhet} är effekt, inte energi`, forslag: 'Ange energi i kWh' });
      continue;
    }
    const wh = tolkaKwh(varde);
    if (wh === 'ogiltigt') {
      fel.push({ rad: radnr, falt: 'varde', fel: `Ogiltigt värde "${varde}"` });
      continue;
    }
    if (wh !== null && wh < 0) {
      fel.push({ rad: radnr, falt: 'varde', fel: 'Negativ förbrukning', forslag: 'Kontrollera mätarbyte eller korrigering' });
      continue;
    }
    const lista = traffar.get(manad) ?? [];
    lista.push({ wh: wh === null ? null : wh * faktor, rad: radnr });
    traffar.set(manad, lista);
  }
  const serie: Manadsvarde[] = [];
  for (const manad of forvantade) {
    const t = traffar.get(manad) ?? [];
    if (t.length > 1) {
      fel.push({ rad: t[1]!.rad, falt: 'manad', fel: `Dubblett för ${manad} (rad ${t.map((x) => x.rad).join(', ')})`, forslag: 'Behåll en rad efter kontroll mot källan' });
      serie.push({ manad, wh: null });
    } else if (t.length === 1) {
      serie.push({ manad, wh: t[0]!.wh, kalla: { filId, rad: t[0]!.rad } });
    } else serie.push({ manad, wh: null });
  }
  const luckor = serie.filter((x) => x.wh === null).map((x) => x.manad);
  if (luckor.length) {
    warnings.push(`${luckor.length} månad(er) saknar värde och räknas inte som noll: ${luckor.join(', ')}`);
    missingInputs.push(...luckor.map((m) => `Mätvärde för ${m}`));
  }
  if (!profil.godkandBaslinje) {
    warnings.push('Baslinje saknas eller är inte godkänd – ingen besparing beräknas.');
    missingInputs.push('Godkänd baslinje och normaliseringsmetod');
  }
  warnings.push('Trenden är inte normaliserad för väder (C09 ej ansluten).');
  const summaWh = serie.reduce((s, x) => s + (x.wh ?? 0), 0);
  const forandring = serie.map((x, i) => {
    const f = serie[i - 1];
    return { manad: x.manad, motForegaendeKwh: x.wh !== null && f && f.wh !== null ? Math.round((x.wh - f.wh) / 100) / 10 : null };
  });
  const manaderMedVarde = serie.length - luckor.length;
  const status: Utfallsstatus = manaderMedVarde === 0 ? 'blockerad' : fel.length || luckor.length ? 'delvis' : 'kraver_granskning';
  const nextActions = [
    ...(fel.length ? ['Rätta raderna i felkön och läs in filen igen'] : []),
    ...(luckor.length ? ['Komplettera saknade månader från källan'] : []),
    ...(!profil.godkandBaslinje ? ['Kom överens om baslinje och metod (metodsteg 5–6)'] : []),
    'Granska trenden och fastställ den',
  ];
  return {
    ...bas,
    evidence: { ...bas.evidence, rader: antal },
    status,
    serie,
    summaKwh: Math.round(summaWh / 100) / 10,
    manaderMedVarde,
    luckor,
    forandring,
    missingInputs,
    warnings,
    validationResults: fel,
    nextActions,
  };
}

/** En människa granskar. AI eller system kan inte fastställa, och felkö måste vara tom. */
export function granskaTrend(t: Energitrend, aktor: { id: string; typ: 'manniska' | 'system' | 'ai' }, kommentar: string, nu: Date): { ok: true; trend: Energitrend } | { ok: false; skal: string } {
  if (aktor.typ !== 'manniska') return { ok: false, skal: 'Bara en människa kan fastställa trenden' };
  if (t.status === 'fel' || t.status === 'blockerad') return { ok: false, skal: 'Trenden saknar giltiga värden' };
  if (t.validationResults.length) return { ok: false, skal: 'Felkön måste vara tom före granskning' };
  if (!kommentar.trim()) return { ok: false, skal: 'Granskningen kräver en kommentar' };
  return { ok: true, trend: { ...t, status: 'godkand', granskning: { av: aktor.id, tid: nu.toISOString(), kommentar: kommentar.trim() } } };
}

/** Konstruerad testfil för TEST-BYGGNAD-01, januari–december 2025. Fiktiva värden. */
export const TESTFIL_TEST_BYGGNAD_01 = [
  'manad;energibarare;enhet;varde',
  '2025-01;el;kWh;18 420,5',
  '2025-02;el;kWh;16 980',
  '2025-03;el;kWh;15 210,25',
  '2025-04;el;kWh;12 840',
  '2025-05;el;kWh;10 115',
  '2025-06;el;kWh;8 960',
  '2025-07;el;kWh;8 430',
  '2025-08;el;kWh;8 775',
  '2025-09;el;kWh;10 020',
  '2025-10;el;kWh;12 990',
  '2025-11;el;kWh;15 640',
  '2025-12;el;kWh;17 905,75',
].join('\n');

export const PILOTPROFIL: Importprofil = {
  anlaggningId: 'TEST-BYGGNAD-01',
  energibarare: 'el',
  period: { start: '2025-01', slut: '2025-12' },
  tidszon: 'Europe/Stockholm',
  syfte: 'Intern pilot',
  godkandBaslinje: null,
};
