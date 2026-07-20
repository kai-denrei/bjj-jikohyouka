/**
 * Shared gaussian helper — single source used by both BellCurveAxis (widget)
 * and IntroLanding (visual landing page) so the curves are visually identical.
 *
 * Returns normalized height in the range [0, height].
 * axisVal, mean: values on the 0–100 ability axis.
 * sd: standard deviation in the same units.
 * height: peak height (normalised, 0..1 — caller scales to SVG units).
 */
export function gaussianAxisHeight(
  axisVal: number,
  mean: number,
  sd: number,
  height: number
): number {
  const exponent = -((axisVal - mean) ** 2) / (2 * sd ** 2)
  return height * Math.exp(exponent)
}
