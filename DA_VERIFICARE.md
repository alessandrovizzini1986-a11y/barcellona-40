# DA VERIFICARE · Barcelona 40

Generato in parte dagli script dati (`npm run data`). Le sezioni tra marker vengono riscritte a ogni esecuzione.

## geocoding

<!-- geocoding:start -->
- **Bodega Biarritz 1881** (`biarritz`): coordinate automatiche da Nominatim (41.3792173, 2.1770987), da controllare sul posto
<!-- geocoding:end -->

## distanze

<!-- distanze:start -->
Nessuna: tutte le tappe hanno le coordinate e la distanza dalla precedente.
<!-- distanze:end -->

## Voci aperte (da `data/checks.json`, spuntabili nella sezione Info → Da verificare)

- c2 · Voli di ritorno domenica 18 di Giulio e Manuel (Alessandro: FR5220 delle 23:05, verificato)
- c3 · Braseria Sarrià: portare la prenotazione a 2 coperti
- c4 · Hotel: il prezzo €430 include già il 3° adulto? Aliquota tassa di soggiorno? Quando si paga il sovrapprezzo?
- c5 · Hotel: cancellare la richiesta di letto extra per il 4° ospite di sabato (non serve più)
- c6 · Deposito bagagli venerdì mattina 08:05 → 15:00 (Monne)
- c7 · Programma notturno Sala Apolo sabato 17 (interferenza Soundhood a 89 m)
- c8 · SOUNDIT Plaza / Happy Techno Open Air: esistono? orari? (Resident Advisor)
- c9 · Civico esatto della Braseria Sarrià
- c10 · Coordinate geocodificate automaticamente: Bodega Biarritz (vedi sezione geocoding)

## Altri dati mancanti o non verificati


- **Album Google Foto: verificare i permessi di caricamento.** Il link risponde 302 e porta a un album condiviso, ma resta da controllare che l'impostazione "Consenti ad altri di aggiungere foto" sia attiva, altrimenti gli altri possono solo guardare. Da controllare aprendo il link in una finestra anonima.

- **Distanze a piedi: motore di routing sostituito.** Il server demo `router.project-osrm.org` ignora il profilo `/foot/` e restituisce sempre percorsi stradali per auto (verificato: `/foot/` e `/driving/` danno risultati identici), quindi gonfiava ogni distanza a piedi. Ora `scripts/distances.mjs` usa Valhalla di OpenStreetMap con costing `pedestrian` (`auto` per le tratte in auto o taxi) e prende i minuti dal tempo restituito da Valhalla, non più da una conversione a 5 km/h. Restano stime su dati OpenStreetMap, non rilievi sul posto.
- **Bar Joan: coordinate prese dal mercato.** Il locale è dentro il Mercat de Santa Caterina e non ha coordinate proprie: sulla mappa il suo marker sta sopra quello del mercato. Stessa cosa per `f10` e `f11`, che sono entrambi all'appartamento.

