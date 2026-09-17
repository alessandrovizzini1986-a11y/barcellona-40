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

## Quattro correzioni (rete, slow-mo, card giocatore, barra tempismo)

### 1. La rete non si gonfiava: due cause vere

Log di diagnosi a `t_hit` (tiro a potenza piena, `reteDiagnostica()`), **prima** del fix:

```
v impatto 24,9 m/s · v alla rete 22,3 m/s · punto mondo [2.796, 0.603, -1.814]
pannello 0 (fondo)  locale [2.796, -0.617, 0.186]  nodi nel raggio  4 / 171 mobili  peso max 0,288
pannello 1 (fianco) locale [0.814, -0.617, 6.456]  nodi nel raggio  0 / 81
pannello 2 (fianco) locale [-0.814, -0.617, 0.864] nodi nel raggio  0 / 81
pannello 3 (tetto)  locale [2.796, -0.814, 1.837]  nodi nel raggio  0 / 81
ampiezza nei 0,5 s successivi: 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0 · 0,3176 (attiva solo dopo 500 ms)
```

Ipotesi verificate una per una:

| Ipotesi | Verdetto |
|---|---|
| (a) impulso in coordinate mondo contro nodi in coordinate locali | **No**: il punto locale cade dentro il pannello di fondo, a 0,186 m dal suo piano |
| (b) manca `position.needsUpdate` | **No**, c'è. Mancava però l'aggiornamento della sfera di contenimento: la geometria si deforma e il culling la calcola a riposo |
| (c) cloth aggiornato solo nel loop dal vivo | **Sì**: `goal.update(dt)` riceveva il `dt` **scalato**. Durante i replay `timeScale = 0`, quindi il tessuto restava congelato; in slow-motion andava a un terzo |
| (d) nodi tutti ancorati | **No**: 171 mobili sul fondo |
| **(e) raggio d'impulso più stretto della maglia** | **Sì**: con la griglia dimezzata (qualità bassa) 0,4 m prendevano **4 nodi su 171**, cioè una punta su un vertice invece di una tasca |

**Correzioni**: il raggio d'influenza è `max(0,4 m; 2,5 maglie)`, così copre sempre una tasca vera a qualunque
suddivisione (il picco resta `0,05 + 0,012 · v`, cambia solo la larghezza); i pannelli hanno `frustumCulled = false`;
il tessuto è mosso da `raw`, il tempo reale, e non dal tempo di gioco.

Dopo il fix, stesso tiro:

| | prima | dopo |
|---|---|---|
| Nodi nel raggio (qualità piena) | 4 | **25** |
| Nodi nel raggio (qualità dimezzata) | 4 | **22** |
| Gonfiore a 22,3 m/s | 0,318 m (su un vertice) | 0,318 m (su una tasca) |
| Tessuto durante i replay | fermo | animato |

Screenshot a `t_hit + 0,15 s`: `v4-rete-tasca.png` (da dietro-fuori, la maglia sporge e la palla è dentro la
deformazione), `v4-rete-profilo.png` (di profilo), `v4-rete-gonfia-piena.png` (dalla camera di gioco).

**Da sapere**: il massimo raggiungibile in partita è **0,32 m**, non 0,41 m. La formula è quella chiesta, ma la
velocità che conta è quella con cui la palla **tocca la rete**: partendo a 30 m/s, dopo 13 m di volo e 1,8 m dentro
la gabbia ne restano ~22. Per avere 0,41 m servirebbe usare la velocità al calcio invece di quella all'impatto: dimmi
tu quale preferisci.

### 2. Slow-motion solo nel replay

`main.js` metteva `juice.setSlow(shot.remaining < 0.4)`: siccome il volo dura 0,4-0,75 s, **quasi tutto il tiro dal
vivo girava a ×0,3**. Rimosso insieme a tutto il meccanismo `slow` in `juice.js`. Dal vivo `juice.update()` torna
sempre 1; l'unica eccezione è l'hit-stop di 60 ms su palo, traversa e guanti. Il ×0,3 resta solo dentro
`startReplay`, cioè nei due replay.

