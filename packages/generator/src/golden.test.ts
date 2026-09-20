// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseRule, resolveRule, getScaleTicks } from '@slide-rule/core'
import type { CalculationSpec, IntervalSpec, MarkSpec, RuleDefinition } from '@slide-rule/core'
import { buildRule } from './build'
import { logScale } from './presets'
import type { RuleSpec } from './spec'
import rule1002Json from '../../core/rules/1002.json'

const canonicalRule = rule1002Json as unknown as RuleDefinition

function findC(rule: RuleDefinition) {
  const scale = rule.faces.front.middle.find((candidate) => candidate.id === 'C')
  if (scale === undefined) throw new Error('1002 front-middle C scale not found')
  return scale
}

const canonicalC = findC(canonicalRule)

// Independent transcriptions of the measured 1002 C scale. These are literals on
// purpose: if either side (these values or the canonical JSON) drifts, the
// deep-equality assertion below fails, so the preset cannot silently follow an
// edit to the data it is meant to reproduce.
const C_DOMAIN: [number, number] = [1, 10]

const C_INTERVALS: IntervalSpec[] = [
  {
    from: 1,
    to: 2,
    steps: [
      { step: 0.01, level: 3 },
      { step: 0.05, level: 1 },
    ],
  },
  {
    from: 2,
    to: 4,
    steps: [
      { step: 0.02, level: 3 },
      { step: 0.1, level: 1 },
    ],
  },
  {
    from: 4,
    to: 10,
    steps: [
      { step: 0.05, level: 3 },
      { step: 0.1, level: 1 },
    ],
  },
]

const C_LABELS: number[] = [
  1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 3, 4, 5, 6, 7, 8, 9, 10,
]

const C_MARKS: MarkSpec[] = [{ value: Math.PI, label: '\u03c0' }]

let memoizedGolden: RuleDefinition | undefined

function buildGolden(): RuleDefinition {
  if (memoizedGolden !== undefined) return memoizedGolden

  const { physical } = canonicalRule
  if (physical === undefined) throw new Error('1002 canonical rule is missing its physical spec')

  const calculation: CalculationSpec = logScale({
    domain: C_DOMAIN,
    intervals: C_INTERVALS,
    labels: C_LABELS,
    marks: C_MARKS,
  })

  const spec: RuleSpec = {
    id: 'golden-c',
    name: 'Golden C',
    physical,
    faces: {
      front: {
        upper: [],
        middle: [
          {
            id: 'C',
            name: 'C',
            type: 'C',
            orientation: 'increasing',
            calculation,
          },
        ],
        lower: [],
      },
      back: { upper: [], middle: [], lower: [] },
    },
  }

  const result = buildRule(spec)
  if (!result.ok) {
    throw new Error(`golden build failed: ${JSON.stringify(result.errors)}`)
  }
  memoizedGolden = result.rule
  return result.rule
}

describe('1002 C golden', () => {
  it('rebuilds the canonical C calculation through logScale, field by field', () => {
    const built = buildGolden().faces.front.middle[0].calculation
    const canonical = canonicalC.calculation

    expect(built.domain).toEqual(canonical.domain)
    expect(built.map).toEqual(canonical.map)
    expect(built.intervals).toEqual(canonical.intervals)
    expect(built.labels).toEqual(canonical.labels)
    expect(built.marks).toEqual(canonical.marks)
    expect(built).toEqual(canonical)
  })

  it('produces a rule that core.parseRule accepts', () => {
    expect(parseRule(buildGolden()).ok).toBe(true)
  })

  it('produces identical scale ticks to the canonical scale', () => {
    const builtScale = resolveRule(buildGolden()).front.middle[0]
    const canonicalScale = resolveRule(canonicalRule).front.middle.find(
      (candidate) => candidate.id === 'C',
    )
    if (canonicalScale === undefined) throw new Error('1002 front-middle C scale not found')

    expect(getScaleTicks(builtScale)).toEqual(getScaleTicks(canonicalScale))
  })
})
