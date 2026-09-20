import { describe, it, expect } from 'vitest'
import { MODEL_1002, MODEL_57 } from '../index'
import { getScaleTicks } from './scaleFunctions'
import { positionForValue, readScaleValue } from './scaleReader'
import type { ScaleDefinition, SlideRuleStructure } from '../types/scale'

function everyScale(m: SlideRuleStructure): ScaleDefinition[] {
  return [m.front, m.back].flatMap((s) => [...s.upper, ...s.middle, ...s.lower])
}

describe('every scale is driven by a calculation', () => {
  const scales = [...everyScale(MODEL_1002), ...everyScale(MODEL_57)]
  it('has a calc and draws ticks', () => {
    for (const s of scales) {
      expect(s.calc, s.name).toBeDefined()
      expect(getScaleTicks(s).length, s.name).toBeGreaterThan(0)
    }
  })
  it('round-trips every tick through the reader', () => {
    for (const s of scales) {
      for (const t of getScaleTicks(s)) {
        if (!Number.isFinite(t.value)) continue
        const read = readScaleValue(s, t.position)
        expect(read, `${s.name} @ ${t.position}`).not.toBeNull()
        expect(read ?? NaN, `${s.name} @ ${t.position}`).toBeCloseTo(t.value, 6)
        const back = positionForValue(s, t.value)
        expect(back, `${s.name} ← ${t.value}`).not.toBeNull()
        expect(back ?? NaN, `${s.name} ← ${t.value}`).toBeCloseTo(t.position, 6)
      }
    }
  })
})
