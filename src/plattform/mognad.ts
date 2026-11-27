/**
 * Mognadsskala med åtta steg från idé till skalad modul, och stegplanen för
 * plattformen och modulerna. Underlag: "ELSA tre steg närmare drift"
 * (ELSA Ledning, 2026-11-27) och ESM:s mognadsskala utökad samma dag.
 *
 * Principen i underlaget är att varje steg har en grind: ett steg är taget först
 * när beviset finns (signerat avtal, mätt effekt eller kund som loggar in).
 * Ingen modul kallas klar på en demo. Därför räknar koden steg ur registrerade
 * bevis, aldrig ur planen. Planen säger vad som ska hända, bevisen vad som hänt.
 *
 * Skalan och gränsen på sex ledande moduler är förslag tills Daniel beslutat
 * (beslutspunkt 1 i underlaget, senast 2026-12-04).
 */

export type Steg = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Bevistyp =
  | 'registerpost'
  | 'saljsida'
  | 'specifikation'
  | 'kalkyl'
  | 'prototyp_fiktiva_data'
  | 'verksamhetsagare_utsedd'
  | 'krav_godkanda'
  | 'floden_testade_i_kod'
  | 'signerad_bestallning'
  | 'pub_avtal'
  | 'ratt_att_mata'
  | 'verkliga_data'
  | 'baslinje'
  | 'effekt_matt_och_granskad'
  | 'godkand_release'
  | 'kund_loggar_in'
  | 'support'
  | 'backup_testad'
  | 'tre_betalande_kunder_standardavtal';

export interface Skalsteg {
  steg: Steg;
  namn: string;
  bevis: string;
  /** Alla krävs, utom när `nagotAv` är satt: då räcker ett av dem. */
  kraver: readonly Bevistyp[];
  nagotAv?: true;
}

export const MOGNADSSKALA: readonly Skalsteg[] = Object.freeze([
  { steg: 1, namn: 'Idé', bevis: 'Namn i modulregistret eller produktbeskrivningen', kraver: ['registerpost'] },
  { steg: 2, namn: 'Förslag', bevis: 'Säljsida, specifikation eller kalkyl', kraver: ['saljsida', 'specifikation', 'kalkyl'], nagotAv: true },
  { steg: 3, namn: 'Demo', bevis: 'Klickbar prototyp med fiktiva data', kraver: ['prototyp_fiktiva_data'] },
  { steg: 4, namn: 'Krav och ägare', bevis: 'Verksamhetsägare utsedd, krav godkända, flöden testade i kod', kraver: ['verksamhetsagare_utsedd', 'krav_godkanda', 'floden_testade_i_kod'] },
  { steg: 5, namn: 'Pilotkund med avtal', bevis: 'Signerad beställning eller avrop, PUB-avtal, rätt att mäta', kraver: ['signerad_bestallning', 'pub_avtal', 'ratt_att_mata'] },
  { steg: 6, namn: 'Pilot med mätt effekt', bevis: 'Verkliga data, baslinje och effekt mätt och granskad', kraver: ['verkliga_data', 'baslinje', 'effekt_matt_och_granskad'] },
  { steg: 7, namn: 'I drift', bevis: 'Godkänd release, kunden loggar in, support och backup', kraver: ['godkand_release', 'kund_loggar_in', 'support', 'backup_testad'] },
  { steg: 8, namn: 'Skalad', bevis: 'Minst tre betalande kunder på standardoffert och standardavtal', kraver: ['tre_betalande_kunder_standardavtal'] },
]);

export const SKALANS_STATUS = 'forslag' as const;
export const MAX_LEDANDE_SAMTIDIGT = 6;
/** Plattformen måste vara i drift innan någon modul kan nå steg 7. */
export const PLATTFORMSPLAN_ID = 'elsa-start';

export function skalsteg(steg: Steg): Skalsteg {
  return MOGNADSSKALA[steg - 1]!;
}

/** Ett registrerat bevis. Ett bevis utan dokumentreferens eller registrerare räknas inte. */
export interface Stegbevis {
  planId: string;
  typ: Bevistyp;
  datum: string;
  registreradAv: string;
  /** Var beviset finns: avtalsnummer, diarienummer, release-nummer, rapport. */
  dokumentref: string;
  beskrivning?: string;
}

