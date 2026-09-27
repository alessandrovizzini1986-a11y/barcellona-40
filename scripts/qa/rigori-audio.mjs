// QA audio: "Tocca per iniziare" sblocca l'AudioContext e il tocco sul volto in "Chi tira?" lo trova (o lo
// rimette) in esecuzione; in Sfida Ale con la musica OFF gli effetti suonano lo stesso (fischio, calcio, impatto,
// boato o "ooh") e si misura quanto forte; il video condiviso ha una traccia audio (letta dai metadati del file);
// l'altoparlante nell'HUD accende e spegne la musica in un tocco.
//   node scripts/qa/rigori-audio.mjs [url]
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errors = [], infos = []
const ok = (n, c, x = '') => { console.log((c ? '✓ ' : '✗ ') + n + (x ? ` (${x})` : '')); if (!c) errors.push(n) }
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); if (m.type() === 'info') infos.push(m.text()) })
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true'); localStorage.removeItem('b40:v1:rigori:settings') } catch {} })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 }); await p.waitForTimeout(400)
await p.screenshot({ path: 'docs/rigori/screenshots/f10-tocca.png' })
await p.click('.rg-loading__tap', { force: true }); await p.waitForTimeout(800)
const a = await p.evaluate(() => ({ unlocked: window.__rigori.audio.unlocked, state: window.__rigori.audio.context?.state, music: window.__rigori.settings.music, sfx: window.__rigori.audio.sfxGain }))
console.log('sblocco audio:', JSON.stringify(a))
ok('audio sbloccato al primo tap', a.unlocked && a.state === 'running')
ok('musica OFF di default, effetti al 70 % (0,63)', a.music === false && Math.abs(a.sfx - 0.63) < 1e-6, `music ${a.music} sfx ${a.sfx}`)

// Strumentazione: si registra CHI suona e QUANDO (play/whistle/crowd/sting), e un misuratore di picco sul master
await p.evaluate(() => {
  const A = window.__rigori.audio; window.__suoni = []
  const t0 = performance.now(); const nota = (k, x) => window.__suoni.push({ k, x, t: Math.round(performance.now() - t0) })
  for (const m of ['play', 'whistle', 'crowd', 'sting']) { const f = A[m]; A[m] = (...args) => { nota(m, String(args[0] ?? '')); return f(...args) } }
  const c = A.context, sp = c.createScriptProcessor(4096, 1, 1); window.__picco = { attuale: 0, fasi: {} }; window.__fase = 'menu'
  sp.onaudioprocess = (e) => { const d = e.inputBuffer.getChannelData(0); let m = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > m) m = v } const f = window.__fase; window.__picco.fasi[f] = Math.max(window.__picco.fasi[f] || 0, m) }
  A.masterNode.connect(sp); sp.connect(c.destination)
})
const dB = (v) => v > 0 ? (20 * Math.log10(v)).toFixed(1) + ' dBFS' : 'silenzio'

// Il contesto viene sospeso (come fa iOS dopo una chiamata): il tocco sul volto lo deve rimettere in moto
await p.waitForFunction(() => window.__rigori.flow() === 'chiTira')
await p.evaluate(() => window.__rigori.audio.context.suspend())
ok('contesto sospeso per la prova', await p.evaluate(() => window.__rigori.audio.context.state) === 'suspended')
await p.click('.rg-card[data-value="monne"]')
await p.waitForFunction(() => window.__rigori.flow() === 'modalita'); await p.waitForTimeout(300)
ok('il tocco sul volto in "Chi tira?" rimette in esecuzione l\'AudioContext', await p.evaluate(() => window.__rigori.audio.context.state) === 'running')
await p.click('.rg-mode[data-value="sfidaAle"]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco'); await p.waitForTimeout(600)
const primaDelTiro = await p.evaluate(() => window.__suoni.map((s) => s.k + ':' + s.x))
ok('fischio all\'inizio del turno, con la musica OFF', primaDelTiro.includes('whistle:'), primaDelTiro.join(' '))
ok('nessuna musica in partita con la musica OFF', await p.evaluate(() => window.__rigori.audio.musicName) === null)
await p.evaluate(() => { window.__fase = 'fischio'; window.__rigori.audio.whistle() }); await p.waitForTimeout(700)

