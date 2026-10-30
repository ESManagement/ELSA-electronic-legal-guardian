// Fiktiva kommuner, användare, uppdrag och ärenden. Inga verkliga personer.
import type { Anvandare, Arende, Delegation, Regelkort, Roll, Uppdrag } from "../../src/index.js";

/** Demodatum: årsräkningarna för 2026 har kommit in och granskas. */
export const DEMO_START = new Date("2027-03-15T08:30:00");
const laddad = Date.now();
export const klocka = () => new Date(DEMO_START.getTime() + (Date.now() - laddad));
export const idag = () => klocka().toISOString().slice(0, 10);

export type Behorighet =
  | "oversikt"
  | "of.arende"
  | "of.granska"
  | "of.besluta"
  | "of.registrera"
  | "of.styra"
  | "val.planera"
  | "regler.las"
  | "logg.las"
  | "admin"
  | "etjanst";

export type Demoanvandare = {
  id: string;
  namn: string;
  roll: Roll;
  roll_namn: string;
  enhet: string;
  kommun: string;
  behorigheter: Behorighet[];
  /** Rollvyer som användaren kan växla mellan på startsidan. Den första är standard. */
  vyer: string[];
  motor: Anvandare;
};

const roll = (r: Roll, doman: "overformyndare" | "val") => ({ roll: r, doman, giltigFran: "2026-01-01" });

export const ANVANDARE: Demoanvandare[] = [
  {
    id: "anna", namn: "Anna Granskare", roll: "handlaggare", roll_namn: "Handläggare, överförmyndare", enhet: "Överförmyndarenheten", kommun: "Demostad",
    behorigheter: ["oversikt", "of.arende", "of.granska", "regler.las"], vyer: ["handlaggare"],
    motor: { id: "anna", identifieradMedELeg: true, roller: [roll("handlaggare", "overformyndare")] },
  },
  {
    id: "rasmus", namn: "Rasmus Registrator", roll: "registrator", roll_namn: "Registrator", enhet: "Överförmyndarenheten", kommun: "Demostad",
    behorigheter: ["oversikt", "of.arende", "of.registrera"], vyer: ["registrator"],
    motor: { id: "rasmus", identifieradMedELeg: true, roller: [roll("registrator", "overformyndare")] },
  },
  {
    id: "beatrice", namn: "Beatrice Beslut", roll: "beslutsfattare", roll_namn: "Beslutsfattare med delegation", enhet: "Överförmyndarnämnden", kommun: "Demostad",
    behorigheter: ["oversikt", "of.arende", "of.granska", "of.besluta", "regler.las"], vyer: ["beslutsfattare", "handlaggare"],
    motor: { id: "beatrice", identifieradMedELeg: true, roller: [roll("beslutsfattare", "overformyndare")] },
  },
  {
    id: "petra", namn: "Petra Processägare", roll: "processagare", roll_namn: "Processägare, överförmyndare", enhet: "Överförmyndarenheten", kommun: "Demostad",
    behorigheter: ["oversikt", "of.arende", "of.styra", "regler.las", "logg.las"], vyer: ["processagare", "handlaggare"],
    motor: { id: "petra", identifieradMedELeg: true, roller: [roll("processagare", "overformyndare")] },
  },
  {
    id: "valter", namn: "Valter Valsson", roll: "valadministrator", roll_namn: "Valadministratör", enhet: "Valnämndens kansli", kommun: "Demostad",
    behorigheter: ["oversikt", "val.planera", "regler.las"], vyer: ["valadministrator"],
    motor: { id: "valter", identifieradMedELeg: true, roller: [roll("valadministrator", "val")] },
  },
  {
    id: "sigge", namn: "Sigge Systemsson", roll: "systemadministrator", roll_namn: "Systemadministratör", enhet: "IT-förvaltningen", kommun: "Demostad",
    behorigheter: ["oversikt", "admin", "logg.las"], vyer: ["systemadministrator"],
    motor: { id: "sigge", identifieradMedELeg: true, roller: [roll("systemadministrator", "overformyndare"), roll("systemadministrator", "val")] },
  },
  {
    id: "stina", namn: "Stina Ställföreträdare", roll: "stallforetradare", roll_namn: "God man", enhet: "E-tjänsten", kommun: "Demostad",
    behorigheter: ["etjanst"], vyer: ["stallforetradare"],
    motor: {
      id: "stina", identifieradMedELeg: true, roller: [roll("stallforetradare", "overformyndare")],
      egnaUppdrag: [{ uppdragId: "U-1", giltigFran: "2024-05-01" }],
    },
  },
  {
    id: "tove", namn: "Tove Tillfällig", roll: "stallforetradare", roll_namn: "Inloggad med e-legitimation, utan uppdrag", enhet: "E-tjänsten", kommun: "Demostad",
    behorigheter: ["etjanst"], vyer: ["stallforetradare"],
    motor: { id: "tove", identifieradMedELeg: true, roller: [roll("stallforetradare", "overformyndare")] },
  },
];

