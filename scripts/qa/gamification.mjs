// QA gamification: riproduce il bug "titolo barrato con casella vuota" e verifica la coerenza
// tra stato salvato, classe card--done, casella e XP dopo più navigazioni.
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const CHECKS = JSON.parse(readFileSync('data/checks.json', 'utf8')).checks
const base = process.argv[2] || 'http://localhost:4173'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const out = []
const ok = (n, c, x = '') => { out.push([c ? '✓' : '✗', n, x]); if (!c) process.exitCode = 1 }
const NOW = '?now=2026-10-17T12:00'

async function open(person) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + '/'); await p.evaluate((x) => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify(x)) }, person)
  return { p, ctx, errs }
}
const go = async (p, hash) => { await p.goto(`${base}/${NOW}#/${hash}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(350) }
const tick = async (p, sel, on) => { const el = p.locator(sel); await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); on ? await el.check() : await el.uncheck(); await p.waitForTimeout(350) }
const state = (p, stop, mission) => p.evaluate(({ stop, mission }) => {
  const g = (k) => JSON.parse(localStorage.getItem('b40:v1:' + k) || '[]')
  const card = document.querySelector(`.card[data-stop="${stop}"]`)
  const cb = card?.querySelector('input[data-done]')
  return { storeDone: g('done').includes(stop), storeMission: g('missions').includes(mission), classDone: !!card?.classList.contains('card--done'), boxChecked: !!cb?.checked, toasts: document.querySelectorAll('.toast').length }
}, { stop, mission })
const consistent = (s) => s.storeDone === s.classDone && s.classDone === s.boxChecked && s.storeMission === s.storeDone

// 1. Lo scenario segnalato: navigazioni pari e dispari, poi spunta e togli una volta sola
for (const hops of [2, 3, 5]) {
  const { p, ctx, errs } = await open('ale')
  const seq = ['oggi', 'programma/sab', 'missioni', 'info', 'oggi', 'programma/sab']
  for (let i = 0; i < hops; i++) await go(p, seq[i % seq.length])
  await go(p, 'programma/sab')
  await tick(p, 'input[data-done="s4"]', true)
  let s = await state(p, 's4', 'm6')
  ok(`${hops} navigazioni, spunta: stato, classe, casella e missione coincidono (tutti on)`, consistent(s) && s.storeDone === true, JSON.stringify(s))
  ok(`${hops} navigazioni, spunta: un solo toast +60 XP`, s.toasts === 1 && (await p.locator('.toast').first().textContent()).includes('+60 XP'), String(s.toasts))
  await p.waitForTimeout(3000) // i toast spariscono
  await tick(p, 'input[data-done="s4"]', false)
  s = await state(p, 's4', 'm6')
  ok(`${hops} navigazioni, togli: tutti off, titolo NON barrato`, consistent(s) && s.storeDone === false, JSON.stringify(s))
  ok(`${hops} navigazioni, togli: un solo toast`, s.toasts === 1, String(s.toasts))
  await go(p, 'missioni')
  ok(`${hops} navigazioni: XP tornati a 0`, (await p.locator('.ring__label').first().textContent()).trim().startsWith('0'))
  ok(`${hops} navigazioni: nessun errore JS`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}

// 2. Un render fresco non può mai mostrare barrato + casella vuota
{
  const { p, ctx } = await open('ale')
  await go(p, 'programma/sab'); await tick(p, 'input[data-done="s4"]', true)
  await go(p, 'missioni'); await go(p, 'programma/sab')
  let s = await state(p, 's4', 'm6'); ok('dopo spunta e ritorno: card barrata e casella piena', s.classDone && s.boxChecked && s.storeDone)
  await tick(p, 'input[data-done="s4"]', false); await go(p, 'oggi'); await go(p, 'programma/sab')
  s = await state(p, 's4', 'm6'); ok('dopo togli e ritorno: card pulita e casella vuota', !s.classDone && !s.boxChecked && !s.storeDone, JSON.stringify(s))
  await ctx.close()
}

// 3. Sincronia a due vie tappa <-> missione
{
  const { p, ctx } = await open('ale')
  await go(p, 'missioni'); await tick(p, 'input[data-mission="m6"]', true)
  ok('missione on → tappa on', await p.evaluate(() => JSON.parse(localStorage.getItem('b40:v1:done')).includes('s4')))
  await tick(p, 'input[data-mission="m6"]', false)
  ok('missione off → tappa off', await p.evaluate(() => !JSON.parse(localStorage.getItem('b40:v1:done') || '[]').includes('s4')))
  await go(p, 'programma/sab')
  const s = await state(p, 's4', 'm6'); ok('in Programma la tappa risulta pulita', !s.classDone && !s.boxChecked)
  await tick(p, 'input[data-done="s4"]', true); await go(p, 'missioni')
  ok('tappa on → missione spuntata in Missioni', await p.locator('input[data-mission="m6"]').isChecked())
  ok('XP = 60', (await p.locator('.ring__label').first().textContent()).trim().startsWith('60'))
  await ctx.close()
}

// 4. La missione segue la persona: Manuel non ha m6, la tappa s5 sì (m8 è sua)
{
  const { p, ctx } = await open('manuel')
  await go(p, 'programma/sab'); await tick(p, 'input[data-done="s5"]', true)
  ok('Manuel spunta Olimpo: missione m8 sua completata', await p.evaluate(() => JSON.parse(localStorage.getItem('b40:v1:missions')).includes('m8')))
  await ctx.close()
}

// 5. Oggi: anello di progresso aggiornato subito, senza ricaricare
{
  const { p, ctx } = await open('ale')
  await go(p, 'oggi')
  const before = (await p.locator('#progress .ring__label').textContent()).trim()
  await tick(p, '.timeline input[data-done="s4"]', true)
  const after = (await p.locator('#progress .ring__label').textContent()).trim()
  ok('anello aggiornato al tocco', before !== after && /^1\//.test(after), `${before} → ${after}`)
  ok('contatore di oggi aggiornato', (await p.locator('#progress').textContent()).includes('Oggi 1/'))
  const s = await state(p, 's4', 'm6'); ok('card in Oggi coerente', consistent(s) && s.storeDone)
  await ctx.close()
}

// 6. Info: ogni tocco sposta la verifica di uno, anche dopo molte navigazioni
{
  const { p, ctx } = await open('ale')
  for (const h of ['info', 'oggi', 'info', 'missioni', 'info/verifiche']) await go(p, h) // l'ultimo apre l'accordion delle verifiche
  await tick(p, 'input[data-check="c9"]', true)
  ok('verifica c9 on', await p.evaluate(() => JSON.parse(localStorage.getItem('b40:v1:checks')).includes('c9')))
  // il contatore parte dal numero di voci vere, non da una costante scritta a mano
  ok(`contatore verifiche sceso a ${CHECKS.length - 1}`, (await p.locator('#sec-verifiche summary').textContent()).includes(`(${CHECKS.length - 1})`))
  await tick(p, 'input[data-check="c9"]', false)
  ok('verifica c9 off', await p.evaluate(() => !JSON.parse(localStorage.getItem('b40:v1:checks')).includes('c9')))
  await ctx.close()
}

// 7. Missioni: molte navigazioni, poi una spunta sola → +50 una volta sola
{
  const { p, ctx } = await open('giulio')
  for (const h of ['missioni', 'oggi', 'missioni', 'programma/sab', 'missioni', 'info', 'missioni']) await go(p, h)
  await tick(p, 'input[data-mission="m15"]', true)
  ok('m15: XP = 50 esatti', (await p.locator('.ring__label').first().textContent()).trim().startsWith('50'))
  ok('m15: un solo toast', (await p.locator('.toast').count()) === 1)
  await ctx.close()
}
await b.close()
for (const [s, n, x] of out) console.log(s, n, x ? `(${x})` : '')
console.log(`\n${out.filter((r) => r[0] === '✓').length}/${out.length} test ok`)
