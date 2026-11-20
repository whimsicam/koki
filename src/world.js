// Il mondo di Kōki: la prima isola, i suoi luoghi e le sue stranezze.
// Ogni luogo ha una "scheda" che il cervello legge (nome, descrizione, dettagli da osservare,
// piccole cose da trovare) e le coordinate che la pagina 3D usa per disegnarlo.

export const PLACES = {
  casa: {
    nome: "la casa", x: 4.5, z: 12.5,
    desc: "La tua casetta tonda con il tetto di muschio e la porta azzurra. Dentro c'è una mensola dove tieni le cose che trovi.",
    dettagli: ["La porta azzurra cigola un po'.", "Dal camino esce un filo di fumo.", "Sulla mensola c'è ancora spazio.", "Davanti alla porta ci sono dei sassi piatti, uno dopo l'altro.", "Sul filo del bucato sventolano tre panni colorati."],
    cose: [], coperto: true
  },
  piazza: {
    nome: "la piazzetta", x: 0, z: 0,
    desc: "La piazza al centro dell'isola, con la fontana, le bancarelle e i lampioni. Da qui partono tutti i sentieri.",
    dettagli: ["L'acqua della fontana fa un rumore allegro.", "Le bancarelle hanno i tendoni a righe.", "Da qui si vedono quasi tutti i posti dell'isola.", "Sulla bacheca ci sono dei foglietti colorati."],
    cose: ["sassolino colorato", "bottone perso", "moneta antica"]
  },
  laghetto: {
    nome: "il laghetto", x: 0.5, z: 17.5,
    desc: "Un laghetto con le ninfee, un ponticello di legno e due anatre bianche.",
    dettagli: ["Dal ponticello ti vedi riflesso nell'acqua.", "Le anatre nuotano in fila.", "Le ninfee si chiudono quando fa sera.", "Tra le canne gracida qualcosa."],
    cose: ["sasso piatto", "piuma bianca", "conchiglia di lago"]
  },
  giardino: {
    nome: "il prato fiorito", x: -7.5, z: 6.5,
    desc: "Un prato pieno di fiori di tanti colori, con le farfalle e le arnie delle api.",
    dettagli: ["Una farfalla gialla si è posata su un fiore viola.", "I fiori profumano di più dopo la pioggia.", "Le api entrano ed escono dalle arnie.", "Ci sono fiori che non hai mai visto altrove."],
    cose: ["petalo secco", "seme a elica", "sassolino rosa"]
  },
  bosco: {
    nome: "il bosco", x: -10.5, z: -8.5,
    desc: "Una radura nel bosco con un albero enorme e vecchissimo, funghi rossi in cerchio e un tronco cavo.",
    dettagli: ["Nel tronco dell'albero vecchio c'è un buco a forma di cuore.", "I funghi crescono in cerchio, come se ballassero.", "Nel tronco cavo l'eco ripete i rumori.", "Si sente un picchio da qualche parte."],
    cose: ["pigna", "ghianda col cappello", "piuma a righe", "foglia rossa"]
  },
  collina: {
    nome: "la collina", x: -5.5, z: -17.5,
    desc: "Il punto più alto dell'isola, con una cascata. In cima c'è un vecchio telescopio su una piattaforma di pietra.",
    dettagli: ["Da quassù si vede tutto il mare intorno.", "La cascata scende fino al laghetto di sotto.", "C'è un cartello con una stella disegnata.", "Il vento qui è più forte."],
    cose: ["sassolino luccicante", "trifoglio"]
  },
  spiaggia: {
    nome: "la spiaggia", x: 4.9, z: 22.2,
    desc: "Una spiaggia di sabbia chiara dove arrivano le onde. Il mare porta spesso piccole cose.",
    dettagli: ["Le onde lasciano disegni sulla sabbia.", "La sabbia è tiepida.", "Lontano si vede il faro sul suo isolotto.", "Un granchio corre di lato."],
    cose: ["conchiglia a spirale", "vetro di mare", "sasso liscio", "stella marina secca"]
  },
  molo: {
    nome: "il molo", x: 23.4, z: 8.8,
    desc: "Un lungo molo di legno con una casetta rossa in fondo. Una barca parte e torna. Da qui un giorno partirà il traghetto per le altre isole.",
    dettagli: ["Le assi del molo scricchiolano.", "L'acqua sotto il molo è profonda e scura.", "La barca è appena tornata.", "I gabbiani si posano sui pali."],
    cose: ["pezzo di corda", "chiodo arrugginito", "conchiglia piatta"]
  },
  orologio: {
    nome: "la torre dell'orologio", x: 11, z: 5.5,
    desc: "Una torre storta con un grande orologio e degli ingranaggi che girano.",
    dettagli: ["Le lancette dell'orologio girano all'indietro.", "Gli ingranaggi fanno un ticchettio regolare.", "La torre è un po' storta, come se fosse stanca.", "Accanto c'è una clessidra enorme."],
    cose: ["ingranaggio minuscolo", "vite d'ottone"]
  },
  casetta: {
    nome: "la casetta chiusa", x: 15, z: -10.5,
    desc: "Una casetta viola e storta, con l'edera sui muri. La porta è chiusa con un lucchetto d'oro.",
    dettagli: ["Il lucchetto è chiuso. Non c'è nessuna chiave in giro.", "Dalla buca delle lettere spunta una busta, ma è incastrata.", "Se bussi, nessuno risponde.", "Dalle finestre non si vede dentro, è tutto buio."],
    dettagliNotte: ["Di notte una finestra della casetta è accesa, con una luce viola. Ma dentro non si vede nessuno."],
    cose: ["foglia d'edera", "chiodo storto"]
  },
  orto: {
    nome: "l'orto", x: -8, z: 13,
    desc: "Un orto con le file di carote, cavoli e pomodori, uno spaventapasseri e una piccola serra di vetro.",
    dettagli: ["Lo spaventapasseri dondola un po' col vento.", "Nella serra fa caldo.", "Le carote spuntano con il loro ciuffo.", "C'è un innaffiatoio blu vicino al recinto."],
    cose: ["seme di zucca", "fagiolo secco", "carota piccola"]
  },
  lanterna: {
    nome: "la lanterna di pietra", x: -17, z: 2.5,
    desc: "Una vecchia lanterna di pietra in mezzo a un cerchio di sassi coperti di muschio.",
    dettagli: ["La lanterna è fredda, ma dentro c'è un po' di cera sciolta.", "I sassi intorno sono disposti in cerchio, come se qualcuno li avesse messi apposta.", "Il muschio sui sassi è morbido."],
    cose: ["sasso muschiato", "pezzetto di cera"]
  },
  giardino_giapponese: {
    nome: "il giardino giapponese", x: 8.5, z: -16.5,
    desc: "Un giardino con un torii rosso, un bonsai, un laghetto con il ponticello e due lanterne.",
    dettagli: ["Il bonsai è piccolo ma sembra vecchissimo.", "Il torii rosso sembra una porta che non porta da nessuna parte.", "Nel laghetto nuotano i pesci rossi.", "I ciliegi cambiano colore con le stagioni."],
    cose: ["sassolino bianco", "foglia d'acero"]
  }
};

// Dove può comparire il gatto di pietra (si sposta di notte, quando nessuno guarda).
export const CAT_SPOTS = ["piazza", "laghetto", "giardino", "bosco", "spiaggia", "molo", "collina", "orto", "orologio", "lanterna", "giardino_giapponese"];

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
