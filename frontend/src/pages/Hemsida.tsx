// Offentlig startsida före inloggning. Tydligt budskap, sök modul eller uppgift, Boka demo och Se ELSA START,
// två dörrar in, priser nära bokning och offertförfrågan som varukorg. Inga overifierade priser, referenser
// eller säkerhetslöften. Formulären lagrar bara i webbläsarens minne i demon och skickar ingenting.
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DEMOTYPER, FASER, INLOGGNINGSVAGAR, MODULER, modulerIVertikal, sokModuler, VERTIKALER, type Demotyp } from "../../../src/index.js";
import { useStore } from "../store";

// HashRouter använder #-delen för routing, så sidans ankare scrollas med JavaScript.
const till = (id: string, ocksa?: () => void) => (e: { preventDefault: () => void }) => {
  e.preventDefault();
  ocksa?.();
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth" });
  el?.querySelector<HTMLElement>("input, h2")?.focus({ preventScroll: true });
};

function Statusord({ id }: { id: string }) {
  const m = MODULER.find((x) => x.id === id)!;
  return <span className={`hs-status ${m.lansering === "lanserad_demo" ? "demo" : ""}`}>{m.lansering === "lanserad_demo" ? "Demo finns" : m.nyttForslag ? "Nytt förslag" : "Under utveckling"}</span>;
}

