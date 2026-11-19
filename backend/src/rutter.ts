/**
 * Föreslaget API, som tabell. Varje rad är en stubbe som kastar EjImplementerat.
 *
 * Tabellen är ett förslag till Simon, inte ett beslut: ramverk (Express, Fastify, Azure
 * Functions m.fl.), URL-mönster och om det blir REST eller något annat är öppna frågor.
 * Kolumnen `karna` pekar ut den befintliga domänfunktionen i ../src som anropet ska gå
 * igenom, så att reglerna (behörighet, avslutsgrind, hashkedja) bara finns på ett ställe.
 *
 * Avsnitten B-01 till B-20 beskrivs i docs/backend.md.
 */
import { ejImplementerat } from './ej-implementerat.js';

export type Metod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Vem som får anropa. Den detaljerade prövningen görs alltid i domänlogiken, inte här. */
export type Atkomstniva =
  | 'publik'
  | 'inloggad'
  | 'plattform:las'
  | 'plattform:andra'
  | 'plattform:administrera'
  | 'esm'
  | 'arende:las'
  | 'arende:andra'
  | 'arende:beslut'
  | 'system';

export interface Rutt {
  metod: Metod;
  sokvag: string;
  /** Avsnitt i docs/backend.md. */
  avsnitt: `B-${string}`;
  beskrivning: string;
  atkomst: Atkomstniva;
  /** Befintlig domänfunktion som anropet ska använda, eller "saknas" om den inte finns. */
  karna: string;
  /** Krav-id i PM eller kravmatris. */
  krav: string[];
  /** true om funktionen finns i PR #4 och inte på main än. */
  pr4?: boolean;
}

