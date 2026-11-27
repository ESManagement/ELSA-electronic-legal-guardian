// Vägen till drift: mognadsskalan med åtta steg, stegplanen för plattformen och modulerna,
// och driftgrinden för Val & Överförmyndare. Underlag: "ELSA tre steg närmare drift" 2026-11-27.
// Steg räknas ur bevis, aldrig ur planen. Planen visas som plan.
import { Link } from "react-router-dom";
import {
  hamtaModul,
  kontrolleraStegplaner,
  MOGNADSSKALA,
  provaDriftgrind,
  Regelregister,
  skalsteg,
  STEGPLANER,
  VO_LAGE_2026_11_27,
  type Stegplan,
} from "../../../src/index.js";
import { idag, REGELKORT } from "../demo";
import { Kort, Markning, Nyckeltal, Sida } from "../components/ui";

function Planrad({ p }: { p: Stegplan }) {
  const mod = p.modulId ? hamtaModul(p.modulId) : undefined;
  return (
    <tr>
      <td>
        {mod ? <Link to={mod.ingang}>{p.namn}</Link> : p.namn}
        {p.vilar && <> <Markning varde="prognos" text="Vilar" /></>}
      </td>
      <td>
        {p.bedomtNu} {skalsteg(p.bedomtNu).namn}
      </td>
      {p.treSteg.map((s) => (
        <td key={s.steg}>
          <strong>
            {s.steg} {skalsteg(s.steg).namn}
          </strong>
          {s.nar && <div className="dampad">{s.nar}</div>}
          {s.bevis && <div className="dampad">{s.bevis}</div>}
        </td>
      ))}
      <td className="dampad">{p.villkor}</td>
    </tr>
  );
}

function Plantabell({ planer }: { planer: readonly Stegplan[] }) {
  return (
    <div className="tabellram">
      <table>
        <thead>
          <tr>
            <th>Modul</th>
            <th>Bedömd nu</th>
            <th>Steg 1 av 3</th>
            <th>Steg 2 av 3</th>
            <th>Steg 3 av 3</th>
            <th>Villkor</th>
          </tr>
        </thead>
        <tbody>
          {planer.map((p) => (
            <Planrad key={p.id} p={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Mognad() {
  const fel = kontrolleraStegplaner();
  const ledande = STEGPLANER.filter((p) => p.ledande);
  const ovriga = STEGPLANER.filter((p) => !p.ledande);
  const grind = provaDriftgrind(VO_LAGE_2026_11_27, new Regelregister(REGELKORT), idag());
  return (
    <Sida
      titel="Vägen till drift"
      ingress="Tre steg per modul på en skala från idé till skalad. Ett steg är taget först när beviset finns. Ingen modul kallas klar på en demo."
    >
      <div className="infruta" role="status">
        <strong>Förslag:</strong> skalan och gränsen på sex ledande moduler väntar på Daniels beslut (senast 4 december). Läget "bedömd nu" kommer från
        mognadsgenomgången 26 november och är en bedömning, inte registrerade bevis.
      </div>
      <div className="nyckeltalsrad">
        <Nyckeltal etikett="Ledande moduler" varde={ledande.length - 1} undertext="plus plattformen ELSA START" />
        <Nyckeltal etikett="Övriga i egen takt" varde={ovriga.filter((p) => !p.vilar).length} undertext={`${ovriga.filter((p) => p.vilar).length} vilar`} />
        <Nyckeltal etikett="Val & Överförmyndare" varde={`Steg ${grind.tillatetSteg}`} undertext={`${grind.hinder.length} hinder före steg ${grind.tillatetSteg + 1}`} />
        <Nyckeltal etikett="Planfel" varde={fel.length} undertext={fel.length ? fel.join(" · ") : "Planen håller principerna"} />
      </div>

      <Kort titel="Åtta steg från idé till skalad modul">
        <ol className="radlista">
          {MOGNADSSKALA.map((s) => (
            <li key={s.steg}>
              <span>
                <strong>
                  {s.steg} {s.namn}
                </strong>
                <div className="dampad">{s.bevis}</div>
              </span>
            </li>
          ))}
        </ol>
      </Kort>

      <Kort titel="Driftgrind för Val & Överförmyndare">
        <p className="dampad">
          Underlaget placerar modulen på steg 4 med pilot med nämnd, mätt effekt och drift kvar, tidigast 2028. Villkor: repot privat och regelkorten
          granskade av jurist. Grinden prövar läget i dag.
        </p>
        {([5, 6, 7] as const).map((steg) => (
          <div key={steg}>
            <h3>
              Steg {steg} {skalsteg(steg).namn}
            </h3>
            <ul className="radlista">
              {grind.krav
                .filter((k) => k.steg === steg)
                .map((k) => (
                  <li key={k.id}>
                    <span>
                      {k.krav}
                      <div className="dampad">
                        {k.kalla}
                        {k.detalj ? ` · ${k.detalj}` : ""}
                      </div>
                    </span>
                    <Markning varde={k.uppfyllt ? "klar" : "overskriden"} text={k.uppfyllt ? "Uppfyllt" : "Saknas"} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </Kort>

      <Kort titel="Plattformen och de sex ledande modulerna">
        <Plantabell planer={ledande} />
      </Kort>
      <Kort titel="Övriga moduler: tre steg i egen takt">
        <Plantabell planer={ovriga} />
      </Kort>
    </Sida>
  );
}
