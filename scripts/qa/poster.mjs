// Genera public/media/song-poster.jpg (824x1464) da scripts/qa/poster.html.
// ffmpeg qui non può estrarre un frame dal video (build senza decoder h264),
// quindi il poster è un'illustrazione originale in stile trencadís.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--allow-file-access-from-files'] })
const p = await b.newPage({ viewport: { width: 824, height: 1464 } })
await p.goto('file://' + path.join(here, 'poster.html'))
await p.waitForTimeout(600)
await p.screenshot({ path: path.join(here, '../../public/media/song-poster.jpg'), type: 'jpeg', quality: 86 })
await b.close()