export const RUTTER: readonly Rutt[] = Object.freeze([
  // B-01 Inloggning och session
  { metod: 'GET', sokvag: '/api/auth/:metod/start', avsnitt: 'B-01', beskrivning: 'Påbörja inloggning (jobbkonto, kundkatalog, inbjudan, e-legitimation)', atkomst: 'publik', karna: 'Identitetstjanst.paborja', krav: ['G-18'] },
  { metod: 'GET', sokvag: '/api/auth/callback', avsnitt: 'B-01', beskrivning: 'Ta emot svar från identitetstjänsten, skapa session', atkomst: 'publik', karna: 'Identitetstjanst.slutfor', krav: ['G-18'] },
  { metod: 'POST', sokvag: '/api/auth/logout', avsnitt: 'B-01', beskrivning: 'Logga ut', atkomst: 'inloggad', karna: 'Sessionslager.avsluta', krav: [] },
  { metod: 'GET', sokvag: '/api/me', avsnitt: 'B-01', beskrivning: 'Inloggad användare, organisationer, roller och moduler', atkomst: 'inloggad', karna: 'Plattform.minaOrganisationer', krav: ['G-19'] },

  // B-03 Organisation, medlemmar och inbjudningar
  { metod: 'GET', sokvag: '/api/org/:orgId/medlemmar', avsnitt: 'B-03', beskrivning: 'Lista medlemmar', atkomst: 'plattform:administrera', karna: 'Plattform.listaMedlemmar', krav: ['G-19'] },
  { metod: 'PUT', sokvag: '/api/org/:orgId/medlemmar/:anvId/roll', avsnitt: 'B-03', beskrivning: 'Sätt roll', atkomst: 'plattform:administrera', karna: 'Plattform.sattRoll', krav: ['G-19'] },
  { metod: 'PUT', sokvag: '/api/org/:orgId/medlemmar/:anvId/moduler', avsnitt: 'B-03', beskrivning: 'Tilldela moduler', atkomst: 'plattform:administrera', karna: 'Plattform.tilldelaModuler', krav: ['G-19'] },
  { metod: 'PUT', sokvag: '/api/org/:orgId/medlemmar/:anvId/aktiv', avsnitt: 'B-03', beskrivning: 'Stäng av eller aktivera konto', atkomst: 'plattform:administrera', karna: 'Plattform.stangAv', krav: ['G-19'] },
  { metod: 'POST', sokvag: '/api/org/:orgId/inbjudningar', avsnitt: 'B-03', beskrivning: 'Skapa inbjudningsutkast', atkomst: 'plattform:administrera', karna: 'Plattform.bjudIn', krav: [] },
  { metod: 'GET', sokvag: '/api/inbjudningar', avsnitt: 'B-03', beskrivning: 'Lista inbjudningar', atkomst: 'plattform:administrera', karna: 'Plattform.listaInbjudningar', krav: [] },
  { metod: 'POST', sokvag: '/api/inbjudningar/:id/godkann', avsnitt: 'B-03', beskrivning: 'Godkänn och skicka inbjudan', atkomst: 'esm', karna: 'Plattform.godkannInbjudan + Utskickstjanst.skicka', krav: [] },
  { metod: 'POST', sokvag: '/api/inbjudningar/:id/acceptera', avsnitt: 'B-03', beskrivning: 'Acceptera inbjudan efter inloggning', atkomst: 'inloggad', karna: 'Plattform.accepteraInbjudan', krav: [] },
  { metod: 'GET', sokvag: '/api/org/:orgId/aktivitetslogg', avsnitt: 'B-03', beskrivning: 'Organisationens aktivitetslogg', atkomst: 'plattform:administrera', karna: 'Plattform.aktivitetslogg', krav: ['S-01'] },

  // B-04 Projekt och kundresa
  { metod: 'GET', sokvag: '/api/org/:orgId/projekt', avsnitt: 'B-04', beskrivning: 'Lista projekt, valfritt per modul', atkomst: 'plattform:las', karna: 'Plattform.listaProjekt', krav: ['G-07'] },
  { metod: 'POST', sokvag: '/api/org/:orgId/projekt', avsnitt: 'B-04', beskrivning: 'Skapa projekt', atkomst: 'plattform:andra', karna: 'Plattform.skapaProjekt', krav: ['G-07'] },
  { metod: 'GET', sokvag: '/api/projekt/:id', avsnitt: 'B-04', beskrivning: 'Hämta projekt', atkomst: 'plattform:las', karna: 'Plattform.hamtaProjekt', krav: ['G-07'] },
  { metod: 'POST', sokvag: '/api/projekt/:id/moduler', avsnitt: 'B-04', beskrivning: 'Koppla modul till projekt', atkomst: 'plattform:andra', karna: 'Plattform.kopplaModul', krav: ['G-07'] },
  { metod: 'GET', sokvag: '/api/projekt/:id/kundresa', avsnitt: 'B-04', beskrivning: 'Läs kundresan (19 steg)', atkomst: 'plattform:las', karna: 'Plattform.lasKundresa', krav: ['G-09', 'G-12'] },
  { metod: 'POST', sokvag: '/api/projekt/:id/kundresa/atgard', avsnitt: 'B-04', beskrivning: 'Ändra kundresan (starta, avsluta, godkänn steg 11 m.m.)', atkomst: 'plattform:andra', karna: 'Plattform.andraKundresa', krav: ['G-10', 'G-11', 'G-13'] },

  // B-05 Modulregister och ELSA START
  { metod: 'GET', sokvag: '/api/moduler', avsnitt: 'B-05', beskrivning: 'Modulregister med låsmarkering för inloggad användare', atkomst: 'publik', karna: 'modulregister + Plattform.modulatkomst', krav: ['G-02', 'G-06'] },

  // B-06 CRM och kontakt från hemsidan
  { metod: 'POST', sokvag: '/api/kontakt', avsnitt: 'B-06', beskrivning: 'Kontaktformulär, Boka demo, offertförfrågan', atkomst: 'publik', karna: 'Plattform.tavInKontakt', krav: ['G-17'] },
  { metod: 'POST', sokvag: '/api/klick', avsnitt: 'B-06', beskrivning: 'Registrera klick på hemsidan (anonymt)', atkomst: 'publik', karna: 'Plattform.registreraKlick', krav: [] },
  { metod: 'GET', sokvag: '/api/crm/leads', avsnitt: 'B-06', beskrivning: 'Lista leads', atkomst: 'esm', karna: 'Plattform.listaLeads', krav: [] },
  { metod: 'PATCH', sokvag: '/api/crm/leads/:id', avsnitt: 'B-06', beskrivning: 'Uppdatera ansvarig och nästa steg', atkomst: 'esm', karna: 'Plattform.uppdateraLead', krav: [] },
  { metod: 'POST', sokvag: '/api/crm/leads/:id/flytta', avsnitt: 'B-06', beskrivning: 'Flytta lead i CRM-flödet', atkomst: 'esm', karna: 'Plattform.flyttaLead', krav: [] },
  { metod: 'GET', sokvag: '/api/crm/klick', avsnitt: 'B-06', beskrivning: 'Klickstatistik', atkomst: 'esm', karna: 'Plattform.klickstatistik', krav: [] },

  // B-07 Överförmyndare: ärenden, mottagning, status, köbevakning
  { metod: 'GET', sokvag: '/api/of/arenden', avsnitt: 'B-07', beskrivning: 'Sök ärenden, träffar filtreras per behörighet', atkomst: 'arende:las', karna: 'filtreraSoktraffar', krav: ['T-03', 'Ö-01', 'A-02'] },
  { metod: 'GET', sokvag: '/api/of/arenden/:id', avsnitt: 'B-07', beskrivning: 'Hämta ärende', atkomst: 'arende:las', karna: 'provaAtkomst', krav: ['T-03'] },
  { metod: 'POST', sokvag: '/api/of/mottagning', avsnitt: 'B-07', beskrivning: 'Registrera inkommen handling och föreslå personkoppling', atkomst: 'arende:andra', karna: 'foreslaKoppling', krav: ['Ö-10', 'A-01'] },
  { metod: 'POST', sokvag: '/api/of/arenden/:id/status', avsnitt: 'B-07', beskrivning: 'För ärendet till ny status', atkomst: 'arende:andra', karna: 'provaOvergang + harBeslutsratt', krav: ['T-02', 'G-02'] },
  { metod: 'GET', sokvag: '/api/of/kobevakning', avsnitt: 'B-07', beskrivning: 'Ägarlösa och liggande ärenden', atkomst: 'arende:las', karna: 'bevakaKo', krav: ['Problemkort 1'] },

  // B-08 Överförmyndare: redovisning, motor och granskning
  { metod: 'POST', sokvag: '/api/of/arenden/:id/redovisning', avsnitt: 'B-08', beskrivning: 'Spara eller uppdatera redovisningens uppgifter', atkomst: 'arende:andra', karna: 'Redovisning (typ)', krav: ['T-01', 'Ö-20'] },
  { metod: 'POST', sokvag: '/api/of/arenden/:id/motorkorning', avsnitt: 'B-08', beskrivning: 'Kör redovisningsmotorn', atkomst: 'arende:andra', karna: 'korKontroller', krav: ['Ö-20', 'Ö-14'] },
  { metod: 'GET', sokvag: '/api/of/arenden/:id/granskning', avsnitt: 'B-08', beskrivning: 'Checklista, avvikelser och avslutshinder', atkomst: 'arende:las', karna: 'Granskning.punkter / avvikelser / avslutshinder', krav: ['Ö-20'] },
  { metod: 'POST', sokvag: '/api/of/arenden/:id/granskning/punkter/:punktId', avsnitt: 'B-08', beskrivning: 'Fastställ kontrollpunkt', atkomst: 'arende:andra', karna: 'Granskning.faststall', krav: ['D-04'] },
  { metod: 'POST', sokvag: '/api/of/arenden/:id/granskning/avvikelser/:avvId', avsnitt: 'B-08', beskrivning: 'Hantera avvikelse', atkomst: 'arende:andra', karna: 'Granskning.hanteraAvvikelse', krav: ['Ö-20'] },
  { metod: 'POST', sokvag: '/api/of/arenden/:id/granskning/avsluta', avsnitt: 'B-08', beskrivning: 'Avsluta granskning (avslutsgrind)', atkomst: 'arende:beslut', karna: 'Granskning.avsluta', krav: ['Ö-20', 'JO 5473-2024'] },

  // B-09 Komplettering och expediering
  { metod: 'POST', sokvag: '/api/of/arenden/:id/komplettering', avsnitt: 'B-09', beskrivning: 'Skapa utkast till kompletteringsbegäran från avvikelser', atkomst: 'arende:andra', karna: 'Kompletteringsbegaran.skapaUtkast', krav: ['Ö-15'] },
  { metod: 'PATCH', sokvag: '/api/of/arenden/:id/komplettering/fragor/:fragaId', avsnitt: 'B-09', beskrivning: 'Redigera, stryk eller godkänn fråga', atkomst: 'arende:andra', karna: 'Kompletteringsbegaran.redigera / stryk / godkann', krav: ['Ö-15', 'P-01'] },
  { metod: 'POST', sokvag: '/api/of/arenden/:id/komplettering/expediera', avsnitt: 'B-09', beskrivning: 'Skicka godkänd begäran och registrera expediering', atkomst: 'arende:andra', karna: 'Kompletteringsbegaran.registreraExpediering + Utskickstjanst.skicka', krav: ['G-03'] },
  { metod: 'POST', sokvag: '/api/of/arenden/:id/komplettering/fragor/:fragaId/svar', avsnitt: 'B-09', beskrivning: 'Registrera och bedöm svar', atkomst: 'arende:andra', karna: 'Kompletteringsbegaran.registreraSvar', krav: ['Ö-15'] },

  // B-10 Behovsbevakning
  { metod: 'GET', sokvag: '/api/of/behovsbevakning', avsnitt: 'B-10', beskrivning: 'Aktiva och förfallna behovsgranskningar', atkomst: 'arende:las', karna: 'Behovsbevakningar.aktiva / forfallna', krav: ['Ö-04', 'Ö-23'] },
  { metod: 'POST', sokvag: '/api/of/behovsbevakning/:id/kvittera', avsnitt: 'B-10', beskrivning: 'Kvittera behovsgranskning med bedömning', atkomst: 'arende:andra', karna: 'Behovsbevakningar.kvittera', krav: ['Ö-04', 'A-09'] },

  // B-11 Regelkort
  { metod: 'GET', sokvag: '/api/regelkort', avsnitt: 'B-11', beskrivning: 'Gällande regelkort per datum', atkomst: 'inloggad', karna: 'Regelregister.valj', krav: ['A-04'] },
  { metod: 'POST', sokvag: '/api/regelkort', avsnitt: 'B-11', beskrivning: 'Lägg till ny regelversion (jurist)', atkomst: 'esm', karna: 'Regelregister.lagg', krav: ['A-04'] },

  // B-12 Granskningslogg
  { metod: 'GET', sokvag: '/api/logg', avsnitt: 'B-12', beskrivning: 'Läs logg per objekt', atkomst: 'arende:las', karna: 'Granskningslogg.handelser', krav: ['S-01'] },
  { metod: 'GET', sokvag: '/api/logg/export', avsnitt: 'B-12', beskrivning: 'Exportera logg med hashkedja för revision', atkomst: 'esm', karna: 'Granskningslogg.handelser + verifieraKedja', krav: ['S-01'] },

  // B-13 Notiser och Nästa åtgärd
  { metod: 'GET', sokvag: '/api/notiser', avsnitt: 'B-13', beskrivning: 'Notiser och Nästa åtgärd för inloggad roll', atkomst: 'inloggad', karna: 'saknas (räknas i frontend/src/store.tsx i dag)', krav: [] },

  // B-14 Val
  { metod: 'GET', sokvag: '/api/val/planering', avsnitt: 'B-14', beskrivning: 'Valplanering (i dag statisk sida)', atkomst: 'inloggad', karna: 'saknas', krav: ['V-01'] },

  // B-15 Energi
  { metod: 'POST', sokvag: '/api/energi/import', avsnitt: 'B-15', beskrivning: 'Importera CSV med mätvärden', atkomst: 'plattform:andra', karna: 'lasEnergiCsv', krav: [] },
  { metod: 'POST', sokvag: '/api/energi/trender/:id/granska', avsnitt: 'B-15', beskrivning: 'Mänsklig granskning av trend', atkomst: 'plattform:andra', karna: 'granskaTrend', krav: [] },

  // B-16 Dokumentmottagning (PR #4)
  { metod: 'POST', sokvag: '/api/dokument', avsnitt: 'B-16', beskrivning: 'Ta emot en eller flera filer, kvittens per fil', atkomst: 'plattform:andra', karna: 'Dokumentmottagning.taEmot', krav: ['K-01'], pr4: true },
  { metod: 'GET', sokvag: '/api/org/:orgId/dokument', avsnitt: 'B-16', beskrivning: 'Lista dokument', atkomst: 'plattform:las', karna: 'Dokumentmottagning.lista', krav: [], pr4: true },
  { metod: 'GET', sokvag: '/api/dokument/:id', avsnitt: 'B-16', beskrivning: 'Hämta metadata', atkomst: 'plattform:las', karna: 'Dokumentmottagning.hamta', krav: [], pr4: true },
  { metod: 'GET', sokvag: '/api/dokument/:id/original', avsnitt: 'B-16', beskrivning: 'Ladda ner originalet', atkomst: 'plattform:las', karna: 'Dokumentmottagning.oppnaOriginal', krav: [], pr4: true },
  { metod: 'PATCH', sokvag: '/api/dokument/:id', avsnitt: 'B-16', beskrivning: 'Komplettera metadata, bekräfta förslag', atkomst: 'plattform:andra', karna: 'Dokumentmottagning.komplettera', krav: [], pr4: true },
  { metod: 'POST', sokvag: '/api/dokument/:id/godkann', avsnitt: 'B-16', beskrivning: 'Godkänn för analys', atkomst: 'plattform:andra', karna: 'Dokumentmottagning.godkannForAnalys', krav: [], pr4: true },
  { metod: 'POST', sokvag: '/api/dokument/:id/komplettering', avsnitt: 'B-16', beskrivning: 'Begär komplettering', atkomst: 'plattform:andra', karna: 'Dokumentmottagning.begarKomplettering', krav: [], pr4: true },

  // B-17 Rapportregister (PR #4)
  { metod: 'GET', sokvag: '/api/org/:orgId/rapporter', avsnitt: 'B-17', beskrivning: 'Sök rapporter', atkomst: 'plattform:las', karna: 'Rapportregister.sok', krav: [], pr4: true },
  { metod: 'GET', sokvag: '/api/rapporter/:id', avsnitt: 'B-17', beskrivning: 'Hämta rapport med versioner', atkomst: 'plattform:las', karna: 'Rapportregister.hamta', krav: [], pr4: true },
  { metod: 'PUT', sokvag: '/api/rapporter/:id', avsnitt: 'B-17', beskrivning: 'Ändra rapport (ny version)', atkomst: 'plattform:andra', karna: 'Rapportregister.andra', krav: [], pr4: true },
  { metod: 'POST', sokvag: '/api/rapporter/:id/granskning', avsnitt: 'B-17', beskrivning: 'Skicka till granskning, granska block', atkomst: 'plattform:andra', karna: 'Rapportregister.skickaTillGranskning / granskaBlock', krav: [], pr4: true },
  { metod: 'GET', sokvag: '/api/org/:orgId/rapportarenden', avsnitt: 'B-17', beskrivning: 'Lista rapportärenden', atkomst: 'plattform:las', karna: 'Rapportregister.listaArenden', krav: [], pr4: true },
  { metod: 'POST', sokvag: '/api/rapportarenden/:id/diarium', avsnitt: 'B-17', beskrivning: 'Begär extern diarieregistrering', atkomst: 'plattform:andra', karna: 'Rapportregister.begarExternRegistrering + Diariekoppling', krav: [], pr4: true },
  { metod: 'POST', sokvag: '/api/rapportarenden/:id/diarium/svar', avsnitt: 'B-17', beskrivning: 'Ta emot diarienummer från diariet', atkomst: 'system', karna: 'Rapportregister.aterlasDiarienummer', krav: [], pr4: true },

  // B-18 Fullmakter och datainsamling (PR #4, bara modell)
  { metod: 'GET', sokvag: '/api/org/:orgId/fullmakter', avsnitt: 'B-18', beskrivning: 'Lista fullmakter och utgång', atkomst: 'plattform:las', karna: 'fullmaktslage / bevakaUtgang', krav: [], pr4: true },
  { metod: 'POST', sokvag: '/api/hamtningar', avsnitt: 'B-18', beskrivning: 'Pröva och starta hämtning från extern källa', atkomst: 'plattform:andra', karna: 'provaHamtning', krav: [], pr4: true },
] satisfies Rutt[]);

/** Stubbe för en rutt. Ramverket som väljs anropar denna tills riktig hantering finns. */
export function stubbe(rutt: Rutt): never {
  return ejImplementerat(rutt.avsnitt, `${rutt.metod} ${rutt.sokvag}`);
}
