// Il mondo di Kōki: la prima isola, i suoi luoghi e le sue stranezze.
// Ogni luogo ha una "scheda" che il cervello legge (nome, descrizione, dettagli da osservare,
// piccole cose da trovare) e le coordinate che la pagina 3D usa per disegnarlo.

export const PLACES = {
  casa: {
    nome: "la casa", x: 4.5, z: 12.5,
    desc: "La tua casetta tonda con il tetto di muschio e la porta azzurra. Dentro c'è una mensola dove tieni le cose che trovi.",
    dettagli: ["La porta azzurra cigola un po'.", "Dal camino esce un filo di fumo.", "Sulla mensola c'è ancora spazio.", "Davanti alla porta ci sono dei sassi piatti, uno dopo l'altro.", "Sul filo del bucato sventolano tre panni colorati."],
    cose: ["matita mozzicata", "bottone d'osso con tre buchi invece di quattro", "biglia con dentro una bollicina d'aria", "chiave minuscola senza serratura", "dente di pettine di legno"], coperto: true
  },
  piazza: {
    nome: "la piazzetta", x: 0, z: 0,
    desc: "La piazza al centro dell'isola, con la fontana, le bancarelle e i lampioni. Da qui partono tutti i sentieri.",
    dettagli: ["L'acqua della fontana fa un rumore allegro.", "Le bancarelle hanno i tendoni a righe.", "Da qui si vedono quasi tutti i posti dell'isola.", "Sulla bacheca ci sono dei foglietti colorati."],
    cose: ["moneta con un buco in mezzo", "biglietto strappato con mezza parola", "tappo di sughero morso", "perla di vetro blu"]
  },
  laghetto: {
    nome: "il laghetto", x: 0.5, z: 17.5,
    desc: "Un laghetto con le ninfee, un ponticello di legno e due anatre bianche.",
    dettagliNotte: ["Di notte nel laghetto si riflettono delle stelle che in cielo non ci sono."],
    dettagli: ["Dal ponticello ti vedi riflesso nell'acqua.", "Le anatre nuotano in fila.", "Le ninfee si chiudono quando fa sera.", "Tra le canne gracida qualcosa."],
    cose: ["sasso con una riga bianca tutt'intorno", "piuma d'anatra bagnata", "guscio di lumaca d'acqua vuoto", "canna cava che fischia"]
  },
  giardino: {
    nome: "il prato fiorito", x: -7.5, z: 6.5,
    desc: "Un prato pieno di fiori di tanti colori, con le farfalle e le arnie delle api.",
    dettagli: ["Una farfalla gialla si è posata su un fiore viola.", "I fiori profumano di più dopo la pioggia.", "Le api entrano ed escono dalle arnie.", "Ci sono fiori che non hai mai visto altrove.", "In mezzo al prato c'è una porta di legno in piedi da sola, senza muri intorno."],
    cose: ["petalo che non perde il colore", "seme a elica", "ala di farfalla trasparente", "sassolino rosa a forma di goccia"]
  },
  bosco: {
    nome: "il bosco", x: -10.5, z: -8.5,
    desc: "Una radura nel bosco con un albero enorme e vecchissimo, funghi rossi in cerchio e un tronco cavo.",
    dettagli: ["Nel tronco dell'albero vecchio c'è un buco a forma di cuore.", "I funghi crescono in cerchio, come se ballassero.", "Nel tronco cavo l'eco ripete i rumori.", "Si sente un picchio da qualche parte.", "Tra le radici dell'albero vecchio c'è una casetta piccolissima, uguale alla tua."],
    cose: ["pigna chiusa che non si apre", "ghianda con il cappello doppio", "piuma a righe", "pezzo di corteccia con un buchino"]
  },
  collina: {
    nome: "la collina", x: -5.5, z: -17.5,
    desc: "Il punto più alto dell'isola, con una cascata. In cima c'è un vecchio telescopio su una piattaforma di pietra.",
    dettagli: ["Da quassù si vede tutto il mare intorno.", "La cascata scende fino al laghetto di sotto.", "C'è un cartello con una stella disegnata.", "Il vento qui è più forte.", "A metà salita c'è un vecchio telefono nero attaccato a un palo. Non c'è nessun filo."],
    cose: ["sassolino che luccica solo al sole", "quadrifoglio con una foglia piegata", "pezzo di vetro curvo"]
  },
  spiaggia: {
    nome: "la spiaggia", x: 4.9, z: 22.2,
    desc: "Una spiaggia di sabbia chiara dove arrivano le onde. Il mare porta spesso piccole cose.",
    dettagli: ["Le onde lasciano disegni sulla sabbia.", "La sabbia è tiepida.", "Lontano si vede il faro sul suo isolotto.", "Un granchio corre di lato."],
    cose: ["conchiglia a spirale", "vetro di mare verde smerigliato", "sasso liscio con un buco", "stella marina secca con quattro braccia"]
  },
  molo: {
    nome: "il molo", x: 23.4, z: 8.8,
    desc: "Un lungo molo di legno con una casetta rossa in fondo. Una barca parte e torna. Da qui un giorno partirà il traghetto per le altre isole.",
    dettagli: ["Le assi del molo scricchiolano.", "L'acqua sotto il molo è profonda e scura.", "La barca è appena tornata.", "I gabbiani si posano sui pali."],
    cose: ["nodo di corda che nessuno sa sciogliere", "chiodo arrugginito piegato a uncino", "anello di metallo verde"]
  },
  orologio: {
    nome: "la torre dell'orologio", x: 11, z: 5.5,
    desc: "Una torre storta con un grande orologio e degli ingranaggi che girano.",
    dettagli: ["Le lancette dell'orologio girano all'indietro.", "Gli ingranaggi fanno un ticchettio regolare.", "La torre è un po' storta, come se fosse stanca.", "Accanto c'è una clessidra enorme."],
    cose: ["ingranaggio con un dente mancante", "vite d'ottone", "lancetta minuscola"]
  },
  casetta: {
    nome: "la casa stregata", x: 15, z: -10.5,
    desc: "Una casa grande e storta di legno scuro, con le finestre rotte e delle assi inchiodate sulla porta. Intorno ci sono alberi secchi e un cancelletto.",
    dettagli: ["Le assi sulla porta sono inchiodate storte, ma tra una e l'altra c'è uno spiraglio.", "Al piano di sopra una finestra è rotta.", "Il cancelletto cigola anche senza vento.", "Sul portico c'è una sedia a dondolo.", "Dal camino non esce mai fumo."],
    dettagliNotte: ["Di notte dietro le finestre si muovono delle luci bianche.", "Dalla casa arrivano dei rumori leggeri, come passi."],
    cose: ["chiodo storto", "pezzo di vetro viola", "bottone nero lucido"]
  },
  orto: {
    nome: "l'orto", x: -8, z: 13,
    desc: "Un orto con le file di carote, cavoli e pomodori, uno spaventapasseri e una piccola serra di vetro.",
    dettagli: ["Lo spaventapasseri dondola un po' col vento.", "Nella serra fa caldo.", "Le carote spuntano con il loro ciuffo.", "C'è un innaffiatoio blu vicino al recinto."],
    cose: ["seme di zucca nero", "fagiolo a macchie", "carota storta con due punte"]
  },
  pozzo: {
    nome: "il pozzo", x: -17, z: 2.5,
    desc: "Un vecchio pozzo di pietra in mezzo all'erba alta, con un tettuccio di legno, una corda e un secchio.",
    dettagli: ["Dal fondo del pozzo sale un'aria fredda.", "Se ti avvicini, dal fondo si sente un respiro lento.", "La corda è bagnata, ma il secchio è sempre vuoto.", "L'erba intorno al pozzo è schiacciata in cerchio.", "Il fondo non si vede."],
    cose: ["sasso freddo e liscio", "moneta verde di muschio"]
  },
  giardino_giapponese: {
    nome: "il giardino giapponese", x: 8.5, z: -16.5,
    desc: "Un giardino con un torii rosso, un bonsai, un laghetto con il ponticello e due lanterne.",
    dettagli: ["Il bonsai è piccolo ma sembra vecchissimo.", "Il torii rosso sembra una porta che non porta da nessuna parte.", "Nel laghetto nuotano i pesci rossi.", "I ciliegi cambiano colore con le stagioni."],
    cose: ["sassolino bianco perfettamente tondo", "foglia d'acero rossa", "campanellino senza batacchio"]
  }
};

