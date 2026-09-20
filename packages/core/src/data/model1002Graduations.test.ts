// 1002 back-face log-log (ln1 / ln2 / ln3) measured graduations.
//
// The interval boundaries, the tick step inside each interval and the tick
// length ("level") are measured facts: they were read from the black rows of
// the maintainer's prototype photograph `docs/domain/prototype/1002-back.jpg`
// (3651x720) and recorded in the canonical JSON (packages/core/rules/1002.json). The detected
// tick counts on the photograph match the generated counts almost exactly
// (ln1 376/376, ln2 385/382, ln3 352/361), which is the evidence that the
// measured fine steps are complete. See docs/domain/model-1002.md section 3.6.
//
// Levels: 1 = longest, 2 = medium, 3 = shortest.
import { describe, it, expect } from 'vitest'
import { MODEL_1002 } from '../index'
import { getScaleTicks } from '../engine/scaleFunctions'
import { readScaleValue } from '../engine/scaleReader'
import type { GraduationInterval, ScaleDefinition, Tick, TickLevel } from '../types/scale'

function scaleOf(name: string): ScaleDefinition {
  const all = [
    ...MODEL_1002.front.upper,
    ...MODEL_1002.front.middle,
    ...MODEL_1002.front.lower,
    ...MODEL_1002.back.upper,
    ...MODEL_1002.back.middle,
    ...MODEL_1002.back.lower,
  ]
  const s = all.find((sc) => sc.name === name)
  if (!s) throw new Error('missing scale ' + name)
  return s
}

// The loaded model's measured interval table for a back lower ln row.
function calcIntervals(id: string): GraduationInterval[] {
  const s = MODEL_1002.back.lower.find((sc) => sc.id === id)
  if (!s?.calc) throw new Error('missing calculation for ' + id)
  return s.calc.intervals
}

// Ticks whose argument lies in [from,to) (or [from,to] when `closed`).
function inRange(ticks: Tick[], from: number, to: number, closed = false): Tick[] {
  return ticks.filter(
    (t) => t.value >= from - 1e-9 && (closed ? t.value <= to + 1e-9 : t.value < to - 1e-9),
  )
}

function tickAt(ticks: Tick[], value: number): Tick | undefined {
  return ticks.find((t) => Math.abs(t.value - value) < 1e-9)
}

function levelOf(ticks: Tick[], value: number): TickLevel | undefined {
  return tickAt(ticks, value)?.level
}

function labels(scale: ScaleDefinition): string[] {
  return getScaleTicks(scale)
    .filter((t) => t.label)
    .map((t) => t.label as string)
}

// Interval boundaries and measured tick counts of one row. `from`/`to` are the
// absolute arguments; the finest step is `step`.
interface RowFact {
  scale: string
  from: number
  to: number
  step: number
  count: number
  closed?: boolean
}

// ---------------------------------------------------------------------------

describe('1002 ln1 measured graduations (1.0095 .. 1.11)', () => {
  const intervals: RowFact[] = [
    { scale: 'ln1', from: 1.0095, to: 1.02, step: 0.0001, count: 105 },
    { scale: 'ln1', from: 1.02, to: 1.05, step: 0.0002, count: 150 },
    { scale: 'ln1', from: 1.05, to: 1.11, step: 0.0005, count: 121, closed: true },
  ]

  it('has the measured finest step and tick count in every interval', () => {
    const ticks = getScaleTicks(scaleOf('ln1'))
    for (const f of intervals) {
      const got = inRange(ticks, f.from, f.to, f.closed)
      expect(got.length, `ln1 [${f.from},${f.to})`).toBe(f.count)
      // Every finest step lands on a tick.
      const first = Math.ceil(f.from / f.step - 1e-9)
      const last = f.closed ? Math.floor(f.to / f.step + 1e-9) : Math.ceil(f.to / f.step - 1e-9) - 1
      for (let k = first; k <= last; k++) {
        expect(tickAt(ticks, k * f.step), `ln1 tick ${k * f.step}`).toBeDefined()
      }
    }
  })

  it('has the measured tick lengths', () => {
    const t = getScaleTicks(scaleOf('ln1'))
    // Printed numbers are the longest.
    expect(levelOf(t, 1.0095)).toBe(1)
    expect(levelOf(t, 1.01)).toBe(1)
    expect(levelOf(t, 1.015)).toBe(1)
    // [1.0095,1.02): 0.001 longest, 0.0005 medium, 0.0001 fine.
    expect(levelOf(t, 1.011)).toBe(1)
    expect(levelOf(t, 1.0105)).toBe(2)
    expect(levelOf(t, 1.0101)).toBe(3)
    // [1.02,1.05): 0.005 longest, 0.001 medium, 0.0002 fine.
    expect(levelOf(t, 1.025)).toBe(1)
    expect(levelOf(t, 1.021)).toBe(2)
    expect(levelOf(t, 1.0202)).toBe(3)
    // [1.05,1.11]: 0.005 longest, 0.001 medium, 0.0005 fine.
    expect(levelOf(t, 1.055)).toBe(1)
    expect(levelOf(t, 1.051)).toBe(2)
    expect(levelOf(t, 1.0505)).toBe(3)
  })

  it('prints the measured numbers', () => {
    expect(labels(scaleOf('ln1'))).toEqual([
      '1.0095',
      '1.01',
      '1.015',
      '1.02',
      '1.03',
      '1.04',
      '1.05',
      '1.06',
      '1.07',
      '1.08',
      '1.09',
      '1.10',
      '1.11',
    ])
  })
})

