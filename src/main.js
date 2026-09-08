// Bootstrap: stili, tema, mosaico, onboarding, router e viste
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/motion.css'
import './styles/views.css'

import { store } from './store.js'
import { startRouter, navigate, parseHash } from './router.js'
import { readOverride, now, dayKey, phase } from './time.js'
import { applyMosaic } from './ui/mosaic.js'
import { renderTabbar } from './ui/tabbar.js'
import { personById } from './data.js'
import { esc } from './ui/html.js'
import { renderOnboarding } from './views/onboarding.js'
import { easterEgg } from './ui/egg.js'

const views = {
  oggi: () => import('./views/oggi.js'),
  programma: () => import('./views/programma.js'),
  mappa: () => import('./views/mappa.js'),
  missioni: () => import('./views/missioni.js'),
  info: () => import('./views/info.js'),
  speedrun: () => import('./views/speedrun.js')
}

const app = document.getElementById('app')
let cleanup = null
let token = 0

export function applyTheme() {
  document.documentElement.dataset.theme = store.theme === 'light' ? 'light' : 'dark'
}
function applyDay() {
  const k = dayKey(now())
  if (k) document.documentElement.dataset.day = k
  else delete document.documentElement.dataset.day
}

export function header(subtitle) {
  const p = personById(store.person)
  return `<header class="header">
    <div class="header__row">
      <div>
        <h1 class="header__title" id="site-title">Barcelona <b>40</b></h1>
        <p class="header__sub">${esc(subtitle || '16–18 ottobre 2026')}</p>
        <span class="header__anchor">Zero fatica, tutto gusto</span>
      </div>
      ${p ? `<a class="person-chip" href="#/info/profilo" style="--pc:var(${p.color})" aria-label="Profilo: ${esc(p.name)}"><span class="person-chip__dot"></span>${esc(p.name)}</a>` : ''}
    </div>
  </header>`
}

async function route({ route, sub, params }) {
  readOverride()
  applyDay()
  const my = ++token
  if (typeof cleanup === 'function') { try { cleanup() } catch { /* noop */ } cleanup = null }
  if (!store.person) {
    renderTabbar(route, { hideMissions: true })
    cleanup = renderOnboarding(app, () => navigate('oggi'))
    return
  }
  if (route === 'speedrun' && store.person !== 'monne') { navigate('oggi'); return }
  renderTabbar(route, { hideMissions: store.gamificationHidden })
  const mod = await views[route]()
  if (my !== token) return
  cleanup = await mod.render(app, { route, sub, params, person: store.person, header })
  if (my !== token) return
  if (!sub) scrollTo({ top: 0, behavior: 'instant' })
  easterEgg(document.getElementById('site-title'))
}

applyTheme()
applyMosaic(now())
startRouter(route)

// Ri-render leggero quando cambia lo stato che influenza header/tab
store.subscribe((key) => {
  if (key === 'theme') applyTheme()
  if (key === 'gamificationHidden' || key === 'person') route(parseHash())
})

// Aggiorna il colore del giorno a cavallo della mezzanotte (senza ricaricare)
setInterval(applyDay, 60_000)
if (phase() === 'during') applyMosaic(now())
