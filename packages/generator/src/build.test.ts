// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseRule } from '@slide-rule/core'
import { buildRule } from './build'
import type { PhysicalSpec, CalculationSpec } from '@slide-rule/core'
import type { RuleSpec } from './spec'

function physical(): PhysicalSpec {
  return {
    faceWidthMm: 304.8,
    faceHeightMm: 50.8,
    rowCount: { upper: 4, middle: 6, lower: 4 },
    grooveRowRatio: 0.7,
    marginRowRatio: 0.4,
    leftGutterMm: 26.1,
    rightPanelMm: 19.7,
    numeralRatio: 0.6,
  }
}

function logCalculation(): CalculationSpec {
  return {
    domain: [1, 10],
    map: { kind: 'log', anchor: 1 },
    intervals: [{ from: 1, to: 10, steps: [{ step: 0.1, level: 1 }] }],
  }
}

function minimalSpec(): RuleSpec {
  return {
    id: 'test-rule',
    name: 'Test rule',
    physical: physical(),
    faces: {
      front: {
        upper: [
          {
            id: 'C',
            name: 'C',
            type: 'C',
            orientation: 'increasing',
            calculation: logCalculation(),
          },
        ],
        middle: [],
        lower: [],
      },
      back: { upper: [], middle: [], lower: [] },
    },
  }
}

describe('buildRule', () => {
  it('builds a minimal valid spec and the result passes core.parseRule', () => {
    const result = buildRule(minimalSpec())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(parseRule(result.rule).ok).toBe(true)
    expect(result.rule.schemaVersion).toBe(1)
    expect(result.rule.faces.front.upper[0].calculation.domain).toEqual([1, 10])
  })

  it('builds a circular rule and passes core.parseRule', () => {
    const result = buildRule({
      id: 'circle',
      name: 'Circle',
      form: 'circular',
      disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
      faces: {
        front: { upper: [], middle: [], lower: [] },
        back: { upper: [], middle: [], lower: [] },
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(parseRule(result.rule).ok).toBe(true)
  })

  it('resolves two scales sharing a calculation ref to the same values', () => {
    const spec = minimalSpec()
    spec.calculations = { cd: logCalculation() }
    spec.faces.front.upper = [
      {
        id: 'C',
        name: 'C',
        type: 'C',
        orientation: 'increasing',
        calculation: { ref: 'cd' },
      },
      {
        id: 'D',
        name: 'D',
        type: 'D',
        orientation: 'increasing',
        calculation: { ref: 'cd' },
      },
    ]

    const result = buildRule(spec)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [c, d] = result.rule.faces.front.upper
    expect(c.calculation).toEqual(d.calculation)
    expect(c.calculation).toEqual(logCalculation())
  })

  it('reports an unknown calculation ref with the scale index in the path', () => {
    const spec = minimalSpec()
    spec.faces.front.upper = [
      {
        id: 'C',
        name: 'C',
        type: 'C',
        orientation: 'increasing',
        calculation: { ref: 'missing' },
      },
    ]

    const result = buildRule(spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].path).toBe('faces.front.upper[0].calculation.ref')
    expect(result.errors[0].message).toBe("unknown calculation ref 'missing'")
  })

  it('surfaces a core invalidDomain error in a BuildError', () => {
    const spec = minimalSpec()
    spec.faces.front.upper[0].calculation = { ...logCalculation(), domain: [10, 1] }

    const result = buildRule(spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((error) => error.message.includes('invalidDomain'))).toBe(true)
    expect(result.errors[0].path).toBe('faces.front.upper[0].calculation.domain')
  })

  it('does not throw for a non-object spec', () => {
    const result = buildRule(undefined as unknown as RuleSpec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('reports a missing faces object instead of throwing', () => {
    const spec = minimalSpec()
    ;(spec as { faces?: unknown }).faces = undefined

    const result = buildRule(spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((error) => error.path === 'faces')).toBe(true)
  })

  it('reports a missing face object instead of throwing', () => {
    const spec = minimalSpec()
    ;(spec.faces as { front?: unknown }).front = undefined

    const result = buildRule(spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((error) => error.path === 'faces.front')).toBe(true)
  })

  it('reports a non-array section instead of throwing', () => {
    const spec = minimalSpec()
    ;(spec.faces.front as unknown as Record<string, unknown>).upper = 'nope'

    const result = buildRule(spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((error) => error.path === 'faces.front.upper')).toBe(true)
  })

  it('reports a missing section instead of silently defaulting it to empty', () => {
    const spec = minimalSpec()
    ;(spec.faces.front as unknown as Record<string, unknown>).middel = spec.faces.front.middle
    delete (spec.faces.front as unknown as Record<string, unknown>).middle

    const result = buildRule(spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const missing = result.errors.find((error) => error.path === 'faces.front.middle')
    expect(missing?.message).toBe('middle section is required')
  })

  it('carries the core error code on the BuildError', () => {
    const spec = minimalSpec()
    spec.faces.front.upper[0].calculation = { ...logCalculation(), domain: [10, 1] }

    const result = buildRule(spec)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('invalidDomain')
    expect(result.errors[0].message).toContain('invalidDomain')
  })

  it('does not resolve calculation refs through the prototype chain', () => {
    for (const ref of ['__proto__', 'constructor', 'toString']) {
      const spec = minimalSpec()
      spec.faces.front.upper[0].calculation = { ref }

      const result = buildRule(spec)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(
        result.errors.some((error) => error.message.includes(`unknown calculation ref '${ref}'`)),
      ).toBe(true)
    }
  })

  it('does not mutate its input spec', () => {
    const spec = minimalSpec()
    spec.calculations = { cd: logCalculation() }
    spec.faces.front.upper[0].calculation = { ref: 'cd' }
    const before = JSON.parse(JSON.stringify(spec))

    buildRule(spec)

    expect(spec).toEqual(before)
  })
})
