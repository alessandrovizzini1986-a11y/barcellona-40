# Changelog · Barcelona 40

## Fase 1 · Setup
- Sito precedente spostato in `_legacy/` (non cancellato).
- Scaffold Vite vanilla, dipendenze: leaflet, canvas-confetti, lucide, @fontsource-variable/inter.
- Font self-hosted: Clash Display 600/700 (Fontshare), Inter variable.
- `index.html` con meta, Open Graph, preload font. Nessun manifest, nessun service worker.

## Fase 2 · Dati e script
- 5 JSON in `data/` (people, venues, itinerary, missions, checks) come da specifica.
- `scripts/geocode.mjs` (Nominatim, 1 req/1,1 s; fallback sull'indirizzo solo se restituisce il civico esatto), `scripts/distances.mjs` (OSRM foot, minuti a 5 km/h; oltre 5 km → `distMode:auto` senza minuti), `scripts/validate.mjs`.
- Taps e Rooftop Garden non geocodificati: tappe f6/f7 marcate `da_verificare` (senza coordinate non possono avere il badge `geocoded`).

## Fase 3 · Design system
- Token "Trencadís digitale", base, layout, componenti, motion, viste. Mosaico SVG seedato per giorno (`src/ui/mosaic.js`).
- Store localStorage con fallback in memoria, time.js con override `?now=`, router hash con View Transitions, tab bar, card tappa, badge, ring, toast, sheet, confetti lazy, easter egg "40".

## Fase 4 · Onboarding, Oggi, Programma
- Onboarding "Chi sei?" con 4 card, confetti brevi, salvataggio persona.
- Oggi: countdown + checklist pre-partenza, bento durante il weekend (Adesso, Prossima, Progresso, Copia riepilogo, Da verificare per Alessandro), "Missione compiuta" dopo.
- Programma: segmented Ven/Sab/Dom, timeline filtrata per persona, empty state dedicati.

## Fase 5 · Mappa
- Leaflet in chunk separato caricato con `import()` alla prima apertura. Tile CARTO dark (light nel tema chiaro), layer per giorno con toggle, marker numerati, polilinee, popup con Maps, "Dove sono" on-demand con toast in caso di errore. Tappe senza coordinate elencate sotto la mappa.

## Fase 6 · Missioni e gamification
- Ring XP, livelli, missioni per persona con checkbox (sincronizza la tappa come fatta), timer live della missione Speedrun (giallo sotto 30 min, rosso sotto 15), badge con reveal, classifica con Esporta/Importa (`b40:` + base64).
- Easter egg: pressione 2 s sul titolo "Barcelona 40" → 40 tessere che formano il numero + confetti.

## Fase 7 · Info, Speedrun, DA VERIFICARE
- Info: accordion (appartamento, documenti, eSIM, regole anti-mal di testa, 112, profilo con cambio persona/tema/gamification, DA VERIFICARE da `checks.json` con checkbox persistenti attive solo per Alessandro).
- Speedrun per Monne: banner dalla vista Oggi, timer live verso le 08:15, sveglia 07:15 negli appunti, timeline compressa f1→f8 + s2, cosa portare via.

## Fase 8 · Copy e documentazione
- Copy rivisto (tu diretto, àncora "Zero fatica, tutto gusto", niente parole vietate, dati `da_verificare` sempre condizionali).
- `README.md` (aggiornare i JSON, deploy), `DA_VERIFICARE.md` finale.

## Fase 9 · QA
- Test e2e Playwright (45 casi: date, profili, mappa, missioni, storage rotto, easter egg, overflow), screenshot 380×800, Lighthouse 100/100/100/100, `QA_REPORT.md`.
- Fix da QA: contrasto testi piccoli, `robots.txt`, fine weekend 30 min dopo l'ultima tappa, card con orario e titolo impilati.

## Mappa · chiave CARTO
- Tile raster CARTO (`rastertiles/dark_all` e `light_all`) con chiave API: sparisce la filigrana "API key required". Attribution CARTO + OpenStreetMap invariata.

## Sito precedente ripubblicato
- Plugin `copy-legacy` in `vite.config.js`: copia `_legacy/` dentro `dist/` a fine build, così gli URL storici tornano online (`viaggio.html`, `tour.html`, `londra.html`, `rigori.html`, `soldi/`, `gym/`, `cards/`, `img/`, …).
- Esclusi i tre file di root che collidono con il sito nuovo: `index.html` (la home è quella nuova), `sw.js` (il vecchio service worker precacheava la vecchia home e si riprenderebbe il sito nuovo: deve restare 404 per disinstallarsi) e `manifest.json` (lo usava solo la vecchia home).
- Il plugin non sovrascrive mai un file prodotto dalla build.

## Venerdì · Barcelona Duck Store
- Nuovo venue `duckstore` (Carrer dels Banys Nous 1, Barri Gòtic, coordinate verificate) e tappa `f3b` alle 12:15, tra il Mercat de Santa Caterina e Chao Pescao.
- Nuova missione `m13` "Duck Hunter" (30 XP, Alessandro e Monne). Soglie dei livelli invariate.
- Distanza di `f4` ricalcolata dal Duck Store con `scripts/distances.mjs`.
- Documentato un limite del server OSRM pubblico: ospita solo la rete per auto e restituisce la stessa distanza per ogni profilo, quindi le distanze "a piedi" calcolate sono sovrastimate. Dettagli in `DA_VERIFICARE.md`.
- **Motore di routing sostituito.** `scripts/distances.mjs` non usa più OSRM: il server demo ignora il profilo `/foot/` e restituisce percorsi per auto, gonfiando tutte le distanze a piedi. Ora usa Valhalla di OpenStreetMap (POST, costing `pedestrian`; `auto` per le tratte in auto o taxi, 600 ms tra le chiamate, un secondo tentativo in coda e badge `da_verificare` se non risponde). I minuti vengono dal tempo restituito da Valhalla, non più da una conversione a 5 km/h. Google Maps Directions richiederebbe una chiave a pagamento, non disponibile.
- Inseriti i valori verificati: `f3b` 677 m/9 min, `f4` 729 m/9 min, `f5` 1279 m/16 min, `s4` 1309 m/16 min, `s5` 527 m/7 min (era 975/12), `s7` 672 m/8 min (era 1640/20). Ricalcolate con Valhalla `f2`, `f3`, `s6`, `s8`, `d2`, `d3`.
- Allineati i testi che citavano le vecchie distanze: "perché" di `s5`, dettagli di `s1`, `s4` e `s7`.

## Cache del browser
- `public/_headers` con le regole di cache (rivalidazione per `index.html` e `/data/*`, un anno immutabile per `/assets/*`). Lo legge Cloudflare Pages; GitHub Pages lo ignora.
- I dati erano già importati come moduli in `src/data.js`, non via fetch: finiscono nel bundle con hash nel nome, quindi una modifica ai dati produce un file nuovo e la cache non può servire dati vecchi.
- `__BUILD_ID__` definito in `vite.config.js` e mostrato in fondo alla vista Info, con il pulsante "Ricarica l'ultima versione" come rete di sicurezza.

## Album foto condiviso
- `PHOTO_ALBUM` e `SITE_URL` in `src/store.js`, `__SITE_URL__` iniettato in build (il workflow lo imposta all'URL GitHub Pages reale).
- `src/ui/album.js`: banner "Album del weekend" con mosaico in filigrana, "Apri l'album" e "Copia link". Visibile a tutti i profili.
- `src/ui/share-album.js`: "Manda l'album ai ragazzi" con messaggio WhatsApp già pronto, copia messaggio, invio del solo link del sito e anteprima richiudibile. Creato solo per Alessandro, per gli altri non esiste nel DOM.
- Oggi: banner primo blocco durante il weekend, sotto il countdown prima, e "Guarda com'è andata" come azione principale dopo il 18/10. Prima della partenza Alessandro ha il blocco di invio in fondo alla checklist.
- Info: nuova sezione "Foto", prima e già aperta. Header: icona macchina fotografica in tutte le viste. Tab bar invariata a 5 voci.
- Missione `m14` "Album Contributor" (40 XP, tutti). Pulsante "Carica su album" su `m9` e `m14`. Livelli invariati.
- Corretto un bug scoperto qui: `mosaicDataUri()` restituiva `url("…")` con virgolette doppie e, inserito in un attributo `style`, ne chiudeva il valore in anticipo rompendo il markup. Ora usa apici singoli.

## L'inno ufficiale
- `public/media/`: `vizzo_barcellona_hit.mp3` (3,7 MB) e `vizzo_barcellona_hit.mp4` (6,1 MB, 824x1464 verticale), entrambi 2:45 verificati leggendo i metadati dei file.
- `public/media/song-poster.jpg` (824x1464): illustrazione originale in stile trencadís con il titolo, generata da `scripts/qa/poster.mjs`. ffmpeg non poteva estrarre un frame perché la build disponibile è priva dei decoder h264 e mp3.
- `src/ui/song.js`: card "Disonesti" con player audio nativo, toggle per il video (`playsinline`, `preload="none"`, poster), due download con nome file esplicito, invio su WhatsApp e testo richiudibile. Audio e video non suonano mai insieme; il disco ruota solo durante la riproduzione e sta fermo con `prefers-reduced-motion`.
- Oggi: la card è il secondo blocco, subito sotto il banner album. Info: nuova sezione "La canzone" dopo "Foto", aperta di default. Header: icona musica in tutte le viste. Tab bar invariata a 5 voci. Onboarding non toccato.
- Missione `m15` "Coro Ufficiale" (50 XP, tutti). Livelli invariati.
- `public/_headers`: `/media/*` con `max-age=604800`.
- Due scostamenti dalla specifica, per farla funzionare: i percorsi dei media passano da `import.meta.env.BASE_URL` invece di essere assoluti (`/media/...` darebbe 404 sotto `/barcellona-40/`), e l'icona musica punta a `#/info/canzone` invece di `#/info#canzone`, che un router a hash non può interpretare.
- Due difetti trovati dai test e corretti: `bindSong` marcava il contenitore come collegato, ma `#app` sopravvive ai re-render mentre audio e video vengono ricreati, quindi dalla seconda vista restavano senza listener; e `.song__video` con `display:flex` batteva l'attributo `hidden`, lasciando il video sempre visibile.
- Testo di "Disonesti" pubblicato: dieci sezioni, etichette in maiuscoletto grigio, ritornello in terracotta più grande, cori tra parentesi in giallo. Rimossi il segnaposto e la voce in `DA_VERIFICARE.md`.
- Nuova vista `#/coro`: le quattro righe del ritornello a schermo pieno, tab bar nascosta, raggiungibile dal pulsante "Modalità coro" nella card. La tab bar resta a 5 voci.

## Canvas papera
- `public/media/disonesti-canvas.mp4` (540x720, 9,2 s, muto, loop) e `disonesti-canvas-poster.jpg` (primo frame). Costanti `CANVAS_MP4`, `CANVAS_POSTER` e `SONG_URL` in `src/store.js`, percorsi sul base path come gli altri media.
- La card della canzone ha il video in loop come sfondo: `autoplay muted loop playsinline`, `preload="metadata"`, poster, `aria-hidden`, fuori dal tab order, in pausa quando esce dallo schermo (IntersectionObserver). Con `prefers-reduced-motion` o risparmio dati attivo il video non viene creato né scaricato: resta il poster come immagine statica.
- Inquadratura: `object-fit: cover; object-position: center 60%`. Sul telefono la card è molto più alta che larga e il ritaglio sarebbe orizzontale, quindi il video tiene il suo 3:4 ancorato in alto e sfuma nel fondo della card (`mask-image`), con un palco di 240 px sopra titolo e pulsanti dove la papera resta visibile. Quando la card è più larga che alta il video copre tutto e il 60% verticale tiene la papera.
- Gradiente sopra il video da `rgba(14,17,22,.25)` in alto a `.88` in basso, con titolo e pulsanti in basso.
- `public/canzone.html`: pagina ponte con l'Open Graph della papera (titolo, descrizione, `og:image` = poster) che porta subito a `#/info/canzone`. Il pulsante "Manda ai ragazzi" condivide questo URL, così su WhatsApp l'anteprima è la papera. Un router a hash non può avere Open Graph diversi per vista: è l'unico modo.
- Il documento "canvas video in loop" citato nella richiesta non è mai arrivato in questa sessione: applicato lo schema standard più le precisazioni date.
- Caricato anche `disonesti-canvas-9x16.mp4` (404x720): non era nella specifica, non è stato pubblicato.

## Gamification affidabile
- **Bug segnalato**: spuntando "Fatto" arrivavano gli XP, togliendo la spunta il titolo restava barrato con la casella vuota. Causa: `bindCards` e i listener `change` di Missioni, Info e Oggi si aggiungevano a `#app` a ogni render senza mai essere rimossi; `#app` sopravvive al cambio di vista, quindi dopo N navigazioni un tocco faceva N toggle. Con N pari lo stato tornava indietro mentre la casella restava dove l'aveva messa il dito; con N dispari i toast uscivano più volte.
- Ogni vista registra ora i listener con un `AbortController` e li abortisce nel cleanup restituito al router: nessun accumulo.
- Le checkbox scrivono lo stato che mostrano (`store.setDone / setMission / setCheck(id, on)`), mai un toggle: anche un doppio evento non può più sfalsare nulla.
- Tappa e missione collegata sono uno stato solo, in entrambe le direzioni (`game.setStopDone`, `game.setMissionDone`): prima togliere una missione lasciava la tappa barrata. La missione si completa solo se la persona ne fa parte.
- Toast e coriandoli solo alle transizioni reali; togliendo una spunta un toast discreto dice quanti XP se ne vanno.
- In Oggi l'anello di progresso e il contatore del giorno si aggiornano al tocco. Tutte le card della stessa tappa sulla pagina restano allineate.
- Prompt che ha guidato l'intervento in `docs/prompts/gamification-fix.md`. Nuova suite `scripts/qa/gamification.mjs`.

## Viaggio: voli, parcheggio con QR, lounge e checklist
- `data/viaggio.json`: due voli di Alessandro (FR2097 andata, FR5220 ritorno, prenotazione TZWSXS) più il ritorno di Monne, parcheggio P2 di Bologna (prenotazione 2932537, €51,00, pagato), Sala VIP Canudas al T2 e le due timeline (venerdì 7 passi, domenica 11). Tutto `verificato`: viene dalle schermate di prenotazione, niente stime.
- `public/assets/viaggio/qr-parcheggio-p2.png`: il PNG fornito, 1024×1024, copiato in `dist/` byte per byte (sta in `public/`, quindi la build non lo ricomprime). Contenuto decodificato e confermato: `$BLQ2932537LGT@`.
- Card del parcheggio: QR da 251 px già nella card su fondo bianco, un tocco lo porta a schermo pieno (fondo bianco, 348 px su un telefono da 380, `image-rendering: pixelated`, mai ingrandito oltre la sorgente), Wake Lock e `requestFullscreen` con try/catch e ripresa al rientro dal background. Sotto il QR resta sempre "P2 · codice 2932537 · Alessandro Vizzini". Lo screenshot del QR a schermo pieno è stato riletto da un decodificatore: torna la stringa giusta.
- La lounge compare solo sul ritorno. All'andata nessuna lounge, da nessuna parte.
- Vista Info: "Viaggio" è il primo accordion, aperto. Vista Oggi: il 16 e il 18 la timeline del viaggio sta in cima, col passo in corso evidenziato. Vista Programma: i passi entrano nella timeline del giorno come card normali, in ordine di orario, con le icone `plane-takeoff` / `plane-landing` / `car`; atterraggio del venerdì e fine Bunkers non vengono duplicati, perché sono già tappe.
- Checklist del bagaglio a mano in `b40:v1:checklist:viaggio`, solo per il profilo `ale`: per gli altri non è nel DOM, insieme al QR e alla lounge.
- `WEEKEND_END` spostato dal 18 alle 20:30 al 19 all'01:40, 30 minuti dopo il ritiro dell'auto al P2: col volo delle 23:05 il sito dichiarava "Missione compiuta" mentre Alessandro era ancora in lounge. `dayKey` ora fa appartenere le ore prima delle 04:00 alla sera precedente, come già faceva `stopDate` (l'Apolo delle 00:15 è sabato notte, l'atterraggio delle 00:50 è ancora domenica); il venerdì mattina resta venerdì.
- Volo di andata di Alessandro ora verificato in `data/people.json` (prenotazione TZWSXS, stesso volo di Monne) e ritorno compilato: il check `c1` è chiuso, `c2` resta aperto solo per Giulio e Manuel.
- `scripts/validate.mjs` controlla anche `viaggio.json`: orari, badge, persone, sequenza dei passi, esistenza e peso del PNG del QR, didascalia che riporta il codice. Nuova suite `scripts/qa/viaggio.mjs` (46 controlli).

## Venerdì a livello strada, foto delle tappe
- **Fuori**: Chao Pescao (non è più nell'itinerario), la checklist pre-partenza della vista Oggi (tutto fatto) e quattro sezioni di Info: Documenti, eSIM, Regole anti-mal di testa, Numeri utili. Restano Viaggio, Foto, La canzone, Extra, Appartamento, Profilo, Da verificare.
- **Nuova mattina**: Ciutadella 09:30 → Santa Maria del Mar → Carrer de Montcada → Pont del Bisbe → Plaça de Sant Felip Neri → Duck Store → Mercat de Santa Caterina → pranzo da Bar Joan dentro il mercato → appartamento. 4,3 km in 55 minuti effettivi spalmati su cinque ore. Distanze e minuti sono quelli verificati (Valhalla, profilo pedonale): badge `verificato`, niente `stimato`.
- **Rinumerazione**: la mattina occupa f2…f11, quindi aperitivo, tramonto e cena diventano f12, f13, f14. Aggiornati di conseguenza missioni (m1→f8, m13→f7, m2→f13, m3→f14), check (c3/c9→f14, c4/c5→f11) e gli skip di Giulio e Manuel. Chi aveva già spuntato qualcosa sul telefono si ritrova le spunte su tappe diverse: prima del viaggio non cambia niente di sostanziale.
- **Nuovi venue verificati**: Santa Maria del Mar, Carrer de Montcada, Pont del Bisbe, Plaça de Sant Felip Neri, Bar Joan. Coordinate aggiornate per Ciutadella e Santa Caterina, che non sono più `geocoded`. Chao Pescao rimosso.
- **Foto delle tappe da Wikimedia Commons** (`scripts/foto-tappe.mjs`, `npm run foto`): ricerca via API, filtro sulla licenza letta in `extmetadata` (solo CC0/CC BY/CC BY-SA/pubblico dominio), scelta a mano fra i candidati orizzontali e diurni, 800 px, WebP q80 con ffmpeg. Sei foto, 544 kB in tutto. Le foto di Google Places non sono utilizzabili: attribuzione per singolo autore e nessun diritto di ripubblicazione.
- **Card con foto**: immagine 16:9 in cima, orario in `--font-display` sopra un gradiente scuro, `loading="lazy"` su tutte tranne la prima con foto, attribuzione "foto: autore / licenza" sotto il contenuto con link alla pagina Commons. Se l'immagine non carica resta il riquadro col mosaico trencadís. Duck Store ha una paperella SVG disegnata qui, Bar Joan nessuna immagine.
- **Voto e recensioni** del posto diventano un chip sulla card, quando il dato c'è.
- Il nome del posto non si ripete più sotto il titolo quando è già nel titolo.
- Nuova suite `scripts/qa/venerdi.mjs` (36 controlli): sequenza, foto, attribuzioni, fallback al mosaico, sezioni Info rimosse, marker e percorso della mappa, peso della pagina.

## Immagini per tutte le tappe
- **15 foto da Wikimedia Commons** (`scripts/fetch-photos.mjs`, `npm run foto`): scaricate a 1600 px, ritagliate 16:9 con bias verticale dove serve (Sagrada 0,10, Santa Maria 0,15, El Palace 0,25, Monumental 0,35, altrimenti centrato), ridimensionate a 800×450 e convertite in WebP q80 con sharp. La licenza si legge da `extmetadata` **prima** di salvare: se non è CC0/CC BY/CC BY-SA/pubblico dominio il file non viene usato. Autori e licenze corrispondono uno a uno all'elenco atteso.
- Commons risponde 429 se lo si martella: lo script fa una richiesta alla volta, con pausa di 0,7 s e ritentativi a 2-4-8-16 s. Al primo giro tre foto erano saltate proprio per questo.
- **10 card stilizzate** (`scripts/gen-cards.mjs`, `npm run cards`): SVG 800×450 con mosaico trencadís seedato (PRNG con seme diverso per card, celle da 50 px, colore d'accento in doppia copia nell'urna), vignettatura radiale e icona in stile Lucide. Grafica originale: nessuna attribuzione dovuta, e infatti sotto queste card non compare nessun credito.
- **Ogni tappa dei tre giorni ha il campo `img`**, più i due voli, il parcheggio e la lounge in `data/viaggio.json`. `npm run validate` ora fallisce se una tappa non ha l'immagine, se il file non esiste o se una `.webp` non ha i crediti.
- **Card**: immagine 16:9 in cima, orario in `--font-display` sopra un gradiente da `rgba(14,17,22,.9)`, `loading="lazy"` su tutte tranne la prima della vista, `alt` descrittivo in italiano uno per immagine, fallback al mosaico se il file non arriva. L'attribuzione compare solo sotto le foto.
- Cartella `public/assets/tappe/`: 25 file, 1,10 MB in tutto. La pagina più pesante (venerdì, 14 immagini) sta a 0,85 MB.
- Nuova suite `scripts/qa/immagini.mjs` (61 controlli): misure dei file, licenze, crediti in CREDITS.md, campo `img` su ogni tappa, attribuzioni presenti solo dove dovute, lazy loading, 16:9, peso, fallback.

## Venerdì: durate esplicite, jamón dopo pranzo, piano pioggia
- **`durataMin` su ogni tappa della mattina** e chip `⏱` sulla card accanto a quello dei metri: quanto si sta in un posto è un dato, non più il buco fra due orari. Orari della mattina riscritti di conseguenza (Santa Maria 10:30, Montcada 10:50, Pont del Bisbe 11:20, Sant Felip 11:35, Duck Store 11:50, mercato 12:20, Bar Joan 12:45).
- **Avviso del conto in cima al venerdì**, coi numeri sommati dai dati e mai scritti a mano: soste 3h45 + cammino 54 min = 4h39 fra le 09:30 e le 14:20, restano 11 minuti di margine. (Nella richiesta erano 20: il calcolo dice 11, ed è quello che il sito mostra.) Il consiglio "taglia la Ciutadella" compare solo col sereno, perché sotto la pioggia la Ciutadella è già a 15 minuti.
- **Jamón spostato dopo pranzo**: nuova tappa `f10` alle 14:05 da Xarcuteria Debón, all'uscita dal mercato. Resta fuori dal frigo un'ora invece di tre. La tappa del mercato delle 12:20 non parla più di jamón, e la missione "Jamón Hunter" si è spostata con lui. Nuovo venue `debon` (coordinate del mercato: il banco è dentro).
- **Bar Joan**: non prende prenotazioni, arrivare entro le 13:15, menù 3 portate €15-16, chiude alle 15:30 (domenica chiuso), 4,6 su 1.483, telefono. Avviso giallo sulla card: "Non si prenota. Alle 13:15 sei dentro, alle 13:30 sei in coda."
- **Piano pioggia**: nuova tappa `f2b` El Born Centre de Cultura i Memòria (Plaça Comercial 12, ingresso gratuito, 40 minuti, foto di Olga Gairin da Commons) che esiste **solo** in modalità pioggia. Toggle "Piove" sopra la timeline di venerdì, salvato in `b40:v1:piove`: acceso, la Ciutadella scende a 15 minuti, entra El Born e **tutti gli orari successivi si ricalcolano a cascata dalle durate** (`ricalcola` in `src/data.js`), nessun orario di pioggia è scritto a mano. Spento, si torna esattamente alla tabella.
- La numerazione delle tappe (i marker sulla mappa) si calcola sulla lista che vedi davvero: senza pioggia El Born non c'è e i numeri non saltano.
- Rinumerazione: la mattina arriva a `f11`, quindi check-in `f12`, Taps `f13`, Rooftop `f14`, Braseria `f15`. Aggiornati missioni, check e skip.
- QA: `scripts/qa/venerdi.mjs` sale a 46 controlli, fra cui il conto della giornata ricalcolato in modo indipendente dal JSON e confrontato con quello mostrato a schermo, in tutte e due le modalità.

## Domenica: Can Fisher esce, entra El Mirador
- **Can Fisher rimosso** dall'itinerario, con il suo venue e la card stilizzata `canfisher.svg` (e l'icona del pesce in `gen-cards.mjs`, che non serviva più a nessuno). `grep -rin "fisher" src data public` torna vuoto.
- **Nuova tappa `d1`: Pranzo · El Mirador**, domenica 13:30, prenotato per 3, Carrer de Pasteur 2, Horta-Guinardó. Coordinate verificate, 4,5 su 1.386, domenica 12:00–17:00, `durataMin` 90. Nuovo venue `elmirador` col telefono e l'orario.
- **La distanza si è spostata sulla tappa giusta**: i 632 m · 12 min a piedi sono da El Mirador ai Bunkers, quindi stanno sulla tappa dei Bunkers, che prima portava 5,6 km in auto da Can Fisher. El Mirador non ha distanza dalla tappa precedente: non c'è un percorso verificato da misurare, e la card non mostra un numero inventato.
- **Foto vera del locale**, privata, usata con permesso: `elmirador.webp`, ritagliata 16:9 e portata a 800×450 WebP q80 come tutte le altre. Non essendo di Commons **non ha attribuzione sulla card** e non entra nella tabella delle licenze libere: è dichiarata nel campo `private` di `data/foto-tappe.json` (che ora scrive `fetch-photos.mjs`, così `npm run foto` non la cancella) e in `CREDITS.md` come "per gentile concessione". `npm run validate` sa distinguere i due casi.
- Il consiglio "taglia la Ciutadella" nell'avviso del conto compare solo di venerdì: la domenica il conto dice soste 1h30 + cammino 12 min fra le 13:30 e le 16:00, con 48 minuti di margine.
- `scripts/qa/immagini.mjs` sale a 67 controlli: fra i nuovi, che l'attribuzione compaia sotto le foto di Commons e **non** sotto quella privata.
- La cartella delle immagini è a 1,25 MB: sopra il tetto di 1,2 fissato nel giro precedente. Il controllo è a 1,4 MB e la cosa è annotata in `DA_VERIFICARE.md`: buttando `sarria.webp` e `pobleespanyol.webp`, che non sono assegnate a nessuna tappa, si torna a 1,14 MB.
## Londra · itinerario V2 e foto per ogni tappa
- **Itinerario V2** in `_legacy/londra.html`: fuori Borough Market, Camden Town, Tower Bridge e Golden Hinde; dentro Southbank Centre/Winter Market, Whitehall e Horse Guards, Big Ben, Natural History Museum, e Covent Garden spostato al martedì. Aggiunte anche le tappe di trasferimento (aeroporti, volo, metro) e la spesa da Lina Stores. Gli orari sono **una proposta** ricavata da voli, check-in e distanze: la pagina lo dice in chiaro, in cima al programma e nelle note della timeline.
- **23 foto da Wikimedia Commons** (`scripts/londra-foto.mjs`, `npm run foto:londra`): stesso metodo di Barcellona, cartella separata `public/assets/tappe/londra/`. Licenza letta da `extmetadata` prima di salvare, ritaglio 16:9 con bias verticale dove il soggetto è alto (insegna di Lina Stores 0,10, London Eye e Natural History Museum 0,15, luci di Regent Street 0,20), 800×450, WebP q80.
- I file sono stati scelti **guardando i provini uno per uno**: la ricerca su Commons restituiva il mozzo del London Eye, il quadrante di Big Ben, il Clock Tower di Città del Capo e il Harrods Depository di Barnes, tutti scartati a vista. Per Big Ben la prima tornata di query è stata rifatta da capo.
- Nessuna foto libera del Winter Market di Southbank: al suo posto le scale gialle del Southbank Centre. Per Harrods si è scelta di proposito la facciata con le luminarie, perché la tappa è per le vetrine di Natale.
- **1 card stilizzata** (`scripts/londra-cards.mjs`, `npm run cards:londra`) per l'appartamento di Beak Street, nella palette "London Winter Night" (oro `#d4a94e`, rosso `#c8362b`, blu notte). Lina Stores non ne ha avuto bisogno: su Commons c'è la foto della vetrina.
- Tetto della cartella a 1,5 MB: alla prima passata erano 1577 kB, così lo script ricomprime a q70 le più pesanti finché rientra (1498 kB di foto + 16 kB di card).
- **Card**: foto 16:9 in cima con orario in sovrimpressione sul gradiente, `loading="lazy"` tranne la prima, `alt` descrittivo in italiano, fallback al mosaico se il file non arriva, attribuzione con link a Commons solo sotto le foto vere.
- Sezione "Il viaggio di Olly" e versione stampabile allineate al V2: via Tower Bridge e la nave dei pirati, dentro la guardia a cavallo, la balena del Natural History Museum e il mercato di Covent Garden. Tolto anche l'albero di Trafalgar Square: a metà novembre di solito non è ancora montato, e la sezione funziona solo se la bambina ritrova dal vivo quello che ha visto in foto.
- **Voli confermati** dagli screenshot della prenotazione BA: andata **BA547** del 15/11 (BLQ 07:00 → LHR 08:40, Airbus A320neo), ritorno **BA546** del 17/11 (LHR 18:10 → BLQ 21:25, Airbus A320), entrambi dal Terminal 5, Economy. Numeri di volo, aeromobile e terminal ora sono sulla pagina; lo stato passa da "da prenotare" a "prenotato" nella scheda voli e nel budget, e la voce di checklist diventa il check-in online con i posti vicini.
- Corretta la durata dell'andata: la card diceva "un'ora e quaranta" leggendo gli orari sull'orologio, ma il volo dura **2h40** e a Londra si guadagna un'ora di fuso (il ritorno è 2h15). L'errore era mio, non della prenotazione.
- Foto del volo sostituita: al posto dell'A319 c'è un **A320neo** di British Airways (G-TTNN, fotografato a Heathrow, CC0), cioè il modello che vola davvero all'andata.
- **Biglietti del Natural History Museum** con barcode veri: nuova sezione `#biglietti` con i tre ingressi (2 adulti + Olly, Order ID 7800197) come **CODE128 scansionabili**, generati con JsBarcode 3.12.3 da cdnjs con SRI. Riquadro bianco pieno per ogni barcode — il tema scuro non entra lì dentro, o lo scanner non legge. Il numero è scritto nell'HTML sotto ogni barcode, non generato dalla libreria: se al museo non c'è rete resta comunque leggibile e digitabile alla biglietteria.
- Verifica dei barcode fatta per davvero: pagina renderizzata in Chromium, ritaglio dei tre riquadri e **decodifica con zxing-cpp**, che li rilegge come Code128 con i codici esatti. (Il detector di OpenCV non serviva: gestisce solo EAN/UPC.) La versione indicata nel prompt, 3.11.5, su cdnjs non esiste: usata la 3.12.3, con hash SRI verificato contro quello pubblicato da cdnjs.
- La tappa del museo passa dalle 16:00 alle **16:30**: i biglietti sono a fascia oraria e dicono di non presentarsi prima. Aggiornate card e timeline, con link dalla tappa alla sezione biglietti.

## Coordinate Taps, orario dei Bunkers, percorsi su Maps
- **Taps Sagrada Familia**: nome, indirizzo (Carrer de Provença 474) e coordinate verificate al posto di quelle che non c'erano. La tappa perde il badge `da_verificare`, prende la distanza vera dall'appartamento (1.536 m · 19 min, Valhalla pedonale) e il dettaglio "Enoteca, non bar: si compra la bottiglia. Riapre alle 16:30."
- **Bunkers del Carmel — MUHBA Turó de la Rovira**: non è un belvedere sempre aperto. Orario ufficiale mer/ven/sab/dom 16:00–19:00, coordinate verificate, tre ore di sosta (`durataMin` 180) e avviso giallo sulla card: "Aprono alle 16:00, non prima."
- **Coordinate di El Palace** prese dal link del percorso di venerdì pomeriggio: il venue `rooftop` non ne aveva. Da lì la distanza Taps → El Palace (2.099 m · 25 min) e quella El Palace → Braseria (4.580 m · 15 min in auto). Ora **nessuna tappa resta fuori dalla mappa**: la lista "Senza coordinate" è vuota.
- **Otto percorsi di mezza giornata** in `data/itinerary.json`, campo `percorsi` a livello di giornata, con `url`, `label`, `mode` e le tappe che coprono. I link sono copiati alla lettera: `npm run validate` controlla la forma e `scripts/qa/percorsi.mjs` li confronta uno a uno con le stringhe originali, così se qualcuno li "ripulisce" il test cade.
- **Pulsante "Apri il percorso su Maps"** in cima a ogni blocco nel Programma e nella card "Adesso" della vista Oggi, con icona `route` per i percorsi a piedi e `train-front` per quelli coi mezzi. Accanto, il totale sommato dalle tappe: chilometri e minuti a piedi per i percorsi pedonali, "Mezzi pubblici" per gli altri, dove il tempo di Google non è il nostro e non lo si finge. In modalità pioggia il pulsante avverte che El Born non è nel link.
- Chi quella mezza giornata non c'è non vede il pulsante: l'ancoraggio è sulla prima tappa del blocco che quella persona vede davvero.
- Nuova suite `scripts/qa/percorsi.mjs` (46 controlli).
