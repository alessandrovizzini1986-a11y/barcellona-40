# QA Report · Barcelona 40

Data: 8 settembre 2026 · build `npm run build` (Vite 8) · test su Chromium headless 380×800 (`scripts/qa/e2e.mjs`, `scripts/qa/shot.mjs`).

## 1. Pipeline
| Check | Esito |
|---|---|
| `npm run data` | ✓ geocode 6 ok / 2 mancanti (Taps, Rooftop → `DA_VERIFICARE.md`), distanze OSRM, `✓ validate: 20 tappe, 20 venue, 12 missioni, 10 check` |
| `npm run build` | ✓ senza warning (chunk `leaflet` separato, 148 kB, caricato solo dalla Mappa) |
| JS iniziale | `index-*.js` 37 kB → **14,0 kB gz** (< 150 kB) |

## 2. Viewport 380×800
Tutte le viste (onboarding, oggi, programma ven/sab/dom, mappa, missioni, info, speedrun): nessun overflow orizzontale (`scrollWidth ≤ clientWidth`, verificato dal test e2e su 9 URL). Screenshot in `docs/screenshots/`.

## 3. Test date (`?now=`)
| URL | Atteso | Esito |
|---|---|---|
| `?now=2026-10-15T20:00#/oggi` | countdown giorni/ore/min + checklist | ✓ (0 giorni, 04 ore, 00 min) |
| `?now=2026-10-16T09:00#/oggi` (ale) | Adesso = f1 Atterraggio | ✓ |
| `?now=2026-10-17T07:50#/oggi` (monne) | s2 come "Adesso" (tappa imminente, tra 25 min), banner speedrun | ✓ |
| `?now=2026-10-17T07:50#/missioni` (monne) | timer live 00:25:00 | ✓ giallo (sotto 30 min); rosso sotto i 15 min: verificato a `08:05` → 00:10:00 rosso |
| `?now=2026-10-17T10:00#/oggi` (ale) | Prossima = s4 10:30 | ✓ |
| `?now=2026-10-18T21:00#/oggi` | "Missione compiuta" + XP + Esporta | ✓ (fine weekend = 30 min dopo d3, 20:30 del 18/10) |

## 4. Profili
| Profilo | Regola | Esito |
|---|---|---|
| Monne | sabato solo s2, domenica empty state "Tu a quest'ora sei già a Bologna. Missione compiuta." | ✓ |
| Manuel | non vede s4 (Sagrada), vede s3 | ✓ |
| Giulio | venerdì vuoto con empty state, `#/speedrun` reindirizza a Oggi | ✓ |

## 5. Mappa
3 chip giorno (Ven/Sab/Dom, toggle multiplo), 6 marker numerati sabato, polilinea per giorno, popup con orario/chip/Maps, "Dove sono" con permesso negato → toast "Posizione non disponibile, apri Google Maps". Lista "Senza coordinate" con 2 tappe (Taps, Rooftop). ✓
Nota: nel sandbox di test i tile CARTO non vengono scaricati (proxy); marker e linee sono renderizzati correttamente.

## 6. Missioni
Completare m6 → 60 XP, toast "+60 XP · Zero fatica, tutto gusto", confetti; m6+m8+m9+m10 → badge Trencadís (tutte le missioni di sabato) con reveal; badge Il Festeggiato attivo dopo le 00:00 del 17/10; livello "Local" a 220 XP. Export → stringa `b40:` negli appunti (o sheet se gli appunti non sono disponibili). Import di `b40:…` per Giulio (130 XP) → riga aggiornata in classifica. "Fatto" sulla card s4 → missione m6 spuntata. ✓

## 7. localStorage disabilitato
`window.localStorage` sostituito con un getter che lancia `DOMException`: onboarding renderizzato, scelta persona e navigazione senza errori in console (fallback in memoria). ✓

## 8. Grep divieti
```
grep -riE "lorem|TODO|placeholder|serviceWorker|manifest|standalone|apple-mobile-web-app" src index.html public
```
Unico risultato: il commento in `index.html` che spiega il divieto. Nessun `100vh` (`grep -rn 100vh src index.html` vuoto). ✓

## 9. Screenshot
`docs/screenshots/`: onboarding, oggi, programma-ven, programma-sab, programma-dom, mappa, missioni, info, speedrun (380×800, DPR 2).

## 10. Lighthouse (mobile, `vite preview`, pagina iniziale)
| Categoria | Punteggio |
|---|---|
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

FCP 1,1 s · LCP 1,7 s · CLS 0,001 · TBT 0 ms (throttling mobile simulato). Report completo in `docs/lighthouse.json`. Correzioni fatte durante la QA: testi piccoli passati da `--ink-3` a `--ink-2` (contrasto AA), `public/robots.txt`.

## Riepilogo test e2e
45/45 verdi (`node scripts/qa/e2e.mjs http://localhost:4173`).

---

## 11. Tappa Barcelona Duck Store (venerdì)
Venerdì passa da 8 a 9 tappe: `f3b` alle 12:15 tra il Mercat de Santa Caterina e il pranzo. Verificato nel browser a 380 px: ordine `f1 → f2 → f3 → f3b → f4 → f5 → f6 → f7 → f8`, chip "677 m · 9 min a piedi", missione "Duck Hunter +30 XP" sulla card e in lista Missioni, marker numero 4 sul layer di venerdì. Nessun errore in console, nessun overflow. Soglie dei livelli invariate.

## 12. Motore di routing sostituito
Il server demo `router.project-osrm.org` ignora il profilo `/foot/`. Verificato interrogando lo stesso tratto con cinque profili diversi:

