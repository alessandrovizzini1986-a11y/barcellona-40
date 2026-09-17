// Personaggi del gioco. I percorsi dei volti sono relativi ad ASSETS (base path del sito).
// NESSUNO stemma, NESSUNO sponsor, nessun nome di club: vincolo di marchio.
export const PLAYERS = [
  { id: 'mario',  nome: 'Mario',  ruolo: 'tiratore', numero: 10,
    maglia: { tipo: 'tinta', colore: '#E8552E' },
    face: 'faces/face-mario.png',       // dal legacy (_legacy/assets/face-mario.png, 256×256 PNG)
    stats: { potenza: 3, precisione: 5, effetto: 2 },
    tips: ['Il veterano: potenza media, precisione alta.', 'Ha la traversa facile: tienilo basso.'] },
  { id: 'giulio', nome: 'Giulio', ruolo: 'tiratore', numero: 7,
    maglia: { tipo: 'tinta', colore: '#3D5A80' },
    face: 'faces/face-giulio.png',      // dal legacy (_legacy/assets/face-giulio.png, 256×256 PNG)
    stats: { potenza: 4, precisione: 4, effetto: 3 },
    tips: ['Freddo dal dischetto: tira agli angoli.', 'In porta si tuffa presto: aspetta un attimo prima di tirare.'] },
  { id: 'monne',  nome: 'Monne',  ruolo: 'tiratore', numero: 27,
    maglia: { tipo: 'strisce', colori: ['#A50044', '#004D98'], numeroColore: '#F2B705' },
    faceHead: 'faces/face-monne-head.webp',
    faceBust: 'faces/face-monne.webp',
    stats: { potenza: 2, precisione: 3, effetto: 5 },
    tips: ['Parte in anticipo: piazzala, non caricare troppo.', 'Con gli occhiali da sole legge male i tiri bassi.'] },
  { id: 'ale',    nome: 'Ale',    ruolo: 'portiere', numero: 1,
    maglia: { tipo: 'tinta', colore: '#2CA6A4' },
    face: 'faces/face-ale.png',         // dal legacy (_legacy/assets/keeper-face.png, 512×512 PNG)
    stats: { potenza: 3, precisione: 3, effetto: 1 },
    tips: ['Parla troppo: non farti distrarre.', 'Ha il lato debole a destra, in basso.'] }
]
// Statistiche mostrate nella card di conferma: fittizie ma coerenti col personaggio, 5 tacche.
// DA VERIFICARE: non sono agganciate alla fisica del tiro, sono solo un ritratto.
export const STAT_LABELS = { potenza: 'Potenza', precisione: 'Precisione', effetto: 'Effetto' }
// Nomi ammessi nel pass-and-play (da prompt): Ale, Monne, Giulio, Manuel, Mario
export const PASS_PLAY_NAMES = ['Ale', 'Monne', 'Giulio', 'Manuel', 'Mario']
export const byId = (id) => PLAYERS.find((p) => p.id === id) || null
export const shooters = () => PLAYERS.filter((p) => p.ruolo === 'tiratore')
export const keeper = () => PLAYERS.find((p) => p.ruolo === 'portiere')
export const faceOf = (p) => p.faceHead || p.face
