// Router hash: #/oggi #/programma #/mappa #/missioni #/info #/speedrun (default #/oggi)
const ROUTES = ['oggi', 'programma', 'mappa', 'missioni', 'info', 'speedrun']
let handler = null

export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#\/?/, '')
  const [pathPart, queryPart] = h.split('?')
  const [route, ...rest] = pathPart.split('/')
  const params = new URLSearchParams(queryPart || '')
  return { route: ROUTES.includes(route) ? route : 'oggi', sub: rest.join('/'), params }
}

export function navigate(route, sub) {
  const target = `#/${route}${sub ? '/' + sub : ''}`
  if (location.hash === target) { render(); return }
  location.hash = target
}

function render() {
  if (!handler) return
  const info = parseHash()
  const doRender = () => handler(info)
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(doRender)
  } else doRender()
}

export function startRouter(fn) {
  handler = fn
  addEventListener('hashchange', render)
  render()
}
export { ROUTES }
