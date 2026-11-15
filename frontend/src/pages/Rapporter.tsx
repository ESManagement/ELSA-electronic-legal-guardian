// Rapportbibliotek och rapportregister (PM avsnitt 7). Rapport-ID, ärende- eller diarienummer, versioner,
// statusflöde, godkännande av bestämd innehållsversion, export och återkallelse. Inget skickas externt.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FORMATNAMN, REGISTRERINGSNAMN, VERSIONSSTATUSNAMN, type Rapportblock, type Rapportformat, type Rapportvy, type Versionsstatus } from "../../../src/index.js";
import { Felruta, Kort, Markning, Sida, Tom, datum, tid } from "../components/ui";
import { useStore } from "../store";

const STATUSKLASS: Record<Versionsstatus, string> = { utkast: "antagande", under_granskning: "manuell", godkand: "pagar", publicerad: "klar", ersatt: "antagande", arkiverad: "antagande", aterkallad: "overskriden" };

export function RapportLista() {
  const { s, session, org } = useStore();
  const [text, setText] = useState("");
  const [typ, setTyp] = useState("");
  const [status, setStatus] = useState("");
  const [diarie, setDiarie] = useState("");
  if (!org) return <Sida titel="Rapporter"><Tom>Du tillhör ingen kundorganisation.</Tom></Sida>;
  const r = s.rapporter.sok(session, org.organisation.id, { ...(text ? { text } : {}), ...(typ ? { typ } : {}), ...(status ? { status: status as Versionsstatus } : {}), ...(diarie ? { diarienummer: diarie } : {}) });
  return (
    <Sida titel="Rapportbibliotek" ingress="Alla rapporter i organisationen med permanent rapport-ID, ärende- eller diarienummer och gällande version." atgarder={org.roll !== "lasare" ? <Link className="knapp primar" to="/rapporter/ny">Ny rapport</Link> : undefined}>
      <Kort titel="Sök och filtrera">
        <div className="formrad">
          <input aria-label="Sök rapport" placeholder="Titel, rapport-ID, objekt …" value={text} onChange={(e) => setText(e.target.value)} />
          <select aria-label="Rapporttyp" value={typ} onChange={(e) => setTyp(e.target.value)}>
            <option value="">Alla typer</option>
            {s.rapporter.rapportkatalog.map((t) => <option key={t.id} value={t.id}>{t.namn}</option>)}
          </select>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alla statusar</option>
            {Object.entries(VERSIONSSTATUSNAMN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input aria-label="Diarienummer" placeholder="Ärende- eller diarienummer" value={diarie} onChange={(e) => setDiarie(e.target.value)} />
        </div>
      </Kort>
      {!r.ok ? <Felruta fel={r.skal} /> : !r.varde.length ? <Tom>Inga rapporter matchar.</Tom> : (
        <div className="tabellram kort">
          <table>
            <thead><tr><th>Rapport-ID</th><th>Titel</th><th>Typ</th><th>Ärende</th><th>Gällande</th><th>Senaste</th><th>Ansvarig</th></tr></thead>
            <tbody>
              {r.varde.map((vy) => (
                <tr key={vy.rapport.rapportId}>
                  <td><Link to={`/rapporter/${vy.rapport.rapportId}`}>{vy.rapport.rapportId}</Link></td>
                  <td>{vy.rapport.titel}{vy.rapport.varningar.length > 0 && <div><Markning varde="medel" text="Källa ändrad" /></div>}</td>
                  <td>{s.rapporter.rapportkatalog.find((t) => t.id === vy.rapport.typ)?.namn}</td>
                  <td>{vy.beteckning.varde}<div className="dampad">{vy.beteckning.bekraftad ? vy.beteckning.etikett : "Diarieregistrering väntar"}</div></td>
                  <td>{vy.gallande ? vy.gallande.version : "–"}</td>
                  <td>{vy.aktuell.version} <Markning varde={STATUSKLASS[vy.aktuell.status]} text={VERSIONSSTATUSNAMN[vy.aktuell.status]} /></td>
                  <td>{vy.rapport.ansvarig}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Kort titel="Rapportkatalog">
        <p className="dampad">Alla rapporttyper är förslag. Mallägare är inte utsedda och vilken rapporttyp som blir pilot är inte beslutat.</p>
        <ul>
          {s.rapporter.rapportkatalog.map((t) => <li key={t.id}><strong>{t.namn}</strong> – {t.syfte}. Avsnitt: {t.obligatoriskaAvsnitt.join(", ")}. Format: {t.format.map((f) => FORMATNAMN[f]).join(", ")}.</li>)}
        </ul>
      </Kort>
    </Sida>
  );
}

export function NyRapport() {
  const { s, session, org, uppdatera } = useStore();
  const [typ, setTyp] = useState("pm");
  const [titel, setTitel] = useState("");
  const [period, setPeriod] = useState("");
  const [arendeId, setArendeId] = useState("");
  const [arendeRubrik, setArendeRubrik] = useState("");
  const [kallor, setKallor] = useState<string[]>([]);
  const [text, setText] = useState<Record<string, string>>({});
  const [fel, setFel] = useState<string | null>(null);
  const [skapad, setSkapad] = useState<string | null>(null);
  const [nyckel] = useState(() => `formular-${Math.random().toString(36).slice(2)}`);
  if (!org) return <Sida titel="Ny rapport"><Tom>Du tillhör ingen kundorganisation.</Tom></Sida>;
  const orgId = org.organisation.id;
  const arenden = s.rapporter.listaArenden(session, orgId);
  const projekt = s.plattform.listaProjekt(session, orgId);
  const godkanda = s.dokument.lista(session, orgId, { status: "godkand_for_analys" });
  const mall = s.rapporter.rapportkatalog.find((t) => t.id === typ)!;
  if (skapad) return <Sida titel="Rapport skapad"><Kort><p>Rapporten är registrerad som {skapad} med version 0.1.</p><Link to={`/rapporter/${skapad}`}>Öppna rapporten</Link></Kort></Sida>;

  const skapa = async () => {
    setFel(null);
    let aid = arendeId;
    if (!aid) {
      const u = projekt.ok ? projekt.varde[0]?.id : undefined;
      if (!u) return setFel("Inget uppdrag att koppla ärendet till");
      const a = await s.rapporter.skapaArende(session, u, arendeRubrik || titel, nyckel);
      if (!a.ok) return setFel(a.skal);
      aid = a.varde.arendeId;
    }
    const innehall: Rapportblock[] = mall.obligatoriskaAvsnitt.map((rubrik, i) => ({ id: `b${i + 1}`, rubrik, text: text[rubrik]?.trim() ? text[rubrik]!.trim() : null, ursprung: "manniska", kallor: [] }));
    const r = s.rapporter.skapaRapport(session, { arendeId: aid, typ, titel, objekt: [], period, mottagare: [], informationsklass: "intern", innehall, kallor, berakningsmetod: "Ingen beräkning" });
    if (!r.ok) return setFel(r.skal);
    uppdatera();
    setSkapad(r.varde.rapport.rapportId);
  };

  return (
    <Sida titel="Ny rapport" ingress="Rapporten får ett permanent rapport-ID. Ärendenumret är skilt från rapport-ID och följer alla versioner.">
      <Kort titel="Rapport">
        <div className="formrad">
          <label className="falt"><span className="falt-etikett">Rapporttyp</span>
            <select value={typ} onChange={(e) => setTyp(e.target.value)}>{s.rapporter.rapportkatalog.map((t) => <option key={t.id} value={t.id}>{t.namn}</option>)}</select>
          </label>
          <label className="falt"><span className="falt-etikett">Titel</span><input value={titel} onChange={(e) => setTitel(e.target.value)} /></label>
          <label className="falt"><span className="falt-etikett">Period</span><input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="ÅÅÅÅ" /></label>
          <label className="falt"><span className="falt-etikett">Ärende</span>
            <select value={arendeId} onChange={(e) => setArendeId(e.target.value)}>
              <option value="">Nytt ärende</option>
              {arenden.ok && arenden.varde.map((a) => <option key={a.arendeId} value={a.arendeId}>{a.internt} – {a.rubrik}</option>)}
            </select>
          </label>
          {!arendeId && <label className="falt"><span className="falt-etikett">Ärendets rubrik</span><input value={arendeRubrik} onChange={(e) => setArendeRubrik(e.target.value)} /></label>}
        </div>
      </Kort>
      <Kort titel="Underlag (bara dokument godkända för analys)">
        {godkanda.ok && godkanda.varde.length ? godkanda.varde.map((d) => (
          <label key={d.dokumentId} className="kryss"><input type="checkbox" checked={kallor.includes(d.dokumentId)} onChange={(e) => setKallor(e.target.checked ? [...kallor, d.dokumentId] : kallor.filter((x) => x !== d.dokumentId))} />{d.dokumentId} · {d.filnamn}</label>
        )) : <Tom>Inga godkända dokument.</Tom>}
      </Kort>
      <Kort titel="Obligatoriska avsnitt">
        <p className="dampad">Ett tomt avsnitt sparas som lucka och visas som "Uppgift saknas", aldrig som antagande.</p>
        {mall.obligatoriskaAvsnitt.map((a) => (
          <label key={a} className="falt"><span className="falt-etikett">{a}</span><textarea rows={2} value={text[a] ?? ""} onChange={(e) => setText({ ...text, [a]: e.target.value })} /></label>
        ))}
        <Felruta fel={fel} />
        <div className="knapprad"><button className="primar" onClick={() => void skapa()}>Skapa utkast 0.1</button></div>
      </Kort>
    </Sida>
  );
}

export function RapportDetalj() {
  const { id } = useParams();
  const { s, session, org, uppdatera } = useStore();
  const [fel, setFel] = useState<string | null>(null);
  const [skal, setSkal] = useState("");
  const [granskare, setGranskare] = useState("");
  const [diarienr, setDiarienr] = useState("");
  const [senasteExport, setSenasteExport] = useState<string | null>(null);
  const h = s.rapporter.hamta(session, id ?? "");
  if (!h.ok) return <Sida titel="Rapport"><Felruta fel={h.skal} /></Sida>;
  const vy: Rapportvy = h.varde;
  const r = vy.rapport;
  const v = vy.aktuell;
  const kanAndra = org?.roll !== "lasare";
  const typ = s.rapporter.rapportkatalog.find((t) => t.id === r.typ)!;
  const kor = (res: { ok: boolean; skal?: string }) => {
    setFel(res.ok ? null : (res as { skal: string }).skal);
    uppdatera();
  };
  const medlemmar = org ? s.plattform.listaMedlemmar(session, org.organisation.id) : null;

  return (
    <Sida titel={r.titel} ingress={<>{r.rapportId} · {typ.namn} · period {r.period} · ansvarig {r.ansvarig}</>} atgarder={<Link to="/rapporter">← Rapportbibliotek</Link>}>
      {r.varningar.map((w, i) => <div key={i} className="varnruta" role="note">{w.text}</div>)}
      <div className="nyckeltalsrad">
        <div className="nyckeltal"><div className="nt-etikett">Rapport-ID</div><div className="nt-varde">{r.rapportId}</div><div className="nt-under">Permanent, följer alla versioner och format</div></div>
        <div className="nyckeltal"><div className="nt-etikett">{vy.beteckning.etikett}</div><div className="nt-varde">{vy.beteckning.varde}</div><div className="nt-under">{vy.arende.rubrik}</div></div>
        <div className="nyckeltal"><div className="nt-etikett">Gällande version</div><div className="nt-varde">{vy.gallande?.version ?? "Ingen"}</div><div className="nt-under">{vy.gallande ? `Publicerad ${datum(vy.gallande.publicerad)}` : "Inte publicerad"}</div></div>
        <div className="nyckeltal"><div className="nt-etikett">Senaste version</div><div className="nt-varde">{v.version}</div><div className="nt-under"><Markning varde={STATUSKLASS[v.status]} text={VERSIONSSTATUSNAMN[v.status]} /></div></div>
      </div>

      <Kort titel={`Innehåll version ${v.version}`} extra={<span className="dampad">Mall {v.mallversion} · {v.datamodell} · {v.berakningsmetod}</span>}>
        {v.innehall.map((b) => (
          <div key={b.id} className={b.ursprung === "ai_utkast" ? "ai-ram" : "rapportblock"}>
            <h3>{b.rubrik} {b.ursprung === "ai_utkast" && <Markning varde="prognos" text="AI-utkast, ej granskat" />}{b.ursprung === "ai_granskad" && <Markning varde="klar" text="AI-text granskad" />}</h3>
            {b.text === null ? <p><Markning varde="saknas" text="Uppgift saknas" /> Luckan fylls inte med antaganden.</p> : <p>{b.text}</p>}
            {kanAndra && v.status === "under_granskning" && b.ursprung === "ai_utkast" && <button className="liten" onClick={() => kor(s.rapporter.granskaBlock(session, r.rapportId, b.id))}>Markera AI-texten som granskad</button>}
          </div>
        ))}
        <p className="dampad">Underlag (låst vid godkännande): {v.kallversioner.map((k) => `${k.dokumentId} v${k.version}`).join(", ") || "inga dokument"}. Bryttidpunkt {tid(v.bryttidpunkt)}. Innehållshash {v.innehallshash.slice(0, 12)}…</p>
      </Kort>

      {kanAndra && (
        <Kort titel="Åtgärder">
          {v.status === "utkast" && (
            <div className="formrad">
              <select aria-label="Granskare" value={granskare} onChange={(e) => setGranskare(e.target.value)}>
                <option value="">Välj granskare</option>
                {medlemmar?.ok ? medlemmar.varde.map((m) => <option key={m.anvandarId} value={m.anvandarId}>{m.namn}</option>) : <option value="administrator">Kundens administratör</option>}
              </select>
              <button className="primar" disabled={!granskare} onClick={() => kor(s.rapporter.skickaTillGranskning(session, r.rapportId, granskare))}>Skicka till granskning</button>
            </div>
          )}
          {v.status === "under_granskning" && (
            <div className="formrad">
              <button className="primar" onClick={() => kor(s.rapporter.godkann(session, r.rapportId, v.innehallshash))}>Godkänn version {v.version.startsWith("0.") ? `${v.version} som 1.0` : v.version}</button>
              <input aria-label="Skäl" placeholder="Skäl för underkännande" value={skal} onChange={(e) => setSkal(e.target.value)} />
              <button onClick={() => kor(s.rapporter.underkann(session, r.rapportId, skal))}>Underkänn</button>
            </div>
          )}
          {v.status === "godkand" && <button className="primar" onClick={() => kor(s.rapporter.publicera(session, r.rapportId))}>Publicera {v.version}</button>}
          {vy.gallande && (
            <div className="formrad">
              <input aria-label="Orsak till återkallelse" placeholder="Orsak till återkallelse" value={skal} onChange={(e) => setSkal(e.target.value)} />
              <button onClick={() => kor(s.rapporter.aterkalla(session, r.rapportId, vy.gallande!.version, skal))}>Återkalla {vy.gallande.version}</button>
            </div>
          )}
          <Felruta fel={fel} />
        </Kort>
      )}

      <Kort titel="Export och leveranser">
        <p className="dampad">Exporten utgår från den godkända rapportmodellen. Samma version ger samma kontrollsumma. Word-, PDF- och presentationsmallar är inte byggda; filen är en referens till renderingen.</p>
        <div className="knapprad">
          {typ.format.map((f: Rapportformat) => (
            <button key={f} onClick={() => { const e = s.rapporter.exportera(session, r.rapportId, f); setFel(e.ok ? null : e.skal); setSenasteExport(e.ok ? `${FORMATNAMN[f]} ${e.varde.version}: ${e.varde.kontrollsumma.slice(0, 16)}…${e.varde.aterexport ? " (samma innehåll som tidigare export)" : ""}` : null); uppdatera(); }}>Exportera {FORMATNAMN[f]}</button>
          ))}
        </div>
        {senasteExport && <div className="infruta">{senasteExport}</div>}
        {r.leveranser.length > 0 && (
          <div className="tabellram">
            <table>
              <thead><tr><th>Version</th><th>Format</th><th>Kontrollsumma</th><th>Skapad</th></tr></thead>
              <tbody>{r.leveranser.map((l, i) => <tr key={i}><td>{l.version}</td><td>{FORMATNAMN[l.format]}</td><td>{l.kontrollsumma.slice(0, 16)}…</td><td>{tid(l.skapad)} · {l.skapadAv}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Kort>

      <Kort titel="Ärende och diarium">
        <p>Internt ärendenummer: <strong>{vy.arende.internt}</strong> (inte ett diarienummer).</p>
        {vy.arende.extern ? (
          <p>Diarieregistrering i {vy.arende.extern.system}: <Markning varde={vy.arende.extern.registreringsstatus === "bekraftad" ? "klar" : "medel"} text={REGISTRERINGSNAMN[vy.arende.extern.registreringsstatus]} />{vy.arende.extern.diarienummer && <> · diarienummer <strong>{vy.arende.extern.diarienummer}</strong>, återläst från {vy.arende.extern.aterlastFran}</>}</p>
        ) : <p className="dampad">Ingen extern diariekoppling. Ansvaret mot kundens diarium är inte beslutat.</p>}
        {kanAndra && !vy.arende.extern && <button onClick={() => kor(s.rapporter.begarExternRegistrering(session, vy.arende.arendeId, org!.organisation.namn, "Kundens diarium (ej anslutet)"))}>Begär diarieregistrering</button>}
        {kanAndra && vy.arende.extern?.registreringsstatus === "vantande" && (
          <div className="formrad">
            <input aria-label="Bekräftat diarienummer" placeholder="Diarienummer från kundens diarium" value={diarienr} onChange={(e) => setDiarienr(e.target.value)} />
            <button onClick={() => kor(s.rapporter.aterlasDiarienummer(session, vy.arende.arendeId, { diarienummer: diarienr, kalla: "Manuellt återläst från kundens kvittens (demo)" }))}>Registrera bekräftat nummer</button>
          </div>
        )}
      </Kort>

      <Kort titel="Versionshistorik">
        <div className="tabellram">
          <table>
            <thead><tr><th>Version</th><th>Status</th><th>Ändring</th><th>Författare</th><th>Godkänd</th><th>Källor</th></tr></thead>
            <tbody>
              {r.versioner.map((x) => (
                <tr key={x.version}>
                  <td>{x.version}</td>
                  <td><Markning varde={STATUSKLASS[x.status]} text={VERSIONSSTATUSNAMN[x.status]} />{x.aterkallelse && <div className="dampad">Orsak: {x.aterkallelse.skal}</div>}{x.ersattAv && <div className="dampad">Ersatt av {x.ersattAv}</div>}</td>
                  <td>{x.andringsbeskrivning}{x.underkannanden.map((u, i) => <div key={i} className="dampad">Underkänd: {u.skal}</div>)}</td>
                  <td>{x.forfattare}</td>
                  <td>{x.godkand ? `${x.godkand.av}, ${datum(x.godkand.tid)}` : "–"}</td>
                  <td>{x.kallversioner.map((k) => `${k.dokumentId} v${k.version}`).join(", ") || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kort>
    </Sida>
  );
}
