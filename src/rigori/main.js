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
<div class="rg-ui" id="rg-ui"></div>`
const stage = document.getElementById('rg-stage')
const manager = new THREE.LoadingManager()
const fill = document.getElementById('rg-loading-fill'), pct = document.getElementById('rg-loading-pct')
manager.onProgress = (_u, loaded, total) => { const f = total ? loaded / total : 1; fill.style.transform = `scaleX(${f})`; pct.textContent = Math.round(f * 100) + '%' }

// ---------- scena ----------
const R = createRenderer(stage)
const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0x0b1020, 90, 260)
const rig = createCameraRig(R.size.w / R.size.h)
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
const ghost = createGhost(scene)
const events = []                      // ultimi eventi del tiro (per QA e per le modalità)
const listeners = new Set()            // le modalità si iscrivono qui (fase 7)
const shot = createShot({ ball, goal, keeper: null, onEvent: (e) => { events.push(e); listeners.forEach((f) => f(e)); onShotEvent(e) } })
const hud = document.createElement('div'); hud.className = 'rg-hud'; hud.innerHTML = `
  <div class="rg-timing" id="rg-timing" hidden aria-hidden="true"><i class="rg-timing__win"></i><b class="rg-timing__cur"></b></div>
  <div class="rg-hint" id="rg-hint">Trascina dal pallone</div>`
document.getElementById('rg-ui').appendChild(hud)
const timingEl = document.getElementById('rg-timing'), timingCur = timingEl.querySelector('.rg-timing__cur'), hint = document.getElementById('rg-hint')
let timingEnabled = true               // opzione (fase 9); ON di default
const input = createInput(stage, { camera: rig.camera, getBallWorld: () => ball.mesh.position, size: R.size, enabled: () => shot.state === 'idle' && window.__rigori.ready })
input.on('start', () => { if (timingEnabled) { timing.start(); timingEl.hidden = false } hint.hidden = true })
input.on('move', (g) => { if (g.ok) ghost.show(aimFromGesture(g, R.size)) })
input.on('end', (g) => {
  ghost.hide(); timing.stop(); timingEl.hidden = true
  if (!g.ok) { hint.hidden = false; return }
  shot.fire(aimFromGesture(g, R.size), { timingPerfect: timingEnabled && timing.perfect })
  rig.followLook(ball.mesh)
})
input.on('reject', () => { hint.hidden = false; hint.classList.remove('rg-hint--pulse'); void hint.offsetWidth; hint.classList.add('rg-hint--pulse') })
function onShotEvent(e) {
  if (e.type === 'goal') { crowd.react('ola'); rig.shake(0.10, 0.35) }
  if (e.type === 'post' || e.type === 'crossbar') rig.shake(0.06, 0.2)
  if (e.type === 'miss') crowd.react('oooh')
  if (e.type === 'result' && e.result === 'save') crowd.react('oooh')
  if (e.type === 'settled') setTimeout(() => { shot.reset(); rig.followLook(null); rig.goTo('dietroTiratore'); hint.hidden = false }, 900)
}
systems.push({ update(dt) { shot.update(dt); timing.update(dt); if (!timingEl.hidden) timingCur.style.left = (timing.value * 100) + '%' } })

// ---------- API interna ed export per QA ----------
export const game = {
  THREE, scene, camera: rig.camera, rig, renderer: R.renderer, ball, goal, crowd, field, stadium, lights, fx, perf, quality, manager, ASSETS, systems, shot, input, timing, listeners,
  set timingEnabled(v) { timingEnabled = !!v }, get timingEnabled() { return timingEnabled },
  setTimeScale(v) { timeScale = v }, get timeScale() { return timeScale }, ui: document.getElementById('rg-ui'), reducedMotion
}
window.__rigori = {
  ready: false, game,
  // Tiro deterministico per la QA: aim = { x, y, power, curve }
  fire: (aim, timingPerfect = false) => { shot.fire(aim, { timingPerfect }); rig.followLook(ball.mesh) },
  events, shotState: () => shot.state, lastResult: () => [...events].reverse().find((e) => e.type === 'result')?.result || null,
  info: () => ({ fps: +perf.fps.toFixed(1), level: perf.level, quality: { ...quality }, frames, draws: R.renderer.info.render.calls, tris: R.renderer.info.render.triangles, camera: rig.current })
}

manager.onLoad = () => {
  const el = document.getElementById('rg-loading'); el.classList.add('rg-loading--out'); setTimeout(() => el.remove(), 500)
  window.__rigori.ready = true
}
// Se non c'è nulla da caricare il manager non chiama onLoad da solo
setTimeout(() => { if (!window.__rigori.ready) manager.onLoad() }, 4000)
loop()
