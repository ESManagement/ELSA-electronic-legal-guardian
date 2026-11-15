// ELSA Energi: pilotfallet i avsnitt 15.2. Läs in en CSV med månadsdata, kvalitetskontrollera och granska
// trenden. Ingen besparing räknas utan godkänd baslinje. Modulåtkomst prövas mot plattformen.
import { useState } from "react";
import { granskaTrend, lasEnergiCsv, PILOTPROFIL, TESTFIL_TEST_BYGGNAD_01, type Energitrend } from "../../../src/index.js";
import { Felruta, Kort, Markning, Nyckeltal, Sida, Tom } from "../components/ui";
import { klocka } from "../demo";
import { useStore } from "../store";

const STATUS: Record<string, string> = { kraver_granskning: "Kräver granskning", godkand: "Granskad och fastställd", delvis: "Delvis – åtgärda felkö och luckor", blockerad: "Blockerad", fel: "Fel format" };

export default function Energi() {
  const { s, session, org } = useStore();
  const [csv, setCsv] = useState(TESTFIL_TEST_BYGGNAD_01);
  const [trend, setTrend] = useState<Energitrend | null>(null);
  const [kommentar, setKommentar] = useState("");
  const [fel, setFel] = useState<string | null>(null);
  const las = org ? s.plattform.modulatkomst(session, org.organisation.id, "energi") : { tillats: false as const, skal: "Ingen organisation" };
  if (!las.tillats) return <Sida titel="ELSA Energi"><Tom>Låst: {las.skal}.</Tom></Sida>;
  const kanAndra = org!.roll !== "lasare";
  const max = trend ? Math.max(...trend.serie.map((x) => x.wh ?? 0), 1) : 1;

  return (
    <Sida titel="Energitrend" ingress="Pilotfall: TEST-BYGGNAD-01, el, januari–december 2025, Europe/Stockholm. Konstruerade testvärden, inte verklig kunddata.">
      <Kort titel="1. Läs in mätserie (S02)">
        <label className="falt">
          <span className="falt-etikett">CSV: manad;energibarare;enhet;varde</span>
          <textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} disabled={!kanAndra} />
          <span className="falt-hjalp">Decimalkomma och tusentalsmellanslag tolkas. Tom cell betyder saknat värde, inte noll. kW avvisas eftersom det är effekt.</span>
        </label>
        <div className="knapprad">
          <button className="primar" disabled={!kanAndra} onClick={() => { setTrend(lasEnergiCsv(csv, "TEST-BYGGNAD-01.csv", PILOTPROFIL, klocka())); setFel(null); }}>
            Läs in och kontrollera
          </button>
          <button onClick={() => setCsv(TESTFIL_TEST_BYGGNAD_01)} disabled={!kanAndra}>Återställ testfilen</button>
        </div>
        {!kanAndra && <p className="dampad">Läsare kan inte läsa in data.</p>}
      </Kort>

      {trend && (
        <>
          <Kort titel="2. Datakvalitet (S03)" extra={<Markning varde={trend.status === "godkand" ? "klar" : trend.status === "kraver_granskning" ? "forslag" : "overskriden"} text={STATUS[trend.status]} />}>
            {trend.validationResults.length ? (
              <div className="tabellram">
                <table>
                  <thead><tr><th>Rad</th><th>Fält</th><th>Fel</th><th>Förslag</th></tr></thead>
                  <tbody>
                    {trend.validationResults.map((f, i) => (
                      <tr key={i}><td>{f.rad}</td><td>{f.falt}</td><td>{f.fel}</td><td>{f.forslag ?? "–"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Felkön är tom.</p>
            )}
            <ul>
              {trend.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Kort>

          <Kort titel="3. Trend (S09)">
            <div className="nyckeltalsrad">
              <Nyckeltal etikett="Summa månader med värde" varde={`${trend.summaKwh.toLocaleString("sv-SE")} kWh`} undertext="Ingen extrapolering över luckor" />
              <Nyckeltal etikett="Månader med värde" varde={`${trend.manaderMedVarde} av ${trend.serie.length}`} />
              <Nyckeltal etikett="Besparing" varde="Beräknas inte" undertext="Baslinje och metod inte godkända" />
            </div>
            <div className="staplar" role="img" aria-label="Elanvändning per månad 2025">
              {trend.serie.map((x) => (
                <div key={x.manad} className="stapelrad">
                  <span className="stapeletikett">{x.manad}</span>
                  <span className="stapel" style={{ width: `${((x.wh ?? 0) / max) * 100}%`, opacity: x.wh === null ? 0.2 : 1 }} />
                  <span className="stapelvarde">{x.wh === null ? "saknas" : `${(x.wh / 1000).toLocaleString("sv-SE")} kWh`}{x.kalla && <span className="dampad"> · rad {x.kalla.rad}</span>}</span>
                </div>
              ))}
            </div>
            <p className="dampad">Källa: {trend.evidence.kallId}, {trend.evidence.rader} rader, inläst {new Date(trend.evidence.hamtad).toLocaleString("sv-SE")}. Version {trend.skillVersion}.</p>
          </Kort>

          <Kort titel="4. Granska och fastställ">
            {trend.granskning ? (
              <p>
                Fastställd av {trend.granskning.av}: {trend.granskning.kommentar}
              </p>
            ) : kanAndra ? (
              <div className="formrad">
                <input aria-label="Granskningskommentar" placeholder="Granskningskommentar" value={kommentar} onChange={(e) => setKommentar(e.target.value)} />
                <button
                  className="primar"
                  onClick={() => {
                    const r = granskaTrend(trend, { id: session!.anvandarId, typ: "manniska" }, kommentar, klocka());
                    if (!r.ok) return setFel(r.skal);
                    setTrend(r.trend);
                    s.plattform.andraKundresa(session, "PRJ-DEMOFAST-1", "Energitrend fastställd", (k, a) => k.laggTillUnderlag(3, a, "Granskad energitrend 2025", `${trend.evidence.kallId} (${trend.skillVersion})`));
                  }}
                >
                  Fastställ trenden
                </button>
              </div>
            ) : (
              <p className="dampad">Läsare kan inte fastställa.</p>
            )}
            <Felruta fel={fel} />
            <h3>Nästa steg</h3>
            <ul>
              {trend.nextActions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Kort>
        </>
      )}
    </Sida>
  );
}
