import { z } from 'zod'

export const ScaleSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  kind: z.enum(['tap', 'curve', 'slider']),
  label: z.string(),
  anchors: z.array(z.object({ value: z.number(), label: z.string() }).strict()).min(2),
  na: z.boolean().optional(),        // scale offers an N/A chip (belt_threshold)
  legacy: z.boolean().optional(),    // v0.1-only scale, not for new content
  secondsPerItem: z.number().positive(),
}).strict()

export const CategorySchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  axis: z.string(),
  weight: z.number().positive(),
  description: z.string().optional(),
  beltStageEmphasis: z.record(z.string(), z.number()).optional(), // brief §4.1, unused until Results v2
}).strict()

export const QuestionSchema = z.object({
  qid: z.string().regex(/^[a-z0-9_]+$/),
  v: z.number().int().min(1),
  status: z.enum(['draft', 'active', 'retired']),
  replaces: z.string().optional(),
  category: z.string(),
  axis: z.enum(['positional', 'meta', 'reputation', 'knowledge', 'psychological']),
  input: z.string(),                 // cross-checked against scales.json by validate.ts, not enum
  text: z.string().min(1),
  tier: z.enum(['core', 'drilldown']),
  scoring: z.object({
    weight: z.number().positive(),
    countsToward: z.enum(['skill', 'context', 'none']),
  }).strict(),
  rationale: z.string().optional(),
  flags: z.array(z.string()).default([]),
  // §4.6 future-proofing hooks — schema only, no implementation
  difficulty: z.number().optional(),
  abTestGroup: z.string().optional(),
  raterMode: z.enum(['self', 'observer']).optional(),
  // provenance passthrough from v0.1 conversion
  legacy: z.object({
    type: z.string().optional(),
    level: z.string().optional(),
    subcategory: z.string().optional(),
    required: z.boolean().optional(),
    diagnostic: z.boolean().optional(),
  }).strict().optional(),
}).strict()

export const BankMetaSchema = z.object({
  bankVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  releasedAt: z.string(),
  changelog: z.string(),
}).strict()

export type Scale = z.infer<typeof ScaleSchema>
export type Category = z.infer<typeof CategorySchema>
export type Question = z.infer<typeof QuestionSchema>
export type BankMeta = z.infer<typeof BankMetaSchema>

export interface Bank {
  meta: BankMeta
  categories: Category[]
  scales: Scale[]
  questions: Question[]
}
