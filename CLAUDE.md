# Regole permanenti del repo

Questo file lo legge Claude Code a ogni sessione: quello che c'è scritto qui vale sempre, senza che
nessuno debba ricordarselo.

## Changelog: una entry per ogni cambiamento che si vede

Ogni modifica al sito che un utente possa notare richiede una nuova entry in `data/changelog.json`, con
`v` incrementato, **nello stesso commit**. Vale per contenuti, orari, tappe, funzioni nuove. Non vale per
refactor, test, fix invisibili.

Le entry stanno in cima al file, le più recenti prima. Il campo `v` è un intero che cresce di uno: il sito
lo confronta con `b40:v1:lastSeenVersion` per decidere cosa mostrare a chi rientra. Se la entry manca,
l'aggiornamento passa invisibile e nessuno lo vede.

`npm run build` stampa un avviso (non bloccante) se si toccano `data/` o `src/` senza toccare il changelog:
è un promemoria, non un controllo. Se è davvero un fix invisibile, si tira dritto.

## Il resto

- Dati verificati, mai stimati di nascosto: quello che non è confermato porta il badge `da_verificare` e
  finisce in `DA_VERIFICARE.md`.
- `npm run validate` prima di ogni commit sui dati; le suite in `scripts/qa/` prima di ogni push.
- Italiano nei commenti, nei nomi e nei messaggi di commit.
