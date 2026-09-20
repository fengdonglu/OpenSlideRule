import { describe, it, expect } from 'vitest'
import { toPosition, toDomain } from './scaleMapping'
import type { Mapping, ScaleCalculation } from '../types/scale'

const DEG = Math.PI / 180

function calc(
  map: Mapping,
  domain: [number, number],
  extra: Partial<ScaleCalculation> = {},
): ScaleCalculation {
  return { domain, map, intervals: [], ...extra }
}

describe('toPosition / toDomain', () => {
  it('normalises a log scale over its domain', () => {
    const c = calc({ kind: 'log', anchor: 1, normalize: true }, [1, 100])
    expect(toPosition(c, 1)).toBeCloseTo(0, 12)
    expect(toPosition(c, 10)).toBeCloseTo(0.5, 12)
    expect(toPosition(c, 100)).toBeCloseTo(1, 12)
    expect(toDomain(c, 0.5)).toBeCloseTo(10, 9)
  })

  it('keeps decade units for a folded log scale and allows overflow', () => {
    const s = Math.sqrt(10)
    const c = calc({ kind: 'log', anchor: s }, [s, 10 * s])
    expect(toPosition(c, s)).toBeCloseTo(0, 12)
    expect(toPosition(c, 10 * s)).toBeCloseTo(1, 9)
    expect(toPosition(c, 3)).toBeLessThan(0)
    expect(toDomain(c, 1)).toBeCloseTo(10 * s, 6)
  })

  it('maps a linear scale over its domain', () => {
    const c = calc({ kind: 'linear' }, [0, 1])
    expect(toPosition(c, 0.25)).toBeCloseTo(0.25, 12)
    expect(toDomain(c, 0.25)).toBeCloseTo(0.25, 12)
  })

  it('maps an fn scale (degrees for sin/tan) and inverts it', () => {
    const c = calc({ kind: 'fn', fn: 'sin', from: 0.1 }, [5.5, 90])
    expect(toPosition(c, 30)).toBeCloseTo(Math.log10(Math.sin(30 * DEG) / 0.1), 12)
    expect(toDomain(c, toPosition(c, 30))).toBeCloseTo(30, 9)
  })

  it('maps an fn sinh scale in the raw argument', () => {
    const c = calc({ kind: 'fn', fn: 'sinh', from: 0.1 }, [0.095, 0.9])
    expect(toPosition(c, 0.1)).toBeCloseTo(Math.log10(Math.sinh(0.1) / 0.1), 12)
    expect(toDomain(c, toPosition(c, 0.1))).toBeCloseTo(0.1, 12)
  })

  it('maps valueFn cosh / sech by the printed value', () => {
    const cosh = calc({ kind: 'valueFn', fn: 'cosh', from: 0.1 }, [1.005, 1.45])
    expect(toPosition(cosh, 1.005)).toBeCloseTo(Math.log10(Math.sinh(Math.acosh(1.005)) / 0.1), 12)
    expect(toDomain(cosh, toPosition(cosh, 1.2))).toBeCloseTo(1.2, 9)
    const sech = calc({ kind: 'valueFn', fn: 'sech', from: 0.1 }, [0, 0.995])
    expect(toPosition(sech, 0)).toBeCloseTo(1, 12)
    expect(toDomain(sech, toPosition(sech, 0.5))).toBeCloseTo(0.5, 9)
  })
})
