import { BankMetaSchema, CategorySchema, ScaleSchema, QuestionSchema, type Bank } from './bank/schema'
import { z } from 'zod'
import bankMeta from '../data/question-bank/bank.meta.json'
import categoriesData from '../data/question-bank/categories.json'
import scalesData from '../data/question-bank/scales.json'
import positionalData from '../data/question-bank/questions/positional.json'

const QuestionFileSchema = z.object({ questions: z.array(QuestionSchema) }).strict()

export const bank: Bank = {
  meta: BankMetaSchema.parse(bankMeta),
  categories: z.object({ categories: z.array(CategorySchema) }).strict().parse(categoriesData).categories,
  scales: z.object({ scales: z.array(ScaleSchema) }).strict().parse(scalesData).scales,
  questions: [
    ...QuestionFileSchema.parse(positionalData).questions,
  ],
}
