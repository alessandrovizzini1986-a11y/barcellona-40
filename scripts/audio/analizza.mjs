// Analisi di un file audio senza dipendenze esterne oltre a ffmpeg: durata, livello, silenzi ai bordi,
// stacco al punto di loop, BPM stimato e andamento tonale (sale = trionfale, scende = deluso).
// Uso: node scripts/audio/analizza.mjs <file...>
import { spawnSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
const SR = 22050
export function decodi(file) {
  const r = spawnSync(ffmpeg, ['-v', 'quiet', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
  if (!r.stdout?.length) return null
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4))
}
const db = (v) => 20 * Math.log10(v + 1e-9)
const picco = (a) => { let m = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > m) m = v } return m }
const rms = (a, from = 0, to = a.length) => { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, to - from)) }
// Centroide spettrale grezzo su una finestra: media pesata delle frequenze
function centroide(x, from, n) {
  const N = 1024; let somma = 0, conta = 0
  for (let p = from; p + N < from + n && p + N < x.length; p += N) {
    let num = 0, den = 0, prev = 0
    for (let i = 0; i < N; i++) { const v = Math.abs(x[p + i] - prev); prev = x[p + i]; num += v * i; den += v }
    if (den > 1e-6) { somma += num / den; conta++ }
  }
  return conta ? somma / conta : 0
}
export function analizza(file) {
  const x = decodi(file); if (!x) return null
  const dur = x.length / SR
  const w = Math.round(0.02 * SR), soglia = Math.pow(10, -50 / 20)
  let primo = -1, ultimo = -1
  for (let i = 0; i + w <= x.length; i += w) { const e = rms(x, i, i + w); if (e > soglia) { if (primo < 0) primo = i; ultimo = i + w } }
  const n50 = Math.round(0.05 * SR)
  const stacco = Math.abs(db(rms(x, 0, n50)) - db(rms(x, x.length - n50, x.length)))
  // BPM: flusso di energia per finestre da ~23 ms, autocorrelazione fra 60 e 200 bpm
  const hop = 512, frames = Math.floor(x.length / hop)
  const flusso = new Float64Array(Math.max(0, frames - 1))
  let prevE = rms(x, 0, hop)
  for (let f = 1; f < frames; f++) { const e = rms(x, f * hop, f * hop + hop); flusso[f - 1] = Math.max(0, e - prevE); prevE = e }
  let media = 0; for (const v of flusso) media += v; media /= Math.max(1, flusso.length)
  for (let i = 0; i < flusso.length; i++) flusso[i] -= media
  const fps = SR / hop
  let best = 0, bestLag = 0
  for (let lag = Math.floor(fps * 60 / 200); lag < Math.min(flusso.length, Math.floor(fps * 60 / 60)); lag++) {
    let s = 0; for (let i = 0; i + lag < flusso.length; i++) s += flusso[i] * flusso[i + lag]
    if (s > best) { best = s; bestLag = lag }
  }
  const meta = Math.floor(x.length / 2)
  const c1 = centroide(x, primo < 0 ? 0 : primo, meta), c2 = centroide(x, meta, x.length - meta)
  return {
    file: file.split('/').pop(), dur: +dur.toFixed(2), rms_db: +db(rms(x)).toFixed(1), picco_db: +db(picco(x)).toFixed(1),
    silenzio_testa: +(primo < 0 ? dur : primo / SR).toFixed(2), silenzio_coda: +(ultimo < 0 ? dur : dur - ultimo / SR).toFixed(2),
    stacco_loop_db: +stacco.toFixed(1), bpm: bestLag ? Math.round(60 * fps / bestLag) : 0,
    andamento: c2 > c1 * 1.06 ? 'sale' : c2 < c1 * 0.94 ? 'scende' : 'piatto'
  }
}
if (process.argv[2]) for (const f of process.argv.slice(2)) { const a = analizza(f); console.log(a ? JSON.stringify(a) : `${f}: non leggibile`) }
