// Condivisione del momento: si cattura il canvas del gioco, ci si compone sopra il punteggio e lo sfottò,
// e si passa la PNG a navigator.share. Dove la condivisione di file non c'è (o viene rifiutata) si scarica
// il file e si apre WhatsApp col testo, dicendo all'utente di allegarla.
//
// Il video esiste solo dove MediaRecorder funziona davvero: su Safari iOS spesso dichiara il supporto e poi
// produce un file vuoto, quindi oltre al test del tipo si controlla anche la dimensione del blob.
const L = 1080, H = 1920

const TIPI_VIDEO = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
export function tipoVideoSupportato() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null
  for (const t of TIPI_VIDEO) { try { if (MediaRecorder.isTypeSupported(t)) return t } catch { /* niente */ } }
  return null
}
export const puoCondividereFile = (file) => {
  try { return !!(navigator.canShare && navigator.canShare({ files: [file] })) } catch { return false }
}

// Disegna la cornice sopra il fotogramma catturato: fascia in alto col punteggio, fascia in basso con
// esito, sfottò e firma. Tutto su canvas 2D, nessun font esterno (si usa il system stack).
function componi(sorgente, dati) {
  const c = document.createElement('canvas'); c.width = L; c.height = H
  const x = c.getContext('2d')
  x.fillStyle = '#0E1116'; x.fillRect(0, 0, L, H)
  // il fotogramma riempie il riquadro mantenendo le proporzioni (ritaglio centrale)
  const sw = sorgente.width, sh = sorgente.height
  const scala = Math.max(L / sw, H / sh)
  const dw = sw * scala, dh = sh * scala
  x.drawImage(sorgente, (L - dw) / 2, (H - dh) / 2, dw, dh)
  // velature per rendere leggibile il testo
  const sopra = x.createLinearGradient(0, 0, 0, 420)
  sopra.addColorStop(0, 'rgba(14,17,22,.92)'); sopra.addColorStop(1, 'rgba(14,17,22,0)')
  x.fillStyle = sopra; x.fillRect(0, 0, L, 420)
  const sotto = x.createLinearGradient(0, H - 560, 0, H)
  sotto.addColorStop(0, 'rgba(14,17,22,0)'); sotto.addColorStop(.42, 'rgba(14,17,22,.92)'); sotto.addColorStop(1, 'rgba(14,17,22,.98)')
  x.fillStyle = sotto; x.fillRect(0, H - 560, L, 560)

  const font = (px, peso = 700) => { x.font = `${peso} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif` }
  x.textAlign = 'center'; x.fillStyle = '#F2E9DE'
  if (dati.punteggio) { font(64); x.fillText(dati.punteggio, L / 2, 130) }
  if (dati.sfida) { font(40, 600); x.fillStyle = '#B9B2A7'; x.fillText(dati.sfida, L / 2, 196) }

  const colore = { goal: '#F2B705', save: '#2CA6A4', miss: '#E8552E', post: '#E8552E', crossbar: '#E8552E' }[dati.esito] || '#F2B705'
  x.fillStyle = colore; font(150)
  x.fillText((dati.titolo || '').toUpperCase(), L / 2, H - 340)
  if (dati.sfotto) {
    x.fillStyle = '#F2E9DE'; font(42, 600)
    for (const [i, riga] of aCapo(x, dati.sfotto, L - 140, 2).entries()) x.fillText(riga, L / 2, H - 250 + i * 58)
  }
  x.fillStyle = '#7E7A72'; font(34, 600)
  x.fillText('rigori al camp nou · barcelona 40', L / 2, H - 70)
  return c
}
// Manda a capo su al massimo `max` righe, tagliando con i puntini se serve
function aCapo(x, testo, larghezza, max) {
  const parole = String(testo).split(/\s+/), righe = []
  let riga = ''
  for (const p of parole) {
    const prova = riga ? riga + ' ' + p : p
    if (x.measureText(prova).width > larghezza && riga) { righe.push(riga); riga = p; if (righe.length === max) break } else riga = prova
  }
  if (righe.length < max && riga) righe.push(riga)
  if (righe.length === max && x.measureText(righe[max - 1]).width > larghezza) righe[max - 1] = righe[max - 1].slice(0, -3) + '…'
  return righe
}

const blobDaCanvas = (c, tipo = 'image/png', q) => new Promise((res) => c.toBlob(res, tipo, q))

// Cattura il canvas del gioco. `render` forza un disegno subito prima, così il buffer non è vuoto
// nemmeno dove preserveDrawingBuffer non basta.
export async function catturaImmagine(canvas, dati, render) {
  try { render?.() } catch { /* si cattura comunque quello che c'è */ }
  const c = componi(canvas, dati)
  const blob = await blobDaCanvas(c, 'image/png')
  if (!blob) throw new Error('canvas non catturabile')
  return new File([blob], 'rigori-camp-nou.png', { type: 'image/png' })
}

// Registra il replay mentre gira: nessuna riesecuzione. Torna null se il supporto non c'è davvero.
export function registraReplay(canvas, { durataMax = 6000, bitrate = 2_500_000 } = {}) {
  const tipo = tipoVideoSupportato()
  if (!tipo || !canvas.captureStream) return null
  let rec, pezzi = []
  try {
    const stream = canvas.captureStream(30)
    rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: bitrate })
  } catch { return null }
  rec.ondataavailable = (e) => { if (e.data && e.data.size) pezzi.push(e.data) }
  const fine = new Promise((res) => { rec.onstop = () => res() })
  try { rec.start(100) } catch { return null }
  const stopTimer = setTimeout(() => { try { rec.stop() } catch { /* già ferma */ } }, durataMax)
  return {
    async ferma() {
      clearTimeout(stopTimer)
      if (rec.state !== 'inactive') { try { rec.stop() } catch { /* già ferma */ } }
      await fine
      const blob = new Blob(pezzi, { type: tipo })
      // Safari iOS dichiara il supporto e poi produce un file vuoto: sotto i 10 kB si butta via
      if (blob.size < 10_000) return null
      const est = tipo.startsWith('video/mp4') ? 'mp4' : 'webm'
      return new File([blob], 'rigori-camp-nou.' + est, { type: tipo })
    }
  }
}

// Condivide un file: sheet nativo se c'è, altrimenti scaricamento + WhatsApp col testo.
// Torna 'share' | 'download' | 'annullato'
export async function condividiFile(file, testo, { onFallback } = {}) {
  if (puoCondividereFile(file)) {
    try { await navigator.share({ files: [file], text: testo }); return 'share' } catch (e) {
      if (e && e.name === 'AbortError') return 'annullato'
    }
  }
  scarica(file)
  onFallback?.()
  return 'download'
}
export function scarica(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a'); a.href = url; a.download = file.name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
export const linkWhatsApp = (testo) => 'https://wa.me/?text=' + encodeURIComponent(testo)
