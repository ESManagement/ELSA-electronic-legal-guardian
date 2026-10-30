// Ärendevy. För årsräkningen AR-SYNT-1 körs hela granskningen i domänmotorn: motorn föreslår,
// handläggaren fastställer varje kontrollpunkt, avvikelser hanteras och avslutsgrinden prövas.
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  CHECKLISTA,
  formateraBelopp,
  Kompletteringsbegaran,
  korKontroller,
  provaAtkomst,
  RIMLIGHETSPUNKT,
  STANDARDPARAMETRAR,
  tillatnaOvergangar,
  tolkaBelopp,
  type Arendestatus,
  type Fragestatus,
  type Granskningsanteckning,
  type Kontrollutfall,
} from "../../../src/index.js";
import { Felruta, Flikar, Forslagsram, Kort, Markning, Nyckeltal, Sida, tid, Tom, useAtgard } from "../components/ui";
import { ARENDETYPNAMN, Arendepost, DELEGATIONER, idag, klocka, PERSONER, STATUSNAMN, UPPDRAG, UPPDRAGSNAMN } from "../demo";
import { aktor, flytta, useStore } from "../store";

const UTFALL: { v: Kontrollutfall; n: string }[] = [
  { v: "utford_utan_avvikelse", n: "Utförd utan avvikelse" },
  { v: "avvikelse", n: "Avvikelse" },
  { v: "kan_inte_bedomas", n: "Kan inte bedömas" },
  { v: "ej_tillamplig", n: "Ej tillämplig" },
];

const KEDJA: Arendestatus[] = ["mottaget", "registrerat", "underlagskontroll_pagar", "komplettering_skickad", "svar_invantas", "sakuppgifter_verifierade", "beslutsutkast", "beslutat", "expedierat", "avslutat"];

function Statuskedja({ a }: { a: Arendepost }) {
  const i = KEDJA.indexOf(a.status);
  return (
    <div className="processsteg" aria-label="Ärendets steg">
      {KEDJA.map((st, j) => (
        <span key={st} className={`steg ${st === a.status ? "aktuellt" : i >= 0 && j < i ? "klart" : ""}`}>
          {STATUSNAMN[st]}
        </span>
      ))}
      {i < 0 && <span className="steg aktuellt">{STATUSNAMN[a.status]}</span>}
    </div>
  );
}

function Statusbyte({ a }: { a: Arendepost }) {
  const { jag, uppdatera } = useStore();
  const { fel, kör } = useAtgard();
  const [expedierad, setExpedierad] = useState(false);
  if (!jag) return null;
  const mojliga = tillatnaOvergangar(a.status);
  return (
    <Kort titel="Nästa steg i ärendet">
      {mojliga.length ? (
        <>
          <p className="dampad">Varje övergång prövas mot reglerna: bara människor för ärendet framåt, beslut kräver giltig delegation och expediering kräver registrerad händelse.</p>
          <div className="knapprad">
            {mojliga.map((till) => (
              <button key={till} className="sekundar" onClick={() => kör(() => (flytta(a, [till], jag, expedierad ? { expedieringshandelseId: `EXPH-${a.id}` } : {}), uppdatera()))}>
                {STATUSNAMN[till]}
              </button>
            ))}
          </div>
          {mojliga.includes("expedierat") && (
            <label className="kryss">
              <input type="checkbox" checked={expedierad} onChange={(e) => setExpedierad(e.target.checked)} /> Expedieringen är registrerad (mottagare, kanal och tid)
            </label>
          )}
          <Felruta fel={fel} />
        </>
      ) : (
        <Tom>Ärendet är avslutat.</Tom>
      )}
    </Kort>
  );
}

