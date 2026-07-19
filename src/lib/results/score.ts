import type { Bank, Question } from '../bank/schema'
import type { StoredAnswer } from './types'

export type Band = 'Unmapped' | 'Learning' | 'Drilling' | 'Positional' | 'Rolling' | 'Weapon'

export interface CategoryScore {
  categoryId: string
  name: string
  axis: string
  score: number | null
  band: Band | null
  answered: number
  activeCount: number
  uncertainty: 'none' | 'wide' | 'medium' | 'narrow'
  toNextBand: number | null
}

export interface Insight {
  categoryId: string
  kind: 'avoidance'
  text: string
}

export interface Report {
  bankVersion: string
  categories: CategoryScore[]
  insights: Insight[]
}

// PROVISIONAL normalization — pm.md open question #3 (cross-input comparability)
// is UNDECIDED by Gerald. Stored results keep raw answers (§4.3), so changing
// this table re-scores everything consistently and breaks nothing stored.
export const PROVISIONAL_NORMALIZATION: Record<string, (raw: number | number[]) => number> = {
  ladder6: r => (r as number) / 5,
  belt_threshold: r => (r as number) / 5,
  frequency10: r => (r as number) / 3,
  received_feedback: r => (r as number) / 2,
  know_check: r => (r as number) / 2,
  agree3: r => (r as number) / 2,
  belt_curve: r => (r as number[]).reduce((a, b) => a + b, 0) / ((r as number[]).length * 10),
  slider10: r => ((r as number) - 1) / 9,
}

function scoreQuestion(question: Question, answer: StoredAnswer | undefined, bank: Bank): number | null {
  // Answer is missing or raw is N/A
  if (!answer || answer.raw === null) {
    return null
  }

  // Get the scale for this question
  const scale = bank.scales.find(s => s.id === question.input)
  if (!scale) {
    return null
  }

  // Normalize the raw answer
  const normalizer = PROVISIONAL_NORMALIZATION[question.input]
  if (!normalizer) {
    return null
  }

  const normalized = normalizer(answer.raw)
  return Math.max(0, Math.min(1, normalized)) // Clamp to [0, 1]
}

function normToScore(norm: number): number {
  return Math.round(norm * 100)
}

function scoreToBand(score: number): Band {
  if (score < 20) return 'Unmapped'
  if (score < 40) return 'Learning'
  if (score < 60) return 'Drilling'
  if (score < 80) return 'Positional'
  if (score < 100) return 'Rolling'
  return 'Weapon'
}

function bandToEdge(band: Band): number {
  const edges: Record<Band, number> = {
    Unmapped: 20,
    Learning: 40,
    Drilling: 60,
    Positional: 80,
    Rolling: 100,
    Weapon: 100,
  }
  return edges[band]
}

export function scoreAnswers(answers: Record<string, StoredAnswer>, bank: Bank): Report {
  const answersByCategory: Record<string, Array<{ question: Question; normalized: number }>> = {}
  const psychAnswersByCategory: Record<string, Array<{ question: Question; raw: number }>> = {}

  // Group questions by category
  for (const question of bank.questions) {
    const answer = answers[question.qid]

    // Only consider active questions (or draft if the answer exists)
    const isActive = question.status === 'active'
    const isDraftButAnswered = question.status === 'draft' && answer !== undefined

    if (!isActive && !isDraftButAnswered) {
      continue
    }

    // Skip null raw (N/A)
    if (answer?.raw === null) {
      continue
    }

    if (!answersByCategory[question.category]) {
      answersByCategory[question.category] = []
      psychAnswersByCategory[question.category] = []
    }

    // Only skill questions contribute to the score
    if (question.scoring.countsToward === 'skill') {
      const normalized = scoreQuestion(question, answer, bank)
      if (normalized !== null) {
        answersByCategory[question.category].push({ question, normalized })
      }
    }

    // Track psychological answers for avoidance detection
    if (question.scoring.countsToward === 'none' && answer && typeof answer.raw === 'number') {
      psychAnswersByCategory[question.category].push({ question, raw: answer.raw })
    }
  }

  // Calculate category scores
  const categories: CategoryScore[] = []

  for (const category of bank.categories) {
    const skillAnswers = answersByCategory[category.id] || []

    // Count active skill questions for this category (exclude drafts from activeCount denominator)
    const activeSkillQuestions = bank.questions.filter(
      q => q.category === category.id && q.status === 'active' && q.scoring.countsToward === 'skill'
    )

    let score: number | null = null
    let band: Band | null = null
    let toNextBand: number | null = null
    let uncertainty: 'none' | 'wide' | 'medium' | 'narrow' = 'none'

    if (skillAnswers.length === 0) {
      // No skill answers, score is null
      uncertainty = 'none'
    } else {
      // Calculate weighted average
      let sumWeightedNorm = 0
      let sumWeights = 0

      for (const { question, normalized } of skillAnswers) {
        sumWeightedNorm += normalized * question.scoring.weight
        sumWeights += question.scoring.weight
      }

      const normScore = sumWeightedNorm / sumWeights
      score = normToScore(normScore)

      band = scoreToBand(score)

      // Determine uncertainty
      const answeredCount = skillAnswers.length
      const activeCount = activeSkillQuestions.length

      if (answeredCount === 1) {
        uncertainty = 'wide'
      } else if (answeredCount < activeCount) {
        uncertainty = 'medium'
      } else {
        uncertainty = 'narrow'
      }

      // Calculate toNextBand
      if (band !== 'Weapon') {
        const nextEdge = bandToEdge(band)
        toNextBand = nextEdge - score
      }
    }

    categories.push({
      categoryId: category.id,
      name: category.name,
      axis: category.axis,
      score,
      band,
      answered: skillAnswers.length,
      activeCount: activeSkillQuestions.length,
      uncertainty,
      toNextBand,
    })
  }

  // Detect avoidance insights
  const insights: Insight[] = []

  for (const category of bank.categories) {
    const psychAnswers = psychAnswersByCategory[category.id] || []
    const categoryScore = categories.find(c => c.categoryId === category.id)

    if (!categoryScore || categoryScore.score === null) {
      continue
    }

    // Check if any agree3 answer in this category has raw === 0
    const hasZeroAvoidance = psychAnswers.some(a => a.question.input === 'agree3' && a.raw === 0)

    if (hasZeroAvoidance && categoryScore.score < 40) {
      insights.push({
        categoryId: category.id,
        kind: 'avoidance',
        text: 'You rated this position low and don\'t enjoy it. That loop feeds itself — low-stakes positional rounds here beat avoiding it.',
      })
    }
  }

  return {
    bankVersion: bank.meta.bankVersion,
    categories,
    insights,
  }
}
