import { describe, expect, it } from 'vitest'
import { getSections, parseRule, positionForValue, readScaleValue } from '@slide-rule/core'
import type { ScaleDefinition } from '@slide-rule/core'
import { circularCursorPosition, circularLocalPosition } from './circularReadings'

// A movable (middle) decreasing scale, the reciprocal-style ring: value and
// screen position run opposite ways, the case the edit round-trip must survive.
function movableDecreasingScale(): ScaleDefinition {
  const parsed = parseRule({
    schemaVersion: 1,
    id: 'circle',
    name: 'Circle',
    form: 'circular',
    disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
    faces: {
      front: {
        upper: [],
        middle: [
          {
            id: 'CI',
            name: 'CI',
            type: 'CI',
            orientation: 'decreasing',
            calculation: {
              domain: [1, 10],
              map: { kind: 'log', anchor: 1 },
              intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
              labels: [1, 10],
            },
          },
        ],
        lower: [],
      },
      back: { upper: [], middle: [], lower: [] },
    },
  })
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors))
  return getSections(parsed.rule, 'front').middle[0]
}

describe('circular readings position maths', () => {
  it('round-trips a movable scale through the rotor offset', () => {
    const discOffset = 0.3
    const cursor = 0.85

    const local = circularLocalPosition(cursor, discOffset, true)

    expect(local).toBeCloseTo((cursor - discOffset + 1) % 1, 12)
    expect(circularCursorPosition(local, discOffset, true)).toBeCloseTo(cursor, 12)
  })

  it('wraps across the seam when the rotor offset is larger than the cursor', () => {
    const local = circularLocalPosition(0.1, 0.75, true)
    expect(local).toBeCloseTo(0.35, 12)
    expect(circularCursorPosition(local, 0.75, true)).toBeCloseTo(0.1, 12)
  })

  it('leaves a fixed scale independent of the rotor offset', () => {
    expect(circularLocalPosition(0.25, 0.7, false)).toBeCloseTo(0.25, 12)
    expect(circularCursorPosition(0.25, 0.7, false)).toBeCloseTo(0.25, 12)
  })

  it('round-trips a movable decreasing scale back to the typed value', () => {
    const scale = movableDecreasingScale()
    const discOffset = 0.42
    const value = 3

    const local = positionForValue(scale, value)!
    const cursor = circularCursorPosition(local, discOffset, true)

    // The cursor sits on the turned rotor; reading the scale back at its local
    // position returns the typed value whatever the scale's orientation.
    expect(circularLocalPosition(cursor, discOffset, true)).toBeCloseTo(local, 9)
    expect(readScaleValue(scale, circularLocalPosition(cursor, discOffset, true))).toBeCloseTo(
      value,
      6,
    )
  })
})