export const VYNAMN: Record<string, { namn: string; beskrivning: string }> = {
  handlaggare: { namn: "Handläggare", beskrivning: "Dina granskningar, kösignaler och bevakningar" },
  registrator: { namn: "Registrator", beskrivning: "Inkomna handlingar och ärenden utan ägare" },
  beslutsfattare: { namn: "Beslutsfattare", beskrivning: "Beslutsutkast inom din delegation" },
  processagare: { namn: "Processägare", beskrivning: "Flöde, kö och regelkortens status" },
  valadministrator: { namn: "Valadministratör", beskrivning: "Planering inför nästa val" },
  systemadministrator: { namn: "Systemadministratör", beskrivning: "Konton, roller och säkerhetshändelser" },
  stallforetradare: { namn: "Ställföreträdare", beskrivning: "Dina uppdrag och frågor från överförmyndaren" },
};

export const DELEGATIONER: Delegation[] = [
  { delegatId: "beatrice", arendetyper: ["disposition", "redovisningsgranskning", "tillsyn", "arvode"], giltigFran: "2026-01-01", beslutsreferens: "Delegationsordning ÖFN 2026 § 4" },
  { delegatId: "anna", arendetyper: ["redovisningsgranskning"], giltigFran: "2026-01-01", beslutsreferens: "Delegationsordning ÖFN 2026 § 7" },
];

export const UPPDRAG: Uppdrag[] = [
  { id: "U-1", kategori: "godmanskap", huvudmanId: "HM-A", stallforetradareId: "stina", omfattning: ["bevaka rätt", "förvalta egendom", "sörja för person"], giltigFran: "2024-05-01", beslutsreferens: "Tingsrättens beslut 2024 (syntetiskt)" },
  { id: "U-2", kategori: "forvaltarskap", huvudmanId: "HM-B", stallforetradareId: "sf-2", omfattning: ["bevaka rätt", "förvalta egendom"], giltigFran: "2021-09-01", beslutsreferens: "Tingsrättens beslut 2021 (syntetiskt)" },
  { id: "U-3", kategori: "forvaltarskap", huvudmanId: "HM-C", stallforetradareId: "sf-3", omfattning: ["förvalta egendom"], giltigFran: "2019-02-01", beslutsreferens: "Tingsrättens beslut 2019 (syntetiskt)" },
  { id: "U-4", kategori: "formynderskap", huvudmanId: "HM-D", stallforetradareId: "sf-4", omfattning: ["förvalta barnets egendom"], giltigFran: "2023-01-01", beslutsreferens: "Föräldrar som förmyndare" },
  { id: "U-5", kategori: "godmanskap", huvudmanId: "HM-E", stallforetradareId: "sf-5", omfattning: ["bevaka rätt", "förvalta egendom"], giltigFran: "2025-03-01", beslutsreferens: "Tingsrättens beslut 2025 (syntetiskt)" },
];

export const UPPDRAGSNAMN: Record<string, string> = { godmanskap: "Godmanskap", forvaltarskap: "Förvaltarskap", formynderskap: "Förmynderskap", framtidsfullmakt: "Framtidsfullmakt", anhorigbehorighet: "Anhörigbehörighet" };