- Numero volo di Giulio (atterraggio 07:40 confermato) e di Manuel (09:45).
- Voli di ritorno di Giulio e Manuel: la tappa `d3` resta `da_verificare` e continua a dire le 20:00. Quella di Alessandro non lo è più: FR5220 delle 23:05, con il percorso completo in `data/viaggio.json`.
- **Braseria Sarrià, distanza**: 4.580 m e 15 min sono la strada in auto secondo Valhalla, non il percorso dei mezzi. Il tuo link dice 4,3 km: è un altro itinerario, non un errore.
- **Bar Joan e il mercato**: il link del percorso di venerdì mattina finisce a 41.386162, 2.1786073, che è a una trentina di metri dalle coordinate del mercato nei nostri dati (41.3863611, 2.1781566). Nessuna conseguenza pratica, ma sono due punti leggermente diversi.
- **Orari della mattina di venerdì**: sono quelli decisi da te, non ricavati da un calcolo. Le distanze, i minuti a piedi e le durate delle soste invece sono dati, e il sito li somma da solo.
- **Il margine della mattina è 11 minuti, non 20.** Con soste 3h45 e cammino 54 min la finestra 09:30–14:20 (4h50) lascia 11 minuti. L'avviso sul sito mostra il numero calcolato, non quello scritto a mano. In modalità pioggia il margine è **zero**: soste 3h55 + cammino 55 min riempiono esattamente la finestra, e si arriva all'appartamento alle 14:20 in punto.
- **Modalità pioggia: si accende a mano.** Non c'è nessuna previsione meteo collegata, e non c'è nessuna API del tempo nel sito: il toggle lo accendi tu guardando fuori dalla finestra.
- **Bar Joan, la coda**: "coda dalle 13:30, attese fino a 20 minuti" viene dalle recensioni, non da un rilievo. L'orario della tappa (12:45 col sereno, 12:38 con la pioggia) sta comunque prima della soglia delle 13:15.
- **Immagini delle tappe**: 15 foto da Wikimedia Commons (licenza verificata nel campo `extmetadata` prima di salvare il file) e 10 card stilizzate generate da noi per i luoghi che su Commons non hanno niente di libero. Elenco completo con autori e licenze in `CREDITS.md`. Nessuna foto di Google Places, da nessuna parte: l'attribuzione è per singolo autore e non sono ripubblicabili.
- **Santa Maria del Mar: la foto è notturna.** È l'unica facciata con licenza libera. Nella card si legge bene (rosone e torri illuminati), ma è l'unica immagine del sito scattata di notte: se stona, al suo posto va una card stilizzata.
- **Sala Apolo**: la foto è un concerto visto dall'interno, non la facciata. Rende l'atmosfera, che è il punto.
- **Due foto rimosse perché non usate.** `sarria.webp` e `pobleespanyol.webp` non erano assegnate a nessuna tappa e pesavano 141 kB: la cartella delle immagini è tornata sotto il tetto di 1,2 MB e il controllo in `scripts/qa/immagini.mjs` è di nuovo a 1,2. Si recuperano in un comando (`node scripts/fetch-photos.mjs`) dai titoli Commons: `File:Carrer Major de Sarrià (Barcelona) 01.jpg` (Joe Mabel, CC BY-SA 4.0) e `File:004 Poble Espanyol (Barcelona), plaça Major i glorieta.jpg` (Enric, CC BY-SA 4.0). La prima era l'alternativa alla card stilizzata della Braseria, la seconda serviva solo se il sabato sera si spostava a La Terrrazza.
- **Tramonto dei Bunkers: verificato con due algoritmi indipendenti.** Tramonto astronomico del 18/10/2026 alle 19:07 sulle coordinate del belvedere (41.4193, 2.1618), fuso CEST — l'ora legale spagnola finisce il 25 ottobre. Fine del crepuscolo civile 19:36. Non è più una voce aperta.
- **Sparizione del sole dietro Collserola: calcolata, voce chiusa.** Profilo altimetrico SRTM 30 m (opentopodata.org) campionato ogni 250 m fino a 15 km su cinque azimut da 250° a 262°, con correzione per la curvatura terrestre. Sull'azimut del tramonto (256°) la cresta sta a **1,14°**: 369 m a 5,2 km, un crinale secondario di Collserola. Incrociato con la traiettoria solare dà le **18:58**. Verificato due volte in modo indipendente: stesso profilo, stesso angolo, e la posizione del sole ricalcolata con NOAA dà 18:55 per il centro del disco, 18:57 con il semidiametro e **18:59** aggiungendo la rifrazione a quell'altezza. Le 18:58 stanno in mezzo: **la precisione reale è ±1 minuto**, non al secondo.
- **Nota di metodo: la stima precedente sbagliava di otto minuti** (diceva 18:50) perché prendeva la cima più nota, il Tibidabo a 512 m, invece della cima **sulla linea giusta**. Il Tibidabo sta più a nord dell'azimut del tramonto e da lassù il sole non ci passa dietro. Regola: per un orizzonte locale serve il profilo del terreno lungo l'azimut, non la montagna che uno conosce.
- **Attesa del taxi ai Bunkers di domenica sera: stimata, da controllare sul posto.** "In cima non passano taxi, prenotalo dall'app" è un ragionamento sulla zona residenziale, non un rilievo. È l'unica variabile che sposta davvero lo scenario peggiore del rientro.
- **Illuminazione della strada di discesa (Carrer de Marià Labèrnia): stimata, da controllare sul posto.** Il piano B "scendi a piedi e richiama da lì" presume che alle 19:30 di metà ottobre la strada sia illuminata. Non verificabile a distanza.
- **El Mirador, distanza**: ora c'è, presa dall'appartamento come dice il tuo link del percorso: 4.961 m e 18 min in auto secondo Valhalla (il tuo link dice 6 km coi mezzi, che è un altro itinerario). Sulla card è marcata come tratta in auto, non a piedi.
- **El Mirador → Bunkers**: restano i tuoi 632 m · 12 min. Valhalla con le coordinate nuove dei Bunkers dice 613 m · 11 min: differenza da nulla, ho tenuto i tuoi numeri perché sono quelli verificati.
- **La foto di El Mirador è privata**, di un amico di Alessandro, usata con permesso. Non è su Commons e non ha licenza libera: non sta nella tabella dei crediti e sotto la card non compare nessuna attribuzione. Se un giorno il sito diventa pubblico sul serio, chiedere conferma all'autore.
- **Tappe di arrivo di Giulio e Manuel** (`s1`, `s3`): non erano nell'elenco delle immagini. Hanno l'immagine del posto dove arrivano, appartamento e Olimpo.
- Bodega Biarritz 1881: Nominatim restituisce "Bodega Biarritz, Carrer d'en Rull" (Gòtic). Controllare che sia il locale giusto.
- Coordinate `verified:true` del prompt (appartamento, aeroporto, Sagrada, Olimpo, Braseria, Apolo, Monumental, Terrrazza, mercati) non sono state toccate.
- Il sito precedente era installabile con un service worker (`_legacy/sw.js`): chi lo aveva aperto vedrà il nuovo sito alla seconda visita, quando il browser rimuove il vecchio worker (404 su `sw.js`).

