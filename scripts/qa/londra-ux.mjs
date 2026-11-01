// Misura UX di londra.html (solo misure, non tocca il sito).
//   node scripts/qa/londra-ux.mjs http://localhost:4173 [--riassunto baseline|finale|<nome>] [--foto prima|dopo|dopo-f1] [--ripeti 3] [--solo-foto]
// Lighthouse si ripete N volte (default 3) e si tiene la mediana di ogni numero: su una macchina condivisa una corsa
// sola oscilla anche di 30 punti. --solo-foto salta Lighthouse. I PNG passano da sharp (palette) se c'è, per pesare meno nel repo.
// Scrive in scripts/qa/audit/londra/:
//   lighthouse-<nome>.json   Lighthouse mobile completo (375×812, rete simulata), con ?now=2026-11-16T10:30
//   ux-<nome>.json           riassunto: punteggi, FCP, LCP, SI, TBT, CLS, thread principale, nodi DOM, altezza
//                            della pagina per ogni vista, toccabili sotto 44×44 px, scroll orizzontale a 320/375/430
//   <foto>-<vista>-<tema>.png  screenshot 375×812 di Adesso, Programma, Biglietti, Mappa, Info, scuro e chiaro
// Lighthouse: cerca node_modules/lighthouse nel repo, poi in LIGHTHOUSE_DIR; se manca, le altre misure si fanno lo stesso.
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const base = (argv.find((a) => /^https?:/.test(a)) || 'http://localhost:4173').replace(/\/$/, '')
const opz = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const oggi = new Date().toISOString().slice(0, 10)
const nome = opz('riassunto', oggi)
const foto = opz('foto', 'dopo')
const OUT = 'scripts/qa/audit/londra'
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium'
const NOW = '2026-11-16T10:30'
const PAGINA = base + '/londra.html?now=' + NOW
const VISTE = [['adesso', '#ora'], ['programma', '#programma'], ['biglietti', '#biglietti'], ['mappa', '#mappa'], ['info', '#info']]
mkdirSync(OUT, { recursive: true })
const r = { nome, data: new Date().toISOString(), url: PAGINA }