Effetto collaterale utile: la rete si gonfia ora **83 ms dopo il contatto** invece di ~500 ms.

### 3. Card di conferma del giocatore

Toccare un volto in "Chi tira?" non avvia più la partita: apre `ui/screens/giocatore.js` a schermo intero, con
entrata a scorrimento dal basso di 220 ms.

- volto grande (132 px), nome, numero sulla maglia del personaggio
- **due dritte** del giocatore e **due sull'avversario in porta**, da `tips:[...]` in `data/players.js`
- statistiche a cinque tacche (potenza, precisione, effetto), da `stats:{...}`
- **VAI** (giallo, 56 px) avvia · **Cambia** torna alla scelta

Screenshot: `v4-card-monne.png`, `v4-card-mario.png`. Verificato: "Cambia" riporta a `chiTira`, "VAI" porta a
`modalita` e imposta il tiratore scelto.

L'animazione d'entrata fa **solo** lo scorrimento, senza dissolvenza: partendo da `opacity: 0`, su un dispositivo
lento (qui, headless a 13 fps) la card resta invisibile finché l'animazione non recupera. Misurato: a 300 ms
l'opacità era ancora 0.

### 4. Il pallino giallo è la barra del tempismo

Non era un residuo di debug né un indicatore di mira: è il cursore di `rg-timing`, che esisteva già come barra con
zona centrale in `--acqua`. Mancava che si spiegasse. Ora:

- etichetta **TEMPISMO** sopra la barra, in `--fs-0`
- traccia più alta (16 px) con la zona centrale evidenziata e il cursore giallo che oscilla
- al rilascio **dentro** la zona: lampeggio della barra e scritta **+ PRECISIONE** (650 ms); fuori zona, niente
- onboarding del primo tiro: "Trascina dal pallone e rilascia quando il cursore è nella zona verde"
- in Opzioni la voce si chiama ora "Barra del tempismo" (era "Timing bar"), sempre attiva per impostazione predefinita

Screenshot: `v4-tempismo-barra.png` (durante il trascinamento), `v4-tempismo-ok.png` (lampeggio al rilascio in zona,
rilasciato a 0,411 con finestra 0,41-0,59).

**C'è un secondo pallino giallo**, ma solo al primo avvio: la freccia animata dell'onboarding
(`rg-onb__arrow`), che parte dal pallone e mima lo swipe. Non è un residuo, è il suggerimento del tutorial, e
sparisce dopo il primo tiro. Se era quello a darti fastidio, dimmelo e lo tolgo.

## Esito dalla raggiungibilità geometrica (`tests/keeper-reach.test.js`)

**Avevi ragione sulla causa.** Non era la posa: era la zona. Il vecchio `evaluate` confrontava il punto
d'impatto con il centro di una zona astratta e una "portata" numerica (`reach`), e dichiarava parata palle che
nessuna posa del portiere può toccare. La correzione della posa a runtime serviva solo a nascondere quel
difetto, e quando non ce la faceva si vedeva il portiere levitare o sdraiarsi a 2,5 m dalla palla.

### Quanto arriva davvero il portiere (misurato sul modello)

`npm run reach` posiziona il portiere lungo il tuffo di ognuna delle sei direzioni e legge dal modello la
posizione mondo di guanti, spalle, anche e piedi. Genera `src/rigori/data/reach.js`, che è l'unica sorgente
della zona coperta: quei numeri non si scrivono a mano.

| Direzione | Clip | |x| massimo | y massimo |
|---|---|---|---|
| alto sx | diveL | 2,29 m | 1,47 m |
| alto centro | high | 0,44 m | 1,77 m |
| alto dx | diveL specchiata | 2,29 m | 1,47 m |
| basso sx | diveL | 2,29 m | 1,06 m |
| basso centro | catch | 0,47 m | 0,59 m |
| basso dx | diveL specchiata | 2,29 m | 1,06 m |