export interface PlaneratSteg {
  steg: Steg;
  /** ÅÅÅÅ-MM, ÅÅÅÅ-MM-DD eller grov tidpunkt (Q1 2027, H2 2027, 2028). */
  nar: string;
  /** Vad som ska ha hänt i just den här modulen, enligt underlaget. */
  bevis: string;
}

export interface Stegplan {
  id: string;
  namn: string;
  /** Koppling till modulregistret. Delmoduler pekar på sin huvudmodul. */
  modulId?: string;
  /** Plattformen eller någon av de sex ledande modulerna som får utvecklingstid till sommaren 2027. */
  ledande: boolean;
  /** Läget enligt mognadsgenomgången 2026-11-26. Det är en bedömning, inte bevis. */
  bedomtNu: Steg;
  treSteg: readonly PlaneratSteg[];
  villkor: string;
  ansvar?: string;
  vilar?: true;
}

const p = (steg: Steg, nar: string, bevis: string): PlaneratSteg => ({ steg, nar, bevis });

export const STEGPLANER: readonly Stegplan[] = Object.freeze([
  {
    id: 'elsa-start', namn: 'ELSA START (plattformen)', ledande: true, bedomtNu: 4,
    treSteg: [
      p(5, '2026-12', 'Repo valt (Simon), kundinloggning och EU-drift beslutade'),
      p(6, '2027-01', 'Testimport av Perstorps data, säkerhetsgranskning gjord'),
      p(7, '2027-02-15', 'Perstorp loggar in, release och backup på plats'),
    ],
    villkor: 'PUB-avtal och informationssäkerhetsbilaga till ramavtalet, EU-drift och backup beskrivna',
    ansvar: 'Simon (repo, drift, säkerhet), Peter (import), Anders (AI-styrning)',
  },
  {
    id: 'brandskyddsrond', namn: 'Brandskyddsrond (SBA)', modulId: 'property', ledande: true, bedomtNu: 5,
    treSteg: [
      p(6, '2027-01', 'Perstorps rond klar, brister följda till åtgärd och mätta'),
      p(7, '2027-02', 'I ELSA START, fastighetsskötare loggar in'),
      p(8, '2027-06', 'Tre betalande kunder på instegspaketet'),
    ],
    villkor: 'Ingen personuppgift om boende; rätt att använda avidentifierade bristdata skrivs in',
    ansvar: 'Ewa (verksamhet), Simon (teknik), Katja (sälj)',
  },
  {
    id: 'property', namn: 'Property: underhållsplan och portföljbeslut', modulId: 'property', ledande: true, bedomtNu: 5,
    treSteg: [
      p(6, '2027-01', 'Effektbevis v1 och baslinje för Perstorp'),
      p(7, '2027-02', 'ELSA i drift hos Perstorps Bostäder och kommunen'),
      p(8, '2027-06', 'Tre kunder har köpt Första budgeten, en har gått vidare till pilot'),
    ],
    villkor: 'Perstorp signerar 2026-12-04',
    ansvar: 'Anna (verksamhet), Simon och Peter (teknik), Daniel och Katja (sälj)',
  },
  {
    id: 'energi', namn: 'Energi: effektsignatur och uppföljning', modulId: 'energi', ledande: true, bedomtNu: 4,
    treSteg: [
      p(5, '2026-12', 'Avrop för energi i Perstorp signerat med mätplan'),
      p(6, '2027-03', 'Om-test av 22 undercentraler och IPMVP-baslinje, besparing mätt'),
      p(7, '2027-05', 'Energiuppföljning i drift, avvikelse i kronor per månad'),
    ],
    villkor: 'Läsande åtkomst till mätdata, ingen styrning av BMS; besparing märks Verifierad först efter granskning',
    ansvar: 'Verksamhetsägare utses av Anna, Peter (teknik), Katja (sälj)',
  },
  {
    id: 'fakturakontroll', namn: 'Fakturakontroll (del av Economy)', modulId: 'economy', ledande: true, bedomtNu: 4,
    treSteg: [
      p(5, '2027-01', 'Back-test på Perstorps fakturor beställd, första externa back-test såld'),
      p(6, '2027-04', 'Tre månaders fakturor kontrollerade, träffar verifierade i kronor'),
      p(7, '2027-06', 'Löpande kontroll före betalning i drift (fil, SIE, PEPPOL)'),
    ],
    villkor: 'PUB-avtal eftersom fakturor kan innehålla personuppgifter',
    ansvar: 'Verksamhetsägare utses av Anna, Simon (teknik), Katja och Stefan (sälj)',
  },
  {
    id: 'bidrag', namn: 'Bidrag: nettokostnad efter stöd', modulId: 'elsa-bidrag', ledande: true, bedomtNu: 4,
    treSteg: [
      p(5, '2027-02', 'Första externa Bidragskoll beställd och tilläggsmodul i Perstorp'),
      p(6, '2027-05', 'En ansökan inlämnad med ELSA-underlag, ansökt och beviljat hålls isär'),
      p(7, '2027-09', 'Källregister, inloggning och uppföljning i drift'),
    ],
    villkor: 'ESM lovar inte beviljat stöd; kunden lämnar själv in i bidragsgivarens portal',
    ansvar: 'Emily (verksamhet), Peter (teknik), Katja med Emily (sälj)',
  },
  {
    id: 'projektledning', namn: 'Projektledning (M30, LEAN)', modulId: 'project-management', ledande: true, bedomtNu: 3,
    treSteg: [
      p(4, '2027-01', 'Anna och Rebecka äger kraven, mallar godkända'),
      p(5, '2027-02', 'Perstorps renoveringsprojekt (Kupolen) körs i verktyget som avrop'),
      p(6, '2027-06', 'Tid för statusrapporter mätt mot manuellt arbete, effekt redovisad'),
    ],
    villkor: 'Ett verkligt projekt drivs i verktyget i minst tre månader',
    ansvar: 'Rebecka (metod) och Anna (Perstorp), Simon (teknik), Stefan (sälj)',
  },
  // Övriga moduler: tre steg i egen takt, utan utvecklingstid från de ledande.
  ovrig('underlagsbank', 'Underlagsbank', undefined, 3, 'Q1 2027', ['Verksamhetsägare', 'En kommun beställer', 'Underlag använt i ÖP-arbete'], 'Säljöppnare mot kommunledning, offentliga data'),
  ovrig('benchmarking-allmannyttan', 'Benchmarking allmännyttan', undefined, 2, 'Q1 2027', ['Demo', 'Krav', 'Delas med tio vd:ar'], 'Gratis öppnare. Bara offentliga årsredovisningar'),
  ovrig('samhallsbyggnad', 'Samhällsbyggnad', 'municipality-development', 3, 'Q2 2027', ['Ewa och Rebecka äger', 'Planuppdrag', 'Mätt'], 'Ett planprogram som beställt uppdrag'),
  ovrig('inkop-upphandling', 'Inköp och upphandling', 'procurement', 3, 'Q2 2027', ['Jurist granskar mallar', 'Perstorps upphandling', 'Mätt'], 'Affärsjuristen godkänner LOU-korten'),
  ovrig('tillsyn', 'Tillsyn', 'tillsyn', 3, 'H2 2027', ['Krav från en byggnämnd', 'Pilot', 'Mätt'], 'Perstorp i drift, PUB-avtal, ärendesystem'),
  ovrig('power', 'Power (BMS och driftcentral)', 'power', 3, 'H2 2027', ['Krav', 'Läsande pilot på undercentraler', 'Mätt'], 'Energi i drift. Ingen skrivning mot styrsystem'),
  ovrig('economy-hela', 'Economy, hela ekonomisystemet', 'economy', 4, '2028', ['Pilot', 'Mätt', 'Drift'], 'Fakturakontroll i drift först'),
  ovrig('politik-styrning', 'Politik och styrning', 'politik-styrning', 3, 'H2 2027', ['Krav från KSO', 'Pilot', 'Mätt'], 'Byggs som rapporter ur Property'),
  ovrig('legal', 'Legal', 'legal', 3, 'H2 2027', ['Jurist som verksamhetsägare', 'Intern pilot', 'Mätt'], 'Avgränsa till avtalsjämförelse'),
  ovrig('val-overformyndare', 'Val och överförmyndare', 'val-overformyndare', 4, '2028', ['Pilot med nämnd', 'Mätt', 'Drift'], 'Repot privat, regelkort granskade av jurist'),
  ovrig('social', 'Social', 'social', 3, '2028', ['DPIA och krav', 'Pilot', 'Mätt'], 'Konsekvensbedömning och integration klara'),
  ovrig('vatten-avfall', 'Vatten och avfall', 'vatten-avfall', 3, '2028', ['Krav från VA-bolag', 'Pilot', 'Mätt'], 'Ett VA-bolag visar intresse (gräns 1,2 mnkr LUF)'),
  ovrig('learning', 'Learning', 'learning', 3, '2028', ['Krav', 'Pilot', 'Mätt'], 'Parkerad tills kärnan är i drift'),
  ovrig('bank-finans', 'Bank och finans', 'bank-finance', 3, '2028', ['Krav från en bank', 'Pilot', 'Mätt'], 'Annan målgrupp'),
  ovrig('jetleasing', 'Jetleasing', 'jetleasing', 3, 'vilar', ['Krav och ägare', 'Pilotkund med avtal', 'Pilot med mätt effekt'], 'Utanför ESM:s kärna', true),
  ovrig('brf', 'BRF', 'brf', 2, 'H2 2027', ['Demo', 'Krav', 'Pilotförening'], 'Property i drift'),
  ovrig('care', 'Care', 'care', 2, '2028', ['Demo', 'Krav', 'Pilot'], 'Social har pilot'),
  ovrig('revision', 'Revision', 'revision', 2, '2028', ['Demo', 'Krav', 'Pilot'], 'Economy i drift'),
  ovrig('bovarde', 'Bovärde', 'bovarde', 2, 'vilar', ['Demo', 'Krav', 'Pilot'], 'Konsumentmarknad', true),
  ovrig('lantbruk', 'Lantbruk', 'elsa-lantbruk', 2, 'vilar', ['Demo', 'Krav', 'Pilot'], 'Utanför målgruppen', true),
]);

