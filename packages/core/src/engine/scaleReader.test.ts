import { describe, it, expect } from 'vitest'
import { readScaleValue, positionForValue, formatValue } from './scaleReader'
import { getScaleTicks } from './scaleFunctions'
import { MODEL_1002, MODEL_57 } from '../index'
import type { ScaleDefinition, ScaleType } from '../types/scale'

const SQRT10 = Math.sqrt(10)

const ALL_SCALES: ScaleDefinition[] = [
  ...MODEL_1002.front.upper,
  ...MODEL_1002.front.middle,
  ...MODEL_1002.front.lower,
  ...MODEL_1002.back.upper,
  ...MODEL_1002.back.middle,
  ...MODEL_1002.back.lower,
  ...MODEL_57.front.upper,
  ...MODEL_57.front.middle,
  ...MODEL_57.front.lower,
]

// The real model scale for a type. The red co-angle rows (cos2 / ctg2 / ctg3)
// are shared labels on their parent row, so they resolve to that parent scale.
function def(type: ScaleType): ScaleDefinition {
  const byType = ALL_SCALES.find((s) => s.type === type)
  if (byType) return byType
  const id = type.toLowerCase()
  const parent = ALL_SCALES.find((s) => s.sharedLabels?.some((l) => l.id === id))
  if (parent) return parent
  throw new Error(`missing scale type ${type}`)
}

// Reading at a tick's own position must return (approximately) that tick's value.
function expectRoundTrip(type: ScaleType, digits: number): void {
  const scale = def(type)
  const ticks = getScaleTicks(scale)
  expect(ticks.length).toBeGreaterThan(0)
  for (const tick of ticks) {
    // The tanh asymptote carries an infinite reading with no finite value.
    if (!Number.isFinite(tick.value)) continue
    const read = readScaleValue(scale, tick.position)
    expect(read, `${type} at position ${tick.position}`).not.toBeNull()
    expect(read ?? Number.NaN).toBeCloseTo(tick.value, digits)
  }
}

describe('readScaleValue - log and linear scales', () => {
  it('reads the C/D decade at its ends and midpoint', () => {
    expect(readScaleValue(def('C'), 0)).toBeCloseTo(1, 9)
    expect(readScaleValue(def('C'), 1)).toBeCloseTo(10, 9)
    expect(readScaleValue(def('D'), 0.5)).toBeCloseTo(SQRT10, 6)
  })

  it('reads at the endpoints of A/B and K', () => {
    expect(readScaleValue(def('A'), 0)).toBeCloseTo(1, 9)
    expect(readScaleValue(def('A'), 1)).toBeCloseTo(100, 6)
    expect(readScaleValue(def('K'), 1)).toBeCloseTo(1000, 6)
  })

  it('round-trips every tick of C, D, A, B, K, L', () => {
    for (const type of ['C', 'D', 'A', 'B', 'K', 'L'] as ScaleType[]) {
      expectRoundTrip(type, 6)
    }
  })

  it('round-trips the folded and reciprocal scales', () => {
    for (const type of ['CF', 'DF', 'CIF', 'CI', 'DI'] as ScaleType[]) {
      expectRoundTrip(type, 6)
    }
  })

  it('round-trips the log-log segments and their reciprocals', () => {
    for (const type of ['LN1', 'LN2', 'LN3', 'LN1I', 'LN2I', 'LN3I'] as ScaleType[]) {
      expectRoundTrip(type, 6)
    }
  })

  it('reads the photographed log-log endpoints at their C/D positions', () => {
    // p = log10(ln x) - log10(from); the segments are anchored to C/D.
    const p = (x: number, from: number) => Math.log10(Math.log(x)) - Math.log10(from)
    expect(readScaleValue(def('LN1'), p(1.0095, 0.01))).toBeCloseTo(1.0095, 9)
    expect(readScaleValue(def('LN1'), p(1.11, 0.01))).toBeCloseTo(1.11, 9)
    expect(readScaleValue(def('LN2'), p(1.1, 0.1))).toBeCloseTo(1.1, 9)
    expect(readScaleValue(def('LN2'), p(2.9, 0.1))).toBeCloseTo(2.9, 9)
    expect(readScaleValue(def('LN3'), p(2.5, 1))).toBeCloseTo(2.5, 9)
    expect(readScaleValue(def('LN3'), p(20000, 1))).toBeCloseTo(20000, 6)
    // ln3's `e` tick lands exactly on the D left edge.
    expect(readScaleValue(def('LN3'), 0)).toBeCloseTo(Math.E, 9)
  })

  it('reads the reciprocal segments at the same positions as their companions', () => {
    for (const [plain, reciprocal] of [
      ['LN1', 'LN1I'],
      ['LN2', 'LN2I'],
      ['LN3', 'LN3I'],
    ] as [ScaleType, ScaleType][]) {
      const plainScale = def(plain)
      const reciprocalScale = def(reciprocal)
      // The red companion sits on the same graduations as the black one, so it
      // is read at the black row's own tick positions.
      for (const tick of getScaleTicks(plainScale)) {
        const a = readScaleValue(plainScale, tick.position) ?? Number.NaN
        const b = readScaleValue(reciprocalScale, tick.position) ?? Number.NaN
        expect(b).toBeCloseTo(1 / a, 9)
      }
    }
  })
})

