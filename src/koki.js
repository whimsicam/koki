// La casa di Kōki: un Durable Object con un piccolo database SQLite.
// Qui vive tutto: il corpo (bisogni), il mondo (gatto di pietra, impronte, bottiglia, telescopio),
// la memoria (ricordi, convinzioni, pensieri aperti), il diario e le opere.
// Ogni TICK_MINUTES un "allarme" lo sveglia e gli fa vivere un turno.

import { DurableObject } from "cloudflare:workers";
import { PLACES, CAT_SPOTS, TELESCOPE_PARTS, ACTIONS, dist, season, weatherWords, isRainy, localTime, pick, a as al } from "./world.js";
import { decisionPrompt, reflectionPrompt, diaryPrompt, chatPrompt, askModel, fallbackDecide } from "./mind.js";

const H = 3600000, MIN = 60000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
    `);
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
        ultimaRiflessione: now, ultimoDiario: "", eraNotte: null, meteo: null
      };
      this.put("S", S);
      this.logga(now, "evento", "Kōki è nato.");
      this.ricorda(now, "Mi sono svegliato per la prima volta, in una casetta di legno.", .9, "casa", "lunga");
    }
    if (!W) {
      W = { gatto: "piazza", gattoMosso: now, impronte: false, improntaGiorno: "", bottiglia: null, bottigliaInArrivo: null, arrivo: 0,
            telescopio: { mancanti: ["lente", "vite", "manovella"], montati: [], aggiustato: false } };
      this.put("W", W);
    }
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
    const open = this.sql.exec("SELECT testo FROM aperti WHERE chiuso = 0").toArray().map((r) => r.testo.toLowerCase());
    for (const p of (list || []).slice(0, 2)) {
      if (!p || !p.testo || open.includes(p.testo.toLowerCase())) continue;
      this.sql.exec("INSERT INTO aperti (t, tipo, testo) VALUES (?, ?, ?)", t, p.tipo || "desiderio", p.testo.slice(0, 200));
      this.logga(t, "aperto", `${p.tipo}: ${p.testo}`);
    }
    // non più di 8 pensieri aperti: chiude i più vecchi
    this.sql.exec("UPDATE aperti SET chiuso = 2 WHERE chiuso = 0 AND id NOT IN (SELECT id FROM aperti WHERE chiuso = 0 ORDER BY id DESC LIMIT 8)");
  }
  ricordiRilevanti(S, n) {
    const rows = this.sql.exec("SELECT id, t, testo, forza, tipo, luogo FROM memorie ORDER BY id DESC LIMIT 80").toArray();
    const now = Date.now();
    rows.forEach((r) => { r.score = r.forza + (r.luogo === S.luogo ? .25 : 0) + Math.max(0, .4 - (now - r.t) / (24 * H) * .2) + (r.tipo === "lunga" ? .1 : 0) + Math.random() * .15; });
    return rows.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.t - b.t);
  }
  pulisciMemoria() {
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
    const lt = localTime(now, this.env.TIMEZONE || "Europe/Rome");
    const m = S.meteo || {};
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
    // la lanterna di pietra: certe notti si accende da sola
    if (T.notte && W.lanternaNotte !== T.giorno && T.ora24 >= 18) { W.lanternaNotte = T.giorno; W.lanterna = Math.random() < .35; if (W.lanterna) this.logga(now, "mondo", "Stanotte la lanterna di pietra si è accesa da sola."); }
    if (!T.notte && W.lanterna) W.lanterna = false;
    // le impronte misteriose compaiono certe mattine, e la marea le cancella nel pomeriggio
    if (!T.notte && T.ora24 >= 6 && T.ora24 < 11 && W.improntaGiorno !== T.giorno) {
      W.improntaGiorno = T.giorno;
      W.impronte = Math.random() < .25;
      if (W.impronte) this.logga(now, "mondo", "Stamattina sulla spiaggia ci sono delle impronte misteriose.");
    }
    if (W.impronte && T.ora24 >= 15) W.impronte = false;
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

  // ---------- il corpo: numeri, nessun modello ----------
  corpo(S, T, dtH) {
    const b = S.corpo;
    if (S.dorme) b.energia += .13 * dtH; else b.energia -= .05 * dtH;
    if (!S.dorme) { b.curiosita += .09 * dtH; b.espressione += .05 * dtH; b.socialita += .03 * dtH; }
    const fuori = !PLACES[S.luogo].coperto;
    const target = !T.notte || S.dorme ? 0 : fuori ? .55 : .12;
    b.paura += (target - b.paura) * Math.min(1, dtH * 3);
    for (const k of Object.keys(b)) b[k] = clamp(b[k], 0, 1);
    const base = .25 - b.paura * .4 - (b.energia < .25 ? .2 : 0) - (b.socialita > .75 ? .15 : 0) - (T.pioggia && fuori ? .1 : 0);
    S.umore = clamp(S.umore + (base - S.umore) * Math.min(1, dtH * .3), -1, 1);
  }

  // ---------- le azioni ----------
  avvia(S, W, m, now, T) {
    const az = m.azione, ogg = (m.oggetto || "").toString().trim();
    let min = clamp(parseInt(m.minuti, 10) || 20, 5, 90);
    const needs = (luogo) => { if (S.luogo !== luogo) { S.coda.unshift(m); this.avvia(S, W, { azione: "vai", oggetto: luogo, minuti: 10, perche: "per " + az.replace("_", " ") }, now, T); return true; } return false; };
    if (!ACTIONS[az]) return false;
    if (az === "vai") {
      const key = this.trovaLuogo(ogg);
      if (!key || key === S.luogo) return false;
      min = Math.max(3, Math.round(dist(S.luogo, key) * 0.5));
      S.attivita = { azione: "vai", oggetto: key, da: S.luogo, a: key, inizio: now, fine: now + min * MIN / this.speed(), perche: m.perche || "" };
      this.logga(now, "azione", `Va verso ${PLACES[key].nome}. ${m.perche || ""}`);
      return true;
    }
    if (az === "dormi" && needs("casa")) return true;
    if (az === "aggiusta_telescopio" && needs("collina")) return true;
    if (az === "sistema_collezione" && needs("casa")) return true;
    if (az === "leggi_bottiglia") { if (!W.bottiglia) return false; if (needs("spiaggia")) return true; }
    if (az === "guarda_stelle" && !T.notte) { m = { ...m, azione: "osserva", oggetto: "il cielo" }; }
    if (az === "dormi") { S.dorme = true; min = 8 * 60; }
    S.attivita = { azione: m.azione, oggetto: m.azione === "osserva" ? (m.oggetto || ogg) : ogg, luogo: S.luogo, inizio: now, fine: now + min * MIN / this.speed(), perche: m.perche || "" };
    this.logga(now, "azione", `${this.descriviAzione(S.attivita)}. ${m.perche || ""}`);
    return true;
  }

  trovaLuogo(s) {
    s = (s || "").toLowerCase();
    if (PLACES[s]) return s;
    for (const [k, p] of Object.entries(PLACES)) if (s.includes(k) || s.includes(p.nome.replace(/^(la|il|lo|l') ?/, ""))) return k;
    return null;
  }

  descriviAzione(a) {
    if (!a) return "niente";
    const o = a.oggetto ? " " + a.oggetto : "";
    return { vai: "cammina verso " + (PLACES[a.a] || {}).nome, osserva: "osserva" + o, cerca: "cerca piccole cose", disegna: "disegna" + o, gioca: "gioca" + (o ? " (" + a.oggetto + ")" : ""),
             riposa: "si riposa", dormi: "dorme", guarda_stelle: "guarda le stelle", aggiusta_telescopio: "prova ad aggiustare il telescopio", leggi_bottiglia: "apre la bottiglia", sistema_collezione: "sistema la sua collezione" }[a.azione] || a.azione;
  }

  concludi(S, W, T, now) {
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
        if (S.luogo === "spiaggia" && W.impronte) S.novita.push("Sulla sabbia ci sono delle impronte che non sono tue. Vanno verso il mare.");
        if (S.luogo === "spiaggia" && W.bottiglia) S.novita.push("Sulla riva c'è una bottiglia di vetro chiusa!");
        if (S.luogo === "collina" && !S.sa.telescopio) S.novita.push("In cima alla collina c'è un vecchio telescopio.");
        if (S.luogo === "lanterna" && T.notte && W.lanterna) S.novita.push("La lanterna di pietra è accesa, ma intorno non c'è nessuno!");
        if (S.luogo === "casetta" && T.notte) S.novita.push("Una finestra della casetta chiusa è accesa, con una luce viola.");
        if (S.novita.length) { this.ricorda(now, esito + " " + S.novita.join(" "), forza + .1, S.luogo); S.novita.forEach((n) => this.logga(now, "nota", n)); }
        break;
      }
      case "osserva": {
        let d;
        if ((ogg.includes("gatto")) && W.gatto === S.luogo) d = pick(["Il gatto di pietra ha la coda arrotolata e gli occhi socchiusi.", "Il gatto di pietra è freddo e liscio. Sotto le zampe c'è un po' di terra smossa.", "Il gatto di pietra guarda verso il mare."]);
        else if (ogg.includes("telescop") && S.luogo === "collina") {
          S.sa.telescopio = true;
          d = W.telescopio.aggiustato ? "Il telescopio funziona: dentro si vedono le stelle da vicino." : "Il telescopio è rotto: mancano " + W.telescopio.mancanti.join(", ") + ". Forse sono da qualche parte sull'isola.";
          forza = .7;
        } else if (ogg.includes("impront") && S.luogo === "spiaggia" && W.impronte) d = "Le impronte sono grandi e tonde, con quattro dita. Partono dal mare e ci ritornano.";
        else if (ogg.includes("cielo")) d = T.notte ? (T.nuvole > 60 ? "Il cielo è coperto, non si vede neanche una stella." : "Il cielo è pieno di stelle.") : `Il cielo oggi è ${T.meteo}.`;
        else if (S.luogo === "lanterna" && T.notte && W.lanterna) d = "La lanterna di pietra è accesa! Dentro c'è una fiammella, ma qui non c'è nessuno.";
        else d = pick(T.notte && P.dettagliNotte ? P.dettagliNotte.concat(P.dettagli) : P.dettagli);
        esito = `Ho osservato ${a.oggetto || "intorno"}: ${d}`;
        b.curiosita -= .25;
        this.ricorda(now, esito, forza + .05, S.luogo);
        break;
      }
      case "cerca": {
        const part = Object.entries(TELESCOPE_PARTS).find(([n, where]) => where === S.luogo && W.telescopio.mancanti.includes(n) && !S.inventario.includes(n));
        if (part && S.sa.telescopio && Math.random() < .35) {
          S.inventario.push(part[0]); esito = `Cercando qui ho trovato... una ${part[0]}! Sembra proprio un pezzo del telescopio!`; forza = .85; S.umore += .3;
        } else if (Math.random() < .55 && P.cose.length) {
          const c = pick(P.cose); S.inventario.push(c); esito = `Ho trovato: ${c}.`; forza = .45; S.umore += .1;
        } else esito = "Ho cercato, ma stavolta non ho trovato niente.";
        b.curiosita -= .2;
        this.ricorda(now, esito, forza, S.luogo);
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
      case "guarda_stelle": {
        if (T.nuvole > 60 || T.pioggia) { esito = "Volevo guardare le stelle, ma il cielo era coperto."; S.umore -= .05; }
        else if (b.paura > .5 && Math.random() < .35) { esito = "Ho provato a guardare le stelle, ma il buio mi ha fatto troppa paura e sono scappato."; S.umore -= .1; forza = .6; }
        else { esito = W.telescopio.aggiustato && S.luogo === "collina" ? "Ho guardato le stelle con il telescopio: sono enormi e brillano di colori diversi!" : "Ho guardato le stelle. Erano tantissime."; S.umore += .25; forza = .65; }
        this.ricorda(now, esito, forza, S.luogo);
        break;
      }
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

  // ---------- la mente ----------
  budget(S, T, extra) {
    if (S.ai.giorno !== T.giorno) S.ai = { giorno: T.giorno, chiamate: 0 };
    const max = parseInt(this.env.MAX_AI_CALLS, 10) || 180;
    if (S.ai.chiamate >= max + (extra || 0)) return false;
    S.ai.chiamate++; return true;
  }
  contesto(S, T) {
    return {
      ora: T.ora, ora24: T.ora24, stagione: T.stagione, meteo: T.meteo, notte: T.notte, novita: S.novita.slice(-6),
      ricordi: this.ricordiRilevanti(S, 6),
      convinzioni: this.sql.exec("SELECT id, testo, prove FROM convinzioni ORDER BY prove DESC, id DESC LIMIT 5").toArray(),
      aperti: this.sql.exec("SELECT id, tipo, testo FROM aperti WHERE chiuso = 0 ORDER BY id DESC LIMIT 5").toArray(),
      attivita: this.descriviAzione(S.attivita)
    };
  }

  async decidi(S, W, T, now) {
    const ctx = this.contesto(S, T);
    let r = null, fonte = "regole";
    if (this.budget(S, T)) {
      try { r = await askModel(this.env, decisionPrompt(S, W, ctx), 450); fonte = "mente"; }
      catch (e) { this.logga(now, "errore", "Il modello non ha risposto: " + String(e && e.message || e).slice(0, 200)); }
    }
    if (!r || !Array.isArray(r.mosse) || !r.mosse.length) { r = fallbackDecide(S, ctx); fonte = "regole"; }
    S.pensiero = (r.pensiero || "").slice(0, 300);
    S.fontePensiero = fonte;
    this.logga(now, "pensiero", S.pensiero);
    if (r.nuovi_pensieri) this.aggiungiAperti(now, r.nuovi_pensieri);
    if (Array.isArray(r.risolti)) for (const id of r.risolti.slice(0, 3)) this.sql.exec("UPDATE aperti SET chiuso = 1 WHERE id = ?", id);
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
      aperti: this.sql.exec("SELECT id, tipo, testo FROM aperti WHERE chiuso = 0 ORDER BY id DESC LIMIT 6").toArray()
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
    const da = now - 18 * H;
    const ctx = {
      ora: T.ora,
      oggi: this.sql.exec("SELECT testo FROM memorie WHERE t > ? ORDER BY id LIMIT 25", da).toArray(),
      opere: this.sql.exec("SELECT titolo FROM opere WHERE t > ?", da).toArray().map((o) => o.titolo)
    };
    let testo = null;
    if (this.budget(S, T, 20)) {
      try {
        const r = await askModel(this.env, diaryPrompt(S, ctx), 600);
        testo = r.diario;
        const sh = S.scheda;
        if (r.togli) { const k = r.togli.toLowerCase(); sh.abitudini = sh.abitudini.filter((x) => !x.toLowerCase().includes(k) && !k.includes(x.toLowerCase())); sh.gusti = sh.gusti.filter((x) => !x.toLowerCase().includes(k) && !k.includes(x.toLowerCase())); }
        if (r.aggiungi_abitudine && sh.abitudini.length < 8) { sh.abitudini.push(r.aggiungi_abitudine.slice(0, 120)); this.logga(now, "scheda", "Nuova abitudine: " + r.aggiungi_abitudine); }
        if (r.aggiungi_gusto && sh.gusti.length < 10) { sh.gusti.push(r.aggiungi_gusto.slice(0, 120)); this.logga(now, "scheda", "Nuovo gusto: " + r.aggiungi_gusto); }
      } catch (e) { this.logga(now, "errore", "Diario non riuscito: " + String(e && e.message || e).slice(0, 200)); }
    }
    if (!testo) testo = "Oggi:\n" + ctx.oggi.slice(-8).map((m) => "- " + m.testo).join("\n");
    this.sql.exec("INSERT INTO diario (giorno, t, testo) VALUES (?, ?, ?) ON CONFLICT(giorno) DO UPDATE SET testo = excluded.testo, t = excluded.t", giorno, now, testo.slice(0, 4000));
    this.logga(now, "diario", "Ha scritto la pagina di diario del " + giorno + ".");
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

    if (S.dorme) {
      if (!T.notte && T.ora24 >= 6.5 && S.corpo.energia > .7) {
        S.dorme = false; S.attivita = null; S.coda = [];
        S.novita.push(`Ti sei appena svegliato. Fuori: ${T.meteo}.`);
        this.logga(now, "evento", "Kōki si è svegliato.");
      } else { this.put("S", S); this.put("W", W); return; }
    }

    let serveMente = false;
    // stanchissimo: crolla dal sonno, senza bisogno di pensarci
    if (S.corpo.energia < .1 && !S.dorme && !(S.attivita && S.attivita.azione === "dormi") && !(S.coda[0] && S.coda[0].azione === "dormi")) {
      S.attivita = null; S.coda = [{ azione: "dormi", minuti: 60, perche: "non ce la faccio più, mi si chiudono gli occhi" }];
      this.logga(now, "evento", "Kōki è stanchissimo.");
    }
    if (S.attivita && now >= S.attivita.fine) { this.concludi(S, W, T, now); S.attivita = null; }
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
        inventario: S.inventario, scheda: S.scheda, nato: S.nato
      },
      mondo: { gatto: W.gatto, lanterna: !!W.lanterna, impronte: W.impronte, bottiglia: !!W.bottiglia, bottigliaInViaggio: !!W.bottigliaInArrivo, telescopio: W.telescopio },
      aperti: this.sql.exec("SELECT id, tipo, testo, t FROM aperti WHERE chiuso = 0 ORDER BY id DESC").toArray(),
      convinzioni: this.sql.exec("SELECT testo, prove FROM convinzioni ORDER BY prove DESC LIMIT 12").toArray(),
      opere: this.sql.exec("SELECT t, tipo, titolo FROM opere ORDER BY id DESC LIMIT 30").toArray(),
      log: this.sql.exec("SELECT t, tipo, testo FROM log ORDER BY id DESC LIMIT 40").toArray(),
      cervello: { chiamateOggi: S.ai.giorno === T.giorno ? S.ai.chiamate : 0, massimo: parseInt(this.env.MAX_AI_CALLS, 10) || 180 }
    };
  }

  async fetch(req) {
    const url = new URL(req.url), now = Date.now();
    await this.ensureAlarm();
    const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json; charset=utf-8" } });
    const p = url.pathname;
    if (p === "/api/_sveglia") return json({ ok: true });
    if (p === "/api/stato") return json(this.vista());
    if (p === "/api/diario") return json(this.sql.exec("SELECT giorno, testo FROM diario ORDER BY giorno DESC LIMIT 120").toArray());
    if (p === "/api/ricordi") return json(this.sql.exec("SELECT t, testo, forza, tipo, luogo FROM memorie ORDER BY id DESC LIMIT 140").toArray());
    if (p === "/api/turno" && req.method === "POST") { await this.turno(); return json(this.vista()); }
    if (p === "/api/prova" && req.method === "POST") { // per le prove: fa riflettere o scrivere il diario subito
      const { S } = this.init(now), T = this.tempo(S, now), cosa = url.searchParams.get("cosa");
      if (cosa === "riflessione") await this.rifletti(S, T, now);
      if (cosa === "diario") { S.ultimoDiario = ""; await this.scriviDiario(S, T, now); }
      this.put("S", S); return json({ ok: true });
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
      S.corpo.socialita = clamp(S.corpo.socialita - .35, 0, 1); S.umore = clamp(S.umore + .1, -1, 1);
      S.novita.push(`Il Custode ti ha parlato: «${msg}».`);
      this.put("S", S);
      return json({ risposta: r.risposta, pensiero: r.pensiero || "" });
    }
    if (p === "/api/rinasci" && req.method === "POST" && url.searchParams.get("conferma") === "RINASCI") {
      this.sql.exec("DELETE FROM stato; DELETE FROM memorie; DELETE FROM convinzioni; DELETE FROM aperti; DELETE FROM diario; DELETE FROM opere; DELETE FROM log;");
      this.init(now);
      return json({ ok: true });
    }
    return json({ errore: "Non trovato" }, 404);
  }
}
