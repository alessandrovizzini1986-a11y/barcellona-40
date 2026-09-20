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
- **Domenica rifatta per il bagaglio a mano**: si viaggia con solo underseat, quindi la deviazione a Beak Street delle 10:45 spariva da sola. Verificato sulle fonti ufficiali che gli zaini entrano dove serve — SEA LIFE ammette fino a 30 litri e non ha guardaroba, il London Eye borse fino a 46 × 33 × 20 cm — e che il deposito ufficiale, se mai servisse, è alla biglietteria del London Eye dentro County Hall (5 £ a collo, ritiro entro le 19:00), cioè nello stesso edificio dell'acquario.
- Saltando la deviazione e senza nastro bagagli all'arrivo si guadagna **un'ora di luce**: Southbank alle 10:45 invece che alle 11:45, acquario alle 12:45. La tappa dell'appartamento si sposta a fine giornata (18:15, check-in con la chiave Clevio e cena), dopo Lina Stores e le luci di Carnaby.
- Corretta anche la nota dell'alloggio: prometteva un "deposito bagagli in reception" che in un appartamento con self check-in potrebbe non esistere. Ora dice come stanno le cose e lascia il punto da chiarire con l'host solo per un eventuale viaggio con la valigia. Stessa logica al martedì: dopo il check-out gli zaini restano in spalla, nessun deposito.

## Londra · meteo dei tre giorni e rifiniture V3
- **Widget meteo** in cima a ogni giornata, dentro il `summary`: resta visibile anche a giornata chiusa. Icona, massima/minima, **probabilità di pioggia** colorata a soglie (verde sotto il 30%, oro fino al 60%, rosso oltre) e alba/tramonto in ora di Londra.
- **Alba e tramonto calcolati**, non presi da un'API: equazione del sorgere del sole (NOAA) risolta a build time per 51,5129/−0,1364. Validata contro Open-Meteo su sei date fra novembre e settembre, scarto massimo 2 minuti (1 a novembre). Per il viaggio: 15/11 alba 07:18 tramonto 16:12, 16/11 07:19–16:10, 17/11 07:21–16:09 GMT. Nota utile per il futuro: l'endpoint *archive* di Open-Meteo etichetta novembre come GMT+1 e restituisce alba/tramonto spostati di un'ora — prendendoli da lì sarebbero stati sbagliati.
- **Ripiego con dati veri, non stimati**: finché mancano più di ~16 giorni al viaggio l'API delle previsioni rifiuta quelle date (`start_date is out of allowed range`), quindi la pagina mostra le **medie 2015-2024** ricavate dall'archivio Open-Meteo per il 15, 16 e 17 novembre a Londra: 13/8 °C con pioggia in 3 anni su 10, 11/7 °C con 4 su 10, 11/6 °C con 3 su 10. Etichettate "media degli ultimi 10 anni, non una previsione". La chiamata vera si ritenta a ogni caricamento: avvicinandosi a novembre la pagina passa da sola alla previsione, con la data di aggiornamento in chiaro.
- Entrambi i rami verificati in Chromium intercettando la rete: con l'errore fuori range restano le medie, con una risposta valida cambiano temperature, percentuale, icona, colore ed etichetta.
- **Martedì** guadagna due tappe esplicite: partenza per Heathrow (15:15–15:30) e volo BA546 delle 18:10. La riga "uscita dall'appartamento" della tabella V3 era incoerente con il check-out delle 10:30 — con gli zaini già in spalla non si torna a casa — quindi è diventata "Partenza per Heathrow", che è il vincolo vero.

