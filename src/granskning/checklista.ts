import type { KONTROLLER } from '../engine/kontroller.js';

/**
 * Praktisk granskningschecklista för Ö-20 (PM:ets tabell, en rad per kontrollpunkt).
 * `motorkontroller` anger vilka motorkontroller som ger förslag till punkten.
 * Punkter utan motorkontroll kräver alltid helt mänsklig bedömning.
 */
export interface Kontrollpunkt {
  id: string;
  rubrik: string;
  praktiskKontroll: string;
  dokumentationskrav: string;
  motorkontroller: (typeof KONTROLLER)[keyof typeof KONTROLLER]['id'][];
  /** Får inte sättas till "ej_tillamplig" och kräver skriftlig bedömning. */
  materiell?: boolean;
}

export const RIMLIGHETSPUNKT = 'CP-18';
export const BERATTELSEPUNKT = 'CP-15';

export const CHECKLISTA: readonly Kontrollpunkt[] = [
  {
    id: 'CP-01',
    rubrik: 'Identitet och rätt ärende',
    praktiskKontroll: 'Kontrollera att redovisning och bilagor avser rätt huvudman och ställföreträdare. Koppla inte handlingar enbart efter namn.',
    dokumentationskrav: 'Verifieringsunderlag, dokumentreferenser och hur eventuell identitetsoklarhet lösts.',
    motorkontroller: [],
  },
  {
    id: 'CP-02',
    rubrik: 'Uppdrag och handlingstyp',
    praktiskKontroll: 'Verifiera uppdragets omfattning och vilka redovisningshandlingar som behövs. Skilj årsräkning, årsberättelse och slutredovisning.',
    dokumentationskrav: 'Hänvisning till aktuellt förordnande och regel- eller rutinversion; avgränsning.',
    motorkontroller: [],
  },
  {
    id: 'CP-03',
    rubrik: 'Period och ansvarsskiften',
    praktiskKontroll: 'Kontrollera periodens början och slut, byte av ställföreträdare och ändrat uppdrag.',
    dokumentationskrav: 'Verifierade datum, beslutskällor och hantering av delperioder.',
    motorkontroller: ['K-PERIOD'],
  },
  {
    id: 'CP-04',
    rubrik: 'Läsbarhet och fullständighet',
    praktiskKontroll: 'Kontrollera samtliga sidor och förtecknade bilagor. Skilj saknad handling från oläslig handling och uppgift som inte behövs.',
    dokumentationskrav: 'Mottagna handlingar, saknade sidor och oläsliga uppgifter med dokument- och sidreferens.',
    motorkontroller: ['K-UNDERLAG'],
  },
  {
    id: 'CP-05',
    rubrik: 'Ingående balans',
    praktiskKontroll: 'Jämför ingående saldon med föregående verifierade balans eller startunderlag.',
    dokumentationskrav: 'Källa till varje ingående saldo och förklaring eller åtgärd vid differens.',
    motorkontroller: ['K-INGAENDE'],
  },
  {
    id: 'CP-06',
    rubrik: 'Konton och ägande',
    praktiskKontroll: 'Kontrollera att konton, tillgångar och skulder hör till den granskade förvaltningen. Identifiera dubbletter och särskild förvaltning.',
    dokumentationskrav: 'Kontrollerad konto- och tillgångsförteckning med originalreferenser; motiverade exkluderingar.',
    motorkontroller: ['K-AGANDE'],
  },
  {
    id: 'CP-07',
    rubrik: 'Utlästa värden',
    praktiskKontroll: 'Verifiera belopp, valuta, tecken, datum och kategorisering mot original. Gissa inte oläsliga värden.',
    dokumentationskrav: 'Originalvärde och verifierat värde med källposition; rättelser och kvarstående osäkerheter.',
    motorkontroller: ['K-UNDERLAG', 'K-KATEGORI'],
  },
  {
    id: 'CP-08',
    rubrik: 'Inbetalningar och utbetalningar',
    praktiskKontroll: 'Jämför redovisade poster med kontoutdrag och stödhandlingar. Identifiera oförklarade poster.',
    dokumentationskrav: 'Vilka konton, perioder och poster som kontrollerats samt underlag och avgränsningar.',
    motorkontroller: ['K-PERIOD', 'K-KATEGORI'],
  },
  {
    id: 'CP-09',
    rubrik: 'Möjliga dubbelposter',
    praktiskKontroll: 'Kontrollera återanvända dokument och identiska transaktionsreferenser. Lika belopp är inte ensamt bevis.',
    dokumentationskrav: 'Berörda poster och om de avser samma eller olika faktiska transaktioner.',
    motorkontroller: ['K-DUBBELPOST'],
  },
  {
    id: 'CP-10',
    rubrik: 'Interna överföringar',
    praktiskKontroll: 'Matcha överföringar mellan konton inom förvaltningen. Håll externa flöden och avgifter separat.',
    dokumentationskrav: 'Koppling mellan ut- och inbetalning, berörda konton och eventuell omklassificering.',
    motorkontroller: ['K-INTERN-OVERFORING'],
  },
  {
    id: 'CP-11',
    rubrik: 'Kontobalans och summering',
    praktiskKontroll: 'Stäm av ingående saldo, inbetalningar, utbetalningar och utgående saldo konto för konto; därefter sammanställningen.',
    dokumentationskrav: 'Beräkningsunderlag, indata, regelversion och differenslista. Beslutade toleranser.',
    motorkontroller: ['K-KONTOBALANS'],
  },
  {
    id: 'CP-12',
    rubrik: 'Utgående saldo',
    praktiskKontroll: 'Jämför utgående saldon med bankbesked eller annat originalunderlag för rätt datum.',
    dokumentationskrav: 'Konto, besked och datum; differens, komplettering och verifierad förklaring.',
    motorkontroller: ['K-UTGAENDE'],
  },
  {
    id: 'CP-13',
    rubrik: 'Övriga tillgångar och skulder',
    praktiskKontroll: 'Skilj betalning från värdeförändring och skuld. Kontrollera värderingsdatum och att värden inte räknas flera gånger.',
    dokumentationskrav: 'Underlag, värdetyp, datum och avgränsning; när specialistbedömning behövs.',
    motorkontroller: ['K-VARDEN'],
  },
  {
    id: 'CP-14',
    rubrik: 'Dispositioner och beslut',
    praktiskKontroll: 'Identifiera transaktioner där samtycke kan behövas. Pröva om beslut krävs och om villkoren täcker åtgärden.',
    dokumentationskrav: 'Koppling transaktion–beslut–villkor; rättslig fråga och bedömning separat från beloppskontrollen.',
    motorkontroller: ['K-DISPOSITION'],
  },
  {
    id: 'CP-15',
    rubrik: 'Berättelse om uppdragets utförande',
    praktiskKontroll: 'Granska berättelsen separat från siffrorna. Identifiera saknade uppgifter, motsägelser och frågor.',
    dokumentationskrav: 'Granskade uppgifter, underlagets begränsningar och frågor som kräver utredning.',
    motorkontroller: [],
  },
  {
    id: 'CP-16',
    rubrik: 'Komplettering och svar',
    praktiskKontroll: 'Formulera frågor utifrån verifierade luckor. Registrera faktiskt utskick och inkommet svar.',
    dokumentationskrav: 'Godkänd och skickad frågeversion, datum, svar och bedömning av om frågan är löst.',
    motorkontroller: [],
  },
  {
    id: 'CP-17',
    rubrik: 'Avvikelser och fortsatt åtgärd',
    praktiskKontroll: 'Pröva varje kvarstående avvikelse. Skilj konstaterat förhållande, påstående och osäkerhet.',
    dokumentationskrav: 'Belägg, allvarlighet, ansvarig, åtgärd och uppföljningsdatum.',
    motorkontroller: [],
  },
  {
    id: 'CP-18',
    rubrik: 'Utgifternas rimlighet och nytta för huvudmannen',
    praktiskKontroll:
      'Bedöm om utgifterna avser huvudmannen och är rimliga utifrån dennes situation, behov och uppdragets omfattning. Balans eller kompletta bilagor ersätter inte denna bedömning.',
    dokumentationskrav: 'Granskningens omfattning, kontrollerade poster, stöd i original och handläggarens materiella bedömning.',
    motorkontroller: [],
    materiell: true,
  },
  {
    id: 'CP-19',
    rubrik: 'Slutsats och avslut',
    praktiskKontroll: 'Kontrollera att resultatet stöds av underlagen. Aritmetisk balans innebär inte rättsligt godkännande.',
    dokumentationskrav: 'Daterad granskningsanteckning om omfattning, resultat, kvarstående frågor och fortsatt hantering.',
    motorkontroller: [],
  },
];
