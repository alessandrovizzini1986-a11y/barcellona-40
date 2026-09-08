// Test end-to-end (Playwright, 380x800) sulle build di anteprima. Uso: node scripts/qa/e2e.mjs http://localhost:4173
import { chromium } from 'playwright-core'
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const results = []
const ok = (name, cond, extra = '') => { results.push([cond ? '✓' : '✗', name, extra]); if (!cond) process.exitCode = 1 }

async function open(person, path, { storageBroken = false, permissions = [] } = {}) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, permissions })
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  if (storageBroken) await p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('QuotaExceededError') } }) })
  await p.goto(base + '/')
  if (!storageBroken) await p.evaluate((person) => { localStorage.clear(); if (person) localStorage.setItem('b40:v1:person', JSON.stringify(person)) }, person)
  await p.goto(base + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(400)
  return { p, ctx, errors }
}
const text = (p, sel) => p.locator(sel).first().textContent().then((t) => (t || '').trim()).catch(() => '')

// 3. Date
{ const { p, ctx } = await open('ale', '/?now=2026-10-15T20:00#/oggi'); ok('countdown 15/10', (await p.locator('#cd b').count()) === 3 && (await text(p, '#cd b')) === '0'); await ctx.close() }
{ const { p, ctx } = await open('ale', '/?now=2026-10-16T09:00#/oggi'); ok('16/10 09:00 ale: Adesso = f1', (await p.locator('.tile .card[data-stop="f1"]').count()) === 1); await ctx.close() }
{ const { p, ctx } = await open('monne', '/?now=2026-10-17T07:50#/oggi'); ok('17/10 07:50 monne: Adesso = s2', (await p.locator('.tile .card[data-stop="s2"]').count()) === 1); ok('banner speedrun', (await p.locator('a[href="#/speedrun"]').count()) >= 1); await ctx.close() }
{ const { p, ctx } = await open('monne', '/?now=2026-10-17T07:50#/missioni'); const cls = await p.locator('.mission__timer').first().getAttribute('class'); ok('07:50 timer giallo (25 min)', cls.includes('warm'), cls); await ctx.close() }
{ const { p, ctx } = await open('monne', '/?now=2026-10-17T08:05#/missioni'); const cls = await p.locator('.mission__timer').first().getAttribute('class'); ok('08:05 timer rosso (10 min)', cls.includes('hot'), cls); ok('timer valore', (await text(p, '.mission__timer')) === '00:10:00'); await ctx.close() }
{ const { p, ctx } = await open('ale', '/?now=2026-10-17T10:00#/oggi'); ok('17/10 10:00 ale: prossima = s4 10:30', (await text(p, '.tile:nth-child(2) .tile__big')) === '10:30'); await ctx.close() }
{ const { p, ctx } = await open('ale', '/?now=2026-10-18T21:00#/oggi'); ok('18/10 21:00: missione compiuta', (await p.locator('h2:has-text("Missione compiuta")').count()) === 1); await ctx.close() }

// 4. Profili
{ const { p, ctx } = await open('monne', '/#/programma/sab'); const ids = await p.locator('.card').evaluateAll((els) => els.map((e) => e.dataset.stop)); ok('Monne sabato: solo s2', ids.join() === 's2', ids.join()); await ctx.close() }
{ const { p, ctx } = await open('monne', '/#/programma/dom'); ok('Monne domenica: empty state', (await text(p, '.empty')).includes('Bologna')); await ctx.close() }
{ const { p, ctx } = await open('manuel', '/#/programma/sab'); const ids = await p.locator('.card').evaluateAll((els) => els.map((e) => e.dataset.stop)); ok('Manuel non vede s4', !ids.includes('s4') && ids.includes('s3'), ids.join()); await ctx.close() }
{ const { p, ctx } = await open('giulio', '/#/programma/ven'); ok('Giulio venerdì vuoto', (await p.locator('.card').count()) === 0 && (await p.locator('.empty').count()) === 1); await ctx.close() }
{ const { p, ctx } = await open('giulio', '/#/speedrun'); ok('Speedrun bloccata per Giulio', (await p.evaluate(() => location.hash)) === '#/oggi'); await ctx.close() }

// 5. Mappa
{ const { p, ctx } = await open('ale', '/?now=2026-10-17T10:00#/mappa')
  await p.waitForSelector('.leaflet-container', { timeout: 8000 })
  ok('mappa: 3 chip giorno', (await p.locator('.map-controls [data-day]').count()) === 3)
  const markers = await p.locator('.marker:not(.marker--me)').count()
  ok('mappa: marker numerati (sab)', markers >= 5, String(markers))
  ok('mappa: polilinea', (await p.locator('.leaflet-overlay-pane path, .leaflet-overlay-pane canvas').count()) >= 1)
  await p.locator('[data-day="ven"]').click(); await p.waitForTimeout(300)
  ok('mappa: layer ven attivabile', (await p.locator('.marker:not(.marker--me)').count()) > markers)
  await p.locator('.marker').first().click({ force: true }); await p.waitForTimeout(300)
  ok('mappa: popup con Maps', (await p.locator('.leaflet-popup .btn').count()) >= 1)
  await p.locator('#locate').click(); await p.waitForTimeout(800)
  ok('mappa: geolocalizzazione negata → toast', (await text(p, '.toast')).includes('Posizione non disponibile'))
  ok('mappa: lista senza coordinate', (await p.locator('.map-legend .list-item').count()) === 2)
  await ctx.close() }

