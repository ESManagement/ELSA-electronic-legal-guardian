/**
 * Kommersiellt flöde (avsnitt 5): webbplats → demo eller produktval →
 * organisationsuppgifter → offertförfrågan → avtal → tilldelad modulåtkomst.
 * Varukorgen är en offertförfrågan, aldrig en debitering. CRM-stegen följer
 * Lead → Demo bokad → Demo klar → Offert → Avtal → Kund i drift.
 *
 * Inga utskick görs härifrån. Inbjudan till kundens administratör skapas som
 * utkast och kräver godkännande; det finns ingen sändfunktion, så status kan
 * aldrig bli "skickad" i den här versionen.
 */

export type Crmsteg = 'lead' | 'demo_bokad' | 'demo_klar' | 'offert' | 'avtal' | 'kund_i_drift' | 'forlorad';

export const CRMSTEG: readonly { id: Crmsteg; namn: string }[] = Object.freeze([
  { id: 'lead', namn: 'Lead' },
  { id: 'demo_bokad', namn: 'Demo bokad' },
  { id: 'demo_klar', namn: 'Demo klar' },
  { id: 'offert', namn: 'Offert' },
  { id: 'avtal', namn: 'Avtal' },
  { id: 'kund_i_drift', namn: 'Kund i drift' },
  { id: 'forlorad', namn: 'Förlorad' },
]);

/** Tillåtna övergångar. Demo kan hoppas över när kunden väljer produkt direkt. */
const OVERGANGAR: Record<Crmsteg, Crmsteg[]> = {
  lead: ['demo_bokad', 'offert', 'forlorad'],
  demo_bokad: ['demo_klar', 'forlorad'],
  demo_klar: ['offert', 'forlorad'],
  offert: ['avtal', 'forlorad'],
  avtal: ['kund_i_drift'],
  kund_i_drift: [],
  forlorad: [],
};

export function tillatenCrmovergang(fran: Crmsteg, till: Crmsteg): boolean {
  return OVERGANGAR[fran].includes(till);
}

export type Demotyp = 'kort_demo' | 'vertikaldemo' | 'pilot';

export const DEMOTYPER: Record<Demotyp, { namn: string; langd: string }> = {
  kort_demo: { namn: 'Kort demo', langd: 'Föreslagen längd 20 minuter' },
  vertikaldemo: { namn: 'Vertikaldemo', langd: 'Föreslagen längd 30–45 minuter' },
  pilot: { namn: 'Pilot med egen data', langd: 'Omfattningen avtalas' },
};

export type Kontaktkalla = 'boka_demo' | 'kontaktformular' | 'offertforfragan' | 'manuell';

export interface Lead {
  id: string;
  steg: Crmsteg;
  organisation: string;
  /** Anges av kunden. Hämtas inte automatiskt: ingen verifierad källa är ansluten. */
  orgnr?: string;
  orgnrKalla?: 'angiven_av_kund';
  kontakt: { namn: string; epost: string; roll?: string };
  vertikal?: string;
  moduler: string[];
  demotyp?: Demotyp;
  kalla: Kontaktkalla;
  nastaSteg?: string;
  ansvarig?: string;
  datum: string;
  meddelande?: string;
  avtalsreferens?: string;
  kundOrganisationId?: string;
  inbjudanId?: string;
  forlorad?: { skal: string };
  historik: { tid: string; av: string; fran: Crmsteg | null; till: Crmsteg }[];
}

export type Inbjudningsstatus = 'utkast' | 'godkand_ej_skickad' | 'accepterad' | 'aterkallad';

export interface Inbjudan {
  id: string;
  organisationId: string;
  epost: string;
  roll: 'administrator' | 'redigerare' | 'lasare';
  moduler: string[];
  status: Inbjudningsstatus;
  skapadAv: string;
  godkandAv?: string;
  /** Förhandsgranskning av meddelandet. Skickas aldrig automatiskt. */
  forhandsgranskning: string;
}

/** Svenskt organisationsnummer: tio siffror med kontrollsiffra (Luhn). Formatkontroll, inte registerkontroll. */
export function kontrolleraOrgnr(orgnr: string): { ok: true; normaliserat: string } | { ok: false; skal: string } {
  const siffror = orgnr.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(siffror)) return { ok: false, skal: 'Organisationsnumret ska ha tio siffror (NNNNNN-NNNN)' };
  let summa = 0;
  for (let i = 0; i < 10; i++) {
    let d = Number(siffror[i]) * (i % 2 === 0 ? 2 : 1);
    if (d > 9) d -= 9;
    summa += d;
  }
  if (summa % 10 !== 0) return { ok: false, skal: 'Kontrollsiffran stämmer inte' };
  return { ok: true, normaliserat: `${siffror.slice(0, 6)}-${siffror.slice(6)}` };
}

export function kontrolleraEpost(epost: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost.trim());
}

/**
 * Följ upp klick på pris, referenser och demobokning utan personuppgifter:
 * bara räknare per händelsetyp.
 */
export type Klickhandelse = 'pris' | 'referenser' | 'boka_demo' | 'se_elsa_start' | 'sok';
