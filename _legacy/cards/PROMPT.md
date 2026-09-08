# Card "Acquisto Ufficiale" — workflow serie reminder #MésQueUnAle

Ogni ospite che compra il biglietto diventa un "giocatore" con la card stile PES.
Flusso: render su Nano Banana (Gemini) → card → mini-clip del "giro".

---

## 1) Render FRONTE (Nano Banana — allega il selfie dell'ospite)

```
Using the attached photo as the reference for the face, redraw this person as a
stylized 3D football videogame player, in the visual style of PES / eFootball /
FIFA player-select renders.

KEEP THE EXACT LIKENESS (face shape, hair, beard, eyebrows, expression). Do not
beautify or change the features.

High-detail 3D hero character, upper body, three-quarter confident pose, looking
at the camera. FC Barcelona home kit: blaugrana vertical stripes (deep royal blue
and garnet red), V-neck collar with gold trim, realistic fabric folds.

Cinematic studio lighting, strong rim light, dark gradient stadium background
with bokeh crowd lights, teal-and-orange color grade, premium videogame-cover
quality, ultra detailed, 4k. Portrait 9:16, centered, head-to-chest framing.

Avoid: changing facial features, extra people, text, watermarks, logos.
```

## 2) Render RETRO (per il "giro" — allega il render di fronte come riferimento)

```
Using the attached image as the SAME character, generate a BACK VIEW from behind,
upper body. Same FC Barcelona home kit (blaugrana stripes, gold-trim collar).
On the back: surname "<COGNOME>" in large arched letters above a very large
number "<N>", cream/white classic football typography. Same hair on the back of
the head. Same lighting, dark stadium bokeh background, teal/orange grade, 9:16,
same scale/framing as the front. Rear view, no face. Only text: "<COGNOME>" and
"<N>". Avoid watermarks, logos, extra people.
```

## 3) Dati card (da passare a Claude col render)
- NOME / COGNOME (sulla maglia): es. ALE · VIZZO
- NUMERO: es. 10
- RUOLO/PILL: es. CAPITANO, BOMBER, REGISTA, PORTIERE…
- OVR: es. 99
- 2 STAT: es. VOGLIA DI FESTA 99, ENERGIA 99
- STATO: GIÀ A BORDO ✓

## 4) Output
- Card statica (template `ale_card2`): badge OVR, pill ruolo, barre stat, nome, "GIÀ A BORDO".
- Mini-clip "giro" (template `mkturn`): fronte → si volta → COGNOME+N → si rigira → CTA #MésQueUnAle.

## Ufficiale
- Hashtag: **#MésQueUnAle**
- Festeggiato: Ale (Vizzo) · #10 · Capitano · GIÀ A BORDO
- Evento: Barcellona, 16–18 ottobre 2026
- TODO sito: sezione "Partecipanti / Rosa" con le card man mano che confermano.
