# Londra v3 · prompt di lavoro: revisione di grafica e logica a due giorni dalla partenza

Scritto il 13/11/2026, su richiesta («rivedi tutta la grafica del sito e la sua logica, fatti un prompt e procedi in
autonomia»). Continua `PIANO_LONDRA_V2.md`. Si parte domenica 15: questo piano sceglie cosa conviene toccare adesso
e cosa no.

## Criterio

La pagina funziona ed è stata provata scenario per scenario. A 36 ore dalla partenza un rifacimento completo
porterebbe più rischi che vantaggi: chi la usa la conosce già, e un errore si scoprirebbe per strada. Quindi:

- **si cambia** quello che, guardando le schermate di ogni vista a 390×844 nei giorni del viaggio, fa perdere tempo o
  si legge male;
- **non si cambia** struttura, navigazione, colori, card, dati: restano quelli che la famiglia ha già visto;
- ogni modifica vale **solo dal 15 al 17** (`html.in-viaggio`) oppure è la correzione di un difetto; prima del viaggio
  la pagina resta com'è;
- stesse regole di sempre: `londra-check` verde, niente scroll laterale a 320/375/430 px, tema scuro e chiaro,
  changelog nello stesso commit, Barcellona non si tocca.

## Cosa ho trovato (schermate «prima» del 13/11)

1. **Programma, lunedì alle 12:30**: prima della prossima tappa ci sono titolo, avvertenza «gli orari sono una
   proposta», meteo, e la scaletta intera con le 8 tappe già fatte. La prossima tappa è alla nona riga.
2. **Biglietti, lunedì**: sopra il biglietto di oggi ci sono tre scorciatoie, fra cui il SEA LIFE di ieri.
3. **Mappa**: si apre con le tappe dei tre giorni sovrapposte, anche a viaggio iniziato.
4. **Sotto la testata di una riga** restano circa 70 px vuoti in Programma, Mappa e Info.
5. **Meteo**: la scritta «Londra, adesso» finisce sopra le previsioni dei tre giorni (difetto vero, a 390 px).
6. **«Attivo il piano pioggia?»** in Adesso: i pulsanti «Sì, attiva» e «No» erano trasparenti, senza bordo.

## Passo unico (fatto il 13/11)

- Programma in viaggio: via titolo e avvertenza; la scaletta nasconde le tappe fatte dietro «✓ N tappe fatte ·
  mostra»; un tocco le riapre.
- Biglietti in viaggio: «Oggi» in cima, scorciatoie sotto «Gli altri giorni».
- Mappa in viaggio: si apre filtrata e inquadrata sul giorno di oggi; la legenda rimette tutto.
- Testata: tolto il vuoto sotto la riga.
- Meteo: scritta «adesso», che non esce più dal suo spazio.
- Proposta pioggia: «Sì, attiva» pieno, «No» col bordo.

Verifica: `londra-check` 33 su 33; nessuno scroll laterale a 320/375/430; lunedì 12:30 la scaletta parte da «12:45
Pranzo da Harrods»; prima del viaggio (`?now=2026-11-14T12:00`) nulla cambia.

## Cosa resta per dopo il viaggio (dal 18/11)

- Il passo 4 del piano v2: tappe, orari e percorsi fuori dall'HTML, in JSON.
- Il rifacimento vero della grafica, se lo si vuole: va fatto con calma e con le foto e le note del viaggio, quando un
  errore non costa niente.
- Bagno più vicino per LEGO Store e Poppies Soho (oggi quelle due tappe non hanno la riga 🚻: mancano dati verificati).
