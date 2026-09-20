// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildRule } from '@slide-rule/generator'
import { templateSpecs } from './templates'

describe('designer templates', () => {
  it('ships two buildable templates with distinct ids', () => {
    const templates = templateSpecs()
    expect(templates.map((t) => t.id)).toEqual(['linearLog', 'circularCd'])
    for (const template of templates) {
      const result = buildRule(template.spec)
      expect(result.ok).toBe(true)
    }
  })
  it('marks the circular template with the circular form', () => {
    const circular = templateSpecs().find((t) => t.id === 'circularCd')
    expect(circular?.spec.form).toBe('circular')
    expect(circular?.spec.disc?.outerRadiusMm).toBeGreaterThan(0)
  })
})
