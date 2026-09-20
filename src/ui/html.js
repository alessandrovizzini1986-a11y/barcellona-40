// Escape per contenuti inseriti in template
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Testo con link: si escapa prima tutto, poi si riconoscono le URL http(s) nel testo già sicuro.
// Serve per i dettagli delle tappe, dove ogni tanto un indirizzo va aperto davvero (la pagina
// promozioni del casinò). Niente HTML nei dati: qui dentro passa solo testo.
export const escLink = (s) => esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:)\]]/g,
  (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '')}</a>`)
