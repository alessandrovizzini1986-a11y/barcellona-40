import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import { jerseyTexture } from './textures.js'
// Kit dei personaggi: un solo modello riggato (manichino Mixamo "Y Bot", in metri) + clip solo-animazione
// dello stesso scheletro. Maglia = colore del materiale + pannelli (petto e schiena) con strisce e numero.
const CLIP_FILES = {
  keeperIdle: 'keeper_idle.glb', diveL: 'keeper_dive2.glb', diveR: 'keeper_dive.glb', block: 'keeper_block.glb',
  catch: 'keeper_catch.glb', miss: 'keeper_miss.glb', ready: 'keeper_ready.glb', high: 'keeper_high.glb', beaten: 'keeper_beaten.glb',
  kickerIdle: 'kicker_idle.glb', run: 'kicker_run.glb', kick: 'kicker_kick_full.glb'
}
export async function loadCharacterKit(ASSETS, manager) {
  const draco = new DRACOLoader(manager); draco.setDecoderPath(ASSETS + 'draco/')
  const loader = new GLTFLoader(manager); loader.setDRACOLoader(draco)
  const load = (f) => new Promise((res, rej) => loader.load(ASSETS + 'models/' + f, res, undefined, rej))
  const base = await load('character.glb')
  const clips = {}
  await Promise.all(Object.entries(CLIP_FILES).map(async ([k, f]) => { const g = await load(f); const c = g.animations[0]; if (c) { c.name = k; clips[k] = c } }))
  base.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false } })
  return { base: base.scene, clips }
}
export function loadFace(ASSETS, path, manager) {
  const t = new THREE.TextureLoader(manager).load(ASSETS + path); t.colorSpace = THREE.SRGBColorSpace; return t
}
export function makeCharacter(kit, { maglia, numero, faceTexture, faceScale = 0.46, faceLift = 0.06 }) {
  const group = new THREE.Group()
  const model = skeletonClone(kit.base)
  const primary = maglia.tipo === 'strisce' ? maglia.colori[0] : maglia.colore
  model.traverse((o) => {
    if (!o.isMesh) return
    o.material = o.material.clone(); o.material.roughness = 0.75; o.material.metalness = 0
    o.material.color.set(/Surface/i.test(o.name) ? primary : '#232830') // corpo con la maglia, giunture scure
  })
  group.add(model)
  const mixer = new THREE.AnimationMixer(model)
  const actions = {}
  for (const [k, c] of Object.entries(kit.clips)) { const a = mixer.clipAction(c); a.clampWhenFinished = true; actions[k] = a }
  // Volto: sprite sull'osso della testa, sempre rivolto alla camera
  const head = model.getObjectByName('mixamorig:Head'), spine = model.getObjectByName('mixamorig:Spine2')
  // Il volto vive nello spazio mondo (non figlio dell'osso): segue la testa a ogni frame e non finisce mai dietro la mesh
  let faceSprite = null
  const headPos = new THREE.Vector3()
  if (faceTexture && head) {
    faceSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTexture, transparent: true, depthWrite: false, depthTest: false }))
    faceSprite.scale.set(faceScale, faceScale, 1); faceSprite.renderOrder = 30
    group.add(faceSprite)
  }
  // Pannelli maglia: schiena con numero, petto con le strisce (senza numero). Nessuno stemma.
  if (spine) {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.36), new THREE.MeshStandardMaterial({ map: jerseyTexture(maglia, numero), roughness: .8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }))
    back.position.set(0, 0.10, -0.12); back.rotation.y = Math.PI; spine.add(back)
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.30), new THREE.MeshStandardMaterial({ map: jerseyTexture(maglia, ''), roughness: .8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }))
    front.position.set(0, 0.08, 0.13); spine.add(front)
  }
  let current = null
  return {
    group, model, mixer, actions, faceSprite,
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
      if (faceSprite && head) { head.getWorldPosition(headPos); group.worldToLocal(headPos); faceSprite.position.set(headPos.x, headPos.y + faceLift, headPos.z) }
    }
  }
}
