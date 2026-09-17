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

## Cartello, sfottò e turno (`tests/shot.test.js`)

**Sintomo segnalato**: esito diverso fra i due replay dello stesso tiro (PARATA poi GOL), HUD che passa da "Para tu"
a "Tiri tu" con il punteggio ancora 0-0.

**Che cosa ho trovato, riproducendo la sequenza** (log di due turni di Shootout, un campione a ogni cambiamento):

| t | HUD | cartello | sfottò | punteggio reale |
|---|-----|----------|--------|-----------------|
| 6,9 s | Tu **0 – 0** Ale · Tiri tu | GOL | "La rete si gonfia, Ale si sgonfia." | me 1, ale 0 |
| 19,2 s | Tu 1 – 0 Ale · Para tu | — | — | me 1, ale 0 |
| 26,0 s | Tu **1 – 0** Ale · Para tu | GOL | "Gol. Disonesti, direbbe Ale." | me 1, ale **1** |

Due difetti veri, nessuno dei quali è un ricalcolo dell'esito:

1. **L'HUD era indietro di un turno intero.** Il punteggio veniva riscritto solo in `nextTurn`, che parte a replay
   finito: per tutta la durata del cartello e del replay si leggeva il punteggio *precedente* al tiro appena visto.
   Due tiri consecutivi con lo stesso punteggio a schermo sembrano due replay dello stesso tiro.
2. **Lo sfottò era quello sbagliato nel ruolo di portiere.** Era scelto dal solo esito: a un gol subito usciva una
   battuta da gol fatto ("Ale ha parlato troppo"), con l'HUD che diceva "Para tu".

**L'esito invece non è mai cambiato**: nel log `record.outcome` resta `goal` dall'istante del calcio fino alla fine
del replay. Non esiste alcun test di collisione a runtime: il test lo verifica per grep su tutto `src/rigori/`.

**Correzioni**
- L'HUD si aggiorna all'esito e durante esito e replay descrive **il turno del tiro** con il punteggio già aggiornato
  ("Rigore 1 di 5 · Tu 1 – 0 Ale · Hai segnato"). Il turno avanza solo in `nextTurn`, a replay finito.
- Il cartello riceve solo campi del record (esito, incrocio, chi tirava) e non legge più nessuno stato globale.
- Lo sfottò si sceglie da `record.shooter`: due nuovi gruppi di frasi per quando a parare sei tu (gol subito e
  parata tua), otto ciascuno.
- Sequenza esito + replay bloccante: nessun evento può far avanzare il turno finché non è conclusa, e i timer del
  replay sono annullati a ogni nuovo calcio.

| Test (`node --test tests/shot.test.js`) | Esito |
|---|---|
| Nessun passo di disegno cambia l'esito (1/60 e 1/240) | ✅ |
| 50 semi diversi: esito stabile a passo 1/60, 1/240 e 1/30, su più passate | ✅ |
| Nessun `intersectsBox`/`intersectsSphere`/`distanceTo` in tutto `src/rigori` | ✅ |
| `renderShotAt` non contiene `Math.random`, `evaluate(`, `decide(`, assegnazioni di esito | ✅ |
| `rec.outcome` assegnato solo dentro `sealShotRecord` | ✅ |
| 50 tiri: il cartello dice sempre l'esito del record, dal vivo e nei due replay | ✅ |
| Il turno e l'HUD non cambiano durante la sequenza esito + replay | ✅ |

## Quattro bug + fisica (`tests/shot.test.js`, `docs/rigori/screenshots/v3-*.png`)

### 1. I ruoli vengono dal turno

`ShotRecord.ruoli = { tiratore: { id, nome, utente }, portiere: { id, nome, utente } }` è compilato al calcio da
`ruoliDalTurno(role)`: nel turno "Tiri tu" tira il giocatore scelto e para Ale, nel turno "Para tu" tira Ale e para
il giocatore scelto. HUD, sfottò, cartello, punteggio, traguardi e XP leggono **solo** quei due campi.

- `taunts.js` non contiene più nessun nome: ogni frase è un modello con `{tiratore}` e `{portiere}`, riempito con i
  nomi del record. Le varianti per personaggio sono indicizzate separatamente su tiratore e portiere.
