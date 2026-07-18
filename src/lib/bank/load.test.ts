import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { ScaleSchema } from './schema'

describe('scales.json', () => {
  const raw = JSON.parse(readFileSync('src/data/question-bank/scales.json', 'utf8'))
  it('every scale parses and ids are the brief §5 set + legacy slider10', () => {
    const scales = z.array(ScaleSchema).parse(raw.scales)
    expect(scales.map(s => s.id).sort()).toEqual(
      ['agree3', 'belt_curve', 'belt_threshold', 'frequency10', 'know_check', 'ladder6', 'received_feedback', 'slider10'])
  })
  it('ladder6 has 6 fully-labeled rungs starting at 0 unknown-floor', () => {
    const l = raw.scales.find((s: { id: string }) => s.id === 'ladder6')
    expect(l.anchors).toHaveLength(6)
    expect(l.anchors[0]).toEqual({ value: 0, label: "I don't know what to do here" })
  })
  it('belt_curve is the only curve kind and costs 12s', () => {
    const curves = raw.scales.filter((s: { kind: string }) => s.kind === 'curve')
    expect(curves).toEqual([expect.objectContaining({ id: 'belt_curve', secondsPerItem: 12 })])
  })
})
