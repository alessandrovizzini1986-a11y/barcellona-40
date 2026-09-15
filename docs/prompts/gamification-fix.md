# Prompt ad hoc · gamification affidabile

Segnalazione: spuntando "Fatto" sulla Sagrada arrivano gli XP; togliendo la spunta il titolo resta barrato con la casella vuota. Lo stato salvato e la casella non coincidono.

## Diagnosi
`bindCards` e i listener `change` di Missioni, Info e Oggi vengono aggiunti a `#app` a ogni render e mai rimossi. `#app` sopravvive al cambio di vista: dopo N navigazioni un tocco fa N `toggle`. Con N pari lo stato torna indietro mentre la casella resta dove l'ha messa il dito. Con N dispari i toast escono N volte. In Missioni, togliere una missione non toglieva la tappa collegata.

## Regole
1. **Nessun accumulo.** Ogni vista crea un `AbortController`, registra i listener su `#app` con `{ signal }` e abortisce nel cleanup restituito al router.
2. **Idempotenza.** Le checkbox scrivono lo stato che mostrano: `store.setDone / setMission / setCheck(id, on)` con `on = checkbox.checked`. Mai `toggle` da un evento di UI.
3. **Una sola verità tappa ↔ missione.** `game.setStopDone` e `game.setMissionDone` aggiornano entrambi i lati, in entrambe le direzioni. La missione segue la persona: si completa solo se la persona ne fa parte.
4. **Feedback solo sulle transizioni reali.** `+XP`, toast e coriandoli quando la missione passa da non fatta a fatta; toast discreto quando torna indietro. Nessun feedback se lo stato non cambia.
5. **Coerenza visiva immediata.** Tutte le card della stessa tappa sulla pagina si allineano; in Oggi l'anello di progresso si aggiorna al tocco.
6. **Test di regressione.** Navigare tra le viste 2 e 3 volte, poi un tocco solo: stato, classe `card--done`, casella e XP devono coincidere. Spuntare e togliere una missione deve spuntare e togliere la tappa, e viceversa. Le verifiche in Info cambiano di uno per tocco.
