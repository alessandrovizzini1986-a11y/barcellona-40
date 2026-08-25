#!/usr/bin/env python3
"""
Risponde ai comandi scritti al bot Telegram.

Gira sullo stesso workflow del monitor (una volta all'ora): non c'e' un server
sempre acceso, quindi la risposta arriva al giro successivo, fino a ~1 ora dopo.

Legge i messaggi con getUpdates, tiene l'offset in state_bot.json per non
rispondere due volte alla stessa cosa, e ignora tutto cio' che arriva da chat
diverse da TG_CHAT_ID.
"""
import json
import time
import urllib.request

import monitor_blink182 as mon

STATE_FILE = "state_bot.json"

# Un messaggio piu' vecchio di cosi' non viene piu' risposto: serve a non far
# rispondere il bot all'arretrato accumulato prima che i comandi esistessero,
# e a non replicare a un comando ormai senza senso dopo un guasto lungo.
MAX_ETA_MESSAGGIO_S = 3 * 3600

AIUTO = (
    "Comandi disponibili:\n\n"
    "/stato — situazione attuale del concerto (dato live dal sito ufficiale)\n"
    "/aiuto — questo messaggio\n\n"
    "Nota: rispondo entro un'ora, non subito. Non c'è un server acceso: mi "
    "sveglio a ogni giro del controllo orario.\n\n"
    "Non devi comunque chiedermi niente: quando le vendite si aprono ti "
    "scrivo io."
)


def carica_offset() -> int:
    try:
        with open(STATE_FILE) as f:
            return int(json.load(f).get("offset", 0))
    except (FileNotFoundError, ValueError, json.JSONDecodeError):
        return 0


def salva_offset(offset: int) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump({"offset": offset}, f, indent=1)


def leggi_updates(offset: int) -> list:
    url = f"https://api.telegram.org/bot{mon.TG_BOT_TOKEN}/getUpdates"
    if offset:
        url += f"?offset={offset}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode()).get("result", [])


def testo_stato() -> str:
    try:
        evento = mon.find_milan(mon.fetch_events())
    except Exception as e:
        return f"⚠️ Non riesco a leggere il sito ufficiale in questo momento: {e}"

    if evento is None:
        return (
            "⚠️ L'evento di Milano non compare più sul sito ufficiale. "
            "Verifica a mano su blink182.com/pages/tour."
        )

    a = evento["attributes"]
    in_vendita = not a.get("is-collecting-waitlist")
    return (
        f"🎸 blink-182 {a.get('details') or ''}\n"
        f"📅 {a.get('starts-at-date-local')} — {a.get('venue-name')}\n\n"
        f"🎟 Vendite aperte: {'SÌ' if in_vendita else 'non ancora'}\n"
        f"⏳ Lista d'attesa: {mon.fmt(a.get('is-collecting-waitlist'))}\n"
        f"🔴 Sold out: {mon.fmt(a.get('is-sold-out'))}\n"
        f"🏷 Etichetta vendita: {a.get('on-sale-date-name') or '—'}\n"
        f"⭐ Presale: {a.get('promoted-on-sale-date-name') or '—'}"
    )


def risposta(testo: str) -> str:
    comando = testo.strip().split()[0].lower().split("@")[0] if testo.strip() else ""
    if comando in ("/stato", "/status"):
        return testo_stato()
    if comando in ("/aiuto", "/help", "/start"):
        return AIUTO
    return "Non ho capito. Scrivi /stato per la situazione, /aiuto per i comandi."


def main() -> None:
    offset = carica_offset()
    updates = leggi_updates(offset)
    if not updates:
        print("Nessun messaggio nuovo.")
        return

    adesso = time.time()
    risposte = 0

    for u in updates:
        offset = max(offset, u["update_id"] + 1)
        msg = u.get("message") or u.get("edited_message")
        if not msg or "text" not in msg:
            continue
        # Solo la chat del proprietario: chiunque puo' trovare il bot.
        if str(msg.get("chat", {}).get("id")) != str(mon.TG_CHAT_ID):
            print(f"Ignorato messaggio da chat estranea {msg.get('chat', {}).get('id')}.")
            continue
        if adesso - msg.get("date", 0) > MAX_ETA_MESSAGGIO_S:
            print(f"Ignorato messaggio troppo vecchio (update {u['update_id']}).")
            continue
        mon.telegram_send(risposta(msg["text"]))
        risposte += 1

    salva_offset(offset)
    print(f"Messaggi letti: {len(updates)}, risposte inviate: {risposte}.")


if __name__ == "__main__":
    main()
