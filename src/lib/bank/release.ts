import type { Bank, Category, Question, Scale } from './schema'

export function bumpVersion(v: string, part: 'major' | 'minor' | 'patch'): string {
  const [maj, min, pat] = v.split('.').map(Number)
  if (part === 'major') return `${maj + 1}.0.0`
  if (part === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

export interface Snapshot {
  bankVersion: string; releasedAt: string
  categories: Category[]; scales: Scale[]; questions: Question[]
}

export function snapshot(bank: Bank): Snapshot {
  return {
    bankVersion: bank.meta.bankVersion,
    releasedAt: bank.meta.releasedAt,
    categories: bank.categories,
    scales: bank.scales,
    questions: bank.questions,   // ALL statuses — the archive is the immutable record
  }
}
