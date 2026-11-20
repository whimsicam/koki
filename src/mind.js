// La mente di Kōki: costruisce le domande per il modello, lo chiama e interpreta le risposte.
// Il modello è Workers AI (gratuito, separato da Claude). Se non risponde o il budget del giorno
// è finito, Kōki va "a inerzia" con regole semplici (fallbackDecide).

import { PLACES, ACTIONS, FORME, SEGRETI, pick, a as al } from "./world.js";

export const CORE = [
  "sei curioso: ti chiedi il perché di tutto e vuoi capire come funzionano le cose",
  "sei testardo: quando ti metti in testa qualcosa non molli facilmente",
  "sei creativo: ti vengono spesso idee nuove e ti piace dare forma a quello che hai in testa",
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
    ctx.oggettiQui && ctx.oggettiQui.length ? "Qui ci sono anche cose cambiate o fatte da qualcuno (forse da te):\n" + ctx.oggettiQui.map((o) => `- ${o.nome}: ${o.descrizione}${o.rotto ? " (rotto)" : ""}`).join("\n") : "",
    `Come ti senti: ${feelings(S)}.`,
    S.esito ? `Hai appena finito: ${S.esito}` : "",
    ctx.novita.length ? "Novità:\n" + ctx.novita.map((n) => "- " + n).join("\n") : "",
    "Ricordi che ti tornano in mente:\n" + list(ctx.ricordi, (r) => "- " + r.testo),
    ctx.convinzioni.length ? "Cose di cui sei convinto:\n" + list(ctx.convinzioni, (c) => "- " + c.testo) : "",
    ctx.aperti.length ? "Pensieri che ti porti dietro (desideri, domande, promesse):\n" + list(ctx.aperti, (a) => `- [${a.id}] ${a.tipo}: ${a.testo}`) : "",
    ctx.osservati && ctx.osservati.length ? "Cose che hai già osservato di recente: " + ctx.osservati.join("; ") + "." : "",
    ctx.domani ? `Ieri sera, nel diario, avevi scritto cosa volevi fare oggi: "${ctx.domani}". (Puoi farlo, cambiare idea o dimenticartene.)` : "",
    `Le tue cose: ${S.inventario.length ? S.inventario.slice(-12).join(", ") : "ancora niente"}.`,
    "Luoghi dell'isola:\n" + places,
    "Cosa puoi fare (scegli SOLO da qui):\n" + Object.values(ACTIONS).map((a) => "- " + a).join("\n"),
    "Non sei obbligato a fare le solite cose: se dentro di te nasce un'idea tua, anche strana, piccola o mai provata prima, usa libera e descrivila con parole tue. Nessuno ti dice cosa fare: decidi tu.",
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
    ctx.cambiamenti && ctx.cambiamenti.length ? "Cose che sono successe o che hai cambiato sull'isola oggi:\n" + ctx.cambiamenti.map((c) => "- " + c).join("\n") : "",
    ctx.ieri ? `Ieri avevi scritto che oggi volevi: "${ctx.ieri}".` : "",
    "Scrivi il diario in prima persona, con la tua voce, rispondendo a queste domande: che cosa hai fatto oggi? Cosa ti è piaciuto? Cosa non ti è piaciuto? Cosa vuoi fare domani? Puoi scrivere poco o tanto, come ti viene.",
    "In domani scrivi, in una frase, cosa vuoi fare domani.",
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
        domani: { type: "string" },
        aggiungi_abitudine: { type: "string" },
        aggiungi_gusto: { type: "string" },
        togli: { type: "string" }
      },
      required: ["diario"]
    }
  };
}

