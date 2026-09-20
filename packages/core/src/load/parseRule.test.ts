// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- these tests deliberately mutate a JSON document */
import { describe, it, expect } from 'vitest'
import { parseRule } from './parseRule'
import { getScaleTicks } from '../engine/scaleFunctions'
import { readScaleValue } from '../engine/scaleReader'
import { BLACK, RED } from '../index'
import type { RuleDefinition } from '../schema/types'
import type { ScaleDefinition, SlideRuleStructure } from '../types/scale'

// A compact but complete rule: a decreasing DI-like scale (front upper), a
// reciprocal-read scale (front middle), a fixed-decimal linear scale (front
// lower) and a tanh scale carrying an `infinity` mark (back upper).
function validRule(): RuleDefinition {
  return {
    schemaVersion: 1,
    id: 'test-rule',
    name: 'Test rule',
    physical: {
      faceWidthMm: 304.8,
      faceHeightMm: 50.8,
      rowCount: { upper: 4, middle: 6, lower: 4 },
      grooveRowRatio: 0.7,
      marginRowRatio: 0.4,
      leftGutterMm: 26.1,
      rightPanelMm: 19.7,
      numeralRatio: 0.6,
    },
    faces: {
      front: {
        upper: [
          {
            id: 'di',
            name: 'di',
            type: 'DI',
            orientation: 'decreasing',
            sharedLabels: [{ id: 'ctg', name: 'ctg', orientation: 'decreasing' }],
            calculation: {
              domain: [1, 10],
              map: { kind: 'log', anchor: 1 },
              decreasing: true,
              intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
            },
          },
        ],
        middle: [
          {
            id: 'recip',
            name: 'recip',
            type: 'C',
            orientation: 'increasing',
            calculation: {
              domain: [1, 10],
              map: { kind: 'log', anchor: 1 },
              read: { kind: 'reciprocal', scale: 10 },
              intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
            },
          },
        ],
        lower: [
          {
            id: 'num',
            name: 'num',
            type: 'L',
            orientation: 'increasing',
            calculation: {
              domain: [0, 1],
              map: { kind: 'linear' },
              intervals: [{ from: 0, to: 1, steps: [{ step: 0.5, level: 3 }] }],
              labels: [0.1234],
              labelFormat: { kind: 'number', decimals: 3 },
            },
          },
        ],
      },
      back: {
        upper: [
          {
            id: 'hype',
            name: 'hype',
            type: 'TH2',
            orientation: 'increasing',
            calculation: {
              domain: [0.095, 3],
              map: { kind: 'fn', fn: 'tanh', from: 0.1 },
              intervals: [{ from: 0.1, to: 3, steps: [{ step: 0.1, level: 1 }] }],
              marks: [{ value: 'infinity', label: '∞' }],
            },
          },
        ],
        middle: [],
        lower: [],
      },
    },
  }
}

function mustParse(input: unknown): SlideRuleStructure {
  const result = parseRule(input)
  if (!result.ok) throw new Error(`expected ok, got errors: ${JSON.stringify(result.errors)}`)
  return result.rule
}

function findScale(rule: SlideRuleStructure, id: string): ScaleDefinition {
  for (const face of ['front', 'back'] as const) {
    for (const section of ['upper', 'middle', 'lower'] as const) {
      const found = rule[face][section].find((s) => s.id === id)
      if (found) return found
    }
  }
  throw new Error(`scale not found: ${id}`)
}

describe('parseRule', () => {
  it('resolves a valid fixture and derives the per-scale layout', () => {
    const rule = mustParse(validRule())

    const di = findScale(rule, 'di')
    expect(di.side).toBe('front')
    expect(di.section).toBe('upper')
    expect(di.isMovable).toBe(false)
    expect(di.orientation).toBe('decreasing')
    expect(di.color).toBe(RED)
    expect(di.sharedLabels?.[0].color).toBe(RED)

    const recip = findScale(rule, 'recip')
    expect(recip.isMovable).toBe(true)
    expect(recip.color).toBe(BLACK)
    expect(getScaleTicks(recip).length).toBeGreaterThan(0)
  })

  it('resolves a reciprocal read to scale / value in both directions', () => {
    const recip = findScale(mustParse(validRule()), 'recip')
    expect(readScaleValue(recip, 0)).toBeCloseTo(10)
    expect(readScaleValue(recip, 1)).toBeCloseTo(1)
    expect(recip.calc?.unread?.(5)).toBeCloseTo(2)
  })

  it('applies a { kind: "number" } label format', () => {
    const num = findScale(mustParse(validRule()), 'num')
    const tick = getScaleTicks(num).find((t) => t.value === 0.1234)
    expect(tick?.label).toBe('.123')
  })

  it('revives an "infinity" mark and reads Infinity at the far end', () => {
    const hype = findScale(mustParse(validRule()), 'hype')
    expect(hype.calc?.marks?.[0].value).toBe(Infinity)
    expect(getScaleTicks(hype).some((t) => t.value === Infinity)).toBe(true)
    expect(readScaleValue(hype, 1)).toBe(Infinity)
  })

  it('returns all validation errors and no rule when input is invalid', () => {
    const bad = validRule() as any
    bad.schemaVersion = 2
    bad.faces.front.upper[0].calculation.map = { kind: 'nope' }

    const result = parseRule(bad)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const codes = result.errors.map((e) => e.code)
    expect(codes).toContain('unsupportedSchemaVersion')
    expect(codes).toContain('unknownMapKind')
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('returns a notObject error for a non-object input without throwing', () => {
    const result = parseRule(null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((e) => e.code)).toContain('notObject')
  })
})
