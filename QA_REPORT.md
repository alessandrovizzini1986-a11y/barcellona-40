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
