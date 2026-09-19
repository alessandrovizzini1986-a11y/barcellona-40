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
`extmetadata` prima di salvare il file (`scripts/fetch-photos.mjs`, `npm run foto`). Ritagliate a 16:9,
ridimensionate a 800×450 e convertite in WebP q80 con sharp. L'attribuzione è **visibile sulla card**, sotto
il contenuto, con link alla pagina Commons del file.

<!-- foto:start -->

| Tappa | File nel sito | Autore | Licenza | Originale su Commons |
|---|---|---|---|---|
| Aeroporto di Bologna | `public/assets/tappe/blq.webp` | Threecharlie | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Bologna Guglielmo Marconi Airport Terminal.jpg](https://commons.wikimedia.org/wiki/File:Bologna_Guglielmo_Marconi_Airport_Terminal.jpg) |
| Barcellona T2 | `public/assets/tappe/bcn_t2.webp` | Azulino | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Terminal 2A Aeropuerto Barcelona-El Prat.jpg](https://commons.wikimedia.org/wiki/File:Terminal_2A_Aeropuerto_Barcelona-El_Prat.jpg) |
| Parc de la Ciutadella | `public/assets/tappe/ciutadella.webp` | azxzcukl55 | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | [Fountains at Cascada Monumental (32730873275).jpg](https://commons.wikimedia.org/wiki/File:Fountains_at_Cascada_Monumental_(32730873275).jpg) |
| Basílica de Santa Maria del Mar | `public/assets/tappe/santamaria.webp` | Enric | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [01 Santa Maria del Mar (Barcelona).jpg](https://commons.wikimedia.org/wiki/File:01_Santa_Maria_del_Mar_(Barcelona).jpg) |
| Carrer de Montcada | `public/assets/tappe/montcada.webp` | Andrei Dan Suciu | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [Placeta de Montcada, Barcelona - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Placeta_de_Montcada,_Barcelona_-_panoramio.jpg) |
| Pont del Bisbe | `public/assets/tappe/pontbisbe.webp` | trolvag | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [PONT del CARRER del BISBE - panoramio.jpg](https://commons.wikimedia.org/wiki/File:PONT_del_CARRER_del_BISBE_-_panoramio.jpg) |
| Plaça de Sant Felip Neri | `public/assets/tappe/santfelip.webp` | Justraveling.com | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [San Felip Neri Square in Barcelona.jpg](https://commons.wikimedia.org/wiki/File:San_Felip_Neri_Square_in_Barcelona.jpg) |
| Mercat de Santa Caterina | `public/assets/tappe/santacaterina.webp` | Fred Romero | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Barcelona - Mercat de Santa Caterina.jpg](https://commons.wikimedia.org/wiki/File:Barcelona_-_Mercat_de_Santa_Caterina.jpg) |
| Rooftop Garden · El Palace | `public/assets/tappe/elpalace.webp` | Almusaiti from Barcelona, España | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [El Palace Hotel in Barcelona.jpg](https://commons.wikimedia.org/wiki/File:El_Palace_Hotel_in_Barcelona.jpg) |
| Sagrada Família | `public/assets/tappe/sagrada.webp` | Jopparn | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Sagrada Família 2010.JPG](https://commons.wikimedia.org/wiki/File:Sagrada_Fam%C3%ADlia_2010.JPG) |
| Plaza Monumental | `public/assets/tappe/monumental.webp` | Yair Haklai | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [La Monumental-Barcelona.jpg](https://commons.wikimedia.org/wiki/File:La_Monumental-Barcelona.jpg) |
| Sala Apolo | `public/assets/tappe/apolo.webp` | Aniol | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | [Gatibu a la Sala Apolo de Barcelona 20251101 02.jpg](https://commons.wikimedia.org/wiki/File:Gatibu_a_la_Sala_Apolo_de_Barcelona_20251101_02.jpg) |
| Bunkers del Carmel | `public/assets/tappe/bunkers.webp` | Alexey Komarov | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Barcelona, View from Bunkers del Carmel.jpg](https://commons.wikimedia.org/wiki/File:Barcelona,_View_from_Bunkers_del_Carmel.jpg) |
| El Born Centre de Cultura i Memòria | `public/assets/tappe/elborn.webp` | Olga Gairin | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Mercat del Born ruïnes - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Mercat_del_Born_ru%C3%AFnes_-_panoramio.jpg) |

Ultimo aggiornamento: `npm run foto` · 16 foto, 1045 kB in tutto.

<!-- foto:end -->

Le licenze CC BY e CC BY-SA obbligano a citare autore e licenza e a linkare l'originale: è quello che fa la
riga "foto: autore / licenza" sotto ogni card. Le foto sono state ritagliate a 16:9 e ridimensionate a
800×450, niente altro.

## Foto private (non Commons)

| Tappa | File nel sito | Origine |
|---|---|---|
| El Mirador | `public/assets/tappe/elmirador.webp` | Foto di un amico di Alessandro, uso autorizzato — per gentile concessione |

Non ha licenza libera e non sta nella tabella qui sopra: sotto la card non compare nessuna riga di
attribuzione, perché non è dovuta a nessuno per contratto. È tracciata qui e in `data/foto-tappe.json`
(campo `private`) perché `npm run validate` sappia che quella `.webp` è a posto anche senza crediti Commons.
## Foto delle tappe · Londra (Wikimedia Commons)

Stesso metodo del viaggio a Barcellona, cartella separata (`public/assets/tappe/londra/`,
`scripts/londra-foto.mjs`, `npm run foto:londra`): solo licenze libere verificate in `extmetadata`, ritaglio
16:9, 800×450, WebP q80. I file sono stati scelti guardando i provini uno per uno: la ricerca su Commons
restituisce spesso dettagli irriconoscibili o omonimi sbagliati.

<!-- foto-londra:start -->

| Tappa | File nel sito | Autore | Licenza | Originale su Commons |
|---|---|---|---|---|
| Aeroporto di Bologna | `public/assets/tappe/londra/blq.webp` | Threecharlie | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Bologna Guglielmo Marconi Airport Terminal.jpg](https://commons.wikimedia.org/wiki/File:Bologna_Guglielmo_Marconi_Airport_Terminal.jpg) |
| Volo British Airways | `public/assets/tappe/londra/ba.webp` | Alex Noble | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | [20251011 British Airways G-TTNN EGLL.jpg](https://commons.wikimedia.org/wiki/File:20251011_British_Airways_G-TTNN_EGLL.jpg) |
| Arrivo a Heathrow | `public/assets/tappe/londra/lhr.webp` | Warren Rohner | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Terminal 5 at London Heathrow Airport, 2008.jpg](https://commons.wikimedia.org/wiki/File:Terminal_5_at_London_Heathrow_Airport,_2008.jpg) |
| Linea Bakerloo | `public/assets/tappe/londra/bakerloo.webp` | Chris McKenna (Thryduulf) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Edgware Road-Bakerloo Line-Northbound.jpg](https://commons.wikimedia.org/wiki/File:Edgware_Road-Bakerloo_Line-Northbound.jpg) |
| Southbank Centre | `public/assets/tappe/londra/southbank.webp` | Robin Stott | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Yellow steps at the Southbank Centre, London - geograph.org.uk - 7261180.jpg](https://commons.wikimedia.org/wiki/File:Yellow_steps_at_the_Southbank_Centre,_London_-_geograph.org.uk_-_7261180.jpg) |
| SEA LIFE London Aquarium | `public/assets/tappe/londra/sealife.webp` | ʘx | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Underwater Walk of Sea Life London Aquarium.jpg](https://commons.wikimedia.org/wiki/File:Underwater_Walk_of_Sea_Life_London_Aquarium.jpg) |
| London Eye | `public/assets/tappe/londra/eye.webp` | Danbu14 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [London Eye by Day.jpg](https://commons.wikimedia.org/wiki/File:London_Eye_by_Day.jpg) |
| Lina Stores | `public/assets/tappe/londra/lina.webp` | Ewan-M | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Lina Stores, Soho, W1.jpg](https://commons.wikimedia.org/wiki/File:Lina_Stores,_Soho,_W1.jpg) |
| Soho | `public/assets/tappe/londra/soho.webp` | Philafrenzy | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Dean Street - Old Compton Street corner.JPG](https://commons.wikimedia.org/wiki/File:Dean_Street_-_Old_Compton_Street_corner.JPG) |
| Trafalgar Square | `public/assets/tappe/londra/trafalgar.webp` | Diliff | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Trafalgar Square, London 2 - Jun 2009.jpg](https://commons.wikimedia.org/wiki/File:Trafalgar_Square,_London_2_-_Jun_2009.jpg) |
| Horse Guards Parade | `public/assets/tappe/londra/horseguards.webp` | Lewis Clarke | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [London , Westminster - Horse Guards Parade - geograph.org.uk - 2546769.jpg](https://commons.wikimedia.org/wiki/File:London_,_Westminster_-_Horse_Guards_Parade_-_geograph.org.uk_-_2546769.jpg) |
| Big Ben e Parlamento | `public/assets/tappe/londra/bigben.webp` | Domob | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Palace of Westminster and Elizabeth Tower 20250522.jpg](https://commons.wikimedia.org/wiki/File:Palace_of_Westminster_and_Elizabeth_Tower_20250522.jpg) |
| St James's Park | `public/assets/tappe/londra/stjames.webp` | Colin | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [St James's Park Lake – East from the Blue Bridge - 2012-10-06.jpg](https://commons.wikimedia.org/wiki/File:St_James%27s_Park_Lake_%E2%80%93_East_from_the_Blue_Bridge_-_2012-10-06.jpg) |
| Buckingham Palace | `public/assets/tappe/londra/buckingham.webp` | Diliff | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Buckingham Palace from gardens, London, UK - Diliff.jpg](https://commons.wikimedia.org/wiki/File:Buckingham_Palace_from_gardens,_London,_UK_-_Diliff.jpg) |
| Green Park | `public/assets/tappe/londra/greenpark.webp` | LondonHistoryatHome | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [View from Green Park towards Victoria Memorial.jpg](https://commons.wikimedia.org/wiki/File:View_from_Green_Park_towards_Victoria_Memorial.jpg) |
| Harrods | `public/assets/tappe/londra/harrods.webp` | Editor5807 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Harrods Knightsbridge exterior Christmas decorations in November 2022.jpg](https://commons.wikimedia.org/wiki/File:Harrods_Knightsbridge_exterior_Christmas_decorations_in_November_2022.jpg) |
| Natural History Museum | `public/assets/tappe/londra/nhm.webp` | Diliff | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [Natural History Museum London Jan 2006.jpg](https://commons.wikimedia.org/wiki/File:Natural_History_Museum_London_Jan_2006.jpg) |
| Covent Garden | `public/assets/tappe/londra/covent.webp` | Dietmar Rabich | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [London, Covent Garden -- 2016 -- 4878.jpg](https://commons.wikimedia.org/wiki/File:London,_Covent_Garden_--_2016_--_4878.jpg) |
| Partenza da Heathrow | `public/assets/tappe/londra/lhr_dep.webp` | Andrew Milligan sumo | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Departures Terminal 5, London Heathrow Airport (33215594911).jpg](https://commons.wikimedia.org/wiki/File:Departures_Terminal_5,_London_Heathrow_Airport_(33215594911).jpg) |
| Atterraggio a Bologna | `public/assets/tappe/londra/blq_arr.webp` | Ex13 | [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) | [Bologna Guglielmo Marconi Airport aerial.jpg](https://commons.wikimedia.org/wiki/File:Bologna_Guglielmo_Marconi_Airport_aerial.jpg) |
| Luci di Carnaby Street | `public/assets/tappe/londra/carnaby.webp` | Christine Matthews | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Carnaby Street Christmas Lights 2019 - geograph.org.uk - 6329567.jpg](https://commons.wikimedia.org/wiki/File:Carnaby_Street_Christmas_Lights_2019_-_geograph.org.uk_-_6329567.jpg) |
| Luci di Regent Street | `public/assets/tappe/londra/regent.webp` | Oast House Archive | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Regent Street Christmas Lights 2016 - geograph.org.uk - 5233956.jpg](https://commons.wikimedia.org/wiki/File:Regent_Street_Christmas_Lights_2016_-_geograph.org.uk_-_5233956.jpg) |
| Hintze Hall (per Olly) | `public/assets/tappe/londra/nhm_balena.webp` | APK | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Hintze Hall, Natural History Museum, London - 4.jpg](https://commons.wikimedia.org/wiki/File:Hintze_Hall,_Natural_History_Museum,_London_-_4.jpg) |

Ultimo aggiornamento: `npm run foto:londra` · 23 foto, 1484 kB in tutto.

<!-- foto-londra:end -->

## Card stilizzate (originali del progetto)

I luoghi senza una foto libera su Commons hanno una card disegnata: mosaico trencadís seedato, vignettatura e
un'icona in stile Lucide, generata da `scripts/gen-cards.mjs` (`npm run cards`). Sono grafica originale di
questo progetto: nessuna attribuzione dovuta, e infatti sotto queste card non compare nessuna riga di credito.

`parcheggio.svg` · `duckstore.svg` · `barjoan.svg` · `apt.svg` · `taps.svg` · `braseria.svg` · `olimpo.svg` ·
`biarritz.svg` · `canudas.svg`

## Font
- Clash Display (Fontshare, licenza Fontshare Free Font) e Inter (SIL OFL): già usati dal sito, self-hosted in `public/fonts/`.

## Librerie
- Three.js 0.186.0 (MIT), Draco decoder incluso in Three.js (Apache 2.0).
