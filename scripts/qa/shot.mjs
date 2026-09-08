// Screenshot 380x800 di una o più URL. Uso: node scripts/qa/shot.mjs <base> <out-dir> [name=path#hash ...]
// Opzioni: --person=ale imposta la persona in localStorage prima del caricamento; --full per pagina intera
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const [base, outDir, ...rest] = process.argv.slice(2)
const opts = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')))
const shots = rest.filter((a) => !a.startsWith('--')).map((a) => a.split('='))
mkdirSync(outDir, { recursive: true })
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark', permissions: [] })
const errors = []
for (const [name, path] of shots) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: console ${m.text()}`) })
  await p.goto(base + '/')
  await p.evaluate((person) => { try { localStorage.clear(); if (person) localStorage.setItem('b40:v1:person', JSON.stringify(person)) } catch {} }, opts.person || null)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(700)
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  if (overflow) errors.push(`${name}: overflow orizzontale`)
  await p.screenshot({ path: `${outDir}/${name}.png`, fullPage: opts.full === '1' })
  console.log(`✓ ${name}`)
  await p.close()
}
await b.close()
if (errors.length) { console.error('Errori:\n' + errors.join('\n')); process.exit(1) }