## Novità: chi rientra vede cosa è cambiato
- **`data/changelog.json`**: le voci degli aggiornamenti, le più recenti in cima, con un numero di versione che cresce di uno alla volta. È l'unica cosa da aggiornare a mano quando il sito cambia.
- **Pannello dal basso all'apertura** con le sole entry uscite dopo `b40:v1:lastSeenVersion`. Si chiude col pulsante "Ho capito", col tap fuori, con Esc o con lo swipe verso il basso: **in tutti i casi salva**, così non insegue nessuno.
- **Al primo accesso in assoluto non compare**: chi apre il sito per la prima volta si ritroverebbe la cronologia di cose che non ha mai visto. Si salva solo la versione corrente e si parte allineati. "Primo accesso" vuol dire nessuna chiave `b40:v1:` in memoria; se `localStorage` è rotto vale lo stesso, perché un pannello che non può essere chiuso per sempre è peggio di nessun pannello.
- Chi c'era **prima che il changelog esistesse** (chiave assente ma dati salvati) vede tutto lo storico, una volta sola.
- **Pallino terracotta sulla tab Info** finché c'è qualcosa da leggere, e nuova sezione **"Novità"** come primo accordion con lo storico completo: le entry non lette hanno il puntino accanto alla data. Letto tutto, la sezione dice "Nessuna novità. Sei aggiornato." e resta consultabile.
- **"Avvisa i ragazzi"** (solo Alessandro): apre WhatsApp con il testo già scritto dall'ultima entry, titolo e voci comprese, più l'indirizzo del sito.
- **Cache**: il changelog è importato come modulo, quindi finisce nel bundle con l'hash nel nome — nessuna richiesta a `/data/changelog.json` a runtime (verificato leggendo le risorse caricate dalla pagina) e nessun modo di servire dati vecchi insieme a codice nuovo. Le regole `no-cache` su `/`, `/index.html` e `/data/*` in `public/_headers` sono rimaste dov'erano.
- Le altre suite di QA partono "già aggiornate": il pannello è modale e in mezzo ai loro click non ci deve stare. A trovarlo è stato il QA stesso, con album e song che si sono bloccati al primo giro.
- Nuova suite `scripts/qa/novita.mjs` (42 controlli).

## Correzione: l'orario dei Bunkers era quello estivo
- **Il belvedere del Turó de la Rovira è ad accesso libero**, sempre e gratis: la vista e il tramonto non hanno orario. Quello che chiude sono gli **spazi museali** sul bunker della guerra civile, e da ottobre a maggio chiudono alle 14:00 (mer/ven/sab/dom 10:00–14:00, ultimo ingresso 13:30). La finestra 16:00–19:00 che avevamo messo è l'orario di giugno-settembre.
- **La domenica non cambia**: pranzo alle 13:30, salita dopo, sosta fino al tramonto. Quella che sparisce è la costrizione: non si sta aspettando che aprano, si sale quando si vuole. Il 18 ottobre la parte museale la trovano chiusa, e l'avviso sulla card ora lo dice.
- **Coordinate del Rooftop Garden confermate** (El Palace Hotel Barcelona, Gran Via de les Corts Catalanes 668): non erano più una deduzione dal link del percorso. Il check `c9` resta aperto solo per il civico della Braseria.

## Pannello novità: pulsante fisso e promemoria del changelog
- **"Ho capito" è sempre incollato in fondo al pannello** (`position: sticky`), non solo quando le entry sono tante: una soglia sarebbe un caso limite in più da testare e un comportamento che cambia sotto gli occhi di chi guarda. Sfondo pieno `--bg-2` con un gradiente sopra per staccarlo dal testo che scorre, `padding-bottom` che rispetta la safe area. Verificato con otto entry su uno schermo da 380×700: il pulsante resta allo stesso pixel in cima, a metà e in fondo allo scorrimento.
- **Regola permanente in `CLAUDE.md`**: ogni modifica al sito che un utente possa notare richiede una nuova entry in `data/changelog.json`, con `v` incrementato, nello stesso commit. Vale per contenuti, orari, tappe, funzioni nuove; non vale per refactor, test e fix invisibili.
- **Promemoria a fine build** (`scripts/changelog-check.mjs`, plugin `promemoria-changelog`): se sono stati toccati file sotto `data/` o `src/` senza toccare il changelog, `npm run build` stampa un avviso. È un promemoria, non un controllo: nessun hook che rifiuta il push, nessun attrito al deploy. Guarda le modifiche non ancora committate, e se non ce ne sono quelle dell'ultimo commit; senza git non dice niente e non fallisce mai. Si è fatto vivo da solo mentre scrivevo questa modifica, prima che aggiungessi la entry.
- `scripts/qa/novita.mjs` sale a 56 controlli.

