// QA navigazione e testi (blocco 1): "Torna al programma" in ogni schermata di scelta, ≡ sopra gli overlay del
// pass-and-play, ✕ della Pausa a 44 px, HUD mai sotto il ≡, refusi spariti, Boss al livello 2.
//   node scripts/qa/rigori-nav.mjs [url]
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync } from 'node:fs'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
const ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errors.push(n) }
const apri = async (xp = 0, onboarded = true, profilo = null, giocatori = null) => {
  const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await p.addInitScript(({ xp, onb, profilo, giocatori }) => { try { if (onb) localStorage.setItem('b40:v1:rigori:onboarded', 'true'); if (xp) localStorage.setItem('b40:v1:rigori:xp', String(xp)); if (profilo) localStorage.setItem('b40:v1:person', JSON.stringify(profilo)); if (giocatori) localStorage.setItem('b40:v1:rigori:giocatori', JSON.stringify(giocatori)) } catch {} }, { xp, onb: onboarded, profilo, giocatori })
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.click('.rg-loading__tap', { force: true })
  return { p, ctx }
}
const flow = (p, f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 30000 })
const sito = (p) => p.evaluate(() => { const a = [...document.querySelectorAll('.rg-overlay a.rg-sito, .rg-overlay .rg-sito')].pop(); return a ? { href: a.getAttribute('href'), target: a.getAttribute('target'), h: a.getBoundingClientRect().height } : null })
const okSito = async (p, dove) => { const s = await sito(p); ok(`"Torna al programma" in ${dove}`, !!s && /#\/oggi$/.test(s.href) && s.target === null && s.h >= 44, JSON.stringify(s)) }

// 1. testi: refusi e gergo spariti dal bundle pubblicato
{
  const dir = 'dist/assets'; const js = readdirSync(dir).filter((f) => /^rigori-.*\.js$/.test(f)).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
  for (const brutto of ['pararo', 'tell dimezzato', 'Tell quasi assenti', 'zona verde', 'lato debole a destra', 'incrocio, traversa', 'livello 5']) ok(`nel bundle non c'è "${brutto}"`, !js.includes(brutto))
  ok('nel bundle c\'è "si sbilancia"', js.includes('si sbilancia'))
}
// 2. onboarding: "zona colorata"
{
  const { p, ctx } = await apri(0, false)
  await flow(p, 'onboarding')
  ok('onboarding dice "zona colorata"', (await p.locator('.rg-onb__text').innerText()).includes('zona colorata'))
  await ctx.close()
}
// 3. ogni schermata di scelta ha il link al sito; Boss sbloccato con 100 XP
{
  const { p, ctx } = await apri(100)
  await flow(p, 'chiTira'); await okSito(p, 'CHI TIRA?')
  await p.click('.rg-card[data-value="manuel"]'); await flow(p, 'modalita'); await okSito(p, 'Modalità')
  ok('Modalità dice chi tira: "Tira Manuel · Cambia"', (await p.locator('[data-tira]').innerText()).replace(/\s+/g, ' ').trim() === 'Tira Manuel · Cambia')
  await p.click('[data-tira] [data-value="__chi"]'); await flow(p, 'chiTira'); await p.click('.rg-card[data-value="manuel"]'); await flow(p, 'modalita')
  ok('Boss sbloccato con 100 XP (livello 2)', await p.evaluate(() => !document.querySelector('.rg-mode[data-value="boss"]').disabled))
  // blocco 6: pass-and-play in cima, Shootout secondo; classifica a un tocco da Modalità e da CHI TIRA?, a due dalla partita
  const ordine = await p.evaluate(() => [...document.querySelectorAll('.rg-mode')].map((m) => m.dataset.value))
  ok('Modalità: Pass-and-play primo, Shootout secondo', ordine[0] === 'passAndPlay' && ordine[1] === 'shootout', ordine.join(','))
  await p.click('[data-value="__classifica"]'); await p.waitForSelector('.rg-classifica, .rg-panel h2', { timeout: 5000 })
  ok('Classifica di serata da Modalità: 1 tocco', (await p.locator('.rg-panel h2').innerText()) === 'Classifica di serata')
  await okSito(p, 'Classifica'); await p.click('[data-value="ok"]'); await flow(p, 'modalita')
  ok('Modalità: Skill senza "traversa", Boss "livello 2"', await p.evaluate(() => !document.querySelector('.rg-mode[data-value="skill"] span').textContent.includes('traversa') && document.querySelector('.rg-mode[data-value="boss"] span').textContent.includes('livello 2')))
  await p.click('[data-value="__opzioni"]'); await p.waitForSelector('[data-ok]'); await okSito(p, 'Opzioni'); await p.click('[data-ok]'); await flow(p, 'modalita')
  await p.click('[data-value="__sblocchi"]'); await p.waitForSelector('[data-value="ok"]'); await okSito(p, 'Sblocchi'); await p.click('[data-value="ok"]'); await flow(p, 'modalita')
  await p.click('.rg-mode[data-value="passAndPlay"]'); await p.waitForSelector('[data-go]'); await okSito(p, 'Chi gioca?')
  // 4. pass-and-play: il ≡ resta sopra l'overlay della scelta della zona, e la Pausa si apre
  await p.click('[data-go]'); await flow(p, 'gioco'); await p.waitForSelector('.rg-zone', { timeout: 20000 })
  const sotto = await p.evaluate(() => { const b = document.querySelector('.rg-menubtn'); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === b || b.contains(e) ? 'menu' : (e?.className || e?.tagName) })
  ok('pass-and-play, "para tu": sotto il dito sul ≡ c\'è il ≡', sotto === 'menu', String(sotto))
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]', { timeout: 5000 })
  const chiudi = await p.evaluate(() => { const c = document.querySelector('.rg-close').getBoundingClientRect(); return { w: c.width, h: c.height } })
  ok('✕ della Pausa a 44 px', chiudi.w >= 44 && chiudi.h >= 44, JSON.stringify(chiudi))
  ok('Pausa: "Torna al programma" c\'è', await p.evaluate(() => !![...document.querySelectorAll('.rg-overlay a')].find((a) => /#\/oggi$/.test(a.getAttribute('href')))))
  await p.click('[data-value="classifica"]'); await p.waitForSelector('.rg-panel h2', { timeout: 5000 })
  ok('Classifica dalla partita: ≡ → Classifica, 2 tocchi', (await p.evaluate(() => [...document.querySelectorAll('.rg-panel h2')].pop().textContent)) === 'Classifica di serata')
  await p.click('[data-value="ok"]'); await p.waitForTimeout(300); await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]', { timeout: 5000 })
  await p.click('[data-value="esci"]'); await flow(p, 'chiTira')
  ok('Esci dal pass-and-play riporta a CHI TIRA?', true)
  await p.click('[data-value="__classifica"]'); await p.waitForSelector('.rg-panel h2', { timeout: 5000 })
  ok('Classifica da CHI TIRA?: 1 tocco', (await p.evaluate(() => [...document.querySelectorAll('.rg-panel h2')].pop().textContent)) === 'Classifica di serata')
  await p.click('[data-value="ok"]'); await flow(p, 'chiTira')
  await ctx.close()
}
// 5. HUD a destra del ≡, mai coperto, anche con il testo lungo dello Shootout
{
  const { p, ctx } = await apri()
  await flow(p, 'chiTira'); await p.click('.rg-card[data-value="monne"]'); await flow(p, 'modalita'); await p.click('.rg-mode[data-value="shootout"]'); await flow(p, 'gioco')
  await p.waitForFunction(() => window.__rigori.role() === 'shooter' && window.__rigori.shotState() === 'idle')
  await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: 5, y: 1.2, power: 1, curve: 0 }, false, 0.5) })
  await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 })
  const r = await p.evaluate(() => { const h = document.querySelector('.rg-modehud').getBoundingClientRect(), m = document.querySelector('.rg-menubtn').getBoundingClientRect(); return { hudLeft: Math.round(h.left), menuRight: Math.round(m.right), testo: document.querySelector('.rg-modehud').textContent, scroll: document.querySelector('.rg-modehud').scrollWidth <= document.querySelector('.rg-modehud').clientWidth + 1 } })
  ok('HUD a destra del ≡ col testo lungo', r.hudLeft >= r.menuRight, JSON.stringify(r))
  await ctx.close()
}
// 5. CHI TIRA?: il bordo giallo dice "sei tu", non "selezionato"; ogni volto porta dritto a Modalità
{
  const { p, ctx } = await apri(0, true, 'monne', { monne: { xp: 140, partite: 4, vittorie: 3 } })
  await flow(p, 'chiTira')
  const stato = await p.evaluate(() => ({
    bordo: [...document.querySelectorAll('.rg-card--tu')].map((c) => c.dataset.value),
    etichetta: document.querySelector('.rg-card__slot:has(.rg-card--tu) .rg-card__tu')?.textContent,
    primario: document.querySelector('[data-tira-io]')?.textContent.trim(),
    hint: document.querySelector('.rg-chi__hint')?.textContent,
    righe: Object.fromEntries([...document.querySelectorAll('.rg-card')].map((c) => [c.dataset.value, c.querySelector('.rg-card__stat').textContent])),
    card: !!document.querySelector('.rg-overlay--player, .rg-player__face')
  }))
  ok('profilo monne: bordo giallo solo su Monne, con "Sei tu"', stato.bordo.join() === 'monne' && stato.etichetta === 'Sei tu', JSON.stringify(stato.bordo))
  ok('profilo monne: pulsante primario "Tira come Monne →"', stato.primario === 'Tira come Monne →', String(stato.primario))
  ok('sotto i volti: "Tocca un altro nome per far tirare lui"', stato.hint === 'Tocca un altro nome per far tirare lui')
  ok('riga sotto il nome: "140 XP · 3 vittorie" per Monne, "Mai tirato" per gli altri', stato.righe.monne === '140 XP · 3 vittorie' && stato.righe.giulio === 'Mai tirato' && stato.righe.manuel === 'Mai tirato', JSON.stringify(stato.righe))
  // tocco su Giulio: il bordo non si sposta, si va dritti a Modalità con "Tira Giulio"
  let tocchi = 0
  await p.click('.rg-card[data-value="giulio"]'); tocchi++
  await flow(p, 'modalita')
  ok('tocco su Giulio → Modalità con "Tira Giulio · Cambia"', (await p.locator('[data-tira]').innerText()).replace(/\s+/g, ' ').trim() === 'Tira Giulio · Cambia')
  ok('tira davvero Giulio', await p.evaluate(() => window.__rigori.shooter()) === 'giulio')
  await p.click('.rg-mode[data-value="sfidaAle"]'); tocchi++
  await flow(p, 'gioco')
  ok('da Chi tira? al primo tiro: 2 tocchi', tocchi === 2, String(tocchi))
  await p.click('.rg-menubtn'); await p.waitForSelector('[data-value="esci"]'); await p.click('[data-value="esci"]'); await flow(p, 'chiTira')
  ok('tornando a Chi tira? il bordo è ancora su Monne, non su Giulio', await p.evaluate(() => [...document.querySelectorAll('.rg-card--tu')].map((c) => c.dataset.value).join()) === 'monne')
  await p.click('[data-tira-io]'); await flow(p, 'modalita')
  ok('"Tira come Monne" fa tirare Monne', await p.evaluate(() => window.__rigori.shooter()) === 'monne')
  ok('la card giocatore non esiste più', !stato.card)
  await ctx.close()
}
// 6. nessun profilo nel sito (link diretto): niente bordo, niente etichetta, niente pulsante primario
{
  const { p, ctx } = await apri(0, true, null)
  await flow(p, 'chiTira')
  const st = await p.evaluate(() => ({ bordo: document.querySelectorAll('.rg-card--tu').length, tu: document.querySelectorAll('.rg-card__tu').length, primario: !!document.querySelector('[data-tira-io]'), hint: !!document.querySelector('.rg-chi__hint'), volti: document.querySelectorAll('.rg-card').length, sub: document.querySelector('.rg-sub').textContent }))
  ok('nessun profilo: nessun bordo, nessuna etichetta, nessun pulsante primario', st.bordo === 0 && st.tu === 0 && !st.primario && !st.hint, JSON.stringify(st))
  ok('nessun profilo: tre volti e "Tocca il tuo nome"', st.volti === 3 && st.sub.startsWith('Tocca il tuo nome'))
  await p.click('.rg-card[data-value="manuel"]'); await flow(p, 'modalita')
  ok('senza profilo un volto porta comunque a Modalità', true)
  await ctx.close()
}
// 7. nel bundle non c'è più la card giocatore
{
  const dir = 'dist/assets'; const js = readdirSync(dir).filter((f) => /^rigori-.*\.(js|css)$/.test(f)).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
  ok('bundle senza "rg-player" e senza "Conferma il giocatore"', !js.includes('rg-player') && !js.includes('Conferma il giocatore'))
}
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK navigazione')
