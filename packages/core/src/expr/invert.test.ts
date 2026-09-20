// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { numericInverse } from './invert'

describe('numericInverse', () => {
  it('inverts an increasing function', () => {
    const inverse = numericInverse((x) => Math.log10(x), [1, 10])
    expect(inverse(0)).toBeCloseTo(1, 9)
    expect(inverse(0.5)).toBeCloseTo(Math.sqrt(10), 9)
    expect(inverse(1)).toBeCloseTo(10, 9)
  })
  it('inverts a decreasing function', () => {
    const inverse = numericInverse((x) => -x, [0, 10])
    expect(inverse(-5)).toBeCloseTo(5, 9)
    expect(inverse(-2.5)).toBeCloseTo(2.5, 9)
  })
  it('returns NaN outside the bracketed range and for a constant function', () => {
    expect(numericInverse((x) => x, [0, 1])(2)).toBeNaN()
    expect(numericInverse(() => 1, [0, 1])(0.5)).toBeNaN()
    expect(numericInverse((x) => Math.log10(x), [1, 10])(NaN)).toBeNaN()
    expect(numericInverse((x) => Math.log10(x), [1, 10])(Infinity)).toBeNaN()
  })
})
