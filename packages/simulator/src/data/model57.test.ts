// Type 57 pocket slide rule: physical spec, scale list and registry wiring.
// Scale list, colours and reference notes are read from photographs of the rule.
// See docs/domain/model-57.md.
import { describe, it, expect } from 'vitest'
import {
  MODEL_57,
  MODELS,
  getModelStructure,
  isModelAvailable,
  getScaleTicks,
  isRedScale,
} from '@slide-rule/core'
import { computeFaceLayout } from '@slide-rule/renderer'
import type { ScaleDefinition, ScaleNote } from '@slide-rule/core'

// Flatten a note (plain string or coloured parts) to its printed text.
function noteText(note: ScaleNote): string {
  return Array.isArray(note) ? note.map((p) => p.text).join('') : note
}

describe('Type 57 physical spec', () => {
  it('is half the 1002 in both directions (6in x 1in)', () => {
    expect(MODEL_57.physical.faceWidthMm).toBe(152.4)
    expect(MODEL_57.physical.faceHeightMm).toBe(25.4)
  })

  it('keeps the 6:1 aspect ratio', () => {
    expect(MODEL_57.physical.faceWidthMm / MODEL_57.physical.faceHeightMm).toBeCloseTo(6, 9)
  })

  it('has 2 / 4 / 3 rows', () => {
    expect(MODEL_57.physical.rowCount).toEqual({ upper: 2, middle: 4, lower: 3 })
  })

  it('halves the 1002 gutters', () => {
    expect(MODEL_57.physical.leftGutterMm).toBeCloseTo(26.1 / 2, 9)
    expect(MODEL_57.physical.rightPanelMm).toBeCloseTo(19.7 / 2, 9)
  })

  it('lays out the 2/4/3 rows, grooves and margins to the face height', () => {
    const l = computeFaceLayout(MODEL_57.physical, 1200)
    expect(l.faceWidthPx / l.faceHeightPx).toBeCloseTo(6, 6)
    expect(l.sections.upper.rows).toBe(2)
    expect(l.sections.middle.rows).toBe(4)
    expect(l.sections.lower.rows).toBe(3)
    const total = 2 * l.marginMm + 9 * l.rowHeightMm + 2 * l.grooveMm
    expect(total).toBeCloseTo(MODEL_57.physical.faceHeightMm, 9)
    expect(l.grooveMm).toBeCloseTo(0.7 * l.rowHeightMm, 9)
    expect(l.numeralMm).toBeCloseTo(0.6 * l.rowHeightMm, 9)
    expect(l.tickWidthMm).toBeCloseTo(152.4 - 26.1 / 2 - 19.7 / 2, 9)
  })
})