| profilo | distanza |
|---|---|
| foot | 2891 m |
| walking | 2891 m |
| driving | 2891 m |
| car | 2891 m |
| bike | 2891 m |

Valore identico ovunque, contro 866 m in linea d'aria: quel server ospita solo la rete per auto. Sostituito con Valhalla di OpenStreetMap (`costing: pedestrian`, `auto` per le tratte in auto o taxi), con i minuti presi dal tempo restituito. Controprova: `appartamento → Sagrada` calcolato da Valhalla dà 1309 m · 16 min, identico al valore verificato fornito a mano. `npm run data` finisce con `✓ validate: 21 tappe, 21 venue, 13 missioni, 10 check`.

## 13. Cache del browser
**Cosa è stato fatto.** `public/_headers` con le regole di cache; dati importati come moduli e quindi inclusi nel bundle con hash nel nome (già così, nessun `fetch` a runtime nel sorgente); `__BUILD_ID__` mostrato in fondo alla vista Info con il pulsante "Ricarica l'ultima versione", verificato nel browser (la riga mostra la data della build, il pulsante porta a `?r=<timestamp>` e la pagina si ricarica senza errori).

**Header realmente serviti da GitHub Pages** (misurati con `curl -I`):

| risorsa | Cache-Control |
|---|---|
| `/` e `/index.html` | `max-age=600` |
| `/assets/index-*.js` | `max-age=600` |
| `/_headers` | `max-age=600`, servito come file di testo |

**Esito: gli header di `public/_headers` non vengono applicati.** GitHub Pages non li legge, li pubblica come un file qualsiasi, e impone `max-age=600` a tutto. La causa è la piattaforma di hosting, non il deploy. Conseguenza pratica: una ricarica normale può servire l'`index.html` in cache **fino a 10 minuti** dopo la pubblicazione. Passati i 10 minuti il browser rivalida (verificato: una richiesta con `If-None-Match` risponde `304`), ottiene l'`index.html` nuovo e con esso il bundle nuovo.

**Quello che il punto 2 garantisce comunque.** I dati stanno dentro il bundle con hash, quindi non può mai capitare di vedere codice nuovo con dati vecchi: o è vecchio tutto, o è nuovo tutto. Prova raccolta sui deploy di oggi: cambiando i dati dell'itinerario il file passa da `index-B473M3UX.js` a `index-C_Uo6irR.js` e il contenuto servito contiene i testi nuovi.

**Quello che non è stato testato qui.** La ricarica normale da smartphone sul sito pubblico: in questo ambiente il proxy di rete blocca `github.io` per il browser automatizzato (curl passa, Chromium no), quindi il test con cache reale del browser non è eseguibile. Va fatto a mano. Attesa: la modifica compare subito se sono passati più di 10 minuti dal deploy, oppure immediatamente premendo "Ricarica l'ultima versione" in Info.

**Per azzerare i 10 minuti** serve un hosting che applichi `_headers`: su Cloudflare Pages il file già pronto imporrebbe `no-cache, must-revalidate` su `index.html` e un anno immutabile sugli asset.

## 14. Album foto condiviso
Suite dedicata: `node scripts/qa/album.mjs` → **66/66 verdi**. Suite principale: **45/45**.

| Verifica | Esito |
|---|---|
| Banner album in Oggi e Info, tutti e quattro i profili | ✓ |
| Icona macchina fotografica nell'header in tutte e cinque le viste | ✓ |
| `share-album` assente dal DOM per giulio, manuel, monne (non nascosto: proprio non creato) | ✓ |
| `share-album` presente per ale | ✓ |
| A capo preservati dopo `encodeURIComponent` | ✓ 19 righe nel testo decodificato |
| "Copia il messaggio" e "Copia link" senza WhatsApp installato | ✓ scrivono negli appunti e mostrano il toast |
| Missione m14 presente per tutti e vale 40 XP | ✓ su tutti e quattro i profili |
| Tab bar ancora a 5 voci | ✓ su quattro combinazioni di profilo e vista |
| Banner primo blocco durante il weekend, sotto il countdown prima | ✓ |
| "Guarda com'è andata" dopo il 18/10 | ✓ |
| "Foto" primo accordion di Info e aperto di default | ✓ |
| Nessun overflow orizzontale dove compare l'album | ✓ |

**Link WhatsApp.** Gli href sono `https://wa.me/?text=<testo>`, il formato universale di WhatsApp: su Android apre l'app con il testo già compilato, su desktop apre WhatsApp Web. Qui è stato verificato il formato del link e il contenuto del testo dopo la decodifica; il comportamento sul dispositivo non è verificabile in questo ambiente e va provato a mano.

**Album.** Il link risponde `302` e reindirizza a un album Google Foto condiviso. Resta da controllare che i permessi consentano anche il caricamento, non solo la visualizzazione: è in `DA_VERIFICARE.md`.

**Due difetti trovati e corretti durante questa QA.**
1. `mosaicDataUri()` restituiva `url("data:…")` con virgolette doppie. Inserito in `style="--album-mosaic:…"` chiudeva l'attributo in anticipo e il resto dell'SVG finiva nel markup come attributi spuri. Ora usa apici singoli; il payload è percent-encoded e non contiene apici.
2. I test usavano `click({ force: true })` sulle checkbox: il clic forzato ignora l'occlusione e, quando l'elemento finiva sotto la tab bar fissa, colpiva la voce "Oggi" navigando via. Ora i test portano l'elemento al centro dello schermo e usano `check()` senza `force`, così un elemento davvero coperto farebbe fallire il test. Le due suite sono state rieseguite più volte con esito stabile.
