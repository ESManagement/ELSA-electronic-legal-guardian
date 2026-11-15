// Två dörrar in: kund och anställd på ESM. Metoden beskrivs innan användaren klickar, och demon säger
// tydligt att inloggningen är simulerad – ingen verklig identitetstjänst är ansluten.
import { Link, useNavigate, useParams } from "react-router-dom";
import { INLOGGNINGSVAGAR } from "../../../src/index.js";
import { ANVANDARE, Demoanvandare } from "../demo";
import { useStore } from "../store";

export default function Login() {
  const { dorr = "kund" } = useParams();
  const { loggaIn } = useStore();
  const navigera = useNavigate();
  const esm = dorr === "esm";
  const vag = INLOGGNINGSVAGAR[esm ? "esm" : "kund"];
  const urval = ANVANDARE.filter((a) => (esm ? a.dorr === "esm" : a.dorr !== "esm"));
  const grupper: { namn: string; anvandare: Demoanvandare[] }[] = esm
    ? [{ namn: "ES Management", anvandare: urval }]
    : [
        { namn: "Demostad – Val & Överförmyndare", anvandare: urval.filter((a) => a.kommun === "Demostad" && a.dorr === "kund" && a.roll !== "plattform") },
        { namn: "Demostad – övriga", anvandare: urval.filter((a) => a.kommun === "Demostad" && a.roll === "plattform") },
        { namn: "Demo Fastighets AB", anvandare: urval.filter((a) => a.kommun === "Demo Fastighets AB") },
        { namn: "E-tjänst för ställföreträdare", anvandare: urval.filter((a) => a.dorr === "etjanst") },
      ];
  return (
    <div className="inloggning">
      <div className="inloggning-ruta">
        <Link className="es-tillbaka" to="/">
          ← Till startsidan
        </Link>
        <div className="logga stor">
          <span className="logga-markor">ELSA</span> {vag.rubrik}
        </div>
        <p className="ingress">{vag.metod}</p>
        <div className="demo-varning" role="note">
          <strong>Simulerad inloggning.</strong> {vag.status}
        </div>
        {grupper
          .filter((g) => g.anvandare.length)
          .map((g) => (
            <div key={g.namn} className="demo-grupp">
              <h2>{g.namn}</h2>
              <div className="demo-lista">
                {g.anvandare.map((a) => (
                  <button
                    key={a.id}
                    className="demo-anvandare"
                    onClick={() => {
                      loggaIn(a.id);
                      navigera(a.roll === "stallforetradare" ? "/mina-uppdrag" : "/start");
                    }}
                  >
                    <strong>{a.namn}</strong>
                    <span>{a.roll_namn}</span>
                    <span className="dampad">
                      {a.enhet} · {a.kommun}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        <p className="dampad">
          {esm ? "Är du kund? " : "Anställd på ESM? "}
          <Link to={esm ? "/logga-in/kund" : "/logga-in/esm"}>{esm ? "Gå till kunddörren" : "Gå till dörren för anställda"}</Link>
        </p>
      </div>
    </div>
  );
}