describe('Type 57 scale list', () => {
  it('is single-faced: 2 upper / 4 slide / 3 lower and no back scales', () => {
    const front = MODEL_57.front
    expect(front.upper).toHaveLength(2)
    expect(front.middle).toHaveLength(4)
    expect(front.lower).toHaveLength(3)
    const back = MODEL_57.back
    expect(back.upper.length + back.middle.length + back.lower.length).toBe(0)
  })

  it('matches the documented order', () => {
    const names = (scales: ScaleDefinition[]) => scales.map((s) => s.name)
    expect(names(MODEL_57.front.upper)).toEqual(['K', 'A'])
    expect(names(MODEL_57.front.middle)).toEqual(['S', 'ST', 'T', 'C'])
    expect(names(MODEL_57.front.lower)).toEqual(['D', 'DI', 'L'])
  })

  it('puts the movable scales on the slide only', () => {
    for (const s of MODEL_57.front.middle) expect(s.isMovable).toBe(true)
    expect(MODEL_57.front.upper.some((s) => s.isMovable)).toBe(false)
    expect(MODEL_57.front.lower.some((s) => s.isMovable)).toBe(false)
  })

  it('prints DI red and every other scale black', () => {
    const all = [...MODEL_57.front.upper, ...MODEL_57.front.middle, ...MODEL_57.front.lower]
    for (const s of all) {
      expect(isRedScale(s), s.name).toBe(s.name === 'DI')
    }
    // The red on the T row is the ctg number line, not the scale itself.
    expect(MODEL_57.front.lower.find((s) => s.name === 'DI')?.orientation).toBe('decreasing')
  })

  it('prints the function label at the right end of every row', () => {
    const notes = (scales: ScaleDefinition[]) =>
      scales.map((s) => (s.notes ?? []).map(noteText).join(' '))
    expect(notes(MODEL_57.front.upper)).toEqual(['x³', 'x²'])
    // The three slide trigonometric rows are prefixed by the printed angle
    // symbol (`∠`), read from the right end of the rule.
    expect(notes(MODEL_57.front.middle)).toEqual(['∠sin cos', '∠arc', '∠tg ctg', 'x'])
    // The L note is printed with a capital L (`Lg x`).
    expect(notes(MODEL_57.front.lower)).toEqual(['x', '1/x', 'Lg x'])
  })

  it('prints the reverse-order functions in red in the notes', () => {
    const all = [...MODEL_57.front.middle, ...MODEL_57.front.lower]
    const redText = (name: string): string[] => {
      const s = all.find((sc) => sc.name === name)
      const note = s?.notes?.[0]
      return Array.isArray(note) ? note.filter((p) => p.red).map((p) => p.text) : []
    }
    expect(redText('S')).toEqual(['cos'])
    expect(redText('T')).toEqual(['ctg'])
    expect(redText('DI')).toEqual(['1/x'])
    // The forward functions stay black (plain strings).
    expect(redText('K')).toEqual([])
    expect(MODEL_57.front.middle.find((s) => s.name === 'ST')?.notes).toEqual(['∠arc'])
  })

  it('draws the L graduations from the top with the numbers below', () => {
    const l = MODEL_57.front.lower.find((s) => s.name === 'L')
    expect(l?.numbersBelow).toBe(true)
    // Only L uses this convention on the 57; every other row keeps its numbers
    // on the far side (above the graduations).
    const all = [...MODEL_57.front.upper, ...MODEL_57.front.middle, ...MODEL_57.front.lower]
    for (const s of all) {
      if (s.name !== 'L') expect(s.numbersBelow, s.name).toBeFalsy()
    }
  })

  it('gives S a red cos and T a red ctg number line, printed bare', () => {
    const s = MODEL_57.front.middle.find((sc) => sc.name === 'S')
    const t = MODEL_57.front.middle.find((sc) => sc.name === 'T')
    expect(s?.sharedLabels?.map((l) => [l.id, l.format])).toEqual([['cos', 'bare']])
    expect(t?.sharedLabels?.map((l) => [l.id, l.format])).toEqual([['ctg', 'bare']])
    // No co-angle line on the other scales.
    expect(MODEL_57.front.middle.find((sc) => sc.name === 'ST')?.sharedLabels).toBeUndefined()
    expect(MODEL_57.front.lower.find((sc) => sc.name === 'D')?.sharedLabels).toBeUndefined()
  })

  it('gives every scale real graduations', () => {
    const all = [...MODEL_57.front.upper, ...MODEL_57.front.middle, ...MODEL_57.front.lower]
    for (const s of all) {
      expect(getScaleTicks(s).length, s.name).toBeGreaterThan(0)
    }
  })
})

describe('model registry', () => {
  it('exposes both models, with the 57 available', () => {
    expect(MODELS.map((m) => m.id)).toEqual(['1002', '57'])
    expect(isModelAvailable('1002')).toBe(true)
    expect(isModelAvailable('57')).toBe(true)
  })

  it('resolves the 57 structure by id', () => {
    expect(getModelStructure('57')).toBe(MODEL_57)
  })
})
