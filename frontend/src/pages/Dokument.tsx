// Säker dokumentmottagning (PM avsnitt 3). Filval och dra-och-släpp går till samma mottagning i plattformen,
// med samma kontroller och en kvittens per fil. Behörighet prövas i plattformen, inte i gränssnittet.
import { DragEvent, useRef, useState } from "react";
import { DOKUMENTSTATUSNAMN, FILTYPER, type Dokument, type Filinlamning, type Informationsklass, type Inlamningsvag, type Kvittens } from "../../../src/index.js";
import { Felruta, Kort, Markning, Sida, Tom, tid } from "../components/ui";
import { useStore } from "../store";

const STATUSKLASS: Record<string, string> = { mottagen: "pagar", kontrolleras: "medel", behover_kompletteras: "overskriden", granskas: "manuell", godkand_for_analys: "klar", ersatt: "antagande" };
const UTFALLKLASS: Record<string, string> = { mottagen: "klar", dubblett: "medel", avvisad: "overskriden" };
const INFOKLASS: Record<Informationsklass, string> = { oppen: "Öppen", intern: "Intern", konfidentiell: "Konfidentiell", skyddad: "Skyddad" };

async function lasFiler(lista: FileList | File[]): Promise<Filinlamning[]> {
  return Promise.all([...lista].map(async (f) => ({ filnamn: f.name, mime: f.type, innehall: new Uint8Array(await f.arrayBuffer()) })));
}

