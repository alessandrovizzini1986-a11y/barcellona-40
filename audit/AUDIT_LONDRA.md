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
| **8,5 px** | 3 | le sigle **DOM / LUN / MAR** sotto i numeri dei giorni |
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
