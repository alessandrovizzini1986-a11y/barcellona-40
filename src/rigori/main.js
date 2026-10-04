// Bootstrap: loading screen con progresso reale, scena, loop, degradazione automatica.
import './styles/rigori.css'
import * as THREE from 'three'
import { createRenderer } from './core/renderer.js'
import { createCameraRig } from './core/camera.js'
import { createPerf } from './core/perf.js'
import { createField } from './scene/field.js'
import { createStadium } from './scene/stadium.js'
import { createCrowd } from './scene/crowd.js'
import { createGoal, GOAL, DISCHETTO } from './scene/net.js'
import { createLights } from './scene/lights.js'
import { createPostFx } from './scene/postfx.js'
import { createBall } from './game/ball.js'
import { createInput } from './core/input.js'
import { createShot, aimFromGesture, renderShotAt } from './game/shot.js'
import { createTiming } from './game/timing.js'
import { createGhost } from './game/ghost.js'
import { loadCharacterKit, makeCharacter } from './scene/players.js'
import { createAudio } from './core/audio.js'
import { createProgress } from './game/progress.js'
import { taunt, gruppoPerEsito } from './data/taunts.js'
import { createKeeper, DIVE_DUR } from './game/keeper.js'
import { catturaImmagine, condividiFile, linkWhatsApp, tipoVideoSupportato, registraReplay } from './core/condividi.js'
import { createJuice } from './game/juice.js'
import { createShootout } from './game/modes/shootout.js'
import { createSfidaAle } from './game/modes/sfidaAle.js'
import { createPassAndPlay } from './game/modes/passAndPlay.js'
import { createSkill } from './game/modes/skill.js'
import { cpuAim, MIRE, XP } from './game/modes/base.js'
import { zoneOf, zoneCenter } from './game/keeper.js'
import { pickZone, handoff } from './ui/screens/passaggio.js'
import { chiTira } from './ui/screens/chiTira.js'
import { modalita, MODES_INFO } from './ui/screens/modalita.js'
import { showEsito, hideEsito } from './ui/screens/esito.js'
import { risultato } from './ui/screens/risultato.js'
import { opzioni } from './ui/screens/opzioni.js'
import { sblocchi } from './ui/screens/sblocchi.js'
import { onboarding } from './ui/screens/onboarding.js'
import { classifica } from './ui/screens/classifica.js'
import { overlay } from './ui/screens/overlay.js'
import { toast } from './ui/components/toast.js'
import { save } from './core/save.js'
import { keeper as keeperData, faceOf, byId } from './data/players.js'
import { createKicker, KICK_DELAY } from './game/kicker.js'
import { SITO } from './ui/sito.js'
import { big as confettiBig } from '../ui/confetti.js' // gli stessi coriandoli del sito, caricati solo quando servono

const root = document.getElementById('game')
const ASSETS = import.meta.env.BASE_URL.replace(/\/$/, '') + '/assets/rigori/'
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- loading screen ----------
const TIPS = ['Trascina dal pallone: direzione, forza e curva in un gesto solo.', 'Rilascia quando la barra è al centro: il portiere si sbilancia la metà.', 'Ale legge il corpo del tiratore. Fintalo.', 'La traversa è a 2,44 m. La potenza la cerca.']
root.innerHTML = `<div class="rg-loading" id="rg-loading" role="status" aria-live="polite">
  <div class="rg-loading__title">Rigori <b>al Camp Nou</b></div>
  <div class="rg-loading__bar"><i id="rg-loading-fill"></i></div>
  <div class="rg-loading__pct" id="rg-loading-pct">0%</div>
  <p class="rg-loading__tip">${TIPS[(Math.random() * TIPS.length) | 0]}</p>
  <button class="rg-btn rg-btn--primary rg-loading__tap" hidden aria-label="Tocca per iniziare">Tocca per iniziare</button>
</div>
<div class="rg-stage" id="rg-stage"></div>
<div class="rg-vignette" aria-hidden="true"></div>
<div class="rg-ui" id="rg-ui"></div>`
const stage = document.getElementById('rg-stage')
const manager = new THREE.LoadingManager()
const fill = document.getElementById('rg-loading-fill'), pct = document.getElementById('rg-loading-pct')
manager.onProgress = (_u, loaded, total) => { const f = total ? loaded / total : 1; fill.style.transform = `scaleX(${f})`; pct.textContent = Math.round(f * 100) + '%' }

// ---------- scena ----------
const R = createRenderer(stage)
const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x0E1116, 0.018) // la profondità arriva da qui (direzione visiva)
const rig = createCameraRig(R.size.w / R.size.h)
const stadium = createStadium(); scene.add(stadium.group)
const lights = createLights({ towerPositions: stadium.lightPos, aim: stadium.aim }); scene.add(lights.group)
const field = createField(); scene.add(field)
const crowd = createCrowd(reducedMotion ? 3200 : 6400); scene.add(crowd.mesh); scene.add(crowd.phones)
const goal = createGoal(); scene.add(goal.group)
const ballTex = new THREE.TextureLoader(manager).load(ASSETS + 'textures/ball.png'); ballTex.colorSpace = THREE.SRGBColorSpace
const ball = createBall(ballTex); scene.add(ball.mesh); scene.add(ball.shadow)
const fx = createPostFx(R.renderer, scene, rig.camera, R.size)

// Qualità: auto (degrada da sola), bassa, alta · DA VERIFICARE: soglie da provare su telefono vero
const quality = { bloom: !reducedMotion, shadows: true, particles: true, crowd: 1 }
const cssVignette = document.querySelector('.rg-vignette')
const applyQuality = () => { goal.setQualita?.(quality.particles ? 1 : 0.5); fx.setEnabled(quality.bloom); cssVignette.hidden = fx.enabled /* la vignettatura la fa lo shader; in fallback resta quella CSS */; R.setShadows(quality.shadows); lights.setShadows(quality.shadows); crowd.setDensity(quality.crowd) }
const perf = createPerf({
  onDegrade: (step) => { if (step === 'bloom') quality.bloom = false; if (step === 'shadows') quality.shadows = false; if (step === 'particles') quality.particles = false; if (step === 'crowd') quality.crowd = 0.5; applyQuality() },
  onRestore: (step) => { if (step === 'crowd') quality.crowd = 1; if (step === 'particles') quality.particles = true; if (step === 'shadows') quality.shadows = true; if (step === 'bloom') quality.bloom = !reducedMotion; applyQuality() }
})
applyQuality()
let timingEnabled = true               // opzione (fase 9); ON di default
// Opzione "riduci flash e shake" (fase 9) + prefers-reduced-motion: niente shake né particelle intense
// Musica e vibrazione OFF di default: al tavolo del ristorante il telefono non deve urlare. Si accendono in Opzioni.
const settings = Object.assign({ audio: true, music: false, vibration: false, reduceFx: reducedMotion, timing: true, quality: 'auto', skipReplay: save.get('skipReplay', false) }, save.get('settings', {}))
const qOverride = new URLSearchParams(location.search).get('q') // QA: ?q=alta|bassa|auto, solo per questa visita (non viene salvato)
const audio = createAudio(ASSETS, settings)
function applySettings() {
  audio.apply()
  timingEnabled = settings.timing !== false
  const q = qOverride || settings.quality
  perf.lock(q !== 'auto')
  if (q === 'bassa') { quality.bloom = false; quality.shadows = false; quality.particles = false; quality.crowd = 0.5 }
  else if (q === 'alta') { quality.bloom = !reducedMotion; quality.shadows = true; quality.particles = true; quality.crowd = 1 }
  applyQuality()
  save.set('settings', settings)
  save.set('skipReplay', !!settings.skipReplay) // chiave sua, come chiesto: b40:v1:rigori:skipReplay
}
applySettings()

