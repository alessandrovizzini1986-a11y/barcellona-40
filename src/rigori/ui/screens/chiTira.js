import { esc } from '../components/esc.js'
import { overlay } from './overlay.js'
import { shooters, keeper as keeperData, byId } from '../../data/players.js'
// CHI TIRA?: tre volti. Toccarne uno porta dritto a Modalità, sempre: nessuna selezione da confermare.
// Il bordo giallo non è uno stato, è un'informazione: segna "Sei tu", il profilo scelto nel sito, e non
// cambia mai toccando gli altri. Sotto ogni nome la riga di progressione di quel giocatore.
// `profilo`: id del profilo del sito (null se il gioco è aperto da link diretto: niente bordo, niente
// pulsante primario). `statsDi(id)`: { xp, vittorie } oppure null se non ha mai tirato.
// Niente livello qui: livello, Boss e sblocchi sono del telefono (progressione di B7), non del singolo
// giocatore. Con "Lv" la riga diceva un numero diverso dal risultato.
export const rigaStats = (s) => s ? `${s.xp} XP · ${s.vittorie} ${s.vittorie === 1 ? 'vittoria' : 'vittorie'}` : 'Mai tirato'
export function chiTira(ui, ASSETS, { profilo = null, statsDi = () => null } = {}) {
  const ale = keeperData()
  const io = profilo && byId(profilo)?.ruolo === 'tiratore' ? byId(profilo) : null
  const cards = shooters().map((p) => {
    const sw = p.maglia.tipo === 'strisce' ? `linear-gradient(90deg, ${p.maglia.colori[0]} 0 25%, ${p.maglia.colori[1]} 25% 50%, ${p.maglia.colori[0]} 50% 75%, ${p.maglia.colori[1]} 75%)` : p.maglia.colore
    const img = p.faceBust || p.face
    const tu = io?.id === p.id
    return `<div class="rg-card__slot">${tu ? '<span class="rg-card__tu">Sei tu</span>' : ''}<button class="rg-card${tu ? ' rg-card--tu' : ''}" data-value="${p.id}" aria-label="Tira ${esc(p.nome)}, numero ${p.numero}${tu ? ', sei tu' : ''}">
      <span class="rg-card__jersey" style="background:${sw}"><b style="color:${p.maglia.numeroColore || '#F2E9DE'}">${p.numero}</b></span>
      <img class="rg-card__face${p.faceBust ? ' rg-card__face--bust' : ''}" src="${ASSETS}${img}" alt="" width="160" height="160" loading="eager" decoding="async">
      <span class="rg-card__name">${esc(p.nome)}</span>
      <span class="rg-card__stat">${esc(rigaStats(statsDi(p.id)))}</span>
    </button></div>`
  }).join('')
  const sub = io ? `In porta c'è ${esc(ale.nome)}, e parla troppo.` : `Tocca il tuo nome. In porta c'è ${esc(ale.nome)}, e parla troppo.`
  const primario = io ? `<p class="rg-chi__hint">Tocca un altro nome per far tirare lui</p><button class="rg-btn rg-btn--giallo rg-btn--block" data-value="${io.id}" data-tira-io aria-label="Tira come ${esc(io.nome)}">Tira come ${esc(io.nome)} →</button>` : ''
  return overlay(ui, `<h2 class="rg-title">Chi tira?</h2><p class="rg-sub">${sub}</p><div class="rg-cards">${cards}</div>${primario}<div class="rg-row"><button class="rg-btn rg-btn--ghost" data-value="__classifica" aria-label="Classifica di serata">Classifica di serata</button></div>`, { label: 'Scelta del tiratore', cls: 'rg-overlay--top', sito: true })
}
