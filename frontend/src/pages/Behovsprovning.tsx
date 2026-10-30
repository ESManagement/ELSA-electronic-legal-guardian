// Årlig behovsprövning av förvaltarskap (Ö-04, Ö-23). Hålls skild från granskningen av årsräkningen:
// en godkänd årsräkning säger inget om huruvida förvaltarskapet fortfarande behövs.
import { useState } from "react";
import { Felruta, Kort, Markning, Sida, Tom, useAtgard } from "../components/ui";
import { PERSONER, UPPDRAG } from "../demo";
import { aktor, useStore } from "../store";

const FALT = [
  ["uppdateradeOmstandigheter", "Uppdaterade omständigheter"],
  ["begransningEllerUpphorandeProvat", "Har begränsning eller upphörande prövats?"],
  ["handlaggarensBedomning", "Din bedömning"],
  ["nastaAtgard", "Nästa åtgärd"],
] as const;

function Kvittera({ id }: { id: string }) {
  const { s, jag, uppdatera } = useStore();
  const { fel, kör } = useAtgard();
  const [v, setV] = useState<Record<string, string>>({});
  if (!jag) return null;
  return (
    <div className="faststall">
      {FALT.map(([f, n]) => (
        <label key={f} className="falt">
          <span className="falt-etikett">{n}</span>
          <textarea id={`${id}-${f}`} rows={2} value={v[f] ?? ""} onChange={(e) => setV({ ...v, [f]: e.target.value })} />
        </label>
      ))}
      <Felruta fel={fel} />
      <button
        className="primar liten"
        onClick={() =>
          kör(() => {
            s.behov.kvittera(id, aktor(jag), {
              uppdateradeOmstandigheter: v.uppdateradeOmstandigheter ?? "",
              begransningEllerUpphorandeProvat: v.begransningEllerUpphorandeProvat ?? "",
              handlaggarensBedomning: v.handlaggarensBedomning ?? "",
              nastaAtgard: v.nastaAtgard ?? "",
              aktanteckningId: `AKT-${id}`,
            });
            uppdatera();
          })
        }
      >
        Kvittera behovsprövningen
      </button>
    </div>
  );
}

export default function Behovsprovning() {
  const { s, har } = useStore();
  const [oppen, setOppen] = useState<string | null>(null);
  const aktiva = s.behov.aktiva();
  return (
    <Sida titel="Behovsprövning" ingress="Varje förvaltarskap prövas årligen: behövs det fortfarande, och i samma omfattning? Prövningen görs skilt från årsräkningen och kan bara kvitteras med en skriftlig bedömning.">
      <Kort titel="Aktiva bevakningar 2027">
        {aktiva.length ? (
          <ul className="radlista">
            {aktiva.map((b) => {
              const u = UPPDRAG.find((x) => x.id === b.uppdragId)!;
              return (
                <li key={b.id} style={{ alignItems: "flex-start" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{PERSONER[u.huvudmanId]}</strong> · förvaltare {PERSONER[u.stallforetradareId]}
                    <div className="dampad">
                      {b.id} · förvaltarskap sedan {u.giltigFran} · omfattning: {u.omfattning.join(", ")}
                    </div>
                    {oppen === b.id && <Kvittera id={b.id} />}
                  </span>
                  <span className="sts-hoger">
                    <Markning varde={b.forfaller <= "2027-03-31" ? "nara" : "ok"} text={`Förfaller ${b.forfaller}`} />
                    {har("of.granska") && oppen !== b.id && (
                      <button className="liten" onClick={() => setOppen(b.id)}>
                        Pröva …
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Tom>Alla behovsprövningar för året är kvitterade.</Tom>
        )}
      </Kort>
    </Sida>
  );
}
