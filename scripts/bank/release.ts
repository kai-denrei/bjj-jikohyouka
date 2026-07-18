import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BANK_DIR, loadBank, loadRawBank } from '../../src/lib/bank/load'
import { validateBank } from '../../src/lib/bank/validate'
import { bumpVersion, snapshot } from '../../src/lib/bank/release'

const archDir = join(BANK_DIR, 'archive')
const archives = readdirSync(archDir).filter(f => f.endsWith('.json')).sort()
  .map(f => JSON.parse(readFileSync(join(archDir, f), 'utf8')))

const { errors } = validateBank(loadRawBank(), archives)
if (errors.length) {
  console.error(`refusing to release: ${errors.length} validation error(s). Run npm run bank:validate.`)
  process.exit(1)
}

let bank = loadBank()
const today = new Date().toISOString().slice(0, 10)
const initial = !existsSync(join(archDir, `bank-${bank.meta.bankVersion}.json`))

if (initial) {
  const meta = { ...bank.meta, releasedAt: today }
  writeFileSync(join(BANK_DIR, 'bank.meta.json'), JSON.stringify(meta, null, 2) + '\n')
  bank = loadBank()
} else {
  const part = (['--major', '--minor', '--patch'].find(f => process.argv.includes(f)) ?? '--minor').slice(2) as 'major' | 'minor' | 'patch'
  if (process.env.npm_lifecycle_event && !['--major', '--minor', '--patch'].some(f => process.argv.includes(f))) {
    console.log('info: using default --minor; to override, run: npm run bank:release -- --patch|--minor|--major')
  }
  const next = bumpVersion(bank.meta.bankVersion, part)
  const meta = { ...bank.meta, bankVersion: next, releasedAt: today }
  writeFileSync(join(BANK_DIR, 'bank.meta.json'), JSON.stringify(meta, null, 2) + '\n')
  const clPath = join(BANK_DIR, 'CHANGELOG.md')
  const cl = readFileSync(clPath, 'utf8')
  writeFileSync(clPath, cl.replace('# Question Bank Changelog\n',
    `# Question Bank Changelog\n\n## ${next} — ${today}\n\n- (describe changes here before committing)\n`))
  bank = loadBank()
}

const out = join(archDir, `bank-${bank.meta.bankVersion}.json`)
writeFileSync(out, JSON.stringify(snapshot(bank), null, 2) + '\n')
console.log(`${initial ? 'initial ' : ''}release ${bank.meta.bankVersion} → ${out}`)
