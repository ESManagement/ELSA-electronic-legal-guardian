// Projekt och den gemensamma kundresan: 19 metodsteg i sex faser. Alla ändringar går genom plattformen,
// som prövar behörighet per projekt och modul. Steg 15–17 kan pågå parallellt med steg 14, och inget efter
// steg 11 kan starta utan kundens godkännande.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FASER, hamtaModul, MODULER, vertikal, type Kundresevy } from "../../../src/index.js";
import { Felruta, Forslagsram, Kort, Markning, Sida, tid, Tom } from "../components/ui";
import { useStore } from "../store";

const STATUSNAMN: Record<string, string> = { ej_startad: "Ej startad", pagar: "Pågår", klar: "Klar", ej_tillampligt: "Ej tillämpligt" };
const STATUSMARK: Record<string, string> = { ej_startad: "antagande", pagar: "pagar", klar: "klar", ej_tillampligt: "manuell" };
const UPPFNAMN: Record<string, string> = {
  saknar_baslinje: "Baslinje saknas",
  baslinje_ej_overenskommen: "Baslinjen är inte överenskommen",
  saknar_mal: "Mål saknas",
  saknar_utfall: "Utfall saknas",
  mal_natt: "Målet nått",
  pa_vag: "På väg",
  samre_an_baslinje: "Sämre än baslinjen",
};

export function ProjektLista() {
  const { s, session, org } = useStore();
  if (!org) return <Sida titel="Projekt"><Tom>Du tillhör ingen kundorganisation. ESM-anställda får inte kunddata automatiskt.</Tom></Sida>;
  const r = s.plattform.listaProjekt(session, org.organisation.id);
  return (
    <Sida titel="Projekt och kundresa" ingress={`${org.organisation.namn}. Projekt syns om du har åtkomst till minst en av projektets moduler och tillhör rätt team.`}>
      <Kort>
        {r.ok && r.varde.length ? (
          <ul className="radlista">
            {r.varde.map((p) => (
              <li key={p.id}>
                <span>
                  <Link to={`/projekt/${p.id}`}>{p.namn}</Link>
                  <div className="dampad">{vertikal(p.vertikal).namn} · {p.moduler.map((m) => hamtaModul(m)?.namn).join(", ")}</div>
                </span>
                {p.demo && <Markning varde="antagande" text="Demo, fiktiva data" />}
              </li>
            ))}
          </ul>
        ) : (
          <Tom>{r.ok ? "Inga projekt som du har åtkomst till." : r.skal}</Tom>
        )}
      </Kort>
    </Sida>
  );
}

