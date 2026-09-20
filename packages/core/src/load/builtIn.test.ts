import { describe, it, expect } from 'vitest'
import { builtInRuleDefinitions, builtInRules } from './builtInRules'
import { parseRule } from './parseRule'
import { serializeRule } from './serialize'
import { MODEL_1002, MODEL_57 } from '../index'
import { getScaleTicks } from '../engine/scaleFunctions'
import rule1002 from '../../rules/1002.json'
import type57 from '../../rules/type-57.json'
import type { ScaleDefinition, SlideRuleStructure } from '../types/scale'

function scales(rule: SlideRuleStructure): ScaleDefinition[] {
  return [rule.front, rule.back].flatMap((f) => [...f.upper, ...f.middle, ...f.lower])
}

function byId(): Record<string, SlideRuleStructure> {
  return Object.fromEntries(builtInRules().map((r) => [r.id, r]))
}

// The scale id and the type match directly, with the two measured exceptions.
const TYPE_EXCEPTIONS: Record<string, string> = { lg: 'L', "H'2": 'H2P' }

// Reciprocal / mirrored scales are the only decreasing ones: the ids ending in I
// (plus CIF), and the sech row H'2.
function isDecreasingId(id: string): boolean {
  return id.endsWith('I') || id === 'CIF' || id === "H'2"
}

describe('built-in rules load from JSON', () => {
  it('validates both definitions', () => {
    for (const d of builtInRuleDefinitions()) expect(parseRule(d).ok).toBe(true)
  })
  it('reproduces the in-memory 1002 and 57 ticks from the committed JSON', () => {
    const loaded = byId()
    for (const current of [MODEL_1002, MODEL_57]) {
      const a = scales(loaded[current.id])
      const b = scales(current)
      expect(a.length).toBe(b.length)
      a.forEach((s, i) => expect(getScaleTicks(s)).toEqual(getScaleTicks(b[i])))
    }
  })
  it('carries the measured layout metadata on the shared-edge rows', () => {
    const find = (ruleId: string, scaleId: string): ScaleDefinition =>
      scales(byId()[ruleId]).find((s) => s.id === scaleId)!
    expect(find('1002', 'sh2').tickEdge).toBe('floor')
    expect(find('1002', 'sh3').tickEdge).toBe('roof')
    expect(find('1002', 'tg2').tickEdge).toBe('floor')
    expect(find('1002', 'tg3').tickEdge).toBe('roof')
    expect(find('1002', 'lg').numbersBelow).toBe(true)
  })
  it('memoizes and deep-freezes the bundled data', () => {
    expect(builtInRules()).toBe(builtInRules())
    const definitions = builtInRuleDefinitions()
    expect(Object.isFrozen(definitions)).toBe(true)
    expect(Object.isFrozen(definitions[0])).toBe(true)
    expect(Object.isFrozen(definitions[0].faces.front.upper)).toBe(true)
    expect(Object.isFrozen(definitions[0].faces.front.upper[0])).toBe(true)
  })
  it('keeps every scale type and orientation consistent with its id', () => {
    for (const model of builtInRules()) {
      for (const scale of scales(model)) {
        const expectedType = TYPE_EXCEPTIONS[scale.id] ?? scale.id.toUpperCase()
        expect(scale.type, `${model.id} ${scale.id} type`).toBe(expectedType)
        expect(scale.orientation, `${model.id} ${scale.id} orientation`).toBe(
          isDecreasingId(scale.id) ? 'decreasing' : 'increasing',
        )
      }
    }
  })
  it.each([
    ['1002', rule1002],
    ['57', type57],
  ])('serializes %s back to the committed JSON', (id, committed) => {
    const rule = byId()[id]
    expect(rule).toBeDefined()
    expect(serializeRule(rule)).toEqual(committed)
  })
})
