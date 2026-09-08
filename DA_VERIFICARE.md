# DA VERIFICARE · Barcelona 40

Generato in parte dagli script dati (`npm run data`). Le sezioni tra marker vengono riscritte a ogni esecuzione.

## geocoding

<!-- geocoding:start -->
- **Enoteca Taps Sagrada Família** (`taps`): coordinate mancanti, nessun risultato. Query: "Enoteca Taps Sagrada Família, Barcelona"
- **Rooftop Garden – El Palace Barcelona** (`rooftop`): coordinate mancanti, nessun risultato; anche l'indirizzo "Gran Via de les Corts Catalanes 668, Barcelona" non risolve a un civico preciso. Query: "Rooftop Garden – El Palace Barcelona, Barcelona"
- **Parc de la Ciutadella** (`ciutadella`): coordinate automatiche da Nominatim (41.388416, 2.1862546), da controllare sul posto
- **Mercat de Santa Caterina – Xarcuteria Debón** (`santacaterina`): coordinate automatiche da Nominatim (41.3863594, 2.1781611), da controllare sul posto
- **Chao Pescao** (`chaopescao`): coordinate automatiche da Nominatim (41.3861408, 2.1840991), da controllare sul posto
- **Bodega Biarritz 1881** (`biarritz`): coordinate automatiche da Nominatim (41.3792173, 2.1770987), da controllare sul posto
- **Can Fisher** (`canfisher`): coordinate automatiche da Nominatim (41.3946058, 2.2062439), da controllare sul posto
- **Bunkers del Carmel** (`bunkers`): coordinate automatiche da Nominatim (41.4193923, 2.1616974), da controllare sul posto
<!-- geocoding:end -->

## distanze

<!-- distanze:start -->
- f6 ← f5: coordinate mancanti, distanza non calcolata
- f7 ← f6: coordinate mancanti, distanza non calcolata
- f8 ← f7: coordinate mancanti, distanza non calcolata
<!-- distanze:end -->

## Voci aperte (da `data/checks.json`, spuntabili nella sezione Info → Da verificare)

- c1 · Volo di andata di Alessandro: numero e orario (probabile FR2097 06:20→08:05)
- c2 · Voli di ritorno domenica 18: Alessandro, Giulio, Manuel
- c3 · Braseria Sarrià: portare la prenotazione a 2 coperti
- c4 · Hotel: il prezzo €430 include già il 3° adulto? Aliquota tassa di soggiorno? Quando si paga il sovrapprezzo?
- c5 · Hotel: cancellare la richiesta di letto extra per il 4° ospite di sabato (non serve più)
- c6 · Deposito bagagli venerdì mattina 08:05 → 15:00 (Monne)
- c7 · Programma notturno Sala Apolo sabato 17 (interferenza Soundhood a 89 m)
- c8 · SOUNDIT Plaza / Happy Techno Open Air: esistono? orari? (Resident Advisor)
- c9 · Civico esatto Braseria Sarrià e Rooftop Garden El Palace
- c10 · Coordinate geocodificate automaticamente (vedi sezione geocoding)

## Altri dati mancanti o non verificati

- Numero volo di Giulio (atterraggio 07:40 confermato) e di Manuel (09:45).
- Enoteca Taps Sagrada Família e Rooftop Garden El Palace: nessuna coordinata (Nominatim non le trova); le tappe f6/f7 sono `da_verificare` e sulla mappa compaiono nella lista "Senza coordinate". Inserire `lat`/`lng` a mano in `data/venues.json` con `verified:true`.
- Distanze f5→f6→f7→f8 non calcolate per lo stesso motivo.
- Bodega Biarritz 1881: Nominatim restituisce "Bodega Biarritz, Carrer d'en Rull" (Gòtic). Controllare che sia il locale giusto.
- Coordinate `verified:true` del prompt (appartamento, aeroporto, Sagrada, Olimpo, Braseria, Apolo, Monumental, Terrrazza, mercati) non sono state toccate.
- Il sito precedente era installabile con un service worker (`_legacy/sw.js`): chi lo aveva aperto vedrà il nuovo sito alla seconda visita, quando il browser rimuove il vecchio worker (404 su `sw.js`).
