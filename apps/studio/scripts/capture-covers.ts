import {chromium} from 'playwright'
import {parse} from 'csv-parse/sync'
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = join(__dirname, 'projects.csv')
const OUT_DIR = join(__dirname, 'covers')
const VIEWPORT = {width: 1280, height: 800}

type Row = {slug: string; client: string; site_url: string; category: string}

const PALETTES: Record<string, {bg: string; fg: string; accent: string}> = {
  'e-commerce': {bg: '#1a1410', fg: '#f5ede0', accent: '#c8865a'},
  'architecture': {bg: '#161616', fg: '#ededed', accent: '#a89882'},
  'creative-agency': {bg: '#0f0f12', fg: '#fafaf7', accent: '#d4a574'},
  'real-estate': {bg: '#1c1815', fg: '#f0e9dc', accent: '#9a8c6e'},
  'health-wellness': {bg: '#0f1a1c', fg: '#f0f5f4', accent: '#7a9e9f'},
  default: {bg: '#1a1410', fg: '#f5ede0', accent: '#c8865a'},
}

function fallbackHtml(client: string, category: string) {
  const p = PALETTES[category] ?? PALETTES.default
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; padding: 0; height: 100%; background: ${p.bg}; color: ${p.fg};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .frame { width: 100vw; height: 100vh; display: flex; flex-direction: column;
      justify-content: space-between; padding: 80px; box-sizing: border-box; }
    .top { font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.6; }
    .name { font-size: 96px; line-height: 1.05; font-weight: 300; letter-spacing: -0.02em;
      max-width: 900px; }
    .bottom { display: flex; justify-content: space-between; align-items: flex-end; }
    .pill { display: inline-block; padding: 10px 22px; border: 1px solid ${p.accent};
      color: ${p.accent}; border-radius: 999px; font-size: 13px; letter-spacing: 0.1em;
      text-transform: uppercase; }
    .signature { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
      opacity: 0.5; }
  </style></head><body>
    <div class="frame">
      <div class="top">Cacao &amp; Avocado · Project</div>
      <div class="name">${client}</div>
      <div class="bottom">
        <span class="pill">${category.replace(/-/g, ' ')}</span>
        <span class="signature">cacaoandavocado.co</span>
      </div>
    </div>
  </body></html>`
}

function loadRows(): Row[] {
  const csv = readFileSync(CSV_PATH, 'utf8')
  return parse(csv, {columns: true, skip_empty_lines: true, trim: true})
}

// Microlink free tier (50 req/day, no key) renders pages from rotating IPs with
// real Chrome — sites that 403 our local Playwright usually let it through.
async function externalScreenshot(siteUrl: string, outPath: string): Promise<boolean> {
  const params = new URLSearchParams({
    url: siteUrl,
    screenshot: 'true',
    meta: 'false',
    'viewport.width': '1280',
    'viewport.height': '800',
    'viewport.deviceScaleFactor': '2',
    'screenshot.type': 'jpeg',
    waitFor: '2500',
  })
  const apiUrl = `https://api.microlink.io/?${params.toString()}`
  console.log(`   ↻ trying microlink fallback`)
  try {
    const res = await fetch(apiUrl, {signal: AbortSignal.timeout(60000)})
    if (!res.ok) {
      console.log(`   ✗ microlink returned ${res.status}`)
      return false
    }
    const json = (await res.json()) as {
      status?: string
      data?: {screenshot?: {url?: string}}
    }
    const imgUrl = json?.data?.screenshot?.url
    if (!imgUrl) {
      console.log(`   ✗ microlink response missing screenshot.url`)
      return false
    }
    const imgRes = await fetch(imgUrl, {signal: AbortSignal.timeout(30000)})
    if (!imgRes.ok) {
      console.log(`   ✗ failed to download screenshot from microlink`)
      return false
    }
    writeFileSync(outPath, Buffer.from(await imgRes.arrayBuffer()))
    console.log(`   ✓ saved microlink screenshot ${outPath}`)
    return true
  } catch (err) {
    console.log(`   ✗ microlink error: ${(err as Error).message}`)
    return false
  }
}

