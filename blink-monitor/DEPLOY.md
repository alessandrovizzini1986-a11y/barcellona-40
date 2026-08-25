# Deploy di blink-monitor — solo da telefono

Nessun PC necessario. Servono due form del sito github.com (browser del
telefono), il resto lo fa Claude via push.

## Valori pronti

| Secret | Valore |
|---|---|
| `TG_BOT_TOKEN` | il token di BotFather per `t.me/Blink86_bot` |
| `TG_CHAT_ID` | `7755975670` |

`TG_CHAT_ID` ricavato da `getUpdates`: chat privata "Alessandro",
`chat.id = 7755975670`. Il token non è committato in nessun file.

## Verifica già fatta

Lo script è stato eseguito con quei valori: API Seated raggiungibile, evento di
Milano trovato, notifica `✅ blink-monitor ATTIVO` consegnata su Telegram.

```json
{
  "is-sold-out": false,
  "is-collecting-waitlist": true,
  "on-sale-date-name": "TICKETS",
  "starts-at-date-local": "2027-06-13",
  "venue-name": "I-Days IPPODROMO SNAI SAN SIRO",
  "details": "with Pierce The Veil"
}
```

## Passi

1. **Creare il repo** — github.com → `+` → *New repository*
   - Name: `blink-monitor`
   - **Private**
   - non spuntare "Add a README" (il repo deve restare vuoto)

2. **Aggiungere i 2 secrets** — repo → *Settings* → *Secrets and variables* →
   *Actions* → *New repository secret*, due volte, coi valori della tabella
   sopra. Vanno messi **prima** del push: il workflow parte da solo al push.

3. **Claude carica i file** ai percorsi giusti:
   ```
   monitor_blink182.py
   README.md
   .github/workflows/monitor.yml
   ```

4. Il push fa partire il workflow (trigger `push` su `main`). Su Telegram
   arriva `✅ blink-monitor ATTIVO`.

## Se il run è rosso

Lo step "Controlla che i secrets ci siano" dice esattamente quale manca.
Aggiungilo e rilancia da *Actions* → *blink-182 Milano monitor* →
*Run workflow*.

## Se lo script non manda nulla

Notifica solo al **primo** run, cioè quando `state_milano.json` non esiste
ancora nel repo. Per riavere la conferma: cancella quel file dal repo
(*Actions* non serve, basta il cestino nella UI web) e rilancia.