// ---------- Lighthouse mobile ----------
const lhDir = [path.resolve('node_modules/lighthouse'), process.env.LIGHTHOUSE_DIR && path.resolve(process.env.LIGHTHOUSE_DIR, 'node_modules/lighthouse'), process.env.LIGHTHOUSE_DIR && path.resolve(process.env.LIGHTHOUSE_DIR)].filter(Boolean).find((d) => existsSync(path.join(d, 'cli/index.js')))
const ripeti = argv.includes('--solo-foto') ? 0 : +opz('ripeti', 3)
// con --solo-foto il riassunto tiene il Lighthouse già salvato con lo stesso nome, se c'è
if (!ripeti && existsSync(`${OUT}/ux-${nome}.json`)) { try { const v = JSON.parse(readFileSync(`${OUT}/ux-${nome}.json`, 'utf8')); if (v.lighthouse) { r.lighthouse = v.lighthouse; r.lighthouseCorse = v.lighthouseCorse; r.lighthouseDi = v.data } } catch {} }
if (!lhDir && ripeti) { r.lighthouse = null; console.log('· Lighthouse non trovato: installa lighthouse nel repo o indica LIGHTHOUSE_DIR (cartella con node_modules/lighthouse). Le altre misure si fanno lo stesso.') }
else if (ripeti) {
  const corse = []
  for (let i = 0; i < ripeti; i++) {
    const file = `${OUT}/lighthouse-${nome}${ripeti > 1 ? '-' + (i + 1) : ''}.json`
    execFileSync('node', [path.join(lhDir, 'cli/index.js'), PAGINA, '--form-factor=mobile', '--screenEmulation.mobile', '--screenEmulation.width=375', '--screenEmulation.height=812', '--throttling-method=simulate',
      '--chrome-flags=--headless=new --no-sandbox --ignore-certificate-errors', '--output=json', '--output-path=' + file, '--quiet'], { env: { ...process.env, CHROME_PATH: CHROME }, stdio: 'pipe', timeout: 300000 })
    const j = JSON.parse(readFileSync(file, 'utf8')), a = j.audits, c = j.categories
    const ms = (k) => Math.round(a[k].numericValue)
    if (j.runtimeError) console.log(`  corsa ${i + 1}: ${j.runtimeError.code} · ${String(j.runtimeError.message).slice(0, 120)}`)
    corse.push({
      performance: Math.round(c.performance.score * 100), accessibilita: Math.round(c.accessibility.score * 100), bestPractices: Math.round(c['best-practices'].score * 100), seo: Math.round(c.seo.score * 100),
      fcp_ms: ms('first-contentful-paint'), lcp_ms: ms('largest-contentful-paint'), speedIndex_ms: ms('speed-index'), tbt_ms: ms('total-blocking-time'), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
      threadPrincipale_ms: ms('mainthread-work-breakdown'), nodiDom: ms('dom-size'),
      pesoTrasferito_kB: Math.round(a['total-byte-weight'].numericValue / 1024), richieste: a['network-requests'].details?.items?.length ?? null,
      a11yFalliti: Object.values(a).filter((x) => c.accessibility.auditRefs.some((ref) => ref.id === x.id) && x.score !== null && x.score < 1).map((x) => x.id),
      bpFalliti: Object.values(a).filter((x) => c['best-practices'].auditRefs.some((ref) => ref.id === x.id) && x.score !== null && x.score < 1).map((x) => x.id)
    })
  }
  // mediana numero per numero, ignorando le corse rotte (performance 0 o valori non numerici: capita quando una
  // richiesta va in timeout); le liste dei falliti sono l'unione
  const valide = corse.filter((x) => x.performance > 0)
  if (valide.length < corse.length) console.log(`  (${corse.length - valide.length} corsa/e non valida/e ignorata/e)`)
  const mediana = (v) => { const s = v.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null }
  r.lighthouse = Object.fromEntries(Object.keys(corse[0]).map((k) => [k, Array.isArray(corse[0][k]) ? [...new Set(corse.flatMap((x) => x[k]))] : mediana((valide.length ? valide : corse).map((x) => x[k]))]))
  r.lighthouseCorse = corse
  const lh = r.lighthouse
  console.log(`✓ Lighthouse (mediana di ${ripeti}): performance ${lh.performance} · a11y ${lh.accessibilita} · best practices ${lh.bestPractices} · SEO ${lh.seo}`)
  console.log(`  FCP ${lh.fcp_ms} ms · LCP ${lh.lcp_ms} ms · SI ${lh.speedIndex_ms} ms · TBT ${lh.tbt_ms} ms · CLS ${lh.cls} · thread ${lh.threadPrincipale_ms} ms · ${lh.nodiDom} nodi · ${lh.pesoTrasferito_kB} kB in ${lh.richieste} richieste`)
  if (ripeti > 1) console.log('  singole corse: ' + corse.map((x) => `${x.performance} (TBT ${x.tbt_ms}, CLS ${x.cls})`).join(' · '))
  if (lh.a11yFalliti.length) console.log('  a11y falliti: ' + lh.a11yFalliti.join(', '))
  if (lh.bpFalliti.length) console.log('  best practices falliti: ' + lh.bpFalliti.join(', '))
}
// PNG più leggeri (palette) se sharp è installato: gli screenshot finiscono nel repo
let sharp = null; try { sharp = (await import('sharp')).default } catch {}
const salva = async (p, file) => { const buf = await p.screenshot(); writeFileSync(file, sharp ? await sharp(buf).png({ palette: true, quality: 80 }).toBuffer() : buf) }

// ---------- Playwright: altezze, screenshot, toccabili, scroll orizzontale ----------
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
async function apri(tema, w = 375, h = 812) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: tema, serviceWorkers: 'block' })
  const p = await ctx.newPage(); const errori = []; p.on('pageerror', (e) => errori.push(e.message))
  return { p, ctx, errori }
}
// la vista: con la navigazione a viste (data-vista) si attiva dall'hash; con la pagina unica si scorre all'ancora
async function vai(p, hash) { await p.goto(PAGINA + hash, { waitUntil: 'load' }); await p.waitForTimeout(1200); await p.evaluate(() => { const t = document.querySelector(location.hash === '#ora' ? '#adesso, #primaDiPartire' : location.hash); if (t && !document.querySelector('[data-vista]')) t.scrollIntoView({ block: 'start' }) }); await p.waitForTimeout(400) }

