import { formateraBelopp, summa } from '../domain/belopp.js';
import type { Kallposition, Kontrollresultat, Ore, Uppgift } from '../domain/typer.js';
import type { Granskningsparametrar, Redovisning, Transaktion } from './redovisning.js';

/**
 * Deterministisk redovisningsmotor (krav Ö-20, kontrollbiblioteket).
 *
 * Motorn räknar bara på verifierade uppgifter. En uppgift som är oläslig,
 * saknas eller ännu inte verifierats ger "kan_inte_bedomas" – den ersätts
 * aldrig av ett sannolikt värde och räknas aldrig som noll.
 *
 * Motorn fattar inga beslut och bedömer inte utgifternas rimlighet eller nytta
 * för huvudmannen. Det är handläggarens materiella prövning (JO 5473-2024).
 */

export const KONTROLLER = {
  underlag: { id: 'K-UNDERLAG', regel: 'OF-20-03' },
  agande: { id: 'K-AGANDE', regel: 'OF-20-KONTON' },
  period: { id: 'K-PERIOD', regel: 'OF-20-PERIOD' },
  ingaende: { id: 'K-INGAENDE', regel: 'OF-20-INGAENDE' },
  kontobalans: { id: 'K-KONTOBALANS', regel: 'OF-20-05' },
  utgaende: { id: 'K-UTGAENDE', regel: 'OF-20-06' },
  dubbelpost: { id: 'K-DUBBELPOST', regel: 'OF-20-DUBBEL' },
  intern: { id: 'K-INTERN-OVERFORING', regel: 'OF-20-INTERN' },
  kategori: { id: 'K-KATEGORI', regel: 'OF-20-KATEGORI' },
  disposition: { id: 'K-DISPOSITION', regel: 'OF-21-KOPPLING' },
  varden: { id: 'K-VARDEN', regel: 'OF-20-VARDEN' },
} as const;

type KontrollNyckel = keyof typeof KONTROLLER;

function resultat(
  nyckel: KontrollNyckel,
  p: Granskningsparametrar,
  utfall: Kontrollresultat['utfall'],
  beskrivning: string,
  belagg: Kallposition[] = [],
  extra: Partial<Pick<Kontrollresultat, 'avser' | 'berakning' | 'postbeskrivning'>> = {},
): Kontrollresultat {
  const k = KONTROLLER[nyckel];
  return { kontrollId: k.id, regelId: k.regel, regelversion: p.regelversion, utfall, beskrivning, belagg, ...extra };
}

export function verifierat<T>(u: Uppgift<T> | undefined): T | null {
  return u && u.status === 'verifierad' && u.varde !== null ? u.varde : null;
}

/** Neutral beskrivning av en post för utskick. */
function postText(t: Transaktion): string {
  const d = verifierat(t.datum);
  const b = verifierat(t.belopp);
  return `posten "${t.text}"${d ? ` ${d}` : ''}${b !== null ? `, ${formateraBelopp(b)}` : ''}`;
}