describe('1002 ln2 measured graduations (1.10 .. 2.9)', () => {
  const intervals: RowFact[] = [
    { scale: 'ln2', from: 1.1, to: 1.11, step: 0.0005, count: 20 },
    { scale: 'ln2', from: 1.11, to: 1.2, step: 0.001, count: 90 },
    { scale: 'ln2', from: 1.2, to: 1.4, step: 0.002, count: 100 },
    { scale: 'ln2', from: 1.4, to: 1.8, step: 0.005, count: 80 },
    { scale: 'ln2', from: 1.8, to: 2.5, step: 0.01, count: 70 },
    { scale: 'ln2', from: 2.5, to: 2.9, step: 0.02, count: 22, closed: true },
  ]

  it('has the measured finest step and tick count in every interval', () => {
    const ticks = getScaleTicks(scaleOf('ln2'))
    for (const f of intervals) {
      const got = inRange(ticks, f.from, f.to, f.closed)
      expect(got.length, `ln2 [${f.from},${f.to})`).toBe(f.count)
    }
  })

  it('has the measured tick lengths', () => {
    const t = getScaleTicks(scaleOf('ln2'))
    expect(levelOf(t, 1.105)).toBe(1)
    expect(levelOf(t, 1.101)).toBe(2)
    expect(levelOf(t, 1.1005)).toBe(3)
    expect(levelOf(t, 1.15)).toBe(1)
    expect(levelOf(t, 1.115)).toBe(2)
    expect(levelOf(t, 1.111)).toBe(3)
    expect(levelOf(t, 1.3)).toBe(1)
    expect(levelOf(t, 1.21)).toBe(2)
    expect(levelOf(t, 1.202)).toBe(3)
    expect(levelOf(t, 1.5)).toBe(1)
    expect(levelOf(t, 1.42)).toBe(2)
    expect(levelOf(t, 1.405)).toBe(3)
    expect(levelOf(t, 2)).toBe(1)
    expect(levelOf(t, 1.85)).toBe(2)
    expect(levelOf(t, 1.81)).toBe(3)
    expect(levelOf(t, 2.6)).toBe(2)
    expect(levelOf(t, 2.52)).toBe(3)
  })

  it('prints the measured numbers (with the e mark)', () => {
    expect(labels(scaleOf('ln2'))).toEqual([
      '1.10',
      '1.11',
      '1.15',
      '1.2',
      '1.3',
      '1.4',
      '1.5',
      '1.6',
      '1.7',
      '1.8',
      '1.9',
      '2',
      '2.5',
      'e',
      '2.9',
    ])
  })
})

describe('1002 ln3 measured graduations (2.5 .. 20000)', () => {
  const intervals: RowFact[] = [
    { scale: 'ln3', from: 2.5, to: 4, step: 0.02, count: 76 },
    { scale: 'ln3', from: 4, to: 6, step: 0.05, count: 40 },
    { scale: 'ln3', from: 6, to: 10, step: 0.1, count: 40 },
    { scale: 'ln3', from: 10, to: 15, step: 0.2, count: 25 },
    { scale: 'ln3', from: 15, to: 30, step: 0.5, count: 30 },
    { scale: 'ln3', from: 30, to: 50, step: 1, count: 20 },
    { scale: 'ln3', from: 50, to: 100, step: 2, count: 25 },
    { scale: 'ln3', from: 100, to: 200, step: 5, count: 20 },
    { scale: 'ln3', from: 200, to: 500, step: 10, count: 30 },
    { scale: 'ln3', from: 500, to: 1000, step: 50, count: 10 },
    { scale: 'ln3', from: 1000, to: 2000, step: 100, count: 10 },
    { scale: 'ln3', from: 2000, to: 5000, step: 200, count: 15 },
    { scale: 'ln3', from: 5000, to: 10000, step: 500, count: 10 },
    { scale: 'ln3', from: 10000, to: 20000, step: 1000, count: 11, closed: true },
  ]

  it('has the measured finest step and tick count in every interval', () => {
    const ticks = getScaleTicks(scaleOf('ln3'))
    for (const f of intervals) {
      const got = inRange(ticks, f.from, f.to, f.closed)
      expect(got.length, `ln3 [${f.from},${f.to})`).toBe(f.count)
    }
  })

  it('has the measured tick lengths', () => {
    const t = getScaleTicks(scaleOf('ln3'))
    // [3,4) is the maintainer-supplied sample: 0.02 fine / 0.1 medium.
    expect(levelOf(t, 3.02)).toBe(3)
    expect(levelOf(t, 3.1)).toBe(2)
    expect(levelOf(t, 3.5)).toBe(2)
    expect(levelOf(t, 3)).toBe(1)
    expect(levelOf(t, Math.E)).toBe(1)
    // The step and its levels grow with the argument.
    expect(levelOf(t, 4.05)).toBe(3)
    expect(levelOf(t, 4.1)).toBe(2)
    expect(levelOf(t, 4.5)).toBe(1)
    expect(levelOf(t, 10.2)).toBe(3)
    expect(levelOf(t, 11)).toBe(2)
    expect(levelOf(t, 15.5)).toBe(3)
    expect(levelOf(t, 25)).toBe(1)
    expect(levelOf(t, 31)).toBe(3)
    expect(levelOf(t, 35)).toBe(2)
    expect(levelOf(t, 52)).toBe(3)
    expect(levelOf(t, 60)).toBe(2)
    expect(levelOf(t, 105)).toBe(3)
    expect(levelOf(t, 110)).toBe(2)
    expect(levelOf(t, 210)).toBe(3)
    expect(levelOf(t, 250)).toBe(2)
    expect(levelOf(t, 300)).toBe(1)
    expect(levelOf(t, 550)).toBe(3)
    expect(levelOf(t, 600)).toBe(2)
    expect(levelOf(t, 1100)).toBe(3)
    expect(levelOf(t, 1500)).toBe(2)
    expect(levelOf(t, 2200)).toBe(3)
    expect(levelOf(t, 3000)).toBe(2)
    expect(levelOf(t, 5500)).toBe(3)
    expect(levelOf(t, 6000)).toBe(2)
    expect(levelOf(t, 11000)).toBe(3)
    expect(levelOf(t, 15000)).toBe(2)
  })

  it('prints the measured numbers (with the e mark)', () => {
    expect(labels(scaleOf('ln3'))).toEqual([
      '2.5',
      'e',
      '3',
      '4',
      '5',
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
      '100',
      '200',
      '500',
      '1000',
      '2000',
      '5000',
      '10000',
      '20000',
    ])
  })
})

