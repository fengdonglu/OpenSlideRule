// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- these tests deliberately mutate a JSON document */
import { describe, it, expect } from 'vitest'
import { validateRule } from './validate'
import type { RuleDefinition } from './types'

// A tiny but complete single-scale rule: one physical block and one sh2-like
// log scale in the front upper section, with one interval.
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
            id: 'sh2',
            name: 'sh2',
            type: 'SH2',
            orientation: 'increasing',
            calculation: {
              domain: [1, 10],
              map: { kind: 'log', anchor: 1 },
              intervals: [{ from: 1, to: 10, steps: [{ step: 0.1, level: 1 }] }],
            },
          },
        ],
        middle: [],
        lower: [],
      },
      back: { upper: [], middle: [], lower: [] },
    },
  }
}

function codes(input: unknown): string[] {
  return validateRule(input).map((e) => e.code)
}

describe('validateRule', () => {
  it('accepts a valid rule with no errors', () => {
    expect(validateRule(validRule())).toEqual([])
  })
  it('rejects a non-object', () => expect(codes(null)).toContain('notObject'))
  it('reports unsupportedSchemaVersion', () => {
    const r = validRule() as any
    r.schemaVersion = 2
    expect(codes(r)).toContain('unsupportedSchemaVersion')
  })
  it('reports missingField for absent physical', () => {
    const r = validRule() as any
    delete r.physical
    expect(codes(r)).toContain('missingField')
  })
  it('reports wrongType for a string domain', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.domain = 'x'
    expect(codes(r)).toContain('wrongType')
  })
  it('reports unknownMapKind', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'nope' }
    expect(codes(r)).toContain('unknownMapKind')
  })
  it('reports unknownFn for an fn map', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'fn', fn: 'cos', from: 1 }
    expect(codes(r)).toContain('unknownFn')
  })
  it('reports unknownLabelFormat', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.labelFormat = 'roman'
    expect(codes(r)).toContain('unknownLabelFormat')
  })
  it('reports unknownReadKind', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.read = { kind: 'negate' }
    expect(codes(r)).toContain('unknownReadKind')
  })
  it('reports unknownScaleType for an unknown scale type', () => {
    const r = validRule() as any
    r.faces.front.upper[0].type = 'ZZ'
    expect(codes(r)).toContain('unknownScaleType')
  })
  it('reports nonPositiveReadScale for a non-positive reciprocal scale', () => {
    for (const scale of [0, -5]) {
      const r = validRule() as any
      r.faces.front.upper[0].calculation.read = { kind: 'reciprocal', scale }
      expect(codes(r)).toContain('nonPositiveReadScale')
    }
  })
  it('accepts a positive reciprocal scale', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.read = { kind: 'reciprocal', scale: 10 }
    expect(validateRule(r)).toEqual([])
  })
  it('reports invalidDomain when min >= max', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.domain = [10, 1]
    expect(codes(r)).toContain('invalidDomain')
  })
  it('reports nonPositiveStep', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.intervals[0].steps[0].step = 0
    expect(codes(r)).toContain('nonPositiveStep')
  })
  it('reports intervalOutOfDomain for a gross overflow', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.intervals[0].to = 1e6
    expect(codes(r)).toContain('intervalOutOfDomain')
  })
  it('reports invalidDecades for decades < 1', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.decades = 0
    expect(codes(r)).toContain('invalidDecades')
  })
  it('reports duplicateScaleId within a face+section', () => {
    const r = validRule() as any
    r.faces.front.upper.push({ ...r.faces.front.upper[0] })
    expect(codes(r)).toContain('duplicateScaleId')
  })
  it('allows the same scale id in two different sections of one face', () => {
    const r = validRule() as any
    r.faces.front.middle.push({ ...r.faces.front.upper[0] })
    expect(codes(r)).not.toContain('duplicateScaleId')
  })
  it('reports duplicateScaleId for two copies within one section', () => {
    const r = validRule() as any
    r.faces.front.middle.push({ ...r.faces.front.upper[0] }, { ...r.faces.front.upper[0] })
    expect(codes(r)).toContain('duplicateScaleId')
  })
  it('accepts an infinity mark', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.marks = [{ value: 'infinity', label: '∞' }]
    expect(validateRule(r)).toEqual([])
  })
  it('rejects a mark whose value is neither a number nor "infinity"', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.marks = [{ value: {}, label: 'bad' }]
    expect(codes(r)).toContain('wrongType')
  })
  it('rejects an arbitrary object that is not a rule', () => {
    expect(codes({})).toContain('unsupportedSchemaVersion')
    expect(codes({})).toContain('missingField')
  })
  it('accepts a non-negative integer decimals label format', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.labelFormat = { kind: 'number', decimals: 2 }
    expect(validateRule(r)).toEqual([])
  })
  it('rejects negative or fractional decimals', () => {
    for (const decimals of [-1, 1.5]) {
      const r = validRule() as any
      r.faces.front.upper[0].calculation.labelFormat = { kind: 'number', decimals }
      expect(codes(r)).toContain('wrongType')
    }
  })
  it('rejects NaN decimals', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.labelFormat = { kind: 'number', decimals: NaN }
    expect(codes(r)).toContain('nonFiniteNumber')
  })
  it('reports nonFiniteNumber', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.domain = [1, NaN]
    expect(codes(r)).toContain('nonFiniteNumber')
  })
  it('reports nonPositivePhysical', () => {
    const r = validRule() as any
    r.physical.faceWidthMm = 0
    expect(codes(r)).toContain('nonPositivePhysical')
  })
  it('aggregates multiple errors in one pass', () => {
    const r = validRule() as any
    r.physical.faceWidthMm = 0
    r.faces.front.upper[0].calculation.domain = [10, 1]
    r.faces.front.upper[0].calculation.map = { kind: 'nope' }
    expect(validateRule(r).length).toBeGreaterThanOrEqual(3)
  })
  it('accepts an expr map with an analytic inverse', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = {
      kind: 'expr',
      position: 'log10(x)',
      inverse: '10 ^ p',
    }
    expect(validateRule(r)).toEqual([])
  })
  it('accepts an expr map without an inverse', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'expr', position: 'log10(x)' }
    expect(validateRule(r)).toEqual([])
  })
  it('reports invalidExpression for a malformed position', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'expr', position: '1 +' }
    expect(codes(r)).toContain('invalidExpression')
  })
  it('reports invalidExpression for an unknown name', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'expr', position: 'y * 2' }
    expect(codes(r)).toContain('invalidExpression')
  })
  it('reports invalidExpression for a non-monotonic position', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'expr', position: 'x * (11 - x)' }
    expect(codes(r)).toContain('invalidExpression')
  })
  it('reports invalidExpression for a non-finite position', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'expr', position: 'sqrt(x - 100)' }
    expect(codes(r)).toContain('invalidExpression')
  })
  it('reports wrongType for a non-string inverse', () => {
    const r = validRule() as any
    r.faces.front.upper[0].calculation.map = { kind: 'expr', position: 'x', inverse: 3 }
    expect(codes(r)).toContain('wrongType')
  })
  it('accepts a circular rule with a disc and no physical', () => {
    const r = validRule() as any
    delete r.physical
    r.form = 'circular'
    r.disc = { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 }
    expect(validateRule(r)).toEqual([])
  })
  it('accepts a circular rule that also keeps a physical bounding box', () => {
    const r = validRule() as any
    r.form = 'circular'
    r.disc = { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 }
    expect(validateRule(r)).toEqual([])
  })
  it('reports unknownForm', () => {
    const r = validRule() as any
    r.form = 'spiral'
    expect(codes(r)).toContain('unknownForm')
  })
  it('requires disc for the circular form', () => {
    const r = validRule() as any
    delete r.physical
    r.form = 'circular'
    expect(codes(r)).toContain('missingField')
  })
  it('reports unexpectedDisc on a linear rule', () => {
    const r = validRule() as any
    r.disc = { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 }
    expect(codes(r)).toContain('unexpectedDisc')
  })
  it('reports invalidDisc for an ill-formed disc', () => {
    for (const disc of [
      { outerRadiusMm: 0, innerRadiusMm: 0, sheetSizeMm: 10 },
      { outerRadiusMm: 10, innerRadiusMm: 10, sheetSizeMm: 30 },
      { outerRadiusMm: 10, innerRadiusMm: 0, sheetSizeMm: 5 },
    ]) {
      const r = validRule() as any
      delete r.physical
      r.form = 'circular'
      r.disc = disc
      expect(codes(r)).toContain('invalidDisc')
    }
  })
  it('reports nonFiniteNumber for a non-finite disc radius', () => {
    const r = validRule() as any
    delete r.physical
    r.form = 'circular'
    r.disc = { outerRadiusMm: 80, innerRadiusMm: NaN, sheetSizeMm: 180 }
    expect(codes(r)).toContain('nonFiniteNumber')
  })
})
