// Gemensamma fiktiva kunder för tester av dokumentmottagning och rapportregister.
import type { Organisation } from '../../src/plattform/atkomst.js';
import { Plattform } from '../../src/plattform/plattform.js';

export const klocka = () => new Date('2027-03-15T09:00:00Z');

const ORG: Organisation[] = [
  { id: 'fast', namn: 'Demo Fastighets AB (fiktiv)', typ: 'kund', demo: true, moduler: ['property', 'energi'], team: [{ id: 'drift', namn: 'Drift', typ: 'avdelning' }] },
  { id: 'bolag2', namn: 'Annat Bolag AB (fiktivt)', typ: 'kund', demo: true, moduler: ['property'], team: [] },
  { id: 'esm', namn: 'ES Management', typ: 'esm', demo: true, moduler: [], team: [] },
];

export function plattform(k: () => Date = klocka) {
  const p = new Plattform(k);
  p.seed({
    organisationer: ORG,
    konton: ['fia', 'frida', 'lena', 'otto', 'erik'].map((id) => ({ id, namn: id })),
    medlemskap: [
      { anvandarId: 'fia', organisationId: 'fast', roll: 'administrator', teamIds: [], moduler: [], aktiv: true },
      { anvandarId: 'frida', organisationId: 'fast', roll: 'redigerare', teamIds: ['drift'], moduler: ['energi', 'property'], aktiv: true },
      { anvandarId: 'lena', organisationId: 'fast', roll: 'lasare', teamIds: ['drift'], moduler: ['energi', 'property'], aktiv: true },
      { anvandarId: 'otto', organisationId: 'bolag2', roll: 'administrator', teamIds: [], moduler: [], aktiv: true },
      { anvandarId: 'erik', organisationId: 'esm', roll: 'redigerare', teamIds: [], moduler: [], aktiv: true },
    ],
    projekt: [
      { id: 'U-FAST', organisationId: 'fast', namn: 'Energiöversyn', vertikal: 'fastighet', moduler: ['energi', 'property'], teamId: 'drift', demo: true },
      { id: 'U-B2', organisationId: 'bolag2', namn: 'Förvaltning', vertikal: 'fastighet', moduler: ['property'], demo: true },
    ],
  });
  return p;
}