r.viste = {}; r.errori = []
for (const tema of ['dark', 'light']) {
  const { p, ctx, errori } = await apri(tema)
  for (const [vista, hash] of VISTE) {
    await vai(p, hash)
    await salva(p, `${OUT}/${foto}-${vista}-${tema === 'dark' ? 'scuro' : 'chiaro'}.png`)
    if (tema === 'dark') {
      const m = await p.evaluate(() => ({ altezza: document.documentElement.scrollHeight, schermate: +(document.documentElement.scrollHeight / innerHeight).toFixed(1), nodi: document.getElementsByTagName('*').length, nodiVisibili: [...document.getElementsByTagName('*')].filter((e) => e.getClientRects().length).length }))
      r.viste[vista] = m
    }
  }
  r.errori.push(...errori)
  await ctx.close()
}
r.altezzaMax = Math.max(...Object.values(r.viste).map((v) => v.altezza)); r.schermateMax = Math.max(...Object.values(r.viste).map((v) => v.schermate))
console.log('✓ altezza per vista (375 px): ' + Object.entries(r.viste).map(([k, v]) => `${k} ${v.altezza} px (${v.schermate} schermate)`).join(' · '))

// toccabili sotto 44×44, con tutti i <details> aperti e tutte le viste attive; esclusi i crediti (Leaflet, foto, Wikimedia)
{
  const { p, ctx } = await apri('dark')
  await vai(p, '#programma'); await p.waitForTimeout(800)
  r.toccabiliPiccoli = await p.evaluate(() => {
    document.querySelectorAll('[data-vista]').forEach((v) => { v.hidden = false })
    document.querySelectorAll('details').forEach((d) => { d.open = true })
    document.querySelectorAll('[hidden]').forEach((e) => { if (e.id && /^(adesso|primaDiPartire)$/.test(e.id)) e.hidden = false })
    const out = []
    document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])').forEach((e) => {
      if (e.closest('.leaflet-control-attribution, .tcard__credito, #crediti, .nov')) return
      if (e.closest('[hidden]') || e.hidden) return
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return
      if (r.width < 44 || r.height < 44) out.push({ el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''), testo: (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50), w: Math.round(r.width), h: Math.round(r.height) })
    })
    return out
  })
  console.log(`${r.toccabiliPiccoli.length ? '✗' : '✓'} toccabili sotto 44×44 px: ${r.toccabiliPiccoli.length}` + r.toccabiliPiccoli.slice(0, 12).map((t) => `\n    ${t.w}×${t.h} ${t.el} «${t.testo}»`).join(''))
  await ctx.close()
}

// scorrimento orizzontale a 320, 375, 430 px con tutto aperto
r.scrollOrizzontale = {}
for (const w of [320, 375, 430]) {
  const { p, ctx } = await apri('dark', w, 812)
  await vai(p, '#programma')
  // confronto con la larghezza chiesta, non con innerWidth: in emulazione mobile il viewport si allarga da solo al contenuto
  r.scrollOrizzontale[w] = await p.evaluate((w) => { document.querySelectorAll('[data-vista]').forEach((v) => { v.hidden = false }); document.querySelectorAll('details').forEach((d) => { d.open = true }); return { larghezza: w, scroll: document.documentElement.scrollWidth, ok: document.documentElement.scrollWidth <= w } }, w)
  await ctx.close()
}
console.log(`${Object.values(r.scrollOrizzontale).every((x) => x.ok) ? '✓' : '✗'} scroll orizzontale: ` + Object.entries(r.scrollOrizzontale).map(([w, x]) => `${w} px → ${x.scroll}${x.ok ? '' : ' ✗'}`).join(' · '))
if (r.errori.length) console.log('✗ errori JS: ' + r.errori.join(' | ')); else console.log('✓ nessun errore JS')
await b.close()
writeFileSync(`${OUT}/ux-${nome}.json`, JSON.stringify(r, null, 2) + '\n')
console.log(`→ ${OUT}/ux-${nome}.json · screenshot ${foto}-*.png`)
