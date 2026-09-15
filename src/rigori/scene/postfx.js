import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
// Bloom leggero, disattivabile: quando è spento si renderizza direttamente (nessun costo)
export function createPostFx(renderer, scene, camera, size) {
  let composer = null, bloom = null, enabled = false
  const build = () => {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.16, 0.5, 0.96) // DA VERIFICARE: intensità a occhio
    composer.addPass(bloom); composer.addPass(new OutputPass())
  }
  return {
    get enabled() { return enabled },
    setEnabled(on) { enabled = !!on; if (enabled && !composer) build() },
    resize(w, h) { composer?.setSize(w, h) },
    render() { if (enabled && composer) composer.render(); else renderer.render(scene, camera) }
  }
}
