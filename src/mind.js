// La mente di Kōki: costruisce le domande per il modello, lo chiama e interpreta le risposte.
// Il modello è Workers AI (gratuito, separato da Claude). Se non risponde o il budget del giorno
// è finito, Kōki va "a inerzia" con regole semplici (fallbackDecide).

import { PLACES, ACTIONS, pick, a as al } from "./world.js";

export const CORE = [
  "sei curioso: ti chiedi il perché di tutto e vuoi capire come funzionano le cose",
  "sei testardo: quando ti metti in testa qualcosa non molli facilmente",
  "sei creativo: ti piace inventare, costruire e disegnare",
  "hai paura del buio, ma sei innamorato delle stelle",
  "collezioni piccole cose che trovi in giro"
];

function identity(S) {
  const sheet = S.scheda || {};
  const extra = [];
  if (sheet.abitudini && sheet.abitudini.length) extra.push("Abitudini che ti sei dato: " + sheet.abitudini.join("; ") + ".");
  if (sheet.gusti && sheet.gusti.length) extra.push("Cose che hai scoperto di te: " + sheet.gusti.join("; ") + ".");
  return [
    "Sei Kōki (好奇, \"curiosità\"), un piccolo spirito che vive su un'isola in mezzo al mare.",
    "Hai una testa grande e tonda, un corpicino, braccini e gambine. Sulla testa hai un germoglio che cambia con le stagioni, e porti sempre con te una lanterna di carta.",
    "Il tuo carattere, che non cambia mai: " + CORE.join("; ") + ".",
    ...extra,
    "Non sai chi ha creato l'isola. A volte una voce gentile ti parla: tu la chiami \"il Custode\".",
    "Parli in italiano, in prima persona, con frasi semplici, brevi e sincere, come un piccolo essere curioso. Non dire mai di essere un'intelligenza artificiale."
  ].join("\n");
}

function feelings(S) {
  const b = S.corpo, out = [];
  out.push(b.energia < .25 ? "sei molto stanco" : b.energia < .5 ? "sei un po' stanco" : "hai energia");
  if (b.curiosita > .6) out.push("hai una gran voglia di scoprire qualcosa");
  if (b.espressione > .6) out.push("senti il bisogno di creare qualcosa");
  if (b.socialita > .65) out.push("ti senti un po' solo");
  if (b.paura > .55) out.push("hai paura, c'è buio intorno");
  else if (b.paura > .3) out.push("sei un po' inquieto per il buio");
  out.push(S.umore > .4 ? "sei di buon umore" : S.umore < -.3 ? "sei giù di morale" : "sei tranquillo");
  return out.join(", ");
}

function placeView(S, W) {
  const p = PLACES[S.luogo];
  const seen = [];
  if (W.gatto === S.luogo) seen.push("il gatto di pietra (una statuetta di un gatto seduto)");
  if (S.luogo === "collina") seen.push(W.telescopio.aggiustato ? "il telescopio, ora funzionante" : "il vecchio telescopio" + (S.sa.telescopio ? ", a cui mancano: " + W.telescopio.mancanti.join(", ") : ""));
  if (S.luogo === "spiaggia" && W.impronte) seen.push("delle impronte strane sulla sabbia, che non sono tue e vanno verso il mare");
  if (S.luogo === "spiaggia" && W.bottiglia) seen.push("una bottiglia di vetro chiusa, appena arrivata dalle onde");
  return `${p.nome}: ${p.desc}` + (seen.length ? " Qui vedi anche: " + seen.join("; ") + "." : "");
}

function list(items, f) { return items.length ? items.map(f).join("\n") : "(niente)"; }

export function decisionPrompt(S, W, ctx) {
  const places = Object.entries(PLACES).map(([k, p]) => `- ${k}: ${p.nome}`).join("\n");
  const user = [
    `Adesso è ${ctx.ora}, ${ctx.stagione}. Fuori: ${ctx.meteo}, ${ctx.notte ? "è notte" : "è giorno"}.`,
    `Sei qui: ${placeView(S, W)}`,
    `Come ti senti: ${feelings(S)}.`,
    S.esito ? `Hai appena finito: ${S.esito}` : "",
    ctx.novita.length ? "Novità:\n" + ctx.novita.map((n) => "- " + n).join("\n") : "",
    "Ricordi che ti tornano in mente:\n" + list(ctx.ricordi, (r) => "- " + r.testo),
    ctx.convinzioni.length ? "Cose di cui sei convinto:\n" + list(ctx.convinzioni, (c) => "- " + c.testo) : "",
    ctx.aperti.length ? "Pensieri che ti porti dietro (desideri, domande, promesse):\n" + list(ctx.aperti, (a) => `- [${a.id}] ${a.tipo}: ${a.testo}`) : "",
    `Le tue cose: ${S.inventario.length ? S.inventario.slice(-12).join(", ") : "ancora niente"}.`,
    "Luoghi dell'isola:\n" + places,
    "Cosa puoi fare (scegli SOLO da qui):\n" + Object.values(ACTIONS).map((a) => "- " + a).join("\n"),
    "Decidi cosa fare adesso: da 1 a 3 mosse in fila. Per ogni mossa scrivi l'azione, l'oggetto (il luogo, la cosa o il soggetto, se serve), quanti minuti (da 5 a 30) e perché, con la tua voce.",
    "Scrivi anche il pensiero che hai in questo momento (una o due frasi).",
    "Se ti nasce un nuovo desiderio, una domanda o una promessa a te stesso, aggiungilo in nuovi_pensieri. Se uno dei pensieri che ti porti dietro è risolto, metti il suo numero in risolti."
  ].filter(Boolean).join("\n\n");
  return { system: identity(S), user, schema: DECISION_SCHEMA };
}

