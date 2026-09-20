// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { MODEL_1002, MODEL_57, getScaleTicks, isRedScale } from '@slide-rule/core'
import { computeFaceLayout } from '../layout'
import { THEMES } from '../themes'
import { renderSection, sectionViewBox } from './section'
import { renderRuleToSVG } from './rule'
import { measureRadicals } from './radicalMeasure'

function svgRoot(): SVGSVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
}

const layout1002 = computeFaceLayout(MODEL_1002.physical, 1200)
const theme = THEMES.plastic

describe('renderSection', () => {
  const scales = MODEL_1002.front.upper

  it('draws one line.tick per generated tick', () => {
    const root = svgRoot()
    renderSection(root, { scales, section: 'upper', layout: layout1002, theme })
    const expected = scales.reduce((n, s) => n + getScaleTicks(s).length, 0)
    expect(root.querySelectorAll('line.tick').length).toBe(expected)
  })

  it('tags every tick with its level class', () => {
    const root = svgRoot()
    renderSection(root, { scales, section: 'upper', layout: layout1002, theme })
    const all = root.querySelectorAll('line.tick')
    const tagged = root.querySelectorAll('line.tick.level-1, line.tick.level-2, line.tick.level-3')
    expect(tagged.length).toBe(all.length)
    expect(root.querySelectorAll('line.tick.level-1').length).toBeGreaterThan(0)
  })

  it('sets the viewBox to the section band plus bleed', () => {
    const root = svgRoot()
    renderSection(root, { scales, section: 'upper', layout: layout1002, theme })
    const opts = { scales, section: 'upper' as const, layout: layout1002, theme }
    expect(root.getAttribute('viewBox')).toBe(sectionViewBox(opts))
  })

  it('uses the theme colours for black and red scales', () => {
    const lower = MODEL_1002.front.lower
    const black = lower.find((s) => !isRedScale(s))
    const red = lower.find(isRedScale)
    expect(black).toBeDefined()
    expect(red).toBeDefined()
    const cases = [
      [black as (typeof lower)[number], theme.colors.scaleBlack],
      [red as (typeof lower)[number], theme.colors.scaleRed],
    ] as const
    for (const [scale, expected] of cases) {
      const root = svgRoot()
      renderSection(root, { scales: [scale], section: 'lower', layout: layout1002, theme })
      const stroke = root.querySelector('line.tick')?.getAttribute('stroke')
      expect(stroke).toBe(expected)
    }
  })

  it('renders the injected title and the scale name', () => {
    const root = svgRoot()
    renderSection(root, {
      scales,
      section: 'upper',
      layout: layout1002,
      theme,
      titleOf: (s) => 'T:' + s.name,
    })
    const name = root.querySelector('text.scale-name')
    expect(name?.textContent).toContain(scales[0].name)
    expect(root.querySelector('title')?.textContent).toBe('T:' + scales[0].name)
  })

  it('draws the guide lines at the tick-area edges', () => {
    const root = svgRoot()
    renderSection(root, { scales, section: 'upper', layout: layout1002, theme })
    const guides = root.querySelectorAll('line.guide')
    expect(guides.length).toBe(2)
    const left = String(layout1002.tickLeftMm)
    const right = String(layout1002.tickLeftMm + layout1002.tickWidthMm)
    expect(guides[0].getAttribute('x1')).toBe(left)
    expect(guides[0].getAttribute('x2')).toBe(left)
    expect(guides[1].getAttribute('x1')).toBe(right)
    expect(guides[1].getAttribute('x2')).toBe(right)
  })

  it('draws the first sh2 level-1 tick from mid-row to the shared floor', () => {
    const root = svgRoot()
    renderSection(root, { scales, section: 'upper', layout: layout1002, theme })
    const tick = root.querySelector('line.tick.level-1')
    const rowTop = layout1002.sections.upper.topMm
    const h = layout1002.rowHeightMm
    expect(tick?.getAttribute('y1')).toBe(String(rowTop + 0.5 * h))
    expect(tick?.getAttribute('y2')).toBe(String(rowTop + h))
  })

  it('centres notes in the right panel', () => {
    const noteScales = scales.filter((s) => (s.notes?.length ?? 0) > 0)
    const root = svgRoot()
    renderSection(root, { scales: noteScales, section: 'upper', layout: layout1002, theme })
    const note = root.querySelector('text.note')
    const expected = (layout1002.tickLeftMm + layout1002.tickWidthMm + layout1002.faceWidthMm) / 2
    expect(note?.getAttribute('x')).toBe(String(expected))
  })
})

describe('measureRadicals', () => {
  // sin2 (and H'2) carry a `√1-(.1C)²` reference note, so the middle section
  // has real `[data-radicand]` tspans to measure.
  const middle = MODEL_1002.front.middle
  const noteFontMm = layout1002.numeralMm * 0.9

  it('is a safe no-op under jsdom where getBBox/canvas are unavailable', () => {
    const root = svgRoot()
    renderSection(root, { scales: middle, section: 'middle', layout: layout1002, theme })
    expect(root.querySelector('[data-radicand]')).not.toBeNull()
    expect(() => measureRadicals(root, noteFontMm)).not.toThrow()
    expect(root.querySelectorAll('line.radical').length).toBe(0)
  })

  it('appends one line.radical per measured radicand and does not duplicate on redraw', () => {
    const root = svgRoot()
    renderSection(root, { scales: middle, section: 'middle', layout: layout1002, theme })
    const radicand = root.querySelector('[data-radicand]') as SVGTSpanElement
    radicand.getBBox = () => ({ x: 1, y: 1, width: 2, height: 1 }) as DOMRect
    // jsdom has no canvas; stub it so the test exercises the measure path
    // without the "not implemented" warning.
    const ctx = {
      font: '',
      measureText: () => ({
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 2,
        actualBoundingBoxAscent: 1,
      }),
    } as unknown as CanvasRenderingContext2D
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
    try {
      measureRadicals(root, noteFontMm)
      expect(root.querySelectorAll('line.radical').length).toBe(1)
      measureRadicals(root, noteFontMm)
      expect(root.querySelectorAll('line.radical').length).toBe(1)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('renderRuleToSVG', () => {
  it('renders a full face at 1:1 mm', () => {
    const svg = renderRuleToSVG(MODEL_57, { face: 'front', theme })
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('width')).toBe(`${MODEL_57.physical.faceWidthMm}mm`)
    expect(svg.getAttribute('height')).toBe(`${MODEL_57.physical.faceHeightMm}mm`)
    expect(svg.querySelectorAll('line.tick').length).toBeGreaterThan(0)
  })

  it('contains all three section bands', () => {
    const svg = renderRuleToSVG(MODEL_1002, { face: 'front', theme })
    expect(svg.querySelectorAll('g.section-band').length).toBe(3)
  })
})
