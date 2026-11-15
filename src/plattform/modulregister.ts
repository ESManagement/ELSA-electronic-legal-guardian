/**
 * Gemensamt modulregister. Används av ELSA START, navigering, sökning, behörighet
 * och projektkopplingar. Namn och gruppering följer målbilden i utvecklings-
 * prompten 2026-11-15 (avsnitt 3). Profilerna (indata, utdata, connectorer,
 * skills, grind) följer avsnitt 13.
 *
 * Status är ärlig: en modul är inte klar för att den har ett namn eller ett kort.
 * Implementeringsstatus skiljer på beskriven, implementerad, testad och godkänd.
 */

export type VertikalId = 'kommun' | 'vard' | 'vatten-kultur' | 'fastighet' | 'finans' | 'konsument' | 'manniskor';

export interface Vertikal {
  id: VertikalId;
  namn: string;
  ordning: number;
}

export const VERTIKALER: readonly Vertikal[] = Object.freeze([
  { id: 'kommun', namn: 'Kommun & styrning', ordning: 1 },
  { id: 'vard', namn: 'Vård & omsorg', ordning: 2 },
  { id: 'vatten-kultur', namn: 'Vatten, kultur & fritid', ordning: 3 },
  { id: 'fastighet', namn: 'Fastighet, bygg & energi', ordning: 4 },
  { id: 'finans', namn: 'Finans, juridik & inköp', ordning: 5 },
  { id: 'konsument', namn: 'Konsument & lantbruk', ordning: 6 },
  { id: 'manniskor', namn: 'Människor, hotell & industri', ordning: 7 },
]);

/**
 * beskriven: profil dokumenterad, ingen modulspecifik kod.
 * implementerad: modulspecifik kod finns.
 * testad: automatiska tester för modulens huvudflöde passerar.
 * godkand: verksamheten har godkänt mot avtalade krav (sätts aldrig av koden).
 */
export type Implementeringsstatus = 'beskriven' | 'implementerad' | 'testad' | 'godkand';
/** Leveransstatus enligt avsnitt 8: "Klar" bara när avtalade krav är implementerade, testade och verifierbara. */
export type Leveransstatus = 'klar' | 'delvis_klar' | 'blockerad';
/** lanserad_demo: kan öppnas med fiktiva data. ej_lanserad: syns i katalogen men har ingen egen arbetsyta. */
export type Lansering = 'lanserad_demo' | 'ej_lanserad';

export interface Modul {
  /** Stabil identitet. Ändras aldrig, även om visningsnamnet ändras. */
  id: string;
  /** Exakt visningsnamn enligt målbilden. */
  namn: string;
  vertikal: VertikalId;
  /** Ingång i ELSA. Alla moduler har en modulsida; arbetsytan finns bara för lanserade. */
  ingang: string;
  /** Egen arbetsyta i demon, om modulen har en. */
  arbetsyta?: string;
  implementering: Implementeringsstatus;
  leverans: Leveransstatus;
  lansering: Lansering;
  /** Moduler som presentationen anger som nya förslag (avsnitt 3). */
  nyttForslag: boolean;
  /** Behörighetskrav: modulen måste vara tilldelad organisationen och användaren. */
  behorighet: { kraverModultilldelning: true; klassning: 'intern' | 'konfidentiell' | 'sarskilt_skyddsvard' };
  indata: string;
  utdata: string;
  connectorer: string[];
  skills: string[];
  prioritet: string;
  grind: string;
  /** Sökord för "sök efter uppgift". */
  uppgifter: string[];
  /** Vad som saknas för att modulen ska kunna kallas klar. */
  blockerare: string[];
  /**
   * Repon i ESManagement/ESMELSA vars namn motsvarar modulen (inventering 2026-11-15). Innehåll, ägare och
   * aktuell gren är inte kontrollerade; de är kandidater för återanvändning, inte verifierade målrepon.
   */
  kandidatrepon: string[];
}

