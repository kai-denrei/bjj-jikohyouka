import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { convertV01 } from '../../src/lib/bank/convert-v01'
import { BANK_DIR, loadBank } from '../../src/lib/bank/load'

const v01 = JSON.parse(readFileSync('src/data/legacy/skill-assessment.v0.1.json', 'utf8'))
const today = new Date().toISOString().slice(0, 10)
const { meta, categories, questions } = convertV01(v01, today)

const write = (rel: string, data: unknown) =>
  writeFileSync(join(BANK_DIR, rel), JSON.stringify(data, null, 2) + '\n')

mkdirSync(join(BANK_DIR, 'questions'), { recursive: true })
mkdirSync(join(BANK_DIR, 'archive'), { recursive: true })
write('bank.meta.json', meta)
write('categories.json', { categories })
write('questions/positional.json', { questions })
writeFileSync(join(BANK_DIR, 'CHANGELOG.md'),
  `# Question Bank Changelog\n\n## 1.0.0 — ${today}\n\n- Initial conversion of v0.1 \`skill-assessment.json\` (${questions.length} questions, ${categories.length} categories). All records \`active\`, inputs \`slider10\`/\`belt_curve\`, qids preserved from v0.1.\n`)

const bank = loadBank()  // round-trip sanity check
console.log(`bank ${bank.meta.bankVersion}: ${bank.questions.length} questions, ${bank.categories.length} categories, ${bank.scales.length} scales`)
