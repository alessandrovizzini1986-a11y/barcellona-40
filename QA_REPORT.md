# QA Report — Rigori al Camp Nou 2.0

Data: 2026-09-16 · Branch `claude/barcelona-40-weekend-bd31wm` · Build Vite 8 · Three.js 0.186.0

Ambiente di verifica: Chromium headless (Playwright) con WebGL software (SwiftShader), viewport 380×820, `isMobile` + touch.
Gli script sono in `scripts/qa/` e ripetibili: `rigori-shot.mjs` (scena/tiro singolo), `rigori-flow.mjs` (flusso completo),
`rigori-audio.mjs`, `rigori-progress.mjs`, `rigori-passplay.mjs`. Nessun telefono reale era disponibile in questo ambiente:
le voci che richiedono un dispositivo sono marcate **DA VERIFICARE sul telefono**.

## Checklist (§13 del prompt)

| # | Voce | Esito | Evidenza |
|---|------|-------|----------|
| 1 | `grep -rin francesco src/rigori public/assets/rigori _legacy/rigori.html` → vuoto | ✅ | 0 righe (anche nel classic: card e PLAYERS rimossi) |
| 2 | Monne: strisce blaugrana, #27, nessuno stemma/sponsor/nome club in texture, testo, meta | ✅ | `v1-monne-dischetto.png` (27 sul retro, strisce che avvolgono il busto); texture procedurali senza loghi; `grep -ri "barcelona\b\|barça\|fcb" src/rigori` non trova nomi di club (il titolo "Camp Nou" è il nome del gioco richiesto dal prompt) |
| 3 | `face-monne-head.webp` sulla testa del modello e nella card; `face-monne.webp` nell'anteprima | ✅ | `v1-monne-fronte.png` (testa), `f9-02-chi-tira.png` (card a figura intera con `face-monne.webp`) |
| 4 | 60 fps su Chrome Android e Safari iOS a 380px; degradazione automatica | ⚠️ | Non misurabile qui (GPU software): qualità *alta* ≈ 4 fps, *bassa* ≈ 22 fps in SwiftShader, numeri privi di significato per un telefono. La degradazione automatica scatta (bloom → ombre → particelle → pubblico 50 %) e si vede in `__rigori.info().level`. **DA VERIFICARE sul telefono** |
| 5 | Audio parte al primo tap su iOS; musica in ducking durante l'esito | ✅ / ⚠️ | `rigori-audio.mjs`: contesto `running` dopo "Tocca per iniziare", `ducked=true` durante l'esito, `false` dopo il replay. iOS reale **DA VERIFICARE**; i tre brani mancano (silenzio, avviso in console) |
| 6 | Tiro: swipe dritto, curvo, forte (traversa), timing perfetto → comportamenti distinti | ✅ | Fase 4 (harness): mira da gesto, curva da deviazione, potenza > 0,95 che sale; `rigori-progress.mjs`: potenza 1,15 al centro-alto → `crossbar` |
| 7 | Parata: tell leggibile in normale, quasi assente in Boss | ✅ | evento `tell` 200 ms prima del calcio, finta 40 % (normale) / 15 % (Boss), reattività Boss +40 % (`keeper.js` DIFF.boss) |
| 8 | Tutte e 5 le modalità completabili senza errori console | ✅ | Shootout: `rigori-flow.mjs`; Skill, Sfida Ale e Boss (con 900 XP seminati, voce sbloccata): `rigori-modes.mjs`; Pass-and-play: `rigori-passplay.mjs`. Tutte fino alla schermata Risultato, zero errori console |
| 9 | Pass-and-play a 4 con nomi Ale/Monne/Giulio/Manuel | ✅ | `rigori-passplay.mjs`: vedi sotto |
| 10 | XP in `b40:v1:rigori:*`; nessuna chiave del sito sovrascritta | ✅ | `rigori-progress.mjs`: `b40:v1:rigori:xp = 25` dopo un incrocio; `b40:v1:person` e `b40:v1:done` intatte |
| 11 | Condivisione WhatsApp con testo corretto | ✅ | link `https://wa.me/?text=…` nel Risultato, testo con nome, punteggio e URL del gioco (vedi sotto) |
| 12 | `rigori-classic.html` raggiungibile dopo la build | ✅ | `dist/rigori-classic.html` presente (plugin `copy-legacy`, rinomina di `_legacy/rigori.html`) |
| 13 | `CREDITS.md` completo; nessun marchio di terzi | ✅ | Kenney CC0 (mappatura file → suono), Mixamo (termini da verificare), asset procedurali, volti, font, librerie |
| 14 | Nessun manifest, service worker o meta standalone (`grep` → vuoto) | ✅ | `grep -ri "serviceWorker\|manifest\|standalone\|apple-mobile-web-app" rigori src/rigori` → 0 righe |
| 15 | `git fetch origin main` eseguito, nessun push forzato | ✅ | fetch + merge prima di ogni push; nessun `--force` |