## Tramonto: un dato calcolato, e la discesa slitta alle 19:30
- **Il 18 ottobre 2026 a Barcellona il sole tramonta alle 19:07**, la luce buona comincia alle **18:31** e il crepuscolo civile finisce alle **19:36**. Numeri calcolati per le coordinate dei Bunkers (41.4193, 2.1618) a 262 m di quota, fuso Europe/Madrid: non una stima, un conto. Stanno fra i dettagli verificati della tappa.
- **Si scende alle 19:30, non alle 19:00.** Restare mezz'ora in più è il motivo per cui si sale: il `why` della tappa ora lo dice ("alle 19:07 il sole se ne va e la città si accende"). La durata passa da 180 a 210 minuti e **tutto il resto si ricalcola a cascata**: taxi alle 19:30, T2 alle 20:05, ingresso in Canudas sempre alle 20:20 — il margine sul volo delle 23:05 non si tocca.
- **Il consiglio sul taxi è marcato `stimato`.** Prenotarlo dall'app mentre si è ancora in cima, e scendere verso Carrer de Marià Labèrnia se non risponde nessuno, è un ragionamento sulla zona, non un dato confermato: nuovo campo `detailsStimati` e nuovo blocco nella card, separato da una riga tratteggiata e introdotto dal badge `stimato`. I dettagli verificati e i consigli nostri non si mescolano più nello stesso elenco.
- `scripts/qa/percorsi.mjs` sale a 59 controlli: il tramonto nei dettagli, gli orari della domenica, e la prova che il testo del taxi sta nel blocco stimato e **non** nell'elenco verificato.

## Correzione: dai Bunkers il sole sparisce dietro Collserola
- **Verifica incrociata del tramonto**: algoritmo NOAA implementato da zero, indipendente dalla libreria usata la prima volta. Le 19:07 reggono (19:06–19:08 a seconda di quanto si tiene conto della quota), il fuso CEST è corretto — l'ora legale spagnola finisce il 25 ottobre. La voce esce da quelle aperte.
- **Ma il revisore aveva ragione**: dai Bunkers il sole non cala sull'orizzonte libero, cala **dietro la cresta di Collserola**. Vista da 262 m di quota, la cresta sta fra 2,15° (450 m a 5 km) e 2,56° (Tibidabo, 512 m a 5,6 km): il sole li attraversa fra le **18:47 e le 18:50**, con azimut ~256°, ovest-sudovest, esattamente la direzione della cresta. Il tramonto "delle 19:07" da lassù non si vede.
- **La tappa non perde senso, cambia oggetto.** I Bunkers guardano a est e a sud: Sagrada, Eixample, mare. Lo spettacolo è la città che si colora, e quella luce va dalla sparizione del sole fino al crepuscolo civile, **18:50 → 19:36**. Il `why` ora lo dice ("Si resta per la città che si accende"), e i dettagli distinguono il dato astronomico dalla realtà di quel punto.
- **Via "la luce migliore comincia alle 18:31"**: la golden hour verso ovest è in parte coperta dalla cresta, quindi era una promessa che il posto non mantiene.
- **La discesa resta alle 19:30**: prende i quaranta minuti buoni dopo la sparizione del sole e lascia luce per scendere. Niente si muove a valle: taxi 19:30, T2 20:05, Canudas 20:20.
- **Cosa è verificato e cosa no**, scritto sulla card: le 19:07 sono un calcolo confermato da due algoritmi e stanno fra i dettagli; le **18:50 sono stimate** e stanno nel blocco `stimato`, perché quota e distanza della cresta sono approssimate.
- **Tolte `sarria.webp` e `pobleespanyol.webp`**, 141 kB che non erano assegnati a nessuna tappa. La cartella delle immagini torna a **1,11 MB** e il controllo in `scripts/qa/immagini.mjs` torna al tetto originale di 1,2 MB. I titoli Commons per riscaricarle in un comando sono in `DA_VERIFICARE.md`.
- **I due dati che restano aperti** — attesa del taxi ai Bunkers di domenica sera e illuminazione della strada di discesa — non sono verificabili a distanza: restano marcati stimato, si controllano sul posto.
- `scripts/qa/percorsi.mjs` sale a 62 controlli, `immagini.mjs` scende a 65 (due foto in meno).