/** Sambandet modul → repo enligt namninventeringen 2026-11-15. Endast elsa-electronic-legal-guardian är kontrollerat. */
export const KANDIDATREPON: Readonly<Record<string, string[]>> = Object.freeze({
  'politik-styrning': ['ESManagement/ELSA-governance', 'ESMELSA/politiskt'],
  'val-overformyndare': ['ESManagement/ELSA-electronic-legal-guardian'],
  revision: ['ESManagement/ELSA-political-accountant'],
  tillsyn: ['ESManagement/ELSA-Tillsyn', 'ESMELSA/ELSA-Tillsyn'],
  'municipality-development': ['ESManagement/ELSA-Samhallsbyggnad', 'ESMELSA/ELSA-Samhallsbyggnad-App', 'ESMELSA/elsa-samhallsbyggnad'],
  social: ['ESManagement/ELSA-Social', 'ESMELSA/ELSA-Social'],
  care: ['ESMELSA/ELSA-care'],
  'vatten-avfall': ['ESManagement/ELSA-water-waste'],
  property: ['ESManagement/ELSA-Property', 'ESMELSA/ELSA-Property'],
  'project-management': ['ESManagement/Project-management'],
  power: ['ESManagement/ELSA-Power', 'ESMELSA/ELSA-Power'],
  'bank-finance': ['ESMELSA/ELSA-Bank-Finance'],
  economy: ['ESManagement/ELSA-Economy', 'ESMELSA/ELSA-Economy'],
  procurement: ['ESManagement/ELSA-Procurement', 'ESMELSA/ELSA-Procurement'],
  legal: ['ESManagement/ELSA-Legal', 'ESMELSA/ELSA-Legal'],
  jetleasing: ['ESManagement/ELSA-Jetleasing', 'ESMELSA/ELSA-Jetleasing'],
  learning: ['ESManagement/ELSA-Learning', 'ESMELSA/ELSA-Learning'],
  hemklang: ['ESMELSA/hemklang'],
});

/** Repon som kan vara plattformens, hemsidans eller kundportalens hem. Ej kontrollerade. */
export const PLATTFORMSKANDIDATER = ['ESMELSA/elsa-portal-och-demo', 'ESMELSA/esm-hemsida-react', 'ESMELSA/Kundportal-oop', 'ESMELSA/kundportalnew-oop', 'ESMELSA/mitt-esm'] as const;

const SAKNAS_VERKSAMHET = 'Verksamhetskrav, målgrupp, nyckeltal och acceptanskriterier är inte fastställda';
const SAKNAS_PILOT = 'Pilotkund och verifierad datakälla saknas';

type Profil = Pick<Modul, 'indata' | 'utdata' | 'connectorer' | 'skills' | 'prioritet' | 'grind' | 'uppgifter'>;

function m(
  id: string,
  namn: string,
  vertikal: VertikalId,
  profil: Profil,
  extra: Partial<Pick<Modul, 'nyttForslag' | 'arbetsyta' | 'implementering' | 'leverans' | 'lansering' | 'blockerare'>> & {
    klassning?: Modul['behorighet']['klassning'];
  } = {},
): Modul {
  return {
    id,
    namn,
    vertikal,
    ingang: `/modul/${id}`,
    ...(extra.arbetsyta ? { arbetsyta: extra.arbetsyta } : {}),
    implementering: extra.implementering ?? 'beskriven',
    leverans: extra.leverans ?? 'blockerad',
    lansering: extra.lansering ?? 'ej_lanserad',
    nyttForslag: extra.nyttForslag ?? false,
    behorighet: { kraverModultilldelning: true, klassning: extra.klassning ?? 'intern' },
    ...profil,
    blockerare: [
      ...(extra.blockerare ?? [SAKNAS_VERKSAMHET, SAKNAS_PILOT]),
      ...(KANDIDATREPON[id] && id !== 'val-overformyndare' ? [`Befintlig kod i ${KANDIDATREPON[id]!.join(', ')} är inte inventerad`] : []),
    ],
    kandidatrepon: KANDIDATREPON[id] ?? [],
  };
}

const NY = { nyttForslag: true } as const;

