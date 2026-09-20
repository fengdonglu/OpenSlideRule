import { describe, it, expect } from 'vitest'
import {
  resolveLabelFormat,
  formatArgument,
  formatBareAngle,
  formatDegreeAngle,
  formatDegreeMinute,
} from './policies'
import { formatNumber } from '../engine/gradations'
import { formatFoldedLabel, formatLinearLabel } from '../engine/logarithmic'
import { defaultLabelFormat } from '../engine/scaleCalculation'

describe('resolveLabelFormat', () => {
  it('defaults to defaultLabelFormat when omitted or "default"', () => {
    expect(resolveLabelFormat(undefined)).toBe(defaultLabelFormat)
    expect(resolveLabelFormat('default')).toBe(defaultLabelFormat)
  })

  it('keeps the function identity of each named formatter', () => {
    expect(resolveLabelFormat('folded')).toBe(formatFoldedLabel)
    expect(resolveLabelFormat('linearFraction')).toBe(formatLinearLabel)
    expect(resolveLabelFormat('degree')).toBe(formatDegreeAngle)
    expect(resolveLabelFormat('degreeBare')).toBe(formatBareAngle)
    expect(resolveLabelFormat('degreeMinute')).toBe(formatDegreeMinute)
    expect(resolveLabelFormat('argument')).toBe(formatArgument)
  })

  it('formats folded labels', () => {
    expect(resolveLabelFormat('folded')(10)).toBe('1')
    expect(resolveLabelFormat('folded')(33)).toBe('3.3')
  })

  it('formats linear fractions', () => {
    expect(resolveLabelFormat('linearFraction')(0.5)).toBe('.5')
  })

  it('formats degree, bare and degree-minute angles', () => {
    expect(resolveLabelFormat('degree')(5.5)).toBe('5.5°')
    expect(resolveLabelFormat('degreeBare')(15)).toBe('15')
    expect(resolveLabelFormat('degreeMinute')(0.5833)).toBe("35'")
  })

  it('formats arguments like the printed rule', () => {
    expect(resolveLabelFormat('argument')(0.095)).toBe('.095')
  })

  it('prints zero as ".0" on a sech row and otherwise three decimals', () => {
    expect(resolveLabelFormat('sechZero')(0)).toBe('.0')
    expect(resolveLabelFormat('sechZero')(0.5)).toBe('.5')
    expect(resolveLabelFormat('sechZero')(0.1234)).toBe(formatNumber(0.1234, 3))
  })

  it('builds a fixed-decimal formatter for { kind: "number" }', () => {
    expect(resolveLabelFormat({ kind: 'number', decimals: 3 })(0.5)).toBe('.5')
    expect(resolveLabelFormat({ kind: 'number', decimals: 3 })(0.1234)).toBe(
      formatNumber(0.1234, 3),
    )
    expect(resolveLabelFormat({ kind: 'number', decimals: 1 })(2)).toBe('2')
  })
})