## Il profilo del terreno: le 18:50 erano sbagliate di otto minuti
- **Profilo altimetrico vero, non la montagna più famosa.** SRTM 30 m (opentopodata.org) campionato ogni 250 m fino a 15 km su cinque azimut da 250° a 262°, con correzione per la curvatura terrestre. Sull'azimut del tramonto (256°) la cresta sta a **1,14°** — 369 m a 5,2 km, un crinale secondario di Collserola — non a 2,15°-2,56°. **Il Tibidabo non c'entra: sta più a nord e il sole non ci passa dietro.**
- **Il sole sparisce alle 18:58**, non alle 18:50. Il numero passa dal blocco stimato ai **dettagli verificati**, con la fonte scritta accanto ("profilo altimetrico SRTM 30 m lungo l'azimut 256°, cresta a 1,14°, 369 m a 5,2 km"). Ricontrollato in modo indipendente con NOAA: 18:55 per il centro del disco, 18:57 con il semidiametro, 18:59 aggiungendo la rifrazione. Le 18:58 stanno in mezzo, **±1 minuto**.
- **La finestra buona è 18:58 → 19:36: 38 minuti.** Il `why` della tappa non cambia (cambia solo il numero dentro), la discesa alle 19:30 resta giusta, a valle non si muove niente.
- **Nel blocco stimato restano due sole voci**, quelle che si verificano davvero solo sul posto: prenotare il taxi dall'app mentre si è ancora in cima, e il piano B a piedi verso Carrer de Marià Labèrnia.
- **Nota di metodo, annotata in `DA_VERIFICARE.md`**: la stima sbagliava perché prendeva la cima più nota invece della cima sulla linea giusta. Otto minuti di errore. Per un orizzonte locale serve il profilo del terreno lungo l'azimut, non la montagna che uno conosce.
- Nel changelog la **v13 dichiara cosa corregge della v12**, come la v12 faceva con la v11.
- `scripts/qa/percorsi.mjs` sale a 64 controlli: la fonte del calcolo nei dettagli, e la prova che "18:50" e "18:31" non compaiono più da nessuna parte nella tappa.

## Sette pendenze chiuse
- **Appartamento**: venerdì notte in due, sabato in tre. **€65 per il letto extra di sabato, si pagano in reception.** La richiesta per il 4° ospite era già stata cancellata. Il badge `da_verificare` sparisce dal check-in, e con lui `c4` e `c5`.
- **Tassa di soggiorno**: non si traccia più. Via ogni riferimento all'aliquota dalla card, dalla sezione Info e da `DA_VERIFICARE.md`.
- **Braseria Sarrià**: prenotazione rifatta per 2, stesso orario, la vecchia cancellata. Via la riga in maiuscolo "PRENOTAZIONE DA PORTARE A 2" e il badge; al suo posto un dato normale, "Prenotato per 2, venerdì sera". Resta aperto solo il civico (`c9`).
- **Sabato dopo cena**: non è più "Sala Apolo · dopo mezzanotte" con l'avviso sull'interferenza di Soundhood, è **"Dopo cena · si vede"**. Nessuna prenotazione, nessun orario: Apolo resta indicata come l'opzione più probabile, con coordinate e link Maps dove erano. Il badge diventa `stimato`, che è la verità di una tappa senza vincoli. Via `c7` e, con lui, il venue `parallel62` che esisteva solo per quell'avviso.
- **Arrivi di Giulio e Manuel**: gli orari di atterraggio (07:40 e 09:45 di sabato) bastano, il numero del volo non serve. Le loro schede non sono più `da_verificare`.
- **Deposito bagagli**: non serve, si portano gli zaini. Via `c6` e l'accenno nella tappa dell'atterraggio, sostituito da "Zaini al seguito tutto il giorno: il check-in è alle 15:00."
- **`DA_VERIFICARE.md` apre con quello che resta davvero aperto**, quattro voci, e dice a chiare lettere che il resto del file sono note e scelte già prese, non pendenze.
- Le verifiche passano da 9 a 4. `scripts/qa/gamification.mjs` non conta più su `c3` né sul numero 8 scritto a mano: legge `data/checks.json` e calcola il contatore. `scripts/qa/e2e.mjs` sale a 57 controlli, con undici nuovi sulle tre card cambiate.

