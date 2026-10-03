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

## Chiusura: margine più largo il sabato, prezzi della cena, due card ripulite
- **BO&MIE si sposta alle 09:45** (era 09:55): si esce di casa alle **09:29**, la sosta resta di mezz'ora e prima dell'ingresso alla Sagrada restano **13 minuti** invece di 5. Sulla card è scritto quanto margine c'è e cosa accorciare se il caffè va lungo: questa tappa, non la Basilica. Il resto della giornata non si muove: Olimpo, Teixidó e il bocadillo hanno orari stimati e assorbono.
  *(La tua tabella diceva "10:20 si esce dal bar", che sarebbero 35 minuti di sosta; il testo diceva 30. Ho tenuto i 30 minuti, quindi si esce alle 10:15 e il margine calcolato è 13 minuti, non 10. Il numero sulla card è quello vero.)*
- **Cena dei 40: il meccanismo è un dato, il prezzo no.** "Si sceglie una fascia di prezzo prima di entrare, poi le tapas arrivano a sorpresa: non si ordina dal menu" resta fra i **verificati**. La cifra — antipasto, 8 tapas, due shot e una bottiglia, poco meno di 70 euro in due, sui 30-35 a testa — passa fra gli **stimati**, con scritto che le fasce esatte non sono pubblicate e si vedono all'ingresso. Il locale non ha sito: i prezzi non esistono online.
- **Due badge `da_verificare` rimasti da versioni vecchie, tolti.** Il Rooftop Garden li portava da quando il venue non aveva coordinate — confermate via Google Places tre giri fa, badge mai rimosso. Il pomeriggio di sabato li portava per gli eventi techno "NON confermati": quella verifica è chiusa per decisione, quindi la tappa è diventata **"Pomeriggio libero"** e basta, con badge `stimato` e senza più SOUNDIT, La Terrrazza o Resident Advisor. **Nessuna tappa del sito porta più `da_verificare`**, e la QA lo controlla.
- `scripts/qa/sabato.mjs` sale a **71 controlli**: il margine dei 13 minuti ricalcolato dagli orari, la recensione fra gli stimati e non fra i verificati, e che nessuna tappa porti più il badge da verificare.

## Oggi dice la verità su dove sei
Due correzioni alla vista Oggi, nate dalla lettura del codice reale, non dalle specifiche.

- **Chi è già ripartito non ha più una tappa corrente.** Monne, sabato alle 10, vedeva come "Adesso" il taxi delle 08:15: il sito gli diceva che era ancora a Barcellona mentre atterrava a Bologna. Ora, per chi riparte **prima dell'ultimo giorno del weekend** e non ha più tappe, "Adesso" diventa **"In volo verso Bologna · atterri alle 12:05"** fino all'atterraggio, e dopo **"Tu a quest'ora sei già a Bologna. Missione compiuta."** con l'album come pulsante principale. L'orario dell'atterraggio è letto da `data/people.json`, non scritto nel codice.
  La regola guarda la data del volo di ritorno: **Alessandro non è toccato**, perché riparte l'ultimo giorno e la domenica sera ha già la sua timeline di viaggio sopra la card.
