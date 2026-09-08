# Brief Canva — Grafica di "RIGORI AL CAMP NOU"

Obiettivo: migliorare la grafica del gioco `rigori.html` generando asset con **Canva**
(Magic Media / text-to-image + export), in **due varianti**: **PES (realistica)** e
**Anime (Holly & Benji / cel-shading)**.

## Regola d'oro — NON toccare le facce
Le facce dei giocatori restano quelle esistenti e NON vanno rigenerate:
- `assets/face-mario.png`  (Mario, #104)
- `assets/face-giulio.png` (Giulio, #7)
- `assets/keeper-face.png` (Ale, portiere 🧤👑)
Canva produce SOLO ambiente/texture (stadio, campo, rete, card), mai i volti.
I due stili (PES / Anime) devono restare selezionabili: quindi servono 2 versioni di ogni asset.

---

## Asset 1 — Sfondo stadio (il più impattante)
- File finale: `assets/canva-stadium.png`  → serve anche variante anime `assets/canva-stadium-anime.png`
- Dimensioni: **2048 × 1024 px** (panoramica), PNG, orizzonte a ~40% dall'alto.
- Uso: sfondo curvo dietro la porta (tribune Camp Nou di notte, riflettori).

Prompt Canva (PES / realistico):
> "Camp Nou stadium interior at night, packed crowd blaugrana (deep blue and garnet
> mosaic tifo), bright stadium floodlights, photorealistic wide panorama, slight bokeh
> on the stands, cinematic, no players on pitch, empty foreground, 16:8 aspect,
> desaturated cool tones, depth haze"

Prompt Canva (Anime / Holly & Benji):
> "Anime soccer stadium at night, Captain Tsubasa style, cel-shaded crowd, bold ink
> outlines, vivid saturated blue and red tifo, dramatic light rays from floodlights,
> comic halftone sky, wide panorama, no players, empty foreground, high energy"

## Asset 2 — Texture del campo (erba), TILEABLE
- File: `assets/pitch-pes.png` e `assets/pitch-anime.png`
- Dimensioni: **1024 × 1024 px**, **seamless/tileable**, PNG, vista dall'alto.

Prompt (PES):
> "Top-down football pitch grass texture, mowing stripes with roller sheen, subtle
> cross-cut checkerboard pattern, natural deep green with slight wear patches,
> seamless tileable, photorealistic, high detail"

Prompt (Anime):
> "Top-down cel-shaded football grass, bright green mowing stripes, bold flat colors,
> subtle ink texture, seamless tileable, anime style"

(Nota: se Canva non garantisce il seamless perfetto, uso io la texture come base e la
rendo tileable lato codice — la versione procedurale attuale resta come fallback.)

## Asset 3 — Card / OG image (condivisione WhatsApp)
- File: `assets/og-rigori.jpg` (aggiornata)
- Dimensioni: **1200 × 630 px**, JPG.
- Contenuto: titolo "RIGORI AL CAMP NOU", pallone, luci stadio, spazio per il claim
  "segna di fila ⚽ / 🧤 pari tu". Due varianti stile PES vs Anime opzionali.

## Asset 4 (opzionale) — Texture rete porta
- File: `assets/net.png`, 512 × 512, seamless, maglie a rombo bianche su trasparente.

---

## Come eseguirlo in Canva (passi)
1. Canva → **Magic Media / Text to Image** → incolla il prompt dell'asset.
2. Formato/canvas alle dimensioni indicate; genera 3-4 varianti, scegli la migliore.
3. **Download PNG/JPG** con il nome file indicato sopra.
4. Mandami i file (o mettili in Drive) e io li integro in `rigori.html`
   (sostituisco `CONFIG.ASSETS.stadium`, aggiungo le texture per stile, aggiorno la card),
   verifico con screenshot prima/dopo e faccio il deploy su GitHub Pages.

## Integrazione lato codice (la faccio io)
- `CONFIG.ASSETS`: aggiungo `stadiumAnime`, `pitch`, `pitchAnime`, con fallback procedurale.
- In `applyGFX()` scelgo la texture campo/stadio giusta secondo `GFX` ('pes' | 'manga').
- Le facce restano caricate come ora (invariate).
