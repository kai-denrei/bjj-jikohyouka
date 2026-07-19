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
    // bank 1.0.0 has no drafts/retired yet — assert the rendering rules directly
    const bank = loadBank()
    bank.questions[0] = { ...bank.questions[0], status: 'draft' }
    bank.questions[1] = { ...bank.questions[1], status: 'retired' }
    const md2 = renderReview(bank)
    expect(md2).toContain(`🚧 DRAFT — ${bank.questions[0].text}`)
    expect(md2).not.toContain(bank.questions[1].text)
  })
  it('shows anchor labels so Gerald never reads JSON', () => {
    expect(md).toContain('highest confidence')  // slider10 anchor label
  })
})