const onResize = () => { R.resize(); rig.setAspect(R.size.w / R.size.h); fx.resize(R.size.w, R.size.h) }
window.addEventListener('resize', onResize); onResize()

// ---------- loop ----------
const timer = new THREE.Timer()
let timeScale = 1, frames = 0
const systems = [] // moduli con update(dt) aggiunti dalle fasi successive
// Pausa di sistema: quando lo schermo si spegne o si cambia app, il loop si ferma e l'audio si sospende;
// al ritorno il timer riparte da zero (niente salto di tempo) e tutto riprende dove era.
let rafId = 0, inPausa = false
function loop() {
  if (inPausa) return
  rafId = requestAnimationFrame(loop)
  timer.update()
  const raw = Math.min(timer.getDelta(), 0.05)
  const dt = raw * timeScale
  perf.tick(raw)
  crowd.update(dt); goal.update(raw); ball.update(dt); rig.update(raw) // la rete va a tempo reale: nei replay il tempo di gioco è fermo, ma il tessuto deve muoversi
  for (const s of systems) s.update(dt, raw)
  fx.render(); frames++
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { inPausa = true; cancelAnimationFrame(rafId); audio.sospendi() }
  else if (inPausa) { inPausa = false; timer.update(); audio.riprendi(); cancelAnimationFrame(rafId); rafId = requestAnimationFrame(loop) }
})

// ---------- tiro: input → mira → volo → esito ----------
const timing = createTiming()
const juice = createJuice({ scene, rig, reduced: () => settings.reduceFx })
const ghost = createGhost(scene)
const events = []                      // ultimi eventi del tiro (per QA e per le modalità)
const listeners = new Set()            // le modalità si iscrivono qui (fase 7)
listeners.add((e) => { if (e.type === 'replayEnd' || e.type === 'modeStart' || e.type === 'modeEnd' || e.type === 'xp' || e.type === 'tell') events.push(e) }) // QA: anche gli eventi non del tiro finiscono nel registro
const shot = createShot({ ball, goal, keeper: null, onEvent: (e) => { events.push(e); listeners.forEach((f) => f(e)); onShotEvent(e) } })
// Personaggi: kit caricato attraverso il manager (progresso reale), portiere sulla linea
// Due personaggi: Ale (portiere di casa) e il tiratore scelto. Nel ruolo portiere si scambiano:
// Ale va sul dischetto e il tiratore scelto va in porta.
let kit = null, keeper = null, kicker = null, shooterId = 'monne' // DA VERIFICARE: tiratore di partenza
const chars = {}, controllers = {}
const charFor = (p) => {
  if (chars[p.id]) return chars[p.id]
  chars[p.id] = makeCharacter(kit, { maglia: p.maglia, numero: p.numero, faceUrl: ASSETS + faceOf(p), glove: p.ruolo === 'portiere', manager })
  return chars[p.id]
}
function setPair(keeperP, kickerP) {
  for (const c of Object.values(chars)) scene.remove(c.group)
  const kc = charFor(keeperP), sc = charFor(kickerP)
  const kKey = 'keeper:' + keeperP.id, sKey = 'kicker:' + kickerP.id
  controllers[kKey] = controllers[kKey] || createKeeper(kc, { difficulty: keeper?.difficulty || 'normale', onDive: (_z, at) => { juice.dust(at); audio.play('dive', { volume: .6 }) } })
  controllers[sKey] = controllers[sKey] || createKicker(sc)
  keeper = controllers[kKey]; kicker = controllers[sKey]
  keeper.setDifficulty(difficulty); keeper.reset(); kicker.reset(); if (game.progress) applyEquip()
  // Lo stesso personaggio passa da tiratore a portiere e viceversa: il portiere torna sulla linea, rivolto al dischetto
  kc.group.position.set(0, 0, 0.55); kc.group.rotation.set(0, 0, 0); kc.model.scale.x = 1
  scene.add(kc.group); scene.add(sc.group)
  shot.setKeeper(keeper); game.keeper = keeper; game.kicker = kicker
}
const kitReady = loadCharacterKit(ASSETS, manager).then((k) => {
  kit = k; game.kit = kit
  setPair(keeperData(), byId(shooterId))
  systems.push({ update: (dt) => { keeper?.update(dt); kicker?.update(dt) } }) // dopo il sistema del tiro: applica al mixer la posa imposta dal record
}).catch((err) => { console.error('Personaggi non caricati:', err); game.loadError = String(err) })
// Cambio tiratore (schermata CHI TIRA?, fase 9)
function setShooter(id) { if (!byId(id) || !kit) return; shooterId = id; if (role === 'keeper') setPair(byId(shooterId), keeperData()); else setPair(keeperData(), byId(shooterId)) }
const hud = document.createElement('div'); hud.className = 'rg-hud'; hud.innerHTML = `
  <div class="rg-timing" id="rg-timing" hidden aria-hidden="true"><span class="rg-timing__label">Tempismo</span><span class="rg-timing__track"><i class="rg-timing__win"></i><b class="rg-timing__cur"></b></span><span class="rg-timing__ok">+ PRECISIONE</span></div>
  <div class="rg-hint" id="rg-hint">Trascina dal pallone</div>`
