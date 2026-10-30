import { useNavigate } from "react-router-dom";
import { ANVANDARE } from "../demo";
import { useStore } from "../store";

export default function Login() {
  const { loggaIn } = useStore();
  const navigera = useNavigate();
  const grupper = [
    { namn: "Överförmyndare", roller: ["handlaggare", "registrator", "beslutsfattare", "processagare"] },
    { namn: "Valnämnd", roller: ["valadministrator"] },
    { namn: "Förvaltning av systemet", roller: ["systemadministrator"] },
    { namn: "E-tjänst för ställföreträdare", roller: ["stallforetradare"] },
  ];
  return (
    <div className="inloggning">
      <div className="inloggning-ruta">
        <div className="logga stor">
          <span className="logga-markor">ELSA</span> Val &amp; Överförmyndare
        </div>
        <p className="ingress">
          En av 18 moduler i ELSA START. Behörighetsstyrt arbets- och granskningsstöd för överförmyndare och valnämnd. ELSA föreslår och strukturerar – behöriga medarbetare verifierar, bedömer och beslutar.
        </p>
        <div className="infruta">Val och överförmyndare är två separata domäner. Uppgifter om väljare, valpersonal, huvudmän och ställföreträdare blandas aldrig i ett gemensamt register.</div>
        <div className="demo-varning">
          Demoläge med fiktiv kommun och syntetiska data. Välj en demoanvändare för att se hur behörigheter styr vad du kan göra. I produktion sker inloggning via kommunens identitetstjänst med stark autentisering.
        </div>
        {grupper.map((g) => (
          <div key={g.namn} className="demo-grupp">
            <h2>{g.namn}</h2>
            <div className="demo-lista">
              {ANVANDARE.filter((a) => g.roller.includes(a.roll)).map((a) => (
                <button key={a.id} className="demo-anvandare" onClick={() => {
                  loggaIn(a.id);
                  // Inloggade når modulerna via ELSA START; ställföreträdare går direkt till e-tjänsten.
                  navigera(a.roll === "stallforetradare" ? "/" : "/start");
                }}>
                  <strong>{a.namn}</strong>
                  <span>{a.roll_namn}</span>
                  <span className="dampad">{a.enhet} · {a.kommun}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
