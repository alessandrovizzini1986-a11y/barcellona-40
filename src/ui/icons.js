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

const ICONS = { sun: Sun, list: List, map: MapIcon, trophy: Trophy, info: Info, 'map-pin': MapPin, taxi: CarTaxiFront, train: TrainFront, copy: Copy, check: Check, alarm: AlarmClock, locate: Locate, alert: TriangleAlert, chevron: ChevronDown, walk: Footprints, zap: Zap, download: Download, upload: Upload, sparkles: Sparkles, user: User, phone: Phone, clock: Clock, x: X }

export function icon(name, attrs = {}) {
  const node = ICONS[name]
  if (!node) return ''
  const el = createElement(node, { 'aria-hidden': 'true', focusable: 'false', ...attrs })
  return el.outerHTML
}