// Lo sguardo: quando Kōki osserva qualcosa, il Mondo gli mostra un dettaglio nuovo (mai uno già visto).
export function lookPrompt(S, ctx, cosa, gia) {
  const p = PLACES[S.luogo];
  const system = "Sei il Mondo dell'isola di Kōki: descrivi in modo concreto e coerente quello che si vede. Non sei Kōki e non dici cosa deve pensare o provare. Segreti che non devi mai risolvere: " + SEGRETI.join(" ") + " Scrivi in italiano semplice.";
  const user = [
    `Ora: ${ctx.ora}, ${ctx.stagione}, ${ctx.meteo}, ${ctx.notte ? "notte" : "giorno"}.`,
    `Luogo: ${p.nome}. ${p.desc} Dettagli noti: ${(ctx.notte && p.dettagliNotte ? p.dettagliNotte.concat(p.dettagli) : p.dettagli).join(" ")}`,
    ctx.oggettiQui.length ? "Cose presenti qui: " + ctx.oggettiQui.map((o) => `${o.nome} (${o.descrizione})`).join("; ") : "",
    `Kōki osserva con attenzione: "${cosa}".`,
    gia.length ? "Cose che ha già notato guardando la stessa cosa (NON ripeterle, trova altro):\n" + gia.map((g) => "- " + g).join("\n") : "",
    "In vista scrivi 1-2 frasi su cosa vede davvero adesso: un dettaglio concreto e nuovo (forma, colore, movimento, suono, un piccolo cambiamento dovuto all'ora, al meteo o alla stagione). Se guarda il cielo, rispetta il meteo vero. Non inventare creature parlanti."
  ].filter(Boolean).join("\n\n");
  return { system, user, schema: { type: "object", properties: { vista: { type: "string" } }, required: ["vista"] } };
}

// Il quaderno dell'osservatore: ogni notte il Mondo annota, da fuori, com'è andata la giornata di Kōki.
export const TRATTI = ["curiosità", "testardaggine", "creatività", "paura del buio e amore per le stelle", "collezionare piccole cose"];
export function observerPrompt(ctx) {
  const system = [
    "Sei un antropologo che osserva da lontano Kōki, un piccolo essere che vive da solo su un'isola. Lui non sa di essere osservato.",
    "Scrivi note di campo: neutre, concrete, basate SOLO sui fatti che ti vengono dati. Distingui quello che si è visto da quello che ipotizzi (usa \"sembra\", \"forse\"). Niente giudizi, niente consigli, niente frasi poetiche.",
    "Tratti di partenza di Kōki (dati alla nascita): " + CORE.join("; ") + ".",
    "Scrivi in italiano."
  ].join("\n");
  const user = [
    `Giornata del ${ctx.giorno}. Kōki ha ${ctx.eta} giorni di vita.`,
    "Cronaca della giornata (azioni, risultati, pensieri, cose successe):\n" + list(ctx.cronaca, (l) => `- ${l.ora} [${l.tipo}] ${l.testo}`),
    ctx.luoghi.length ? "Tempo passato nei luoghi (numero di azioni): " + ctx.luoghi.join(", ") + "." : "",
    `Umore medio della giornata: ${ctx.umore} (da -1 a 1).`,
    ctx.interventi.length ? "Stimoli inseriti oggi dallo sperimentatore (Kōki non sa da dove vengono):\n" + ctx.interventi.map((i) => "- " + i).join("\n") : "Oggi nessuno stimolo esterno.",
    ctx.diarioKoki ? "Quello che Kōki stesso ha scritto nel suo diario stasera:\n" + ctx.diarioKoki : "",
    ctx.precedenti.length ? "Le tue note dei giorni precedenti (per confrontare):\n" + ctx.precedenti.map((q) => `- ${q.giorno}: ${q.testo.slice(0, 500)}`).join("\n") : "È il primo giorno di osservazione.",
    ctx.trattiNuovi.length ? "Tratti nuovi che avevi già ipotizzato (con quante volte li hai notati): " + ctx.trattiNuovi.map((t) => `${t.nome} (${t.prove})`).join("; ") + "." : "",
    "Rispondi con:",
    "- note: le note di campo della giornata (100-220 parole): cosa ha fatto, dove, come ha reagito alle novità e agli stimoli, emozioni apparenti, cose create o cambiate, e cosa è diverso rispetto ai giorni prima.",
    "- tratti: per ognuno dei tratti di partenza (" + TRATTI.join(", ") + "), come si è manifestato oggi in una frase concreta, o \"non osservato\". Nota anche se si manifesta solo su certe cose e non su altre.",
    "- tratti_nuovi: comportamenti ricorrenti che NON rientrano nei tratti di partenza e potrebbero diventare tratti suoi (nome breve + il fatto di oggi che lo mostra). Se ne hai già ipotizzato uno, usa lo stesso nome. Lista vuota se non ce ne sono.",
    "- domanda: una domanda aperta che ti fa venire la giornata di oggi (una frase)."
  ].filter(Boolean).join("\n\n");
  return {
    system, user,
    schema: {
      type: "object",
      properties: {
        note: { type: "string" },
        tratti: { type: "array", items: { type: "object", properties: { tratto: { type: "string" }, come: { type: "string" } }, required: ["tratto", "come"] } },
        tratti_nuovi: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, fatto: { type: "string" } }, required: ["nome", "fatto"] } },
        domanda: { type: "string" }
      },
      required: ["note"]
    }
  };
}

