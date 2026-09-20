// The C/D decade-unit position model.
//
// A scale that is read against C/D must be placed in C/D decade units: p = 0
// exactly at C = 1 and p = 1 exactly at C = 10. A scale whose printed argument x
// produces the function value fn(x), with the note pair `from->to`, is read on
// C/D as fn(x) / from, so its position is
//
//   p = log10(fn(x) / from) = log10(fn(x)) - log10(from)
//
// This is what makes the graduations line up with C/D; a scale may therefore
// extend beyond the C/D ends. The old code normalised each scale's own value
// domain to 0..1, which squashed every such scale onto the C/D span.
//
// Facts are measured from `docs/domain/model-1002.md` section 3.8 and
// `docs/domain/model-57.md` section 3.2.
import { describe, it, expect } from 'vitest'
import { MODEL_1002, MODEL_57 } from '../index'
import { getScaleTicks } from './scaleFunctions'
import { readScaleValue, positionForValue } from './scaleReader'
import { formatNumber } from './gradations'
import type { ScaleDefinition, Tick } from '../types/scale'

function findScale(model: typeof MODEL_1002, name: string): ScaleDefinition {
  const all = [
    ...model.front.upper,
    ...model.front.middle,
    ...model.front.lower,
    ...model.back.upper,
    ...model.back.middle,
    ...model.back.lower,
  ]
  const s = all.find((sc) => sc.name === name)
  if (!s) throw new Error('missing scale ' + name)
  return s
}

const scale1002 = (name: string) => findScale(MODEL_1002, name)
const scale57 = (name: string) => findScale(MODEL_57, name)

// Tick nearest a value (the argument x for hyperbolic sinh/tanh scales).
function tickAt(ticks: Tick[], value: number, tol = 1e-9): Tick | undefined {
  return ticks.find((t) => Math.abs(t.value - value) < tol)
}

// Tick at exactly a printed angle (trigonometric scales carry `angle`).
function tickAtAngle(ticks: Tick[], angle: number): Tick | undefined {
  return ticks.find((t) => t.angle !== undefined && Math.abs(t.angle - angle) < 1e-9)
}

