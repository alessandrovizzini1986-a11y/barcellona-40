import * as THREE from 'three'
// WebGLRenderer con pixel ratio limitato a 2, resize, ombre solo dove servono, hook di qualità
export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.setAttribute('aria-hidden', 'true')
  container.appendChild(renderer.domElement)
  const size = { w: 1, h: 1 }
  const resize = () => {
    size.w = container.clientWidth || window.innerWidth; size.h = container.clientHeight || window.innerHeight
    renderer.setSize(size.w, size.h, false)
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'
  }
  resize()
  window.addEventListener('resize', resize)
  return {
    renderer, size, resize,
    setShadows(on) { renderer.shadowMap.enabled = !!on; renderer.shadowMap.needsUpdate = true },
    setPixelRatio(r) { renderer.setPixelRatio(Math.min(r, 2)); resize() },
    dispose() { window.removeEventListener('resize', resize); renderer.dispose() }
  }
}