// 6. Missioni
{ const { p, ctx } = await open('ale', '/?now=2026-10-17T12:00#/missioni')
  await p.locator('input[data-mission="m6"]').check({ force: true }); await p.waitForTimeout(300)
  ok('missione → XP', (await text(p, '.ring__label')).startsWith('60'))
  ok('toast +XP', (await text(p, '.toast')).includes('+60 XP'))
  await p.locator('input[data-mission="m8"]').check({ force: true }); await p.locator('input[data-mission="m9"]').check({ force: true }); await p.locator('input[data-mission="m10"]').check({ force: true }); await p.waitForTimeout(300)
  ok('badge Trencadís (tutte le missioni di sabato)', (await p.locator('[data-badge="b_trencadis"].badge-card--on').count()) === 1)
  ok('badge Festeggiato (dopo le 00:00 del 17)', (await p.locator('[data-badge="b_festeggiato"].badge-card--on').count()) === 1)
  ok('livello Local (220 XP)', (await text(p, '.xp-head__level')) === 'Local')
  const str = await p.evaluate(() => 'b40:' + btoa(JSON.stringify({ person: 'giulio', xp: 130, done: ['m5', 'm6', 'm8'] })))
  await p.locator('#import').click(); await p.fill('#imp', str); await p.locator('#imp-ok').click(); await p.waitForTimeout(300)
  ok('import classifica', (await p.locator('#board').textContent()).includes('130 XP'))
  await p.locator('#export').click(); await p.waitForTimeout(300)
  ok('export stringa (toast o sheet)', (await p.locator('.toast, .sheet').count()) >= 1)
  await ctx.close() }
{ const { p, ctx } = await open('ale', '/#/programma/sab')
  await p.locator('input[data-done="s4"]').check({ force: true }); await p.waitForTimeout(300)
  ok('Fatto su card → missione e toast', (await text(p, '.toast')).includes('+60 XP'))
  await p.goto(base + '/#/missioni'); await p.waitForTimeout(400)
  ok('Fatto su card → missione m6 spuntata', await p.locator('input[data-mission="m6"]').isChecked())
  await ctx.close() }

// 7. localStorage rotto
{ const { p, ctx, errors } = await open(null, '/#/oggi', { storageBroken: true })
  ok('storage rotto: onboarding senza crash', (await p.locator('.person-card').count()) === 4 && errors.length === 0, errors.join(' | '))
  await p.locator('[data-person="ale"]').click(); await p.waitForTimeout(500)
  ok('storage rotto: dopo scelta persona si naviga', (await p.locator('.hero, .bento').count()) >= 1 && errors.length === 0, errors.join(' | '))
  await ctx.close() }

// Onboarding + tab bar + easter egg
{ const { p, ctx } = await open(null, '/#/oggi')
  ok('onboarding', (await p.locator('.person-card').count()) === 4)
  await p.locator('[data-person="monne"]').click(); await p.waitForTimeout(400)
  ok('tab bar 5 voci', (await p.locator('#tabbar .tab').count()) === 5)
  ok('tab bar role tablist', (await p.locator('#tabbar[role="tablist"]').count()) === 1)
  await p.locator('#site-title').dispatchEvent('pointerdown'); await p.waitForTimeout(2300)
  ok('easter egg 40 tessere', (await p.locator('.egg__tile').count()) === 40)
  await ctx.close() }

// Overflow orizzontale su tutte le viste
for (const [person, path] of [['ale', '/#/oggi'], ['ale', '/?now=2026-10-17T10:00#/oggi'], ['ale', '/#/programma/ven'], ['ale', '/#/programma/sab'], ['ale', '/#/programma/dom'], ['ale', '/#/mappa'], ['ale', '/#/missioni'], ['ale', '/#/info'], ['monne', '/#/speedrun']]) {
  const { p, ctx, errors } = await open(person, path)
  const over = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  ok(`no overflow ${path} (${person})`, !over && errors.length === 0, errors.join(' | '))
  await ctx.close()
}
await b.close()
for (const [s, n, e] of results) console.log(s, n, e ? `(${e})` : '')
console.log(`\n${results.filter((r) => r[0] === '✓').length}/${results.length} test ok`)
