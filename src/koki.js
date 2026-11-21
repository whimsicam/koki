// La casa di Kōki: un Durable Object con un piccolo database SQLite.
// Qui vive tutto: il corpo (bisogni), il mondo (gatto di pietra, orme, fantasmi, bottiglia, telescopio),
// la memoria (ricordi, convinzioni, pensieri aperti), il diario e le opere.
// Ogni TICK_MINUTES un "allarme" lo sveglia e gli fa vivere un turno.

import { DurableObject } from "cloudflare:workers";
import { PLACES, CAT_SPOTS, TELESCOPE_PARTS, ACTIONS, FORME, dist, season, weatherWords, isRainy, localTime, pick, a as al } from "./world.js";
import { decisionPrompt, reflectionPrompt, diaryPrompt, chatPrompt, narratorPrompt, lookPrompt, observerPrompt, stimulusPrompt, drawPrompt, dreamPrompt, interviewPrompt, DOMANDE, feelPlace, CORE, askModel, fallbackDecide } from "./mind.js";

const H = 3600000, MIN = 60000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// la vera natura dei fantasmi: scelta a caso alla nascita, nessuno la vede (nemmeno nella pagina)
const NATURE_FANTASMI = [
  "timidi e gentili: hanno più paura di Kōki di quanta lui ne abbia di loro, scappano se si avvicina troppo in fretta, e a chi è paziente lasciano piccoli regali",
  "dispettosi: spostano e nascondono le cose, ridacchiano, fanno scherzi, ma non fanno mai davvero male",
  "tristi: hanno perso qualcosa tanto tempo fa e lo cercano ogni notte, piangono piano e non parlano",
  "inquieti e un po' cattivi: seguono Kōki da lontano, bussano alla sua porta di notte, rompono le cose fragili e non vogliono che si avvicini alla loro casa"
];
const REGALI = ["una piuma bianchissima", "un bottone d'argento", "un fiore secco legato con un filo", "una biglia azzurra", "un sassolino a forma di cuore", "una chiavetta arrugginita"];
const b64 = (str) => btoa(unescape(encodeURIComponent(str)));

