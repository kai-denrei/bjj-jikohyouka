import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ResultsPage } from './ResultsPage'
import { QuestionScreen } from '../QuestionScreen'
import { bank } from '../../lib/bankInstance'
import type { Report } from '../../lib/results/score'
import type { AssessmentSession } from '../../lib/results/types'

const report: Report = {
  bankVersion: '1.0.0',
  categories: [
    { categoryId: 'a', name: 'Alpha', axis: 'positional', score: 80, band: 'Rolling', answered: 5, activeCount: 5, uncertainty: 'narrow', toNextBand: 20 },
    { categoryId: 'b', name: 'Beta', axis: 'positional', score: 30, band: 'Learning', answered: 1, activeCount: 8, uncertainty: 'wide', toNextBand: 10 },
    { categoryId: 'c', name: 'Gamma', axis: 'positional', score: null, band: null, answered: 0, activeCount: 8, uncertainty: 'none', toNextBand: null },
  ],
  insights: [{ categoryId: 'b', kind: 'avoidance', text: 'That loop feeds itself — positional rounds beat avoiding it.' }],
}

// All three fixture categories available by default for backward-compat tests
const allAvailable = new Set(['a', 'b', 'c'])

describe('ResultsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sorts scored categories desc, parks unscored under Not yet mapped, no composite %', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} availableCategoryIds={allAvailable} />)
    const rows = screen.getAllByRole('listitem').map(li => li.textContent)
    expect(rows[0]).toContain('Alpha')
    expect(rows[1]).toContain('Beta')
    expect(screen.getByText('Not yet mapped')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/overall|\d+%/)
  })
  it('marks wide uncertainty and shows the epigraph', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} availableCategoryIds={allAvailable} />)
    expect(screen.getByText(/rough estimate — drill down to sharpen/)).toBeInTheDocument()
    expect(screen.getByText(/All models are wrong; some are useful/)).toBeInTheDocument()
    expect(screen.getByText(/r ≈ \.29/)).toBeInTheDocument()
  })
  it('renders the radar with one polygon and skips unscored axes', () => {
    const { container } = render(<ResultsPage report={report} onRetakeCategory={() => {}} availableCategoryIds={allAvailable} />)
    expect(container.querySelectorAll('svg polygon')).toHaveLength(1)
    expect(container.querySelector('svg')!.textContent).not.toContain('Gamma')
  })
  it('shows insight cards', () => {
    render(<ResultsPage report={report} onRetakeCategory={() => {}} availableCategoryIds={allAvailable} />)
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
    const { container } = render(<ResultsPage report={report15} onRetakeCategory={() => {}} availableCategoryIds={allAvailable} />)
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
    vi.stubGlobal('FileReader', class {
      onload: ((ev: { target: { result: string } }) => void) | null = null
      readAsText(_file: File) {
        this.onload?.({ target: { result: exportBlob } })
      }
    })

    const { container } = render(
      <ResultsPage report={reportWithTakedowns} onRetakeCategory={() => {}} availableCategoryIds={allAvailable} />
    )

    // Trigger the hidden file input change
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([exportBlob], 'import.json', { type: 'application/json' })

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    // After import, prevScore for takedowns should be non-null → diff text appears
    expect(screen.getByText(/then \d+ → now \d+/)).toBeInTheDocument()
  })

  // Fix 3: BandList shows next band name instead of "next band"
  it('BandList shows next band name in to-next hint', () => {
    // Alpha: band=Rolling, toNextBand=20 → "+20 to Weapon"
    // Beta:  band=Learning, toNextBand=10 → "+10 to Drilling"
    render(<ResultsPage report={report} onRetakeCategory={() => {}} availableCategoryIds={allAvailable} />)
    expect(screen.getByText('+20 to Weapon')).toBeInTheDocument()
    expect(screen.getByText('+10 to Drilling')).toBeInTheDocument()
    // The old generic text should not appear
    expect(screen.queryByText(/to next band/)).not.toBeInTheDocument()
  })

  // Fix A-1: Dead-end guard — no Sharpen for empty-drilldown category + absent from Not yet mapped
  it('no Sharpen button and absent from Not yet mapped when category has no available drilldowns', () => {
    const availableIds = new Set(['a', 'b']) // 'c' (Gamma) has no drilldowns
    render(
      <ResultsPage
        report={report}
        onRetakeCategory={() => {}}
        availableCategoryIds={availableIds}
      />
    )
    // 'c' (Gamma) has no available drilldowns → should not appear at all
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
    // The header should also be absent since no unscored categories have drilldowns
    expect(screen.queryByText('Not yet mapped')).not.toBeInTheDocument()
  })

  // Fix A-1: Sharpen absent in scored row when no available drilldowns
  it('Sharpen button absent in scored row when category not in availableCategoryIds', () => {
    // 'a' scored, not in available set
    const availableIds = new Set(['b', 'c'])
    const mockRetake = vi.fn()
    render(
      <ResultsPage
        report={report}
        onRetakeCategory={mockRetake}
        availableCategoryIds={availableIds}
      />
    )
    // Alpha row should render but have no Sharpen button
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
    // Click all Sharpen buttons — none should trigger retake for 'a'
    const sharpenButtons = screen.getAllByText('Sharpen')
    sharpenButtons.forEach(btn => {
      fireEvent.click(btn)
    })
    expect(mockRetake).not.toHaveBeenCalledWith('a')
  })

  // Fix A-2: Finish & save calls finishSession, disables button, shows Saved
  it('Finish & save calls finishSession, disables button, and shows Saved', async () => {
    // Clear history before test
    localStorage.removeItem('skillcheck.history.v1')
    const { listHistory } = await import('../../lib/results/store')
    const onFinish = vi.fn()
    const session: AssessmentSession = {
      bankVersion: '1.0.0',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:01:00.000Z',
      intake: null,
      answers: {},
      completedCategories: [],
    }
    render(
      <ResultsPage
        report={report}
        onRetakeCategory={() => {}}
        availableCategoryIds={new Set(['a', 'b', 'c'])}
        session={session}
        onFinish={onFinish}
      />
    )
    const btn = screen.getByRole('button', { name: 'Finish & save' })
    expect(btn).not.toBeDisabled()

    await act(async () => { fireEvent.click(btn) })

    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(listHistory()).toHaveLength(1)
  })

  // Fix A (self-diff regression): after Finish & save, no "then N → now N" diff appears
  it('no self-diff after Finish & save — saved session excluded from prevScores lookup', async () => {
    localStorage.removeItem('skillcheck.history.v1')
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
    const session: AssessmentSession = {
      bankVersion: '1.0.0',
      startedAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:01:00.000Z',
      intake: null,
      answers: { td_001: { qid: 'td_001', v: 1, raw: 8 } },
      completedCategories: [],
    }
    render(
      <ResultsPage
        report={reportWithTakedowns}
        onRetakeCategory={() => {}}
        availableCategoryIds={new Set(['takedowns'])}
        session={session}
        onFinish={() => {}}
      />
    )
    // No diff before finish
    expect(document.body.textContent).not.toMatch(/then \d+ → now \d+/)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Finish & save' }))
    })

    // After finish, the just-saved session must NOT match itself — no spurious diff
    expect(document.body.textContent).not.toMatch(/then \d+ → now \d+/)
  })

  // Fix B (post-finish Sharpen blank screen): Sharpen buttons disabled after Finish & save
  it('Sharpen buttons are disabled after Finish & save', async () => {
    localStorage.removeItem('skillcheck.history.v1')
    const session: AssessmentSession = {
      bankVersion: '1.0.0',
      startedAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:01:00.000Z',
      intake: null,
      answers: {},
      completedCategories: [],
    }
    render(
      <ResultsPage
        report={report}
        onRetakeCategory={() => {}}
        availableCategoryIds={new Set(['a', 'b', 'c'])}
        session={session}
        onFinish={() => {}}
      />
    )
    // Sharpen buttons should exist and be enabled before finish
    const sharpensBefore = screen.getAllByRole('button', { name: 'Sharpen' })
    expect(sharpensBefore.length).toBeGreaterThan(0)
    sharpensBefore.forEach(btn => expect(btn).not.toBeDisabled())

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Finish & save' }))
    })

    // All Sharpen buttons must be disabled after finish
    const sharpensAfter = screen.getAllByRole('button', { name: 'Sharpen' })
    sharpensAfter.forEach(btn => expect(btn).toBeDisabled())
  })
})

