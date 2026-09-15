import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
// Bloom (solo fari e luci: soglia alta) + vignettatura al 35 % sui bordi. Disattivabile: spento si renderizza diretto.
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 p = (vUv - 0.5) * vec2(1.0, 1.25); float d = length(p);
    float v = 1.0 - amount * smoothstep(0.42, 0.95, d); gl_FragColor = vec4(c.rgb * v, c.a); }`
}
export function createPostFx(renderer, scene, camera, size) {
  let composer = null, bloom = null, enabled = false
  const build = () => {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.4, 0.6, 0.85)
    composer.addPass(bloom)
    composer.addPass(new ShaderPass(VignetteShader))
    composer.addPass(new OutputPass())
  }
  return {
    get enabled() { return enabled },
    setEnabled(on) { enabled = !!on; if (enabled && !composer) build() },
    resize(w, h) { composer?.setSize(w, h) },
    render() { if (enabled && composer) composer.render(); else renderer.render(scene, camera) }
  }
}