## Casino Barcelona: la prima tappa senza orario
- **Nuova tappa opzionale** in fondo a venerdì e sabato (`f99`, `s99`), stesso venue verificato: Carrer de la Marina 19-21, aperto 24 ore su 24, 4,0 su 8.232 recensioni. Dettagli verificati: **serve il documento originale** — passaporto o carta d'identità, niente fotocopie e niente foto sul telefono — zaini al guardaroba, minimi alti a roulette e blackjack, e il ristorante interno da evitare. Le distanze sono quelle di Valhalla, scritte per giorno: dalla Braseria 8,2 km · 22 min in auto il venerdì, dalla Biarritz 2,3 km · 28 min a piedi o da Apolo 3,3 km · 8 min in auto il sabato, e il rientro a casa 2,1 km · 27 min a piedi.
- **Card stilizzata `casino.svg`**, stesso generatore delle altre nove: seme 1337 fissato nel dato, accento `#A50044`, icona fiches e carta. Il seme è scritto perché la card è arrivata dopo: se un domani se ne aggiunge un'altra in mezzo, questo mosaico non cambia.

**Regole nuove per le tappe senza orario** (`time: null`, `timeStatus: "opzionale"`), valide da qui in avanti e non solo per il Casino:
- **Non entrano nei conti della giornata.** `contoDelGiorno` le scarta prima di calcolare soste, cammino e margine: il venerdì resta "soste 3h45 + cammino 54 min, 11 minuti di margine", identico a prima. Nemmeno la cascata degli orari le tocca.
- **Non diventano mai "Adesso" né "Prossima".** Sarebbe il sito a mandare la gente al casinò perché è l'ultima cosa in lista. Verificato anche alle 02:00 di sabato, quando sarebbe l'unica rimasta.
- **Al posto dell'ora, sulla card, c'è "Se avete voglia"** in `--ink-3`, e un badge blu **OPZIONALE** derivato dal `timeStatus`, come già il badge delle coordinate è derivato dal venue.
- **In fondo alla timeline**, sotto una riga tratteggiata con scritto "Opzionale", e con il pallino sulla linea del tempo **vuoto** invece che pieno. L'intestazione del giorno dice "15 tappe · 1 opzionale", senza mescolare i due numeri.
- **Il progresso conta il piano, non le opzioni**: 0/15 e non 0/16. La spunta "Fatto" resta, perché se ci andate si segna.
- **Sulla mappa** il marker c'è ma è **tratteggiato e senza numero**, e la linea del giro non ci passa: la numerazione delle tappe non deve saltare.
- **Fuori dal riepilogo da copiare e dalla speedrun di Monne**: quello che si incolla su WhatsApp è il piano.
- `scripts/validate.mjs` accetta `time: null` **solo** insieme a `timeStatus: "opzionale"` (e viceversa, e pretende `durataMin` nullo): così non nasce per sbaglio una tappa senza ora che il sito tratta come un impegno.
- Nuova suite `scripts/qa/opzionali.mjs`, **63 controlli**. Le altre si adeguano: `venerdi` (f99 in coda), `viaggio` (la fila cronologica salta le card senza orario), `immagini` (una card stilizzata e una immagine in più per giorno).
- Bug trovato dalla QA: l'immagine `eager` finiva anche sulla prima card opzionale, perché la lista delle opzionali riparte da indice zero. Ora l'eager si aggancia all'**id** della prima tappa in programma, non alla posizione.

