// Type 57 trigonometric scales: S / ST / T.
// K / A / C / D / DI / L on the real 57 carry explicit measured tables
// (see type57Graduations.test.ts). The tests below use the real MODEL_57 scales
// so they exercise exactly what the app draws.
import { describe, it, expect } from 'vitest'
import { getScaleTicks } from './scaleFunctions'
import { readScaleValue, positionForValue } from './scaleReader'
import { formatDegreeMinute } from '../format/policies'
import { MODEL_1002, MODEL_57 } from '../index'
import type { ScaleDefinition, ScaleType } from '../types/scale'

const ALL_57 = [...MODEL_57.front.upper, ...MODEL_57.front.middle, ...MODEL_57.front.lower]
const ALL_1002 = [
  ...MODEL_1002.front.upper,
  ...MODEL_1002.front.middle,
  ...MODEL_1002.front.lower,
  ...MODEL_1002.back.upper,
  ...MODEL_1002.back.middle,
  ...MODEL_1002.back.lower,
]

function scaleOf57(name: string): ScaleDefinition {
  const s = ALL_57.find((sc) => sc.name === name)
  if (!s) throw new Error('missing scale ' + name)
  return s
}

// The real 57 scale for a type (K / A / C / D / DI / L), or the 1002 scale for a
// type the 57 does not redefine (SIN2, used to guard the degree number format).
function def(type: ScaleType): ScaleDefinition {
  const s = ALL_57.find((sc) => sc.type === type) ?? ALL_1002.find((sc) => sc.type === type)
  if (!s) throw new Error('missing scale type ' + type)
  return s
}

function ends(type: ScaleType): { first: number; last: number } {
  const ticks = getScaleTicks(def(type))
  return { first: ticks[0].value, last: ticks[ticks.length - 1].value }
}

// Printed numbers of a scale, left to right.
function labels(type: ScaleType): string[] {
  return getScaleTicks(def(type))
    .filter((t) => t.label)
    .map((t) => t.label as string)
}

// Printed numbers of an explicit scale (the 57's measured tables).
function labelsOf(scale: ScaleDefinition): string[] {
  return getScaleTicks(scale)
    .filter((t) => t.label)
    .map((t) => t.label as string)
}

describe('Type 57 trigonometric scales (S / ST / T)', () => {
  it('S spans 5.74..90 deg with log10(sin) positions', () => {
    const ticks = getScaleTicks(scaleOf57('S'))
    expect(ticks[0].angle).toBeCloseTo(5.74, 6)
    // Read on C/D (note sin 0.1..1): p = log10(sin x) + 1.
    expect(ticks[0].position).toBeCloseTo(Math.log10(Math.sin((5.74 * Math.PI) / 180)) + 1, 9)
    const last = ticks[ticks.length - 1]
    expect(last.angle).toBeCloseTo(90, 6)
    expect(last.position).toBeCloseTo(1, 9)
    for (const t of ticks) expect(t.value).toBeCloseTo(t.angle ?? NaN, 9)
  })

  it('ST spans 0.573..5.74 deg (sin 0.01..0.1) with the small-angle sine', () => {
    const ticks = getScaleTicks(scaleOf57('ST'))
    expect(ticks[0].angle).toBeCloseTo(0.573, 6)
    // Read on C/D (note sin 0.01..0.1): p = log10(sin x) + 2.
    expect(ticks[0].position).toBeCloseTo(Math.log10(Math.sin((0.573 * Math.PI) / 180)) + 2, 9)
    const last = ticks[ticks.length - 1]
    expect(last.angle).toBeCloseTo(5.74, 6)
    expect(last.position).toBeCloseTo(Math.log10(Math.sin((5.74 * Math.PI) / 180)) + 2, 9)
    for (const t of ticks) expect(t.value).toBeCloseTo(t.angle ?? NaN, 9)
  })

  it('T spans 5.71..45 deg (tan 0.1..1) with log10(tan) positions', () => {
    const ticks = getScaleTicks(scaleOf57('T'))
    expect(ticks[0].angle).toBeCloseTo(5.71, 6)
    // Read on C/D (note tan 0.1..1): p = log10(tan x) + 1.
    expect(ticks[0].position).toBeCloseTo(Math.log10(Math.tan((5.71 * Math.PI) / 180)) + 1, 9)
    const last = ticks[ticks.length - 1]
    expect(last.angle).toBeCloseTo(45, 6)
    expect(last.position).toBeCloseTo(1, 9)
    for (const t of ticks) expect(t.value).toBeCloseTo(t.angle ?? NaN, 9)
  })

  it('S, ST and T are increasing and round-trip through their angle', () => {
    for (const name of ['S', 'ST', 'T']) {
      const scale = scaleOf57(name)
      const ticks = getScaleTicks(scale)
      expect(ticks.length).toBeGreaterThan(0)
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i].position).toBeGreaterThan(ticks[i - 1].position)
      }
      for (const tick of ticks) {
        const angle = readScaleValue(scale, tick.position)
        expect(angle).not.toBeNull()
        expect(angle ?? NaN).toBeCloseTo(tick.angle ?? NaN, 6)
      }
      // The position is in C/D decade units; the inverse mapping places each
      // printed bound back at its own tick position.
      for (const tick of [ticks[0], ticks[ticks.length - 1]]) {
        const pos = positionForValue(scale, tick.angle!)
        expect(pos).not.toBeNull()
        expect(pos ?? NaN).toBeCloseTo(tick.position, 6)
      }
    }
  })

  it('prints S and T as bare numbers (measured label lists)', () => {
    expect(labelsOf(scaleOf57('S'))).toEqual([
      '6',
      '7',
      '8',
      '9',
      '10',
      '15',
      '20',
      '30',
      '40',
      '50',
      '60',
      '90',
    ])
    expect(labelsOf(scaleOf57('T'))).toEqual([
      '6',
      '7',
      '8',
      '9',
      '10',
      '15',
      '20',
      '30',
      '40',
      '45',
    ])
    for (const text of [...labelsOf(scaleOf57('S')), ...labelsOf(scaleOf57('T'))]) {
      expect(text).not.toContain('°')
    }
    // The 1002's sin2 keeps the degree sign; the 57's bare format must not leak.
    expect(labels('SIN2')).toContain('10°')
  })

  it('drives every row from its unified calculation', () => {
    for (const name of ['S', 'ST', 'T']) {
      expect(scaleOf57(name).calc, name).toBeDefined()
    }
  })

  it('prints the ST numbers in degrees and minutes', () => {
    expect(labelsOf(scaleOf57('ST'))).toEqual([
      "35'",
      "40'",
      "50'",
      '1°',
      "1°30'",
      '2°',
      '3°',
      '4°',
      '5°',
    ])
    // Every printed number is the angle it stands for.
    const ticks = getScaleTicks(scaleOf57('ST'))
    for (const tick of ticks) {
      if (!tick.label || tick.angle === undefined) continue
      expect(tick.label).toBe(formatDegreeMinute(tick.angle))
    }
  })
})

