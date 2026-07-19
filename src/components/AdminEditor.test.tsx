import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminEditor } from './AdminEditor'
import type { Question } from '../lib/bank/schema'

const DRAFT_QUESTION_WITH_SLOTS: Question = {
  qid: 'td_takedown_live',
  v: 1,
  status: 'draft',
  category: 'takedowns',
  axis: 'positional',
  input: 'ability_axis',
  slots: {
    who: 'same rank',
    what: 'standing exchanges',
    problem: 'Do you complete a takedown against full resistance?',
  },
  text: 'In standing exchanges against full resistance, I complete a takedown',
  tier: 'core',
  scoring: { weight: 1, countsToward: 'skill' },
  flags: [],
}

const DRAFT_QUESTION_NO_SLOTS: Question = {
  qid: 'td_no_slots_draft',
  v: 1,
  status: 'draft',
  category: 'takedowns',
  axis: 'positional',
  input: 'slider10',
  text: 'I complete takedowns in sparring',
  tier: 'drilldown',
  scoring: { weight: 1, countsToward: 'skill' },
  flags: [],
}

describe('AdminEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not render when admin is false', () => {
    const { container } = render(
      <AdminEditor question={DRAFT_QUESTION_WITH_SLOTS} onSaved={() => {}} admin={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders an Edit button in collapsed state when admin is true', () => {
    render(<AdminEditor question={DRAFT_QUESTION_WITH_SLOTS} onSaved={() => {}} admin={true} />)
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    // Editor form not visible yet
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('expands the editor on Edit click', () => {
    render(<AdminEditor question={DRAFT_QUESTION_WITH_SLOTS} onSaved={() => {}} admin={true} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    // textarea should be visible
    expect(screen.getByRole('textbox', { name: /text/i })).toBeInTheDocument()
    // slot inputs visible (question has slots)
    expect(screen.getByRole('textbox', { name: /who/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /what/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /problem/i })).toBeInTheDocument()
    // note line
    expect(screen.getByText(/Edits draft questions only\. Saving reloads the page\./)).toBeInTheDocument()
  })

  it('does not render slot inputs when question has no slots', () => {
    render(<AdminEditor question={DRAFT_QUESTION_NO_SLOTS} onSaved={() => {}} admin={true} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.queryByRole('textbox', { name: /who/i })).toBeNull()
  })

  it('POSTs correct payload on Save and shows warnings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, warnings: [{ qid: 'td_takedown_live', kind: 'vague', match: 'reliably' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminEditor question={DRAFT_QUESTION_WITH_SLOTS} onSaved={() => {}} admin={true} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    // Change text
    const textarea = screen.getByRole('textbox', { name: /text/i })
    fireEvent.change(textarea, { target: { value: 'I can reliably complete takedowns' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/__bank/update')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string)
    expect(body.file).toBe('positional')
    expect(body.qid).toBe('td_takedown_live')
    expect(body.changes.text).toBe('I can reliably complete takedowns')

    // warnings shown — the warning span contains 'reliably' (may also appear in textarea value)
    await waitFor(() => {
      const matches = screen.getAllByText(/reliably/)
      // at least one match is the warning span (not the textarea)
      const warningSpan = matches.find(el => el.tagName !== 'TEXTAREA')
      expect(warningSpan).toBeInTheDocument()
    })
  })

  it('shows error message on server error response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: 'only draft questions are editable' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminEditor question={DRAFT_QUESTION_WITH_SLOTS} onSaved={() => {}} admin={true} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/only draft questions are editable/)).toBeInTheDocument()
    })
  })
})
