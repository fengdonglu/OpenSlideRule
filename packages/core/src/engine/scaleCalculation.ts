// The single tick generator: a ScaleCalculation -> its graduations. Both models
// use it.
// The legacy `graduations` table path (and the per-family generators it used) is
// gone: no model uses it now that every scale carries a `calc`; Plan 3 removed it.

import type { ScaleCalculation, Tick, TickLevel } from '../types/scale'
import { toPosition } from './scaleMapping'
import { trimLeadingZero } from './gradations'

function snap(v: number): number {
  return Number(v.toPrecision(12))
}

export function defaultLabelFormat(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return trimLeadingZero(String(Number(v.toFixed(2))))
}

export function generateScaledTicks(calc: ScaleCalculation): Tick[] {
  const byDomain = new Map<number, Tick>()
  const trig = calc.map.kind === 'fn' && (calc.map.fn === 'sin' || calc.map.fn === 'tan')
  const format = calc.labelFormat ?? defaultLabelFormat

  const add = (d: number, level: TickLevel, label?: string): Tick => {
    const key = snap(d)
    let t = byDomain.get(key)
    if (!t) {
      t = { position: toPosition(calc, key), value: calc.read ? calc.read(key) : key, level: 3 }
      // A trig tick remembers the angle it was graduated at so the red co-angle
      // number line keeps working.
      if (trig) t.angle = key
      byDomain.set(key, t)
    }
    t.level = level
    if (label !== undefined) t.label = label
    return t
  }

  const decades = calc.decades ?? 1
  for (let d = 0; d < decades; d++) {
    const base = 10 ** d
    for (const interval of calc.intervals) {
      const lo = interval.from * base
      const hi = interval.to * base
      // Finest step first: a coarser step re-levels the ticks it coincides with.
      const steps = [...interval.steps].sort((a, b) => a.step - b.step)
      for (const { step: relStep, level } of steps) {
        const step = relStep * base
        const first = Math.ceil(lo / step - 1e-9)
        for (let k = first; k * step < hi - 1e-9; k++) add(k * step, level)
      }
    }
  }

  // The two ends are always graduations.
  add(calc.domain[0], 1)
  add(calc.domain[1], 1)

  // Printed numbers (read values) and off-grid marks.
  const labelLevel = calc.labelLevel ?? 1
  for (const label of calc.labels ?? []) {
    const value = typeof label === 'number' ? label : label.value
    const d = snap(calc.unread ? calc.unread(value) : value)
    const level: TickLevel = labelLevel === 'keep' ? (byDomain.get(d)?.level ?? 1) : labelLevel
    const t = add(d, level, typeof label === 'number' ? format(value) : label.text)
    // Keep the declared read value exact: `d` was snapped for the grid key, which
    // would round an irrational label such as e (ln) off its constant.
    t.value = value
  }
  for (const mark of calc.marks ?? []) {
    const d = calc.unread ? calc.unread(mark.value) : mark.value
    add(snap(d), 1, mark.label)
  }

  const ticks = [...byDomain.values()]
  if (calc.decreasing) for (const t of ticks) t.position = 1 - t.position
  return ticks.sort((a, b) => a.position - b.position)
}
