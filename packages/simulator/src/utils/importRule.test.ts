// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { builtInRuleDefinitions } from '@slide-rule/core'
import { importRuleText } from './importRule'

const def57 = builtInRuleDefinitions().find((d) => d.id === '57')!

describe('importRuleText', () => {
  it('parses and validates a genuine RuleDefinition', () => {
    const result = importRuleText(JSON.stringify(def57))
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.rule.id).toBe('57')
      expect(result.definition.id).toBe('57')
    }
  })

  it('reports malformed JSON', () => {
    const result = importRuleText('{not json')
    expect(result.kind).toBe('parseError')
  })

  it('aggregates validation errors', () => {
    const bad = structuredClone(def57) as unknown as Record<string, unknown>
    bad.schemaVersion = 2
    const result = importRuleText(JSON.stringify(bad))
    expect(result.kind).toBe('errors')
    if (result.kind === 'errors') {
      expect(result.errors.map((e) => e.code)).toContain('unsupportedSchemaVersion')
    }
  })

  it('accepts a circular rule', () => {
    const result = importRuleText(
      JSON.stringify({
        schemaVersion: 1,
        id: 'circle',
        name: 'Circle',
        form: 'circular',
        disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
        faces: {
          front: { upper: [], middle: [], lower: [] },
          back: { upper: [], middle: [], lower: [] },
        },
      }),
    )
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') expect(result.rule.form).toBe('circular')
  })

  it('still reports validation errors for a malformed circular rule', () => {
    const result = importRuleText(JSON.stringify({ schemaVersion: 2, form: 'circular' }))
    expect(result.kind).toBe('errors')
  })
})
