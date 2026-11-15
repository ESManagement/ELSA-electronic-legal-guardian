// Administratören bjuder in, stänger av, väljer roll och moduler och ser aktivitetsloggen inom sin
// organisation. Allt prövas i plattformen, inte bara här i gränssnittet.
import { useState } from "react";
import { hamtaModul, ROLLNAMN, type Plattformsroll } from "../../../src/index.js";
import { Felruta, Kort, Markning, Sida, tid, Tom } from "../components/ui";
import { useStore } from "../store";

export default function OrganisationSida() {
  const { s, session, org, uppdatera } = useStore();
  const [fel, setFel] = useState<string | null>(null);
  const [epost, setEpost] = useState("");
  const [roll, setRoll] = useState<Plattformsroll>("lasare");
  const [valda, setValda] = useState<string[]>([]);
  if (!org) return <Sida titel="Användare och roller"><Tom>Ingen organisation.</Tom></Sida>;
  const orgId = org.organisation.id;
  const medlemmar = s.plattform.listaMedlemmar(session, orgId);
  if (!medlemmar.ok) return <Sida titel="Användare och roller"><Tom>{medlemmar.skal}</Tom></Sida>;
  const inbj = s.plattform.listaInbjudningar(session, orgId);
  const logg = s.plattform.aktivitetslogg(session, orgId);
  const kor = (r: { ok: boolean; skal?: string }) => {
    setFel(r.ok ? null : (r.skal ?? "Fel"));
    uppdatera();
  };

  return (
    <Sida titel="Användare och roller" ingress={`${org.organisation.namn}. Avtalade moduler: ${org.organisation.moduler.map((m) => hamtaModul(m)?.namn).join(", ")}.`}>
      <Felruta fel={fel} />
      <Kort titel="Medlemmar">
        <div className="tabellram">
          <table>
            <thead>
              <tr><th>Namn</th><th>Roll</th><th>Moduler</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {medlemmar.varde.map((m) => (
                <tr key={m.anvandarId}>
                  <td>{m.namn}</td>
                  <td>
                    <select aria-label={`Roll för ${m.namn}`} value={m.roll} onChange={(e) => kor(s.plattform.sattRoll(session, orgId, m.anvandarId, e.target.value as Plattformsroll))}>
                      {Object.entries(ROLLNAMN).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {m.roll === "administrator" ? (
                      <span className="dampad">Alla avtalade</span>
                    ) : (
                      org.organisation.moduler.map((mod) => (
                        <label key={mod} style={{ display: "block", fontSize: "0.85rem" }}>
                          <input
                            type="checkbox"
                            checked={m.moduler.includes(mod)}
                            onChange={(e) => kor(s.plattform.tilldelaModuler(session, orgId, m.anvandarId, e.target.checked ? [...m.moduler, mod] : m.moduler.filter((x) => x !== mod)))}
                          />{" "}
                          {hamtaModul(mod)?.namn}
                        </label>
                      ))
                    )}
                  </td>
                  <td>{m.aktiv ? <Markning varde="klar" text="Aktiv" /> : <Markning varde="overskriden" text="Avstängd" />}</td>
                  <td>
                    <button className="liten" onClick={() => kor(s.plattform.stangAv(session, orgId, m.anvandarId, !m.aktiv))}>
                      {m.aktiv ? "Stäng av" : "Aktivera"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kort>

      <Kort titel="Bjud in">
        <div className="formrad">
          <input aria-label="E-post" placeholder="namn@organisation.se" value={epost} onChange={(e) => setEpost(e.target.value)} />
          <select aria-label="Roll" value={roll} onChange={(e) => setRoll(e.target.value as Plattformsroll)}>
            {Object.entries(ROLLNAMN).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="knapprad">
          {org.organisation.moduler.map((mod) => (
            <label key={mod} style={{ fontSize: "0.85rem" }}>
              <input type="checkbox" checked={valda.includes(mod)} onChange={(e) => setValda(e.target.checked ? [...valda, mod] : valda.filter((x) => x !== mod))} /> {hamtaModul(mod)?.namn}
            </label>
          ))}
        </div>
        <div className="knapprad">
          <button
            className="primar"
            onClick={() => {
              const r = s.plattform.bjudIn(session, orgId, epost, roll, valda);
              kor(r);
              if (r.ok) {
                setEpost("");
                setValda([]);
              }
            }}
          >
            Skapa inbjudningsutkast
          </button>
        </div>
        <p className="dampad">Inbjudan blir ett utkast som ska godkännas. Ingen sändtjänst är ansluten, så inget skickas.</p>
        {inbj.ok && !!inbj.varde.length && (
          <ul className="radlista">
            {inbj.varde.map((i) => (
              <li key={i.id}>
                <span>
                  {i.epost} · {ROLLNAMN[i.roll]}
                  <div className="dampad">Förhandsgranskning: {i.forhandsgranskning}</div>
                </span>
                <span className="knapprad" style={{ marginTop: 0 }}>
                  <Markning varde={i.status === "utkast" ? "forslag" : "manuell"} text={i.status === "utkast" ? "Utkast" : i.status === "godkand_ej_skickad" ? "Godkänd – ej skickad" : i.status} />
                  {i.status === "utkast" && (
                    <button className="liten" onClick={() => kor(s.plattform.godkannInbjudan(session, i.id))}>
                      Godkänn
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Kort>

      <Kort titel="Aktivitetslogg">
        {logg.ok && logg.varde.length ? (
          <ul className="radlista">
            {[...logg.varde].reverse().map((h) => (
              <li key={h.lopnummer}>
                <span>
                  {h.handelse.replace(/_/g, " ")} · {h.objektId}
                  <div className="dampad">{h.aktorId} · {tid(h.tid)}</div>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Tom>Inga händelser ännu.</Tom>
        )}
      </Kort>
    </Sida>
  );
}
