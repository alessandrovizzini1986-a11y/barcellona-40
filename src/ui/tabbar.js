import { icon } from './icons.js'
const TABS = [
  ['oggi', 'Oggi', 'sun'], ['programma', 'Programma', 'list'], ['mappa', 'Mappa', 'map'], ['missioni', 'Missioni', 'trophy'], ['info', 'Info', 'info']
]
export function renderTabbar(active, { hideMissions = false } = {}) {
  const nav = document.getElementById('tabbar')
  nav.setAttribute('role', 'tablist')
  const visible = TABS.filter(([id]) => !(hideMissions && id === 'missioni'))
  const a = active === 'speedrun' ? 'oggi' : active
  nav.innerHTML = visible.map(([id, label, ic]) => `<a class="tab" role="tab" href="#/${id}" aria-selected="${id === a}" ${id === a ? 'aria-current="page"' : ''} aria-label="${label}">${icon(ic)}<span>${label}</span></a>`).join('')
}