## Rigori al Camp Nou 2.0 (gioco nuovo in `src/rigori/`)

Regola del prompt: tutto ciò che non è specificato va marcato `// DA VERIFICARE` nel codice e riportato qui.

- **Three.js**: installata la versione corrente su npm al momento del lavoro, `0.186.0`. Il prompt non fissava una versione.
- **Mixamo, termini d'uso**: i modelli e le clip di animazione (`character.glb`, `keeper_*.glb`, `kicker_*.glb`) vengono dal gioco precedente di questo progetto e portano il nome `mixamo.com`. Le condizioni d'uso correnti di Mixamo (Adobe) non sono state verificate da qui: da controllare e annotare in `CREDITS.md`.
- **Modelli CC0 (Kenney, Quaternius) non usati**: il prompt li indica come preferenza. Quaternius risponde 404 dall'ambiente di lavoro; per non fabbricare crediti, stadio, porta, pallone, pubblico e cielo sono **procedurali** (geometria e texture generate nel codice). Nessun file esterno, nessuna licenza da citare. Sostituibili quando vuoi.
- **Texture erba e cielo (ambientCG, Poly Haven)**: non integrate, procedurali per lo stesso motivo. L'API di Poly Haven risponde: si può aggiungere una texture CC0 in un secondo momento.
- **Suoni di folla e fischio**: nei pacchetti Kenney CC0 scaricabili senza chiave API non esistono boato, "oooh", applausi né fischio dell'arbitro; Freesound richiede un account. Sono **sintetizzati a runtime** con la Web Audio API. Da sostituire con registrazioni CC0 se vuoi più realismo (Freesound, filtro CC0, poi riga in `CREDITS.md`).
- **Effetti Kenney scelti**: mappatura file → suono in `CREDITS.md`. Le scelte (quale "impact" per il calcio, quale per il palo) sono mie, da ascoltare sul telefono.
- **Musica: scelta fatta a misura, non a orecchio.** In questo ambiente non c'è modo di ascoltare: ho scelto
  confrontando durata, BPM stimato, livello e pulizia della giunzione del loop (`scripts/audio/analizza.mjs`).
  **Da ascoltare sul telefono prima della festa**, soprattutto il carattere di `tensione` (è un ambient cupo) e
  i tre stinger. La catena è ripetibile: `node scripts/audio/musica.mjs`.

  | Ruolo | Scelta | Misure | Scartati e perché |
  |---|---|---|---|
  | `inno` | *Cynic Battle Loop* (Ferk, CC0) | 92 s, BPM stimato 144, giunzione 0,4 dB | *Determined Pursuit* (108 s ma giunzione 5,4 dB e BPM 161); *Übermensch Main Menu* (35 s, sotto il minimo di 45, BPM 66); *Epic March Loop* (43,6 s e giunzione 13,3 dB, scalino udibile) |
  | `tensione` | *Ancient caverns* (congusbongus, CC0) | BPM stimato 86 (nella finestra 70–100), giunzione 0,7 dB, ridotto a 28 s | *Darkest Hour* (96 s, giunzione 27,8 dB); *Deep Space Array* (104 s, giunzione 41 dB, 8 s di silenzio in coda); *Post Apocalyptic Wastelands* (324 s, giunzione 66 dB); *Dark Place* (giunzione ottima ma BPM 144, fuori finestra); *Searching* (silenzio a entrambi i capi, BPM 172) |
  | stinger | Kenney *Music Jingles* | 1,3–1,6 s | **Il pack non ha nulla di 3–6 s come chiesto: il jingle più lungo è 1,76 s.** Gli stinger sono quindi brevi; se servono più lunghi vanno presi altrove |

  Il BPM è stimato con un'autocorrelazione grezza dell'energia: può sbagliare di un fattore 2. `inno` a 144
  stimati è appena sopra la finestra 100–140 chiesta, ma è l'unico candidato con giunzione quasi perfetta.
