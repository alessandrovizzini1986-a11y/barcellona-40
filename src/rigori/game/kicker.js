import * as THREE from 'three'
// Tiratore: stesso manichino del portiere, di spalle alla camera, rincorsa e calcio sincronizzati col volo.
// Le clip Mixamo: idle (10,5 s), corsa in place (0,83 s), calcio (1,5 s, contatto piede-palla a ~0,62 s come nel legacy).
// DA VERIFICARE: posizioni di attesa e di calcio a occhio.
const STANCE = new THREE.Vector3(0.55, 0, 12.7)   // dove aspetta, in diagonale
const PLANT = new THREE.Vector3(0.18, 0, 11.32)   // piede d'appoggio accanto al pallone
const KICK_FROM = 0.37, KICK_CONTACT = 0.62        // s nella clip
export const KICK_DELAY = 0.5                      // s dal gesto al distacco della palla (rincorsa 0,25 + calcio 0,25)
export function createKicker(char) {
  const g = char.group
  g.position.copy(STANCE); g.rotation.y = Math.PI // il manichino guarda +z: girato verso la porta
  let phase = 'idle', t = 0, lean = 0, celeb = null
  const idle = () => { phase = 'idle'; char.play('kickerIdle', { loop: true, fade: 0.25 }); g.position.copy(STANCE); g.rotation.y = Math.PI; g.position.y = 0 }
  idle()
  return {
    group: g, char,
    get phase() { return phase },
    // Tell (tiratore CPU): inclinazione verso il lato che "annuncia", 200 ms prima del calcio
    tell(side) { lean = side; char.setLean(side) },
    // Rincorsa e calcio: la palla parte quando arriva 'kick' (KICK_DELAY dopo)
    windup() { phase = 'run'; t = 0; char.play('run', { loop: true, fade: 0.08, timeScale: 1.6 }) },
    onKick() { phase = 'kick'; char.play('kick', { fade: 0.05, from: KICK_FROM, timeScale: 1.0 }); char.setLean(0); lean = 0 },
    // Esultanza (gol) o delusione (fuori/parata): procedurale, non ci sono clip dedicate
    react(result) {
      celeb = { t: 0, kind: result === 'goal' ? 'gol' : 'no' }
      if (result === 'goal') { g.rotation.y = 0 } // si gira verso la camera
    },
    reset() { celeb = null; idle() },
    update(dt) {
      char.update(dt)
      if (phase === 'run') { t += dt; const k = Math.min(1, t / 0.25); g.position.lerpVectors(STANCE, PLANT, k * k * (3 - 2 * k)) }
      if (celeb) {
        celeb.t += dt
        if (celeb.kind === 'gol') { g.position.y = Math.abs(Math.sin(celeb.t * 9)) * 0.28 * Math.max(0, 1 - celeb.t / 2.2); if (celeb.t > 2.4) celeb = null }
        else { char.setLean(Math.min(0.8, celeb.t) * 0.6); if (celeb.t > 2) { celeb = null; char.setLean(0) } }
      }
    }
  }
}
