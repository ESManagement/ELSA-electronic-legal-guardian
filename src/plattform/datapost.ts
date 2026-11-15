/**
 * Minsta datapost från ostrukturerat underlag till analysdata (PM Kundadministration och
 * rapporthantering v0.1, avsnitt 6). Originalhandling, maskinellt extraherad observation, granskad
 * uppgift och beräknat resultat hålls isär. Ingen extraktionsmotor är ansluten; modellen tar emot
 * observationer från vilken motor som helst.
 */

export type Kvalitetsstatus = 'extraherad' | 'behover_granskas' | 'verifierad' | 'avvisad' | 'inaktuell';
export const KVALITETSNAMN: Record<Kvalitetsstatus, string> = { extraherad: 'Extraherad', behover_granskas: 'Behöver granskas', verifierad: 'Verifierad', avvisad: 'Avvisad', inaktuell: 'Inaktuell' };

export type Datakallposition =
  | { typ: 'sida'; sida: number; rad?: number }
  | { typ: 'cell'; blad: string; cell: string }
  | { typ: 'api_post'; postId: string }
  | { typ: 'skarmvy'; vyId: string; korningId: string };

export interface Datapost {
  kundId: string;
  objektId: string;
  uppgiftstyp: string;
  /** Värdet exakt som det stod i källan. */
  originalvarde: string | null;
  /** null betyder saknat värde. Får aldrig ersättas med 0. */
  normaliseratVarde: number | string | null;
  enhet: string | null;
  period: string;
  kalla: { typ: 'dokument' | 'kallsystem'; id: string; version: string };
  position: Datakallposition;
  hamtad: string;
  metod: { namn: string; version: string };
  status: Kvalitetsstatus;
  granskning?: { av: string; tid: string; kommentar?: string };
}

export type Datapostfel = { falt: keyof Datapost | 'normalisering'; fel: string };

/** Kontrollerar minsta datapost. Ett saknat originalvärde som normaliserats till noll är ett fel. */
export function valideraDatapost(d: Datapost): Datapostfel[] {
  const fel: Datapostfel[] = [];
  for (const f of ['kundId', 'objektId', 'uppgiftstyp', 'period', 'hamtad'] as const) if (!String(d[f] ?? '').trim()) fel.push({ falt: f, fel: 'Obligatoriskt fält saknas' });
  if (!d.kalla.id || !d.kalla.version) fel.push({ falt: 'kalla', fel: 'Källa och källversion krävs' });
  if (!d.metod.namn || !d.metod.version) fel.push({ falt: 'metod', fel: 'Extraktionsmetod och metodversion krävs' });
  const saknat = d.originalvarde === null || d.originalvarde.trim() === '';
  if (saknat && d.normaliseratVarde === 0) fel.push({ falt: 'normalisering', fel: 'Saknat värde får inte omvandlas till noll' });
  if (saknat && d.normaliseratVarde !== null) fel.push({ falt: 'normalisering', fel: 'Saknat originalvärde kan inte ha ett normaliserat värde' });
  if (typeof d.normaliseratVarde === 'number' && !d.enhet) fel.push({ falt: 'enhet', fel: 'Numeriskt värde kräver enhet' });
  if (d.status === 'verifierad' && !d.granskning) fel.push({ falt: 'granskning', fel: 'Verifierad uppgift kräver granskare och tidpunkt' });
  return fel;
}

/** Motstridiga värden för samma kund, objekt, uppgiftstyp och period. Visas med källor och löses av människa eller dokumenterad regel. */
export function motstridiga(poster: readonly Datapost[]): Datapost[][] {
  const grupper = new Map<string, Datapost[]>();
  for (const p of poster) {
    if (p.status === 'avvisad' || p.status === 'inaktuell' || p.normaliseratVarde === null) continue;
    const k = [p.kundId, p.objektId, p.uppgiftstyp, p.period].join('|');
    grupper.set(k, [...(grupper.get(k) ?? []), p]);
  }
  return [...grupper.values()].filter((g) => new Set(g.map((p) => `${p.normaliseratVarde}${p.enhet}`)).size > 1);
}

/** Markerar poster från en ändrad källa som inaktuella. Returnerar nya objekt. */
export function markeraInaktuella(poster: readonly Datapost[], kallaId: string, aktuellVersion: string): Datapost[] {
  return poster.map((p) => (p.kalla.id === kallaId && p.kalla.version !== aktuellVersion && p.status !== 'avvisad' ? { ...p, status: 'inaktuell' } : p));
}
