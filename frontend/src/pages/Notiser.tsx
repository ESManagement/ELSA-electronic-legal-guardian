import { Link } from "react-router-dom";
import { Kort, Sida, Tom } from "../components/ui";
import { notiserFor, useStore } from "../store";
import { Prioritet } from "./Startsida";

export default function Notiser() {
  const { s, jag, accepteraNotis } = useStore();
  if (!jag) return null;
  const notiser = notiserFor(jag);
  return (
    <Sida titel="Notiser" ingress="Signaler som behöver en ansvarig. P1 och P2 ligger kvar tills någon har accepterat ansvaret.">
      <Kort>
        {notiser.length ? (
          <ul className="radlista">
            {notiser.map((n) => (
              <li key={n.id}>
                <span style={{ minWidth: 0 }}>
                  <Link to={n.lank}>{n.titel}</Link>
                  <div className="dampad">{n.beskrivning}</div>
                  <div className="sts-faktorer">Varför: {n.faktorer.join(" · ").toLowerCase()}</div>
                </span>
                <span className="sts-hoger">
                  <Prioritet p={n} />
                  {s.accepterade[n.id] ? (
                    <span className="dampad">Ansvarig: {s.accepterade[n.id]}</span>
                  ) : (
                    <button className="liten" onClick={() => accepteraNotis(n.id)}>
                      Acceptera ansvar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Tom>Inga notiser.</Tom>
        )}
      </Kort>
    </Sida>
  );
}
