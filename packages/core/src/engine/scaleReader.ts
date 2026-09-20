// Cursor reading utilities: read a scale value at a tick position, expressed in
// C/D decade units (0..1 is the C/D span; scales read against C/D may sit
// outside it). Both directions go through the scale's unified calculation, so a
// graduation and its reading can never disagree.

import type { ScaleDefinition } from '../types/scale'
import { printedDomainRange, printedPositionRange, toDomain, toPosition } from './scaleMapping'

// Read the value of a single scale at the given position.
export function readScaleValue(scale: ScaleDefinition, position: number): number | null {
  const c = scale.calc
  if (!c) return null
  const p = c.decreasing ? 1 - position : position
  const [pMin, pMax] = printedPositionRange(c)
  if (p < pMin - 1e-9 || p > pMax + 1e-9) return null
  const d = toDomain(c, p)
  if (Number.isNaN(d)) return null
  return c.read ? c.read(d) : d
}

// Exact inverse of readScaleValue: the C/D decade-unit position at which
// `value` is read. Returns null for values outside the scale's domain.
export function positionForValue(scale: ScaleDefinition, value: number): number | null {
  const c = scale.calc
  if (!c) return null
  if (!Number.isFinite(value)) return null
  const d = c.unread ? c.unread(value) : value
  const [dMin, dMax] = printedDomainRange(c)
  if (d < dMin - 1e-9 || d > dMax + 1e-9) return null
  const p = toPosition(c, d)
  if (!Number.isFinite(p)) return null
  return c.decreasing ? 1 - p : p
}

// Format a value for display.
export function formatValue(value: number | null): string {
  if (value === null) return '—'
  if (!isFinite(value)) return '∞'

  // Scientific notation for very large or very small values
  if (Math.abs(value) >= 10000 || (Math.abs(value) < 0.001 && value !== 0)) {
    return value.toExponential(3)
  }

  if (Math.abs(value) >= 100) return value.toPrecision(4)
  if (Math.abs(value) >= 10) return value.toPrecision(4)
  if (Math.abs(value) >= 1) return value.toPrecision(3)
  return value.toPrecision(3)
}
