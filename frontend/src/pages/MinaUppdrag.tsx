// E-tjänsten för ställföreträdare. E-legitimation visar vem du är; vilka ärenden du ser styrs av
// dina förordnanden (A-11).
import { Kort, Markning, Sida, Tom } from "../components/ui";
import { PERSONER, STATUSNAMN, UPPDRAG, UPPDRAGSNAMN } from "../demo";
import { synligaArenden, useStore } from "../store";

export default function MinaUppdrag() {
  const { s, jag } = useStore();
  if (!jag) return null;
  const arenden = synligaArenden(jag);
  const uppdrag = UPPDRAG.filter((u) => jag.motor.egnaUppdrag?.some((e) => e.uppdragId === u.id));
  const k = s.komplettering;
  return (
    <Sida titel="Mina uppdrag" ingress="Här ser du dina uppdrag, hur det går med din redovisning och frågor från överförmyndaren.">
      {!uppdrag.length ? (
        <Kort>
          <Tom>Du är inloggad med e-legitimation men har inget förordnande som ställföreträdare. Inloggningen visar vem du är, inte vem du får företräda, så inga ärenden visas.</Tom>
        </Kort>
      ) : (
        uppdrag.map((u) => (
          <Kort key={u.id} titel={`${UPPDRAGSNAMN[u.kategori]} för ${PERSONER[u.huvudmanId]}`} extra={<span className="dampad">sedan {u.giltigFran}</span>}>
            <ul className="radlista">
              {arenden
                .filter((a) => a.uppdragId === u.id)
                .map((a) => (
                  <li key={a.id}>
                    <span>
                      {a.titel}
                      <div className="dampad">{a.handling}</div>
                    </span>
                    <Markning varde={a.status === "avslutat" ? "klar" : a.status === "svar_invantas" ? "nara" : "pagar"} text={a.status === "svar_invantas" ? "Väntar på ditt svar" : STATUSNAMN[a.status]} />
                  </li>
                ))}
            </ul>
            {u.id === "U-1" && (
              <>
                <h3>Frågor från överförmyndaren</h3>
                {k?.expediering ? (
                  <div className="brev">{k.brevtext()}</div>
                ) : (
                  <Tom>Inga frågor just nu. Överförmyndaren granskar din årsräkning.</Tom>
                )}
              </>
            )}
          </Kort>
        ))
      )}
    </Sida>
  );
}