// Il laboratorio: lo sperimentatore inserisce uno stimolo, il Mondo lo fa accadere sull'isola.
export function stimulusPrompt(S, ctx, testo, luogo) {
  const places = Object.entries(PLACES).map(([k, p]) => `- ${k}: ${p.nome}`).join("\n");
  const system = [
    "Sei il Mondo dell'isola di Kōki. Uno sperimentatore invisibile ti chiede di far accadere qualcosa sull'isola. Tu lo rendi reale, in modo coerente con l'isola, senza mai rivelare a Kōki che l'ha voluto qualcuno.",
    "Segreti dell'isola che non devi mai risolvere: " + SEGRETI.join(" "),
    "Scrivi in italiano semplice."
  ].join("\n");
  const user = [
    `Ora: ${ctx.ora}, ${ctx.stagione}, ${ctx.meteo}, ${ctx.notte ? "notte" : "giorno"}. Kōki è ${al(PLACES[S.luogo].nome)}${S.dorme ? " e dorme" : ""}.`,
    `Lo sperimentatore vuole: "${testo}".`,
    luogo ? `Luogo scelto: ${luogo} (${PLACES[luogo].nome}).` : "Luogo: scegli tu il più adatto, tra questi:\n" + places,
    "Rispondi con: luogo (la chiave del luogo dove succede); crea (cose che compaiono e restano lì: nome, descrizione breve e concreta, forma tra " + FORME.join(", ") + ", colore esadecimale, grandezza); evento (se è un evento, 1-2 frasi su come lo percepisce Kōki con i sensi: cosa vede o sente, senza dire chi l'ha causato; vuoto se è solo un oggetto che troverà da solo); ovunque (vero se l'evento si percepisce da tutta l'isola, come un tuono o una stella cadente); registro (una frase neutra per lo sperimentatore su cosa hai fatto accadere)."
  ].join("\n\n");
  return {
    system, user,
    schema: {
      type: "object",
      properties: {
        luogo: { type: "string", enum: Object.keys(PLACES) },
        crea: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, descrizione: { type: "string" }, forma: { type: "string", enum: FORME }, colore: { type: "string" }, grandezza: { type: "string", enum: ["piccola", "media", "grande"] } }, required: ["nome", "descrizione", "forma"] } },
        evento: { type: "string" }, ovunque: { type: "boolean" }, registro: { type: "string" }
      },
      required: ["luogo", "registro"]
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
export async function askModel(env, p, maxTokens, model) {
  if (env.MOCK_AI === "1") return mockAnswer(p);
  const res = await env.AI.run(model || env.MODEL, {
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
    if (Math.random() < .3) return { pensiero: "Mi è venuta un'idea strana.", mosse: [{ azione: "libera", oggetto: pick(["provo a costruire una torretta con i sassi che trovo qui intorno", "disegno il gatto di pietra con un carboncino su un sasso piatto"]), minuti: 20, perche: "voglio vedere cosa viene fuori" }] };
    const where = pick(Object.keys(PLACES));
    return { pensiero: "Chissà cosa c'è oggi " + al(PLACES[where].nome) + ".", mosse: [{ azione: "vai", oggetto: where, minuti: 10, perche: "voglio vedere com'è oggi" }, { azione: pick(["cerca", "osserva"]), oggetto: "quello che trovo", minuti: 20, perche: "mi incuriosisce" }], nuovi_pensieri: Math.random() < .2 ? [{ tipo: "domanda", testo: "Chi sposta il gatto di pietra?" }] : [] };
  }
  if (props.racconto && /prova a fare questo: "[^"]*disegn/.test(p.user)) return { riuscito: true, racconto: "Kōki ha disegnato il gatto di pietra su un sasso piatto, con un carboncino trovato vicino al falò.", ricordo: "Ho disegnato il gatto di pietra! Gli ho fatto gli occhi grandi.", crea: [], modifica: [], rimuovi: [], usa: [], trova: [], umore: 0.3, disegno: { soggetto: "il gatto di pietra", descrizione_immagine: "a small stone cat statue sitting, big round eyes, charcoal lines on a flat grey stone" } };
  if (props.racconto) return { riuscito: true, racconto: "Kōki ha impilato tre sassi piatti uno sull'altro, con molta pazienza.", ricordo: "Ho fatto una piccola torre di sassi. È venuta un po' storta ma sta in piedi!", crea: [{ nome: "torretta di sassi", descrizione: "tre sassi piatti impilati, un po' storti", forma: "pila_di_sassi", colore: "#9A9284", grandezza: "piccola" }], modifica: [], rimuovi: [], usa: [], trova: [], umore: 0.2 };
  if (props.vista) return { vista: pick(["Una goccia scende piano lungo un filo d'erba.", "Il riflesso cambia forma quando passa una nuvola.", "C'è un piccolo segno che prima non avevi notato."]) };
  if (props.note) return { note: "Kōki ha passato la giornata tra casa e piazza. Ha osservato a lungo e cercato piccole cose. Sembra tranquillo.", tratti: [{ tratto: "curiosità", come: "ha osservato tre volte la stessa cosa" }, { tratto: "testardaggine", come: "non osservato" }], tratti_nuovi: [{ nome: "abitudinario", fatto: "torna sempre nella piazza a metà giornata" }], domanda: "Perché torna sempre nella piazza?" };
  if (props.evento !== undefined && props.registro) return { luogo: "piazza", crea: [{ nome: "uno specchio rotondo", descrizione: "uno specchio appoggiato a un sasso, riflette il cielo", forma: "altro", colore: "#C9D6DF", grandezza: "piccola" }], evento: "", ovunque: false, registro: "È comparso uno specchio rotondo nella piazza." };
  if (props.diario) return { diario: "Oggi ho camminato tanto. Ho trovato cose piccole e belle e le ho messe sulla mensola. Domani voglio tornare sulla collina.", domani: "tornare sulla collina", aggiungi_gusto: "mi piace il rumore delle onde" };
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
  if (b.curiosita > .5) {
    const where = pick(Object.keys(PLACES).filter((k) => k !== S.luogo));
    return { pensiero: "Vado a vedere " + PLACES[where].nome + ".", mosse: [{ azione: "vai", oggetto: where, minuti: 10, perche: "curiosità" }, { azione: "cerca", minuti: 20, perche: "magari trovo qualcosa" }] };
  }
  return { pensiero: "Mi guardo intorno.", mosse: [{ azione: "osserva", oggetto: "quello che ho intorno", minuti: 20, perche: "mi piace guardare" }] };
}

