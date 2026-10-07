// Mappa Leaflet, caricata lazy solo dalla vista Mappa. Tile CARTO dark, un layerGroup per giorno.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DAY_COLOR, hasCoords, fmtDist, mapsUrl } from '../data.js'
import { distChip, etichettaOra } from '../ui/card.js'
import { icon } from '../ui/icons.js'
import { esc } from '../ui/html.js'
import { toast } from '../ui/toast.js'

// Chiave CARTO Basemaps (raster, gratuita fino a 5M tile/mese): senza chiave i tile mostrano la filigrana "API key required".
// Attribution CARTO + OpenStreetMap sempre visibile: è la condizione del piano gratuito.
const CARTO_KEY = 'cb1_31r6_1_0b27de76f374107fbc8f7c13'
const TILES = {
  dark: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
  light: `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
}

export function createMap(el, stopsByDay, { theme = 'dark', bagni = [], onBagno = null } = {}) {
  const map = L.map(el, { preferCanvas: true, zoomControl: false, attributionControl: false, tap: false })
  L.control.zoom({ position: 'bottomleft' }).addTo(map)
  L.control.attribution({ prefix: false }).addTo(map)
  L.tileLayer(TILES[theme] || TILES.dark, { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19, subdomains: 'abcd' }).addTo(map)
  const layers = {}
  const all = []
  for (const [key, stops] of Object.entries(stopsByDay)) {
    const g = L.layerGroup()
    const pts = []
    stops.filter(hasCoords).forEach((s) => {
      const ll = [s.venue.lat, s.venue.lng]
      // Le tappe opzionali si vedono sulla mappa ma restano fuori dalla linea del giro e non hanno
      // un numero: il tracciato del giorno non passa di lì se non si decide di andarci.
      const opz = s.time == null
      if (!opz) pts.push(ll)
      all.push(ll)
      const m = L.marker(ll, { icon: L.divIcon({ className: '', html: `<div class="marker${opz ? ' marker--opz' : ''}" style="--mc:${DAY_COLOR[key]}">${opz ? '' : `<span>${s.order}</span>`}</div>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] }), alt: s.title, keyboard: true })
      m.bindPopup(`<div class="popup"><p class="popup__title">${esc(s.title)}</p><p class="muted">${esc(etichettaOra(s))} · ${esc(s.venue.name)}</p>${distChip(s)}<br><a class="btn btn--sm" href="${mapsUrl(s)}" target="_blank" rel="noopener">${icon('map-pin')} Maps</a></div>`, { maxWidth: 260 })
      g.addLayer(m)
    })
    if (pts.length > 1) g.addLayer(L.polyline(pts, { color: DAY_COLOR[key].startsWith('var') ? cssVar(DAY_COLOR[key]) : DAY_COLOR[key], weight: 3, opacity: .7 }))
    layers[key] = g
  }
  // Layer "Bagni": marker blu con l'icona del bagno, nessuna linea, nessun numero; il tap apre il pannello
  // del bagno (non un popup). Non entra in fit(): la mappa si inquadra sulle tappe, non sui bagni.
  if (bagni.length) {
    const g = L.layerGroup()
    bagni.filter((b) => b.lat != null && b.lng != null).forEach((b) => {
      const m = L.marker([b.lat, b.lng], { icon: L.divIcon({ className: '', html: `<div class="marker marker--bagno" data-bagno-marker="${esc(b.id)}">${icon('bath')}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }), alt: `Bagno: ${b.nome}`, keyboard: true })
      m.on('click', () => onBagno?.(b.id))
      g.addLayer(m)
    })
    layers.bagni = g
  }
  if (all.length) map.fitBounds(L.latLngBounds(all).pad(.15)); else map.setView([41.39, 2.17], 13)

  let me = null
  return {
    map, layers,
    show(key, on) { if (!layers[key]) return; on ? layers[key].addTo(map) : map.removeLayer(layers[key]) },
    fit(keys) {
      const pts = keys.flatMap((k) => (stopsByDay[k] || []).filter(hasCoords).map((s) => [s.venue.lat, s.venue.lng]))
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(.15))
    },
    locate() {
      if (!('geolocation' in navigator)) { toast('Posizione non disponibile, apri Google Maps'); return }
      navigator.geolocation.getCurrentPosition((pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude]
        if (me) me.setLatLng(ll)
        else me = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="marker marker--me" aria-hidden="true"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), alt: 'La tua posizione' }).addTo(map)
        map.setView(ll, Math.max(map.getZoom(), 15))
        toast('Eccoti. Sei qui.')
      }, () => toast('Posizione non disponibile, apri Google Maps'), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 })
    },
    // Smontaggio completo. map.remove() da solo non basta: lo zoom con la rotella resta in coda su un timer
    // (wheelDebounceTime) e lo zoom animato aspetta il transitionend del proxy; se la pagina cambia in quel
    // momento tutti e due tornano a cercare i pannelli che non ci sono più ("_leaflet_pos" del report).
    destroy() {
      try { clearTimeout(map.scrollWheelZoom?._timer); map.scrollWheelZoom?.disable() } catch { /* handler già via */ }
      try { map.dragging?.disable() } catch { /* un trascinamento a metà si chiude qui */ }
      try { map.stop(); map._animatingZoom = false } catch { /* nessuna animazione in corso */ }
      // prima le linee e i marker, poi la mappa: così il renderer canvas è ancora vivo quando le linee chiedono
      // l'ultimo ridisegno, e quel ridisegno lo cancella lui stesso uscendo (altrimenti: "clearRect" su un contesto sparito)
      for (const g of Object.values(layers)) { try { map.removeLayer(g) } catch { /* già via */ } }
      // Il renderer canvas ha quasi sempre un ridisegno in coda (requestAnimationFrame). map.remove() lo cancella,
      // ma se la pagina cambia dentro una view transition (frame congelati) quel frame parte lo stesso dopo la
      // rimozione e cerca un contesto che non c'è più ("clearRect" del report). Il frame chiama _redraw già
      // legato all'istanza, quindi si svuotano i metodi che userebbe: un ridisegno in ritardo non fa niente.
      const renderer = [map._renderer, ...Object.values(map._paneRenderers || {})].filter(Boolean)
      map.remove()
      for (const r of renderer) { r._clear = () => {}; r._draw = () => {}; r._redraw = () => {}; r._requestRedraw = () => {}; r._update = () => {} }
    }
  }
}
function cssVar(expr) {
  const name = expr.match(/var\((--[\w-]+)\)/)?.[1]
  return name ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#E8552E' : expr
}
