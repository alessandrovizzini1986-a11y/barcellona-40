# Crediti · Barcelona 40

Tutti gli asset di terze parti: il gioco dei rigori (`src/rigori/`, `public/assets/rigori/`) e le foto delle
tappe del sito (`public/assets/tappe/`). Regola del progetto: solo licenze libere, e l'attribuzione richiesta
dalla licenza deve essere visibile dove l'asset si vede. Nessuno stemma, sponsor o nome di club.

## Audio · effetti (Kenney, CC0)
Fonte: Kenney, https://kenney.nl · Licenza: Creative Commons Zero (CC0) 1.0, http://creativecommons.org/publicdomain/zero/1.0/ · "This content is free to use in personal, educational and commercial projects" (dal file License.txt di ogni pacchetto). Credito non obbligatorio, dato volentieri.

| File nel gioco | File originale | Pacchetto Kenney |
|---|---|---|
| `audio/sfx/kick.ogg`, `kick2.ogg` | `impactSoft_heavy_000.ogg`, `impactSoft_heavy_002.ogg` | Impact Sounds 1.0 (https://kenney.nl/assets/impact-sounds) |
| `audio/sfx/post.ogg` | `impactMetal_heavy_000.ogg` | Impact Sounds 1.0 |
| `audio/sfx/crossbar.ogg` | `impactBell_heavy_001.ogg` | Impact Sounds 1.0 |
| `audio/sfx/net.ogg` | `impactGeneric_light_001.ogg` | Impact Sounds 1.0 |
| `audio/sfx/glove.ogg` | `impactSoft_medium_001.ogg` | Impact Sounds 1.0 |
| `audio/sfx/dive.ogg`, `step.ogg` | `footstep_grass_002.ogg`, `footstep_grass_000.ogg` | Impact Sounds 1.0 |
| `audio/sfx/ui_click.ogg`, `ui_confirm.ogg`, `ui_back.ogg`, `ui_error.ogg` | `click_001.ogg`, `confirmation_001.ogg`, `back_001.ogg`, `error_001.ogg` | Interface Sounds 1.0 (https://kenney.nl/assets/interface-sounds) |
| `audio/sfx/unlock.ogg`, `levelup.ogg` | `jingles_SAX00.ogg`, `jingles_SAX07.ogg` | Music Jingles (https://kenney.nl/assets/music-jingles) |

## Audio · generati nel gioco (nessun file, nessuna licenza esterna)
Fischio dell'arbitro, boato del gol, "oooh" della parata e applausi sono sintetizzati a runtime con la Web Audio API (`src/rigori/core/audio.js`, funzioni `whistle` e `crowd`): nei pacchetti CC0 scaricabili senza chiave API non c'erano suoni di folla, e Freesound richiede un account. Vedi `DA_VERIFICARE.md` per sostituirli con registrazioni CC0.

## Audio · musica
Tutte le tracce sono **CC0** (pubblico dominio), rielaborate con `scripts/audio/musica.mjs` (taglio, anello,
normalizzazione a -14 LUFS, MP3). L'attribuzione non è dovuta per CC0 ma è doverosa.

| File del gioco | Opera originale | Autore | Licenza | Origine |
|---|---|---|---|---|
| `audio/music/inno.mp3` | *Cynic Battle Loop* | Ferk | CC0 | https://opengameart.org/content/cynic-battle-loop |
| `audio/music/tensione.mp3` | *Ancient caverns (horror ambient loop)* | congusbongus | CC0 | https://opengameart.org/content/ancient-caverns-horror-ambient-loop |
| `audio/music/gol.mp3` | *Music Jingles* → `jingles_STEEL07.ogg` | Kenney Vleugels | CC0 | https://kenney.nl/assets/music-jingles |
| `audio/music/parata.mp3` | *Music Jingles* → `jingles_STEEL03.ogg` | Kenney Vleugels | CC0 | https://kenney.nl/assets/music-jingles |
| `audio/music/vittoria.mp3` | *Music Jingles* → `jingles_PIZZI07.ogg` | Kenney Vleugels | CC0 | https://kenney.nl/assets/music-jingles |

Interventi: `inno` è il loop originale normalizzato; `tensione` è un anello di 28 s ricavato dal tratto
10–38 s con dissolvenza incrociata di 1,5 s sulla propria testa, così il giro si richiude senza scalino;
gli stinger hanno il silenzio di coda tagliato. Tutto a -14 LUFS, MP3 96 kbps (loop) e 128 kbps (stinger).

## Modelli 3D
- `models/character.glb` (manichino riggato, **invisibile**: serve solo da scheletro per le animazioni; il personaggio visibile è costruito a runtime con primitive Three.js attaccate alle ossa, stile "big head", vedi `src/rigori/scene/bighead.js`), `models/kicker_kick_full.glb` e tutte le clip `keeper_*.glb`, `kicker_*.glb`: provengono dal gioco precedente di questo stesso progetto (`_legacy/assets/keeper.glb`, `kicker.glb`, `gk_*.glb`, `keeper_*.glb`, `kicker_*.glb`), ricompressi con Draco (`@gltf-transform/cli`). Le clip di animazione portano il nome `mixamo.com`: sono animazioni Mixamo (Adobe). Le condizioni d'uso correnti di Mixamo vanno verificate e annotate qui: vedi `DA_VERIFICARE.md`.
- Stadio, gradinate, torri faro, porta, pallone, campo, pubblico, cielo: geometria e texture generate proceduralmente nel codice (`src/rigori/scene/`). Nessun asset esterno.

## Texture
- `textures/ball.png`: pallone del gioco precedente di questo progetto (`_legacy/assets/rig-ball.png`), pentagoni senza marchi.
- Erba (colore e normal map), cielo notturno, maglie (strisce e numero), teste (pelle + foto sull'emisfero frontale), ombre di contatto, aloni dei fari: procedurali (canvas), nessun file esterno.

## Volti
- `faces/face-monne-head.webp`, `faces/face-monne.webp`: forniti dall'autore del progetto nel prompt di lavoro.
- `faces/face-mario.png`, `face-giulio.png`, `face-ale.png`: dal gioco precedente di questo progetto (`_legacy/assets/`).

## Foto delle tappe (Wikimedia Commons)

Le foto di Google Places **non** sono utilizzabili: l'attribuzione è per singolo autore e non sono
ripubblicabili su un sito. Queste vengono tutte da Wikimedia Commons, con licenza libera verificata nel campo
`extmetadata` prima dello scaricamento (`scripts/foto-tappe.mjs`, `npm run foto`). Ridimensionate a 800 px di
larghezza e convertite in WebP q80 con ffmpeg. L'attribuzione è **visibile sulla card**, sotto il contenuto,
con link alla pagina Commons del file.

| Tappa | File nel sito | Autore | Licenza | Originale su Commons |
|---|---|---|---|---|
| f2 · Parc de la Ciutadella | `public/assets/tappe/ciutadella.webp` | Isiwal | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Barcelona Parc Ciutadella cascada.jpg](https://commons.wikimedia.org/wiki/File:Barcelona_Parc_Ciutadella_cascada.jpg) |
| f3 · Basílica de Santa Maria del Mar | `public/assets/tappe/santamaria.webp` | Richard Mortel from Riyadh, Saudi Arabia | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Basilica de Santa Maria del Mar, 14th century (1) (30393970184).jpg](https://commons.wikimedia.org/wiki/File:Basilica_de_Santa_Maria_del_Mar,_14th_century_(1)_(30393970184).jpg) |
| f4 · Carrer de Montcada | `public/assets/tappe/montcada.webp` | Kippelboy | [CC BY-SA 3.0 es](https://creativecommons.org/licenses/by-sa/3.0/es/deed.en) | [Carrer Montcada- Museu Picasso.jpg](https://commons.wikimedia.org/wiki/File:Carrer_Montcada-_Museu_Picasso.jpg) |
| f5 · Pont del Bisbe | `public/assets/tappe/pontbisbe.webp` | Felvalen | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Barrio gótico 13.jpg](https://commons.wikimedia.org/wiki/File:Barrio_g%C3%B3tico_13.jpg) |
| f6 · Plaça de Sant Felip Neri | `public/assets/tappe/santfelip.webp` | Justraveling.com | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [San Felip Neri Square in Barcelona.jpg](https://commons.wikimedia.org/wiki/File:San_Felip_Neri_Square_in_Barcelona.jpg) |
| f8 · Mercat de Santa Caterina | `public/assets/tappe/santacaterina.webp` | Tony Hisgett from Birmingham, UK | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Market Roof (5832285437) (2).jpg](https://commons.wikimedia.org/wiki/File:Market_Roof_(5832285437)_(2).jpg) |

Due tappe restano senza foto, di proposito:
- **f7 · Barcelona Duck Store**: negozio privato, su Commons non c'è niente di libero. Al posto della foto c'è una paperella disegnata in SVG dentro `src/ui/card.js` (originale del progetto).
- **f9 · Bar Joan**: stessa ragione, e nessuna paperella: la card resta senza immagine.

Le licenze CC BY e CC BY-SA obbligano a citare autore e licenza e a linkare l'originale: è quello che fa la
riga "foto: autore / licenza" sotto ogni card. Le foto non sono state ritagliate né modificate, solo
ridimensionate e ricompresse.

## Font
- Clash Display (Fontshare, licenza Fontshare Free Font) e Inter (SIL OFL): già usati dal sito, self-hosted in `public/fonts/`.

## Librerie
- Three.js 0.186.0 (MIT), Draco decoder incluso in Three.js (Apache 2.0).