function dagarMellan(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

const STATUSTEXT: Record<Uppgift<unknown>['status'], string> = {
  verifierad: 'verifierad',
  utlast_ej_verifierad: 'utläst men inte verifierad mot original',
  olaslig: 'oläslig',
  saknas: 'saknas',
  ej_tillampligt: 'ej tillämplig',
};

/** Steg 3: läsbarhet och fullständighet. Visar varje uppgift som inte kan användas. */
export function kontrolleraUnderlag(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const brister: { vad: string; u: Uppgift<unknown> }[] = [];
  for (const s of r.saldon) {
    brister.push({ vad: `Ingående saldo ${s.kontoId}`, u: s.ingaende }, { vad: `Utgående saldo ${s.kontoId}`, u: s.utgaende });
  }
  for (const t of r.transaktioner) {
    brister.push({ vad: `Belopp ${t.id}`, u: t.belopp }, { vad: `Datum ${t.id}`, u: t.datum });
  }
  for (const t of r.ovrigaTillgangar) brister.push({ vad: `Värde ${t.id}`, u: t.varde });
  for (const s of r.skulder) brister.push({ vad: `Skuld ${s.id}`, u: s.belopp });

  const ejAnvandbara = brister.filter((b) => b.u.status !== 'verifierad' && b.u.status !== 'ej_tillampligt');
  if (ejAnvandbara.length === 0) {
    return [resultat('underlag', p, 'utford_utan_avvikelse', 'Samtliga utlästa uppgifter är verifierade mot original.')];
  }
  return ejAnvandbara.map((b) =>
    resultat(
      'underlag',
      p,
      'kan_inte_bedomas',
      `${b.vad}: ${STATUSTEXT[b.u.status]}. Originalvärde "${b.u.originalvarde}". Inget värde har gissats.`,
      [b.u.kalla],
    ),
  );
}

/** Konton och ägande: rätt förvaltning, inga dubbletter, saldo för varje konto. */
export function kontrolleraAgande(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const ut: Kontrollresultat[] = [];
  const perNummer = new Map<string, string[]>();
  for (const k of r.konton) {
    const nyckel = `${k.bank}|${k.kontonummer.replace(/\D/g, '')}`;
    perNummer.set(nyckel, [...(perNummer.get(nyckel) ?? []), k.id]);
    if (k.agare !== 'huvudman' || !k.omfattasAvForvaltningen) {
      ut.push(
        resultat('agande', p, 'avvikelse', `Kontot "${k.benamning}" (${k.id}) hör inte till den granskade förvaltningen men ingår i redovisningen. Pröva avgränsningen.`, [], { avser: k.id }),
      );
    }
    if (k.sarskildForvaltning) {
      ut.push(
        resultat('agande', p, 'avvikelse', `Kontot "${k.benamning}" (${k.id}) är markerat som särskild förvaltning. Pröva om det ska ingå.`, [], { avser: k.id }),
      );
    }
    if (!r.saldon.some((s) => s.kontoId === k.id)) {
      ut.push(resultat('agande', p, 'avvikelse', `Saldouppgifter saknas för kontot "${k.benamning}" (${k.id}).`, [], { avser: k.id }));
    }
  }
  for (const [, ids] of perNummer) {
    if (ids.length > 1) {
      ut.push(resultat('agande', p, 'avvikelse', `Samma konto förekommer flera gånger under olika poster: ${ids.join(', ')}.`, [], { avser: ids.join(',') }));
    }
  }
  const kontoIds = new Set(r.konton.map((k) => k.id));
  for (const t of r.transaktioner) {
    if (!kontoIds.has(t.kontoId)) {
      ut.push(resultat('agande', p, 'avvikelse', `Transaktion ${t.id} avser okänt konto ${t.kontoId}.`, [t.belopp.kalla], { avser: t.id }));
    }
  }
  if (ut.length === 0) ut.push(resultat('agande', p, 'utford_utan_avvikelse', 'Konton hör till förvaltningen och förekommer en gång var.'));
  return ut;
}

export function kontrolleraPeriod(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const ut: Kontrollresultat[] = [];
  for (const t of r.transaktioner) {
    const d = verifierat(t.datum);
    if (d === null) continue; // redovisas i K-UNDERLAG
    if (d < r.period.fran || d > r.period.till) {
      ut.push(
        resultat('period', p, 'avvikelse', `Transaktion ${t.id} (${d}) ligger utanför perioden ${r.period.fran}–${r.period.till}.`, [t.datum.kalla], { avser: t.id, postbeskrivning: postText(t) }),
      );
    }
  }
  if (ut.length === 0) ut.push(resultat('period', p, 'utford_utan_avvikelse', 'Alla verifierade transaktionsdatum ligger inom perioden.'));
  return ut;
}

export function kontrolleraIngaende(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  if (r.handlingstyp === 'forteckning') {
    return [resultat('ingaende', p, 'ej_tillamplig', 'Förteckningen är startpunkt; det finns ingen föregående balans.')];
  }
  const ut: Kontrollresultat[] = [];
  for (const s of r.saldon) {
    const ing = verifierat(s.ingaende);
    const foreg = r.foregaendeVerifieradBalans?.[s.kontoId];
    if (!foreg) {
      ut.push(resultat('ingaende', p, 'kan_inte_bedomas', `Föregående verifierad balans saknas för ${s.kontoId}.`, [s.ingaende.kalla], { avser: s.kontoId }));
      continue;
    }
    if (ing === null) {
      ut.push(resultat('ingaende', p, 'kan_inte_bedomas', `Ingående saldo för ${s.kontoId} är inte verifierat.`, [s.ingaende.kalla], { avser: s.kontoId }));
      continue;
    }
    const diff = ing - foreg.belopp;
    ut.push(
      resultat(
        'ingaende',
        p,
        Math.abs(diff) <= p.toleransOre ? 'utford_utan_avvikelse' : 'avvikelse',
        Math.abs(diff) <= p.toleransOre
          ? `Ingående saldo för ${s.kontoId} stämmer med föregående verifierade balans.`
          : `Ingående saldo för ${s.kontoId} avviker med ${formateraBelopp(diff)} från föregående verifierade balans.`,
        [s.ingaende.kalla, foreg.kalla],
        { avser: s.kontoId, berakning: { ingaende: ing, foregaende: foreg.belopp, differens: diff } },
      ),
    );
  }
  return ut;
}

/** Ingående saldo + inbetalningar − utbetalningar ska vara lika med utgående saldo, konto för konto. */
export function kontrolleraKontobalans(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const ut: Kontrollresultat[] = [];
  for (const s of r.saldon) {
    const poster = r.transaktioner.filter((t) => t.kontoId === s.kontoId);
    const ing = verifierat(s.ingaende);
    const utg = verifierat(s.utgaende);
    const overifierade = poster.filter((t) => verifierat(t.belopp) === null);
    if (ing === null || utg === null || overifierade.length > 0) {
      const orsak = [
        ing === null ? 'ingående saldo' : null,
        utg === null ? 'utgående saldo' : null,
        overifierade.length > 0 ? `${overifierade.length} transaktionsbelopp` : null,
      ]
        .filter(Boolean)
        .join(', ');
      ut.push(
        resultat('kontobalans', p, 'kan_inte_bedomas', `Avstämning av ${s.kontoId} kan inte göras: ${orsak} är inte verifierat.`, [s.ingaende.kalla, s.utgaende.kalla, ...overifierade.map((t) => t.belopp.kalla)], {
          avser: s.kontoId,
        }),
      );
      continue;
    }
    const belopp = poster.map((t) => verifierat(t.belopp) as Ore);
    const in_ = summa(belopp.filter((b) => b > 0));
    const ut_ = summa(belopp.filter((b) => b < 0));
    const beraknat = ing + in_ + ut_;
    const diff = utg - beraknat;
    const ok = Math.abs(diff) <= p.toleransOre;
    ut.push(
      resultat(
        'kontobalans',
        p,
        ok ? 'utford_utan_avvikelse' : 'avvikelse',
        ok
          ? `Kontot ${s.kontoId} balanserar: ${formateraBelopp(ing)} + ${formateraBelopp(in_)} − ${formateraBelopp(-ut_)} = ${formateraBelopp(utg)}.`
          : `Kontot ${s.kontoId} balanserar inte. Beräknat utgående saldo ${formateraBelopp(beraknat)}, redovisat ${formateraBelopp(utg)}, differens ${formateraBelopp(diff)}.`,
        [s.ingaende.kalla, s.utgaende.kalla],
        { avser: s.kontoId, berakning: { ingaende: ing, inbetalningar: in_, utbetalningar: ut_, beraknatUtgaende: beraknat, redovisatUtgaende: utg, differens: diff, toleransOre: p.toleransOre } },
      ),
    );
  }
  return ut;
}

export function kontrolleraUtgaendeMotBank(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  return r.saldon.map((s) => {
    const utg = verifierat(s.utgaende);
    const bank = verifierat(s.enligtBankbesked);
    if (!s.enligtBankbesked || bank === null) {
      return resultat('utgaende', p, 'kan_inte_bedomas', `Verifierat bankbesked saknas för ${s.kontoId}.`, [s.utgaende.kalla], { avser: s.kontoId });
    }
    if (s.bankbeskedDatum !== r.period.till) {
      return resultat('utgaende', p, 'avvikelse', `Bankbeskedet för ${s.kontoId} avser ${s.bankbeskedDatum ?? 'okänt datum'}, inte periodens slut ${r.period.till}.`, [s.enligtBankbesked.kalla], { avser: s.kontoId });
    }
    if (utg === null) {
      return resultat('utgaende', p, 'kan_inte_bedomas', `Utgående saldo för ${s.kontoId} är inte verifierat.`, [s.utgaende.kalla], { avser: s.kontoId });
    }
    const diff = utg - bank;
    const ok = Math.abs(diff) <= p.toleransOre;
    return resultat(
      'utgaende',
      p,
      ok ? 'utford_utan_avvikelse' : 'avvikelse',
      ok ? `Utgående saldo för ${s.kontoId} stämmer med bankbesked.` : `Utgående saldo för ${s.kontoId} avviker med ${formateraBelopp(diff)} från bankbeskedet.`,
      [s.utgaende.kalla, s.enligtBankbesked.kalla],
      { avser: s.kontoId, berakning: { redovisat: utg, bankbesked: bank, differens: diff } },
    );
  });
}

/**
 * Möjliga dubbelposter: samma transaktionsreferens på samma konto, eller samma
 * stödhandling med samma belopp. Lika belopp är inte ensamt bevis och flaggas inte.
 * Ingenting raderas; handläggaren avgör.
 */
export function kontrolleraDubbelposter(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const ut: Kontrollresultat[] = [];
  const grupper = new Map<string, Transaktion[]>();
  for (const t of r.transaktioner) {
    const b = verifierat(t.belopp);
    if (t.referens) {
      const k = `ref|${t.kontoId}|${t.referens}`;
      grupper.set(k, [...(grupper.get(k) ?? []), t]);
    }
    if (t.underlagChecksumma && b !== null) {
      const k = `doc|${t.underlagChecksumma}|${b}`;
      grupper.set(k, [...(grupper.get(k) ?? []), t]);
    }
  }
  const rapporterade = new Set<string>();
  for (const [nyckel, poster] of grupper) {
    if (poster.length < 2) continue;
    const ids = poster.map((t) => t.id).sort();
    const id = ids.join(',');
    if (rapporterade.has(id)) continue;
    rapporterade.add(id);
    const grund = nyckel.startsWith('ref|') ? 'samma transaktionsreferens' : 'samma stödhandling och belopp';
    ut.push(
      resultat('dubbelpost', p, 'avvikelse', `Möjlig dubbelregistrering (${grund}): ${ids.join(', ')}. Pröva om posterna avser samma faktiska transaktion.`, poster.map((t) => t.belopp.kalla), {
        avser: id,
      }),
    );
  }
  if (ut.length === 0) ut.push(resultat('dubbelpost', p, 'utford_utan_avvikelse', 'Inga poster med samma referens eller stödhandling hittades.'));
  return ut;
}

export interface OverforingsMatchning {
  par: { uttagId: string; insattningId: string; belopp: Ore }[];
  omatchade: string[];
}

/** Matchar interna överföringar inom den kontrollerade kontomängden. */
export function matchaInternaOverforingar(r: Redovisning, p: Granskningsparametrar): OverforingsMatchning {
  const forvaltade = new Set(r.konton.filter((k) => k.agare === 'huvudman' && k.omfattasAvForvaltningen).map((k) => k.id));
  const kandidater = r.transaktioner
    .filter((t) => t.kategori === 'intern_overforing')
    .map((t) => ({ t, b: verifierat(t.belopp), d: verifierat(t.datum) }))
    .sort((a, b) => (a.d ?? '').localeCompare(b.d ?? '') || a.t.id.localeCompare(b.t.id));

  const anvanda = new Set<string>();
  const par: OverforingsMatchning['par'] = [];
  for (const uttag of kandidater) {
    if (uttag.b === null || uttag.d === null || uttag.b >= 0 || anvanda.has(uttag.t.id)) continue;
    if (!forvaltade.has(uttag.t.kontoId)) continue;
    const insattning = kandidater.find(
      (k) =>
        !anvanda.has(k.t.id) &&
        k.b === -uttag.b! &&
        k.d !== null &&
        k.t.kontoId !== uttag.t.kontoId &&
        forvaltade.has(k.t.kontoId) &&
        dagarMellan(k.d, uttag.d!) <= p.overforingMaxDagar,
    );
    if (insattning) {
      anvanda.add(uttag.t.id).add(insattning.t.id);
      par.push({ uttagId: uttag.t.id, insattningId: insattning.t.id, belopp: -uttag.b });
    }
  }
  const omatchade = kandidater.filter((k) => !anvanda.has(k.t.id)).map((k) => k.t.id);
  return { par, omatchade };
}

export function kontrolleraInternaOverforingar(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const { par, omatchade } = matchaInternaOverforingar(r, p);
  if (par.length === 0 && omatchade.length === 0) {
    return [resultat('intern', p, 'ej_tillamplig', 'Inga poster är markerade som interna överföringar.')];
  }
  const ut: Kontrollresultat[] = par.map((m) =>
    resultat('intern', p, 'utford_utan_avvikelse', `Intern överföring ${formateraBelopp(m.belopp)} matchad: ${m.uttagId} → ${m.insattningId}. Räknas inte som extern in- eller utbetalning.`, [], {
      avser: `${m.uttagId},${m.insattningId}`,
    }),
  );
  for (const id of omatchade) {
    const t = r.transaktioner.find((x) => x.id === id)!;
    ut.push(
      resultat('intern', p, 'avvikelse', `Posten ${id} är markerad som intern överföring men saknar motpost inom förvaltningen. Pröva om pengarna lämnat förvaltningen.`, [t.belopp.kalla], { avser: id, postbeskrivning: postText(t) }),
    );
  }
  return ut;
}

export function kontrolleraKategorier(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const okanda = r.transaktioner.filter((t) => t.kategori === 'okand');
  if (okanda.length === 0) return [resultat('kategori', p, 'utford_utan_avvikelse', 'Alla poster har en kategori.')];
  return okanda.map((t) =>
    resultat('kategori', p, 'avvikelse', `Posten ${t.id} ("${t.text}") har oklar kategori och kvarstår öppen tills handläggaren prövat den.`, [t.belopp.kalla], { avser: t.id, postbeskrivning: postText(t) }),
  );
}

/** Visar transaktioner som kan kräva samtycke men saknar kopplat beslut. Prövningen görs av människa. */
export function kontrolleraDispositioner(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const aktuella = r.transaktioner.filter((t) => t.kanKravaSamtycke);
  if (aktuella.length === 0) return [resultat('disposition', p, 'ej_tillamplig', 'Inga poster är markerade som möjliga samtyckesärenden.')];
  return aktuella.map((t) =>
    t.beslutId
      ? resultat('disposition', p, 'utford_utan_avvikelse', `Posten ${t.id} är kopplad till beslut ${t.beslutId}. Handläggaren prövar att beslutets villkor täcker åtgärden.`, [t.belopp.kalla], {
          avser: t.id,
        })
      : resultat('disposition', p, 'avvikelse', `Posten ${t.id} ("${t.text}") kan kräva samtycke men saknar kopplat beslut. Pröva om beslut krävdes.`, [t.belopp.kalla], { avser: t.id, postbeskrivning: postText(t) }),
  );
}

export function kontrolleraVarden(r: Redovisning, p: Granskningsparametrar): Kontrollresultat[] {
  const ut: Kontrollresultat[] = [];
  for (const t of r.ovrigaTillgangar) {
    if (!t.varderingstyp || !t.varderingsdatum) {
      ut.push(resultat('varden', p, 'avvikelse', `Tillgången "${t.beskrivning}" saknar värdetyp eller värderingsdatum.`, [t.varde.kalla], { avser: t.id }));
    }
  }
  if (ut.length === 0) {
    ut.push(
      resultat(
        'varden',
        p,
        r.ovrigaTillgangar.length === 0 ? 'ej_tillamplig' : 'utford_utan_avvikelse',
        r.ovrigaTillgangar.length === 0 ? 'Inga övriga tillgångar redovisas.' : 'Övriga tillgångar har värdetyp och värderingsdatum. Värdeförändring räknas inte som betalning.',
      ),
    );
  }
  return ut;
}

export interface Sammanstallning {
  /** Externa inbetalningar (interna överföringar exkluderade). */
  externaInbetalningar: Ore;
  /** Externa utbetalningar som negativt tal. */
  externaUtbetalningar: Ore;
  interntOverfort: Ore;
  ingaendeTotalt: Ore | null;
  utgaendeTotalt: Ore | null;
  ovrigaTillgangar: Ore | null;
  skulder: Ore | null;
  /** Antal poster som inte ingår eftersom de inte är verifierade. */
  ejMedraknadePoster: number;
}

/** Konsoliderad sammanställning. Totaler blir null när någon ingående uppgift inte är verifierad. */
export function sammanstall(r: Redovisning, p: Granskningsparametrar): Sammanstallning {
  const { par } = matchaInternaOverforingar(r, p);
  const interna = new Set(par.flatMap((m) => [m.uttagId, m.insattningId]));
  let in_ = 0;
  let ut_ = 0;
  let ejMed = 0;
  for (const t of r.transaktioner) {
    const b = verifierat(t.belopp);
    if (b === null) {
      ejMed++;
      continue;
    }
    if (interna.has(t.id)) continue;
    if (b > 0) in_ += b;
    else ut_ += b;
  }
  const total = (vals: (Ore | null)[]) => (vals.some((v) => v === null) ? null : summa(vals as Ore[]));
  return {
    externaInbetalningar: in_,
    externaUtbetalningar: ut_,
    interntOverfort: summa(par.map((m) => m.belopp)),
    ingaendeTotalt: total(r.saldon.map((s) => verifierat(s.ingaende))),
    utgaendeTotalt: total(r.saldon.map((s) => verifierat(s.utgaende))),
    ovrigaTillgangar: total(r.ovrigaTillgangar.map((t) => verifierat(t.varde))),
    skulder: total(r.skulder.map((s) => verifierat(s.belopp))),
    ejMedraknadePoster: ejMed,
  };
}

export interface Motorkorning {
  redovisningId: string;
  korningstid: string;
  parametrar: Granskningsparametrar;
  resultat: Kontrollresultat[];
  sammanstallning: Sammanstallning;
  /** Påminnelse som alltid följer med utdata. */
  forbehall: string;
}

export function korKontroller(r: Redovisning, p: Granskningsparametrar, tid: Date = new Date()): Motorkorning {
  const resultatLista = [
    ...kontrolleraUnderlag(r, p),
    ...kontrolleraAgande(r, p),
    ...kontrolleraPeriod(r, p),
    ...kontrolleraIngaende(r, p),
    ...kontrolleraKontobalans(r, p),
    ...kontrolleraUtgaendeMotBank(r, p),
    ...kontrolleraDubbelposter(r, p),
    ...kontrolleraInternaOverforingar(r, p),
    ...kontrolleraKategorier(r, p),
    ...kontrolleraDispositioner(r, p),
    ...kontrolleraVarden(r, p),
  ];
  return {
    redovisningId: r.id,
    korningstid: tid.toISOString(),
    parametrar: structuredClone(p),
    resultat: resultatLista,
    sammanstallning: sammanstall(r, p),
    forbehall:
      'Kontrollerna är aritmetiska och formella. Aritmetisk balans innebär inte att förvaltningen är rättsligt godkänd. Utgifternas rimlighet och nytta för huvudmannen prövas av handläggaren.',
  };
}
