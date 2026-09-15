// Bootstrap: loading screen con progresso reale, scena, loop, degradazione automatica.
import './styles/rigori.css'
import * as THREE from 'three'
import { createRenderer } from './core/renderer.js'
import { createCameraRig } from './core/camera.js'
import { createPerf } from './core/perf.js'
import { createField } from './scene/field.js'
import { createStadium } from './scene/stadium.js'
import { createCrowd } from './scene/crowd.js'
import { createGoal } from './scene/net.js'
import { createLights } from './scene/lights.js'
import { createPostFx } from './scene/postfx.js'
import { createBall } from './game/ball.js'
import { createInput } from './core/input.js'
import { createShot, aimFromGesture } from './game/shot.js'
import { createTiming } from './game/timing.js'
import { createGhost } from './game/ghost.js'
import { loadCharacterKit, makeCharacter, loadFace } from './scene/players.js'
import { createKeeper } from './game/keeper.js'
import { createJuice } from './game/juice.js'
import { createShootout } from './game/modes/shootout.js'
import { createSfidaAle } from './game/modes/sfidaAle.js'
import { createPassAndPlay } from './game/modes/passAndPlay.js'
import { createSkill } from './game/modes/skill.js'
import { cpuAim, XP } from './game/modes/base.js'
import { zoneOf } from './game/keeper.js'
import { pickZone, handoff } from './ui/screens/passaggio.js'
import { chiTira } from './ui/screens/chiTira.js'
import { modalita } from './ui/screens/modalita.js'
import { showEsito, hideEsito } from './ui/screens/esito.js'
import { risultato } from './ui/screens/risultato.js'
import { opzioni } from './ui/screens/opzioni.js'
import { sblocchi } from './ui/screens/sblocchi.js'
import { onboarding } from './ui/screens/onboarding.js'
import { toast } from './ui/components/toast.js'
import { save } from './core/save.js'
import { setCamera } from './scene/players.js'
import { keeper as keeperData, faceOf, byId } from './data/players.js'
import { createKicker, KICK_DELAY } from './game/kicker.js'

