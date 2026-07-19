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
    // Use a known active question without slots to test the DRAFT prefix rendering
    const bank = loadBank()
    const activeNoSlots = bank.questions.find(q => q.status === 'active' && !q.slots)!
    const idx = bank.questions.indexOf(activeNoSlots)
    bank.questions[idx] = { ...activeNoSlots, status: 'draft' }
    const retireIdx = bank.questions.findIndex((q, i) => i !== idx && q.category === activeNoSlots.category)
    bank.questions[retireIdx] = { ...bank.questions[retireIdx], status: 'retired' }
    const md2 = renderReview(bank)
    expect(md2).toContain(`🚧 DRAFT — ${activeNoSlots.text}`)
    expect(md2).not.toContain(bank.questions[retireIdx].text)
  })
  it('shows anchor labels so Gerald never reads JSON', () => {
    expect(md).toContain('highest confidence')  // slider10 anchor label
  })
})