describe('1002 position model', () => {
  it('sh2 sits at log10(sinh x) + 1 and sticks out past both C/D ends', () => {
    const ticks = getScaleTicks(scale1002('sh2'))
    // The unified calculation makes tick.value the argument x.
    const start = tickAt(ticks, 0.095)
    const end = tickAt(ticks, 0.9)
    expect(start?.position).toBeCloseTo(Math.log10(Math.sinh(0.095)) + 1, 9)
    expect(end?.position).toBeCloseTo(Math.log10(Math.sinh(0.9)) + 1, 9)
    expect(start?.position).toBeLessThan(0)
    expect(end?.position).toBeGreaterThan(1)
    // x = 0.1 is the note's anchor decade, so it sits a hair right of C = 1
    // (sinh(0.1) is 0.10017, a little above 0.1).
    expect(tickAt(ticks, 0.1)?.position).toBeCloseTo(Math.log10(Math.sinh(0.1)) + 1, 9)
    expect(Math.abs(tickAt(ticks, 0.1)?.position ?? 1)).toBeLessThan(0.001)
  })

  it('sh3 sits at log10(sinh x) (note 1->10)', () => {
    const ticks = getScaleTicks(scale1002('sh3'))
    expect(tickAt(ticks, 0.85)?.position).toBeCloseTo(Math.log10(Math.sinh(0.85)), 9)
    expect(tickAt(ticks, 3)?.position).toBeCloseTo(Math.log10(Math.sinh(3)), 9)
    expect(tickAt(ticks, 3)?.position).toBeGreaterThan(1)
  })

  it('th2 sits at log10(tanh x) + 1 over its printed range', () => {
    const ticks = getScaleTicks(scale1002('th2'))
    expect(tickAt(ticks, 0.095)?.position).toBeCloseTo(Math.log10(Math.tanh(0.095)) + 1, 9)
    expect(tickAt(ticks, 0.095)?.position).toBeLessThan(0)
    expect(tickAt(ticks, 3)?.position).toBeCloseTo(Math.log10(Math.tanh(3)) + 1, 9)
    // The asymptote is exactly C = 1.
    expect(ticks[ticks.length - 1].position).toBeCloseTo(1, 9)
  })

  it('sin2 sits at log10(sin x) + 1 (5.5 deg is left of C = 1)', () => {
    const ticks = getScaleTicks(scale1002('sin2'))
    const first = tickAtAngle(ticks, 5.5)
    expect(first?.position).toBeCloseTo(Math.log10(Math.sin((5.5 * Math.PI) / 180)) + 1, 9)
    expect(first?.position).toBeLessThan(0)
    expect(tickAtAngle(ticks, 90)?.position).toBeCloseTo(1, 9)
  })

  it('tg2 sits at log10(tan x) + 1 and tg3 at log10(tan x) (note 1->10)', () => {
    const tg2 = getScaleTicks(scale1002('tg2'))
    expect(tickAtAngle(tg2, 5.5)?.position).toBeCloseTo(
      Math.log10(Math.tan((5.5 * Math.PI) / 180)) + 1,
      9,
    )
    expect(tickAtAngle(tg2, 5.5)?.position).toBeLessThan(0)

    const tg3 = getScaleTicks(scale1002('tg3'))
    expect(tickAtAngle(tg3, 45)?.position).toBeCloseTo(0, 9)
    // The photographed right end is 84.5 deg (tan 10.385), just past C/D = 10.
    expect(tickAtAngle(tg3, 84.5)?.position).toBeCloseTo(
      Math.log10(Math.tan((84.5 * Math.PI) / 180)),
      9,
    )
    expect(tickAtAngle(tg3, 84.5)?.position).toBeGreaterThan(1)
    expect(tickAtAngle(tg3, 84.289)).toBeUndefined()
  })

  it('H2 sits at log10(sinh x) + 1 and H3 at log10(sinh x)', () => {
    // The graduations are at even x steps, so the argument is recovered from the
    // printed cosh value rather than looked up at an exact x.
    const h2 = getScaleTicks(scale1002('H2'))
    for (const t of [h2[0], h2[h2.length - 1]]) {
      const x = Math.acosh(t.value)
      expect(t.position).toBeCloseTo(Math.log10(Math.sinh(x)) + 1, 9)
    }
    expect(h2[0].position).toBeCloseTo(Math.log10(Math.sinh(Math.acosh(h2[0].value))) + 1, 9)
    // Measured endpoints: 1.005 .. 1.45 (the row overflows past C/D = 10).
    expect(h2[0].value).toBeCloseTo(1.005, 3)
    expect(h2[h2.length - 1].value).toBeCloseTo(1.45, 6)

    const h3 = getScaleTicks(scale1002('H3'))
    for (const t of [h3[0], h3[h3.length - 1]]) {
      const x = Math.acosh(t.value)
      expect(t.position).toBeCloseTo(Math.log10(Math.sinh(x)), 9)
    }
    // Measured endpoints: 1.4 .. 10.5 (starts slightly right of sinh = 1).
    expect(h3[0].value).toBeCloseTo(1.4, 6)
    expect(h3[h3.length - 1].value).toBeCloseTo(10.5, 6)
    expect(h3[0].position).toBeCloseTo(Math.log10(Math.sinh(Math.acosh(1.4))), 9)
  })

  it("H'2 sits at log10(tanh x) + 1, graduated by printed value", () => {
    const ticks = getScaleTicks(scale1002("H'2"))
    // The printed value is sech(x); tanh(acosh(1/V)) = sqrt(1-V^2).
    for (const t of ticks) {
      if (t.value === 0) continue
      expect(t.position, `sech ${t.value}`).toBeCloseTo(
        Math.log10(Math.sqrt(1 - t.value ** 2)) + 1,
        9,
      )
    }
    // The old code was linear in x, so this deliberately differs.
    const at = (v: number) => tickAt(ticks, v)
    expect(at(0.5)?.position).not.toBeCloseTo(
      (Math.acosh(1 / 0.5) - 0.1) / (Math.asinh(1) - 0.1),
      3,
    )
  })

  it('leaves C/D, A, K and the log-log segments on their own spans', () => {
    const cd = getScaleTicks(scale1002('C'))
    expect(tickAt(cd, 1)?.position).toBeCloseTo(0, 9)
    expect(tickAt(cd, 10)?.position).toBeCloseTo(1, 9)

    const a = getScaleTicks(scale1002('A'))
    expect(a[0].position).toBeCloseTo(0, 9)
    expect(a[a.length - 1].position).toBeCloseTo(1, 9)

    const k = getScaleTicks(scale1002('K'))
    expect(k[k.length - 1].position).toBeCloseTo(1, 9)

    // The log-log rows are placed in C/D decade units too: ln3 starts just
    // left of D = 1 and ends just short of C/D = 10 (e sits exactly on D = 1).
    const ln3 = getScaleTicks(scale1002('ln3'))
    expect(ln3[0].position).toBeCloseTo(Math.log10(Math.log(2.5)), 9)
    expect(ln3[0].position).toBeLessThan(0)
    expect(ln3[ln3.length - 1].position).toBeCloseTo(Math.log10(Math.log(20000)), 9)
    const ln3e = ln3.find((t) => t.value === Math.E)
    expect(ln3e?.position).toBeCloseTo(0, 9)
  })
})

