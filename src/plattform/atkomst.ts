/**
 * Gemensam åtkomstkontroll för ELSA (avsnitt 5 och 8). Prövas bakom gränssnittet
 * per organisation (kund), projekt och modul. Identitet och roll hämtas alltid
 * från den betrodda sessionen, aldrig från fritt inskickad text.
 */

export type Plattformsroll = 'administrator' | 'redigerare' | 'lasare';

export const ROLLNAMN: Record<Plattformsroll, string> = {
  administrator: 'Administratör',
  redigerare: 'Redigerare',
  lasare: 'Läsare',
};

export type Inloggningsmetod = 'jobbkonto' | 'inbjudan' | 'kundkatalog' | 'e-legitimation' | 'demo';

export interface Session {
  anvandarId: string;
  metod: Inloggningsmetod;
  /** true bara när identiteten kommer från en verifierad identitetstjänst. Demo är aldrig verifierad. */
  verifierad: boolean;
}

export interface Team {
  id: string;
  namn: string;
  /** Förvaltning, avdelning eller bolag. */
  typ: 'forvaltning' | 'avdelning' | 'bolag';
}

export interface Organisation {
  id: string;
  namn: string;
  typ: 'kund' | 'esm';
  /** Fiktiv demoorganisation. Verkliga kunddata får aldrig ligga i en demoorganisation. */
  demo: boolean;
  orgnr?: string;
  /** Moduler som ingår i organisationens avtal. Sätts bara via avtal i CRM-flödet. */
  moduler: string[];
  team: Team[];
}

export interface Medlemskap {
  anvandarId: string;
  organisationId: string;
  roll: Plattformsroll;
  teamIds: string[];
  /** Moduler som administratören tilldelat användaren. Administratören har alla avtalade moduler. */
  moduler: string[];
  aktiv: boolean;
}

export type Operation = 'las' | 'sok' | 'andra' | 'administrera';

export interface Atkomstfraga {
  organisationId: string;
  modulId?: string;
  projekt?: { organisationId: string; teamId?: string };
  operation: Operation;
}

export type Plattformsbeslut = { tillats: true } | { tillats: false; skal: string };

const TILLATNA: Record<Plattformsroll, Operation[]> = {
  administrator: ['las', 'sok', 'andra', 'administrera'],
  redigerare: ['las', 'sok', 'andra'],
  lasare: ['las', 'sok'],
};

export function medlemskapFor(medlemskap: readonly Medlemskap[], anvandarId: string, organisationId: string): Medlemskap | undefined {
  return medlemskap.find((m) => m.anvandarId === anvandarId && m.organisationId === organisationId);
}

/** Moduler som en medlem faktiskt kan använda: tilldelade och samtidigt avtalade. */
export function effektivaModuler(org: Organisation, m: Medlemskap): string[] {
  if (!m.aktiv) return [];
  if (m.roll === 'administrator') return [...org.moduler];
  return m.moduler.filter((x) => org.moduler.includes(x));
}

export function provaPlattformsatkomst(
  session: Session | null,
  fraga: Atkomstfraga,
  organisationer: readonly Organisation[],
  medlemskap: readonly Medlemskap[],
): Plattformsbeslut {
  if (!session) return { tillats: false, skal: 'Inte inloggad' };
  const org = organisationer.find((o) => o.id === fraga.organisationId);
  if (!org) return { tillats: false, skal: 'Okänd organisation' };
  const m = medlemskapFor(medlemskap, session.anvandarId, org.id);
  if (!m) return { tillats: false, skal: 'Ingen behörighet till organisationen' };
  if (!m.aktiv) return { tillats: false, skal: 'Kontot är avstängt' };
  if (fraga.projekt && fraga.projekt.organisationId !== org.id) return { tillats: false, skal: 'Projektet tillhör en annan organisation' };
  if (fraga.modulId) {
    if (!org.moduler.includes(fraga.modulId)) return { tillats: false, skal: 'Modulen ingår inte i organisationens avtal' };
    if (!effektivaModuler(org, m).includes(fraga.modulId)) return { tillats: false, skal: 'Modulen är inte tilldelad användaren' };
  }
  if (fraga.projekt?.teamId && m.roll !== 'administrator' && !m.teamIds.includes(fraga.projekt.teamId))
    return { tillats: false, skal: 'Projektet tillhör ett annat team' };
  if (!TILLATNA[m.roll].includes(fraga.operation)) return { tillats: false, skal: `${ROLLNAMN[m.roll]} får inte ${OPNAMN[fraga.operation]}` };
  return { tillats: true };
}

const OPNAMN: Record<Operation, string> = { las: 'läsa', sok: 'söka', andra: 'ändra', administrera: 'administrera' };

/** Beskrivning av inloggningsvägarna som visas innan användaren klickar. */
export const INLOGGNINGSVAGAR: Record<'kund' | 'esm', { rubrik: string; metod: string; status: string }> = {
  kund: {
    rubrik: 'Jag är kund',
    metod: 'Kunder loggar in via inbjudan från sin administratör, med kundens egen katalog eller med e-legitimation.',
    status: 'Beslut om metod saknas och ingen identitetstjänst är ansluten. I demon väljer du en fiktiv användare – det är ingen riktig inloggning.',
  },
  esm: {
    rubrik: 'Jag är anställd på ESM',
    metod: 'Anställda loggar in med sitt ESM-jobbkonto.',
    status: 'Jobbkontot (Microsoft Entra ID) är inte anslutet. I demon väljer du en fiktiv anställd – det är ingen riktig inloggning.',
  },
};
