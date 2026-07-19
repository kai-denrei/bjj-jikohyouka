export interface LintWarning { qid: string; kind: 'vague' | 'normative'; match: string }

const VAGUE = ['reliably', 'consistently', 'often', 'usually', 'good at', 'comfortable', 'confident']
const NORMATIVE = ['better than', 'average', 'most people at my level']

const rx = (phrase: string) => new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i')
const RULES: Array<{ kind: LintWarning['kind']; phrase: string; re: RegExp }> = [
  ...VAGUE.map(p => ({ kind: 'vague' as const, phrase: p, re: rx(p) })),
  ...NORMATIVE.map(p => ({ kind: 'normative' as const, phrase: p, re: rx(p) })),
]

export function lintText(qid: string, text: string): LintWarning[] {
  return RULES.filter(r => r.re.test(text)).map(r => ({ qid, kind: r.kind, match: r.phrase }))
}

export function lintQuestion(q: { qid: string; text: string; slots?: { who: string; what: string; problem: string } }): LintWarning[] {
  const warnings: LintWarning[] = [...lintText(q.qid, q.text)]
  if (q.slots) {
    for (const str of [q.slots.who, q.slots.what, q.slots.problem]) {
      warnings.push(...lintText(q.qid, str))
    }
  }
  return warnings
}
