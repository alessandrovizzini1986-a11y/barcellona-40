// Libreria comune degli script di audit (scripts/qa/audit/*): browser, pagina con raccolta di errori,
// e il registro dei problemi trovati. Gli audit NON toccano il sito: riferiscono.
//   AUDIT_BASE (default http://localhost:4173) · AUDIT_OUT (cartella dei report JSON)
import { chromium } from 'playwright-core'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
export const base = process.env.AUDIT_BASE || 'http://localhost:4173'
export const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
export const OUT = process.env.AUDIT_OUT || 'scripts/qa/audit/out'
export const SWIFT = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
export const lancia = (args = []) => chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', ...args] })
// rumore del sandbox (rete esterna assente): non è un difetto del sito
export const rumore = (t) => /Failed to load resource|ERR_CERT|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|net::|goatcounter|gc\.zgo\.at|fonts\.g|open-meteo|ERR_BLOCKED_BY_CLIENT|ERR_FAILED/.test(t)
export async function pagina(b, { person = 'ale', piove = false, viewport = { width: 380, height: 800 }, timezoneId, colorScheme, ls = {}, userAgent, storageBroken = false, permissions, reducedMotion, offline = false, init } = {}) {
  const ctx = await b.newContext({ viewport, isMobile: true, hasTouch: true, timezoneId, colorScheme, userAgent, permissions, reducedMotion, offline })
  const p = await ctx.newPage()
  const errs = [], console_ = [], rete = []
  p.on('pageerror', (e) => errs.push(String(e?.message || e)))
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console_.push(`[${m.type()}] ${m.text()}`) })
  p.on('requestfailed', (r) => rete.push({ url: r.url(), errore: r.failure()?.errorText }))
  p.on('response', (r) => { if (r.status() >= 400) rete.push({ url: r.url(), status: r.status() }) })
  if (storageBroken) await p.addInitScript(() => { const boom = () => { throw new DOMException('The operation is insecure.', 'SecurityError') }; Object.defineProperty(window, 'localStorage', { get: boom }); Object.defineProperty(window, 'sessionStorage', { get: boom }) })
  else await p.addInitScript(({ person, piove, ls }) => { try { if (!sessionStorage.getItem('audit:init')) { localStorage.clear(); sessionStorage.setItem('audit:init', '1'); localStorage.setItem('b40:v1:lastSeenVersion', '999'); if (person) localStorage.setItem('b40:v1:person', JSON.stringify(person)); localStorage.setItem('b40:v1:onboarded', 'true'); if (piove) localStorage.setItem('b40:v1:piove', 'true'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) } } catch {} }, { person, piove, ls })
  if (init) await p.addInitScript(init)
  return { p, ctx, errs, console_, rete, erroriVeri: () => [...errs, ...console_.filter((c) => !rumore(c))] }
}
export const vai = async (p, hash) => { await p.goto(base + '/' + hash, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(350) }
export class Registro {
  constructor(nome) { this.nome = nome; this.problemi = []; this.note = []; this.numeri = {} }
  problema(gravita, titolo, { dove = '', riproduzione = '', costo = '', rischio = '', nota = '' } = {}) { this.problemi.push({ gravita, titolo, dove, riproduzione, costo, rischio, nota }); console.log(`✗ [${gravita}] ${titolo}${dove ? ' · ' + dove : ''}${nota ? ' · ' + nota : ''}`) }
  ok(titolo, extra = '') { this.note.push({ ok: titolo, extra }); console.log(`✓ ${titolo}${extra ? ' · ' + extra : ''}`) }
  numero(k, v) { this.numeri[k] = v; console.log(`  # ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`) }
  salva() { mkdirSync(OUT, { recursive: true }); writeFileSync(path.join(OUT, this.nome + '.json'), JSON.stringify({ nome: this.nome, quando: new Date().toISOString(), problemi: this.problemi, numeri: this.numeri, ok: this.note.length }, null, 1)); console.log(`\n${this.nome}: ${this.problemi.length} problemi, ${this.note.length} controlli ok → ${OUT}/${this.nome}.json`) }
}
