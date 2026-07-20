/**
 * tokens.test.ts — dark-palette smoke test.
 * jsdom cannot compute CSS custom properties, so we verify the raw CSS file
 * contains the binding hex values from the Global Constraints in the plan.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')

describe('dark tokens (same gi, dyed deeper)', () => {
  it('ground is indigo-charcoal --mat:#1B2130', () => {
    expect(css).toContain('--mat:#1B2130')
  })
  it('raised surface --surface:#232B3D', () => {
    expect(css).toContain('--surface:#232B3D')
  })
  it('ink is warm off-white --ink:#EDEAE2', () => {
    expect(css).toContain('--ink:#EDEAE2')
  })
  it('secondary ink --ink-2:#9BA3B4', () => {
    expect(css).toContain('--ink-2:#9BA3B4')
  })
  it('hairline --line:#39415A', () => {
    expect(css).toContain('--line:#39415A')
  })
  it('strong line --line-strong:#C7CBD6', () => {
    expect(css).toContain('--line-strong:#C7CBD6')
  })
  it('accent washed indigo --accent:#8FA7E8', () => {
    expect(css).toContain('--accent:#8FA7E8')
  })
  it('belt tokens dark-adapted: white, blue, purple, brown, black', () => {
    expect(css).toContain('--belt-white:#E9E7E0')
    expect(css).toContain('--belt-blue:#5B84CE')
    expect(css).toContain('--belt-purple:#9067C6')
    expect(css).toContain('--belt-brown:#A0714A')
    expect(css).toContain('--belt-black:#14161C')
  })
  it('chip background uses --surface token, not #fff literal', () => {
    // The .chip rule must NOT have background: #fff
    expect(css).not.toMatch(/\.chip[^}]*background:\s*#fff/)
    // It should use var(--surface)
    expect(css).toMatch(/\.chip[^}]*background:\s*var\(--surface\)/)
  })
  it('.btn color uses var(--mat) for dark label on washed-indigo accent (6.78:1 WCAG)', () => {
    // Dark label on accent background passes WCAG AA contrast.
    expect(css).toMatch(/\.btn[^}]*color:\s*var\(--mat\)/)
  })
  it('no #fff appears anywhere in tokens.css', () => {
    // Eliminates any remaining light-text literals.
    expect(css).not.toContain('#fff')
  })
  it('no pure #000 anywhere in the file', () => {
    // #000 (no alpha/opacity modifier) is banned — use #14161C (belt-black) instead
    expect(css).not.toMatch(/#000(?![0-9a-fA-F])/)
  })
  it('no light-theme mat literal (#F4F4F1) remains in token definitions', () => {
    expect(css).not.toContain('#F4F4F1')
  })
})