export const PERSONER: Record<string, string> = {
  "HM-A": "Huvudman A (syntetisk)", "HM-B": "Huvudman B (syntetisk)", "HM-C": "Huvudman C (syntetisk)", "HM-D": "Barn D (syntetiskt)", "HM-E": "Huvudman E (syntetisk)", "HM-F": "Okänd avsändare",
  stina: "Stina Ställföreträdare", "sf-2": "Förvaltare 2 (syntetisk)", "sf-3": "Förvaltare 3 (syntetisk)", "sf-4": "Förmyndare 4 (syntetisk)", "sf-5": "God man 5 (syntetisk)",
  anna: "Anna Granskare", beatrice: "Beatrice Beslut", rasmus: "Rasmus Registrator", petra: "Petra Processägare",
};

export type Arendepost = Arende & { titel: string; handling: string };

export const ARENDETYPNAMN: Record<string, string> = {
  forordnande: "Förordnande", tillsyn: "Tillsyn", redovisningsgranskning: "Granskning av redovisning", disposition: "Samtycke/disposition", arvode: "Arvode", insyn: "Insyn",
};

export const STATUSNAMN: Record<string, string> = {
  mottaget: "Mottaget", identitet_oklar: "Identitet oklar", registrerat: "Registrerat", underlagskontroll_pagar: "Underlagskontroll pågår",
  komplettering_forbereds: "Komplettering förbereds", komplettering_skickad: "Komplettering skickad", svar_invantas: "Svar inväntas",
  sakuppgifter_verifierade: "Sakuppgifter verifierade", rattslig_fraga_oppen: "Rättslig fråga öppen", beslutsutkast: "Beslutsutkast",
  beslutat: "Beslutat", expedierat: "Expedierat", uppfoljning_pagar: "Uppföljning pågår", avslutat: "Avslutat",
};

export function startarenden(): Arendepost[] {
  return [
    { id: "AR-SYNT-1", doman: "overformyndare", typ: "redovisningsgranskning", uppdragId: "U-1", huvudmanId: "HM-A", agare: "anna", status: "underlagskontroll_pagar", mottaget: "2027-02-24T09:12:00", senasteMateriellaAktivitet: "2027-03-12T14:05:00", titel: "Årsräkning 2026", handling: "Årsräkning 2026 med bankbesked (3 sidor + bilaga)" },
    { id: "AR-SYNT-2", doman: "overformyndare", typ: "redovisningsgranskning", uppdragId: "U-2", huvudmanId: "HM-B", agare: "anna", status: "svar_invantas", mottaget: "2027-01-08T10:00:00", senasteMateriellaAktivitet: "2027-01-29T11:00:00", titel: "Årsräkning 2026", handling: "Årsräkning 2026, komplettering begärd 29 januari" },
    { id: "AR-SYNT-3", doman: "overformyndare", typ: "redovisningsgranskning", uppdragId: "U-5", huvudmanId: "HM-E", status: "mottaget", mottaget: "2027-03-01T08:40:00", titel: "Årsräkning 2026", handling: "Inskannad årsräkning, personkopplingen inte verifierad" },
    { id: "AR-SYNT-4", doman: "overformyndare", typ: "disposition", uppdragId: "U-4", huvudmanId: "HM-D", agare: "beatrice", status: "beslutsutkast", mottaget: "2027-02-20T13:30:00", senasteMateriellaAktivitet: "2027-03-11T09:00:00", titel: "Uttag från spärrat konto", handling: "Ansökan om uttag 25 000 kr för glasögon och tandreglering" },
    { id: "AR-SYNT-5", doman: "overformyndare", typ: "tillsyn", uppdragId: "U-3", huvudmanId: "HM-C", agare: "anna", status: "uppfoljning_pagar", mottaget: "2026-11-02T08:00:00", senasteMateriellaAktivitet: "2027-01-10T08:00:00", titel: "Tillsyn av förvaltarskap", handling: "Uppföljning efter klagomål från anhörig" },
    { id: "AR-SYNT-6", doman: "overformyndare", typ: "redovisningsgranskning", uppdragId: "U-2", huvudmanId: "HM-B", agare: "anna", status: "sakuppgifter_verifierade", mottaget: "2026-02-11T08:00:00", senasteMateriellaAktivitet: "2027-03-14T15:20:00", titel: "Årsräkning 2025", handling: "Årsräkning 2025, granskad" },
    { id: "AR-VAL-1", doman: "val", typ: "insyn", uppdragId: "-", huvudmanId: "-", agare: "valter", status: "registrerat", mottaget: "2027-03-02T08:00:00", titel: "Begäran om vallokalslista", handling: "Allmänhandlingsbegäran om vallokaler" },
  ];
}

