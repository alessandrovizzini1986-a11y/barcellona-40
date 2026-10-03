// AUDIT 8 · privacy e sicurezza: noindex, robots, segreti nel bundle, QR solo per ale, pagina statistiche non linkata, contenuto misto, dati personali.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { lancia, pagina, vai, Registro } from './_lib.mjs'
const R = new Registro('privacy')
const files = []
const walk = (d) => { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) walk(f); else files.push(f) } }
walk('dist')
const html = files.filter((f) => f.endsWith('.html'))
const senza = html.filter((f) => !/<meta\s+name="robots"\s+content="noindex,\s*nofollow,\s*noarchive"/i.test(readFileSync(f, 'utf8')))
if (senza.length) R.problema('ALTA', `${senza.length} pagine senza noindex`, { nota: senza.join(', ') }); else R.ok(`noindex, nofollow, noarchive su tutte le ${html.length} pagine`)
if (!/Disallow:\s*\/\s*$/m.test(readFileSync('dist/robots.txt', 'utf8'))) R.problema('ALTA', 'robots.txt non chiude', { dove: 'public/robots.txt' }); else R.ok('robots.txt: Disallow /')
// segreti
const testo = files.filter((f) => /\.(js|html|css|json|txt)$/.test(f) && !/_legacy|rigori-classic/.test(f)).map((f) => [f, readFileSync(f, 'utf8')])
const SEGRETI = [/api[_-]?key\s*[=:]\s*["'][A-Za-z0-9_-]{12,}/i, /AIza[0-9A-Za-z_-]{30,}/, /sk-[A-Za-z0-9]{20,}/, /ghp_[A-Za-z0-9]{20,}/, /password\s*[=:]\s*["'][^"']{4,}/i, /\bapi\/v0\b/, /secret\s*[=:]\s*["'][^"']{6,}/i, /Bearer\s+[A-Za-z0-9._-]{20,}/]
let seg = 0
for (const [f, t] of testo) for (const re of SEGRETI) { const m = t.match(re); if (m) { seg++; R.problema('ALTA', `possibile segreto nel bundle: ${m[0].slice(0, 40)}`, { dove: f }) } }
if (!seg) R.ok('nessun token, chiave, password o api/v0 nel bundle')
// pagina statistiche non linkata
const link = [...files.filter((f) => !/stats-dtcmbsis\.html|assets\/stats-/.test(f) && /\.(js|html)$/.test(f)).map((f) => [f, readFileSync(f, 'utf8')]), ...['src', 'index.html', 'rigori/index.html'].flatMap((d) => { const out = []; const w = (x) => { if (statSync(x).isDirectory()) { for (const n of readdirSync(x)) w(path.join(x, n)) } else if (/\.(js|html)$/.test(x) && !/stats-pagina/.test(x)) out.push([x, readFileSync(x, 'utf8')]) }; w(d); return out })].filter(([, t]) => t.includes('stats-dtcmbsis'))
if (link.length) R.problema('MEDIA', 'la pagina statistiche è citata fuori da sé stessa', { nota: link.map(([f]) => f).join(', ') }); else R.ok('pagina statistiche non linkata da nessuna parte (bundle e sorgenti)')
// contenuto misto
let misto = 0
for (const [f, t] of testo) for (const m of t.matchAll(/(?:src|href)=["']http:\/\/[^"']+|url\(["']?http:\/\/[^)"']+|fetch\(["']http:\/\//g)) { if (/creativecommons\.org|w3\.org/.test(m[0]) && /href/.test(m[0])) continue; misto++; R.problema('MEDIA', `risorsa http in pagina https: ${m[0].slice(0, 80)}`, { dove: f }) }
if (!misto) R.ok('nessun contenuto misto (le uniche http sono link a creativecommons.org, non risorse)')
// dati personali: email e telefoni fuori dai venue
const venues = JSON.parse(readFileSync('data/venues.json', 'utf8')).venues, viaggio = readFileSync('data/viaggio.json', 'utf8')
const telNoti = new Set([...Object.values(venues).map((v) => (v.phone || v.tel || '').replace(/\s/g, '')), ...(viaggio.match(/\+\d[\d ]{8,}/g) || []).map((x) => x.replace(/\s/g, ''))].filter(Boolean))
for (const [f, t] of testo.filter(([f]) => /assets\/.*\.js$|\.html$/.test(f))) {
  for (const m of t.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) if (!/example|sentry|w3|schema|noreply|svg|\.png|\.webp|\.js|\.css/.test(m[0])) R.problema('MEDIA', `indirizzo email nel bundle: ${m[0]}`, { dove: f })
  for (const m of t.matchAll(/\+\d{2}[\s\d]{8,14}/g)) { const n = m[0].replace(/\s/g, ''); if (!telNoti.has(n) && n.length >= 11) R.problema('BASSA', `telefono non di un locale nel bundle: ${m[0].trim()}`, { dove: f }) }
}
R.ok('telefoni nel bundle: solo quelli dei locali, della lounge e del parcheggio (dati di servizio)')
// QR solo per ale
const b = await lancia()
for (const person of ['ale', 'monne', 'giulio', 'manuel']) {
  const { p, ctx } = await pagina(b, { person })
  await vai(p, '#/info/viaggio')
  await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true }))
  const n = await p.locator('[data-qr], .qr-img').count()
  const nOggi = await (async () => { await vai(p, '#/oggi?now=2026-10-16T05:00'); return p.locator('[data-qr], .qr-img').count() })()
  if (person === 'ale' ? n === 0 : n + nOggi > 0) R.problema(person === 'ale' ? 'BLOCCANTE' : 'MEDIA', `QR del parcheggio per ${person}: ${n + nOggi} elementi`, { dove: 'src/ui/viaggio.js' }); else R.ok(`QR del parcheggio: ${person} → ${n + nOggi} (${person === 'ale' ? 'c\'è' : 'non c\'è'})`)
  await ctx.close()
}
await b.close(); R.salva()
