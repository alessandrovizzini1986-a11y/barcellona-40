#!/usr/bin/env python3
"""
Monitor blink-182 @ I-Days Milano, 13 giugno 2027.
Fonte: API Seated (il widget tour ufficiale di blink182.com) — nessuna chiave richiesta.
Logica: ogni notte scarica lo stato dell'evento di Milano e notifica su Telegram
SOLO se qualcosa è cambiato (es. apertura vendite, sold out, cambio data).
Secrets richiesti: TG_BOT_TOKEN, TG_CHAT_ID.
"""
import os
import sys
import json
import urllib.request
import urllib.parse

SEATED_ARTIST_ID = "55439e12-f3b1-4281-a9f0-a427fa1b04df"  # blink-182 (da blink182.com)
SEATED_URL = (
    f"https://cdn.seated.com/api/tour/{SEATED_ARTIST_ID}?include=tour-events"
)
TARGET_DATE = "2027-06-13"
TARGET_CITY = "milan"

TG_BOT_TOKEN = os.environ["TG_BOT_TOKEN"]
TG_CHAT_ID = os.environ["TG_CHAT_ID"]

STATE_FILE = "state_milano.json"

# Campi che, se cambiano, meritano una notifica
WATCH_FIELDS = [
    "is-sold-out",
    "is-collecting-waitlist",
    "on-sale-date-name",
    "promoted-on-sale-date-name",
    "starts-at-date-local",
    "venue-name",
    "details",
    "vip-link-url",
    "exchange-listing-url",
    "has-vip",
]

FIELD_LABELS = {
    "is-sold-out": "Sold out",
    "is-collecting-waitlist": "Lista d'attesa attiva (= vendite NON ancora aperte)",
    "on-sale-date-name": "Etichetta vendita",
    "promoted-on-sale-date-name": "Presale",
    "starts-at-date-local": "Data concerto",
    "venue-name": "Venue",
    "details": "Dettagli",
    "vip-link-url": "Link VIP",
    "exchange-listing-url": "Link rivendita",
    "has-vip": "Pacchetti VIP",
}


def telegram_send(text: str) -> None:
    url = f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage"
    data = urllib.parse.urlencode(
        {"chat_id": TG_CHAT_ID, "text": text, "disable_web_page_preview": "true"}
    ).encode()
    urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=30)


def fetch_events() -> list:
    req = urllib.request.Request(
        SEATED_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (blink-monitor)",
            "Accept": "application/vnd.api+json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
    return [i for i in data.get("included", []) if i.get("type") == "tour-events"]


def find_milan(events: list) -> dict | None:
    for e in events:
        a = e.get("attributes", {})
        addr = str(a.get("formatted-address", "")).lower()
        date = a.get("starts-at-date-local", "")
        if TARGET_CITY in addr or date == TARGET_DATE:
            return e
    return None


def snapshot(event: dict) -> dict:
    a = event.get("attributes", {})
    return {f: a.get(f) for f in WATCH_FIELDS}


def load_state() -> dict | None:
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def save_state(s: dict) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump(s, f, indent=1, ensure_ascii=False)


def fmt(v):
    return {True: "SÌ", False: "no", None: "—"}.get(v, str(v))


def main() -> None:
    try:
        events = fetch_events()
    except Exception as e:
        telegram_send(f"⚠️ blink-monitor: errore API Seated: {e}")
        sys.exit(1)

    milan = find_milan(events)
    old = load_state()

    if milan is None:
        if old is not None and not old.get("_event_missing"):
            telegram_send(
                "⚠️ blink-monitor: l'evento di Milano 13/06/2027 NON compare più "
                "sul sito ufficiale blink182.com. Verifica manualmente (rinvio? "
                "cancellazione? cambio fornitore dati?)."
            )
            save_state({"_event_missing": True})
        else:
            print("Evento Milano non presente (già segnalato o mai visto).")
        return

    new = snapshot(milan)

    if old is None:
        # Primo run: conferma attivazione con stato corrente
        a = milan["attributes"]
        telegram_send(
            "✅ blink-monitor ATTIVO\n\n"
            f"🎸 blink-182 {a.get('details') or ''}\n"
            f"📅 {a.get('starts-at-date-local')} — {a.get('venue-name')}\n"
            f"🎟 Sold out: {fmt(a.get('is-sold-out'))}\n"
            f"⏳ Lista d'attesa (vendite non aperte): {fmt(a.get('is-collecting-waitlist'))}\n\n"
            "Da stanotte controllo ogni giorno e ti scrivo SOLO se cambia qualcosa "
            "(apertura vendite, presale, sold out)."
        )
        save_state(new)
        print("Primo run: stato salvato e notifica di attivazione inviata.")
        return

    changes = [
        f"• {FIELD_LABELS.get(f, f)}: {fmt(old.get(f))} → {fmt(new.get(f))}"
        for f in WATCH_FIELDS
        if old.get(f) != new.get(f)
    ]

    if changes:
        telegram_send(
            "🚨 blink-182 MILANO 13/06/2027 — CAMBIAMENTO RILEVATO:\n\n"
            + "\n".join(changes)
            + "\n\n👉 Controlla subito ticketone.it / vivaticket.com / "
            "ticketmaster.it e blink182.com/pages/tour"
        )
        save_state(new)
        print(f"Notificati {len(changes)} cambiamenti.")
    else:
        print("Nessun cambiamento.")


if __name__ == "__main__":
    main()
