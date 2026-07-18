import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BANK_DIR, loadRawBank } from '../../src/lib/bank/load'
import { validateBank } from '../../src/lib/bank/validate'

const archDir = join(BANK_DIR, 'archive')
const archives = existsSync(archDir)
  ? readdirSync(archDir).filter(f => f.endsWith('.json')).sort()
      .map(f => ({ file: f, data: JSON.parse(readFileSync(join(archDir, f), 'utf8')) }))
  : []

const { errors, warnings, report } = validateBank(loadRawBank(), archives)

const min = (s: number) => `${Math.round(s / 60)} min`
console.log(`active ${report.totalActive} · draft ${report.totalDraft} · retired ${report.totalRetired}`)
console.log(`estimated: sweep ${min(report.estimatedSeconds.sweep)} · full ${min(report.estimatedSeconds.full)}`)
for (const [cat, c] of Object.entries(report.perCategory))
  console.log(`  ${cat}: ${c.core} core, ${c.drilldown} drilldown`)
if (warnings.length) {
  console.log(`\n${warnings.length} wording warning(s) — linter is a word list, necessary not sufficient; bank:review is the real gate:`)
  for (const w of warnings) console.log(`  [${w.kind}] ${w.qid}: "${w.match}"`)
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log('\nbank:validate OK')
