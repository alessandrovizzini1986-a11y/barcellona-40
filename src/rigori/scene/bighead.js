import * as THREE from 'three'
import { bodyTexture, headTexture } from './textures.js'
// Personaggio "big head" costruito con primitive attaccate alle ossa del manichino (che resta invisibile e fa
// solo da scheletro per le animazioni). Testa enorme, corpo tozzo, colori piatti e saturi. Scelta di design:
// riferimento Head Ball 2 / personaggi Kenney. Nessuno stemma, nessuno sponsor.
export const HEAD_R = 0.32                  // raggio della testa nel mondo (≈ 2,5× una testa normale)
export const SKIN = '#C8956D'
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0)
const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...extra })
// Capsula tra due punti espressi nello spazio locale dell'osso a cui viene attaccata
function capsule(bone, from, to, radius, mat, { start = 0, end = 1, radial = 10, caps = 3 } = {}) {
  const a = from.clone().lerp(to, start), b = from.clone().lerp(to, end)
  const dir = b.clone().sub(a), len = dir.length()
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.001, len), caps, radial), mat)
  m.position.copy(a).addScaledVector(dir, 0.5)
  m.quaternion.setFromUnitVectors(UP, dir.normalize())
  bone.add(m); return m
}
const localOf = (bone, target, v = new THREE.Vector3()) => { target.getWorldPosition(v); return bone.worldToLocal(v) }
export function buildBigHead(model, { maglia, numero, glove = false, skin = SKIN, manager, faceUrl } = {}) {
  const bone = (n) => model.getObjectByName('mixamorig' + n)
  const B = {}
  for (const n of ['Hips', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']) B[n] = bone(n)
  if (!B.Head || !B.Hips) { console.warn('Scheletro incompleto: big head non costruito'); return null }
  model.updateMatrixWorld(true)
  const worldScale = B.Head.getWorldScale(_a).y || 1        // le primitive vivono nello spazio delle ossa
  const primary = maglia.tipo === 'strisce' ? maglia.colori[0] : maglia.colore
  const secondary = maglia.tipo === 'strisce' ? maglia.colori[1] : maglia.colore
  const M = {
    skin: flat(skin), jersey: new THREE.MeshStandardMaterial({ map: bodyTexture(maglia, numero), roughness: .85, metalness: 0 }),
    sleeve: flat(primary), shorts: flat('#1B2A4A'), sock: flat(secondary), shoe: flat('#15161A', { roughness: .5 }),
    glove: flat('#F2E9DE', { roughness: .7 })
  }
  const parts = [], mani = {} // i guanti servono al portiere per sapere dove ha le mani
  // Busto: capsula corta e tozza tra i fianchi e il collo, attaccata a Spine1. La texture gira attorno (u=0,25 davanti).
  const hips = localOf(B.Spine1, B.Hips), neck = localOf(B.Spine1, B.Neck)
  const torso = capsule(B.Spine1, hips, neck, 0.20, M.jersey, { start: -0.15, end: 0.92, radial: 24, caps: 6 })
  // orienta la capsula così che l'u=0,25 (davanti) guardi +z del modello
  { const fwd = _b.set(0, 0, 1); B.Spine1.getWorldQuaternion(_q); model.getWorldQuaternion(_q2); fwd.applyQuaternion(_q2).applyQuaternion(_q.invert()) // avanti nello spazio dell'osso
    // la capsula ha u=0,25 verso +z locale (come la sfera): ruoto attorno all'asse hips→neck finché +z guarda avanti
    const axis = neck.clone().sub(hips).normalize(); const f = fwd.clone().projectOnPlane(axis).normalize()
    const zLocal = new THREE.Vector3(0, 0, 1).applyQuaternion(torso.quaternion).projectOnPlane(axis).normalize()
    let ang = Math.acos(THREE.MathUtils.clamp(zLocal.dot(f), -1, 1)); if (zLocal.clone().cross(f).dot(axis) < 0) ang = -ang
    torso.quaternion.premultiply(_q2.setFromAxisAngle(axis, ang)) }
  parts.push(torso)
  // Collo
  parts.push(capsule(B.Neck, new THREE.Vector3(), localOf(B.Neck, B.Head), 0.055, M.skin, { radial: 8 }))
  // Testa: sfera enorme, faccia sull'emisfero frontale, retro color pelle. Ruota col corpo (niente billboard).
  const ht = headTexture(skin)
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R / worldScale, 32, 24), new THREE.MeshStandardMaterial({ map: ht.texture, roughness: .7, metalness: 0, emissive: 0xffffff, emissiveMap: ht.texture, emissiveIntensity: 0.28 })) // leggera auto-illuminazione: il volto si legge anche in controluce
  { const top = localOf(B.Head, B.HeadTop_End); head.position.copy(top).multiplyScalar(0.55)
    // frame della sfera = frame del modello (u=0,25 della sfera guarda +z locale del modello)
    B.Head.getWorldQuaternion(_q); model.getWorldQuaternion(_q2); head.quaternion.copy(_q.invert().multiply(_q2)) }
  B.Head.add(head); parts.push(head)
  if (faceUrl) new THREE.ImageLoader(manager).load(faceUrl, (img) => ht.draw(img), undefined, () => console.warn('Volto non caricato:', faceUrl))
  // Braccia: manica (colore maglia) + avambraccio pelle + mano (guantone per il portiere)
  for (const s of ['Left', 'Right']) {
    const arm = B[s + 'Arm'], fore = B[s + 'ForeArm'], hand = B[s + 'Hand']
    parts.push(capsule(arm, new THREE.Vector3(), localOf(arm, fore), 0.065, M.sleeve, { start: -0.1, end: 1 }))
    parts.push(capsule(fore, new THREE.Vector3(), localOf(fore, hand), 0.05, M.skin))
    const h = new THREE.Mesh(new THREE.SphereGeometry(glove ? 0.12 : 0.07, glove ? 14 : 10, glove ? 10 : 8), glove ? M.glove : M.skin)
    h.position.copy(localOf(hand, fore)).multiplyScalar(-0.12); hand.add(h); parts.push(h); mani[s] = h
    // Gambe: pantaloncino sulla metà alta della coscia, coscia pelle, calzettone sullo stinco, scarpa nera
    const up = B[s + 'UpLeg'], leg = B[s + 'Leg'], foot = B[s + 'Foot'], toe = B[s + 'ToeBase']
    const knee = localOf(up, leg)
    parts.push(capsule(up, new THREE.Vector3(), knee, 0.10, M.shorts, { start: -0.12, end: 0.52, radial: 12 }))
    parts.push(capsule(up, new THREE.Vector3(), knee, 0.065, M.skin, { start: 0.3, end: 1 }))
    parts.push(capsule(leg, new THREE.Vector3(), localOf(leg, foot), 0.06, M.sock, { start: 0.05, end: 1 }))
    parts.push(capsule(foot, new THREE.Vector3(), localOf(foot, toe), 0.075, M.shoe, { start: -0.25, end: 1.35, radial: 10 }))
  }
  for (const p of parts) { p.castShadow = false; p.receiveShadow = false; p.frustumCulled = false }
  // La testa segue l'osso ma resta quasi dritta: 70 % verticale (frame del modello), 30 % inclinazione dell'animazione.
  // Con una testa così grande un capo chino guarderebbe per terra.
  const _bq = new THREE.Quaternion(), _mq = new THREE.Quaternion(), _d = new THREE.Quaternion()
  const update = () => {
    B.Head.getWorldQuaternion(_bq); model.getWorldQuaternion(_mq)
    _d.copy(_mq).slerp(_bq, 0.3)
    head.quaternion.copy(_bq.invert().multiply(_d))
  }
  return { parts, head, mani, materials: M, setFace: (img) => ht.draw(img), update }
}
