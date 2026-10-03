# Audit di `londra.html` — sola lettura

Fotografia del sito di Londra al **3 ottobre 2026**, versione pubblicata dopo il merge #18 (`df02a0f`). Nessun file del sito è stato modificato: questo report e gli screenshot stanno solo sul branch `audit-ux-londra`.

**Come è stato misurato.** Chromium headless a **390 × 844 px** (telefono), `isMobile` e touch attivi, pagina servita dalla build locale (`npm run build` → `dist/londra.html`). Le librerie dai CDN (Leaflet, JsBarcode, Google Fonts) caricano normalmente. Uno "schermo" = 844 px di scroll. Salvo dove indicato, il pannello novità è considerato già letto, così non copre la pagina.

**Contesto d'uso tenuto presente.** Telefono, in strada, al freddo, spesso con una mano sola, a volte con poca rete. Alessandro lo apre spesso, Vale ogni tanto. Si usa prima del viaggio (controlli) e durante (cosa c'è adesso, dove andare, QR e biglietti ai varchi).

---

## STEP A — Struttura e contenuti

### A1 · Sezioni nell'ordine della pagina

Pagina intera: **19,5 schermi** con gli accordion nel loro stato di default, **30,9 schermi** con tutto aperto.

| # | Sezione (`id`) | Titolo visibile | Cosa contiene | Default | Schermi (default → tutto aperto) |
|---|---|---|---|---|---|
| 1 | testata (`header.hero`) | **Londra** | Badge "Viaggio di famiglia", date, "Alessandro, Vale e Olly", pulsante "Versione per immagini, per Olly", badge rosso **"4 da verificare"**, pulsante **"🌧️ Piove · NO"**, skyline disegnata | sempre visibile | 0,6 |
| 2 | `base` | Voli & base | Card voli BA (prenotato, €433,39, T5) e card alloggio Bright Carnaby Soho (indirizzo, €631, cancellazione gratuita), nota "i due buchi" sul bagaglio a mano, check-in Clevio, conferme dell'host, "perché questa zona" | aperta | 1,4 |
| 3 | `sicurezza` | Sicurezza | Accordion "⚠️ Verifica prenotazione — controlli anti-phishing": 5 regole (Booking.com, phishing già bloccato, chiamare la struttura, verifica completata) | **chiuso** | 0,2 → 0,9 |
| 4 | `programma` | Tre giorni, una zona al giorno | Card meteo (nascosta fino al 5/11), tre accordion-giorno con card fotografiche, percorsi Maps, note, plus | **domenica aperta**, lunedì e martedì chiusi | **6,9 → 16,6** |
| 5 | `orario` | Timeline dei tre giorni | Elenco ora per ora dei tre giorni (26 righe) + 3 note (Lina Stores, check-in Clevio, "orari proposti") | aperta | 1,9 |
| 6 | `biglietti` | 🎟️ Natural History Museum | Data e fascia oraria, **3 barcode CODE128** su fondo bianco con il numero sotto, nota "non prima delle 16:30", Order ID | aperta | 1,1 |
| 7 | `olly` | Il viaggio di Olly | Tre pulsanti Domenica/Lunedì/Martedì, card fotografiche con "L'ho visto!" (11 cose), contatore, accordion crediti | aperta, crediti chiusi | 2,9 → 3,9 |
| 8 | `mappa` | Dove andiamo | Mappa Leaflet (420 px) con marker colorati per giorno; legenda "linea piena = a piedi, tratteggiata = metro" | aperta | 0,7 |
| 9 | `budget` | Quanto ci costa | Tabella 6 voci + totale ~€1.550, stato prenotato/stima | aperto | 0,8 |
| 10 | `checklist` | Da fare prima di partire | 9 voci con checkbox e contatore; "le spunte restano solo finché la pagina è aperta" | aperta | 1,1 |
| 11 | `note` | Note pratiche | 4 note (metro gratis per Olly, una zona al giorno, bagaglio a mano, meteo) + box **passeggino a noleggio** con 3 servizi | aperta | 1,3 |
| 12 | `footer` | — | "Famiglia in viaggio · Londra 2026", link versione per immagini, link **"📋 Cosa è cambiato nel sito"** | — | 0,2 |
| — | `#novita` (overlay) | Cosa è cambiato | Pannello dal basso con le novità non lette; si apre da solo alla prima visita | chiuso dopo la lettura | — |
| — | `#daVer` (overlay) | Cose ancora da confermare | Pannello con le 4 voci di `DA_VERIFICARE_LONDRA.md` | si apre dal badge | — |

