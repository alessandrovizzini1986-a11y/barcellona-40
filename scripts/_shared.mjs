// Utilità condivise dagli script dati (Node 18+)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DATA = path.join(ROOT, 'data')
export const readJson = (name) => JSON.parse(readFileSync(path.join(DATA, name), 'utf8'))
export const writeJson = (name, obj) => writeFileSync(path.join(DATA, name), JSON.stringify(obj, null, 1) + '\n')
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// DA_VERIFICARE.md: aggiorna una sezione delimitata da marker, senza toccare il resto del file
export function updateSection(marker, lines) {
  const file = path.join(ROOT, 'DA_VERIFICARE.md')
  const start = `<!-- ${marker}:start -->`, end = `<!-- ${marker}:end -->`
  const block = `${start}\n${lines.length ? lines.map((l) => `- ${l}`).join('\n') : '- nessuna voce'}\n${end}`
  let txt = existsSync(file) ? readFileSync(file, 'utf8') : '# DA VERIFICARE · Barcelona 40\n\nGenerato in parte dagli script dati (`npm run data`). Le sezioni tra marker vengono riscritte a ogni esecuzione.\n'
  if (txt.includes(start) && txt.includes(end)) {
    txt = txt.slice(0, txt.indexOf(start)) + block + txt.slice(txt.indexOf(end) + end.length)
  } else {
    txt += `\n## ${marker}\n\n${block}\n`
  }
  writeFileSync(file, txt)
}
