# Allerte meteo e protezione civile · come funziona

Letto e verificato il 12/10/2026. Due pezzi: un workflow GitHub Actions che ogni ora legge i feed ufficiali e manda una
notifica sul telefono quando cambia qualcosa, e il sito che mostra l'allerta in cima a tutte le viste.

## Fonte: MeteoAlarm (EUMETNET), formato CAP/Atom, senza chiave

| Feed | URL | Verifica del 12/10 |
|---|---|---|
| Spagna (AEMET) | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain` | 200, `application/atom+xml`, 7 kB, 4 entry (tutte Baleari) |
| Italia (Protezione Civile) | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-italy` | 200, `application/atom+xml`, 52 kB, 34 entry, **13 aree, una per regione** |

Il feed elenca solo gli avvisi **attivi**: un'area senza allerta non compare. Per questo il 12/10 non si è potuto leggere
il nome esatto dell'area di Barcellona nel feed: AEMET la chiama "Litoral de Barcelona" (e "Prelitoral de Barcelona"),
lo script filtra `areaDesc` con `/Barcelona/i`, così prende tutte e due. Per Bologna l'area è **"Emilia e Romagna"**
(il feed italiano non distingue la pianura bolognese): filtro `/Emilia e Romagna|Bologna/i`.

Campi usati di ogni `<entry>` (nomi reali del feed):

| Campo | Esempio letto | Uso |
|---|---|---|
| `<cap:areaDesc>` | `Sur de Mallorca` | filtro per zona |
| `<cap:event>` | `Moderate rain warning` | tipo (pioggia, temporali, vento, mare, nebbia, neve, temperatura, alluvione) |
| `<title>` | `Yellow Rain Warning issued for Spain - Sur de Mallorca` | **livello**: Yellow / Orange / Red nel titolo |
| `<cap:severity>` | `Moderate` | livello di riserva se il titolo non ha il colore: Moderate = giallo, Severe = arancione, Extreme = rosso |
| `<cap:onset>` / `<cap:effective>` | `2026-10-12T12:00:00+00:00` | inizio |
| `<cap:expires>` | `2026-10-12T16:59:59+00:00` | fine |
| `<cap:identifier>` | `2.49.0.0.724.0.ES.2610…` | solo per leggere; l'id nostro è zona:tipo:livello:inizio:fine |
| `<cap:status>` | `Actual` | `Test` viene scartato |
| `<link title="…" href="https://meteoalarm.org?geocode=EMMA_ID:ES117">` | | link "Fonte" nel sito |
| `<cap:geocode>` EMMA_ID | `ES117` | non usato (il nome dell'area basta) |

Non esiste un campo `awareness_level` nel feed legacy Atom: il colore sta nel titolo. Il CAP completo (link
`application/cap+xml`) lo avrebbe, ma non serve.

## Pre-allarme non ufficiale (Open-Meteo)

Open-Meteo (già usato dal widget meteo del sito, senza chiave): se nelle prossime 12 ore su Barcellona è prevista
pioggia **≥ 10 mm/h**, lo script aggiunge una voce `livello: "preallarme"`, marcata `nonUfficiale: true`, con una
notifica a priorità normale e il banner giallo "Pre-allarme pioggia forte (non ufficiale)". Dalla sandbox di sviluppo
Open-Meteo non era raggiungibile (dal browser sì): la logica è provata con una fixture, non con una previsione vera.

## Workflow `.github/workflows/allerte.yml`

- cron ogni ora (al minuto 7), più `workflow_dispatch` con input `test` → manda "✅ Allerte Barcelona 40 attive".
- `scripts/allerte.mjs` (Node 20, nessuna dipendenza) esce subito fuori dalla finestra **15/10 00:00 → 19/10 06:00 ora di Roma**.
- Stato in `public/allerte.json` (dati pubblici: zona, area, livello, tipo, evento, finestra, fonte). Si scrive e si committa
  solo se cambia; dopo il commit il workflow lancia `pages.yml` a mano, perché un push fatto con `GITHUB_TOKEN` non fa
  partire gli altri workflow.
- Notifica solo sulle **differenze**: nuova allerta, cambio di livello (stessa zona e tipo), fine (zona e tipo spariti).
  Due giri con lo stesso feed = zero notifiche.
- Push con **ntfy.sh**: `POST https://ntfy.sh/<NTFY_TOPIC>` con `Title`, `Priority` (giallo 3, arancione 4, rosso 5) e `Tags`.
  Il topic sta solo nel secret `NTFY_TOPIC` del repo: mai nel codice, mai nel sito, mai in questo file.
- Da **disattivare dopo il viaggio** (Actions → allerte → Disable workflow): vedi DA_VERIFICARE.md.

## Nel sito

- `src/ui/allerte.js` legge `allerte.json` con cache di 10 minuti (sessionStorage).
- Banner in cima a tutte le viste solo con un'allerta attiva su **Barcellona**: gialla (`--giallo`), arancione
  (`--terracotta`), rossa (sfondo rosso pieno, testo bianco), pre-allarme (giallo chiaro, "non ufficiale"). Tap → pannello
  con dettagli, fonte, regole di Protecció Civil e 112. Niente allerta → nessun banner, nessuno spazio.
- Oggi, card "Adesso": con allerta arancione o rossa e tappa in zona esposta (Maremagnum, Time Out Market, Bar Celta /
  Port Vell, Apolo / Paral·lel, Ciutadella, Bunkers) compare l'alternativa al coperto.
- Info › "Maltempo e emergenze": livelli e cosa fare, ES-Alert, 112, link (AEMET, Meteocat, @emergenciescat, stato del
  volo Ryanair), diritti se il volo salta. Le allerte di Bologna si vedono qui e nel pannello, non nel banner.
- `?now=` non inventa allerte: il banner dipende solo dal file.

## Prove: `node scripts/qa/allerte.mjs`

Fixture dei feed e server ntfy finto in locale: finestra chiusa → nessuna lettura; prima lettura → notifiche; stessa lettura →
zero; cambio di livello → una; fine → una; `--test` → la notifica di prova. Poi il sito con un `allerte.json` di prova nei
tre livelli (banner, colori, testo, pannello), Oggi con la tappa esposta, Info. Infine `grep`: nessun topic nel repo né nella build.
