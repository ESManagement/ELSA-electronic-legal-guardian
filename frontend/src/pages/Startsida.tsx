// Rollanpassad startsida med samma grundstruktur som ELSA Social: aktiv vy, kritiska notiser, nästa åtgärd,
// notiser och block med det viktigaste för rollen. Ordning och innehåll styrs av rollvyn.
import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { CHECKLISTA, formateraBelopp } from "../../../src/index.js";
import { Kort, Markning, Nyckeltal, Tom } from "../components/ui";
import { ANVANDARE, ARENDETYPNAMN, DELEGATIONER, idag, PERSONER, REGELKORT, STATUSNAMN, UPPDRAG, VALAKTIVITETER, VALLOKALER, VYNAMN } from "../demo";
import { kosignaler, notiserFor, PRIONAMN, Prio, synligaArenden, useStore } from "../store";

export const PRIOMARK: Record<Prio, string> = { P1: "overskriden", P2: "nara", P3: "manuell", P4: "antagande" };

type Post = { titel: string; beskrivning?: string; lank?: string; antal?: ReactNode; prioritet?: Prio; faktorer?: string[] };
type Block = { kod: string; rubrik: string; innehall?: ReactNode; poster?: Post[]; tom?: string };

export function Prioritet({ p }: { p: { prioritet?: Prio; faktorer?: string[] } }) {
  if (!p.prioritet) return null;
  return (
    <span className="sts-prio" title={`${p.prioritet} ${PRIONAMN[p.prioritet]}: ${(p.faktorer ?? []).join(", ")}`}>
      <Markning varde={PRIOMARK[p.prioritet]} text={`${p.prioritet} ${PRIONAMN[p.prioritet]}`} />
    </span>
  );
}

function Rad({ p }: { p: Post }) {
  return (
    <li>
      <span style={{ minWidth: 0 }}>
        {p.lank ? <Link to={p.lank}>{p.titel}</Link> : p.titel}
        {p.beskrivning && <div className="dampad">{p.beskrivning}</div>}
        {!!p.faktorer?.length && <div className="sts-faktorer">Varför: {p.faktorer.join(" · ").toLowerCase()}</div>}
      </span>
      <span className="sts-hoger">
        {p.antal !== undefined && <strong>{p.antal}</strong>}
        <Prioritet p={p} />
      </span>
    </li>
  );
}

