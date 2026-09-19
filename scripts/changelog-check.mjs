// Promemoria del changelog: se si toccano i dati o il codice del sito senza aggiungere una entry in
// data/changelog.json, chi rientra non vede niente di quello che è cambiato. È un AVVISO, non un errore:
// un fix invisibile non ha bisogno di una entry, e bloccare la build per un refactor sarebbe attrito inutile.
//
//   node scripts/changelog-check.mjs     (lo chiama anche `npm run build`)
import { execSync } from 'node:child_process'

export const CHANGELOG = 'data/changelog.json'
export const toccaIlSito = (f) => /^(data|src)\//.test(f)
export const serveAvviso = (files) => files.some(toccaIlSito) && !files.includes(CHANGELOG)

// I file in ballo: quelli non ancora committati se ce ne sono, altrimenti quelli dell'ultimo commit.
export function fileToccati() {
  try {
    const stato = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').filter(Boolean)
      // "R  vecchio -> nuovo": conta il nome nuovo
      .map((r) => r.slice(3).trim().split(' -> ').pop())
    if (stato.length) return stato
    return execSync('git show --name-only --format= HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map((r) => r.trim()).filter(Boolean)
  } catch { return [] } // niente git (o repo non leggibile): nessun avviso, mai un errore
}

export const MESSAGGIO = '⚠️  Modifiche al sito senza una nuova entry nel changelog.'
// `files` si passa solo nei test: nell'uso vero lo chiede a git
export function avvisa(stampa = console.warn, files = fileToccati()) {
  if (!serveAvviso(files)) return false
  stampa(MESSAGGIO)
  stampa(`   Aggiungi una voce in ${CHANGELOG} con "v" incrementato, o tira dritto se è un fix invisibile.`)
  return true
}

if (import.meta.url === `file://${process.argv[1]}`) avvisa()