// Fix A-1b: QuestionScreen defensive guard — empty questions fires onDone immediately
describe('QuestionScreen', () => {
  it('with empty questions array fires onDone immediately', () => {
    const onDone = vi.fn()
    render(
      <QuestionScreen
        questions={[]}
        answers={{}}
        onAnswer={() => {}}
        onDone={onDone}
        heading="Test"
        bank={bank}
      />
    )
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('shows info button for axis-scale questions but not for tap-scale questions', () => {
    // Create test fixtures with real scale IDs from the bank
    const axisQuestion = {
      qid: 'test_axis_001',
      v: 1,
      status: 'draft' as const,
      category: 'takedowns',
      axis: 'positional' as const,
      input: 'ability_axis', // axis scale
      text: 'Test axis question',
      tier: 'core' as const,
      scoring: { weight: 1, countsToward: 'skill' as const },
      flags: [],
    }

    const tapQuestion = {
      qid: 'test_tap_001',
      v: 1,
      status: 'draft' as const,
      category: 'takedowns',
      axis: 'positional' as const,
      input: 'ladder6', // tap scale
      text: 'Test tap question',
      tier: 'core' as const,
      scoring: { weight: 1, countsToward: 'skill' as const },
      flags: [],
    }

    // Test with axis scale
    const { rerender } = render(
      <QuestionScreen
        questions={[axisQuestion]}
        answers={{}}
        onAnswer={() => {}}
        onDone={() => {}}
        heading="Test"
        bank={bank}
      />
    )
    expect(screen.getByRole('button', { name: 'How this chart works' })).toBeInTheDocument()

    // Test with tap scale
    rerender(
      <QuestionScreen
        questions={[tapQuestion]}
        answers={{}}
        onAnswer={() => {}}
        onDone={() => {}}
        heading="Test"
        bank={bank}
      />
    )
    expect(screen.queryByRole('button', { name: 'How this chart works' })).not.toBeInTheDocument()
  })
})
