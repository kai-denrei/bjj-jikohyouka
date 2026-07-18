import { z } from 'zod'
import { BankMetaSchema, CategorySchema, QuestionSchema, ScaleSchema, type Question } from './schema'
import { lintText, type LintWarning } from './lint'
import type { RawBank } from './load'

export interface ValidationResult {
  errors: string[]
  warnings: LintWarning[]
  report: {
    perCategory: Record<string, { core: number; drilldown: number }>
    totalActive: number; totalDraft: number; totalRetired: number
    estimatedSeconds: { sweep: number; full: number }
  }
}

const CategoriesFile = z.object({ categories: z.array(CategorySchema) }).strict()
const ScalesFile = z.object({ scales: z.array(ScaleSchema) }).strict()
const QuestionsFile = z.object({ questions: z.array(z.unknown()) }).strict()
const ArchiveFile = z.object({ questions: z.array(z.unknown()) }).passthrough()

export function validateBank(raw: RawBank, archives: Array<{ file: string; data: unknown }>): ValidationResult {
  const errors: string[] = []
  const warnings: LintWarning[] = []

  const meta = BankMetaSchema.safeParse(raw.meta)
  if (!meta.success) errors.push(`bank.meta.json: ${meta.error.issues[0].message}`)
  const cats = CategoriesFile.safeParse(raw.categories)
  if (!cats.success) errors.push(`categories.json: ${cats.error.issues[0].message}`)
  const scales = ScalesFile.safeParse(raw.scales)
  if (!scales.success) errors.push(`scales.json: ${scales.error.issues[0].message}`)

  const categoryIds = new Set(cats.success ? cats.data.categories.map(c => c.id) : [])
  const scaleById = new Map(scales.success ? scales.data.scales.map(s => [s.id, s]) : [])

  // per-record schema check, collecting per-qid errors instead of throwing
  const questions: Question[] = []
  for (const [file, content] of Object.entries(raw.questionFiles)) {
    const parsed = QuestionsFile.safeParse(content)
    if (!parsed.success) { errors.push(`${file}: ${parsed.error.issues[0].message}`); continue }
    parsed.data.questions.forEach((rec, i) => {
      const res = QuestionSchema.safeParse(rec)
      if (res.success) questions.push(res.data)
      else {
        const qid = (rec as { qid?: string })?.qid ?? `#${i}`
        errors.push(`${file} ${qid}: ${res.error.issues.map(x => `${x.path.join('.')}: ${x.message}`).join('; ')}`)
      }
    })
  }

  // uniqueness
  const seen = new Map<string, number>()
  for (const q of questions) seen.set(q.qid, (seen.get(q.qid) ?? 0) + 1)
  for (const [qid, n] of seen) if (n > 1) errors.push(`duplicate qid ${qid} (${n}x)`)

  // archive lineage
  const archived = new Map<string, Question>()
  for (const { file, data } of archives) {
    const parsed = ArchiveFile.safeParse(data)
    if (!parsed.success) { errors.push(`${file}: archive snapshot unreadable`); continue }
    let badRecords = 0
    for (const rec of parsed.data.questions) {
      const res = QuestionSchema.safeParse(rec)
      if (res.success) archived.set(res.data.qid, res.data)
      else badRecords++
    }
    if (badRecords > 0) errors.push(`${file}: ${badRecords} archive record(s) failed schema parse — lineage checks incomplete`)
  }
  const knownQids = new Set([...seen.keys(), ...archived.keys()])

  for (const q of questions) {
    if (q.axis === 'psychological' && q.scoring.countsToward === 'skill')
      errors.push(`${q.qid}: psychological items must not count toward skill (countsToward must be "context" or "none")`)
    if (!categoryIds.has(q.category)) errors.push(`${q.qid}: unknown category "${q.category}"`)
    if (!scaleById.has(q.input)) errors.push(`${q.qid}: input "${q.input}" not in scales.json`)
    if (q.replaces && !knownQids.has(q.replaces)) errors.push(`${q.qid}: replaces "${q.replaces}" not found in bank or archive`)
    const prior = archived.get(q.qid)
    if (prior && prior.category !== q.category)
      errors.push(`${q.qid}: qid reuse — archived under category "${prior.category}", now "${q.category}"; qids are never recycled`)
    if (q.status !== 'retired') warnings.push(...lintText(q.qid, q.text))
  }

  // report (active only)
  const active = questions.filter(q => q.status === 'active')
  const perCategory: ValidationResult['report']['perCategory'] = {}
  for (const q of active) {
    const c = (perCategory[q.category] ??= { core: 0, drilldown: 0 })
    c[q.tier]++
  }
  const secs = (qs: Question[]) => qs.reduce((s, q) => s + (scaleById.get(q.input)?.secondsPerItem ?? 6), 0)
  return {
    errors, warnings,
    report: {
      perCategory,
      totalActive: active.length,
      totalDraft: questions.filter(q => q.status === 'draft').length,
      totalRetired: questions.filter(q => q.status === 'retired').length,
      estimatedSeconds: { sweep: secs(active.filter(q => q.tier === 'core')), full: secs(active) },
    },
  }
}
