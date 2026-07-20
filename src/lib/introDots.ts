/**
 * introDots — typed dot data for the IntroLanding hero chart.
 *
 * Six example grapplers positioned on the ability axis (0–100) to teach the
 * overlap thesis: belt colour tracks ability loosely, so two grapplers at the
 * same ability can hold different belts.  The critical pair is dot 2 (brown,
 * out-of-shape, x=42) and dot 3 (blue, wrestling background, x=43) — adjacent
 * in ability but one belt rank apart.
 *
 * Sorted by x ascending; n = 1..6 in that order (ability-ascending numbering).
 */

import { gaussianAxisHeight } from './gaussian'

export type BeltName = 'white' | 'blue' | 'purple' | 'brown' | 'black'

export interface IntroDot {
  /** Display number, 1–6, ability-ascending */
  n: number
  belt: BeltName
  /** Position on the 0–100 ability axis */
  x: number
  /** Full human-readable label (used in the legend only) */
  label: string
}

/**
 * Belt curve parameters — MUST match scales.json ability_axis curves exactly.
 * white 12/7 peak1.0, blue 28/9 peak0.55, purple 45/11 peak0.42,
 * brown 62/13 peak0.30, black 74/14 peak0.34.
 */
const BELT_PARAMS: Record<BeltName, { mean: number; sd: number; height: number }> = {
  white:  { mean: 12, sd: 7,  height: 1.00 },
  blue:   { mean: 28, sd: 9,  height: 0.55 },
  purple: { mean: 45, sd: 11, height: 0.42 },
  brown:  { mean: 62, sd: 13, height: 0.30 },
  black:  { mean: 74, sd: 14, height: 0.34 },
}

/**
 * Return the normalised on-curve height (0..peakHeight) for a dot at its
 * belt's gaussian.  Uses the shared gaussianAxisHeight so both chart and test
 * use exactly the same math.
 */
export function dotY(dot: IntroDot): number {
  const p = BELT_PARAMS[dot.belt]
  return gaussianAxisHeight(dot.x, p.mean, p.sd, p.height)
}

/**
 * The six example dots, sorted by x ascending.
 * Dot numbering n=1..6 reflects ability order (left → right on the axis).
 *
 * Dots 2 (brown, x=42) and 3 (blue, x=43) are the overlap teaching pair —
 * they are deliberately adjacent in this list so the legend renders them
 * next to each other, making the overlap visible without needing to look at
 * the chart.
 */
export const INTRO_DOTS: IntroDot[] = [
  { n: 1, belt: 'white',  x: 3,  label: 'Beginner white belt'           },
  { n: 2, belt: 'brown',  x: 42, label: 'Brown belt, out-of-shape'      },
  { n: 3, belt: 'blue',   x: 43, label: 'Blue belt, wrestling background'},
  { n: 4, belt: 'purple', x: 67, label: 'Purple belt — 18, training since 5' },
  { n: 5, belt: 'black',  x: 74, label: 'Black belt, average'           },
  { n: 6, belt: 'black',  x: 94, label: 'Black belt, competitor'        },
]
