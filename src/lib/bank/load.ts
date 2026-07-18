import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { BankMetaSchema, CategorySchema, QuestionSchema, ScaleSchema, type Bank } from './schema'

export const BANK_DIR = 'src/data/question-bank'

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export interface RawBank {
  meta: unknown
  categories: unknown
  scales: unknown
  questionFiles: Record<string, unknown>  // filename → parsed content
}

export function loadRawBank(dir: string = BANK_DIR): RawBank {
  const qDir = join(dir, 'questions')
  const questionFiles: Record<string, unknown> = {}
  for (const f of readdirSync(qDir).filter(f => f.endsWith('.json')).sort()) {
    questionFiles[f] = readJson(join(qDir, f))
  }
  return {
    meta: readJson(join(dir, 'bank.meta.json')),
    categories: readJson(join(dir, 'categories.json')),
    scales: readJson(join(dir, 'scales.json')),
    questionFiles,
  }
}

const QuestionFileSchema = z.object({ questions: z.array(QuestionSchema) }).strict()

export function loadBank(dir: string = BANK_DIR): Bank {
  const raw = loadRawBank(dir)
  return {
    meta: BankMetaSchema.parse(raw.meta),
    categories: z.object({ categories: z.array(CategorySchema) }).strict().parse(raw.categories).categories,
    scales: z.object({ scales: z.array(ScaleSchema) }).strict().parse(raw.scales).scales,
    questions: Object.values(raw.questionFiles).flatMap(f => QuestionFileSchema.parse(f).questions),
  }
}
