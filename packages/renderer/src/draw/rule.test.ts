// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { MODEL_1002, MODEL_57 } from '@slide-rule/core'
import { THEMES } from '../themes'
import { PRINT_FACE_GAP_MM, renderRuleSheetToSVG, renderRuleToSVG } from './rule'

const theme = THEMES.plastic

describe('renderRuleToSVG', () => {
  it('draws a groove between the three bands', () => {
    const svg = renderRuleToSVG(MODEL_1002, { face: 'front', theme })
    expect(svg.querySelectorAll('line.groove').length).toBe(2)
  })

  it('frames the face', () => {
    const svg = renderRuleToSVG(MODEL_1002, { face: 'front', theme })
    const frame = svg.querySelector('rect.sheet-frame')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute('fill')).toBe('none')
  })
})

describe('renderRuleToSVG slide offset', () => {
  it('leaves the middle band untranslated at offset 0', () => {
    const svg = renderRuleToSVG(MODEL_1002, { face: 'front', theme })
    const middle = svg.querySelector('g.section-band[data-section="middle"]')
    expect(middle?.getAttribute('transform')).toBeNull()
    expect(
      svg.querySelector('g.section-band[data-section="lower"]')?.getAttribute('transform'),
    ).toBeNull()
  })

  it('translates only the middle band by the slide offset', () => {
    const svg = renderRuleToSVG(MODEL_1002, { face: 'front', theme, slideOffsetMm: 5 })
    expect(
      svg.querySelector('g.section-band[data-section="middle"]')?.getAttribute('transform'),
    ).toBe('translate(5, 0)')
    expect(
      svg.querySelector('g.section-band[data-section="upper"]')?.getAttribute('transform'),
    ).toBeNull()
  })
})

describe('renderRuleSheetToSVG', () => {
  it('stacks the visible faces at 1:1 mm on one sheet', () => {
    const svg = renderRuleSheetToSVG(MODEL_1002, { faces: ['front', 'back'], theme })
    const w = MODEL_1002.physical.faceWidthMm
    const h = MODEL_1002.physical.faceHeightMm
    const total = h * 2 + PRINT_FACE_GAP_MM
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${w} ${total}`)
    expect(svg.getAttribute('width')).toBe(`${w}mm`)
    expect(svg.getAttribute('height')).toBe(`${total}mm`)
    expect(svg.querySelectorAll('g.print-face').length).toBe(2)
    expect(svg.querySelectorAll('g.print-face[data-face="front"]').length).toBe(1)
    expect(svg.querySelectorAll('g.print-face[data-face="back"]').length).toBe(1)
    // One face background per face; the per-row `.scale-hit` rects are nested.
    expect(svg.querySelectorAll('g.print-face rect.print-paper').length).toBe(2)
    expect(svg.querySelectorAll('g.print-face rect.sheet-frame').length).toBe(2)
    expect(svg.querySelectorAll('line.tick').length).toBeGreaterThan(0)
  })

  it('uses the requested paper colour (default white)', () => {
    const white = renderRuleSheetToSVG(MODEL_1002, { faces: ['front'], theme })
    expect(white.querySelector('rect.print-paper')?.getAttribute('fill')).toBe('#ffffff')
    const themed = renderRuleSheetToSVG(MODEL_1002, {
      faces: ['front'],
      theme,
      paperFill: '#123456',
    })
    expect(themed.querySelector('rect.print-paper')?.getAttribute('fill')).toBe('#123456')
  })

  it('stacks a single face without a gap', () => {
    const svg = renderRuleSheetToSVG(MODEL_57, { faces: ['front'], theme })
    const h = MODEL_57.physical.faceHeightMm
    expect(svg.getAttribute('height')).toBe(`${h}mm`)
    expect(svg.querySelectorAll('g.print-face').length).toBe(1)
  })

  it('yields a zero-height sheet with no faces', () => {
    const svg = renderRuleSheetToSVG(MODEL_1002, { faces: [], theme })
    expect(svg.getAttribute('height')).toBe('0mm')
    expect(svg.querySelectorAll('g.print-face').length).toBe(0)
  })

  it('moves the second face down by one face height plus the gap', () => {
    const svg = renderRuleSheetToSVG(MODEL_1002, { faces: ['front', 'back'], theme })
    const back = svg.querySelector('g.print-face[data-face="back"]')?.getAttribute('transform')
    const y = MODEL_1002.physical.faceHeightMm + PRINT_FACE_GAP_MM
    expect(back).toBe(`translate(0, ${y})`)
  })

  it('carries the slide offset into every face and honours gapMm', () => {
    const svg = renderRuleSheetToSVG(MODEL_1002, {
      faces: ['front'],
      theme,
      slideOffsetMm: 3,
      gapMm: 10,
    })
    expect(
      svg.querySelector('g.section-band[data-section="middle"]')?.getAttribute('transform'),
    ).toBe('translate(3, 0)')
    const sheet = renderRuleSheetToSVG(MODEL_1002, {
      faces: ['front', 'back'],
      theme,
      gapMm: 10,
    })
    const total = MODEL_1002.physical.faceHeightMm * 2 + 10
    expect(sheet.getAttribute('height')).toBe(`${total}mm`)
  })
})