export default function Startsida() {
  const { s, jag, vy, setVy, accepteraNotis } = useStore();
  const [visaPrinciper, setVisaPrinciper] = useState(false);
  if (!jag) return null;

  const notiser = notiserFor(jag);
  const okvitterade = notiser.filter((n) => (n.prioritet === "P1" || n.prioritet === "P2") && !s.accepterade[n.id]);
  const arenden = synligaArenden(jag);
  const mina = arenden.filter((a) => a.agare === jag.id && a.status !== "avslutat");
  const signaler = kosignaler().filter((k) => arenden.some((a) => a.id === k.arendeId));
  const punkter = s.granskning.punkter();
  const faststallda = punkter.filter((p) => p.faststalltUtfall).length;
  const avvikelser = s.granskning.avvikelser();
  const oppnaAvv = avvikelser.filter((a) => a.status === "oppen" || a.status === "utreds").length;
  const sam = s.korning.sammanstallning;
  const behov = s.behov.aktiva();

  let nasta: Post | null = null;
  let block: Block[] = [];

  if (vy === "handlaggare") {
    nasta = s.granskning.avslutad
      ? signaler.length
        ? { titel: "Följ upp ärende med kösignal", beskrivning: `${signaler[0]!.arendeId} har legat utan materiell aktivitet.`, lank: `/arenden/${signaler[0]!.arendeId}`, prioritet: "P2" }
        : null
      : {
          titel: "Fortsätt granska årsräkning 2026 för Huvudman A",
          beskrivning: `${faststallda} av ${CHECKLISTA.length} kontrollpunkter fastställda · ${oppnaAvv} avvikelser att hantera · ${sam.ejMedraknadePoster} belopp ej verifierat`,
          lank: "/arenden/AR-SYNT-1",
          prioritet: "P2",
          faktorer: ["Inkom 24 februari", "Avslutsgrind ej passerad"],
        };
    block = [
      {
        kod: "status",
        rubrik: "Läget just nu",
        innehall: (
          <div className="nyckeltalsrad">
            <Nyckeltal etikett="Mina öppna ärenden" varde={mina.length} />
            <Nyckeltal etikett="Kösignaler" varde={signaler.length} undertext="lokala varningsnivåer" />
            <Nyckeltal etikett="Öppna avvikelser" varde={oppnaAvv} undertext="i pågående granskning" />
            <Nyckeltal etikett="Behovsprövningar" varde={behov.length} undertext="förfaller 31 mars" />
          </div>
        ),
      },
      {
        kod: "arenden",
        rubrik: "Mina ärenden",
        poster: mina.map((a) => ({ titel: `${a.titel} · ${PERSONER[a.huvudmanId]}`, beskrivning: `${a.id} · ${ARENDETYPNAMN[a.typ]} · ${STATUSNAMN[a.status]}`, lank: `/arenden/${a.id}` })),
        tom: "Du har inga öppna ärenden.",
      },
      {
        kod: "ko",
        rubrik: "Kösignaler",
        poster: signaler.map((k) => ({
          titel: k.signal === "agarlost" ? `${k.arendeId} saknar ansvarig` : k.signal === "svar_invantas_lange" ? `${k.arendeId}: svar inväntas sedan ${k.dagar} dagar` : `${k.arendeId}: ingen aktivitet på ${k.dagar} dagar`,
          lank: `/arenden/${k.arendeId}`,
          prioritet: k.signal === "agarlost" || ("dagar" in k && k.dagar > 40) ? "P2" : "P3",
          faktorer: ["Problemkort 1"],
        })),
        tom: "Inga ärenden ligger stilla.",
      },
      {
        kod: "behov",
        rubrik: "Årlig behovsprövning",
        poster: behov.map((b) => {
          const u = UPPDRAG.find((x) => x.id === b.uppdragId)!;
          return { titel: `${PERSONER[u.huvudmanId]} · förvaltarskap`, beskrivning: `Prövas skilt från årsräkningen. Förfaller ${b.forfaller}.`, lank: "/behovsprovning", prioritet: "P2" as Prio };
        }),
        tom: "Alla behovsprövningar för året är gjorda.",
      },
    ];
  }

  if (vy === "registrator") {
    const mottagna = arenden.filter((a) => a.status === "mottaget" || a.status === "identitet_oklar");
    nasta = mottagna[0]
      ? { titel: "Verifiera personkoppling för inkommen årsräkning", beskrivning: `${mottagna[0].id} · ${mottagna[0].handling}`, lank: `/arenden/${mottagna[0].id}`, prioritet: "P2", faktorer: ["Ingen koppling på namn"] }
      : null;
    block = [
      { kod: "inkorg", rubrik: "Inkomna handlingar", poster: mottagna.map((a) => ({ titel: a.handling, beskrivning: `${a.id} · mottagen ${a.mottaget.slice(0, 10)}`, lank: `/arenden/${a.id}` })), tom: "Inga handlingar väntar på registrering." },
      { kod: "agarlosa", rubrik: "Ärenden utan ägare", poster: arenden.filter((a) => !a.agare).map((a) => ({ titel: `${a.id} · ${a.titel}`, lank: `/arenden/${a.id}`, prioritet: "P2" as Prio })), tom: "Alla ärenden har en ansvarig." },
    ];
  }

  if (vy === "beslutsfattare") {
    const utkast = arenden.filter((a) => a.status === "beslutsutkast");
    nasta = utkast[0] ? { titel: `Pröva beslutsutkast: ${utkast[0].titel}`, beskrivning: `${utkast[0].id} · ${utkast[0].handling}`, lank: `/arenden/${utkast[0].id}`, prioritet: "P2", faktorer: ["Barn som huvudman"] } : null;
    block = [
      { kod: "beslut", rubrik: "Beslut som väntar", poster: utkast.map((a) => ({ titel: `${a.titel} · ${PERSONER[a.huvudmanId]}`, beskrivning: `${a.id} · ${ARENDETYPNAMN[a.typ]}`, lank: `/arenden/${a.id}` })), tom: "Inga beslutsutkast väntar." },
      {
        kod: "delegation",
        rubrik: "Din delegation",
        poster: DELEGATIONER.filter((d) => d.delegatId === jag.id).map((d) => ({ titel: d.arendetyper.map((t) => ARENDETYPNAMN[t]).join(", "), beskrivning: `${d.beslutsreferens} · gäller från ${d.giltigFran}` })),
        tom: "Du har ingen delegation. Beslut kräver giltig delegation, inte en roll.",
      },
    ];
  }

  if (vy === "processagare") {
    const perStatus = Object.entries(arenden.reduce<Record<string, number>>((acc, a) => ((acc[a.status] = (acc[a.status] ?? 0) + 1), acc), {}));
    const ejVer = REGELKORT.filter((k) => k.verifieringsstatus !== "verifierad").length;
    nasta = { titel: "Boka juridisk granskning av regelkorten", beskrivning: `${ejVer} av ${REGELKORT.length} regelkort är inte verifierade. Pilot kan inte starta förrän de är godkända.`, lank: "/regelkort", prioritet: "P2", faktorer: ["Verifieringsgrind"] };
    block = [
      {
        kod: "status",
        rubrik: "Flöde",
        innehall: (
          <div className="nyckeltalsrad">
            <Nyckeltal etikett="Öppna ärenden" varde={arenden.filter((a) => a.status !== "avslutat").length} />
            <Nyckeltal etikett="Kösignaler" varde={signaler.length} />
            <Nyckeltal etikett="Verifierade regelkort" varde={`${REGELKORT.length - ejVer} av ${REGELKORT.length}`} />
          </div>
        ),
      },
      { kod: "statusar", rubrik: "Ärenden per status", poster: perStatus.map(([st, n]) => ({ titel: STATUSNAMN[st]!, antal: n })) },
      {
        kod: "parametrar",
        rubrik: "Beslutade parametrar",
        poster: [
          { titel: "Tolerans vid avstämning", beskrivning: s.korning.parametrar.toleransMotivering, antal: formateraBelopp(s.korning.parametrar.toleransOre) },
          { titel: "Varning utan materiell aktivitet", beskrivning: "Lokal varningsnivå, inte lagstadgad frist", antal: "30 dagar" },
          { titel: "Varning när svar inväntas", beskrivning: "Lokal varningsnivå", antal: "28 dagar" },
        ],
      },
    ];
  }

  if (vy === "valadministrator") {
    const pagaende = VALAKTIVITETER.filter((a) => a.status !== "klar").sort((a, b) => a.senast.localeCompare(b.senast));
    nasta = pagaende[0] ? { titel: pagaende[0].namn, beskrivning: `Senast ${pagaende[0].senast} · ${pagaende[0].ansvarig}`, lank: "/val", prioritet: "P3" } : null;
    block = [
      {
        kod: "status",
        rubrik: "Inför valet 2029",
        innehall: (
          <div className="nyckeltalsrad">
            <Nyckeltal etikett="Aktiviteter klara" varde={`${VALAKTIVITETER.filter((a) => a.status === "klar").length} av ${VALAKTIVITETER.length}`} />
            <Nyckeltal etikett="Lokaler kontrollerade" varde={`${VALLOKALER.filter((l) => l.tillganglig === "kontrollerad").length} av ${VALLOKALER.length}`} />
          </div>
        ),
      },
      { kod: "aktiviteter", rubrik: "Närmaste aktiviteter", poster: pagaende.slice(0, 4).map((a) => ({ titel: a.namn, beskrivning: `Senast ${a.senast} · ${a.ansvarig}`, lank: "/val" })) },
      {
        kod: "grans",
        rubrik: "Vad ELSA inte gör i valdomänen",
        innehall: <p className="dampad">ELSA prövar inte röster, ändrar inte röstlängden och fastställer inte valresultat. Valdomänen kan inte söka i överförmyndarens ärenden.</p>,
      },
    ];
  }

  if (vy === "systemadministrator") {
    const handelser = s.logg.handelser();
    const antal = (h: string) => handelser.filter((x) => x.handelse === h).length;
    nasta = { titel: "Ta ställning till begäran om tillfällig åtkomst", beskrivning: "Leverantörssupport har begärt läsåtkomst till ett ärende utan ändamål och godkännare.", lank: "/admin", prioritet: "P3" };
    block = [
      {
        kod: "admin",
        rubrik: "Konton och roller",
        innehall: (
          <div className="nyckeltalsrad">
            <Nyckeltal etikett="Aktiva konton" varde={ANVANDARE.length} />
            <Nyckeltal etikett="Domäner" varde="2" undertext="val och överförmyndare, åtskilda" />
          </div>
        ),
      },
      {
        kod: "sakerhet",
        rubrik: "Säkerhetshändelser i loggen",
        poster: [
          { titel: "Inloggningar", antal: antal("inloggning") },
          { titel: "Statusändringar", antal: antal("status_andrad") },
          { titel: "Fastställda kontrollpunkter", antal: antal("kontrollpunkt_faststalld") },
        ],
      },
      { kod: "princip", rubrik: "Din åtkomst", innehall: <p className="dampad">Systemadministratörer ser inte ärendeinnehåll genom sin roll. Läsning kräver tillfällig åtkomst med ändamål, godkännare och sluttid.</p> },
    ];
  }

  return (
    <>
      <div className="sts-huvud">
        <div>
          <span className="dampad">Aktiv vy: </span>
          <strong>{VYNAMN[vy]?.namn}</strong>
          <span className="dampad"> · {VYNAMN[vy]?.beskrivning}</span>
        </div>
        {jag.vyer.length > 1 && (
          <div className="sts-vyval" role="group" aria-label="Välj rollvy">
            {jag.vyer.map((v) => (
              <button key={v} className={`liten ${v === vy ? "primar" : ""}`} aria-pressed={v === vy} onClick={() => setVy(v)}>
                {VYNAMN[v]?.namn}
              </button>
            ))}
          </div>
        )}
      </div>

      {okvitterade
        .filter((n) => n.prioritet === "P1")
        .map((n) => (
          <div key={n.id} className="felruta sts-kritisk">
            <strong>P1 Kritisk: {n.titel}</strong> – ingen har accepterat ansvaret än. <Link to="/notiser">Hantera</Link>
          </div>
        ))}

      <div className="sts-topp">
        <Kort titel="Nästa åtgärd" className="sts-nasta">
          {nasta ? (
            <>
              <div className="sts-nasta-titel">{nasta.lank ? <Link to={nasta.lank}>{nasta.titel}</Link> : nasta.titel}</div>
              {nasta.beskrivning && <p className="dampad">{nasta.beskrivning}</p>}
              <div className="rad-mellan">
                <Prioritet p={nasta} />
                {nasta.lank && (
                  <Link className="sts-knapplank" to={nasta.lank}>
                    Börja här →
                  </Link>
                )}
              </div>
            </>
          ) : (
            <Tom>Inget brådskande just nu.</Tom>
          )}
        </Kort>
        <Kort titel="Notiser">
          <div className="nt-varde">{notiser.length}</div>
          <p className="dampad">{okvitterade.length ? `${okvitterade.length} väntar på att någon accepterar ansvaret.` : "Alla öppna notiser har en ansvarig."}</p>
          {okvitterade[0] && (
            <p>
              <button className="liten" onClick={() => accepteraNotis(okvitterade[0]!.id)}>
                Acceptera: {okvitterade[0].titel}
              </button>
            </p>
          )}
          <Link to="/notiser">Öppna notiscentret →</Link>
        </Kort>
      </div>

      <div className="rutnat-2">
        {block.map((b) => (
          <Kort key={b.kod} titel={b.rubrik} className={`sts-block sts-${b.kod}`}>
            {b.innehall}
            {b.poster && b.poster.length > 0 && (
              <ul className="radlista">
                {b.poster.map((p, i) => (
                  <Rad key={i} p={p} />
                ))}
              </ul>
            )}
            {b.poster && !b.poster.length && b.tom && <Tom>{b.tom}</Tom>}
          </Kort>
        ))}
        <Kort titel="Regler och hjälp">
          <p>
            <Link to="/regelkort">Regelkort och verifieringsstatus</Link> · regelversion {s.korning.parametrar.regelversion}
          </p>
          <p className="dampad">Demodatum {idag()}. Kontroll-id:n som OF-20-05 är interna namn, inte lagrum.</p>
        </Kort>
      </div>

      <p className="dampad">
        ELSA prioriterar efter risk för huvudmannen, frister och hur länge ett ärende har legat utan materiell aktivitet.{" "}
        <button className="lank" onClick={() => setVisaPrinciper(!visaPrinciper)}>
          {visaPrinciper ? "Dölj nivåerna" : "Så prioriterar ELSA"}
        </button>
      </p>
      {visaPrinciper && (
        <ul className="radlista">
          {(Object.keys(PRIONAMN) as Prio[]).map((k) => (
            <li key={k}>
              <span>
                <Markning varde={PRIOMARK[k]} text={`${k} ${PRIONAMN[k]}`} />{" "}
                {
                  {
                    P1: "Risk för direkt skada för huvudmannen eller rättsförlust. Kräver ansvarig samma dag.",
                    P2: "Avslutsgrind, delegation eller årlig prövning som annars missas.",
                    P3: "Ärenden som riskerar att bli liggande enligt lokala varningsnivåer.",
                    P4: "Information utan krav på åtgärd.",
                  }[k]
                }
              </span>
            </li>
          ))}
          <li>
            <span className="dampad">P1 och P2 blir notiser som kräver att någon accepterar ansvaret. Varningsnivåerna är lokala parametrar, inte lagstadgade frister.</span>
          </li>
        </ul>
      )}
    </>
  );
}