export const MODULER: readonly Modul[] = Object.freeze([
  // Kommun & styrning
  m('politik-styrning', 'Politik & Styrning', 'kommun', {
    indata: 'Kommun, nämnd, mål, period och ärendeurval',
    utdata: 'Källmärkt styrkort och beslutsunderlag',
    connectorer: ['C18', 'C01', 'C06', 'C07', 'C11'], skills: ['S04', 'S05', 'S06', 'S10'],
    prioritet: 'P1: öppna nyckeltal och valda dokument', grind: 'Lokala beslut skiljs från nationella förslag.',
    uppgifter: ['styrkort', 'nämnd', 'fullmäktige', 'beslutsunderlag', 'mål och budget'],
  }),
  m('val-overformyndare', 'Val & Överförmyndare', 'kommun', {
    indata: 'Separata arbetsytor för val respektive överförmyndarärenden, ärende-ID och tidsfrister',
    utdata: 'Bevakning och granskningskö',
    connectorer: ['C27', 'C18', 'C04', 'C28'], skills: ['S01', 'S06', 'S10', 'S15'],
    prioritet: 'P2/P3: register och individdata först efter prövning',
    grind: 'Ingen automatiserad röstpåverkan eller automatiska myndighetsbeslut.',
    uppgifter: ['granska årsräkning', 'årsräkning', 'överförmyndare', 'god man', 'förvaltare', 'behovsprövning', 'valplanering', 'vallokal', 'komplettering'],
  }, {
    arbetsyta: '/oversikt',
    implementering: 'testad',
    leverans: 'delvis_klar',
    lansering: 'lanserad_demo',
    klassning: 'sarskilt_skyddsvard',
    blockerare: [
      'Regelkorten är inte juridiskt verifierade',
      'Pilotkommun saknas; svaren i frågelistan 2026-11-14 är ej verifierade',
      'Valdomänen har bara planeringsstöd',
      'Lagring, verksamhetssystem (C18) och e-legitimation (C04) är inte anslutna',
    ],
  }),
  m('revision', 'Revision', 'kommun', {
    indata: 'Granskningsperiod, kontrollplan och avgränsat urval',
    utdata: 'Avvikelselista med belägg och revisionsspår',
    connectorer: ['C05', 'C18', 'C01', 'C02', 'C03'], skills: ['S03', 'S04', 'S07', 'S10'],
    prioritet: 'P1: avstämning i läsläge', grind: 'En avvikelse är inte ett automatiskt konstaterande av oegentlighet.',
    uppgifter: ['granskning', 'avstämning', 'kontrollplan', 'revisionsspår'],
  }),
  m('tillsyn', 'Tillsyn', 'kommun', {
    indata: 'Tillsynsobjekt, tillsynstyp, checklista och inspektionsdatum',
    utdata: 'Granskat protokoll och uppföljningsuppgifter',
    connectorer: ['C18', 'C08', 'C02', 'C27', 'C20'], skills: ['S02', 'S06', 'S08', 'S10'],
    prioritet: 'P2', grind: 'Sekretess och att rätt objekt matchas; beslut av behörig människa.',
    uppgifter: ['inspektion', 'tillsynsprotokoll', 'checklista'],
  }, { klassning: 'konfidentiell' }),
  m('municipality-development', 'Municipality development', 'kommun', {
    indata: 'Kommunområde, planalternativ, mål och budget',
    utdata: 'Jämförbara utvecklingsscenarier med kartvy',
    connectorer: ['C08', 'C06', 'C07', 'C23', 'C18'], skills: ['S05', 'S08', 'S10', 'S11'],
    prioritet: 'P1: statistik, P2: plan-/ärendesystem', grind: 'Jämförbara geografier och perioder.',
    uppgifter: ['samhällsutveckling', 'scenario', 'planalternativ', 'befolkning'],
  }),
  // Vård & omsorg
  m('social', 'Social', 'vard', {
    indata: 'Verksamhet, period, kapacitet och godkänd aggregerad statistik',
    utdata: 'Behovsbild och verksamhetsplan',
    connectorer: ['C20', 'C07', 'C06', 'C01', 'C28'], skills: ['S03', 'S05', 'S06', 'S10'],
    prioritet: 'P1: inga individdata. P3 för känsliga ärenden', grind: 'Inga automatiska biståndsbeslut.',
    uppgifter: ['socialtjänst', 'behovsbild', 'verksamhetsplan'],
  }, { klassning: 'sarskilt_skyddsvard' }),
  m('care', 'Care', 'vard', {
    indata: 'Enhet, period, aggregerat resursbehov och fastställda kvalitetsmål',
    utdata: 'Kapacitets- och kvalitetsuppföljning',
    connectorer: ['C20', 'C16', 'C07', 'C19', 'C01'], skills: ['S05', 'S10', 'S12', 'S13'],
    prioritet: 'P1 aggregerat, P3 individ-/journaldata', grind: 'Varken medicinska beslut eller prestationsrankning av personal.',
    uppgifter: ['äldreomsorg', 'hemtjänst', 'kapacitet', 'kvalitetsuppföljning'],
  }, { klassning: 'sarskilt_skyddsvard' }),
  // Vatten, kultur & fritid
  m('vatten-avfall', 'Vatten & Avfall', 'vatten-kultur', {
    indata: 'Anläggning, mätpunkter, enheter, provresultat och tidsintervall',
    utdata: 'Avvikelsekö, driftbild och åtgärdsunderlag',
    connectorer: ['C21', 'C08', 'C20', 'C05', 'C09'], skills: ['S07', 'S08', 'S09', 'S13'],
    prioritet: 'P2: läsning', grind: 'Kritiska gränsvärden av sakkunnig, ingen automatisk processstyrning.',
    uppgifter: ['vattenprov', 'driftbild', 'avvikelse', 'avfall'],
  }),
  m('kultur-fritid', 'Kultur & Fritid', 'vatten-kultur', {
    indata: 'Enhet, anonymiserad beläggning, aktiviteter och budget',
    utdata: 'Resursöversikt, tillgänglighets- och verksamhetsuppföljning',
    connectorer: ['C20', 'C07', 'C13', 'C05'], skills: ['S05', 'S07', 'S13', 'S14'],
    prioritet: 'P2', grind: 'Barn- och besökaruppgifter indexeras inte i bred sökning.',
    uppgifter: ['bibliotek', 'fritidsgård', 'beläggning', 'resursöversikt'],
  }),
  m('idrott-bad', 'Idrott och bad', 'vatten-kultur', {
    indata: 'Anläggning, bokningstider, mät-/provvärden och kostnader',
    utdata: 'Drift- och underhållsplan samt varningsutkast',
    connectorer: ['C20', 'C21', 'C05', 'C09'], skills: ['S07', 'S09', 'S13'],
    prioritet: 'P2', grind: 'Larmkedja, kalibrering och mänskligt ansvar; ingen automatisk kemikaliedosering.',
    uppgifter: ['badhus', 'idrottshall', 'underhållsplan'],
  }, NY),
  m('kulturarv', 'Kulturarv', 'vatten-kultur', {
    indata: 'Objekt, plats, skyddsuppgifter, skick och bildrättigheter',
    utdata: 'Bevarande- och åtgärdsunderlag med källor',
    connectorer: ['C13', 'C08', 'C02', 'C23', 'C24b'], skills: ['S02', 'S08', 'S10', 'S11', 'S14'],
    prioritet: 'P2', grind: 'Objektidentitet och aktuella skyddsbeslut granskas, bildlicens per objekt.',
    uppgifter: ['bevarande', 'kulturhistoria', 'byggnadsminne'],
  }, NY),
  // Fastighet, bygg & energi
  m('property', 'Property', 'fastighet', {
    indata: 'Fastighets-ID, byggnader, areabegrepp, avtal och period',
    utdata: 'Fastighetskort, underhållsplan och åtgärdsprioritering',
    connectorer: ['C08', 'C10', 'C21', 'C05', 'C20'], skills: ['S05', 'S07', 'S08', 'S09', 'S13'],
    prioritet: 'P1 dataimport/energi, P2 övrigt', grind: 'Säkra fastighetsmatchningar och jämförbara areor.',
    uppgifter: ['fastighet', 'fastighetskort', 'underhållsplan', 'fastighetsutveckling'],
  }),
  m('project-management', 'Project management', 'fastighet', {
    indata: 'Projekt-ID, omfattning, budget, milstolpar, beroenden och godkännare',
    utdata: 'Tidplan, beslutslogg och prognos',
    connectorer: ['C03', 'C01', 'C05', 'C18', 'C28'], skills: ['S05', 'S06', 'S07', 'S15'],
    prioritet: 'P1', grind: 'Ändringsbeslut och överlämning är uttryckliga.',
    uppgifter: ['projekt', 'tidplan', 'milstolpe', 'beslutslogg', 'kundresa'],
  }),
  m('projektering', 'Projektering', 'fastighet', {
    indata: 'Modellversion, geometri, laster, material, mängder, enheter och metodversion',
    utdata: 'Reproducerbar kalkyl och granskningsprotokoll',
    connectorer: ['C24b', 'C24a', 'C01', 'C20'], skills: ['S03', 'S05', 'S07', 'S10'],
    prioritet: 'P2', grind: 'Sakkunnig signerar; ingen AI-genererad säkerhetskritisk dimensionering.',
    uppgifter: ['kalkyl', 'BIM', 'mängder'],
  }, NY),
  m('brf', 'BRF', 'fastighet', {
    indata: 'Förening, byggnader, budget, underhållsåtgärder och beslut',
    utdata: 'Ekonomisk långtidsbild och beslutsunderlag',
    connectorer: ['C20', 'C05', 'C10', 'C02', 'C28'], skills: ['S05', 'S06', 'S07', 'S09'],
    prioritet: 'P1: dokument/energi; P2 medlemskoppling', grind: 'Skydda medlems- och betalningsuppgifter.',
    uppgifter: ['bostadsrättsförening', 'styrelse', 'underhållsplan', 'årsavgift'],
  }, NY),
  m('energi', 'Energi', 'fastighet', {
    indata: 'Anläggning, mätserie, tidszon, energibärare, väder, tariff och baslinje',
    utdata: 'Energiuppföljning och testbara åtgärdsscenarier',
    connectorer: ['C21', 'C09', 'C10', 'C05', 'C20'], skills: ['S03', 'S05', 'S07', 'S09'],
    prioritet: 'P1 basdata, P2 mätkoppling', grind: 'Skilj kWh från kW, pris från tariff och prognos från faktisk besparing.',
    uppgifter: ['energitrend', 'kWh', 'energiuppföljning', 'mätserie', 'granska energitrend'],
  }, {
    ...NY,
    arbetsyta: '/energi',
    implementering: 'testad',
    leverans: 'delvis_klar',
    lansering: 'lanserad_demo',
    blockerare: [
      'Bara pilotfallet i avsnitt 15.2 är byggt: månadsvis CSV-import, kvalitetskontroll och trend',
      'Baslinje och normaliseringsmetod är inte godkända, så ingen besparing räknas',
      'Mätkoppling (C21), väder (C09) och energibasdata (C10) är inte anslutna',
      SAKNAS_PILOT,
    ],
  }),
  m('power', 'Power', 'fastighet', {
    indata: 'Tillgång, kapacitet, mätserie, prisområde och driftbegränsningar',
    utdata: 'Drift- och underhållsscenarier',
    connectorer: ['C21', 'C20', 'C09', 'C05'], skills: ['S05', 'S07', 'S09', 'S13'],
    prioritet: 'P2/P3', grind: 'Fastställ modulens gräns mot Energi; ingen handel eller fysisk styrning.',
    uppgifter: ['kraft', 'elproduktion', 'driftscenario'],
  }, { blockerare: ['Gränsen mot modulen Energi är inte fastställd', SAKNAS_VERKSAMHET, SAKNAS_PILOT] }),
  m('hallbarhet', 'Hållbarhet', 'fastighet', {
    indata: 'Organisations-/projektgräns, period, aktivitet, enhet, faktor och faktorkälla',
    utdata: 'Spårbar klimat-/resurssammanställning',
    connectorer: ['C24a', 'C24b', 'C21', 'C05', 'C02'], skills: ['S03', 'S05', 'S07', 'S10'],
    prioritet: 'P2', grind: 'Metod och systemgräns godkänns; inga ogrundade klimatlöften.',
    uppgifter: ['klimat', 'klimatkalkyl', 'EPD', 'hållbarhetsrapport'],
  }, NY),
  // Finans, juridik & inköp
  m('bank-finance', 'Bank & Finance', 'finans', {
    indata: 'Organisation, period, godkända finansiella uppgifter och scenarioantaganden',
    utdata: 'Likviditets-/finansieringsunderlag med belägg',
    connectorer: ['C22', 'C05', 'C27', 'C02', 'C28'], skills: ['S03', 'S05', 'S07', 'S10'],
    prioritet: 'P2/P3', grind: 'Ingen betalning, kreditvärdering av personer eller finansiell transaktion.',
    uppgifter: ['likviditet', 'finansiering', 'lån'],
  }, { klassning: 'konfidentiell' }),
  m('economy', 'Economy', 'finans', {
    indata: 'Bolag, kontoplan, period, projekt, budget och utfall',
    utdata: 'Avstämd uppföljning och prognos',
    connectorer: ['C05', 'C02', 'C03', 'C01', 'C20'], skills: ['S03', 'S05', 'S07'],
    prioritet: 'P1 för läsning', grind: 'Rätt konto, valuta, moms, period och källsystem; ingen automatisk bokföring.',
    uppgifter: ['budget', 'utfall', 'prognos', 'ekonomi'],
  }, { klassning: 'konfidentiell' }),
  m('procurement', 'Procurement', 'finans', {
    indata: 'Behov, kravmatris, CPV/geografi, datum och avtals-ID',
    utdata: 'Bevakning, underlagskontroll och avtalsuppföljning',
    connectorer: ['C12', 'C20', 'C27', 'C05', 'C28'], skills: ['S04', 'S06', 'S07', 'S10'],
    prioritet: 'P1 TED, P2 kundsystem', grind: 'Anbudssekretess och inga automatiska tilldelningsbeslut.',
    uppgifter: ['upphandling', 'LOU', 'anbud', 'avtalsuppföljning'],
  }, { klassning: 'konfidentiell' }),
  m('legal', 'Legal', 'finans', {
    indata: 'Jurisdiktion, rättsfråga, relevant datum, dokument och uppdragets gräns',
    utdata: 'Källbelagt granskningsutkast och frågelista',
    connectorer: ['C11', 'C01', 'C18', 'C28', 'C27'], skills: ['S04', 'S06', 'S10'],
    prioritet: 'P2', grind: 'Kontroll av gällande lydelse, ikraftträdande och juridisk granskning.',
    uppgifter: ['juridik', 'avtal', 'rättsfråga'],
  }, { klassning: 'konfidentiell' }),
  m('jetleasing', 'Jetleasing', 'finans', {
    indata: 'Tillgångs-ID, avtal, underhållsstatus, nyttjande och period',
    utdata: 'Leasing- och underhållsöversikt',
    connectorer: ['C20', 'C02', 'C05', 'C22'], skills: ['S03', 'S05', 'S07', 'S13'],
    prioritet: 'P2/P3', grind: 'Luftvärdighet och underhåll avgörs av behöriga sakkunniga.',
    uppgifter: ['flygplan', 'leasing'],
  }),
  m('elsa-bidrag', 'ELSA Bidrag', 'finans', {
    indata: 'Sökande, organisationsform, projekt, kostnader, geografi, mål och datum',
    utdata: 'Belagd matchning, gaplista och ansökningsutkast',
    connectorer: ['C23', 'C27', 'C28', 'C05', 'C01'], skills: ['S04', 'S07', 'S10', 'S11'],
    prioritet: 'P2', grind: 'Officiell utlysning, stödvillkor och rätt ansökningstid; inga löften om beviljande.',
    uppgifter: ['bidrag', 'stöd', 'ansökan', 'sök bidrag'],
  }),
  // Konsument & lantbruk
  m('hemvist', 'Hemvist', 'konsument', {
    indata: 'Fastighet/tomt, hushållets mål, projekt, budget och tidsram',
    utdata: 'Husbyggar-/åtgärdsplan och offertjämförelse',
    connectorer: ['C08', 'C10', 'C20', 'C04', 'C01'], skills: ['S05', 'S06', 'S07', 'S08'],
    prioritet: 'P2', grind: 'Verifiera leverantörsuppgifter och exponera inte bostads-/persondata.',
    uppgifter: ['husbygge', 'offertjämförelse', 'villa'],
  }),
  m('hemklang', 'Hemklang', 'konsument', {
    indata: 'Rum, mått, valda bilder, budget, preferenser och tillåtna enheter',
    utdata: 'Inredningsförslag, genomförandeplan och statusvy',
    connectorer: ['C29', 'C17', 'C01', 'C28', 'C21'], skills: ['S05', 'S13', 'S14'],
    prioritet: 'P1 bild-/planflöde, P3 musik och styrning', grind: 'Inga säkerhetskritiska kommandon eller otillåten offentlig musik.',
    uppgifter: ['inredning', 'smarta hem'],
  }),
  m('bovarde', 'Bovärde', 'konsument', {
    indata: 'Bostad, skick, åtgärdsalternativ, budget och finansieringsantaganden',
    utdata: 'Prioriterad renoveringsplan med osäkerheter',
    connectorer: ['C08', 'C22', 'C10', 'C02'], skills: ['S05', 'S07', 'S08', 'S09'],
    prioritet: 'P2', grind: 'Värdering och lånelöfte är inte garanterade utfall.',
    uppgifter: ['renovering', 'bostadsvärde'],
  }),
  m('elsa-lantbruk', 'ELSA Lantbruk', 'konsument', {
    indata: 'Gård, skiften, grödor, säsong, mätdata, insatser och kostnader',
    utdata: 'Säsongsplan och uppföljning med relevanta stödkrav',
    connectorer: ['C14', 'C09', 'C08', 'C21', 'C05'], skills: ['S05', 'S07', 'S08', 'S09', 'S11'],
    prioritet: 'P2', grind: 'Plats-/säsongsmatchning, datalicens och sakkunnigkontroll av odlingsråd.',
    uppgifter: ['gård', 'skifte', 'säsongsplan'],
  }),
  // Människor, hotell & industri
  m('learning', 'Learning', 'manniskor', {
    indata: 'Utbildningsmål, rollbehov, kurser, giltighetstider och behörigt kursdeltagande',
    utdata: 'Kursplan, källhänvisad handledning och intygsbevakning',
    connectorer: ['C19', 'C01', 'C20', 'C28'], skills: ['S04', 'S06', 'S12', 'S15'],
    prioritet: 'P2', grind: 'Ingen prestationsrankning, ingen automatisk examination.',
    uppgifter: ['utbildning', 'kurs', 'intyg'],
  }),
  m('hr-people', 'HR & People Development', 'manniskor', {
    indata: 'Godkänt onboardingärende, anställningsbasdata, roll och utbildningsbehov',
    utdata: 'Administrativ introduktionsplan och behöriga uppgifter',
    connectorer: ['C19', 'C20', 'C01'], skills: ['S01', 'S06', 'S12', 'S15'],
    prioritet: 'P2/P3', grind: 'Inga prestationsomdömen, kandidatpoäng eller automatiska anställningsbeslut.',
    uppgifter: ['onboarding', 'introduktion', 'personal'],
  }, { klassning: 'konfidentiell' }),
  m('hotell', 'Hotell', 'manniskor', {
    indata: 'Anläggning, anonymiserad beläggning, rumsstatus, renoveringsetapper och kostnader',
    utdata: 'Samordnad drift-/renoveringsplan',
    connectorer: ['C15', 'C20', 'C21', 'C05', 'C01'], skills: ['S05', 'S07', 'S09', 'S13'],
    prioritet: 'P2', grind: 'Utan gästidentiteter, betalningskort och låsstyrning.',
    uppgifter: ['hotell', 'beläggning', 'renoveringsplan'],
  }, NY),
  m('industri', 'Industri', 'manniskor', {
    indata: 'Anläggning, tillgång, aggregerad produktion, planerade stopp och energi',
    utdata: 'Underhålls- och effektiviseringsscenarier',
    connectorer: ['C20', 'C21', 'C05', 'C24b'], skills: ['S05', 'S07', 'S09', 'S13'],
    prioritet: 'P2/P3', grind: 'Endast läsning från driftmiljö, ingen produktionsstyrning.',
    uppgifter: ['produktion', 'underhåll', 'effektivisering'],
  }, NY),
]);