## Gate visivo (richiesta in corso d'opera, screenshot 380×820)

| Controllo | Esito | Screenshot |
|-----------|-------|------------|
| Testa chiaramente sferica, faccia non rettangolare | ✅ | `v1-monne-fronte.png`, `v1-ale-porta.png` |
| Strisce blaugrana che avvolgono il corpo, 27 sul retro | ✅ | `v1-monne-dischetto.png` |
| Pubblico con volume e movimento | ✅ | capsule istanziate su 8 file, bob/ola/braccia alzate (`crowd.js`); `v1-scena-vuota.png` |
| Profondità: gradinate lontane più scure/sfumate | ✅ | `FogExp2(0x0E1116, 0.018)`; `v1-scena-vuota.png` |
| Fari con alone visibile | ✅ | sprite additivo + cono + bloom; `v1-scena-vuota.png`, `v1-tuffo.png` |
| Nessuna superficie piatta e uniforme | ✅ | erba a strisce con normal map, cielo a gradiente con stelle, gradoni con LED |

## Prestazioni (misure in questo ambiente)

| Metrica | Valore | Nota |
|---------|--------|------|
| Bundle `rigori` (JS) | 81,5 kB · **30,8 kB gz** | budget < 200 kB gz escluso Three: ok |
| Chunk `three` | 811 kB · 207 kB gz | chunk separato, condiviso |
| CSS | 13 kB · 3,3 kB gz | |
| Draw call scena piena | 71 | stadio fuso per materiale; 2 personaggi ≈ 34 call (primitive su ossa diverse) |
| Triangoli (qualità bassa) | ≈ 110 k | pubblico 50 % |
| Modello | `character.glb` 238 kB Draco + 12 clip | |

## Flusso completo (`rigori-flow.mjs`)

Tocca per iniziare → onboarding → CHI TIRA? (Monne) → Modalità → Opzioni → Sblocchi → Shootout (tiri fuori di proposito, Ale segna: finisce 0–3 al terzo turno) → Esito → Risultato → Menu → CHI TIRA?. Screenshot `f9-01…f9-08`.