export default function DokumentSida() {
  const { s, session, org, uppdatera } = useStore();
  const [uppdragId, setUppdragId] = useState("");
  const [dokumenttyp, setDokumenttyp] = useState("");
  const [period, setPeriod] = useState("");
  const [infoklass, setInfoklass] = useState<Informationsklass | "">("intern");
  const [objekt, setObjekt] = useState("");
  const [kvittenser, setKvittenser] = useState<Kvittens[]>([]);
  const [fel, setFel] = useState<string | null>(null);
  const [drar, setDrar] = useState(false);
  const [valt, setValt] = useState<string | null>(null);
  const filval = useRef<HTMLInputElement>(null);

  if (!org) return <Sida titel="Dokument"><Tom>Du tillhör ingen kundorganisation.</Tom></Sida>;
  const orgId = org.organisation.id;
  const projekt = s.plattform.listaProjekt(session, orgId);
  const uppdrag = projekt.ok ? projekt.varde : [];
  const aktivtUppdrag = uppdragId || uppdrag[0]?.id || "";
  const dok = s.dokument.lista(session, orgId, aktivtUppdrag ? { uppdragId: aktivtUppdrag } : {});
  const kanAndra = org.roll !== "lasare";

  const lamna = async (filer: FileList | File[], vag: Inlamningsvag, ersatter?: string) => {
    setFel(null);
    const inl = await lasFiler(filer);
    if (ersatter) inl.forEach((f) => (f.ersatter = ersatter));
    const r = s.dokument.taEmot(session, {
      organisationId: orgId,
      uppdragId: aktivtUppdrag,
      vag: inl.length > 1 && vag === "filval" ? "massuppladdning" : vag,
      gemensamt: {
        ...(dokumenttyp.trim() ? { dokumenttyp: dokumenttyp.trim() } : {}),
        ...(period.trim() ? { period: period.trim() } : {}),
        ...(infoklass ? { informationsklass: infoklass } : {}),
        ...(objekt.trim() ? { objekt: [{ typ: "byggnad" as const, id: objekt.trim() }] } : {}),
      },
    }, inl);
    if (!r.ok) return setFel(r.skal);
    setKvittenser(r.varde);
    uppdatera();
  };

  const slapp = (e: DragEvent) => {
    e.preventDefault();
    setDrar(false);
    if (!kanAndra) return setFel("Läsare kan inte lämna underlag");
    if (e.dataTransfer.files.length) void lamna(e.dataTransfer.files, "dra_och_slapp");
  };

  const kor = (r: { ok: boolean; skal?: string }) => {
    setFel(r.ok ? null : (r as { skal: string }).skal);
    uppdatera();
  };

  const valtDok = valt ? s.dokument.hamta(session, valt) : null;

  return (
    <Sida titel="Dokument och underlag" ingress="Lämna underlag en gång. Varje fil kontrolleras, får ett dokument-ID och en kvittens. Originalet bevaras oförändrat.">
      <div className="varnruta" role="note">
        Skanning mot skadlig kod: <strong>{s.dokument.skannerinfo.namn}</strong>. Ingen verklig skanningstjänst och inget originalarkiv (SharePoint) är anslutet. Filgränsen 100 MB är ett förslag.
      </div>

      <Kort titel="1. Välj sammanhang">
        <div className="formrad">
          <label className="falt">
            <span className="falt-etikett">Organisation</span>
            <input value={org.organisation.namn} disabled />
          </label>
          <label className="falt">
            <span className="falt-etikett">Uppdrag</span>
            <select value={aktivtUppdrag} onChange={(e) => setUppdragId(e.target.value)}>
              {uppdrag.map((u) => <option key={u.id} value={u.id}>{u.namn}</option>)}
            </select>
          </label>
          <label className="falt">
            <span className="falt-etikett">Objekt (byggnad, valfritt)</span>
            <input value={objekt} onChange={(e) => setObjekt(e.target.value)} placeholder="T.ex. TEST-BYGGNAD-01" />
          </label>
        </div>
        <div className="formrad">
          <label className="falt">
            <span className="falt-etikett">Dokumenttyp för alla filer (valfritt)</span>
            <input value={dokumenttyp} onChange={(e) => setDokumenttyp(e.target.value)} placeholder="Lämna tomt för förslag per fil" />
          </label>
          <label className="falt">
            <span className="falt-etikett">Period för alla filer (valfritt)</span>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="ÅÅÅÅ eller ÅÅÅÅ-MM" />
          </label>
          <label className="falt">
            <span className="falt-etikett">Informationsklass</span>
            <select value={infoklass} onChange={(e) => setInfoklass(e.target.value as Informationsklass)}>
              <option value="">Ange per fil</option>
              {Object.entries(INFOKLASS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        {!uppdrag.length && <p className="dampad">Du har inget uppdrag i organisationen att lämna underlag till.</p>}
      </Kort>

      <Kort titel="2. Lämna underlaget">
        <div
          className={`mottagningsyta${drar ? " drar" : ""}`}
          data-testid="mottagningsyta"
          onDragOver={(e) => { e.preventDefault(); setDrar(true); }}
          onDragLeave={() => setDrar(false)}
          onDrop={slapp}
        >
          <p><strong>Dra och släpp filer här</strong> eller</p>
          <button className="primar" disabled={!kanAndra || !aktivtUppdrag} onClick={() => filval.current?.click()}>Välj filer</button>
          <input ref={filval} type="file" multiple hidden aria-label="Välj filer att ladda upp" onChange={(e) => { if (e.target.files?.length) void lamna(e.target.files, "filval"); e.target.value = ""; }} />
          <p className="dampad">
            Tillåtna: {[...new Set(FILTYPER.filter((f) => f.stod === "extraktion").map((f) => f.namn))].join(", ")}. DWG och IFC lagras men innehållet läses inte ut utan särskild hantering.
          </p>
          {!kanAndra && <p className="dampad">Läsare kan inte lämna underlag.</p>}
        </div>
        <Felruta fel={fel} />
        {kvittenser.length > 0 && (
          <>
            <h3>Kvittens per fil</h3>
            <div className="tabellram">
              <table>
                <thead><tr><th>Fil</th><th>Utfall</th><th>Dokument-ID</th><th>Meddelande</th></tr></thead>
                <tbody>
                  {kvittenser.map((k, i) => (
                    <tr key={i}>
                      <td>{k.filnamn}</td>
                      <td><Markning varde={UTFALLKLASS[k.utfall]} text={k.utfall === "mottagen" ? "Mottagen" : k.utfall === "dubblett" ? "Dubblett" : "Avvisad"} /></td>
                      <td>{k.dokumentId ?? "–"}</td>
                      <td>{k.meddelande}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Kort>

      <Kort titel="3. Följ resultatet">
        {!dok.ok ? <Felruta fel={dok.skal} /> : !dok.varde.length ? <Tom>Inga dokument i uppdraget ännu.</Tom> : (
          <div className="tabellram">
            <table>
              <thead><tr><th>Dokument-ID</th><th>Fil</th><th>Version</th><th>Typ</th><th>Period</th><th>Status</th><th>Inlämnad</th><th></th></tr></thead>
              <tbody>
                {dok.varde.map((d) => (
                  <tr key={d.dokumentId}>
                    <td>{d.dokumentId}</td>
                    <td>{d.filnamn}{d.stod === "endast_lagring" && <div className="dampad">Endast lagring</div>}</td>
                    <td>{d.version}</td>
                    <td>{d.metadata.dokumenttyp ?? (d.forslag.dokumenttyp ? <Markning varde="prognos" text={`Förslag: ${d.forslag.dokumenttyp.varde}`} /> : "–")}</td>
                    <td>{d.metadata.period ?? (d.forslag.period ? <Markning varde="prognos" text={`Förslag: ${d.forslag.period.varde}`} /> : "–")}</td>
                    <td><Markning varde={STATUSKLASS[d.status]} text={DOKUMENTSTATUSNAMN[d.status]} /></td>
                    <td>{tid(d.kalla.tid)}</td>
                    <td><button className="liten" onClick={() => setValt(d.dokumentId)}>Öppna</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kort>

      {valtDok && (valtDok.ok ? <Dokumentdetalj d={valtDok.varde} kanAndra={kanAndra} kor={kor} lamnaVersion={(f) => lamna(f, "filval", valtDok.varde.dokumentId)} /> : <Felruta fel={valtDok.skal} />)}
    </Sida>
  );
}

function Dokumentdetalj({ d, kanAndra, kor, lamnaVersion }: { d: Dokument; kanAndra: boolean; kor: (r: { ok: boolean; skal?: string }) => void; lamnaVersion: (f: FileList) => void }) {
  const { s, session } = useStore();
  const [kommentar, setKommentar] = useState("");
  const [period, setPeriod] = useState("");
  const [typ, setTyp] = useState("");
  const version = useRef<HTMLInputElement>(null);
  const forslag = (["dokumenttyp", "period"] as const).filter((f) => d.forslag[f] && !d.forslag[f]!.bekraftad);
  return (
    <Kort titel={`${d.dokumentId} · ${d.filnamn}`} extra={<Markning varde={STATUSKLASS[d.status]} text={DOKUMENTSTATUSNAMN[d.status]} />}>
      <p className="dampad">
        Handling {d.handlingsId}, version {d.version}{d.ersatter ? `, ersätter ${d.ersatter}` : ""}{d.ersattAv ? `, ersatt av ${d.ersattAv}` : ""}. Kontrollsumma {d.kontrollsumma.slice(0, 16)}…, {d.storlekByte} byte, inlämnad via {d.kalla.vag.replace(/_/g, " ")} av {d.kalla.inlamnadAv}.
      </p>
      <h3>Kontroller</h3>
      <ul>
        {d.kontroller.map((k, i) => <li key={i}><strong>{k.kontroll.replace(/_/g, " ")}</strong>: {k.detalj}</li>)}
      </ul>
      {d.saknas.length > 0 && <div className="varnruta">Saknas: {d.saknas.join(", ")}</div>}
      {kanAndra && forslag.length > 0 && (
        <div className="ai-ram">
          <div className="ai-ram-huvud"><strong>Förslag från ELSA</strong><span className="dampad">– utifrån filnamnet, bekräfta bara om det stämmer</span></div>
          {forslag.map((f) => <div key={f}>{f === "dokumenttyp" ? "Dokumenttyp" : "Period"}: {d.forslag[f]!.varde}</div>)}
          <div className="knapprad"><button onClick={() => kor(s.dokument.komplettera(session, d.dokumentId, { bekraftaForslag: forslag }))}>Bekräfta förslagen</button></div>
        </div>
      )}
      {kanAndra && ["behover_kompletteras", "granskas", "kontrolleras"].includes(d.status) && (
        <div className="formrad">
          <input aria-label="Ange dokumenttyp" placeholder="Dokumenttyp" value={typ} onChange={(e) => setTyp(e.target.value)} />
          <input aria-label="Ange period" placeholder="Period" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <button onClick={() => kor(s.dokument.komplettera(session, d.dokumentId, { metadata: { ...(typ ? { dokumenttyp: typ } : {}), ...(period ? { period } : {}), ...(d.metadata.objekt?.length ? {} : { objekt: [{ typ: "projekt", id: d.uppdragId }] }), ...(d.metadata.informationsklass ? {} : { informationsklass: "intern" }) } }))}>Komplettera</button>
        </div>
      )}
      {kanAndra && d.status === "granskas" && (
        <div className="formrad">
          <input aria-label="Granskningskommentar" placeholder="Vad har granskats?" value={kommentar} onChange={(e) => setKommentar(e.target.value)} />
          <button className="primar" onClick={() => kor(s.dokument.godkannForAnalys(session, d.dokumentId, kommentar))}>Godkänn för analys</button>
          <button onClick={() => kor(s.dokument.begarKomplettering(session, d.dokumentId, kommentar))}>Begär komplettering</button>
        </div>
      )}
      {kanAndra && d.status !== "ersatt" && (
        <div className="knapprad">
          <button onClick={() => version.current?.click()}>Lämna ny version</button>
          <input ref={version} type="file" hidden aria-label="Välj ny version" onChange={(e) => { if (e.target.files?.length) lamnaVersion(e.target.files); e.target.value = ""; }} />
          <span className="dampad">Rapporter som bygger på den här versionen får en varning om möjlig inaktualitet.</span>
        </div>
      )}
      <h3>Historik</h3>
      <ul className="radlista">
        {d.historik.map((h, i) => <li key={i}>{tid(h.tid)} · {h.handelse} · {h.aktor}{h.kommentar ? ` – ${h.kommentar}` : ""}</li>)}
      </ul>
    </Kort>
  );
}