document.getElementById('rg-ui').appendChild(hud)
const timingEl = document.getElementById('rg-timing'), timingCur = timingEl.querySelector('.rg-timing__cur'), hint = document.getElementById('rg-hint')
// Chiusura della barra del tempismo: se il rilascio è dentro la zona la barra lampeggia e dice "+ PRECISIONE",
// e resta a schermo il tempo di farsi leggere; fuori zona sparisce e basta, senza premi di consolazione.
let tTempismo = null
const chiudiTempismo = (perfetto) => {
  clearTimeout(tTempismo); timingEl.classList.remove('rg-timing--ok')
  if (!perfetto) { timingEl.hidden = true; return }
  void timingEl.offsetWidth; timingEl.classList.add('rg-timing--ok')
  tTempismo = setTimeout(() => { timingEl.hidden = true; timingEl.classList.remove('rg-timing--ok') }, 650)
}
// Tiratore: solo a palla ferma. Portiere: anche durante rincorsa e volo (deve reagire al tell), non a esito già deciso
const input = createInput(stage, { camera: rig.camera, getBallWorld: () => ball.mesh.position, size: R.size, enabled: () => window.__rigori.ready && !esitoLock && (input.mode === 'keeper' ? (shot.state === 'idle' || shot.state === 'windup' || shot.state === 'flying') && !shot.resolved : !shot.busy) })
input.on('start', () => { if (timingEnabled && input.mode === 'shooter') { timing.start(); timingEl.hidden = false } hint.hidden = true })
input.on('move', (g) => { if (g.ok && input.mode === 'shooter') ghost.show(aimFromGesture(g, R.size)) })
input.on('end', (g) => {
  ghost.hide(); timing.stop()
  const tempismoOk = timingEnabled && input.mode === 'shooter' && g.ok && timing.perfect
  chiudiTempismo(tempismoOk)
  if (input.mode === 'keeper') {
    // portiere: direzione dello swipe → zona; il tempismo è tutto (troppo presto: la CPU cambia lato)
    if (!g.ok || !keeper) return
    // la camera è dietro la porta e guarda verso il dischetto: la destra dello schermo è x<0 (colonna 0)
    const col = g.dx > 40 ? 0 : g.dx < -40 ? 2 : 1, row = -g.dy > 60 ? 0 : 1
    shot.playerDive(row * 3 + col); hint.hidden = true
    return
  }
  if (!g.ok) { hint.hidden = false; return }
  shot.fire(aimFromGesture(g, R.size), { timingPerfect: tempismoOk, delay: kicker ? KICK_DELAY : 0 })
  kicker?.windup()
})
input.on('reject', () => { hint.hidden = false; hint.classList.remove('rg-hint--pulse'); void hint.offsetWidth; hint.classList.add('rg-hint--pulse') })
const shake = (amp, dur) => { if (!settings.reduceFx) rig.shake(amp, dur) }
let replayPending = false
// Sequenza esito + replay: finché non è finita nessuno fa avanzare il turno. I timer sono tenuti per nome
// così un nuovo tiro non può lasciarne indietro uno che farebbe partire un secondo replay.
let esitoLock = false, tReplay = null, tFinish = null, replayCamUnlock = false
// sequenzaConsumata: la sequenza esito → replay1 → replay2 → turno successivo si chiude UNA volta sola.
// Serve a ignorare i callback che arrivano dopo un salto, così il turno non avanza due volte.
let sequenzaConsumata = false, esitoDa = 0
const clearEsitoTimers = () => { clearTimeout(tReplay); clearTimeout(tFinish); tReplay = tFinish = null }
// QA: traccia della posa a ogni frame disegnato del tiro (live e replay usano la stessa funzione di disegno)
let trace = null
shot.onFrame = (t) => { if (trace) trace.push({ t, ...window.__rigori.pose() }) }
function onShotEvent(e) {
  if (e.type === 'windup') { hint.hidden = true; audio.play('step', { volume: .5 }) }
  if (e.type === 'kick') { clearEsitoTimers(); audio.play(e.aim.power > 0.95 ? 'kick2' : 'kick', { volume: 0.6 + Math.min(0.4, e.aim.power * 0.4) }); hint.hidden = true; replayPending = true; kicker?.onKick(); rig.followLook(ball.mesh) }
  if (e.type === 'result') kicker?.react(e.result)
  if (e.type === 'result') { esitoLock = true; sequenzaConsumata = false; esitoDa = performance.now(); skipBtn.hidden = false; dopoEsito(); keeper?.react(e.result); const rec = shot.record; const sfotto = game.tauntFor(rec); rec.sfotto = sfotto; ultimoTiro = rec; showEsito(game.ui, { outcome: rec.outcome, corner: rec.corner, shooterId: rec.ruoli.tiratore.id, taunt: sfotto }); audio.duck(true); audio.vo(rec.corner ? 'corner' : rec.outcome) }
  if (e.type === 'goal') { crowd.react('ola'); shake(0.10, 0.35); audio.sting('gol'); audio.play('net', { volume: .8 }); audio.crowd('roar'); setTimeout(() => audio.crowd('clap'), 700); audio.vibrate([30, 40, 70]) }
  if (e.type === 'post' || e.type === 'crossbar') { shake(0.06, 0.2); juice.hitStop(60); audio.play(e.type, { volume: .9 }); audio.vibrate(50) }
  if (e.type === 'save') { juice.hitStop(60); crowd.react('oooh'); audio.sting('parata'); audio.play('glove', { volume: .9 }); audio.crowd('oooh'); audio.vibrate(40) }
  if (e.type === 'miss') { crowd.react('oooh'); audio.crowd('oooh') }
  if (e.type === 'settled') { if (game.holdShot) esitoLock = false } // QA: holdShot tiene il record vivo; la sequenza vera parte dall'esito
}
// Dopo l'esito: UN replay solo, dalla laterale, poi si torna dietro al tiratore. Le modalità ascoltano 'replayEnd'.
// La seconda camera resta qui per chi la vuole (QA, condivisione), ma in partita non gira più: costava 3,5 s a tiro.
// Laterale rialzata di 0,5 m e arretrata di 1,2 m rispetto a prima: portiere e palla stanno tutti e due nel quadro.
export function camereReplay(rec) {
  const lato = Math.sign(rec.contact.x) || 1
  // Si inquadra il punto medio fra dove finisce la palla e dove arriva il portiere: in ritratto il campo
  // visivo orizzontale è stretto (poco più di un terzo del verticale), quindi si mira a ciò che conta.
  const k = rec.keeper?.zone != null ? zoneCenter(rec.keeper.zone) : { x: 0, y: 1 }
  const mx = (rec.contact.x + k.x) / 2, my = Math.max(0.8, (rec.contact.y + k.y) / 2)
  return [
    // 1) laterale bassa: 1,1 m da terra, sul lato del tiro; palla e portiere in campo
    { pos: [lato * 5.6, 1.6, 5.2], look: [mx, my, 0.5], fov: 70, segui: false },
    // 2) frontale 3/4 dal lato del tiratore, dietro la palla: segue la palla e il portiere guarda in camera
    { pos: [lato * 2.2, 1.35, 9.0], look: [mx, my, 0.5], fov: 58, segui: true }
  ]
}
// Chiusura della sequenza esito → replay → turno successivo. Passa UNA volta sola: i callback dei replay che
// arrivano dopo un salto trovano sequenzaConsumata a true e non fanno nulla. Saltare non cambia nulla del
// risultato, perché punteggio, XP, traguardi e sfottò sono già stati applicati all'evento 'result'.
// Dati dell'ultimo tiro, per la condivisione: nomi dal record, non dallo stato del turno.
let ultimoTiro = null, fileVideo = null
const PAROLE = { goal: 'GOL', save: 'PARATA', post: 'PALO', crossbar: 'TRAVERSA', miss: 'FUORI' }
function datiCondivisione() {
  const rec = ultimoTiro
  if (!rec) return null
  const m = mode
  return {
    esito: rec.outcome,
    titolo: rec.corner ? 'INCROCIO' : (PAROLE[rec.outcome] || rec.outcome),
    punteggio: m && m.me != null ? `Tu ${m.me} – ${m.ale} Ale` : '',
    sfida: `${rec.ruoli.tiratore.nome} tira · ${rec.ruoli.portiere.nome} para`,
    sfotto: rec.sfotto || ''
  }
}
async function condividiMomento() {
  const d = datiCondivisione(); if (!d) return
  try {
    const file = await catturaImmagine(R.renderer.domElement, d, () => fx.render())
    const testo = `${d.titolo} · ${d.sfida}${d.punteggio ? ' · ' + d.punteggio : ''} — rigori al camp nou`
    const esito = await condividiFile(file, testo, { onFallback: () => {
      toast(game.ui, 'Immagine salvata, allegala in chat', 3200)
      window.open(linkWhatsApp(testo), '_blank', 'noopener')
    } })
    if (esito === 'share') toast(game.ui, 'Condivisa')
  } catch (e) {
    console.warn('condivisione non riuscita:', e)
    toast(game.ui, 'Non sono riuscito a catturare l\'immagine')
  }
}
function chiudiSequenza() {
  if (sequenzaConsumata) return
  sequenzaConsumata = true
  clearEsitoTimers(); juice.stopReplay()
  skipBtn.hidden = true
  audio.duck(false); hideEsito(game.ui); shot.reset(); keeper?.reset(); kicker?.reset()
  rig.followLook(null); rig.goTo('dietroTiratore'); hint.hidden = false; esitoLock = false
  listeners.forEach((f) => f({ type: 'replayEnd' }))
}
// Salto: il cartello deve essere stato a schermo almeno RITARDO_SALTO, così non lo si salta col dito del tiro.
function saltaSequenza() {
  if (!esitoLock || sequenzaConsumata || game.holdShot) return false
  if (performance.now() - esitoDa < RITARDO_SALTO) return false
  audio.stopSting(150)
  chiudiSequenza()
  return true
}
// RITMO. Un tiro completo deve stare sotto i 4 s di sistema: rincorsa 0,5 + volo 0,4-0,75 + il cartello che
// si legge per REPLAY_ATTESA + un replay di REPLAY_DURATA + FINE per rientrare. Il replay parte dall'ESITO,
// non da quando la palla si ferma: la palla che rotola in rete è già il momento GOL, non serve aspettarla.
const REPLAY_ATTESA = 0.4, REPLAY_DURATA = 2.2, FINE = 0.15
const finestraReplay = (rec) => { const from = Math.max(0, rec.contactTime - 0.55), to = Math.min(rec.duration, rec.contactTime + 0.5); return { from, to, speed: (to - from) / REPLAY_DURATA } }
let ultimoReplay = null // QA: com'è stato fatto l'ultimo replay (finestra, velocità, passate)
function dopoEsito() {
  if (game.holdShot) return // QA: tiene il record vivo per i test
  const finish = chiudiSequenza
  if (!replayPending || settings.skipReplay) { tFinish = setTimeout(finish, settings.skipReplay ? 900 : 0); return }
  replayPending = false
  const rec = shot.record
  const { from, to, speed } = finestraReplay(rec)
  const [cam1] = camereReplay(rec)
  // la camera sbloccata (drone, dischetto) sostituisce la laterale
  ultimoReplay = { from, to, speed, durata: (to - from) / speed, passate: 1, attesa: REPLAY_ATTESA, fine: FINE }
  fileVideo = null // il video si registra solo se qualcuno lo chiede, dal risultato
  tReplay = setTimeout(() => juice.startReplay({ from, to, speed, render: (t) => shot.renderAt(t), camera: replayCamUnlock ? null : cam1, segui: cam1.segui, onEnd: () => { tFinish = setTimeout(finish, FINE * 1000) } }), REPLAY_ATTESA * 1000)
}
// Video a richiesta: si riesegue il replay dell'ultimo tiro registrando il canvas. Il record è immutabile, quindi
// il video è identico a quello che si è visto. Torna il file, o null dove MediaRecorder non funziona davvero.
// Il video ha l'audio: la traccia del master (effetti, musica se accesa) entra nel file, e i suoni del tiro
// (fischio, calcio, impatto, boato o "ooh") vengono rifatti agli stessi istanti del record mentre si registra.
// Se il file esce muto o vuoto, "Condividi video" sparisce per questa sessione: mai un video senza suono.
let videoNonDisponibile = false
const videoPossibile = () => !!tipoVideoSupportato() && !videoNonDisponibile
async function registraVideo() {
  const rec = ultimoTiro
  if (!rec || !videoPossibile() || juice.replaying) return null
  let reg = null
  try { reg = registraReplay(R.renderer.domElement, { durataMax: 6000, audioStream: audio.streamAudio() }) } catch { reg = null }
  if (!reg) { videoNonDisponibile = true; return null }
  const { from, to, speed } = finestraReplay(rec)
  const [cam1] = camereReplay(rec)
  const suoni = suoniDelTiro(rec)
  // Mentre si registra il tempo di gioco è fermo e i pulsanti del risultato non rispondono: un "Rigioca" a metà
  // registrazione farebbe partire una partita sopra il replay.
  game.ui.classList.add('rg-registrando')
  kicker?.onKick() // nel replay visto il tiratore era nella posa del calcio, non fermo sul dischetto
  audio.whistle()
  await new Promise((res) => juice.startReplay({ from, to, speed, render: (t) => { renderShotAt(rec, t, { ball, keeper, live: false }); suoni(t) }, camera: replayCamUnlock ? null : cam1, segui: cam1.segui, onEnd: res }))
  ball.reset(); keeper?.reset(); kicker?.reset(); audio.duck(false); rig.goTo('dietroTiratore', { instant: true })
  let file = null
  try { file = await reg.ferma() } catch { file = null }
  game.ui.classList.remove('rg-registrando')
  if (!file) videoNonDisponibile = true
  return file
}
// Suoni del tiro in funzione del tempo del record, ognuno una volta sola: calcio a t = 0, impatto alla risoluzione,
// pubblico subito dopo. Stessi suoni dal vivo e nel video.
function suoniDelTiro(rec) {
  const tImp = rec.tRisoluzione ?? rec.contactTime
  const fatti = new Set()
  const una = (k, f) => { if (!fatti.has(k)) { fatti.add(k); f() } }
  return (t) => {
    if (t >= 0) una('calcio', () => audio.play(rec.aim?.power > 0.95 ? 'kick2' : 'kick', { volume: 0.6 + Math.min(0.4, (rec.aim?.power ?? 0.8) * 0.4) }))
    if (t >= tImp) una('impatto', () => {
      audio.duck(true) // come dal vivo: la musica si abbassa sotto l'esito, lo stinger (se la musica è accesa) suona sopra
      if (rec.outcome === 'goal') { audio.sting('gol'); audio.play('net', { volume: .8 }); audio.crowd('roar'); setTimeout(() => audio.crowd('clap'), 700) }
      else if (rec.outcome === 'save') { audio.sting('parata'); audio.play('glove', { volume: .9 }); audio.crowd('oooh') }
      else if (rec.outcome === 'post' || rec.outcome === 'crossbar') { audio.play(rec.outcome, { volume: .9 }); audio.crowd('oooh') }
      else audio.crowd('oooh')
    })
  }
}
systems.push({ update(dt) { shot.update(dt); timing.update(dt); if (!timingEl.hidden) timingCur.style.left = (timing.value * 100) + '%' } })
// Dal vivo il tiro va a velocità reale dall'inizio alla fine: il volo dura quello che dice la fisica
// (0,4-0,75 s) e il giocatore deve sentirlo. L'unico fermo-immagine ammesso è l'hit-stop di 60 ms su palo
// e guanti. Il rallentatore ×0,3 esiste solo nei due replay, dove lo applica startReplay.
systems.push({ update(_dt, raw) { timeScale = juice.update(raw, ball.mesh) } })