```
screenshot → f9-01-onboarding
screenshot → f9-02-chi-tira
screenshot → f9-03-modalita
screenshot → f9-04-opzioni
screenshot → f9-05-sblocchi
screenshot → f9-06-gioco
hud → Rigore 1 di 5 · Tu 0 – 0 Ale · Tiri tu {"flow":"gioco","role":"shooter","busy":"idle"}
screenshot → f9-07-esito
hud → Rigore 1 di 5 · Tu 0 – 0 Ale · Para tu {"flow":"gioco","role":"keeper","busy":"windup"}
hud → Rigore 2 di 5 · Tu 0 – 1 Ale · Tiri tu {"flow":"gioco","role":"shooter","busy":"idle"}
hud → Rigore 2 di 5 · Tu 0 – 1 Ale · Para tu {"flow":"gioco","role":"keeper","busy":"idle"}
hud → Rigore 3 di 5 · Tu 0 – 2 Ale · Tiri tu {"flow":"gioco","role":"shooter","busy":"idle"}
hud → Rigore 3 di 5 · Tu 0 – 2 Ale · Para tu {"flow":"gioco","role":"keeper","busy":"windup"}
hud → Ale vince 3–0 {"flow":"gioco","role":"keeper","busy":"flying"}
screenshot → f9-08-risultato
risultato → Ale vince 3–0 | 3 rigori a testa | Classifica: 1. Monne Perso 0–3 | +0 | XP | Esordiente | 0 XP · 100 al prossimo | Manda ai ragazzi | Rigioca | Menu
torna a CHI TIRA ✓
flusso OK, nessun errore
EXIT 0
```

## Pass-and-play (`rigori-passplay.mjs`)

Quattro nomi (Ale, Monne, Giulio, Manuel), tre giri, rotazione tira/para, classifica di serata, +120 XP con passaggio al livello 2, link WhatsApp. Screenshot `f13-passplay-nomi.png`, `f13-passplay-risultato.png`.

```
nomi scelti: [ 'Ale', 'Monne', 'Giulio', 'Manuel' ]
hud → Giro 1/3 · Ale tira, Monne para
hud → Giro 1/3 · Monne tira, Giulio para
hud → Giro 1/3 · Giulio tira, Manuel para
hud → Giro 1/3 · Manuel tira, Ale para
hud → Giro 2/3 · Ale tira, Monne para
hud → Giro 2/3 · Monne tira, Giulio para
hud → Giro 2/3 · Giulio tira, Manuel para
hud → Giro 2/3 · Manuel tira, Ale para
hud → Giro 3/3 · Ale tira, Monne para
hud → Giro 3/3 · Monne tira, Giulio para
hud → Giro 3/3 · Giulio tira, Manuel para
hud → Giro 3/3 · Manuel tira, Ale para
hud → Classifica di serata
risultato → Vince Ale | 1. Ale: 3 gol, 0 parate | 2. Monne: 3 gol, 0 parate | 3. Giulio: 3 gol, 0 parate | 4. Manuel: 3 gol, 0 parate | Classifica: 1. Ale 3 gol · 0 parate · 2. Monne 3 gol · 0 parate · 3. Giulio 3 gol · 0 parate | +120 | XP | Riserva | 120 XP · 130 al prossimo | Manda ai ragazzi | Rigioca | Menu
whatsapp → ⚽ Rigori al Camp Nou · classifica di serata / 1. Ale 3 / 2. Monne 3 / 3. Giulio 3 / 4. Manuel 3 / https://barcelona40.pages.dev/rigori/
OK pass-and-play (24 tiri)
EXIT 0
```

## Modalità dal flusso reale (`rigori-modes.mjs`)

Boss visibile e attivo al livello 5; Skill 30 s con mira sul bersaglio (27 punti, 13/13, +190 XP); Sfida Ale con Ale forzato al centro-basso (tre parate); Boss perso 0–3 in tre turni. Screenshot `f13-modalita-boss.png`, `f13-skill-risultato.png`, `f13-sfidaAle-risultato.png`, `f13-boss-risultato.png`.