function ovrig(id: string, namn: string, modulId: string | undefined, nu: Steg, tidigast: string, steg: [string, string, string], villkor: string, vilar?: true): Stegplan {
  return {
    id, namn, ...(modulId ? { modulId } : {}), ledande: false, bedomtNu: nu,
    treSteg: steg.map((b, i) => p((nu + i + 1) as Steg, i === 2 ? tidigast : '', b)),
    villkor,
    ...(vilar ? { vilar } : {}),
  };
}

export function hamtaStegplan(id: string): Stegplan | undefined {
  return STEGPLANER.find((x) => x.id === id);
}

export function stegplanerForModul(modulId: string): Stegplan[] {
  return STEGPLANER.filter((x) => x.modulId === modulId);
}

/** Månadsprecision räcker för att jämföra planerade datum: "2027-02" och "2027-02-15" är samma månad. */
const manad = (s: string): string | null => (/^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : null);

/**
 * Kontroll av stegplanen enligt underlagets principer. Används i test och i vyn.
 * Tom lista betyder att planen håller.
 */
export function kontrolleraStegplaner(planer: readonly Stegplan[] = STEGPLANER): string[] {
  const fel: string[] = [];
  const plattform = planer.find((x) => x.id === PLATTFORMSPLAN_ID);
  const plattformI7 = plattform?.treSteg.find((s) => s.steg === 7);
  const ledande = planer.filter((x) => x.ledande && x.id !== PLATTFORMSPLAN_ID);
  if (ledande.length > MAX_LEDANDE_SAMTIDIGT) fel.push(`${ledande.length} ledande moduler, högst ${MAX_LEDANDE_SAMTIDIGT} får utvecklas samtidigt`);
  for (const pl of planer) {
    if (pl.treSteg.length !== 3) fel.push(`${pl.id}: ska ha exakt tre steg`);
    pl.treSteg.forEach((s, i) => {
      if (s.steg !== pl.bedomtNu + i + 1) fel.push(`${pl.id}: steg ${s.steg} följer inte på ${pl.bedomtNu + i}`);
    });
    const datum = pl.treSteg.map((s) => manad(s.nar)).filter((d): d is string => d !== null);
    for (let i = 1; i < datum.length; i++) if (datum[i]! < datum[i - 1]!) fel.push(`${pl.id}: stegen ligger i fel tidsordning`);
    if (pl.id !== PLATTFORMSPLAN_ID && plattformI7) {
      const s7 = pl.treSteg.find((s) => s.steg === 7);
      const d7 = s7 && manad(s7.nar);
      if (d7 && d7 < manad(plattformI7.nar)!) fel.push(`${pl.id}: når drift före plattformen`);
    }
  }
  return fel;
}

