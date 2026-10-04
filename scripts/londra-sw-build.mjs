// Completa dist/londra-sw.js dopo la build: lista dei file da salvare per l'offline e versione.
// La lista si ricava dalle pagine pubblicate (src, href, url(...) locali), più manifest e icone:
// se una pagina usa un file nuovo, entra da solo. La versione è un hash del contenuto di tutti i
// file in lista: cambia un byte, cambia la cache, e il telefono scarica la versione nuova.
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const PAGINE = ['londra.html', 'londra-illustrata.html']

export function precacheLondra(dist) {
  const insieme = new Set(PAGINE)
  for (const p of PAGINE) {
    const f = path.join(dist, p)
    if (!existsSync(f)) continue
    const html = readFileSync(f, 'utf8')
    const rif = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g), ...html.matchAll(/url\(\s*['"]?([^)'"?#]+)['"]?\s*\)/g)].map((m) => m[1])
    for (const r of rif) {
      if (/^(https?:|data:|mailto:|tel:|\/\/)/.test(r)) continue
      const rel = path.posix.normalize(r.replace(/^\.\//, ''))
      if (existsSync(path.join(dist, rel)) && statSync(path.join(dist, rel)).isFile()) insieme.add(rel)
    }
  }
  // icone dichiarate nel manifest
  const man = path.join(dist, 'londra-manifest.json')
  if (existsSync(man)) for (const i of JSON.parse(readFileSync(man, 'utf8')).icons || []) {
    const rel = path.posix.normalize(String(i.src).replace(/^\.\//, ''))
    if (existsSync(path.join(dist, rel))) insieme.add(rel)
  }
  return [...insieme].sort()
}

export function scriviSwLondra(dist) {
  const modello = path.join(dist, 'londra-sw.js')
  if (!existsSync(modello)) return null
  const lista = precacheLondra(dist)
  const h = createHash('sha256')
  let byte = 0
  for (const f of lista) { const b = readFileSync(path.join(dist, f)); h.update(f); h.update(b); byte += b.length }
  const versione = h.digest('hex').slice(0, 10)
  const src = readFileSync(modello, 'utf8')
  const V = "const VERSIONE = '__VERSIONE__'", L = 'const PRECACHE = __PRECACHE__'
  if (!src.includes(V) || !src.includes(L)) return null // già completato, o modello cambiato
  writeFileSync(modello, src.replace(V, `const VERSIONE = '${versione}'`).replace(L, 'const PRECACHE = ' + JSON.stringify(lista, null, 2)))
  return { versione, file: lista.length, byte }
}

// Plugin Vite: gira a fine build, dopo la copia di _legacy/
export function swLondra() {
  return {
    name: 'sw-londra',
    apply: 'build',
    closeBundle: {
      order: 'post',
      handler() {
        const r = scriviSwLondra(path.resolve('dist'))
        if (r) console.log(`[sw-londra] versione ${r.versione}: ${r.file} file, ${(r.byte / 1024).toFixed(0)} KB per l'offline`)
      }
    }
  }
}
