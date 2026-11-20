# Kōki 好奇

Kōki è un piccolo spirito che vive da solo su un'isola. Si forma gusti, abitudini e convinzioni vivendo, colleziona piccole cose, disegna, ha paura del buio ma ama le stelle, e ogni sera scrive il suo diario.

Vive su **Cloudflare**, gratis e senza carta di credito. Pensa con **Workers AI**, il modello gratuito di Cloudflare, quindi non usa crediti Claude.

## Come è fatto

| Cartella | Cosa contiene |
|---|---|
| `src/koki.js` | La sua "casa": un Durable Object con database SQLite. Corpo, mondo, memoria, diario e il turno di vita ogni 5 minuti. |
| `src/mind.js` | La mente: le domande al modello (decidere, riflettere, scrivere il diario, rispondere) e le regole di riserva. |
| `src/world.js` | L'isola: i luoghi, le piccole cose da trovare, il catalogo delle azioni. |
| `src/index.js` | L'ingresso: smista le richieste e controlla la password. |
| `public/index.html` | La pagina 3D: l'isola (costruita a partire da CAM World), Kōki che si muove, il diario, la bottiglia, la chat. |
| `wrangler.toml` | Le impostazioni (modello, frequenza dei turni, budget giornaliero, posizione per ora e meteo). |

### Il ciclo di vita
1. Ogni 5 minuti si aggiornano i bisogni (energia, voglia di scoprire, voglia di creare, compagnia, paura del buio) e il mondo: ora e meteo veri di Milano, il gatto di pietra che si sposta di notte, le impronte sulla spiaggia, la bottiglia.
2. Quando finisce quello che stava facendo, o succede qualcosa, il modello sceglie da 1 a 3 mosse, solo dal catalogo, con un pensiero e un perché.
3. Ogni 3 ore riflette: sceglie i ricordi da tenere e si fa nuove convinzioni.
4. Quando va a dormire scrive la pagina di diario e cambia una piccola cosa di sé (un'abitudine o un gusto).
5. Se il modello non risponde o finisce il budget del giorno (`MAX_AI_CALLS`), va avanti con regole semplici.

### L'isola
Metà cose normali e metà strane. Normali: la casa di Kōki, la piazzetta con la fontana, il laghetto col ponticello, il prato fiorito, l'orto, il bosco, il giardino giapponese, la spiaggia, il molo con la barca, il faro, il mulino, la balena. Strane: il telescopio rotto sulla collina (mancano lente, vite e manovella), la torre con l'orologio che va all'indietro, la casetta chiusa con la finestra accesa di notte, la lanterna di pietra che certe notti si accende da sola, il gatto di pietra che si sposta quando nessuno guarda, le impronte sulla spiaggia, la bottiglia col messaggio.

### Il nucleo che non cambia mai
Curioso · testardo · creativo · ha paura del buio ma è innamorato delle stelle · colleziona piccole cose.

## Metterlo online (senza terminale)

1. **Crea l'account Cloudflare** (gratis) su https://dash.cloudflare.com/sign-up e conferma l'email.
2. Nella dashboard vai su **Compute (Workers) → Workers & Pages → Create** e scegli **Import a repository** (Git).
3. Collega GitHub, autorizza Cloudflare a vedere il repository **koki** e selezionalo.
4. Lascia le impostazioni proposte (il comando di deploy è `npx wrangler deploy`) e premi **Deploy**. Cloudflare legge `wrangler.toml` e crea da solo il Worker, la casa di Kōki e il collegamento a Workers AI.
5. Quando il deploy è finito, apri il Worker → **Settings → Variables and Secrets → Add**: tipo **Secret**, nome `PASSWORD`, valore a tua scelta. È la password per entrare nel mondo di Kōki.
6. Apri l'indirizzo del Worker (tipo `https://koki.<tuo-nome>.workers.dev`), inserisci la password, e Kōki nasce.

Da lì in poi, ogni modifica caricata su GitHub viene pubblicata da sola.

## Cose utili

- **Rinascere da capo** (cancella tutto, memoria compresa): `POST /api/rinasci?conferma=RINASCI` con la password.
- **Cambiare modello**: `MODEL` in `wrangler.toml` (deve supportare la modalità JSON di Workers AI).
- **Pensare di più o di meno**: `MAX_AI_CALLS` (chiamate al giorno) e `TICK_MINUTES`. L'allocazione gratuita di Workers AI è di 10.000 "neuroni" al giorno.
- **Prove in locale** (per chi usa il terminale): `npx wrangler dev -c test/wrangler.test.toml --var MOCK_AI:1 --var SPEED:60` fa girare Kōki con un cervello finto e il tempo accelerato.
