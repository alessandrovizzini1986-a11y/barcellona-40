// Genera public/og.png (1200x630) da scripts/qa/og.html con Chromium headless
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--allow-file-access-from-files'] })
const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
await p.goto('file://' + path.join(here, 'og.html'))
await p.waitForTimeout(500)
await p.screenshot({ path: path.join(here, '../../public/og.png') })
await b.close()
