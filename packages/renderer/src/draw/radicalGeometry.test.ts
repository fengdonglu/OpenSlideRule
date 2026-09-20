import { describe, it, expect } from 'vitest'
import {
  radicalGeometry,
  RADICAL_STROKE_RATIO,
  RADICAL_OVERLAP_RATIO,
  RADICAL_GAP_RATIO,
} from './radicalGeometry'

// The component feeds measured millimetre values (radicand ink box + note font
// size) into this pure helper; these tests pin the maths so the rendered line
// stays thin, continuous and proportional to the printed note.
describe('radicalGeometry', () => {
  it('makes the vinculum stroke proportional to the note font size', () => {
    const g = radicalGeometry(10, 5, 2, 3)

    expect(g.strokeWidth).toBeCloseTo(2 * RADICAL_STROKE_RATIO, 10)
  })

  it('spans from a small overlap over the radical to the end of the radicand', () => {
    const g = radicalGeometry(10, 5, 2, 3)

    expect(g.x1).toBeCloseTo(10 - 2 * RADICAL_OVERLAP_RATIO, 10)
    expect(g.x2).toBeCloseTo(15, 10)
  })

  it('draws a continuous horizontal line just above the radicand', () => {
    const g = radicalGeometry(10, 5, 2, 3)

    expect(g.y1).toBe(g.y2)
    expect(g.y1).toBeLessThan(3)
    expect(g.y1).toBeCloseTo(3 - 2 * RADICAL_GAP_RATIO, 10)
  })

  it('keeps the overlap and vertical gap proportional when the font grows', () => {
    const small = radicalGeometry(0, 1, 1, 0)
    const large = radicalGeometry(0, 1, 4, 0)

    expect(large.x1 / small.x1).toBeCloseTo(4, 10)
    expect(large.y1 / small.y1).toBeCloseTo(4, 10)
  })

  it('returns a zero-width line for an empty radicand without throwing', () => {
    const g = radicalGeometry(10, 0, 2, 3)

    expect(g.x1).toBeCloseTo(10 - 2 * RADICAL_OVERLAP_RATIO, 10)
    expect(g.x2).toBeCloseTo(10, 10)
    expect(Number.isFinite(g.strokeWidth)).toBe(true)
  })
})
