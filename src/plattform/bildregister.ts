/**
 * Gemensamt bildregister (avsnitt 6). Daniels bilder är skapade i Copilot på hans
 * dator och har inte gjorts tillgängliga för projektet. Därför är varje post
 * "saknar_original" tills Daniel exporterar originalet. Ingen bild byts tyst ut.
 * Att en bild är AI-skapad verifierar inte rättigheter eller innehåll.
 */
export type Bildstatus = 'saknar_original' | 'inlamnad' | 'godkand' | 'avvisad';

export interface Bildpost {
  id: string;
  anvandning: { typ: 'sida' | 'vertikal' | 'modul'; ref: string };
  beskrivning: string;
  ursprung: string;
  status: Bildstatus;
  alternativtext: string;
  /** Sökväg till webbanpassad fil. Saknas tills originalet är inlämnat och godkänt. */
  fil?: string;
  godkandAv?: string;
}

const COPILOT = 'Skapad av Daniel Svensson i Microsoft Copilot (uppgift från utvecklingsprompten 2026-11-15). Original ej inlämnat.';

export const BILDREGISTER: readonly Bildpost[] = Object.freeze([
  { id: 'IMG-START-HERO', anvandning: { typ: 'sida', ref: 'startsida' }, beskrivning: 'Huvudbild på startsidan', ursprung: COPILOT, status: 'saknar_original', alternativtext: 'Fastställs när bilden valts' },
  { id: 'IMG-ELSA-START', anvandning: { typ: 'sida', ref: 'elsa-start' }, beskrivning: 'Illustration för ELSA START', ursprung: COPILOT, status: 'saknar_original', alternativtext: 'Fastställs när bilden valts' },
  ...(['kommun', 'vard', 'vatten-kultur', 'fastighet', 'finans', 'konsument', 'manniskor'] as const).map(
    (v): Bildpost => ({ id: `IMG-VERT-${v.toUpperCase()}`, anvandning: { typ: 'vertikal', ref: v }, beskrivning: `Vertikalbild ${v}`, ursprung: COPILOT, status: 'saknar_original', alternativtext: 'Fastställs när bilden valts' }),
  ),
]);

export function anvandbaraBilder(register: readonly Bildpost[] = BILDREGISTER): Bildpost[] {
  return register.filter((b) => b.status === 'godkand' && !!b.fil && b.alternativtext.trim().length > 0);
}

export function saknadeBilder(register: readonly Bildpost[] = BILDREGISTER): Bildpost[] {
  return register.filter((b) => b.status === 'saknar_original');
}
