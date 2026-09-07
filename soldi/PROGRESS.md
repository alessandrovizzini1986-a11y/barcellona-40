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

## Fase 3 — Rifinitura
- [ ] Onboarding 3 schermate
- [ ] Scorciatoia PWA "Aggiungi spesa" → tastierino
- [ ] Ricerca/filtro spese; spese ricorrenti variabili
- [ ] Accessibilità base (contrasto AA, focus, aria-label)
- [ ] Performance (< 250 KB, prima interazione < 1 s)
- [ ] Screenshot + commit + deploy

## Fase 4 — QA
- [ ] 1. Safe-to-spend il 27, il 12, il 26
- [ ] 2. Cambio mese finanziario: archivio, pagella, versamento
- [ ] 3. Mese con 0 spese; mese con spesa > 500
- [ ] 4. Tredicesima 1400 split 70/30
- [ ] 5. Export → reset → import identico; merge seed v+1
- [ ] 6. Offline
- [ ] 7. Undo su elimina e su salvataggio
- [ ] 8. Console pulita; PWA installabile
- [ ] 9. Revisione visiva finale (dark+light)

## Fase 5 — Consegna
- [ ] Ultimo commit, deploy verde, messaggio finale