const root = document.getElementById('game')
const ASSETS = import.meta.env.BASE_URL.replace(/\/$/, '') + '/assets/rigori/'
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- loading screen ----------
const TIPS = ['Trascina dal pallone: direzione, forza e curva in un gesto solo.', 'Rilascia quando la barra è al centro: tell dimezzato.', 'Ale legge il corpo del tiratore. Fintalo.', 'La traversa è a 2,44 m. La potenza la cerca.']
root.innerHTML = `<div class="rg-loading" id="rg-loading" role="status" aria-live="polite">
  <div class="rg-loading__title">Rigori <b>al Camp Nou</b></div>
  <div class="rg-loading__bar"><i id="rg-loading-fill"></i></div>
  <div class="rg-loading__pct" id="rg-loading-pct">0%</div>
  <p class="rg-loading__tip">${TIPS[(Math.random() * TIPS.length) | 0]}</p>
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
scene.fog = new THREE.Fog(0x0a0e22, 38, 170) // nebbia leggera scura: profondità (direzione visiva)
const rig = createCameraRig(R.size.w / R.size.h)
setCamera(rig.camera)
const lights = createLights(); scene.add(lights.group)
const field = createField(); scene.add(field)
const stadium = createStadium(); scene.add(stadium.group)
const crowd = createCrowd(reducedMotion ? 1400 : 2600); scene.add(crowd.mesh)
const goal = createGoal(); scene.add(goal.group)
const ballTex = new THREE.TextureLoader(manager).load(ASSETS + 'textures/ball.png'); ballTex.colorSpace = THREE.SRGBColorSpace
const ball = createBall(ballTex); scene.add(ball.mesh); scene.add(ball.shadow)
const fx = createPostFx(R.renderer, scene, rig.camera, R.size)

// Qualità: auto (degrada da sola), bassa, alta · DA VERIFICARE: soglie da provare su telefono vero
const quality = { bloom: !reducedMotion, shadows: true, particles: true, crowd: 1 }
const applyQuality = () => { fx.setEnabled(quality.bloom); R.setShadows(quality.shadows); lights.setShadows(quality.shadows); crowd.setDensity(quality.crowd) }
const perf = createPerf({
  onDegrade: (step) => { if (step === 'bloom') quality.bloom = false; if (step === 'shadows') quality.shadows = false; if (step === 'particles') quality.particles = false; if (step === 'crowd') quality.crowd = 0.5; applyQuality() },
  onRestore: (step) => { if (step === 'crowd') quality.crowd = 1; if (step === 'particles') quality.particles = true; if (step === 'shadows') quality.shadows = true; if (step === 'bloom') quality.bloom = !reducedMotion; applyQuality() }
})
applyQuality()
let timingEnabled = true               // opzione (fase 9); ON di default
// Opzione "riduci flash e shake" (fase 9) + prefers-reduced-motion: niente shake né particelle intense, lo slow-mo resta
const settings = Object.assign({ audio: true, music: true, vibration: true, reduceFx: reducedMotion, timing: true, quality: 'auto' }, save.get('settings', {}))
function applySettings() {
  timingEnabled = settings.timing !== false
  perf.lock(settings.quality !== 'auto')
  if (settings.quality === 'bassa') { quality.bloom = false; quality.shadows = false; quality.particles = false; quality.crowd = 0.5 }
  else if (settings.quality === 'alta') { quality.bloom = !reducedMotion; quality.shadows = true; quality.particles = true; quality.crowd = 1 }
  applyQuality()
  save.set('settings', settings)
}
applySettings()

const onResize = () => { R.resize(); rig.setAspect(R.size.w / R.size.h); fx.resize(R.size.w, R.size.h) }
window.addEventListener('resize', onResize); onResize()

// ---------- loop ----------
const timer = new THREE.Timer()
let timeScale = 1, frames = 0
const systems = [] // moduli con update(dt) aggiunti dalle fasi successive
function loop() {
  requestAnimationFrame(loop)
  timer.update()
  const raw = Math.min(timer.getDelta(), 0.05)
  const dt = raw * timeScale
  perf.tick(raw)
  crowd.update(dt); goal.update(dt); ball.update(dt); rig.update(raw)
  for (const s of systems) s.update(dt, raw)
  fx.render(); frames++
}

// ---------- tiro: input → mira → volo → esito ----------
const timing = createTiming()
const juice = createJuice({ scene, rig, reduced: () => settings.reduceFx })
const ghost = createGhost(scene)
const events = []                      // ultimi eventi del tiro (per QA e per le modalità)
const listeners = new Set()            // le modalità si iscrivono qui (fase 7)
const shot = createShot({ ball, goal, keeper: null, onEvent: (e) => { events.push(e); listeners.forEach((f) => f(e)); onShotEvent(e) } })
// Personaggi: kit caricato attraverso il manager (progresso reale), portiere sulla linea
// Due personaggi: Ale (portiere di casa) e il tiratore scelto. Nel ruolo portiere si scambiano:
// Ale va sul dischetto e il tiratore scelto va in porta.
let kit = null, keeper = null, kicker = null, shooterId = 'monne' // DA VERIFICARE: tiratore di partenza
const chars = {}, controllers = {}
const faces = {}
const charFor = (p) => {
  if (chars[p.id]) return chars[p.id]
  faces[p.id] = faces[p.id] || loadFace(ASSETS, faceOf(p), manager)
  chars[p.id] = makeCharacter(kit, { maglia: p.maglia, numero: p.numero, faceTexture: faces[p.id], faceScale: p.id === 'ale' ? 0.5 : 0.46 })
  return chars[p.id]
}
function setPair(keeperP, kickerP) {
  for (const c of Object.values(chars)) scene.remove(c.group)
  const kc = charFor(keeperP), sc = charFor(kickerP)
  const kKey = 'keeper:' + keeperP.id, sKey = 'kicker:' + kickerP.id
  controllers[kKey] = controllers[kKey] || createKeeper(kc, { difficulty: keeper?.difficulty || 'normale', onDive: (_z, at) => juice.dust(at) })
  controllers[sKey] = controllers[sKey] || createKicker(sc)
  keeper = controllers[kKey]; kicker = controllers[sKey]
  keeper.reset(); kicker.reset()
  scene.add(kc.group); scene.add(sc.group)
  shot.setKeeper(keeper); game.keeper = keeper; game.kicker = kicker
}
const kitReady = loadCharacterKit(ASSETS, manager).then((k) => {
  kit = k; game.kit = kit
  setPair(keeperData(), byId(shooterId))
  systems.push({ update: (dt) => { keeper?.update(dt); kicker?.update(dt) } })
}).catch((err) => { console.error('Personaggi non caricati:', err); game.loadError = String(err) })
// Cambio tiratore (schermata CHI TIRA?, fase 9)
function setShooter(id) { if (!byId(id) || !kit) return; shooterId = id; if (role === 'keeper') setPair(byId(shooterId), keeperData()); else setPair(keeperData(), byId(shooterId)) }
const hud = document.createElement('div'); hud.className = 'rg-hud'; hud.innerHTML = `
  <div class="rg-timing" id="rg-timing" hidden aria-hidden="true"><i class="rg-timing__win"></i><b class="rg-timing__cur"></b></div>
  <div class="rg-hint" id="rg-hint">Trascina dal pallone</div>`
document.getElementById('rg-ui').appendChild(hud)
const timingEl = document.getElementById('rg-timing'), timingCur = timingEl.querySelector('.rg-timing__cur'), hint = document.getElementById('rg-hint')
const input = createInput(stage, { camera: rig.camera, getBallWorld: () => ball.mesh.position, size: R.size, enabled: () => !shot.busy && window.__rigori.ready })
input.on('start', () => { if (timingEnabled && input.mode === 'shooter') { timing.start(); timingEl.hidden = false } hint.hidden = true })
input.on('move', (g) => { if (g.ok && input.mode === 'shooter') ghost.show(aimFromGesture(g, R.size)) })
input.on('end', (g) => {
  ghost.hide(); timing.stop(); timingEl.hidden = true
  if (input.mode === 'keeper') {
    // portiere: direzione dello swipe → zona; il tempismo è tutto (troppo presto: la CPU cambia lato)
    if (!g.ok || !keeper) return
    const col = g.dx < -40 ? 0 : g.dx > 40 ? 2 : 1, row = -g.dy > 60 ? 0 : 1
    keeper.playerDive(row * 3 + col); hint.hidden = true
    return
  }
  if (!g.ok) { hint.hidden = false; return }
  shot.fire(aimFromGesture(g, R.size), { timingPerfect: timingEnabled && timing.perfect, delay: kicker ? KICK_DELAY : 0 })
  kicker?.windup()
})
input.on('reject', () => { hint.hidden = false; hint.classList.remove('rg-hint--pulse'); void hint.offsetWidth; hint.classList.add('rg-hint--pulse') })
const shake = (amp, dur) => { if (!settings.reduceFx) rig.shake(amp, dur) }
let replayPending = false
function onShotEvent(e) {
  if (e.type === 'windup') hint.hidden = true
  if (e.type === 'kick') { hint.hidden = true; juice.clearRecord(); replayPending = true; kicker?.onKick(); rig.followLook(ball.mesh); keeper?.prepare({ aim: e.aim, timingPerfect: e.timingPerfect, power: e.aim.power }) }
  if (e.type === 'result') kicker?.react(e.result)
  if (e.type === 'result') { juice.setSlow(false); keeper?.react(e.result); showEsito(game.ui, { result: e.result, corner: e.corner, taunt: game.tauntFor?.(e) || '' }) }
  if (e.type === 'goal') { crowd.react('ola'); shake(0.10, 0.35) }
  if (e.type === 'post' || e.type === 'crossbar') { shake(0.06, 0.2); juice.hitStop(60) }
  if (e.type === 'save') { juice.hitStop(60); crowd.react('oooh') }
  if (e.type === 'miss') crowd.react('oooh')
  if (e.type === 'settled') afterSettled()
}
// Dopo l'esito: replay laterale di 2 s, poi si torna dietro al tiratore. Le modalità (fase 7) ascoltano 'replayEnd'.
function afterSettled() {
  const finish = () => { hideEsito(game.ui); shot.reset(); keeper?.reset(); kicker?.reset(); rig.followLook(null); rig.goTo('dietroTiratore'); hint.hidden = false; listeners.forEach((f) => f({ type: 'replayEnd' })) }
  if (!replayPending) { finish(); return }
  replayPending = false
  setTimeout(() => juice.startReplay(() => setTimeout(finish, 300)), 500)
}
systems.push({ update(dt) { shot.update(dt); timing.update(dt); if (!timingEl.hidden) timingCur.style.left = (timing.value * 100) + '%' } })
// Slow-motion ×0,3 negli ultimi 0,4 s prima dell'esito; registrazione della palla per il replay
systems.push({ update(_dt, raw) {
  if (shot.state === 'flying') { juice.recordBall(ball.mesh.position); juice.setSlow(shot.remaining < 0.4) }
  timeScale = juice.update(raw, ball.mesh)
} })

// ---------- modalità ----------
const MODES = { shootout: (o) => createShootout(o), boss: (o) => createShootout({ ...o, boss: true }), sfidaAle: (o) => createSfidaAle(o), passAndPlay: (o) => createPassAndPlay(o), skill: (o) => createSkill(o) }
let mode = null, role = 'idle'
const modeHud = document.createElement('div'); modeHud.className = 'rg-modehud'; modeHud.setAttribute('aria-live', 'polite'); document.getElementById('rg-ui').appendChild(modeHud)
const target = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 32), new THREE.MeshBasicMaterial({ color: 0xF2B705, transparent: true, opacity: .9, side: THREE.DoubleSide, depthTest: false })); target.renderOrder = 8; target.visible = false; scene.add(target)
const xpLog = []
const ctx = {
  role(r) {
    const was = role; role = r; input.setMode(r === 'keeper' ? 'keeper' : 'shooter')
    if (kit && (r === 'keeper') !== (was === 'keeper')) { if (r === 'keeper') setPair(byId(shooterId), keeperData()); else setPair(keeperData(), byId(shooterId)) }
    keeper?.setPlayable(r === 'keeper')
    if (r === 'shooter') { hint.textContent = 'Trascina dal pallone'; hint.hidden = false; rig.goTo('dietroTiratore', { instant: was === 'keeper' }) }
    else if (r === 'keeper') { hint.textContent = 'Trascina verso la zona in cui tuffarti'; hint.hidden = false; rig.goTo('dietroPortiere', { instant: true }) }
    else hint.hidden = true
  },
  setDifficulty(d) { keeper?.setDifficulty(d) },
  hud(t) { modeHud.textContent = t },
  xp(kind) { const n = XP[kind] || 0; xpLog.push({ kind, n }); listeners.forEach((f) => f({ type: 'xp', kind, n })) },
  forceKeeperZone(z) { keeper?.force(z) },
  keeperPassive(on) { keeper?.setPassive(on) },
  showTarget(t) { if (!t) { target.visible = false; return } target.position.set(t.x, t.y, 0.05); target.visible = true },
  pickZone: (o) => pickZone(game.ui, o),
  handoff: (name) => handoff(game.ui, name),
  // Tiro della CPU (l'utente para): tell 200 ms prima (lato vero 60%, finta 40%; in Boss finta 15%), poi il calcio.
  cpuShoot({ strength = 1 } = {}) {
    const boss = keeper?.difficulty === 'boss'
    const early = keeper?.playerDiveZone()
    const aim = cpuAim({ avoidCol: early != null ? early % 3 : null, strength })
    const feint = Math.random() < (boss ? 0.15 : 0.40)
    const side = feint ? -Math.sign(aim.x || 1) : Math.sign(aim.x || 1)
    listeners.forEach((f) => f({ type: 'tell', side, feint }))
    kicker?.tell(side)
    setTimeout(() => {
      const late = keeper?.playerDiveZone()
      const a = (late != null && early == null) ? cpuAim({ avoidCol: late % 3, strength }) : aim
      shot.setPrecision(0.6); shot.fire(a, { timingPerfect: false, delay: kicker ? KICK_DELAY : 0 }); shot.setPrecision(1)
      kicker?.windup()
    }, 200)
  }
}
function startMode(id, opts = {}) {
  if (!MODES[id]) throw new Error('modalità sconosciuta: ' + id)
  mode = MODES[id](opts); mode.start(ctx); mode.nextTurn(ctx)
  listeners.forEach((f) => f({ type: 'modeStart', id }))
  return mode
}
listeners.add((e) => {
  if (!mode) return
  if (e.type === 'result') mode.onResult(e, ctx)
  if (e.type === 'replayEnd') {
    if (mode.finished) { const summary = mode.summary(); const m = mode; mode = null; ctx.role('idle'); listeners.forEach((f) => f({ type: 'modeEnd', id: m.id, summary })) }
    else mode.nextTurn(ctx)
  }
})
systems.push({ update(dt) { if (mode?.tick && !mode.finished) mode.tick(dt, ctx) } })

// ---------- flusso: onboarding → CHI TIRA? → modalità → partita → risultato ----------
const menuBtn = document.createElement('button'); menuBtn.className = 'rg-btn rg-btn--ghost rg-menubtn'; menuBtn.setAttribute('aria-label', 'Menu'); menuBtn.textContent = '≡'; menuBtn.hidden = true
document.getElementById('rg-ui').appendChild(menuBtn)
let flow = 'boot', quitRequested = false
async function runFlow() {
  await kitReady
  ctx.role('idle')
  if (!save.get('onboarded', false)) { flow = 'onboarding'; ctx.role('shooter'); await onboarding(game.ui, () => input.ballOnScreen()); save.set('onboarded', true); ctx.role('idle') }
  while (true) {
    flow = 'chiTira'
    const id = await chiTira(game.ui, ASSETS, { current: shooterId }); if (id) setShooter(id)
    let choice = null
    while (!choice) {
      flow = 'modalita'
      const r = await modalita(game.ui, { bossUnlocked: game.progress?.bossUnlocked?.() ?? false, level: game.progress?.level?.().n ?? 1 })
      if (r.id === '__opzioni') { await opzioni(game.ui, settings, { onChange: applySettings, onReset: () => { save.reset(); toast(game.ui, 'Progressi azzerati') } }); continue }
      if (r.id === '__sblocchi') { await sblocchi(game.ui, game.progress?.summaryForUi?.() || { unlocks: [], achievements: [], level: { n: 1, title: 'Esordiente' } }); continue }
      if (r.id === '__chi') break
      if (!r.id) continue
      choice = r
    }
    if (!choice) continue
    // partita
    let again = true
    while (again) {
      flow = 'gioco'; quitRequested = false; menuBtn.hidden = false
      const xpBefore = game.progress?.xp?.() ?? 0
      const ended = new Promise((res) => { const fn = (e) => { if (e.type === 'modeEnd') { listeners.delete(fn); res(e) } }; listeners.add(fn) })
      startMode(choice.id, choice.opts)
      const e = await Promise.race([ended, new Promise((res) => { const iv = setInterval(() => { if (quitRequested) { clearInterval(iv); res(null) } }, 200) })])
      menuBtn.hidden = true
      if (!e) { mode = null; ctx.role('idle'); shot.reset(); keeper?.reset(); kicker?.reset(); hideEsito(game.ui); rig.goTo('dietroTiratore', { instant: true }); break }
      flow = 'risultato'
      const xpNow = game.progress?.xp?.() ?? 0
      const lv = game.progress?.level?.() || { n: 1, title: 'Esordiente' }
      const r = await risultato(game.ui, { title: titleFor(e), lines: linesFor(e), xpGained: xpNow - xpBefore, xp: xpNow, level: lv, next: game.progress?.next?.() || null, achievements: game.progress?.takeFresh?.() || [], shareText: shareFor(e) })
      again = r === 'again'
    }
  }
}
menuBtn.addEventListener('click', async () => { const v = await overlayMenu(); if (v === 'esci') quitRequested = true })
async function overlayMenu() {
  const { overlay } = await import('./ui/screens/overlay.js')
  const v = await overlay(game.ui, `<h2 class="rg-title">Pausa</h2><div class="rg-row"><button class="rg-btn rg-btn--primary" data-value="continua" aria-label="Continua">Continua</button><button class="rg-btn" data-value="opzioni" aria-label="Opzioni">Opzioni</button><button class="rg-btn rg-btn--ghost" data-value="esci" aria-label="Esci dalla partita">Esci</button></div>`, { label: 'Pausa', closable: true })
  if (v === 'opzioni') { await opzioni(game.ui, settings, { onChange: applySettings, onReset: () => { save.reset(); toast(game.ui, 'Progressi azzerati') } }); return 'continua' }
  return v
}
const NAME = { shootout: 'Shootout', boss: 'Boss: Ale in forma', sfidaAle: 'Sfida Ale', passAndPlay: 'Pass-and-play', skill: 'Skill' }
function titleFor(e) { const s = e.summary; if (e.id === 'shootout' || e.id === 'boss') return s.winner === 'me' ? `Hai vinto ${s.me}–${s.ale}` : `Ale vince ${s.ale}–${s.me}`; if (e.id === 'sfidaAle') return `${s.goals} gol prima di tre parate`; if (e.id === 'skill') return `${s.score} punti`; if (e.id === 'passAndPlay') return `Vince ${s.leaderboard[0].name}`; return NAME[e.id] }
function linesFor(e) { const s = e.summary; if (e.id === 'passAndPlay') return s.leaderboard.map((p, i) => `${i + 1}. ${p.name}: ${p.goals} gol, ${p.saves} parate`); if (e.id === 'sfidaAle') return [`${s.shots} tiri, ${s.goals} gol`]; if (e.id === 'skill') return [`${s.hits} bersagli su ${s.shots} tiri`]; if (e.id === 'shootout' || e.id === 'boss') return [s.suddenDeath ? 'Deciso al sudden death' : `${s.rounds} rigori a testa`]; return [] }
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
window.__rigori = {
  ready: false, game, noFlow: new URLSearchParams(location.search).has('noflow'),
  // Tiro deterministico per la QA: aim = { x, y, power, curve }
  fire: (aim, timingPerfect = false, delay = 0) => { shot.fire(aim, { timingPerfect, delay }); if (delay) kicker?.windup(); else rig.followLook(ball.mesh) },
  setShooter, shooter: () => shooterId, flow: () => flow, settings, applySettings,
  kitReady, startMode, mode: () => mode, role: () => role, xpLog, ctx,
  setPrecision: (v) => shot.setPrecision(v), events, shotState: () => shot.state, lastResult: () => [...events].reverse().find((e) => e.type === 'result')?.result || null,
  info: () => ({ fps: +perf.fps.toFixed(1), level: perf.level, quality: { ...quality }, frames, draws: R.renderer.info.render.calls, tris: R.renderer.info.render.triangles, camera: rig.current })
}

// LoadingManager.onLoad scatta a ogni svuotamento della coda (anche per i volti caricati dopo): parte una volta sola
manager.onLoad = () => {
  if (window.__rigori.ready) return
  const el = document.getElementById('rg-loading'); el.classList.add('rg-loading--out'); setTimeout(() => el.remove(), 500)
  window.__rigori.ready = true
  if (!window.__rigori.noFlow) runFlow()
}
// Se non c'è nulla da caricare il manager non chiama onLoad da solo
setTimeout(() => { if (!window.__rigori.ready) manager.onLoad() }, 4000)
loop()
