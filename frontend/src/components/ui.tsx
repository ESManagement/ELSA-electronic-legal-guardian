// Gemensamma byggstenar, samma som i ELSA Social, så att gränssnitten blir enhetliga.
import { ReactNode, useState } from "react";

export function Sida({ titel, ingress, atgarder, children }: { titel: string; ingress?: ReactNode; atgarder?: ReactNode; children: ReactNode }) {
  return (
    <div className="sida">
      <header className="sidhuvud">
        <div>
          <h1>{titel}</h1>
          {ingress && <p className="ingress">{ingress}</p>}
        </div>
        {atgarder && <div className="atgarder">{atgarder}</div>}
      </header>
      {children}
    </div>
  );
}

export function Kort({ titel, children, extra, className }: { titel?: ReactNode; children: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <section className={`kort ${className ?? ""}`}>
      {(titel || extra) && (
        <div className="korthuvud">
          {titel && <h2>{titel}</h2>}
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

const ETIKETTER: Record<string, string> = {
  verifierad: "Verifierad",
  utlast_ej_verifierad: "Utläst, ej verifierad",
  olaslig: "Oläslig",
  saknas: "Saknas",
  ej_tillampligt: "Ej tillämpligt",
  utford_utan_avvikelse: "Utan avvikelse",
  avvikelse: "Avvikelse",
  kan_inte_bedomas: "Kan inte bedömas",
  ej_tillamplig: "Ej tillämplig",
  oppen: "Öppen",
  utreds: "Utreds",
  lost: "Löst",
  overford_till_uppfoljning: "Till uppföljning",
  kritisk: "Kritisk",
  vasentlig: "Väsentlig",
  mindre: "Mindre",
  utkast: "Utkast",
  godkand: "Godkänd",
  skickad: "Skickad",
  besvarad_lost: "Besvarad",
  uteblivet_svar: "Uteblivet svar",
  oklart_svar: "Oklart svar",
  motsager_original: "Motsäger originalet",
  aktiv: "Aktiv",
  kvitterad: "Kvitterad",
  ej_verifierad: "Ej juridiskt verifierad",
  ok: "Inom frist",
  nara: "Nära frist",
  overskriden: "Överskriden",
  forslag: "Förslag",
  klar: "Klar",
  pagar: "Pågår",
  ej_paborjad: "Ej påbörjad",
};

/** Märkning av uppgiftsstatus, kontrollutfall och frist. Samma färgklasser som ELSA Social. */
const KLASS: Record<string, string> = {
  utford_utan_avvikelse: "ok",
  kan_inte_bedomas: "medel",
  ej_tillamplig: "antagande",
  ej_tillampligt: "antagande",
  olaslig: "saknas",
  utlast_ej_verifierad: "maskinellt_tolkad",
  oppen: "overskriden",
  kritisk: "allvarlig",
  vasentlig: "medel",
  mindre: "antagande",
  lost: "klar",
  overford_till_uppfoljning: "manuell",
  skickad: "manuell",
  besvarad_lost: "klar",
  uteblivet_svar: "saknas",
  oklart_svar: "medel",
  motsager_original: "overskriden",
  aktiv: "pagar",
  kvitterad: "klar",
  ej_verifierad: "medel",
  ej_paborjad: "antagande",
};

export function Markning({ varde, text }: { varde: string | null | undefined; text?: string }) {
  if (!varde) return null;
  return <span className={`markning m-${KLASS[varde] ?? varde}`}>{text ?? ETIKETTER[varde] ?? varde.replace(/_/g, " ")}</span>;
}

/** Ram för allt som motorn eller ELSA föreslår. Förslaget ska granskas mot originalet. */
export function Forslagsram({ children, kalla = "redovisningsmotorn" }: { children: ReactNode; kalla?: string }) {
  return (
    <div className="ai-ram">
      <div className="ai-ram-huvud">
        <span className="ai-ikon" aria-hidden>
          ✦
        </span>
        <strong>Förslag från {kalla}</strong>
        <span className="dampad">– ska granskas mot originalhandlingen innan det används</span>
      </div>
      {children}
    </div>
  );
}

export function Felruta({ fel }: { fel: string | null }) {
  if (!fel) return null;
  return (
    <div className="felruta" role="alert">
      {fel}
    </div>
  );
}

export function Tom({ children }: { children: ReactNode }) {
  return <div className="tom">{children}</div>;
}

/** Kör en åtgärd mot domänmotorn. Motorns regler kastar fel med en förklaring som visas för användaren. */
export function useAtgard() {
  const [fel, setFel] = useState<string | null>(null);
  const kör = (fn: () => void) => {
    setFel(null);
    try {
      fn();
      return true;
    } catch (e: any) {
      setFel(e.message);
      return false;
    }
  };
  return { fel, kör, setFel };
}

export function Flikar({ flikar, aktiv, valj }: { flikar: { id: string; namn: string; antal?: number }[]; aktiv: string; valj: (id: string) => void }) {
  return (
    <div className="flikar" role="tablist">
      {flikar.map((f) => (
        <button key={f.id} role="tab" aria-selected={aktiv === f.id} className={aktiv === f.id ? "aktiv" : ""} onClick={() => valj(f.id)}>
          {f.namn}
          {f.antal ? ` (${f.antal})` : ""}
        </button>
      ))}
    </div>
  );
}

export function Nyckeltal({ etikett, varde, undertext }: { etikett: string; varde: ReactNode; undertext?: ReactNode }) {
  return (
    <div className="nyckeltal">
      <div className="nt-etikett">{etikett}</div>
      <div className="nt-varde">{varde}</div>
      {undertext && <div className="nt-under">{undertext}</div>}
    </div>
  );
}

export const datum = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("sv-SE") : "–");
export const tid = (iso?: string) => (iso ? new Date(iso).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" }) : "–");
