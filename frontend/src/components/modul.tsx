// Gemensamma byggstenar för moduler: statusmärkning och ikon per vertikal. Statusen kommer från modulregistret.
import { ReactNode } from "react";
import type { Implementeringsstatus, Leveransstatus, Modul, VertikalId } from "../../../src/index.js";
import { Markning } from "./ui";

export const IMPLNAMN: Record<Implementeringsstatus, string> = { beskriven: "Beskriven", implementerad: "Implementerad", testad: "Testad", godkand: "Godkänd" };
export const LEVNAMN: Record<Leveransstatus, string> = { klar: "Klar", delvis_klar: "Delvis klar", blockerad: "Blockerad" };
const LEVMARK: Record<Leveransstatus, string> = { klar: "klar", delvis_klar: "manuell", blockerad: "antagande" };

export function Modulstatus({ m, kort }: { m: Modul; kort?: boolean }) {
  return (
    <span className="modulstatus">
      <Markning varde={LEVMARK[m.leverans]} text={LEVNAMN[m.leverans]} />
      {!kort && <Markning varde={m.implementering === "beskriven" ? "antagande" : "verifierad"} text={IMPLNAMN[m.implementering]} />}
      {m.nyttForslag && <Markning varde="prognos" text="Nytt förslag" />}
      {m.lansering === "ej_lanserad" && !kort && <Markning varde="antagande" text="Ej lanserad" />}
    </span>
  );
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const Ikon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...s}>
    {children}
  </svg>
);

export const VERTIKALIKON: Record<VertikalId, ReactNode> = {
  kommun: <Ikon><path d="M4 20h16M6 20V11M10 20V11M14 20V11M18 20V11M3 11l9-6 9 6z" /></Ikon>,
  vard: <Ikon><path d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z" /></Ikon>,
  "vatten-kultur": <Ikon><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Ikon>,
  fastighet: <Ikon><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></Ikon>,
  finans: <Ikon><path d="M5 20V11M10 20V6M15 20v-7M20 20V9M3 20h18" /></Ikon>,
  konsument: <Ikon><path d="M4 11l8-7 8 7v9H4zM9 20v-5h6v5" /></Ikon>,
  manniskor: <Ikon><circle cx="8" cy="9" r="2.5" /><circle cx="16" cy="9" r="2.5" /><path d="M3.5 18a4.5 4.5 0 0 1 9 0M11.5 18a4.5 4.5 0 0 1 9 0" /></Ikon>,
};
