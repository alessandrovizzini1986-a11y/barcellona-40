#!/usr/bin/env python3
"""Scarica lo stato dei voli (andata/ritorno) da AeroDataBox e scrive flight-status.json.
La chiave NON sta nel codice: arriva da GitHub Secrets (env RAPIDAPI_KEY).
Chiama l'API solo nei giorni del volo (o in test manuale via FORCE_FLIGHT/FORCE_DATE).
"""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

KEY = os.environ.get("RAPIDAPI_KEY", "").strip()
HOST = "aerodatabox.p.rapidapi.com"
OUT = "flight-status.json"

# Voli del viaggio: numero -> data (Europe/Madrid)
PLAN = {"FR2097": "2026-10-16", "FR5220": "2026-10-18"}

FORCE_F = os.environ.get("FORCE_FLIGHT", "").strip()
FORCE_D = os.environ.get("FORCE_DATE", "").strip()


def load():
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"updatedUtc": None, "flights": {}}


def api(no, date):
    url = f"https://{HOST}/flights/number/{no}/{date}"
    req = urllib.request.Request(url, headers={
        "x-rapidapi-key": KEY, "x-rapidapi-host": HOST,
        "User-Agent": "curl/8.5.0", "Accept": "application/json",
    })
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                payload = json.load(r)
            if not isinstance(payload, list):  # errori/rate-limit del provider arrivano come oggetto
                raise RuntimeError((payload or {}).get("message") or "risposta non-lista")
            return payload
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429, 502, 503):  # transitori: riprova con backoff
                time.sleep(3 * (attempt + 1)); continue
            raise
    raise last


def hm(t):
    """'2026-10-16 06:20+02:00' -> '06:20'"""
    return t[11:16] if t and len(t) >= 16 else None


def side(o):
    o = o or {}
    sched = (o.get("scheduledTime") or {})
    rev = (o.get("revisedTime") or {})
    s = sched.get("local") or sched.get("utc")
    r = rev.get("local") or rev.get("utc")
    return {
        "airport": (o.get("airport") or {}).get("iata") or (o.get("airport") or {}).get("icao"),
        "sched": hm(s), "est": hm(r) or hm(s),
        "terminal": o.get("terminal"), "gate": o.get("gate"),
        "belt": o.get("baggageBelt"),
        "_s": s, "_r": r,
    }


def parse(arr):
    if not arr:
        return None
    f = arr[-1]
    dep, arr_ = side(f.get("departure")), side(f.get("arrival"))
    delay = 0
    if dep["_s"] and dep["_r"]:
        try:
            delay = round((datetime.fromisoformat(dep["_r"].replace(" ", "T"))
                           - datetime.fromisoformat(dep["_s"].replace(" ", "T"))).total_seconds() / 60)
        except Exception:
            delay = 0
    st = (f.get("status") or "").lower()
    if "cancel" in st:
        text, bad = "❌ Volo cancellato", True
    elif delay >= 10 or "delay" in st:
        text = (f"⏱️ Ritardo {delay} min" if delay > 0 else "⏱️ In ritardo") + \
               (f" · stima {dep['est']}" if dep["est"] and dep["est"] != dep["sched"] else "")
        bad = True
    else:
        text = "✅ In orario" + (f" · T{dep['terminal']}" if dep["terminal"] else "") + (f" · gate {dep['gate']}" if dep["gate"] else "")
        bad = False
    for d in (dep, arr_):
        d.pop("_s", None); d.pop("_r", None)
    return {
        "text": text, "bad": bad, "status": f.get("status"), "delay": delay,
        "dep": dep, "arr": arr_,
        "aircraft": (f.get("aircraft") or {}).get("model"),
        "updated": datetime.now(ZoneInfo("Europe/Madrid")).strftime("%H:%M"),
    }


def main():
    data = load()
    data.setdefault("flights", {})
    if not KEY:
        print("RAPIDAPI_KEY mancante: nessuna chiamata."); return
    today = datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y-%m-%d")
    jobs = [(FORCE_F, FORCE_D)] if (FORCE_F and FORCE_D) else [(n, d) for n, d in PLAN.items() if d == today]
    if not jobs:
        print(f"Nessun volo in programma oggi ({today}). Skip."); return
    for no, date in jobs:
        try:
            data["flights"][no] = parse(api(no, date))
            print(no, date, "->", data["flights"][no])
        except Exception as e:
            print("Errore", no, ":", e, file=sys.stderr)
        time.sleep(2)  # rispetta il limite per-secondo del piano BASIC
    data["updatedUtc"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Scritto", OUT)


if __name__ == "__main__":
    main()
