// Co-angle number layout shared by the 1002 and the Type 57.
//
// Both prototype photographs print the co-angle on the opposite side of the
// tick from the angle (`5.5 | 84.5`, `6 | 84`, `45 | 45`): the angle number
// ends just left of the graduation and the red co-angle starts just right of
// it. The angle label is anchored at its end; the co-angle at its start.
import { describe, it, expect } from 'vitest'
import { coAngleOf, coAngleText, coLabelStartX, angleLabelX, CO_ANGLE_GAP } from './labelLayout'

describe('co-angle labels (1002 / Type 57)', () => {
  it('is 90 - angle, rounded to a tenth', () => {
    expect(coAngleOf(6)).toBe(84)
    expect(coAngleOf(45)).toBe(45)
    expect(coAngleOf(84.5)).toBe(5.5)
    expect(coAngleOf(5.5)).toBe(84.5)
  })

  it('prints bare on the 57 and with a degree sign on the 1002', () => {
    expect(coAngleText(6, 'bare')).toBe('84')
    expect(coAngleText(6, 'degree')).toBe('84°')
    expect(coAngleText(84.5, 'degree')).toBe('5.5°')
  })

  it('flanks the tick: angle ends left, co-angle starts right', () => {
    const fontMm = 1.2
    const tick = 10
    const gap = CO_ANGLE_GAP * fontMm
    expect(angleLabelX(tick, fontMm)).toBeCloseTo(tick - gap, 9)
    expect(coLabelStartX(tick, fontMm)).toBeCloseTo(tick + gap, 9)
    expect(angleLabelX(tick, fontMm)).toBeLessThan(tick)
    expect(coLabelStartX(tick, fontMm)).toBeGreaterThan(tick)
  })
})
