import { QuestionSchema } from './schema.js'
import { lintQuestion, type LintWarning } from './lint.js'

export type ApplyBankEditResult =
  | { ok: true; updated: string; warnings: LintWarning[] }
  | { ok: false; error: string }

export interface BankEditChanges {
  text?: string
  slots?: { what: string; problem: string }
}

export function applyBankEdit(
  fileContent: string,
  qid: string,
  changes: BankEditChanges,
): ApplyBankEditResult {
  let parsed: { questions: unknown[] }
  try {
    parsed = JSON.parse(fileContent) as { questions: unknown[] }
  } catch {
    return { ok: false, error: 'invalid JSON in file' }
  }

  const questions = parsed.questions as Record<string, unknown>[]
  const idx = questions.findIndex(q => q.qid === qid)

  if (idx === -1) {
    return { ok: false, error: 'question not found' }
  }

  const existing = questions[idx]
  if (existing.status !== 'draft') {
    return { ok: false, error: 'only draft questions are editable' }
  }

  // Apply changes
  const candidate = { ...existing }
  if (changes.text !== undefined) {
    candidate.text = changes.text
  }
  if (changes.slots !== undefined) {
    candidate.slots = { ...changes.slots }
  }

  // Re-validate against QuestionSchema
  const parseResult = QuestionSchema.safeParse(candidate)
  if (!parseResult.success) {
    return { ok: false, error: `schema validation failed: ${parseResult.error.issues[0]?.message ?? 'invalid'}` }
  }

  // Compute lint warnings for the updated record
  const validated = parseResult.data
  const warnings = lintQuestion(validated)

  // Reconstruct file with 2-space indent + trailing newline
  const updatedQuestions = questions.map((q, i) => (i === idx ? parseResult.data : q))
  const updated = JSON.stringify({ ...parsed, questions: updatedQuestions }, null, 2) + '\n'

  return { ok: true, updated, warnings }
}