async function writeTypographicFallback(
  browser: import('playwright').Browser,
  client: string,
  category: string,
  outPath: string,
) {
  const ctx = await browser.newContext({viewport: VIEWPORT, deviceScaleFactor: 2})
  const page = await ctx.newPage()
  try {
    await page.setContent(fallbackHtml(client, category), {waitUntil: 'load'})
    await page.waitForTimeout(300)
    await page.screenshot({path: outPath, type: 'jpeg', quality: 92, fullPage: false})
  } finally {
    await ctx.close()
  }
}

async function dismissCookieBanners(page: import('playwright').Page) {
  const buttons = [
    'button:has-text("Accept")',
    'button:has-text("Acepto")',
    'button:has-text("Aceptar")',
    'button:has-text("Agree")',
    'button:has-text("OK")',
    'button:has-text("Got it")',
    'button:has-text("Entendido")',
    '[id*="cookie"] button',
    '[class*="cookie"] button',
  ]
  for (const sel of buttons) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({timeout: 500})) {
        await el.click({timeout: 1000})
        await page.waitForTimeout(300)
        break
      }
    } catch {
      // ignore — banner not present
    }
  }
}

async function captureRow(browser: import('playwright').Browser, row: Row): Promise<boolean> {
  if (!row.site_url) {
    console.log(`⏭️  ${row.slug}: no site_url, skipping`)
    return false
  }

  const outPath = join(OUT_DIR, `${row.slug}.jpg`)
  console.log(`📸 ${row.slug} → ${row.site_url}`)

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'en-US',
    timezoneId: 'America/Bogota',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  // Hide common headless markers before any page script runs
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined})
    Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]})
    Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en', 'es']})
  })

  const page = await context.newPage()

  try {
    let response
    try {
      response = await page.goto(row.site_url, {waitUntil: 'networkidle', timeout: 15000})
    } catch {
      console.log(`   ↻ networkidle timed out, falling back to domcontentloaded`)
      response = await page.goto(row.site_url, {waitUntil: 'domcontentloaded', timeout: 30000})
      await page.waitForTimeout(3000)
    }

    const status = response?.status() ?? 0
    if (status >= 400) {
      console.log(`   ⚠️  ${status} from site — trying external service`)
      if (await externalScreenshot(row.site_url, outPath)) return true
      console.log(`   ↻ external service failed — using typographic fallback`)
      await writeTypographicFallback(browser, row.client, row.category, outPath)
      console.log(`   ✓ saved typographic fallback ${outPath}`)
      return true
    }

    await page.waitForTimeout(1500)
    await dismissCookieBanners(page)
    await page.waitForTimeout(800)
    await page.screenshot({path: outPath, type: 'jpeg', quality: 88, fullPage: false})
    console.log(`   ✓ saved ${outPath}`)
    return true
  } catch (err) {
    console.error(`   ✗ failed: ${(err as Error).message}`)
    return false
  } finally {
    await context.close()
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, {recursive: true})

  const rows = loadRows()
  console.log(`Loaded ${rows.length} rows from CSV\n`)

  // Prefer the system-installed Chrome over Playwright's bundled Chromium —
  // strict WAFs (Cloudflare, etc.) treat real Chrome more leniently. Fall back
  // to bundled chromium if Chrome isn't installed on this machine.
  let browser: import('playwright').Browser
  try {
    browser = await chromium.launch({headless: true, channel: 'chrome'})
    console.log('Using system Chrome\n')
  } catch (err) {
    console.log(`System Chrome unavailable (${(err as Error).message.split('\n')[0]})`)
    console.log('Falling back to bundled chromium\n')
    browser = await chromium.launch({headless: true, channel: 'chromium'})
  }
  const results: Record<string, boolean> = {}

  try {
    for (const row of rows) {
      results[row.slug] = await captureRow(browser, row)
    }
  } finally {
    await browser.close()
  }

  const successes = Object.values(results).filter(Boolean).length
  const failures = rows.length - successes
  console.log(`\nDone: ${successes} captured, ${failures} skipped/failed`)

  // Manifest for the import script
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(results, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
