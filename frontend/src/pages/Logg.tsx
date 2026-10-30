import { useState } from "react";
import { Granskningslogg } from "../../../src/index.js";
import { Kort, Markning, Sida, tid } from "../components/ui";
import { PERSONER } from "../demo";
import { useStore } from "../store";

export default function Logg() {
  const { s } = useStore();
  const [kontroll, setKontroll] = useState<{ ok: boolean; brottVid?: number } | null>(null);
  const h = s.logg.handelser();
  return (
    <Sida
      titel="Granskningslogg"
      ingress="Varje händelse kedjas till den föregående med en SHA-256-hash. Om någon ändrar eller tar bort en post i efterhand bryts kedjan."
      atgarder={
        <>
          {kontroll && <Markning varde={kontroll.ok ? "ok" : "overskriden"} text={kontroll.ok ? `Kedjan är intakt (${h.length} händelser)` : `Bruten vid #${kontroll.brottVid}`} />}
          <button className="sekundar" onClick={() => setKontroll(Granskningslogg.verifieraKedja(s.logg.handelser()))}>
            Kontrollera hashkedjan
          </button>
        </>
      }
    >
      <Kort>
        <div className="tabellram">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Tid</th>
                <th>Vem</th>
                <th>Händelse</th>
                <th>Objekt</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {[...h].reverse().map((x) => (
                <tr key={x.lopnummer}>
                  <td>{x.lopnummer}</td>
                  <td>{tid(x.tid)}</td>
                  <td>
                    {PERSONER[x.aktorId] ?? x.aktorId} <span className="dampad">({x.aktortyp === "manniska" ? "människa" : x.aktortyp})</span>
                  </td>
                  <td>{x.handelse.replace(/_/g, " ")}</td>
                  <td className="dampad">{x.objektId.length > 20 ? `${x.objektId.slice(0, 8)}…` : x.objektId}</td>
                  <td className="hash">{x.hash.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kort>
    </Sida>
  );
}
