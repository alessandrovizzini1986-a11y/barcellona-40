// AUDIT 2 · integrità dei dati (solo node) e residui che non devono esistere (sorgenti e bundle).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { Registro } from './_lib.mjs'
const R = new Registro('dati')
const J = (f) => JSON.parse(readFileSync('data/' + f, 'utf8'))
const it = J('itinerary.json'), venues = J('venues.json').venues, people = J('people.json').people, foto = J('foto-tappe.json'), viaggio = J('viaggio.json'), missions = J('missions.json').missions
const ids = new Set(people.map((p) => p.id))
const minuti = (t) => { const [h, m] = t.split(':').map(Number); return (h < 4 ? h + 24 : h) * 60 + m }
let tappe = 0
for (const d of it.days) {
  const conOra = d.stops.filter((s) => s.time != null)
  for (let i = 1; i < conOra.length; i++) if (minuti(conOra[i].time) < minuti(conOra[i - 1].time)) R.problema('ALTA', `${d.label}: ${conOra[i].id} (${conOra[i].time}) viene prima di ${conOra[i - 1].id} (${conOra[i - 1].time}) ma è elencata dopo`, { dove: 'data/itinerary.json' })
  // cascata asciutta: gli orari scritti devono coincidere con durata + cammino
  const catena = conOra.filter((s) => !s.soloPioggia)
  for (let i = 1; i < catena.length; i++) {
    const a = catena[i - 1], b = catena[i]
    if (a.durataMin == null) continue
    const atteso = minuti(a.time) + a.durataMin + (b.minFromPrev || 0)
    const diff = minuti(b.time) - atteso
    if (diff !== 0 && b.durataMin != null) R.problema(diff < 0 ? 'ALTA' : 'BASSA', `${d.label}: ${b.id} è alle ${b.time}, ma ${a.id} (${a.time} + ${a.durataMin} min + ${b.minFromPrev || 0} a piedi) porta alle ${String(Math.floor((atteso % 1440) / 60)).padStart(2, '0')}:${String(atteso % 60).padStart(2, '0')} (${diff > 0 ? '+' : ''}${diff} min)`, { dove: 'data/itinerary.json', nota: diff < 0 ? 'si arriva DOPO l\'orario scritto' : 'minuti di margine non dichiarati' })
  }
  for (const s of d.stops) {
    tappe++
    const v = venues[s.venueId]
    if (!v) R.problema('BLOCCANTE', `${s.id}: venueId "${s.venueId}" non esiste`, { dove: 'data/itinerary.json' })
    else if (v.lat != null && !(v.lat >= 41.30 && v.lat <= 41.47 && v.lng >= 2.05 && v.lng <= 2.25) && !/BLQ|Bologna|P2/i.test(v.name + ' ' + (v.addr || ''))) R.problema('ALTA', `${s.id}: venue "${s.venueId}" fuori da Barcellona (${v.lat}, ${v.lng})`, { dove: 'data/venues.json' })
    for (const p of s.people || []) if (!ids.has(p)) R.problema('ALTA', `${s.id}: persona "${p}" sconosciuta`, { dove: 'data/itinerary.json' })
    if (s.img) { const f = 'public/assets/tappe/' + s.img; if (!existsSync(f)) R.problema('ALTA', `${s.id}: immagine ${s.img} assente`, { dove: f }) }
    if (s.distFromPrevM != null && s.minFromPrev && s.distMode !== 'auto' && s.distMode !== 'taxi') {
      const kmh = (s.distFromPrevM / 1000) / (s.minFromPrev / 60)
      if (kmh < 3 || kmh > 6) R.problema('MEDIA', `${s.id}: ${s.distFromPrevM} m in ${s.minFromPrev} min = ${kmh.toFixed(1)} km/h a piedi, fuori da 3–6`, { dove: 'data/itinerary.json' })
    }
    if ((s.distMode === 'auto' || s.distMode === 'taxi') && s.distFromPrevM && s.minFromPrev) { const kmh = (s.distFromPrevM / 1000) / (s.minFromPrev / 60); if (kmh < 15 || kmh > 80) R.problema('MEDIA', `${s.id}: taxi a ${kmh.toFixed(0)} km/h (${s.distFromPrevM} m in ${s.minFromPrev} min)`, { dove: 'data/itinerary.json' }) }
  }
  for (const pc of d.percorsi || []) for (const id of pc.stops) if (!d.stops.some((s) => s.id === id)) R.problema('MEDIA', `percorso ${pc.id}: tappa ${id} inesistente`, { dove: 'data/itinerary.json' })
}
// venue morti
const usati = new Set([...it.days.flatMap((d) => d.stops.map((s) => s.venueId)), ...Object.values(viaggio).flatMap((x) => JSON.stringify(x).match(/"venueId":"([^"]+)"/g) || []).map((m) => m.split('"')[3])])
const morti = Object.keys(venues).filter((k) => !usati.has(k))
if (morti.length) R.problema('BASSA', `venue mai citati da una tappa: ${morti.join(', ')}`, { dove: 'data/venues.json', nota: 'dati inerti, non si vedono' })
// coordinate e telefoni dei venue
for (const [k, v] of Object.entries(venues)) {
  const tel = v.phone || v.tel
  if (tel && !/^\+\d{2} [\d ]{9,15}$/.test(tel)) R.problema('MEDIA', `venue ${k}: telefono "${tel}" non in formato internazionale`, { dove: 'data/venues.json' })
  if (tel) { const href = 'tel:' + tel.replace(/\s/g, ''); if (!/^tel:\+\d{9,15}$/.test(href)) R.problema('MEDIA', `venue ${k}: tel: "${href}" non valido`, { dove: 'data/venues.json' }) }
}
// immagini: esistono e si decodificano; crediti
const dir = 'public/assets/tappe'
const webp = readdirSync(dir).filter((f) => f.endsWith('.webp'))
const commons = new Set(foto.foto.map((f) => f.id + '.webp')), privati = new Set((foto.private || []).map((f) => f.id + '.webp'))
let decod = 0
for (const f of webp) { try { const m = await sharp(path.join(dir, f)).metadata(); if (!m.width) throw new Error('vuota'); decod++ } catch (e) { R.problema('ALTA', `immagine ${f} non si decodifica`, { dove: path.join(dir, f), nota: String(e.message) }) } }
R.numero('immagini decodificate', `${decod}/${webp.length}`)
const usateImg = new Set(it.days.flatMap((d) => d.stops.map((s) => s.img)).filter(Boolean))
for (const f of usateImg) if (!commons.has(f) && !privati.has(f)) R.problema('MEDIA', `foto ${f} senza attribuzione (né Commons né privata)`, { dove: 'data/foto-tappe.json' })
for (const f of foto.foto) if (!(f.autore && f.licenza && f.pagina)) R.problema('MEDIA', `crediti incompleti per ${f.id}`, { dove: 'data/foto-tappe.json' })
for (const f of foto.private || []) if (!/concessione/i.test(f.nota || '')) R.problema('MEDIA', `foto privata ${f.id} senza "per gentile concessione"`, { dove: 'data/foto-tappe.json' })
for (const m of missions) for (const p of m.people) if (!ids.has(p)) R.problema('ALTA', `missione ${m.id}: persona ${p} sconosciuta`, { dove: 'data/missions.json' })
R.numero('tappe', tappe); R.numero('venue', Object.keys(venues).length)
// ---- residui ----
const RESIDUI = ['Can Fisher', 'Elsa y Fred', 'elsayfred', 'Chao Pescao', 'Francesco', 'SOUNDIT', '18:50', '18:31', 'si cammina quasi sempre riparati']
const files = []
const walk = (d) => { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) { if (!/node_modules|_legacy|\.git|docs\/rigori\/screenshots|audit/.test(f)) walk(f) } else if (/\.(js|mjs|json|html|css|md|txt)$/.test(n) && !/changelog/i.test(n)) files.push(f) } }
for (const d of ['src', 'data', 'public', 'rigori', 'scripts', 'dist']) if (existsSync(d)) walk(d)
files.push('index.html')
const trovati = {}
for (const f of files) {
  if (/dist\/(_legacy|.*legacy)/.test(f)) continue
  const t = readFileSync(f, 'utf8')
  for (const r of RESIDUI) if (t.includes(r)) (trovati[r] = trovati[r] || []).push(f)
  // "Mario" fuori dal legacy: parola intera, non "Mario" dentro altre parole
  if (/\bMario\b/.test(t) && !/legacy|rigori-classic|mario\.html/.test(f)) { const righe = t.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /\bMario\b/.test(l)).slice(0, 3); (trovati.Mario = trovati.Mario || []).push(`${f}:${righe.map(([n]) => n).join(',')}`) }
  if (/16:00[–-]19:00/.test(t) && /[Bb]unker/.test(t)) (trovati['16:00–19:00 Bunkers'] = trovati['16:00–19:00 Bunkers'] || []).push(f)
}
const changelog = readFileSync('data/changelog.json', 'utf8')
for (const [r, fs] of Object.entries(trovati)) {
  // le suite che controllano l'ASSENZA di un residuo lo nominano per forza; il bundle porta dentro lo storico del
  // changelog (Novità): se la parola sta nel changelog e il file è il bundle, viene da lì, non dal contenuto
  const veri = fs.filter((f) => !f.startsWith('scripts/qa') && !(f.startsWith('dist/') && changelog.includes(r.replace(' Bunkers', ''))))
  const nota = [fs.some((f) => f.startsWith('scripts/qa')) ? 'nelle suite è il controllo di assenza' : '', fs.some((f) => f.startsWith('dist/')) && changelog.includes(r.replace(' Bunkers', '')) ? 'nel bundle viene dallo storico del changelog (Novità)' : ''].filter(Boolean).join('; ')
  if (!veri.length) R.ok(`"${r}" compare solo in suite e changelog (${nota})`)
  else R.problema(/Mario|Elsa|elsayfred|SOUNDIT|riparati/.test(r) ? 'MEDIA' : 'BASSA', `residuo "${r}" in ${veri.length} file`, { dove: veri.slice(0, 5).join(' · '), nota })
}
if (!Object.keys(trovati).length) R.ok('nessun residuo (Can Fisher, Elsa y Fred, Chao Pescao, Francesco, SOUNDIT, Mario, 16:00–19:00 Bunkers, 18:50, 18:31, "riparati")')
R.salva()
