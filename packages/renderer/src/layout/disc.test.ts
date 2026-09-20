// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { computeDiscLayout } from './disc'

const disc = { outerRadiusMm: 90, innerRadiusMm: 15, sheetSizeMm: 200 }

describe('computeDiscLayout', () => {
  it('puts the sheet, centre and limit radii from the spec', () => {
    const layout = computeDiscLayout(disc, { upper: 1, middle: 1, lower: 1 })
    expect(layout.sheetSizeMm).toBe(200)
    expect(layout.centerMm).toBe(100)
    expect(layout.outerRadiusMm).toBe(90)
    expect(layout.innerRadiusMm).toBe(15)
  })

  it('splits the annulus into outer/middle/inner thirds', () => {
    const layout = computeDiscLayout(disc, { upper: 1, middle: 1, lower: 1 })
    const band = (90 - 15) / 3
    expect(layout.rings.map((r) => r.section)).toEqual(['upper', 'middle', 'lower'])
    expect(layout.rings[0]).toMatchObject({ outerRadiusMm: 90, innerRadiusMm: 90 - band })
    expect(layout.rings[1]).toMatchObject({
      outerRadiusMm: 90 - band,
      innerRadiusMm: 90 - 2 * band,
    })
    expect(layout.rings[2]).toMatchObject({ outerRadiusMm: 90 - 2 * band, innerRadiusMm: 15 })
  })

  it('makes one sub-ring per scale in a section, outermost first', () => {
    const layout = computeDiscLayout(disc, { upper: 2, middle: 1, lower: 3 })
    const upper = layout.rings.filter((r) => r.section === 'upper')
    const lower = layout.rings.filter((r) => r.section === 'lower')
    expect(upper).toHaveLength(2)
    expect(lower).toHaveLength(3)
    expect(upper[0].outerRadiusMm).toBeGreaterThan(upper[1].outerRadiusMm)
    expect(upper[0].index).toBe(0)
    // rings are ordered outer -> inner
    const outers = layout.rings.map((r) => r.outerRadiusMm)
    expect(outers).toEqual([...outers].sort((a, b) => b - a))
  })

  it('keeps tick and numeral radii inside the ring', () => {
    const layout = computeDiscLayout(disc, { upper: 1, middle: 1, lower: 1 })
    for (const ring of layout.rings) {
      expect(ring.tickOuterMm).toBeLessThan(ring.outerRadiusMm)
      expect(ring.numeralRadiusMm).toBeGreaterThan(ring.innerRadiusMm)
      expect(ring.numeralRadiusMm).toBeLessThan(ring.tickOuterMm)
    }
  })
})
