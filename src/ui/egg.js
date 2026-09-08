// Easter egg: pointerdown per 2 s sul titolo → 40 tessere che si riordinano nel numero "40" + confetti
import { big as confettiBig } from './confetti.js'
const COLORS = ['#E8552E', '#2CA6A4', '#F2B705', '#3D5A80', '#F2E9DE']
// Griglia 12x6: celle che compongono "40" (col,row)
const FOUR = [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[3,0],[3,1],[3,2],[3,4],[3,5],[1,2],[2,2],[0,4],[2,1],[1,1],[2,4],[1,4],[4,3]]
const ZERO = [[7,0],[8,0],[9,0],[10,0],[6,1],[6,2],[6,3],[6,4],[7,5],[8,5],[9,5],[10,5],[11,1],[11,2],[11,3],[11,4],[7,1],[10,1],[7,4],[10,4]]
const CELLS = [...FOUR, ...ZERO] // 40 tessere

export function easterEgg(el) {
  if (!el || el.dataset.egg) return
  el.dataset.egg = '1'
  let timer = null
  const start = () => { clearTimeout(timer); timer = setTimeout(show, 2000) }
  const stop = () => clearTimeout(timer)
  el.addEventListener('pointerdown', start)
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, stop)
  el.addEventListener('contextmenu', (e) => e.preventDefault())
}

function show() {
  if (document.querySelector('.egg')) return
  const egg = document.createElement('div')
  egg.className = 'egg'
  egg.setAttribute('role', 'dialog')
  egg.setAttribute('aria-label', 'Quaranta')
  const grid = document.createElement('div')
  grid.className = 'egg__grid'
  const tiles = CELLS.map((_, i) => {
    const t = document.createElement('div')
    t.className = 'egg__tile'
    t.style.background = COLORS[i % COLORS.length]
    t.style.left = `${Math.random() * 92}%`
    t.style.top = `${Math.random() * 92}%`
    t.style.transform = `rotate(${(Math.random() - .5) * 90}deg)`
    t.style.setProperty('--d', `${i * 18}ms`)
    grid.appendChild(t)
    return t
  })
  const cap = document.createElement('div')
  cap.className = 'egg__caption'
  cap.textContent = 'Zero fatica, tutto gusto'
  egg.append(grid, cap)
  egg.addEventListener('click', () => egg.remove())
  document.body.appendChild(egg)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    tiles.forEach((t, i) => {
      const [c, r] = CELLS[i]
      t.style.left = `${c * 8.33}%`
      t.style.top = `${r * 15.5}%`
      t.style.transform = `rotate(${(i % 2 ? 1 : -1) * 6}deg)`
    })
    setTimeout(confettiBig, 500)
  }))
  setTimeout(() => egg.remove(), 6000)
}
