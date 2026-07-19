import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { InterimScreen } from './InterimScreen'
import type { Report } from '../lib/results/score'

// Minimal report with three positional categories that have scores
// (Radar guard requires ≥3 non-null scored categories to render the polygon)
const report: Report = {
  bankVersion: '1.0.0',
  categories: [
    {
      categoryId: 'takedowns',
      name: 'Takedowns & Wrestling',
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
      name: 'Guard Passing',
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
      name: 'Mount Top',
      axis: 'positional',
      score: 55,
      band: 'Drilling',
      answered: 1,
      activeCount: 5,
      uncertainty: 'wide',
      toNextBand: 5,
    },
  ],
  insights: [],
}

describe('InterimScreen', () => {
  it('radar svg polygon appears before the First picture heading in DOM order', () => {
    const { container } = render(
      <InterimScreen
        report={report}
        recommended={['takedowns']}
        availableCategoryIds={new Set(['takedowns', 'guard_top'])}
        onPick={() => {}}
        onResults={() => {}}
      />
    )
    const polygon = container.querySelector('svg polygon')
    const heading = screen.getByRole('heading', { name: 'First picture' })

    expect(polygon).toBeTruthy()
    expect(heading).toBeTruthy()

    // compareDocumentPosition: 4 = following (heading follows polygon)
    const position = polygon!.compareDocumentPosition(heading)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('category chips only render categories present in availableCategoryIds', () => {
    render(
      <InterimScreen
        report={report}
        recommended={['takedowns', 'guard_top']}
        availableCategoryIds={new Set(['takedowns'])} // guard_top excluded
        onPick={() => {}}
        onResults={() => {}}
      />
    )
    // takedowns chip is present
    expect(screen.getByRole('button', { name: 'Takedowns & Wrestling' })).toBeInTheDocument()
    // guard_top chip is NOT present (not in availableCategoryIds)
    expect(screen.queryByRole('button', { name: 'Guard Passing' })).toBeNull()
  })

  it('renders no-drilldowns fallback line when availableCategoryIds is empty', () => {
    render(
      <InterimScreen
        report={report}
        recommended={[]}
        availableCategoryIds={new Set()}
        onPick={() => {}}
        onResults={() => {}}
      />
    )
    expect(
      screen.getByText('Drill-downs are coming to more categories as questions are approved.')
    ).toBeInTheDocument()
  })

  it('See results button is always rendered', () => {
    render(
      <InterimScreen
        report={report}
        recommended={[]}
        availableCategoryIds={new Set()}
        onPick={() => {}}
        onResults={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'See results' })).toBeInTheDocument()
  })
})
