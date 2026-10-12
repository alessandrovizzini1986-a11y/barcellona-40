// Controlli da tastiera (desktop). Touch e mouse restano quelli di input.js, identici: qui si producono gli STESSI
// parametri del tiro swipe (aim = { x, y, power, curve }, in metri sulla porta e potenza 0,35–1,2) e lo stesso
// tuffo (zona 0–5), e si passano alle stesse funzioni. Nessuna fisica nuova.
//
// Tiro: frecce → mirino nella porta (passo fluido, accelera tenendo premuto); Q / E → effetto a sinistra / destra,
// tre livelli; Spazio tenuto → barra di potenza che oscilla, rilascio → tiro. Potenza ottimale 70–85 % (vale come
// il tempismo perfetto dello swipe); oltre il 95 % il tiro sale, come nello swipe (aimFromGesture).
// Parata: frecce → zona (↑ + ← = angolo alto), Spazio → tuffo; il tempismo è lo stesso dello swipe (playerDive).
// Menu: Invio conferma, Esc pausa/indietro, M audio, H riquadro dei tasti, Tab fra i pulsanti (focus-visible del CSS).
// Il riquadro dei tasti si vede solo su desktop (hover: hover e pointer: fine) e sparisce dopo il primo tiro.
import * as THREE from 'three'

export const LIVELLI_CURVA = [-1, -0.5, 0, 0.5, 1]           // forte sx, media sx, nessuno, media dx, forte dx
export const POTENZA_OK = [0.70, 0.85]                        // finestra "perfetta" della barra
export const PERIODO_BARRA = 1.2                              // s, su e giù
const PASSO = 1.1, ACCEL = 2.2, PASSO_MAX = 3.2               // m/s del mirino: parte lento, accelera tenendo premuto

