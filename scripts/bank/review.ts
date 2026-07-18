import { writeFileSync, mkdirSync } from 'node:fs'
import { loadBank } from '../../src/lib/bank/load'
import { renderReview } from '../../src/lib/bank/review'

mkdirSync('docs', { recursive: true })
const md = renderReview(loadBank())
writeFileSync('docs/bank-review.md', md)
console.log(`docs/bank-review.md written (${md.split('\n').length} lines)`)