Accordion presenti e stato iniziale: *Verifica prenotazione* chiuso · **Domenica aperta** · Lunedì chiuso · Martedì chiuso · *Crediti fotografici* (Olly) chiuso · *Quanto ci costa* aperto · *Da fare prima di partire* aperto. Lo stato iniziale **non dipende dalla data**: anche il 16 novembre si apre domenica.

Altezza dei tre giorni aperti: domenica **6,4 schermi** (5.429 px), lunedì **6,0** (5.027 px), martedì **4,0** (3.344 px). Le intestazioni chiuse sono alte 78–91 px.

### A2 · Contenuto di ogni giorno, nell'ordine reale

Legenda delle colonne: **F** = foto · **⏱** = pillola durata · **M** = link "Apri in Google Maps" · **C** = credito della foto · **P** = nota visibile solo con *Piove*. Tutte le card con foto hanno l'orario sovrapposto all'immagine, tranne le *plus*.

**Domenica 15 — Southbank** (16 elementi)

| # | Tipo | Elemento | Orario | Mostra | Parole |
|---|---|---|---|---|---|
| 1 | QR parcheggio | Parcheggio aeroporto P1 Bologna | — | prenotazione, intestatario, **QR** (tocca per schermo pieno), entrata/uscita, €63 pagato, nota | 44 |
| 2 | trasporto | Aeroporto di Bologna | 05:15 | F C | 22 |
| 3 | trasporto | Volo BA547 | 07:00 | F C | 30 |
| 4 | percorso Maps | Heathrow → Southbank | — | 🚇 con i mezzi | 7 |
| 5 | trasporto | Arrivo a Heathrow | 08:40 | F C | 29 |
| 6 | trasporto | In metro verso il centro | 09:30 | F C | 48 |
| 7 | percorso Maps | Southbank → SEA LIFE → London Eye | — | 🚶 a piedi | 10 |
| 8 | tappa fissa | Southbank Centre e Winter Market | 10:45 | F ⏱45 min M C | 55 |
| 9 | tappa fissa | SEA LIFE London Aquarium | 12:45 | F ⏱1 h 45 M C | 57 |
| 10 | tappa fissa | London Eye *(nascosta con Piove)* | 15:30 | F ⏱30 min M C | 49 |
| 11 | alternativa | Shrek's Adventure! London *(solo con Piove)* | 15:30 | F M C, indirizzo, orario, avviso chiusura 16:00 | 88 |
| 12 | percorso Maps | London Eye → Lina Stores → Carnaby → casa | — | 🚶 a piedi | 10 |
| 13 | tappa fissa | Spesa da Lina Stores | 17:15 | F M C | 40 |
| 14 | tappa fissa | Luci di Carnaby Street | 17:45 | F M C | 38 |
| 15 | check-in | Check-in, zaini giù e cena | 18:15 | F M C | 44 |
| 16 | plus | M&M'S London | — | F M C, distanza, indirizzo, avviso prezzi | 63 |

**Lunedì 16 — Royal walk e museo** (18 elementi)

