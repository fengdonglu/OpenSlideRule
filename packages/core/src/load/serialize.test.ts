import { describe, it, expect } from 'vitest'
import { MODEL_1002, MODEL_57 } from '../index'
import { serializeRule } from './serialize'
import { parseRule } from './parseRule'
import { resolveLabelFormat } from '../format/policies'
import { getScaleTicks } from '../engine/scaleFunctions'
import type { RuleDefinition, ScaleSpec } from '../schema/types'
import type { ScaleCalculation, ScaleDefinition, SlideRuleStructure } from '../types/scale'

function scales(rule: SlideRuleStructure): ScaleDefinition[] {
  return [rule.front, rule.back].flatMap((f) => [...f.upper, ...f.middle, ...f.lower])
}

function dtoScales(dto: RuleDefinition): ScaleSpec[] {
  return [dto.faces.front, dto.faces.back].flatMap((f) => [...f.upper, ...f.middle, ...f.lower])
}

it.each([
  ['1002', MODEL_1002],
  ['57', MODEL_57],
])('round-trips %s losslessly', (_id, model) => {
  const dto = serializeRule(model)

  // Rule-level fields must survive serialization, not just the tick layer.
  expect(dto.id).toBe(model.id)
  expect(dto.name).toBe(model.name)
  expect(dto.physical).toEqual(model.physical)

  const parsed = parseRule(dto)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return

  const before = scales(model)
  const after = scales(parsed.rule)
  expect(after.map((s) => [s.side, s.section, s.id, s.orientation, s.color])).toEqual(
    before.map((s) => [s.side, s.section, s.id, s.orientation, s.color]),
  )

  // Per-scale metadata the calc-layer tick comparison would not catch: a silent
  // drop of a name, shared label, note, numbersBelow or tickEdge must fail here.
  const beforeDto = dtoScales(dto)
  before.forEach((s, i) => {
    const d = beforeDto[i]
    expect(d.name).toBe(s.name)
    expect(d.numbersBelow).toBe(s.numbersBelow)
    expect(d.tickEdge).toBe(s.tickEdge)
    expect(d.sharedLabels).toEqual(
      s.sharedLabels?.map((label) => ({
        id: label.id,
        name: label.name,
        orientation: label.orientation,
        ...(label.format !== undefined ? { format: label.format } : {}),
      })),
    )
    expect(d.notes).toEqual(s.notes)

    expect(
      getScaleTicks(after[i]).map((t) => [t.position, t.value, t.level, t.label, t.angle]),
    ).toEqual(getScaleTicks(s).map((t) => [t.position, t.value, t.level, t.label, t.angle]))
  })

  // The DTO is stable: re-serializing what the loader produced is identical, so
  // nothing in the parse/resolve step is lost either.
  expect(serializeRule(parsed.rule)).toEqual(dto)
})

it('round-trips a circular rule through resolve and serialize', () => {
  const dto = {
    schemaVersion: 1 as const,
    id: 'circle',
    name: 'Circle',
    form: 'circular' as const,
    disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
    faces: {
      front: { upper: [], middle: [], lower: [] },
      back: { upper: [], middle: [], lower: [] },
    },
  }
  const parsed = parseRule(dto)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(parsed.rule.form).toBe('circular')
  expect(parsed.rule.disc).toEqual({ outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 })
  expect(parsed.rule.physical.faceWidthMm).toBe(180)
  expect(serializeRule(parsed.rule)).toEqual(dto)
})

// --- Unrepresentable inputs ------------------------------------------------
// Each fixture is a minimal one-scale rule carrying only the offending field.

function minimalRule(calc: ScaleCalculation): SlideRuleStructure {
  return {
    id: 'x',
    name: 'x',
    physical: {
      faceWidthMm: 100,
      faceHeightMm: 50,
      rowCount: { upper: 1, middle: 1, lower: 1 },
      grooveRowRatio: 0.5,
      marginRowRatio: 0.5,
      leftGutterMm: 5,
      rightPanelMm: 5,
      numeralRatio: 0.5,
    },
    front: {
      upper: [
        {
          id: 'x',
          name: 'x',
          type: 'C',
          side: 'front',
          section: 'upper',
          isMovable: false,
          orientation: 'increasing',
          color: '#1f2937',
          calc,
        },
      ],
      middle: [],
      lower: [],
    },
    back: { upper: [], middle: [], lower: [] },
  }
}

const BASE_CALC: ScaleCalculation = {
  domain: [1, 10],
  map: { kind: 'log', anchor: 1 },
  intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
}

describe('serializeRule unrepresentable inputs', () => {
  it('throws on a custom mapping', () => {
    const rule = minimalRule({
      ...BASE_CALC,
      map: {
        kind: 'custom',
        toPosition: (d) => d,
        toDomain: (p) => p,
      },
    })
    expect(() => serializeRule(rule)).toThrow(/custom map .* on x/)
  })

  it('throws on an unrepresentable read', () => {
    const rule = minimalRule({
      ...BASE_CALC,
      read: (d) => d + 1,
      unread: (v) => v - 1,
    })
    expect(() => serializeRule(rule)).toThrow(/unrepresentable read on x/)
  })

  it('throws on an unrepresentable labelFormat', () => {
    const rule = minimalRule({ ...BASE_CALC, labelFormat: (v) => `v=${v}` })
    expect(() => serializeRule(rule)).toThrow(/unrepresentable labelFormat on x/)
  })

  it('round-trips a { kind: number, decimals: 2 } label format', () => {
    const rule = minimalRule({
      ...BASE_CALC,
      labelFormat: resolveLabelFormat({ kind: 'number', decimals: 2 }),
    })
    const dto = serializeRule(rule)
    expect(dto.faces.front.upper[0].calculation.labelFormat).toEqual({
      kind: 'number',
      decimals: 2,
    })
  })

  it('throws on a scale without a calculation', () => {
    const rule = minimalRule(BASE_CALC)
    delete rule.front.upper[0].calc
    expect(() => serializeRule(rule)).toThrow(/scale x has no calculation/)
  })
})
