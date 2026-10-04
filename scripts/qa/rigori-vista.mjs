// QA della rifinitura visiva: inquadratura del tiro (porta centrata, tiratore in basso a sinistra, mai sul portiere),
// etichette nome e numero (compaiono a inizio tiro, spariscono al calcio, non si coprono), turno da portiere con
// tutti e due i pali in quadro, e costo di rendering invariato (stessi draw call e triangoli della scena).
//   node scripts/qa/rigori-vista.mjs [url]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:4173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const errori = [], ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errori.push(n) }
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { localStorage.setItem('b40:v1:rigori:onboarded', 'true'); localStorage.setItem('b40:v1:person', JSON.stringify('monne')); localStorage.setItem('b40:v1:rigori:xp', '400') })
const flow = (f) => p.waitForFunction((f) => window.__rigori.flow() === f, f, { timeout: 30000 })
await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 90000 }); await p.click('.rg-loading__tap', { force: true })
await flow('chiTira'); await p.click('[data-tira-io]'); await flow('modalita'); await p.click('.rg-mode[data-value="shootout"]'); await flow('gioco')
await p.waitForFunction(() => window.__rigori.role() === 'shooter' && window.__rigori.shotState() === 'idle'); await p.waitForTimeout(1200)
// rettangoli a schermo di porta, portiere e tiratore (testa + busto), proiettati dalla camera
const misura = () => p.evaluate(() => {
  const R = window.__rigori, cam = R.rig.camera, V = cam.position.constructor, W = innerWidth, H = innerHeight
  const pr = (x, y, z) => { const v = new V(x, y, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H] }
  const box = (pts) => { const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } }
  const g = R.GOAL, porta = box([pr(-g.w / 2, 0, 0), pr(g.w / 2, 0, 0), pr(-g.w / 2, g.h, 0), pr(g.w / 2, g.h, 0)])
  const kp = R.keeper().group.position, portiere = box([pr(kp.x - 0.45, 0, kp.z), pr(kp.x + 0.45, 0, kp.z), pr(kp.x - 0.45, 2.0, kp.z), pr(kp.x + 0.45, 2.0, kp.z)])
  const tp = R.kicker().group.position, tiratore = box([pr(tp.x - 0.45, tp.y + 1.1, tp.z), pr(tp.x + 0.45, tp.y + 1.1, tp.z), pr(tp.x - 0.45, tp.y + 2.0, tp.z), pr(tp.x + 0.45, tp.y + 2.0, tp.z), pr(tp.x - 0.3, tp.y, tp.z), pr(tp.x + 0.3, tp.y, tp.z)])
  const inter = (a, c) => Math.max(0, Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0)) * Math.max(0, Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0))
  const area = (a) => (a.x1 - a.x0) * (a.y1 - a.y0)
  const tag = (sel) => { const e = document.querySelector(sel); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom, testo: e.textContent.trim() } }
  return { W, H, porta, portiere, tiratore, copPorta: inter(tiratore, porta) / area(porta), copPortiere: inter(tiratore, portiere) / area(portiere), tagT: tag('.rg-tag--tiratore'), tagP: tag('.rg-tag--portiere'), info: R.info() }
})
const dentro = (r, W, H, m = 0) => r.x0 >= -m && r.x1 <= W + m && r.y0 >= -m && r.y1 <= H + m
const inter = (a, c) => Math.max(0, Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0)) * Math.max(0, Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0))
let m = await misura()
const pw = m.porta.x1 - m.porta.x0, pcx = (m.porta.x0 + m.porta.x1) / 2
ok('tiro, attesa: porta centrata e larga almeno il 45 % dello schermo', Math.abs(pcx - m.W / 2) < 20 && pw >= 0.45 * m.W, `larga ${Math.round(pw)} px, centro ${Math.round(pcx)}`)
ok('tiro, attesa: portiere tutto in quadro, coi piedi sulla linea di porta', dentro(m.portiere, m.W, m.H) && m.portiere.y1 <= m.porta.y1 + 6 && m.portiere.y1 >= m.porta.y1 - 30, JSON.stringify(m.portiere))
// la testa può uscire di poco dal bordo sinistro e le gambe dal basso (sta a 3 m dalla camera): la faccia resta tutta visibile
ok('tiro, attesa: il tiratore sta in basso a sinistra, con almeno l\'80 % della larghezza in quadro', m.tiratore.x1 < m.W / 2 && m.tiratore.y0 > m.H / 2 && m.tiratore.x0 > -0.2 * (m.tiratore.x1 - m.tiratore.x0), JSON.stringify(m.tiratore))
ok('tiro, attesa: il tiratore non copre né la porta né il portiere', m.copPorta === 0 && m.copPortiere === 0, `${Math.round(m.copPorta * 100)} / ${Math.round(m.copPortiere * 100)} %`)
ok('etichette: "Monne 27" sopra il tiratore, "Ale" sopra il portiere', m.tagT?.testo === 'Monne27' && m.tagP?.testo === 'Ale', `${m.tagT?.testo} · ${m.tagP?.testo}`)
ok('etichette: tutte e due dentro lo schermo e non sovrapposte', m.tagT && m.tagP && dentro(m.tagT, m.W, m.H) && dentro(m.tagP, m.W, m.H) && inter(m.tagT, m.tagP) === 0)
ok('etichette: quella del portiere sta sopra la sua testa, sopra la traversa', m.tagP && m.tagP.y1 <= m.porta.y0 + 4 && Math.abs((m.tagP.x0 + m.tagP.x1) / 2 - (m.portiere.x0 + m.portiere.x1) / 2) < 30)
const draws0 = m.info.draws, tris0 = m.info.tris
// calcio: il tiratore è sulla palla, il portiere resta scoperto
await p.evaluate(() => { const R = window.__rigori; R.events.length = 0; R.setPrecision(0); R.ctx.forceKeeperZone(3); R.fire({ x: 1.6, y: 1.3, power: 0.8, curve: 0 }, false, 0.5, 4242) })
await p.waitForTimeout(250); const corsa = await misura()
ok('rincorsa: etichette ancora visibili', !!corsa.tagT && !!corsa.tagP)
await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'kick'), null, { timeout: 10000 }); await p.waitForTimeout(60); m = await misura()
ok('al calcio: le etichette sono sparite', !m.tagT && !m.tagP)
ok('al calcio: il tiratore non copre il portiere (≤ 8 % del suo rettangolo, che è più largo di lui) e al più un terzo del rettangolo della porta (sta sotto l\'angolo sinistro)', m.copPortiere <= 0.08 && m.copPorta <= 0.34, `${Math.round(m.copPorta * 100)} / ${Math.round(m.copPortiere * 100)} %`)
await p.waitForFunction(() => window.__rigori.esitoLocked, null, { timeout: 30000 }); await p.waitForTimeout(600); await p.evaluate(() => window.__rigori.salta())
// turno da portiere: Ale tira, tutti e due i pali in quadro, etichette non sovrapposte
await p.waitForFunction(() => window.__rigori.role() === 'keeper', null, { timeout: 60000 }); await p.waitForTimeout(800); m = await misura()
ok('turno da portiere: tutti e due i pali e la traversa in quadro', m.porta.x0 > 0 && m.porta.x1 < m.W && m.porta.y0 > 0, JSON.stringify(m.porta))
ok('turno da portiere: il tiratore (Ale) è in quadro, dentro la porta vista da dietro', dentro(m.tiratore, m.W, m.H) && m.tiratore.x0 > m.porta.x0 && m.tiratore.x1 < m.porta.x1, JSON.stringify(m.tiratore))
ok('turno da portiere: etichette "Ale 1" e "Monne", dentro lo schermo e non sovrapposte', m.tagT?.testo === 'Ale1' && m.tagP?.testo === 'Monne' && dentro(m.tagT, m.W, m.H) && dentro(m.tagP, m.W, m.H) && inter(m.tagT, m.tagP) === 0, `${m.tagT?.testo} · ${m.tagP?.testo}`)
ok('costo di rendering: stessi draw call e triangoli di una scena senza etichette (sono DOM, non mesh)', m.info.draws <= draws0 + 2 && Math.abs(m.info.tris - tris0) < tris0 * 0.02, `${draws0} → ${m.info.draws} draw, ${tris0} → ${m.info.tris} tri`)
ok('nessun errore JS', errs.length === 0, errs.join(' | '))
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK vista')
