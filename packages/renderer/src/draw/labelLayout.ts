// Co-angle number layout (1002 / Type 57).
//
// The reverse-order trigonometric scales (cos2 / ctg2 / ctg3 and the 57's
// cos / ctg) are read against the main graduation, so the angle is printed on
// one side of the tick and its co-angle (90 - x) on the other: `5.5 | 84.5`,
// `6 | 84`, `45 | 45`. Both prototype photographs show the tick line between
// the black angle number and the red co-angle number. The label font is
// monospace, so the gap is a fixed fraction of the font size (no DOM measure).

import type { SharedLabel } from '@slide-rule/core'

// Fraction of the font size left between a number and the tick it flanks.
export const CO_ANGLE_GAP = 0.3

// The co-angle reading of a printed angle, rounded to a tenth (the co-angle
// lines print one decimal, e.g. 5.5 deg on tg3).
export function coAngleOf(angle: number): number {
  return Math.round((90 - angle) * 10) / 10
}

// How the co-angle is written: bare on the 57, with a degree sign on the 1002.
export function coAngleText(angle: number, format: SharedLabel['format']): string {
  const co = coAngleOf(angle)
  return format === 'bare' ? String(co) : `${co}°`
}

// Right end of the angle number: it is anchored at the end of its text, a gap
// left of the tick.
export function angleLabelX(tickX: number, fontMm: number): number {
  return tickX - CO_ANGLE_GAP * fontMm
}

// Left edge of the co-angle number, a gap right of the same tick.
export function coLabelStartX(tickX: number, fontMm: number): number {
  return tickX + CO_ANGLE_GAP * fontMm
}