```
Boss sbloccato al livello 5: true
[skill] hud → 30 s · 0 punti · bersaglio 2
[skill] hud → Tempo! 24 punti
[skill] risultato → 27 punti | 13 bersagli su 13 tiri | Classifica: 1. Monne 27 punti | +190 | XP | Leggenda | 1090 XP · 310 al prossimo | Manda ai ragazzi | Rigioca | Menu (13 tiri)
[sfidaAle] hud → Gol 0 · Parate di Ale 0/3
[sfidaAle] hud → Gol 0 · Parate di Ale 1/3
[sfidaAle] hud → Gol 0 · Parate di Ale 2/3
[sfidaAle] hud → Fine: 0 gol in 3 tiri
[sfidaAle] risultato → 0 gol prima di tre parate | 3 tiri, 0 gol | Classifica: 1. Monne 0 gol | +0 | XP | Leggenda | 1090 XP · 310 al prossimo | Manda ai ragazzi | Rigioca | Menu (3 tiri)
[boss] hud → Rigore 1 di 5 · Tu 0 – 0 Ale · Tiri tu
[boss] hud → Rigore 1 di 5 · Tu 0 – 0 Ale · Para tu
[boss] hud → Rigore 2 di 5 · Tu 0 – 1 Ale · Tiri tu
[boss] hud → Rigore 2 di 5 · Tu 0 – 1 Ale · Para tu
[boss] hud → Rigore 3 di 5 · Tu 0 – 2 Ale · Tiri tu
[boss] hud → Rigore 3 di 5 · Tu 0 – 2 Ale · Para tu
[boss] hud → Ale vince 3–0
[boss] risultato → Ale vince 3–0 | 3 rigori a testa | Classifica: 1. Monne Perso 0–3 | +0 | XP | Leggenda | 1090 XP · 310 al prossimo | Manda ai ragazzi | Rigioca | Menu (3 tiri)
OK modalità
EXIT 0
```

## Ruolo portiere e reduced-motion (verifiche aggiuntive)

| Controllo | Esito | Nota |
|-----------|-------|------|
| Vista portiere con pali e traversa nel quadro, portiere rivolto al dischetto | ✅ | `v1-portiere-io.png`; preset `dietroPortiere` arretrato con fov 74, rete visibile solo dal davanti |
| Cambio ruolo tiratore ↔ portiere ripetuto: posizioni e orientamento corretti | ✅ | prima del fix il personaggio riusato restava ruotato di 180° e, dal secondo giro, sul dischetto |
| Tuffo verso la zona giusta (clip diveL/diveR misurate: erano invertite) | ✅ | `v1-tuffo-basso-sx.png`; fianchi a x=−3,27 per la zona basso-sinistra |
| `prefers-reduced-motion`: riduci flash e shake attivo, bloom spento, pubblico 3 200 | ✅ | contesto Playwright con `reducedMotion: 'reduce'` |

## Revisione del codice (seconda passata, `rigori-review.mjs`)

Difetti trovati rileggendo il diff e corretti, ciascuno con un controllo automatico:

| Difetto | Correzione | Controllo |
|---------|------------|-----------|
| Una parata di respinta (non presa) non emetteva `result`: la modalità non contava la parata e il turno si ripeteva | `shot.js` emette `result: save` anche sulla respinta, poi la palla rotola libera | respinta a potenza 0,95 → `saves = 1` in Sfida Ale |
| Da portiere l'input era spento appena la CPU iniziava la rincorsa: impossibile reagire al tell | input attivo in `windup`/`flying` finché l'esito non è deciso | swipe durante il volo → `playerDive` accettato |
| Swipe del portiere specchiato: la camera dietro la porta guarda +z, la destra dello schermo è x<0 | mappatura invertita | swipe a destra → zona 3 (basso, x<0) |
| Skill: tempo scaduto a palla ferma lasciava la partita appesa | fine modalità anche dal tick quando la palla è ferma | `timeLeft = 1,2 s` senza tirare → `modeEnd` |
| Uscita dalla partita e fine modalità non azzeravano passività, zona forzata e bersaglio | `endMode()` e uscita ripuliscono lo stato | dopo Skill il portiere non è passivo |
| Difficoltà legata al controller in cache: Boss dopo uno Shootout normale usava il portiere "normale" | difficoltà a livello di partita, riapplicata a ogni cambio coppia | portiere riusato in Boss → `boss` |
| `?q=` finiva salvato nelle impostazioni del telefono | override solo per la visita | `settings.quality` resta `auto` |
| `guida.html` e `sala-giochi.html` del sito precedente linkano `rigori.html`, che la build non emetteva più | `rigori.html` di raccordo verso `rigori/` con link al classic | `dist/rigori.html` presente |
| Codice morto (`setCamera`, `loadFace`, `faceSprite`), opzioni duplicate, titoli duplicati | rimossi; `openOptions()`; titoli da `MODES_INFO` | build ok |

