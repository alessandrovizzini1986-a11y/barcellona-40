import { NodeIO } from '@gltf-transform/core'
import { statSync } from 'node:fs'
const io = new NodeIO()
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f); const r = doc.getRoot()
  const anims = r.listAnimations().map(a => { const s = a.listSamplers(); let max = 0; for (const x of s) { const t = x.getInput().getArray(); max = Math.max(max, t[t.length - 1]) } return `${a.getName() || '(senza nome)'}[${max.toFixed(2)}s]` })
  const tex = r.listTextures().map(t => { const sz = t.getSize(); return `${t.getName() || 'tex'} ${sz ? sz.join('x') : '?'} ${t.getMimeType()}` })
  const skins = r.listSkins().length, meshes = r.listMeshes().length
  let verts = 0; for (const m of r.listMeshes()) for (const p of m.listPrimitives()) verts += p.getAttribute('POSITION')?.getCount() || 0
  console.log(`${f.split('/').pop()} ${Math.round(statSync(f).size/1024)}KB · mesh ${meshes} · skin ${skins} · vertici ${verts} · anim: ${anims.join(', ') || 'nessuna'} · tex: ${tex.join(', ') || 'nessuna'}`)
}
