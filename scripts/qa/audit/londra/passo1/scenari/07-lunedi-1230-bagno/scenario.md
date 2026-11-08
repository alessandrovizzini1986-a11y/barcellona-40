# Scenario 7 · Lunedì 12:30

**Domande:** Olly deve andare in bagno: quanti tocchi per il bagno più vicino?

## Passi

- Apro `londra.html?now=2026-11-16T12:30`
  - 📸 `01-adesso.png`
- 🎯 **Portami lì nella prima schermata**: 0 tocchi, 0 scorrimenti · visibile
- 👆 riga «🚻» in «Adesso»
  - 📸 `02-bagno-aperto.png`
- 🎯 **«Portami al bagno» visibile**: 1 tocco, 0 scorrimenti · visibile
- 👆 «🧭 Portami al bagno» → si apre Google Maps in una scheda nuova: `https://www.google.com/maps/dir/?api=1&destination=51.4994055,-0.1632344&travelmode=walking`
- ↩️ torno alla pagina (la scheda di Maps si chiude, la pagina resta dov’era)

## Conteggio

- Tocchi: **2**
- Scorrimenti (gesti stimati, ~3/4 di schermo ciascuno): **0**
- Tempo trascorso nello script: 5.8 s (comprende le attese di caricamento; non è il tempo di una persona)
- Errori JavaScript: 0