describe('Type 57 position model', () => {
  it('S / ST / T sit in C/D decade units', () => {
    const s = getScaleTicks(scale57('S'))
    expect(tickAtAngle(s, 5.74)?.position).toBeCloseTo(
      Math.log10(Math.sin((5.74 * Math.PI) / 180)) + 1,
      9,
    )
    expect(tickAtAngle(s, 90)?.position).toBeCloseTo(1, 9)

    const st = getScaleTicks(scale57('ST'))
    expect(tickAtAngle(st, 0.573)?.position).toBeCloseTo(
      Math.log10(Math.sin((0.573 * Math.PI) / 180)) + 2,
      9,
    )
    expect(tickAtAngle(st, 5.74)?.position).toBeCloseTo(
      Math.log10(Math.sin((5.74 * Math.PI) / 180)) + 2,
      9,
    )

    const t = getScaleTicks(scale57('T'))
    expect(tickAtAngle(t, 45)?.position).toBeCloseTo(1, 9)
    expect(tickAtAngle(t, 5.71)?.position).toBeCloseTo(
      Math.log10(Math.tan((5.71 * Math.PI) / 180)) + 1,
      9,
    )
  })

  it('leaves K / A / C / D / DI / L on their own spans', () => {
    for (const name of ['K', 'A', 'C', 'D', 'DI', 'L']) {
      const ticks = getScaleTicks(scale57(name))
      expect(ticks[0].position, name).toBeCloseTo(0, 9)
      expect(ticks[ticks.length - 1].position, name).toBeCloseTo(1, 9)
    }
  })
})

describe('reader agrees with the position model', () => {
  it('round-trips the changed hyperbolic sine/tangent scales', () => {
    for (const name of ['sh2', 'sh3', 'th2']) {
      const scale = scale1002(name)
      for (const tick of getScaleTicks(scale)) {
        const x = readScaleValue(scale, tick.position)
        expect(x, `${name} at ${tick.position}`).not.toBeNull()
        // The unified calculation makes `value` the reading, which for these
        // rows is the argument x. The tanh asymptote reads off to infinity.
        if (!Number.isFinite(x)) continue
        expect(tick.value).toBeCloseTo(x as number, 6)
      }
    }
  })

  it('returns the argument of an overflow tick from its position', () => {
    const sh2 = scale1002('sh2')
    const p = Math.log10(Math.sinh(0.9)) + 1
    expect(readScaleValue(sh2, p)).toBeCloseTo(0.9, 6)
    const back = positionForValue(sh2, 0.9)
    expect(back).not.toBeNull()
    expect(back as number).toBeCloseTo(p, 9)
    expect(back as number).toBeGreaterThan(1)
  })

  it('reads sin2 at an overflow angle', () => {
    const sin2 = scale1002('sin2')
    const p = Math.log10(Math.sin((5.5 * Math.PI) / 180)) + 1
    expect(readScaleValue(sin2, p)).toBeCloseTo(5.5, 6)
    expect(positionForValue(sin2, 5.5) as number).toBeCloseTo(p, 9)
  })

  it("reads H'2 through the same tanh mapping used to place it", () => {
    const h2p = scale1002("H'2")
    const p = Math.log10(Math.tanh(0.5)) + 1
    expect(readScaleValue(h2p, p)).toBeCloseTo(1 / Math.cosh(0.5), 6)
    expect(positionForValue(h2p, 1 / Math.cosh(0.5)) as number).toBeCloseTo(p, 9)
  })

  it('reads a 57 overflow tick back', () => {
    const s = scale57('S')
    const p = Math.log10(Math.sin((5.74 * Math.PI) / 180)) + 1
    expect(readScaleValue(s, p)).toBeCloseTo(5.74, 6)
    expect(positionForValue(s, 5.74) as number).toBeCloseTo(p, 9)
  })

  it('still rejects values outside a scale domain', () => {
    expect(positionForValue(scale1002('sin2'), 120)).toBeNull()
    expect(positionForValue(scale1002('sh2'), 1.5)).toBeNull()
  })
})

describe('printed numbers drop the leading zero', () => {
  it('formats fractions the way the rule prints them', () => {
    expect(formatNumber(0.095, 3)).toBe('.095')
    expect(formatNumber(0.5, 1)).toBe('.5')
    expect(formatNumber(0.995, 3)).toBe('.995')
    expect(formatNumber(0.1, 1)).toBe('.1')
    expect(formatNumber(1.5, 1)).toBe('1.5')
    expect(formatNumber(1, 1)).toBe('1')
    expect(formatNumber(-0.5, 1)).toBe('-.5')
  })

  it('prints the sh2 / th2 / H rows without a leading zero', () => {
    const labels = (name: string) =>
      getScaleTicks(scale1002(name))
        .map((t) => t.label)
        .filter((l): l is string => l !== undefined)
    for (const l of ['.095', '.1', '.15', '.995']) {
      // sh2 prints .095; H'2 prints .995; none may carry a leading zero.
      expect(labels('sh2').concat(labels("H'2"))).toContain(l)
    }
    expect(labels('sh2').some((l) => l.startsWith('0.'))).toBe(false)
  })

  it('drops the leading zero on the log-log reciprocal rows too', () => {
    const labels = getScaleTicks(scale1002('ln1I'))
      .map((t) => t.label)
      .filter((l): l is string => l !== undefined)
    expect(labels).toContain('.99')
    expect(labels.some((l) => l.startsWith('0.'))).toBe(false)
  })
})
