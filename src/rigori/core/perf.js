// Misura gli fps e abbassa la qualità a gradini sotto la soglia: bloom → ombre → particelle → pubblico.
// DA VERIFICARE: finestra di 2 s e soglia 45 fps come da prompt; l'isteresi di risalita (55 fps per 6 s) è una mia scelta.
export function createPerf({ onDegrade, onRestore, threshold = 45 } = {}) {
  const STEPS = ['bloom', 'shadows', 'particles', 'crowd']
  let frames = 0, acc = 0, fps = 60, level = 0, goodTime = 0, locked = false
  return {
    get fps() { return fps }, get level() { return level }, STEPS,
    lock(v) { locked = !!v }, // qualità impostata a mano dalle opzioni: niente automatismi
    tick(dt) {
      frames++; acc += dt
      if (acc < 2) return
      fps = frames / acc; frames = 0; acc = 0
      if (locked) return
      if (fps < threshold && level < STEPS.length) { onDegrade?.(STEPS[level], fps); level++; goodTime = 0 }
      else if (fps > 55 && level > 0) { goodTime += 2; if (goodTime >= 6) { level--; onRestore?.(STEPS[level], fps); goodTime = 0 } }
      else goodTime = 0
    }
  }
}