| # | Tipo | Elemento | Orario | Mostra | Parole |
|---|---|---|---|---|---|
| 1 | nota *(solo con Piove)* | "Mattina tutta all'aperto…": Harrods prima, museo fermo alle 16:30 | — | — | 40 |
| 2 | percorso Maps | Beak St → Trafalgar → Whitehall → Big Ben | — | 🚶 | 10 |
| 3 | tappa fissa | Si parte da Soho | 09:15 | F M C | 28 |
| 4 | tappa fissa | Trafalgar Square | 09:45 | F ⏱15 min M C | 37 |
| 5 | tappa fissa | Whitehall e Horse Guards | 10:30 | F ⏱20 min M C | 38 |
| 6 | tappa fissa | Big Ben e il Parlamento | 11:30 | F ⏱15 min M C | 32 |
| 7 | percorso Maps | Big Ben → St James's → Buckingham → Green Park | — | 🚶 | 12 |
| 8 | tappa fissa | St James's Park | 12:00 | F ⏱30 min M C | 34 |
| 9 | tappa fissa | Buckingham Palace | 12:45 | F ⏱20 min M C | 23 |
| 10 | tappa fissa | Green Park | 13:15 | F ⏱30–45 min M C | 28 |
| 11 | percorso Maps | Green Park → Harrods | — | 🚇 | 8 |
| 12 | tappa fissa | Harrods | 14:30 | F ⏱1 h M C | 31 |
| 13 | percorso Maps | Harrods → Natural History Museum | — | 🚶 | 8 |
| 14 | tappa fissa | Natural History Museum | 16:30 | F ⏱1 h 15 M C + link **"🎟️ I biglietti"** | 46 |
| 15 | percorso Maps | Museo → Piccadilly Circus | — | 🚇 | 8 |
| 16 | percorso Maps | Piccadilly Circus → luci Regent Street → casa | — | 🚶 | 10 |
| 17 | tappa fissa | Luci di Regent Street | 18:00 | F M C | 31 |
| 18 | plus | M&M'S London | — | come domenica | 63 |

**Martedì 17 — Covent Garden e rientro** (10 elementi)

| # | Tipo | Elemento | Orario | Mostra | Parole |
|---|---|---|---|---|---|
| 1 | percorso Maps | Beak St → Covent Garden | — | 🚶 | 8 |
| 2 | check-out | Check-out, zaini in spalla | 10:30 | F M C | 42 |
| 3 | tappa fissa | Covent Garden | 11:00 | F ⏱1–2 h M C **P** ("già al riparo") | 49 |
| 4 | percorso Maps | Covent Garden → Heathrow T5 | — | 🚇 | 9 |
| 5 | trasporto | Partenza per Heathrow | 15:15 | F C | 45 |
| 6 | trasporto | Heathrow, Terminal 5 · BA546 | 16:10 | F C | 29 |
| 7 | trasporto | Volo BA546 | 18:10 | F C | 26 |
| 8 | trasporto | Atterraggio a Bologna | 21:25 | F C | 17 |
| 9 | plus | Benjamin Pollock's Toyshop | — | F M C, posizione | 49 |
| 10 | plus | M&M'S London | — | come domenica | 63 |

Constatazioni:
- Le card di **trasporto** (aeroporti, voli, metro) non hanno un link Maps.
- Il **link Maps della singola tappa** e il **pulsante "Percorso"** convivono nello stesso blocco: per ogni tratto a piedi ci sono quindi due modi diversi di aprire Maps, a pochi centimetri di distanza.
- Su 44 elementi dei tre giorni, **11 sono pulsanti "Percorso"** che si alternano alle card: domenica 3, lunedì 6, martedì 2.
- "Si parte da Soho" (lunedì 09:15) usa la foto dell'angolo Dean Street / Old Compton Street, che non è Beak Street.
- La card **Partenza per Heathrow** (martedì) riusa la foto della stazione Bakerloo di Edgware Road della domenica.

### A3 · Elementi fissi o fluttuanti

| Elemento | Posizione | Quando si vede |
|---|---|---|
| Sfondo animato `div.aurora` | `fixed` | sempre, decorativo |
| Pannello novità `#novita` | `fixed`, sale dal basso; pulsante "Ho capito" `sticky` | alla prima visita o quando ci sono novità; poi dal link in fondo alla pagina |
| Pannello "da verificare" `#daVer` | `fixed`; pulsante "Chiudi" `sticky` | toccando il badge in testata |
| QR a schermo pieno `.pk-full` | `fixed`, bianco | toccando il QR del parcheggio |

**Non ci sono** barre di navigazione fisse, menu, indice delle sezioni, pulsante "torna su" o scorciatoie verso QR e biglietti. Il **badge "4 da verificare"**, il **pulsante "🌧️ Piove"** e il link "Versione per immagini, per Olly" stanno nella testata e **scorrono via con la pagina**: dopo 0,6 schermi non sono più raggiungibili senza tornare in cima.

