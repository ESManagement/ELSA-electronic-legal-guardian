import { Kort, Markning, Sida } from "../components/ui";
import { idag, REGELKORT } from "../demo";
import { useStore } from "../store";

export default function Regelkort() {
  const { s } = useStore();
  return (
    <Sida
      titel="Regelkort"
      ingress="Varje kontroll vilar på ett rättsligt versionskort. En regel får bara användas när den är juridiskt verifierad och gäller på tillämpningsdagen. Saknad källa eller konflikt stoppar regelsvaret."
    >
      <div className="varnruta">Inget regelkort är juridiskt verifierat ännu. Motorn ger formella förslag i demon, men regelvalet stoppar och pilot kan inte starta förrän jurist har godkänt korten.</div>
      <Kort>
        <div className="tabellram">
          <table>
            <thead>
              <tr>
                <th>Regel</th>
                <th>Rättskälla</th>
                <th>Version</th>
                <th>Status</th>
                <th>Regelval {idag()}</th>
                <th>Nästa bevakning</th>
              </tr>
            </thead>
            <tbody>
              {REGELKORT.map((k) => {
                const val = s.regler.valj(k.regelId, idag());
                return (
                  <tr key={k.regelId}>
                    <td>
                      <strong>{k.regelId}</strong>
                      <div className="dampad">{k.beskrivning}</div>
                    </td>
                    <td>
                      {k.forfattning}
                      <div className="dampad">{k.lagrum}</div>
                    </td>
                    <td>
                      {k.version} från {k.giltigFran}
                    </td>
                    <td>
                      <Markning varde={k.verifieringsstatus} />
                    </td>
                    <td>{val.status === "ok" ? <Markning varde="ok" text="Används" /> : <Markning varde="overskriden" text={`Stopp: ${val.skal.replace(/_/g, " ")}`} />}</td>
                    <td>{k.nastaBevakning}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kort>
      <p className="dampad">Kontroll-id:n är interna namn, inte lagrum. Lagrummen fylls i med verifierad lydelse (föräldrabalken 14 kap., ställföreträdarförordningen, lokala rutiner) vid den juridiska granskningen.</p>
    </Sida>
  );
}
