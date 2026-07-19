import type { Bank, Question } from './bank/schema'
import type { Report } from './results/score'

export function includeDrafts(search: string): boolean {
  return search.includes('?bank=draft') || search.includes('&bank=draft')
}

export function visibleQuestions(bank: Bank, drafts: boolean): Question[] {
  return bank.questions.filter(q => {
    if (q.status === 'retired') return false
    if (q.status === 'draft' && !drafts) return false
    return true
  })
}

export function sweepQuestions(bank: Bank, drafts: boolean): Question[] {
  const result: Question[] = []
  for (const category of bank.categories) {
    // When drafts=true, a draft core replaces the active core of the same category
    if (drafts) {
      const draftCore = bank.questions.find(q => q.category === category.id && q.tier === 'core' && q.status === 'draft')
      if (draftCore) {
        result.push(draftCore)
        continue
      }
    }
    const activeCore = bank.questions.find(q => q.category === category.id && q.tier === 'core' && q.status === 'active')
    if (activeCore) {
      result.push(activeCore)
    }
  }
  return result
}

export function drilldownQuestions(bank: Bank, categoryId: string, drafts: boolean): Question[] {
  return bank.questions.filter(q => {
    if (q.category !== categoryId) return false
    if (q.tier !== 'drilldown') return false
    if (q.status === 'retired') return false
    if (drafts) {
      // In draft mode, return ONLY draft questions
      return q.status === 'draft'
    } else {
      // In non-draft mode, return only active questions
      return q.status === 'active'
    }
  })
}

export function recommendedDrilldowns(report: Report, bank: Bank): string[] {
  // positional axis only
  const positionalCategories = bank.categories.filter(c => c.axis === 'positional')

  // Get scores for positional categories with non-null scores
  const scored = positionalCategories
    .map(c => {
      const cs = report.categories.find(rc => rc.categoryId === c.id)
      return { id: c.id, score: cs?.score ?? null }
    })
    .filter(c => c.score !== null) as { id: string; score: number }[]

  // Sort by score ascending (lowest first)
  const sorted = [...scored].sort((a, b) => a.score - b.score)

  // 3 lowest non-null scored categories + any category with score <= 40
  // deduped, in categories order
  const recommended = new Set<string>()

  // Add 3 lowest
  for (const item of sorted.slice(0, 3)) {
    recommended.add(item.id)
  }

  // Add any with score <= 40
  for (const item of scored) {
    if (item.score <= 40) {
      recommended.add(item.id)
    }
  }

  // Return in categories order
  return positionalCategories
    .map(c => c.id)
    .filter(id => recommended.has(id))
}
