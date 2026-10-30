// Visningsversionens tillstånd. Domänlogiken körs i webbläsaren med samma motor som backend-koden i ../src,
// så reglerna (avslutsgrind, delegation, behörighet, hashkedja) är desamma. Inget sparas när sidan laddas om.
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import {
  bevakaKo,
  Behovsbevakningar,
  Granskning,
  Granskningslogg,
  Kompletteringsbegaran,
  korKontroller,
  provaAtkomst,
  provaOvergang,
  Regelregister,
  STANDARDPARAMETRAR,
  type Aktor,
  type Arendestatus,
  type Kosignal,
  type Motorkorning,
  type Redovisning,
} from "../../src/index.js";
import { exempelArsrakning } from "../../src/exempeldata.js";
import { ANVANDARE, Arendepost, DELEGATIONER, Demoanvandare, idag, klocka, REGELKORT, startarenden, UPPDRAG } from "./demo";

export type Prio = "P1" | "P2" | "P3" | "P4";
export const PRIONAMN: Record<Prio, string> = { P1: "Kritisk", P2: "Hög", P3: "Normal", P4: "Låg" };
export type Notis = { id: string; titel: string; beskrivning: string; prioritet: Prio; lank: string; faktorer: string[] };

type Tillstand = {
  logg: Granskningslogg;
  arenden: Arendepost[];
  redovisning: Redovisning;
  korning: Motorkorning;
  granskning: Granskning;
  komplettering: Kompletteringsbegaran | null;
  behov: Behovsbevakningar;
  regler: Regelregister;
  accepterade: Record<string, string>;
};

function skapa(): Tillstand {
  const logg = new Granskningslogg(klocka);
  const redovisning = exempelArsrakning();
  const korning = korKontroller(redovisning, STANDARDPARAMETRAR, klocka());
  const granskning = new Granskning("AR-SYNT-1", redovisning.id, "Granskningsrutin (syntetisk) 2027-01", logg, klocka);
  granskning.foreslaFranMotor(korning);
  const behov = new Behovsbevakningar(logg, klocka);
  behov.skapaArliga(UPPDRAG, 2027, "2027-03-31");
  return { logg, arenden: startarenden(), redovisning, korning, granskning, komplettering: null, behov, regler: new Regelregister(REGELKORT), accepterade: {} };
}

const S: Tillstand = skapa();

export const aktor = (anv: Demoanvandare): Aktor => ({ id: anv.id, typ: "manniska" });

/** För ett ärende genom statuskedjan. Varje steg prövas mot motorns tillåtna övergångar. */
export function flytta(a: Arendepost, kedja: Arendestatus[], anv: Demoanvandare, extra: { expedieringId?: string; expedieringshandelseId?: string } = {}) {
  let fran = a.status;
  for (const till of kedja) {
    const r = provaOvergang(fran, till, {
      aktor: aktor(anv),
      arendetyp: a.typ,
      datum: idag(),
      delegationer: DELEGATIONER,
      granskningAvslutad: a.id === "AR-SYNT-1" ? S.granskning.avslutad : undefined,
      ...extra,
    });
    if (!r.ok) throw new Error(r.skal);
    fran = till;
  }
  const fore = a.status;
  a.status = fran;
  a.senasteMateriellaAktivitet = klocka().toISOString();
  S.logg.registrera(aktor(anv), "status_andrad", a.id, { fran: fore, till: fran });
}

export function kosignaler(): Kosignal[] {
  return bevakaKo(S.arenden, klocka(), { dagarUtanMateriellAktivitet: 30, dagarSvarInvantas: 28 });
}