export default function Projekt() {
  const { id = "" } = useParams();
  const { s, session, org, uppdatera } = useStore();
  const [valt, setValt] = useState<number | null>(null);
  const [fel, setFel] = useState<string | null>(null);
  const [falt, setFalt] = useState({ ansvarig: "", motivering: "", titel: "", kalla: "", kommentar: "", godkannande: "", aterkalla: "", modul: "" });
  const p = s.plattform.hamtaProjekt(session, id);
  const vy = s.plattform.lasKundresa(session, id);
  if (!p.ok || !vy.ok) return <Sida titel="Projekt"><Tom>{p.ok ? "" : p.skal}</Tom></Sida>;
  const k: Kundresevy = vy.varde;
  const kanAndra = org?.roll === "administrator" || org?.roll === "redigerare";
  const stegnr = valt ?? k.steg.find((x) => x.status === "pagar")?.nr ?? k.startbara[0] ?? 1;
  const st = k.steg.find((x) => x.nr === stegnr)!;
  const sätt = (f: keyof typeof falt) => (e: { target: { value: string } }) => setFalt({ ...falt, [f]: e.target.value });

  const gor = (beskrivning: string, fn: Parameters<typeof s.plattform.andraKundresa>[3], kraver?: "kundadministrator") => {
    const r = s.plattform.andraKundresa(session, id, beskrivning, fn, kraver);
    setFel(r.ok ? null : r.skal);
    if (r.ok) setFalt({ ansvarig: "", motivering: "", titel: "", kalla: "", kommentar: "", godkannande: "", aterkalla: "", modul: "" });
    uppdatera();
  };

  return (
    <Sida
      titel={p.varde.namn}
      ingress={`${vertikal(p.varde.vertikal).namn} · Moduler: ${p.varde.moduler.map((m) => hamtaModul(m)?.namn).join(", ")}`}
      atgarder={k.godkantForGenomforande ? <Markning varde="klar" text="Kunden har godkänt genomförande" /> : <Markning varde="nara" text="Genomförande ej godkänt (steg 11)" />}
    >
      {p.varde.demo && <div className="varnruta">Demoprojekt med fiktiva data. Inga verkliga kunddata.</div>}
      <div className="kundresa">
        {FASER.map((f) => (
          <div key={f.id} className="fas">
            <div className="fas-namn">{f.namn}</div>
            {f.steg.map((nr) => {
              const x = k.steg.find((y) => y.nr === nr)!;
              return (
                <button key={nr} className={`stegknapp s-${x.status}${nr === stegnr ? " vald" : ""}`} onClick={() => setValt(nr)} aria-pressed={nr === stegnr}>
                  <span className="stegnr">{nr}</span>
                  <span className="stegtext">{x.visningsnamn}</span>
                  <Markning varde={STATUSMARK[x.status]} text={STATUSNAMN[x.status]} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="dampad">Steg 15–17 kan pågå parallellt med steg 14. Tiderna i presentationen är exempel; projektets tider fastställs med kunden.</p>

      <Kort titel={`Steg ${st.nr}: ${st.visningsnamn}`} extra={<Markning varde={STATUSMARK[st.status]} text={STATUSNAMN[st.status]} />}>
        {st.visningsnamn !== st.namn && <p className="dampad">Metodregistrets namn: {st.namn}</p>}
        <p className="dampad">
          Ansvarig: {st.ansvarig ?? "–"}
          {st.tidsplan && ` · ${st.tidsplan.start}–${st.tidsplan.slut}`}
          {st.nastaAktivitet && ` · Nästa aktivitet: ${st.nastaAktivitet}`}
          {st.motivering && ` · Motivering: ${st.motivering}`}
        </p>
        {st.hinder && st.status === "ej_startad" && <div className="infruta">{st.hinder}</div>}
        <Felruta fel={fel} />

        {kanAndra && (
          <div className="stack">
            {st.status === "ej_startad" && (
              <div className="formrad">
                <input aria-label="Ansvarig" placeholder="Ansvarig" value={falt.ansvarig} onChange={sätt("ansvarig")} />
                <button className="primar" disabled={!!st.hinder} onClick={() => gor(`Starta steg ${st.nr}`, (kr, a) => kr.starta(st.nr, a, falt.ansvarig))}>
                  Starta steg
                </button>
              </div>
            )}
            {st.status === "pagar" && (
              <div className="knapprad">
                <button className="primar" onClick={() => gor(`Avsluta steg ${st.nr}`, (kr, a) => kr.avsluta(st.nr, a))}>
                  Markera klart
                </button>
              </div>
            )}
            {(st.status === "ej_startad" || st.status === "pagar") && st.nr !== 11 && (
              <div className="formrad">
                <input aria-label="Motivering" placeholder="Motivering för Ej tillämpligt" value={falt.motivering} onChange={sätt("motivering")} />
                <button onClick={() => gor(`Ej tillämpligt steg ${st.nr}`, (kr, a) => kr.markeraEjTillampligt(st.nr, a, falt.motivering))}>Ej tillämpligt</button>
              </div>
            )}
            {st.nr === 11 && st.status === "pagar" && !k.godkantForGenomforande && (
              <div className="formrad">
                <input aria-label="Vad kunden godkänner" placeholder="Vad kunden godkänner" value={falt.godkannande} onChange={sätt("godkannande")} />
                <button className="primar" onClick={() => gor("Kundgodkännande", (kr, a) => kr.registreraKundgodkannande(a, falt.godkannande), "kundadministrator")}>
                  Registrera kundens godkännande
                </button>
              </div>
            )}
            {st.nr === 11 && k.godkantForGenomforande && (
              <div className="formrad">
                <input aria-label="Skäl" placeholder="Skäl för återkallelse" value={falt.aterkalla} onChange={sätt("aterkalla")} />
                <button className="fara" onClick={() => gor("Återkalla godkännande", (kr, a) => kr.aterkallaKundgodkannande(a, falt.aterkalla), "kundadministrator")}>
                  Återkalla godkännande
                </button>
              </div>
            )}
          </div>
        )}
        {!kanAndra && <p className="dampad">Du har läsbehörighet och kan inte ändra kundresan.</p>}

        <h3>Underlag</h3>
        {st.underlag.length ? (
          <ul className="radlista">
            {st.underlag.map((u) => (
              <li key={u.id}>
                <span>
                  {u.titel} <span className="dampad">version {u.version}</span>
                  <div className="dampad">Källa: {u.kalla} · {tid(u.tillagd)}</div>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Tom>Inget underlag.</Tom>
        )}
        {kanAndra && (
          <div className="formrad">
            <input aria-label="Titel" placeholder="Titel" value={falt.titel} onChange={sätt("titel")} />
            <input aria-label="Källa" placeholder="Källa (fil, system, dokument)" value={falt.kalla} onChange={sätt("kalla")} />
            <button onClick={() => gor("Underlag", (kr, a) => kr.laggTillUnderlag(st.nr, a, falt.titel, falt.kalla))}>Lägg till</button>
          </div>
        )}

        {!!st.aiForslag.length && (
          <Forslagsram kalla="ELSA">
            <ul className="radlista">
              {st.aiForslag.map((f) => (
                <li key={f.id}>
                  <span>{f.text}</span>
                  {f.status === "forslag" && kanAndra ? (
                    <span className="knapprad" style={{ marginTop: 0 }}>
                      <button className="liten" onClick={() => gor("Godkänn förslag", (kr, a) => kr.hanteraForslag(st.nr, f.id, a, true))}>Godkänn som beslut</button>
                      <button className="liten" onClick={() => gor("Avvisa förslag", (kr, a) => kr.hanteraForslag(st.nr, f.id, a, false))}>Avvisa</button>
                    </span>
                  ) : (
                    <Markning varde={f.status === "godkant" ? "klar" : f.status === "avvisat" ? "antagande" : "forslag"} text={f.status === "forslag" ? "Förslag" : f.status === "godkant" ? `Godkänt av ${f.hanteradAv}` : "Avvisat"} />
                  )}
                </li>
              ))}
            </ul>
          </Forslagsram>
        )}

        <h3>Beslut</h3>
        {st.beslut.length ? (
          <ul className="radlista">
            {st.beslut.map((b) => (
              <li key={b.id}>
                <span>
                  {b.text}
                  <div className="dampad">
                    {b.typ === "kundgodkannande" ? "Kundgodkännande" : "Beslut"} av {b.beslutadAv} · {tid(b.tid)}
                    {b.franAiForslag && " · bygger på ELSA-förslag"}
                    {b.aterkallat && ` · Återkallat: ${b.aterkallat.skal}`}
                  </div>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Tom>Inga beslut.</Tom>
        )}

        <h3>Kommentarer</h3>
        {st.kommentarer.map((c, i) => (
          <p key={i}>
            {c.text} <span className="dampad">– {c.av}, {tid(c.tid)}</span>
          </p>
        ))}
        {kanAndra && (
          <div className="formrad">
            <input aria-label="Kommentar" placeholder="Kommentar" value={falt.kommentar} onChange={sätt("kommentar")} />
            <button onClick={() => gor("Kommentar", (kr, a) => kr.kommentera(st.nr, a, falt.kommentar))}>Kommentera</button>
          </div>
        )}

        <details>
          <summary>Versionshistorik ({st.historik.length})</summary>
          <ol>
            {st.historik.map((h) => (
              <li key={h.version}>
                v{h.version} · {tid(h.tid)} · {h.av}: {h.andring}
              </li>
            ))}
          </ol>
        </details>
      </Kort>

      <Kort titel="Uppföljning: baslinje, mål och utfall">
        {k.uppfoljning.length ? (
          <div className="tabellram">
            <table>
              <thead>
                <tr><th>Nyckeltal</th><th>Baslinje</th><th>Mål</th><th>Senaste utfall</th><th>Status</th></tr>
              </thead>
              <tbody>
                {k.uppfoljning.map((u) => (
                  <tr key={u.nyckeltalId}>
                    <td>{u.namn} ({u.enhet})</td>
                    <td>{u.baslinje ?? "–"}</td>
                    <td>{u.mal ?? "–"}</td>
                    <td>{u.senasteUtfall ?? "–"}</td>
                    <td>{UPPFNAMN[u.status]}{u.maluppfyllelse !== undefined && ` (${Math.round(u.maluppfyllelse * 100)} %)`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Tom>Inga nyckeltal registrerade.</Tom>
        )}
        <p className="dampad">Utfall jämförs bara mot en överenskommen baslinje. Kundresans illustrativa effektmått används inte som garanterade resultat.</p>
      </Kort>

      {kanAndra && org && (
        <Kort titel="Koppla fler moduler">
          <div className="formrad">
            <select aria-label="Modul" value={falt.modul} onChange={sätt("modul")}>
              <option value="">Välj modul</option>
              {MODULER.filter((m) => org.moduler.includes(m.id) && !p.varde.moduler.includes(m.id)).map((m) => (
                <option key={m.id} value={m.id}>{m.namn}</option>
              ))}
            </select>
            <button
              disabled={!falt.modul}
              onClick={() => {
                const r = s.plattform.kopplaModul(session, id, falt.modul);
                setFel(r.ok ? null : r.skal);
                uppdatera();
              }}
            >
              Koppla
            </button>
          </div>
          <p className="dampad">Bara moduler som ingår i avtalet och är tilldelade dig kan kopplas.</p>
        </Kort>
      )}
    </Sida>
  );
}
