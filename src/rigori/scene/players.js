import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import { buildBigHead } from './bighead.js'
import { blobShadowTexture } from './textures.js'
// Kit dei personaggi: un solo modello riggato (manichino Mixamo "Y Bot", in metri) + clip solo-animazione
// dello stesso scheletro. Il manichino è INVISIBILE: fa solo da scheletro per le primitive del big head.
export const BODY_SCALE = 0.7                // corpo piccolo, testa enorme (≈ 40 % dell'altezza)
const CLIP_FILES = {
  keeperIdle: 'keeper_idle.glb', diveL: 'keeper_dive2.glb', diveR: 'keeper_dive.glb', block: 'keeper_block.glb',
  catch: 'keeper_catch.glb', miss: 'keeper_miss.glb', ready: 'keeper_ready.glb', high: 'keeper_high.glb', beaten: 'keeper_beaten.glb',
  kickerIdle: 'kicker_idle.glb', run: 'kicker_run.glb', kick: 'kicker_kick_full.glb'
}
let blobTex = null
export async function loadCharacterKit(ASSETS, manager) {
  const draco = new DRACOLoader(manager); draco.setDecoderPath(ASSETS + 'draco/')
  const loader = new GLTFLoader(manager); loader.setDRACOLoader(draco)
  const load = (f) => new Promise((res, rej) => loader.load(ASSETS + 'models/' + f, res, undefined, rej))
  const base = await load('character.glb')
  const clips = {}
  await Promise.all(Object.entries(CLIP_FILES).map(async ([k, f]) => { const g = await load(f); const c = g.animations[0]; if (c) { c.name = k; clips[k] = c } }))
  base.scene.traverse((o) => { if (o.isMesh) { o.visible = false; o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false } })
  return { base: base.scene, clips }
}
// maglia/numero → corpo; faceUrl → foto sull'emisfero frontale della testa; glove → guantoni (portiere)
export function makeCharacter(kit, { maglia, numero, faceUrl = null, glove = false, manager = undefined }) {
  const group = new THREE.Group()
  const model = skeletonClone(kit.base)
  // Il wrapper porta la scala: i controller usano model.scale.x = ±1 per specchiare, e continuano a funzionare
  const scaler = new THREE.Group(); scaler.scale.setScalar(BODY_SCALE); scaler.add(model); group.add(scaler)
  const mixer = new THREE.AnimationMixer(model)
  const actions = {}
  for (const [k, c] of Object.entries(kit.clips)) { const a = mixer.clipAction(c); a.clampWhenFinished = true; actions[k] = a }
  group.updateMatrixWorld(true)
  const big = buildBigHead(model, { maglia, numero, glove, manager, faceUrl })
  // Ombra di contatto morbida sotto i piedi (segue i fianchi), al posto delle ombre dure
  blobTex = blobTex || blobShadowTexture()
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 1 }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; shadow.renderOrder = 1; group.add(shadow)
  const hips = model.getObjectByName('mixamorigHips')
  const _hp = new THREE.Vector3(); let hipsBase = null
  let current = null
  return {
    group, model, mixer, actions, big, shadow,
    play(name, { loop = false, fade = 0.15, timeScale = 1, from = 0 } = {}) {
      const a = actions[name]; if (!a) return null
      a.reset(); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); a.timeScale = timeScale; a.time = from; a.enabled = true
      if (current && current !== a) { current.crossFadeTo(a, fade, false) }
      a.fadeIn(fade).play(); current = a
      return a
    },
    // inclinazione del busto (tell del tiratore): x in [-1, 1]
    setLean(x) { model.rotation.z = -x * 0.18 },
    update(dt) {
      mixer.update(dt)
      if (big) { group.updateMatrixWorld(true); big.update() }
      if (hips) {
        hips.getWorldPosition(_hp); group.worldToLocal(_hp)
        if (hipsBase == null) hipsBase = _hp.y
        shadow.position.x = _hp.x; shadow.position.z = _hp.z
        const lift = Math.max(0, _hp.y - hipsBase + group.position.y)
        const s = Math.max(0.45, 1 - lift * 0.7); shadow.scale.setScalar(s); shadow.material.opacity = s
      }
    }
  }
}
