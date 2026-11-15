// Modulsida: samma ingång för alla 32 moduler. Profil och status är offentlig information från registret;
// projekt och arbetsyta visas bara när plattformen ger åtkomst till modulen.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { connector, hamtaModul, SKILLS, vertikal } from "../../../src/index.js";
import { Modulstatus } from "../components/modul";
import { Felruta, Kort, Markning, Sida, Tom } from "../components/ui";
import { useStore } from "../store";

export default function ModulSida() {
  const { id = "" } = useParams();
  const { s, session, org, uppdatera } = useStore();
  const navigera = useNavigate();
  const [namn, setNamn] = useState("");
  const [fel, setFel] = useState<string | null>(null);
  const m = hamtaModul(id);
  if (!m) return <Sida titel="Okänd modul"><Tom>Modulen finns inte i registret.</Tom></Sida>;
  const las = org ? s.plattform.modulatkomst(session, org.organisation.id, m.id) : { tillats: false as const, skal: "Du tillhör ingen kundorganisation" };
  const andra = org ? s.plattform.modulatkomst(session, org.organisation.id, m.id).tillats && org.roll !== "lasare" : false;
  const projekt = las.tillats && org ? s.plattform.listaProjekt(session, org.organisation.id, m.id) : null;

  return (
    <Sida
      titel={`ELSA ${m.namn}`}
      ingress={`${vertikal(m.vertikal).namn} · ${m.utdata}`}
      atgarder={
        las.tillats && m.arbetsyta ? (
          <Link className="knapp" to={m.arbetsyta}>
            Öppna arbetsytan
          </Link>
        ) : undefined
      }
    >
      <Kort titel="Status">
        <Modulstatus m={m} />
        {!las.tillats && (
          <div className="infruta" role="status" style={{ marginTop: "0.7rem" }}>
            <strong>Låst för dig:</strong> {las.skal}. Moduldata och funktioner visas inte. Profilen nedan är allmän information.
          </div>
        )}
        {las.tillats && !m.arbetsyta && (
          <div className="infruta" style={{ marginTop: "0.7rem" }}>
            Modulen har ingen egen arbetsyta ännu. Projekt kopplade till modulen drivs genom den gemensamma kundresan.
          </div>
        )}
        <h3>Kvar innan modulen kan kallas klar</h3>
        <ul>
          {m.blockerare.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Kort>

      {projekt && (
        <Kort titel="Projekt i modulen">
          {projekt.ok && projekt.varde.length ? (
            <ul className="radlista">
              {projekt.varde.map((p) => (
                <li key={p.id}>
                  <Link to={`/projekt/${p.id}`}>{p.namn}</Link>
                  <span className="dampad">{p.moduler.map((x) => hamtaModul(x)?.namn).join(", ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Tom>Inga projekt som du har åtkomst till.</Tom>
          )}
          {andra && org && (
            <form
              className="formrad"
              onSubmit={(e) => {
                e.preventDefault();
                const r = s.plattform.skapaProjekt(session, org.organisation.id, namn, m.vertikal, [m.id]);
                if (!r.ok) return setFel(r.skal);
                setNamn("");
                setFel(null);
                uppdatera();
                navigera(`/projekt/${r.varde.id}`);
              }}
            >
              <label className="falt" style={{ flex: 1 }}>
                <span className="falt-etikett">Nytt projekt i modulen</span>
                <input value={namn} onChange={(e) => setNamn(e.target.value)} placeholder="Projektnamn" />
              </label>
              <button className="primar" type="submit">
                Skapa projekt
              </button>
            </form>
          )}
          <Felruta fel={fel} />
        </Kort>
      )}

      <Kort titel="Modulprofil">
        <div className="tabellram">
          <table>
            <tbody>
              <tr><th>Stabil identitet</th><td><code>{m.id}</code></td></tr>
              <tr><th>Vertikal</th><td>{vertikal(m.vertikal).namn}</td></tr>
              <tr><th>Indata</th><td>{m.indata}</td></tr>
              <tr><th>Utdata</th><td>{m.utdata}</td></tr>
              <tr><th>Prioritet</th><td>{m.prioritet}</td></tr>
              <tr><th>Grind</th><td>{m.grind}</td></tr>
              <tr><th>Klassning</th><td>{m.behorighet.klassning.replace(/_/g, " ")}</td></tr>
              <tr><th>Kandidatrepon</th><td>{m.kandidatrepon.length ? `${m.kandidatrepon.join(", ")}${m.id === "val-overformyndare" ? "" : " (innehåll ej kontrollerat)"}` : "Inget repo hittat"}</td></tr>
              <tr><th>Skills (specifikationer)</th><td>{m.skills.map((x) => `${x} ${SKILLS[x]}`).join(" · ")}</td></tr>
            </tbody>
          </table>
        </div>
      </Kort>

      <Kort titel="Connectorkandidater">
        <p className="dampad">Kandidater enligt bedömningen 2026-11-15. Ingen är ansluten eller provad.</p>
        <div className="tabellram">
          <table>
            <thead>
              <tr><th>Kod</th><th>Namn</th><th>Prioritet</th><th>Underlag</th><th>Villkor</th></tr>
            </thead>
            <tbody>
              {m.connectorer.map((c) => {
                const k = connector(c)!;
                return (
                  <tr key={c}>
                    <td>{k.id}</td>
                    <td>{k.namn}</td>
                    <td>{k.prioritet}</td>
                    <td><Markning varde={k.evidens === "D" ? "verifierad" : "antagande"} text={k.evidens === "D" ? "Dokumentation finns" : k.evidens === "U" ? "Ej verifierad" : "Egen byggsten"} /></td>
                    <td className="dampad">{k.villkor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kort>
    </Sida>
  );
}