## Casino Barcelona: dress code, documenti, zaini
Dati presi dalle pagine statiche del sito ufficiale (Visítanos → Documentos necesarios, Código de vestimenta, Ubicación y contacto), non da ricordi.
- **Dress code**: scarpe da ginnastica sì; vietati infradito, espadrillas, costume, canottiera, caschi da moto e **zaini di grandi dimensioni**.
- **Avviso solo sul venerdì** (`f99`), in giallo sulla card: quel giorno si gira con gli zaini tutto il giorno, quelli grandi non entrano in sala e il guardaroba per gli ingombranti si paga. Sabato l'avviso non c'è, perché gli zaini sono già a casa.
- **Guardaroba, correzione**: non è gratis per tutto. A pagamento per valigie e oggetti di grandi dimensioni, gratuito per il resto. La riga di prima diceva solo "zaini e borse grandi al guardaroba".
- **Documenti**, formulazione ufficiale: cittadini UE carta d'identità o passaporto, **documenti originali**, vietato l'ingresso ai minori di 18 anni. La riga resta in maiuscolo e in cima ai dettagli.
- **Taxi**: posteggio davanti all'ingresso, in Calle Marina 16. Per tornare non si cerca niente.
- **Non esiste una registrazione online**: la schedatura si fa all'ingresso col documento. Verificato su Visítanos, Club e Requisitos de acceso.
- **Promozioni: non verificabili da qui.** La pagina esiste ma si carica via JavaScript, quindi nessuna promozione è finita nei dati: il link sta fra i dettagli **stimati**, da aprire dal telefono prima di partire. Annotato in `DA_VERIFICARE.md`, insieme all'avvertenza di non confondere `casinobarcelona.com` con `casinobarcelona.es`, che è il casinò **online** dello stesso gruppo e i cui bonus in sala non valgono niente.
- Per il link serviva un link vero: i dettagli ora passano da `escLink()`, che **prima escapa tutto** il testo e solo dopo riconosce le URL. Nei dati continua a stare solo testo, mai HTML.
- `scripts/qa/opzionali.mjs` sale a **86 controlli**, fra cui che il testo del link non finisca a schermo escapato e che di `casinobarcelona.es` non ci sia traccia da nessuna parte.

## Nove foto vere al posto delle card disegnate
- **Nove tappe hanno la foto del posto**: appartamento, Bar Joan, Taps, Brasería Sarrià, Olimpo, Bodega Biarritz, Casino Barcelona, parcheggio P2 di Bologna e Sala VIP Canudas. Le rispettive `.svg` sono state cancellate.
- **Resta una sola card disegnata, il Duck Store**, perché del negozio una foto non ce l'abbiamo. `scripts/gen-cards.mjs` ora genera solo quella (l'icona della papera); `canfisher.svg` era già sparito quando Can Fisher è uscito dall'itinerario.
- **Lavorazione**: ritaglio 16:9 con bias verticale per non tagliare le insegne, ridimensionamento a 640 px di larghezza, **mai ingrandite oltre l'originale** — `apt`, `barjoan`, `braseria` e `parcheggio` restano a 447-480 px — WebP qualità 72. **217 kB in tutto.**
- **Foto private, non Commons.** Stanno nel campo `private` di `data/foto-tappe.json` e in una tabella a parte di `CREDITS.md`, mai in quella delle licenze libere: non sono ripubblicabili. Sotto la card compare **"foto: per gentile concessione"**, senza link e senza nome, un'attribuzione che non promette una licenza che non c'è. La riga vale **anche per El Mirador**, che prima non mostrava niente.
- **Il tetto di peso passa a 1,3 MB**: la cartella è a **1,20 MB**, quattro kB sopra il limite di prima. Comprimere più di così si vedrebbe — sono già a qualità 72 — quindi si alza il limite, non la compressione.
- **Alt in italiano** riscritti su tutte e nove: descrivono cosa si vede, non ripetono il titolo.
- QA `immagini.mjs` a **82 controlli**: il controllo sulle misure non pretende più 800×450 per tutte (le private partono da originali più piccoli) ma verifica formato, 16:9 e che nessuna sia stata ingrandita; controlla il **testo** dell'attribuzione, link a Commons da una parte e gentile concessione dall'altra; e che nessuna privata finisca nella tabella Commons. `venerdi.mjs` sale a 47.