export function hamtaModul(id: string): Modul | undefined {
  return MODULER.find((x) => x.id === id);
}

export function vertikal(id: VertikalId): Vertikal {
  const v = VERTIKALER.find((x) => x.id === id);
  if (!v) throw new Error(`Okänd vertikal ${id}`);
  return v;
}

export function modulerIVertikal(id: VertikalId): Modul[] {
  return MODULER.filter((x) => x.vertikal === id);
}

const normalisera = (s: string) => s.toLocaleLowerCase('sv-SE').normalize('NFC').trim();

export interface Soktraff {
  modul: Modul;
  /** Var träffen finns: namn, vertikal, uppgift eller profil. */
  traff: 'namn' | 'vertikal' | 'uppgift' | 'profil';
  text: string;
}

/**
 * Sök efter modul eller uppgift. Namnträffar rangordnas först, sedan vertikal,
 * uppgift och profiltext. Sökningen visar moduler, aldrig moduldata, så den kan
 * användas även för moduler som användaren saknar åtkomst till.
 */
export function sokModuler(fraga: string): Soktraff[] {
  const q = normalisera(fraga);
  if (!q) return [];
  const ut: Soktraff[] = [];
  for (const mod of MODULER) {
    const vn = vertikal(mod.vertikal).namn;
    if (normalisera(mod.namn).includes(q)) ut.push({ modul: mod, traff: 'namn', text: mod.namn });
    else if (normalisera(vn).includes(q)) ut.push({ modul: mod, traff: 'vertikal', text: vn });
    else {
      const u = mod.uppgifter.find((x) => normalisera(x).includes(q));
      if (u) ut.push({ modul: mod, traff: 'uppgift', text: u });
      else if (normalisera(`${mod.indata} ${mod.utdata}`).includes(q)) ut.push({ modul: mod, traff: 'profil', text: mod.utdata });
    }
  }
  const rang = { namn: 0, vertikal: 1, uppgift: 2, profil: 3 };
  return ut.sort((a, b) => rang[a.traff] - rang[b.traff]);
}