Due cose emerse dalla misura, che spiegano i falsi positivi:

1. **I guanti non superavano 1,05 m** in nessun tuffo laterale: gli angoli alti (centro zona a y = 1,75 m) erano
   irraggiungibili *per costruzione*, e ogni "parata" là sopra era finta. Ho aggiunto un arco verticale **fisso**
   di 0,45 m alle due direzioni alte laterali — è una proprietà della posa, identica a ogni tiro, non insegue
   niente — e il reach sale a 1,47 m. Parte e finisce con i piedi a terra.
2. **Nel tuffo i guanti stanno a z = 1,1–1,7 m**, cioè più di un metro *davanti* alla linea di porta. Confrontare
   il punto d'impatto sulla linea con la posizione del portiere era sbagliato in partenza: ora si confronta la
   traiettoria della palla con le capsule, nello spazio e nel tempo.

### La regola nuova

`sealShotRecord` campiona il volo libero a 1/240 s e cerca il passaggio più vicino alle capsule della direzione
scelta. È parata **solo se** la distanza scende sotto 0,25 m **mentre il tuffo è almeno al 60 %**. Nient'altro:
niente probabilità, niente bonus di difficoltà, niente correzione della posa. `pianificaTuffo`, l'offset della
radice e il `setLean` d'inseguimento sono stati eliminati; un test lo verifica per grep.

Le capsule sono sei per posa: guanto→spalla, spalla→anca e anca→piede per lato. Il portiere para anche col corpo,
e quelle sono parti vere del modello, misurate come le altre.

### Gate a 200 tiri

| Direzione | Tiri | Parate | Distanza media | Distanza massima |
|---|---|---|---|---|
| alto sx | 31 | 0 | — | — |
| alto centro | 35 | 1 | 0,206 m | 0,206 m |
| alto dx | 34 | 2 | 0,075 m | 0,117 m |
| basso sx | 33 | 0 | — | — |
| basso centro | 35 | 1 | 0,205 m | 0,205 m |
| basso dx | 32 | 0 | — | — |

