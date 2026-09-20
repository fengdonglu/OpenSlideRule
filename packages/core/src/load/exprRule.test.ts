// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseRule } from './parseRule'
import { serializeRule } from './serialize'
import { getScaleTicks } from '../engine/scaleFunctions'
import { readScaleValue, positionForValue } from '../engine/scaleReader'
import type { ExprMapSpec, RuleDefinition } from '../schema/types'
import type { ScaleDefinition, SlideRuleStructure } from '../types/scale'

function exprRule(map: ExprMapSpec): RuleDefinition {
  return {
    schemaVersion: 1,
    id: 'expr-rule',
    name: 'Expression rule',
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
        upper: [],
        middle: [
          {
            id: 'e',
            name: 'e',
            type: 'C',
            orientation: 'increasing',
            calculation: {
              domain: [1, 10],
              map,
              intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
              labels: [1, 10],
            },
          },
        ],
        lower: [],
      },
      back: { upper: [], middle: [], lower: [] },
    },
  }
}

function mustParse(input: unknown): SlideRuleStructure {
  const result = parseRule(input)
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.rule
}

function scale(rule: SlideRuleStructure): ScaleDefinition {
  return rule.front.middle[0]
}

const analytic = exprRule({ kind: 'expr', position: 'log10(x)', inverse: '10 ^ p' })
const numeric = exprRule({ kind: 'expr', position: 'log10(x)' })

describe('expr map end to end', () => {
  it('draws position = log10(x) over the domain', () => {
    const ticks = getScaleTicks(scale(mustParse(analytic)))
    expect(ticks.find((t) => t.value === 1)?.position).toBeCloseTo(0, 12)
    expect(ticks.find((t) => t.value === 10)?.position).toBeCloseTo(1, 12)
  })

  it('reads and positions through the analytic inverse', () => {
    const s = scale(mustParse(analytic))
    expect(readScaleValue(s, 0.5)).toBeCloseTo(Math.sqrt(10), 9)
    expect(positionForValue(s, Math.sqrt(10))).toBeCloseTo(0.5, 9)
  })

  it('falls back to numeric inversion when no inverse is given', () => {
    const a = scale(mustParse(analytic))
    const n = scale(mustParse(numeric))
    expect('inverse' in n.calc!.map).toBe(false)
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
      expect(readScaleValue(n, p)).toBeCloseTo(readScaleValue(a, p)!, 9)
    }
  })

  it('round-trips both forms through serializeRule', () => {
    expect(serializeRule(mustParse(analytic)).faces.front.middle[0].calculation.map).toEqual({
      kind: 'expr',
      position: 'log10(x)',
      inverse: '10 ^ p',
    })
    expect(serializeRule(mustParse(numeric)).faces.front.middle[0].calculation.map).toEqual({
      kind: 'expr',
      position: 'log10(x)',
    })
  })
})