/** Notiser per roll. P1 och P2 kräver att någon accepterar ansvaret. */
export function notiserFor(anv: Demoanvandare): Notis[] {
  const ut: Notis[] = [];
  const of = anv.behorigheter.includes("of.arende");
  if (of) {
    for (const k of kosignaler()) {
      const a = S.arenden.find((x) => x.id === k.arendeId)!;
      if (a.doman !== "overformyndare") continue;
      if (k.signal === "agarlost")
        ut.push({ id: `ko-${a.id}-agare`, titel: `${a.titel} saknar ansvarig handläggare`, beskrivning: `${a.id} · ${a.handling}`, prioritet: "P2", lank: `/arenden/${a.id}`, faktorer: ["Ingen ägare", "Problemkort 1"] });
      else
        ut.push({
          id: `ko-${a.id}-${k.signal}`,
          titel: k.signal === "svar_invantas_lange" ? `Svar har inte kommit på ${k.dagar} dagar` : `Ingen materiell aktivitet på ${k.dagar} dagar`,
          beskrivning: `${a.id} · ${a.titel}`,
          prioritet: k.dagar > 40 ? "P2" : "P3",
          lank: `/arenden/${a.id}`,
          faktorer: ["Lokal varningsnivå, inte lagstadgad frist", `${k.dagar} dagar`],
        });
    }
    for (const b of S.behov.forfallna("2027-03-31"))
      ut.push({ id: `bb-${b.id}`, titel: `Årlig behovsprövning förfaller ${b.forfaller}`, beskrivning: `Uppdrag ${b.uppdragId}. Prövas skilt från årsräkningen.`, prioritet: "P2", lank: "/behovsprovning", faktorer: ["Ö-04", "Ö-23"] });
    const oppna = S.granskning.avvikelser().filter((a) => a.status === "oppen");
    if (oppna.length && anv.behorigheter.includes("of.granska"))
      ut.push({ id: "gr-avvikelser", titel: `${oppna.length} öppna avvikelser i årsräkning 2026`, beskrivning: "AR-SYNT-1 · Avvikelser blockerar avslut tills de hanteras", prioritet: "P3", lank: "/arenden/AR-SYNT-1?flik=avvikelser", faktorer: ["Avslutsgrind"] });
    const utkast = S.arenden.filter((a) => a.status === "beslutsutkast");
    if (anv.behorigheter.includes("of.besluta"))
      for (const a of utkast) ut.push({ id: `beslut-${a.id}`, titel: `Beslutsutkast väntar: ${a.titel}`, beskrivning: `${a.id} · ${a.handling}`, prioritet: "P2", lank: `/arenden/${a.id}`, faktorer: ["Huvudman är barn", "Kräver delegation"] });
  }
  if (anv.behorigheter.includes("regler.las") || anv.behorigheter.includes("of.styra")) {
    const ejVerifierade = REGELKORT.filter((k) => k.verifieringsstatus !== "verifierad").length;
    ut.push({ id: "regler-ej-verifierade", titel: `${ejVerifierade} regelkort är inte juridiskt verifierade`, beskrivning: "Motorn ger förslag men regelvalet stoppar tills jurist godkänt korten.", prioritet: anv.behorigheter.includes("of.styra") ? "P2" : "P4", lank: "/regelkort", faktorer: ["Verifieringsgrind före pilot"] });
  }
  if (anv.behorigheter.includes("val.planera"))
    ut.push({ id: "val-v02", titel: "Lokalinventeringen ska vara klar 30 september", beskrivning: "2 av 4 lokaler har kontrollerad tillgänglighet", prioritet: "P3", lank: "/val", faktorer: ["Planeringsfrist"] });
  if (anv.behorigheter.includes("admin"))
    ut.push({ id: "admin-tillfallig", titel: "Begäran om tillfällig åtkomst saknar godkännande", beskrivning: "Leverantörssupport vill felsöka AR-SYNT-3. Ändamål och godkännare krävs.", prioritet: "P3", lank: "/admin", faktorer: ["T-03"] });
  const ordning = { P1: 0, P2: 1, P3: 2, P4: 3 };
  return ut.sort((a, b) => ordning[a.prioritet] - ordning[b.prioritet]);
}

export function synligaArenden(anv: Demoanvandare) {
  return S.arenden.filter((a) => provaAtkomst(anv.motor, a, "las", klocka()).tillats);
}

type Ctx = {
  s: Tillstand;
  version: number;
  uppdatera: () => void;
  jag: Demoanvandare | null;
  loggaIn: (id: string) => void;
  loggaUt: () => void;
  har: (b: string) => boolean;
  vy: string;
  setVy: (v: string) => void;
  accepteraNotis: (id: string) => void;
};

const Kontext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [jag, setJag] = useState<Demoanvandare | null>(null);
  const [vy, setVy] = useState("");
  const varde = useMemo<Ctx>(
    () => ({
      s: S,
      version,
      uppdatera: () => setVersion((v) => v + 1),
      jag,
      loggaIn: (id) => {
        const a = ANVANDARE.find((x) => x.id === id) ?? null;
        setJag(a);
        setVy(a?.vyer[0] ?? "");
        if (a) S.logg.registrera(aktor(a), "inloggning", a.id, { roll: a.roll });
      },
      loggaUt: () => setJag(null),
      har: (b) => !!jag?.behorigheter.includes(b as any),
      vy,
      setVy,
      accepteraNotis: (id) => {
        if (!jag) return;
        S.accepterade[id] = jag.namn;
        S.logg.registrera(aktor(jag), "notis_accepterad", id);
        setVersion((v) => v + 1);
      },
    }),
    [version, jag, vy],
  );
  return <Kontext.Provider value={varde}>{children}</Kontext.Provider>;
}

export function useStore() {
  const c = useContext(Kontext);
  if (!c) throw new Error("StoreProvider saknas");
  return c;
}
