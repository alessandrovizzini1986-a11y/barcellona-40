// TEST MIRATO · QR del parcheggio come lo vede il telefono: screenshot dello schermo pieno a 380 px, decodifica con jsQR,
// anche con lo schermo scurito al 50 %. Deve uscire esattamente $BLQ2932537LGT@.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { lancia, pagina, vai, Registro } from './_lib.mjs'
const require = createRequire(process.env.AUDIT_TOOLS || '/tmp/claude-0/-home-user-barcellona-40/2fa60192-3bdb-5002-8999-9506e77ffd47/scratchpad/tools/package.json')
const jsQR = require('jsqr'), { PNG } = require('pngjs')
const R = new Registro('qr')
const ATTESO = '$BLQ2932537LGT@'
const decodifica = (buf, scuro = 1) => { const png = PNG.sync.read(buf); const d = new Uint8ClampedArray(png.data); if (scuro !== 1) for (let i = 0; i < d.length; i += 4) { d[i] *= scuro; d[i + 1] *= scuro; d[i + 2] *= scuro } const r = jsQR(d, png.width, png.height); return { testo: r?.data ?? null, w: png.width, h: png.height } }
const b = await lancia()
for (const [w, h] of [[380, 800], [320, 568], [412, 915]]) {
  const { p, ctx, erroriVeri } = await pagina(b, { viewport: { width: w, height: h } })
  await vai(p, '#/info/viaggio')
  await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
  await p.locator('[data-qr]').first().click({ force: true }); await p.waitForSelector('.qr-full', { timeout: 5000 }); await p.waitForTimeout(600)
  const pieno = await p.screenshot({ fullPage: false })
  const r1 = decodifica(pieno), r2 = decodifica(pieno, 0.5), r3 = decodifica(pieno, 0.3)
  R.numero(`QR a ${w}×${h}: pieno / 50 % / 30 % di luminosità`, `${r1.testo} / ${r2.testo} / ${r3.testo}`)
  if (r1.testo !== ATTESO) R.problema('BLOCCANTE', `QR a ${w} px non si decodifica dallo screenshot: ${r1.testo}`, { dove: 'src/ui/viaggio.js (.qr-full)', riproduzione: `Info → Viaggio → QR, schermo ${w} px` })
  if (r2.testo !== ATTESO) R.problema('ALTA', `QR a ${w} px al 50 % di luminosità: ${r2.testo}`, { dove: 'src/ui/viaggio.js' })
  const box = await p.evaluate(() => { const i = document.querySelector('.qr-full img'); const r = i.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), sfondo: getComputedStyle(document.querySelector('.qr-full')).backgroundColor } })
  R.numero(`QR a ${w} px: quadrato sullo schermo`, `${box.w}×${box.h}, sfondo ${box.sfondo}`)
  const e = erroriVeri(); if (e.length) R.problema('ALTA', 'errori aprendo il QR', { nota: e.join(' | ') })
  await ctx.close()
}
const orig = decodifica(readFileSync('public/' + JSON.parse(readFileSync('data/viaggio.json', 'utf8')).parcheggio.qr))
R.numero('QR dal file originale', orig.testo)
if (orig.testo !== ATTESO) R.problema('BLOCCANTE', `il file del QR decodifica "${orig.testo}"`, { dove: 'public/assets' })
await b.close(); R.salva()