describe('readScaleValue - trigonometric scales', () => {
  // The unified calculation makes a trig tick's value its printed angle; the
  // cursor reports that same angle.
  function expectTrigRoundTrip(type: ScaleType): void {
    const scale = def(type)
    const ticks = getScaleTicks(scale)
    expect(ticks.length).toBeGreaterThan(0)
    for (const tick of ticks) {
      const angle = readScaleValue(scale, tick.position)
      expect(angle).not.toBeNull()
      const a = angle ?? Number.NaN
      expect(a).toBeCloseTo(tick.angle ?? Number.NaN, 6)
      expect(a).toBeCloseTo(tick.value, 6)
    }
  }

  it('round-trips sin2 through its angle', () => {
    expectTrigRoundTrip('SIN2')
  })

  it('round-trips tg2 and tg3 through their angles', () => {
    expectTrigRoundTrip('TG2')
    expectTrigRoundTrip('TG3')
  })

  it('reads 30 degrees on sin2 as sin(30) = 0.5', () => {
    const ticks = getScaleTicks(def('SIN2'))
    const tick = ticks.find((t) => t.angle !== undefined && Math.abs(t.angle - 30) < 1e-6)
    expect(tick).toBeDefined()
    const angle = readScaleValue(def('SIN2'), tick?.position ?? 0)
    expect(angle).toBeCloseTo(30, 6)
    expect(Math.sin(((angle ?? 0) * Math.PI) / 180)).toBeCloseTo(0.5, 6)
  })
})

describe('readScaleValue - hyperbolic scales', () => {
  it("round-trips every tick of H2, H'2 and H3", () => {
    for (const type of ['H2', 'H2P', 'H3'] as ScaleType[]) {
      expectRoundTrip(type, 6)
    }
  })

  it('reads H2 start/end as cosh(0.1) and 1.45', () => {
    const scale = def('H2')
    const posOf = (x: number) => Math.log10(Math.sinh(x) / 0.1)
    expect(readScaleValue(scale, posOf(0.1))).toBeCloseTo(Math.cosh(0.1), 6)
    expect(readScaleValue(scale, posOf(Math.acosh(1.45)))).toBeCloseTo(1.45, 6)
  })

  it("reads H'2 from its printed .995 start to the sech asymptote", () => {
    const scale = def('H2P')
    // The unified calculation's domain is the printed sech value, whose leftmost
    // graduation is the measured .995 (sech(0.1) = .99502 sits a hair past it).
    const first = getScaleTicks(scale)[0]
    expect(first.value).toBeCloseTo(0.995, 6)
    expect(readScaleValue(scale, first.position)).toBeCloseTo(0.995, 6)
    // An interior argument: the row is sech, read through the same tanh mapping.
    const posOf = (x: number) => Math.log10(Math.tanh(x) / 0.1)
    expect(readScaleValue(scale, posOf(0.8))).toBeCloseTo(1 / Math.cosh(0.8), 6)
    // The far end is the sech asymptote, exactly at C/D = 1.
    expect(readScaleValue(scale, 1)).toBeCloseTo(0, 9)
  })

  it('reads H3 start/end as 1.4 and 10.5', () => {
    const posOf = (x: number) => Math.log10(Math.sinh(x))
    expect(readScaleValue(def('H3'), posOf(Math.acosh(1.4)))).toBeCloseTo(1.4, 6)
    expect(readScaleValue(def('H3'), posOf(Math.acosh(10.5)))).toBeCloseTo(10.5, 6)
  })
})

