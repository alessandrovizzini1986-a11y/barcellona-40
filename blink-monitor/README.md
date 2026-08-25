# blink-182 @ I-Days Milano 13/06/2027 — monitor automatico

**Data CONFERMATA** dalla fonte ufficiale (blink182.com):
📅 13 giugno 2027 — I-Days, Ippodromo SNAI San Siro, Milano — with Pierce The Veil
🎟 Stato attuale: vendite NON ancora aperte, lista d'attesa attiva, non sold out.

Questo robot controlla ogni notte (~mezzanotte italiana) lo stato dell'evento
direttamente dall'API del sito ufficiale della band (Seated — nessuna chiave
richiesta) e ti scrive su **Telegram** SOLO quando qualcosa cambia:
apertura vendite, presale, sold out, cambio data/venue, evento rimosso.

Costo: 0 €. Gira sui server GitHub, nessun PC acceso.

## Requisiti (già quasi tutti fatti)
- ✅ Bot Telegram creato: t.me/Blink86_bot
- ⬜ **Mandare un messaggio qualsiasi al bot** (obbligatorio, altrimenti il
  chat_id non esiste)
- ⬜ Account GitHub

## Setup
1. Crea un repo GitHub **privato** (es. `blink-monitor`) e carica i 3 file
   rispettando i percorsi:
   - `monitor_blink182.py`
   - `.github/workflows/monitor.yml`
   - `README.md`
2. **Settings → Secrets and variables → Actions** → crea 2 secrets:

   | Nome | Valore |
   |---|---|
   | `TG_BOT_TOKEN` | il token del bot da BotFather |
   | `TG_CHAT_ID` | il numero che ottieni da `https://api.telegram.org/bot<TOKEN>/getUpdates` dopo aver scritto al bot |

3. Tab **Actions** → "blink-182 Milano monitor" → **Run workflow**.
   Al primo run ricevi su Telegram la conferma "✅ blink-monitor ATTIVO"
   con lo stato attuale. Poi silenzio finché non cambia qualcosa.

## Come compra i biglietti quando scatta l'avviso
L'API dice QUANDO si muove qualcosa, non vende. Alla notifica:
1. blink182.com/pages/tour (link ufficiali)
2. ticketone.it / vivaticket.com / ticketmaster.it (canali I-Days in Italia)
Consiglio: attiva anche l'"Avvisami" su ticketone.it come seconda rete.

## Limiti dichiarati
- La fonte è il fornitore dati del sito ufficiale: se la band cambiasse
  fornitore, il monitor segnala "evento non più presente" e va aggiornato.
- Il cron GitHub può slittare di qualche minuto: irrilevante.
- GitHub sospende i cron su repo inattivi dopo ~60 giorni senza commit;
  questo workflow committa il file di stato quando cambia, ma se ricevi
  una mail GitHub "workflow disabled", riattivalo con un click.

## Scrivere al bot

Il bot risponde a due comandi:

| Comando | Cosa fa |
|---|---|
| `/stato` | situazione attuale del concerto, letta live dal sito ufficiale |
| `/aiuto` | elenco dei comandi |

**La risposta non e' immediata: arriva entro circa un'ora.** Non c'e' un server
acceso — il bot si sveglia a ogni giro del workflow (cron orario), legge i
messaggi con `getUpdates` e risponde. E' il prezzo del costo zero.

Dettagli di funzionamento:
- l'offset degli update sta in `state_bot.json`, cosi' non risponde due volte
  alla stessa cosa;
- i messaggi piu' vecchi di 3 ore vengono ignorati (niente risposte a comandi
  ormai scaduti dopo un guasto lungo);
- i messaggi da chat diverse da `TG_CHAT_ID` vengono scartati: il bot e'
  pubblico su Telegram, chiunque puo' trovarlo, ma risponde solo a te.

Non serve comunque chiedere niente: quando le vendite si aprono, e' il bot che
scrive per primo.

## Come testare che l'avviso funzioni davvero

Il primo run manda solo la conferma di attivazione. Per verificare la parte che
conta — l'avviso quando qualcosa cambia — si simula un cambiamento falsificando
lo stato salvato. Tutto dal browser del telefono, senza PC:

1. Apri `state_milano.json` nel repo → tap sulla matita ✏️.
2. Cambia un valore, per esempio `"is-sold-out": false` → `"is-sold-out": true`.
3. *Commit changes* direttamente su `main`.

Il commit fa ripartire il workflow. Lo script confronta il file falsificato con
lo stato vero, vede una differenza e ti manda:

```
🚨 blink-182 MILANO 13/06/2027 — CAMBIAMENTO RILEVATO:
• Sold out: SÌ → no
```

Poi risalva da solo lo stato corretto e lo committa: il test si pulisce da
sé, non devi rimettere a posto niente.

Se non arriva nulla, guarda la tab *Actions*: il run rosso dice al primo step
quale secret manca, gli altri errori sono nel log dello step "Run monitor".

### Verificare che il cron parta
Non c'è modo di anticiparlo: il giorno dopo, nella tab *Actions*, deve comparire
un run con evento `schedule` attorno alle 23:00 UTC. Se c'è ed è verde, il
monitor è vivo (in silenzio, com'è giusto).
