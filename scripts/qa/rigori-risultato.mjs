// QA della schermata del risultato: XP di partecipazione, un solo pulsante grande, Condividi a scomparsa,
// riga di Ale se perdi, coriandoli e VAR se vinci, classifica solo con almeno due nomi.
//   node scripts/qa/rigori-risultato.mjs [url]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
const ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errors.push(n) }
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true') } catch {} })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
// Dal menu vero allo Shootout: volto → modalità, come farebbe una persona
let nomiVisti = false
const avvia = async () => {
  await p.waitForFunction(() => window.__rigori.flow() === 'chiTira')
  if (!nomiVisti) {
    nomiVisti = true
    const nomi = await p.evaluate(() => [...document.querySelectorAll('.rg-card__name')].map((e) => e.textContent))
    ok('CHI TIRA?: Manuel, Giulio, Monne (Mario non esiste più)', nomi.join(',') === 'Manuel,Giulio,Monne', nomi.join(','))
    ok('la card di Manuel ha il numero 10 e la faccia', await p.evaluate(() => { const c = document.querySelector('.rg-card[data-value="manuel"]'); return !!c && c.querySelector('.rg-card__jersey b').textContent === '10' && /face-manuel\.png$/.test(c.querySelector('img').getAttribute('src')) }))
  }
  await p.click('.rg-card[data-value="monne"]')
  await p.waitForFunction(() => window.__rigori.flow() === 'modalita'); await p.click('.rg-mode[data-value="shootout"]')
  await p.waitForFunction(() => window.__rigori.flow() === 'gioco' && window.__rigori.role() !== 'idle')
}
const stato = () => p.evaluate(() => { const R = window.__rigori, m = R.mode(); return { role: R.role(), shot: R.shotState(), locked: R.esitoLocked, fin: !m || m.finished, me: m?.me, ale: m?.ale } })
const attendi = async (f, ms, che) => { const t0 = Date.now(); for (;;) { const s = await stato(); if (f(s)) return s; if (Date.now() - t0 > ms) throw new Error('attesa: ' + che); await p.waitForTimeout(120) } }
// Gioca uno shootout: `vinci` decide se i miei tiri entrano (angolo basso, portiere dall'altra parte) e se paro
// i tiri di Ale (Math.random fisso → Ale tira sempre basso a destra, e io mi tuffo lì).
async function shootout(vinci) {
  await avvia()
  await p.evaluate((v) => { window.__rnd = Math.random; if (v) Math.random = () => 0.6 }, vinci)
  for (let n = 0; n < 30; n++) {
    const s = await attendi((x) => x.fin || (!x.locked && x.shot === 'idle' && x.role !== 'idle') || x.shot === 'windup' || x.shot === 'flying', 60000, 'turno')
    if (s.fin) break
    if (s.role === 'shooter' && s.shot === 'idle') {
      await p.evaluate(({ v, n }) => { const R = window.__rigori; R.setPrecision(0); R.ctx.forceKeeperZone(v ? 0 : 5); R.fire(v ? { x: 1.6, y: 0.4, power: 0.75, curve: 0 } : { x: 1.4, y: 0.4, power: 0.5, curve: 0 }, false, 0, 800 + n) }, { v: vinci, n })
    } else if (s.role === 'keeper') {
      await attendi((x) => x.shot === 'flying' || x.fin, 40000, 'tiro di Ale')
      await p.evaluate((v) => { const R = window.__rigori; const r = R.record(); if (!r) return; const z = v ? (r.aim.y > 0.86 ? 0 : 3) + (r.aim.x < -0.73 ? 0 : r.aim.x > 0.73 ? 2 : 1) : (r.aim.x > 0 ? 3 : 5); R.playerDive(z) }, vinci)
    }
    await attendi((x) => x.fin || x.locked, 60000, 'esito')
    await p.waitForTimeout(450); await p.evaluate(() => window.__rigori.salta())
    await attendi((x) => x.fin || (!x.locked && x.shot === 'idle'), 90000, 'fine sequenza')
  }
  await p.evaluate(() => { Math.random = window.__rnd })
  await p.waitForFunction(() => window.__rigori.flow() === 'risultato', null, { timeout: 60000 })
  await p.waitForTimeout(600)
  if (process.env.SHOT_DIR) await p.screenshot({ path: `${process.env.SHOT_DIR}/risultato-${vinci ? 'vinto' : 'perso'}.png` })
  return p.evaluate(() => ({ testo: document.querySelector('.rg-panel').innerText.replace(/\n+/g, ' | '), xp: document.querySelector('.rg-ring__label')?.textContent, riga: document.querySelector('.rg-risultato__riga')?.textContent || '', primari: document.querySelectorAll('.rg-panel .rg-btn--giallo').length, nascosto: document.querySelector('#rg-share-opts')?.hidden, canvasConfetti: [...document.querySelectorAll('canvas')].filter((c) => !c.closest('.rg-stage')).length, wa: document.querySelectorAll('.rg-panel a[href^="https://wa.me/"]').length }))
}
const pers = await shootout(false)
console.log('perso →', pers.testo.slice(0, 160))
ok('perso: XP di partecipazione > 0', /\+\d+/.test(pers.xp) && !/\+0\b/.test(pers.xp), pers.xp)
ok('perso: riga di Ale', pers.riga.includes('rivincita'), pers.riga)
ok('perso: un solo pulsante grande', pers.primari === 1)
ok('perso: Condividi chiuso all\'apertura', pers.nascosto === true)
ok('perso: niente "Manda ai ragazzi"', pers.wa === 0 && !pers.testo.includes('Manda ai ragazzi'))
ok('perso: niente classifica con un nome solo', !pers.testo.includes('Classifica:'), pers.testo) // 'Classifica:' è la riga; 'Classifica' da solo è il pulsante del blocco 6
await p.click('[data-share-toggle]'); await p.waitForTimeout(150)
ok('Condividi apre le scelte', await p.evaluate(() => !document.querySelector('#rg-share-opts').hidden && [...document.querySelectorAll('#rg-share-opts .rg-btn')].map((b) => b.textContent.trim()).includes('Copia risultato')))
ok('Copia risultato porta il testo della partita', await p.evaluate(() => (document.querySelector('[data-copy]').dataset.copy || '').includes('Rigori al Camp Nou')))
await p.click('[data-value="menu"]'); await p.waitForTimeout(300)
const vinto = await shootout(true)
console.log('vinto →', vinto.testo.slice(0, 160))
ok('vinto: titolo', vinto.testo.startsWith('Hai vinto'), vinto.testo.slice(0, 20))
ok('vinto: Ale chiede il VAR', vinto.riga.includes('VAR'), vinto.riga)
ok('vinto: coriandoli a schermo', vinto.canvasConfetti >= 1, String(vinto.canvasConfetti))
ok('vinto: XP di partecipazione più merito', /\+(\d+)/.test(vinto.xp) && +vinto.xp.match(/\+(\d+)/)[1] >= 65, vinto.xp)
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK risultato')
