// Mappa Leaflet, caricata lazy solo dalla vista Mappa. Tile CARTO dark, un layerGroup per giorno.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DAY_COLOR, hasCoords, fmtDist, mapsUrl } from '../data.js'
import { distChip } from '../ui/card.js'
import { icon } from '../ui/icons.js'
import { esc } from '../ui/html.js'
import { toast } from '../ui/toast.js'

const TILES = { dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' }

export function createMap(el, stopsByDay, { theme = 'dark' } = {}) {
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
      pts.push(ll); all.push(ll)
      const m = L.marker(ll, { icon: L.divIcon({ className: '', html: `<div class="marker" style="--mc:${DAY_COLOR[key]}"><span>${s.order}</span></div>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] }), alt: s.title, keyboard: true })
      m.bindPopup(`<div class="popup"><p class="popup__title">${esc(s.title)}</p><p class="muted">${s.time} · ${esc(s.venue.name)}</p>${distChip(s)}<br><a class="btn btn--sm" href="${mapsUrl(s)}" target="_blank" rel="noopener">${icon('map-pin')} Maps</a></div>`, { maxWidth: 260 })
      g.addLayer(m)
    })
    if (pts.length > 1) g.addLayer(L.polyline(pts, { color: DAY_COLOR[key].startsWith('var') ? cssVar(DAY_COLOR[key]) : DAY_COLOR[key], weight: 3, opacity: .7 }))
    layers[key] = g
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
    destroy() { map.remove() }
  }
}
function cssVar(expr) {
  const name = expr.match(/var\((--[\w-]+)\)/)?.[1]
  return name ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#E8552E' : expr
}
