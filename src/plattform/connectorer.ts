/**
 * Connectorkatalog enligt utvecklingsprompten 2026-11-15, avsnitt 12. Det här är
 * kandidater och bedömningar, inte anslutningar. Ingen post betyder att ELSA är
 * anslutet. "D" = officiell dokumentation har hittats, "U" = kund-/leverantörs-
 * specifik åtkomst och gränssnitt är inte verifierade, "egen" = egen byggsten.
 */
export type Connectorprioritet = 'P1' | 'P2' | 'P3' | 'P2 läsning';
export type Connectorevidens = 'D' | 'U' | 'egen';

export interface Connector {
  id: string;
  namn: string;
  prioritet: Connectorprioritet;
  evidens: Connectorevidens;
  nytta: string;
  villkor: string;
  /** Alltid false i den här versionen: ingen koppling är provad eller aktiverad. */
  ansluten: false;
}

const c = (id: string, namn: string, prioritet: Connectorprioritet, evidens: Connectorevidens, nytta: string, villkor: string): Connector => ({
  id,
  namn,
  prioritet,
  evidens,
  nytta,
  villkor,
  ansluten: false,
});

export const CONNECTORER: readonly Connector[] = Object.freeze([
  c('C01', 'Microsoft Graph', 'P1', 'D', 'Filer, kunskap, e-post, kalender och samarbete', 'Appregistrering och minsta behörighet krävs; licens och resursåtkomst ej verifierade.'),
  c('C02', 'Filimport', 'P1', 'egen', 'CSV/Excel, PDF, Word, bild och ljud efter stödverifiering', 'Ingen automatisk tolkning får bli godkänd fakta.'),
  c('C03', 'Kundradar', 'P1', 'U', 'Kund, projekt, modul, aktivitet och nyttouppföljning', 'API och driftstatus ej verifierade; ingen dubbelriktad synk utan konfliktregler.'),
  c('C04', 'BankID', 'P2', 'D', 'Identifiering och godkänd signering', 'Avtal med bank/återförsäljare krävs. Ger inte i sig modulbehörighet.'),
  c('C05', 'Fortnox', 'P1', 'D', 'Ekonomi, fakturaunderlag och projektutfall', 'Utvecklaråtkomst, scopes och kundaktivering krävs. Läsning först.'),
  c('C06', 'SCB PxWebApi v2', 'P1', 'D', 'Befolkning, ekonomi och jämförbara baslinjer', 'Använd v2. Kontrollera uttagsbegränsningar och villkor.'),
  c('C07', 'Kolada v3', 'P1', 'D', 'Kommunala och regionala nyckeltal', 'Rätt nyckeltalsdefinition, regi och referensår. Reviderade data hanteras.'),
  c('C08', 'Lantmäteriet', 'P2', 'D', 'Fastighetsgeometrier och geografisk kontext', 'Prövningspliktig fastighetsinformation skiljs från öppen kartdata.'),
  c('C09', 'SMHI', 'P1', 'D', 'Väderobservationer och väderrelaterad planering', 'Prognos blandas aldrig med mätt utfall.'),
  c('C10', 'Boverket energi', 'P1', 'D', 'Basuppgifter ur energideklarationer', 'Avtal krävs. Basuppgifter är inte besiktningsunderlag.'),
  c('C11', 'Riksdagens öppna data', 'P2', 'D', 'Dokument och bevakning av beslutsunderlag', 'Ersätter inte kontroll av gällande rätt eller lokala beslut.'),
  c('C12', 'TED Search', 'P1', 'D', 'Publicerade upphandlingsannonser', 'Täcker TED-annonser, inte alla svenska inköp.'),
  c('C13', 'K-samsök', 'P2', 'D', 'Kulturarvsobjekt, platser och material', 'Öppen metadata är inte fri bildlicens.'),
  c('C14', 'Jordbruksverket', 'P2', 'D', 'Jordbruksblock, statistik och växtskydd', 'Licens kontrolleras per dataset.'),
  c('C15', 'Mews Connector API', 'P2', 'D', 'Hotellens verksamhetsdata', 'Partner-/kundåtkomst och kostnader ej verifierade. Undvik gästuppgifter.'),
  c('C16', 'Inera tjänsteplattform', 'P3', 'D', 'Behovsprövat informationsutbyte i vård och omsorg', 'Anslutning och tjänstekontrakt krävs. Inget öppet journal-API.'),
  c('C17', 'Spotify', 'P3', 'D', 'Villkorad konsumentfunktion i Hemklang', 'Offentlig uppspelning i verksamhet är inte tillåten.'),
  c('C18', 'Diarium/ärenden', 'P2', 'U', 'Ärenden, beslut, protokoll och e-tjänster', 'Leverantör, sekretessmodell och arkivregler behöver begäras.'),
  c('C19', 'HR/lön/LMS', 'P2', 'U', 'Anställningsbasdata, kurser och kursstatus', 'Ingen prestationsbedömning eller rankning. Minimera löne- och hälsodata.'),
  c('C20', 'Branschsystem', 'P2', 'U', 'Verksamhetssystem per bransch', 'Separat adapter och kontraktstest per system.'),
  c('C21', 'Sensorer/BMS/SCADA', 'P2 läsning', 'U', 'Mätserier, driftlarm och tillgångsregister', 'Read-only. Styrkommandon avstängda.'),
  c('C22', 'Bank/värdering', 'P3', 'U', 'Godkänd kontodata och marknadsjämförelser', 'Ingen kreditprövning eller betalningsinitiering i grundpiloten.'),
  c('C23', 'Bidragskällor', 'P2', 'U', 'Utlysningar, villkor och datum', 'Separat källa per finansiär. Ingen automatisk ansökan.'),
  c('C24a', 'Boverkets klimatdatabas', 'P2', 'D', 'Byggresursers klimatunderlag', 'Metod, faktorer och licens verifieras före beräkning.'),
  c('C24b', 'BIM/kalkyl/EPD', 'P2', 'U', 'Modeller, mängder, produktdata och EPD', 'Formatversion, rättigheter och sakkunnig kontrolleras.'),
  c('C25', 'Visuellt lager', 'P1', 'egen', 'Designkomponenter, diagram, kartor och bildregister', 'Inte en connector i sig. Bara godkända bilder.'),
  c('C26', 'Leverans/övervakning', 'P1', 'U', 'Källkod, teststatus, release och integrationshälsa', 'Publicering och repoändringar kräver särskilt godkännande.'),
  c('C27', 'Register/organisation', 'P2', 'U', 'Företagsuppgifter, folkbokföring eller valdata när tillåtet', 'Utredningskandidater. Personnummer kräver särskilt ändamål.'),
  c('C28', 'Signering/notiser', 'P2', 'U', 'Avtalsflöde, e-post/sms och kvittens', 'Utskick och signering kräver förhandsgranskning och bekräftelse.'),
  c('C29', 'Smarta hem', 'P3', 'U', 'Enhetsstatus och inneklimat', 'Läsning först. Ingen säkerhetskritisk styrning.'),
]);

/** Gemensam bas för alla moduler (avsnitt 12.1). */
export const GEMENSAM_BAS = ['C01', 'C02', 'C03', 'C25', 'C26'] as const;

export function connector(id: string): Connector | undefined {
  return CONNECTORER.find((x) => x.id === id);
}

/** Skill-specifikationer S01–S16 (avsnitt 14). Specifikationer, inte installerade förmågor. */
export const SKILLS: Readonly<Record<string, string>> = Object.freeze({
  S01: 'Åtkomst och avgränsning',
  S02: 'Inläsning och insamling',
  S03: 'Datakvalitet och mappning',
  S04: 'Källsökning och kunskapsstöd',
  S05: 'Nuläge, mål och GAP',
  S06: 'Kundresa och beslutsgrindar',
  S07: 'Ekonomi och kalkyl',
  S08: 'Geografi och objektmatchning',
  S09: 'Mätserier, energi och väder',
  S10: 'Krav och regelkontroll',
  S11: 'Bidragsmatchning',
  S12: 'Utbildnings- och introduktionsadministration',
  S13: 'Drift och underhåll',
  S14: 'Visuell presentation',
  S15: 'Notis och beslutsutkast',
  S16: 'Leveransbevis och integrationshälsa',
});
