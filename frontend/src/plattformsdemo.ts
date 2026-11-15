// Fiktiva organisationer, medlemskap och projekt för plattformsdelen av demon. Inga verkliga kunder.
import { Plattform, type Kundresa, type Medlemskap, type Organisation } from "../../src/index.js";
import { ANVANDARE, klocka } from "./demo";

export const ORGANISATIONER: Organisation[] = [
  {
    id: "demostad", namn: "Demostad (fiktiv kommun)", typ: "kund", demo: true,
    moduler: ["val-overformyndare", "politik-styrning", "project-management"],
    team: [
      { id: "ofn", namn: "Överförmyndarenheten", typ: "forvaltning" },
      { id: "valn", namn: "Valnämndens kansli", typ: "forvaltning" },
      { id: "klk", namn: "Kommunledningskontoret", typ: "forvaltning" },
    ],
  },
  {
    id: "demofast", namn: "Demo Fastighets AB (fiktivt)", typ: "kund", demo: true,
    moduler: ["property", "energi", "project-management", "brf"],
    team: [{ id: "drift", namn: "Energi och drift", typ: "avdelning" }],
  },
  { id: "esm", namn: "ES Management", typ: "esm", demo: true, moduler: [], team: [] },
];

const m = (anvandarId: string, organisationId: string, roll: Medlemskap["roll"], moduler: string[], teamIds: string[] = []): Medlemskap => ({
  anvandarId, organisationId, roll, moduler, teamIds, aktiv: true,
});

const OF = ["val-overformyndare", "project-management"];

export const MEDLEMSKAP: Medlemskap[] = [
  m("sigge", "demostad", "administrator", []),
  m("anna", "demostad", "redigerare", OF, ["ofn"]),
  m("rasmus", "demostad", "redigerare", OF, ["ofn"]),
  m("beatrice", "demostad", "redigerare", OF, ["ofn"]),
  m("petra", "demostad", "redigerare", OF, ["ofn"]),
  m("valter", "demostad", "redigerare", ["val-overformyndare"], ["valn"]),
  m("lars", "demostad", "lasare", ["val-overformyndare", "project-management", "politik-styrning"], ["ofn", "klk"]),
  m("fia", "demofast", "administrator", []),
  m("frida", "demofast", "redigerare", ["energi", "project-management"], ["drift"]),
  m("erik", "esm", "redigerare", []),
  m("eva", "esm", "administrator", []),
];

export const PROJEKT = [
  { id: "PRJ-DEMOSTAD-1", organisationId: "demostad", namn: "Införa digital granskning av årsräkningar", vertikal: "kommun" as const, moduler: ["val-overformyndare", "project-management"], teamId: "ofn", demo: true },
  { id: "PRJ-DEMOFAST-1", organisationId: "demofast", namn: "Energiöversyn TEST-BYGGNAD-01", vertikal: "fastighet" as const, moduler: ["energi", "property"], teamId: "drift", demo: true },
];

export function skapaPlattform(): Plattform {
  const p = new Plattform(klocka);
  p.seed({
    organisationer: ORGANISATIONER,
    konton: ANVANDARE.map((a) => ({ id: a.id, namn: a.namn })),
    medlemskap: MEDLEMSKAP,
    projekt: PROJEKT,
  });
  const anna = { id: "anna", typ: "manniska" as const };
  const frida = { id: "frida", typ: "manniska" as const };
  const ai = { id: "elsa-agent", typ: "ai" as const };
  const genom = (k: Kundresa, aktor: typeof anna, ansvarig: string, n: number) => {
    for (let nr = 1; nr <= n; nr++) {
      k.starta(nr, aktor, ansvarig);
      k.avsluta(nr, aktor);
    }
  };
  // Kommunprojektet: förankringsfasen pågår, steg 11 väntar på godkännande.
  p.seedKundresa("PRJ-DEMOSTAD-1", (k) => {
    k.laggTillUnderlag(1, anna, "Behovsbild från överförmyndarenheten", "Mötesanteckning 2027-01-12 (fiktiv)");
    k.laggTillUnderlag(2, anna, "Årsräkningar 2026, urval", "Syntetiskt underlag AR-SYNT-1–6");
    genom(k, anna, "Anna Granskare", 10);
    k.starta(11, anna, "Petra Processägare");
    k.foresla(11, ai, "Godkänn pilot med årsräkningsgranskning för 20 ärenden innan breddning.");
    k.laggTillNyckeltal({ id: "ledtid", namn: "Ledtid granskning per årsräkning", enhet: "dagar", baslinje: { varde: 42, kalla: "Ärendestatistik 2026 (fiktiv)", datum: "2026-12-31", overenskommen: true }, mal: { varde: 28, datum: "2027-12-31", riktning: "lagre_battre" } });
  });
  // Fastighetsprojektet: data samlas in, energitrend från pilotfallet.
  p.seedKundresa("PRJ-DEMOFAST-1", (k) => {
    k.starta(1, frida, "Frida Förvaltare");
    k.laggTillUnderlag(1, frida, "Önskat resultat: förstå elförbrukningens säsongsprofil", "Startmöte 2027-02-01 (fiktivt)");
    k.avsluta(1, frida);
    k.starta(2, frida, "Frida Förvaltare");
    k.laggTillUnderlag(2, frida, "Månadsdata el 2025", "TEST-BYGGNAD-01.csv (konstruerad testfil)");
    k.foresla(2, ai, "Komplettera med energideklarationens basuppgifter (C10) när avtal finns.");
    k.laggTillNyckeltal({ id: "el", namn: "Elanvändning per år", enhet: "kWh" });
  });
  return p;
}
