// Traguardi: id, titolo, descrizione e regola (in chiaro). La verifica sta in game/progress.js.
// Definizioni mie dove il prompt dà solo il nome (es. "Cucchiaio" = tiro lento e alto al centro): DA VERIFICARE.
export const ACHIEVEMENTS = [
  { id: 'cucchiaio', title: 'Cucchiaio', desc: 'Segna con un cucchiaio: tiro lento (potenza < 0,55), alto e centrale.' },
  { id: 'cinque', title: 'Cinque su cinque', desc: 'Cinque rigori su cinque in uno Shootout.' },
  { id: 'muro', title: 'Muro di Ale', desc: 'Para tre tiri di fila da portiere.' },
  { id: 'rimonta', title: 'Rimonta da 0-2', desc: 'Vinci uno Shootout dopo essere stato sotto 0-2.' },
  { id: 'traversa', title: 'Traversa piena', desc: 'Colpisci la traversa in pieno.' },
  { id: 'incrocio', title: 'Incrocio dei pali', desc: 'Segna all\'incrocio dei pali.' },
  { id: 'speedrun', title: 'Speedrun', desc: 'Cinque gol in 40 secondi (Sfida Ale o Skill).' },
  { id: 'disonesto', title: 'Disonesto', desc: 'Vinci al sudden death con un cucchiaio.' }
]
export const byId = (id) => ACHIEVEMENTS.find((a) => a.id === id) || null
