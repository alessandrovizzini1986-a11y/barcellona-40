// Icone Lucide come stringhe SVG (tree-shaking: solo quelle importate)
import createElement from 'lucide/dist/esm/createElement.mjs'
import Sun from 'lucide/dist/esm/icons/sun.mjs'
import List from 'lucide/dist/esm/icons/list.mjs'
import MapIcon from 'lucide/dist/esm/icons/map.mjs'
import Trophy from 'lucide/dist/esm/icons/trophy.mjs'
import Info from 'lucide/dist/esm/icons/info.mjs'
import MapPin from 'lucide/dist/esm/icons/map-pin.mjs'
import CarTaxiFront from 'lucide/dist/esm/icons/car-taxi-front.mjs'
import TrainFront from 'lucide/dist/esm/icons/train-front.mjs'
import Copy from 'lucide/dist/esm/icons/copy.mjs'
import Check from 'lucide/dist/esm/icons/check.mjs'
import AlarmClock from 'lucide/dist/esm/icons/alarm-clock.mjs'
import Locate from 'lucide/dist/esm/icons/locate.mjs'
import TriangleAlert from 'lucide/dist/esm/icons/triangle-alert.mjs'
import ChevronDown from 'lucide/dist/esm/icons/chevron-down.mjs'
import Footprints from 'lucide/dist/esm/icons/footprints.mjs'
import Zap from 'lucide/dist/esm/icons/zap.mjs'
import Download from 'lucide/dist/esm/icons/download.mjs'
import Upload from 'lucide/dist/esm/icons/upload.mjs'
import Sparkles from 'lucide/dist/esm/icons/sparkles.mjs'
import User from 'lucide/dist/esm/icons/user.mjs'
import Phone from 'lucide/dist/esm/icons/phone.mjs'
import Clock from 'lucide/dist/esm/icons/clock.mjs'
import X from 'lucide/dist/esm/icons/x.mjs'
import RefreshCw from 'lucide/dist/esm/icons/refresh-cw.mjs'
import Camera from 'lucide/dist/esm/icons/camera.mjs'
import Share2 from 'lucide/dist/esm/icons/share-2.mjs'
import Disc3 from 'lucide/dist/esm/icons/disc-3.mjs'
import Music from 'lucide/dist/esm/icons/music.mjs'
import MessageCircle from 'lucide/dist/esm/icons/message-circle.mjs'
import Goal from 'lucide/dist/esm/icons/goal.mjs'
import PlaneTakeoff from 'lucide/dist/esm/icons/plane-takeoff.mjs'
import PlaneLanding from 'lucide/dist/esm/icons/plane-landing.mjs'
import Car from 'lucide/dist/esm/icons/car.mjs'
import Bus from 'lucide/dist/esm/icons/bus.mjs'
import Luggage from 'lucide/dist/esm/icons/luggage.mjs'
import Coffee from 'lucide/dist/esm/icons/coffee.mjs'
import DoorOpen from 'lucide/dist/esm/icons/door-open.mjs'
import ShowerHead from 'lucide/dist/esm/icons/shower-head.mjs'
import Utensils from 'lucide/dist/esm/icons/utensils.mjs'
import QrCode from 'lucide/dist/esm/icons/qr-code.mjs'
import Maximize from 'lucide/dist/esm/icons/maximize.mjs'
import CloudRain from 'lucide/dist/esm/icons/cloud-rain.mjs'
import Route from 'lucide/dist/esm/icons/route.mjs'

// Pallone da calcio: Lucide non ce l'ha (c'è solo volleyball, che si legge pallavolo; goal e trophy
// al volo non dicono "rigori"). Disegnato qui nello stesso formato dei nodi Lucide, così passa dallo
// stesso createElement con gli stessi attributi: 24×24, tratto 2, angoli tondi, niente riempimento.
// Pentagono al centro e, verso il bordo, i lembi delle toppe vicine: con i soli cinque raggi, a 22 px,
// sembrava un volante.
const Pallone = [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M12 7.2l4.57 3.32-1.75 5.36H9.18L7.43 10.52z' }],
  ['path', { d: 'M12 7.2V4.5l-3-1.8M12 4.5l3-1.8' }],
  ['path', { d: 'm16.57 10.52 2.6-.85 1.6-3M19.17 9.67l2.3 2.6' }],
  ['path', { d: 'm14.82 15.88 1.6 2.2-.7 3.3M16.42 18.08l3.4-.9' }],
  ['path', { d: 'm9.18 15.88-1.6 2.2.7 3.3M7.58 18.08l-3.4-.9' }],
  ['path', { d: 'm7.43 10.52-2.6-.85-1.6-3M4.83 9.67l-2.3 2.6' }]
]

const ICONS = { sun: Sun, list: List, map: MapIcon, trophy: Trophy, info: Info, 'map-pin': MapPin, taxi: CarTaxiFront, train: TrainFront, copy: Copy, check: Check, alarm: AlarmClock, locate: Locate, alert: TriangleAlert, chevron: ChevronDown, walk: Footprints, zap: Zap, download: Download, upload: Upload, sparkles: Sparkles, user: User, phone: Phone, clock: Clock, x: X, refresh: RefreshCw, camera: Camera, whatsapp: MessageCircle, share: Share2, disc: Disc3, music: Music, goal: Goal, 'plane-takeoff': PlaneTakeoff, 'plane-landing': PlaneLanding, car: Car, bus: Bus, luggage: Luggage, coffee: Coffee, 'door-open': DoorOpen, shower: ShowerHead, utensils: Utensils, qr: QrCode, maximize: Maximize, rain: CloudRain, route: Route, pallone: Pallone }

export function icon(name, attrs = {}) {
  const node = ICONS[name]
  if (!node) return ''
  const el = createElement(node, { 'aria-hidden': 'true', focusable: 'false', ...attrs })
  return el.outerHTML
}
