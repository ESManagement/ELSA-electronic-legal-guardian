// ELSA START: samlingsmodulen där man når alla 18 ELSA-moduler (enligt presentationen "ELSA moduler 18 st").
// Startvyn visar båda sektorerna, sektorsidorna visar modulerna med beskrivning och "Så kommer ni igång"
// beskriver vägen via esmanagement.se. Val & Överförmyndare är den modul som finns i den här applikationen.
import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type Modul = { namn: string; beskrivning?: string; ikon: ReactNode; till?: string };

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const Ikon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...s}>
    {children}
  </svg>
);

export const OFFENTLIG: Modul[] = [
  { namn: "Politik & Styrning", beskrivning: "Fullmäktige och styrelse", ikon: <Ikon><path d="M4 20h16M6 20V11M10 20V11M14 20V11M18 20V11M3 11l9-6 9 6z" /></Ikon> },
  { namn: "Val & Överförmyndare", beskrivning: "Valnämnd och överförmyndare", till: "/", ikon: <Ikon><path d="M4 13h16v7H4zM8 13V6h8v7M10 9l1.5 1.5L14 8" /></Ikon> },
  { namn: "Revision", beskrivning: "Granskar verksamheten", ikon: <Ikon><path d="M7 4h10v17H7zM10 3h4v3h-4zM9.5 13l2 2 3.5-4" /></Ikon> },
  { namn: "Tillsyn", ikon: <Ikon><ellipse cx="12" cy="6" rx="6" ry="2.5" /><path d="M6 6v12c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6" /></Ikon> },
  { namn: "Municipality development", ikon: <Ikon><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></Ikon> },
  { namn: "Social", ikon: <Ikon><path d="M4 10v4h3l7 4V6l-7 4zM17 9.5a3.5 3.5 0 0 1 0 5" /></Ikon> },
  { namn: "Care", beskrivning: "Äldreomsorg, hemtjänst", ikon: <Ikon><path d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20zM6 12h3l1.5-2.5 2 4 1.5-1.5h4" /></Ikon> },
  { namn: "Vatten & Avfall", beskrivning: "Kommunala bolag", ikon: <Ikon><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Ikon> },
  { namn: "Kultur & Fritid", beskrivning: "Bibliotek, idrott, fritidsgårdar", ikon: <Ikon><path d="M8 3h8v8H8zM10 11v4l2 6 2-6v-4M11 3v4M13 3v4" /></Ikon> },
];

export const PRIVAT: Modul[] = [
  { namn: "Bank & Finance", ikon: <Ikon><path d="M5 20V11M10 20V6M15 20v-7M20 20V9M3 20h18" /></Ikon> },
  { namn: "Economy", ikon: <Ikon><path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 15h5M10 18h3" /></Ikon> },
  { namn: "Procurement", ikon: <Ikon><path d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z" /></Ikon> },
  { namn: "Project management", ikon: <Ikon><circle cx="8" cy="9" r="2.5" /><circle cx="16" cy="9" r="2.5" /><path d="M3.5 18a4.5 4.5 0 0 1 9 0M11.5 18a4.5 4.5 0 0 1 9 0" /></Ikon> },
  { namn: "Property", ikon: <Ikon><path d="M3 6h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H3zM21 6h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z" /></Ikon> },
  { namn: "Legal", ikon: <Ikon><path d="M12 4v16M8 20h8M5 7h14M7 7l-3 6a3 3 0 0 0 6 0zM17 7l-3 6a3 3 0 0 0 6 0z" /></Ikon> },
  { namn: "Power", ikon: <Ikon><path d="M13 3 6 13h5l-1 8 7-10h-5z" /></Ikon> },
  { namn: "Jetleasing", ikon: <Ikon><path d="M4 7h16v11H4zM4 8l8 6 8-6" /></Ikon> },
  { namn: "Learning", ikon: <Ikon><path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" /></Ikon> },
];

function Modulkort({ m, stor, valj }: { m: Modul; stor?: boolean; valj: (m: Modul) => void }) {
  return (
    <button className={`es-modul${stor ? " stor" : ""}${m.till ? " finns" : ""}`} onClick={() => valj(m)} title={m.till ? `Öppna ELSA ${m.namn}` : `ELSA ${m.namn} är en egen modul`}>
      <span className="es-ikon">{m.ikon}</span>
      <span className="es-text">
        {stor && <span className="es-elsa">ELSA</span>}
        <span className="es-namn">{m.namn}</span>
        {stor && m.beskrivning && <span className="es-besk">{m.beskrivning}</span>}
      </span>
    </button>
  );
}

function useValj() {
  const navigera = useNavigate();
  const [vald, setVald] = useState<Modul | null>(null);
  const valj = (m: Modul) => (m.till ? navigera(m.till) : setVald(m));
  const ruta = vald && (
    <div className="infruta es-info" role="status">
      <strong>ELSA {vald.namn}</strong> är en egen modul och öppnas i sin egen ELSA-miljö. Den här visningsversionen innehåller bara ELSA Val &amp; Överförmyndare.{" "}
      <button className="lank" onClick={() => setVald(null)}>
        Stäng
      </button>
    </div>
  );
  return { valj, ruta };
}

function Tillbaka() {
  return (
    <Link className="es-tillbaka" to="/start">
      ← ELSA START
    </Link>
  );
}

export default function ElsaStart() {
  const { valj, ruta } = useValj();
  return (
    <div className="es-start">
      <div className="es-panel">
        <div className="es-logo" aria-hidden>
          <Ikon>
            <path d="M5 5h6v6H5zM5 13h6v6H5zM13 13h6v6h-6zM16 3.5l4.5 4.5-4.5 4.5-4.5-4.5z" />
          </Ikon>
        </div>
        <div className="es-eyebrow">Samlingsmodul</div>
        <h1 className="es-rubrik">ELSA START</h1>
        <p>Här når du alla ELSA-moduler. Klicka på en modul för att gå direkt dit.</p>
        <div className="es-antal">{OFFENTLIG.length + PRIVAT.length}</div>
        <div className="es-antal-text">moduler samlade på ett ställe</div>
        <Link className="es-igang" to="/start/kom-igang">
          Så kommer ni igång →
        </Link>
      </div>
      <div className="es-moduler">
        {ruta}
        <Link className="es-sektor" to="/start/offentlig">
          Offentlig sektor
        </Link>
        <div className="es-rutnat">
          {OFFENTLIG.map((m) => (
            <Modulkort key={m.namn} m={m} valj={valj} />
          ))}
        </div>
        <Link className="es-sektor" to="/start/privat">
          Privat sektor
        </Link>
        <div className="es-rutnat">
          {PRIVAT.map((m) => (
            <Modulkort key={m.namn} m={m} valj={valj} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Sektor({ sektor }: { sektor: "offentlig" | "privat" }) {
  const { valj, ruta } = useValj();
  const moduler = sektor === "offentlig" ? OFFENTLIG : PRIVAT;
  return (
    <div className="es-sida">
      <div className="rad-mellan">
        <div className="es-eyebrow">ELSA-moduler</div>
        <Tillbaka />
      </div>
      <h1 className="es-rubrik liten">{sektor === "offentlig" ? "Offentlig sektor" : "Privat sektor"}</h1>
      {ruta}
      <div className="es-rutnat stort">
        {moduler.map((m) => (
          <Modulkort key={m.namn} m={m} stor valj={valj} />
        ))}
      </div>
      <p className="dampad">{sektor === "offentlig" ? "Källa: Så är en kommun ofta organiserad – förenklad modell av politisk styrning och förvaltning." : "Källa: ELSA – fästa moduler."}</p>
    </div>
  );
}

const STEG = [
  ["Gå till webbplatsen", "Öppna www.esmanagement.se och boka en kostnadsfri demo, utan bindningstid."],
  ["Välj produkt", "Välj ELSA Start eller ELSA-plattformen, med abonnemang från 2 900 kr per månad."],
  ["Ange org.nummer", "ELSA hämtar juridiskt namn och grunduppgifter som en första kvalitetssäkrad bas."],
  ["Begär offert", "Varukorgen blir en offertförfrågan. Faktura skickas först när avtal tecknats."],
  ["Öppna era moduler", "Logga in i ELSA och nå de offentliga och privata modulerna via ELSA START."],
];

export function KomIgang() {
  return (
    <div className="es-sida">
      <div className="rad-mellan">
        <div className="es-eyebrow">Så kommer ni igång</div>
        <Tillbaka />
      </div>
      <div className="rad-mellan" style={{ alignItems: "flex-end" }}>
        <h1 className="es-rubrik liten">Hantera ELSA via esmanagement.se</h1>
        <a className="es-knapp" href="https://www.esmanagement.se" target="_blank" rel="noreferrer">
          www.esmanagement.se
        </a>
      </div>
      <ol className="es-steg">
        {STEG.map(([t, b], i) => (
          <li key={t}>
            <span className="es-nr">{i + 1}</span>
            <strong>{t}</strong>
            <span className="dampad">{b}</span>
          </li>
        ))}
      </ol>
      <div className="es-villkor">
        <div>
          <strong>Kostnadsfri demo</strong>
          <span>Ingen bindningstid. Se ELSA i arbete innan ni går vidare.</span>
        </div>
        <div>
          <strong>Offert före avtal</strong>
          <span>Faktura med 30 dagars villkor först när avtal tecknats.</span>
        </div>
        <div>
          <strong>Mänsklig kontroll</strong>
          <span>Data hanteras inom EU/EES. Ni fattar alltid det slutliga beslutet.</span>
        </div>
      </div>
      <p className="dampad">Källa: www.esmanagement.se · Kontakt: info@esmanagement.se · +46 76 891 19 75</p>
    </div>
  );
}