- **Formato**: MP3 (Safari su iOS non riproduce Ogg Vorbis in modo affidabile). Il silenzio di codifica del
  MP3 è saltato con `loopStart`/`loopEnd` calcolati dal buffer decodificato, così il loop non ha buchi.
- **Telecronaca** (opzionale): file in `public/assets/rigori/audio/vo/`; finché mancano, solo testo a schermo. ElevenLabs con voce italiana, se vuoi.
- **Stile big head** (rifacimento visivo richiesto in corso d'opera): raggio testa 0,32 m, pelle #C8956D, strisce 512×512, fog `FogExp2(0x0E1116, 0.018)`, bloom 0,4/0,6/0,85, vignetta 35 %, ACES 1,1 sono le indicazioni date; **miei** e da verificare sul telefono: scala del corpo 0,7 (per avere la testa ≈ 40 % dell'altezza), spessori delle capsule, 6 400 spettatori e 1 800 telefoni (costo CPU/GPU su telefoni vecchi: la degradazione automatica abbassa il pubblico al 50 %), intensità dei fari (3 800 cd) e degli accenti (140 cd), auto-illuminazione dei volti (0,28) e schiarimento automatico delle foto scure.
- **Audio, volumi e sintesi**: i volumi relativi (effetti 0,9, musica 0,7, ducking a 0,28) e i suoni sintetizzati (fischio a 2 650 Hz, boato, "oooh", applausi) sono scelti a orecchio in un ambiente senza altoparlanti: da provare sul telefono. Il fischio parte a ogni cambio di turno dentro una modalità.
- **Telecronaca**: i file attesi in `public/assets/rigori/audio/vo/` sono `gol.mp3`, `parata.mp3`, `fuori.mp3`, `palo.mp3`, `traversa.mp3`, `incrocio.mp3`; se mancano, solo testo a schermo.
- **Progressione, definizioni mie**: "Cucchiaio" = potenza < 0,55, mira alta (y > 1,3 m) e centrale (|x| < 1,2 m); "Muro di Ale" = tre parate di fila da portiere; "Speedrun" conta i gol nelle modalità Sfida Ale e Skill; la classifica locale dello Shootout ordina per vittoria (100) + gol ×10 − gol subiti. Livelli dei singoli sblocchi in `src/rigori/data/unlocks.js` (Boss al livello 5, come da schermata Modalità).
- **Tiro deterministico**: il ritardo di reazione del portiere è 0,26–0,32 s (facile), 0,22–0,30 s (normale), 0,18–0,24 s (Boss), dentro la finestra 180–320 ms chiesta e col Boss più basso. La finestra dell'animazione del tuffo è riscalata perché l'allungo finisca 0,25 s dopo l'impatto, e il corpo arrivi sulla palla esattamente all'istante del contatto col guanto: numeri scelti perché il tuffo sia sempre leggibile, **da provare sul telefono**.
- **Costanti della fisica della palla** (integrazione semi-implicita di Eulero a passo fisso 1/120 s, 3,2 s al massimo): gravità 9,81 m/s² e velocità iniziale 15–30 m/s sono chieste dal prompt; **scelti da me e da provare sul telefono** il coefficiente di resistenza quadratica 0,0045, il coefficiente Magnus 0,0048 con spin massimo 60 rad/s e decadimento 0,6 (tarato sulla curva massima chiesta: con spin pieno la palla devia di 0,62–0,92 m su 11 m rispetto alla direzione di lancio — 0,77 m a potenza 0,7 — con una freccia di 0,15–0,22 m rispetto alla congiungente partenza-arrivo), la restituzione 0,6 su palo e traversa con scarto preso dal seme, la resistenza ×8 dentro la rete e il raggio del guanto 0,15 m. Con queste costanti il tempo di volo misurato sta fra 0,408 e 0,741 s (finestra chiesta 0,40–0,75 s): è una conseguenza, non un vincolo imposto.
- **Rete che si gonfia**: tessuto Verlet a passo fisso 1/60 s. Sono **miei** lo smorzamento 0,92, la gravità debole 0,5, il richiamo al riposo 0,03, le due passate di vincoli, il raggio d'influenza 0,4 m e la finestra di vita del tessuto di 1,5 s dall'impulso. L'ampiezza `0,05 + 0,012 · v_impatto` è tarata sui due valori chiesti (0,23 m a 15 m/s, 0,41 m a 30 m/s). Sotto i 45 fps la suddivisione si dimezza: la resa a suddivisione ridotta **è da guardare sul telefono**.
- **Camere dei replay**: altezza 1,2 m e distanza 8 m della laterale sono chieste dal prompt; i campi visivi (70° la laterale, 58° la frontale) e il punto inquadrato (il punto medio fra palla e zona del portiere) sono **miei**, scelti perché in ritratto 380×820 il campo visivo orizzontale è poco più di un terzo del verticale e mirando alla sola palla il portiere resta fuori inquadratura. Da riguardare su uno schermo più largo.
- **Sfottò**: le frasi in `src/rigori/data/taunts.js` sono mie, tono goliardico; da rileggere con gli interessati prima della festa.
- **Porta 4,40 × 1,82 m, dischetto a 8,5 m**: NON regolamentari. Sono in scala coi personaggi "big head" (alti ~1,5 m equivalenti), perché contro una porta vera il portiere non copriva lo specchio. La larghezza l'ho scelta misurando: a 4,60 i gol erano il 70,5 %, al limite della fascia 60-70 % chiesta; a 4,40 sono il 63,6 %. Le linee del campo sono scalate con lo stesso rapporto. **Da guardare sul telefono**: è una scelta di stile, non di realismo.
- **Velocità della palla 11,5-22 m/s** (era 15-30): scalata col dischetto più vicino, altrimenti il volo scendeva a 0,33-0,60 s e il portiere non faceva in tempo. Il tempo di volo resta 0,45-0,84 s.
- **Parate al 14,8 % e centrali al 26,3 %**, contro gli obiettivi 28-38 % e 70 %. Non è tarabile: lo sweep mostra che rimpicciolire la porta non sposta i centrali (26,3 % a qualunque larghezza). Manca una **clip di parata centrale** — portiere in piedi che si abbassa con le braccia al petto. Finché non c'è, quelle due percentuali restano sotto. **Decisione da prendere insieme.**
- **Il tuffo si ferma a 0,85 m dal palo**, non a 0,4 come chiedevi: farlo arrivare più in là vorrebbe dire tuffarsi oltre il proprio settore (il cui centro sta a 1,47 m). Ho preferito la copertura del settore all'effetto scenico; si cambia con una costante.
- **CLIP_SPAN 0,60** (era 0,95): la posa del tuffo si ferma alla massima estensione invece di proseguire fino a terra durante la finestra dell'impatto. L'atterraggio avviene dopo. Da guardare in movimento: il tuffo è più "tenuto" di prima.
- **Cambio XP gioco → sito** (1 ogni 20, tetto 50, in `src/game.js`): **scelto da me**, il prompt non lo fissava. Serve a non far scavalcare le missioni vere da una partita ai rigori. Da decidere se il peso è giusto.
- **Condivisione su telefono**: qui posso solo verificare che il PNG 1080×1920 venga prodotto e che `MediaRecorder` dichiari `video/mp4`. **Da provare sul telefono**: che lo sheet nativo si apra e che WhatsApp riceva il file su Chrome Android e su Safari iOS, e che su iOS il pulsante video non compaia invece di produrre un file rotto.
- **Tasso di parata dopo il passaggio alla raggiungibilità geometrica**: **3,4 %** su tiri distribuiti su tutto lo specchio. Non è tarabile con le leve consentite (durata del tuffo e reattività): il limite è l'area coperta, ~1,5 m² su 17,9 m². Per alzarlo servono clip di tuffo con allungo maggiore. **Decisione da prendere insieme**, perché cambia il gioco.
- **Arco verticale delle direzioni alte** (0,45 m, `ARCO_ALTO` in `keeper.js`): scelto da me perché senza di esso i guanti non superavano 1,05 m e gli angoli alti erano irraggiungibili per costruzione. È fisso e uguale a ogni tiro, non insegue la palla. Da guardare in movimento sul telefono: è un tuffo stilizzato, non un salto realistico.
- **Raggio della capsula 0,25 m**: è il valore che mi hai dato ed è giusto per il contatto palla-guanto (0,11 + 0,12). Sul braccio (raggio 0,06) la stessa distanza lascia però 8 cm d'aria e il contatto non si *vede*. Se conta di più la resa visiva che la tolleranza, va portato a ~0,18 m.
- **La durata del tuffo è 0,30 s** (`DIVE_DUR` in `copertura.js`): scelta misurando, è quella che massimizza le parate fra 0,16 e 0,45 s. Con 0,45 s le parate erano lo 0,6 %.
- **Dritte e statistiche dei giocatori** (`tips` e `stats` in `src/rigori/data/players.js`): le dritte sono quelle che mi hai dato, adattate di tono; le statistiche (potenza/precisione/effetto su 5 tacche) sono **inventate da me** e **non sono agganciate alla fisica del tiro**: sono un ritratto del personaggio, non un modificatore. Se vuoi che contino davvero, va deciso come (per esempio potenza = moltiplicatore di `velocitaDa`, precisione = scarto della mira).
- **Larghezza della tasca della rete**: il raggio d'impulso è `max(0,4 m; 2,5 maglie)`. A qualità piena vale 0,46 m, a suddivisione dimezzata 0,92 m: la tasca diventa più larga e più morbida. Il picco resta quello chiesto, ma **la resa a qualità bassa va guardata sul telefono**.
- **Ampiezza massima raggiungibile della rete**: 0,32 m, non 0,41 m. La formula `0,05 + 0,012 · v` usa la velocità con cui la palla tocca la rete; partendo al massimo (30 m/s) ne restano ~22 dopo 13 m di volo e 1,8 m dentro la gabbia. Da decidere se tenere così o usare la velocità al calcio.
- **Volti di Mario, Giulio e Ale**: recuperati dal legacy (`face-mario.png` 256×256, `face-giulio.png` 256×256, `keeper-face.png` 512×512 → `face-ale.png`). Sono PNG, non WebP come quelli di Monne: funzionano uguale, ma sono più pesanti (120–360 KB). Convertibili.
- **Integrazione XP col sito**: `src/store.js` usa il prefisso `b40:v1:` con chiavi `person`, `done`, `missions`, `checks`, `scores`, ecc., e gli XP del sito sono **calcolati** dalle missioni, mai salvati. Non esiste un aggregatore. Il gioco scrive solo in `b40:v1:rigori:*` e non tocca le chiavi del sito. Proposta di mappatura, non applicata: una missione del sito "Rigorista" che si completa quando `b40:v1:rigori:xp` supera una soglia, letta da `src/game.js`.
- **Numeri di gioco non specificati dal prompt** (finestra di timing, soglie di potenza, velocità del portiere, XP per livello sono specificati; NON lo sono: raggio di collisione, forza della curva, durata delle animazioni di raccordo, dimensione del pubblico): scelti da me e marcati `// DA VERIFICARE` nel codice.