- `esito.js` riceve `shooterId` dal record; `hud.js`/`shootout.js` costruiscono la riga da `res.ruoli`.
- `progress.js` decide chi ha tirato da `e.ruoli.tiratore.utente`, non dallo stato del turno (che intanto può
  essere già avanzato).

Verifica automatica (`i ruoli vengono dal turno`):

```
{"tira":{"tiratore":"Monne","portiere":"Ale","utente":true},
 "para":{"tiratore":"Ale","portiere":"Monne","utente":false}}
```

### 2. Il portiere tocca la palla

L'esito resta analitico e deciso una volta sola in `sealShotRecord`. La posa è pianificata **dopo** l'esito:

- la parata si risolve al piano del portiere (`tRisoluzione`), non sulla linea di porta: il portiere sta 0,55 m
  davanti, quindi il punto di contatto della palla con il guanto è il passaggio più vicino alla mano, non l'impatto
  sulla porta;
- `pianificaTuffo` sposta la radice del portiere verso la palla (al massimo 2,80 m) e inclina il busto, rifinendo
  l'offset in tre passate **attraverso la stessa `renderAt` del disegno**, così l'inclinazione entra nella misura;
- sulla parata la palla rimbalza sul guanto: velocità riflessa attorno alla normale guanto→palla, ×0,35, poi gravità;
- sul gol il portiere arriva in ritardo o dalla parte sbagliata e viene allontanato di almeno 0,32 m dalla
  traiettoria: la palla non lo attraversa mai.

Misura su 30 parate con seme fisso (test `30 parate`): **30/30 entro 0,15 m**, massimo **0,0171 m**, media 0,0026 m.

### 3. Camere dei replay

`camereReplay(record)` (esportata e verificabile) dà due camere, entrambe **davanti** alla porta:

| Replay | Posizione | Punto inquadrato | FOV | Segue la palla |
|---|---|---|---|---|
| 1 — laterale bassa | `[lato·8, 1.2, 5.5]` | punto medio fra palla e zona del portiere | 70° | no |
| 2 — frontale 3/4 | `[lato·3, 1.55, 11.5]` | idem | 58° | sì |

`lato` è il segno della x del contatto: la laterale sta sempre dalla parte del tiro. Nessuna camera dietro la porta
rivolta al campo. In ritratto (380×820) il campo visivo orizzontale è poco più di un terzo del verticale: per questo
si inquadra il punto medio fra palla e portiere e non la sola palla, altrimenti il portiere resta fuori.

### 4. Rete sempre visibile

`MeshBasicMaterial` con `side: DoubleSide`, `transparent`, `opacity 0.7`, `depthWrite: false`; maglia con texture
alpha (lo spessore del filo è nella texture, così non si assottiglia con la distanza). Fondo 40×20, fianchi e tetto
20×20.

| Inquadratura | Screenshot | Rete visibile |
|---|---|---|
| Replay 1 (laterale bassa) | `v3-rete-replay1-laterale.png` | ✅ |
| Replay 2 (frontale 3/4) | `v3-rete-replay2-frontale.png` | ✅ |
| Dietro il tiratore (camera di gioco) | `v3-rete-dietro-tiratore.png` | ✅ |
| Dietro la porta (solo per la prova del DoubleSide) | `v3-rete-dietro-portiere.png` | ✅ |

### 5. Fisica della palla

Bézier eliminata. Integrazione semi-implicita di Eulero a passo fisso, deterministica dal seme:

| Grandezza | Valore |
|---|---|
| Passo | 1/120 s fisso |
| Velocità iniziale | 15–30 m/s (`velocitaDa(power)`) |
| Gravità | 9,81 m/s² |
| Resistenza quadratica | k = 0,0045 |
| Magnus | k_m = 0,0048, spin max 60 rad/s, decadimento 0,6 |
| Curva massima | deviazione laterale **0,62–0,92 m su 11 m** rispetto alla direzione di lancio (0,77 m a potenza 0,7) |
| Restituzione su palo/traversa | 0,6 ± scarto dal seme |
| Ritardo di reazione del portiere | 0,18–0,32 s secondo difficoltà |

La direzione di lancio è risolta da `miraVerso` con un punto fisso (10 iterazioni, tolleranza 2 mm): si spara *verso*
il bersaglio tenendo conto di gravità, resistenza e Magnus, invece di curvare a posteriori. La traiettoria è
campionata una volta sola e salvata nel record insieme alle rotazioni, così `renderShotAt` è pura interpolazione.

