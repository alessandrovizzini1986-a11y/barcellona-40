// AUDIT 6 · memoria del telefono: localStorage spento, pieno, corrotto, chiavi vecchie, due schede, cancellazione a metà.
import { lancia, pagina, vai, base, Registro } from './_lib.mjs'
const R = new Registro('memoria')
const b = await lancia()
const VISTE = ['#/oggi?now=2026-10-17T10:00', '#/programma/sab', '#/mappa', '#/missioni', '#/info']
const giro = async (p, erroriVeri, tag, { aspetta = 'una vista' } = {}) => {
  const esiti = []
  for (const h of VISTE) { await vai(p, h); const txt = await p.evaluate(() => document.body.innerText.slice(0, 120).replace(/\s+/g, ' ')); const onb = await p.evaluate(() => !!document.querySelector('.onboarding, [data-person], .persone')); esiti.push({ h, onboarding: onb, testo: txt.slice(0, 60) }) }
  const e = erroriVeri()
  if (e.length) R.problema('ALTA', `${tag}: errori JS`, { nota: e.join(' | ').slice(0, 220) }); else R.ok(`${tag}: nessun errore su ${VISTE.length} viste`)
  return esiti
}
// 1. localStorage spento (Safari privato)
{
  const { p, ctx, erroriVeri } = await pagina(b, { storageBroken: true })
  await vai(p, '#/oggi')
  const onb = await p.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, ' '))
  R.numero('storage spento: prima schermata', onb.slice(0, 80))
  const btn = p.locator('button, [data-person], a').filter({ hasText: /Alessandro|Ale\b/ }).first()
  if (await btn.count()) { await btn.click().catch(() => {}); await p.waitForTimeout(500) }
  const dopo = await p.evaluate(() => document.body.innerText.slice(0, 120).replace(/\s+/g, ' '))
  R.numero('storage spento: dopo la scelta del profilo', dopo.slice(0, 80))
  await giro(p, erroriVeri, 'storage spento')
  if (/Chi sei|Scegli|profilo/i.test(dopo) && !/Oggi|Manca poco|Missione/.test(dopo)) R.problema('ALTA', 'senza localStorage il profilo non si tiene: si resta sull\'onboarding', { dove: 'src/store.js', riproduzione: 'Safari in navigazione privata, scegli un profilo', costo: 'medio: tenere il profilo in memoria per la sessione', rischio: 'basso' })
  await ctx.close()
}
// 2. localStorage pieno
{
  const { p, ctx, erroriVeri } = await pagina(b, { init: () => { try { let i = 0; const big = 'x'.repeat(1024 * 512); while (i < 40) { localStorage.setItem('riempi' + i, big); i++ } } catch (e) { window.__pieno = String(e.name) } } })
  await vai(p, '#/oggi?now=2026-10-17T10:00')
  const st = await p.evaluate(() => ({ pieno: window.__pieno, persona: localStorage.getItem('b40:v1:person'), testo: document.body.innerText.slice(0, 80).replace(/\s+/g, ' ') }))
  R.numero('storage pieno', st)
  await p.locator('.card input[data-done]').first().check({ force: true }).catch(() => {}); await p.waitForTimeout(300)
  await giro(p, erroriVeri, 'storage pieno')
  if (!st.pieno) R.problema('BASSA', 'non sono riuscito a riempire localStorage fino a QuotaExceeded in Chromium headless (quota alta): caso non riprodotto', {})
  await ctx.close()
}
// 3. valori corrotti
for (const [k, v] of [['b40:v1:person', '{rotto'], ['b40:v1:person', 'null'], ['b40:v1:person', '42'], ['b40:v1:done', '"stringa"'], ['b40:v1:missions', '{}'], ['b40:v1:piove', '"forse"'], ['b40:v1:theme', '123'], ['b40:v1:lastSeenVersion', '"abc"'], ['b40:v1:checks', 'null'], ['b40:v1:scores', '[]'], ['b40:v1:rigori:xp', '"tanti"'], ['b40:v1:rigori:settings', '[1,2]'], ['b40:v1:rigori:giocatori', '7']]) {
  const { p, ctx, erroriVeri } = await pagina(b, { ls: { [k]: v } })
  if (k.includes('rigori')) { await p.goto(base + '/rigori/?q=bassa', { waitUntil: 'load' }).catch(() => {}); await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(800) }
  else await giro(p, () => [], `corrotto ${k}=${v}`)
  const e = erroriVeri()
  if (e.length) R.problema('ALTA', `valore corrotto ${k}=${v}: errori`, { dove: 'src/store.js', nota: e.join(' | ').slice(0, 200), riproduzione: `localStorage.setItem('${k}', '${v}') e ricarica`, costo: 'piccolo: validare il tipo in lettura', rischio: 'basso' })
  else R.ok(`corrotto ${k}=${v}: nessun errore`)
  await ctx.close()
}
// 4. profilo vecchio "mario"
{
  const { p, ctx, erroriVeri } = await pagina(b, { person: 'mario' })
  await vai(p, '#/oggi?now=2026-10-17T10:00')
  const txt = await p.evaluate(() => document.body.innerText.slice(0, 160).replace(/\s+/g, ' '))
  const e = erroriVeri()
  if (e.length) R.problema('ALTA', 'profilo salvato "mario" (vecchio nome): errori', { dove: 'src/main.js route()', nota: e.join(' | ').slice(0, 200), riproduzione: 'telefono che aveva scelto Mario prima della rinomina', costo: 'piccolo: mappare mario→manuel o azzerare il profilo', rischio: 'basso' })
  else if (!/Manuel|Chi sei|profilo|Scegli/i.test(txt)) R.problema('MEDIA', `profilo "mario": la pagina mostra "${txt.slice(0, 70)}"`, { dove: 'src/main.js' })
  else R.ok(`profilo vecchio "mario": ${txt.slice(0, 60)}`)
  await ctx.close()
}
// 5. due schede
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true })
  const A = await ctx.newPage(), B = await ctx.newPage(); const errs = []
  for (const q of [A, B]) q.on('pageerror', (e) => errs.push(e.message))
  await A.goto(base + '/'); await A.evaluate(() => { localStorage.clear(); localStorage.setItem('b40:v1:lastSeenVersion', '999'); localStorage.setItem('b40:v1:person', JSON.stringify('ale')); localStorage.setItem('b40:v1:onboarded', 'true') })
  await A.goto(base + '/#/programma/ven', { waitUntil: 'networkidle' }); await B.goto(base + '/#/programma/ven', { waitUntil: 'networkidle' }); await B.waitForTimeout(300)
  await A.locator('#piove').check(); await A.waitForTimeout(500)
  const bPrima = await B.locator('#piove').isChecked()
  await B.evaluate(() => { location.hash = '#/programma/sab' }); await B.waitForTimeout(300); await B.evaluate(() => { location.hash = '#/programma/ven' }); await B.waitForTimeout(400)
  const bDopo = await B.locator('#piove').isChecked()
  R.numero('due schede: Piove acceso in A → B subito / dopo navigazione', `${bPrima} / ${bDopo}`)
  if (!bPrima) R.problema('BASSA', 'due schede: il toggle Piove cambiato in una non aggiorna l\'altra finché non si naviga', { dove: 'src/store.js (nessun listener su "storage")', riproduzione: 'due schede sul Programma, accendi Piove in una', costo: 'piccolo: addEventListener("storage") → re-render', rischio: 'basso' })
  await A.goto(base + '/#/info/profilo', { waitUntil: 'networkidle' }); await A.evaluate(() => { localStorage.setItem('b40:v1:person', JSON.stringify('monne')) })
  await B.evaluate(() => { location.hash = '#/oggi?now=2026-10-17T10:00' }); await B.waitForTimeout(500)
  R.numero('due schede: profilo cambiato in A, B dopo navigazione mostra', await B.evaluate(() => document.querySelector('.person-chip')?.textContent.trim()))
  if (errs.length) R.problema('ALTA', 'due schede: errori', { nota: errs.join(' | ') })
  await ctx.close()
}
// 6. cancellazione dei dati a metà sessione
{
  const { p, ctx, erroriVeri } = await pagina(b)
  await vai(p, '#/oggi?now=2026-10-17T10:00')
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  for (const h of ['#/programma/sab', '#/missioni', '#/info', '#/oggi']) { await p.evaluate((h) => { location.hash = h }, h); await p.waitForTimeout(400) }
  const txt = await p.evaluate(() => document.body.innerText.slice(0, 120).replace(/\s+/g, ' '))
  const e = erroriVeri()
  if (e.length) R.problema('ALTA', 'dati cancellati a metà sessione: errori', { nota: e.join(' | ').slice(0, 200) }); else R.ok(`dati cancellati a metà: nessun errore, si vede "${txt.slice(0, 50)}"`)
  await ctx.close()
}
await b.close(); R.salva()
