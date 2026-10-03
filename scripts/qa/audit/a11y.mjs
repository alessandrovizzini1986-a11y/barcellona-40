// AUDIT 9 · accessibilità: axe-core su ogni vista nei due temi, alt, aria-label sui pulsanti con sola icona, contrasto (axe),
// bersagli ≥ 44 px, prefers-reduced-motion.
import { lancia, pagina, vai, base, Registro } from './_lib.mjs'
const R = new Registro('a11y')
const AXE = (process.env.AUDIT_TOOLS || '/tmp/claude-0/-home-user-barcellona-40/2fa60192-3bdb-5002-8999-9506e77ffd47/scratchpad/tools/package.json').replace(/package\.json$/, 'node_modules/axe-core/axe.min.js')
const VISTE = [['oggi-prima', '#/oggi?now=2026-10-15T10:00'], ['oggi-durante', '#/oggi?now=2026-10-17T10:00'], ['programma-ven', '#/programma/ven'], ['mappa', '#/mappa'], ['missioni', '#/missioni'], ['info', '#/info']]
const b = await lancia()
const viol = {}
for (const tema of ['dark', 'light']) for (const [nome, h] of VISTE) {
  const { p, ctx } = await pagina(b, { ls: { 'b40:v1:theme': JSON.stringify(tema) } })
  await vai(p, h); if (nome === 'info') await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
  await p.addScriptTag({ path: AXE })
  const r = await p.evaluate(async () => { const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] } }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, esempio: v.nodes[0]?.html.slice(0, 90), help: v.help })) })
  for (const v of r) { const k = v.id; viol[k] = viol[k] || { impact: v.impact, help: v.help, dove: [], n: 0, esempio: v.esempio }; viol[k].dove.push(`${nome}/${tema}`); viol[k].n += v.n }
  // bersagli e icone
  const extra = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const piccoli = [...document.querySelectorAll('a, button, [role=button], input[type=checkbox], label.check')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); const l = e.closest('label'); const rl = l ? l.getBoundingClientRect() : r; return { t: (e.getAttribute('aria-label') || e.textContent || e.className).toString().trim().slice(0, 30), w: Math.round(Math.max(r.width, rl.width)), h: Math.round(Math.max(r.height, rl.height)) } }).filter((x) => x.w < 44 || x.h < 44)
    const icone = [...document.querySelectorAll('a, button')].filter(vis).filter((e) => !e.textContent.trim() && !e.getAttribute('aria-label') && !e.getAttribute('title')).map((e) => e.outerHTML.slice(0, 80))
    const alt = [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('alt') || i.getAttribute('alt').trim().length < 10 || /\b(the|and|with|of)\b/i.test(i.getAttribute('alt'))).filter((i) => !i.closest('.leaflet-container')).map((i) => `${i.getAttribute('src')?.split('/').pop()} alt="${i.getAttribute('alt')}"`)
    return { piccoli: piccoli.slice(0, 8), nPiccoli: piccoli.length, icone, alt }
  })
  if (tema === 'dark') {
    if (extra.nPiccoli) R.problema('MEDIA', `${nome}: ${extra.nPiccoli} elementi toccabili sotto 44×44`, { dove: h, nota: extra.piccoli.map((x) => `${x.t} ${x.w}×${x.h}`).join(' · ') })
    if (extra.icone.length) R.problema('MEDIA', `${nome}: ${extra.icone.length} pulsanti con sola icona senza aria-label`, { dove: h, nota: extra.icone.join(' | ').slice(0, 200) })
    if (extra.alt.length) R.problema('MEDIA', `${nome}: alt mancante o non in italiano`, { dove: h, nota: extra.alt.join(' | ').slice(0, 200) })
    if (!extra.nPiccoli && !extra.icone.length && !extra.alt.length) R.ok(`${nome}: bersagli ≥ 44, icone etichettate, alt in italiano`)
  }
  await ctx.close()
}
const grav = { critical: 'ALTA', serious: 'ALTA', moderate: 'MEDIA', minor: 'BASSA' }
for (const [id, v] of Object.entries(viol)) R.problema(grav[v.impact] || 'BASSA', `axe ${v.impact}: ${id} (${v.n} nodi) · ${v.help}`, { dove: [...new Set(v.dove.map((d) => d.split('/')[0]))].join(', '), nota: v.esempio })
if (!Object.keys(viol).length) R.ok('axe-core: nessuna violazione wcag2a/aa/best-practice')
R.numero('viste × temi analizzate con axe', VISTE.length * 2)
// reduced motion: niente coriandoli alla "Missione compiuta", gioco con reduceFx
{
  const { p, ctx } = await pagina(b, { reducedMotion: 'reduce' })
  await vai(p, '#/oggi?now=2026-10-20T10:00'); await p.waitForTimeout(800)
  const canv = await p.locator('canvas').count()
  const anim = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => { const a = getComputedStyle(e).animationName; return a && a !== 'none' && parseFloat(getComputedStyle(e).animationDuration) > 0.5 }).map((e) => e.className.toString().slice(0, 30)).slice(0, 5))
  if (canv) R.problema('MEDIA', 'prefers-reduced-motion: i coriandoli partono lo stesso alla "Missione compiuta"', { dove: 'src/views/oggi.js (confettiBig)' }); else R.ok('prefers-reduced-motion: niente coriandoli alla fine')
  if (anim.length) R.problema('BASSA', `prefers-reduced-motion: animazioni CSS lunghe ancora attive: ${anim.join(', ')}`, { dove: 'src/styles/motion.css' }); else R.ok('prefers-reduced-motion: nessuna animazione CSS lunga')
  await p.goto(base + '/rigori/?q=bassa', { waitUntil: 'load' }); await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 90000 }).catch(() => {})
  const fx = await p.evaluate(() => window.__rigori?.settings?.reduceFx)
  if (fx !== true) R.problema('MEDIA', `gioco con prefers-reduced-motion: reduceFx = ${fx} (shake e flash restano)`, { dove: 'src/rigori/main.js settings' }); else R.ok('gioco: reduceFx acceso con prefers-reduced-motion')
  await ctx.close()
}
await b.close(); R.salva()
