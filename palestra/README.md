# Palestra — PWA allenamento full body

App installabile, offline-first, senza backend. HTML/CSS/JS vanilla: nessun
build step, nessuna dipendenza.

**Online:** https://alessandrovizzini1986-a11y.github.io/barcellona-40/palestra/

## File

| File | Ruolo |
|---|---|
| `index.html` | struttura, due tab + popup descrizione |
| `style.css` | tema scuro, mobile-first, tap target 44px |
| `app.js` | scheda, stato, timer, progressione, grafico, backup |
| `sw.js` | service worker, cache dell'app shell |
| `manifest.webmanifest` | installazione su iPhone/Android |
| `icon-*.png` | icone 192/512 + maskable + apple-touch |

## Dati

Tutto in `localStorage`, chiavi `palestra_dati_v1` (sessioni) e
`palestra_timer_v1` (fine del recupero in corso). Nessun dato lascia il
telefono. Il backup si fa a mano da Storico → Esporta JSON.

## Scelte non ovvie

- **Il timer usa un timestamp di fine, non un contatore.** `setInterval` viene
  rallentato o congelato quando lo schermo si blocca: al ritorno il conto
  sarebbe sbagliato. Salvando l'istante di fine il countdown è sempre corretto,
  e sopravvive anche a un ricaricamento della pagina.
- **`[hidden]{display:none!important}` in cima al CSS.** La barra del timer ha
  `display:flex`, che vince sull'attributo `hidden` del browser: senza quella
  regola resta visibile per sempre.
- **Gli input non vengono ri-renderizzati mentre scrivi.** Il salvataggio
  aggiorna lo stato e solo i totali; se rigenerassimo le card a ogni tasto, il
  cursore salterebbe.
- **Spuntare una serie avvia il recupero.** È il gesto che si fa comunque, e
  in palestra un tap in meno conta.

## Deploy gratuito

Il sito è già pubblicato da GitHub Pages: il workflow `.github/workflows/pages.yml`
alla radice del repo pubblica tutta la cartella a ogni push su `main`. Per
aggiornare l'app basta modificare i file in `palestra/` e pushare.

Alternative gratuite equivalenti, se un giorno servisse:
- **Netlify / Cloudflare Pages** — colleghi il repo, cartella da pubblicare
  `palestra`, nessun comando di build.
- **Vercel** — stesso principio, preset "Other".

Requisito comune: servire da **HTTPS**, altrimenti il service worker non parte
e l'app non si installa né funziona offline (`localhost` fa eccezione).
