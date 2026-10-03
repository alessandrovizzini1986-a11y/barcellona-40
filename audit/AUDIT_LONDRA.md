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

---

## STEP B — Interazioni e stati

### B1 · Elementi cliccabili

In tutta la pagina ci sono **134 elementi cliccabili**. **79 portano fuori dal sito**: 76 in una nuova scheda, 3 nella stessa.

| Dove | Elemento | Quanti | Cosa fa | Esce dal sito |
|---|---|---|---|---|
| Testata | "🖼️ Versione per immagini, per Olly →" | 1 | apre `londra-illustrata.html` nella stessa scheda | no (altra pagina) |
| Testata | Badge **"4 da verificare"** | 1 | apre il pannello "Cose ancora da confermare" | no |
| Testata | **"🌧️ Piove · NO/SÌ"** | 1 | accende/spegne il piano pioggia (vedi B2) | no |
| Voli & base | "📍 Apri in Google Maps" (appartamento) | 1 | Maps su 79 Beak Street | **sì**, nuova scheda / app Maps |
| Sicurezza | intestazione accordion | 1 | apre/chiude le regole anti-phishing | no |
| Programma | intestazioni dei tre giorni | 3 | aprono/chiudono il giorno; **più giorni possono essere aperti insieme** | no |
| Programma | riquadro QR del parcheggio | 1 | apre il QR **a schermo pieno** su fondo bianco, con wake lock; si chiude con ✕, Esc o tocco | no |
| Programma | pulsanti **"🗺️ Percorso · …"** | 11 | aprono un percorso in Google Maps (a piedi o coi mezzi) | **sì**, nuova scheda |
| Programma | "📍 Apri in Google Maps" sulle card | 23 | aprono la singola tappa in Maps | **sì**, nuova scheda |
| Programma | crediti delle foto ("foto: Autore / Licenza") | 27 | aprono la pagina del file su Wikimedia Commons | **sì**, nuova scheda |
| Programma | "🎟️ I biglietti" (card del museo) | 1 | salta alla sezione Biglietti (`#biglietti`) | no |
| Olly | Domenica / Lunedì / Martedì | 3 | cambiano il gruppo di card mostrate | no |
| Olly | "L'ho visto!" | 11 | segnano la cosa come vista e aggiornano il contatore | no |
| Olly | crediti fotografici (accordion + 11 link) | 12 | aprono i crediti / le pagine Commons | **sì** per i link |
| Mappa | marker | 14 | aprono un popup con nome, giorno e una nota; **nessun link a Maps nel popup** | no |
| Mappa | zoom + / − | 2 | zoom della mappa | no |
| Mappa | attribuzioni Leaflet / OpenStreetMap / CARTO | 3 | aprono i siti delle attribuzioni **nella stessa scheda** | **sì, e si perde la pagina** |
| Budget, Checklist | intestazioni accordion | 2 | aprono/chiudono | no |
| Checklist | caselle | 9 | spuntano la voce e aggiornano "N su 9 completate" | no |
| Note pratiche | Baboodle, London Baby Equipment Hire, Babonbo | 3 | siti dei noleggiatori | **sì**, nuova scheda |
| Footer | "Versione per immagini" + **"📋 Cosa è cambiato nel sito"** | 2 | altra pagina / pannello novità con tutto lo storico | no |
| Pannelli | "Ho capito", "Chiudi" | 2 | chiudono il pannello (anche Esc o tocco fuori) | no |

Constatazioni:
- **I tre barcode del museo non hanno un "tocca per ingrandire"**, a differenza del QR del parcheggio. Nella card del museo c'è il link "🎟️ I biglietti", che porta più in basso nella pagina.
- I **27 link ai crediti** stanno nelle card, sotto i link Maps.
- La **mappa** è alta 420 px, cioè metà schermo. Lo zoom con la rotella è disattivato, ma **il trascinamento è attivo**: col dito su quella metà di schermo si sposta la mappa invece di scorrere la pagina.
- I **tre link di attribuzione** della mappa sono gli unici che lasciano il sito nella stessa scheda.

### B2 · Stati del sito