## Tiro deterministico e portiere sincronizzato (`rigori-determinismo.mjs`)

**Sintomo segnalato**: dal vivo il portiere non si tuffava, nel primo replay sì, nel secondo no.

**Cause trovate nel codice**, tutte e tre reali:
1. Il portiere si animava su `dt` **scalato**: lo slow-motion (×0,3) rallentava il tuffo proprio nell'ultimo tratto di
   volo, e durante il replay la scala del tempo era 0, quindi il mixer era fermo.
2. Il replay **risimulava**: ripercorreva un elenco di posizioni della sola palla, registrate durante il volo. Il
   portiere non ne faceva parte, e la reazione dopo l'esito (con un `setTimeout` da 1,8 s in tempo reale) lo rimetteva
   in piedi in mezzo al replay.
3. Il mixer non veniva azzerato fra una passata e l'altra: alla seconda l'azione era già finita e non ripartiva.

**Rifacimento**: il tiro è un record immutabile. Al calcio, con un seme, si decidono dispersione, traiettoria, zona e
ritardo di reazione del portiere ed esito; il volo libero dopo l'impatto è simulato subito e campionato a 1/120 s.
Esiste una sola funzione di disegno, `renderShotAt(record, t)`: il gioco dal vivo la chiama con t che avanza al ritmo
della partita, il replay con t che avanza a 0,3×. Il tuffo è "scrubbato" (`action.paused`, `action.time` imposto) e la
finestra dell'animazione è riscalata perché il portiere arrivi nella zona **esattamente all'impatto**: così è sempre
visibile e sempre in tempo. L'esito nel record decide suono, sfottò, punteggio e particelle; nessun altro pezzo di
codice lo può cambiare.

| Criterio di accettazione | Esito |
|--------------------------|-------|
| Il tuffo parte prima dell'impatto in 20/20 tiri a seme fisso | ✅ |
| La clip del tuffo avanza (tuffo visibile) in 20/20 tiri | ✅ |
| Il portiere si sposta lateralmente in tutte le zone non centrali (16/16) | ✅ |
| Stessa posa a ogni istante prima, dopo tre replay e dopo un quarto | ✅ |
| Il replay non chiama `Math.random` | ✅ (0 chiamate) |
| Il replay non chiama la decisione del portiere | ✅ (0 chiamate) |
| Ogni replay riparte dalla stessa posa iniziale (mixer azzerato) | ✅ |
| Palla dal vivo e ricalcolata: identica in tutti i 62 frame | ✅ |
| Portiere dal vivo e ricalcolato: identico fino all'impatto | ✅ |
| Replay ricalcolato agli stessi istanti: stessa posa (35 frame) | ✅ |

Dopo l'impatto il portiere passa all'animazione di reazione (esultanza o delusione), che non fa parte del tiro: è
l'unico tratto in cui la posa dal vivo e quella del replay divergono, per scelta.

Screenshot: `v2-tuffo-basso-dx.png` (allungo pieno, palla sui guanti, dalla camera del replay).

## Cose non verificabili qui (da fare sul telefono)

- fps reali su Chrome Android e Safari iOS, e soglie di degradazione (45/55 fps)
- audio su iOS (sblocco al tap, vibrazione, volumi relativi)
- swipe con il pollice a una mano su 380 px (l'harness usa gesti sintetici)
- resa dei colori/bloom su schermi OLED
