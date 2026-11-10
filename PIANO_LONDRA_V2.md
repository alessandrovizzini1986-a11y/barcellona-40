# Londra v2 · prompt di lavoro: logica e grafica, un passo alla volta

Scritto il 10/11/2026. È il prompt che seguo (e che può seguire una sessione nuova) per rivedere logica e grafica di
`_legacy/londra.html` senza mettere a rischio il viaggio del 15–17 novembre.

## Obiettivo

La pagina la usa una famiglia in viaggio, dal telefono, con una mano sola. Ogni passo deve togliere tocchi, scorrimenti
o fatica di lettura in una situazione reale (i 10 scenari di `scripts/qa/audit/londra/passo1/` e del pacchetto di
revisione), non aggiungere funzioni.

## Regole fisse

- **I contenuti non si toccano**: orari, tappe, testi «Cosa vediamo», percorsi Maps, QR e barcode, dati di bagni e
  depositi restano identici. Se un passo ha bisogno di cambiarne uno, si ferma e lo chiede.
- **Un passo = un ramo = un commit**, con `NOVITA` + `data/changelog.json` (v+1) + `CHANGELOG.md`.
- **Merge su main solo con `scripts/qa/londra-check.mjs` verde** e con le verifiche del passo superate a 390×844,
  senza scroll orizzontale a 320/375/430 px, in tema scuro e chiaro.
- **Dal 12 al 17 novembre niente commit su main.** Quello che non è pubblicato entro l'11 sera continua sul ramo
  `londra-v2` e si pubblica dal 18.
- Dopo ogni passo: mi fermo, mostro prima → dopo (tocchi, scorrimenti, schermate, screenshot) e aspetto l'ok.
- Italiano in commenti, nomi e commit. Niente dipendenze nuove. Barcellona non si tocca.

## Passi

### Passo 1 · Logica: la scheda viene da te (pubblicato il 10/11)
- «Vedi la scheda» in «Adesso» non salta più nel Programma: apre un foglio dal basso con la card della tappa e, sotto
  «Poi», quella successiva. Dal foglio funzionano «Portami qui», bagno, biglietti; un link porta alla giornata intera.
- Nel Programma, dal 15 al 17, le tappe già finite diventano una riga («✓ 09:30 Trafalgar Square»), riapribile con un
  tocco; spariscono anche i percorsi che portavano lì. Lunedì alle 14:50 la giornata passa da 13,7 a 5,7 schermate.
- Verifica: scenari 02, 04, 08, 09 con al massimo 1 tocco e 1 scorrimento per arrivare all'informazione.

### Passo 2 · Grafica: gerarchia delle card e tipografia
- Una sola scala di testo (titolo, corpo, nota) e nessun testo sotto i 14 px nelle card.
- Card più pulite: un solo livello di bordo, badge solo dove dicono qualcosa («stimato», «da verificare», «prenotato»),
  orario e titolo sempre nello stesso punto, azioni sempre in fondo e nello stesso ordine.
- «Adesso» come cruscotto: la prossima tappa domina, il resto è secondario.
- Verifica: screenshot prima → dopo di Adesso, una card compatta, una card evento, in scuro, chiaro e Sole; contrasto
  minimo ≥ 4,5:1 sul testo.

### Passo 3 · Biglietti e Info
- Biglietti nell'ordine in cui servono (per giorno), col biglietto di oggi in cima durante il viaggio.
- Info: i 38 controlli sotto i 44 px e i testi sotto i 14 px (tabelle, crediti) portati a misura.
- Verifica: `misure.json` prima → dopo per le due viste.

### Passo 4 · Dopo il viaggio: i dati fuori dalla pagina
- Tappe, orari, percorsi e codici in JSON (`_legacy/data/londra-*.json`), la pagina li disegna. Il controllo confronta
  il risultato con la pagina di oggi, carattere per carattere dove conta (URL, QR, orari).
- È il passo che rende riusabile il sito per il prossimo viaggio. Solo dal 18/11.

## Come si verifica ogni passo

```
npm run build && npx vite preview --port 4173 &
node scripts/qa/londra-check.mjs          # deve restare tutto verde
```
Più gli scenari a 390×844 con `?now=` (domenica 10:30 e 14:50, lunedì 09:20, 10:10, 12:30, 14:30, 16:25, martedì
10:30 e 14:40) e, per il piano pioggia, `&piove=1`.
