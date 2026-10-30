import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Kort, Markning, Sida, Tom } from "../components/ui";
import { ARENDETYPNAMN, PERSONER, STATUSNAMN, UPPDRAG, UPPDRAGSNAMN } from "../demo";
import { kosignaler, synligaArenden, useStore } from "../store";

export default function Arenden() {
  const { jag } = useStore();
  const navigera = useNavigate();
  const [filter, setFilter] = useState<"alla" | "mina" | "signal">("alla");
  if (!jag) return null;
  const arenden = synligaArenden(jag).filter((a) => a.doman === "overformyndare");
  const signaler = kosignaler();
  const signalFor = (id: string) => signaler.filter((k) => k.arendeId === id);
  const visade = arenden.filter((a) => (filter === "mina" ? a.agare === jag.id : filter === "signal" ? signalFor(a.id).length > 0 : true));

  return (
    <Sida titel="Ärenden" ingress="Arbetskö för överförmyndaren. Du ser bara ärenden som din roll ger åtkomst till; obehöriga ärenden visas inte ens som antal.">
      <div className="knapprad" style={{ marginBottom: "1rem" }}>
        {(
          [
            ["alla", "Alla"],
            ["mina", "Mina"],
            ["signal", "Med kösignal"],
          ] as const
        ).map(([k, n]) => (
          <button key={k} className={`liten ${filter === k ? "primar" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {n}
          </button>
        ))}
      </div>
      <Kort>
        {visade.length ? (
          <div className="tabellram">
            <table>
              <thead>
                <tr>
                  <th>Ärende</th>
                  <th>Huvudman</th>
                  <th>Uppdrag</th>
                  <th>Status</th>
                  <th>Ansvarig</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {visade.map((a) => {
                  const u = UPPDRAG.find((x) => x.id === a.uppdragId);
                  return (
                    <tr key={a.id} className="klickbar" onClick={() => navigera(`/arenden/${a.id}`)}>
                      <td>
                        <strong>{a.titel}</strong>
                        <div className="dampad">
                          {a.id} · {ARENDETYPNAMN[a.typ]}
                        </div>
                      </td>
                      <td>{PERSONER[a.huvudmanId]}</td>
                      <td>{u ? UPPDRAGSNAMN[u.kategori] : "–"}</td>
                      <td>
                        <Markning varde={a.status === "avslutat" ? "klar" : a.status === "svar_invantas" ? "nara" : "pagar"} text={STATUSNAMN[a.status]} />
                      </td>
                      <td>{a.agare ? PERSONER[a.agare] : <Markning varde="saknas" text="Ingen ägare" />}</td>
                      <td>
                        {signalFor(a.id).map((k) => (
                          <div key={k.signal}>
                            <Markning
                              varde={k.signal === "agarlost" ? "overskriden" : "nara"}
                              text={k.signal === "agarlost" ? "Ägarlöst" : `${"dagar" in k ? k.dagar : ""} dagar utan aktivitet`}
                            />
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Tom>{arenden.length ? "Inga ärenden matchar filtret." : "Din roll ger ingen åtkomst till överförmyndarens ärenden."}</Tom>
        )}
      </Kort>
      <p className="dampad">Kösignalerna bygger på lokala varningsnivåer (30 dagar utan materiell aktivitet, 28 dagar när svar inväntas). De är inte lagstadgade frister.</p>
    </Sida>
  );
}
