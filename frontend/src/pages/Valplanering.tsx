// Valdomänen: administrativt planeringsstöd. Avskild från överförmyndarens uppgifter och utan
// funktioner för röstprövning, röstlängd eller resultat.
import { useState } from "react";
import { Flikar, Kort, Markning, Nyckeltal, Sida } from "../components/ui";
import { VALAKTIVITETER, VALLOKALER } from "../demo";

export default function Valplanering() {
  const [flik, setFlik] = useState("aktiviteter");
  return (
    <Sida titel="Valplanering" ingress="Planering inför Europaparlamentsvalet 2029. Datum och aktiviteter är exempel och ska stämmas av mot Valmyndighetens planering.">
      <div className="infruta">ELSA prövar inte röster, ändrar inte röstlängden och fastställer inte valresultat. Valdomänen har ingen åtkomst till överförmyndarens ärenden.</div>
      <div className="nyckeltalsrad">
        <Nyckeltal etikett="Aktiviteter klara" varde={`${VALAKTIVITETER.filter((a) => a.status === "klar").length} av ${VALAKTIVITETER.length}`} />
        <Nyckeltal etikett="Lokaler med kontrollerad tillgänglighet" varde={`${VALLOKALER.filter((l) => l.tillganglig === "kontrollerad").length} av ${VALLOKALER.length}`} />
        <Nyckeltal etikett="Röstmottagare" varde="Ej beräknat" undertext="behovsanalys senast 31 mars 2028" />
      </div>
      <Flikar
        aktiv={flik}
        valj={setFlik}
        flikar={[
          { id: "aktiviteter", namn: "Aktiviteter" },
          { id: "lokaler", namn: "Lokaler" },
        ]}
      />
      {flik === "aktiviteter" && (
        <Kort>
          <div className="tabellram">
            <table>
              <thead>
                <tr>
                  <th>Aktivitet</th>
                  <th>Ansvarig</th>
                  <th>Senast</th>
                  <th>Status</th>
                  <th>Källa</th>
                </tr>
              </thead>
              <tbody>
                {VALAKTIVITETER.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.id}</strong> {a.namn}
                    </td>
                    <td>{a.ansvarig}</td>
                    <td>{a.senast}</td>
                    <td>
                      <Markning varde={a.status} />
                    </td>
                    <td className="dampad">{a.kalla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kort>
      )}
      {flik === "lokaler" && (
        <Kort>
          <div className="tabellram">
            <table>
              <thead>
                <tr>
                  <th>Lokal</th>
                  <th>Valdistrikt</th>
                  <th>Tillgänglighet</th>
                  <th className="tal">Röstningsbås</th>
                </tr>
              </thead>
              <tbody>
                {VALLOKALER.map((l) => (
                  <tr key={l.namn}>
                    <td>{l.namn}</td>
                    <td>{l.distrikt}</td>
                    <td>
                      <Markning varde={l.tillganglig === "kontrollerad" ? "ok" : l.tillganglig === "brister" ? "overskriden" : "antagande"} text={l.tillganglig[0]!.toUpperCase() + l.tillganglig.slice(1)} />
                    </td>
                    <td className="tal">{l.kapacitet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kort>
      )}
    </Sida>
  );
}
