import { describe, it, expect } from 'vitest'
import { formatFoldedLabel, formatLinearLabel } from './logarithmic'

describe('formatFoldedLabel', () => {
  it('prints the first decade bare and drops the tens digit of the second', () => {
    expect(formatFoldedLabel(3)).toBe('3')
    expect(formatFoldedLabel(9.5)).toBe('9.5')
    expect(formatFoldedLabel(10)).toBe('1')
    expect(formatFoldedLabel(11)).toBe('1.1')
    expect(formatFoldedLabel(15)).toBe('1.5')
    expect(formatFoldedLabel(20)).toBe('2')
    expect(formatFoldedLabel(30)).toBe('3')
    expect(formatFoldedLabel(33)).toBe('3.3')
  })
})

describe('formatLinearLabel', () => {
  it('prints whole numbers bare and omits the leading zero of a fraction', () => {
    expect(formatLinearLabel(0)).toBe('0')
    expect(formatLinearLabel(1)).toBe('1')
    expect(formatLinearLabel(0.1)).toBe('.1')
    expect(formatLinearLabel(0.5)).toBe('.5')
    expect(formatLinearLabel(0.9)).toBe('.9')
  })
})
