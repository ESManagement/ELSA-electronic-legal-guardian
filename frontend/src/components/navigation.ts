// Menyn är uppbyggd som i ELSA Social: grupper, behörighetsstyrda länkar och en kort beskrivning per länk.
// Domänerna val och överförmyndare har egna grupper och delar inga ärendelänkar.
export type NavGrupp = "ELSA START" | "Min dag" | "Överförmyndare" | "Val" | "E-tjänst" | "Styrning";
export const GRUPPORDNING: NavGrupp[] = ["ELSA START", "Min dag", "Överförmyndare", "Val", "E-tjänst", "Styrning"];

export type Lank = { grupp: NavGrupp; till: string; namn: string; behorighet: string[]; beskrivning?: string; ordning?: number };

export const NAVIGATION: Lank[] = [
  { grupp: "ELSA START", till: "/start", namn: "Alla moduler", behorighet: ["oversikt"], beskrivning: "Samlingsmodulen med alla 18 ELSA-moduler", ordning: 0 },
  { grupp: "ELSA START", till: "/start/kom-igang", namn: "Så kommer ni igång", behorighet: ["oversikt"], beskrivning: "Demo, produkt, offert och inloggning via esmanagement.se", ordning: 10 },
  { grupp: "Min dag", till: "/", namn: "Översikt för modulen", behorighet: ["oversikt"], beskrivning: "Det som väntar på dig i dag", ordning: 0 },
  { grupp: "Min dag", till: "/notiser", namn: "Notiser", behorighet: ["oversikt"], beskrivning: "Signaler som behöver en ansvarig", ordning: 10 },
  { grupp: "Överförmyndare", till: "/arenden", namn: "Ärenden", behorighet: ["of.arende"], beskrivning: "Arbetskö, status och kösignaler", ordning: 10 },
  { grupp: "Överförmyndare", till: "/arenden/AR-SYNT-1", namn: "Granskning av årsräkning", behorighet: ["of.granska"], beskrivning: "Redovisningsmotor, checklista och avslutsgrind", ordning: 20 },
  { grupp: "Överförmyndare", till: "/behovsprovning", namn: "Behovsprövning", behorighet: ["of.arende"], beskrivning: "Årlig prövning av förvaltarskap", ordning: 30 },
  { grupp: "Val", till: "/val", namn: "Valplanering", behorighet: ["val.planera"], beskrivning: "Aktiviteter, lokaler och röstmottagare", ordning: 10 },
  { grupp: "E-tjänst", till: "/mina-uppdrag", namn: "Mina uppdrag", behorighet: ["etjanst"], beskrivning: "Dina uppdrag och frågor från överförmyndaren", ordning: 10 },
  { grupp: "Styrning", till: "/regelkort", namn: "Regelkort", behorighet: ["regler.las", "of.styra"], beskrivning: "Rättsliga versionskort och verifieringsstatus", ordning: 10 },
  { grupp: "Styrning", till: "/logg", namn: "Granskningslogg", behorighet: ["logg.las"], beskrivning: "Vem gjorde vad och när, med hashkedja", ordning: 20 },
  { grupp: "Styrning", till: "/admin", namn: "Administration", behorighet: ["admin"], beskrivning: "Konton, roller och tillfällig åtkomst", ordning: 30 },
];
