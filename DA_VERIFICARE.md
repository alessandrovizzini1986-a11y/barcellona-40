# DA VERIFICARE · Barcelona 40

Generato in parte dagli script dati (`npm run data`). Le sezioni tra marker vengono riscritte a ogni esecuzione.

## geocoding

<!-- geocoding:start -->
- **Enoteca Taps Sagrada Família** (`taps`): coordinate mancanti, errore rete: Nominatim HTTP 429. Query: "Enoteca Taps Sagrada Família, Barcelona"
- **Rooftop Garden – El Palace Barcelona** (`rooftop`): coordinate mancanti, errore rete: Nominatim HTTP 429. Query: "Rooftop Garden – El Palace Barcelona, Barcelona"
- **Parc de la Ciutadella** (`ciutadella`): coordinate automatiche da Nominatim (41.388416, 2.1862546), da controllare sul posto
- **Mercat de Santa Caterina – Xarcuteria Debón** (`santacaterina`): coordinate automatiche da Nominatim (41.3863594, 2.1781611), da controllare sul posto
- **Chao Pescao** (`chaopescao`): coordinate automatiche da Nominatim (41.3861408, 2.1840991), da controllare sul posto
- **Bodega Biarritz 1881** (`biarritz`): coordinate automatiche da Nominatim (41.3792173, 2.1770987), da controllare sul posto
- **Can Fisher** (`canfisher`): coordinate automatiche da Nominatim (41.3946058, 2.2062439), da controllare sul posto
- **Bunkers del Carmel** (`bunkers`): coordinate automatiche da Nominatim (41.4193923, 2.1616974), da controllare sul posto
<!-- geocoding:end -->

## distanze

<!-- distanze:start -->
- f6 ← f5: distanza non calcolata (coordinate mancanti). Tappa marcata `da_verificare`.
- f7 ← f6: distanza non calcolata (coordinate mancanti). Tappa marcata `da_verificare`.
- f8 ← f7: distanza non calcolata (coordinate mancanti). Tappa marcata `da_verificare`.
<!-- distanze:end -->

## Voci aperte (da `data/checks.json`, spuntabili nella sezione Info → Da verificare)

- c1 · Volo di andata di Alessandro: numero e orario (probabile FR2097 06:20→08:05)
- c2 · Voli di ritorno domenica 18: Alessandro, Giulio, Manuel
- c3 · Braseria Sarrià: portare la prenotazione a 2 coperti
- c4 · Hotel: il prezzo €430 include già il 3° adulto? Aliquota tassa di soggiorno? Quando si paga il sovrapprezzo?
- c5 · Hotel: cancellare la richiesta di letto extra per il 4° ospite di sabato (non serve più)
- c6 · Deposito bagagli venerdì mattina 08:05 → 15:00 (Monne)
- c7 · Programma notturno Sala Apolo sabato 17 (interferenza Soundhood a 89 m)
- c8 · SOUNDIT Plaza / Happy Techno Open Air: esistono? orari? (Resident Advisor)
- c9 · Civico esatto Braseria Sarrià e Rooftop Garden El Palace
- c10 · Coordinate geocodificate automaticamente (vedi sezione geocoding)

## Altri dati mancanti o non verificati


- **Album Google Foto: verificare i permessi di caricamento.** Il link risponde 302 e porta a un album condiviso, ma resta da controllare che l'impostazione "Consenti ad altri di aggiungere foto" sia attiva, altrimenti gli altri possono solo guardare. Da controllare aprendo il link in una finestra anonima.

- **Distanze a piedi: motore di routing sostituito.** Il server demo `router.project-osrm.org` ignora il profilo `/foot/` e restituisce sempre percorsi stradali per auto (verificato: `/foot/` e `/driving/` danno risultati identici), quindi gonfiava ogni distanza a piedi. Ora `scripts/distances.mjs` usa Valhalla di OpenStreetMap con costing `pedestrian` (`auto` per le tratte in auto o taxi) e prende i minuti dal tempo restituito da Valhalla, non più da una conversione a 5 km/h. Restano stime su dati OpenStreetMap, non rilievi sul posto.
- **La tappa f4 si chiama "Chao Pescao" nei dati, ma la correzione sulle distanze la chiamava "Bar Joan".** Il nome del locale non è stato cambiato, perché non era richiesto: se il pranzo di venerdì si sposta da Chao Pescao a Bar Joan servono nome, indirizzo e coordinate del nuovo locale.
- **Distanze non calcolate**: `f5→f6`, `f6→f7`, `f7→f8`, perché Enoteca Taps e Rooftop Garden El Palace non hanno coordinate. Le tappe sono marcate `da_verificare`.

- Numero volo di Giulio (atterraggio 07:40 confermato) e di Manuel (09:45).
- Enoteca Taps Sagrada Família e Rooftop Garden El Palace: nessuna coordinata (Nominatim non le trova); le tappe f6/f7 sono `da_verificare` e sulla mappa compaiono nella lista "Senza coordinate". Inserire `lat`/`lng` a mano in `data/venues.json` con `verified:true`.
- Distanze f5→f6→f7→f8 non calcolate per lo stesso motivo.
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
- **Musica**: `public/assets/rigori/audio/music/inno.mp3`, `tensione.mp3`, `vittoria.mp3` mancano. Finché mancano il gioco resta in silenzio, senza musica sintetica. Prompt suggeriti per Suno:
  - Inno: `Epic football stadium anthem, triumphant brass and big drums, Mediterranean, uplifting, 120 bpm, crowd energy, cinematic, instrumental`
  - Tensione: `Tense pre-penalty suspense loop, low sustained strings, heartbeat percussion, rising tension, seamless loop, minimal, instrumental`
  - Vittoria: `Short 5-second victory sting, celebratory brass fanfare, joyful, punchy ending, instrumental`
- **Telecronaca** (opzionale): file in `public/assets/rigori/audio/vo/`; finché mancano, solo testo a schermo. ElevenLabs con voce italiana, se vuoi.
- **Volti di Mario, Giulio e Ale**: recuperati dal legacy (`face-mario.png` 256×256, `face-giulio.png` 256×256, `keeper-face.png` 512×512 → `face-ale.png`). Sono PNG, non WebP come quelli di Monne: funzionano uguale, ma sono più pesanti (120–360 KB). Convertibili.
- **Integrazione XP col sito**: `src/store.js` usa il prefisso `b40:v1:` con chiavi `person`, `done`, `missions`, `checks`, `scores`, ecc., e gli XP del sito sono **calcolati** dalle missioni, mai salvati. Non esiste un aggregatore. Il gioco scrive solo in `b40:v1:rigori:*` e non tocca le chiavi del sito. Proposta di mappatura, non applicata: una missione del sito "Rigorista" che si completa quando `b40:v1:rigori:xp` supera una soglia, letta da `src/game.js`.
- **Numeri di gioco non specificati dal prompt** (finestra di timing, soglie di potenza, velocità del portiere, XP per livello sono specificati; NON lo sono: raggio di collisione, forza della curva, durata delle animazioni di raccordo, dimensione del pubblico): scelti da me e marcati `// DA VERIFICARE` nel codice.