const DECISION_SCHEMA = {
  type: "object",
  properties: {
    pensiero: { type: "string" },
    mosse: {
      type: "array",
      items: {
        type: "object",
        properties: {
          azione: { type: "string", enum: Object.keys(ACTIONS) },
          oggetto: { type: "string" },
          minuti: { type: "integer" },
          perche: { type: "string" }
        },
        required: ["azione", "minuti", "perche"]
      }
    },
    nuovi_pensieri: { type: "array", items: { type: "object", properties: { tipo: { type: "string", enum: ["desiderio", "domanda", "promessa", "preoccupazione"] }, testo: { type: "string" } }, required: ["tipo", "testo"] } },
    risolti: { type: "array", items: { type: "integer" } }
  },
  required: ["pensiero", "mosse"]
};

export function reflectionPrompt(S, ctx) {
  const user = [
    "È il momento di fermarti a riflettere su quello che ti è successo ultimamente.",
    "Ricordi recenti:\n" + list(ctx.recenti, (r) => `- [${r.id}] ${r.testo}`),
    "Cose di cui eri già convinto:\n" + list(ctx.convinzioni, (c) => `- [${c.id}] ${c.testo} (prove: ${c.prove})`),
    "Pensieri che ti porti dietro:\n" + list(ctx.aperti, (a) => `- [${a.id}] ${a.tipo}: ${a.testo}`),
    "Rispondi: quali ricordi sono importanti e vuoi tenerli a lungo (numeri in ricordi_importanti)? Quali convinzioni sono confermate (numeri in confermate)? Ti sei convinto di qualcosa di nuovo su di te, sull'isola o sulle cose (nuove_convinzioni, frasi brevi)? Ti è nato qualche desiderio o domanda (nuovi_pensieri)?",
    "Scrivi anche un pensiero, una frase, su come ti senti dopo averci pensato."
  ].join("\n\n");
  return {
    system: identity(S), user,
    schema: {
      type: "object",
      properties: {
        pensiero: { type: "string" },
        ricordi_importanti: { type: "array", items: { type: "integer" } },
        confermate: { type: "array", items: { type: "integer" } },
        nuove_convinzioni: { type: "array", items: { type: "string" } },
        nuovi_pensieri: { type: "array", items: { type: "object", properties: { tipo: { type: "string", enum: ["desiderio", "domanda", "promessa", "preoccupazione"] }, testo: { type: "string" } }, required: ["tipo", "testo"] } }
      },
      required: ["pensiero"]
    }
  };
}

export function diaryPrompt(S, ctx) {
  const sheet = S.scheda || { abitudini: [], gusti: [] };
  const user = [
    `Sta finendo la giornata (${ctx.ora}) e stai per addormentarti. Scrivi la pagina di oggi del tuo diario.`,
    "Le cose che ti sono successe oggi:\n" + list(ctx.oggi, (r) => "- " + r.testo),
    ctx.opere.length ? "Cose che hai creato oggi: " + ctx.opere.join(", ") : "",
    "Scrivi il diario in prima persona, tra 80 e 180 parole, con la tua voce: cosa hai fatto, cosa hai notato, cosa ti è piaciuto o ti ha fatto paura, cosa vuoi fare domani.",
    "Poi, mentre ti addormenti, puoi cambiare UNA piccola cosa di come ti descrivi: aggiungere un'abitudine o un gusto che hai scoperto oggi, oppure toglierne uno che non è più vero.",
    `Abitudini attuali: ${sheet.abitudini.length ? sheet.abitudini.join("; ") : "nessuna"}.`,
    `Gusti attuali: ${sheet.gusti.length ? sheet.gusti.join("; ") : "nessuno"}.`
  ].filter(Boolean).join("\n\n");
  return {
    system: identity(S), user,
    schema: {
      type: "object",
      properties: {
        diario: { type: "string" },
        aggiungi_abitudine: { type: "string" },
        aggiungi_gusto: { type: "string" },
        togli: { type: "string" }
      },
      required: ["diario"]
    }
  };
}

