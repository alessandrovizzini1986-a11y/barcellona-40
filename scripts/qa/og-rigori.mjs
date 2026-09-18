// Genera public/assets/rigori/og-rigori.jpg (1200×630, sotto i 300 kB): l'anteprima che WhatsApp mostra
// quando si condivide il link del gioco. Due passaggi:
//   1. si fotografa la scena vera del gioco, con la camera dietro il tiratore e il portiere che guarda in camera
//   2. la si compone con titolo, sottotitolo e i quattro volti, in un modello HTML, e si esporta in JPEG
// Uno screenshot grezzo non va bene: in miniatura l'HUD è illeggibile e non si capisce di che gioco si tratti.
//   node scripts/qa/og-rigori.mjs [url]
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))
const radice = path.join(here, '../..')
const url = process.argv[2] || 'http://localhost:5173/rigori/?noflow=1'
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = path.join(radice, 'public/assets/rigori/og-rigori.jpg')
const SFONDO = path.join(here, 'og-rigori-scena.png')

const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] })

// --- 1. la scena del gioco, in formato largo -------------------------------------------
const gioco = await b.newPage({ viewport: { width: 1200, height: 630 } })
const errori = []
gioco.on('pageerror', (e) => errori.push(String(e.message)))
await gioco.goto(url, { waitUntil: 'load' })
await gioco.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
await gioco.evaluate(() => window.__rigori.kitReady)
await gioco.evaluate(() => {
  const R = window.__rigori
  R.game.holdShot = true
  R.setShooter('monne'); R.ctx.role('shooter')
  R.keeper().reset()
  // camera dietro il tiratore ma più bassa e stretta: porta, portiere e spalle del tiratore nel quadro largo
  // Inquadratura scelta confrontando tre prove: questa è quella in cui il volto del portiere si riconosce
  // anche in miniatura. Alzando la camera entrano i fari ma il volto va in ombra, e a 200 px di larghezza
  // conta più la faccia dei fari. Che sia notte si legge lo stesso dal cielo e dalle gradinate illuminate.
  R.rig.goToPoint({ pos: [1.1, 1.45, 6.6], look: [-0.15, 0.95, 0.4], fov: 42, instant: true })
  document.querySelectorAll('.rg-hint, .rg-menubtn, .rg-modehud, .rg-timing, .rg-skip, .rg-esito').forEach((e) => e.remove())
})
await gioco.waitForTimeout(1200)
await gioco.screenshot({ path: SFONDO })

// --- 2. composizione -------------------------------------------------------------------
const VOLTI = ['faces/face-monne-head.webp', 'faces/face-giulio.png', 'faces/face-mario.png', 'faces/face-ale.png']
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Clash Display";src:url("file://${radice}/public/fonts/ClashDisplay-Bold.woff2") format("woff2");font-weight:700}
@font-face{font-family:"Inter";src:url("file://${radice}/public/fonts/Inter-Variable.woff2") format("woff2");font-weight:100 900}
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden;background:#0E1116}
.scena{position:absolute;inset:0;background:url("file://${SFONDO}") center/cover no-repeat}
/* velature: il testo deve leggersi a 200 px di larghezza, quindi sotto ci vuole buio pieno */
.alto{position:absolute;inset:0 0 auto 0;height:240px;background:linear-gradient(180deg,rgba(14,17,22,.94),rgba(14,17,22,0))}
.basso{position:absolute;inset:auto 0 0 0;height:380px;background:linear-gradient(0deg,rgba(14,17,22,.97) 42%,rgba(14,17,22,.72) 70%,rgba(14,17,22,0))}
.testo{position:absolute;left:64px;right:64px;bottom:150px}
h1{font-family:"Clash Display";font-weight:700;font-size:96px;line-height:.94;letter-spacing:-.01em;color:#F2E9DE;text-shadow:0 6px 30px rgba(0,0,0,.85)}
h1 b{color:#F2B705}
p{margin-top:18px;font-family:Inter;font-weight:600;font-size:36px;color:#F2E9DE;text-shadow:0 3px 14px rgba(0,0,0,.9)}
p span{color:#2CA6A4}
.volti{position:absolute;left:64px;bottom:46px;display:flex;align-items:center;gap:18px}
.volti img{width:76px;height:76px;border-radius:50%;object-fit:cover;border:3px solid rgba(242,233,222,.9);background:#1C232C}
.firma{position:absolute;right:64px;bottom:62px;font-family:Inter;font-weight:700;font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:#7E7A72}
.riga{position:absolute;left:0;right:0;bottom:0;height:10px;background:linear-gradient(90deg,#E8552E,#F2B705 50%,#2CA6A4)}
</style></head><body>
<div class="scena"></div><div class="alto"></div><div class="basso"></div>
<div class="testo"><h1>RIGORI AL<br><b>CAMP NOU</b></h1><p>5 rigori contro Ale · <span>Barcelona 40</span></p></div>
<div class="volti">${VOLTI.map((v) => `<img src="file://${radice}/public/assets/rigori/${v}">`).join('')}</div>
<div class="firma">16–18 ottobre 2026</div><div class="riga"></div>
</body></html>`
const tpl = path.join(here, 'og-rigori.html')
writeFileSync(tpl, html)
const comp = await b.newPage({ viewport: { width: 1200, height: 630 } })
await comp.goto('file://' + tpl)
await comp.evaluate(() => document.fonts.ready)
await comp.waitForTimeout(400)
// qualità scelta per stare sotto i 300 kB: WhatsApp tronca le immagini pesanti
for (const q of [88, 80, 72, 64, 56]) {
  await comp.screenshot({ path: OUT, type: 'jpeg', quality: q })
  const kb = statSync(OUT).size / 1024
  console.log(`qualità ${q} → ${kb.toFixed(0)} kB`)
  if (kb < 290) break
}
await b.close()
const kb = statSync(OUT).size / 1024
console.log(`\nscritto ${path.relative(radice, OUT)} · 1200×630 · ${kb.toFixed(0)} kB`)
if (errori.length) { console.error('ERRORI DI PAGINA:\n' + errori.join('\n')); process.exit(1) }
if (kb >= 300) { console.error('immagine troppo pesante per WhatsApp'); process.exit(1) }
