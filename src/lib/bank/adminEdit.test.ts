import { describe, it, expect } from 'vitest'
import { applyBankEdit } from './adminEdit'

// A minimal positional questions file with one draft and one active question
const DRAFT_QUESTION = {
  qid: 'td_test_draft',
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

const ACTIVE_QUESTION = {
  qid: 'td_test_active',
  v: 1,
  status: 'active',
  category: 'takedowns',
  axis: 'positional',
  input: 'slider10',
  text: 'I can take down bigger opponents',
  tier: 'drilldown',
  scoring: { weight: 1, countsToward: 'skill' },
  flags: [],
}

const DRAFT_NO_SLOTS = {
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

function makeFile(questions: object[]): string {
  return JSON.stringify({ questions }, null, 2) + '\n'
}

describe('applyBankEdit', () => {
  it('edits a draft question text and returns updated JSON with trailing newline preserved', () => {
    const fileContent = makeFile([DRAFT_QUESTION, ACTIVE_QUESTION])
    const result = applyBankEdit(fileContent, 'td_test_draft', {
      text: 'In live sparring against full resistance, I complete a takedown',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Parses to valid JSON
    const parsed = JSON.parse(result.updated)
    const updated = parsed.questions.find((q: { qid: string }) => q.qid === 'td_test_draft')
    expect(updated.text).toBe('In live sparring against full resistance, I complete a takedown')

    // Trailing newline preserved
    expect(result.updated.endsWith('\n')).toBe(true)

    // 2-space indent preserved
    expect(result.updated).toContain('  "qid"')

    // Other questions untouched
    const active = parsed.questions.find((q: { qid: string }) => q.qid === 'td_test_active')
    expect(active.text).toBe(ACTIVE_QUESTION.text)
  })

  it('rejects an active qid with the correct error', () => {
    const fileContent = makeFile([DRAFT_QUESTION, ACTIVE_QUESTION])
    const result = applyBankEdit(fileContent, 'td_test_active', {
      text: 'new text',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('only draft questions are editable')
  })

  it('rejects an unknown qid', () => {
    const fileContent = makeFile([DRAFT_QUESTION])
    const result = applyBankEdit(fileContent, 'nonexistent_qid', {
      text: 'new text',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('question not found')
  })

  it('returns linter warnings when the new text contains "reliably"', () => {
    const fileContent = makeFile([DRAFT_QUESTION])
    const result = applyBankEdit(fileContent, 'td_test_draft', {
      text: 'I can reliably complete takedowns',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0].match).toBe('reliably')
    expect(result.warnings[0].kind).toBe('vague')
  })

  it('rejects a change that empties a slot (schema violation)', () => {
    const fileContent = makeFile([DRAFT_QUESTION])
    const result = applyBankEdit(fileContent, 'td_test_draft', {
      slots: { who: '', what: 'standing exchanges', problem: 'Do you complete a takedown?' },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('schema')
  })

  it('edits slot fields on a draft question', () => {
    const fileContent = makeFile([DRAFT_QUESTION])
    const result = applyBankEdit(fileContent, 'td_test_draft', {
      slots: {
        who: 'any rank',
        what: 'standing exchanges',
        problem: 'Do you finish the takedown?',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const parsed = JSON.parse(result.updated)
    const q = parsed.questions.find((q: { qid: string }) => q.qid === 'td_test_draft')
    expect(q.slots.who).toBe('any rank')
    expect(q.slots.problem).toBe('Do you finish the takedown?')
  })

  it('returns empty warnings for clean updated text', () => {
    const fileContent = makeFile([DRAFT_NO_SLOTS])
    const result = applyBankEdit(fileContent, 'td_no_slots_draft', {
      text: 'In sparring against a resisting partner, I complete a takedown',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.warnings).toHaveLength(0)
  })

  it('serializes schema defaults — flags appears even when the input record lacked it', () => {
    const draftNoFlags = {
      qid: 'td_test_no_flags',
      v: 1,
      status: 'draft',
      category: 'takedowns',
      axis: 'positional',
      input: 'slider10',
      text: 'I complete takedowns in sparring',
      tier: 'drilldown',
      scoring: { weight: 1, countsToward: 'skill' },
      // no flags key
    }
    const fileContent = makeFile([draftNoFlags])
    const result = applyBankEdit(fileContent, 'td_test_no_flags', {
      text: 'I complete takedowns reliably',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.updated).toContain('"flags": []')
  })
})