| Stato | Come si attiva | Cosa cambia | Sopravvive a una ricarica |
|---|---|---|---|
| **Piove · SÌ** | pulsante in testata | Domenica: la card **London Eye → Shrek's Adventure** (stessa ora 15:30, con indirizzo, orario e avviso "chiude alle 16:00"). Lunedì: nota azzurra in testa alla mattina. Martedì: nota "già al riparo" su Covent Garden. Il pulsante diventa azzurro, "SÌ" | **no**, torna su NO |
| Piove: cosa **non** cambia | — | Timeline (dice ancora *London Eye* alle 15:30), mappa (marker del London Eye), percorsi Maps (sempre verso l'Eye), sezione Note pratiche | — |
| **Meteo** | data del telefono fra il 5 e il 17 novembre, oppure `?now=AAAA-MM-GG` | Fuori finestra (oggi, 3 ottobre) la card non esiste e l'API non viene chiamata. Con `?now=2026-11-16` la pagina chiama Open-Meteo: **oggi l'API risponde 400 "start_date fuori dall'intervallo"** (accetta date fino al 18 ottobre) e la card sparisce. Con una risposta valida simulata la card compare in cima al Programma: "🌤️ 9° Londra, adesso" + Dom/Lun/Mar; toccandola si apre la striscia ora per ora già posizionata su **Lun 16** | non serve: si ricalcola a ogni apertura |
| **Novità** | prima visita, o versione salvata inferiore all'ultima (oggi 13) | Pannello dal basso, alto **692 px su 844**: copre quasi tutto lo schermo finché non si tocca "Ho capito" | sì (`localStorage`, unica chiave della pagina) |
| **Badge "N da verificare"** | sempre | Oggi **4**, uguale alle voci del pannello e del file `DA_VERIFICARE_LONDRA.md` | non ha stato |
| **Accordion** | tocco sull'intestazione | All'apertura sempre: domenica aperta, lunedì e martedì chiusi, budget e checklist aperti, sicurezza e crediti chiusi. Non sono esclusivi | **no**, si ritorna allo stato iniziale |
| **Checklist** | caselle | Contatore "N su 9 completate" | **no**: verificato, 1 su 9 → 0 su 9 dopo la ricarica |
| **Olly "L'ho visto!"** | pulsanti | Contatore "N cose viste su 11" | **no**: 1 su 11 → 0 su 11 dopo la ricarica |
| **QR a schermo pieno** | tocco sul QR | Overlay bianco, schermo che resta acceso | — |

Screenshot: `B-novita-prima-visita.png` (pannello alla prima visita), `B-meteo-16nov.png` (card meteo aperta il 16, con dati simulati).

### B3 · "Adesso / prossima tappa"

**Non esiste.** La pagina non usa l'ora per nient'altro che il meteo: non evidenzia la tappa in corso, non apre il giorno corrente, non scorre fino a "adesso". L'unica cosa legata all'ora è la striscia del meteo, che il giorno stesso parte dall'ora attuale; il meteo però si vede solo dal 5 novembre. L'unica occorrenza della parola "adesso" nel programma è "gli zaini si posano solo adesso" (card del check-in), oltre a "Londra, adesso" nella card meteo.

### B4 · Senza rete

C'è un `manifest` per aggiungere la pagina alla schermata Home, ma **non c'è nessun service worker**: niente viene salvato per l'uso offline.

| Situazione | Cosa si vede | Screenshot |
|---|---|---|
| **Ricarica senza rete** (pagina già visitata, poi telefono offline, poi ricarica o riapertura) | **La pagina non si carica affatto**: schermata "No internet" del browser. Niente QR del parcheggio, niente biglietti, niente programma | `B-offline-ricarica.png` |
| **Rete scarsa**: arriva la pagina ma non i CDN (Leaflet, JsBarcode, Google Fonts, tile della mappa, meteo) | **QR del parcheggio OK** (è disegnato dentro la pagina). **Barcode del museo: riquadri bianchi vuoti**, sotto c'è il numero e "Barcode non caricato: mostra questo numero all'ingresso". **Mappa: rettangolo vuoto** senza messaggio, e un errore JavaScript (`L is not defined`) che però non blocca il resto. Titoli col font di riserva. Piove, badge, durate, Olly e checklist funzionano | `B-rete-scarsa-biglietti.png`, `B-rete-scarsa-mappa.png` |
| **Rete che cade a pagina già aperta** | All'apertura il telefono ha caricato **1 foto su 31**: le altre sono in lazy loading e arrivano solo scorrendo. Aprendo lunedì dopo che la rete è caduta, **0 foto su 11**: al loro posto il simbolo di immagine rotta, con il testo alternativo sopra il motivo decorativo | `B-offline-lunedi.png` |
| Link Maps senza rete | Aprono Google Maps, che senza rete non calcola i percorsi | — |

---

## STEP C — Prestazioni e accessibilità

### C1 · Peso e richieste

Misurato sulla **pagina pubblicata** (GitHub Pages), senza cache.

| Momento | Richieste | Peso trasferito |
|---|---|---|
| **Primo caricamento** (fino all'evento `load`, senza scroll) | **20** | **588 KiB** |
| **Tutta la pagina** (scorsa fino in fondo, tre giorni aperti, Piove acceso, i tre giorni di Olly) | **55** | **2.612 KiB** |

Primo caricamento per tipo:

| Tipo | Richieste | KiB | Da dove |
|---|---|---|---|
| Immagini | 12 | 415 | **5 JPG della sezione Olly (378 KiB)**, 1 foto del programma (blq, 25 KiB), 6 tile della mappa (CARTO, 17 KiB) |
| Font | 2 | 77 | Google Fonts (Playfair Display) |
| JavaScript | 2 | 53 | Leaflet 1.9.4 da unpkg (42 KiB), JsBarcode 3.12.3 da cdnjs (10 KiB) |
| HTML | 1 | 35 | `londra.html` (139 KB non compressi: tutto CSS e JS sono dentro) |
| CSS | 2 | 6 | Leaflet da unpkg, CSS di Google Fonts |
| Altro | 1 | 2 | manifest |

Constatazioni:
- **Il 64% del primo caricamento sono le foto di Olly.** Le card di Olly usano le foto come `background-image` CSS, che non si possono caricare in differita: le 5 di domenica arrivano subito anche se la sezione è a 12 schermi di distanza. Sono JPG e non WebP, e stanno fuori dal tetto di 1,5 MB, che vale solo per `assets/tappe/londra/`. Le foto del programma invece sono in lazy loading: all'apertura ne arriva una sola.
- La cartella `_legacy/img/olly/` contiene **3 foto che nessuna pagina usa**: `albero-natale.jpg`, `golden-hinde.jpg`, `tower-bridge.jpg`, 243 KB. Non vengono scaricate, ma sono nel sito pubblicato.
- La pagina dipende da **6 host esterni**: unpkg, cdnjs, Google Fonts (2 host), CARTO e Open-Meteo dal 5/11.

### C2 · Tempi su 4G simulato

Due metodi, che danno numeri diversi:

| Metodo | Rete | Primo contenuto visibile (FCP) | Pagina caricata |
|---|---|---|---|
| **Lighthouse**, simulazione "slow 4G" (modello standard di Lighthouse) | 1,6 Mbit/s, latenza 150 ms + 560 ms per richiesta, CPU ×4 | **3,1 s** | Time to Interactive 4,0 s; LCP 3,9 s; Speed Index 5,4 s |
| **Chromium con throttling DevTools**, mediana di 3 prove | 1,6 Mbit/s, 150 ms, CPU ×4 | **1,0 s** | DOM pronto 1,9 s · `load` **3,4 s** (3,4–3,7) |
| Chromium con throttling DevTools, mediana di 3 prove | 4G buono: 9 Mbit/s, 40 ms, CPU ×2 | 0,6 s | DOM pronto 0,8 s · `load` **1,2 s** |

Lighthouse è volutamente pessimista: aggiunge una latenza alta a ogni richiesta, e la pagina ne fa 20 verso 9 host. Il throttling di DevTools rallenta la banda ma non simula quel costo. Una rete scarsa in strada sta fra le due misure.

### C3 · Lighthouse mobile

Report completo: `audit/lighthouse-mobile.html`.

| Categoria | Punteggio |
|---|---|
| **Performance** | **74** |
| **Accessibility** | **95** |
| **Best Practices** | **100** |

Problemi segnalati.

**Performance**

| Problema | Dettaglio |
|---|---|
| Risorse che bloccano il rendering, ~470 ms | CSS di Leaflet (unpkg) e CSS di Google Fonts nell'`<head>` |
| Immagini fuori schermo non differite, 379 KiB | le 5 foto di Olly e le tile della mappa |
| Formati moderni, 133 KiB risparmiabili | le stesse 5 foto di Olly in JPG |
| Cache breve, 371 KiB | GitHub Pages serve tutto con cache di 10 minuti |
| JavaScript non usato, 24 KiB | parte di Leaflet |
| DOM molto grande | 1.390 elementi |
| Lavoro sul thread principale | 3,4 s con CPU ×4; Max Potential First Input Delay 440 ms |
| Reflow forzati | segnalati senza dettaglio |
| HTTP/1.1 invece di HTTP/2, 8 richieste | Probabilmente dovuto al proxy dell'ambiente di test: GitHub Pages di norma usa HTTP/2. Da ricontrollare da un telefono |

**Accessibility**

| Problema | Dettaglio |
|---|---|
| Attributo ARIA non ammesso | `aria-label="nuovo"` sui pallini rossi del pannello novità: uno `span` senza ruolo |
| Titoli non in ordine | un `<h3>` (card Voli) senza `<h2>` prima nella stessa sezione |
| Nome accessibile diverso dal testo visibile | il badge mostra "4 da verificare" ma lo screen reader legge "4 cose da verificare: apri l'elenco"; il QR mostra "Tocca per ingrandire" ma si chiama "Ingrandisci il QR del parcheggio a schermo pieno" |

**Best Practices:** nessun problema.

### C4 · Accessibilità pratica

**Dimensione del testo.** Su 538 testi visibili (con tutti gli accordion aperti):

| Dimensione | Quanti | Dove |
|---|---|---|
| **8,5 px** | 3 | le sigle **DOM / LUN / MAR** sotto i numeri dei giorni, in più con opacità 0,8 (il calcolo del contrasto qui sotto non tiene conto dell'opacità) |
| 9,5–10,5 px | 14 | etichette maiuscole Prenotazione / Intestatario / Entrata / Uscita del parcheggio, Check-in / Check-out, Data / Ingresso dei biglietti, "no / sì" del pulsante Piove, "Pagato", intestazioni della tabella budget |
| **11–11,5 px** | 142 | **tutti i "📍 Apri in Google Maps"** (23), tutti i crediti delle foto (30 + 11 link), le pillole "a piedi / con i mezzi" dei percorsi, gli stati del budget |
| 12–14,5 px | 282 | testo corrente delle card (13,5 px) e delle note |
| ≥ 15 px | 97 | titoli |

**Contrasto** (WCAG, calcolato sui colori effettivi; testi sopra le foto e titolo sfumato esclusi):
- **Nessun testo sotto la soglia AA** (4,5:1). I due casi segnalati dal calcolo sono falsi positivi: il titolo "Londra" e il pulsante per Olly, che hanno uno sfondo a gradiente non visibile al calcolo.
- Il **grigio del testo corrente** `#9aa3b5` (113 testi) sta fra **5,9 e 7,3:1**.
- Il **grigio dei crediti** `#79839a` (57 testi, 11 px) sta fra **4,6 e 4,9:1**: appena sopra il minimo AA e sotto il livello AAA (7:1).

**Leggibilità al sole**
- La pagina è **solo in tema scuro**: non c'è una versione chiara né un adattamento al tema del telefono.
- Su fondo scuro e al sole contano soprattutto il grigio medio a 13,5 px del testo delle card e il grigio dei crediti a 11 px. Entrambi sono sotto il 7:1 che serve per leggere comodamente all'aperto.
- Le etichette in maiuscolo da 9,5–10,5 px (orari d'ingresso, date) sono le più piccole fra le informazioni operative.

**Bersagli touch.** **101 elementi cliccabili su 125 visibili sono sotto 44 × 44 px.**

| Elemento | Quanti | Misura (px) |
|---|---|---|
| Crediti delle foto (programma) | 27 | 13 di altezza |
| "📍 Apri in Google Maps" | 23 | 169 × 25 |
| Marker della mappa | 14 | 22 × 22 o 30 × 30 |
| Crediti delle foto (Olly) | 11 | 14 di altezza |
| Caselle della checklist | 9 | 22 × 22 |
| Zoom + / − della mappa | 2 | 30 × 30 |
| Link dei noleggiatori | 3 | 16 di altezza |
| Link nel footer | 2 | 15–19 di altezza |
| Badge "da verificare" | 1 | 144 × 34 |
| **Pulsante Piove** | 1 | 124 × 33 |
| Pulsanti Domenica/Lunedì/Martedì di Olly | 3 | 113 × 37 |

Sono sopra i 44 px di altezza i pulsanti "Percorso", le intestazioni dei giorni, il riquadro del QR, "L'ho visto!" e i pulsanti dei pannelli. **Il link "Apri in Google Maps" (25 px) sta sopra la riga dei crediti (13 px)**: due bersagli piccoli e vicini, che portano entrambi fuori dal sito.

### C5 · QR del parcheggio e barcode del museo

Misure fisiche approssimate per un telefono largo 390 px CSS (circa 0,166 mm per px, iPhone da 6,1"). Su un Samsung largo 360–412 px CSS i valori cambiano di ±10%.

| Codice | Dove sta (pagina come si apre) | A schermo | Modulo | Contrasto | Serve altro? |
|---|---|---|---|---|---|
| **QR parcheggio**, dentro la card | **2,8 schermi** più in basso dell'inizio, in cima a domenica (aperta di default) | 240 × 240 px ≈ **4 × 4 cm** | 33 moduli con quiet zone, 7,3 px ≈ 1,2 mm | nero su bianco pieno | no: già decodificato a questa misura. Toccandolo diventa 359 px ≈ **6 cm**, fondo bianco, schermo che resta acceso |
| **3 barcode NHM** (CODE128) | **11,6 schermi** più in basso; se lunedì è aperto, circa 6 schermi in più | 296 × 66 px ≈ **4,9 × 1,1 cm** ciascuno | 156 moduli, **1,83 px ≈ 0,3 mm** per modulo | nero su bianco pieno | **Stanno tutti e tre in uno schermo** (433 px dal primo all'ultimo). Non c'è ingrandimento né schermo pieno né blocco dello spegnimento. Le barre sono basse, circa 1 cm |

Screenshot: `C-qr-nella-card.png`, `C-barcode-nhm.png`.

Constatazioni:
- **Per arrivare ai barcode bisogna scorrere 11,6 schermi.** Dalla card del museo c'è il link "🎟️ I biglietti" (98 × 25 px), che porta alla sezione Biglietti.
- Il QR ha la modalità a schermo pieno e il blocco dello spegnimento; i barcode no. Con la luminosità automatica bassa (sera di novembre) il telefono non la alza da solo.

---

## STEP D — Scenari d'uso reali

**Come è stato misurato.** Chromium a 390 × 844, come un telefono, con la data del giorno simulata tramite `?now=`. Il meteo dal 5/11 risponde con dati simulati, quindi la card meteo occupa il suo posto come accadrà davvero. Pannello novità già letto, salvo lo scenario 8. Si parte sempre dalla pagina appena aperta, in cima.
- **Tap** = tocchi necessari, compreso quello finale se apre qualcosa.
- **Scroll** = distanza totale percorsa scorrendo, in schermi da 844 px, lungo il percorso più corto possibile.

### Il primo schermo, uguale in tutti gli scenari

Screenshot: `D0-primo-schermo.png`.

In ordine: "Viaggio di famiglia", **Londra**, "15–17 novembre 2026 · 3 giorni, 2 notti", "Alessandro, Vale e Olly", il grande pulsante dorato **"Versione per immagini, per Olly"**, il badge **"4 da verificare"**, il pulsante **"🌧️ Piove · NO"**, la skyline, e l'inizio della card **Voli — British Airways** (la tabellina dei voli si intravede in fondo).

Nel primo schermo **non c'è niente che riguardi il giorno o l'ora**: niente programma, niente meteo (la card meteo, nei giorni del viaggio, sta a 2,5 schermi), niente QR, niente biglietti. Il pulsante più grande e più evidente è quello della versione per Olly.

### Riepilogo

| # | Scenario | Tap | Scroll (schermi) | L'informazione è nel primo schermo? | Screenshot |
|---|---|---|---|---|---|
| 1 | Dom 04:30 · QR del parcheggio alla sbarra | 0 (1 per lo schermo pieno) | **2,8** | no | `D1-qr-parcheggio.png`, `D1b-qr-schermo-pieno.png` |
| 2 | Dom 09:00 · percorso Heathrow → Southbank | 1 | **4,2** | no | `D2-percorso-heathrow.png` |
| 3 | Dom 17:30 · dove fare la spesa, a che ora chiude | 0 | **7,0** | no | `D3-spesa-lina-stores.png` |
| 4 | Lun 11:00 · prossima tappa e percorso a piedi | 2 | **10,6** | no | `D4-prossima-tappa-lunedi.png` |
| 5 | Lun 16:25 · tre barcode NHM | 0 | **11,5** | no | `D5-barcode-nhm.png` |
| 6 | Lun mattina, piove · attivare Piove e capire cosa cambia | 2 | **9,3** | solo il pulsante | `D6a-piove-acceso-testata.png`, `D6-piove-lunedi.png` |
| 7 | Mar 15:00 · quando uscire e come arrivare al T5 | 2 | **10,2** | no | `D7-partenza-heathrow.png` |
| 8 | Vale dopo una settimana · novità e cose da fare | 3 | **16,9** | il pannello novità copre la pagina | `D8-primo-schermo-novita.png`, `D8-da-verificare.png`, `D8b-checklist.png` |
| 9 | Numero di prenotazione dell'appartamento e chiave Clevio | 0 | 1,0 | no | `D9-appartamento.png` |

### Dettaglio

**1 · Domenica 04:30, QR del parcheggio.** Domenica è aperta all'avvio, quindi basta scorrere: **2,8 schermi** fino alla card "Parcheggio aeroporto" in cima al giorno. Prima ci sono la testata, "Voli & base", "Sicurezza" (chiusa) e l'intestazione del programma. Il QR nella card è già scansionabile (4 cm); toccandolo diventa 6 cm su fondo bianco, con lo schermo che resta acceso. *Senza rete e con la pagina da ricaricare, il QR non c'è* (vedi B4).

**2 · Domenica 09:00, percorso verso Southbank.** Il pulsante "Percorso · Domenica, Heathrow → Southbank" è il primo dei percorsi, a **4,2 schermi**: dopo il QR, la card dell'aeroporto di Bologna e quella del volo, che a quell'ora sono già passate. Un tocco apre Google Maps coi mezzi.

**3 · Domenica 17:30, la spesa.** La card "Spesa da Lina Stores" (17:15) è a **7 schermi**. Il testo dice "La domenica chiude alle 18:00, quindi è la prima cosa da fare rientrando". **Il piano B (Whole Foods a Piccadilly Circus) non è nella card**: sta solo in una nota della sezione Timeline, 3,7 schermi più in basso.

**4 · Lunedì 11:00, prossima tappa.** La pagina si apre su domenica, aperta, alta 6,4 schermi. Per arrivare a lunedì: **scorrere 9,1 schermi** fino all'intestazione, toccarla, scendere ancora alla card delle 11:30 "Big Ben e il Parlamento" e toccare "Apri in Google Maps". In tutto **2 tocchi e 10,6 schermi**.
- **La pagina non indica qual è la prossima tappa**: bisogna confrontare l'ora con gli orari delle card. Alle 11:00 si è fra Horse Guards (10:30, 20 min) e Big Ben (11:30).
- Il link della card apre una **ricerca** ("Big Ben London"), non un percorso a piedi.
- Il pulsante "Percorso" che copre Big Ben sta in cima a lunedì, tre card più su, e parte da Beak Street. Quello successivo ("Big Ben → St James's → …") sta dopo la card di Big Ben.

**5 · Lunedì 16:25, barcode del museo.**
- **Percorso più corto:** scorrere **11,5 schermi** fino alla sezione Biglietti. Dopo la Timeline, i tre barcode stanno insieme in uno schermo.
- **Passando dalla card del museo:** aprire lunedì, scendere alla card delle 16:30 e toccare "🎟️ I biglietti". Sono **2 tocchi e 13,2 schermi**.
- I barcode **non si possono ingrandire e non tengono acceso lo schermo**. *Con rete scarsa compaiono solo i numeri* (vedi B4).

**6 · Lunedì mattina, piove.** "🌧️ Piove" è nel primo schermo (1 tocco). **Dopo il tocco nel primo schermo cambia solo il pulsante** (NO → SÌ, azzurro): nessun messaggio dice cosa è cambiato o dove guardare. La nota di lunedì ("Mattina tutta all'aperto… Harrods prima, parchi dopo se spiove; il museo resta alle 16:30") è in testa al giorno: bisogna scorrere **9,3 schermi** e aprire lunedì (2° tocco). Le altre conseguenze stanno altrove: Shrek's Adventure al posto del London Eye domenica, "già al riparo" martedì.

**7 · Martedì 15:00, uscita per Heathrow.** Martedì è chiuso: **scorrere 9,2 schermi** oltre domenica (aperta) e lunedì (chiuso), toccare l'intestazione, poi scendere al pulsante "Percorso · Covent Garden → Heathrow T5". Sotto c'è la card "Partenza per Heathrow, 15:15": "Entro le 15:15–15:30… Piccadilly line diretta da Piccadilly Circus o da Covent Garden con un cambio". In tutto **2 tocchi, 10,2 schermi**. L'orario di uscita si trova anche nella Timeline, senza aprire nulla, ma senza il percorso.

**8 · Vale dopo una settimana.**
- All'apertura **il pannello "Cosa è cambiato" copre la pagina** (692 px su 844) con le voci uscite da allora: con l'ultima versione vista ferma a 9, sono 4. Si chiude con "Ho capito".
- Il badge **"4 da verificare"** (1 tocco) apre l'elenco delle cose da confermare, con chi deve farle; si chiude con "Chiudi".
- **La checklist "Da fare prima di partire" è a 16,9 schermi**, quasi in fondo, e mostra **sempre "0 su 9 completate"**: le spunte di Alessandro non arrivano al telefono di Vale e si perdono anche ricaricando. Le due liste hanno voci in comune (cambio della guardia, Winter Market, London Eye + SEA LIFE).
- In tutto **3 tocchi, 16,9 schermi**, e alla fine Vale non sa cosa è già stato fatto.

**9 · Numero di prenotazione e chiave Clevio.** La card dell'alloggio è a **1 schermo**: indirizzo, €631, cancellazione gratuita, check-in 15:00 e check-out 10:30, la nota "chiave digitale Clevio — arriva via email ~2 giorni prima… verificare che il link/dominio sia legittimo", "contatto diretto tramite numero Booking.com".
- **Il numero di prenotazione dell'appartamento non è da nessuna parte nella pagina** (c'è solo quello del parcheggio, 3039188).
- **Della chiave Clevio** c'è solo la descrizione: nessun link all'app o all'email, nessun codice.

---

## STEP E — Codice

### E1 · Com'è fatto `londra.html`

**Un solo file**, `_legacy/londra.html`: **1.979 righe, 139 KB**. Non passa dal bundler: la build di Vite lo **copia così com'è** in `dist/` con il plugin `copy-legacy`, insieme alle altre pagine "storiche" del repository. Niente minificazione e niente nomi con hash: la cache la decide GitHub Pages (10 minuti).

| Parte | Righe | Peso | Dove |
|---|---|---|---|
| `<head>` (meta, Open Graph, manifest, font, CSS di Leaflet) | 34 | — | righe 1–34 |
| **CSS** in un unico `<style>` | **447** | 32 KB | righe 35–481 |
| **HTML** scritto a mano | ~950 | ~75 KB | righe 482–1431 |
| Script esterni (Leaflet, JsBarcode) | 5 | — | righe 1432–1436 |
| **JavaScript** in un unico `<script>`, 11 blocchi | **540** | 31 KB | righe 1437–1976 |

Blocchi JavaScript, in ordine: meteo ora per ora · barcode del museo · QR del parcheggio a schermo pieno · margine delle giornate · piano pioggia · da verificare · novità · neve nella testata · checklist · Olly · mappa.

**Dove stanno i dati**

| Dato | Dove | Forma |
|---|---|---|
| Tappe dei tre giorni (orari, testi, foto, link Maps, crediti, durate) | HTML | scritto a mano, card per card |
| Percorsi Maps (11) | HTML | URL fissi negli `href` |
| QR del parcheggio | HTML | SVG già disegnato (1,3 KB) |
| Timeline ora per ora | HTML | **seconda copia degli orari**, scritta a mano |
| Voli, alloggio, sicurezza, budget, checklist, note pratiche, passeggino, Olly | HTML | scritti a mano |
| Numeri dei biglietti NHM | HTML (numero visibile) + JS `BIGLIETTI` (per disegnare il barcode) | doppi, apposta: il numero resta se la libreria non arriva |
| Novità | JS `NOVITA` | 13 voci, versione intera |
| Da verificare | JS `DA_VERIFICARE` + file `DA_VERIFICARE_LONDRA.md` | **due copie da tenere allineate a mano** |
| Vincoli per il controllo del margine | JS `MARGINI` | **terza copia** di alcuni orari (10:45, 18:00, 09:15, 16:30, 17:50, 11:00, 15:15) |
| Punti e percorsi della mappa | JS: 14 oggetti luogo, `TAPPE` (marker con note), `ROUTES` (linee) | **terza fonte delle posizioni**, dopo i percorsi Maps e i link delle card |
| Meteo | API Open-Meteo, in tempo reale | nessun dato salvato |
| Foto delle tappe | `public/assets/tappe/londra/` (27 file, 1,41 MB) | manifest in `data/foto-tappe-londra.json`, usato solo dagli script |
| Foto di Olly | `_legacy/img/olly/` (11 JPG, 940 KB, 3 non usati) | caricate come `background-image` CSS |
| Icone, manifest, immagine Open Graph | `_legacy/` | `londra-manifest.json`, `icon-londra-*`, `og-londra.jpg` |

**Coerenza delle posizioni fra le tre fonti.**
- I 12 punti della mappa che ho confrontato coincidono con le coordinate dei percorsi, salvo due: **Southbank (83 m di scarto)** e **Horse Guards (73 m)**.
- Dei 23 link "Apri in Google Maps" sulle card, **18 cercano per nome** (es. `query=Big Ben London`) e 5 per coordinate.

### E2 · Cosa è condiviso con Barcellona

| Condiviso | Effetto su Londra |
|---|---|
| Repository, `package.json`, build Vite (`npm run build`) | Londra è una delle ~40 pagine in `_legacy/` copiate senza elaborazione |
| Workflow `.github/workflows/pages.yml` (deploy a ogni push su `main`) | **Ogni commit su `main` ripubblica anche Londra**, compresi quelli che riguardano solo Barcellona o la palestra |
| Cartella `public/assets/tappe/` | Le foto di Londra stanno nella sottocartella `londra/`; quelle di Barcellona nella cartella madre |
| `scripts/` | `londra-foto.mjs` e `londra-cards.mjs` sono solo di Londra, ma nella cartella comune; nessuna suite di test per Londra in `scripts/qa/` |
| `CREDITS.md`, `CHANGELOG.md` | File comuni, con sezioni per Londra |
| `CLAUDE.md` | Le sue regole (changelog in `data/changelog.json`, `npm run validate`, suite QA prima del push) valgono per **Barcellona**: Londra ha il suo oggetto `NOVITA` |

**Solo di Londra:** `londra.html`, `londra-illustrata.html` (184 righe, versione per immagini per Olly), `londra-manifest.json`, icone e immagine Open Graph, `DA_VERIFICARE_LONDRA.md`, `assets/tappe/londra/`, `img/olly/`, i due script. **Il codice di Barcellona (`src/`) non è usato**: niente moduli, componenti o CSS comuni, niente statistiche GoatCounter. In comune c'è solo il meta `noindex`.

### E3 · Librerie e servizi esterni

| Cosa | Versione | Da dove | Integrità (SRI) | Se manca |
|---|---|---|---|---|
| Leaflet (JS + CSS) | 1.9.4 | **unpkg.com** | sì, sha256 | niente mappa, errore `L is not defined`, il resto funziona |
| JsBarcode | 3.12.3 | **cdnjs.cloudflare.com** | sì, sha512 | barcode non disegnati, restano i numeri |
| Playfair Display | variabile 400–800 | **Google Fonts** | — | font di riserva per i titoli |
| Tile della mappa (dark) | — | **CARTO** (basemaps.cartocdn.com) | — | mappa senza sfondo |
| Previsioni meteo | API v1 | **Open-Meteo** (api.open-meteo.com), dal 5 al 17 novembre | — | la card meteo non compare |
| Google Maps | URL `maps/dir` e `maps/search` | link esterni | — | — |

Non ci sono librerie installate dal progetto per questa pagina: tutto arriva da CDN a runtime.

### E4 · Vincoli già attivi che un redesign deve rispettare

1. **Storage**: `localStorage` **solo** per la chiave `londra:novita:vista` (ultima versione delle novità vista). Niente `sessionStorage`, nessun altro dato salvato: checklist, Piove e "L'ho visto!" vivono solo in memoria.
2. **Foto delle tappe**: cartella `assets/tappe/londra/` **sotto 1,5 MB** (oggi 1,41 MB). Solo licenze libere da Wikimedia Commons, scaricate e guardate prima di sceglierle; niente verticali (eccezioni approvate: Beak Street, Pollock's); ritaglio 16:9 a 800 × 450, WebP q70–80 con effort 6; crediti in `CREDITS.md` e sotto la card; card SVG stilizzata se non c'è niente di adatto. **Eccezioni dichiarate**: foto di famiglia di M&M'S, immagine promozionale di Shrek's Adventure.
3. **Da verificare**: `DA_VERIFICARE_LONDRA.md` e l'oggetto `DA_VERIFICARE` in pagina vanno **aggiornati insieme**; il badge conta le voci in pagina.
4. **Novità**: ogni modifica visibile aggiunge una voce in cima a `NOVITA` con `v` incrementato, nello stesso commit, più una sezione in `CHANGELOG.md`.
5. **Link Maps dei percorsi**: gli 11 URL sono **fissi, carattere per carattere**; non vanno rigenerati dalle coordinate. Coi mezzi solo origine e destinazione; a piedi al massimo due tappe intermedie.
6. **QR del parcheggio**: payload esatto `$BLQ3039188LGT@`, SVG statico dentro la pagina (funziona senza CDN), quiet zone di 4 moduli, fondo bianco, almeno 200 px, schermo pieno con wake lock.
7. **Biglietti NHM**: CODE128, fondo bianco pieno, **numeri scritti nell'HTML** come ripiego se JsBarcode non arriva.
8. **Meteo**: Open-Meteo senza chiave, visibile **solo dal 5 al 17 novembre**, nessun segnaposto né messaggio d'errore, nessuna cache.
9. **Lingua e nomi**: tutto in italiano, nomi veri (Alessandro, Vale, Olly).
10. **Pubblicazione**: deploy da `main` con GitHub Pages; pagina `noindex`; la versione per immagini (`londra-illustrata.html`) è una pagina separata, collegata da testata e footer.

---

## Riepilogo: i 10 problemi di usabilità più gravi

Solo constatazioni, nell'ordine di gravità per l'uso in strada.

1. **Senza rete la pagina non si riapre.** Non c'è un service worker: se il browser ricarica la scheda offline compare "No internet", e con la pagina spariscono anche il QR del parcheggio e i biglietti (B4).
2. **La pagina non sa che giorno e che ora è.** Non indica la tappa attuale né la prossima e si apre sempre con domenica aperta. Lunedì e martedì, per arrivare al proprio giorno servono più di 9 schermi di scroll e un tocco (B3, D4, D7).
3. **Il primo schermo non contiene niente di operativo.** Ci sono titolo, date, famiglia; l'elemento più grande è il pulsante per la versione di Olly (D0).
4. **I barcode del museo sono a 11,5 schermi** e non si possono ingrandire né tengono acceso lo schermo. Con rete scarsa restano riquadri bianchi con il solo numero (C5, D5, B4).
5. **La pagina è lunga 19,5 schermi** (30,9 tutto aperto) e non ha navigazione fissa, indice né "torna su". Badge e pulsante Piove spariscono dopo mezzo schermo. Gli orari compaiono due volte per intero, nelle card e nella Timeline (A1, A3, A5).
6. **101 elementi cliccabili su 125 sono sotto 44 × 44 px.** I link "Apri in Google Maps" (25 px) stanno sopra i crediti delle foto (13 px), che portano anch'essi fuori dal sito; checklist e marker sono a 22 px (C4).
7. **Nulla si ricorda e nulla si condivide.** Checklist, Piove e "L'ho visto!" si azzerano a ogni ricarica. Vale vede sempre "0 su 9", e le cose da fare stanno in due liste separate, il badge in testata e la checklist a 16,9 schermi (B2, D8).
8. **Accendere "Piove" non dà riscontro.** Nel primo schermo cambia solo il pulsante. Gli effetti sono sparsi nei tre giorni, e Timeline, mappa e percorsi continuano a indicare il London Eye (B2, D6).
9. **Informazioni operative mancanti o lontane da dove servono.** Il numero di prenotazione dell'appartamento non c'è, e della chiave Clevio solo la descrizione. Il piano B della spesa sta nella Timeline, non nella card. 18 link "Apri in Google Maps" su 23 fanno una ricerca per nome invece di un percorso (D3, D9, E1).
10. **Leggibilità all'aperto.** C'è solo il tema scuro. Il testo delle card è grigio a 13,5 px, sotto 7:1. Informazioni operative come le sigle dei giorni (8,5 px), gli orari d'ingresso e i dati della prenotazione (9,5–10,5 px) e i link Maps (11 px) sono le scritte più piccole (C4).

## File prodotti

- `audit/AUDIT_LONDRA.md` — questo report.
- `audit/lighthouse-mobile.html` — report completo di Lighthouse 12.8.2, mobile, sulla pagina pubblicata.
- `audit/screenshots/` — 22 screenshot a 390 × 844: `B-*` (stati e rete), `C-*` (QR e barcode), `D0`–`D9` (scenari).
