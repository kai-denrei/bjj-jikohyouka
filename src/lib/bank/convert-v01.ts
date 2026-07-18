import { z } from 'zod'
import type { BankMeta, Category, Question } from './schema'

const V01Question = z.object({
  id: z.string(), text: z.string(), type: z.string(), level: z.string(),
  category_id: z.string(), subcategory: z.string().optional(),
  required: z.boolean().optional(), diagnostic: z.boolean().optional(),
  input: z.string().optional(),
}).passthrough()

const V01File = z.object({
  assessment: z.object({
    categories: z.array(z.object({
      id: z.string(), name: z.string(), description: z.string().optional(),
      weight: z.number(), questions: z.array(V01Question),
    }).passthrough()),
  }).passthrough(),
}).passthrough()

const LEVEL_WEIGHTS: Record<string, number> = { basic: 1.0, intermediate: 1.5, advanced: 2.0 }

export function convertV01(v01: unknown, releasedAt: string): {
  meta: BankMeta; categories: Category[]; questions: Question[]
} {
  const file = V01File.parse(v01)
  const categories: Category[] = file.assessment.categories.map(c => ({
    id: c.id, name: c.name, axis: 'positional', weight: c.weight,
    ...(c.description ? { description: c.description } : {}),
  }))
  const questions: Question[] = file.assessment.categories.flatMap(c =>
    c.questions.map(q => {
      const psych = q.type === 'psychological'
      const curve = q.input === 'belt-curve'
      const weight = LEVEL_WEIGHTS[q.level]
      if (weight === undefined) throw new Error(`unknown level "${q.level}" on ${q.id}`)
      return {
        qid: q.id, v: 1, status: 'active' as const,
        category: c.id,
        axis: psych ? ('psychological' as const) : ('positional' as const),
        input: curve ? 'belt_curve' : 'slider10',
        text: q.text,
        tier: q.diagnostic ? ('core' as const) : ('drilldown' as const),
        scoring: { weight, countsToward: psych ? ('none' as const) : ('skill' as const) },
        rationale: 'Converted verbatim from v0.1 skill-assessment.json',
        flags: curve ? ['showcase_curve'] : [],
        legacy: {
          type: q.type, level: q.level,
          ...(q.subcategory ? { subcategory: q.subcategory } : {}),
          ...(q.required !== undefined ? { required: q.required } : {}),
          ...(q.diagnostic !== undefined ? { diagnostic: q.diagnostic } : {}),
        },
      }
    }))
  return {
    meta: { bankVersion: '1.0.0', releasedAt, changelog: './CHANGELOG.md' },
    categories, questions,
  }
}
