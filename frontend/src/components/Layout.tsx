import { ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ANVANDARE } from "../demo";
import { useStore } from "../store";
import { GRUPPORDNING, Lank, NAVIGATION, NavGrupp } from "./navigation";

const STANGDA_NYCKEL = "elsa_vo_meny_stangd";
function lasStangda(): NavGrupp[] {
  try {
    return JSON.parse(localStorage.getItem(STANGDA_NYCKEL) ?? "[]");
  } catch {
    return [];
  }
}

function Anvandarbyte() {
  const { jag, loggaIn } = useStore();
  const navigera = useNavigate();
  if (!jag) return null;
  const kommuner = [...new Set(ANVANDARE.map((a) => a.kommun))];
  return (
    <label className="anvandarbyte">
      <span className="falt-etikett">Byt exempelanvändare</span>
      <select
        value={jag.id}
        onChange={(e) => {
          loggaIn(e.target.value);
          navigera("/");
        }}
      >
        {kommuner.map((k) => (
          <optgroup key={k} label={k}>
            {ANVANDARE.filter((a) => a.kommun === k).map((a) => (
              <option key={a.id} value={a.id}>
                {a.namn} – {a.roll_namn}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { jag, har, loggaUt } = useStore();
  const plats = useLocation();
  const [sok, setSok] = useState("");
  const [stangda, setStangda] = useState<NavGrupp[]>(lasStangda);
  const [oppenMeny, setOppenMeny] = useState(false);

  useEffect(() => setOppenMeny(false), [plats.pathname]);

  const grupper = useMemo(() => {
    if (!jag) return [];
    const synlig = (l: Lank) => l.behorighet.some(har);
    const q = sok.trim().toLowerCase();
    const alla = NAVIGATION.filter(synlig).filter((l) => !q || `${l.namn} ${l.beskrivning ?? ""} ${l.grupp}`.toLowerCase().includes(q));
    return GRUPPORDNING.map((g) => ({
      grupp: g,
      lankar: alla.filter((l) => l.grupp === g).sort((a, b) => (a.ordning ?? 50) - (b.ordning ?? 50)),
    })).filter((g) => g.lankar.length);
  }, [jag, sok, har]);

  if (!jag) return null;

  const vaxla = (g: NavGrupp) => {
    const nya = stangda.includes(g) ? stangda.filter((x) => x !== g) : [...stangda, g];
    setStangda(nya);
    try {
      localStorage.setItem(STANGDA_NYCKEL, JSON.stringify(nya));
    } catch {
      /* inget sparat */
    }
  };
  const aktuellGrupp = grupper.find((g) => g.lankar.some((l) => (l.till === "/" ? plats.pathname === "/" : plats.pathname.startsWith(l.till))))?.grupp;
  const doman = har("val.planera") ? "Valnämnd" : har("of.arende") ? "Överförmyndare" : har("etjanst") ? "E-tjänst för ställföreträdare" : "Förvaltning av systemet";

  return (
    <div className="ram">
      <aside className={`sidomeny${oppenMeny ? " oppen" : ""}`}>
        <div className="rad-mellan">
          <div className="logga">
            <span className="logga-markor">ELSA</span> Val &amp; Överförmyndare
          </div>
          <button className="lank menyknapp" onClick={() => setOppenMeny(!oppenMeny)} aria-expanded={oppenMeny}>
            {oppenMeny ? "Stäng" : "Meny"}
          </button>
        </div>
        <div className="kommunnamn">{jag.kommun} · {doman}</div>
        <div className="menyinnehall">
          <input className="menysok" type="search" placeholder="Sök funktion …" value={sok} onChange={(e) => setSok(e.target.value)} aria-label="Sök i menyn" />
          <nav>
            {grupper.map((g) => {
              const stangd = !sok && stangda.includes(g.grupp) && g.grupp !== aktuellGrupp;
              return (
                <div key={g.grupp} className="navgrupp">
                  <button className="navrubrik" onClick={() => vaxla(g.grupp)} aria-expanded={!stangd}>
                    <span>{g.grupp}</span>
                    <span aria-hidden>{stangd ? "+" : "–"}</span>
                  </button>
                  {!stangd &&
                    g.lankar.map((l) => (
                      <NavLink key={l.till} to={l.till} end title={l.beskrivning}>
                        {l.namn}
                      </NavLink>
                    ))}
                </div>
              );
            })}
            {!grupper.length && <div className="dampad">Ingen funktion matchar.</div>}
          </nav>
          <div className="anvandarruta">
            <div className="anv-namn">{jag.namn}</div>
            <div className="anv-roll">
              {jag.roll_namn} · {jag.enhet}
            </div>
            <Anvandarbyte />
            <button className="lank" onClick={loggaUt}>
              Logga ut
            </button>
          </div>
        </div>
      </aside>
      <main className="innehall">
        {jag.roll === "stallforetradare" ? (
          <div className="principrad" role="note">
            <strong>Du använder Demostads e-tjänst för ställföreträdare.</strong> Överförmyndaren granskar och beslutar. Du ser bara dina egna uppdrag.
          </div>
        ) : (
          <div className="principrad" role="note">
            <strong>ELSA föreslår och strukturerar.</strong> Du verifierar, bedömer och beslutar.
            <span className="zoninfo">Val och överförmyndare hålls åtskilda · Regelkort: ej juridiskt verifierade</span>
          </div>
        )}
        <div className="varnruta" role="note">
          Visningsversion med fiktiva data och demodatum 15 mars 2027. Du kan byta exempelanvändare i menyn. Ingenting sparas när du laddar om sidan.
        </div>
        {children}
        <footer className="sidfot">Demoversion med syntetiska data. Inga riktiga personuppgifter får matas in.</footer>
      </main>
    </div>
  );
}
