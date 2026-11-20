// Il mondo di Kōki: la prima isola, i suoi luoghi e le sue stranezze.
// Ogni luogo ha una "scheda" che il cervello legge (nome, descrizione, dettagli da osservare,
// piccole cose da trovare) e le coordinate che la pagina 3D usa per disegnarlo.

export const PLACES = {
  casa: {
    nome: "la casa", x: -5.5, z: -2.5,
    desc: "La tua casetta di legno con il tetto tondo. Dentro c'è una mensola dove puoi tenere le cose che trovi.",
    dettagli: ["La porta cigola un po' quando la apri.", "Dalla finestra si vede il laghetto.", "Sulla mensola c'è ancora spazio.", "Il tetto è coperto di muschio verde."],
    cose: [], coperto: true
  },
  piazza: {
    nome: "la piazzetta", x: 0, z: 1,
    desc: "Uno spiazzo di pietre piatte al centro dell'isola, da cui partono tutti i sentieri.",
    dettagli: ["Tra le pietre crescono ciuffi d'erba.", "Da qui si vedono quasi tutti i posti dell'isola.", "Una pietra è più liscia delle altre, come se qualcuno ci si sedesse spesso."],
    cose: ["sassolino colorato", "bottone perso"]
  },
  laghetto: {
    nome: "il laghetto", x: 4.5, z: -1.5,
    desc: "Un piccolo lago tondo con un ponticello di legno che lo attraversa. A volte i pesci saltano.",
    dettagli: ["Dal ponticello ti vedi riflesso nell'acqua.", "Un pesce arancione nuota sotto il ponte.", "Le ninfee si chiudono quando fa sera.", "L'acqua è così ferma che sembra uno specchio."],
    cose: ["sasso piatto", "piuma bianca", "conchiglia di lago"]
  },
  giardino: {
    nome: "il giardino dei fiori", x: -4, z: 4.5,
    desc: "Un giardino pieno di fiori di tanti colori, dove volano le farfalle.",
    dettagli: ["Una farfalla gialla si è posata su un fiore viola.", "I fiori profumano di più dopo la pioggia.", "Ci sono fiori che non hai mai visto da nessun'altra parte.", "Le api ronzano piano."],
    cose: ["petalo secco", "seme a elica", "sassolino rosa"]
  },
  bosco: {
    nome: "il bosco", x: -7, z: -7,
    desc: "Un boschetto fitto di alberi alti. Sotto le chiome è sempre un po' più buio.",
    dettagli: ["Le chiome fanno passare solo pezzetti di luce.", "Si sente un picchio da qualche parte.", "C'è un albero con un buco a forma di cuore.", "Il terreno è morbido di foglie."],
    cose: ["pigna", "ghianda col cappello", "piuma a righe", "foglia rossa"]
  },
  collina: {
    nome: "la collina", x: 6, z: -7.5,
    desc: "Il punto più alto dell'isola. In cima c'è un vecchio telescopio, e da qui il cielo sembra più vicino.",
    dettagli: ["Da quassù si vede tutto il mare intorno.", "Il vento qui è più forte.", "L'erba è bassa e piena di trifogli."],
    cose: ["sassolino luccicante", "trifoglio"]
  },
  spiaggia: {
    nome: "la spiaggia", x: 1.5, z: 8.5,
    desc: "Una spiaggia di sabbia chiara dove arrivano le onde. Il mare porta spesso piccole cose.",
    dettagli: ["Le onde lasciano disegni sulla sabbia.", "La sabbia è tiepida.", "In lontananza si vedono altre isole, piccole e blu.", "Un granchio corre di lato."],
    cose: ["conchiglia a spirale", "vetro di mare", "sasso liscio", "stella marina secca"]
  },
  molo: {
    nome: "il molo", x: 7.5, z: 6,
    desc: "Un molo di legno che entra nel mare. Da qui partirà un giorno il traghetto per le altre isole.",
    dettagli: ["Le assi del molo scricchiolano.", "L'acqua sotto il molo è molto profonda e scura.", "Ci sono vecchie corde arrotolate.", "I gabbiani si posano sui pali."],
    cose: ["pezzo di corda", "chiodo arrugginito", "conchiglia piatta"]
  }
};

// Dove può comparire il gatto di pietra (si sposta di notte, quando nessuno guarda).
export const CAT_SPOTS = ["piazza", "laghetto", "giardino", "bosco", "spiaggia", "molo", "collina"];

// I pezzi che mancano al telescopio, e dove sono nascosti.
export const TELESCOPE_PARTS = { lente: "spiaggia", vite: "bosco", manovella: "molo" };

// Il catalogo delle azioni: è tutto ciò che Kōki può fare. Il cervello sceglie solo da qui.
export const ACTIONS = {
  vai: "vai <luogo>: cammini fino a un altro luogo dell'isola",
  osserva: "osserva <cosa>: guardi con attenzione qualcosa che c'è dove sei (o il cielo)",
  cerca: "cerca: frughi intorno a te per trovare piccole cose da collezionare",
  disegna: "disegna <soggetto>: fai un disegno di qualcosa",
  gioca: "gioca <come>: giochi con quello che c'è intorno",
  riposa: "riposa: ti siedi e riprendi un po' di energia",
  dormi: "dormi: vai a dormire (meglio a casa, quando è sera o sei stanco)",
  guarda_stelle: "guarda_stelle: di notte, guardi il cielo stellato (serve coraggio, c'è buio)",
  aggiusta_telescopio: "aggiusta_telescopio: sulla collina, provi a montare i pezzi che hai trovato",
  leggi_bottiglia: "leggi_bottiglia: se c'è una bottiglia dove sei, la apri e leggi il messaggio",
  sistema_collezione: "sistema_collezione: a casa, metti in ordine le cose che hai trovato"
};

export function dist(a, b) {
  const pa = PLACES[a], pb = PLACES[b];
  if (!pa || !pb) return 0;
  return Math.hypot(pa.x - pb.x, pa.z - pb.z);
}

export function season(month) {
  if (month === 11 || month <= 1) return "inverno";
  if (month <= 4) return "primavera";
  if (month <= 7) return "estate";
  return "autunno";
}

// Codici meteo di Open-Meteo, tradotti in parole semplici.
export function weatherWords(code) {
  if (code == null) return "tempo incerto";
  if (code === 0) return "sereno";
  if (code <= 2) return "poco nuvoloso";
  if (code === 3) return "nuvoloso";
  if (code <= 48) return "nebbia";
  if (code <= 57) return "pioggerella";
  if (code <= 67) return "pioggia";
  if (code <= 77) return "neve";
  if (code <= 82) return "rovesci";
  if (code <= 86) return "neve";
  return "temporale";
}

export function isRainy(code) { return code != null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95); }

// L'ora locale dell'isola (quella reale di Milano).
export function localTime(ms, tz) {
  const parts = new Intl.DateTimeFormat("it-IT", {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date(ms));
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  const num = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const n = (t) => parseInt((num.find((p) => p.type === t) || {}).value, 10);
  return {
    testo: `${get("weekday")} ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")}`,
    giorno: `${n("year")}-${String(n("month")).padStart(2, "0")}-${String(n("day")).padStart(2, "0")}`,
    ora: n("hour") % 24 + n("minute") / 60,
    mese: n("month") - 1
  };
}

export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// "a" + articolo: "a la spiaggia" -> "alla spiaggia", "a il bosco" -> "al bosco".
export function a(nome) {
  return nome.replace(/^la /, "alla ").replace(/^il /, "al ").replace(/^lo /, "allo ").replace(/^l'/, "all'");
}
