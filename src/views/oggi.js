export async function render(root, ctx) {
  root.innerHTML = ctx.header() + '<section class="view"><p class="muted">Vista oggi in costruzione.</p></section>'
  return null
}
