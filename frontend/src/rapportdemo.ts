// Dokumentmottagning och rapportregister i demon. Fiktiva dokument och rapporter för Demo Fastighets AB.
// Skannern är en demoskanner som bara känner igen EICAR-teststrängen; ingen riktig skanning sker.
import { DEMOSKANNER, Dokumentmottagning, Minnesnummerlager, Rapportregister, STANDARDMOTTAGNING, STANDARDRAPPORT, type Plattform, type Session } from "../../src/index.js";
import { klocka } from "./demo";

const s = (id: string): Session => ({ anvandarId: id, metod: "demo", verifierad: false });
const pdf = (t: string) => new TextEncoder().encode(`%PDF-1.7\n% Fiktivt demodokument\n${t}\n%%EOF`);

export function skapaRapporttjanster(p: Plattform) {
  const dokument = new Dokumentmottagning(p, DEMOSKANNER, STANDARDMOTTAGNING, klocka);
  const rapporter = new Rapportregister(p, dokument, new Minnesnummerlager(), STANDARDRAPPORT, klocka);
  const klar = seed(dokument, rapporter);
  return { dokument, rapporter, klar };
}

async function seed(d: Dokumentmottagning, r: Rapportregister) {
  const kontext = { organisationId: "demofast", uppdragId: "PRJ-DEMOFAST-1", vag: "filval" as const, gemensamt: { informationsklass: "intern" as const, objekt: [{ typ: "byggnad" as const, id: "TEST-BYGGNAD-01" }] } };
  const k = d.taEmot(s("frida"), kontext, [
    { filnamn: "elfaktura-2025-12.pdf", mime: "application/pdf", innehall: pdf("faktura december"), metadata: { dokumenttyp: "Faktura", period: "2025-12" } },
    { filnamn: "energideklaration-2023.pdf", mime: "application/pdf", innehall: pdf("energideklaration"), metadata: { dokumenttyp: "Energideklaration", period: "2023" } },
    { filnamn: "matarlista-drift.pdf", mime: "application/pdf", innehall: pdf("mätarlista") },
  ]);
  if (!k.ok) return;
  const [faktura, dekl] = k.varde.map((x) => x.dokumentId!);
  d.godkannForAnalys(s("fia"), faktura!, "Kontrollerad mot original (demo)");
  d.godkannForAnalys(s("fia"), dekl!, "Kontrollerad mot original (demo)");
  const a = await r.skapaArende(s("frida"), "PRJ-DEMOFAST-1", "Energiuppföljning TEST-BYGGNAD-01", "demo-arende-1");
  if (!a.ok) return;
  const vy = r.skapaRapport(s("frida"), {
    arendeId: a.varde.arendeId,
    typ: "energirapport",
    titel: "Energirapport 2025 TEST-BYGGNAD-01",
    objekt: [{ typ: "byggnad", id: "TEST-BYGGNAD-01" }],
    period: "2025",
    mottagare: ["Förvaltningschef (fiktiv)"],
    informationsklass: "intern",
    innehall: [
      { id: "b1", rubrik: "Sammanfattning", text: "Elanvändningen 2025 följer en tydlig säsongsprofil med högst förbrukning i januari och december.", ursprung: "ai_utkast", kallor: [] },
      { id: "b2", rubrik: "Förbrukning per period", text: "Elva av tolv månader har verifierade värden. Se tabellbilaga.", ursprung: "manniska", kallor: [faktura!] },
      { id: "b3", rubrik: "Kostnad", text: null, ursprung: "manniska", kallor: [] },
      { id: "b4", rubrik: "Datakvalitet och bortfall", text: "En månad saknar värde och redovisas som bortfall, inte som noll.", ursprung: "manniska", kallor: [] },
      { id: "b5", rubrik: "Metod", text: "Summa av granskade månadsvärden. Ingen besparing beräknas utan godkänd baslinje.", ursprung: "manniska", kallor: [dekl!] },
    ],
    kallor: [faktura!, dekl!],
    berakningsmetod: "Månadssumma 1.0",
  });
  if (!vy.ok) return;
  const id = vy.varde.rapport.rapportId;
  r.skickaTillGranskning(s("frida"), id, "fia");
  const g = r.granskaBlock(s("fia"), id, "b1");
  if (g.ok) r.godkann(s("fia"), id, g.varde.aktuell.innehallshash);
  r.publicera(s("fia"), id);
  r.exportera(s("fia"), id, "pdf");
}