export default function Hemsida() {
  const { s } = useStore();
  const p = s.plattform;
  const [q, setQ] = useState("");
  const traffar = useMemo(() => sokModuler(q).slice(0, 8), [q]);
  const [demo, setDemo] = useState({ organisation: "", namn: "", epost: "", demotyp: "kort_demo" as Demotyp, vertikal: "" });
  const [offert, setOffert] = useState({ organisation: "", orgnr: "", namn: "", epost: "", moduler: [] as string[] });
  const [kontakt, setKontakt] = useState({ organisation: "", namn: "", epost: "", meddelande: "" });
  const [svar, setSvar] = useState<Record<string, { ok: boolean; text: string }>>({});

  const skicka = (nyckel: string, r: { ok: boolean; skal?: string }, rensa: () => void) => (e?: FormEvent) => {
    e?.preventDefault();
    setSvar({ ...svar, [nyckel]: r.ok ? { ok: true, text: "Tack! Förfrågan är registrerad i demons CRM. Inget meddelande har skickats." } : { ok: false, text: r.skal ?? "Något gick fel" } });
    if (r.ok) rensa();
  };

  return (
    <div className="hs">
      <header className="hs-topp">
        <a className="hs-logga" href="#/" onClick={till("start")}>ELSA</a>
        <nav aria-label="Huvudmeny">
          <a href="#/" onClick={till("elsa", () => p.registreraKlick("se_elsa_start"))}>ELSA</a>
          <a href="#/" onClick={till("tjanster")}>Tjänster</a>
          <a href="#/" onClick={till("priser", () => p.registreraKlick("pris"))}>Priser</a>
          <a href="#/" onClick={till("referenser", () => p.registreraKlick("referenser"))}>Referenser</a>
          <a href="#/" onClick={till("kunskap")}>Kunskap</a>
          <a href="#/" onClick={till("om")}>Om oss</a>
          <a href="#/" onClick={till("kontakt")}>Kontakt</a>
        </nav>
        <a className="hs-knapp" href="#/" onClick={till("boka")}>Boka demo</a>
      </header>

      <div className="hs-demoband" role="note">Visningsversion med fiktiva data. Formulär sparas bara i webbläsaren och skickas inte.</div>

      <section id="start" className="hs-hero">
        <div>
          <h1>Verksamhetens data, analys och beslut på ett ställe.</h1>
          <p>ELSA samlar underlag, strukturerar dem med spårbara källor och ger beslutsstöd i varje steg från nuläge till genomförande. ELSA föreslår – ni granskar och beslutar.</p>
          <div className="hs-knapprad">
            <a className="hs-knapp" href="#/" onClick={till("boka")}>Boka demo</a>
            <a className="hs-knapp sekundar" href="#/" onClick={till("elsa", () => p.registreraKlick("se_elsa_start"))}>Se ELSA START</a>
          </div>
          <label className="hs-sok">
            <span>Sök modul eller uppgift</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="T.ex. årsräkning, energi, upphandling" onBlur={() => q && p.registreraKlick("sok")} />
          </label>
          {q.trim() && (
            <ul className="hs-traffar">
              {traffar.map((t) => (
                <li key={t.modul.id}>
                  <strong>{t.modul.namn}</strong> <span>{VERTIKALER.find((v) => v.id === t.modul.vertikal)!.namn}</span> <Statusord id={t.modul.id} />
                  <div>{t.modul.utdata}</div>
                </li>
              ))}
              {!traffar.length && <li>Ingen modul matchar.</li>}
            </ul>
          )}
        </div>
        <div className="hs-dorrar" aria-label="Logga in">
          {(["kund", "esm"] as const).map((d) => (
            <div key={d} className="hs-dorr">
              <h2>{INLOGGNINGSVAGAR[d].rubrik}</h2>
              <p>{INLOGGNINGSVAGAR[d].metod}</p>
              <p className="hs-liten">{INLOGGNINGSVAGAR[d].status}</p>
              <Link className="hs-knapp" to={`/logga-in/${d}`}>Fortsätt till demoinloggning</Link>
            </div>
          ))}
        </div>
      </section>

      <section id="elsa" className="hs-sektion">
        <h2>ELSA START – {MODULER.length} moduler i {VERTIKALER.length} vertikaler</h2>
        <p>Alla moduler nås från ELSA START med rätt behörighet. Status visar vad som finns i dag.</p>
        <div className="hs-vertikaler">
          {VERTIKALER.map((v) => (
            <div key={v.id} className="hs-vertikal">
              <h3>{v.namn}</h3>
              <ul>
                {modulerIVertikal(v.id).map((m) => (
                  <li key={m.id}>
                    {m.namn} <Statusord id={m.id} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="tjanster" className="hs-sektion">
        <h2>Tjänster: samma arbetsmetod i alla vertikaler</h2>
        <p>Kundresan har sex faser och 19 steg. Begrepp, underlag och nyckeltal anpassas till verksamheten.</p>
        <ol className="hs-faser">
          {FASER.map((f) => (
            <li key={f.id}>
              <strong>{f.namn}</strong>
              <span>Steg {f.steg[0]}–{f.steg.at(-1)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="priser" className="hs-sektion hs-tva">
        <div>
          <h2>Priser och demo</h2>
          <ul className="hs-lista">
            {(Object.keys(DEMOTYPER) as Demotyp[]).map((d) => (
              <li key={d}>
                <strong>{DEMOTYPER[d].namn}</strong> – {DEMOTYPER[d].langd}
              </li>
            ))}
          </ul>
          <p><strong>Pris:</strong> Presentationen föreslår abonnemang från 2 900 kr per månad. Priset är ett förslag och inte fastställt.</p>
          <h3>Vanliga frågor</h3>
          <dl className="hs-faq">
            <dt>Vad ingår?</dt>
            <dd>De moduler som anges i offerten och avtalet.</dd>
            <dt>Bindningstid?</dt>
            <dd>Fastställs i avtalet. Demo är kostnadsfri.</dd>
            <dt>Datakvalitet?</dt>
            <dd>ELSA visar källa, datakvalitet och när underlaget uppdaterades. Saknade värden räknas aldrig som noll.</dd>
          </dl>
        </div>
        <form id="boka" className="hs-form" onSubmit={(e) => skicka("demo", p.tavInKontakt({ organisation: demo.organisation, kontakt: { namn: demo.namn, epost: demo.epost }, kalla: "boka_demo", demotyp: demo.demotyp, ...(demo.vertikal ? { vertikal: demo.vertikal } : {}) }), () => setDemo({ ...demo, organisation: "", namn: "", epost: "" }))(e)}>
          <h2>Boka demo</h2>
          <label>Organisation<input required value={demo.organisation} onChange={(e) => setDemo({ ...demo, organisation: e.target.value })} /></label>
          <label>Ditt namn<input required value={demo.namn} onChange={(e) => setDemo({ ...demo, namn: e.target.value })} /></label>
          <label>E-post<input required type="email" value={demo.epost} onChange={(e) => setDemo({ ...demo, epost: e.target.value })} /></label>
          <label>Typ av demo
            <select value={demo.demotyp} onChange={(e) => setDemo({ ...demo, demotyp: e.target.value as Demotyp })}>
              {(Object.keys(DEMOTYPER) as Demotyp[]).map((d) => <option key={d} value={d}>{DEMOTYPER[d].namn}</option>)}
            </select>
          </label>
          <label>Vertikal
            <select value={demo.vertikal} onChange={(e) => setDemo({ ...demo, vertikal: e.target.value })}>
              <option value="">Vet inte än</option>
              {VERTIKALER.map((v) => <option key={v.id} value={v.id}>{v.namn}</option>)}
            </select>
          </label>
          <button className="hs-knapp" type="submit">Boka demo</button>
          {svar.demo && <p role="status" className={svar.demo.ok ? "hs-ok" : "hs-fel"}>{svar.demo.text}</p>}
        </form>
      </section>

      <section id="offert" className="hs-sektion">
        <form className="hs-form bred" onSubmit={(e) => skicka("offert", p.tavInKontakt({ organisation: offert.organisation, orgnr: offert.orgnr, kontakt: { namn: offert.namn, epost: offert.epost }, kalla: "offertforfragan", moduler: offert.moduler }), () => setOffert({ organisation: "", orgnr: "", namn: "", epost: "", moduler: [] }))(e)}>
          <h2>Offertförfrågan</h2>
          <p className="hs-liten">Varukorgen är en offertförfrågan, inte ett köp. Ingen debitering sker. Organisationsuppgifter hämtas inte automatiskt eftersom ingen verifierad källa är ansluten.</p>
          <div className="hs-rad">
            <label>Organisation<input required value={offert.organisation} onChange={(e) => setOffert({ ...offert, organisation: e.target.value })} /></label>
            <label>Organisationsnummer<input required placeholder="NNNNNN-NNNN" value={offert.orgnr} onChange={(e) => setOffert({ ...offert, orgnr: e.target.value })} /></label>
            <label>Namn<input required value={offert.namn} onChange={(e) => setOffert({ ...offert, namn: e.target.value })} /></label>
            <label>E-post<input required type="email" value={offert.epost} onChange={(e) => setOffert({ ...offert, epost: e.target.value })} /></label>
          </div>
          <fieldset>
            <legend>Moduler ({offert.moduler.length} valda)</legend>
            <div className="hs-moduler">
              {MODULER.map((m) => (
                <label key={m.id}>
                  <input type="checkbox" checked={offert.moduler.includes(m.id)} onChange={(e) => setOffert({ ...offert, moduler: e.target.checked ? [...offert.moduler, m.id] : offert.moduler.filter((x) => x !== m.id) })} /> {m.namn}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="hs-knapp" type="submit">Skicka offertförfrågan</button>
          {svar.offert && <p role="status" className={svar.offert.ok ? "hs-ok" : "hs-fel"}>{svar.offert.text}</p>}
        </form>
      </section>

      <section id="referenser" className="hs-sektion">
        <h2>Referenser</h2>
        <p>Vi publicerar bara referenser som är styrkta och godkända av kunden. Inga referenser är publicerade ännu.</p>
      </section>

      <section id="kunskap" className="hs-sektion">
        <h2>Kunskap</h2>
        <ul className="hs-lista">
          <li>ELSA föreslår och strukturerar. Människor granskar och fattar besluten.</li>
          <li>Källbelagda uppgifter skiljs från bedömningar och antaganden.</li>
          <li>Beslutsstöd ersätter inte juridisk bedömning eller myndighetsbeslut.</li>
          <li>Säkerhetskrav (behörighet, kundisolering, tvåstegsverifiering, kryptering, loggning och datahantering inom EU/EES) ska verifieras före lansering.</li>
        </ul>
      </section>

      <section id="om" className="hs-sektion">
        <h2>Om oss</h2>
        <p>ELSA utvecklas av ES Management (ESM).</p>
      </section>

      <section id="kontakt" className="hs-sektion">
        <form className="hs-form" onSubmit={(e) => skicka("kontakt", p.tavInKontakt({ organisation: kontakt.organisation, kontakt: { namn: kontakt.namn, epost: kontakt.epost }, kalla: "kontaktformular", meddelande: kontakt.meddelande }), () => setKontakt({ organisation: "", namn: "", epost: "", meddelande: "" }))(e)}>
          <h2>Kontakt</h2>
          <label>Organisation<input required value={kontakt.organisation} onChange={(e) => setKontakt({ ...kontakt, organisation: e.target.value })} /></label>
          <label>Namn<input required value={kontakt.namn} onChange={(e) => setKontakt({ ...kontakt, namn: e.target.value })} /></label>
          <label>E-post<input required type="email" value={kontakt.epost} onChange={(e) => setKontakt({ ...kontakt, epost: e.target.value })} /></label>
          <label>Meddelande<textarea rows={3} value={kontakt.meddelande} onChange={(e) => setKontakt({ ...kontakt, meddelande: e.target.value })} /></label>
          <button className="hs-knapp" type="submit">Skicka</button>
          {svar.kontakt && <p role="status" className={svar.kontakt.ok ? "hs-ok" : "hs-fel"}>{svar.kontakt.text}</p>}
        </form>
      </section>

      <footer className="hs-fot">ELSA · ES Management · Visningsversion med fiktiva data</footer>
    </div>
  );
}