/** Kontroll av registrets integritet. Används i test och vid start. */
export function kontrolleraRegister(): string[] {
  const fel: string[] = [];
  const ids = new Set<string>();
  const namn = new Set<string>();
  for (const mod of MODULER) {
    if (ids.has(mod.id)) fel.push(`Dubblett-id ${mod.id}`);
    if (namn.has(mod.namn)) fel.push(`Dubblettnamn ${mod.namn}`);
    ids.add(mod.id);
    namn.add(mod.namn);
    if (!VERTIKALER.some((v) => v.id === mod.vertikal)) fel.push(`${mod.id}: okänd vertikal`);
    if (mod.leverans === 'klar' && mod.implementering !== 'godkand') fel.push(`${mod.id}: kallas klar utan godkännande`);
    if (mod.leverans === 'klar' && mod.blockerare.length) fel.push(`${mod.id}: kallas klar med blockerare`);
    if (mod.lansering === 'lanserad_demo' && !mod.arbetsyta) fel.push(`${mod.id}: lanserad utan arbetsyta`);
    if (mod.implementering !== 'beskriven' && !mod.arbetsyta) fel.push(`${mod.id}: implementerad utan arbetsyta`);
  }
  for (const v of VERTIKALER) if (!modulerIVertikal(v.id).length) fel.push(`Vertikal ${v.namn} saknar moduler`);
  return fel;
}
