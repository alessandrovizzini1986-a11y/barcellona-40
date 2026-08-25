# Deploy di blink-monitor — istruzioni operative

Questa cartella contiene l'albero **già pronto** da caricare in un repo GitHub
privato dedicato (`blink-monitor`). I file vanno alla **radice** di quel repo,
rispettando i percorsi:

```
monitor_blink182.py
README.md
.github/workflows/monitor.yml
```

> Nota: qui dentro il workflow sta in `blink-monitor/.github/workflows/` e
> quindi **non** viene eseguito da questo repo. GitHub Actions attiva solo i
> file in `.github/workflows/` alla radice. È voluto.

## Valori già ricavati

| Secret | Valore |
|---|---|
| `TG_BOT_TOKEN` | il token di BotFather per `t.me/Blink86_bot` (non committarlo mai) |
| `TG_CHAT_ID` | `7755975670` |

`TG_CHAT_ID` è stato ricavato da `getUpdates`: chat privata "Alessandro",
`chat.id = 7755975670`.

## Verifica già effettuata

Lo script è stato eseguito con quei due valori: l'API Seated risponde, l'evento
di Milano viene trovato e la notifica `✅ blink-monitor ATTIVO` è stata
consegnata su Telegram. Stato letto:

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

## Comandi per completare il deploy

Da eseguire su una macchina con `gh` installato e autenticato
(`gh auth login`, scope `repo` + `workflow`):

```bash
# 1. autenticazione
gh auth status

# 2. repo privato + push dei file ai percorsi giusti
mkdir blink-monitor && cd blink-monitor
# copiare qui monitor_blink182.py, README.md, .github/workflows/monitor.yml
git init -b main
git add .
git commit -m "blink-182 Milano monitor"
gh repo create blink-monitor --private --source=. --push

# 3. secrets
gh secret set TG_BOT_TOKEN --body '<TOKEN_BOTFATHER>'
gh secret set TG_CHAT_ID  --body '7755975670'

# 4. primo lancio + verifica
gh workflow run "blink-182 Milano monitor"
sleep 5
gh run watch "$(gh run list --workflow=monitor.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Al termine il run deve essere verde e su Telegram arriva
`✅ blink-monitor ATTIVO`.

## Se il primo run non manda nulla

Lo script notifica solo al **primo** run (quando `state_milano.json` non
esiste). Se il file è già stato committato, cancellalo dal repo e rilancia:

```bash
git rm state_milano.json && git commit -m "reset state" && git push
gh workflow run "blink-182 Milano monitor"
```