// il disegno di Kōki diventa un'immagine: i suoi tratti, un po' tremolanti, come a matita o pastello
function svgDisegno(tratti, supporto, seed) {
  const bg = { carta: "#FBF8EE", sasso: "#B9B5AC", sabbia: "#EAD9AE", legno: "#C49A6C", muro: "#E9E2D6", terra: "#8F6E4E" }[supporto] || "#FBF8EE";
  const col = (c) => /^#[0-9a-f]{6}$/i.test(c || "") ? c : "#5A5A5A";
  const n = (v, d) => { v = Number(v); return isFinite(v) ? Math.max(-5, Math.min(105, v)) : d; };
  const pts = (arr) => { const p = []; for (let i = 0; i + 1 < (arr || []).length && p.length < 60; i += 2) p.push([n(arr[i], 50), n(arr[i + 1], 50)]); return p; };
  const f = (x) => Math.round(x * 10) / 10;
  const out = [];
  for (const t of (tratti || []).slice(0, 40)) {
    const c = col(t.colore), w = Math.max(.6, Math.min(4, Number(t.spessore) || 1.6)) * .9, fill = t.pieno ? ` fill="${c}" fill-opacity=".5"` : "";
    const st = `stroke="${c}" stroke-width="${f(w)}"`;
    const P = pts(t.punti);
    switch (t.forma) {
      case "cerchio": out.push(`<circle cx="${f(n(t.cx, 50))}" cy="${f(n(t.cy, 50))}" r="${f(Math.abs(n(t.r, 10)))}" ${st}${fill}/>`); break;
      case "ovale": out.push(`<ellipse cx="${f(n(t.cx, 50))}" cy="${f(n(t.cy, 50))}" rx="${f(Math.abs(n(t.rx, 12)))}" ry="${f(Math.abs(n(t.ry, 8)))}" ${st}${fill}/>`); break;
      case "rettangolo": out.push(`<rect x="${f(n(t.x, 30))}" y="${f(n(t.y, 30))}" width="${f(Math.abs(n(t.w, 20)))}" height="${f(Math.abs(n(t.h, 20)))}" ${st}${fill}/>`); break;
      case "punti": for (const q of P) out.push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(w * .8)}" fill="${c}"/>`); break;
      case "curva": if (P.length > 1) { let d = `M${f(P[0][0])} ${f(P[0][1])}`; for (let i = 1; i < P.length - 1; i++) d += ` Q${f(P[i][0])} ${f(P[i][1])} ${f((P[i][0] + P[i + 1][0]) / 2)} ${f((P[i][1] + P[i + 1][1]) / 2)}`; d += ` L${f(P[P.length - 1][0])} ${f(P[P.length - 1][1])}`; out.push(`<path d="${d}" ${st}${fill}/>`); } break;
      case "scarabocchio": if (P.length > 1) { const q = []; for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 4; k++) { const u = k / 4; q.push([P[i][0] + (P[i + 1][0] - P[i][0]) * u + (k % 2 ? 2.5 : -2.5), P[i][1] + (P[i + 1][1] - P[i][1]) * u + (k % 2 ? -2 : 2)]); } q.push(P[P.length - 1]); out.push(`<polyline points="${q.map((x) => f(x[0]) + "," + f(x[1])).join(" ")}" ${st}/>`); } break;
      default: if (P.length > 1) out.push(`<polyline points="${P.map((x) => f(x[0]) + "," + f(x[1])).join(" ")}" ${st}${fill}/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512"><defs><filter id="m" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seed % 97}"/><feDisplacementMap in="SourceGraphic" scale="1.4"/></filter><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0"/></filter></defs><rect width="100" height="100" fill="${bg}"/><rect width="100" height="100" filter="url(#g)"/><g filter="url(#m)" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".88">${out.join("")}</g></svg>`;
}

export class Koki extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS stato (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS memorie (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, testo TEXT, forza REAL, tipo TEXT, luogo TEXT);
      CREATE TABLE IF NOT EXISTS convinzioni (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, testo TEXT, prove INTEGER);
      CREATE TABLE IF NOT EXISTS aperti (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, tipo TEXT, testo TEXT, chiuso INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS diario (giorno TEXT PRIMARY KEY, t INTEGER, testo TEXT);
      CREATE TABLE IF NOT EXISTS opere (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, tipo TEXT, titolo TEXT);
      CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, tipo TEXT, testo TEXT);
      CREATE TABLE IF NOT EXISTS immagini (opera INTEGER PRIMARY KEY, mime TEXT, dati TEXT);
      CREATE TABLE IF NOT EXISTS quaderno (giorno TEXT PRIMARY KEY, t INTEGER, testo TEXT, tratti TEXT, domanda TEXT, numeri TEXT);
      CREATE TABLE IF NOT EXISTS tratti_nuovi (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, prove INTEGER, primo TEXT, ultimo TEXT, fatti TEXT);
      CREATE TABLE IF NOT EXISTS interventi (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, testo TEXT, luogo TEXT, registro TEXT);
      CREATE TABLE IF NOT EXISTS temi (nome TEXT PRIMARY KEY, peso REAL, n INTEGER, tipo TEXT, primo INTEGER, ultimo INTEGER);
      CREATE TABLE IF NOT EXISTS legami (a TEXT, b TEXT, peso REAL, n INTEGER, PRIMARY KEY (a, b));
      CREATE TABLE IF NOT EXISTS sogni (giorno TEXT PRIMARY KEY, t INTEGER, sogno TEXT, frammento TEXT);
      CREATE TABLE IF NOT EXISTS interviste (giorno TEXT PRIMARY KEY, t INTEGER, risposte TEXT);
      CREATE TABLE IF NOT EXISTS umori (t INTEGER, umore REAL, luogo TEXT);
      CREATE TABLE IF NOT EXISTS oggetti (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, luogo TEXT, nome TEXT, descrizione TEXT, forma TEXT, colore TEXT, grandezza TEXT, rotto INTEGER DEFAULT 0, slot INTEGER);
    `);
    try { this.sql.exec("ALTER TABLE aperti ADD COLUMN forza REAL DEFAULT 0.5"); } catch (e) { /* c'è già */ }
    for (const c of ["gioia", "meraviglia", "tristezza", "energia"]) { try { this.sql.exec(`ALTER TABLE umori ADD COLUMN ${c} REAL`); } catch (e) { /* c'è già */ } }
  }

  speed() { return parseFloat(this.env.SPEED) || 1; } // solo per le prove: accelera il tempo delle azioni

  // ---------- stato ----------
  get(k) { const r = this.sql.exec("SELECT v FROM stato WHERE k = ?", k).toArray(); return r.length ? JSON.parse(r[0].v) : null; }
  put(k, v) { this.sql.exec("INSERT INTO stato (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, JSON.stringify(v)); }

  init(now) {
    let S = this.get("S"), W = this.get("W");
    if (!S) {
      S = {
        nato: now, ultimoTurno: now, luogo: "casa", umore: .3, dorme: false,
        corpo: { energia: .85, curiosita: .6, espressione: .3, socialita: .3, paura: 0 },
        attivita: null, coda: [], pensiero: "Dove sono? Che posto è questo?", esito: "",
        novita: ["Ti sei appena svegliato per la prima volta, nella tua casetta. Non conosci ancora niente dell'isola."],
        urgente: false, inventario: [], sa: { telescopio: false }, gattoVisto: null,
        scheda: { abitudini: [], gusti: [] }, ai: { giorno: "", chiamate: 0 },
        ultimaRiflessione: now, ultimoDiario: "", eraNotte: null, meteo: null,
        coraggio: 0, luoghiEmo: {}, nomi: {}, osservati: []
      };
      this.put("S", S);
      this.logga(now, "evento", "Kōki è nato.");
      this.ricorda(now, "Mi sono svegliato per la prima volta, in una casetta di legno.", .9, "casa", "lunga");
    }
    if (!W) {
      W = { gatto: "piazza", gattoMosso: now, bottiglia: null, bottigliaInArrivo: null, arrivo: 0,
            telescopio: { mancanti: ["lente", "vite", "manovella"], montati: [], aggiustato: false } };
      this.put("W", W);
    }
    // campi arrivati dopo: si aggiungono senza toccare il resto
    S.emo = S.emo || { gioia: .4, meraviglia: .4, tristezza: .1 };
    S.stats = S.stats || {};
    if (S.luogo === "lanterna") S.luogo = "pozzo";
    if (!W.fantasmi) { W.fantasmi = { natura: pick(NATURE_FANTASMI), fuori: false, luogo: "casetta", notte: "" }; this.put("W", W); }
    W.nascosti = W.nascosti || [];
    if (W.gatto === "lanterna") W.gatto = "pozzo";
    return { S, W };
  }

  async ensureAlarm() {
    const a = await this.ctx.storage.getAlarm();
    if (!a) await this.ctx.storage.setAlarm(Date.now() + 5000);
  }

  async alarm() {
    try { await this.turno(); }
    catch (e) { this.logga(Date.now(), "errore", String(e && e.message || e).slice(0, 300)); }
    const every = (parseFloat(this.env.TICK_MINUTES) || 5) * MIN;
    await this.ctx.storage.setAlarm(Date.now() + every);
  }

  // ---------- memoria ----------
  ricorda(t, testo, forza, luogo, tipo) {
    this.sql.exec("INSERT INTO memorie (t, testo, forza, tipo, luogo) VALUES (?, ?, ?, ?, ?)", t, String(testo).slice(0, 400), forza, tipo || "breve", luogo || "");
  }
  logga(t, tipo, testo) {
    this.sql.exec("INSERT INTO log (t, tipo, testo) VALUES (?, ?, ?)", t, tipo, String(testo).slice(0, 500));
    this.sql.exec("DELETE FROM log WHERE id <= (SELECT MAX(id) - 300 FROM log)");
  }
  aggiungiAperti(t, list) {
    const open = this.sql.exec("SELECT id, testo FROM aperti WHERE chiuso = 0").toArray();
    for (const p of (list || []).slice(0, 2)) {
      if (!p || !p.testo) continue;
      const k = p.testo.toLowerCase(), same = open.find((o) => o.testo.toLowerCase() === k);
      if (same) { this.sql.exec("UPDATE aperti SET forza = MIN(1, forza + 0.2) WHERE id = ?", same.id); continue; } // ci ripensa: si rafforza
      this.sql.exec("INSERT INTO aperti (t, tipo, testo, forza) VALUES (?, ?, ?, 0.5)", t, p.tipo || "desiderio", p.testo.slice(0, 200));
      this.logga(t, "aperto", `${p.tipo}: ${p.testo}`);
    }
    // non più di 8 pensieri aperti: dimentica i più deboli
    this.sql.exec("UPDATE aperti SET chiuso = 2 WHERE chiuso = 0 AND id NOT IN (SELECT id FROM aperti WHERE chiuso = 0 ORDER BY forza DESC, id DESC LIMIT 8)");
  }
  ricordiRilevanti(S, n) {
    const rows = this.sql.exec("SELECT id, t, testo, forza, tipo, luogo FROM memorie ORDER BY id DESC LIMIT 80").toArray();
    const now = Date.now();
    rows.forEach((r) => { r.score = r.forza + (r.luogo === S.luogo ? .25 : 0) + Math.max(0, .4 - (now - r.t) / (24 * H) * .2) + (r.tipo === "lunga" ? .1 : 0) + Math.random() * .15; });
    return rows.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.t - b.t);
  }
  pulisciMemoria() {
    this.sql.exec("UPDATE temi SET peso = peso * 0.985"); this.sql.exec("UPDATE legami SET peso = peso * 0.985");
    this.sql.exec("DELETE FROM temi WHERE peso < 0.25 AND n < 3"); this.sql.exec("DELETE FROM legami WHERE peso < 0.2");
    // i pensieri a cui non ripensa sbiadiscono, e alla fine li dimentica
    this.sql.exec("UPDATE aperti SET forza = forza * 0.93 WHERE chiuso = 0");
    for (const a of this.sql.exec("SELECT id, testo FROM aperti WHERE chiuso = 0 AND forza < 0.12").toArray()) { this.sql.exec("UPDATE aperti SET chiuso = 3 WHERE id = ?", a.id); this.logga(Date.now(), "dimenticato", a.testo); }
    this.sql.exec("UPDATE memorie SET forza = forza * 0.97 WHERE tipo = 'breve'");
    this.sql.exec("DELETE FROM memorie WHERE tipo = 'breve' AND id NOT IN (SELECT id FROM memorie WHERE tipo = 'breve' ORDER BY forza DESC, id DESC LIMIT 40)");
    this.sql.exec("DELETE FROM memorie WHERE tipo = 'lunga' AND id NOT IN (SELECT id FROM memorie WHERE tipo = 'lunga' ORDER BY forza DESC, id DESC LIMIT 100)");
  }

  // ---------- tempo e meteo (quelli veri di Milano) ----------
  async aggiornaMeteo(S, now) {
    if (S.meteo && now - S.meteo.t < 55 * MIN) return;
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${this.env.LAT}&longitude=${this.env.LON}&current=temperature_2m,weather_code,cloud_cover,is_day&timezone=${encodeURIComponent(this.env.TIMEZONE)}`;
      const r = await fetch(u, { cf: { cacheTtl: 600 } });
      const j = await r.json();
      S.meteo = { t: now, code: j.current.weather_code, temp: j.current.temperature_2m, nuvole: j.current.cloud_cover, giorno: j.current.is_day === 1 };
    } catch (e) {
      if (!S.meteo) S.meteo = { t: now, code: null, temp: null, nuvole: 50, giorno: null };
      else S.meteo.t = now - 45 * MIN; // riprova tra poco
    }
  }
  tempo(S, now) {
    const lt = localTime(now + (parseFloat(this.env.OFFSET_ORE) || 0) * H, this.env.TIMEZONE || "Europe/Rome"); // OFFSET_ORE: solo per le prove
    const m = this.env.OFFSET_ORE ? {} : (S.meteo || {});
    const notteOra = lt.ora < 7 || lt.ora >= 18.5;
    const notte = m.giorno == null || now - (m.t || 0) > 2 * H ? notteOra : !m.giorno;
    const parole = weatherWords(m.code) + (m.temp != null ? `, ${Math.round(m.temp)}°C` : "");
    return { ora: lt.testo, ora24: lt.ora, giorno: lt.giorno, mese: lt.mese, stagione: season(lt.mese), notte, meteo: parole, pioggia: isRainy(m.code), nuvole: m.nuvole == null ? 50 : m.nuvole };
  }

  // ---------- il mondo che cambia da solo ----------
  mondo(S, W, T, now) {
    // il gatto di pietra si sposta di notte, ma solo se nessuno lo sta guardando
    if (T.notte && now - W.gattoMosso > 14 * H && (S.dorme || S.luogo !== W.gatto)) {
      W.gatto = pick(CAT_SPOTS.filter((s) => s !== W.gatto));
      W.gattoMosso = now;
      this.logga(now, "mondo", "Di notte, il gatto di pietra si è spostato: " + PLACES[W.gatto].nome + ".");
    }
    const giorni = Math.max(1, Math.ceil((now - S.nato) / (24 * H)));
    // le orme: certe mattine partono dal mare e arrivano in un posto dell'isola (a volte fino alla sua porta)
    if (!T.notte && T.ora24 >= 6 && T.ora24 < 11 && W.ormeGiorno !== T.giorno) {
      W.ormeGiorno = T.giorno;
      if (Math.random() < .3) {
        const a = Math.random() < .25 ? "casa" : pick(Object.keys(PLACES).filter((k) => k !== "spiaggia" && k !== "casa"));
        W.orme = { a, giorno: T.giorno };
        this.logga(now, "mondo", `Stamattina ci sono delle orme che partono dal mare e arrivano fino ${al(PLACES[a].nome)}.`);
        if (S.luogo === "casa" && a === "casa" && !S.dorme && Math.random() < .7) { S.novita.push("Davanti alla porta finiscono delle orme che non sono tue. Vengono dalla spiaggia."); S.ormeViste = T.giorno; S.urgente = true; }
      }
    }
    if (W.orme && (T.ora24 >= 18 || T.pioggia || W.orme.giorno !== T.giorno)) W.orme = null;
    // lo spaventapasseri: ogni mattina guarda da un'altra parte, e sempre più spesso verso la casa di Kōki
    if (!T.notte && T.ora24 >= 6 && W.spaGiorno !== T.giorno) {
      W.spaGiorno = T.giorno;
      W.spaventa = Math.random() < Math.min(.85, .12 + giorni * .04) ? "casa" : pick(Object.keys(PLACES).filter((k) => k !== "orto" && k !== "casa"));
      this.logga(now, "mondo", `Stamattina lo spaventapasseri è girato verso ${PLACES[W.spaventa].nome}.`);
    }
    // il telefono sulla collina: certe notti squilla
    if (T.notte && T.ora24 >= 22 && W.telNotte !== T.giorno) {
      W.telNotte = T.giorno;
      if (Math.random() < .12) {
        W.telefono = true; W.telefonoFino = now + 40 * MIN / this.speed();
        this.logga(now, "mondo", "Sulla collina il telefono sta squillando.");
        if (!S.dorme && ["collina", "bosco", "giardino_giapponese", "pozzo"].includes(S.luogo)) { S.novita.push("Da lontano, dalla collina, si sente un telefono che squilla."); S.urgente = true; }
      }
    }
    if (W.telefono && now > (W.telefonoFino || 0)) W.telefono = false;
    // i fantasmi della casa stregata: certe notti escono
    const F = W.fantasmi, nat = NATURE_FANTASMI.indexOf(F.natura);
    if (T.notte && T.ora24 >= 21 && F.notte !== T.giorno) {
      F.notte = T.giorno; F.fuori = Math.random() < .45; F.evento = F.fuori && Math.random() < .5; F.fatto = false;
      if (F.fuori) {
        F.luogo = Math.random() < .55 ? "casetta" : pick(nat === 3 ? ["casa", "orologio", "giardino_giapponese", "piazza"] : ["orologio", "giardino_giapponese", "molo", "piazza"]);
        this.logga(now, "mondo", `Stanotte i fantasmi sono usciti dalla casa stregata: si vedono ${al(PLACES[F.luogo].nome)}.`);
      }
    }
    if (!T.notte && F.fuori) F.fuori = false;
    if (F.fuori && !S.dorme && S.luogo === F.luogo && S.fantasmiVisti !== F.notte) {
      S.fantasmiVisti = F.notte;
      S.novita.push(["Delle figure bianche e trasparenti fluttuano tra gli alberi. Appena ti muovi, si nascondono.", "Delle figure bianche e trasparenti fluttuano qui intorno. Si sente una risatina, poi più niente.", "Delle figure bianche e trasparenti fluttuano piano, a testa bassa, come se cercassero qualcosa per terra.", "Delle figure bianche e trasparenti sono ferme e ti guardano. Non si muovono."][nat] || "Delle figure bianche e trasparenti fluttuano qui intorno.");
      S.urgente = true; S.corpo.paura = clamp(S.corpo.paura + .25, 0, 1); S.emo.meraviglia = clamp(S.emo.meraviglia + .2, 0, 1);
    }
    if (nat === 2 && F.fuori && !S.dorme && S.luogo !== F.luogo && S.piantoSentito !== F.notte && Math.random() < .15) { S.piantoSentito = F.notte; S.novita.push("Da lontano, dalla parte della casa stregata, arriva un pianto sottile."); }
    // la bottiglia del Custode arriva dalle onde
    if (W.bottigliaInArrivo && now >= W.arrivo) {
      W.bottiglia = W.bottigliaInArrivo; W.bottigliaInArrivo = null;
      this.logga(now, "mondo", "Una bottiglia è arrivata sulla spiaggia.");
      if (!S.dorme && ["spiaggia", "molo", "collina"].includes(S.luogo)) { S.novita.push("Sulla riva della spiaggia luccica qualcosa: sembra una bottiglia!"); S.urgente = true; }
    }
    // il buio e la pioggia sono notizie, se sei fuori
    if (S.eraNotte !== null && T.notte !== S.eraNotte && !S.dorme) {
      S.novita.push(T.notte ? "Sta facendo buio." : "Sta facendo giorno.");
      if (T.notte && !PLACES[S.luogo].coperto) S.urgente = true;
    }
    S.eraNotte = T.notte;
    if (T.pioggia && !S.pioveva && !S.dorme && !PLACES[S.luogo].coperto) { S.novita.push("Ha cominciato a piovere."); S.urgente = true; }
    S.pioveva = T.pioggia;
  }

  // quello che i fantasmi hanno fatto mentre dormiva: lo scopre al risveglio
  notteFantasmi(S, W, T, now) {
    const F = W.fantasmi, nat = NATURE_FANTASMI.indexOf(F.natura);
    if (!F.evento || F.fatto) return;
    F.fatto = true;
    if (nat === 0) { const r = pick(REGALI); S.inventario.push(r); S.novita.push(`Davanti alla porta c'è ${r}. Ieri sera non c'era.`); this.logga(now, "mondo", `Stanotte qualcuno ha lasciato ${r} davanti alla porta di Kōki.`); }
    else if (nat === 1 && S.inventario.length) { const i = Math.floor(Math.random() * S.inventario.length), c = S.inventario.splice(i, 1)[0], dove = pick(Object.keys(PLACES).filter((k) => k !== "casa")); W.nascosti.push({ cosa: c, luogo: dove }); S.novita.push(`Sulla mensola manca ${c}. Eppure ieri era lì.`); this.logga(now, "mondo", `Stanotte qualcuno ha preso ${c} dalla mensola e l'ha nascosto ${al(PLACES[dove].nome)}.`); }
    else if (nat === 2) { S.novita.push("Stanotte, nel sonno, hai sentito qualcuno piangere piano fuori dalla finestra."); this.logga(now, "mondo", "Stanotte qualcuno ha pianto davanti alla casa di Kōki."); }
    else if (nat === 3) { S.novita.push("Stanotte qualcuno ha bussato alla porta tre volte. Quando hai guardato fuori, non c'era nessuno."); S.coraggio = clamp((S.coraggio || 0) - .03, 0, 1); this.logga(now, "mondo", "Stanotte qualcuno ha bussato tre volte alla porta di Kōki."); }
  }

  conta(S, k, n) { S.stats = S.stats || {}; S.stats[k] = (S.stats[k] || 0) + (n == null ? 1 : n); }
  emoziona(S, d) { for (const k of Object.keys(d)) S.emo[k] = clamp((S.emo[k] || 0) + d[k], 0, 1); }

  // ---------- il corpo: numeri, nessun modello ----------
  corpo(S, T, dtH) {
    const b = S.corpo;
    if (S.dorme) b.energia += .13 * dtH; else b.energia -= .04 * dtH;
    if (!S.dorme) { b.curiosita += .09 * dtH; b.espressione += .05 * dtH; b.socialita += .03 * dtH; }
    const fuori = !PLACES[S.luogo].coperto;
    const cor = S.coraggio || 0;
    const target = !T.notte || S.dorme ? 0 : fuori ? .55 * (1 - cor * .8) : .12 * (1 - cor);
    b.paura += (target - b.paura) * Math.min(1, dtH * 3);
    // il coraggio cresce piano se resta fuori al buio senza scappare (abitudine)
    if (T.notte && fuori && !S.dorme) S.coraggio = clamp(cor + .015 * dtH, 0, 1);
    for (const k of Object.keys(b)) b[k] = clamp(b[k], 0, 1);
    const base = .25 - b.paura * .4 - (b.energia < .25 ? .2 : 0) - (b.socialita > .75 ? .15 : 0) - (T.pioggia && fuori ? .1 : 0);
    S.umore = clamp(S.umore + (base - S.umore) * Math.min(1, dtH * .3), -1, 1);
    // le emozioni tornano piano verso la calma
    const k = Math.min(1, dtH * .12), calma = { gioia: .35 + S.umore * .2, meraviglia: .25, tristezza: .08 - Math.min(0, S.umore) * .2 };
    for (const e of Object.keys(calma)) S.emo[e] = clamp(S.emo[e] + (calma[e] - S.emo[e]) * k, 0, 1);
  }

  // ---------- le azioni ----------
  avvia(S, W, m, now, T) {
    const az = m.azione, ogg = (m.oggetto || "").toString().trim();
    let min = clamp(parseInt(m.minuti, 10) || 15, 5, 30);
    const needs = (luogo) => { if (S.luogo !== luogo) { S.coda.unshift(m); this.avvia(S, W, { azione: "vai", oggetto: luogo, minuti: 10, perche: "per " + az.replace("_", " ") }, now, T); return true; } return false; };
    if (!ACTIONS[az] && az !== "guarda_stelle") return false;
    if (az === "vai") {
      const key = this.trovaLuogo(ogg);
      if (!key || key === S.luogo) return false;
      min = Math.max(3, Math.round(dist(S.luogo, key) * 0.5));
      S.attivita = { azione: "vai", oggetto: key, da: S.luogo, a: key, inizio: now, fine: now + min * MIN / this.speed(), perche: m.perche || "" };
      this.logga(now, "azione", this.frase("va verso " + PLACES[key].nome, m.perche));
      return true;
    }
    if (az === "dormi" && needs("casa")) return true;
    if (az === "aggiusta_telescopio" && needs("collina")) return true;
    if (az === "sistema_collezione" && needs("casa")) return true;
    if (az === "leggi_bottiglia") { if (!W.bottiglia) return false; if (needs("spiaggia")) return true; }
    if (az === "guarda_stelle") m = { ...m, azione: "osserva", oggetto: T.notte ? "le stelle" : "il cielo" };
    if (az === "libera" && ogg.length < 4) return false;
    if (az === "dormi" && T.ora24 >= 6 && T.ora24 < 23.5 && S.corpo.energia >= .15) { m = { ...m, azione: "riposa", oggetto: "un pisolino" }; min = Math.min(min, 30); }
    else if (az === "dormi") { S.dorme = true; S.addormentato = now; min = 8 * 60; }
    S.attivita = { azione: m.azione, oggetto: m.oggetto ? String(m.oggetto).trim() : ogg, luogo: S.luogo, inizio: now, fine: now + min * MIN / this.speed(), perche: m.perche || "", u0: S.umore };
    this.logga(now, "azione", this.frase(this.descriviAzione(S.attivita), m.perche));
    return true;
  }

  trovaLuogo(s) {
    s = (s || "").toLowerCase();
    if (PLACES[s]) return s;
    for (const [k, p] of Object.entries(PLACES)) if (s.includes(k) || s.includes(p.nome.replace(/^(la|il|lo|l') ?/, ""))) return k;
    return null;
  }

  // "Cerca piccole cose — perché mi incuriosisce"
  frase(cosa, perche) {
    const c = String(cosa || "").trim(), p = String(perche || "").trim().replace(/[.\s]+$/, "");
    return (c.charAt(0).toUpperCase() + c.slice(1)) + (p ? " — " + p.charAt(0).toLowerCase() + p.slice(1) : "");
  }
  descriviAzione(a) {
    if (!a) return "niente";
    const o = a.oggetto ? " " + a.oggetto : "";
    return { vai: "cammina verso " + (PLACES[a.a] || {}).nome, osserva: "osserva" + o, cerca: "cerca piccole cose", disegna: "disegna" + o, gioca: "gioca" + (o ? " (" + a.oggetto + ")" : ""),
             libera: (() => { const t = (a.oggetto || "fa qualcosa di suo").replace(/^(provo a |voglio |vorrei |adesso |ora )/i, "").replace(/\.$/, ""); return /^\S+(are|ere|ire|rre)\b/i.test(t) ? "prova a " + t : t; })(), riposa: "si riposa", dormi: "dorme", guarda_stelle: "guarda le stelle", aggiusta_telescopio: "prova ad aggiustare il telescopio", leggi_bottiglia: "apre la bottiglia", sistema_collezione: "sistema la sua collezione" }[a.azione] || a.azione;
  }

  async concludi(S, W, T, now) {
    const a = S.attivita, b = S.corpo, P = PLACES[S.luogo], ogg = (a.oggetto || "").toLowerCase();
    let esito = "", forza = .3;
    switch (a.azione) {
      case "vai": {
        S.luogo = a.a;
        esito = `Sono arrivato ${al(PLACES[a.a].nome)}.`;
        b.curiosita -= .08;
        if (W.gatto === S.luogo) {
          if (S.gattoVisto && S.gattoVisto !== S.luogo) { S.novita.push(`Il gatto di pietra adesso è qui, ${al(PLACES[S.luogo].nome)}! L'ultima volta l'avevi visto ${al(PLACES[S.gattoVisto].nome)}.`); forza = .7; }
          else if (!S.gattoVisto) S.novita.push("Qui c'è una statuetta di pietra a forma di gatto.");
          S.gattoVisto = S.luogo;
        }
        if (W.orme && (S.luogo === "spiaggia" || S.luogo === W.orme.a) && S.ormeViste !== W.orme.giorno && Math.random() < .7) { S.ormeViste = W.orme.giorno; S.novita.push(S.luogo === "spiaggia" ? `Sulla sabbia ci sono delle orme che non sono tue. Escono dal mare e vanno verso ${PLACES[W.orme.a].nome}.` : "Per terra ci sono delle orme che non sono tue. Arrivano qui dalla parte della spiaggia, e qui finiscono."); this.emoziona(S, { meraviglia: .15 }); }
        if (S.luogo === "collina" && W.telefono) S.novita.push("Il telefono sul palo sta squillando.");
        if (S.luogo === "spiaggia" && W.bottiglia) S.novita.push("Sulla riva c'è una bottiglia di vetro chiusa!");
        if (S.luogo === "collina" && !S.sa.telescopio) S.novita.push("In cima alla collina c'è un vecchio telescopio.");
        if (S.luogo === "casetta" && T.notte) S.novita.push("Dietro le finestre della casa stregata si muovono delle luci bianche.");
        if (S.luogo === "pozzo" && !S.pozzoSentito) { S.pozzoSentito = true; S.novita.push("Dal fondo del pozzo si sente un respiro lento."); }
        if (S.luogo === "bosco" && !S.miniaturaVista) { S.miniaturaVista = true; S.novita.push("Tra le radici dell'albero vecchio c'è una casetta piccolissima, uguale alla tua."); }
        if (S.luogo === "giardino" && !S.portaVista) { S.portaVista = true; S.novita.push("In mezzo al prato c'è una porta in piedi da sola, senza muri."); }
        this.conta(S, "passi"); S.stats.visti = S.stats.visti || {}; S.stats.visti[S.luogo] = (S.stats.visti[S.luogo] || 0) + 1;
        if (S.novita.length) { this.ricorda(now, esito + " " + S.novita.join(" "), forza + .1, S.luogo); S.novita.forEach((n) => this.logga(now, "nota", n)); }
        break;
      }
      case "osserva": {
        const gia = this.giaOsservato(S, ogg);
        let d = null;
        if ((ogg.includes("gatto")) && W.gatto === S.luogo) d = pick(["Il gatto di pietra ha la coda arrotolata e gli occhi socchiusi.", "Il gatto di pietra è freddo e liscio. Sotto le zampe c'è un po' di terra smossa.", "Il gatto di pietra guarda verso il mare."]);
        else if (ogg.includes("telescop") && S.luogo === "collina") {
          S.sa.telescopio = true;
          d = W.telescopio.aggiustato ? "Il telescopio funziona: dentro si vedono le stelle da vicino." : "Il telescopio è rotto: mancano " + W.telescopio.mancanti.join(", ") + ". Forse sono da qualche parte sull'isola.";
          forza = .7;
        } else if (/impront|orm/.test(ogg) && W.orme && (S.luogo === "spiaggia" || S.luogo === W.orme.a)) d = "Le orme sono tonde, un po' più grandi delle tue, con quattro dita. Sono umide. Partono dal mare.";
        else if (S.luogo === "laghetto" && T.notte && /lag|acqua|rifless|stell|cielo/.test(ogg) && !(T.nuvole > 60)) { d = "Nell'acqua del laghetto si riflettono delle stelle. Ma quando alzi gli occhi, in cielo quelle stelle non ci sono."; this.emoziona(S, { meraviglia: .25 }); forza = .75; }
        else if (/stell|cielo|luna/.test(ogg) && T.notte) {
          // le stelle: il suo amore, e il suo buio
          if (T.nuvole > 60 || T.pioggia) { d = "Il cielo è coperto: stanotte non si vede neanche una stella."; S.umore -= .05; }
          else if (b.paura > .4 && !PLACES[S.luogo].coperto && Math.random() < .35 * (1 - (S.coraggio || 0))) { d = "Ho alzato gli occhi verso le stelle, ma il buio intorno mi ha fatto troppa paura e sono scappato."; S.umore -= .1; forza = .6; S.coraggio = clamp((S.coraggio || 0) - .04, 0, 1); }
          else if (W.telescopio.aggiustato && S.luogo === "collina") { d = "Nel telescopio le stelle sono enormi e brillano di colori diversi."; S.umore += .25; forza = .7; }
          else { d = null; S.umore += .2; forza = .6; S.stelleViste = (S.stelleViste || 0) + 1; this.conta(S, "stelle"); this.emoziona(S, { meraviglia: .2, gioia: .1 }); if (!PLACES[S.luogo].coperto) S.coraggio = clamp((S.coraggio || 0) + .03, 0, 1); }
        }
        if (!d && this.oggettoQui(S, ogg)) { const o = this.oggettoQui(S, ogg); if (!gia.length) { d = `${o.nome}: ${o.descrizione}${o.rotto ? " È rotto." : ""}`; forza = .5; } }
        if (!d) d = await this.sguardo(S, T, ogg || "intorno", gia);
        esito = `Ho osservato ${a.oggetto || "intorno"}: ${d}`;
        b.curiosita -= .25 / (1 + gia.length * .5);
        this.conta(S, "osservazioni"); if (!gia.length) this.emoziona(S, { meraviglia: .06 });
        S.osservati = (S.osservati || []).concat([{ cosa: ogg || "intorno", luogo: S.luogo, t: now, vista: d.slice(0, 160) }]).slice(-40);
        this.ricorda(now, esito, forza + .05, S.luogo);
        break;
      }
      case "cerca": {
        const trovate = a.trovate || [];
        esito = trovate.length ? `Ho finito di cercare. Ho trovato: ${trovate.join(", ")}.` : "Ho cercato a lungo, ma stavolta non ho trovato niente.";
        b.curiosita -= .2;
        if (!trovate.length) this.ricorda(now, esito, .25, S.luogo);
        break;
      }
      case "disegna": {
        const t = a.oggetto || P.nome;
        this.sql.exec("INSERT INTO opere (t, tipo, titolo) VALUES (?, 'disegno', ?)", now, t.slice(0, 120));
        esito = `Ho finito un disegno: ${t}.`; b.espressione -= .5; S.umore += .08;
        this.ricorda(now, esito, .45, S.luogo);
        break;
      }
      case "gioca": esito = `Ho giocato${a.oggetto ? ": " + a.oggetto : ""}.`; b.espressione -= .3; S.umore += .1; this.ricorda(now, esito, .3, S.luogo); break;
      case "riposa": b.energia += .2 * ((a.fine - a.inizio) * this.speed() / (30 * MIN)); esito = "Mi sono riposato un po'."; break;
      case "aggiusta_telescopio": {
        const have = W.telescopio.mancanti.filter((n) => S.inventario.includes(n));
        if (!have.length) esito = "Ho guardato il telescopio, ma non ho ancora nessun pezzo da montare.";
        else {
          have.forEach((n) => { W.telescopio.montati.push(n); S.inventario.splice(S.inventario.indexOf(n), 1); });
          W.telescopio.mancanti = W.telescopio.mancanti.filter((n) => !have.includes(n));
          if (!W.telescopio.mancanti.length) { W.telescopio.aggiustato = true; esito = "Ho montato l'ultimo pezzo: IL TELESCOPIO FUNZIONA!"; forza = 1; S.umore += .5; this.logga(now, "mondo", "Kōki ha aggiustato il telescopio!"); }
          else { esito = `Ho montato: ${have.join(", ")}. Mancano ancora: ${W.telescopio.mancanti.join(", ")}.`; forza = .8; S.umore += .2; }
        }
        this.ricorda(now, esito, forza, S.luogo, forza >= .8 ? "lunga" : "breve");
        break;
      }
      case "leggi_bottiglia": {
        if (W.bottiglia && S.luogo === "spiaggia") {
          esito = `Ho aperto la bottiglia. Dentro c'era un biglietto: «${W.bottiglia}»`;
          W.bottiglia = null; S.inventario.push("bottiglia di vetro"); b.socialita -= .4; S.umore += .2;
          this.ricorda(now, esito, .85, S.luogo, "lunga");
          const prima = this.sql.exec("SELECT COUNT(*) AS n FROM aperti WHERE testo LIKE '%bottigli%'").one().n;
          if (!prima) this.aggiungiAperti(now, [{ tipo: "domanda", testo: "Chi scrive i messaggi nelle bottiglie?" }]);
        } else esito = "La bottiglia non c'era più.";
        break;
      }
      case "sistema_collezione": esito = `Ho messo in ordine la mia collezione: ${S.inventario.length} cose sulla mensola.`; S.umore += .05; this.ricorda(now, esito, .3, "casa"); break;
      default: esito = "Ho finito.";
    }
    S.esito = esito;
    this.logga(now, "esito", esito);
    for (const k of Object.keys(b)) b[k] = clamp(b[k], 0, 1);
    S.umore = clamp(S.umore, -1, 1);
  }

  // mentre cerca, ogni tanto trova qualcosa (non solo alla fine)
  tentaRicerca(S, W, now) {
    const a = S.attivita, P = PLACES[S.luogo];
    a.ultimoTentativo = now; a.trovate = a.trovate || [];
    const part = Object.entries(TELESCOPE_PARTS).find(([n, where]) => where === S.luogo && W.telescopio.mancanti.includes(n) && !S.inventario.includes(n));
    let esito = null, forza = .45;
    if (part && S.sa.telescopio && Math.random() < .3) { S.inventario.push(part[0]); a.trovate.push(part[0]); esito = `Cercando qui ho trovato... una ${part[0]}! Sembra proprio un pezzo del telescopio!`; forza = .85; S.umore += .3; }
    else if (W.nascosti && W.nascosti.some((x) => x.luogo === S.luogo) && Math.random() < .5) { const i = W.nascosti.findIndex((x) => x.luogo === S.luogo), x = W.nascosti.splice(i, 1)[0]; S.inventario.push(x.cosa); a.trovate.push(x.cosa); esito = `Ho ritrovato ${x.cosa}! Era qui, ${al(PLACES[S.luogo].nome)}. Come ci è arrivato?`; forza = .75; this.emoziona(S, { gioia: .15, meraviglia: .15 }); }
    else if (P.cose.length && Math.random() < .4) { const c = pick(P.cose); S.inventario.push(c); a.trovate.push(c); esito = `Ho trovato: ${c}.`; S.umore += .1; this.emoziona(S, { gioia: .08 }); }
    if (esito) this.conta(S, "trovate");
    if (esito) { S.esito = esito; this.ricorda(now, esito, forza, S.luogo); this.logga(now, "esito", esito); }
    S.umore = clamp(S.umore, -1, 1);
  }

  // il disegno: lo fa Kōki con le sue mani, tratto per tratto (il modello grande o piccolo sceglie i tratti)
  async disegnaKoki(S, T, now, d) {
    const ctxD = { soggetto: String(d.soggetto).slice(0, 120), idea: String(d.idea || "").slice(0, 300), supporto: d.supporto || "carta", colori: (d.colori || []).slice(0, 6) };
    let r = null;
    if (this.budgetGrande(S, T)) { try { r = await askModel(this.env, drawPrompt(S, ctxD), 1400, this.env.BIG_MODEL); } catch (e) { this.logga(now, "errore", "Il disegno (modello grande) non è venuto: " + String(e && e.message || e).slice(0, 160)); } }
    if ((!r || !Array.isArray(r.tratti) || !r.tratti.length) && this.budget(S, T, 20)) { try { r = await askModel(this.env, drawPrompt(S, ctxD), 1200); } catch (e) { this.logga(now, "errore", "Il disegno non è venuto: " + String(e && e.message || e).slice(0, 160)); } }
    if (!r || !Array.isArray(r.tratti) || !r.tratti.length) return;
    const titolo = String(r.titolo || ctxD.soggetto).slice(0, 120);
    this.sql.exec("INSERT INTO opere (t, tipo, titolo) VALUES (?, 'disegno', ?)", now, titolo);
    const opera = this.sql.exec("SELECT MAX(id) AS id FROM opere").one().id;
    this.sql.exec("INSERT OR REPLACE INTO immagini (opera, mime, dati) VALUES (?, ?, ?)", opera, "image/svg+xml", b64(svgDisegno(r.tratti, ctxD.supporto, opera)));
    this.sql.exec("DELETE FROM immagini WHERE opera NOT IN (SELECT opera FROM immagini ORDER BY opera DESC LIMIT 80)");
    this.logga(now, "disegno", `Ha fatto un disegno: «${titolo}» (${ctxD.supporto}).`);
    this.conta(S, "disegni"); this.emoziona(S, { gioia: .1 });
  }

  // i temi della sua mente: le cose a cui pensa, e quali pensa insieme
  salvaTemi(S, list, now) {
    const nomi = [...new Set((list || []).map((x) => String(x || "").toLowerCase().replace(/[^a-zà-ÿ0-9' -]/gi, "").trim().slice(0, 32)).filter((x) => x.length > 2))].slice(0, 3);
    const tipo = (x) => Object.values(PLACES).some((p) => p.nome.includes(x) || x.includes(p.nome.replace(/^(il|la|lo|l'|i|gli|le) /, ""))) ? "luogo" : S.inventario.some((c) => c.toLowerCase().includes(x)) ? "cosa" : /gioia|paura|buio|triste|felic|meravigl|solo|sola|nostalg|calma|coraggio/.test(x) ? "emozione" : "idea";
    for (const x of nomi) this.sql.exec("INSERT INTO temi (nome, peso, n, tipo, primo, ultimo) VALUES (?, 1, 1, ?, ?, ?) ON CONFLICT(nome) DO UPDATE SET peso = peso + 1, n = n + 1, ultimo = excluded.ultimo", x, tipo(x), now, now);
    for (let i = 0; i < nomi.length; i++) for (let j = i + 1; j < nomi.length; j++) { const [p, q] = [nomi[i], nomi[j]].sort(); this.sql.exec("INSERT INTO legami (a, b, peso, n) VALUES (?, ?, 1, 1) ON CONFLICT(a, b) DO UPDATE SET peso = peso + 1, n = n + 1", p, q); }
  }

  // le cose già notate guardando la stessa cosa nello stesso posto (ultimi 3 giorni)
  giaOsservato(S, ogg) {
    const k = (ogg || "intorno").toLowerCase(), da = Date.now() - 72 * H;
    const simile = (x) => { x = x.toLowerCase(); return x === k || x.includes(k) || k.includes(x) || (/stell|cielo|luna/.test(x) && /stell|cielo|luna/.test(k)); };
    return (S.osservati || []).filter((o) => o.t > da && o.luogo === S.luogo && simile(o.cosa)).map((o) => o.vista).slice(-8);
  }
  async sguardo(S, T, cosa, gia) {
    const P = PLACES[S.luogo];
    if (this.budget(S, T)) {
      try { const r = await askModel(this.env, lookPrompt(S, this.contesto(S, T), cosa, gia), 160); if (r && r.vista) return String(r.vista).slice(0, 300); }
      catch (e) { this.logga(Date.now(), "errore", "Lo sguardo non è riuscito: " + String(e && e.message || e).slice(0, 160)); }
    }
    if (/stell|cielo|luna/.test(cosa)) return T.notte ? "Il cielo è pieno di stelle." : `Il cielo oggi è ${T.meteo}.`;
    const pool = (T.notte && P.dettagliNotte ? P.dettagliNotte.concat(P.dettagli) : P.dettagli).filter((x) => !gia.includes(x));
    return pool.length ? pick(pool) : "Niente di nuovo: è tutto come l'ultima volta.";
  }

  oggettoQui(S, testo) {
    const t = (testo || "").toLowerCase(); if (t.length < 3) return null;
    return this.sql.exec("SELECT id, nome, descrizione, rotto FROM oggetti WHERE luogo = ?", S.luogo).toArray().find((o) => t.includes(o.nome.toLowerCase()) || o.nome.toLowerCase().includes(t)) || null;
  }

  // ---------- il Mondo racconta cosa succede quando Kōki fa qualcosa di libero ----------
  async narra(S, W, T, now) {
    const a = S.attivita, b = S.corpo, ctx = this.contesto(S, T);
    ctx.speciali = [];
    if (S.luogo === "pozzo") {
      const eco = this.sql.exec("SELECT testo FROM log WHERE tipo = 'pensiero' AND t BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1", now - 48 * H, now - 16 * H).toArray()[0];
      ctx.speciali.push("Se Kōki parla, chiama o grida dentro il pozzo, l'eco gli risponde " + (eco ? `con una frase che lui stesso ha pensato ieri: «${eco.testo.slice(0, 160)}».` : "solo con un respiro lento.") + " Il fondo non si vede.");
    }
    if (S.luogo === "collina") ctx.speciali.push(W.telefono ? "Il telefono sul palo sta squillando proprio adesso. Se Kōki risponde, dall'altra parte c'è solo silenzio, o un respiro lento." : "Il telefono sul palo è muto. Non ha fili.");
    if (S.luogo === "giardino") ctx.speciali.push("Se Kōki apre la porta nel prato e la attraversa, si ritrova nello stesso prato, ma per un attimo un dettaglio è fuori posto, poi tutto torna normale.");
    if (S.luogo === "bosco") ctx.speciali.push("Tra le radici c'è una casetta in miniatura uguale a quella di Kōki. Sulla sua mensolina ci sono " + (S.inventario.length ? "copie piccolissime delle cose di Kōki: " + S.inventario.slice(-4).join(", ") : "niente") + ". Non si apre più di così.");
    if (W.fantasmi.fuori && W.fantasmi.luogo === S.luogo) ctx.speciali.push("Qui adesso ci sono i fantasmi della casa stregata.");
    if (S.luogo === "casetta") ctx.speciali.push("La porta della casa stregata è sbarrata da assi: tra le assi c'è uno spiraglio stretto.");
    let r = null;
    if (this.budgetGrande(S, T)) {
      try { r = await askModel(this.env, narratorPrompt(S, W, ctx, a.oggetto, a.perche), 700, this.env.BIG_MODEL); }
      catch (e) { this.logga(now, "errore", "Il Mondo (modello grande) non ha risposto: " + String(e && e.message || e).slice(0, 200)); }
    }
    if (!r && this.budget(S, T)) {
      try { r = await askModel(this.env, narratorPrompt(S, W, ctx, a.oggetto, a.perche), 650); }
      catch (e) { this.logga(now, "errore", "Il Mondo non ha risposto: " + String(e && e.message || e).slice(0, 200)); }
    }
    this.conta(S, "libere");
    if (!r || !r.racconto) {
      S.esito = `Ho provato a fare una cosa (${a.oggetto}), ma alla fine non ci sono riuscito.`;
      this.ricorda(now, S.esito, .35, S.luogo); this.logga(now, "esito", S.esito); return;
    }
    const lower = (x) => String(x || "").toLowerCase().trim();
    for (const u of (r.usa || []).slice(0, 4)) { const i = S.inventario.findIndex((c) => lower(c) === lower(u) || lower(c).includes(lower(u)) || lower(u).includes(lower(c))); if (i >= 0) S.inventario.splice(i, 1); }
    for (const f of (r.trova || []).slice(0, 3)) if (f && f.length < 60) S.inventario.push(f);
    for (const c of (r.crea || []).slice(0, 2)) {
      if (!c || !c.nome) continue;
      const forma = FORME.includes(c.forma) ? c.forma : "altro";
      const colore = /^#[0-9a-f]{6}$/i.test(c.colore || "") ? c.colore : "";
      const slot = this.sql.exec("SELECT COALESCE(MAX(slot), -1) + 1 AS n FROM oggetti WHERE luogo = ?", S.luogo).one().n;
      this.sql.exec("INSERT INTO oggetti (t, luogo, nome, descrizione, forma, colore, grandezza, slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", now, S.luogo, c.nome.slice(0, 60), String(c.descrizione || "").slice(0, 240), forma, colore, ["piccola", "media", "grande"].includes(c.grandezza) ? c.grandezza : "piccola", slot);
      this.logga(now, "mondo", `Nuovo, ${PLACES[S.luogo].nome}: ${c.nome}.`);
      this.conta(S, "creazioni");
    }
    for (const m of (r.modifica || []).slice(0, 3)) {
      const o = this.sql.exec("SELECT nome FROM oggetti WHERE id = ?", m.id).toArray()[0]; if (!o) continue;
      if (m.descrizione) this.sql.exec("UPDATE oggetti SET descrizione = ? WHERE id = ?", String(m.descrizione).slice(0, 240), m.id);
      if (typeof m.rotto === "boolean") this.sql.exec("UPDATE oggetti SET rotto = ? WHERE id = ?", m.rotto ? 1 : 0, m.id);
      this.logga(now, "mondo", `È cambiato: ${o.nome}.`);
    }
    for (const id of (r.rimuovi || []).slice(0, 3)) {
      const o = this.sql.exec("SELECT nome FROM oggetti WHERE id = ?", id).toArray()[0]; if (!o) continue;
      this.sql.exec("DELETE FROM oggetti WHERE id = ?", id); this.logga(now, "mondo", `Non c'è più: ${o.nome}.`);
    }
    const tot = this.sql.exec("SELECT COUNT(*) AS n FROM oggetti").one().n;
    if (tot > 40) for (const o of this.sql.exec("SELECT id, nome FROM oggetti ORDER BY id LIMIT ?", tot - 40).toArray()) { this.sql.exec("DELETE FROM oggetti WHERE id = ?", o.id); this.logga(now, "mondo", `Il tempo e il vento si sono portati via: ${o.nome}.`); }
    if (r.disegno && r.disegno.soggetto) await this.disegnaKoki(S, T, now, r.disegno);
    this.logga(now, "racconto", r.racconto);
    S.esito = r.ricordo || r.racconto;
    this.ricorda(now, S.esito, r.riuscito ? .6 : .45, S.luogo);
    S.umore = clamp(S.umore + clamp(Number(r.umore) || 0, -.5, .5), -1, 1);
    this.emoziona(S, r.riuscito ? { gioia: .12 } : { tristezza: .08 });
    b.espressione = clamp(b.espressione - .3, 0, 1); b.curiosita = clamp(b.curiosita - .2, 0, 1);
  }

  // ---------- la mente ----------
  budgetGrande(S, T) {
    if (S.ai.giorno !== T.giorno) S.ai = { giorno: T.giorno, chiamate: 0, grandi: 0 };
    const max = parseInt(this.env.MAX_BIG_CALLS, 10) || 40;
    if (!this.env.BIG_MODEL || (S.ai.grandi || 0) >= max) return false;
    S.ai.grandi = (S.ai.grandi || 0) + 1; return true;
  }
  budget(S, T, extra) {
    if (S.ai.giorno !== T.giorno) S.ai = { giorno: T.giorno, chiamate: 0, grandi: 0 };
    const max = parseInt(this.env.MAX_AI_CALLS, 10) || 150;
    if (S.ai.chiamate >= max + (extra || 0)) return false;
    S.ai.chiamate++; return true;
  }
  contesto(S, T) {
    return {
      ora: T.ora, ora24: T.ora24, stagione: T.stagione, meteo: T.meteo, notte: T.notte, novita: S.novita.slice(-6),
      ricordi: this.ricordiRilevanti(S, 6),
      convinzioni: this.sql.exec("SELECT id, testo, prove FROM convinzioni ORDER BY prove DESC, id DESC LIMIT 5").toArray(),
      aperti: this.sql.exec("SELECT id, tipo, testo FROM aperti WHERE chiuso = 0 ORDER BY forza DESC, id DESC LIMIT 5").toArray(),
      oggettiQui: this.sql.exec("SELECT id, nome, descrizione, rotto FROM oggetti WHERE luogo = ? ORDER BY id DESC LIMIT 8", S.luogo).toArray(),
      attivita: this.descriviAzione(S.attivita),
      osservati: this.riassuntoOsservati(S),
      domani: S.domani && S.domani.giorno === T.giorno ? S.domani.testo : ""
    };
  }

  riassuntoOsservati(S) {
    const da = Date.now() - 48 * H, c = {};
    for (const o of (S.osservati || [])) if (o.t > da) { const k = `${o.cosa} (${PLACES[o.luogo] ? PLACES[o.luogo].nome : o.luogo})`; c[k] = (c[k] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => n > 1 ? `${k}, ${n} volte` : k);
  }

  async decidi(S, W, T, now) {
    const ctx = this.contesto(S, T);
    let r = null, fonte = "regole";
    const grande = Math.random() < .3 && (S.ai.grandi || 0) < (parseInt(this.env.MAX_BIG_CALLS, 10) || 40) * .5 && this.budgetGrande(S, T);
    if (grande) {
      try { r = await askModel(this.env, decisionPrompt(S, W, ctx), 450, this.env.BIG_MODEL); fonte = "mente"; }
      catch (e) { this.logga(now, "errore", "Il modello grande non ha risposto: " + String(e && e.message || e).slice(0, 200)); }
    }
    if (!r && this.budget(S, T)) {
      try { r = await askModel(this.env, decisionPrompt(S, W, ctx), 450); fonte = "mente"; }
      catch (e) { this.logga(now, "errore", "Il modello non ha risposto: " + String(e && e.message || e).slice(0, 200)); }
    }
    if (!r || !Array.isArray(r.mosse) || !r.mosse.length) { r = fallbackDecide(S, ctx); fonte = "regole"; }
    S.pensiero = (r.pensiero || "").slice(0, 300);
    S.fontePensiero = fonte;
    this.logga(now, "pensiero", S.pensiero);
    if (r.emozioni && typeof r.emozioni === "object") for (const e of ["gioia", "meraviglia", "tristezza"]) { const v = Number(r.emozioni[e]); if (isFinite(v)) S.emo[e] = clamp(S.emo[e] * .5 + clamp(v, 0, 1) * .5, 0, 1); }
    if (Array.isArray(r.temi)) this.salvaTemi(S, r.temi, now);
    if (r.nuovi_pensieri) this.aggiungiAperti(now, r.nuovi_pensieri);
    if (Array.isArray(r.risolti)) for (const id of r.risolti.slice(0, 3)) this.sql.exec("UPDATE aperti SET chiuso = 1 WHERE id = ?", id);
    if (Array.isArray(r.ripensati)) for (const id of r.ripensati.slice(0, 3)) this.sql.exec("UPDATE aperti SET forza = MIN(1, forza + 0.15) WHERE id = ? AND chiuso = 0", id);
    if (Array.isArray(r.nomi)) for (const n of r.nomi.slice(0, 2)) {
      const cosa = String(n.cosa || "").trim().toLowerCase().slice(0, 60), nome = String(n.nome || "").trim().slice(0, 40);
      if (cosa.length < 2 || nome.length < 2 || (S.nomi || {})[cosa] === nome) continue;
      S.nomi = S.nomi || {}; S.nomi[cosa] = nome;
      const ks = Object.keys(S.nomi); if (ks.length > 30) delete S.nomi[ks[0]];
      this.logga(now, "nome", `Ha dato un nome: ${cosa} → «${nome}».`); this.conta(S, "nomi");
    }
    S.coda = r.mosse.slice(0, 3).filter((m) => m && ACTIONS[m.azione]);
    S.novita = []; S.esito = ""; S.urgente = false;
    while (S.coda.length && !S.attivita) {
      const m = S.coda.shift();
      if (!this.avvia(S, W, m, now, T)) continue;
    }
    if (!S.attivita) this.avvia(S, W, { azione: "osserva", oggetto: "intorno", minuti: 15, perche: "" }, now, T);
    if (S.dorme && (T.notte || T.ora24 >= 20 || T.ora24 < 6)) await this.scriviDiario(S, T, now);
  }

  async rifletti(S, T, now) {
    S.ultimaRiflessione = now;
    if (!this.budget(S, T)) { this.pulisciMemoria(); return; }
    const ctx = {
      recenti: this.sql.exec("SELECT id, testo FROM memorie WHERE tipo = 'breve' ORDER BY id DESC LIMIT 15").toArray().reverse(),
      convinzioni: this.sql.exec("SELECT id, testo, prove FROM convinzioni ORDER BY prove DESC LIMIT 12").toArray(),
      aperti: this.sql.exec("SELECT id, tipo, testo FROM aperti WHERE chiuso = 0 ORDER BY forza DESC, id DESC LIMIT 6").toArray()
    };
    try {
      const r = await askModel(this.env, reflectionPrompt(S, ctx), 450);
      for (const id of (r.ricordi_importanti || []).slice(0, 4)) this.sql.exec("UPDATE memorie SET tipo = 'lunga', forza = MIN(1, forza + 0.2) WHERE id = ?", id);
      for (const id of (r.confermate || []).slice(0, 4)) this.sql.exec("UPDATE convinzioni SET prove = prove + 1 WHERE id = ?", id);
      for (const c of (r.nuove_convinzioni || []).slice(0, 2)) if (c && c.length > 3) { this.sql.exec("INSERT INTO convinzioni (t, testo, prove) VALUES (?, ?, 1)", now, c.slice(0, 200)); this.logga(now, "convinzione", c); }
      this.aggiungiAperti(now, r.nuovi_pensieri);
      if (r.pensiero) { S.pensiero = r.pensiero.slice(0, 300); this.logga(now, "riflessione", S.pensiero); }
      this.sql.exec("DELETE FROM convinzioni WHERE id NOT IN (SELECT id FROM convinzioni ORDER BY prove DESC, id DESC LIMIT 30)");
    } catch (e) { this.logga(now, "errore", "Riflessione non riuscita: " + String(e && e.message || e).slice(0, 200)); }
    this.pulisciMemoria();
  }

  async scriviDiario(S, T, now) {
    const giorno = localTime(now - 6 * H, this.env.TIMEZONE || "Europe/Rome").giorno; // dopo mezzanotte conta ancora come "ieri"
    if (S.ultimoDiario === giorno) return;
    S.ultimoDiario = giorno;
    const domenica = new Date(giorno + "T12:00:00Z").getUTCDay() === 0;
    const intervista = domenica ? await this.intervista(S, T, now, giorno) : null;
    const da = now - 18 * H;
    const ctx = {
      ora: T.ora,
      oggi: this.sql.exec("SELECT testo FROM memorie WHERE t > ? ORDER BY id LIMIT 25", da).toArray(),
      opere: this.sql.exec("SELECT titolo FROM opere WHERE t > ?", da).toArray().map((o) => o.titolo),
      cambiamenti: this.sql.exec("SELECT testo FROM log WHERE t > ? AND tipo IN ('racconto', 'mondo') ORDER BY id LIMIT 15", da).toArray().map((l) => l.testo),
      ieri: S.domani && S.domani.scritto !== giorno ? S.domani.testo : ""
    };
    let testo = null;
    if (this.budget(S, T, 20)) {
      try {
        const r = await askModel(this.env, diaryPrompt(S, ctx), 600);
        testo = r.diario;
        if (r.domani) { const dom = localTime(now + 18 * H, this.env.TIMEZONE || "Europe/Rome").giorno; S.domani = { giorno: dom, scritto: giorno, testo: String(r.domani).slice(0, 200) }; }
        const sh = S.scheda;
        if (r.togli) { const k = r.togli.toLowerCase(); sh.abitudini = sh.abitudini.filter((x) => !x.toLowerCase().includes(k) && !k.includes(x.toLowerCase())); sh.gusti = sh.gusti.filter((x) => !x.toLowerCase().includes(k) && !k.includes(x.toLowerCase())); }
        if (r.aggiungi_abitudine && sh.abitudini.length < 8) { sh.abitudini.push(r.aggiungi_abitudine.slice(0, 120)); this.logga(now, "scheda", "Nuova abitudine: " + r.aggiungi_abitudine); }
        if (r.aggiungi_gusto && sh.gusti.length < 10) { sh.gusti.push(r.aggiungi_gusto.slice(0, 120)); this.logga(now, "scheda", "Nuovo gusto: " + r.aggiungi_gusto); }
      } catch (e) { this.logga(now, "errore", "Diario non riuscito: " + String(e && e.message || e).slice(0, 200)); }
    }
    if (!testo) testo = "Oggi:\n" + ctx.oggi.slice(-8).map((m) => "- " + m.testo).join("\n");
    this.sql.exec("INSERT INTO diario (giorno, t, testo) VALUES (?, ?, ?) ON CONFLICT(giorno) DO UPDATE SET testo = excluded.testo, t = excluded.t", giorno, now, testo.slice(0, 4000));
    this.logga(now, "diario", "Ha scritto la pagina di diario del " + giorno + "."); this.conta(S, "diari");
    await this.osserva(S, T, now, giorno, testo, intervista);
  }

  // l'emozione dei luoghi: media di come cambia il suo umore quando fa qualcosa lì
  sentiLuogo(S, luogo, delta) {
    if (!PLACES[luogo] || !isFinite(delta)) return;
    S.luoghiEmo = S.luoghiEmo || {};
    const e = S.luoghiEmo[luogo] || { v: 0, n: 0 };
    e.v = Math.round((e.v * .8 + clamp(delta, -.5, .5) * .2) * 1000) / 1000; e.n++;
    S.luoghiEmo[luogo] = e;
  }

  // il sogno: al risveglio gli resta un frammento
  async sogna(S, T, now) {
    const giorno = localTime(now - 12 * H, this.env.TIMEZONE || "Europe/Rome").giorno;
    if (this.sql.exec("SELECT COUNT(*) AS n FROM sogni WHERE giorno = ?", giorno).one().n) return;
    const ricordi = this.sql.exec("SELECT testo FROM memorie WHERE t > ? ORDER BY RANDOM() LIMIT 8", now - 30 * H).toArray();
    if (ricordi.length < 2 || !this.budget(S, T)) return;
    try {
      const r = await askModel(this.env, dreamPrompt(S, ricordi), 300);
      if (!r || !r.sogno) return;
      this.sql.exec("INSERT OR REPLACE INTO sogni (giorno, t, sogno, frammento) VALUES (?, ?, ?, ?)", giorno, now, String(r.sogno).slice(0, 800), String(r.frammento || "").slice(0, 200));
      this.conta(S, "sogni");
      if (r.frammento) { S.novita.push(`Ti ricordi un pezzo del sogno di stanotte: «${r.frammento}».`); this.ricorda(now, `Stanotte ho sognato: ${r.frammento}`, .4, "casa"); }
      this.logga(now, "sogno", r.sogno);
    } catch (e) { this.logga(now, "errore", "Il sogno non è riuscito: " + String(e && e.message || e).slice(0, 160)); }
  }

  // l'intervista della domenica sera: sempre le stesse domande
  async intervista(S, T, now, giorno) {
    if (this.sql.exec("SELECT COUNT(*) AS n FROM interviste WHERE giorno = ?", giorno).one().n || !this.budget(S, T, 20)) return null;
    try {
      const r = await askModel(this.env, interviewPrompt(S, { ora: T.ora, ricordi: this.ricordiRilevanti(S, 8) }), 600);
      const risposte = DOMANDE.map((d, i) => ({ domanda: d, risposta: String((r.risposte || [])[i] || "").slice(0, 400) }));
      this.sql.exec("INSERT OR REPLACE INTO interviste (giorno, t, risposte) VALUES (?, ?, ?)", giorno, now, JSON.stringify(risposte));
      this.logga(now, "intervista", "Ha risposto all'intervista della settimana.");
      return risposte.map((x) => `${x.domanda} ${x.risposta}`).join("\n");
    } catch (e) { this.logga(now, "errore", "Intervista non riuscita: " + String(e && e.message || e).slice(0, 160)); return null; }
  }

  // ---------- il quaderno dell'osservatore ----------
  async osserva(S, T, now, giorno, diarioKoki, intervista) {
    const da = now - 20 * H, tz = this.env.TIMEZONE || "Europe/Rome";
    const righe = this.sql.exec("SELECT t, tipo, testo FROM log WHERE t > ? AND tipo NOT IN ('errore', 'laboratorio') ORDER BY id", da).toArray();
    const cronaca = righe.slice(-70).map((l) => ({ ora: localTime(l.t, tz).testo.split(" ").pop(), tipo: l.tipo, testo: l.testo.slice(0, 220) }));
    const luoghiC = {};
    for (const u of this.sql.exec("SELECT luogo FROM umori WHERE t > ?", da).toArray()) luoghiC[u.luogo] = (luoghiC[u.luogo] || 0) + 1;
    const umoreM = this.sql.exec("SELECT AVG(umore) AS m FROM umori WHERE t > ?", da).one().m;
    const numeri = {
      umore: umoreM == null ? null : Math.round(umoreM * 100) / 100,
      luoghi: luoghiC,
      libere: righe.filter((l) => l.tipo === "racconto").length,
      osservazioni: righe.filter((l) => l.tipo === "azione" && /^osserva/.test(l.testo)).length,
      ricerche: righe.filter((l) => l.tipo === "azione" && /^cerca/.test(l.testo)).length,
      disegni: righe.filter((l) => l.tipo === "disegno").length,
      coraggio: Math.round((S.coraggio || 0) * 100) / 100,
      pensieri: righe.filter((l) => l.tipo === "pensiero").length
    };
    const ctx = {
      giorno, eta: Math.max(1, Math.ceil((now - S.nato) / (24 * H))), cronaca,
      luoghi: Object.entries(luoghiC).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${PLACES[k] ? PLACES[k].nome : k} ${n}`),
      umore: numeri.umore == null ? "sconosciuto" : numeri.umore,
      interventi: this.sql.exec("SELECT testo, registro FROM interventi WHERE t > ?", da).toArray().map((i) => `${i.testo} → ${i.registro}`),
      diarioKoki: diarioKoki || "",
      intervista: intervista || "",
      sogno: (this.sql.exec("SELECT sogno FROM sogni WHERE giorno < ? ORDER BY giorno DESC LIMIT 1", giorno).toArray()[0] || {}).sogno || "",
      coraggio: Math.round((S.coraggio || 0) * 100) / 100,
      luoghiEmo: Object.entries(S.luoghiEmo || {}).filter(([, e]) => e.n >= 3).map(([k, e]) => `${PLACES[k] ? PLACES[k].nome : k} ${e.v > 0 ? "+" : ""}${e.v} (${e.n} volte)`),
      nomi: Object.entries(S.nomi || {}).map(([c, n]) => `${c} = «${n}»`),
      precedenti: this.sql.exec("SELECT giorno, testo FROM quaderno WHERE giorno < ? ORDER BY giorno DESC LIMIT 3", giorno).toArray().reverse(),
      trattiNuovi: this.sql.exec("SELECT nome, prove FROM tratti_nuovi ORDER BY prove DESC LIMIT 10").toArray()
    };
    let r = null;
    if (this.budgetGrande(S, T)) { try { r = await askModel(this.env, observerPrompt(ctx), 900, this.env.BIG_MODEL); } catch (e) { this.logga(now, "errore", "L'osservatore (modello grande) non ha scritto: " + String(e && e.message || e).slice(0, 200)); } }
    if (!r && this.budget(S, T, 25)) { try { r = await askModel(this.env, observerPrompt(ctx), 800); } catch (e) { this.logga(now, "errore", "L'osservatore non ha scritto: " + String(e && e.message || e).slice(0, 200)); } }
    if (!r || !r.note) return;
    const tratti = (r.tratti || []).slice(0, 8).map((x) => ({ tratto: String(x.tratto || "").slice(0, 60), come: String(x.come || "").slice(0, 300) }));
    this.sql.exec("INSERT INTO quaderno (giorno, t, testo, tratti, domanda, numeri) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(giorno) DO UPDATE SET t = excluded.t, testo = excluded.testo, tratti = excluded.tratti, domanda = excluded.domanda, numeri = excluded.numeri",
      giorno, now, String(r.note).slice(0, 4000), JSON.stringify(tratti), String(r.domanda || "").slice(0, 300), JSON.stringify(numeri));
    for (const n of (r.tratti_nuovi || []).slice(0, 3)) {
      const nome = String(n.nome || "").trim().toLowerCase().slice(0, 60); if (nome.length < 3) continue;
      const ex = this.sql.exec("SELECT id, fatti, ultimo FROM tratti_nuovi WHERE nome = ?", nome).toArray()[0];
      const fatto = `${giorno}: ${String(n.fatto || "").slice(0, 200)}`;
      if (ex) { if (ex.ultimo !== giorno) this.sql.exec("UPDATE tratti_nuovi SET prove = prove + 1, ultimo = ?, fatti = ? WHERE id = ?", giorno, JSON.stringify(JSON.parse(ex.fatti || "[]").concat([fatto]).slice(-8)), ex.id); }
      else this.sql.exec("INSERT INTO tratti_nuovi (nome, prove, primo, ultimo, fatti) VALUES (?, 1, ?, ?, ?)", nome, giorno, giorno, JSON.stringify([fatto]));
    }
  }

  // ---------- il laboratorio dello sperimentatore ----------
  async stimolo(testo, luogo, now) {
    const { S, W } = this.init(now), T = this.tempo(S, now), ctx = this.contesto(S, T);
    if (luogo && !PLACES[luogo]) luogo = "";
    let r = null;
    if (this.budgetGrande(S, T)) { try { r = await askModel(this.env, stimulusPrompt(S, ctx, testo, luogo), 600, this.env.BIG_MODEL); } catch (e) { this.logga(now, "errore", "Il laboratorio (modello grande): " + String(e && e.message || e).slice(0, 200)); } }
    if (!r && this.budget(S, T, 40)) { try { r = await askModel(this.env, stimulusPrompt(S, ctx, testo, luogo), 550); } catch (e) { this.logga(now, "errore", "Il laboratorio: " + String(e && e.message || e).slice(0, 200)); } }
    if (!r) { this.put("S", S); return { errore: "Il Mondo adesso non risponde (cervello spento o finito per oggi). Riprova più tardi." }; }
    const dove = luogo || (PLACES[r.luogo] ? r.luogo : S.luogo);
    const creati = [];
    for (const c of (r.crea || []).slice(0, 3)) {
      if (!c || !c.nome) continue;
      const slot = this.sql.exec("SELECT COALESCE(MAX(slot), -1) + 1 AS n FROM oggetti WHERE luogo = ?", dove).one().n;
      this.sql.exec("INSERT INTO oggetti (t, luogo, nome, descrizione, forma, colore, grandezza, slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", now, dove, c.nome.slice(0, 60), String(c.descrizione || "").slice(0, 240),
        FORME.includes(c.forma) ? c.forma : "altro", /^#[0-9a-f]{6}$/i.test(c.colore || "") ? c.colore : "", ["piccola", "media", "grande"].includes(c.grandezza) ? c.grandezza : "piccola", slot);
      creati.push(c.nome);
    }
    const evento = String(r.evento || "").trim();
    if (evento && (r.ovunque || S.luogo === dove)) { S.novita.push(evento); if (!S.dorme) S.urgente = true; }
    if (creati.length && S.luogo === dove && !S.dorme) S.novita.push(`Qui ${al(PLACES[dove].nome)} c'è qualcosa che prima non c'era: ${creati.join(", ")}.`);
    const registro = String(r.registro || "").slice(0, 300) || ("Fatto accadere " + al(PLACES[dove].nome) + ".");
    this.sql.exec("INSERT INTO interventi (t, testo, luogo, registro) VALUES (?, ?, ?, ?)", now, testo, dove, registro);
    this.logga(now, "laboratorio", `Stimolo: ${testo} → ${registro}`);
    if (creati.length) this.logga(now, "mondo", `Qualcosa è comparso ${al(PLACES[dove].nome)}: ${creati.join(", ")}.`);
    if (evento) this.logga(now, "mondo", evento);
    this.put("S", S); this.put("W", W);
    return { ok: true, luogo: dove, registro, evento, creati };
  }

  // tutto quello che serve a Claude (o a te) per leggere l'esperimento, in un solo testo
  esporta() {
    const now = Date.now(), { S, W } = this.init(now), tz = this.env.TIMEZONE || "Europe/Rome";
    const d = (t) => localTime(t, tz).testo;
    const out = [`# L'esperimento Kōki — esportato il ${d(now)}`, `Nato il ${d(S.nato)} (${Math.ceil((now - S.nato) / (24 * H))} giorni).`, "",
      "## Tratti di partenza", ...CORE.map((c) => "- " + c), "",
      "## Come si descrive lui", "Abitudini: " + (S.scheda.abitudini.join("; ") || "nessuna"), "Gusti: " + (S.scheda.gusti.join("; ") || "nessuno"), "",
      "## Tratti nuovi ipotizzati dall'osservatore", ...this.sql.exec("SELECT nome, prove, primo, ultimo, fatti FROM tratti_nuovi ORDER BY prove DESC").toArray().map((t) => `- ${t.nome} (notato ${t.prove} giorni, dal ${t.primo} al ${t.ultimo}): ${JSON.parse(t.fatti || "[]").join(" | ")}`), "",
      "## Coraggio al buio", String(Math.round((S.coraggio || 0) * 100) / 100), "",
      "## Come si sente nei luoghi", ...Object.entries(S.luoghiEmo || {}).map(([k, e]) => `- ${PLACES[k] ? PLACES[k].nome : k}: ${e.v} (${e.n} volte)`), "",
      "## Nomi inventati da Kōki", ...Object.entries(S.nomi || {}).map(([c, n]) => `- ${c} = «${n}»`), "",
      "## Interviste della domenica", ...this.sql.exec("SELECT giorno, risposte FROM interviste ORDER BY giorno").toArray().map((i) => `### ${i.giorno}\n` + JSON.parse(i.risposte || "[]").map((x) => `- ${x.domanda} ${x.risposta}`).join("\n")), "",
      "## Convinzioni", ...this.sql.exec("SELECT testo, prove FROM convinzioni ORDER BY prove DESC").toArray().map((c) => `- ${c.testo} (${c.prove})`), "",
      "## Pensieri aperti", ...this.sql.exec("SELECT tipo, testo FROM aperti WHERE chiuso = 0").toArray().map((a) => `- ${a.tipo}: ${a.testo}`), "",
      "## Collezione", S.inventario.join(", ") || "niente", "",
      "## Cose sull'isola (costruite o comparse)", ...this.sql.exec("SELECT t, luogo, nome, descrizione, rotto FROM oggetti ORDER BY id").toArray().map((o) => `- ${d(o.t)}, ${PLACES[o.luogo] ? PLACES[o.luogo].nome : o.luogo}: ${o.nome} — ${o.descrizione}${o.rotto ? " (rotto)" : ""}`), "",
      "## Opere", ...this.sql.exec("SELECT t, tipo, titolo FROM opere ORDER BY id").toArray().map((o) => `- ${d(o.t)}: ${o.tipo} — ${o.titolo}`), "",
      "## Interventi dello sperimentatore", ...this.sql.exec("SELECT t, testo, luogo, registro FROM interventi ORDER BY id").toArray().map((i) => `- ${d(i.t)} (${i.luogo}): ${i.testo} → ${i.registro}`), ""];
    const quad = this.sql.exec("SELECT giorno, testo, tratti, domanda, numeri FROM quaderno ORDER BY giorno").toArray();
    const diar = Object.fromEntries(this.sql.exec("SELECT giorno, testo FROM diario").toArray().map((x) => [x.giorno, x.testo]));
    const sog = Object.fromEntries(this.sql.exec("SELECT giorno, sogno FROM sogni").toArray().map((x) => [x.giorno, x.sogno]));
    const giorni = [...new Set(quad.map((q) => q.giorno).concat(Object.keys(diar)))].sort().slice(-60);
    out.push("## Giorno per giorno");
    for (const g of giorni) {
      const q = quad.find((x) => x.giorno === g);
      out.push("", `### ${g}`);
      if (diar[g]) out.push("**Diario di Kōki:**", diar[g]);
      if (sog[g]) out.push("**Sogno della notte:**", sog[g]);
      if (q) {
        out.push("**Quaderno dell'osservatore:**", q.testo);
        const tr = JSON.parse(q.tratti || "[]"); if (tr.length) out.push(...tr.map((t) => `- ${t.tratto}: ${t.come}`));
        if (q.domanda) out.push("Domanda: " + q.domanda);
        if (q.numeri) out.push("Numeri: " + q.numeri);
      }
    }
    return out.join("\n");
  }

  // ---------- un turno di vita ----------
  async turno() {
    const now = Date.now();
    let { S, W } = this.init(now);
    const dtH = clamp((now - S.ultimoTurno) / H, 0, 6) * this.speed();
    S.ultimoTurno = now;
    await this.aggiornaMeteo(S, now);
    const T = this.tempo(S, now);
    this.mondo(S, W, T, now);
    this.corpo(S, T, dtH);
    if (!S.dorme) { this.sql.exec("INSERT INTO umori (t, umore, luogo, gioia, meraviglia, tristezza, energia) VALUES (?, ?, ?, ?, ?, ?, ?)", now, S.umore, S.luogo, S.emo.gioia, S.emo.meraviglia, S.emo.tristezza, S.corpo.energia); this.sql.exec("DELETE FROM umori WHERE t < ?", now - 120 * 24 * H); }

    if (S.dorme) {
      if (T.ora24 >= 6 && T.ora24 < 23.5 && S.corpo.energia > (T.ora24 < 13 ? .45 : .6)) {
        S.dorme = false; S.attivita = null; S.coda = [];
        S.novita.push(`Ti sei appena svegliato. Fuori: ${T.meteo}.`);
        this.logga(now, "evento", "Kōki si è svegliato.");
        if (T.ora24 < 13 && now - (S.addormentato || 0) > 3 * H) await this.sogna(S, T, now);
        this.notteFantasmi(S, W, T, now);
        if (W.orme && W.orme.a === "casa" && Math.random() < .7) { S.novita.push("Davanti alla porta finiscono delle orme che non sono tue. Vengono dalla spiaggia."); S.ormeViste = W.orme.giorno; }
      } else { this.put("S", S); this.put("W", W); return; }
    }

    if (S.attivita && S.attivita.azione === "cerca" && now < S.attivita.fine && now - (S.attivita.ultimoTentativo || S.attivita.inizio) > 6 * MIN / this.speed()) this.tentaRicerca(S, W, now);
    let serveMente = false;
    // dopo mezzanotte gli si chiudono gli occhi: torna a casa a dormire (fino alle 6)
    const versoLetto = (S.attivita && S.attivita.azione === "dormi") || (S.coda[0] && S.coda[0].azione === "dormi");
    if (!S.dorme && T.ora24 < 6 && !versoLetto) {
      S.attivita = null; S.coda = [{ azione: "dormi", minuti: 60, perche: "è tardissimo, mi si chiudono gli occhi" }];
      this.logga(now, "evento", "È mezzanotte passata: Kōki ha sonno.");
    }
    // stanchissimo: crolla dal sonno, senza bisogno di pensarci
    if (S.corpo.energia < .1 && !S.dorme && !(S.attivita && S.attivita.azione === "dormi") && !(S.coda[0] && S.coda[0].azione === "dormi")) {
      S.attivita = null; S.coda = [{ azione: "dormi", minuti: 60, perche: "non ce la faccio più, mi si chiudono gli occhi" }];
      this.logga(now, "evento", "Kōki è stanchissimo.");
    }
    if (S.attivita && now >= S.attivita.fine) {
      const fatta = S.attivita;
      if (fatta.azione === "libera") await this.narra(S, W, T, now); else await this.concludi(S, W, T, now);
      if (fatta.azione !== "vai" && fatta.u0 != null) this.sentiLuogo(S, fatta.luogo || S.luogo, S.umore - fatta.u0);
      S.attivita = null;
    }
    if (S.urgente && S.attivita) { S.attivita = null; S.coda = []; }
    if (!S.attivita) {
      while (S.coda.length && !S.attivita && !S.urgente) { const m = S.coda.shift(); this.avvia(S, W, m, now, T); }
      if (!S.attivita) serveMente = true;
    }
    if (serveMente) await this.decidi(S, W, T, now);
    else if (now - S.ultimaRiflessione > 3 * H) await this.rifletti(S, T, now);

    this.put("S", S); this.put("W", W);
  }

  // ---------- quello che vede la pagina ----------
  vista() {
    const now = Date.now();
    const { S, W } = this.init(now);
    const T = this.tempo(S, now);
    return {
      adesso: now, tempo: T,
      koki: {
        luogo: S.luogo, dorme: S.dorme, attivita: S.attivita, descrizione: S.dorme ? "dorme" : this.descriviAzione(S.attivita),
        coda: S.coda, pensiero: S.pensiero, fontePensiero: S.fontePensiero || "", umore: S.umore, corpo: S.corpo,
        inventario: S.inventario, scheda: S.scheda, nato: S.nato, coraggio: S.coraggio || 0, nomi: S.nomi || {}, emo: S.emo,
        stats: { ...S.stats, stelle: S.stats.stelle || S.stelleViste || 0, opere: this.sql.exec("SELECT COUNT(*) AS n FROM opere").one().n, oggetti: this.sql.exec("SELECT COUNT(*) AS n FROM oggetti").one().n, convinzioni: this.sql.exec("SELECT COUNT(*) AS n FROM convinzioni").one().n },
        luoghi: Object.fromEntries(Object.keys(PLACES).map((k) => [k, feelPlace(S, k)]).filter(([, f]) => f))
      },
      mondo: { gatto: W.gatto, orme: W.orme || null, fantasmi: { fuori: !!W.fantasmi.fuori, luogo: W.fantasmi.luogo }, telefono: !!W.telefono, spaventa: W.spaventa || "", bottiglia: !!W.bottiglia, bottigliaInViaggio: !!W.bottigliaInArrivo, telescopio: W.telescopio },
      aperti: this.sql.exec("SELECT id, tipo, testo, t, forza FROM aperti WHERE chiuso = 0 ORDER BY forza DESC, id DESC").toArray(),
      convinzioni: this.sql.exec("SELECT testo, prove FROM convinzioni ORDER BY prove DESC LIMIT 12").toArray(),
      opere: this.sql.exec("SELECT o.id, o.t, o.tipo, o.titolo, (i.opera IS NOT NULL) AS immagine FROM opere o LEFT JOIN immagini i ON i.opera = o.id ORDER BY o.id DESC LIMIT 60").toArray(),
      oggetti: this.sql.exec("SELECT id, t, luogo, nome, descrizione, forma, colore, grandezza, rotto, slot FROM oggetti ORDER BY id").toArray(),
      log: this.sql.exec("SELECT t, tipo, testo FROM log WHERE tipo != 'errore' ORDER BY id DESC LIMIT 60").toArray(),
      cervello: { chiamateOggi: S.ai.giorno === T.giorno ? S.ai.chiamate + (S.ai.grandi || 0) : 0, massimo: (parseInt(this.env.MAX_AI_CALLS, 10) || 150) + (parseInt(this.env.MAX_BIG_CALLS, 10) || 40) }
    };
  }

  async fetch(req) {
    const url = new URL(req.url), now = Date.now();
    await this.ensureAlarm();
    const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json; charset=utf-8" } });
    const p = url.pathname;
    if (p === "/api/_sveglia") return json({ ok: true });
    if (p === "/api/stato") return json(this.vista());
    if (p === "/api/diario") {
      const d = this.sql.exec("SELECT giorno, testo FROM diario").toArray(), so = this.sql.exec("SELECT giorno, sogno FROM sogni").toArray();
      const by = {}; d.forEach((x) => { by[x.giorno] = { giorno: x.giorno, testo: x.testo }; }); so.forEach((x) => { (by[x.giorno] = by[x.giorno] || { giorno: x.giorno, testo: "" }).sogno = x.sogno; });
      return json(Object.values(by).sort((a, b) => b.giorno.localeCompare(a.giorno)).slice(0, 120));
    }
    if (p === "/api/mente") {
      const tema = url.searchParams.get("tema");
      if (tema) return json({ tema, pensieri: this.sql.exec("SELECT t, tipo, testo FROM log WHERE tipo IN ('pensiero', 'riflessione', 'aperto', 'racconto', 'esito', 'sogno') AND LOWER(testo) LIKE ? ORDER BY id DESC LIMIT 8", "%" + tema.toLowerCase() + "%").toArray() });
      const nodi = this.sql.exec("SELECT nome, peso, n, tipo, primo, ultimo FROM temi ORDER BY peso DESC LIMIT 45").toArray(), set = new Set(nodi.map((x) => x.nome));
      return json({ nodi, legami: this.sql.exec("SELECT a, b, peso, n FROM legami ORDER BY peso DESC LIMIT 200").toArray().filter((l) => set.has(l.a) && set.has(l.b)) });
    }
    if (p === "/api/cronaca") {
      const tipi = (url.searchParams.get("tipi") || "").split(",").filter(Boolean).slice(0, 12);
      const q = tipi.length ? `SELECT t, tipo, testo FROM log WHERE tipo IN (${tipi.map(() => "?").join(",")}) ORDER BY id DESC LIMIT 150` : "SELECT t, tipo, testo FROM log WHERE tipo != 'errore' ORDER BY id DESC LIMIT 150";
      return json(this.sql.exec(q, ...tipi).toArray());
    }
    if (p === "/api/interviste") return json(this.sql.exec("SELECT giorno, risposte FROM interviste ORDER BY giorno DESC LIMIT 60").toArray().map((i) => ({ giorno: i.giorno, risposte: JSON.parse(i.risposte || "[]") })));
    if (p === "/api/disegno") { const r = this.sql.exec("SELECT mime, dati FROM immagini WHERE opera = ?", parseInt(url.searchParams.get("id"), 10) || 0).toArray()[0]; return r ? json(r) : json({ errore: "Nessuna immagine" }, 404); }
    if (p === "/api/ricordi") return json(this.sql.exec("SELECT t, testo, forza, tipo, luogo FROM memorie ORDER BY id DESC LIMIT 140").toArray());
    if (p === "/api/quaderno") return json({
      pagine: this.sql.exec("SELECT giorno, testo, tratti, domanda, numeri FROM quaderno ORDER BY giorno DESC LIMIT 120").toArray().map((q) => ({ ...q, tratti: JSON.parse(q.tratti || "[]"), numeri: JSON.parse(q.numeri || "{}") })),
      trattiNuovi: this.sql.exec("SELECT nome, prove, primo, ultimo, fatti FROM tratti_nuovi ORDER BY prove DESC, ultimo DESC LIMIT 30").toArray().map((t) => ({ ...t, fatti: JSON.parse(t.fatti || "[]") }))
    });
    if (p === "/api/laboratorio" && req.method === "GET") return json(this.sql.exec("SELECT t, testo, luogo, registro FROM interventi ORDER BY id DESC LIMIT 100").toArray());
    if (p === "/api/laboratorio" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const testo = String(body.testo || "").trim().slice(0, 500);
      if (!testo) return json({ errore: "Scrivi cosa vuoi far accadere." }, 400);
      return json(await this.stimolo(testo, String(body.luogo || ""), now));
    }
    if (p === "/api/esporta") return new Response(this.esporta(), { headers: { "content-type": "text/markdown; charset=utf-8" } });
    if (p === "/api/turno" && req.method === "POST") { await this.turno(); return json(this.vista()); }
    if (p === "/api/prova" && req.method === "POST") { // per le prove: fa riflettere o scrivere il diario subito
      const { S, W } = this.init(now), T = this.tempo(S, now), cosa = url.searchParams.get("cosa");
      if (cosa === "riflessione") await this.rifletti(S, T, now);
      if (cosa === "diario") { S.ultimoDiario = ""; await this.scriviDiario(S, T, now); }
      if (cosa === "disegno") await this.disegnaKoki(S, T, now, { soggetto: "il gatto di pietra", idea: "il gatto seduto", supporto: "carta", colori: ["#555555"] });
      if (cosa === "fantasmi") { const F = W.fantasmi; F.evento = true; F.fatto = false; this.notteFantasmi(S, W, T, now); F.fuori = true; F.luogo = S.luogo; }
      if (cosa === "sogno") { this.sql.exec("DELETE FROM sogni"); await this.sogna(S, T, now); }
      if (cosa === "intervista") { const g = localTime(now, this.env.TIMEZONE || "Europe/Rome").giorno; this.sql.exec("DELETE FROM interviste WHERE giorno = ?", g); await this.intervista(S, T, now, g); }
      this.put("S", S); this.put("W", W); return json({ ok: true });
    }
    if (p === "/api/bottiglia" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const testo = String(body.testo || "").trim().slice(0, 500);
      if (!testo) return json({ errore: "Scrivi qualcosa nel messaggio." }, 400);
      const { W } = this.init(now);
      if (W.bottiglia || W.bottigliaInArrivo) return json({ errore: "C'è già una bottiglia in viaggio o sulla spiaggia." }, 409);
      W.bottigliaInArrivo = testo; W.arrivo = now + (20 + Math.random() * 100) * MIN;
      this.put("W", W);
      this.logga(now, "mondo", "Qualcuno ha affidato una bottiglia al mare.");
      this.sql.exec("INSERT INTO interventi (t, testo, luogo, registro) VALUES (?, ?, 'spiaggia', ?)", now, "Bottiglia: «" + testo + "»", "Una bottiglia con un messaggio arriverà sulla spiaggia.");
      return json({ ok: true, arrivoTra: Math.round((W.arrivo - now) / MIN) });
    }
    if (p === "/api/parla" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const msg = String(body.messaggio || "").trim().slice(0, 400);
      if (!msg) return json({ errore: "Messaggio vuoto." }, 400);
      const { S, W } = this.init(now);
      const T = this.tempo(S, now);
      if (S.dorme) return json({ risposta: "(Kōki dorme profondamente. Il germoglio si muove piano mentre respira.)", dorme: true });
      if (!this.budget(S, T, 40)) { this.put("S", S); return json({ risposta: "(Kōki è assorto nei suoi pensieri e non sembra sentirti. Riprova domani.)" }); }
      let r;
      try { r = await askModel(this.env, chatPrompt(S, W, this.contesto(S, T), msg), 300); }
      catch (e) { this.put("S", S); return json({ risposta: "(Kōki ti guarda, ma non trova le parole.)", errore: String(e && e.message || e) }); }
      this.ricorda(now, `Il Custode mi ha detto: «${msg}». Gli ho risposto: «${r.risposta}»`, .65, S.luogo);
      this.logga(now, "parla", `Custode: ${msg}\nKōki: ${r.risposta}`);
      this.sql.exec("INSERT INTO interventi (t, testo, luogo, registro) VALUES (?, ?, ?, ?)", now, "Parla: «" + msg + "»", S.luogo, "Kōki ha risposto: «" + String(r.risposta).slice(0, 200) + "»");
      S.corpo.socialita = clamp(S.corpo.socialita - .35, 0, 1); S.umore = clamp(S.umore + .1, -1, 1);
      S.novita.push(`Il Custode ti ha parlato: «${msg}».`);
      this.put("S", S);
      return json({ risposta: r.risposta, pensiero: r.pensiero || "" });
    }
    if (p === "/api/rinasci" && req.method === "POST" && url.searchParams.get("conferma") === "RINASCI") {
      this.sql.exec("DELETE FROM stato; DELETE FROM memorie; DELETE FROM convinzioni; DELETE FROM aperti; DELETE FROM diario; DELETE FROM opere; DELETE FROM log; DELETE FROM oggetti; DELETE FROM immagini; DELETE FROM quaderno; DELETE FROM tratti_nuovi; DELETE FROM interventi; DELETE FROM umori; DELETE FROM sogni; DELETE FROM interviste; DELETE FROM temi; DELETE FROM legami;");
      this.init(now);
      return json({ ok: true });
    }
    return json({ errore: "Non trovato" }, 404);
  }
}