### A4 · Parole

Parole per sezione, compreso il testo dentro gli accordion chiusi:

| Sezione | Parole |
|---|---|
| testata | 25 |
| Voli & base | 233 |
| Sicurezza | 111 |
| **Programma** | **1.498** |
| Timeline | 217 |
| Biglietti | 84 |
| Olly | 197 |
| Mappa | 24 |
| Budget | 45 |
| Checklist | 114 |
| Note pratiche | 261 |
| footer | 15 |
| **Totale** | **~2.820** |

Le 10 card più lunghe (percorsi esclusi):

| # | Card | Giorno | Parole |
|---|---|---|---|
| 1 | Shrek's Adventure! London (solo con Piove) | dom | 88 |
| 2–4 | M&M'S London (identica, tre volte) | dom, lun, mar | 63 ciascuna |
| 5 | SEA LIFE London Aquarium | dom | 57 |
| 6 | Southbank Centre e Winter Market | dom | 55 |
| 7 | Covent Garden (con la nota Piove) | mar | 49 |
| 8 | Benjamin Pollock's Toyshop | mar | 49 |
| 9 | London Eye | dom | 49 |
| 10 | In metro verso il centro | dom | 48 |

Le card più lunghe sono **le opzionali** (Shrek, M&M'S, Pollock's), non le tappe del programma.

### A5 · Informazioni ripetute

Conteggio dei blocchi che riportano la stessa informazione (card, voci di elenco, note, righe):

| Informazione | Dove compare |
|---|---|
| Orari dei tre giorni | **Due volte per intero**: nelle card del Programma e nella sezione Timeline, che è un elenco degli stessi orari subito sotto |
| Lina Stores chiude alle 18:00 | Programma ×3 (card Lina, nota, percorso) · Timeline ×2 |
| Bagaglio a mano / zaini | Voli & base ×1 · Programma ×5 · Timeline ×2 · Note pratiche ×1 |
| Zaini fino a 30 litri / 46 × 33 × 20 cm | Programma ×2 (SEA LIFE, London Eye) · Note pratiche ×1 |
| Check-out alle 10:30 | Voli & base ×1 · Programma ×2 · Timeline ×3 · pannello da verificare ×1 |
| Check-in Clevio / ore 15:00 | Voli & base ×2 · Sicurezza ×1 · Programma ×1 · Timeline ×1 |
| Terminal 5 | Voli & base ×1 · Programma ×3 · Timeline ×3 |
| Numeri dei voli BA547 / BA546 | Programma ×3 · Timeline ×3 · Budget ×1 |
| Museo, ingresso alle 16:30 | Programma ×2 · Timeline ×1 · Biglietti ×2 |
| **M&M'S London** | Programma ×3: card identica in fondo a ogni giorno (voluto) |
| Cambio della guardia da verificare | Programma ×1 (card Horse Guards) · Checklist ×1 ("~3 mesi prima") · pannello da verificare ×1 |
| Winter Market da verificare | Programma ×1 · Timeline ×1 · Checklist ×1 · pannello da verificare ×1 |
| Biglietti London Eye + SEA LIFE da comprare | Budget ("stima") · Checklist · pannello da verificare |
| Passeggino a noleggio | Checklist ("Piano B passeggino") · Note pratiche (box) |
| Meteo / pioggia | Note pratiche ("Meteo novembre") · pulsante Piove · card meteo (dal 5/11) |
| "Versione per immagini, per Olly" | testata · footer |

Constatazioni:
- **Le "cose da fare prima di partire" stanno in due posti che non si parlano**: la Checklist in fondo alla pagina (9 voci, spunte che si perdono ricaricando) e il pannello "4 da verificare" in testata. Tre voci sono in entrambi.
- La voce di checklist **"Verificare calendario cambio della guardia — ~3 mesi prima"** è ferma a un'indicazione temporale ormai superata: a oggi mancano 6 settimane.
- La sezione **Timeline** ripete per intero il programma, ma senza link né percorsi.
