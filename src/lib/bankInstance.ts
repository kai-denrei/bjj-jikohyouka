import { BankMetaSchema, CategorySchema, ScaleSchema, QuestionSchema, type Bank } from './bank/schema'
import { z } from 'zod'
import bankMeta from '../data/question-bank/bank.meta.json'
import categoriesData from '../data/question-bank/categories.json'
import scalesData from '../data/question-bank/scales.json'
import positionalData from '../data/question-bank/questions/positional.json'
import metaQualitiesData from '../data/question-bank/questions/meta-qualities.json'
import reputationData from '../data/question-bank/questions/reputation.json'

const QuestionFileSchema = z.object({ questions: z.array(QuestionSchema) }).strict()

export const bank: Bank = {
  meta: BankMetaSchema.parse(bankMeta),
  categories: z.object({ categories: z.array(CategorySchema) }).strict().parse(categoriesData).categories,
  scales: z.object({ scales: z.array(ScaleSchema) }).strict().parse(scalesData).scales,
  // Question files — add new bank question files here (one import + one line below):
  questions: [
    ...QuestionFileSchema.parse(positionalData).questions,
    ...QuestionFileSchema.parse(metaQualitiesData).questions,
    ...QuestionFileSchema.parse(reputationData).questions,
  ],
}