// Dove può comparire il gatto di pietra (si sposta di notte, quando nessuno guarda).
export const CAT_SPOTS = ["piazza", "laghetto", "giardino", "bosco", "spiaggia", "molo", "collina", "orto", "orologio", "pozzo", "giardino_giapponese"];

// I pezzi che mancano al telescopio, e dove sono nascosti.
export const TELESCOPE_PARTS = { lente: "spiaggia", vite: "bosco", manovella: "molo" };

// Il catalogo delle azioni: è tutto ciò che Kōki può fare. Il cervello sceglie solo da qui.
export const ACTIONS = {
  vai: "vai <luogo>: cammini fino a un altro luogo dell'isola",
  osserva: "osserva <cosa>: guardi con attenzione qualcosa che c'è dove sei: una cosa, un dettaglio, l'acqua, gli alberi, il cielo, le stelle...",
  cerca: "cerca: frughi intorno a te per trovare piccole cose da collezionare",
  riposa: "riposa: ti siedi e riprendi un po' di energia",
  dormi: "dormi: vai a dormire a casa (di notte; di giorno al massimo fai un pisolino)",
  aggiusta_telescopio: "aggiusta_telescopio: sulla collina, provi a montare i pezzi che hai trovato",
  leggi_bottiglia: "leggi_bottiglia: se c'è una bottiglia dove sei, la apri e leggi il messaggio",
  sistema_collezione: "sistema_collezione: a casa, metti in ordine le cose che hai trovato",
  libera: "libera <cosa fai, con parole tue>: qualunque altra cosa ti venga in mente di fare qui, anche strana o mai fatta prima"
};

