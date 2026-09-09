# Soldi — PROGRESS

App budget personale in `soldi/`, pubblicata su
https://alessandrovizzini1986-a11y.github.io/barcellona-40/soldi/

Punto di ripresa: se la sessione si interrompe, si riparte dalla prima
voce non spuntata.

## Decisioni prese in autonomia
- Deploy: il workflow Pages pubblica solo da `main` → i commit vengono
  pushati sia sul branch di lavoro `claude/soldi-autonomy-test-37139h`
  sia su `main` (come richiesto nel prompt).
- Sotto-app con `sw.js` proprio (stesso pattern di `gym/`), scope `./`.
- Screenshot: Chromium headless nel sandbox non esce in rete (TLS reset
  sul proxy); le richieste del browser vengono servite tramite `curl` con
  `page.route`. Font Google e Chart.js caricano correttamente così.

## Fase 0 — Test di autonomia
- [x] Repo letto (workflow `deploy-pages.yml`, push su `main` → Pages, root `.`)
- [x] `soldi/PROGRESS.md` + `soldi/index.html` placeholder
- [x] Commit + push, workflow verde (run #347), `/soldi/` risponde
- [x] Verifica tooling: file, commit, push, esito Actions, CDN (Fonts, Chart.js), Playwright screenshot `screenshots/test.png`

## Fase 1 — Core (MVP) ✅
Note: grafici (ciambella, barre) in SVG a mano, niente Chart.js. Test
funzionali Playwright (scratch `test.mjs`): flusso 3 tap, undo, rollover
mese, split 70/30, export/import, merge seed, mese negativo → tutti verdi.
- [x] A. Home "Oggi": safe-to-spend gigante, residuo mese · giorni alla paga, colore verde/ambra/rosso
- [x] A. Barra risparmio 0→300 con proiezione a fine mese
- [x] A. Riformulazione "300 € = 10 €/giorno"
- [x] A. Griglia 6 categorie preferite → tastierino → salva (max 3 tap), toast 2 s con undo
- [x] A. Bottone "+" fisso in basso
- [x] B. Tastierino: cifre grandi, virgola, quick amounts 2/5/10/20/50, nota, data (oggi/ieri), vibrazione
- [x] C. Mese: riepilogo stipendio/fissi/variabili/risparmio vs 300/delta/giorni
- [x] C. Ciambella categorie, barre giornaliere con linea budget/giorno, confronto mese precedente
- [x] C. Lista spese per giorno, tap = modifica, swipe sinistra = elimina con undo
- [x] C. Chiusura automatica al giorno di paga (archivio, pagella, reset)
- [x] D. Obiettivi: multipli, precaricati Fondo emergenza 3000 / Barcellona 300
- [x] D. Barra progresso + "mancano X · a questo ritmo N mesi"; Traguardo annuo 6.400
- [x] D. Entrate straordinarie (tredicesima/quattordicesima/extra) con split %
- [x] D. Versamento automatico risparmio a chiusura mese
- [x] E. Impostazioni: stipendio, fissi con sotto-voci, obiettivo, giorno paga, categorie, quick amounts, export/import, reset doppia conferma, versione, link README
- [x] Seed JSON: `seed.json` + caricamento/merge per `seedVersion`
- [x] PWA: `manifest.json`, icone 192/512, shortcut "Aggiungi spesa", `sw.js`
- [x] `README.md` (flusso seed in 5 righe)
- [x] Screenshot 390x844 Home/Tastierino/Mese/Obiettivi dark+light, guardati e corretti
- [x] Commit "feat(soldi): core MVP" + deploy

## Fase 2 — Gamification ✅
Scelte: no-spend day rilevati all'apertura solo per gli ultimi 3 giorni
(se sparisci una settimana non regalo XP); il gelo dello streak vale solo
tra due giorni attivi; sfida settimanale vinta = +30 XP (non in specifica,
aggiunto perché una sfida senza premio è moscia); badge sbloccati durante
la chiusura mese sono elencati nella Pagella invece di aprire 3 modali.
- [x] XP (+10 spesa max 5/g, +25 no-spend day, +50 settimana sotto budget, +200 mese ≥300, +100 obiettivo)
- [x] Livelli ironici Lv1→Lv10, barra XP visibile
- [x] Streak di registrazione con 1 gelo/mese
- [x] Badge (max 12, reali)
- [x] Sfida settimanale automatica sui dati
- [x] Insight concreti in home (rotazione)
- [x] Fresh start: "Nuovo mese 🚀" + Pagella
- [x] Celebrazione (confetti + vibrazione) solo su eventi reali
- [x] Città che cresce (skyline SVG, 1 edificio / 100 €, monumento per tredicesima)
- [x] Screenshot + commit "feat(soldi): gamification" + deploy

## Fase 3 — Rifinitura ✅
Lighthouse mobile (locale): performance 99, accessibility 100, best
practices 96 (unico rilievo: il Chrome di Lighthouse nel sandbox non
raggiunge Google Fonts). File 128 KB, font caricati non bloccanti.
Ricerca spese e ricorrenti variabili erano già in Fase 1.
- [x] Onboarding 3 schermate
- [x] Scorciatoia PWA "Aggiungi spesa" → tastierino
- [x] Ricerca/filtro spese; spese ricorrenti variabili
- [x] Accessibilità base (contrasto AA, focus, aria-label)
- [x] Performance (< 250 KB, prima interazione < 1 s)
- [x] Screenshot + commit + deploy

## Fase 4 — QA ✅
Test automatici Playwright (scratch `test.mjs`, `offline.mjs`) su date
simulate con `?today=`; tutti verdi all'ultimo build.
- [x] 1. Safe-to-spend: 27 set (giorno 1) 16,67 €/g (500/30) · 12 ott 33,33 €/g (500/15, 0 spese) · 26 ott (ultimo giorno) residuo intero. Con 400 € spesi, il 26 ott mostra 100 €.
- [x] 2. Cambio mese: 200 € spesi → archivio con saved 600, versamento 420/180 (70/30), Pagella "Nuovo mese" dopo la celebrazione; salto di 2 mesi → 2 archivi.
- [x] 3. Mese con 0 spese: proiezione 800 €, nessun errore. Spesa 650 € (> 500): home mostra 0 € e "oltre budget di 150 €", proiezione negativa con "spendi max X da qui alla paga"; chiusura a −100 → nessun versamento, nessun crash.
- [x] 4. Tredicesima 1400 precompilata, split 70/30 → 980 / 420; traguardo annuo la conta; badge 🎄.
- [x] 5. Export → reset → import: settings/categorie/spese/obiettivi/versamenti/mesi identici. Seed v+1: unione per id, vince updatedAt più recente; stessa versione ignorata.
- [x] 6. Offline: SW attivo con cache soldi-v4 (shell + seed + icone), reload con rete staccata apre l'app, spesa salvata offline persiste dopo il reload.
- [x] 7. Undo su salvataggio (toast) e su elimina (swipe/lista): entrambi ripristinano.
- [x] 8. Nessun errore in console in tutti gli scenari (unico "errore" nel sandbox: font Google irraggiungibili dal Chrome di Lighthouse). Lighthouse mobile: performance 99, accessibility 100, best practices 96. Manifest con icone 192/512/maskable, display standalone, shortcut "Aggiungi spesa" → apre il tastierino.
- [x] 9. Revisione visiva: 17 screenshot dark+light rifatti e guardati; corretti bottone orfano in home, legenda che sforava la card, barra XP che allargava il viewport, toast sopra il tastierino, pill risparmio confusa.
Bug trovati e corretti in QA: registrazione SW che dipendeva dall'evento
load (poteva non partire), streak con "gelo" conteggiato ai bordi, modali di
celebrazione che si sovrascrivevano (ora in coda).

## Post-consegna (8 set)
- [x] Fix scroll Android: tolti overflow-x:hidden/overscroll-behavior su html/body (SW v5)
- [x] "Questo mese è diverso": override per singolo mese di entrate/fissi/obiettivo (bottone nel Mese, `monthOverrides` nel seed, merge per updatedAt)
- [x] Seed v2: 10 movimenti bancari 28 ago → 8 set + ricorrente McFIT + mese 27 ago→26 set con obiettivo 0 (SW v6)

- [x] 9 set: il repo è diventato un progetto Vite e `soldi/` era finita in `_legacy/` (non pubblicata) → spostata in `public/soldi/`, stesso URL

## Fase 5 — Consegna
- [x] Ultimo commit, deploy verde, messaggio finale