/** Regelkort för motorns kontroller. Inget är juridiskt verifierat i demon, så regelvalet stoppar. */
export const REGELKORT: Regelkort[] = [
  ["OF-20-03", "Underlagets fullständighet", "Föräldrabalken 14 kap. (att verifiera)"],
  ["OF-20-KONTON", "Konton som omfattas av förvaltningen", "Föräldrabalken 14 kap. (att verifiera)"],
  ["OF-20-PERIOD", "Redovisningsperiod", "Föräldrabalken 14 kap. 15 § (att verifiera)"],
  ["OF-20-INGAENDE", "Ingående balans mot föregående redovisning", "Lokal granskningsrutin (att besluta)"],
  ["OF-20-05", "Kontoavstämning", "Lokal granskningsrutin (att besluta)"],
  ["OF-20-06", "Utgående saldo mot bankbesked", "Lokal granskningsrutin (att besluta)"],
  ["OF-20-DUBBEL", "Möjliga dubbelposter", "Lokal granskningsrutin (att besluta)"],
  ["OF-20-INTERN", "Interna överföringar", "Lokal granskningsrutin (att besluta)"],
  ["OF-20-KATEGORI", "Kategorisering av poster", "Lokal granskningsrutin (att besluta)"],
  ["OF-21-KOPPLING", "Åtgärder som kräver samtycke", "Föräldrabalken 14 kap. 11–14 §§ (att verifiera)"],
  ["OF-20-VARDEN", "Värdering av övriga tillgångar", "Ställföreträdarförordningen (att verifiera)"],
].map(([regelId, beskrivning, forfattning]) => ({
  regelId: regelId!,
  version: "0.1.0",
  forfattning: forfattning!,
  lagrum: "Fylls i vid juridisk granskning",
  kalltyp: forfattning!.startsWith("Lokal") ? "lokal_rutin" : "lag",
  giltigFran: "2026-01-01",
  verifieringsstatus: "ej_verifierad",
  nastaBevakning: "2027-06-30",
  beskrivning: beskrivning!,
}));

export type Valaktivitet = { id: string; namn: string; ansvarig: string; senast: string; status: "klar" | "pagar" | "ej_paborjad"; kalla: string };

export const VALAKTIVITETER: Valaktivitet[] = [
  { id: "V-01", namn: "Fastställ tidplan och ansvarsfördelning för valet 2029", ansvarig: "Valnämnden", senast: "2027-06-15", status: "pagar", kalla: "Valnämndens verksamhetsplan (syntetisk)" },
  { id: "V-02", namn: "Inventera vallokaler och röstningslokaler", ansvarig: "Valter Valsson", senast: "2027-09-30", status: "pagar", kalla: "Lokalregister 2026" },
  { id: "V-03", namn: "Tillgänglighetskontroll av lokaler", ansvarig: "Valter Valsson", senast: "2027-12-15", status: "ej_paborjad", kalla: "Kontrollista tillgänglighet (lokal rutin)" },
  { id: "V-04", namn: "Behovsanalys röstmottagare", ansvarig: "Valnämndens kansli", senast: "2028-03-31", status: "ej_paborjad", kalla: "Utfall val 2026" },
  { id: "V-05", namn: "Utvärdering av val 2026 avslutad", ansvarig: "Valnämnden", senast: "2027-02-28", status: "klar", kalla: "Protokoll VN 2027-02-20 § 3 (syntetiskt)" },
];

export const VALLOKALER = [
  { namn: "Centrumskolan, aula", distrikt: "Demostad Centrum 1", tillganglig: "kontrollerad", kapacitet: 2 },
  { namn: "Biblioteket", distrikt: "Demostad Centrum 2", tillganglig: "brister", kapacitet: 1 },
  { namn: "Norra fritidsgården", distrikt: "Demostad Norra", tillganglig: "ej kontrollerad", kapacitet: 1 },
  { namn: "Medborgarhuset, sal B", distrikt: "Demostad Söder", tillganglig: "kontrollerad", kapacitet: 2 },
];