describe('readScaleValue - sh2 / sh3 / th2 (read on C/D)', () => {
  it('reads the sh2 argument x at both ends', () => {
    const scale = def('SH2')
    const posOf = (x: number) => Math.log10(Math.sinh(x) / 0.1)
    expect(readScaleValue(scale, posOf(0.095))).toBeCloseTo(0.095, 6)
    expect(readScaleValue(scale, posOf(0.9))).toBeCloseTo(0.9, 6)
  })

  it('reads the sh3 argument x at both ends', () => {
    const scale = def('SH3')
    const posOf = (x: number) => Math.log10(Math.sinh(x))
    expect(readScaleValue(scale, posOf(0.85))).toBeCloseTo(0.85, 6)
    expect(readScaleValue(scale, posOf(3))).toBeCloseTo(3, 6)
  })

  // The cursor returns the argument x, which the unified calculation also stores
  // as the tick's value.
  it('round-trips every sh2 / sh3 graduation through its argument', () => {
    for (const type of ['SH2', 'SH3'] as ScaleType[]) {
      const scale = def(type)
      for (const tick of getScaleTicks(scale)) {
        const x = readScaleValue(scale, tick.position)
        expect(x, `${type} at ${tick.position}`).not.toBeNull()
        expect(x ?? Number.NaN).toBeCloseTo(tick.value, 6)
      }
    }
  })

  it('round-trips every finite th2 graduation through its argument', () => {
    const scale = def('TH2')
    for (const tick of getScaleTicks(scale)) {
      if (!Number.isFinite(tick.value)) continue
      const x = readScaleValue(scale, tick.position)
      expect(x ?? Number.NaN).toBeCloseTo(tick.value, 6)
    }
  })

  it('reads the th2 start as the argument 0.095', () => {
    const pos = Math.log10(Math.tanh(0.095) / 0.1)
    expect(readScaleValue(def('TH2'), pos)).toBeCloseTo(0.095, 6)
  })

  it('reads the th2 far end as the asymptote (x = infinity)', () => {
    const x = readScaleValue(def('TH2'), 1)
    expect(x).toBe(Infinity)
  })
})