- **L'etichetta sopra "Adesso" non mente più sul tempo.** `currentStop()` non è stato toccato — la tappa corrente resta l'ultima iniziata — ma la parola sopra la card ora è **ADESSO** finché la tappa dura (`durataMin`, o 60 minuti se non ce l'ha) e **ULTIMA TAPPA** dopo. Sabato alle 16:30 il pomeriggio libero delle 15:00 è "ultima tappa", non "adesso"; domenica alle 21:00 il rientro delle 20:00 idem. La tappa imminente continua a dire **TRA X MIN**. La stessa parola vale anche nella lista "Oggi per te": non può dire due cose diverse sulla stessa pagina.
- **Non toccata**, come da tua decisione: la timeline dell'andata che resta a schermo fra mezzanotte e le 4 del mattino.
- `scripts/qa/e2e.mjs` sale a **76 test**: i tre momenti di Monne (09:00, 10:00, 13:00), le quattro etichette e la tappa imminente.

## Il countdown conta fino al decollo, non fino a mezzanotte
- **Bersaglio spostato da `2026-10-16T00:00` a `2026-10-16T06:20`**, il decollo di FR2097. Il 22 settembre alle 22:56 diceva 23 giorni e 1 ora: erano i minuti che mancavano alla mezzanotte, non al volo. Ora dice **23 giorni, 07 ore, 24 minuti**, che è il tempo vero.
- **L'orario non è scritto nel codice**: viene da `data/viaggio.json`, dal volo di andata. Se cambia lì, cambia il countdown.
- **Sotto i numeri c'è il volo**: "FR2097 · Bologna 06:20". Giulio e Manuel arrivano sabato con voli che non tracciamo, quindi per loro la riga è **"Il primo volo · FR2097 · Bologna 06:20"**: resta l'inizio del weekend, senza spacciargli un aereo che non è il loro.
- **`phase()` non è stata toccata**, ed è la parte importante: il passaggio da "prima" a "durante" resta a **mezzanotte**. Alle 04:00, mentre si entra al P2 col QR, il sito è già una guida — timeline del viaggio e bento — non un conto alla rovescia. I due istanti sono diversi apposta, e ora c'è un commento nel codice che spiega perché.
- `scripts/qa/e2e.mjs` sale a **81 test**: i 23 giorni 7 ore 24 minuti dal 22 settembre, le due versioni della riga del volo, e la verifica che alle 04:00 del 16 il countdown sia sparito e la timeline ci sia.

## Statistiche anonime con GoatCounter
- **Script in `index.html`**, account `barcellona40`, `no_onload: true`: il sito è a hash, quindi il conteggio lo fa il router e non l'onload.
- **`src/stats.js`**, unico punto di ingresso con tre guardie: senza `window.goatcounter` (ad blocker, rete assente) non succede niente e non finisce niente in console; con `?now=` nell'URL non si conta, perché sono prove; in sviluppo (localhost) nemmeno. Ogni eccezione è inghiottita: una statistica persa non è un problema, un errore in console sì.
- **Viste** con il profilo davanti — `/alessandro/oggi`, `/giulio/programma`, `/anonimo/onboarding` prima della scelta — contate una volta per cambio vista vero: i ri-render dovuti a tema, novità lette o gamification nascosta non valgono una visita in più.
- **18 eventi** ai punti veri: album (apri, copia link, WhatsApp), canzone (play, video, due download), coro, Maps di tappa e di percorso, taxi, QR del parcheggio, riepilogo copiato, novità aperte, missione completata, cambio giorno, modalità pioggia, rigori.
- **Info · Profilo** lo dice in chiaro: "Il sito conta le visite in forma anonima (GoatCounter), per sapere cosa viene usato davvero."
- `scripts/qa/stats.mjs`: **44 controlli**. Con `?stats=prova` le chiamate restano in `window.__b40stats.conte` invece di partire, così i percorsi si verificano senza contattare nessuno.

## Pagina privata delle statistiche
Pagina fuori dal sito, **non linkata da nessuna parte**: `stats-dtcmbsis.html`. Legge i contatori pubblici di GoatCounter (`/counter/<path>.json`, aperti senza token grazie a "Allow adding visitor counts"), quindi **nel sorgente non c'è nessuna chiave**: l'unica cosa da tenere per sé è l'indirizzo.

- **Cosa mostra**: totale delle viste e chi è più attivo; una card per persona con le viste per sezione a barre e l'elenco ✓/— di cosa ha toccato (card grigia "Non ancora entrato" per chi non è mai entrato); "Cosa viene usato", gli eventi sommati fra tutti; "I posti più aperti su Maps", con il colore del giorno della tappa; in fondo l'ora dell'ultimo aggiornamento e il pulsante Aggiorna.
- **Il 404 di quell'endpoint non è un errore**: vuol dire "mai visitato" e vale 0. Dati non disponibili sono solo gli errori di rete e i 5xx: se cadono tutte le richieste la pagina dice **"Dati non disponibili"** e non spaccia il guasto per zero visite; se ne cadono alcune mostra il resto dicendo che i numeri sono incompleti, per difetto.
- **Caricamento**: 127 contatori a blocchi di 6, scheletro mentre arrivano, cache di 5 minuti in `sessionStorage` che il pulsante Aggiorna svuota.
- **Un evento in più nel sito**: oltre a `profilo/maps-tappa` (con l'id nel titolo) il clic su Maps conta anche **`maps-tappa/<id>` senza profilo**. Serviva perché i contatori si interrogano per percorso esatto: con il profilo davanti, la classifica delle tappe costerebbe quattro richieste per tappa invece di una.
- **Limiti scritti nella pagina**: chi usa un ad blocker non viene contato, il profilo non è la persona reale, i conteggi sono totali e non per giorno, e "volte diverse" è il conteggio unico di GoatCounter (per una persona il massimo fra le sue sezioni, non la somma).
- `scripts/qa/stats-pagina.mjs`: **52 controlli**, compresi il grep che nessun file del sito la nomini, i tre contatori veri letti con curl e confrontati con quello che finisce a schermo, il caso "tutto giù", quello parziale, la cache e il tetto di 6 richieste insieme.
- **Corretto un test ballerino** in `scripts/qa/novita.mjs`: il controllo "col changelog aggiornato l'avviso non esce" guardava i file davvero modificati nella working tree, quindi passava o falliva a seconda del momento. Ora costruisce i due elenchi a mano.
- **Nessuna entry in `data/changelog.json`**: questa pagina non deve comparire fra le novità che vedono gli altri.
## Londra · QR del parcheggio P1 di Bologna
- Nuova scheda **🅿️ Parcheggio aeroporto** in cima al blocco di domenica 15, prima della tappa delle 05:15: prenotazione 3039188, intestatario Alessandro Vizzini, entrata 15/11/26 04:15, uscita 17/11/26 23:45, € 63,00 già pagati.
- **QR vero, non un segnaposto**, generato dal payload esatto letto dal QR originale (`$BLQ...`, 15 caratteri): versione 2, correzione d'errore Q, 25 moduli più 4 di quiet zone per lato. Riquadro bianco pieno, 240 px sullo schermo del telefono.
- **SVG statico dentro la pagina**, non generato a runtime da una libreria via CDN: il QR serve alle 4 del mattino sotto la sbarra, dove la rete può non esserci. Pesa 1,3 kB, non aggiunge richieste e funziona anche con la pagina già salvata in home screen e aperta offline.
- **Tocca per ingrandire**: overlay a schermo pieno tutto bianco col QR a 92vw, wake lock così lo schermo non si spegne (ripreso al rientro da background), `requestFullscreen` dove c'è, chiusura con Escape, con la ✕ o toccando fuori. Stesso trattamento del QR del parcheggio di Barcellona.
- Verificato decodificando davvero il rendering di Chromium con zxing-cpp: scheda a 240 px, al minimo di 200 px, a 132 px per stress e a schermo pieno — tutte e sei le letture restituiscono il payload identico all'originale.

## Il gioco dei rigori si apre dall'header
- **Un terzo tondo nell'header**, a sinistra della camera: `[rigori] [camera] [musica]`. Stesso diametro, bordo e sfondo degli altri due, colore **acqua** (`--acqua`, #2CA6A4) per chiudere la palette giallo · terracotta · acqua. Porta a `rigori/` nella stessa scheda, `aria-label="Gioca ai rigori"`, conta `rigori-apri` come la card di Missioni e la riga di Info. Visibile a tutti e quattro, prima, durante e dopo il weekend.
- **Icona disegnata da noi**: Lucide non ha un pallone da calcio (solo `volleyball`, che si legge pallavolo). È nello stesso formato dei nodi Lucide (24×24, tratto 2, niente riempimento) e passa dallo stesso `icon()`. La prima versione — cerchio, pentagono e cinque raggi — a 22 px sembrava un **volante**: quella definitiva ha i lembi delle toppe vicine verso il bordo, e si legge pallone.
- **Impaginazione a 380 px**: titolo 203 px, i tre tondi 148 px, spazio accanto al titolo 133 px. Non ci stanno: prima si vedeva la musica cadere sotto la camera. Quindi i tre tondi vanno **sulla riga del profilo**, a sinistra del chip, e si muovono sempre insieme (`flex-wrap:nowrap` sul blocco, `flex-wrap:wrap` sulla riga). Il titolo resta a 30,4 px, non va a capo e non si stringe; l'header è 8 px più basso di prima. A 320 px ci sta ancora; su desktop i pulsanti tornano accanto al titolo da soli.
- **La card dei rigori in Missioni resta dov'è.**
- `scripts/qa/header.mjs`: **152 controlli** — quattro profili per tre fasi (ognuna verificata dal suo segno in pagina, non solo dall'URL), ordine e allineamento dei quattro elementi, titolo identico a quello senza pulsanti, stessi stili dei tre tondi, evento contato una volta sola, clic che apre davvero il gioco, 320 px e desktop.

## Il pallone dell'header: quello vero
- **Icona sostituita con l'SVG pieno fornito da Alessandro**, usato così com'è (`src/ui/pallone.svg`, importato con `?raw`). Unico cambio: `fill="#2CA6A4"` diventa `fill="currentColor"`, come previsto nel prompt, così il colore arriva dal pulsante (`color: var(--acqua)`) e segue il token. Le mie versioni a tratto sono state tutte tolte: `src/ui/icons.js` è tornato identico a prima.
- **20 px invece di 22**: camera e musica sono icone Lucide con due unità di margine su 24, e il loro disegno occupa circa 20 px. Il pallone pieno arriva fino al bordo: a 22 sembrava più grande degli altri due. Misurati: pallone 20×20, camera 20,2×16,5, nota 18,3×18,3.
- `scripts/qa/header.mjs` sale a **157 controlli**: via "icona a tratto", dentro "pallone pieno in acqua", lo stesso ingombro di camera e musica misurato in pagina, e un controllo che i due tracciati, il viewBox e la trasformazione siano **esattamente** quelli del file fornito.
- **Nessuna nuova entry in `data/changelog.json`**: la v26 dice "in alto c'è un pallone", ed è ancora vero. Rifare comparire il pannello delle novità a tutti per un'icona ridisegnata sarebbe rumore.

## Rigori: la schermata del risultato (blocco 7)
- **XP di partecipazione**: ogni tiro dell'utente vale `XP.tiro = 5`, in tutte le modalità, oltre a gol (10), incrocio (25), parata (15), serie vinta (50), Boss (150). Contato in `main.js` sull'evento `result` quando `ruoli.tiratore.utente` è vero: "+0 XP" dopo una partita intera non esiste più.
- **Classifica solo se ha senso**: la riga "Classifica: …" compare solo se la classifica salvata contiene almeno due nomi diversi. "1. Monne Perso 0–3" da solo sparisce.
- **Gerarchia dei pulsanti**: un solo pulsante grande e giallo, **Rigioca**; sotto Menu, Torna al sito e **Condividi**, che apre a scomparsa Immagine, Video (solo dove il replay è stato registrato) e Copia risultato. "Manda ai ragazzi" non c'è più: il testo della partita è quello che copia "Copia risultato" (`data-copy` porta il testo, il cartello dell'esito continua a copiare l'ultimo tiro).
- **Tono**: sconfitta in Shootout, Boss e Sfida Ale → sotto il punteggio *«Ale ti aspetta per la rivincita.»* in terracotta; vittoria in Shootout e Boss → coriandoli (gli stessi del sito, `src/ui/confetti.js`, rispettano "riduci flash e shake") e *«Ale chiede il VAR. Non c'è.»* in giallo. Skill e pass-and-play non hanno un Ale da battere: nessuna riga.
- `scripts/qa/rigori-passplay.mjs`: non cerca più il link WhatsApp; controlla il testo nel pulsante Copia, che il pulsante grande sia uno solo e che il gruppo Condividi abbia Immagine e Copia risultato.

## Rigori: Mario si chiama Manuel (correzione al blocco 4)
- Mario e Manuel erano la stessa persona con due nomi. **Rinominato, non aggiunto**: `id: 'manuel'` in `data/players.js` (lo stesso id del profilo del sito), stessa faccia (`face-manuel.png`, era `face-mario.png`), stesso numero 10, stessa maglia. Le sei varianti di sfottò sono passate da `mario` a `manuel`.
- `PASS_PLAY_NAMES` è `Ale, Monne, Giulio, Manuel`: Mario non c'è più.
- Verificato: nessun "Mario" resta in `src/`, `data/`, `public/` e `scripts/`. Il gioco precedente (`rigori-classic.html`, in `_legacy/`) è lasciato com'è e lì si chiama ancora Mario: è il gioco vecchio, non toccato per scelta.
- `scripts/qa/rigori-risultato.mjs` controlla i nomi delle card (Manuel, Giulio, Monne), il 10 e la faccia di Manuel.

## Rigori, blocco 1: navigazione e testi
- **Ritocco al blocco 7**: Sfida Ale non è una sconfitta (finisce sempre con tre parate): via la riga della rivincita, al suo posto *«N gol prima delle tre parate di Ale, in M tiri»* e *«Il tuo record: N gol»* (dalla classifica salvata, con "fatto adesso" quando è nuovo).
- **"← Torna al programma" in ogni schermata di scelta**: CHI TIRA?, card giocatore, Modalità, Chi gioca?, Opzioni, Sblocchi, più la Pausa che l'aveva già. Un solo posto per l'indirizzo (`ui/sito.js`), stessa scheda. Da qualunque schermata al sito in **1 tocco**.
- **≡ sopra gli overlay** (`z-index 35`): nel pass-and-play si esce anche dalla scelta della zona; verificato con `elementFromPoint`.
- **✕ della Pausa a 44 px** (era 40).
- **HUD a destra del ≡** (`left 66px`, `right 12px`): "Rigore 1 di 5 · Tu 0 – 0 Ale · Monne fuori" non finisce più sotto il pulsante.
- **Testi**: "pararo" → "paro"; la dritta falsa *«Ha il lato debole a destra, in basso»* → *«Il lato debole ce l'ha: è la bocca. Non stare a sentirlo»*; Skill senza "traversa"; "tell dimezzato" → "il portiere si sbilancia la metà"; Boss "Non si sbilancia quasi mai"; onboarding "zona colorata".
- **Boss al livello 2** (100 XP, `BOSS_LEVEL`).
- `scripts/qa/rigori-nav.mjs`: 23 controlli, compreso il grep sul bundle pubblicato per i refusi.

## Rigori, blocco 2: ritmo
- **Un replay solo, 2,2 s**, dalla laterale rialzata di 0,5 m e arretrata di 1,2 m (`camereReplay`, `[lato·5,6, 1,6, 5,2]`): portiere e palla nel quadro. La velocità del replay è ricavata dalla finestra (`(to − from) / 2,2`), non più fissa a 0,3×. La sequenza parte dall'**esito**, non da quando la palla si ferma: `REPLAY_ATTESA` 0,4 s per leggere il cartello, replay, `FINE` 0,15 s. Prima: due passate da 3,5 s più pause, 8,05 s.
- **Tempo di sistema per tiro**: rincorsa 0,5 + volo fino a 0,75 + 0,4 + 2,2 + 0,15 = **4,00 s** (era 9,7). Shootout da 10 tiri: **41,8 s** di sistema (era 98). Misurato qui con GPU software: esito dopo 3,8 s, tiro concluso dopo 11,6 s, contro 36-43 s di prima nello stesso ambiente.
- **"Tocca per saltare ▸"** grande (56 px, `--fs-2`) e visibile appena esce il cartello; il salto è accettato dopo **150 ms** (era 400).
- **Default**: musica OFF, vibrazione OFF, effetti al **50 %** (`sfxGain` 0,45, era 0,9). Con la musica OFF il loop non parte e **non si scarica nemmeno** (prima partiva a volume zero, 1,1 MB per niente); accendendola in Opzioni parte la traccia giusta. Chi ha già delle impostazioni salvate le tiene.
- **Swipe da tutta la metà bassa** dello schermo (`input.js`): il raggio di 70 px attorno al pallone non c'è più.
- **Video solo a richiesta**: niente più `MediaRecorder` acceso a ogni replay di ogni tiro. "Video" nel risultato riesegue il replay dell'ultimo tiro registrando il canvas (il record è immutabile, il video è identico a quello visto) e poi condivide.
- `scripts/qa/rigori-ritmo.mjs`: 16 controlli. `rigori-musica.mjs` accende la musica nelle impostazioni, perché è lei che controlla.

## Rigori, blocco 3: equilibrio
- **Due leve sole**, come da decisione; le capsule di `reach.js` non si toccano.
  1. `TELL_MS` 350 (era 200): il tiratore CPU si sbilancia 350 ms prima del calcio.
  2. `cpuAim`: 40 % centro (da basso a mezza altezza), 35 % laterali bassi, 25 % alti. Prima pesava i lati 6 volte su 8 e andava in alto il 45 % delle volte, dove il tuffo non arriva nemmeno indovinando.
- **Gate a 200 tiri (`npm run test:gate`)**: invariato, 5/5 — campiona tiri uniformi sullo specchio, non la distribuzione di Ale, e la geometria è la stessa: gol 63,6 %, parate cieche 14,8 %, incroci 100 %, (a) e (b) verdi.
- **Misura vera (`scripts/qa/rigori-equilibrio.mjs`)**: 60 tiri di Ale dalla sua distribuzione contro chi indovina la zona (tuffo 250 ms dopo il calcio), 60 contro un tuffo a caso, e 12 Shootout interi con un tiratore "umano medio" (mira a caso fra le sei zone, dispersione vera) che da portiere legge il tell. I numeri sono nel report del blocco.
- **Risultato: gli obiettivi NON stanno insieme con queste due leve**, e per decisione ci si ferma qui senza toccare le capsule. Con 40/35/25 (`rigori-sweep.mjs`, 600 tiri per riga, fisica vera in node): chi indovina para il 46 % se si tuffa sul tell (prima del calcio) e il 26 % se aspetta 250 ms; Ale contro chi legge il tell segna il 46-52 %; Shootout vinto stimato 68-75 %. Ogni mix che porta Ale al 55-60 % (più tiri alti, che non si parano mai) fa scendere le parate "indovinando" al 35 %. Nel browser (SwiftShader, 60 tiri): 52 % · 47 % · 10 vittorie su 12. La scelta del mix è nel report.
- `rigori-progress.mjs` portato alla porta in scala: incrocio a (1,85, 1,50), traversa a y 1,92.

## Piano pioggia rifatto (venerdì, Rooftop, domenica, ombrello)
- **Testo falso tolto**: i vicoli di Montcada, Pont del Bisbe e Sant Felip Neri sono all'aperto; con la pioggia si attraversano senza fermarsi.
- **Venerdì con "Piove"**: Brunells 55 min (`durataPioggiaMin`); la Ciutadella **salta** (`saltaPioggia`: esce dalla cascata, dai conti, dalla mappa e da Adesso/Prossima, resta in coda grigia con il motivo e zero soste); El Born da Brunells 328 m / 4 min, **non prima delle 10:00** (`apertura`, nuova regola della cascata: si aspetta l'apertura e si riparte da lì); Santa Maria del Mar **visita interna** 30 min con `whyPioggia` e `detailsPioggia` (venerdì 10:00–18:00, circa 8 € da una recensione recente, 4,7 su 40.610, tetto chiuso se piove); Montcada, Bisbe e Sant Felip a 5 min; Duck Store e Santa Caterina invariati. Cascata: El Born 10:00 · Santa Maria 10:43 · Montcada 11:17 · Bisbe 11:33 · Sant Felip 11:40 · Duck 11:47 · Santa Caterina 12:15 · Bar Joan 12:35 · jamón 13:50; soste 4 h 25 min + cammino 51 min, 4 min di margine. Percorso del mattino con `urlPioggia` (Brunells → El Born → …), scelto dal pulsante quando piove; `validate` ne controlla il formato.
- **Rooftop Garden**: `avvisoPioggia` in giallo (`.avviso--pioggia`) con il telefono e il piano B "il bar dell'hotel El Palace al piano terra": il nome del bar non compare sul sito ufficiale (si vede solo il ristorante Amar), quindi resta generico. Riga in `DA_VERIFICARE.md`.
- **Domenica con "Piove"** (stesso interruttore, un solo stato "piove"): Bunkers saltati, Mirador 2 h (fino alle 15:30), rientro `timePioggia` 15:30 con i dettagli del piano (T2 in anticipo, Canudas dalle 17:00 circa invece delle 20:20); avviso nel Programma e nota sulla timeline del viaggio in Oggi (gli orari dei passi restano quelli del piano normale). Nessuna alternativa al coperto inserita: da qui non si verificano orari reali.
- **Ombrello**: nel meteo, se un giorno del weekend presente nella previsione supera il 40 %, riga in blu "Previsione pioggia: mettete in valigia un ombrello pieghevole."
- QA: `venerdi.mjs` (pioggia: ordine, cascata fino al Bar Joan, Ciutadella saltata, Santa Maria dentro, nessuna sosta all'aperto oltre i 5 minuti, avviso nuovo, Rooftop, link di pioggia, ritorno al sereno), nuova `pioggia.mjs` (domenica, Oggi, mappa), `meteo.mjs` (ombrello).

## Venerdì: colazione da Brunells prima della Ciutadella
- Nuova tappa `f1b` (l'id `f2b` è già El Born): 09:00, 45 min, "Colazione · Brunells", venue `brunells` verificato via Google Places (41.3854186, 2.1806806; 4,0 su 2.376; 9:00–20:00; +34 936 53 64 68). Solo ale e monne (anche negli `skips` di Giulio e Manuel). Una prima versione con Elsa y Fred è stata sostituita prima di andare online: nessun residuo (`grep elsayfred` vuoto, la suite lo controlla anche sul DOM).
- Orari a cascata: 08:05 atterraggio (taxi dal T2 a Brunells, 15,4 km ≈ 27 min; testo dell'Atterraggio aggiornato) · 09:00 colazione · 09:45 a piedi 677 m / 8 min · 09:55 Ciutadella ridotta da 45 a 25 min (15 con la pioggia, come prima) · 10:20 a piedi 841 m / 10 min · 10:30 Santa Maria del Mar invariato. La colazione prima rende il piano robusto se la Ciutadella apre alle 10:00. Con la pioggia la cascata parte dalla colazione: Ciutadella 09:53, El Born 10:16, Santa Maria 10:59.
- Riepilogo del margine: calcolato dai dati, ora parte dalle 09:00 (soste 4 h 10 min + cammino 1 h 2 min); consiglio "taglia la Ciutadella da 25 a 15 minuti"; "sei tappe su nove sono all'aperto". Percorso "Venerdì mattina" con Brunells come origine (link Maps nuovo, formato validato e URL che risponde 200; il tracciato va guardato una volta dal telefono).
- Foto: quella fornita (insegna rossa, vetrina "Best Croissant"), ritaglio 16:9 con bias 0,35, 640×360, WebP q72, 43 kB, `brunells.webp`, privata ("per gentile concessione", in `foto-tappe.json` e `CREDITS.md`). Dettagli stimati sotto il badge "stimato": prezzo e menu ai tavoli.
- **Da dare al tassista** (`stop.tassista`, nuovo blocco in `card.js`): indirizzo grande "Carrer de la Princesa, 22 · 08003 Barcelona", sotto "Pastisseria Brunells, esquina con Carrer de Montcada", pulsante "Copia indirizzo".
- **Bolt**: nessun deep link pubblico e documentato con la destinazione (non se ne inventa uno). Il tocco copia l'indirizzo e apre l'app: Android `intent://` con `package=ee.mtakso.client` (verificato: la pagina del Play Store risponde 200, un pacchetto finto 404) e il Play Store come ripiego; iOS la pagina dell'App Store `id675033630` ("Bolt: Request a Ride", verificata); altrove bolt.eu. Toast "Indirizzo copiato: incollalo come destinazione in Bolt". **Uber** con la destinazione già impostata: il link universale ufficiale sta nel dato (`tassista.uber`), scritto a mano come i percorsi. Eventi `taxi-bolt` e `taxi-uber` (anche nella pagina statistiche).
- `DA_VERIFICARE.md`: orario di apertura della Ciutadella (alcune fonti dicono 10:00): arrivando alle 09:55 si aspettano al più 5 minuti.
- QA: `venerdi.mjs` (tappa solo per ale e monne, nessun residuo di Elsa y Fred, blocco tassista, Copia indirizzo, Bolt su Android e iOS, link Uber, eventi, orari a cascata sereno e pioggia, "Adesso"), `percorsi.mjs`, `immagini.mjs`, `stats-pagina.mjs`, `e2e.mjs`, `opzionali.mjs`, `sabato.mjs` aggiornate.

## Meteo: la card non compariva con ?now= (fix)
- Riprodotto sul sito online con `#/oggi?now=2026-10-15T10:00`: fetch 200 (240 ore, 27 settembre → 6 ottobre), cache scritta, console vuota, nessuna card. La finestra 9–18 ottobre leggeva la data simulata (giusto), ma anche il render la usava per cercare l'ora "2026-10-15T10:00" e i giorni 16–18 nei dati, che sono sempre reali: non trovati → vuoto → slot rimosso in silenzio. La suite passava perché il suo fixture partiva dalla data simulata.
- Ora `riferimento()`: l'ora simulata se sta nella previsione, altrimenti l'ora reale; i giorni Ven/Sab/Dom se ci sono, altrimenti i tre successivi disponibili (con il loro nome), e il chip "Oggi" è il giorno dei dati. Dal 9 ottobre, senza simulazione, i due casi coincidono. Nuovo caso nella suite con i dati del 27 settembre e `?now=15 ottobre`. Verificato anche con una risposta vera registrata, servita al browser sulla stessa URL: Open-Meteo dall'ambiente di QA risponde 429 (IP del proxy condiviso), quindi la chiamata dal vivo va rifatta dal telefono.

## Meteo di Barcellona (deroga al congelamento, isolata)
- `src/ui/meteo.js` + stili in `views.css`. Fonte Open-Meteo senza chiave (41.3874, 2.1686, `timezone=Europe/Madrid`, hourly temperatura/pioggia %/codice/vento, daily min/max/pioggia max/codice/alba/tramonto). **`forecast_days=10`, non 7**: il 9 ottobre venerdì 16 è il settimo giorno da oggi (giorno 0) e con 7 resterebbe fuori proprio il primo giorno del weekend.
- Compare solo dal 9 al 18 ottobre (`meteoVisibile`): prima il codice non chiama l'API. Cache 30 minuti in `sessionStorage` (`b40:meteo:v1`), anche degli errori: mai più di una richiesta ogni 30 minuti. Rete assente o risposta rotta: la card non compare, niente placeholder.
- Card chiusa: icona · temperatura di adesso · "Barcellona, adesso" · Ven/Sab/Dom con min/max e icona. Aperta: chip Oggi (prima del 16) / Ven / Sab / Dom, striscia ora per ora con snap (oggi dall'ora attuale, gli altri giorni dalle 07:00, sempre fino alle 23:00; % pioggia in blu solo sopra il 20 %; ore multiple di 3 in grassetto), alba e tramonto vivi (la tappa dei Bunkers non è stata toccata). Testo sempre "previsione".
- Piove: se venerdì 16 fra le 9 e le 14 la probabilità massima è ≥ 50 %, riga in giallo "Previsione: venerdì mattina N % di pioggia. Attivo il piano coperto?" con "Attiva" che accende il toggle del Programma (`store.piove`); già acceso → "Piano coperto attivo". Nessun automatismo.
- Icone Lucide (sun, cloud-sun, cloud, cloud-rain, cloud-lightning, cloud-fog; alba/tramonto sunrise/sunset), codici WMO mappati in `iconaMeteo`. Un solo evento GoatCounter, `meteo-apri`; le richieste non si tracciano.
- `scripts/qa/meteo.mjs`: 8 ottobre nessuna card e nessuna fetch; 15 ottobre card con chip Oggi/Ven/Sab/Dom; fetch che fallisce → niente card e console pulita; striscia fino alle 23 e non oltre; "Attiva" accende il toggle; a 380 px la card chiusa sta su una riga. La fetch è stubbata (il Chromium di QA non esce in rete); la forma della risposta è stata verificata con una chiamata vera.

## Canzone: noindex subito, sparizione dal 19 ottobre
- `<meta name="robots" content="noindex, nofollow, noarchive">` su ogni pagina pubblicata (index, rigori, canzone.html, gym, soldi, tutto `_legacy/`) e `robots.txt` con `Disallow: /`. Verificato sul bundle da `scripts/qa/canzone-dopo.mjs`.
- Interruttore a data `canzoneVisibile()` (`time.js`, `FINE_CANZONE` = 19 ottobre 2026 00:00): dalla mezzanotte spariscono la card in Oggi, la nota nell'header, la sezione "La canzone" in Info, la modalità coro (`#/coro` → `#/oggi`), la missione m15 "Coro Ufficiale" (conteggi e XP compresi), le voci dello storico Novità che la nominano; `canzone.html` porta alla home. Nessun file audio o video viene più richiesto. Gli eventi GoatCounter `canzone-*` e `coro-apri` non partono perché non c'è più nulla che li emetta.
- Prova con `?now=2026-10-19T00:01` su Oggi, Programma, Mappa, Missioni, Info: zero "canzone", "Disonesti", "coro", ".mp3", ".mp4" nel DOM e nelle richieste di rete. Con `?now=2026-10-17` tutto c'è ancora. Solo qui nel CHANGELOG, non nelle Novità.

## Rigori: giro di regressione sugli incroci (congelamento 3 ottobre)
Cercati bug dello stesso tipo di "portiere che si rituffa nel replay": due cambi della settimana che da soli vanno e insieme no. Suite nuova `scripts/qa/rigori-incroci.mjs` (una sezione per coppia) e `scripts/qa/rigori-giro.mjs` (quattro profili × cinque modalità, una partita ciascuna, URL di sabato sera).
- **Replay unico × video a richiesta**: stessa finestra e velocità; durante la registrazione il tempo di gioco è fermo e i pulsanti del risultato non rispondono (`.rg-registrando`), il tiratore è in posa di calcio (`kicker.onKick()`, prima restava fermo sul dischetto), stinger e ducking come dal vivo; ogni suono una volta sola.
- **Chi tira? senza card × pass-and-play**: "Tira X · Cambia" dice il tiratore scelto; il pass-and-play parte con la scelta della zona, poi il passaggio del telefono; ≡ e altoparlante restano sopra gli overlay; il bordo "Sei tu" non si sposta.
- **XP per giocatore × XP totale × Boss**: la riga sotto il volto diceva "Lv 1" mentre il risultato diceva un altro livello. Livello, Boss e sblocchi sono del telefono (B7/B1); la riga ora mostra solo "N XP · N vittorie" di quel giocatore. Portare tutta la progressione per giocatore è una scelta di prodotto, non un fix, e non si fa a gioco chiuso.
- **Musica OFF × altoparlante × Opzioni**: un flag solo; cambiandolo da Opzioni l'icona nell'HUD non si aggiornava (corretto), dall'altoparlante Opzioni lo rilegge giusto.
- **Tell 0,35 × ritmo ≤ 4 s**: sul tiro dell'utente il budget è 4,00 s; sul tiro di Ale il tell (0,35) precede la rincorsa (0,5) e il totale è **4,35 s**. Non toccato: accorciare vorrebbe dire rendere il tell meno leggibile, ed è la leva del blocco 3 appena decisa.
- **Boss 25/25/50 × Sfida Ale × Skill**: ogni modalità imposta la sua difficoltà allo start (`normale`, `facile`, `boss`); la mira 25/25/50 arriva solo quando il portiere è "boss". Verificato dopo un Boss.
- **Manuel × classifiche con "Mario"**: le righe salvate prima della rinomina restavano "Mario" e in classifica c'erano due nomi. Al caricamento `progress.js` rinomina una volta le voci di tutte le classifiche (`board:*`).
- **Tap ovunque per saltare × Condividi nell'esito**: il tap su Condividi non salta (escluso in `pointerdown`) e condivide; un tap altrove salta. Già giusto.

## Rigori: audio nel video, effetti al 70 %, musica a un tocco
- **Video con l'audio** (`audio.streamAudio()`): un `MediaStreamAudioDestinationNode` sul master (dopo i volumi di effetti, musica e stinger) la cui traccia entra nello stream del canvas prima di avviare il `MediaRecorder`. Mentre si registra, i suoni del tiro vengono rifatti agli stessi istanti del record (fischio, calcio a t = 0, rete/guanto/palo alla risoluzione, boato o "ooh" dopo). Il file viene controllato nei **metadati** (`haTracciaAudio`: `soun` nel MP4, `A_OPUS`/`A_AAC` nel WebM): se esce muto o vuoto, "Video" sparisce dal risultato per la sessione e si dice di condividere l'immagine. Su iOS Safari non è stato provato: vale la regola "muto = niente pulsante".
- **Effetti al 70 %** (`SFX_GAIN` 0,63, era 0,45) e fischio più presente (0,28, era 0,16). Misurato in Chromium sul master: fischio -8,5 dBFS, calcio e impatto -4,9 dBFS. Gli effetti non dipendono dal flag della musica.
- **Fischio a ogni tiro**, non solo al cambio di ruolo: in Sfida Ale e Skill prima fischiava solo il primo.
- **Sblocco robusto**: ogni `pointerdown` sul gioco (volti di "Chi tira?" compresi) riprende l'`AudioContext` se non gira. La prova sospende il contesto e tocca un volto: torna `running`.
- **Altoparlante nell'HUD** (`.rg-musicbtn`, 48 px, in alto a destra, `aria-pressed`): un tocco accende la musica (parte subito "tensione") o la spegne, e salva la scelta. Sta a destra e non accanto al ≡ perché la riga del punteggio è già al limite a 380 px: l'HUD ora finisce a 66 px dal bordo destro.
- **Errore vero corretto** (da blocco 2): durante il replay il tiro dal vivo continuava a disegnare a tempo fermo e il portiere rifaceva tuffo, con suono e polvere, **a ogni frame** (55 "dive" in un replay). `shot.update` non disegna più a dt = 0.
- `rigori-audio.mjs` rifatta: sblocco al tocco sul volto, cosa suona e quando, picchi in dBFS, traccia audio nel file, altoparlante on/off, tuffo una volta sola.

## Rigori: "Chi tira?" a un tocco
- **Il bordo giallo dice "sei tu", non "selezionato"**: sta sul volto del profilo scelto nel sito (`b40:v1:person`, letto e mai scritto) con l'etichetta "Sei tu", e non cambia toccando gli altri. Senza profilo (link diretto): nessun bordo, nessuna etichetta, nessun pulsante primario, solo i tre volti e "Tocca il tuo nome".
- **Toccare qualsiasi volto porta dritto a Modalità.** La card di conferma del giocatore (`giocatore.js`, "VAI/Cambia") non c'è più: era un tocco a vuoto. Da Chi tira? al primo tiro: 2 tocchi.
- **Riga sotto ogni nome**: "Lv 2 · 140 XP · 3 vittorie" oppure "Mai tirato". È progressione **per giocatore** (`b40:v1:rigori:giocatori`, nuova, alimentata da XP e partite di chi tira; il pass-and-play non conta). Chi ha già XP sul telefono parte da "Mai tirato" per ogni volto: gli XP totali restano dov'erano.
- **"Tira come Monne →"**: pulsante primario giallo sotto i volti, prima di Classifica. Sotto i volti: "Tocca un altro nome per far tirare lui".
- **Modalità** dice in alto "Tira Giulio · Cambia", con Cambia che torna a Chi tira?; il vecchio "Cambia tiratore" in fondo è sparito.
- `rigori-nav.mjs`: profilo monne (bordo, "Sei tu", pulsante, tocco su Giulio → "Tira Giulio", 2 tocchi al primo tiro), nessun profilo, bundle senza card giocatore. Le altre suite non passano più dalla card.

## Rigori, blocco 3 bis: il Boss tira negli angoli alti
- **Decisione**: resta il 40/35/25 per tutte le modalità (al tavolo la reazione sarà vicina a 0,25 s, e lì lo Shootout si vince il 33-50 %). Il **Boss "Ale in forma"** usa il **25/25/50**: prima si distingueva solo per la reattività del portiere, ora Ale segna il 75 % e i due gradini di difficoltà sono veri.
- `cpuAim` prende la distribuzione come parametro (`MIRE.normale`, `MIRE.boss`); `cpuShoot` sceglie in base alla difficoltà del portiere. Le capsule non si toccano.
- Sweep (`rigori-sweep.mjs`, 600 tiri): 25/25/50 → Ale segna a caso 75 %, chi indovina para il 34-39 %; lo Shootout stimato 43-51 % vale con un tiratore al 63,6 %, in Boss il portiere è più reattivo e la stima è per eccesso.
- `tests/mire.test.js` (4 test, in `npm test`): distribuzioni entro ±3 punti, tiri dentro lo specchio.

## Rigori, blocco 5: visivo
- **Volto anche sul retro della testa** (`textures.js`, stessa foto mascherata a u = 0,75): dalla camera di gioco il tiratore non è più una sfera color pelle.
- **Cartello dell'esito in alto** (60 px dal bordo, sotto l'HUD) e **più piccolo** (30–46 px, erano 40–64); **Condividi** è un pulsante a sé in basso a sinistra (56 px), fuori dal cartello. La porta e il portiere restano visibili sotto la scritta.
- **Fari**: doppio alone per torre (largo e tenue 20 m, opacità 0,55; piccolo e caldo 7 m, bianco) e cono quasi doppio (0,24, era 0,13).
- Ombra e erba: non fatte, come da decisione ("solo se ci stai dentro senza sforzo").
- `rigori-ritmo.mjs` controlla cartello in alto e Condividi in basso a sinistra.

## Rigori, blocco 6: sociale
- **Pass-and-play in cima** al menu Modalità, Shootout secondo (`MODES_INFO`).
- **Classifica di serata** (`ui/screens/classifica.js`): le dieci voci salvate del pass-and-play (nome, gol · parate, data) più il miglior risultato di Shootout, Sfida Ale, Skill e Boss. Si apre da CHI TIRA? e da Modalità (1 tocco), dalla Pausa e dal risultato (≡ → Classifica: 2 tocchi), e ha anche lei "Torna al programma".
- `rigori-nav.mjs`: ordine del menu, classifica a 1 tocco da Modalità e CHI TIRA?, a 2 dalla partita.
## Londra · M&M'S London come tappa "plus" sui tre giorni
- **Card "✨ Plus — se avanza tempo"** in fondo a ciascuna delle tre giornate, ripetuta apposta: M&M'S London non è legata a un giorno, è un di più da fare quando capita, visto che sta a 0,57 km da Beak Street (7 minuti a piedi). Quattro piani, Pick & Mix a peso, e l'avviso sui prezzi alti segnalati nelle recensioni.
- Si distingue a colpo d'occhio dalle tappe fisse: **bordo tratteggiato oro** invece che pieno, fondo leggermente staccato, testo più piccolo e — soprattutto — **nessun orario** al posto del quale c'è la pillola "Plus". Link a Maps con il `place_id` reale.
- **Una sola immagine per tutte e tre le istanze** (`assets/tappe/londra/mms.webp`): verificato in Chromium che il browser la scarichi una volta sola.
- **Foto: quella scattata dalla famiglia**, non Commons. Su Commons il materiale libero c'è (una trentina di file, tutti CC BY o CC BY-SA) ma nessuno serve: gli esterni riconoscibili — l'insegna "M&M'S WORLD" fra i tubi al neon colorati — sono **del 2012 e notturni**, e quella facciata non esiste più; l'unico esterno diurno (`M&M'S London Facade.jpg`) è grigio, pieno di riflessi e mostra anch'esso la vetrina vecchia. La foto di famiglia è diurna e ritrae il negozio **com'è adesso**, giallo. Nessuna attribuzione dovuta, quindi `CREDITS.md` non cambia; in pagina la didascalia dice "foto di famiglia".
- **Peso della cartella rientrato sotto il tetto** di 1,5 MB: la foto nuova la portava a 1558 kB, quindi cinque immagini ancora a q80 (buckingham, regent, stjames, nhm, blq_arr) sono scese a q70, da 1489,8 kB totali. Scelte misurando prima la resa di ognuna senza scriverla: sotto il 5% vuol dire che erano già a q70 e ricomprimerle sarebbe stata solo perdita di qualità a vuoto.
- `scripts/londra-foto.mjs` ora **conta nel tetto anche i file che non gestisce** (la card stilizzata dell'appartamento e questa foto): prima sommava solo quelle scaricate da Commons, quindi una rigenerazione sarebbe tornata a sforare senza accorgersene.

## Londra · foto vera dell'appartamento
- La card stilizzata di Beak Street lascia il posto a **`79 Beak Street, Soho, January 2022.jpg`** (No Swan So Fine, CC BY-SA 4.0), sulle due card dell'appartamento: check-in di domenica e check-out di martedì. Si vede il portone verde col **79** sul vetro, accanto alla vetrina di John Wilkes.
- È un'eccezione voluta alla regola "niente verticali": l'originale è in piedi, ma il ritaglio 16:9 basso (bias 0,8) tiene proprio portone, vetrina e due piani di finestre. Registrata in `scripts/londra-foto.mjs` con il suo bias, così una rigenerazione la ritrova.
- `apt.svg` rimossa perché non più usata. Per rientrare nel tetto di 1,5 MB, cinque foto ancora a q80 sono scese a q70 (apt, lina, soho, lhr_dep, trafalgar): cartella a 1495,5 kB. Aggiornati anche i pesi in `data/foto-tappe-londra.json`, che dal giro precedente erano rimasti quelli vecchi.

## Londra · meteo ora per ora, al posto del widget per giorno
- **Via il widget nei tre giorni** (medie storiche, poi previsione giornaliera): lo sostituisce **una card sola in cima al Programma**, sul modello di Barcellona. Chiusa mostra la temperatura di Londra adesso e i tre giorni del viaggio con icona e minima/massima; toccandola si apre la **striscia ora per ora fino alle 23:00** (oggi dall'ora attuale, gli altri giorni dalle 7), con i giorni selezionabili, la probabilità di pioggia quando supera il 20% e **alba e tramonto veri** presi da Open-Meteo.
- **Regola di comparsa nuova**: la card esiste solo **dal 5 novembre** (10 giorni prima della partenza) **al 17**. Prima non compare nulla — niente medie storiche, niente segnaposto — e la pagina non chiama nemmeno l'API. Con errore, risposta vuota o rete assente la card sparisce in silenzio.
- URL di Open-Meteo quello indicato (coordinate di Beak Street, 15-17 novembre, fuso Europe/London) più `current=temperature_2m,weathercode`, che serve per il valore "adesso": con le sole date fissate, prima del 15 non ci sarebbe un'ora corrente da mostrare. Verificato sull'API reale che `current` funziona insieme a `start_date`/`end_date`.
- Nessuna cache: Barcellona tiene la risposta 30 minuti in sessionStorage, qui no, per la regola "niente storage". Una richiesta per caricamento. `?now=AAAA-MM-GG` simula la data per i test.
- Provato in Chromium con risposte simulate nella forma vera dell'API: oggi, 4 e 18 novembre → nessuna chiamata, nessuna card; 5 novembre con errore 400, "limite giornaliero superato", rete assente o dati vuoti → card assente; con dati buoni → card visibile, il 16 si apre da sola su lunedì dall'ora corrente.

## Londra · percorsi Maps per mezza giornata
- Sei pulsanti **"🗺️ Percorso · …"** in testa al blocco che coprono: domenica mattina (prima dell'arrivo a Heathrow) e pomeriggio (prima di Southbank), lunedì mattina (prima della partenza da Soho), pomeriggio (prima di Harrods) e sera (prima delle luci di Regent Street), martedì (prima del check-out). Ognuno dice il giro e il mezzo: 🚇 con i mezzi o 🚶 a piedi. I link delle singole tappe restano.
- Le URL sono **le stringhe fisse fornite**, incollate così come sono e non ricostruite dalle coordinate delle card. Verificato in Chromium che l'`href` letto dalla pagina coincida carattere per carattere con l'originale, per tutti e sei.
- Dubbi segnalati e **non corretti**, in attesa di decisione: il martedì il percorso ripassa da Beak Street dopo Covent Garden, mentre il sito prevede il check-out alle 10:30 senza rientro; il punto "Heathrow" (51.4700, −0.4543) è l'area dei Terminal 2 e 3, non il Terminal 5 dei voli BA; Google non garantisce le tappe intermedie coi mezzi pubblici e sui browser mobili ne accetta al massimo tre (il lunedì mattina ne ha cinque); la tappa "luci di Regent Street" cade su Savile Row, una via più a ovest; la domenica sera (London Eye → Lina Stores → Carnaby → Beak Street) non ha un percorso.

## Londra · percorsi Maps, revisione: da 6 a 11
- I sei pulsanti del giro precedente lasciano il posto a **undici**, stesso stile e stessa logica di posizione (in testa al blocco che coprono). Risolvono i dubbi segnalati: **Heathrow è il Terminal 5** (51.4723, −0.4887, a 71 m dal terminal su OSM); le luci di Regent Street cadono **su Regent Street**, davanti a Hamleys, e non più su Savile Row; c'è il tratto di **domenica sera** (London Eye → Lina Stores → Carnaby → casa); il martedì **non ripassa più da Beak Street** (Beak St → Covent Garden a piedi, poi Covent Garden → T5 coi mezzi).
- **Coi mezzi pubblici solo origine e destinazione**, mai tappe intermedie; **a piedi al massimo due tappe intermedie**, spezzando i tratti lunghi. Il lunedì passa così da tre pulsanti a sei, e la sera da due tratti distinti: museo → Piccadilly Circus coi mezzi, poi a piedi sotto le luci fino a casa.
- URL incollate alla lettera; verificato in Chromium che tutti e undici gli `href` coincidano carattere per carattere con le stringhe fornite. Nuovi punti controllati su OpenStreetMap: Lina Stores a 5 m, Piccadilly Circus a 42 m, Carnaby su Carnaby Street.

## Londra · pannello "Cosa è cambiato"
- **Pannello dal basso all'apertura** con le novità dall'ultima visita su quel dispositivo: data, titolo, voci, pallino rosso sulle non lette, "Ho capito" sempre in fondo. Si chiude anche con Esc o toccando fuori, e **in ogni caso segna come viste**, così non insegue nessuno. Lo storico completo si riapre dal link **"📋 Cosa è cambiato nel sito"** in fondo alla pagina.
- Le voci stanno in un oggetto `NOVITA` dentro la pagina (una pagina sola, niente file da scaricare a parte e niente cache che serva voci vecchie). Numero di versione intero che cresce di uno; la regola "ogni modifica visibile aggiunge una voce nello stesso commit" è scritta nel commento sopra l'oggetto.
- **Unico uso di localStorage della pagina**, come da richiesta: una chiave sola, `londra:novita:vista`, con l'ultima versione vista. Con lo storage bloccato (navigazione privata, dati disattivati) il pannello non si apre da solo — non si potrebbe chiudere per sempre — ma lo storico resta raggiungibile dal link.
- Storico di partenza: sei voci, dal QR del parcheggio (24 settembre) a oggi.
- Provato in Chromium: prima visita (6 novità), "Ho capito" e ricarica (niente), versione 4 salvata (2 novità), chiusura con Esc e toccando fuori (salva), storage che lancia eccezioni (nessun pannello, nessun errore, storico dal link funzionante).

## Londra · DA_VERIFICARE_LONDRA.md e badge in testata
- **Nuovo file `DA_VERIFICARE_LONDRA.md`** nella radice, separato da quello di Barcellona: le incertezze aperte con contesto e "chi e come" le chiude, più una sezione di quelle risolte, tenute per memoria.
- **Aperte, tre:** apertura del Winter Market di domenica 15; cambio della guardia di lunedì 16 (Buckingham e Horse Guards: con Buckingham alle 12:45, una cerimonia alle 11:00 si perderebbe); fascia d'età e prezzo bambino di London Eye e SEA LIFE, ancora da comprare.
- **Chiuse, due, dopo averle controllate sul sito:** il deposito bagagli è superato (solo bagaglio a mano, e il sito lo dice già in tre punti); il prezzo della Tower Bridge Exhibition non serve più, perché Tower Bridge non è né tappa né voce di budget — compare solo nel disegno dello skyline in testata.
- **Badge rosso "3 da verificare"** in testata, sotto il pulsante per Olly: apre un pannello con lo stesso elenco. Il numero si conta dall'elenco in pagina; a elenco vuoto il badge sparisce. Il pannello non salva nulla.
- File ed elenco in pagina partono dalla stessa fonte; verificato in Chromium che titoli e ordine coincidano. Da qui in avanti vanno tenuti allineati a mano (scritto in testa a entrambi).

## Londra · durate per tappa e avviso di giornata stretta
- **Durata stimata** sulle dodici tappe fisse che ce l'hanno, come pillola sotto il titolo: Southbank 45 min, SEA LIFE 1 h 45, London Eye 30 min, Trafalgar 15 min, Whitehall/Horse Guards 20 min, Big Ben 15 min, St James's Park 30 min, Buckingham 20 min, Green Park 30–45 min con pranzo, Harrods 1 h, Natural History Museum 1 h 15, Covent Garden 1–2 h flessibile. Niente durata sulle "plus", sui voli e sulle tappe di passaggio (metro, check-in, luci, spesa), per cui non c'è un valore dato.
- **Controllo del margine** per tratti, dall'inizio al prossimo vincolo fisso: domenica 10:45 → chiusura di Lina Stores alle 18:00; lunedì 09:15 → ingresso al museo alle 16:30, e 16:30 → chiusura alle 17:50; martedì 11:00 → partenza per Heathrow alle 15:15. Somma il valore alto delle forchette; se sfora, in cima al giorno compare un avviso non bloccante che propone di accorciare la tappa comprimibile più lunga (Southbank, St James's, Green Park, Harrods, Covent Garden). Gli spostamenti non sono contati, e l'avviso lo dice.
- **Con gli orari di oggi nessun giorno sfora**, quindi non compare nessun avviso. Il margine più stretto è il museo: 1 h 15 di visita dalle 16:30 alla chiusura delle 17:50, cinque minuti di avanzo.
- Provato in Chromium forzando a turno una durata per tratto: l'avviso compare nel giorno giusto, col nome giusto, e sparisce ripristinando il valore.

## Londra · Benjamin Pollock's Toyshop, plus del martedì
- Nuova card **"✨ Plus — se avanza tempo"** solo al martedì, prima di quella di M&M'S: negozio storico di teatrini di carta dentro il mercato coperto di Covent Garden, zero deviazione. Stesso trattamento delle altre plus: bordo tratteggiato, nessun orario, nessuna durata. Maps sulle coordinate fornite, che su OpenStreetMap cadono a 3 m dal negozio.
- **Foto da Commons**: `Benjamin Pollocks Toy Shop exterior.jpg` (Jack1956, CC0), in `CREDITS.md` e sotto la card. Degli altri candidati due erano interni e uno solo l'insegna appesa. L'originale è verticale: stessa eccezione di Beak Street, con il ritaglio centrale (bias 0,2) che tiene insegna, figurine e porte rosse. Registrata in `scripts/londra-foto.mjs`.
- Per restare sotto 1,5 MB sette foto ancora a q80 sono scese a q70 (pollock, southbank, bigben, bakerloo, horseguards, eye, sealife): cartella a 1498,4 kB. A q80 ne restano solo tre piccole (lhr, blq, ba): **il margine per altre foto è finito**.

## Londra · piano pioggia
- **Pulsante "🌧️ Piove"** in testata, sotto il badge "da verificare": acceso diventa azzurro e dice "sì". Accende solo note per-giorno, nessun ricalcolo delle durate.
- **Domenica**: nessun cambio di tappe; sulla card del London Eye "la ruota gira lo stesso, capsule chiuse, visibilità ridotta dall'alto".
- **Lunedì**: in testa alla mattina (tutta all'aperto, Trafalgar → Green Park) il consiglio di invertire — Harrods prima, al coperto, parchi dopo se spiove. **Il museo resta alle 16:30**: il suggerimento di partenza lo anticipava insieme a Harrods, ma i biglietti sono a fascia oraria e prima non si entra, quindi la nota lo dice.
- **Martedì**: sulla card di Covent Garden "già al riparo, il mercato è coperto".
- Stato solo in memoria finché la pagina è aperta: nessuno storage (verificato in Chromium), una ricarica lo rimette su "no".

## Londra · passeggino a noleggio, piano B
- Box **"👶 Passeggino a noleggio — piano B"** nelle note pratiche: il piano base resta a piedi e in braccio. Tre servizi verificati sui loro siti: **Baboodle** (consegna il giorno dopo in tutta Londra, finestra di due ore, ritiro gratuito; listino mensile, quindi il prezzo per due notti va chiesto), **The London Baby Equipment Hire Company** (specialisti londinesi, consegnano anche a hotel e alloggi; prezzi in un listino a parte), **Babonbo** (piattaforma di noleggiatori locali, consegna in hotel e case vacanza e a Heathrow; prezzi solo prenotando).
- **Nessun prezzo in pagina**: nessuno dei tre pubblica chiaramente il costo di un noleggio di due o tre giorni, quindi "prezzo da verificare al momento della prenotazione". In fondo, due cose da controllare prima di prenotare: il peso massimo del modello rispetto a Olly (5 anni) e che si chiuda abbastanza per la metro.
- **"Anytime Baby Equipment Hire" non c'è**: cercato col nome esatto e con varianti, non risulta un servizio con quel nome a Londra, quindi non è in pagina.

## Londra · Shrek's Adventure come alternativa al London Eye, solo con "Piove"
- **A pulsante spento non cambia nulla**: domenica alle 15:30 c'è il London Eye, come sempre. **Con "🌧️ Piove" acceso** la card dell'Eye lascia il posto, nello stesso slot e alla stessa posizione, a **Shrek's Adventure! London**: stesso edificio di SEA LIFE, dentro County Hall, al coperto. Stesso meccanismo del pulsante (una classe su `<html>`), esteso da "aggiunge una nota" a "sostituisce una card intera".
- Nessuna pillola ⏱️ e nessun prezzo: durata e prezzo non sono verificati. Indirizzo e orario di domenica (10:00–16:00) come forniti; coordinate controllate su OpenStreetMap, 21 m dall'attrazione. I percorsi Maps restano quelli verso il London Eye, a 145 m.
- **Conflitto d'orario segnalato sulla card**: la domenica chiude alle 16:00, quindi alle 15:30 resterebbe mezz'ora scarsa. La card suggerisce, se piove davvero, di entrare subito dopo SEA LIFE.
- La nota "visibilità ridotta dall'alto" sulla card dell'Eye è passata dentro la card di Shrek: con la pioggia accesa la card dell'Eye non si vede più, e lì non l'avrebbe letta nessuno.
- Nessuna foto su Commons: **card stilizzata** `shrek.svg` (icona Lucide del castello, mosaico con un seme suo), generata da `scripts/londra-cards.mjs`, che non produce più la card dell'appartamento. Per restare sotto 1,5 MB le ultime tre foto a q80 (lhr, blq, ba) sono scese a q70: cartella a 1495,8 kB. **Ora sono tutte a q70**.
- Quarta voce in `DA_VERIFICARE_LONDRA.md` e nel badge: durata, prezzo e ultimo ingresso di domenica. Novità v12.

## Londra · foto per Shrek's Adventure e foto rigenerate dagli originali
- La card di Shrek's Adventure (visibile solo con "Piove" acceso) usa l'**immagine fornita da Alessandro** al posto della card stilizzata: ritaglio 16:9 con bias 0,15, che tiene intera l'insegna "Far Far Away" e Ciuchino. **È un'eccezione dichiarata alla regola delle licenze libere**: è materiale promozionale del gestore, non una foto Commons né di famiglia. È segnata così in `CREDITS.md` e sotto la card; `shrek.svg` rimossa, ma si rigenera con `npm run cards:londra`.
- Per farle posto senza sforare 1,5 MB, **tutte le foto della pipeline sono state rigenerate dagli originali Commons** a q70 con `effort: 6`, cioè alla massima compressione dell'encoder a parità di qualità. Molte erano q70 ottenute ricomprimendo un WebP q80, cioè di seconda generazione: ora sono tutte di prima generazione, quindi più pulite, e la cartella pesa **1410,5 kB** invece di 1495,8. Ritagli invariati, ricontrollati tutti in un provino. `scripts/londra-foto.mjs` ora codifica sempre con `effort: 6`.
- Novità v13.

## Londra · redesign R1: offline vero
- **Service worker `londra-sw.js`** con scope `./londra`: controlla solo `londra.html` e `londra-illustrata.html`. Verificato in Chromium sul percorso `/barcellona-40/`: home, rigori, viaggio, gym e soldi non sono controllati da lui (gym e soldi restano coi loro).
- **Precache all'installazione**: pagine, manifest, icone, tutte le foto delle tappe, le foto di Olly, Leaflet. **44 file, 2.550 KB.** La lista non è scritta a mano: la ricava la build (`scripts/londra-sw-build.mjs`, plugin `swLondra` in `vite.config.js`) leggendo le pagine pubblicate. La versione della cache è un hash del contenuto, quindi qualunque file cambi, la cache si rinnova.
- **Strategie**: pagine prima dalla rete, con 3 secondi di attesa e poi la copia salvata; foto, JS e CSS prima dalla cache; tile della mappa e meteo solo rete. Le cache vecchie di Londra si cancellano all'attivazione; quelle delle altre app del dominio non vengono toccate.
- **Niente CDN per le cose operative**: i **3 barcode NHM sono SVG statici** nella pagina, con la stessa geometria che produceva JsBarcode 3.12.3, ora tolto; **Leaflet 1.9.4 è nel repository** (`vendor/leaflet/`), identico a quello di unpkg (stesso hash SRI).
- **Mappa senza rete**: messaggio "Mappa non disponibile senza rete" al posto del rettangolo vuoto, e nessun errore se Leaflet mancasse.
- **"✓ Disponibile offline"** in testata quando tutti i file sono in cache; **"versione N · aggiornata il GG/MM"** in fondo, dalla voce più recente delle novità. Se una cache viene svuotata da fuori, alla prima visita con rete si ricostruisce.
- Verifiche in Chromium: ricarica offline con programma, 31/31 foto (compresa Shrek), QR, barcode, 11/11 foto di Olly e versione per immagini; QR e tre barcode decodificati con zxing dagli screenshot offline; pagina servita dalla copia in 3,2 s con un server lento 6 s; aggiornamento di versione che sostituisce la cache vecchia; build di Barcellona identica byte per byte fuori dai file di Londra.
- Novità v14.
- **Font locale** (scelta di Alessandro): Playfair Display servito dal sito, solo i due stili usati — tondo 700 (23 KB) e corsivo 400 (22 KB), caratteri latini, licenza OFL in `vendor/fonts/`. Google Fonts tolto da entrambe le pagine. Il precache sale a **46 file, 2.594 KB**. Due scritte che chiedevano peso 900 (rese a 800 da Google) ora sono a 700. Verificato offline: titoli col font giusto, e da online l'unico dominio esterno chiamato è quello delle tile della mappa.

## gym · il service worker non cancella più le cache delle altre app
- All'attivazione `public/gym/sw.js` cancellava **tutte** le cache del dominio diverse dalla sua. Lo stesso dominio però ospita altre app offline (Londra, soldi), e aprire la palestra dopo un rilascio svuotava le loro cache: verificato in Chromium, la cache di Londra e quella di soldi sparivano. Ora cancella solo quelle che iniziano con `gym-`, come già faceva soldi. Nessun'altra modifica alla palestra; dopo la correzione, aprire `gym/` lascia intatta la cache di Londra.

## Londra · redesign R2: la pagina sa che giorno e che ora è
- **Attributi sulle 31 card del programma**: `data-giorno`, `data-ora`, `data-tipo` (trasporto · tappa · casa · plus), `data-durata` dove c'era già, `data-fuso="Europe/Rome"` sulle tre card in ora italiana (Aeroporto di Bologna 05:15, Volo BA547 07:00, Atterraggio 21:25) e i vincoli `data-entro`, `data-non-prima`, `data-fine-entro`, `data-vincolo` (Lina Stores, museo, partenza per Heathrow, Shrek).
- **Orologio unico in ora di Londra** (`OROLOGIO`), qualunque sia il fuso del telefono; i conti si fanno sull'istante vero, quindi le card in ora italiana sono corrette. `?now=` accetta anche l'ora (`?now=2026-11-16T11:00`, ora di Londra) e un fuso esplicito (`?now=2026-11-15T04:30+01:00`). Il meteo ora usa lo stesso orologio.
- **`MARGINI` tolto**: i tratti del controllo "giornata stretta" si ricavano dalle card. Verificato che il risultato è identico a prima, numero per numero.
- **Fino al 14/11, "Prima di partire"** in cima: giorni alla partenza e le cose da verificare, più il rimando alla checklist (la lista unica arriva con lo step R4).
- **Dal 15 al 17, "Adesso"** in cima: ora di Londra, tappa in corso (se c'è e se la sua durata non è passata), la prossima con foto, orario e "tra N min", i vincoli in evidenza, **"Portami lì"** (il link Maps della card, o il percorso subito prima per le card di trasporto) e "Vedi la scheda". Si apre **solo il giorno corrente**; la pagina non scorre da sola. **Dopo il 17** nessun pannello e giorni chiusi.
- Verificato con `?now=` ai sette momenti richiesti; nessun errore JS; offline dello step R1 ancora completo. Novità v15.

## Londra · redesign R3: barra in basso e portafoglio
- **Barra fissa in basso**: Adesso · Programma · Biglietti · Info, quattro pulsanti da 98 × 60 px, con la safe area dell'iPhone. "Adesso" porta al pannello visibile ("Adesso" nei giorni del viaggio, "Prima di partire" prima); la voce della sezione in cui ci si trova è evidenziata. Verificato che ogni pulsante porta la sua sezione in cima allo schermo.
- **Sezione Biglietti = portafoglio**, subito dopo il programma: QR del parcheggio (spostato da domenica, dove resta una riga "QR del parcheggio P1, tocca per mostrarlo"), i 3 biglietti del museo in una card, i voli BA547/BA546 e l'appartamento con l'indirizzo in grande e **"🚕 Mostra l'indirizzo"** a schermo pieno per il tassista. La sezione "Voli & base" non c'è più: le note sull'alloggio (bagaglio, host, perché questa zona) sono in **Info**, che nasce qui e verrà completata nello step R4. Il numero di prenotazione dell'appartamento arriva con lo step R9.
- **Visore unico dei codici**: un tocco su QR o barcode li apre su fondo bianco, uno alla volta, con "‹ Prima / Dopo ›" alti 56 px (anche scorrendo di lato e con le frecce della tastiera), schermo sempre acceso, numero in grande e la frase sulla luminosità. Barcode a **367 × 203 px, circa 61 × 34 mm**; QR a 343 px, circa 57 mm. Tutti e quattro decodificati con zxing dagli screenshot, anche a metà risoluzione. Sostituisce la vecchia vista a schermo pieno del solo QR.
- **Scorciatoie nel pannello "Adesso"**: "Mostra il QR del parcheggio" attorno alle card dell'aeroporto di Bologna (domenica mattina, martedì dopo il decollo) e "Mostra i biglietti del museo" da 30 minuti prima dell'ingresso, cioè dalle 16:00 di lunedì. Le finestre si ricavano dalle card (`data-mostra`, `data-non-prima`), senza nuove copie degli orari. Nella card del museo, "Mostra i biglietti" apre direttamente i codici.
- **Testata compatta**: 274 px, meno di un terzo di schermo; il link alla versione per Olly è un link piccolo. "Piove" è nel pannello "Adesso" e in cima al programma (i due pulsanti restano allineati); il badge "da verificare" è in "Prima di partire" e in Info.
- Novità v16. Offline dello step R1 ancora completo (17/17).

## Londra · redesign R4: asciugare
- **Timeline tolta.** In cima a ogni giorno una **scaletta** (ora · nome, una riga per card, righe alte 44 px): un tocco porta alla card. Le card in ora italiana hanno la nota "ora ita"; con "Piove" acceso la riga del London Eye diventa Shrek's Adventure, come la card.
- **Una sola lista "Prima di partire"** al posto di Checklist + Da verificare, **senza caselle**: lo stato di ogni voce (fatto · da fare · da verificare) è scritto in `PRIMA_DI_PARTIRE` nella pagina e si aggiorna con un commit. Le voci "da verificare" vengono da `DA_VERIFICARE` (allineato a `DA_VERIFICARE_LONDRA.md`) con "Chi e come" a scomparsa. In cima alla pagina, fino al 14/11, solo le voci aperte; in Info la lista completa con i conti. Tolte le voci superate o doppie: "cambio della guardia ~3 mesi prima" e "mercatino Southbank" (sono già tra le cose da verificare), "piano B passeggino" (è in Note pratiche). Tolti il badge e il pannello "da verificare".
- **Info** raccoglie in fondo: Prima di partire, note sull'alloggio, Sicurezza, Budget, Note pratiche (con il passeggino), Crediti foto.
- **Card più corte**: al massimo ~35 parole visibili (la più lunga, Shrek's Adventure, ne ha 35); il resto in "Dettagli", chiuso. Il piano B di Lina Stores (Whole Foods) è dentro la card.
- **M&M'S e Pollock's**: una riga "✨ Se avanza tempo" (M&M'S in tutti e tre i giorni, Pollock's martedì) che apre l'unica scheda completa in un foglio dal basso.
- **Novità**: il pannello non si apre più da solo. In cima c'è un banner sottile "N novità dall'ultima visita" (o "Le novità del sito" alla prima visita) che lo apre solo se toccato; chiudendo, il banner sparisce. Con lo storage bloccato il banner non compare.
- Correzione di stile: la regola dei titoli dei giorni (`details.acc summary`) si applicava anche ai "Dettagli" annidati; ora vale solo per il titolo del giorno.
- Novità v17.

## Londra · Prima di partire: documenti fatti
- Passaporti (Olly compreso, e validità di Alessandro e Vale), UK ETA di tutti e tre e assicurazione viaggio segnati come **fatti**, su conferma di Alessandro. Le due righe ETA sono diventate una. Restano da fare: check-in online, prenotazione London Eye e SEA LIFE. Novità v18.
- Il budget dice ancora "UK ETA ×3 · stima ~€57": i costi veri arrivano con lo step R9.

## Londra · redesign R5: mappe e link
- **"🧭 Portami qui" su ogni card**: un solo pulsante Maps alto 44 px, `maps/dir` con **solo la destinazione in coordinate** (parte dalla posizione attuale). Basta ricerche per nome. Coordinate prese dagli 11 percorsi, così card, percorsi e mappa puntano allo stesso posto.
- **Coi mezzi** le tappe lontane da dove si arriva: Southbank Centre (da Heathrow), Harrods (da Green Park), Luci di Regent Street (dal museo), Heathrow Terminal 5. **A piedi** tutte le altre. **In auto** l'aeroporto di Bologna (terminal, Via del Triumvirato 84, coordinate OpenStreetMap).
- **Card dei trasporti**: "Portami qui" anche su Aeroporto di Bologna, In metro verso il centro (→ Southbank), Partenza per Heathrow e Heathrow T5. Senza pulsante i due voli, l'arrivo a Heathrow (ci si è già) e l'atterraggio a Bologna. Anche l'appartamento nel portafoglio ha "Portami qui". Il "Portami lì" del pannello "Adesso" usa questi link.
- **Crediti delle foto**: sotto la card resta "foto: Autore / licenza" come testo, non cliccabile. I link stanno in Info → Crediti foto, nella nuova lista "Foto delle tappe" (24 foto Commons, più Shrek e M&M'S), sopra quella del viaggio di Olly.
- **Mappa**: alta 300 px; sul telefono con un dito si scorre la pagina, con due dita si sposta e si zooma la mappa (con un dito compare "Usa due dita per spostare la mappa"); col mouse si trascina come prima. Ogni marker ha "Portami qui" nel popup; con "Piove" il London Eye diventa Shrek's Adventure. Link di attribuzione in nuova scheda. Coordinate di Southbank, Horse Guards, Big Ben e museo allineate a quelle dei percorsi.
- **Sfondo della mappa**: le tile CARTO ora rispondono con l'immagine "API KEY REQUIRED" al posto delle strade. Su scelta di Alessandro si passa a **Esri World Dark Gray** (sfondo e nomi delle strade), senza chiave, con l'attribuzione richiesta. La mappa di Barcellona usa ancora CARTO ed è rotta allo stesso modo: segnalato, non toccato.
- Gli 11 URL dei percorsi sono invariati carattere per carattere. Novità v19.