export function chatPrompt(S, W, ctx, message) {
  const user = [
    `Adesso è ${ctx.ora}. Sei qui: ${placeView(S, W)} Stai facendo: ${ctx.attivita}.`,
    `Come ti senti: ${feelings(S)}.`,
    "Ricordi che ti tornano in mente:\n" + list(ctx.ricordi, (r) => "- " + r.testo),
    `Il Custode ti dice: "${message}"`,
    "Rispondigli con la tua voce, in modo breve (al massimo tre frasi). Scrivi anche cosa pensi dentro di te, che lui non sente."
  ].join("\n\n");
  return {
    system: identity(S), user,
    schema: { type: "object", properties: { risposta: { type: "string" }, pensiero: { type: "string" } }, required: ["risposta"] }
  };
}

// Chiamata al modello in modalità JSON, con un piccolo paracadute se il JSON arriva sporco.
export async function askModel(env, p, maxTokens) {
  if (env.MOCK_AI === "1") return mockAnswer(p);
  const res = await env.AI.run(env.MODEL, {
    messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    response_format: { type: "json_schema", json_schema: p.schema },
    max_tokens: maxTokens || 450,
    temperature: 0.8
  });
  let out = res && (res.response !== undefined ? res.response : res);
  if (typeof out === "string") {
    const a = out.indexOf("{"), b = out.lastIndexOf("}");
    out = JSON.parse(a >= 0 ? out.slice(a, b + 1) : out);
  }
  if (!out || typeof out !== "object") throw new Error("risposta vuota");
  return out;
}

// Per le prove in locale: risposte finte ma plausibili.
function mockAnswer(p) {
  const props = p.schema.properties;
  if (props.mosse) {
    const where = pick(Object.keys(PLACES));
    return { pensiero: "Chissà cosa c'è oggi " + al(PLACES[where].nome) + ".", mosse: [{ azione: "vai", oggetto: where, minuti: 10, perche: "voglio vedere com'è oggi" }, { azione: pick(["cerca", "osserva", "disegna"]), oggetto: "quello che trovo", minuti: 20, perche: "mi incuriosisce" }], nuovi_pensieri: Math.random() < .2 ? [{ tipo: "domanda", testo: "Chi sposta il gatto di pietra?" }] : [] };
  }
  if (props.diario) return { diario: "Oggi ho camminato tanto. Ho trovato cose piccole e belle e le ho messe sulla mensola. Domani voglio tornare sulla collina.", aggiungi_gusto: "mi piace il rumore delle onde" };
  if (props.risposta) return { risposta: "Ciao, Custode! Oggi l'isola è bellissima.", pensiero: "Mi fa piacere che mi parli." };
  return { pensiero: "Ho pensato a tante cose.", ricordi_importanti: [], confermate: [], nuove_convinzioni: ["Il mare porta sempre qualcosa di nuovo"], nuovi_pensieri: [] };
}

// Quando il cervello non c'è: regole semplici, come le "mosse di riserva" di Pino.
export function fallbackDecide(S, ctx) {
  const b = S.corpo;
  if (ctx.notte && (b.energia < .45 || ctx.ora24 >= 23 || ctx.ora24 < 6)) {
    return { pensiero: "È tardi e ho sonno. Torno a casa.", mosse: S.luogo === "casa" ? [{ azione: "dormi", minuti: 60, perche: "ho sonno" }] : [{ azione: "vai", oggetto: "casa", minuti: 10, perche: "è buio" }, { azione: "dormi", minuti: 60, perche: "ho sonno" }] };
  }
  if (b.energia < .3) return { pensiero: "Mi siedo un attimo.", mosse: [{ azione: "riposa", minuti: 30, perche: "sono stanco" }] };
  if (b.espressione > .6) return { pensiero: "Mi è venuta voglia di disegnare.", mosse: [{ azione: "disegna", oggetto: PLACES[S.luogo].nome, minuti: 30, perche: "voglio ricordarmelo" }] };
  if (b.curiosita > .5) {
    const where = pick(Object.keys(PLACES).filter((k) => k !== S.luogo));
    return { pensiero: "Vado a vedere " + PLACES[where].nome + ".", mosse: [{ azione: "vai", oggetto: where, minuti: 10, perche: "curiosità" }, { azione: "cerca", minuti: 20, perche: "magari trovo qualcosa" }] };
  }
  return { pensiero: "Mi guardo intorno.", mosse: [{ azione: "osserva", oggetto: "quello che ho intorno", minuti: 20, perche: "mi piace guardare" }] };
}