Misure sul campione di 30 tiri: v0 **16,8–28,4 m/s**, tempo di volo **0,408–0,741 s** (finestre chieste: 15–30 m/s,
0,40–0,75 s).

### 6. Rete che si gonfia

Tessuto Verlet a passo fisso 1/60, smorzamento 0,92, gravità debole, due passate di vincoli di distanza; i bordi su
pali, traversa e terreno sono ancoraggi. L'impulso agisce entro 0,4 m dal punto d'impatto con ampiezza
`0,05 + 0,012 · v_impatto`, normalizzata sul nodo più vicino.

| Velocità d'impatto | Gonfiore misurato (`ampiezzaMax()`) |
|---|---|
| 15 m/s | 0,2300 m |
| 30 m/s | 0,4100 m |

Il cloth vive solo 1,5 s dall'impulso: fuori da quella finestra `update` esce subito e non costa nulla. Sotto i
45 fps `perf.js` chiama `setQualita(0.5)` e la suddivisione si dimezza (2184 → 594 vertici mobili). Nella rete la
palla ha resistenza ×8 e si ferma entro 0,6 s.

### Partita completa: 5 rigori + sudden death

`node scripts/qa/rigori-partita.mjs` gioca uno Shootout intero e stampa il registro qui sotto mentre gioca. I tiri
del giocatore li decide lo script (precisione 0 e zona del portiere forzata) perché la serie arrivi in parità al
quinto rigore e si veda il sudden death; **i tiri di Ale sono quelli della CPU**, con la sua mira e il suo scarto, e
i tuffi del giocatore-portiere sono alla cieca, decisi alla rincorsa come in partita. Prima passata, nessun
tentativo scartato.

| # | Round | Tira | Para | Esito | v0 m/s | Volo s | v impatto | Guanto m | Rete m | Punteggio | Sfottò |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | monne | ale | goal | 18.5 | 0.661 | 16.7 | — | 0.23 | 1-0 | Ale: "L'avevo detto dove tirava." Certo. |
| 2 | 1 | ale | monne | goal | 23.8 | 0.491 | 22.4 | — | 0.291 | 1-1 | Monne non l'ha vista. Il riflesso degli occhiali. |
| 3 | 2 | monne | ale | goal | 22.8 | 0.528 | 20.9 | — | 0.274 | 2-1 | Monne segna e Ale guarda. |
| 4 | 2 | ale | monne | goal | 23.2 | 0.49 | 22 | — | 0.286 | 2-2 | Ale segna e para. Dice lui. |
| 5 | 3 | monne | ale | goal | 18.5 | 0.643 | 16.7 | — | 0.23 | 3-2 | Gol con gli occhiali da sole. Stile. |
| 6 | 3 | ale | monne | save | 27.1 | 0.433 | 25.6 | 0.0009 | — | 3-2 | Monne ci arriva. Non chiedergli come. |
| 7 | 4 | monne | ale | save | 22.8 | 0.528 | 20.9 | 0.0031 | — | 3-2 | Troppo veloce la rincorsa, troppo lento il tiro. |
| 8 | 4 | ale | monne | goal | 22.7 | 0.53 | 20.7 | — | 0.272 | 3-3 | Gol. Disonesti, direbbe Monne. |
| 9 | 5 | monne | ale | goal | 18.5 | 0.661 | 16.7 | — | 0.23 | 4-3 | Ale: "L'avevo detto dove tirava." Certo. |
| 10 | 5 | ale | monne | goal | 21.5 | 0.543 | 20.3 | — | 0.269 | 4-4 | Ale segna e Monne guarda. |
| 11 | SD | monne | ale | goal | 22.8 | 0.514 | 20.9 | — | 0.274 | 5-4 | Angolo giusto, portiere sbagliato. |
| 12 | SD | ale | monne | save | 21.8 | 0.537 | 20.6 | 0.0001 | — | 5-4 | Monne para. E ora lo racconta a tutti. |

**Finale: Tu 5 – 4 Ale · vince il giocatore · sesto round · sudden death.**

Colonne: `v0` velocità al calcio, `v impatto` velocità all'arrivo, `Guanto` distanza guanto-palla all'istante del
contatto, `Rete` gonfiore massimo della rete sul gol. Il registro dice, riga per riga, che:

