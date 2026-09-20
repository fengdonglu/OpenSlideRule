import { describe, it, expect } from 'vitest'
import { computeFaceLayout, tickX, rowTopMm } from './index'
import { MODEL_1002, getScaleTicks } from '@slide-rule/core'
import type { PhysicalSpec, Tick } from '@slide-rule/core'

const spec: PhysicalSpec = MODEL_1002.physical

// Two different widths verify that proportions scale linearly with width.
const WIDTH = 1200

describe('computeFaceLayout - face geometry', () => {
  it('keeps a strict 6:1 aspect ratio (12in x 2in)', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(l.faceWidthPx / l.faceHeightPx).toBeCloseTo(6, 6)
  })

  it('scales pxPerMm linearly with the available width', () => {
    const a = computeFaceLayout(spec, 1200)
    const b = computeFaceLayout(spec, 600)
    expect(a.pxPerMm / b.pxPerMm).toBeCloseTo(2, 6)
    expect(a.pxPerMm).toBeCloseTo(1200 / spec.faceWidthMm, 9)
  })
})

describe('computeFaceLayout - row height', () => {
  it('solves margins + 14 rows + 2 grooves to exactly the face height', () => {
    const l = computeFaceLayout(spec, WIDTH)
    const total =
      2 * l.marginMm +
      (spec.rowCount.upper + spec.rowCount.middle + spec.rowCount.lower) * l.rowHeightMm +
      2 * l.grooveMm
    expect(total).toBeCloseTo(spec.faceHeightMm, 9)
  })

  it('matches the measured ratios (groove 0.7 row / margin 0.4 row)', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(l.grooveMm).toBeCloseTo(0.7 * l.rowHeightMm, 9)
    expect(l.marginMm).toBeCloseTo(0.4 * l.rowHeightMm, 9)
  })

  it('derives the numeral height from numeralRatio', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(l.numeralMm).toBeCloseTo(spec.numeralRatio * l.rowHeightMm, 9)
  })
})

describe('computeFaceLayout - three sections', () => {
  it('uses 4 / 6 / 4 rows', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(l.sections.upper.rows).toBe(4)
    expect(l.sections.middle.rows).toBe(6)
    expect(l.sections.lower.rows).toBe(4)
  })

  it('puts the top of the upper section at the top margin', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(l.sections.upper.topMm).toBeCloseTo(l.marginMm, 9)
  })

  it('stacks sections without gaps or overlap, separated by grooves', () => {
    const l = computeFaceLayout(spec, WIDTH)
    const { upper, middle, lower } = l.sections
    expect(upper.topMm + upper.heightMm + l.grooveMm).toBeCloseTo(middle.topMm, 9)
    expect(middle.topMm + middle.heightMm + l.grooveMm).toBeCloseTo(lower.topMm, 9)
    expect(lower.topMm + lower.heightMm).toBeCloseTo(spec.faceHeightMm - l.marginMm, 9)
  })

  it('places both grooves consistently with the sections', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(l.grooveTopMm.upper).toBeCloseTo(l.sections.upper.topMm + l.sections.upper.heightMm, 9)
    expect(l.grooveTopMm.lower).toBeCloseTo(l.sections.middle.topMm + l.sections.middle.heightMm, 9)
  })
})

describe('computeFaceLayout - horizontal tick area', () => {
  it('equals face width minus left gutter and right panel', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(l.tickLeftMm).toBeCloseTo(spec.leftGutterMm, 9)
    expect(l.tickWidthMm).toBeCloseTo(spec.faceWidthMm - spec.leftGutterMm - spec.rightPanelMm, 9)
  })
})

describe('tickX / rowTopMm', () => {
  it('maps position 0 / 1 to the ends of the tick area', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(tickX({ position: 0, value: 0, level: 1 } as Tick, l)).toBeCloseTo(l.tickLeftMm, 9)
    expect(tickX({ position: 1, value: 0, level: 1 } as Tick, l)).toBeCloseTo(
      l.tickLeftMm + l.tickWidthMm,
      9,
    )
  })

  it('maps position 0.5 to the middle of the tick area', () => {
    const l = computeFaceLayout(spec, WIDTH)
    expect(tickX({ position: 0.5, value: 0, level: 1 } as Tick, l)).toBeCloseTo(
      l.tickLeftMm + l.tickWidthMm / 2,
      9,
    )
  })

  it('advances row tops by exactly one row height', () => {
    const l = computeFaceLayout(spec, WIDTH)
    const r0 = rowTopMm(l, 'middle', 0)
    const r1 = rowTopMm(l, 'middle', 1)
    expect(r1 - r0).toBeCloseTo(l.rowHeightMm, 9)
    expect(r0).toBeCloseTo(l.sections.middle.topMm, 9)
  })

  it('draws positions outside 0..1 (C/D decade-unit scales) without clamping', () => {
    const l = computeFaceLayout(spec, WIDTH)
    const left = tickX({ position: -0.025, value: 0, level: 1 } as Tick, l)
    const right = tickX({ position: 1.012, value: 0, level: 1 } as Tick, l)
    // Left of the C/D index but still on the face (inside the name gutter).
    expect(left).toBeLessThan(l.tickLeftMm)
    expect(left).toBeGreaterThan(0)
    // Right of the C/D 10 end but still on the face (inside the note panel).
    expect(right).toBeGreaterThan(l.tickLeftMm + l.tickWidthMm)
    expect(right).toBeLessThan(l.faceWidthMm)
  })

  it('keeps every 1002 graduation on the face', () => {
    const l = computeFaceLayout(spec, WIDTH)
    const all = [
      ...MODEL_1002.front.upper,
      ...MODEL_1002.front.middle,
      ...MODEL_1002.front.lower,
      ...MODEL_1002.back.upper,
      ...MODEL_1002.back.middle,
      ...MODEL_1002.back.lower,
    ]
    for (const scale of all) {
      for (const t of getScaleTicks(scale)) {
        const x = tickX(t, l)
        expect(x, `${scale.name} at ${t.position}`).toBeGreaterThanOrEqual(0)
        expect(x, `${scale.name} at ${t.position}`).toBeLessThanOrEqual(l.faceWidthMm)
      }
    }
  })
})
