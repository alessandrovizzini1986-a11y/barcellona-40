# Prompt · Rigori al Camp Nou — rimuovere Francesco dai giocatori

## Contesto del repo
- Repository GitHub: `alessandrovizzini1986-a11y/barcellona-40`, branch di lavoro `claude/barcelona-40-weekend-bd31wm` (poi mergiato su `main`).
- Il gioco è **un unico file HTML autonomo**: `_legacy/rigori.html`. Non fa parte dell'app Vite del sito (quella in `src/`): è il sito precedente, conservato e ripubblicato così com'è.
- Tech: Three.js caricato via import map da file locali (`_legacy/assets/three.module.js`, `_legacy/assets/jsm/`), nessun bundler, nessuna build per questo file — si edita l'HTML e basta.
- Pubblicazione: un plugin Vite (`copy-legacy` in `vite.config.js`) copia `_legacy/` dentro `dist/` a ogni build, quindi il gioco esce automaticamente insieme al resto del sito. Non serve toccare altro per farlo uscire online.
- URL live oggi: `https://alessandrovizzini1986-a11y.github.io/barcellona-40/rigori.html`
- Deploy: push su `main` → GitHub Actions (`.github/workflows/pages.yml`) fa build e pubblica su GitHub Pages. **Attenzione**: il repo è condiviso con altre sessioni che possono aver spostato avanti `main` nel frattempo — prima di pushare fai `git fetch origin main` e un merge (mai push forzato).

## Cosa fa il gioco (in breve)
"Rigori al Camp Nou" (titolo interno: `RIGORI AL CAMP NOU · 3D`): un penalty shootout in 3D. Il giocatore sceglie un tiratore da una schermata "CHI TIRA?" (`#playerSelect`), poi tira o para contro Ale, il portiere del weekend. Ci sono più modalità (Sfida 5, Duello, sfida infinita, sfida del giorno), un sistema di progressione (XP, sblocchi, achievement), impostazioni audio/sensibilità/meteo. Tutto lo stato vive in `localStorage` con chiavi tipo `rig_player`, `rig_xp`, `rig_ach`, ecc.

## Modifica richiesta
**Rimuovere Francesco dall'elenco dei giocatori selezionabili.** Oggi la schermata "CHI TIRA?" mostra 4 card: Mario, Giulio, Francesco, Ale (bloccato). Dopo la modifica devono restare solo Mario, Giulio e Ale (bloccato).

### Dove intervenire
Ho già cercato tutte le occorrenze di "Francesco" nel file: sono **solo due**, entrambe isolate e senza logica speciale collegata al suo nome (a differenza di Ale, che ha condizioni di sblocco).

1. **Oggetto `PLAYERS`** (variabile JS, cerca `const PLAYERS={`): contiene una riga
   ```js
   Francesco:{name:'FRANCESCO',num:'10',face:'assets/face-francesco.png',poster:null},
   ```
   Va eliminata.

2. **Card nella UI** (cerca `data-player="Francesco"`), dentro `<div id="playerSelect">`: un blocco
   ```html
   <button class="pscard" data-player="Francesco"><img src="assets/face-francesco.png" alt="Francesco"><span>FRANCESCO</span><small>#10 · 99 OVR</small>
     <div class="pstats">...</div></button>
   ```
   Va eliminato per intero (l'intero `<button class="pscard">...</button>`).

### Cosa NON serve toccare
- Il layout delle card (`#playerSelect .pscards`) è `display:flex; flex-wrap:wrap` — non un grid fisso. Con 3 card invece di 4 si sistema da solo, nessun CSS da aggiustare.
- `PLAYER` (variabile globale, selezione corrente) e tutta la logica di gioco sono generiche: leggono `PLAYERS[nomeScelto]`, non fanno mai riferimento diretto a "Francesco". Rimuovendo la entry e la card non serve cambiare altro codice.
- L'asset `_legacy/assets/face-francesco.png` (113 KB) resta orfano. Puoi lasciarlo (non causa danni, non viene più referenziato da nessuna parte) oppure eliminarlo con `git rm` se preferisci un repo più pulito — è la tua scelta, non è necessario per la funzionalità.
- Nessun achievement, testo, classifica o meta tag (Open Graph, descrizioni) nomina Francesco: la descrizione della pagina cita già solo "Mario e Giulio" contro Ale, quindi non c'è nulla da correggere lì.

## QA da fare prima di committare
1. `grep -in francesco _legacy/rigori.html` → deve restituire **zero righe**.
2. Apri il file in locale (o con un piccolo server statico) e verifica:
   - la schermata "CHI TIRA?" mostra solo Mario, Giulio, Ale (bloccato con il lucchetto);
   - selezionando Mario o Giulio il gioco parte normalmente, il tiratore 3D ha la faccia giusta;
   - nessun errore in console del browser.
3. Controlla che l'app non abbia più riferimenti rotti: `grep -in "face-francesco" _legacy/rigori.html` → deve restituire zero righe (a meno che tu scelga di tenere l'asset per altri motivi, ma allora non deve comunque essere referenziato).

## Commit e deploy
- Un commit solo basta, ad es.: `fix(rigori): rimosso Francesco dai giocatori selezionabili`.
- Prima di pushare: `git fetch origin main` e verifica che il tuo branch sia allineato o mergiabile senza conflitti (il repo è condiviso).
- Dopo il push su `main`, il deploy GitHub Pages parte da solo. Verifica con `curl` che `rigori.html` risponda 200 e che il markup non contenga più "Francesco":
  ```bash
  curl -s https://alessandrovizzini1986-a11y.github.io/barcellona-40/rigori.html | grep -i francesco
  ```
  Deve restare vuoto. Tieni conto che GitHub Pages può impiegare qualche minuto a propagare le modifiche.