- **(a)** ogni parata ha contatto vero: massimo **0,206 m**, sotto i 0,25 m richiesti ✅
- **(b)** nessun gol con la palla dentro la capsula a tuffo arrivato ✅ (un solo gol ha la palla passata vicino
  al guanto *prima* che il tuffo fosse al 60 %: lì il portiere non c'era ancora, ed è giusto che sia gol)
- il gate gira con `npm test` e `npm run test:gate`

### Il punto che devi decidere: le parate sono il 3,4 %

Con la geometria vera il portiere para **3 volte su 88 tiri nello specchio**. Ho provato le due leve che mi hai
lasciato, e **non spostano niente**:

| Leva | Parate |
|---|---|
| Durata del tuffo 0,45 s (iniziale) | 0,6 % |
| Durata del tuffo **0,30 s** | 3,4 % |
| Durata del tuffo 0,22 s | 2,3 % |
| Durata del tuffo 0,16 s | 2,3 % |
| Reazione al minimo (0,18–0,24 s anche in normale) | 2,3 % |

Il motivo è che **il limite è spaziale, non temporale**: le capsule del portiere, corpo compreso, spazzano circa
1,5 m² dei 17,9 m² dello specchio. Più veloce non copre più area; anzi oltre una certa velocità il guanto è già
passato quando arriva la palla. Tenendo la durata a 0,30 s e la reazione documentata (0,22–0,30 s) si ottiene il
massimo possibile, 3,4 %.

Per arrivare al 20 % servirebbe che il portiere **coprisse più porta**, e le strade sono due, nessuna delle quali
posso prendere da solo perché cambiano il gioco:

1. **Clip di tuffo con allungo vero.** Le clip attuali sono tuffi corti: a braccio teso il guanto arriva a 2,29 m
   dal centro e 1,47 m d'altezza, su una porta larga 7,32 e alta 2,44. Un tuffo da portiere vero coprirebbe il
   doppio. Serve una clip nuova, non una riga di codice.
2. **Raggio della capsula più grande di 0,25 m.** È la strada che mi hai vietato, e ha senso vietarla: 0,25 m è
   già la somma dei raggi di palla (0,11) e guanto (0,12), cioè il contatto fisico.

Nel frattempo il gioco è *corretto*: quando dice parata, la palla è davvero sul guanto.

### La tabella corrisponde a quello che si vede

Il rischio di un esito calcolato su una tabella è che la tabella e la posa disegnata divergano. Verificato sui
quattro semi degli screenshot, ricalcolando la distanza punto-segmento sulle posizioni mondo della posa
**effettivamente disegnata**:

| Seme | Distanza dalla tabella | Distanza sulla posa disegnata | Segmento | Scarto |
|---|---|---|---|---|
| 1042 | 0,0498 m | 0,0492 m | guanto→spalla sx | −0,6 mm |
| 1119 | 0,2302 m | 0,2180 m | guanto→spalla dx | −12,2 mm |
| 1133 | 0,2180 m | 0,2121 m | spalla→anca dx | −5,9 mm |
| 1203 | 0,2428 m | 0,2442 m | guanto→spalla sx | +1,4 mm |

Lo scarto massimo è **1,2 cm**, ed è l'interpolazione lineare fra i 13 campioni della tabella. Il gate misura
quindi la geometria che si vede, non un modello parallelo.

Screenshot: `v5-parata-1.png` … `v5-parata-4.png` (0,05 · 0,23 · 0,22 · 0,24 m).

**Da dire con onestà su questi screenshot**: a 0,24 m di distanza dalla capsula la palla *sfiora*, non è
"visibilmente a contatto" come chiedevi. Con il raggio 0,25 m che mi hai dato è inevitabile: 0,25 m è il contatto
fra palla (raggio 0,11) e guanto (0,12), ma sul braccio, che ha raggio 0,06, la stessa distanza lascia 8 cm d'aria.
Se vuoi che si veda il contatto in tutti i casi, il raggio va a 0,18 m — e le parate scendono ancora. Inoltre la
testa gigante dello stile "big head" copre spesso il punto di contatto quando la camera è vicina.

## Replay saltabile

- Pulsante **SALTA ▸** in basso a destra (48 px, ghost, opacità 0,85, `z-index` sopra tutto), visibile da quando
  compare il cartello fino alla fine del replay.
- **Un tocco in qualunque punto** salta lo stesso. L'input di gioco è spento per tutta la sequenza
  (`enabled: () => ... && !esitoLock`), così il dito che salta non fa partire il tiro dopo.
- Il salto è accettato solo dopo **400 ms** dal cartello: serve a non saltare l'esito col dito che ha appena tirato.
- Il salto annulla i timer della catena esito → replay 1 → replay 2 → turno, ferma il replay in corso e taglia gli
  stinger con dissolvenza di 150 ms (`audio.stopSting`). Un flag `sequenzaConsumata` fa passare la chiusura una
  volta sola: i callback dei replay che arrivano dopo non fanno nulla.
- Opzione **"Salta replay automaticamente"**, spenta di default, ricordata in `b40:v1:rigori:skipReplay`.

**Test** (`node scripts/qa/rigori-salto.mjs`): due partite con lo stesso `Math.random` seminato, una vista per
intero e una saltata al primo fotogramma utile. 8 tiri, 8 salti:

| Confronto | Esito |
|---|---|
| Turni, ruoli ed esiti | ✅ identici |
| Punteggio finale | ✅ identico |
| XP | ✅ identici |
| Traguardi | ✅ identici |
| Nessun turno saltato o doppio | ✅ (8 tiri in tutte e due) |

Una differenza c'è, e va detta: **il seme dei tiri di Ale cambia**. I semi escono da `Math.random`, che il
replay consuma anche per le particelle; saltando, i tiri successivi della CPU partono da un seme diverso. Non
fa parte del risultato — punteggio, XP e traguardi restano identici, e nel campione anche tutti gli esiti — ma
significa che una partita saltata non è bit-a-bit la stessa di una vista per intero.

## Condivisione del replay e collegamento col sito

### Condivisione immagine (A1)

Pulsante **Condividi** sul cartello dell'esito e **Condividi immagine** nella schermata risultato. Il canvas del
gioco viene catturato (`preserveDrawingBuffer: true` sul renderer, più un render forzato prima dello scatto) e
ricomposto su un canvas 2D da **1080×1920 PNG**: punteggio in alto, chi tira e chi para, l'esito grande nel
colore giusto, lo sfottò e la firma "rigori al camp nou · barcelona 40".

Verificato in Chromium: file `rigori-camp-nou.png`, **1080×1920**, 1,4 MB. Screenshot: `v6-condivisione.png`.

Con `navigator.canShare({files})` si apre lo sheet nativo; altrimenti si scarica il file, si apre `wa.me` col
testo e compare il toast "Immagine salvata, allegala in chat".

### Video del replay (A2)

Si registra **mentre il replay gira**, non lo si riesegue: `canvas.captureStream(30)` + `MediaRecorder` a
2,5 Mbps, massimo 6 s, senza audio. Il tipo si sceglie fra `video/mp4;codecs=avc1`, `video/mp4`,
`video/webm;codecs=vp9`, `video/webm`; se nessuno è supportato il pulsante **non compare**. In più, un blob sotto
i **10 kB** viene buttato via: è il caso di Safari iOS, che dichiara il supporto e poi produce un file vuoto.
In Chromium il tipo scelto è `video/mp4`.

Se entrambe falliscono resta **Copia risultato**, che mette il testo negli appunti.

### Collegamento sito ↔ gioco (B)

| Verifica | Risultato |
|---|---|
| Card in cima a Missioni | "Rigori al Camp Nou · Cinque rigori contro Ale. Vinci e ti porti gli XP. · Il tuo record: 5 gol · 420 XP · GIOCA" |
| Il pulsante GIOCA apre nella stessa scheda | `href="rigori/"`, nessun `target` ✅ |
| Info → Extra | link a `rigori/` e `rigori-classic.html` ✅ |
| Menu del gioco, prima voce | "← Torna al programma" → `#/oggi`, stessa scheda ✅ |
| Schermata risultato | pulsante ghost "Torna al sito" ✅ |
| Tasto indietro | il gioco non usa `history.pushState`: il back del browser torna al sito ✅ |

**XP condivisi (B3)**: il gioco scrive `b40:v1:rigori:xp` e `b40:v1:rigori:stats` (gol, parate, partite, record,
vittorie). Il sito li legge in sola lettura da `src/rigoriLink.js` e li somma al totale del profilo con un
cambio: **1 XP del sito ogni 20 del gioco, massimo 50**, così il gioco non scavalca le missioni vere. Misurato:

| XP nel gioco | Bonus sul profilo | Totale profilo |
|---|---|---|
| 0 | 0 | 0 su 460 |
| 420 | 21 | 21 su 460 |
| 5000 | 50 (tetto) | 50 su 460 |

Nessuna chiave del sito viene sovrascritta dal gioco, e nessuna chiave del gioco dal sito. Se il profilo non è
ancora stato scelto il gioco funziona lo stesso: gli XP restano salvati e si vedono al primo profilo selezionato.

## Cose non verificabili qui (da fare sul telefono)

- fps reali su Chrome Android e Safari iOS, e soglie di degradazione (45/55 fps)
- audio su iOS (sblocco al tap, vibrazione, volumi relativi)
- swipe con il pollice a una mano su 380 px (l'harness usa gesti sintetici)
- resa dei colori/bloom su schermi OLED
