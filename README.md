# Barcelona 40

Sito del weekend per i 40 anni di Alessandro · Barcellona, 16–18 ottobre 2026. Zero fatica, tutto gusto.

Pagina web classica (Vite vanilla): **nessun manifest, nessun service worker, nessun meta standalone**. La barra degli indirizzi resta sempre visibile. Nessun backend: lo stato (persona, tappe fatte, missioni, verifiche) vive in `localStorage` con fallback in memoria.

## Comandi

```bash
npm install
npm run dev        # sviluppo su http://localhost:5173
npm run data       # geocode (Nominatim) → distanze (OSRM) → validate
npm run build      # produzione in dist/
npm run preview    # anteprima della build su http://localhost:4173
```

Test delle date: aggiungi `?now=2026-10-17T07:50` all'URL (prima dell'hash), es. `http://localhost:4173/?now=2026-10-17T07:50#/oggi`.

## Come aggiornare il piano

1. Modifica `data/itinerary.json` (tappe), `data/venues.json` (luoghi), `data/people.json`, `data/missions.json`, `data/checks.json`.
   - Per una tappa nuova lascia `distFromPrevM: null` e `minFromPrev: null`: li calcola lo script.
   - Per un luogo nuovo lascia `lat`/`lng` a `null` e `verified:false`: lo geocodifica lo script. Se conosci le coordinate, mettile e segna `verified:true`.
   - I prezzi ammessi da `validate.mjs` sono in `scripts/validate.mjs` (`ALLOWED_PRICES`): aggiungi lì un prezzo nuovo prima di usarlo.
2. `npm run data` (deve finire con `✓ validate`). Le voci non risolte finiscono in `DA_VERIFICARE.md`.
3. `git add -A && git commit -m "..." && git push`

## Struttura

- `src/main.js` bootstrap, `src/router.js` router hash (`#/oggi #/programma #/mappa #/missioni #/info #/speedrun`), `src/store.js` stato, `src/time.js` tempo e tappa corrente, `src/data.js` accesso ai JSON, `src/game.js` XP/livelli/badge.
- `src/ui/` componenti puri, `src/views/` viste, `src/map/leaflet.js` mappa caricata lazy.
- `scripts/` script dati e QA (`scripts/qa/shot.mjs` screenshot 380×800, `scripts/qa/og.mjs` immagine Open Graph).
- `_legacy/` il sito precedente, conservato e non più pubblicato dalla build.

## Deploy

GitHub Pages tramite `.github/workflows/pages.yml`: a ogni push su `main` fa `npm ci`, build con `BASE_PATH=/<nome-repo>/` e pubblica `dist/`. URL: `https://alessandrovizzini1986-a11y.github.io/barcellona-40/`.

In alternativa Cloudflare Pages: `npm run build && npx wrangler pages deploy dist --project-name barcelona40` (servono `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`).
