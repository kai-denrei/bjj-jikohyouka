/**
 * viz.test.tsx — Task 2: VizTabs, DepthBars, HeatMap
 *
 * TDD per plan §Task 2 test list.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VizTabs } from './VizTabs'
import { DepthBars } from './DepthBars'
import { HeatMap } from './HeatMap'
import type { CategoryScore } from '../../lib/results/score'

// ─── shared fixtures ──────────────────────────────────────────────────────────

function cat(
  id: string,
  name: string,
  shortName: string,
  score: number | null,
  band: CategoryScore['band'] = null
): CategoryScore {
  return {
    categoryId: id,
    name,
    shortName,
    axis: 'positional',
    score,
    band: score !== null ? band ?? 'Drilling' : null,
    answered: score !== null ? 3 : 0,
    activeCount: 5,
    uncertainty: 'narrow',
    toNextBand: null,
  }
}

const scored3: CategoryScore[] = [
  cat('td', 'Takedowns & Wrestling', 'Takedowns', 80, 'Rolling'),
  cat('gp', 'Guard Passing (Top)', 'Guard Pass', 55, 'Drilling'),
  cat('gr', 'Guard Retention (Bottom)', 'Guard Ret.', 30, 'Learning'),
]

const withUnscored: CategoryScore[] = [
  ...scored3,
  cat('cl', 'Closed Guard (Top)', 'Closed Top', null),
  cat('cb', 'Closed Guard (Bottom)', 'Closed Bottom', null),
]

// ─── DepthBars ────────────────────────────────────────────────────────────────

describe('DepthBars', () => {
  it('renders an SVG with testid depth-bars', () => {
    const { container } = render(<DepthBars categories={scored3} />)
    expect(container.querySelector('[data-testid="depth-bars"]')).not.toBeNull()
  })

  it('bars sort descending by score', () => {
    const { container } = render(<DepthBars categories={scored3} />)
    const svg = container.querySelector('[data-testid="depth-bars"]') as SVGElement
    // Each bar is a rect; we read data-score attributes to verify order
    const rects = Array.from(svg.querySelectorAll('rect[data-score]'))
    const scores = rects.map(r => parseFloat(r.getAttribute('data-score') ?? '0'))
    const sorted = [...scores].sort((a, b) => b - a)
    expect(scores).toEqual(sorted)
  })

  it('top baseline is rendered (line or rect with y=0)', () => {
    const { container } = render(<DepthBars categories={scored3} />)
    const svg = container.querySelector('[data-testid="depth-bars"]') as SVGElement
    // Baseline is a <line data-testid="baseline"> or similar
    const baseline = svg.querySelector('[data-testid="baseline"]')
    expect(baseline).not.toBeNull()
  })

  it('bars hang from baseline (bar rect has y=baseline position, positive height)', () => {
    const { container } = render(<DepthBars categories={scored3} />)
    const svg = container.querySelector('[data-testid="depth-bars"]') as SVGElement
    const rects = Array.from(svg.querySelectorAll('rect[data-score]'))
    for (const rect of rects) {
      const y = parseFloat(rect.getAttribute('y') ?? '-1')
      const height = parseFloat(rect.getAttribute('height') ?? '0')
      // y should be at/near 0 (top of chart is baseline) and height positive
      expect(y).toBeGreaterThanOrEqual(0)
      expect(height).toBeGreaterThan(0)
    }
  })

  it('bar height is proportional to score (higher score → taller bar)', () => {
    const { container } = render(<DepthBars categories={scored3} />)
    const svg = container.querySelector('[data-testid="depth-bars"]') as SVGElement
    // sorted3 is already sorted desc: 80, 55, 30
    const rects = Array.from(svg.querySelectorAll('rect[data-score]'))
    const heights = rects.map(r => parseFloat(r.getAttribute('height') ?? '0'))
    // Heights must be descending (first bar tallest = deepest)
    expect(heights[0]).toBeGreaterThan(heights[1])
    expect(heights[1]).toBeGreaterThan(heights[2])
  })

  it('renders mono score label at bar tip', () => {
    const { container } = render(<DepthBars categories={scored3} />)
    const svg = container.querySelector('[data-testid="depth-bars"]') as SVGElement
    const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent)
    // Should include the score numbers
    expect(texts).toContain('80')
    expect(texts).toContain('55')
    expect(texts).toContain('30')
  })

  it('renders unscored categories as empty slots at the end', () => {
    const { container } = render(<DepthBars categories={withUnscored} />)
    const svg = container.querySelector('[data-testid="depth-bars"]') as SVGElement
    // Unscored categories get a slot but no rect[data-score]
    const emptySlots = svg.querySelectorAll('[data-testid="empty-slot"]')
    expect(emptySlots.length).toBe(2) // cl and cb
  })
})

// ─── HeatMap ──────────────────────────────────────────────────────────────────

describe('HeatMap', () => {
  it('renders an element with testid heat-map', () => {
    render(<HeatMap categories={withUnscored} />)
    expect(screen.getByTestId('heat-map')).toBeInTheDocument()
  })

  it('renders one cell per category including unscored', () => {
    render(<HeatMap categories={withUnscored} />)
    const cells = screen.getAllByRole('cell')
    expect(cells.length).toBe(withUnscored.length)
  })

  it('unscored cell has aria-label with "not yet mapped"', () => {
    render(<HeatMap categories={withUnscored} />)
    // Find unscored cells — escape regex specials in name before building pattern
    const unscoredCells = withUnscored
      .filter(c => c.score === null)
      .map(c => {
        const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return screen.getByRole('cell', { name: new RegExp(`${escaped}.*not yet mapped`, 'i') })
      })
    expect(unscoredCells.length).toBe(2)
  })

  it('scored cell has aria-label with band name', () => {
    render(<HeatMap categories={withUnscored} />)
    // takedowns is Rolling band
    expect(screen.getByRole('cell', { name: /Takedowns & Wrestling.*Rolling/i })).toBeInTheDocument()
  })

  it('shows shortName in each cell', () => {
    render(<HeatMap categories={scored3} />)
    expect(screen.getByText('Takedowns')).toBeInTheDocument()
    expect(screen.getByText('Guard Pass')).toBeInTheDocument()
    expect(screen.getByText('Guard Ret.')).toBeInTheDocument()
  })

  it('HeatMap band-conditional text color: Weapon band → var(--mat), Learning band → var(--ink)', () => {
    const fixtureWithBands: CategoryScore[] = [
      cat('wp', 'Weapon Test', 'Weapon', 80, 'Weapon'),
      cat('ln', 'Learning Test', 'Learning', 30, 'Learning'),
    ]
    render(<HeatMap categories={fixtureWithBands} />)

    // Find cells via aria-label
    const weaponCell = screen.getByRole('cell', { name: /Weapon Test.*Weapon/i })
    const learningCell = screen.getByRole('cell', { name: /Learning Test.*Learning/i })

    // Query the shortName span within each cell and check its color
    const weaponSpan = weaponCell.querySelector('span')
    expect(weaponSpan).toBeInTheDocument()
    expect(weaponSpan!.style.color).toBe('var(--mat)')

    const learningSpan = learningCell.querySelector('span')
    expect(learningSpan).toBeInTheDocument()
    expect(learningSpan!.style.color).toBe('var(--ink)')
  })
})

// ─── VizTabs ──────────────────────────────────────────────────────────────────

describe('VizTabs', () => {
  beforeEach(() => {
    localStorage.removeItem('skillcheck.viztab.v1')
  })

  afterEach(() => {
    localStorage.removeItem('skillcheck.viztab.v1')
  })

  it('renders a tablist with three tabs', () => {
    render(<VizTabs categories={scored3} />)
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].textContent).toContain('Spider')
    expect(tabs[1].textContent).toContain('Depth')
    expect(tabs[2].textContent).toContain('Heat')
  })

  it('defaults to Spider tab (Radar testid visible)', () => {
    render(<VizTabs categories={scored3} />)
    // Spider = Radar; Radar renders an svg[aria-label="Skill radar"] when ≥3 scored
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain('Spider')
    // The depth-bars chart should NOT be in the document when Spider is selected
    expect(screen.queryByTestId('depth-bars')).toBeNull()
  })

  it('clicking Depth tab shows DepthBars and hides others', () => {
    render(<VizTabs categories={scored3} />)
    fireEvent.click(screen.getByRole('tab', { name: /Depth/i }))
    expect(screen.getByTestId('depth-bars')).toBeInTheDocument()
    expect(screen.queryByTestId('heat-map')).toBeNull()
  })

  it('clicking Heat tab shows HeatMap and hides others', () => {
    render(<VizTabs categories={scored3} />)
    fireEvent.click(screen.getByRole('tab', { name: /Heat/i }))
    expect(screen.getByTestId('heat-map')).toBeInTheDocument()
    expect(screen.queryByTestId('depth-bars')).toBeNull()
  })

  it('arrow keys move focus and activate the tab (automatic activation)', () => {
    render(<VizTabs categories={scored3} />)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    // ArrowRight from Spider → Depth: focus moves AND Depth is activated
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabs[1])
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('depth-bars')).toBeInTheDocument()
    // ArrowRight from Depth → Heat: focus moves AND Heat is activated
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabs[2])
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('heat-map')).toBeInTheDocument()
    // ArrowRight from Heat → wraps to Spider: focus moves AND Spider is activated
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabs[0])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByTestId('depth-bars')).toBeNull()
    // ArrowLeft from Spider → Heat (wrap): focus moves AND Heat is activated
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tabs[2])
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('heat-map')).toBeInTheDocument()
  })

  it('persists selected tab to localStorage', () => {
    render(<VizTabs categories={scored3} />)
    fireEvent.click(screen.getByRole('tab', { name: /Heat/i }))
    expect(localStorage.getItem('skillcheck.viztab.v1')).toBe('heat')
  })

  it('restores selected tab from localStorage on mount', () => {
    localStorage.setItem('skillcheck.viztab.v1', 'depth')
    render(<VizTabs categories={scored3} />)
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain('Depth')
    expect(screen.getByTestId('depth-bars')).toBeInTheDocument()
  })
})