// Il Mondo: un narratore imparziale che decide cosa succede davvero quando Kōki prova a fare qualcosa di libero.
export function narratorPrompt(S, W, ctx, intento, perche) {
  const p = PLACES[S.luogo];
  const system = [
    "Sei il Mondo dell'isola di Kōki: un narratore imparziale e coerente, come il master di un gioco di ruolo. Non sei Kōki e non lo guidi: decidi solo cosa succede davvero quando prova a fare qualcosa.",
    "Kōki è un piccolo spirito alto come un gatto, con una testa grande, braccini corti e poca forza. Può usare solo le cose che porta con sé o che ci sono davvero nel posto dove si trova.",
    "Regole: sii plausibile e concreto. A volte riesce, a volte no, a volte succede qualcosa di inatteso ma sensato. Non inventare persone o animali parlanti. Può segnare, sporcare, decorare o rompere piccole parti degli edifici, ma non distruggerli. Le cose che crea sono piccole, fatte con materiali semplici.",
    "Segreti dell'isola che non devi mai risolvere né spiegare: " + SEGRETI.join(" "),
    "Scrivi in italiano, in modo semplice."
  ].join("\n");
  const user = [
    `Ora: ${ctx.ora}, ${ctx.stagione}, ${ctx.meteo}, ${ctx.notte ? "notte" : "giorno"}.`,
    `Luogo: ${p.nome}. ${p.desc}`,
    ctx.oggettiQui.length ? "Cose già presenti qui (con il loro numero):\n" + ctx.oggettiQui.map((o) => `- [${o.id}] ${o.nome}: ${o.descrizione}${o.rotto ? " (rotto)" : ""}`).join("\n") : "Qui non c'è niente di costruito o cambiato.",
    `Cose che Kōki porta con sé: ${S.inventario.length ? S.inventario.join(", ") : "niente"}.`,
    `Kōki prova a fare questo: "${intento}". Perché: "${perche || "non lo dice"}".`,
    "Se Kōki disegna, dipinge, incide o traccia qualcosa (su carta, su un sasso, sulla sabbia, su un muro...) e ci riesce, compila anche disegno: soggetto (titolo breve in italiano) e descrizione_immagine (in inglese, al massimo 30 parole: cosa si vede nel disegno e con che materiale).",
    "Decidi cosa succede. Rispondi con: riuscito (vero o falso); racconto (1-3 frasi in terza persona, quello che succede davvero); ricordo (1-2 frasi in prima persona, come Kōki se lo ricorderà); crea (cose nuove che restano in questo posto, solo se ha senso: nome, descrizione breve, forma scelta tra " + FORME.join(", ") + ", colore in esadecimale, grandezza piccola, media o grande); modifica (cose già presenti che cambiano: numero, nuova descrizione, rotto vero o falso); rimuovi (numeri delle cose che spariscono); usa (cose che Kōki porta con sé e che consuma, scritte esattamente come sopra); trova (cose nuove che Kōki raccoglie e si porta via); umore (da -0.5 a 0.5, come si sente dopo)."
  ].join("\n\n");
  return {
    system, user,
    schema: {
      type: "object",
      properties: {
        riuscito: { type: "boolean" }, racconto: { type: "string" }, ricordo: { type: "string" },
        crea: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, descrizione: { type: "string" }, forma: { type: "string", enum: FORME }, colore: { type: "string" }, grandezza: { type: "string", enum: ["piccola", "media", "grande"] } }, required: ["nome", "descrizione", "forma"] } },
        modifica: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, descrizione: { type: "string" }, rotto: { type: "boolean" } }, required: ["id"] } },
        rimuovi: { type: "array", items: { type: "integer" } },
        usa: { type: "array", items: { type: "string" } },
        trova: { type: "array", items: { type: "string" } },
        umore: { type: "number" },
        disegno: { type: "object", properties: { soggetto: { type: "string" }, descrizione_immagine: { type: "string" } }, required: ["soggetto"] }
      },
      required: ["riuscito", "racconto", "ricordo"]
    }
  };
}
