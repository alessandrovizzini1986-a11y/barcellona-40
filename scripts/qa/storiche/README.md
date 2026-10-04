# Suite storiche (non si lanciano più)

Restano per memoria: controllavano correzioni di settembre e il loro invariante è stato superato da scelte prese dopo.
Fallivano in modo identico sulla build precedente alla chiusura del 3 ottobre, quindi non segnalano regressioni.

- `rigori-review.mjs` (16/09): "respinta = parata contata" con un tiro centrale basso e portiere forzato nella zona 4.
  Con la portata del portiere decisa dopo (tabella `reach.js`, da non allargare) quel tiro entra. Il resto della
  suite (tuffo in volo, swipe specchiato, Boss sul portiere riusato, `?q=` non salvato) è coperto da `rigori-partita`,
  `rigori-incroci` e `rigori-giro`.
- `rigori-salto.mjs`: "saltare il replay non cambia il risultato". I semi dei tiri della CPU escono da `Math.random`,
  che il replay consuma (particelle, suoni con il fischio a ogni turno): saltando, Ale tira con semi diversi e il
  punteggio può cambiare. Non è un difetto che un giocatore possa vedere o sfruttare, e sistemarlo vorrebbe dire
  cambiare la sorgente casuale del gioco chiuso. Il determinismo del singolo tiro lo copre `rigori-determinismo`.