describe('positionForValue - inverse round-trips', () => {
  // Every supported scale (nothing is left as a placeholder).
  const ALL_TYPES: ScaleType[] = [
    'C',
    'D',
    'A',
    'B',
    'K',
    'CF',
    'DF',
    'CI',
    'DI',
    'CIF',
    'L',
    'LN1',
    'LN2',
    'LN3',
    'LN1I',
    'LN2I',
    'LN3I',
    'SIN2',
    'COS2',
    'TG2',
    'CTG2',
    'TG3',
    'CTG3',
    'H2',
    'H2P',
    'H3',
    'SH2',
    'SH3',
    'TH2',
  ]

  // Forward direction: a tick's own reading, asked back for its position, must
  // return that tick's position.
  it.each(ALL_TYPES)('%s: reading -> position returns the tick position', (type) => {
    const scale = def(type)
    const ticks = getScaleTicks(scale)
    expect(ticks.length).toBeGreaterThan(0)
    for (const tick of ticks) {
      const reading = readScaleValue(scale, tick.position)
      expect(reading, `${type} reading at ${tick.position}`).not.toBeNull()
      // The tanh asymptote reads off to infinity; it has no finite inverse.
      if (reading === null || !Number.isFinite(reading)) continue
      const pos = positionForValue(scale, reading)
      expect(pos, `${type} position of ${reading}`).not.toBeNull()
      expect(pos ?? Number.NaN).toBeCloseTo(tick.position, 6)
    }
  })

  // Reverse direction: value -> position -> read must return the value.
  function expectValueRoundTrip(type: ScaleType, values: number[]): void {
    const scale = def(type)
    for (const v of values) {
      const pos = positionForValue(scale, v)
      expect(pos, `${type} position of ${v}`).not.toBeNull()
      if (pos === null) continue
      expect(readScaleValue(scale, pos) ?? Number.NaN).toBeCloseTo(v, 6)
    }
  }

  it('round-trips values of the log scales', () => {
    expectValueRoundTrip('C', [1, 2, Math.PI, 5, 10])
    expectValueRoundTrip('D', [1, 3.16227766, 10])
    expectValueRoundTrip('A', [1, 2.5, 10, 50, 100])
    expectValueRoundTrip('B', [1, 7, 100])
    expectValueRoundTrip('K', [1, 5, 100, 500, 1000])
    expectValueRoundTrip('L', [0, 0.25, 0.5, 1])
  })

  it('round-trips values of the folded and reciprocal scales', () => {
    expectValueRoundTrip('CF', [SQRT10, 5, 10, 10 * SQRT10])
    expectValueRoundTrip('DF', [3, SQRT10, 10, 10 * SQRT10])
    expectValueRoundTrip('CI', [1, 2, 5, 10])
    expectValueRoundTrip('DI', [1, 4, 10])
    expectValueRoundTrip('CIF', [1 / SQRT10, 0.5, 1, 2, SQRT10])
  })

  it('round-trips values of the log-log family', () => {
    expectValueRoundTrip('LN1', [1.0095, 1.05, 1.11])
    expectValueRoundTrip('LN2', [1.1, 1.5, Math.E, 2.9])
    expectValueRoundTrip('LN3', [2.5, Math.E, 10, 1000, 20000])
    expectValueRoundTrip('LN1I', [1 / 1.0095, 1 / 1.05, 1 / 1.11])
    expectValueRoundTrip('LN2I', [1 / 1.1, 1 / 1.5, 1 / 2.9])
    expectValueRoundTrip('LN3I', [1 / 2.5, 1 / 10, 1 / 20000])
  })

  it('round-trips angles of the trigonometric scales', () => {
    expectValueRoundTrip('SIN2', [5.5, 30, 90])
    expectValueRoundTrip('COS2', [5.5, 30, 90])
    expectValueRoundTrip('TG2', [5.5, 30, 45])
    expectValueRoundTrip('CTG2', [5.5, 30, 45])
    expectValueRoundTrip('TG3', [45, 60, 84.5])
    expectValueRoundTrip('CTG3', [45, 60, 84.5])
  })

  it('round-trips values of the hyperbolic scales', () => {
    expectValueRoundTrip('H2', [Math.cosh(0.1), 1.2, Math.sqrt(2)])
    // The calculation's printed domain tops out at the measured .995.
    expectValueRoundTrip('H2P', [1 / Math.sqrt(2), 0.8, 0.995])
    expectValueRoundTrip('H3', [Math.sqrt(2), 5, Math.cosh(Math.asinh(10))])
  })

  it('round-trips arguments of the hyperbolic sine/tangent scales', () => {
    expectValueRoundTrip('SH2', [0.095, 0.5, 0.9])
    expectValueRoundTrip('SH3', [0.85, 1.5, 3])
    expectValueRoundTrip('TH2', [0.095, 0.5, 3])
  })

  it('returns null for values outside the scale range', () => {
    expect(positionForValue(def('C'), 0.5)).toBeNull()
    expect(positionForValue(def('C'), 11)).toBeNull()
    expect(positionForValue(def('L'), -0.1)).toBeNull()
    expect(positionForValue(def('SIN2'), 120)).toBeNull()
    expect(positionForValue(def('LN1'), 1)).toBeNull()
  })
})

describe('formatValue', () => {
  it('formats a null reading as a dash', () => {
    expect(formatValue(null)).toBe('—')
  })

  it('formats ordinary values', () => {
    expect(formatValue(3.16227766)).toBe('3.16')
  })
})

describe('reader reads ScaleCalculation (including overflow labels)', () => {
  it('reads the over-fold CIF label 3.3 from its tick', () => {
    const cif = MODEL_1002.back.middle.find((s) => s.name === 'CIF')!
    expect(cif.calc).toBeDefined()
    const left = getScaleTicks(cif)[0]
    expect(readScaleValue(cif, left.position)).toBeCloseTo(3.3, 6)
    expect(positionForValue(cif, 3.3)).toBeCloseTo(left.position, 9)
  })

  it('reads the th2 asymptote as infinity at p = 1', () => {
    const th2 = MODEL_1002.front.lower.find((s) => s.name === 'th2')!
    expect(readScaleValue(th2, 1)).toBe(Infinity)
  })
})

describe('readScaleValue - tolerance edges', () => {
  it('returns null for a position inside the tolerance but outside the domain', () => {
    const sin2 = MODEL_1002.front.middle.find((s) => s.name === 'sin2')!
    expect(readScaleValue(sin2, 1 + 5e-10)).toBeNull()
  })
})
