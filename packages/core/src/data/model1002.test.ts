// 1002 scale configuration: a few invariants that the renderer and the reader
// rely on. The graduations themselves are covered by the engine tests.
import { describe, it, expect } from 'vitest'
import { MODEL_1002, getSections } from '../index'
import { getScaleTicks } from '../engine/scaleFunctions'
import type { ScaleDefinition, ScaleSectionGroup } from '../types/scale'

function allScales(group: ScaleSectionGroup): ScaleDefinition[] {
  return [...group.upper, ...group.middle, ...group.lower]
}

describe('1002 scale list', () => {
  it('is double-sided: 4 / 6 / 4 rows on both faces', () => {
    for (const side of [MODEL_1002.front, MODEL_1002.back]) {
      expect(side.upper).toHaveLength(4)
      expect(side.middle).toHaveLength(6)
      expect(side.lower).toHaveLength(4)
    }
  })

  it('gives every scale real graduations', () => {
    for (const side of ['front', 'back'] as const) {
      for (const scale of allScales(getSections(MODEL_1002, side))) {
        expect(getScaleTicks(scale).length, scale.name).toBeGreaterThan(0)
      }
    }
  })

  it('prints the lg row with its numbers below the graduations', () => {
    // Confirmed by the maintainer against the prototype photographs: like the
    // Type 57's L row. See docs/domain/model-1002.md section 3.8.
    const lg = MODEL_1002.front.lower.find((s) => s.name === 'lg')
    expect(lg?.numbersBelow).toBe(true)
  })
})
