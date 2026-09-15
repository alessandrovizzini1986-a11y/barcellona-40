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