## Anche il Duck Store ha la sua foto: card disegnate azzerate
- **`duckstore.webp`**, stessa lavorazione delle altre nove: 16:9 con bias 0,15 per tenere l'insegna tonda, 640 px, WebP qualità 72, **17 kB**. Si vede la vetrina con la Sagrada Família di mattoncini e le paperelle in fila.
- **Era l'ultima card disegnata.** Con lei se ne va `scripts/gen-cards.mjs` e lo script `npm run cards`: generava una lista vuota. Il mosaico trencadís resta nella storia di git e `CREDITS.md` dice dove ripescarlo se un domani servisse una tappa senza foto. `scripts/londra-cards.mjs` è un altro script e resta dov'è, insieme all'unica `.svg` rimasta nel progetto, quella dell'appartamento di Londra.
- Aggiornati i tre commenti che citavano il generatore (`fetch-photos.mjs`, `validate.mjs`, `card.js`): puntavano a un file che non esiste più.
- **Ogni tappa del weekend ha la foto del posto**: 14 da Commons, 11 private. La cartella è a **1,20 MB**, dentro il tetto di 1,3.
- QA `immagini.mjs` a **83 controlli**: ora pretende **zero** `.svg` fra le immagini delle tappe, e per ogni giorno tante attribuzioni quante immagini — prima il Duck Store era l'unica card senza credito, adesso i due numeri coincidono.

## Sabato: il pane da Teixidó, fra Olimpo e il bocadillo
- **Nuova tappa `s5b` alle 13:00, dieci minuti**, sulla strada del rientro: Teixidó, Carrer de Nàpols 194, 4,6 su 292 recensioni, tutto fatto in casa. Da Olimpo 1.189 m · 15 min a piedi; da lì all'appartamento 574 m · 7 min, che è la nuova distanza del bocadillo (prima arrivava direttamente da Olimpo, 1.726 m).
- **La chiusura delle 14:00 è un avviso, non un dettaglio.** Il sabato Teixidó chiude alle 14:00 e da Olimpo sono 15 minuti: l'informazione che fa saltare la tappa sta nel riquadro giallo, visibile senza aprire nulla, non sepolta in fondo ai dettagli. Nei dettagli restano il **pa de pagès** (non la baguette: regge il jamón senza sfaldarsi), le due frasi da dire al banco e il piano B, il Forn Oriol a 69 metri da casa.
- **`teixido.webp`**, foto vera, 640×360, 25 kB, nel blocco `private` con la riga "per gentile concessione".
- **Il riquadro del conto non compare più quando la catena è di una tappa sola.** Con una durata dichiarata su `s5b`, il sabato si sarebbe messo a mostrare "Soste 10 min + cammino 7 min" come se fosse il totale della giornata: quel riquadro riassume una mezza giornata, e con una tappa sola non è un riassunto, è un equivoco. Il venerdì resta identico, 3h45 di soste e 54 minuti di cammino.
- Nuova suite `scripts/qa/sabato.mjs`, **27 controlli**, fra cui il cammino del sabato ricalcolato dai dati con le due tratte nuove.