describe('1002 ln graduations agree with the C/D mapping and the reader', () => {
  const rows: [string, number, number][] = [
    ['ln1', 0.01, 2],
    ['ln2', 0.1, 1],
    ['ln3', 1, 0],
  ]

  it.each(rows)('%s positions follow p = log10(ln x) - log10(from)', (name, from) => {
    const ticks = getScaleTicks(scaleOf(name))
    for (const tick of ticks) {
      expect(tick.position, `${name} ${tick.value}`).toBeCloseTo(
        Math.log10(Math.log(tick.value)) - Math.log10(from),
        9,
      )
    }
  })

  it.each(rows)('%s ticks are sorted and read back through the cursor', (name) => {
    const scale = scaleOf(name)
    const ticks = getScaleTicks(scale)
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].position).toBeGreaterThan(ticks[i - 1].position)
    }
    for (const tick of ticks) {
      expect(readScaleValue(scale, tick.position)).toBeCloseTo(tick.value, 6)
    }
  })

  it('the red reciprocal rows use the same measured steps as the black rows', () => {
    // The reciprocal rows print their own measured numbers (some add an extra
    // tick, e.g. `1.08`'s reciprocal is absent on ln1I), but they must be laid
    // down on the same measured grid so the two rows stay aligned.
    const rows: [string, string, number, GraduationInterval[]][] = [
      ['ln1', 'ln1I', 0.01, calcIntervals('ln1')],
      ['ln2', 'ln2I', 0.1, calcIntervals('ln2')],
      ['ln3', 'ln3I', 1, calcIntervals('ln3')],
    ]
    for (const [black, red, from, intervals] of rows) {
      const bPos = new Set(getScaleTicks(scaleOf(black)).map((t) => t.position))
      const rPos = new Set(getScaleTicks(scaleOf(red)).map((t) => t.position))
      for (const iv of intervals) {
        const fine = Math.min(...iv.steps.map((s) => s.step))
        const first = Math.ceil(iv.from / fine - 1e-9)
        const last = Math.ceil(iv.to / fine - 1e-9) - 1
        for (const k of [first, Math.floor((first + last) / 2), last]) {
          const x = Number((k * fine).toPrecision(12))
          const p = Math.log10(Math.log(x)) - Math.log10(from)
          expect(bPos.has(p), `${black} grid ${x}`).toBe(true)
          expect(rPos.has(p), `${red} grid ${x}`).toBe(true)
        }
      }
    }
  })

  it('prints the measured numbers of the red reciprocal rows', () => {
    expect(labels(scaleOf('ln1I'))).toEqual([
      '.9905',
      '.99',
      '.985',
      '.98',
      '.97',
      '.96',
      '.95',
      '.94',
      '.93',
      '.92',
      '.91',
      '.9',
    ])
    // `1.08`'s reciprocal is deliberately absent on the rule.
    expect(labels(scaleOf('ln1I'))).not.toContain('.925')
    expect(labels(scaleOf('ln2I'))).toEqual([
      '.91',
      '.9',
      '.85',
      '.8',
      '.7',
      '.6',
      '.5',
      '.4',
      'e-1',
      '.35',
    ])
    expect(labels(scaleOf('ln3I'))).toEqual([
      '.4',
      '.3',
      '.2',
      '.1',
      '.08',
      '.06',
      '.04',
      '.03',
      '.02',
      '.01',
      '.005',
      '.002',
      '.001',
      '.0005',
      '.0002',
      '.0001',
      '.00005',
    ])
  })

  it('the interval table is the measured one', () => {
    expect(calcIntervals('ln1').length).toBe(3)
    expect(calcIntervals('ln2').length).toBe(6)
    expect(calcIntervals('ln3').length).toBe(14)
  })
})

