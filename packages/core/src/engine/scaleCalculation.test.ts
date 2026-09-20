import { describe, it, expect } from 'vitest'
import { generateScaledTicks } from './scaleCalculation'
import type { ScaleCalculation, Tick } from '../types/scale'

function at(ticks: Tick[], v: number): Tick {
  const t = ticks.find((x) => Math.abs(x.value - v) < 1e-9)
  if (!t) throw new Error(`no tick ${v}`)
  return t
}

describe('generateScaledTicks', () => {
  it('lays each interval, re-levels coarser steps and sorts by position', () => {
    const c: ScaleCalculation = {
      domain: [1, 10],
      map: { kind: 'log', anchor: 1 },
      intervals: [
        {
          from: 1,
          to: 2,
          steps: [
            { step: 0.02, level: 3 },
            { step: 0.1, level: 1 },
          ],
        },
      ],
      labels: [1],
    }
    const ticks = generateScaledTicks(c)
    expect(at(ticks, 1.1).level).toBe(1)
    expect(at(ticks, 1.02).level).toBe(3)
    for (let i = 1; i < ticks.length; i++)
      expect(ticks[i].position).toBeGreaterThan(ticks[i - 1].position)
  })

  it('repeats the intervals over decades and labels the boundaries', () => {
    const c: ScaleCalculation = {
      domain: [1, 100],
      map: { kind: 'log', anchor: 1, normalize: true },
      decades: 2,
      intervals: [
        {
          from: 1,
          to: 2,
          steps: [
            { step: 0.1, level: 3 },
            { step: 1, level: 1 },
          ],
        },
      ],
      labels: [1, 10, 100],
    }
    const ticks = generateScaledTicks(c)
    expect(at(ticks, 10).label).toBe('10')
    expect(at(ticks, 100).label).toBe('100')
    // The intervals repeat over the second decade (1.5 -> 15).
    expect(at(ticks, 1.5).position).toBeLessThan(at(ticks, 15).position)
  })

  it('mirrors a decreasing scale', () => {
    const c: ScaleCalculation = {
      domain: [1, 10],
      map: { kind: 'log', anchor: 1 },
      decreasing: true,
      intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
      labels: [1, 10],
    }
    const ticks = generateScaledTicks(c)
    expect(ticks[0].value).toBeCloseTo(10, 9)
    expect(ticks[0].position).toBeCloseTo(0, 9)
    expect(ticks[ticks.length - 1].position).toBeCloseTo(1, 9)
  })

  it('carries the co-angle: a trig tick value is the reading (the angle)', () => {
    const c: ScaleCalculation = {
      domain: [30, 90],
      map: { kind: 'fn', fn: 'sin', from: 0.1 },
      intervals: [{ from: 30, to: 90, steps: [{ step: 10, level: 1 }] }],
      labels: [30, 90],
      labelFormat: (d) => String(Math.round(d)),
    }
    const ticks = generateScaledTicks(c)
    expect(ticks[0].angle).toBeCloseTo(30, 9)
    expect(ticks[0].value).toBeCloseTo(30, 9)
    expect(ticks[0].label).toBe('30')
  })

  it('formats labels with labelFormat and keeps explicit mark text', () => {
    const c: ScaleCalculation = {
      domain: [0, 1],
      map: { kind: 'linear' },
      intervals: [
        {
          from: 0,
          to: 1,
          steps: [
            { step: 0.1, level: 3 },
            { step: 0.5, level: 1 },
          ],
        },
      ],
      labels: [0, 0.5, 1],
      labelFormat: (v) => (Number.isInteger(v) ? String(v) : '.' + v.toFixed(1).slice(2)),
      marks: [{ value: 0.25, label: 'q' }],
    }
    const ticks = generateScaledTicks(c)
    expect(at(ticks, 0.5).label).toBe('.5')
    expect(at(ticks, 0.25).label).toBe('q')
    expect(at(ticks, 0.25).position).toBeCloseTo(0.25, 9)
  })

  it('places a reciprocal label through unread', () => {
    const c: ScaleCalculation = {
      domain: [1, 10],
      map: { kind: 'log', anchor: 1 },
      intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 3 }] }],
      read: (d) => 10 / d,
      unread: (v) => 10 / v,
      labels: [1, 10],
    }
    const ticks = generateScaledTicks(c)
    // read(10) = 1 at p = 1; read(1) = 10 at p = 0.
    expect(at(ticks, 1).position).toBeCloseTo(1, 9)
    expect(at(ticks, 10).position).toBeCloseTo(0, 9)
    // The printed text is the READ value, not the reciprocal domain value.
    expect(at(ticks, 1).label).toBe('1')
    expect(at(ticks, 10).label).toBe('10')
  })

  it('forces a labelled tick to level 1 by default', () => {
    const c: ScaleCalculation = {
      domain: [0, 1],
      map: { kind: 'linear' },
      intervals: [{ from: 0, to: 1, steps: [{ step: 0.01, level: 3 }] }],
      labels: [0.5],
    }
    expect(at(generateScaledTicks(c), 0.5).level).toBe(1)
  })

  it("keeps the measured level when labelLevel is 'keep'", () => {
    const c: ScaleCalculation = {
      domain: [0, 1],
      map: { kind: 'linear' },
      intervals: [{ from: 0, to: 1, steps: [{ step: 0.01, level: 3 }] }],
      labels: [0.5],
      labelLevel: 'keep',
    }
    expect(at(generateScaledTicks(c), 0.5).level).toBe(3)
  })

  it("gives a labelled tick with no grid tick level 1 when labelLevel is 'keep'", () => {
    const c: ScaleCalculation = {
      domain: [0, 1],
      map: { kind: 'linear' },
      intervals: [{ from: 0, to: 0.5, steps: [{ step: 0.01, level: 3 }] }],
      labels: [0.7],
      labelLevel: 'keep',
    }
    expect(at(generateScaledTicks(c), 0.7).level).toBe(1)
  })
})
