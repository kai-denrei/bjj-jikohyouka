import { readFileSync, writeFileSync } from 'node:fs'
import { deriveText } from '../../src/lib/bank/adminEdit.js'

const FILES = [
  'src/data/question-bank/questions/positional.json',
  'src/data/question-bank/questions/meta-qualities.json',
  'src/data/question-bank/questions/reputation.json',
]

for (const path of FILES) {
  const data = JSON.parse(readFileSync(path, 'utf-8')) as { questions: Array<{ slots?: { what: string; problem: string }; text: string }> }
  let changed = 0
  for (const q of data.questions) {
    if (q.slots) {
      const derived = deriveText(q.slots)
      if (q.text !== derived) { q.text = derived; changed++ }
    }
  }
  if (changed > 0) writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  console.log(`${path}: ${changed} texts derived`)
}