// Tiro: gol all'incrocio (Ale forzato dall'altra parte non serve: precisione 0 e mira all'angolo alto)
await p.evaluate(() => { window.__suoni.length = 0; window.__fase = 'tiro'; window.__rigori.setPrecision(0); window.__rigori.fire({ x: 1.85, y: 1.5, power: 1.0, curve: 0 }, true, 0.5) })
await p.waitForFunction(() => window.__rigori.lastResult() != null, null, { timeout: 90000 })
await p.evaluate(() => { window.__fase = 'esito' })
const esito = await p.evaluate(() => window.__rigori.lastResult())
const ducked = await p.evaluate(() => window.__rigori.audio.ducked)
await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'replayEnd'), null, { timeout: 90000 })
await p.waitForTimeout(1500)
const suoni = await p.evaluate(() => window.__suoni)
const seq = suoni.map((s) => `${s.t}ms ${s.k}${s.x ? ':' + s.x : ''}`).join(' · ')
console.log('esito:', esito, '· ducking durante esito:', ducked, '\n  sequenza:', seq)
const nomi = suoni.map((s) => s.k + ':' + s.x)
ok('al calcio suona il colpo sul pallone', nomi.some((n) => /^play:kick/.test(n)))
ok('all\'impatto suona la rete (gol) o il guanto (parata)', nomi.includes('play:net') || nomi.includes('play:glove'), esito)
ok('il pubblico reagisce: boato al gol o "ooh" alla parata', nomi.includes('crowd:roar') || nomi.includes('crowd:oooh'))
ok('gli applausi arrivano dopo il boato (solo se gol)', esito !== 'goal' || nomi.includes('crowd:clap'))
ok('il suono del tuffo suona una volta sola per tiro, non a ogni frame del replay', nomi.filter((n) => n === 'play:dive').length === 1, `${nomi.filter((n) => n === 'play:dive').length} volte`)
ok('gli stinger musicali NON partono con la musica OFF', await p.evaluate(() => window.__rigori.audio.stingati.length) === 0)
const picchi = await p.evaluate(() => window.__picco.fasi)
console.log('  picchi sul master:', Object.entries(picchi).map(([k, v]) => `${k} ${dB(v)}`).join(' · '))
ok('il fischio da solo supera i -20 dBFS', (picchi.fischio || 0) > 0.1, dB(picchi.fischio || 0))
ok('calcio e impatto superano i -12 dBFS', (picchi.tiro || 0) > 0.25, dB(picchi.tiro || 0))
console.log('ducking dopo replay:', await p.evaluate(() => window.__rigori.audio.ducked))

// Video con audio: si registra a richiesta e si leggono i metadati del file
const video = await p.evaluate(async () => {
  window.__suoni.length = 0; window.__fase = 'video'
  const f = await window.__rigori.registraVideo()
  if (!f) return { file: null, nonDisponibile: window.__rigori.videoNonDisponibile }
  const bytes = new Uint8Array(await f.slice(0, 262144).arrayBuffer())
  const testo = new TextDecoder('latin1').decode(bytes)
  return { file: { nome: f.name, tipo: f.type, size: f.size }, codecAudio: (testo.match(/A_OPUS|A_VORBIS|A_AAC|A_MPEG/) || [null])[0], codecVideo: (testo.match(/V_VP9|V_VP8|V_AV1|avc1/) || [null])[0], mp4soun: testo.includes('soun'), suoni: window.__suoni.map((s) => s.k + ':' + s.x) }
})
console.log('video:', JSON.stringify(video))
ok('il video viene prodotto', !!video.file, JSON.stringify(video))
ok('il file ha una traccia audio nei metadati', !!(video.codecAudio || video.mp4soun), String(video.codecAudio))
ok('mentre si registra si rifanno fischio, calcio, impatto e pubblico', video.suoni?.includes('whistle:') && video.suoni?.some((n) => /^play:kick/.test(n)) && (video.suoni?.includes('play:net') || video.suoni?.includes('play:glove')) && video.suoni?.some((n) => /^crowd:/.test(n)), (video.suoni || []).join(' '))
ok('senza audio la voce "Video" sparirebbe dal risultato', !video.nonDisponibile)

// Altoparlante nell'HUD: musica ON in un tocco (parte "tensione"), OFF al secondo
const hud = await p.evaluate(() => { const m = document.querySelector('.rg-musicbtn'), r = m.getBoundingClientRect(), h = document.querySelector('.rg-modehud').getBoundingClientRect(); return { visibile: !m.hidden, w: r.width, h: r.height, pressed: m.getAttribute('aria-pressed'), hudRight: h.right, btnLeft: r.left } })
ok('altoparlante visibile in gioco, 48 px, musica spenta', hud.visibile && hud.w >= 44 && hud.h >= 44 && hud.pressed === 'false', JSON.stringify(hud))
ok('l\'HUD del punteggio non finisce sotto l\'altoparlante', hud.hudRight <= hud.btnLeft + 1, `${hud.hudRight} vs ${hud.btnLeft}`)
await p.click('.rg-musicbtn')
await p.waitForFunction(() => window.__rigori.audio.musicName === 'tensione', null, { timeout: 30000 }).catch(() => {})
const on = await p.evaluate(() => ({ music: window.__rigori.settings.music, nome: window.__rigori.audio.musicName, pressed: document.querySelector('.rg-musicbtn').getAttribute('aria-pressed'), salvato: JSON.parse(localStorage.getItem('b40:v1:rigori:settings') || '{}').music }))
ok('un tocco: musica accesa, parte subito "tensione", scelta salvata', on.music === true && on.nome === 'tensione' && on.pressed === 'true' && on.salvato === true, JSON.stringify(on))
await p.click('.rg-musicbtn'); await p.waitForTimeout(300)
const off = await p.evaluate(() => ({ music: window.__rigori.settings.music, nome: window.__rigori.audio.musicName, pressed: document.querySelector('.rg-musicbtn').getAttribute('aria-pressed') }))
ok('secondo tocco: musica spenta e ferma', off.music === false && off.nome === null && off.pressed === 'false', JSON.stringify(off))
console.log('musica:', infos.filter((t) => /musica/.test(t)).join(' | ') || 'nessun avviso')
await b.close(); if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1) } console.log('OK audio')