export interface Mognadsbedomning {
  planId: string;
  /** Högsta steg där beviset för steget och alla tidigare steg finns. */
  uppnatt: Steg | 0;
  /** Nästa steg och vad som saknas för det. */
  nasta?: { steg: Steg; namn: string; saknas: Bevistyp[]; blockeradAvPlattform: boolean };
  /** Skillnaden mot bedömningen 2026-11-26. Positiv: bedömningen ligger före bevisen. */
  bedomningUtanBevis: number;
}

/**
 * Räknar fram uppnått steg ur registrerade bevis. Steg räknas i följd: saknas
 * beviset för steg 4 räknas inte steg 5, även om ett avtal finns. Steg 7 kräver
 * dessutom att plattformen (ELSA START) själv har nått steg 7.
 */
export function bedomMognad(plan: Stegplan, bevis: readonly Stegbevis[], plattformsSteg: Steg | 0): Mognadsbedomning {
  const giltiga = new Set(
    bevis.filter((b) => b.planId === plan.id && b.dokumentref.trim() && b.registreradAv.trim()).map((b) => b.typ),
  );
  let uppnatt: Steg | 0 = 0;
  for (const s of MOGNADSSKALA) {
    const saknas = s.nagotAv ? (s.kraver.some((k) => giltiga.has(k)) ? [] : [...s.kraver]) : s.kraver.filter((k) => !giltiga.has(k));
    const blockeradAvPlattform = s.steg === 7 && plan.id !== PLATTFORMSPLAN_ID && plattformsSteg < 7;
    if (saknas.length || blockeradAvPlattform) {
      return { planId: plan.id, uppnatt, nasta: { steg: s.steg, namn: s.namn, saknas, blockeradAvPlattform }, bedomningUtanBevis: plan.bedomtNu - uppnatt };
    }
    uppnatt = s.steg;
  }
  return { planId: plan.id, uppnatt, bedomningUtanBevis: plan.bedomtNu - uppnatt };
}

export const BEVISNAMN: Readonly<Record<Bevistyp, string>> = Object.freeze({
  registerpost: 'Post i modulregistret',
  saljsida: 'Säljsida',
  specifikation: 'Specifikation',
  kalkyl: 'Kalkyl',
  prototyp_fiktiva_data: 'Klickbar prototyp med fiktiva data',
  verksamhetsagare_utsedd: 'Verksamhetsägare utsedd',
  krav_godkanda: 'Krav godkända',
  floden_testade_i_kod: 'Flöden testade i kod',
  signerad_bestallning: 'Signerad beställning eller avrop',
  pub_avtal: 'PUB-avtal',
  ratt_att_mata: 'Rätt att mäta',
  verkliga_data: 'Verkliga data',
  baslinje: 'Baslinje',
  effekt_matt_och_granskad: 'Effekt mätt och granskad',
  godkand_release: 'Godkänd release',
  kund_loggar_in: 'Kunden loggar in',
  support: 'Support',
  backup_testad: 'Backup testad',
  tre_betalande_kunder_standardavtal: 'Tre betalande kunder på standardavtal',
});
