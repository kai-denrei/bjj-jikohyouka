# Question Bank — placeholder

Target layout (brief §4.1):

```
bank.meta.json          # bankVersion (semver), releasedAt, changelog pointer
categories.json         # category defs: id, name, axis, weight, belt-stage emphasis
questions/
  positional.json
  meta-qualities.json
  reputation.json
scales.json             # input-type definitions incl. every anchor label
CHANGELOG.md
archive/                # frozen snapshots, e.g. bank-1.0.0.json
```

Nothing here yet — the bank system (schema, validation, conversion of
`../legacy/skill-assessment.v0.1.json` into archived bank 1.0.0) is the first
build task. Do not hand-author records before the schema and `bank:validate`
exist.
