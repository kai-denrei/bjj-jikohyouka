import type { Scale } from '../../lib/bank/schema'
import { TapScale } from './TapScale'
import { BeltCurve } from './BeltCurve'
import { BellCurveAxis } from './BellCurveAxis'

export interface QuestionInputProps {
  scale: Scale
  value: number | number[] | null
  onChange: (v: number | number[] | null) => void
}

// QuestionInput: dispatcher — kind 'curve' → BeltCurve, kind 'axis' → BellCurveAxis, else → TapScale
export function QuestionInput({ scale, value, onChange }: QuestionInputProps) {
  if (scale.kind === 'curve') {
    return (
      <BeltCurve
        scale={scale}
        value={value as number[] | null}
        onChange={onChange as (v: number[]) => void}
      />
    )
  }
  if (scale.kind === 'axis') {
    return (
      <BellCurveAxis
        scale={scale}
        value={value as number | null}
        onChange={onChange as (v: number) => void}
      />
    )
  }
  return (
    <TapScale
      scale={scale}
      value={value as number | null}
      onChange={onChange as (v: number | null) => void}
    />
  )
}
