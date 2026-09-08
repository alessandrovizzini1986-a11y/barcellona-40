import { icon } from './icons.js'
const LABEL = { verificato: 'verificato', stimato: 'stimato', da_verificare: 'da verificare', geocoded: 'coordinate automatiche' }
const TITLE = { verificato: 'Dato confermato', stimato: 'Orario indicativo', da_verificare: 'Dato ancora da confermare', geocoded: 'Coordinate calcolate automaticamente, da controllare' }
export function badge(kind, reveal = false) {
  if (!LABEL[kind]) return ''
  const ic = kind === 'da_verificare' ? icon('alert') : ''
  return `<span class="badge badge--${kind}${reveal ? ' badge--reveal' : ''}" title="${TITLE[kind]}">${ic}${LABEL[kind]}</span>`
}
export function badges(list, reveal = false) { return list.map((k) => badge(k, reveal)).join('') }