describe('formatDegreeMinute', () => {
  it('writes minutes below one degree and mixed degrees/minutes above', () => {
    expect(formatDegreeMinute(35 / 60)).toBe("35'")
    expect(formatDegreeMinute(1)).toBe('1°')
    expect(formatDegreeMinute(1.5)).toBe("1°30'")
    expect(formatDegreeMinute(2)).toBe('2°')
    expect(formatDegreeMinute(5.74)).toBe("5°44'")
  })
})

describe('Type 57 reused log scales', () => {
  it('K keeps its three decades (1..1000)', () => {
    const ticks = getScaleTicks(def('K'))
    expect(ticks[0].value).toBeCloseTo(1, 9)
    expect(ticks[0].position).toBeCloseTo(0, 9)
    expect(ticks[ticks.length - 1].value).toBeCloseTo(1000, 6)
    expect(ticks[ticks.length - 1].position).toBeCloseTo(1, 9)
  })

  it('A keeps its two decades (1..100)', () => {
    const ticks = getScaleTicks(def('A'))
    expect(ticks[0].value).toBeCloseTo(1, 9)
    expect(ticks[ticks.length - 1].value).toBeCloseTo(100, 6)
  })

  it('C / D keep their single decade (1..10)', () => {
    for (const type of ['C', 'D'] as ScaleType[]) {
      expect(ends(type)).toEqual({ first: 1, last: 10 })
    }
  })

  it('DI is decreasing (mirror of D)', () => {
    const scale = def('DI')
    expect(readScaleValue(scale, 0)).toBeCloseTo(10, 9)
    expect(readScaleValue(scale, 1)).toBeCloseTo(1, 9)
    const quarter = readScaleValue(scale, 0.25) as number
    const threeQuarters = readScaleValue(scale, 0.75) as number
    expect(threeQuarters).toBeLessThan(quarter)
  })

  it('L is linear 0..1', () => {
    expect(ends('L')).toEqual({ first: 0, last: 1 })
    const ticks = getScaleTicks(def('L'))
    expect(ticks[0].position).toBeCloseTo(0, 9)
    expect(ticks[ticks.length - 1].position).toBeCloseTo(1, 9)
  })

  it('prints the L numbers as 0 .1 .2 ... .9 1 (no leading zero)', () => {
    expect(labels('L')).toEqual(['0', '.1', '.2', '.3', '.4', '.5', '.6', '.7', '.8', '.9', '1'])
  })
})