describe('1002 sin2 measured graduations (5.5 .. 90 deg)', () => {
  const intervals: RowFact[] = [
    { scale: 'sin2', from: 5.5, to: 10, step: 0.05, count: 90 },
    { scale: 'sin2', from: 10, to: 20, step: 0.1, count: 100 },
    { scale: 'sin2', from: 20, to: 30, step: 0.2, count: 50 },
    { scale: 'sin2', from: 30, to: 60, step: 0.5, count: 60 },
    { scale: 'sin2', from: 60, to: 80, step: 1, count: 20 },
    { scale: 'sin2', from: 80, to: 90, step: 5, count: 3, closed: true },
  ]

  it('has the measured finest step and tick count in every interval', () => {
    const ticks = getScaleTicks(scaleOf('sin2'))
    for (const f of intervals) {
      const got = angleInRange(ticks, f.from, f.to, f.closed)
      expect(got.length, `sin2 [${f.from},${f.to})`).toBe(f.count)
      const first = Math.ceil(f.from / f.step + 1e-9)
      const last = f.closed ? Math.floor(f.to / f.step + 1e-9) : Math.ceil(f.to / f.step - 1e-9) - 1
      for (let k = first; k <= last; k++) {
        expect(finestHas(ticks, k * f.step), `sin2 tick ${k * f.step}`).toBe(true)
      }
    }
  })

  it('has the measured tick levels', () => {
    const t = getScaleTicks(scaleOf('sin2'))
    expect(angleLevel(t, 5.5)).toBe(1)
    expect(angleLevel(t, 5.55)).toBe(3)
    expect(angleLevel(t, 5.6)).toBe(2)
    expect(angleLevel(t, 5.75)).toBe(3)
    expect(angleLevel(t, 6)).toBe(1)
    expect(angleLevel(t, 15.1)).toBe(3)
    expect(angleLevel(t, 15.5)).toBe(2)
    expect(angleLevel(t, 22.2)).toBe(3)
    expect(angleLevel(t, 22)).toBe(2)
    expect(angleLevel(t, 25)).toBe(1)
    expect(angleLevel(t, 35)).toBe(1)
    expect(angleLevel(t, 60)).toBe(1)
    expect(angleLevel(t, 65)).toBe(2)
  })

  it('prints the measured numbers (no 35 / 45 / 55 / 65 / 75 / 85)', () => {
    expect(labels(scaleOf('sin2'))).toEqual([
      '5.5°',
      '6°',
      '7°',
      '8°',
      '9°',
      '10°',
      '15°',
      '20°',
      '25°',
      '30°',
      '40°',
      '50°',
      '60°',
      '70°',
      '80°',
      '90°',
    ])
  })

  it('positions follow p = log10(sin angle) + 1 and read back through the cursor', () => {
    const scale = scaleOf('sin2')
    const ticks = getScaleTicks(scale)
    for (const tick of ticks) {
      const angle = tick.angle as number
      expect(tick.position, `sin2 ${angle}`).toBeCloseTo(
        Math.log10(Math.sin((angle * Math.PI) / 180)) + 1,
        9,
      )
      // The unified calculation makes `value` the reading (the angle); `angle`
      // keeps the graduation the co-angle line needs.
      expect(tick.value).toBeCloseTo(tick.angle ?? NaN, 9)
      expect(readScaleValue(scale, tick.position)).toBeCloseTo(angle, 6)
    }
  })
})

// A finest-step tick exists (the generator may round to 12 significant digits).
function finestHas(ticks: Tick[], angle: number): boolean {
  const a = Number(angle.toPrecision(12))
  return ticks.some((t) => t.angle !== undefined && Math.abs(t.angle - a) < 1e-9)
}

function angleLevel(ticks: Tick[], angle: number): TickLevel | undefined {
  return ticks.find((t) => t.angle !== undefined && Math.abs(t.angle - angle) < 1e-9)?.level
}

function angleInRange(ticks: Tick[], from: number, to: number, closed = false): Tick[] {
  return ticks.filter(
    (t) =>
      t.angle !== undefined &&
      t.angle >= from - 1e-9 &&
      (closed ? t.angle <= to + 1e-9 : t.angle < to - 1e-9),
  )
}

// The unified calculation makes each hyperbolic tick's `value` the reading,
// which for these rows is the printed argument x.
function argInRange(ticks: Tick[], from: number, to: number, closed = false) {
  return ticks.filter(
    (t) => t.value >= from - 1e-9 && (closed ? t.value <= to + 1e-9 : t.value < to - 1e-9),
  )
}

