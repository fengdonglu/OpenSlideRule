import { describe, expect, it } from 'vitest'
import { getModelStructure, getSections, readScaleValue, positionForValue } from '@slide-rule/core'
import { cursorPositionForValue, slideOffsetForValue } from './cursorEdit'

// The built-in 1002: C is a movable middle scale, D a fixed lower scale.
const front = getSections(getModelStructure('1002'), 'front')
const allScales = [...front.upper, ...front.middle, ...front.lower]

function scaleById(id: string) {
  const scale = allScales.find((s) => s.id === id)
  if (!scale) throw new Error(`missing scale ${id}`)
  return scale
}

describe('cursorPositionForValue', () => {
  it('adds the slide offset back for a movable middle scale', () => {
    const scale = scaleById('C')
    expect(scale.section).toBe('middle')
    const local = positionForValue(scale, 3)!
    const middleOffset = 0.25

    const cursor = cursorPositionForValue(scale, 3, middleOffset)!

    expect(cursor).toBeCloseTo(local + middleOffset, 9)
    // The panel reads the scale at the cursor's local position, so the edit
    // round-trips back to the typed value.
    expect(readScaleValue(scale, cursor - middleOffset)).toBeCloseTo(3, 6)
  })

  it('leaves a fixed scale unshifted by the slide offset', () => {
    const scale = scaleById('D')
    expect(scale.section).not.toBe('middle')
    const local = positionForValue(scale, 3)!

    expect(cursorPositionForValue(scale, 3, 0.25)).toBeCloseTo(local, 9)
  })

  it('returns null for a value outside the scale domain', () => {
    expect(cursorPositionForValue(scaleById('C'), 11, 0)).toBeNull()
  })

  it('clamps the cursor into the 0..1 range', () => {
    const cursor = cursorPositionForValue(scaleById('C'), 5, 1)!
    expect(cursor).toBeGreaterThanOrEqual(0)
    expect(cursor).toBeLessThanOrEqual(1)
  })
})

describe('slideOffsetForValue', () => {
  it('finds the slide offset that makes a middle scale read the value at a cursor', () => {
    const scale = scaleById('C')
    const cursor = 0.7
    const offset = slideOffsetForValue(scale, 3, cursor)!

    // The panel reads the middle scale at cursor - offset.
    expect(readScaleValue(scale, cursor - offset)).toBeCloseTo(3, 6)
  })

  it('returns null for a value outside the scale domain', () => {
    expect(slideOffsetForValue(scaleById('C'), 11, 0.5)).toBeNull()
  })
})