// ---------- modalità ----------
const TELL_MS = 350
const MODES = { shootout: (o) => createShootout(o), boss: (o) => createShootout({ ...o, boss: true }), sfidaAle: (o) => createSfidaAle(o), passAndPlay: (o) => createPassAndPlay(o), skill: (o) => createSkill(o) }
// Chi tira e chi para in questo turno: nel ruolo portiere tira Ale, altrimenti tira il giocatore scelto.
// Nessun file di interfaccia conosce il nome 'Ale': lo legge da qui, attraverso il record del tiro.
function ruoliDalTurno(r) {
  const io = byId(shooterId) || { id: shooterId, nome: 'Tu' }, ale = keeperData()
  return r === 'keeper'
    ? { tiratore: { id: ale.id, nome: ale.nome, utente: false }, portiere: { id: io.id, nome: io.nome, utente: true } }
    : { tiratore: { id: io.id, nome: io.nome, utente: true }, portiere: { id: ale.id, nome: ale.nome, utente: false } }
}
let mode = null, role = 'idle', difficulty = 'normale' // la difficoltà è della partita, non del singolo controller (che viene riusato)
const modeHud = document.createElement('div'); modeHud.className = 'rg-modehud'; modeHud.setAttribute('aria-live', 'polite'); document.getElementById('rg-ui').appendChild(modeHud)
const target = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 32), new THREE.MeshBasicMaterial({ color: 0xF2B705, transparent: true, opacity: .9, side: THREE.DoubleSide, depthTest: false })); target.renderOrder = 8; target.visible = false; scene.add(target)
const xpLog = []
const ctx = {
  role(r) {
    const was = role; role = r; input.setMode(r === 'keeper' ? 'keeper' : 'shooter')
    if (kit && (r === 'keeper') !== (was === 'keeper')) { if (r === 'keeper') setPair(byId(shooterId), keeperData()); else setPair(keeperData(), byId(shooterId)) }
    keeper?.setPlayable(r === 'keeper')
    // Ruoli del turno: chi tira e chi para finiscono nel record, e da lì li leggono HUD, sfottò, punteggio e XP.
    if (r !== 'idle') ctx.setRuoli(ruoliDalTurno(r))
    if (mode && r !== 'idle') audio.whistle() // fischio a ogni tiro, anche quando il ruolo non cambia (Sfida Ale, Skill)
    if (mode && r !== 'idle' && r !== was) { const ru = shot.ruoli; toast(game.ui, taunt('preTiro', { nomi: { tiratore: ru.tiratore.nome, portiere: ru.portiere.nome }, ids: { tiratore: ru.tiratore.id, portiere: ru.portiere.id }, extra: game.progress?.unlocked('taunt:extra') }), 2600) }
    if (r === 'shooter') { hint.textContent = 'Trascina dal pallone'; hint.hidden = false; rig.goTo('dietroTiratore', { instant: was === 'keeper' }) }
    else if (r === 'keeper') { hint.textContent = 'Trascina verso la zona in cui tuffarti'; hint.hidden = false; rig.goTo('dietroPortiere', { instant: true }) }
    else hint.hidden = true
  },
  setDifficulty(d) { difficulty = d; keeper?.setDifficulty(d) },
  // Le modalità con più persone (pass-and-play) impongono i propri nomi; le altre usano il turno.
  setRuoli(r) { shot.setRuoli(r) },
  hud(t) { modeHud.textContent = t },
  xp(kind) { const n = XP[kind] || 0; xpLog.push({ kind, n }); listeners.forEach((f) => f({ type: 'xp', kind, n })) },
  forceKeeperZone(z) { keeper?.force(z) },
  keeperPassive(on) { keeper?.setPassive(on) },
  showTarget(t) { if (!t) { target.visible = false; return } target.position.set(t.x, t.y, 0.05); target.visible = true },
  pickZone: (o) => pickZone(game.ui, o),
  handoff: (name) => handoff(game.ui, name),
  // Tiro della CPU (l'utente para): il tiratore si sbilancia TELL_MS prima del calcio (lato vero 60 %, finta 40 %;
  // in Boss finta 15 % e mira 25/25/50, metà dei tiri in alto). 350 ms, erano 200: a 200 non si faceva in tempo a leggerlo e a rispondere.
  cpuShoot({ strength = 1 } = {}) {
    const boss = keeper?.difficulty === 'boss'
    const early = shot.playerDiveZone()
    const mix = boss ? MIRE.boss : MIRE.normale
    const aim = cpuAim({ avoidCol: early != null ? early % 3 : null, strength, mix })
    const feint = Math.random() < (boss ? 0.15 : 0.40)
    const side = feint ? -Math.sign(aim.x || 1) : Math.sign(aim.x || 1)
    listeners.forEach((f) => f({ type: 'tell', side, feint }))
    kicker?.tell(side)
    setTimeout(() => {
      const late = shot.playerDiveZone()
      const a = (late != null && early == null) ? cpuAim({ avoidCol: late % 3, strength, mix }) : aim
      shot.setPrecision(0.6); shot.fire(a, { timingPerfect: false, delay: kicker ? KICK_DELAY : 0 }); shot.setPrecision(1)
      kicker?.windup()
    }, TELL_MS)
  }
}
function startMode(id, opts = {}) {
  if (!MODES[id]) throw new Error('modalità sconosciuta: ' + id)
  mode = MODES[id](opts); mode.start(ctx); mode.nextTurn(ctx)
  listeners.forEach((f) => f({ type: 'modeStart', id }))
  return mode
}
// Fine modalità: stato della partita azzerato (passività, zona forzata, bersaglio), poi 'modeEnd'
function endMode() {
  const summary = mode.summary(); const m = mode; mode = null
  ctx.keeperPassive(false); ctx.forceKeeperZone(null); ctx.showTarget(null); ctx.role('idle')
  listeners.forEach((f) => f({ type: 'modeEnd', id: m.id, summary }))
}
listeners.add((e) => {
  if (!mode) return
  // Partecipazione: ogni tiro dell'utente vale XP.tiro, in qualunque modalità, prima del merito dell'esito
  if (e.type === 'result' && e.ruoli?.tiratore?.utente) ctx.xp('tiro')
  if (e.type === 'result') mode.onResult(e, ctx)
  if (e.type === 'replayEnd') { if (esitoLock) return; if (!mode.finished) mode.nextTurn(ctx); if (mode?.finished) endMode() }
})
systems.push({ update(dt) {
  if (!mode?.tick || mode.finished) return
  mode.tick(dt, ctx)
  // il tempo può scadere a palla ferma (Skill): non arriverebbe nessun 'replayEnd'
  if (mode.finished && shot.state === 'idle' && !esitoLock) endMode() // mai durante esito o replay
} })

