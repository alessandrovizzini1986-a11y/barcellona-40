// Audio: un solo AudioContext sbloccato al primo tap, pool di buffer, massimo 8 voci, ducking della musica
// durante l'esito. Effetti da file (Kenney CC0, vedi CREDITS.md), fischio/boato/oooh/applausi sintetizzati.
// Musica: tre file forniti dall'utente; finché mancano, silenzio (nessun sostituto sintetico). DA VERIFICARE: volumi a orecchio.
const SFX = { kick: 'kick.ogg', kick2: 'kick2.ogg', post: 'post.ogg', crossbar: 'crossbar.ogg', net: 'net.ogg', glove: 'glove.ogg', dive: 'dive.ogg', step: 'step.ogg', click: 'ui_click.ogg', confirm: 'ui_confirm.ogg', back: 'ui_back.ogg', error: 'ui_error.ogg', unlock: 'unlock.ogg', levelup: 'levelup.ogg' }
const MUSIC = { inno: 'inno.mp3', tensione: 'tensione.mp3', vittoria: 'vittoria.mp3' }
const VO = { goal: 'gol.mp3', save: 'parata.mp3', miss: 'fuori.mp3', post: 'palo.mp3', crossbar: 'traversa.mp3', corner: 'incrocio.mp3' }
const MAX_VOICES = 8
export function createAudio(ASSETS, settings) {
  let ctx = null, master = null, sfxGain = null, musicGain = null, voGain = null
  const buffers = new Map(), missing = new Set(), voices = []
  let music = null, musicName = null, ducked = false, unlocked = false
  const AC = window.AudioContext || window.webkitAudioContext
  const ensure = () => {
    if (ctx || !AC) return !!ctx
    ctx = new AC()
    master = ctx.createGain(); master.connect(ctx.destination)
    sfxGain = ctx.createGain(); sfxGain.connect(master)
    musicGain = ctx.createGain(); musicGain.connect(master)
    voGain = ctx.createGain(); voGain.connect(master)
    apply()
    return true
  }
  const apply = () => {
    if (!ctx) return
    sfxGain.gain.value = settings.audio === false ? 0 : 0.9
    voGain.gain.value = settings.audio === false ? 0 : 1
    musicGain.gain.setTargetAtTime(settings.music === false ? 0 : (ducked ? 0.28 : 0.7), ctx.currentTime, 0.08)
  }
  // Sblocco: da chiamare dentro un gesto utente (iOS). Ritorna una promessa che si risolve quando il contesto gira.
  const unlock = async () => {
    if (!ensure()) return false
    try { if (ctx.state !== 'running') await ctx.resume() } catch { /* niente audio: il gioco va avanti */ }
    unlocked = ctx.state === 'running'
    if (unlocked) preload()
    return unlocked
  }
  const load = async (url) => {
    if (buffers.has(url)) return buffers.get(url)
    if (missing.has(url) || !ctx) return null
    try {
      const r = await fetch(url); if (!r.ok) throw new Error(r.status)
      const b = await ctx.decodeAudioData(await r.arrayBuffer()); buffers.set(url, b); return b
    } catch { missing.add(url); return null }
  }
  const preload = () => { for (const f of Object.values(SFX)) load(ASSETS + 'audio/sfx/' + f) }
  const voice = (src) => { // massimo 8 voci: la più vecchia viene fermata
    voices.push(src); src.onended = () => { const i = voices.indexOf(src); if (i >= 0) voices.splice(i, 1) }
    while (voices.length > MAX_VOICES) { const v = voices.shift(); try { v.stop() } catch { /* già finita */ } }
  }
  const play = async (name, { volume = 1, rate = 1, detune = 0 } = {}) => {
    if (!ctx || !unlocked || settings.audio === false) return
    const b = await load(ASSETS + 'audio/sfx/' + (SFX[name] || name)); if (!b) return
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (1 + (Math.random() - .5) * 0.06); if (detune) s.detune.value = detune
    const g = ctx.createGain(); g.gain.value = volume; s.connect(g); g.connect(sfxGain); s.start(); voice(s)
  }
  // ---- sintesi: fischio, boato, oooh, applausi (nessun file CC0 di folla disponibile senza account) ----
  const noise = (dur) => { const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b }
  const whistle = (long = false) => {
    if (!ctx || !unlocked || settings.audio === false) return
    const t = ctx.currentTime, dur = long ? 0.9 : 0.45
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain()
    o.type = 'square'; o.frequency.value = 2650; o2.type = 'square'; o2.frequency.value = 2650 * 1.02
    lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); g.gain.setValueAtTime(0.16, t + dur - 0.06); g.gain.linearRampToValueAtTime(0, t + dur)
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2700; f.Q.value = 6
    o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxGain)
    o.start(t); o2.start(t); lfo.start(t); o.stop(t + dur); o2.stop(t + dur); lfo.stop(t + dur)
  }
  const crowd = (kind) => { // 'roar' | 'oooh' | 'clap'
    if (!ctx || !unlocked || settings.audio === false) return
    const t = ctx.currentTime
    if (kind === 'clap') {
      for (let i = 0; i < 26; i++) {
        const s = ctx.createBufferSource(); s.buffer = noise(0.03); const g = ctx.createGain(); const at = t + Math.random() * 1.8
        g.gain.setValueAtTime(0.09 * (0.6 + Math.random() * 0.6), at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.05)
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1500; f.Q.value = 1.2
        s.connect(f); f.connect(g); g.connect(sfxGain); s.start(at)
      }
      return
    }
    const dur = kind === 'roar' ? 2.6 : 1.4
    const s = ctx.createBufferSource(); s.buffer = noise(dur + 0.1)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.8
    const g = ctx.createGain()
    if (kind === 'roar') { f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1400, t + 0.5); f.frequency.linearRampToValueAtTime(600, t + dur); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.42, t + 0.25); g.gain.setValueAtTime(0.42, t + 1.2); g.gain.exponentialRampToValueAtTime(0.001, t + dur) }
    else { f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(300, t + dur); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.12); g.gain.exponentialRampToValueAtTime(0.001, t + dur) }
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + 0.1)
  }
  // ---- musica: file forniti dall'utente, assenti = silenzio ----
  const playMusic = async (name, { loop = true } = {}) => {
    if (!ctx || !unlocked || !MUSIC[name]) return
    if (musicName === name && music) return
    stopMusic(); musicName = name // prenotazione: se nel frattempo viene chiesta un'altra traccia, questa non parte
    const b = await load(ASSETS + 'audio/music/' + MUSIC[name]); if (!b) { if (musicName === name) musicName = null; if (!missing.has('log:' + name)) { missing.add('log:' + name); console.info(`[rigori] musica "${name}" assente: silenzio (DA VERIFICARE)`) } return }
    if (musicName !== name) return
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = loop; s.connect(musicGain); s.start(); music = s; musicName = name
    s.onended = () => { if (music === s) { music = null; musicName = null } }
  }
  const stopMusic = () => { if (music) { try { music.stop() } catch { /* già ferma */ } } music = null; musicName = null }
  const duck = (on) => { ducked = !!on; apply() }
  // ---- telecronaca opzionale: se il file c'è si riproduce, altrimenti niente ----
  const vo = async (key) => {
    if (!ctx || !unlocked || settings.audio === false || !VO[key]) return
    const b = await load(ASSETS + 'audio/vo/' + VO[key]); if (!b) return
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(voGain); s.start()
  }
  const vibrate = (pattern) => { if (settings.vibration !== false && navigator.vibrate) { try { navigator.vibrate(pattern) } catch { /* non supportato */ } } }
  return { unlock, play, whistle, crowd, playMusic, stopMusic, duck, vo, vibrate, apply, get unlocked() { return unlocked }, get ducked() { return ducked }, get context() { return ctx } }
}
