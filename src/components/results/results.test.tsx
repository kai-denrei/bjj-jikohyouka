import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ResultsPage } from './ResultsPage'
import type { Report } from '../../lib/results/score'

const report: Report = {
  bankVersion: '1.0.0',
  categories: [
    { categoryId: 'a', name: 'Alpha', axis: 'positional', score: 80, band: 'Rolling', answered: 5, activeCount: 5, uncertainty: 'narrow', toNextBand: 20 },
    { categoryId: 'b', name: 'Beta', axis: 'positional', score: 30, band: 'Learning', answered: 1, activeCount: 8, uncertainty: 'wide', toNextBand: 10 },
    { categoryId: 'c', name: 'Gamma', axis: 'positional', score: null, band: null, answered: 0, activeCount: 8, uncertainty: 'none', toNextBand: null },
  ],
  insights: [{ categoryId: 'b', kind: 'avoidance', text: 'That loop feeds itself — positional rounds beat avoiding it.' }],
}

describe('ResultsPage', () => {
  it('sorts scored categories desc, parks unscored under Not yet mapped, no composite %', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    const rows = screen.getAllByRole('listitem').map(li => li.textContent)
    expect(rows[0]).toContain('Alpha')
    expect(rows[1]).toContain('Beta')
    expect(screen.getByText('Not yet mapped')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/overall|\d+%/)
  })
  it('marks wide uncertainty and shows the epigraph', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    expect(screen.getByText(/rough estimate — drill down to sharpen/)).toBeInTheDocument()
    expect(screen.getByText(/All models are wrong; some are useful/)).toBeInTheDocument()
    expect(screen.getByText(/r ≈ \.29/)).toBeInTheDocument()
  })
  it('renders the radar with one polygon and skips unscored axes', () => {
    const { container } = render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    expect(container.querySelectorAll('svg polygon')).toHaveLength(1)
    expect(container.querySelector('svg')!.textContent).not.toContain('Gamma')
  })
  it('shows insight cards', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    expect(screen.getByText(/loop feeds itself/)).toBeInTheDocument()
  })

  // Fix 1: Radar label clipping — 15 axis labels, outer ring r ≤ 104, overflow="visible"
  it('radar: 15 axis labels, outer ring r≤104, overflow visible', () => {
    const cats15: Report['categories'] = [
      'takedowns', 'guard_top', 'guard_bottom', 'closed_guard_top', 'closed_guard_bottom',
      'open_guard_top', 'open_guard_bottom', 'half_guard_top', 'half_guard_bottom',
      'mount_top', 'mount_bottom', 'back_mount_top', 'back_mount_bottom',
      'leg_locks', 'wrist_locks',
    ].map((id, i) => ({
      categoryId: id,
      name: id.replace(/_/g, ' '),
      axis: 'positional',
      score: 50 + i,
      band: 'Drilling' as const,
      answered: 3,
      activeCount: 5,
      uncertainty: 'narrow' as const,
      toNextBand: 10,
    }))
    const report15: Report = { bankVersion: '1.0.0', categories: cats15, insights: [] }
    const { container } = render(<ResultsPage report={report15} onRetakeCategory={() => {}} />)
    const svg = container.querySelector('svg[aria-label="Skill radar"]')!
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('overflow')).toBe('visible')
    // 15 axis text labels
    expect(svg.querySelectorAll('text')).toHaveLength(15)
    // Outermost ring: circles are the concentric rings; the last one should have r ≤ 104
    const circles = svg.querySelectorAll('circle')
    const maxR = Math.max(...Array.from(circles).map(c => parseFloat(c.getAttribute('r') ?? '0')))
    expect(maxR).toBeLessThanOrEqual(104)
  })

  // Fix 2: Import JSON must re-render — after a successful import, diff text appears
  it('import JSON triggers re-render and shows then diff for matching bankVersion', async () => {
    // Build a report with a real category ID so prevScores can match
    const reportWithTakedowns: Report = {
      bankVersion: '1.0.0',
      categories: [
        {
          categoryId: 'takedowns',
          name: 'Takedowns & Wrestling',
          axis: 'positional',
          score: 80,
          band: 'Rolling',
          answered: 5,
          activeCount: 5,
          uncertainty: 'narrow',
          toNextBand: 20,
        },
      ],
      insights: [],
    }

    // Session with a slider10 answer for takedowns: raw=5 → score=(5-1)/9*100≈44
    const importedSession = {
      bankVersion: '1.0.0',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:01:00.000Z',
      intake: null,
      answers: { td_001: { qid: 'td_001', v: 1, raw: 5 } },
      completedCategories: [],
    }
    const exportBlob = JSON.stringify({ schemaVersion: 1, sessions: [importedSession] })

    // Mock FileReader so readAsText fires onload synchronously
    const OriginalFileReader = global.FileReader
    vi.stubGlobal('FileReader', class {
      onload: ((ev: { target: { result: string } }) => void) | null = null
      readAsText(_file: File) {
        this.onload?.({ target: { result: exportBlob } })
      }
    })

    const { container } = render(
      <ResultsPage report={reportWithTakedowns} onRetakeCategory={() => {}} />
    )

    // Trigger the hidden file input change
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([exportBlob], 'import.json', { type: 'application/json' })

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    // After import, prevScore for takedowns should be non-null → diff text appears
    expect(screen.getByText(/then \d+ → now \d+/)).toBeInTheDocument()

    vi.stubGlobal('FileReader', OriginalFileReader)
  })

  // Fix 3: BandList shows next band name instead of "next band"
  it('BandList shows next band name in to-next hint', () => {
    // Alpha: band=Rolling, toNextBand=20 → "+20 to Weapon"
    // Beta:  band=Learning, toNextBand=10 → "+10 to Drilling"
    render(<ResultsPage report={report} onRetakeCategory={() => {}} />)
    expect(screen.getByText('+20 to Weapon')).toBeInTheDocument()
    expect(screen.getByText('+10 to Drilling')).toBeInTheDocument()
    // The old generic text should not appear
    expect(screen.queryByText(/to next band/)).not.toBeInTheDocument()
  })
})