export function createTastiera({ ui, camera, size, GOAL, guardiaMs = 350, puoTirare, puoTuffarsi, ruolo, tira, tuffa, azioni = {} }) {
  const desktop = (() => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches } catch { return false } })()
  const limX = GOAL.w / 2 * 1.15, limYmin = 0.12, limYmax = GOAL.h * 1.15
  const mira = { x: 0, y: GOAL.h * 0.55 }
  let curva = 2, carica = false, tBarra = 0, prontoDa = 0, tenuto = 0, primoTiroFatto = false
  const giu = new Set()
  // ——— elementi ———
  const mirino = document.createElement('div'); mirino.className = 'rg-mirino'; mirino.hidden = true; mirino.setAttribute('aria-hidden', 'true')
  mirino.innerHTML = `<i class="rg-mirino__c"></i><svg class="rg-mirino__curva" viewBox="0 0 40 24" width="40" height="24" aria-hidden="true"><path d="M4 20 Q 20 2 36 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path class="rg-mirino__punta" d="M30 14 L36 20 L28 22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const barra = document.createElement('div'); barra.className = 'rg-potenza'; barra.hidden = true; barra.setAttribute('role', 'progressbar'); barra.setAttribute('aria-label', 'Potenza')
  barra.innerHTML = `<span class="rg-potenza__track"><i class="rg-potenza__ok"></i><b class="rg-potenza__cur"></b></span><span class="rg-potenza__lab">Potenza</span>`
  const zona = document.createElement('div'); zona.className = 'rg-zona'; zona.hidden = true; zona.setAttribute('aria-hidden', 'true')
  zona.innerHTML = Array.from({ length: 6 }, (_, i) => `<i data-z="${i}"></i>`).join('')
  const aiuto = document.createElement('div'); aiuto.className = 'rg-tasti'; aiuto.hidden = true; aiuto.setAttribute('aria-label', 'Tasti')
  aiuto.innerHTML = `<b>Tastiera</b><span><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> mira · tuffo</span><span><kbd>Q</kbd><kbd>E</kbd> effetto</span><span><kbd>Spazio</kbd> tieni e rilascia: tiro · tuffo</span><span><kbd>Invio</kbd> ok · <kbd>Esc</kbd> pausa · <kbd>M</kbd> audio · <kbd>H</kbd> questo riquadro</span>`
  ui.append(mirino, barra, zona, aiuto)
  const curvaUi = () => { const c = LIVELLI_CURVA[curva]; mirino.classList.toggle('rg-mirino--curva', c !== 0); mirino.classList.toggle('rg-mirino--sx', c < 0); mirino.classList.toggle('rg-mirino--forte', Math.abs(c) === 1) }
  const _v = new THREE.Vector3()
  const piazzaMirino = () => {
    if (mirino.hidden) return
    _v.set(mira.x, mira.y, 0.05); _v.project(camera)
    mirino.style.left = `${(_v.x + 1) / 2 * size.w}px`; mirino.style.top = `${(1 - _v.y) / 2 * size.h}px`
  }
  const barraPct = () => { const ph = (tBarra / PERIODO_BARRA) % 1; return ph < 0.5 ? ph * 2 : 2 - ph * 2 }
  const zonaScelta = () => {
    // la camera è dietro la porta e guarda il dischetto: la destra dello schermo è x < 0, cioè la colonna 0 (come in input.js)
    const col = giu.has('ArrowRight') ? 0 : giu.has('ArrowLeft') ? 2 : 1, row = giu.has('ArrowUp') ? 0 : 1
    return row * 3 + col
  }
  const zonaUi = () => { const z = zonaScelta(); zona.querySelectorAll('i').forEach((i) => i.classList.toggle('rg-zona--on', +i.dataset.z === z)) }
  const mostraAiuto = (on) => { aiuto.hidden = !on }
  const chiudiBarra = () => { carica = false; barra.hidden = true; barra.classList.remove('rg-potenza--ok') }
  // ——— tastiera ———
  const formControl = (t) => /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName) || t?.isContentEditable
  const overlayAperto = () => ui.querySelector('.rg-overlay')
  const keydown = (e) => {
    const t = e.target
    // la barra spaziatrice non deve far scorrere la pagina finché il gioco è aperto (sui pulsanti resta il click nativo)
    if (e.key === ' ' && !formControl(t) && !/^(BUTTON|A)$/.test(t?.tagName)) e.preventDefault()
    if (formControl(t)) return
    const r = ruolo()
    if (e.key === 'h' || e.key === 'H') { if (!e.repeat) mostraAiuto(aiuto.hidden); return }
    if (e.key === 'm' || e.key === 'M') { if (!e.repeat) azioni.musica?.(); return }
    if (e.key === 'Escape') { if (e.repeat) return; const ov = overlayAperto(); const chiudi = ov?.querySelector('.rg-close, [data-back]'); if (chiudi) { chiudi.click(); return } if (!ov) azioni.pausa?.(); return }
    if (e.key === 'Enter') {
      // su un pulsante a fuoco il click nativo basta; altrimenti si conferma il pulsante principale della schermata aperta
      if (/^(BUTTON|A)$/.test(t?.tagName)) return
      const ov = overlayAperto(); if (!ov) return
      const b = ov.querySelector('.rg-btn--primary[data-value], [data-ok], [data-go]:not([disabled]), [data-tira-io], .rg-card--tu, [data-value]:not([disabled]):not(.rg-close)')
      if (b) { e.preventDefault(); b.click() }
      return
    }
    if (overlayAperto()) return // nei menu le frecce e lo spazio non toccano il campo
    if (e.key.startsWith('Arrow')) {
      e.preventDefault(); giu.add(e.key)
      if (r === 'shooter') { if (mirino.hidden) { mirino.hidden = false; piazzaMirino() } }
      else if (r === 'keeper') { zona.hidden = false; zonaUi() }
      return
    }
    if (r === 'shooter' && (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E')) {
      if (e.repeat) return
      curva = Math.max(0, Math.min(LIVELLI_CURVA.length - 1, curva + ((e.key === 'q' || e.key === 'Q') ? -1 : 1)))
      if (mirino.hidden) { mirino.hidden = false; piazzaMirino() }
      curvaUi(); return
    }
    if (e.key === ' ') {
      if (e.repeat) return
      if (performance.now() - prontoDa < guardiaMs) return // guardia anti-ghost: la schermata è appena cambiata
      if (r === 'shooter' && !carica && puoTirare()) { carica = true; tBarra = 0; barra.hidden = false; barra.classList.remove('rg-potenza--ok'); if (mirino.hidden) { mirino.hidden = false; piazzaMirino() }; azioni.inizioCarica?.() }
      else if (r === 'keeper' && puoTuffarsi()) { zona.hidden = false; zonaUi(); tuffa(zonaScelta()) }
    }
  }
  const keyup = (e) => {
    if (e.key.startsWith('Arrow')) { giu.delete(e.key); if (giu.size === 0) tenuto = 0; if (ruolo() === 'keeper') zonaUi(); return }
    if (e.key === ' ' && carica) {
      const pct = barraPct()
      chiudiBarra()
      if (ruolo() !== 'shooter' || !puoTirare()) return // il ruolo può essere cambiato mentre si teneva Spazio
      const power = Math.max(0.35, Math.min(1.2, pct))
      const perfetto = pct >= POTENZA_OK[0] && pct <= POTENZA_OK[1]
      let y = mira.y; if (power > 0.95) y += (power - 0.95) * 4 // come aimFromGesture: oltre il 95 % il tiro sale
      primoTiroFatto = true; mostraAiuto(false)
      tira({ x: mira.x, y, power, curve: LIVELLI_CURVA[curva] }, perfetto)
    }
  }
  const blur = () => { giu.clear(); tenuto = 0; if (carica) chiudiBarra() }
  document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup); window.addEventListener('blur', blur)
  return {
    desktop,
    get carica() { return carica }, get mira() { return { ...mira } }, get curva() { return LIVELLI_CURVA[curva] }, get potenza() { return carica ? barraPct() : null }, get zona() { return zonaScelta() },
    get aiutoVisibile() { return !aiuto.hidden }, mostraAiuto,
    // cambio di ruolo: mirino al centro, effetto a zero, guardia di 350 ms; sul desktop il mirino si vede subito
    ruolo(r) {
      prontoDa = performance.now(); giu.clear(); tenuto = 0; chiudiBarra()
      mira.x = 0; mira.y = GOAL.h * 0.55; curva = 2; curvaUi()
      mirino.hidden = !(desktop && r === 'shooter'); zona.hidden = !(desktop && r === 'keeper'); zonaUi(); piazzaMirino()
      if (desktop && !primoTiroFatto && r !== 'idle') mostraAiuto(true)
      if (r === 'idle') mostraAiuto(false)
    },
    nascondi() { mirino.hidden = true; zona.hidden = true },
    update(dt) {
      const r = ruolo()
      if (r === 'shooter' && giu.size) {
        tenuto += dt
        const v = Math.min(PASSO_MAX, PASSO + ACCEL * tenuto)
        if (giu.has('ArrowLeft')) mira.x -= v * dt
        if (giu.has('ArrowRight')) mira.x += v * dt
        if (giu.has('ArrowUp')) mira.y += v * dt
        if (giu.has('ArrowDown')) mira.y -= v * dt
        mira.x = Math.max(-limX, Math.min(limX, mira.x)); mira.y = Math.max(limYmin, Math.min(limYmax, mira.y))
      }
      if (carica) { tBarra += dt; const pct = barraPct(); barra.querySelector('.rg-potenza__cur').style.bottom = `${pct * 100}%`; barra.classList.toggle('rg-potenza--ok', pct >= POTENZA_OK[0] && pct <= POTENZA_OK[1]) }
      piazzaMirino()
    },
    dispose() { document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur) }
  }
}