// ---------- flusso: onboarding → CHI TIRA? → modalità → partita → risultato ----------
// Ogni tocco vero sul gioco (volti di "Chi tira?" compresi) riprende l'AudioContext se non gira: iOS lo sospende
// dopo una chiamata o lo standby, e senza questo gli effetti tacerebbero fino a un ritorno al caricamento.
for (const el of [document.getElementById('rg-ui'), stage]) el.addEventListener('pointerdown', () => { if (audio.context?.state !== 'running') audio.unlock() }, { capture: true, passive: true })
document.getElementById('rg-ui').addEventListener('click', (e) => { const b = e.target.closest('button, a'); if (!b) return; audio.play(b.classList.contains('rg-btn--primary') ? 'confirm' : b.dataset.value === '__close' || b.dataset.back != null ? 'back' : 'click', { volume: .5 }) })
const menuBtn = document.createElement('button'); menuBtn.className = 'rg-btn rg-btn--ghost rg-menubtn'; menuBtn.setAttribute('aria-label', 'Menu'); menuBtn.textContent = '≡'; menuBtn.hidden = true
document.getElementById('rg-ui').appendChild(menuBtn)
// Altoparlante nell'HUD di gioco: un tocco accende o spegne la musica, con l'inno o la tensione che partono subito.
// Sta a destra, sopra l'HUD del punteggio: accanto al ≡ a sinistra avrebbe tolto 56 px alla riga del punteggio.
const ICONA_MUSICA = { on: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>', off: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/></svg>' }
const musicBtn = document.createElement('button'); musicBtn.className = 'rg-btn rg-btn--ghost rg-musicbtn'; musicBtn.hidden = true
const aggiornaMusicBtn = () => { const on = settings.music !== false; musicBtn.innerHTML = ICONA_MUSICA[on ? 'on' : 'off']; musicBtn.setAttribute('aria-pressed', String(on)); musicBtn.setAttribute('aria-label', on ? 'Musica accesa: tocca per spegnerla' : 'Musica spenta: tocca per accenderla'); musicBtn.classList.toggle('rg-musicbtn--off', !on) }
musicBtn.addEventListener('click', () => { settings.music = settings.music === false; applySettings(); aggiornaMusicBtn(); toast(game.ui, settings.music === false ? 'Musica spenta' : 'Musica accesa', 1400) })
aggiornaMusicBtn(); document.getElementById('rg-ui').appendChild(musicBtn)
// TOCCA PER SALTARE: durante esito e replay, grande, in basso, sopra tutto. Anche un tocco in qualunque punto salta,
// ma solo dopo 150 ms dal cartello: bastano a scartare il tocco residuo del dito che ha appena tirato.
const RITARDO_SALTO = 150
const skipBtn = document.createElement('button'); skipBtn.className = 'rg-btn rg-skip'; skipBtn.textContent = 'Tocca per saltare ▸'
skipBtn.setAttribute('aria-label', 'Salta il replay'); skipBtn.hidden = true
document.getElementById('rg-ui').appendChild(skipBtn)
skipBtn.addEventListener('click', (e) => { e.stopPropagation(); saltaSequenza() })
document.getElementById('rg-ui').addEventListener('click', async (e) => {
  if (e.target.closest('[data-share]')) { e.stopPropagation(); condividiMomento(); return }
  if (e.target.closest('[data-share-video]')) { e.stopPropagation(); condividiVideo(); return }
  if (e.target.closest('[data-copy]')) {
    e.stopPropagation()
    // Nel risultato il pulsante porta con sé il testo della partita; sul cartello si copia l'ultimo tiro
    const d = datiCondivisione()
    const testo = e.target.closest('[data-copy]').dataset.copy || (d ? `${d.titolo} · ${d.sfida}${d.punteggio ? ' · ' + d.punteggio : ''} — rigori al camp nou` : 'rigori al camp nou · barcelona 40')
    try { await navigator.clipboard.writeText(testo); toast(game.ui, 'Risultato copiato') } catch { toast(game.ui, 'Non sono riuscito a copiare') }
  }
})
async function condividiVideo() {
  if (!fileVideo) { toast(game.ui, 'Registro il replay…', 2500); fileVideo = await registraVideo() }
  if (!fileVideo) { toast(game.ui, 'Video non disponibile su questo telefono: condividi l\'immagine', 3200); return }
  if (!fileVideo) { toast(game.ui, 'Video non disponibile'); return }
  const d = datiCondivisione()
  const testo = d ? `${d.titolo} · ${d.sfida} — rigori al camp nou` : 'rigori al camp nou'
  const esito = await condividiFile(fileVideo, testo, { onFallback: () => toast(game.ui, 'Video salvato, allegalo in chat', 3200) })
  if (esito === 'share') toast(game.ui, 'Condiviso')
}
document.getElementById('rg-ui').addEventListener('pointerdown', (e) => { if (esitoLock && !e.target.closest('.rg-overlay, [data-share]')) saltaSequenza() })
stage.addEventListener('pointerdown', () => { if (esitoLock) saltaSequenza() }, true)
let flow = 'boot', quitRequested = false
// Il gioco vive dentro il sito: /rigori/ sta sotto la stessa base. Link nella stessa scheda, non _blank.
// Classifica di serata: la classifica del pass-and-play più il miglior risultato di ogni altra modalità
const apriClassifica = () => {
  const pr = game.progress
  const record = {}
  for (const k of ['shootout', 'sfidaAle', 'skill', 'boss']) { const b = pr.board(k); if (b.length) record[k] = b[0] }
  return classifica(game.ui, { serata: pr.board('passAndPlay'), record })
}
// Profilo scelto nel sito (b40:v1:person, JSON): SOLA LETTURA, il gioco non scrive mai chiavi del sito.
// null se il gioco è aperto da link diretto senza profilo.
function profiloSito() { try { const v = JSON.parse(localStorage.getItem('b40:v1:person')); return typeof v === 'string' && v ? v : null } catch { return null } }
const openOptions = () => opzioni(game.ui, settings, { onChange: () => { applySettings(); aggiornaMusicBtn() }, onReset: () => { save.reset(); toast(game.ui, 'Progressi azzerati'); setTimeout(() => location.reload(), 700) } })
async function runFlow() {
  await kitReady
  ctx.role('idle')
  if (!save.get('onboarded', false)) { flow = 'onboarding'; ctx.role('shooter'); await onboarding(game.ui, () => input.ballOnScreen()); save.set('onboarded', true); ctx.role('idle') }
  while (true) {
    // Chi tira? Toccare un volto (o "Tira come <profilo>") porta dritto a Modalità: nessuna conferma.
    for (let scelto = false; !scelto;) {
      flow = 'chiTira'; audio.playMusic('inno')
      const id = await chiTira(game.ui, ASSETS, { profilo: profiloSito(), statsDi: (pid) => game.progress?.giocatore?.(pid) ?? null })
      if (id === '__classifica') { await apriClassifica(); continue }
      if (id && byId(id)) setShooter(id)
      scelto = true
    }
    let choice = null
    while (!choice) {
      flow = 'modalita'
      const r = await modalita(game.ui, { bossUnlocked: game.progress?.bossUnlocked?.() ?? false, level: game.progress?.level?.().n ?? 1, tiratore: byId(shooterId)?.nome || null })
      if (r.id === '__opzioni') { await openOptions(); continue }
      if (r.id === '__classifica') { await apriClassifica(); continue }
      if (r.id === '__sblocchi') { await sblocchi(game.ui, game.progress.summaryForUi(), { onEquip: (kind, id) => { if (game.progress.setEquip(kind, id)) { applyEquip(); return game.progress.summaryForUi() } audio.play('error', { volume: .5 }); return null } }); continue }
      if (r.id === '__chi') break
      if (!r.id) continue
      choice = r
    }
    if (!choice) continue
    // partita
    let again = true
    while (again) {
      flow = 'gioco'; quitRequested = false; menuBtn.hidden = false; musicBtn.hidden = false; aggiornaMusicBtn(); audio.playMusic('tensione')
      const xpBefore = game.progress?.xp?.() ?? 0
      // Fine partita o "Esci" dal menu: in tutti e due i casi il timer che sorveglia l'uscita si cancella
      // e l'ascoltatore di modeEnd si stacca, altrimenti ne resta uno vivo per ogni partita giocata.
      let risolvi
      const fine = (e) => { if (e.type === 'modeEnd') risolvi(e) }
      const ended = new Promise((res) => { risolvi = res }); listeners.add(fine)
      startMode(choice.id, choice.opts)
      let ivUscita = null
      const e = await Promise.race([ended, new Promise((res) => { ivUscita = setInterval(() => { if (quitRequested) res(null) }, 200) })])
      clearInterval(ivUscita); listeners.delete(fine)
      menuBtn.hidden = true; musicBtn.hidden = true
      if (!e) { mode = null; clearEsitoTimers(); esitoLock = false; ctx.keeperPassive(false); ctx.forceKeeperZone(null); ctx.showTarget(null); ctx.role('idle'); shot.reset(); keeper?.reset(); kicker?.reset(); hideEsito(game.ui); rig.goTo('dietroTiratore', { instant: true }); break }
      flow = 'risultato'
      audio.playMusic('inno')
      if (e.summary?.winner === 'me' || (e.id !== 'shootout' && e.id !== 'boss')) audio.sting('vittoria')
      const xpNow = game.progress?.xp?.() ?? 0
      const lv = game.progress?.level?.() || { n: 1, title: 'Esordiente' }
      const esito = esitoPartita(e)
      if (esito === 'vinto' && !settings.reduceFx) confettiBig()
      const r = await risultato(game.ui, { title: titleFor(e), lines: linesFor(e), esito, xpGained: xpNow - xpBefore, xp: xpNow, level: lv, next: game.progress?.next?.() || null, achievements: game.progress?.takeFresh?.() || [], shareText: shareFor(e), sito: SITO, video: videoPossibile() })
      if (r === 'classifica') { await apriClassifica(); flow = 'risultato'; again = (await risultato(game.ui, { title: titleFor(e), lines: linesFor(e), esito, xpGained: xpNow - xpBefore, xp: xpNow, level: lv, next: game.progress?.next?.() || null, achievements: [], shareText: shareFor(e), sito: SITO, video: videoPossibile() })) === 'again'; continue }
      again = r === 'again'
    }
  }
}
// Doppio tocco sul ≡ (o tocco mentre Pausa, Opzioni o Classifica sono aperte): il secondo si ignora, altrimenti
// si aprivano due Pausa una sopra l'altra e il "Continua" di sotto restava appeso. I pannelli del pass-and-play
// ("para tu", "passa il telefono") non hanno data-overlay: sopra quelli il ≡ deve continuare ad aprire la Pausa.
menuBtn.addEventListener('click', async () => { if (game.ui.querySelector('.rg-overlay[data-overlay]')) return; const v = await overlayMenu(); if (v === 'esci') quitRequested = true })
async function overlayMenu() {
  const v = await overlay(game.ui, `<h2 class="rg-title">Pausa</h2><div class="rg-row"><a class="rg-btn rg-btn--ghost" href="${SITO}" aria-label="Torna al programma del weekend" style="flex:1 0 100%">← Torna al programma</a><button class="rg-btn rg-btn--primary" data-value="continua" aria-label="Continua">Continua</button><button class="rg-btn" data-value="classifica" aria-label="Classifica di serata">Classifica</button><button class="rg-btn" data-value="opzioni" aria-label="Opzioni">Opzioni</button><button class="rg-btn rg-btn--ghost" data-value="esci" aria-label="Esci dalla partita">Esci</button></div>`, { label: 'Pausa', closable: true })
  if (v === 'opzioni') { await openOptions(); return 'continua' }
  if (v === 'classifica') { await apriClassifica(); return 'continua' }
  return v
}
function titleFor(e) { const s = e.summary; if (e.id === 'shootout' || e.id === 'boss') return s.winner === 'me' ? `Hai vinto ${s.me}–${s.ale}` : `Ale vince ${s.ale}–${s.me}`; if (e.id === 'sfidaAle') return `${s.goals} gol prima delle tre parate di Ale`; if (e.id === 'skill') return `${s.score} punti`; if (e.id === 'passAndPlay') return `Vince ${s.leaderboard[0].name}`; return MODES_INFO.find((m) => m.id === e.id)?.title || e.id }
// La classifica salvata si mostra solo se ci sono almeno due persone dentro: "1. Monne Perso 0–3" da solo
// non è una classifica, è una presa in giro.
function linesFor(e) { const b = game.progress.board(e.id).slice(0, 3); const top = new Set(b.map((x) => x.name)).size >= 2 ? [`Classifica: ${b.map((x, i) => `${i + 1}. ${x.name} ${x.label}`).join(' · ')}`] : []; return [...linesBase(e), ...top] }
// Come è andata, per il tono della schermata: 'vinto' | 'perso' | null (Skill e pass-and-play non hanno un Ale da battere)
// Sfida Ale finisce SEMPRE con tre parate: non è una sconfitta, è il modo in cui si chiude. Niente rivincita lì.
function esitoPartita(e) { const s = e.summary || {}; if (e.id === 'shootout' || e.id === 'boss') return s.winner === 'me' ? 'vinto' : 'perso'; return null }
function linesBase(e) { const s = e.summary; if (e.id === 'passAndPlay') return s.leaderboard.map((p, i) => `${i + 1}. ${p.name}: ${p.goals} gol, ${p.saves} parate`); if (e.id === 'sfidaAle') { const record = Math.max(s.goals, ...game.progress.board('sfidaAle').map((x) => x.score)); return [`${s.shots} tiri`, s.goals >= record && s.goals > 0 ? `Il tuo record: ${record} gol${game.progress.board('sfidaAle').filter((x) => x.score === record).length <= 1 ? ', fatto adesso' : ''}` : `Il tuo record: ${record} gol`] } if (e.id === 'skill') return [`${s.hits} bersagli su ${s.shots} tiri`]; if (e.id === 'shootout' || e.id === 'boss') return [s.suddenDeath ? 'Deciso al sudden death' : `${s.rounds} rigori a testa`]; return [] }
function shareFor(e) {
  const s = e.summary, who = byId(shooterId)?.nome || 'Io', url = __SITE_URL__.replace(/\/?$/, '/') + 'rigori/'
  if (e.id === 'shootout' || e.id === 'boss') return `⚽ Rigori al Camp Nou\n${who} ${s.me}-${s.ale} Ale 🧤\n${s.winner === 'me' ? (s.suddenDeath ? 'Deciso al sudden death. Disonesti.' : 'Ale a casa. Disonesti.') : 'Ale ha parlato troppo, e aveva ragione.'}\n${url}`
  if (e.id === 'sfidaAle') return `⚽ Rigori al Camp Nou\n${who}: ${s.goals} gol prima che Ale ne parasse tre 🧤\n${url}`
  if (e.id === 'skill') return `⚽ Rigori al Camp Nou · Skill\n${who}: ${s.score} punti in 30 secondi\n${url}`
  if (e.id === 'passAndPlay') return `⚽ Rigori al Camp Nou · classifica di serata\n${s.leaderboard.map((p, i) => `${i + 1}. ${p.name} ${p.goals + p.saves}`).join('\n')}\n${url}`
  return url
}

