/**
 * Markerar en backendfunktion som ännu inte är byggd. Varje stubbe kastar detta fel med
 * en hänvisning till sitt avsnitt i docs/backend.md, så att det syns direkt vad som saknas.
 */
export class EjImplementerat extends Error {
  constructor(readonly avsnitt: string, readonly funktion: string) {
    super(`Ej implementerat: ${funktion} (se docs/backend.md, ${avsnitt})`);
    this.name = 'EjImplementerat';
  }
}

export function ejImplementerat(avsnitt: string, funktion: string): never {
  throw new EjImplementerat(avsnitt, funktion);
}
