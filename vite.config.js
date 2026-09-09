import { defineConfig } from 'vite'
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs'
import path from 'node:path'

// File di root del sito precedente che NON vanno ripubblicati:
// - index.html: la home è quella nuova
// - sw.js: il vecchio service worker ha in precache './' e './index.html', si riprenderebbe il sito nuovo.
//   Deve restare 404 così i browser che lo avevano installato lo disinstallano.
// - manifest.json: lo usava solo la vecchia home, e il sito nuovo è una pagina web normale.
const LEGACY_SKIP_ROOT = new Set(['index.html', 'sw.js', 'manifest.json'])

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
          const f = path.join(from, name), t = path.join(to, name)
          if (statSync(f).isDirectory()) walk(f, t, depth + 1)
          else if (existsSync(t)) skipped++
          else { copyFileSync(f, t); copied++ }
        }
      }
      walk(src, out, 0)
      console.log(`[copy-legacy] ${copied} file dal sito precedente, ${skipped} saltati`)
    }
  }
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [copyLegacy()],
  build: {
    target: 'es2022',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Leaflet in un chunk separato, caricato lazy solo dalla vista Mappa
        manualChunks: (id) => (id.includes('node_modules/leaflet') ? 'leaflet' : undefined)
      }
    }
  }
})
