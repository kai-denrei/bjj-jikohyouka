import { z } from 'zod'

export const StoredAnswerSchema = z.object({
  qid: z.string(), v: z.number().int().min(1),
  raw: z.union([z.number(), z.array(z.number()), z.null()]),  // null = N/A tap
}).strict()

// Back-compat: non-strict so sessions saved with legacy belt/style keys
// silently strip those fields on parse rather than rejecting.
export const IntakeSchema = z.object({
  years: z.enum(['<1', '1-3', '3-6', '6-10', '10+']),
  sessionsPerWeek: z.enum(['1-2', '3-4', '5+']),
})

export const AssessmentSessionSchema = z.object({
  bankVersion: z.string(), startedAt: z.string(), updatedAt: z.string(),
  intake: IntakeSchema.nullable(),
  answers: z.record(z.string(), StoredAnswerSchema),
  completedCategories: z.array(z.string()),
}).strict()

export const ExportFileSchema = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(AssessmentSessionSchema),
}).strict()

export type StoredAnswer = z.infer<typeof StoredAnswerSchema>
export type Intake = z.infer<typeof IntakeSchema>
export type AssessmentSession = z.infer<typeof AssessmentSessionSchema>
export type ExportFile = z.infer<typeof ExportFileSchema>
