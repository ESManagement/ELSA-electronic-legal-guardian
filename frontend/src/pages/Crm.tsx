// ESM:s CRM: Lead → Demo bokad → Demo klar → Offert → Avtal → Kund i drift. Vid avtal skapas kundorganisationen
// och ett inbjudningsutkast till kundens administratör. Inget skickas: ingen godkänd sändtjänst är ansluten.
import { useState } from "react";
import { CRMSTEG, DEMOTYPER, hamtaModul, type Crmsteg, type Lead } from "../../../src/index.js";
import { Felruta, Kort, Markning, Sida, tid, Tom } from "../components/ui";
import { useStore } from "../store";

const NASTA: Partial<Record<Crmsteg, Crmsteg[]>> = { lead: ["demo_bokad", "offert"], demo_bokad: ["demo_klar"], demo_klar: ["offert"], offert: ["avtal"], avtal: ["kund_i_drift"] };
const namn = (id: Crmsteg) => CRMSTEG.find((x) => x.id === id)!.namn;

export default function Crm() {
  const { s, session, uppdatera } = useStore();
  const [fel, setFel] = useState<string | null>(null);
  const [avtal, setAvtal] = useState<Record<string, string>>({});
  const leads = s.plattform.listaLeads(session);
  if (!leads.ok) return <Sida titel="CRM"><Tom>{leads.skal}</Tom></Sida>;
  const inbj = s.plattform.listaInbjudningar(session);
  const klick = s.plattform.klickstatistik(session);
  const kor = (r: { ok: boolean; skal?: string }) => {
    setFel(r.ok ? null : (r.skal ?? "Fel"));
    uppdatera();
  };
  const flytta = (l: Lead, till: Crmsteg) => {
    if (till === "avtal") return kor(s.plattform.flyttaLead(session, l.id, till, { avtalsreferens: avtal[l.id] ?? "" }));
    kor(s.plattform.flyttaLead(session, l.id, till));
  };

  return (
    <Sida titel="CRM och inbjudningar" ingress="Leads från webbplatsens demobokning, kontaktformulär och offertförfrågan. Demo: lagras bara i webbläsarens minne. Verifierat CRM (Kundradar, C03) är inte anslutet.">
      <Felruta fel={fel} />
      <div className="crm-tavla">
        {CRMSTEG.map((st) => {
          const i = leads.varde.filter((l) => l.steg === st.id);
          return (
            <section key={st.id} className="crm-kolumn">
              <h3>
                {st.namn} <span className="dampad">({i.length})</span>
              </h3>
              {i.map((l) => (
                <div key={l.id} className="kort crm-kort">
                  <strong>{l.organisation}</strong>
                  <div className="dampad">
                    {l.kontakt.namn} · {l.kontakt.epost}
                    {l.orgnr && ` · ${l.orgnr} (angivet av kund)`}
                  </div>
                  <div className="dampad">
                    {l.kalla.replace(/_/g, " ")}
                    {l.demotyp && ` · ${DEMOTYPER[l.demotyp].namn}`} · {tid(l.datum)}
                  </div>
                  {!!l.moduler.length && <div className="dampad">Moduler: {l.moduler.map((m) => hamtaModul(m)?.namn).join(", ")}</div>}
                  {l.forlorad && <div className="dampad">Skäl: {l.forlorad.skal}</div>}
                  {l.steg === "offert" && <input aria-label="Avtalsreferens" placeholder="Avtalsreferens" value={avtal[l.id] ?? ""} onChange={(e) => setAvtal({ ...avtal, [l.id]: e.target.value })} />}
                  <div className="knapprad">
                    {(NASTA[l.steg] ?? []).map((t) => (
                      <button key={t} className="liten" onClick={() => flytta(l, t)}>
                        → {namn(t)}
                      </button>
                    ))}
                    {!["avtal", "kund_i_drift", "forlorad"].includes(l.steg) && (
                      <button className="liten" onClick={() => kor(s.plattform.flyttaLead(session, l.id, "forlorad", { skal: window.prompt("Skäl") ?? "" }))}>
                        Förlorad
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <Kort titel="Inbjudningar till kundens administratör">
        {inbj.ok && inbj.varde.length ? (
          <ul className="radlista">
            {inbj.varde.map((i) => (
              <li key={i.id}>
                <span>
                  {i.epost}
                  <div className="dampad">{i.forhandsgranskning}</div>
                </span>
                <span className="knapprad" style={{ marginTop: 0 }}>
                  <Markning varde={i.status === "utkast" ? "forslag" : "manuell"} text={i.status === "utkast" ? "Utkast" : i.status === "godkand_ej_skickad" ? "Godkänd – ej skickad" : i.status === "accepterad" ? "Accepterad" : i.status} />
                  {i.status === "utkast" && (
                    <button className="liten" onClick={() => kor(s.plattform.godkannInbjudan(session, i.id))}>
                      Godkänn
                    </button>
                  )}
                  {i.status === "godkand_ej_skickad" && (
                    <button className="liten" title="Demo: simulerar att mottagaren accepterar via verifierad inloggning" onClick={() => kor(s.plattform.accepteraInbjudan(i.id, { id: `ny-${i.id}`, namn: i.epost }))}>
                      Simulera accepterad (demo)
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Tom>Inga inbjudningar. De skapas när en lead flyttas till Avtal.</Tom>
        )}
        <p className="dampad">Endast ESM-administratör kan godkänna. Kunden kan flyttas till "Kund i drift" först när inbjudan är godkänd och accepterad.</p>
      </Kort>

      {klick.ok && (
        <Kort titel="Webbplatsens uppföljning">
          <p className="dampad">Bara räknare, inga personuppgifter.</p>
          <p>
            Klick på pris: {klick.varde.pris} · referenser: {klick.varde.referenser} · demobokningar: {klick.varde.boka_demo} · Se ELSA START: {klick.varde.se_elsa_start} · sökningar: {klick.varde.sok}
          </p>
        </Kort>
      )}
    </Sida>
  );
}