function Redovisningsflik() {
  const { s, jag, uppdatera } = useStore();
  const { fel, kör } = useAtgard();
  const [nyttVarde, setNyttVarde] = useState("");
  const r = s.redovisning;
  const sam = s.korning.sammanstallning;
  const konto = (id: string) => r.konton.find((k) => k.id === id)!;
  const verifiera = (tid: string) =>
    kör(() => {
      if (!jag) return;
      const ore = tolkaBelopp(nyttVarde);
      if (ore === null) throw new Error("Skriv beloppet som det står i originalet, till exempel -850,00.");
      const t = r.transaktioner.find((x) => x.id === tid)!;
      t.belopp = { originalvarde: t.belopp.originalvarde, varde: ore, status: "verifierad", kalla: t.belopp.kalla, verifieradAv: jag.id, verifieradTid: klocka().toISOString() };
      s.logg.registrera(aktor(jag), "uppgift_verifierad", s.granskning.id, { transaktion: tid, varde: ore });
      s.korning = korKontroller(r, STANDARDPARAMETRAR, klocka());
      s.granskning.foreslaFranMotor(s.korning);
      setNyttVarde("");
      uppdatera();
    });
  const tot = (v: number | null) => (v === null ? <Markning varde="kan_inte_bedomas" text="Kan inte summeras" /> : formateraBelopp(v));
  return (
    <>
      <div className="nyckeltalsrad">
        <Nyckeltal etikett="Ingående, totalt" varde={tot(sam.ingaendeTotalt)} />
        <Nyckeltal etikett="Externa inbetalningar" varde={formateraBelopp(sam.externaInbetalningar)} />
        <Nyckeltal etikett="Externa utbetalningar" varde={formateraBelopp(sam.externaUtbetalningar)} undertext={sam.ejMedraknadePoster ? `${sam.ejMedraknadePoster} belopp ej medräknat` : undefined} />
        <Nyckeltal etikett="Utgående, totalt" varde={tot(sam.utgaendeTotalt)} undertext={`Internt överfört ${formateraBelopp(sam.interntOverfort)}, ej medräknat`} />
      </div>
      <Kort titel="Konton och saldon">
        <div className="tabellram">
          <table>
            <thead>
              <tr>
                <th>Konto</th>
                <th className="tal">Ingående</th>
                <th className="tal">Utgående</th>
                <th className="tal">Enligt bankbesked</th>
                <th>Källa</th>
              </tr>
            </thead>
            <tbody>
              {r.saldon.map((sa) => (
                <tr key={sa.kontoId}>
                  <td>
                    {konto(sa.kontoId).benamning}
                    <div className="dampad">{konto(sa.kontoId).kontonummer}</div>
                  </td>
                  <td className="tal">{sa.ingaende.varde !== null ? formateraBelopp(sa.ingaende.varde) : "–"}</td>
                  <td className="tal">{sa.utgaende.varde !== null ? formateraBelopp(sa.utgaende.varde) : "–"}</td>
                  <td className="tal">{sa.enligtBankbesked?.varde != null ? formateraBelopp(sa.enligtBankbesked.varde) : "–"}</td>
                  <td className="dampad">Bankbesked {sa.bankbeskedDatum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kort>
      <Kort titel="Transaktioner" extra={<span className="dampad">Motorn räknar bara på verifierade uppgifter. Oläsligt räknas aldrig som noll.</span>}>
        <div className="tabellram">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Text</th>
                <th>Konto</th>
                <th className="tal">Belopp</th>
                <th>Uppgift</th>
                <th>Källa</th>
              </tr>
            </thead>
            <tbody>
              {r.transaktioner.map((t) => (
                <tr key={t.id} className={t.belopp.status === "olaslig" ? "olaslig" : ""}>
                  <td>{t.datum.varde}</td>
                  <td>
                    {t.text}
                    {t.kanKravaSamtycke && <div><Markning varde="nara" text="Kan kräva samtycke" /></div>}
                    {t.kategori === "intern_overforing" && <div className="dampad">Intern överföring</div>}
                  </td>
                  <td>{konto(t.kontoId).benamning}</td>
                  <td className="tal">{t.belopp.varde !== null ? formateraBelopp(t.belopp.varde) : <span className="dampad">Original: {t.belopp.originalvarde}</span>}</td>
                  <td>
                    <Markning varde={t.belopp.status} />
                    {t.belopp.status === "olaslig" && (
                      <div className="faststall">
                        <label className="falt">
                          <span className="falt-etikett">Belopp enligt originalet</span>
                          <input id={`verifiera-${t.id}`} value={nyttVarde} placeholder="-850,00" onChange={(e) => setNyttVarde(e.target.value)} />
                        </label>
                        <button className="primar liten" onClick={() => verifiera(t.id)}>
                          Verifiera mot originalet
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="dampad">
                    Sida {t.belopp.kalla.sida}, {t.belopp.kalla.plats}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Felruta fel={fel} />
      </Kort>
    </>
  );
}

function Punktrad({ id }: { id: string }) {
  const { s, jag, uppdatera } = useStore();
  const { fel, kör } = useAtgard();
  const [oppen, setOppen] = useState(false);
  const [utfall, setUtfall] = useState<Kontrollutfall>("utford_utan_avvikelse");
  const [sida, setSida] = useState("1");
  const [motivering, setMotivering] = useState("");
  const [bedomning, setBedomning] = useState("");
  const p = s.granskning.punkter().find((x) => x.punkt.id === id)!;
  const spara = () =>
    kör(() => {
      if (!jag) return;
      s.granskning.faststall(id, aktor(jag), {
        utfall,
        hanvisningar: sida.trim() ? [{ handlingId: "HANDLING-SYNT-ARSRAKNING-2026", sida: Number(sida) || undefined }] : [],
        motivering: motivering || undefined,
        bedomning: bedomning || undefined,
      });
      setOppen(false);
      uppdatera();
    });
  return (
    <tr>
      <td>
        <strong>{p.punkt.id}</strong>
      </td>
      <td style={{ minWidth: 220 }}>
        {p.punkt.rubrik}
        {p.punkt.materiell && (
          <div>
            <Markning varde="manuell" text="Materiell bedömning" />
          </div>
        )}
        <div className="dampad">{p.punkt.praktiskKontroll}</div>
        {p.motorresultat
          .filter((r) => r.utfall !== "utford_utan_avvikelse")
          .map((r, i) => (
            <div key={i} className="utdrag" style={{ marginTop: 4 }}>
              {r.kontrollId}: {r.beskrivning}
            </div>
          ))}
        {oppen && (
          <div className="faststall">
            <div className="formrad">
              <label className="falt">
                <span className="falt-etikett">Ditt utfall</span>
                <select id={`utfall-${id}`} value={utfall} onChange={(e) => setUtfall(e.target.value as Kontrollutfall)}>
                  {UTFALL.map((u) => (
                    <option key={u.v} value={u.v}>
                      {u.n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="falt">
                <span className="falt-etikett">Kontrollerat mot originalet, sida</span>
                <input id={`sida-${id}`} value={sida} onChange={(e) => setSida(e.target.value)} />
              </label>
            </div>
            <label className="falt">
              <span className="falt-etikett">Motivering</span>
              <input id={`motivering-${id}`} value={motivering} onChange={(e) => setMotivering(e.target.value)} placeholder="Krävs om du avviker från motorns förslag eller väljer ej tillämplig" />
            </label>
            {p.punkt.materiell && (
              <label className="falt">
                <span className="falt-etikett">Din självständiga bedömning</span>
                <textarea id={`bedomning-${id}`} rows={3} value={bedomning} onChange={(e) => setBedomning(e.target.value)} />
              </label>
            )}
            <Felruta fel={fel} />
            <div className="knapprad">
              <button className="primar liten" onClick={spara}>
                Fastställ
              </button>
              <button className="liten" onClick={() => setOppen(false)}>
                Avbryt
              </button>
            </div>
          </div>
        )}
      </td>
      <td>{p.foreslagetUtfall ? <Markning varde={p.foreslagetUtfall} /> : <span className="dampad">Manuell</span>}</td>
      <td>
        {p.faststalltUtfall ? (
          <>
            <Markning varde={p.faststalltUtfall} />
            <div className="dampad">
              {PERSONER[p.granskare!] ?? p.granskare} · {tid(p.datum)}
            </div>
          </>
        ) : (
          !s.granskning.avslutad && (
            <button
              className="liten"
              onClick={() => {
                setUtfall(p.foreslagetUtfall ?? "utford_utan_avvikelse");
                setOppen(true);
              }}
            >
              Fastställ …
            </button>
          )
        )}
      </td>
    </tr>
  );
}

function Granskningsflik() {
  const { s } = useStore();
  return (
    <>
      <Forslagsram>
        <p style={{ margin: "0 0 0.4rem" }}>
          Motorn har gjort {s.korning.resultat.length} kontroller med regelversion {s.korning.parametrar.regelversion}. Varje kontrollpunkt fastställs av dig.
        </p>
        <p className="dampad" style={{ margin: 0 }}>
          {s.korning.forbehall}
        </p>
      </Forslagsram>
      <Kort titel="Granskningschecklista" extra={<span className="dampad">{s.granskning.punkter().filter((p) => p.faststalltUtfall).length} av {CHECKLISTA.length} fastställda</span>}>
        <div className="tabellram">
          <table>
            <thead>
              <tr>
                <th>Punkt</th>
                <th>Kontroll</th>
                <th>Motorns förslag</th>
                <th>Fastställt</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLISTA.map((p) => (
                <Punktrad key={p.id} id={p.id} />
              ))}
            </tbody>
          </table>
        </div>
      </Kort>
    </>
  );
}

function Avvikelseflik() {
  const { s, jag, uppdatera } = useStore();
  const { fel, kör } = useAtgard();
  const [atgard, setAtgard] = useState<Record<string, string>>({});
  if (!jag) return null;
  const avv = s.granskning.avvikelser();
  return (
    <Kort titel="Avvikelser" extra={<span className="dampad">Öppna avvikelser blockerar avslut. De försvinner aldrig tyst.</span>}>
      {avv.length ? (
        <ul className="radlista">
          {avv.map((a) => (
            <li key={a.id} style={{ alignItems: "flex-start" }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong>{a.id}</strong> {a.beskrivning}
                <div className="dampad">
                  {a.kontrollId} · belägg sida {a.belagg.map((b) => b.sida).join(", ")}
                  {a.atgard ? ` · Åtgärd: ${a.atgard}` : ""}
                  {a.ansvarig ? ` · Ansvarig: ${PERSONER[a.ansvarig] ?? a.ansvarig}` : ""}
                </div>
                {(a.status === "oppen" || a.status === "utreds") && !s.granskning.avslutad && (
                  <div className="knapprad">
                    {a.status === "oppen" && (
                      <button className="liten" onClick={() => kör(() => (s.granskning.hanteraAvvikelse(a.id, aktor(jag), { status: "utreds", ansvarig: jag.id }), uppdatera()))}>
                        Jag utreder
                      </button>
                    )}
                    <input
                      id={`atgard-${a.id}`}
                      style={{ maxWidth: 320 }}
                      placeholder="Hur avvikelsen löstes, t.ex. förklarad genom komplettering"
                      value={atgard[a.id] ?? ""}
                      onChange={(e) => setAtgard({ ...atgard, [a.id]: e.target.value })}
                    />
                    <button
                      className="liten primar"
                      disabled={!atgard[a.id]?.trim()}
                      onClick={() => kör(() => (s.granskning.hanteraAvvikelse(a.id, aktor(jag), { status: "lost", atgard: atgard[a.id]! }), uppdatera()))}
                    >
                      Markera som löst
                    </button>
                    <button
                      className="liten"
                      disabled={!atgard[a.id]?.trim()}
                      onClick={() =>
                        kör(
                          () => (
                            s.granskning.hanteraAvvikelse(a.id, aktor(jag), { status: "overford_till_uppfoljning", ansvarig: jag.id, skal: atgard[a.id]!, uppfoljningsdatum: "2027-09-30", atgard: "Följs upp i nästa årsräkning" }),
                            uppdatera()
                          ),
                        )
                      }
                    >
                      För över till uppföljning
                    </button>
                  </div>
                )}
              </span>
              <span className="sts-hoger">
                <Markning varde={a.allvarlighet} />
                <Markning varde={a.status} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Tom>Inga avvikelser.</Tom>
      )}
      <Felruta fel={fel} />
    </Kort>
  );
}

function Kompletteringsflik({ a }: { a: Arendepost }) {
  const { s, jag, uppdatera } = useStore();
  const { fel, kör } = useAtgard();
  type Svarsutfall = Exclude<Fragestatus, "utkast" | "godkand" | "skickad">;
  const [svar, setSvar] = useState<Record<string, { utfall: Svarsutfall; text: string }>>({});
  if (!jag) return null;
  const k = s.komplettering;
  if (!k)
    return (
      <Kort titel="Komplettering">
        <p className="dampad">ELSA skriver ett frågeutkast per öppen avvikelse. Frågorna bygger på en neutral beskrivning av posten och innehåller inga interna arbetsinstruktioner.</p>
        <button
          className="primar"
          disabled={s.granskning.avslutad}
          onClick={() =>
            kör(() => {
              const ny = new Kompletteringsbegaran(a.id, s.logg, klocka);
              ny.skapaUtkast(s.granskning.avvikelser());
              if (!ny.fragor().length) throw new Error("Det finns inga öppna avvikelser att fråga om.");
              s.komplettering = ny;
              if (a.status === "underlagskontroll_pagar") flytta(a, ["komplettering_forbereds"], jag);
              uppdatera();
            })
          }
        >
          Skapa frågeutkast från avvikelserna
        </button>
        <Felruta fel={fel} />
      </Kort>
    );
  const exp = k.expediering;
  return (
    <>
      <Kort titel="Frågor till ställföreträdaren" extra={exp ? <Markning varde="skickad" text={`Expedierad ${tid(exp.tid)}`} /> : <Markning varde="utkast" text="Inte skickad" />}>
        <ul className="radlista">
          {k.fragor().map((f) => (
            <li key={f.id} style={{ alignItems: "flex-start" }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong>{f.id}</strong> {f.fragetext}
                <div className="dampad">Varför vi frågar: {f.motivering}</div>
                {f.svarBedomning && <div className="utdrag">Din bedömning av svaret: {f.svarBedomning}</div>}
                {exp && f.status === "skickad" && (
                  <div className="faststall">
                    <div className="formrad">
                      <select id={`svar-${f.id}`} value={svar[f.id]?.utfall ?? "besvarad_lost"} onChange={(e) => setSvar({ ...svar, [f.id]: { text: svar[f.id]?.text ?? "", utfall: e.target.value as Svarsutfall } })}>
                        <option value="besvarad_lost">Besvarad, löst</option>
                        <option value="oklart_svar">Oklart svar</option>
                        <option value="motsager_original">Svar motsäger originalet</option>
                        <option value="uteblivet_svar">Uteblivet svar</option>
                      </select>
                      <input id={`svarstext-${f.id}`} placeholder="Din bedömning av svaret" value={svar[f.id]?.text ?? ""} onChange={(e) => setSvar({ ...svar, [f.id]: { utfall: svar[f.id]?.utfall ?? "besvarad_lost", text: e.target.value } })} />
                    </div>
                    <button className="liten primar" onClick={() => kör(() => (k.registreraSvar(f.id, aktor(jag), svar[f.id]?.utfall ?? "besvarad_lost", svar[f.id]?.text ?? ""), uppdatera()))}>
                      Registrera svar
                    </button>
                  </div>
                )}
              </span>
              <span className="sts-hoger">
                <Markning varde={f.status} />
                {!exp && f.status === "utkast" && (
                  <button className="liten" onClick={() => kör(() => (k.godkann(f.id, aktor(jag)), uppdatera()))}>
                    Godkänn
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {!exp && (
          <div className="knapprad">
            <button
              className="primar"
              onClick={() =>
                kör(() => {
                  const e = k.registreraExpediering(aktor(jag), { mottagare: PERSONER.stina!, mottagarroll: "stallforetradare", kanal: "e_tjanst" });
                  flytta(a, ["komplettering_skickad", "svar_invantas"], jag, { expedieringId: e.id });
                  uppdatera();
                })
              }
            >
              Registrera expediering via e-tjänsten
            </button>
            <span className="dampad">Ett brevutkast är inte kommunicering. Frågorna räknas som skickade först när expedieringen är registrerad.</span>
          </div>
        )}
        <Felruta fel={fel} />
      </Kort>
      <Kort titel="Förhandsvisning av brevet">
        <div className="brev">{k.brevtext()}</div>
      </Kort>
    </>
  );
}

function Avslutsflik({ a }: { a: Arendepost }) {
  const { s, jag, uppdatera } = useStore();
  const { fel, kör } = useAtgard();
  const avv = s.granskning.avvikelser();
  const [ant, setAnt] = useState<Granskningsanteckning>({
    granskadHandling: "Årsräkning 2026 med bankbesked",
    period: `${s.redovisning.period.fran}–${s.redovisning.period.till}`,
    genomfordaKontroller: "CP-01–CP-19 enligt granskningsrutin 2027-01",
    identifieradeAvvikelser: avv.map((x) => x.id).join(", ") || "Inga",
    kompletteringarOchSvar: "",
    sjalvstandigBedomning: "",
    kvarstaendeFragor: "",
    nastaAtgard: "",
    ansvarig: jag?.id ?? "",
  });
  if (!jag) return null;
  const etikett: Record<string, string> = {
    granskadHandling: "Granskad handling", period: "Period", genomfordaKontroller: "Genomförda kontroller", identifieradeAvvikelser: "Identifierade avvikelser",
    kompletteringarOchSvar: "Kompletteringar och svar", sjalvstandigBedomning: "Självständig bedömning", kvarstaendeFragor: "Kvarstående frågor", nastaAtgard: "Nästa åtgärd", ansvarig: "Ansvarig",
  };
  const hinder = (s.granskning.avslutad ? [] : s.granskning.avslutshinder(ant)).map((h) => h.replace(/"(\w+)"/, (_, f: string) => `"${etikett[f] ?? f}"`));
  const falt: [keyof Granskningsanteckning, string][] = [
    ["kompletteringarOchSvar", "Kompletteringar och svar"],
    ["sjalvstandigBedomning", "Självständig bedömning"],
    ["kvarstaendeFragor", "Kvarstående frågor"],
    ["nastaAtgard", "Nästa åtgärd"],
  ];
  const rim = s.granskning.punkter().find((p) => p.punkt.id === RIMLIGHETSPUNKT)!;
  if (s.granskning.avslutad) {
    const anteckning = s.granskning.anteckning();
    return (
      <Kort titel="Granskningen är avslutad">
        <div className="infruta">Avslutsgrinden är passerad och anteckningen är låst. En rättelse görs som en ny spårbar händelse.</div>
        <ul className="radlista">
          {anteckning &&
            Object.entries(anteckning).map(([k2, v]) => (
              <li key={k2}>
                <span className="dampad">{k2}</span>
                <span>{k2 === "ansvarig" ? PERSONER[v] ?? v : v}</span>
              </li>
            ))}
        </ul>
        {a.status !== "avslutat" && (
          <div className="knapprad">
            <button className="primar" onClick={() => kör(() => (flytta(a, a.status === "svar_invantas" ? ["underlagskontroll_pagar", "sakuppgifter_verifierade", "avslutat"] : a.status === "underlagskontroll_pagar" ? ["sakuppgifter_verifierade", "avslutat"] : ["avslutat"], jag), uppdatera()))}>
              Avsluta ärendet
            </button>
          </div>
        )}
        <Felruta fel={fel} />
      </Kort>
    );
  }
  return (
    <div className="rutnat-2">
      <Kort titel="Granskningsanteckning">
        <p className="dampad">Rimlighetsbedömningen (CP-18) {rim.faststalltUtfall ? "är fastställd." : "görs i checklistan och kan inte sättas till ej tillämplig."}</p>
        {falt.map(([f, n]) => (
          <label key={f} className="falt">
            <span className="falt-etikett">{n}</span>
            <textarea id={`ant-${f}`} rows={f === "sjalvstandigBedomning" ? 3 : 2} value={ant[f]} onChange={(e) => setAnt({ ...ant, [f]: e.target.value })} />
          </label>
        ))}
        <div className="knapprad">
          <button className="primar" onClick={() => kör(() => {
            const r = s.granskning.avsluta(aktor(jag), ant);
            if (!r.ok) throw new Error(`Avslutet nekades: ${r.hinder.length} hinder kvar.`);
            uppdatera();
          })}>
            Avsluta granskningen
          </button>
        </div>
        <Felruta fel={fel} />
      </Kort>
      <Kort titel="Avslutsgrinden" extra={hinder.length ? <Markning varde="overskriden" text={`${hinder.length} hinder`} /> : <Markning varde="ok" text="Kan avslutas" />}>
        {hinder.length ? (
          <ul className="hinder">
            {hinder.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        ) : (
          <Tom>Alla villkor är uppfyllda.</Tom>
        )}
        <p className="dampad">Aritmetisk balans är inte ett godkännande. Alla punkter ska vara fastställda av en människa, avvikelser hanterade och den materiella bedömningen gjord.</p>
      </Kort>
    </div>
  );
}

function Loggflik({ objekt }: { objekt: string[] }) {
  const { s } = useStore();
  const h = s.logg.handelser().filter((x) => objekt.includes(x.objektId));
  return (
    <Kort titel="Händelser i ärendet" extra={<Link to="/logg">Hela loggen →</Link>}>
      <div className="tabellram">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tid</th>
              <th>Vem</th>
              <th>Händelse</th>
              <th>Hash</th>
            </tr>
          </thead>
          <tbody>
            {h.map((x) => (
              <tr key={x.lopnummer}>
                <td>{x.lopnummer}</td>
                <td>{tid(x.tid)}</td>
                <td>
                  {PERSONER[x.aktorId] ?? x.aktorId} <span className="dampad">({x.aktortyp})</span>
                </td>
                <td>{x.handelse.replace(/_/g, " ")}</td>
                <td className="hash">{x.hash.slice(0, 12)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Kort>
  );
}

export default function ArendeDetalj() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const { s, jag } = useStore();
  if (!jag) return null;
  const a = s.arenden.find((x) => x.id === id);
  // Obehöriga får samma svar som för ett ärende som inte finns (A-02, A-14).
  if (!a || !provaAtkomst(jag.motor, a, "las", klocka()).tillats)
    return (
      <Sida titel="Ärendet kan inte visas">
        <Tom>Ärendet finns inte eller så har du inte behörighet att se det.</Tom>
      </Sida>
    );
  const u = UPPDRAG.find((x) => x.id === a.uppdragId);
  const flik = sp.get("flik") ?? (a.id === "AR-SYNT-1" ? "granskning" : "oversikt");
  const avv = a.id === "AR-SYNT-1" ? s.granskning.avvikelser().filter((x) => x.status === "oppen" || x.status === "utreds").length : 0;
  const harDelegation = DELEGATIONER.some((d) => d.delegatId === jag.id && d.arendetyper.includes(a.typ) && d.giltigFran <= idag());

  return (
    <Sida
      titel={`${a.titel} · ${PERSONER[a.huvudmanId]}`}
      ingress={
        <>
          {a.id} · {ARENDETYPNAMN[a.typ]} · {u ? `${UPPDRAGSNAMN[u.kategori]}, ställföreträdare ${PERSONER[u.stallforetradareId]}` : "–"} · ansvarig {a.agare ? PERSONER[a.agare] : "saknas"}
        </>
      }
      atgarder={<Markning varde={harDelegation ? "ok" : "antagande"} text={harDelegation ? "Du har delegation" : "Ingen delegation för ärendetypen"} />}
    >
      <Statuskedja a={a} />
      <Flikar
        aktiv={flik}
        valj={(f) => setSp({ flik: f })}
        flikar={
          a.id === "AR-SYNT-1"
            ? [
                { id: "granskning", namn: "Granskning" },
                { id: "redovisning", namn: "Redovisning" },
                { id: "avvikelser", namn: "Avvikelser", antal: avv },
                { id: "komplettering", namn: "Komplettering" },
                { id: "avslut", namn: "Avslut" },
                { id: "oversikt", namn: "Status" },
                { id: "logg", namn: "Logg" },
              ]
            : [
                { id: "oversikt", namn: "Översikt" },
                { id: "logg", namn: "Logg" },
              ]
        }
      />
      {flik === "granskning" && <Granskningsflik />}
      {flik === "redovisning" && <Redovisningsflik />}
      {flik === "avvikelser" && <Avvikelseflik />}
      {flik === "komplettering" && <Kompletteringsflik a={a} />}
      {flik === "avslut" && <Avslutsflik a={a} />}
      {flik === "oversikt" && (
        <div className="rutnat-2">
          <Kort titel="Uppgifter">
            <ul className="radlista">
              <li>
                <span className="dampad">Handling</span>
                <span>{a.handling}</span>
              </li>
              <li>
                <span className="dampad">Mottaget</span>
                <span>{tid(a.mottaget)}</span>
              </li>
              <li>
                <span className="dampad">Senaste materiella aktivitet</span>
                <span>{tid(a.senasteMateriellaAktivitet)}</span>
              </li>
              <li>
                <span className="dampad">Uppdragets omfattning</span>
                <span>{u?.omfattning.join(", ") ?? "–"}</span>
              </li>
              <li>
                <span className="dampad">Förordnande</span>
                <span>{u?.beslutsreferens ?? "–"}</span>
              </li>
            </ul>
            {a.status === "mottaget" && (
              <div className="varnruta">Personkopplingen är inte verifierad. ELSA kopplar aldrig handlingar enbart på namn; handlingen ligger i utredningskön tills identiteten är kontrollerad.</div>
            )}
          </Kort>
          <Statusbyte a={a} />
        </div>
      )}
      {flik === "logg" && <Loggflik objekt={[a.id, s.granskning.id]} />}
    </Sida>
  );
}