// ---------- API interna ed export per QA ----------
export const game = {
  THREE, scene, camera: rig.camera, rig, renderer: R.renderer, ball, goal, crowd, field, stadium, lights, fx, perf, quality, manager, ASSETS, systems, shot, input, timing, listeners,
  set timingEnabled(v) { timingEnabled = !!v }, get timingEnabled() { return timingEnabled },
  setTimeScale(v) { timeScale = v }, get timeScale() { return timeScale }, ui: document.getElementById('rg-ui'), reducedMotion, settings, juice
}
// ---------- progressione, sfottò, equipaggiamento ----------
game.progress = createProgress({
  save, listeners, role: () => role, shooterName: () => byId(shooterId)?.nome || 'Io', shooterId: () => shooterId,
  onLevelUp: (lv) => { audio.play('levelup', { volume: .7 }); toast(game.ui, `Livello ${lv.n}: ${lv.title}`, 3000) },
  onUnlock: (u) => { audio.play('unlock', { volume: .6 }); toast(game.ui, `Sbloccato: ${u.title}`, 3000) },
  onAchievement: (a) => { audio.play('unlock', { volume: .6 }); toast(game.ui, `🏆 ${a.title}`, 3000) }
})
// Lo sfottò dipende da chi ha tirato (dal record) e dall'esito, mai dal turno corrente: a gol subito
// da portiere deve uscire una battuta da gol subito, non da gol fatto.
game.tauntFor = (rec, kind) => taunt(kind || gruppoPerEsito(rec.outcome), {
  nomi: { tiratore: rec.ruoli.tiratore.nome, portiere: rec.ruoli.portiere.nome },
  ids: { tiratore: rec.ruoli.tiratore.id, portiere: rec.ruoli.portiere.id },
  extra: game.progress.unlocked('taunt:extra')
})
function applyEquip() {
  ball.setSkin(game.progress.equipped('pallone'))
  kicker?.setCelebration((game.progress.equipped('celebrazione') || 'celeb:salto').replace('celeb:', ''))
  const cam = { 'cam:drone': 'drone', 'cam:dischetto': 'dischetto' }[game.progress.equipped('camera')]
  replayCamUnlock = !!cam; juice.setReplayCamera(cam || 'lateraleReplay')
}
applyEquip()
window.__rigori = {
  ready: false, game, noFlow: new URLSearchParams(location.search).has('noflow'),
  // Tiro deterministico per la QA: aim = { x, y, power, curve }
  fire: (aim, timingPerfect = false, delay = 0, seed) => { shot.fire(aim, { timingPerfect, delay, seed }); if (delay) kicker?.windup(); else rig.followLook(ball.mesh) },
  // Determinismo: record del tiro, disegno a un tempo qualsiasi, traccia della posa frame per frame
  record: () => shot.record,
  renderAt: (t) => shot.renderAt(t),
  pose: () => ({ ball: ball.mesh.position.toArray().map((n) => +n.toFixed(4)), ballRot: +ball.mesh.rotation.x.toFixed(4), keeperX: +(keeper?.group.position.x ?? 0).toFixed(4), clip: keeper?.action?.getClip?.().name || null, clipTime: +(keeper?.action?.time ?? -1).toFixed(4) }),
  trace: (on) => { trace = on ? [] : null; return trace },
  traced: () => trace,
  playerDive: (z) => shot.playerDive(z),
  // QA: distanza fra guanto e palla all'istante dell'impatto, con la posa del record
  // La misura è quella con cui è stato deciso l'esito: distanza minima fra la palla in volo e la capsula
  // guanto→spalla della direzione scelta, dalla tabella misurata sul modello.
  distanzaGuanto: () => shot.record?.distanzaGuanto ?? null,
  ruoli: () => shot.ruoli, camereReplay, DIVE_DUR, GOAL, DISCHETTO,
  // QA: salta la sequenza esito+replay come farebbe un tocco. Torna false se il salto non è accettato
  // (sequenza già chiusa, oppure il cartello è a schermo da meno di 400 ms).
  salta: () => saltaSequenza(), get sequenzaConsumata() { return sequenzaConsumata }, get ritardoSalto() { return RITARDO_SALTO },
  // QA del ritmo: com'è stato fatto l'ultimo replay, le costanti della sequenza e il video (null finché nessuno lo chiede)
  get ultimoReplay() { return ultimoReplay }, get videoNonDisponibile() { return videoNonDisponibile }, ritmo: { KICK_DELAY, REPLAY_ATTESA, REPLAY_DURATA, FINE }, get fileVideo() { return fileVideo }, registraVideo,
  // QA: gonfiore massimo toccato dalla rete dall'ultimo impulso, in metri (azzerabile fra un tiro e l'altro)
  reteAmpiezza: () => goal.ampiezzaMax?.() ?? null,
  reteRiposo: () => goal.riposo?.(),
  reteDiagnostica: (punto) => goal.diagnostica?.(punto || shot.record?.netPunch?.punto || new THREE.Vector3()),
  reteAttiva: () => goal.attivo,
  replay: ({ speed = 0.3, from, to } = {}) => new Promise((res) => {
    const rec = shot.record; if (!rec) return res(false)
    juice.startReplay({ from: from ?? Math.max(0, rec.contactTime - 0.55), to: to ?? Math.min(rec.duration, rec.contactTime + 0.45), speed, render: (t) => shot.renderAt(t), onEnd: () => res(true) })
  }),
  setShooter, shooter: () => shooterId, flow: () => flow, settings, applySettings, cpuAim, MIRE, TELL_MS,
  kitReady, startMode, mode: () => mode, role: () => role, xpLog, ctx, chars, rig, keeper: () => keeper, kicker: () => kicker, get frames() { return frames },
  setPrecision: (v) => shot.setPrecision(v), audio, events, get esitoLocked() { return esitoLock }, shotState: () => shot.state, lastResult: () => [...events].reverse().find((e) => e.type === 'result')?.result || null,
  get inPausa() { return inPausa },
  info: () => ({ fps: +perf.fps.toFixed(1), level: perf.level, quality: { ...quality }, frames, draws: R.renderer.info.render.calls, tris: R.renderer.info.render.triangles, camera: rig.current })
}

