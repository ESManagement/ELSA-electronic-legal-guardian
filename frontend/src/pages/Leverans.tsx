// Leveransstatus per modul och vertikal, direkt från modulregistret. Skiljer beskriven, implementerad,
// testad och godkänd. Ingen modul är "Klar" förrän verksamheten godkänt avtalade krav.
import { Link } from "react-router-dom";
import { BILDREGISTER, MODULER, modulerIVertikal, VERTIKALER } from "../../../src/index.js";
import { IMPLNAMN, LEVNAMN } from "../components/modul";
import { Kort, Markning, Nyckeltal, Sida } from "../components/ui";

export default function Leverans() {
  const antal = (f: (m: (typeof MODULER)[number]) => boolean) => MODULER.filter(f).length;
  return (
    <Sida titel="Leveransstatus" ingress="Status enligt kravmatrisen. Ett namn eller ett kort i gränssnittet räknas inte som leverans.">
      <div className="nyckeltalsrad">
        <Nyckeltal etikett="Moduler i registret" varde={MODULER.length} undertext={`${VERTIKALER.length} vertikaler`} />
        <Nyckeltal etikett="Testade huvudflöden" varde={antal((m) => m.implementering === "testad")} undertext="Val & Överförmyndare, Energi (pilotfall)" />
        <Nyckeltal etikett="Godkända av verksamheten" varde={antal((m) => m.implementering === "godkand")} />
        <Nyckeltal etikett="Klara" varde={antal((m) => m.leverans === "klar")} undertext={`${antal((m) => m.leverans === "delvis_klar")} delvis klara, ${antal((m) => m.leverans === "blockerad")} blockerade`} />
      </div>
      {VERTIKALER.map((v) => (
        <Kort key={v.id} titel={v.namn}>
          <div className="tabellram">
            <table>
              <thead>
                <tr><th>Modul</th><th>Implementering</th><th>Leverans</th><th>Kvar</th></tr>
              </thead>
              <tbody>
                {modulerIVertikal(v.id).map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={m.ingang}>{m.namn}</Link> {m.nyttForslag && <Markning varde="prognos" text="Nytt förslag" />}
                    </td>
                    <td>{IMPLNAMN[m.implementering]}</td>
                    <td>{LEVNAMN[m.leverans]}</td>
                    <td className="dampad">{m.blockerare.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kort>
      ))}
      <Kort titel="Bildregister">
        <p className="dampad">Daniels Copilot-bilder är inte tillgängliga för projektet. Inga bilder används förrän original är inlämnade och godkända.</p>
        <ul className="radlista">
          {BILDREGISTER.map((b) => (
            <li key={b.id}>
              <span>
                {b.id} · {b.beskrivning}
                <div className="dampad">{b.ursprung}</div>
              </span>
              <Markning varde={b.status === "godkand" ? "klar" : "overskriden"} text={b.status === "saknar_original" ? "Original saknas" : b.status} />
            </li>
          ))}
        </ul>
      </Kort>
    </Sida>
  );
}
