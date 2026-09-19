import { icon } from './icons.js'
const TABS = [
  ['oggi', 'Oggi', 'sun'], ['programma', 'Programma', 'list'], ['mappa', 'Mappa', 'map'], ['missioni', 'Missioni', 'trophy'], ['info', 'Info', 'info']
]
export function renderTabbar(active, { hideMissions = false, novita = false } = {}) {
  const nav = document.getElementById('tabbar')
  nav.setAttribute('role', 'tablist')
  const visible = TABS.filter(([id]) => !(hideMissions && id === 'missioni'))
  const a = active === 'speedrun' ? 'oggi' : active
  nav.innerHTML = visible.map(([id, label, ic]) => `<a class="tab" role="tab" href="#/${id}" aria-selected="${id === a}" ${id === a ? 'aria-current="page"' : ''} aria-label="${label}${novita && id === 'info' ? ', ci sono novità' : ''}">${icon(ic)}${novita && id === 'info' ? '<span class="tab__dot" aria-hidden="true"></span>' : ''}<span>${label}</span></a>`).join('')
}
