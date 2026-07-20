/**
 * Dashboard.test.tsx — Task 3, verdict #5
 * TDD: Write failing tests first. RED → implement → GREEN.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Dashboard } from './Dashboard'
import type { Report } from '../lib/results/score'
import type { AssessmentSession } from '../lib/results/types'
import { drilldownQuestions } from '../lib/flow'
import { bank } from '../lib/bankInstance'

// Minimal report with positional categories + meta
const report: Report = {
  bankVersion: '1.0.0',
  categories: [
    {
      categoryId: 'takedowns',
      name: 'Takedowns & Wrestling',
      shortName: 'Takedowns',
      axis: 'positional',
      score: 40,
      band: 'Learning',
      answered: 1,
      activeCount: 5,
      uncertainty: 'wide',
      toNextBand: 0,
    },
    {
      categoryId: 'guard_top',
      name: 'Guard Passing (Top)',
      shortName: 'Guard Pass',
      axis: 'positional',
      score: 70,
      band: 'Positional',
      answered: 1,
      activeCount: 5,
      uncertainty: 'wide',
      toNextBand: 10,
    },
    {
      categoryId: 'mount_top',
      name: 'Mount (Top)',
      shortName: 'Mount Top',
      axis: 'positional',
      score: 55,
      band: 'Drilling',
      answered: 1,
      activeCount: 5,
      uncertainty: 'wide',
      toNextBand: 5,
    },
    {
      categoryId: 'meta_qualities',
      name: 'Meta-qualities',
      shortName: 'Meta',
      axis: 'meta',
      score: 60,
      band: 'Drilling',
      answered: 1,
      activeCount: 5,
      uncertainty: 'wide',
      toNextBand: 0,
    },
  ],
  insights: [],
}

const minimalSession: AssessmentSession = {
  bankVersion: '1.0.0',
  startedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:01:00.000Z',
  intake: null,
  answers: {},
  completedCategories: [],
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('Dashboard', () => {
  it('renders VizTabs tablist on the dashboard', () => {
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns'])}
        drafts={false}
      />
    )
    // VizTabs has role="tablist"
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('renders category rows for positional categories', () => {
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns'])}
        drafts={false}
      />
    )
    // Each positional category should have a data-testid="category-row"
    const rows = screen.getAllByTestId('category-row')
    expect(rows.length).toBeGreaterThan(0)
    // takedowns shortName should appear in at least one category row
    const takedownsRow = rows.find(r => r.textContent?.includes('Takedowns'))
    expect(takedownsRow).toBeTruthy()
  })

  it('shows answered/total drill-down count when session has matching answers', () => {
    // Takedowns has 12 active drilldown questions in non-draft mode.
    // Inject one answer (td_001) so the row should show "1/12".
    const takedownDrilldowns = drilldownQuestions(bank, 'takedowns', false)
    expect(takedownDrilldowns.length).toBeGreaterThan(0)
    const firstQid = takedownDrilldowns[0].qid // td_001
    const total = takedownDrilldowns.length     // 12

    const sessionWithAnswer: AssessmentSession = {
      ...minimalSession,
      answers: { [firstQid]: { qid: firstQid, v: 3, raw: 3 } },
    }

    render(
      <Dashboard
        report={report}
        session={sessionWithAnswer}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns'])}
        drafts={false}
      />
    )

    // The Takedowns row should show "1/<total>"
    const rows = screen.getAllByTestId('category-row')
    const takedownsRow = rows.find(r => r.textContent?.includes('Takedowns'))
    expect(takedownsRow).toBeTruthy()
    expect(takedownsRow!.textContent).toContain(`1/${total}`)
  })

  it('meta section is absent when meta_qualities has no active drilldowns (non-draft mode)', () => {
    // In non-draft mode, meta_qualities has 0 active drilldowns (all are drafts).
    // The "Cross-cutting" header and meta rows must not appear.
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns'])}
        drafts={false}
      />
    )
    expect(screen.queryByText('Cross-cutting')).not.toBeInTheDocument()
    // Meta row for "Meta" (shortName in report fixture) should not appear
    const rows = screen.queryAllByTestId('category-row')
    const metaRow = rows.find(r => r.textContent?.includes('Meta'))
    expect(metaRow).toBeUndefined()
  })

  it('meta section is present when meta_qualities has available drilldowns (drafts mode)', () => {
    // In draft mode, meta_qualities has 10 draft drilldown questions → section renders.
    const metaDrilldowns = drilldownQuestions(bank, 'meta_qualities', true)
    expect(metaDrilldowns.length).toBeGreaterThan(0)

    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns', 'meta_qualities'])}
        drafts={true}
      />
    )
    expect(screen.getByText('Cross-cutting')).toBeInTheDocument()
    // The meta row should show "0/<total>" since no answers injected
    const rows = screen.getAllByTestId('category-row')
    const metaRow = rows.find(r => r.textContent?.includes('Meta'))
    expect(metaRow).toBeTruthy()
    expect(metaRow!.textContent).toContain(`0/${metaDrilldowns.length}`)
  })

  it('unavailable category row is not a button', () => {
    // guard_top is NOT in availableCategoryIds — its row should not be clickable
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns'])} // guard_top excluded
        drafts={false}
      />
    )
    const rows = screen.getAllByTestId('category-row')
    // Find the guard_top row
    const guardTopRow = rows.find(r => r.textContent?.includes('Guard Pass'))
    expect(guardTopRow).toBeTruthy()
    // It should NOT be a button element
    expect(guardTopRow!.tagName.toLowerCase()).not.toBe('button')
  })

  it('available category row is a button and calls onPick when clicked', () => {
    const picks: string[] = []
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={id => picks.push(id)}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns'])}
        drafts={false}
      />
    )
    const rows = screen.getAllByTestId('category-row')
    const takedownsRow = rows.find(r => r.textContent?.includes('Takedowns'))
    expect(takedownsRow).toBeTruthy()
    expect(takedownsRow!.tagName.toLowerCase()).toBe('button')
    fireEvent.click(takedownsRow!)
    expect(picks).toContain('takedowns')
  })

  it('completed category row shows filled dot ●', () => {
    const sessionWithCompleted: AssessmentSession = {
      ...minimalSession,
      completedCategories: ['takedowns'],
    }
    render(
      <Dashboard
        report={report}
        session={sessionWithCompleted}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set(['takedowns'])}
        drafts={false}
      />
    )
    // The takedowns row should contain a filled dot
    const rows = screen.getAllByTestId('category-row')
    const takedownsRow = rows.find(r => r.textContent?.includes('Takedowns'))
    expect(takedownsRow?.textContent).toContain('●')
  })

  it('renders Full report button that calls onResults', () => {
    const onResultsCalled: boolean[] = []
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => onResultsCalled.push(true)}
        availableCategoryIds={new Set()}
        drafts={false}
      />
    )
    const btn = screen.getByRole('button', { name: 'Full report' })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onResultsCalled).toHaveLength(1)
  })

  it('renders What we measure button when onShowDimensions prop provided', () => {
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set()}
        drafts={false}
        onShowDimensions={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'What we measure' })).toBeInTheDocument()
  })

  it('does not render What we measure button when onShowDimensions prop absent', () => {
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set()}
        drafts={false}
      />
    )
    expect(screen.queryByRole('button', { name: 'What we measure' })).not.toBeInTheDocument()
  })

  it('has Deep dives section header', () => {
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set()}
        drafts={false}
      />
    )
    expect(screen.getByText('Deep dives')).toBeInTheDocument()
  })

  it('shows band chip for scored categories', () => {
    render(
      <Dashboard
        report={report}
        session={minimalSession}
        onPick={() => {}}
        onResults={() => {}}
        availableCategoryIds={new Set()}
        drafts={false}
      />
    )
    // takedowns has band 'Learning' — should appear
    expect(screen.getByText('Learning')).toBeInTheDocument()
  })
})
