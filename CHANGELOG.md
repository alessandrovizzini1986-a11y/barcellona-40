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
