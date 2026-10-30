import type { Arende, Handling } from '../domain/typer.js';

/**
 * Mottagning och personkoppling (krav Ö-10, testfall A-01).
 *
 * En handling kopplas bara till ett ärende när personidentiteten är verifierad.
 * Namnlikhet räcker aldrig. Osäkra handlingar går till en begränsad
 * utredningskö i stället för att spridas till möjliga ärenden.
 */
export type Kopplingsforslag =
  | { utfall: 'koppla'; arendeId: string; grund: 'verifierad_person_och_arende' }
  | { utfall: 'utredningsko'; skal: string; mojligaArendenAntal: number }
  | { utfall: 'redan_registrerad'; handlingId: string };

export function foreslaKoppling(
  handling: Handling,
  oppnaArenden: readonly Arende[],
  befintligaHandlingar: readonly Handling[],
): Kopplingsforslag {
  const dubblett = befintligaHandlingar.find((h) => h.checksumma === handling.checksumma);
  if (dubblett) return { utfall: 'redan_registrerad', handlingId: dubblett.id };

  if (!handling.verifieradPersonId) {
    const mojliga = oppnaArenden.filter((a) => a.huvudmanId === handling.uppgivenPersonId).length;
    return {
      utfall: 'utredningsko',
      skal: 'Personkopplingen är inte verifierad. Koppling på namn eller uppgiven identitet görs inte automatiskt.',
      mojligaArendenAntal: mojliga,
    };
  }

  const traffar = oppnaArenden.filter(
    (a) => a.huvudmanId === handling.verifieradPersonId && a.typ === 'redovisningsgranskning',
  );
  if (traffar.length === 1) {
    return { utfall: 'koppla', arendeId: traffar[0]!.id, grund: 'verifierad_person_och_arende' };
  }
  return {
    utfall: 'utredningsko',
    skal:
      traffar.length === 0
        ? 'Verifierad person saknar öppet redovisningsärende.'
        : 'Flera öppna redovisningsärenden för personen. Handläggaren väljer ärende.',
    mojligaArendenAntal: traffar.length,
  };
}
