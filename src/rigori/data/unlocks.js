// Sblocchi per livello: celebrazioni, palloni, camere, set di sfottò extra. Livelli XP: 100/250/500/900/1400 (da prompt).
// Le soglie per singolo sblocco sono mie: DA VERIFICARE.
export const LEVELS = [
  { n: 1, xp: 0, title: 'Esordiente' }, { n: 2, xp: 100, title: 'Riserva' }, { n: 3, xp: 250, title: 'Titolare' },
  { n: 4, xp: 500, title: 'Capitano' }, { n: 5, xp: 900, title: 'Leggenda' }, { n: 6, xp: 1400, title: 'Disonesto' }
]
export const BOSS_LEVEL = 5
export const UNLOCKS = [
  { id: 'ball:classico', kind: 'pallone', title: 'Pallone classico', desc: 'Il pallone di sempre.', level: 1 },
  { id: 'celeb:salto', kind: 'celebrazione', title: 'Esultanza: il salto', desc: 'Salta e urla.', level: 1 },
  { id: 'taunt:extra', kind: 'sfottò', title: 'Sfottò personalizzati', desc: 'Ale conosce i tuoi punti deboli.', level: 2 },
  { id: 'ball:mosaico', kind: 'pallone', title: 'Pallone trencadís', desc: 'Mosaico di ceramica, come le panchine del parco.', level: 2 },
  { id: 'celeb:cucchiaio', kind: 'celebrazione', title: 'Esultanza: il cucchiaio', desc: 'Mima il cucchiaio, anche se hai tirato un missile.', level: 2 },
  { id: 'cam:drone', kind: 'camera', title: 'Replay dal drone', desc: 'Il replay visto dall\'alto.', level: 3 },
  { id: 'celeb:scivolata', kind: 'celebrazione', title: 'Esultanza: la scivolata', desc: 'In ginocchio verso la bandierina.', level: 3 },
  { id: 'cam:dischetto', kind: 'camera', title: 'Replay dal dischetto', desc: 'Il replay dal punto di vista del pallone.', level: 4 },
  { id: 'celeb:il40', kind: 'celebrazione', title: 'Esultanza: il 40', desc: 'Quaranta con le dita. Poi ti giri.', level: 4 },
  { id: 'ball:oro', kind: 'pallone', title: 'Pallone d\'oro', desc: 'Oro puro, anzi vernice.', level: 5 }
]
export const levelFor = (xp) => { let l = LEVELS[0]; for (const L of LEVELS) if (xp >= L.xp) l = L; return l }
export const nextLevel = (xp) => { const cur = levelFor(xp); const nx = LEVELS.find((L) => L.n === cur.n + 1); if (!nx) return null; return { level: nx, toNext: nx.xp - xp, progress: (xp - cur.xp) / (nx.xp - cur.xp) } }
