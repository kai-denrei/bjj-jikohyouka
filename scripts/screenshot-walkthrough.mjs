/**
 * Screenshot walkthrough for BJJ Skill-Check v0.2
 *
 * Captures the full assessment flow in mobile viewport (390×844, 2x DPR).
 * Run with: node scripts/screenshot-walkthrough.mjs
 * Requires: npm i -D playwright && npx playwright install chromium
 */

import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../docs/screenshots')
const BASE_URL = 'http://localhost:5173'
const TOTAL_SWEEP = 15

async function save(page, name, fullPage = false) {
  const path = resolve(OUT_DIR, `${name}.png`)
  await page.screenshot({ path, fullPage })
  console.log(`  ✓ saved ${name}.png`)
}

/** Click the third visible .chip button in the question input area.
 *  For slider10 that means chip with text "3"; for other scales the 3rd anchor.
 *  Returns the text of the chip that was clicked. */
async function clickThirdChip(page) {
  // Wait for chips to be present and stable
  await page.waitForSelector('.chip', { state: 'visible', timeout: 8000 })
  const chips = page.locator('.chip')
  const count = await chips.count()
  // Use index 2 (third chip), fall back to last if fewer than 3
  const idx = Math.min(2, count - 1)
  const text = await chips.nth(idx).textContent()
  await chips.nth(idx).click()
  return text?.trim() ?? '?'
}

async function runMainFlow(browser) {
  console.log('\n── Main flow ──────────────────────────────────')
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })
  // Clear any persisted localStorage before navigation
  await ctx.addInitScript(() => {
    try { window.localStorage.clear() } catch (_) {}
  })

  const page = await ctx.newPage()
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })

  // 01-intro
  await page.waitForSelector('h1', { timeout: 10000 })
  await save(page, '01-intro')

  // → intake
  await page.click('button.btn:has-text("Start the sweep")')
  await page.waitForSelector('legend', { timeout: 6000 })

  // 02-intake
  await save(page, '02-intake')

  // Skip for now → sweep starts
  await page.click('button.btn-quiet:has-text("Skip for now")')
  // Wait for first sweep question heading (h2 inside QuestionScreen)
  await page.waitForSelector('h2', { timeout: 8000 })
  await page.waitForTimeout(200) // let fonts settle

  // 03-sweep-question (first question, no answer yet)
  await save(page, '03-sweep-question')
  const q1Text = await page.locator('h2').first().textContent()
  console.log(`  First sweep Q: "${q1Text?.slice(0, 70)}..."`)

  // Answer all 15 sweep questions
  for (let i = 0; i < TOTAL_SWEEP; i++) {
    // Read current question text before answering (for advance-wait)
    const textBefore = await page.locator('h2').first().textContent()
    const chipText = await clickThirdChip(page)
    console.log(`  Q${i + 1}: clicked chip "${chipText}"`)

    if (i < TOTAL_SWEEP - 1) {
      // Wait for h2 to change (auto-advance after 250ms) with generous timeout
      try {
        await page.waitForFunction(
          (prev) => {
            const el = document.querySelector('h2')
            return el && el.textContent !== prev
          },
          textBefore,
          { timeout: 6000 }
        )
      } catch {
        // Fallback: fixed wait for the transition
        await page.waitForTimeout(700)
      }
    }
  }

  // After Q15, app calls onDone → navigates to interim ("First picture")
  await page.waitForSelector('h2:has-text("First picture")', { timeout: 8000 })

  // 04-interim
  await save(page, '04-interim')

  // Click "See results"
  await page.click('button:has-text("See results")')
  // Wait for results to render (h1 or h2 on results page)
  await page.waitForSelector('h1, h2', { timeout: 8000 })
  // Give radar SVG time to paint
  await page.waitForTimeout(600)

  // 05-results (full-page to capture bands, radar, epigraph, and footer buttons)
  await save(page, '05-results', true)

  await ctx.close()
  return q1Text
}

async function runDraftMode(browser) {
  console.log('\n── Draft mode ─────────────────────────────────')
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })
  await ctx.addInitScript(() => {
    try { window.localStorage.clear() } catch (_) {}
  })

  const page = await ctx.newPage()
  await page.goto(`${BASE_URL}/?bank=draft`, { waitUntil: 'networkidle' })

  // Click Start the sweep
  await page.waitForSelector('button.btn:has-text("Start the sweep")', { timeout: 10000 })
  await page.click('button.btn:has-text("Start the sweep")')

  // Skip for now
  await page.waitForSelector('button.btn-quiet:has-text("Skip for now")', { timeout: 6000 })
  await page.click('button.btn-quiet:has-text("Skip for now")')

  // Wait for first sweep question
  await page.waitForSelector('h2', { timeout: 8000 })
  await page.waitForTimeout(200)

  // 06-draft-mode
  await save(page, '06-draft-mode')
  const draftQ1Text = await page.locator('h2').first().textContent()
  console.log(`  Draft first Q: "${draftQ1Text?.slice(0, 70)}..."`)

  await ctx.close()
  return draftQ1Text
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  try {
    const activeQ1 = await runMainFlow(browser)
    const draftQ1 = await runDraftMode(browser)

    const differ = activeQ1 !== draftQ1
    console.log(`\n  Active Q1 vs Draft Q1 differ: ${differ ? 'YES ✓' : 'NO — may indicate draft bank has no draft cores'}`)
    console.log('\n  All screenshots saved to docs/screenshots/')
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
