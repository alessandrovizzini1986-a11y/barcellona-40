// Prepara la musica del gioco da sorgenti CC0, in modo ripetibile: scarica, taglia, normalizza, codifica.
//   node scripts/audio/musica.mjs
// Le scelte e le alternative scartate sono documentate in DA_VERIFICARE.md, le attribuzioni in CREDITS.md.
import { spawnSync } from 'node:child_process'
import { mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'
import { analizza } from './analizza.mjs'

const TMP = process.env.MUSICA_TMP || '/tmp/musica-rigori'
const OUT = 'public/assets/rigori/audio/music'
const LOUDNORM = 'loudnorm=I=-14:TP=-1.5:LRA=11' // -14 LUFS: stessa resa degli effetti, senza schiacciare la dinamica

// Sorgenti scelte (tutte CC0). Gli scarti e il perché sono in DA_VERIFICARE.md.
const SORGENTI = {
  inno: { url: 'https://opengameart.org/sites/default/files/cynicbattleloop_0.ogg', file: 'cynic.ogg', autore: 'Ferk', titolo: 'Cynic Battle Loop', pagina: 'https://opengameart.org/content/cynic-battle-loop' },
  tensione: { url: 'https://opengameart.org/sites/default/files/caverns.ogg', file: 'caverns.ogg', autore: 'congusbongus', titolo: 'Ancient caverns (horror ambient loop)', pagina: 'https://opengameart.org/content/ancient-caverns-horror-ambient-loop' },
  kenney: { url: 'https://kenney.nl/media/pages/assets/music-jingles/f37e530b9e-1677590399/kenney_music-jingles.zip', file: 'kenney_music-jingles.zip', autore: 'Kenney Vleugels', titolo: 'Music Jingles', pagina: 'https://kenney.nl/assets/music-jingles' }
}
// Stinger dal pack Kenney (nessun jingle del pack supera 1,8 s: vedi DA_VERIFICARE.md)
const STINGER = {
  gol: 'Steel jingles/jingles_STEEL07.ogg',        // il più lungo e brillante del pack, timbro festoso
  parata: 'Steel jingles/jingles_STEEL03.ogg',     // stesso timbro, andamento discendente: delusione
  vittoria: 'Pizzicato jingles/jingles_PIZZI07.ogg' // l'unico con andamento ascendente sopra il secondo
}
const sh = (args, etichetta, stdin = undefined) => {
  // -filter_threads 1: il grafo a thread di ffmpeg 7 a volte non produce alcun frame con catene come
  // acrossfade o loudnorm. In monothread la resa è identica e il risultato è ripetibile.
  const r = spawnSync(ffmpeg, ['-y', '-v', 'error', '-filter_threads', '1', ...args], { encoding: 'utf8', input: stdin, maxBuffer: 1 << 30 })
  if (r.status !== 0) { console.error(`${etichetta} fallito:\n${r.stderr}`); process.exit(1) }
  if (r.stderr?.trim()) console.error(`${etichetta}: ${r.stderr.trim().split('\n')[0]}`)
  // ffmpeg può uscire con 0 e lasciare un file vuoto: meglio accorgersene qui che in produzione
  const dest = args[args.length - 1]
  if (!existsSync(dest) || statSync(dest).size < 4000) { console.error(`${etichetta}: prodotto un file vuoto o troncato (${dest})`); process.exit(1) }
}
const scarica = (url, dest) => {
  if (existsSync(dest) && statSync(dest).size > 1000) return dest
  const r = spawnSync('curl', ['-sL', '--max-time', '300', '-o', dest, url], { encoding: 'utf8' })
  if (r.status !== 0 || !existsSync(dest)) { console.error('download fallito: ' + url); process.exit(1) }
  return dest
}

mkdirSync(TMP, { recursive: true }); mkdirSync(OUT, { recursive: true })

// --- inno: loop del menu, già pensato come loop (giunzione 0,4 dB) ---
const inno = scarica(SORGENTI.inno.url, path.join(TMP, SORGENTI.inno.file))
sh(['-i', inno, '-af', LOUDNORM, '-ac', '2', '-ar', '44100', '-b:a', '96k', path.join(OUT, 'inno.mp3')], 'inno')

// --- tensione: dal loop ambient si ricava un anello di 28 s con dissolvenza incrociata di 1,5 s ---
// Si prende [10, 38] e vi si incrocia sopra la testa [10, 11.5]: la coda del risultato è identica alla sua
// testa, quindi il loop si richiude senza scalino anche dopo il taglio.
const tens = scarica(SORGENTI.tensione.url, path.join(TMP, SORGENTI.tensione.file))
// La dissolvenza incrociata la calcolo qui campione per campione invece di usare il filtro acrossfade:
// in ffmpeg 7 quel filtro a volte esce con successo senza aver prodotto un solo frame, e il risultato
// dipende dall'esecuzione. Questo è deterministico.
const SR = 44100, D = Math.round(1.5 * SR)
const pcm = (args) => {
  const r = spawnSync(ffmpeg, ['-v', 'quiet', ...args, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
  if (!r.stdout?.length) { console.error('decodifica fallita: ' + args.join(' ')); process.exit(1) }
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4))
}
const corpo = pcm(['-i', tens, '-ss', '10', '-to', '38'])
const testa = pcm(['-i', tens, '-ss', '10', '-to', '11.5'])
const anello = Float32Array.from(corpo)
for (let i = 0; i < D; i++) {
  const k = i / D, dentro = anello.length - D * 2 + i * 2 // due canali interlacciati
  anello[dentro] = anello[dentro] * (1 - k) + (testa[i * 2] || 0) * k
  anello[dentro + 1] = anello[dentro + 1] * (1 - k) + (testa[i * 2 + 1] || 0) * k
}
sh(['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', 'pipe:0', '-af', LOUDNORM, '-ac', '2', '-ar', '44100', '-b:a', '96k', path.join(OUT, 'tensione.mp3')], 'tensione', Buffer.from(anello.buffer, anello.byteOffset, anello.byteLength))

// --- stinger: dal pack Kenney, silenzio in coda tagliato ---
const zip = scarica(SORGENTI.kenney.url, path.join(TMP, SORGENTI.kenney.file))
spawnSync('unzip', ['-q', '-o', zip, '-d', path.join(TMP, 'kenney')])
for (const [nome, rel] of Object.entries(STINGER)) {
  const src = path.join(TMP, 'kenney', 'Audio', rel)
  if (!existsSync(src)) { console.error('jingle mancante: ' + src); process.exit(1) }
  sh(['-i', src, '-af', `silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB:stop_duration=0.1,${LOUDNORM}`,
    '-ac', '2', '-ar', '44100', '-b:a', '128k', path.join(OUT, nome + '.mp3')], 'stinger ' + nome)
}

console.log('--- prodotto in ' + OUT)
for (const f of ['inno.mp3', 'tensione.mp3', 'gol.mp3', 'parata.mp3', 'vittoria.mp3']) {
  const p = path.join(OUT, f)
  const a = analizza(p)
  console.log(`${f.padEnd(14)} ${String(Math.round(statSync(p).size / 1024)).padStart(5)} kB · ${String(a.dur).padStart(6)}s · rms ${String(a.rms_db).padStart(6)} dB · picco ${String(a.picco_db).padStart(5)} dB · giunzione ${a.stacco_loop_db} dB`)
}
