import { defineConfig } from 'vite'
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { avvisa } from './scripts/changelog-check.mjs'

// File di root del sito precedente che NON vanno ripubblicati:
// - index.html: la home è quella nuova
// - sw.js: il vecchio service worker ha in precache './' e './index.html', si riprenderebbe il sito nuovo.
//   Deve restare 404 così i browser che lo avevano installato lo disinstallano.
// - manifest.json: lo usava solo la vecchia home, e il sito nuovo è una pagina web normale.
const LEGACY_SKIP_ROOT = new Set(['index.html', 'sw.js', 'manifest.json'])
// Il gioco dei rigori precedente resta pubblicato come fallback, ma con un altro nome:
// /rigori/ è del gioco nuovo, il vecchio risponde a /rigori-classic.html
const LEGACY_RENAME_ROOT = { 'rigori.html': 'rigori-classic.html' }

// Copia _legacy/ dentro dist/ mantenendo gli URL storici (viaggio.html, tour.html, soldi/, gym/, …).
// Non sovrascrive mai un file prodotto dalla build.
function copyLegacy() {
  return {
    name: 'copy-legacy',
    apply: 'build',
    closeBundle() {
      const src = path.resolve('_legacy')
      const out = path.resolve('dist')
      if (!existsSync(src)) return
      let copied = 0, skipped = 0
      const walk = (from, to, depth) => {
        mkdirSync(to, { recursive: true })
        for (const name of readdirSync(from)) {
          if (depth === 0 && LEGACY_SKIP_ROOT.has(name)) { skipped++; continue }
          const outName = depth === 0 && LEGACY_RENAME_ROOT[name] ? LEGACY_RENAME_ROOT[name] : name
          const f = path.join(from, name), t = path.join(to, outName)
          if (statSync(f).isDirectory()) walk(f, t, depth + 1)
          else if (existsSync(t)) skipped++
          else { copyFileSync(f, t); copied++ }
        }
      }
      walk(src, out, 0)
      // I link del sito precedente (guida, sala giochi) puntano a rigori.html: pagina di raccordo verso il gioco nuovo
      writeFileSync(path.join(out, 'rigori.html'), '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=rigori/"><title>Rigori al Camp Nou</title></head><body><p>Il gioco si è spostato: <a href="rigori/">Rigori al Camp Nou 2.0</a> · <a href="rigori-classic.html">versione classica</a></p></body></html>')
      console.log(`[copy-legacy] ${copied} file dal sito precedente, ${skipped} saltati, rigori.html di raccordo`)
    }
  }
}

// URL assoluto del sito pubblicato. Le anteprime social (WhatsApp, Telegram) accettano SOLO URL assoluti in
// https: un path relativo in og:image è la causa più comune di anteprima vuota. Da qui escono sia le costanti
// del codice sia i meta delle pagine, che li ricevono con il segnaposto %SITE_URL%.
const SITE_URL = (process.env.SITE_URL || 'https://alessandrovizzini1986-a11y.github.io/barcellona-40/').replace(/\/?$/, '/')
// Sostituisce %SITE_URL% negli HTML: così og:image e og:url sono assoluti senza scriverli a mano in ogni pagina.
function metaAssoluti() {
  return {
    name: 'meta-assoluti',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL) }
  }
}

// Promemoria, non controllo: se la build tocca dati o codice del sito senza una entry nel changelog,
// lo dice e basta. Chi rientra deve poter vedere cosa è cambiato, ma un refactor non è una novità.
function promemoriaChangelog() {
  return { name: 'promemoria-changelog', apply: 'build', closeBundle() { avvisa() } }
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [copyLegacy(), metaAssoluti(), promemoriaChangelog()],
  // Data e ora della build, mostrata in fondo alla vista Info
  define: {
    __BUILD_ID__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
    __SITE_URL__: JSON.stringify(SITE_URL)
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    rollupOptions: {
      // Seconda entry: il gioco dei rigori (multi-page)
      input: { main: path.resolve('index.html'), rigori: path.resolve('rigori/index.html') },
      output: {
        // Leaflet e Three in chunk separati: Leaflet lazy nella Mappa, Three solo nel gioco
        manualChunks: (id) => (id.includes('node_modules/leaflet') ? 'leaflet' : id.includes('node_modules/three') ? 'three' : undefined)
      }
    }
  }
})
