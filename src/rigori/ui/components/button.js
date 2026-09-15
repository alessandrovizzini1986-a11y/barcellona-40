import { esc } from './esc.js'
// Bottone ≥ 48 px, aria-label esplicito, varianti primary/ghost
export const btn = (label, { kind = '', attrs = '', aria = '' } = {}) => `<button class="rg-btn${kind ? ' rg-btn--' + kind : ''}" ${attrs} aria-label="${esc(aria || label)}">${label}</button>`
