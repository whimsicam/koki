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
4. Quando va a dormire scrive la pagina di diario rispondendo a quattro domande (cosa ha fatto, cosa gli è piaciuto, cosa no, cosa vuole fare domani) e cambia una piccola cosa di sé (un'abitudine o un gusto). La mattina dopo si ricorda cosa voleva fare, ma è libero di cambiare idea.
5. Quando osserva qualcosa (anche il cielo o le stelle), il Mondo gli mostra un dettaglio nuovo, mai uno che ha già visto guardando la stessa cosa. Kōki sa anche cosa ha già osservato di recente, così può annoiarsi o insistere.
6. Dorme da mezzanotte alle 6. Al risveglio gli resta un frammento del sogno della notte, fatto solo con i suoi ricordi.
7. I pensieri che si porta dietro hanno una forza: se ci ripensa si rafforzano, se no sbiadiscono e li dimentica.
8. La paura del buio cambia con l'esperienza (coraggio), e ogni luogo prende da solo un'emozione: la media di come è stato lì.
9. Può dare nomi suoi alle cose. Ogni domenica sera risponde alle stesse sei domande (intervista settimanale).
10. Se il modello non risponde o finisce il budget del giorno (`MAX_AI_CALLS`), va avanti con regole semplici.

### Azioni libere e il Mondo narratore
Oltre alle azioni di base, Kōki può fare **qualsiasi cosa** descritta con le sue parole (azione `libera`). Una seconda mente, il **Mondo**, fa da narratore imparziale: decide cosa succede davvero (riesce, fallisce, imprevisti) e può cambiare l'isola. Crea cose nuove, ne rompe o ne toglie altre, consuma o aggiunge cose alla collezione. Le cose create restano (al massimo 40) e compaiono nell'isola 3D con una forma scelta da un kit low poly. Toccandole se ne legge la descrizione. Il Mondo usa il modello grande (`BIG_MODEL`, massimo `MAX_BIG_CALLS` al giorno), che a volte usa anche Kōki per decidere. I misteri dell'isola non vengono mai risolti dal Mondo.

Nel menu di Kōki non c'è "disegna": se disegna è un'idea sua, fatta con l'azione libera, e solo se ha con cosa farlo (una matita, la terra, dei petali...). Il disegno lo fa lui, tratto per tratto: il modello sceglie linee, cerchi e scarabocchi su un foglio 100×100, con i colori che ha davvero, e la pagina li mostra come un disegno a matita o a pastello. I disegni sono nella sezione Disegni, e gli ultimi tre sono appesi su un filo accanto alla casa.

### L'esperimento: osservatore e laboratorio
- **Quaderno dell'osservatore** (nel Diario, seconda scheda): ogni notte, dopo il diario di Kōki, un osservatore esterno (modello grande) scrive note di campo neutre: cosa ha fatto, dove, come ha reagito, cosa è cambiato rispetto ai giorni prima. Per ognuno dei cinque tratti scrive come si è manifestato quel giorno, e segna i **tratti nuovi** che sembrano nascere (con quanti giorni sono stati notati). Kōki non legge mai queste note: l'osservatore non lo influenza.
- **Laboratorio** (pulsante 🧪): scrivi uno stimolo con parole tue (un oggetto che compare, un evento, un cambiamento) e il Mondo lo fa accadere sull'isola. Kōki non sa che viene da te. Ogni intervento resta registrato con data e ora, e l'osservatore lo usa per confrontare il prima e il dopo.
- **Rinascere**: in fondo al laboratorio, scrivendo RINASCI, Kōki ricomincia da zero (stesso carattere, stessa isola).
- Anche Parla e la bottiglia vengono registrati come interventi.
- **Esporta**: dal laboratorio scarichi un file di testo con tutto l'esperimento (diari, quaderno, tratti, interventi, convinzioni, opere). Caricalo nel progetto su Claude per farlo leggere e analizzare.

### L'isola
Metà cose normali e metà strane. Normali: la casa di Kōki, la piazzetta con la fontana, il laghetto col ponticello, il prato fiorito, l'orto, il bosco, il giardino giapponese, la spiaggia, il molo con la barca, il faro, il mulino, la balena.
Strane (nessun mistero si risolve mai):
- la **casa stregata**: certe notti escono i fantasmi. La loro vera natura (gentili, dispettosi, tristi o un po' cattivi) è scelta a caso alla nascita e non compare da nessuna parte: si capisce solo da come si comportano (regali davanti alla porta, cose sparite e nascoste, pianti, colpi alla porta);
- le **orme** che certe mattine partono dal mare e arrivano in un posto a caso, a volte fino alla sua porta. Lui può accorgersene oppure no;
- la **porta in mezzo al prato**, che si apre sullo stesso prato;
- il **laghetto** che di notte riflette stelle che in cielo non ci sono;
- il **pozzo che respira**, la cui eco ripete le cose che Kōki ha pensato il giorno prima;
- la **casetta in miniatura** nel bosco, con le sue stesse cose sulla mensola;
- il **telefono senza fili** sulla collina, che certe notti squilla;
- lo **spaventapasseri** che ogni mattina guarda da un'altra parte, sempre più spesso verso casa sua;
- il gatto di pietra che si sposta, l'orologio che va all'indietro, il telescopio rotto, la bottiglia col messaggio.

### La pagina
Il pallino in basso apre le schede, ognuna a fisarmonica: Come sta (anelli di energia, felicità, meraviglia, tristezza, paura, coraggio...), Statistiche (abilità che salgono di livello, come in un gioco di ruolo), La sua mente (la rete delle cose a cui pensa e di quali pensa insieme), Pensieri e azioni (con etichette e filtri), Diario e quaderno, Disegni, Le sue cose, Parla, Bottiglia, Laboratorio. Le emozioni le dichiara lui stesso a ogni decisione e calano piano verso la calma.

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