### BO&MIE: non inserita, la foto è arrivata corrotta
Il blocco base64 si è interrotto: 21.379 byte su disco contro i 31.170 dichiarati dall'intestazione del file, mancava il 31%. L'inizio era giusto — WebP valido, misure esatte 554×311 — si è persa la coda, e senza foto la tappa non passa `npm run validate`. Niente è stato ricostruito a mano: il file è stato cancellato e la pendenza è annotata in `DA_VERIFICARE.md`. Tutto il resto della tappa (venue, 09:55 per 30 minuti, 1.291 m dall'appartamento, 162 m alla Sagrada, testi) si applica appena la foto arriva, insieme alla correzione della distanza della Sagrada.

## Tre voci chiuse, e la cena di sabato si capisce prima di sedersi
- **`c2` · voli di ritorno di Giulio e Manuel: non si tracciano.** La domenica tornano col gruppo. Le loro schede non hanno più `da_verificare` da nessuna parte e la tappa del rientro (`d3`) passa da `da_verificare` a **`stimato`**: le 20:00 sono un orario indicativo, non un dato incerto. Il "numero volo e orario da inserire" sparisce dai dettagli.
- **`c8` · SOUNDIT: chiusa per decisione, non per verifica.** Il post-cena di sabato resta libero e cosa suoni non interessa a nessuno. La tappa "Dopo cena · si vede" era già senza l'avviso su Soundhood dal giro precedente.
- **`c10` · Bodega Biarritz: coordinate verificate** via Google Places. **Carrer Nou de Sant Francesc 7, Ciutat Vella** (41.3791891, 2.1770567), non il civico di Carrer d'en Rull che restituiva Nominatim. Sparisce il flag `geocoded` e con lui **l'ultimo badge "coordinate automatiche" del sito**: nessun venue è più geocodificato.
- **Come funziona la cena, scritto sulla card.** Alla Bodega Biarritz si sceglie **una fascia di prezzo prima di entrare** e le tapas arrivano a sorpresa, senza ordinare i piatti. Dalle recensioni: fascia bassa con un antipasto, 8 tapas, due shot e una bottiglia di vino, **poco meno di 70 euro in due**. È il genere di cosa da sapere prima di sedersi a una cena di compleanno, non dopo. Aggiunti anche gli orari (gio-lun 12:30-23:00, martedì e mercoledì chiuso: sabato 17 è dentro la finestra) e il voto, 4,7 su 9.353 recensioni.
- **Da verificare scende a una voce sola**, il civico della Braseria. `DA_VERIFICARE.md` apre con cinque righe, e nessuna è una decisione in sospeso: due si rilevano sul posto, una è la precisione al minuto del tramonto, una è una pagina web da guardare dal telefono, una è il civico.
- `scripts/qa/sabato.mjs` sale a **43 controlli**: i dati nuovi della cena, che nessun venue sia più geocodificato, che nella sezione Info resti una sola casella e sia `c9`, e che il rientro porti il badge giusto.

## BO&MIE: il sabato mattina comincia con un caffè insieme
- **Nuova tappa `s3c` alle 09:55, mezz'ora**, fra l'uscita di casa e la Sagrada: boulangerie francese in Carrer de Provença 433, aperta tutti i giorni dalle 8:30, 4,4 su 2.657 recensioni. È il punto dove ci si trova con Giulio, che è atterrato alle 7:40 e ha già fatto il check-in da solo. Piccola e stretta: si mangia in piedi al bancone.
- **La Sagrada ora dista 162 m · 2 min**, e arriva da BO&MIE invece che dall'appartamento. I 1.309 m di prima erano la camminata da casa, che adesso finisce al caffè: 1.291 m · 16 min.
- **Manuel non ce l'ha in programma**: atterra alle 9:45 e va dritto a Olimpo, come prima.
- **La foto, al secondo tentativo.** La prima era arrivata corrotta (mancava il 31% del file, l'immagine non si decodificava e la tappa era rimasta fuori dal sito); questa è un'altra inquadratura, intera: 480×270, qualità 62, 19 kB. È più piccola delle altre perché l'originale è un verticale da cui si ricava poco, ed è l'unica eccezione al 640 px del resto.
- **Il pulsante del percorso della mattina ora somma anche BO&MIE**: 2,0 km · 25 min invece di 1,8 km · 23 min. Il link di Google Maps resta quello verificato a mano e va dall'appartamento dritto alla Sagrada: BO&MIE sta 162 m prima dell'ingresso, sulla stessa strada, e la differenza è di circa 140 m. Annotata in `DA_VERIFICARE.md`, perché è una cosa che qualcuno potrebbe notare.
- **Forn Oriol verificato**: il piano B se Teixidó è chiuso ora porta indirizzo, orari e telefono veri — Carrer de Nàpols 113, sabato 6:30-21:00, domenica 8:00-14:30, tel +34 938 74 77 54, 69 m da casa. Non è una tappa, quindi resta una riga di dettaglio.
- `scripts/qa/sabato.mjs` sale a **65 controlli**, fra cui che Manuel non veda né BO&MIE né la Sagrada, e il cammino del sabato ricalcolato: **7.238 m e 89 minuti**.
