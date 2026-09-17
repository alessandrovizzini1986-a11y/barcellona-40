// QA musica: le tracce esistono e partono, i loop non lasciano buchi, gli stinger suonano sopra la
// tensione mentre la musica è abbassata, e un giro di shootout non lascia silenzi né sovrapposizioni.
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:5173/rigori/?q=bassa'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage(); const errori = [], check = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) errori.push(msg) }
p.on('pageerror', (e) => errori.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()); if (m.type() === 'info' && /assente/.test(m.text())) errori.push('traccia mancante: ' + m.text()) })
await p.addInitScript(() => { try { localStorage.setItem('b40:v1:rigori:onboarded', 'true') } catch {} })
await p.goto(url, { waitUntil: 'load' })
await p.waitForFunction(() => window.__rigori?.ready, null, { timeout: 60000 })
await p.click('.rg-loading__tap', { force: true }); await p.waitForTimeout(500)
check(await p.evaluate(() => window.__rigori.audio.unlocked), 'audio sbloccato al primo tocco')
// menu: inno
await p.waitForFunction(() => window.__rigori.flow() === 'chiTira', null, { timeout: 30000 })
await p.waitForFunction(() => window.__rigori.audio.musicName === 'inno', null, { timeout: 30000 }).catch(() => {})
check(await p.evaluate(() => window.__rigori.audio.musicName) === 'inno', 'al menu suona inno')
const durate = await p.evaluate(async () => {
  const A = window.__rigori.audio, base = window.__rigori.game.ASSETS + 'audio/music/'
  const out = {}
  for (const f of ['inno.mp3', 'tensione.mp3', 'gol.mp3', 'parata.mp3', 'vittoria.mp3']) {
    const r = await fetch(base + f); const buf = await A.context.decodeAudioData(await r.arrayBuffer())
    const d = buf.getChannelData(0); let a = 0, z = d.length - 1
    while (a < d.length && Math.abs(d[a]) < 0.0015) a++
    while (z > a && Math.abs(d[z]) < 0.0015) z--
    out[f] = { durata: +buf.duration.toFixed(2), silenzioTesta: +(a / buf.sampleRate).toFixed(3), silenzioCoda: +((buf.length - z) / buf.sampleRate).toFixed(3) }
  }
  return out
})
console.log('  tracce:', JSON.stringify(durate))
check(durate['inno.mp3'].durata > 45 && durate['inno.mp3'].durata < 120, 'inno fra 45 e 120 s: ' + durate['inno.mp3'].durata)
check(durate['tensione.mp3'].durata >= 15 && durate['tensione.mp3'].durata <= 40, 'tensione fra 15 e 40 s: ' + durate['tensione.mp3'].durata)
check(Object.values(durate).every((d) => d.silenzioTesta < 0.06), 'nessuna traccia inizia con un buco di silenzio')
// partita: tensione + stinger sopra, con ducking
await p.click('.rg-card[data-value="monne"]'); await p.waitForFunction(() => window.__rigori.flow() === 'modalita')
await p.click('.rg-mode[data-value="shootout"]'); await p.waitForFunction(() => window.__rigori.flow() === 'gioco'); await p.waitForTimeout(800)
check(await p.evaluate(() => window.__rigori.audio.musicName) === 'tensione', 'in partita suona tensione')
const prima = await p.evaluate(() => window.__rigori.audio.musicGain)
await p.evaluate(() => { window.__rigori.setPrecision(0); window.__rigori.fire({ x: 1.6, y: 1.0, power: 0.85, curve: 0 }, true, 0.5) })
await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'result'), null, { timeout: 60000 })
await p.waitForTimeout(300)
const dopo = await p.evaluate(() => ({ gain: window.__rigori.audio.musicGain, ducked: window.__rigori.audio.ducked, stingati: window.__rigori.audio.stingati.map((s) => s.name), music: window.__rigori.audio.musicName, esito: window.__rigori.record().outcome }))
console.log(`  volume musica ${prima.toFixed(2)} → ${dopo.gain.toFixed(2)} · stinger ${JSON.stringify(dopo.stingati)} · esito ${dopo.esito}`)
check(dopo.ducked && dopo.gain < prima, 'la musica si abbassa durante l\'esito')
check(dopo.music === 'tensione', 'il loop di tensione continua sotto lo stinger (nessuna interruzione)')
check(dopo.stingati.includes(dopo.esito === 'goal' ? 'gol' : 'parata'), 'stinger coerente con l\'esito: ' + JSON.stringify(dopo.stingati))
// dopo il replay la musica torna su e resta
await p.waitForFunction(() => window.__rigori.events.some((e) => e.type === 'replayEnd'), null, { timeout: 90000 })
await p.waitForTimeout(500)
const fine = await p.evaluate(() => ({ gain: window.__rigori.audio.musicGain, music: window.__rigori.audio.musicName }))
check(fine.gain > dopo.gain, 'finito il replay la musica torna al volume pieno: ' + fine.gain.toFixed(2))
check(fine.music === 'tensione', 'nessun buco di musica dopo il replay')
await b.close(); if (errori.length) { console.error('ERRORI:\n' + errori.join('\n')); process.exit(1) } console.log('OK musica')
