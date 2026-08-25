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
