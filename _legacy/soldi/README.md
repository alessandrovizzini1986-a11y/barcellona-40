# Soldi

Budget mensile personale in un solo file (`index.html`), PWA offline, dati in `localStorage` (chiave `soldi:v1`).
URL: https://alessandrovizzini1986-a11y.github.io/barcellona-40/soldi/

## Flusso seed (anti-perdita dati)
1. Nell'app: Impostazioni → **Esporta backup** (scarica `soldi-backup-AAAA-MM-GG.json` e lo copia negli appunti).
2. Incolla il JSON a Claude: lo mette in `soldi/seed.json` con `seedVersion` + 1 e committa.
3. All'avvio, se il `localStorage` è vuoto l'app carica `seed.json`; se esiste ma il seed ha `seedVersion` maggiore, fa il **merge** per `id` (vince il record con `updatedAt` più recente), mai sovrascrittura cieca.
4. Cambiando telefono o svuotando il browser, i dati tornano dal seed all'apertura.
5. In Impostazioni → **Importa backup** si può anche ricaricare un file a mano (unisci o sostituisci).

## Sviluppo
Nessun build: apri `index.html` da un server statico. Per simulare una data: `?today=2026-10-27`. Per aprire subito il tastierino: `?action=add`.
Versione cache del service worker in `sw.js` (`VERSION`): alzala a ogni release.
