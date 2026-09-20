// Type 57 K / A / C / D / DI / L graduations.
//
// Every number below is a measured fact: the ticks were read from the
// maintainer's prototype photograph `docs/domain/prototype/57-front.jpg`
// (3560x810), flattened and then measured column by column. The interval
// boundaries, the tick step inside each interval, the number of ticks and the
// split into tick lengths ("levels") are recorded here so the app cannot drift
// away from the rule again. See docs/domain/model-57.md section 3.7.
//
// Levels: 1 = longest (carries a printed number on the rule), 2 = medium,
// 3 = shortest. The rule has only two lengths on K and A, three on C / D / DI.
import { describe, it, expect } from 'vitest'
import { MODEL_1002, MODEL_57 } from '../index'
import { getScaleTicks } from './scaleFunctions'
import { readScaleValue, positionForValue } from './scaleReader'
import type { ScaleDefinition, Tick, TickLevel } from '../types/scale'

function scaleOf(name: string): ScaleDefinition {
  const all = [...MODEL_57.front.upper, ...MODEL_57.front.middle, ...MODEL_57.front.lower]
  const s = all.find((sc) => sc.name === name)
  if (!s) throw new Error('missing scale ' + name)
  return s
}

// Ticks in the half-open interval [from, to). The pi mark is not part of the
// regular grid, so it is counted and asserted on its own (labels test).
function inInterval(ticks: Tick[], from: number, to: number): Tick[] {
  return ticks.filter((t) => t.label !== 'π' && t.value >= from - 1e-9 && t.value < to - 1e-9)
}

function levelSplit(ticks: Tick[]): Record<TickLevel, number> {
  const out: Record<TickLevel, number> = { 1: 0, 2: 0, 3: 0 }
  for (const t of ticks) out[t.level]++
  return out
}

// The measured interval table of one decade. `intervals` are absolute values
// for C / D / DI / L, and relative to a decade base for K / A (repeated).
interface IntervalFact {
  from: number
  to: number
  count: number
  levels: Partial<Record<TickLevel, number>>
}

function checkIntervals(scale: ScaleDefinition, intervals: IntervalFact[]): void {
  const ticks = getScaleTicks(scale)
  for (const f of intervals) {
    const got = inInterval(ticks, f.from, f.to)
    expect(got.length, `${scale.name} [${f.from},${f.to}) count`).toBe(f.count)
    const split = levelSplit(got)
    const expected = { 1: 0, 2: 0, 3: 0, ...f.levels }
    expect(split, `${scale.name} [${f.from},${f.to}) levels`).toEqual(expected)
  }
}

function labels(scale: ScaleDefinition): string[] {
  return getScaleTicks(scale)
    .filter((t) => t.label)
    .map((t) => t.label as string)
}

// ---------------------------------------------------------------------------

