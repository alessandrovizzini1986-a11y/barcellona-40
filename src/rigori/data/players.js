// Personaggi del gioco. I percorsi dei volti sono relativi ad ASSETS (base path del sito).
// NESSUNO stemma, NESSUNO sponsor, nessun nome di club: vincolo di marchio.
export const PLAYERS = [
  { id: 'mario',  nome: 'Mario',  ruolo: 'tiratore', numero: 10,
    maglia: { tipo: 'tinta', colore: '#E8552E' },
    face: 'faces/face-mario.png' },     // dal legacy (_legacy/assets/face-mario.png, 256×256 PNG)
  { id: 'giulio', nome: 'Giulio', ruolo: 'tiratore', numero: 7,
    maglia: { tipo: 'tinta', colore: '#3D5A80' },
    face: 'faces/face-giulio.png' },    // dal legacy (_legacy/assets/face-giulio.png, 256×256 PNG)
  { id: 'monne',  nome: 'Monne',  ruolo: 'tiratore', numero: 27,
    maglia: { tipo: 'strisce', colori: ['#A50044', '#004D98'], numeroColore: '#F2B705' },
    faceHead: 'faces/face-monne-head.webp',
    faceBust: 'faces/face-monne.webp' },
  { id: 'ale',    nome: 'Ale',    ruolo: 'portiere', numero: 1,
    maglia: { tipo: 'tinta', colore: '#2CA6A4' },
    face: 'faces/face-ale.png' }        // dal legacy (_legacy/assets/keeper-face.png, 512×512 PNG)
]
// Nomi ammessi nel pass-and-play (da prompt): Ale, Monne, Giulio, Manuel, Mario
export const PASS_PLAY_NAMES = ['Ale', 'Monne', 'Giulio', 'Manuel', 'Mario']
export const byId = (id) => PLAYERS.find((p) => p.id === id) || null
export const shooters = () => PLAYERS.filter((p) => p.ruolo === 'tiratore')
export const keeper = () => PLAYERS.find((p) => p.ruolo === 'portiere')
export const faceOf = (p) => p.faceHead || p.face
