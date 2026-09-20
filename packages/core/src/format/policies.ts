// Declarative label-format registry: a LabelFormatSpec (plain JSON) -> the
// formatter function the renderer uses. This is the single lookup table of the
// named policies (some implemented here, some imported from engine/), so the
// same function objects are reused; the identity matters to serializeRule,
// which compares a calculation's formatter back to a named policy.

import type { LabelFormatSpec } from '../schema/types'
import { formatNumber } from '../engine/gradations'
import { formatFoldedLabel, formatLinearLabel } from '../engine/logarithmic'
import { defaultLabelFormat } from '../engine/scaleCalculation'

// Default text of a labelled angle (the 1002's trigonometric rows): `5.5°`,
// `10°`, `45°`. The 57's S / ST / T carry their own measured tables and use the
// bare / degree-minute formatters below instead.
export function formatDegreeAngle(deg: number): string {
  return `${formatNumber(deg, 1)}°`
}

// Type 57 S / T: bare numbers, no degree sign (`15`, with the red co-angle
// `75` printed below it).
export function formatBareAngle(deg: number): string {
  return formatNumber(deg, 1)
}

// Type 57 ST: degrees and minutes - `35'` below one degree, `2°` on the whole
// degree and `1°30'` in between, exactly as the rule prints them.
export function formatDegreeMinute(deg: number): string {
  const minutes = Math.round(deg * 60)
  const whole = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (whole === 0) return `${rest}'`
  if (rest === 0) return `${whole}°`
  return `${whole}°${rest}'`
}

// Format a printed argument the way the rule does: 3 decimals below 0.1
// (`.095`), 2 decimals below 1 (`.1`, `.15`), 1 decimal above (`1`, `1.5`).
export function formatArgument(x: number): string {
  if (x < 0.1) return formatNumber(x, 3)
  if (x < 1) return formatNumber(x, 2)
  return formatNumber(x, 1)
}

// The Default formatter mirrored from the rule's own convention: whole numbers
// are printed bare, everything else with at most two decimals and no leading
// zero (`0.5` -> `.5`).
export function resolveLabelFormat(spec: LabelFormatSpec | undefined): (v: number) => string {
  if (spec === undefined || spec === 'default') return defaultLabelFormat
  if (typeof spec === 'object') return (v) => formatNumber(v, spec.decimals)

  switch (spec) {
    case 'folded':
      return formatFoldedLabel
    case 'linearFraction':
      return formatLinearLabel
    case 'degree':
      return formatDegreeAngle
    case 'degreeBare':
      return formatBareAngle
    case 'degreeMinute':
      return formatDegreeMinute
    case 'argument':
      return formatArgument
    case 'sechZero':
      return (v) => (v === 0 ? '.0' : formatNumber(v, 3))
  }
}