describe('Type 57 K graduations (1..1000)', () => {
  // One decade is [1,10); the list repeats at 10^1 and 10^2.
  const decade: IntervalFact[] = [
    { from: 1, to: 2, count: 20, levels: { 1: 10, 3: 10 } },
    { from: 2, to: 3, count: 10, levels: { 1: 2, 3: 8 } },
    { from: 3, to: 4, count: 10, levels: { 1: 2, 3: 8 } },
    { from: 4, to: 5, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 5, to: 6, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 6, to: 7, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 7, to: 8, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 8, to: 9, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 9, to: 10, count: 5, levels: { 1: 1, 3: 4 } },
  ]

  it('spans 1..1000 with the measured per-decade steps', () => {
    const scale = scaleOf('K')
    for (const d of [1, 10, 100]) {
      checkIntervals(
        scale,
        decade.map((f) => ({ ...f, from: f.from * d, to: f.to * d, levels: f.levels })),
      )
    }
  })

  it('has a tick at 1000', () => {
    const ticks = getScaleTicks(scaleOf('K'))
    expect(ticks[ticks.length - 1].value).toBeCloseTo(1000, 6)
  })

  it('prints only 1..9, 10, 20..90, 100, 200..900, 1000 (no 1.5, no 15)', () => {
    expect(labels(scaleOf('K'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '20',
      '30',
      '40',
      '50',
      '60',
      '70',
      '80',
      '90',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '1000',
    ])
  })
})

describe('Type 57 A graduations (1..100)', () => {
  const decade: IntervalFact[] = [
    { from: 1, to: 2, count: 20, levels: { 1: 10, 3: 10 } },
    { from: 2, to: 3, count: 10, levels: { 1: 2, 3: 8 } },
    { from: 3, to: 4, count: 10, levels: { 1: 2, 3: 8 } },
    { from: 4, to: 5, count: 10, levels: { 1: 2, 3: 8 } },
    { from: 5, to: 6, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 6, to: 7, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 7, to: 8, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 8, to: 9, count: 5, levels: { 1: 1, 3: 4 } },
    { from: 9, to: 10, count: 5, levels: { 1: 1, 3: 4 } },
  ]

  it('spans 1..100 with the measured per-decade steps', () => {
    const scale = scaleOf('A')
    for (const d of [1, 10]) {
      checkIntervals(
        scale,
        decade.map((f) => ({ ...f, from: f.from * d, to: f.to * d, levels: f.levels })),
      )
    }
  })

  it('prints only 1 2 3 4 5 10 20 30 40 50 100 and the pi mark', () => {
    expect(labels(scaleOf('A'))).toEqual([
      '1',
      '2',
      '3',
      'π',
      '4',
      '5',
      '10',
      '20',
      '30',
      '40',
      '50',
      '100',
    ])
  })
})

describe('Type 57 C / D graduations (1..10)', () => {
  const intervals: IntervalFact[] = [
    { from: 1, to: 2, count: 50, levels: { 1: 10, 3: 40 } },
    { from: 2, to: 3, count: 20, levels: { 1: 2, 2: 8, 3: 10 } },
    { from: 3, to: 4, count: 20, levels: { 1: 2, 2: 8, 3: 10 } },
    { from: 4, to: 5, count: 20, levels: { 1: 2, 2: 8, 3: 10 } },
    { from: 5, to: 6, count: 10, levels: { 1: 1, 2: 1, 3: 8 } },
    { from: 6, to: 7, count: 10, levels: { 1: 1, 2: 1, 3: 8 } },
    { from: 7, to: 8, count: 10, levels: { 1: 1, 2: 1, 3: 8 } },
    { from: 8, to: 9, count: 10, levels: { 1: 1, 2: 1, 3: 8 } },
    { from: 9, to: 10, count: 10, levels: { 1: 1, 2: 1, 3: 8 } },
  ]

  it('C and D share the measured steps', () => {
    for (const name of ['C', 'D']) checkIntervals(scaleOf(name), intervals)
  })

  it('ends at 10', () => {
    for (const name of ['C', 'D']) {
      const ticks = getScaleTicks(scaleOf(name))
      expect(ticks[ticks.length - 1].value).toBeCloseTo(10, 6)
    }
  })

  it('prints 1 1.5 2 3 pi 4 5 6 7 8 9 10', () => {
    const expected = ['1', '1.5', '2', '3', 'π', '4', '5', '6', '7', '8', '9', '10']
    expect(labels(scaleOf('C'))).toEqual(expected)
    expect(labels(scaleOf('D'))).toEqual(expected)
  })
})

describe('Type 57 DI graduations (10..1, red)', () => {
  it('mirrors C/D in position but keeps DIs own labels', () => {
    const d = getScaleTicks(scaleOf('D'))
    const di = getScaleTicks(scaleOf('DI'))
    // Same tick count and levels; positions are mirrored.
    expect(di).toHaveLength(d.length)
    for (let i = 0; i < d.length; i++) {
      const m = di[di.length - 1 - i]
      expect(m.position).toBeCloseTo(1 - d[i].position, 6)
      expect(m.level).toBe(d[i].level)
    }
  })

  it('prints the label set in descending order', () => {
    expect(labels(scaleOf('DI'))).toEqual([
      '10',
      '9',
      '8',
      '7',
      '6',
      '5',
      '4',
      'π',
      '3',
      '2',
      '1.5',
      '1',
    ])
  })
})

describe('Type 57 L graduations (linear 0..1)', () => {
  const intervals: IntervalFact[] = []
  for (let i = 0; i < 10; i++) {
    intervals.push({ from: i / 10, to: (i + 1) / 10, count: 20, levels: { 1: 10, 3: 10 } })
  }

  it('subdivides every 0.1 into 20 ticks (0.005 step)', () => {
    checkIntervals(scaleOf('L'), intervals)
  })

  it('prints 0 .1 .2 .3 .4 .5 .6 .7 .8 .9 1', () => {
    expect(labels(scaleOf('L'))).toEqual([
      '0',
      '.1',
      '.2',
      '.3',
      '.4',
      '.5',
      '.6',
      '.7',
      '.8',
      '.9',
      '1',
    ])
  })
})

// ---------------------------------------------------------------------------
// Trigonometric rows S / ST / T.
//
// The same prototype photograph was measured per column on each row's tick
// baseline (ticks hang downwards): the dark runs crossing the baseline were
// merged into ticks and their x positions converted with the row's own
// log(sin) / log(tan) mapping. The interval boundaries, tick counts, level
// splits and printed label lists below are those measured facts (see
// docs/domain/model-57.md section 3.7).

// Trig intervals are in degrees; `value` is the function value, so the filter
// must use `angle`. The last interval of a row is closed to include its end.
function angleIn(ticks: Tick[], from: number, to: number, closed: boolean): Tick[] {
  return ticks.filter(
    (t) =>
      t.angle !== undefined &&
      t.angle >= from - 1e-9 &&
      (closed ? t.angle <= to + 1e-9 : t.angle < to - 1e-9),
  )
}

interface AngleFact {
  from: number
  to: number
  count: number
  levels: Partial<Record<TickLevel, number>>
  closed?: boolean
}

function checkAngleIntervals(scale: ScaleDefinition, intervals: AngleFact[]): void {
  const ticks = getScaleTicks(scale)
  for (const f of intervals) {
    const got = angleIn(ticks, f.from, f.to, f.closed === true)
    expect(got.length, `${scale.name} [${f.from},${f.to}) count`).toBe(f.count)
    const expected = { 1: 0, 2: 0, 3: 0, ...f.levels }
    expect(levelSplit(got), `${scale.name} [${f.from},${f.to}) levels`).toEqual(expected)
  }
}

describe('Type 57 S graduations (sin 5.74..90 deg)', () => {
  // Steps are minutes: 10' in [5.74,15), 15' in [15,20), then 30', 30', 1 deg
  // and 2 deg. Levels: 1 = the 1 deg (and labelled) ticks, 2 = the 0.5 deg
  // ticks, 3 = the finest (10' / 15' / 0.5 deg / 2 deg) ticks.
  const intervals: AngleFact[] = [
    { from: 5.74, to: 10, count: 26, levels: { 1: 5, 2: 4, 3: 17 } },
    { from: 10, to: 15, count: 30, levels: { 1: 5, 2: 5, 3: 20 } },
    { from: 15, to: 20, count: 20, levels: { 1: 5, 2: 5, 3: 10 } },
    { from: 20, to: 30, count: 20, levels: { 1: 10, 3: 10 } },
    { from: 30, to: 45, count: 30, levels: { 1: 15, 3: 15 } },
    { from: 45, to: 60, count: 15, levels: { 1: 15 } },
    { from: 60, to: 90, count: 16, levels: { 1: 2, 2: 14 }, closed: true },
  ]

  it('has the measured ticks, lengths and counts in every interval', () => {
    checkAngleIntervals(scaleOf('S'), intervals)
  })

  it('starts on the unlabelled 5.74 tick and ends at 90', () => {
    const ticks = getScaleTicks(scaleOf('S'))
    expect(ticks[0].angle).toBeCloseTo(5.74, 6)
    expect(ticks[0].label).toBeUndefined()
    // S is read on C/D (sin 0.1..1), so 5.74 deg sits a hair right of C = 1.
    expect(ticks[0].position).toBeCloseTo(Math.log10(Math.sin((5.74 * Math.PI) / 180)) + 1, 9)
    expect(ticks[ticks.length - 1].angle).toBeCloseTo(90, 6)
    expect(ticks[ticks.length - 1].position).toBeCloseTo(1, 9)
  })

  it('prints 6 7 8 9 10 15 20 30 40 50 60 90 (no 70 / 80)', () => {
    expect(labels(scaleOf('S'))).toEqual([
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
  })

  it('carries the red co-angle (90 - angle) under every printed angle', () => {
    const coAngles = getScaleTicks(scaleOf('S'))
      .filter((t) => t.label)
      .map((t) => 90 - (t.angle as number))
    expect(coAngles).toEqual([84, 83, 82, 81, 80, 75, 70, 60, 50, 40, 30, 0])
  })
})

describe('Type 57 T graduations (tan 5.71..45 deg)', () => {
  // Steps: 10' in [5.71,15), then 20' up to 45. This row was the cleanest of
  // the three (every measured gap inside [10,15) is 1/6 deg, inside
  // [15,45) 1/3 deg).
  const intervals: AngleFact[] = [
    { from: 5.71, to: 10, count: 26, levels: { 1: 5, 2: 4, 3: 17 } },
    { from: 10, to: 15, count: 30, levels: { 1: 5, 2: 5, 3: 20 } },
    { from: 15, to: 20, count: 15, levels: { 1: 5, 3: 10 } },
    { from: 20, to: 30, count: 30, levels: { 1: 10, 3: 20 } },
    { from: 30, to: 45, count: 46, levels: { 1: 16, 3: 30 }, closed: true },
  ]

  it('has the measured ticks, lengths and counts in every interval', () => {
    checkAngleIntervals(scaleOf('T'), intervals)
  })

  it('starts on the unlabelled 5.71 tick and ends at 45', () => {
    const ticks = getScaleTicks(scaleOf('T'))
    expect(ticks[0].angle).toBeCloseTo(5.71, 6)
    expect(ticks[0].label).toBeUndefined()
    expect(ticks[ticks.length - 1].angle).toBeCloseTo(45, 6)
    expect(ticks[ticks.length - 1].position).toBeCloseTo(1, 9)
  })

  it('prints 6 7 8 9 10 15 20 30 40 45', () => {
    expect(labels(scaleOf('T'))).toEqual(['6', '7', '8', '9', '10', '15', '20', '30', '40', '45'])
  })
})

describe('Type 57 ST graduations (sin 0.573..5.74 deg)', () => {
  // Steps: 5' up to 1 deg 30', then 10'. The far end (5.74) is unlabelled.
  const intervals: AngleFact[] = [
    { from: 0.573, to: 1.5, count: 12, levels: { 1: 5, 2: 2, 3: 5 } },
    { from: 1.5, to: 5.74, count: 27, levels: { 1: 6, 2: 4, 3: 17 }, closed: true },
  ]

  it('has the measured ticks, lengths and counts in every interval', () => {
    checkAngleIntervals(scaleOf('ST'), intervals)
  })

  it('starts unlabelled at 0.573 and leaves the 5.74 end unlabelled', () => {
    const ticks = getScaleTicks(scaleOf('ST'))
    expect(ticks[0].angle).toBeCloseTo(0.573, 6)
    expect(ticks[0].label).toBeUndefined()
    const last = ticks[ticks.length - 1]
    expect(last.angle).toBeCloseTo(5.74, 6)
    expect(last.label).toBeUndefined()
  })

  it('prints the angles as degrees and minutes', () => {
    expect(labels(scaleOf('ST'))).toEqual([
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
  })
})

describe('1002 regression guard', () => {
  // Every 1002 scale is driven by its unified calculation.
  it('drives every 1002 scale from a calculation', () => {
    const all = [
      ...MODEL_1002.front.upper,
      ...MODEL_1002.front.middle,
      ...MODEL_1002.front.lower,
      ...MODEL_1002.back.upper,
      ...MODEL_1002.back.middle,
      ...MODEL_1002.back.lower,
    ]
    for (const s of all) expect(s.calc, s.name).toBeDefined()
  })
})

describe('table ticks agree with the cursor reader', () => {
  for (const name of ['K', 'A', 'C', 'D', 'DI', 'L']) {
    it(`${name} positions are in range and read back to their value`, () => {
      const scale = scaleOf(name)
      const ticks = getScaleTicks(scale)
      expect(ticks[0].position).toBeCloseTo(0, 9)
      expect(ticks[ticks.length - 1].position).toBeCloseTo(1, 9)
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i].position).toBeGreaterThan(ticks[i - 1].position)
      }
      for (const tick of ticks) {
        expect(tick.position).toBeGreaterThanOrEqual(-1e-9)
        expect(tick.position).toBeLessThanOrEqual(1 + 1e-9)
        expect(readScaleValue(scale, tick.position)).toBeCloseTo(tick.value, 6)
      }
    })
  }

  // A trig row reads the angle back from the position; the inverse mapping
  // places each printed bound back at its own tick position.
  for (const name of ['S', 'ST', 'T']) {
    it(`${name} angles are in range and read back from the cursor`, () => {
      const scale = scaleOf(name)
      const ticks = getScaleTicks(scale)
      const first = ticks[0]
      const last = ticks[ticks.length - 1]
      expect(positionForValue(scale, first.angle!)).toBeCloseTo(first.position, 9)
      expect(positionForValue(scale, last.angle!)).toBeCloseTo(last.position, 9)
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i].position).toBeGreaterThan(ticks[i - 1].position)
      }
      for (const tick of ticks) {
        expect(tick.position).toBeGreaterThanOrEqual(-0.001)
        expect(tick.position).toBeLessThanOrEqual(1.001)
        expect(readScaleValue(scale, tick.position)).toBeCloseTo(tick.angle ?? NaN, 6)
      }
    })
  }
})
