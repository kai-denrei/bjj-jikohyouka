import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
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
})
