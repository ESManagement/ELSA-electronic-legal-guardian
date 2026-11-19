import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EjImplementerat } from '../src/ej-implementerat.js';
import { korJobb } from '../src/jobb.js';
import { RUTTER, stubbe } from '../src/rutter.js';

const dokument = readFileSync(new URL('../../docs/backend.md', import.meta.url), 'utf8');

describe('backend-placeholder', () => {
  it('varje rutt är unik', () => {
    const nycklar = RUTTER.map((r) => `${r.metod} ${r.sokvag}`);
    expect(new Set(nycklar).size).toBe(nycklar.length);
  });

  it('varje avsnitt som rutterna pekar på finns i docs/backend.md', () => {
    for (const avsnitt of new Set(RUTTER.map((r) => r.avsnitt))) {
      expect(dokument, avsnitt).toContain(`### ${avsnitt} `);
    }
  });

  it('stubbarna säger att de inte är implementerade', () => {
    expect(() => stubbe(RUTTER[0]!)).toThrow(EjImplementerat);
    expect(() => korJobb('kobevakning')).toThrow(/B-20/);
  });
});
