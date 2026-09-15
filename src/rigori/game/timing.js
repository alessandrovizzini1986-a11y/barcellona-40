// Timing bar: un cursore che oscilla; il rilascio nella finestra centrale (18%) è "perfetto".
// DA VERIFICARE: periodo di 1,1 s scelto da me.
export function createTiming({ period = 1.1, window: win = 0.18 } = {}) {
  let t = 0, running = false
  return {
    get value() { const ph = (t / period) % 1; return ph < 0.5 ? ph * 2 : 2 - ph * 2 }, // triangolare 0→1→0
    get perfect() { return Math.abs(this.value - 0.5) <= win / 2 },
    start() { t = Math.random() * period; running = true }, stop() { running = false },
    get running() { return running },
    update(dt) { if (running) t += dt }
  }
}
