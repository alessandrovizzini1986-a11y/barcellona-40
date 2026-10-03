// AUDIT 5 · rete cattiva: 3G lento, offline a metà e dall'inizio, Open-Meteo rotto, GoatCounter bloccato, Google Fonts bloccato, immagine che non carica.
import { lancia, pagina, vai, base, SWIFT, Registro } from './_lib.mjs'
const R = new Registro('rete')
const b = await lancia(SWIFT)
const lento = async (p) => { const cdp = await p.context().newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 }); return cdp }
// 1. 3G lento: Oggi usabile, poi il gioco fino al primo tiro
{
  const { p, ctx } = await pagina(b); await lento(p)
  const t0 = Date.now()
  await p.goto(base + '/#/oggi?now=2026-10-17T10:00', { waitUntil: 'commit' }).catch(() => {})
  await p.waitForSelector('.bento .card, .countdown', { timeout: 120000 }).catch(() => {})
  const tOggi = Date.now() - t0
  const peso = await p.evaluate(() => performance.getEntriesByType('resource').reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0) + (performance.getEntriesByType('navigation')[0]?.transferSize || 0))
  R.numero('3G: Oggi usabile dopo', `${(tOggi / 1000).toFixed(1)} s · ${(peso / 1024).toFixed(0)} kB scaricati`)
  if (tOggi > 8000) R.problema('MEDIA', `su 3G lento Oggi è usabile dopo ${(tOggi / 1000).toFixed(1)} s`, { dove: 'bundle', costo: 'medio: ridurre il peso iniziale', rischio: 'basso' })
  const t1 = Date.now()
  await p.goto(base + '/rigori/?q=bassa', { waitUntil: 'commit' }).catch(() => {})
  await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 300000 }).catch(() => {})
  const tReady = Date.now() - t1
  await p.click('.rg-loading__tap', { force: true }).catch(() => {}); await p.waitForFunction(() => window.__rigori?.flow() === 'chiTira' || window.__rigori?.flow() === 'onboarding', null, { timeout: 120000 }).catch(() => {})
  await p.evaluate(() => window.__rigori.kitReady).catch(() => {})
  const tTiro = Date.now() - t1
  const pesoG = await p.evaluate(() => performance.getEntriesByType('resource').reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0))
  R.numero('3G: gioco pronto / primo tiro possibile', `${(tReady / 1000).toFixed(1)} s / ${(tTiro / 1000).toFixed(1)} s · ${(pesoG / 1024).toFixed(0)} kB`)
  if (tTiro > 30000) R.problema('MEDIA', `su 3G lento il primo tiro arriva dopo ${(tTiro / 1000).toFixed(0)} s`, { dove: 'rigori (modelli GLB e audio)', costo: 'alto: asset più leggeri (escluso per scelta)', rischio: 'medio' })
  await ctx.close()
}
// 2. offline a metà visita
{
  const { p, ctx, errs } = await pagina(b)
  await vai(p, '#/oggi?now=2026-10-17T10:00')
  await ctx.setOffline(true)
  const esiti = []
  for (const h of ['#/programma/sab', '#/mappa', '#/missioni', '#/info', '#/oggi?now=2026-10-17T11:00']) {
    const prima = errs.length
    await p.evaluate((h) => { location.hash = h }, h); await p.waitForTimeout(1500)
    const st = await p.evaluate((h) => ({ h, testo: document.querySelector('#app')?.innerText.slice(0, 60).replace(/\s+/g, ' '), vista: document.querySelector('#app .view, #app section') ? 'contenuto' : 'vuoto', mappa: !!document.querySelector('.leaflet-container') }), h)
    st.errori = errs.slice(prima)
    esiti.push(st)
  }
  R.numero('offline a metà visita', esiti.map((e) => `${e.h}: ${e.vista}${e.errori.length ? ' ERRORE ' + e.errori[0].slice(0, 50) : ''}`).join(' · '))
  const rotte = esiti.filter((e) => e.errori.length || e.vista === 'vuoto')
  if (rotte.length) R.problema('ALTA', `offline a metà visita: ${rotte.length} viste non si aprono (le viste sono moduli caricati al bisogno, senza service worker)`, { dove: 'src/main.js (import() delle viste)', riproduzione: 'apri Oggi, togli la rete, tocca Programma o Mappa', costo: 'medio: precaricare tutte le viste al primo avvio (modulepreload) o un service worker (escluso per scelta)', rischio: 'basso con il precarico, medio con un service worker', nota: rotte.map((e) => e.h + (e.errori[0] ? ': ' + e.errori[0].slice(0, 60) : '')).join(' | ') })
  else R.ok('offline a metà visita: tutte le viste già in memoria si aprono')
  await ctx.close()
}
// 3. offline dall'inizio
{
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, offline: true }); const p = await ctx.newPage()
  let errore = null; await p.goto(base + '/#/oggi', { waitUntil: 'load', timeout: 15000 }).catch((e) => { errore = String(e.message).split('\n')[0] })
  const testo = await p.evaluate(() => document.body?.innerText?.slice(0, 80) || '').catch(() => '')
  R.numero('offline dall\'inizio', errore ? `pagina di errore del browser (${errore.slice(0, 60)})` : `pagina: "${testo}"`)
  R.problema('MEDIA', 'senza rete all\'apertura si vede la pagina di errore del browser: nessuna copia offline del sito', { dove: 'nessun service worker (scelta dichiarata)', riproduzione: 'modalità aereo, apri il link', costo: 'medio', rischio: 'medio: cache che serve dati vecchi', nota: 'piano B: lo screenshot del programma sul telefono' })
  await ctx.close()
}
// 4. Open-Meteo rotto: 429, 500, timeout, JSON rotto
for (const [caso, azione] of [['429', (r) => r.fulfill({ status: 429, body: 'Too Many Requests' })], ['500', (r) => r.fulfill({ status: 500, body: 'boom' })], ['timeout', async (r) => { await new Promise((x) => setTimeout(x, 12000)); r.abort().catch(() => {}) }], ['JSON rotto', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"hourly": {"time": [1,' })], ['HTML al posto del JSON', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>captive portal</html>' })]]) {
  const { p, ctx, erroriVeri } = await pagina(b)
  await p.route('**/api.open-meteo.com/**', azione)
  await p.goto(base + '/#/oggi?now=2026-10-15T10:00', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(caso === 'timeout' ? 10000 : 1500)
  const card = await p.locator('[data-meteo], [data-meteo-slot]').count(); const e = erroriVeri()
  if (card || e.length) R.problema('ALTA', `Open-Meteo ${caso}: ${card ? 'la card/slot resta' : ''} ${e.length ? 'errori: ' + e.join(' | ').slice(0, 120) : ''}`, { dove: 'src/ui/meteo.js' }); else R.ok(`Open-Meteo ${caso}: nessuna card, nessun errore`)
  await ctx.close()
}
// 5. GoatCounter bloccato (ad blocker)
{
  const { p, ctx, errs } = await pagina(b)
  await p.route(/goatcounter|gc\.zgo\.at/, (r) => r.abort('blockedbyclient'))
  for (const h of ['#/oggi?now=2026-10-17T10:00', '#/programma/ven', '#/info']) await vai(p, h)
  await p.locator('[data-maps]').first().evaluate((a) => { a.addEventListener('click', (e) => e.preventDefault(), { once: true }) }).catch(() => {}); await p.locator('[data-maps]').first().click().catch(() => {})
  if (errs.length) R.problema('ALTA', 'GoatCounter bloccato: errori nel sito', { nota: errs.join(' | ').slice(0, 160) }); else R.ok('GoatCounter bloccato: nessun effetto sul sito')
  await ctx.close()
}
// 6. Google Fonts bloccato
{
  const mis = async (blocca) => { const { p, ctx } = await pagina(b); if (blocca) await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); await vai(p, '#/oggi?now=2026-10-17T10:00'); const r = await p.evaluate(() => ({ fontTitolo: getComputedStyle(document.querySelector('.header__title')).fontFamily.slice(0, 40), hTitolo: Math.round(document.querySelector('.header__title').getBoundingClientRect().height), hHeader: Math.round(document.querySelector('header').getBoundingClientRect().height), fontLink: [...document.querySelectorAll('link[href*="fonts.g"]')].length })); await ctx.close(); return r }
  const con = await mis(false), senza = await mis(true)
  R.numero('Google Fonts', `link esterni: ${con.fontLink} · titolo ${con.fontTitolo} h${con.hTitolo}/header h${con.hHeader} → bloccato: h${senza.hTitolo}/h${senza.hHeader}`)
  if (con.fontLink === 0) R.ok('nessun font da Google: i caratteri sono locali (public/fonts), niente da bloccare')
  else if (Math.abs(con.hHeader - senza.hHeader) > 4) R.problema('MEDIA', `con Google Fonts bloccato il layout salta (header ${con.hHeader} → ${senza.hHeader} px)`, {})
  else R.ok('Google Fonts bloccato: layout stabile')
}
// 7. un'immagine che non carica
{
  const { p, ctx } = await pagina(b)
  await p.route(/assets\/tappe\/ciutadella\.webp/, (r) => r.abort())
  await vai(p, '#/programma/ven'); await p.waitForTimeout(800)
  const st = await p.evaluate(() => { const c = document.querySelector('.card[data-stop="f2"]'); return { vuoto: !!c.querySelector('.card__foto--vuoto'), img: !!c.querySelector('.card__foto img'), orario: c.querySelector('.card__foto-time, .card__time')?.textContent.trim() } })
  if (!st.vuoto || st.img) R.problema('MEDIA', 'immagine che non carica: nessun fallback visibile', { dove: 'src/ui/card.js bindCards (error)', nota: JSON.stringify(st) }); else R.ok(`immagine rotta: fallback .card__foto--vuoto, orario ancora visibile (${st.orario})`)
  await ctx.close()
}
await b.close(); R.salva()