// LoadingManager.onLoad scatta a ogni svuotamento della coda (anche per i volti caricati dopo): parte una volta sola
manager.onLoad = () => {
  if (window.__rigori.ready) return
  window.__rigori.ready = true
  const el = document.getElementById('rg-loading')
  const go = () => { el.classList.add('rg-loading--out'); setTimeout(() => el.remove(), 500); if (!window.__rigori.noFlow) runFlow() }
  // "Tocca per iniziare": il primo tocco sblocca l'AudioContext (iOS lo richiede dentro un gesto utente)
  const tap = el.querySelector('.rg-loading__tap'); tap.hidden = false; el.querySelector('.rg-loading__bar').hidden = true; el.querySelector('.rg-loading__pct').hidden = true
  // Si parte sul CLICK (dito sollevato), non sul pointerdown: altrimenti la schermata sparisce sotto il dito e
  // il click atterra sul pulsante che "Chi tira?" ha nello stesso punto ("Torna al programma"). Lo sblocco
  // dell'audio resta al pointerdown (ascoltatore in cattura più sopra). Niente focus programmatico: da
  // tastiera basta Invio o spazio, al tocco il focus porterebbe l'anello giallo sulla schermata dopo.
  let partito = false
  const start = (ev) => { if (partito) return; partito = true; ev?.preventDefault?.(); document.removeEventListener('keydown', daTastiera); audio.unlock(); go() }
  const daTastiera = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') start(ev) }
  el.addEventListener('click', start); document.addEventListener('keydown', daTastiera)
  if (window.__rigori.noFlow) { document.addEventListener('pointerdown', () => audio.unlock(), { once: true }); start() }
}
// Se non c'è nulla da caricare il manager non chiama onLoad da solo
setTimeout(() => { if (!window.__rigori.ready) manager.onLoad() }, 4000)
loop()