- **i ruoli seguono il turno**: nei tiri dispari tira Monne e para Ale, nei pari tira Ale e para Monne, e lo sfottò
  nomina sempre i due ruoli giusti (tiro 2: "Monne non l'ha vista", con Monne portiere; tiro 12: "Monne para");
- **la fisica sta nelle finestre**: v0 fra 18,5 e 27,1 m/s, tempo di volo fra 0,433 e 0,661 s;
- **il portiere tocca sempre la palla** quando para: 0,0009 m, 0,0031 m e 0,0001 m, tutte ben sotto i 0,15 m;
- **la rete si gonfia in proporzione all'urto**: da 0,230 m sul tiro più lento (16,7 m/s sulla linea) a 0,291 m sul
  più forte (22,4 m/s). L'ampiezza è `0,05 + 0,012 · v` dove `v` è la velocità *quando la palla tocca la rete*,
  cioè dopo altri 1,8 m dentro la gabbia: sul tiro 1 sono 15,0 m/s, e infatti la misura dà 0,2299 m.

| Controllo dello script | Esito |
|---|---|
| Ruoli del record coerenti col turno in tutti i 12 tiri | ✅ |
| v0 dentro 15–30 m/s in tutti i tiri | ✅ |
| Tempo di volo dentro 0,40–0,75 s in tutti i tiri | ✅ |
| Guanto entro 0,15 m dalla palla su tutte le parate | ✅ |
| Gonfiore della rete in scala su tutti i gol | ✅ |
| Sfottò presente a ogni esito | ✅ |
| La serie arriva al sudden death e si chiude con un vincitore | ✅ (5–4 al sesto round) |

**Una cosa trovata scrivendo questo test**: la rete si gonfia *dopo* l'annuncio dell'esito — la palla deve ancora
percorrere 1,8 m fino al fondo della gabbia, e al rallentatore ci mette mezzo secondo. Una misura a tempo fisso
subito dopo l'esito leggeva zero. Non era un difetto del tessuto (l'impulso e l'ampiezza erano giusti): era la
misura a essere prematura. Lo script ora aspetta l'impulso e azzera la misura fra un tiro e l'altro.

### Regressione completa

`node --test tests/shot.test.js` — 10 test su 10, nessun fallimento (220 s in questo ambiente, con Chromium
su SwiftShader).

| Test | Esito |
|---|---|
| Nessun passo di disegno cambia l'esito (1/60 e 1/240) | ✅ |
| 50 semi diversi: esito stabile a passo 1/60, 1/240 e 1/30 | ✅ |
| Nessun `intersects*` in `src/rigori`, e ogni `distanceTo` dentro una funzione di pianificazione o di QA | ✅ |
| `renderShotAt` senza `Math.random`, decisioni o assegnazioni di esito | ✅ |
| `rec.outcome` assegnato solo dentro `sealShotRecord`; `keeper.evaluate` chiamato una volta sola | ✅ |
| Il cartello dice sempre l'esito del record, dal vivo e nei due replay | ✅ 12/12 |
| 30 parate: guanto entro 0,15 m | ✅ 30/30, massimo 0,0171 m |
| I ruoli vengono dal turno, anche da portiere | ✅ |
| Turno e HUD fermi durante esito e replay | ✅ ("Rigore 1 di 5 · Tu 1 – 0 Ale · Gol di Monne") |
| Partita completa 5 rigori + sudden death (`rigori-partita.mjs`) | ✅ 12 tiri, 5–4 |

Due controlli che fallivano erano sbagliati **loro**, non il gioco: il primo attribuiva la misura di distanza alla
`const` o al `for` più vicini invece che alla funzione che la contiene (bocciava `passaggioPiuVicino`, che gira a
record ancora aperto e non nel disegno); il secondo cercava ancora la vecchia dicitura "Hai segnato" nell'HUD del
replay, che ora nomina chi ha tirato leggendolo dal record.

## Cose non verificabili qui (da fare sul telefono)

- fps reali su Chrome Android e Safari iOS, e soglie di degradazione (45/55 fps)
- audio su iOS (sblocco al tap, vibrazione, volumi relativi)
- swipe con il pollice a una mano su 380 px (l'harness usa gesti sintetici)
- resa dei colori/bloom su schermi OLED
