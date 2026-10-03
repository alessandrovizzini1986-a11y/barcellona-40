// AUDIT 1 · macchina del tempo: ogni 15 minuti dal 15/10 00:00 al 20/10 12:00, 4 profili × Piove on/off, più i bordi,
// i formati sbagliati di ?now= e tre fusi orari. Nessuna modifica: si osserva.
import { readFileSync } from 'node:fs'
import { lancia, pagina, base, Registro } from './_lib.mjs'
const R = new Registro('tempo')
const it = JSON.parse(readFileSync('data/itinerary.json', 'utf8')), people = JSON.parse(readFileSync('data/people.json', 'utf8')).people
const STOPS = Object.fromEntries(it.days.flatMap((d) => d.stops.map((s) => [s.id, { ...s, giorno: d.date }])))
const esclusi = (pid) => { const p = people.find((x) => x.id === pid); return new Set(Object.values(STOPS).filter((s) => !s.people.includes(pid) || p.skips.includes(s.id)).map((s) => s.id)) }
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const minDay = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return (h < 4 ? h + 24 : h) * 60 + m } // notte = giorno prima
const faseAttesa = (d) => d < new Date(2026, 9, 16) ? 'before' : d >= new Date(2026, 9, 19, 1, 40) ? 'after' : 'during'
const DECOLLO = new Date(2026, 9, 16, 6, 20)
const snapshot = () => {
  const q = (s) => document.querySelector(s), t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null)
  const fase = q('#cd') ? 'before' : q('.bento') ? 'during' : /Missione compiuta/.test(document.body.innerText) ? 'after' : 'altro'
  const ad = q('.tile--accent .card')
  const pross = q('.tile:not(.tile--accent) .tile__big')
  return {
    fase, adessoId: ad?.dataset.stop || null, adessoTime: t(ad?.querySelector('.card__foto-time, .card__time')), adessoLabel: t(ad?.querySelector('.card__time--adesso, .card__time small')),
    prossimaTime: t(pross), prossimaTitle: t(pross?.parentElement?.querySelector('strong')), adessoTesto: t(q('.tile--accent'))?.slice(0, 160),
    timeline: [...document.querySelectorAll('.timeline .card[data-stop]')].map((c) => c.dataset.stop), cd: [...document.querySelectorAll('#cd b')].map((b) => +b.textContent),
    testo: document.body.innerText, html: document.documentElement.outerHTML.length, taxiInAdesso: !!q('.tile--accent [data-taxi], .tile--accent [data-taxi-bolt]')
  }
}
async function passo(p, nowIso) {
  await p.evaluate(() => { const a = document.querySelector('#app')?.firstElementChild; if (a) a.dataset.audit = 'x' })
  await p.evaluate((h) => { location.hash = h }, `#/oggi?now=${nowIso}`)
  await p.waitForFunction(() => document.querySelector('#app')?.firstElementChild && document.querySelector('#app').firstElementChild.dataset.audit !== 'x', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(60)
  return p.evaluate(snapshot)
}
const PAROLE = /canzone|disonesti|\bcoro\b|\.mp3|\.mp4/i
const b = await lancia()
const passi = []
for (let d = new Date(2026, 9, 15, 0, 0); d <= new Date(2026, 9, 20, 12, 0); d = new Date(d.getTime() + 15 * 60000)) passi.push(new Date(d))
for (const extra of ['2026-10-15T23:59', '2026-10-16T00:00', '2026-10-16T03:59', '2026-10-16T04:00', '2026-10-19T01:39', '2026-10-19T01:41', '2026-10-18T23:59', '2026-10-19T00:00']) { const [y, m, g, h, mi] = extra.split(/[-T:]/).map(Number); passi.push(new Date(y, m - 1, g, h, mi)) }
let tot = 0, errTot = 0
const visti = {}
for (const person of ['ale', 'monne', 'giulio', 'manuel']) for (const piove of [false, true]) {
  const { p, ctx, errs, console_, rete } = await pagina(b, { person, piove })
  const media = []; p.on('request', (r) => { if (/\.(mp3|mp4)(\?|$)/i.test(r.url())) media.push(r.url()) })
  await p.goto(base + '/#/oggi?now=2026-10-15T00:00', { waitUntil: 'networkidle' })
  const exc = esclusi(person)
  let errPrima = 0
  for (const d of passi) {
    tot++
    const nowIso = iso(d), fase = faseAttesa(d)
    const s = await passo(p, nowIso)
    const tag = `${person}${piove ? '+pioggia' : ''} @ ${nowIso}`
    const nuovi = errs.length - errPrima; errPrima = errs.length
    if (nuovi) { errTot++; R.problema('ALTA', `errore JS`, { dove: tag, nota: errs.slice(-nuovi).join(' | ').slice(0, 200) }) }
    if (s.fase !== fase) R.problema('BLOCCANTE', `fase ${s.fase} invece di ${fase}`, { dove: tag })
    if (fase === 'before' && s.cd.length === 3) { const att = Math.max(0, DECOLLO - d); const dd = Math.floor(att / 864e5), hh = Math.floor((att - dd * 864e5) / 36e5), mm = Math.floor((att - dd * 864e5 - hh * 36e5) / 6e4); if (s.cd[0] !== dd || s.cd[1] !== hh || Math.abs(s.cd[2] - mm) > 1) R.problema('ALTA', `countdown ${s.cd.join(':')} invece di ${dd}:${hh}:${mm} (decollo 06:20)`, { dove: tag }) }
    if (fase === 'during') {
      const nowMin = minDay(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
      if (s.adessoId) {
        if (s.adessoTime && /^\d\d:\d\d$/.test(s.adessoTime) && minDay(s.adessoTime) > nowMin && !/^tra /.test(s.adessoLabel || '')) R.problema('ALTA', `"Adesso" è ${s.adessoId} delle ${s.adessoTime}, non ancora iniziata`, { dove: tag, nota: `etichetta "${s.adessoLabel}"` })
        const st = STOPS[s.adessoId]
        if (st && /^\d\d:\d\d$/.test(s.adessoTime || '') && s.adessoLabel && !/^tra /.test(s.adessoLabel)) {
          const passati = nowMin - minDay(s.adessoTime), finestra = (piove && st.durataPioggiaMin != null ? st.durataPioggiaMin : st.durataMin) ?? 60
          const atteso = passati < finestra ? 'adesso' : 'ultima tappa'
          if (s.adessoLabel !== atteso && !(piove && st.saltaPioggia)) { const k = `${person}|${piove}|${s.adessoId}|${atteso}`; if (!visti[k]) { visti[k] = 1; R.problema('MEDIA', `etichetta "${s.adessoLabel}" invece di "${atteso}" (${passati} min dall'inizio, finestra ${finestra})`, { dove: tag }) } }
        }
        if (/^(f99|s99)$/.test(s.adessoId)) R.problema('ALTA', 'una tappa opzionale (Casino) è "Adesso"', { dove: tag })
        if (exc.has(s.adessoId)) R.problema('BLOCCANTE', `"Adesso" mostra ${s.adessoId}, che ${person} non deve vedere`, { dove: tag })
      }
      if (s.prossimaTime && /^\d\d:\d\d$/.test(s.prossimaTime) && minDay(s.prossimaTime) <= nowMin && s.adessoId) { const k = `${person}|${piove}|pross|${s.prossimaTime}|${nowIso.slice(0, 10)}`; if (!visti[k]) { visti[k] = 1; R.problema('ALTA', `"Prossima" delle ${s.prossimaTime} è già passata (sono le ${pad(d.getHours())}:${pad(d.getMinutes())})`, { dove: tag, nota: 'può essere il giorno dopo: da leggere con la data' }) } }
      if (/Casino/.test(s.prossimaTitle || '')) R.problema('ALTA', 'il Casino (opzionale) è "Prossima"', { dove: tag })
      const vietate = s.timeline.filter((id) => exc.has(id)); if (vietate.length) R.problema('BLOCCANTE', `${person} vede tappe non sue: ${vietate.join(' ')}`, { dove: tag })
      if (person === 'monne' && d >= new Date(2026, 9, 17, 8, 16) && d < new Date(2026, 9, 19, 1, 40)) { const fine = /In volo verso Bologna|sei già a Bologna|Missione compiuta/.test(s.adessoTesto || ''); if (!fine || s.taxiInAdesso) { const k = `monne-fine|${piove}|${nowIso.slice(0, 13)}`; if (!visti[k]) { visti[k] = 1; R.problema('ALTA', `Monne dopo le 08:15 di sabato: "Adesso" dice "${(s.adessoTesto || '').slice(0, 70)}"`, { dove: tag }) } } }
    }
    if (d >= new Date(2026, 9, 19, 0, 0)) { const m = s.testo.match(PAROLE); if (m) { const k = `canzone|${person}|${piove}|${s.fase}`; if (!visti[k]) { visti[k] = 1; R.problema('ALTA', `dopo il 19/10 il DOM contiene "${m[0]}"`, { dove: tag }) } } if (media.length) { R.problema('ALTA', `dopo il 19/10 richiesto un file audio/video`, { dove: tag, nota: media[0] }); media.length = 0 } }
    else media.length = 0
  }
  R.numero(`passi ${person}${piove ? '+pioggia' : ''}`, passi.length)
  await ctx.close()
}
R.numero('passi totali', tot); R.numero('passi con errori JS', errTot)
// ---- formati sbagliati di ?now= ----
for (const [q, attesa] of [['?now=', 'ignorato'], ['?now=ciao', 'ignorato'], ['?now=2026-13-45', 'ignorato'], ['?now=2026-10-16T10:00+02:00', 'ignorato'], ['?now=2026-10-16T10:00Z', 'ignorato'], ['?now=2026-10-16T10:00#/oggi?now=2026-10-17T10:00', 'query']]) {
  const { p, ctx, erroriVeri } = await pagina(b)
  await p.goto(base + '/' + (q.includes('#') ? q : q + '#/oggi'), { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(400)
  const testo = await p.evaluate(() => document.body.innerText)
  const sim = testo.match(/Data simulata: ([^\n]+)/)?.[1] || null
  const e = erroriVeri()
  if (e.length) R.problema('ALTA', `?now= malformato rompe la pagina`, { dove: q, nota: e.join(' | ').slice(0, 160) })
  else if (attesa === 'ignorato' && sim) R.problema('MEDIA', `"${q}" non viene ignorato: Data simulata ${sim}`, { dove: q })
  else if (attesa === 'query' && !/16\/10\/2026/.test(sim || '')) R.problema('MEDIA', `con ?now= sia in query che in hash vince: ${sim}`, { dove: q })
  else R.ok(`${q || '?now= vuoto'} → ${sim ? 'simulata ' + sim : 'ora vera'}`)
  await ctx.close()
}
// ---- fusi orari: gli orari mostrati restano quelli di Barcellona ----
const per = {}
for (const tz of ['Europe/Rome', 'UTC', 'America/New_York']) {
  const { p, ctx } = await pagina(b, { timezoneId: tz })
  await p.goto(base + '/#/oggi?now=2026-10-15T12:00', { waitUntil: 'networkidle' })
  per[tz] = []
  for (let h = 6; h <= 23; h += 3) for (const g of [16, 17, 18]) { const s = await passo(p, `2026-10-${g}T${pad(h)}:00`); per[tz].push({ g, h, a: s.adessoId, at: s.adessoTime, pt: s.prossimaTime, tl: s.timeline.join(',') }) }
  await p.evaluate(() => { location.hash = '#/programma/ven' }); await p.waitForTimeout(400)
  per[tz].push({ prog: await p.evaluate(() => [...document.querySelectorAll('.card[data-stop]')].map((c) => (c.querySelector('.card__foto-time') || c.querySelector('.card__time'))?.textContent.trim()).join(' ')) })
  await ctx.close()
}
const rif = JSON.stringify(per['Europe/Rome'])
for (const tz of ['UTC', 'America/New_York']) { if (JSON.stringify(per[tz]) !== rif) { const i = per[tz].findIndex((x, k) => JSON.stringify(x) !== JSON.stringify(per['Europe/Rome'][k])); R.problema('ALTA', `con il telefono in ${tz} gli orari cambiano`, { dove: 'src/time.js', nota: JSON.stringify(per[tz][i]).slice(0, 160) + ' vs ' + JSON.stringify(per['Europe/Rome'][i]).slice(0, 160) }) } else R.ok(`fuso ${tz}: stessi orari di Europe/Rome con ?now=`) }
R.problema('MEDIA', 'senza ?now=, con il telefono su un fuso diverso da Europe/Madrid, "Adesso" segue l\'ora locale del telefono', { dove: 'src/time.js:28 (now = new Date())', riproduzione: 'telefono in UTC, sabato alle 10:00 di Barcellona: il sito crede che siano le 08:00', costo: 'piccolo: fissare il fuso Europe/Madrid nel calcolo di now()', rischio: 'basso; a Barcellona i telefoni prendono il fuso locale da soli', nota: 'rilevante solo con fuso manuale o roaming strano' })
await b.close(); R.salva()
