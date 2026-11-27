// Menyn är uppbyggd som i ELSA Social: grupper, behörighetsstyrda länkar och en kort beskrivning per länk.
// Domänerna val och överförmyndare har egna grupper och delar inga ärendelänkar.
// Behörigheter som börjar med "modul:" och "org.admin" prövas mot plattformens åtkomstkontroll.
export type NavGrupp = "ELSA START" | "Min dag" | "Överförmyndare" | "Val" | "Energi" | "E-tjänst" | "Organisation" | "ESM" | "Styrning";
export const GRUPPORDNING: NavGrupp[] = ["ELSA START", "Min dag", "Överförmyndare", "Val", "Energi", "E-tjänst", "Organisation", "ESM", "Styrning"];

export type Lank = { grupp: NavGrupp; till: string; namn: string; behorighet: string[]; beskrivning?: string; ordning?: number };

export const NAVIGATION: Lank[] = [
  { grupp: "ELSA START", till: "/start", namn: "Alla moduler", behorighet: ["plattform", "esm"], beskrivning: "Sök modul eller uppgift, ingång via vertikal", ordning: 0 },
  { grupp: "ELSA START", till: "/projekt", namn: "Projekt och kundresa", behorighet: ["plattform"], beskrivning: "Projekt kopplade till moduler och de 19 metodstegen", ordning: 5 },
  { grupp: "ELSA START", till: "/leverans", namn: "Leveransstatus", behorighet: ["plattform", "esm"], beskrivning: "Status per modul och vertikal, bildregister", ordning: 8 },
  { grupp: "ELSA START", till: "/mognad", namn: "Vägen till drift", behorighet: ["plattform", "esm"], beskrivning: "Åtta steg, tre steg per modul och driftgrinden", ordning: 9 },
  { grupp: "ELSA START", till: "/start/kom-igang", namn: "Så kommer ni igång", behorighet: ["plattform", "esm"], beskrivning: "Demo, produktval, offert och inloggning", ordning: 10 },
  { grupp: "Min dag", till: "/oversikt", namn: "Översikt Val & Överförmyndare", behorighet: ["oversikt"], beskrivning: "Det som väntar på dig i dag", ordning: 0 },
  { grupp: "Min dag", till: "/notiser", namn: "Notiser", behorighet: ["oversikt"], beskrivning: "Signaler som behöver en ansvarig", ordning: 10 },
  { grupp: "Överförmyndare", till: "/arenden", namn: "Ärenden", behorighet: ["of.arende"], beskrivning: "Arbetskö, status och kösignaler", ordning: 10 },
  { grupp: "Överförmyndare", till: "/arenden/AR-SYNT-1", namn: "Granskning av årsräkning", behorighet: ["of.granska"], beskrivning: "Redovisningsmotor, checklista och avslutsgrind", ordning: 20 },
  { grupp: "Överförmyndare", till: "/behovsprovning", namn: "Behovsprövning", behorighet: ["of.arende"], beskrivning: "Årlig prövning av förvaltarskap", ordning: 30 },
  { grupp: "Val", till: "/val", namn: "Valplanering", behorighet: ["val.planera"], beskrivning: "Aktiviteter, lokaler och röstmottagare", ordning: 10 },
  { grupp: "Energi", till: "/energi", namn: "Energitrend", behorighet: ["modul:energi"], beskrivning: "Import, kvalitetskontroll och granskning av mätserie", ordning: 10 },
  { grupp: "E-tjänst", till: "/mina-uppdrag", namn: "Mina uppdrag", behorighet: ["etjanst"], beskrivning: "Dina uppdrag och frågor från överförmyndaren", ordning: 10 },
  { grupp: "Organisation", till: "/organisation", namn: "Användare och roller", behorighet: ["org.admin"], beskrivning: "Bjud in, stäng av, roller, moduler och aktivitetslogg", ordning: 10 },
  { grupp: "ESM", till: "/esm/crm", namn: "CRM och inbjudningar", behorighet: ["esm"], beskrivning: "Lead, demo, offert, avtal och kund i drift", ordning: 10 },
  { grupp: "Styrning", till: "/regelkort", namn: "Regelkort", behorighet: ["regler.las", "of.styra"], beskrivning: "Rättsliga versionskort och verifieringsstatus", ordning: 10 },
  { grupp: "Styrning", till: "/logg", namn: "Granskningslogg", behorighet: ["logg.las"], beskrivning: "Vem gjorde vad och när, med hashkedja", ordning: 20 },
  { grupp: "Styrning", till: "/admin", namn: "Administration Val & Överförmyndare", behorighet: ["admin"], beskrivning: "Konton, roller och tillfällig åtkomst i modulen", ordning: 30 },
];
