// ELSA START: alla moduler från det gemensamma modulregistret. Sök efter modul eller uppgift, ingång via
// vertikal och samlad modulvy. Alla moduler visas, men data och funktioner skyddas för obehöriga:
// låsta och ej lanserade moduler har tydlig status. Varje modul har "← ELSA START" tillbaka.
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MODULER, modulerIVertikal, sokModuler, vertikal as hamtaVertikal, VERTIKALER, type Modul, type VertikalId } from "../../../src/index.js";
import { Ikon, Modulstatus, VERTIKALIKON } from "../components/modul";
import { useStore } from "../store";

function useLas() {
  const { s, session, org } = useStore();
  return (m: Modul) => (org ? s.plattform.modulatkomst(session, org.organisation.id, m.id) : { tillats: false as const, skal: "Ingen organisation" });
}

function Modulkort({ m, stor }: { m: Modul; stor?: boolean }) {
  const las = useLas()(m);
  return (
    <Link className={`es-modul${stor ? " stor" : ""}${las.tillats ? " finns" : " last"}`} to={m.ingang} title={las.tillats ? `Öppna ELSA ${m.namn}` : `Låst: ${las.skal}`}>
      <span className="es-ikon">{VERTIKALIKON[m.vertikal]}</span>
      <span className="es-text">
        <span className="es-namn">
          {m.namn} {!las.tillats && <span aria-label="låst">🔒</span>}
        </span>
        {stor && <span className="es-besk">{m.utdata}</span>}
        <Modulstatus m={m} kort={!stor} />
      </span>
    </Link>
  );
}

export function Tillbaka() {
  return (
    <Link className="es-tillbaka" to="/start">
      ← ELSA START
    </Link>
  );
}

export default function ElsaStart() {
  const { s } = useStore();
  const [q, setQ] = useState("");
  const traffar = useMemo(() => sokModuler(q), [q]);
  const lanserade = MODULER.filter((m) => m.lansering === "lanserad_demo").length;
  return (
    <div className="es-start">
      <div className="es-panel">
        <div className="es-logo" aria-hidden>
          <Ikon>
            <path d="M5 5h6v6H5zM5 13h6v6H5zM13 13h6v6h-6zM16 3.5l4.5 4.5-4.5 4.5-4.5-4.5z" />
          </Ikon>
        </div>
        <div className="es-eyebrow">Samlingsmodul</div>
        <h1 className="es-rubrik">ELSA START</h1>
        <p>Här når du alla ELSA-moduler. Sök efter modul eller uppgift, eller gå in via vertikal.</p>
        <div className="es-antal">{MODULER.length}</div>
        <div className="es-antal-text">moduler i {VERTIKALER.length} vertikaler</div>
        <p style={{ fontSize: "0.85rem" }}>{lanserade} har en arbetsyta i demon. Övriga är beskrivna men inte byggda.</p>
        <Link className="es-igang" to="/start/kom-igang">
          Så kommer ni igång →
        </Link>
      </div>
      <div className="es-moduler">
        <label className="falt">
          <span className="falt-etikett">Sök modul eller uppgift</span>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              s.plattform.registreraKlick("sok");
            }}
            placeholder="T.ex. årsräkning, energitrend, upphandling"
          />
        </label>
        {q.trim() ? (
          <>
            <div className="es-sektor">{traffar.length} träffar</div>
            <div className="es-rutnat">
              {traffar.map((t) => (
                <div key={t.modul.id}>
                  <Modulkort m={t.modul} />
                  <div className="dampad" style={{ fontSize: "0.78rem", marginTop: "0.2rem" }}>
                    Träff på {t.traff}: {t.text}
                  </div>
                </div>
              ))}
            </div>
            {!traffar.length && <p className="dampad">Ingen modul eller uppgift matchar.</p>}
          </>
        ) : (
          VERTIKALER.map((v) => (
            <section key={v.id}>
              <Link className="es-sektor" to={`/start/vertikal/${v.id}`}>
                {v.namn}
              </Link>
              <div className="es-rutnat">
                {modulerIVertikal(v.id).map((m) => (
                  <Modulkort key={m.id} m={m} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export function VertikalSida() {
  const { id = "" } = useParams();
  const v = VERTIKALER.find((x) => x.id === id);
  if (!v) return <p>Okänd vertikal. <Tillbaka /></p>;
  return (
    <div className="es-sida">
      <div className="rad-mellan">
        <div className="es-eyebrow">Vertikal</div>
        <Tillbaka />
      </div>
      <h1 className="es-rubrik liten">{hamtaVertikal(v.id as VertikalId).namn}</h1>
      <div className="es-rutnat stort">
        {modulerIVertikal(v.id).map((m) => (
          <Modulkort key={m.id} m={m} stor />
        ))}
      </div>
      <p className="dampad">Källa: modulregistret enligt målbilden i utvecklingsprompten 2026-11-15. Moduler märkta "Nytt förslag" är inte färdigutvecklade.</p>
    </div>
  );
}

const STEG = [
  ["Boka demo eller välj produkt", "Kort demo, vertikaldemo eller pilot med egen data. Demo är kostnadsfri."],
  ["Ange organisationsuppgifter", "Organisationsnummer kontrolleras till formatet. Automatisk hämtning görs först när en verifierad källa är ansluten."],
  ["Skicka offertförfrågan", "Varukorgen är en offertförfrågan. Ingen debitering sker."],
  ["Avtal", "När avtal tecknats tilldelas de avtalade modulerna."],
  ["Inbjudan och inloggning", "Kundens administratör bjuds in efter godkännande och tilldelar sedan roller och moduler."],
];

export function KomIgang() {
  return (
    <div className="es-sida">
      <div className="rad-mellan">
        <div className="es-eyebrow">Så kommer ni igång</div>
        <Tillbaka />
      </div>
      <h1 className="es-rubrik liten">Från demo till modulåtkomst</h1>
      <ol className="es-steg">
        {STEG.map(([t, b], i) => (
          <li key={t}>
            <span className="es-nr">{i + 1}</span>
            <strong>{t}</strong>
            <span className="dampad">{b}</span>
          </li>
        ))}
      </ol>
      <div className="es-villkor">
        <div>
          <strong>Pris</strong>
          <span>Presentationen föreslår från 2 900 kr per månad. Priset är inte fastställt.</span>
        </div>
        <div>
          <strong>Offert före avtal</strong>
          <span>Bindningstid och betalningsvillkor fastställs i avtalet.</span>
        </div>
        <div>
          <strong>Mänsklig kontroll</strong>
          <span>ELSA föreslår, ni beslutar. Krav på datahantering inom EU/EES ska beslutas och verifieras före lansering.</span>
        </div>
      </div>
      <p className="dampad">Flödet finns i demon på startsidan (Boka demo och Offertförfrågan) och i ESM:s CRM-vy. Inga meddelanden skickas.</p>
    </div>
  );
}