// Le forme con cui il Mondo può mostrare nell'isola le cose che cambiano.
export const FORME = ["mucchio", "buca", "pila_di_sassi", "cerchio_di_sassi", "palo", "cartello", "bandierina", "scultura", "aiuola",
  "recinto", "capanna", "ponticello", "oggetto_appeso", "segno_a_terra", "scritta", "cumulo_di_foglie", "castello_di_sabbia",
  "piccola_torre", "cesto", "nido", "falo_spento", "sentiero_di_sassi", "statuetta", "altro"];

// I misteri dell'isola: il Mondo non li risolve mai.
export const SEGRETI = [
  "Nessuno vede mai il gatto di pietra muoversi: si sposta solo quando nessuno guarda.",
  "Nella casa stregata ci sono dei fantasmi che certe notti escono. Non si dice mai cosa sono né cosa vogliono: lo si capisce solo da come si comportano. Non si entra facilmente.",
  "La porta in mezzo al prato si apre, ma dall'altra parte c'è sempre lo stesso prato. Non porta da nessun'altra parte.",
  "Di notte nel laghetto si riflettono stelle che in cielo non ci sono.",
  "Certe mattine compaiono delle orme che partono dal mare. Non si scopre mai di chi sono.",
  "Dal fondo del pozzo si sente respirare. Il fondo non si vede e non ci si può scendere.",
  "Nel bosco c'è una casetta in miniatura uguale a quella di Kōki, con sulla mensola le sue stesse cose. Non si sa chi l'ha fatta.",
  "Il telefono sulla collina non ha fili. Certe notti squilla. Se si risponde c'è solo silenzio o un respiro, mai una voce.",
  "Lo spaventapasseri dell'orto ogni mattina è girato in un'altra direzione. Nessuno lo vede mai girarsi.",
  "L'orologio della torre va all'indietro e non si può aggiustare.",
  "I pezzi del telescopio (lente, vite, manovella) si trovano solo cercando nei posti giusti, non si possono costruire."
];

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
