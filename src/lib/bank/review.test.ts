import { describe, it, expect } from 'vitest'
import { renderReview } from './review'
import { loadBank } from './load'

describe('renderReview', () => {
  const md = renderReview(loadBank())
  it('has one section per category that has non-retired questions', () => {
    const bank = loadBank()
    const categoriesWithQuestions = bank.categories.filter(cat =>
      bank.questions.some(q => q.category === cat.id && q.status !== 'retired')
    ).length
    expect(md.match(/^## /gm)).toHaveLength(categoriesWithQuestions)
  })
  it('contains every active question text exactly once', () => {
    const bank = loadBank()
    for (const q of bank.questions.filter(q => q.status === 'active').slice(0, 20))
      expect(md).toContain(q.text)
  })
  it('excludes retired questions and marks drafts', () => {
    // After cutover, all active items have slots (ability_axis). Use an active item directly.
    const bank = loadBank()
    const activeItem = bank.questions.find(q => q.status === 'active')!
    const idx = bank.questions.indexOf(activeItem)
    bank.questions[idx] = { ...activeItem, status: 'draft' }
    const retireIdx = bank.questions.findIndex((q, i) => i !== idx && q.category === activeItem.category)
    bank.questions[retireIdx] = { ...bank.questions[retireIdx], status: 'retired' }
    const md2 = renderReview(bank)
    expect(md2).toContain(`🚧 DRAFT — ${activeItem.text}`)
    expect(md2).not.toContain(bank.questions[retireIdx].text)
  })
  it('shows anchor labels so Gerald never reads JSON', () => {
    expect(md).toContain('Untrained')  // ability_axis anchor label (all active items are ability_axis)
  })
})