describe('1002 C / D measured tick levels and labels', () => {
  const lvl = (v: number) =>
    getScaleTicks(scaleOf('C')).find((t) => Math.abs(t.value - v) < 1e-9)?.level

  it('makes the .05 midpoint ticks in [1,2) long, like the tenths', () => {
    expect(lvl(1.01)).toBe(3)
    expect(lvl(1.05)).toBe(1)
    expect(lvl(1.1)).toBe(1)
    expect(lvl(1.15)).toBe(1)
    expect(lvl(2.06)).toBe(3)
    expect(lvl(2.1)).toBe(1)
    expect(lvl(4.05)).toBe(3)
    expect(lvl(4.1)).toBe(1)
  })

  it('prints the C/D numbers (decimals in [1,2) then integers) and pi', () => {
    expect(labels(scaleOf('C'))).toEqual([
      '1',
      '1.1',
      '1.2',
      '1.3',
      '1.4',
      '1.5',
      '1.6',
      '1.7',
      '1.8',
      '1.9',
      '2',
      '3',
      'π',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ])
  })

  it('th2 prints its numbers below the graduations', () => {
    const th2 = MODEL_1002.front.lower.find((s) => s.name === 'th2')
    expect(th2?.numbersBelow).toBe(true)
  })
})

describe('1002 A / K measured per-decade graduations', () => {
  const count = (name: string, from: number, to: number) =>
    getScaleTicks(scaleOf(name)).filter(
      (t) => t.label !== 'π' && t.value >= from - 1e-9 && t.value < to - 1e-9,
    ).length
  const has = (name: string, value: number) =>
    getScaleTicks(scaleOf(name)).some((t) => Math.abs(t.value - value) < 1e-9)

  it('A repeats the measured ladder in both decades', () => {
    expect(count('A', 1, 2)).toBe(50) // 0.02
    expect(count('A', 2, 5)).toBe(60) // 0.05
    expect(count('A', 5, 10)).toBe(50) // 0.1
    expect(count('A', 10, 20)).toBe(50)
    expect(count('A', 20, 50)).toBe(60)
    expect(has('A', 1.02)).toBe(true)
    expect(has('A', 2.05)).toBe(true)
    expect(has('A', 5.1)).toBe(true)
    expect(has('A', 10.2)).toBe(true)
    expect(has('A', 20.5)).toBe(true)
  })

  it('K repeats the measured ladder in all three decades', () => {
    expect(count('K', 1, 3)).toBe(40) // 0.05
    expect(count('K', 3, 6)).toBe(30) // 0.1
    expect(count('K', 6, 10)).toBe(20) // 0.2
    expect(count('K', 100, 300)).toBe(40)
    expect(count('K', 300, 600)).toBe(30)
    expect(has('K', 1.05)).toBe(true)
    expect(has('K', 3.1)).toBe(true)
    expect(has('K', 6.2)).toBe(true)
    expect(has('K', 10.5)).toBe(true)
    expect(has('K', 31)).toBe(true)
    expect(has('K', 62)).toBe(true)
  })

  it('A prints the measured numbers and the pi mark (no 1.1 / 1.2 ...)', () => {
    expect(labels(scaleOf('A'))).toEqual([
      '1',
      '2',
      '3',
      'π',
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
    ])
  })

  it('K prints the measured numbers (no 1.5 / 15, no pi)', () => {
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

describe('1002 lg measured linear graduations', () => {
  it('is linear 0..1 every 0.002 with tenths printed', () => {
    const t = getScaleTicks(scaleOf('lg'))
    expect(t.length).toBe(501)
    expect(t[1].value - t[0].value).toBeCloseTo(0.002, 9)
    expect(t[t.length - 1].value).toBeCloseTo(1, 12)
    expect(labels(scaleOf('lg'))).toEqual([
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

describe("1002 H'2 / th2 measured graduations", () => {
  const has = (name: string, value: number) =>
    getScaleTicks(scaleOf(name)).some((t) => Math.abs(t.value - value) < 1e-9)
  const count = (name: string, from: number, to: number, closed = false) =>
    getScaleTicks(scaleOf(name)).filter(
      (t) => t.value >= from - 1e-9 && (closed ? t.value <= to + 1e-9 : t.value < to - 1e-9),
    ).length

  it("H'2 is graduated by printed sech value and ends on the .0 asymptote", () => {
    for (const v of [0.995, 0.99, 0.98, 0.95, 0.9, 0.8, 0.6, 0.4, 0.3, 0.1, 0.05]) {
      expect(has("H'2", v), `H'2 ${v}`).toBe(true)
    }
    expect(count("H'2", 0.9, 0.95)).toBe(50) // 0.001
    expect(labels(scaleOf("H'2")).at(-1)).toBe('.0')
  })

  it('th2 is graduated by argument x on a 1-2-5 ladder', () => {
    const t = getScaleTicks(scaleOf('th2'))
    expect(argInRange(t, 0.095, 0.2).length).toBe(105) // 0.001
    expect(argInRange(t, 0.2, 0.4).length).toBe(100) // 0.002
    expect(argInRange(t, 0.4, 0.7).length).toBe(60) // 0.005
    expect(argInRange(t, 0.7, 1).length).toBe(30) // 0.01
    expect(argInRange(t, 1, 1.5).length).toBe(25) // 0.02
    expect(argInRange(t, 1.5, 3, true).length).toBe(31) // 0.05 + end
    const hasArg = (x: number) => t.some((k) => Math.abs(k.value - x) < 1e-9)
    expect(hasArg(0.101)).toBe(true)
    expect(hasArg(0.202)).toBe(true)
    expect(hasArg(0.71)).toBe(true)
    expect(hasArg(1.02)).toBe(true)
  })

  it('th2 marks the C/D asymptote with the infinity note', () => {
    const inf = getScaleTicks(scaleOf('th2')).find((t) => t.label === '∞')
    expect(inf).toBeDefined()
    expect(inf!.position).toBeCloseTo(1, 9)
  })

  it('th2 prints the argument numbers read from the rule', () => {
    expect(labels(scaleOf('th2'))).toEqual([
      '.095',
      '.1',
      '.15',
      '.2',
      '.3',
      '.4',
      '.5',
      '.6',
      '.7',
      '.8',
      '.9',
      '1',
      '1.5',
      '2',
      '3',
      '∞',
    ])
  })
})

describe('1002 H2 / H3 measured graduations (by printed value)', () => {
  const count = (name: string, from: number, to: number, closed = false) =>
    getScaleTicks(scaleOf(name)).filter(
      (t) => t.value >= from - 1e-9 && (closed ? t.value <= to + 1e-9 : t.value < to - 1e-9),
    ).length

  it('H2 has the measured value steps and counts', () => {
    expect(count('H2', 1.005, 1.008)).toBe(30) // 0.0001
    expect(count('H2', 1.008, 1.01)).toBe(10) // 0.0002
    expect(count('H2', 1.01, 1.02)).toBe(50)
    expect(count('H2', 1.02, 1.05)).toBe(60) // 0.0005
    expect(count('H2', 1.05, 1.1)).toBe(50) // 0.001
    expect(count('H2', 1.1, 1.2)).toBe(50) // 0.002
    expect(count('H2', 1.2, 1.4)).toBe(40) // 0.005
    expect(count('H2', 1.4, 1.45, true)).toBe(6) // 0.01 + end
  })

  it('H2 has the measured levels', () => {
    const t = getScaleTicks(scaleOf('H2'))
    const lvl = (v: number) => t.find((k) => Math.abs(k.value - v) < 1e-9)?.level
    expect(lvl(1.005)).toBe(1)
    expect(lvl(1.0051)).toBe(3)
    expect(lvl(1.0055)).toBe(2)
    expect(lvl(1.006)).toBe(1)
    expect(lvl(1.0255)).toBe(3)
    expect(lvl(1.026)).toBe(2)
    expect(lvl(1.03)).toBe(1)
    expect(lvl(1.225)).toBe(3)
    expect(lvl(1.23)).toBe(2)
    expect(lvl(1.45)).toBe(1)
  })

  it('H2 prints the measured numbers', () => {
    expect(labels(scaleOf('H2'))).toEqual([
      '1.005',
      '1.008',
      '1.01',
      '1.02',
      '1.03',
      '1.04',
      '1.05',
      '1.1',
      '1.2',
      '1.3',
      '1.4',
      '1.45',
    ])
  })

  it('H3 has the measured value steps and counts', () => {
    expect(count('H3', 1.4, 2)).toBe(60) // 0.01
    expect(count('H3', 2, 4)).toBe(100) // 0.02
    expect(count('H3', 4, 10)).toBe(120) // 0.05
    expect(count('H3', 10, 10.5, true)).toBe(11) // 0.05 + end
    const t = getScaleTicks(scaleOf('H3'))
    const lvl = (v: number) => t.find((k) => Math.abs(k.value - v) < 1e-9)?.level
    expect(lvl(2.02)).toBe(3)
    expect(lvl(2.1)).toBe(2)
    expect(lvl(2.5)).toBe(1)
    expect(lvl(10.5)).toBe(1)
  })

  it('H3 prints the measured numbers', () => {
    expect(labels(scaleOf('H3'))).toEqual([
      '1.4',
      '1.5',
      '1.6',
      '1.7',
      '1.8',
      '1.9',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '10.5',
    ])
  })

  it('H2 / H3 positions follow x = acosh(value)', () => {
    for (const [name, from] of [
      ['H2', 0.1],
      ['H3', 1],
    ] as const) {
      const scale = scaleOf(name)
      for (const tick of getScaleTicks(scale)) {
        const x = Math.acosh(tick.value)
        expect(tick.position, `${name} ${tick.value}`).toBeCloseTo(
          Math.log10(Math.sinh(x) / from),
          9,
        )
        expect(readScaleValue(scale, tick.position)).toBeCloseTo(tick.value, 6)
      }
    }
  })
})

describe('1002 tg2 / tg3 measured graduations', () => {
  const count = (name: string, from: number, to: number, closed = false) =>
    getScaleTicks(scaleOf(name)).filter(
      (t) =>
        t.angle !== undefined &&
        t.angle >= from - 1e-9 &&
        (closed ? t.angle <= to + 1e-9 : t.angle < to - 1e-9),
    ).length

  it('tg2 has the measured steps and counts', () => {
    expect(count('tg2', 5.5, 10)).toBe(90) // 0.05
    expect(count('tg2', 10, 30)).toBe(200) // 0.1
    expect(count('tg2', 30, 45, true)).toBe(76) // 0.2 (+ end)
    expect(angleLevel(getScaleTicks(scaleOf('tg2')), 5.55)).toBe(3)
    expect(angleLevel(getScaleTicks(scaleOf('tg2')), 5.6)).toBe(2)
    expect(angleLevel(getScaleTicks(scaleOf('tg2')), 6)).toBe(1)
    expect(angleLevel(getScaleTicks(scaleOf('tg2')), 22.1)).toBe(3)
    expect(angleLevel(getScaleTicks(scaleOf('tg2')), 25)).toBe(1)
  })

  it('tg2 prints the measured numbers', () => {
    expect(labels(scaleOf('tg2'))).toEqual([
      '5.5°',
      '6°',
      '7°',
      '8°',
      '9°',
      '10°',
      '15°',
      '20°',
      '25°',
      '30°',
      '35°',
      '40°',
      '45°',
    ])
  })

  it('tg3 has the measured steps and counts', () => {
    expect(count('tg3', 45, 60)).toBe(75) // 0.2
    expect(count('tg3', 60, 80)).toBe(200) // 0.1
    expect(count('tg3', 80, 84.5, true)).toBe(91) // 0.05 (+ end)
    expect(angleLevel(getScaleTicks(scaleOf('tg3')), 45.2)).toBe(3)
    expect(angleLevel(getScaleTicks(scaleOf('tg3')), 46)).toBe(2)
    expect(angleLevel(getScaleTicks(scaleOf('tg3')), 50)).toBe(1)
    expect(angleLevel(getScaleTicks(scaleOf('tg3')), 82.05)).toBe(3)
    expect(angleLevel(getScaleTicks(scaleOf('tg3')), 82.5)).toBe(1)
  })

  it('tg3 prints the measured numbers ending at 84.5', () => {
    expect(labels(scaleOf('tg3'))).toEqual([
      '45°',
      '50°',
      '55°',
      '60°',
      '65°',
      '70°',
      '75°',
      '80°',
      '81°',
      '82°',
      '83°',
      '84°',
      '84.5°',
    ])
  })
})

describe('1002 folded / reciprocal measured graduations', () => {
  const has = (name: string, value: number) =>
    getScaleTicks(scaleOf(name)).some((t) => Math.abs(t.value - value) < 1e-9)

  it('CF and DF carry the measured fine steps', () => {
    expect(has('CF', 3.18)).toBe(true) // 0.02 in [sqrt10,4)
    expect(has('CF', 4.05)).toBe(true) // 0.05 in [4,10)
    expect(has('CF', 10.1)).toBe(true) // 0.1 in [10,20)
    expect(has('DF', 3.02)).toBe(true)
    expect(has('DF', 4.05)).toBe(true)
    expect(has('DF', 20.2)).toBe(true)
  })

  it('CI mirrors the measured value grid', () => {
    const ci = getScaleTicks(scaleOf('CI'))
    for (const v of [1.1, 2.02, 4.05, 5.05]) {
      const t = ci.find((k) => Math.abs(k.value - v) < 1e-9)
      expect(t, `CI ${v}`).toBeDefined()
      expect(t!.position).toBeCloseTo(1 - Math.log10(v), 9)
    }
  })
})

describe('1002 sh2 / sh3 measured graduations', () => {
  it('sh2 has the measured finest step and count', () => {
    const ticks = getScaleTicks(scaleOf('sh2'))
    const facts = [
      { from: 0.095, to: 0.1, count: 5 },
      { from: 0.1, to: 0.2, count: 100 },
      { from: 0.2, to: 0.4, count: 100 },
      { from: 0.4, to: 0.9, count: 101 }, // includes the 0.9 end
    ]
    for (const f of facts) {
      expect(argInRange(ticks, f.from, f.to, f.to === 0.9).length, `sh2 [${f.from},${f.to})`).toBe(
        f.count,
      )
    }
  })

  it('sh2 has the measured tick lengths', () => {
    const t = getScaleTicks(scaleOf('sh2'))
    // `value` is the printed argument x under the unified calculation.
    const lvl = (x: number) => t.find((k) => Math.abs(k.value - x) < 1e-9)?.level
    expect(lvl(0.095)).toBe(1)
    expect(lvl(0.101)).toBe(3)
    expect(lvl(0.105)).toBe(2)
    expect(lvl(0.11)).toBe(1)
    expect(lvl(0.202)).toBe(3)
    expect(lvl(0.21)).toBe(2)
    expect(lvl(0.25)).toBe(1)
    expect(lvl(0.405)).toBe(3)
    expect(lvl(0.41)).toBe(2)
    expect(lvl(0.45)).toBe(1)
  })

  it('sh2 prints the measured numbers', () => {
    expect(labels(scaleOf('sh2'))).toEqual([
      '.095',
      '.1',
      '.15',
      '.2',
      '.3',
      '.4',
      '.5',
      '.6',
      '.7',
      '.8',
      '.9',
    ])
  })

  it('sh3 prints the measured numbers', () => {
    expect(labels(scaleOf('sh3'))).toEqual([
      '.85',
      '.9',
      '1',
      '1.1',
      '1.2',
      '1.3',
      '1.4',
      '1.5',
      '1.6',
      '1.7',
      '1.8',
      '1.9',
      '2',
      '2.1',
      '2.2',
      '2.3',
      '2.4',
      '2.5',
      '2.6',
      '2.7',
      '2.8',
      '2.9',
      '3',
    ])
  })

  it('sh3 has the measured finest step and count', () => {
    const ticks = getScaleTicks(scaleOf('sh3'))
    expect(argInRange(ticks, 0.85, 0.9).length, 'sh3 [0.85,0.9)').toBe(10)
    expect(argInRange(ticks, 0.9, 3, true).length, 'sh3 [0.9,3]').toBe(211)
  })

  it('sh3 has the measured tick lengths', () => {
    const t = getScaleTicks(scaleOf('sh3'))
    // `value` is the printed argument x under the unified calculation.
    const lvl = (x: number) => t.find((k) => Math.abs(k.value - x) < 1e-9)?.level
    expect(lvl(0.855)).toBe(3)
    expect(lvl(0.86)).toBe(2)
    expect(lvl(1.01)).toBe(3)
    expect(lvl(0.95)).toBe(2)
    // A printed number is not necessarily the longest tick: 1.5 sits on the
    // 0.05 medium grid, not a separate level-1 class (measured, section 3.9).
    expect(lvl(1.5)).toBe(2)
  })

  it('sh2 / sh3 positions follow their notes and read back', () => {
    const rows: [string, number][] = [
      ['sh2', 0.1],
      ['sh3', 1],
    ]
    for (const [name, from] of rows) {
      const scale = scaleOf(name)
      for (const tick of getScaleTicks(scale)) {
        // `value` is the printed argument x under the unified calculation.
        const x = tick.value
        expect(tick.position, `${name} ${x}`).toBeCloseTo(Math.log10(Math.sinh(x) / from), 9)
        expect(readScaleValue(scale, tick.position)).toBeCloseTo(x, 6)
      }
    }
  })
})

describe('1002 calculations drive the log family', () => {
  it('gives C, D, CI, DI, A, B, K, CF, DF, CIF and lg a calculation', () => {
    for (const name of ['C', 'D', 'CI', 'DI', 'A', 'B', 'K', 'CF', 'DF', 'CIF', 'lg']) {
      expect(scaleOf(name).calc, name).toBeDefined()
    }
  })

  it('keeps CIF reciprocal: a printed 2 sits at the CF position of 5', () => {
    const ticks = getScaleTicks(scaleOf('CIF'))
    const t = ticks.find((x) => x.label === '2')
    const five = getScaleTicks(scaleOf('CF')).find((x) => Math.abs(x.value - 5) < 1e-6)
    expect(t).toBeDefined()
    expect(t!.position).toBeCloseTo(five!.position, 9)
  })

  it('gives every ln segment and its reciprocal a calculation', () => {
    for (const name of ['ln1', 'ln2', 'ln3', 'ln1I', 'ln2I', 'ln3I']) {
      expect(scaleOf(name).calc, name).toBeDefined()
    }
  })
})

describe('1002 CIF tick levels follow the measured CF grid', () => {
  const SQRT10 = Math.sqrt(10)
  const cf = getScaleTicks(scaleOf('CF'))
  const cif = getScaleTicks(scaleOf('CIF'))
  const cifAt = (position: number) => cif.find((t) => Math.abs(t.position - position) < 1e-9)

  it('keeps the measured fine level of the reciprocal grid (11..19 and 30)', () => {
    // CIF is drawn on CF's measured grid. Those values sit in [10,20) (0.1 fine)
    // and [30,10√10) (0.2 fine), so their CIF ticks are level 3. The pre-unified
    // generator let CF's printed-number pass lift them to level 2; pin that down.
    for (const value of [11, 12, 19, 30]) {
      const c = tickAt(cf, value)
      expect(c, `CF ${value}`).toBeDefined()
      const r = cifAt(c!.position)
      expect(r, `CIF at CF ${value}`).toBeDefined()
      expect(r!.value, `CIF value at CF ${value}`).toBeCloseTo(10 / value, 6)
      expect(r!.level, `CIF level at CF ${value}`).toBe(3)
    }
  })

  it('mirrors the CF level where neither row re-levels the tick', () => {
    // 5 / 10 / 20 carry a printed number on both rows; 21 / 29 on neither.
    for (const value of [5, 10, 20, 21, 29]) {
      const c = tickAt(cf, value)
      expect(c, `CF ${value}`).toBeDefined()
      const r = cifAt(c!.position)
      expect(r, `CIF at CF ${value}`).toBeDefined()
      expect(r!.value, `CIF value at CF ${value}`).toBeCloseTo(10 / value, 6)
      expect(r!.level, `CIF level at CF ${value}`).toBe(c!.level)
    }
  })

  it('gives both CIF index marks the longest level', () => {
    for (const d of [SQRT10, 10 * SQRT10]) {
      expect(cifAt(Math.log10(d / SQRT10))?.level, `CIF index at ${d}`).toBe(1)
    }
  })

  it('gives CIF a tick at every CF position', () => {
    const cf = getScaleTicks(scaleOf('CF')).map((t) => t.position)
    const cif = new Set(getScaleTicks(scaleOf('CIF')).map((t) => t.position))
    for (const p of cf) expect(cif.has(p), `CIF @ ${p}`).toBe(true)
  })
})
