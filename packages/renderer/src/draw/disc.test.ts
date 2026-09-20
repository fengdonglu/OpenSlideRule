// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseRule } from '@slide-rule/core'
import { THEMES } from '../themes'
import { renderDiscSheetToSVG, renderDiscToSVG } from './disc'

const theme = THEMES.plastic

function circularRule() {
  const parsed = parseRule({
    schemaVersion: 1,
    id: 'circle',
    name: 'Circle',
    form: 'circular',
    disc: { outerRadiusMm: 90, innerRadiusMm: 15, sheetSizeMm: 200 },
    faces: {
      front: {
        upper: [
          {
            id: 'D',
            name: 'D',
            type: 'D',
            orientation: 'increasing',
            calculation: {
              domain: [1, 10],
              map: { kind: 'log', anchor: 1 },
              intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
              labels: [1, 10 ** 0.25, 10],
            },
          },
        ],
        middle: [
          {
            id: 'C',
            name: 'C',
            type: 'C',
            orientation: 'increasing',
            calculation: {
              domain: [1, 10],
              map: { kind: 'log', anchor: 1 },
              intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
              labels: [1, 10 ** 0.25, 10],
            },
          },
        ],
        lower: [],
      },
      back: { upper: [], middle: [], lower: [] },
    },
  })
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors))
  return parsed.rule
}

function ticks(svg: SVGSVGElement): SVGLineElement[] {
  return [...svg.querySelectorAll('line.tick')] as SVGLineElement[]
}

describe('renderDiscToSVG', () => {
  it('renders a square 1:1 sheet with the disc geometry and ticks', () => {
    const svg = renderDiscToSVG(circularRule(), { face: 'front', theme })
    expect(svg.getAttribute('width')).toBe('200mm')
    expect(svg.getAttribute('height')).toBe('200mm')
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 200')
    expect(svg.querySelectorAll('circle.limit').length).toBe(1)
    expect(svg.querySelectorAll('circle.pivot').length).toBe(1)
    expect(svg.querySelectorAll('line.tick').length).toBeGreaterThan(0)
    expect(svg.querySelectorAll('text.numeral').length).toBeGreaterThan(0)
    expect(svg.querySelector('g.disc-scale[data-scale="C"] text.scale-name')?.textContent).toBe('C')
  })

  it('places position 0 at the top, position 0.25 at the right and wraps 1 == 0', () => {
    const center = 100
    const svg = renderDiscToSVG(circularRule(), { face: 'front', theme })
    const all = ticks(svg)

    // The ticks are ordered by position, so the first one is position 0: the
    // top of the disc, a vertical radial line through the centre.
    const first = all[0]
    expect(Number(first.getAttribute('x1'))).toBe(center)
    expect(Number(first.getAttribute('x2'))).toBe(center)

    // A tick at position 0.25 sits on the horizontal to the right of centre.
    const right = all.find((t) => Number(t.getAttribute('x1')) > center)
    expect(right).toBeDefined()
    expect(Number(right?.getAttribute('x1'))).toBeGreaterThan(center)
    expect(Math.abs(Number(right?.getAttribute('y1')) - center)).toBeLessThan(1e-6)

    // After dedup no two ticks share a physical point: the seam yields one tick.
    const points = all.map((t) => `${t.getAttribute('x1')},${t.getAttribute('y1')}`)
    expect(new Set(points).size).toBe(points.length)
  })

  it('draws a separator circle between the three bands', () => {
    const svg = renderDiscToSVG(circularRule(), { face: 'front', theme })
    const grooves = [...svg.querySelectorAll('circle.disc-groove')].map((g) =>
      Number(g.getAttribute('r')),
    )
    // outer 90, inner 15 -> band 25; boundaries at 90-25 and 90-50.
    expect(grooves.sort((a, b) => a - b)).toEqual([40, 65])
  })

  it('uses the requested paper colour (default white)', () => {
    const white = renderDiscToSVG(circularRule(), { face: 'front', theme })
    expect(white.querySelector('svg > rect')?.getAttribute('fill')).toBe('#ffffff')
    const themed = renderDiscToSVG(circularRule(), { face: 'front', theme, paperFill: '#123456' })
    expect(themed.querySelector('svg > rect')?.getAttribute('fill')).toBe('#123456')
  })

  it('frames the square sheet', () => {
    const svg = renderDiscToSVG(circularRule(), { face: 'front', theme })
    const frame = svg.querySelector('rect.sheet-frame')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute('width')).toBe('200')
    expect(frame?.getAttribute('height')).toBe('200')
    expect(frame?.getAttribute('fill')).toBe('none')
  })

  it('keeps every scale name inside the limit circle', () => {
    const outerRadius = 90
    const center = 100
    const svg = renderDiscToSVG(circularRule(), { face: 'front', theme })
    const names = [...svg.querySelectorAll('text.scale-name')]
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      const x = Number(name.getAttribute('x'))
      const y = Number(name.getAttribute('y'))
      expect(Math.hypot(x - center, y - center)).toBeLessThanOrEqual(outerRadius)
    }
  })
})

describe('renderDiscSheetToSVG', () => {
  it('stacks the faces on square sheets', () => {
    const svg = renderDiscSheetToSVG(circularRule(), { faces: ['front'], theme })
    expect(svg.getAttribute('height')).toBe('200mm')
    expect(svg.querySelectorAll('g.disc-face').length).toBe(1)
  })

  it('frames each stacked sheet face', () => {
    const svg = renderDiscSheetToSVG(circularRule(), { faces: ['front'], theme })
    expect(svg.querySelectorAll('g.disc-face rect.sheet-frame').length).toBe(1)
  })

  it('stacks two faces with the requested gap', () => {
    const svg = renderDiscSheetToSVG(circularRule(), {
      faces: ['front', 'back'],
      theme,
      gapMm: 10,
    })
    expect(svg.getAttribute('height')).toBe('410mm')
    expect(svg.querySelectorAll('g.disc-face').length).toBe(2)
  })

  it('is zero-height for an empty face list', () => {
    const svg = renderDiscSheetToSVG(circularRule(), { faces: [], theme })
    expect(svg.getAttribute('height')).toBe('0mm')
  })

  it('is empty-safe for a circular rule without discs', () => {
    const rule = { ...circularRule() } as Record<string, unknown>
    delete rule.disc
    expect(() => renderDiscToSVG(rule as never, { face: 'front', theme })).not.toThrow()
  })
})

describe('renderDiscToSVG rotation', () => {
  it('rotates the middle ring by rotationTurns and leaves the stator', () => {
    const base = renderDiscToSVG(circularRule(), { face: 'front', theme })
    const rotated = renderDiscToSVG(circularRule(), {
      face: 'front',
      theme,
      rotationTurns: { middle: 0.25 },
    })
    const tickOf = (svg: SVGSVGElement) =>
      svg.querySelector('g.disc-scale[data-scale="C"] line.tick') as SVGLineElement
    const a = tickOf(base)
    const b = tickOf(rotated)
    // position 0 is at the top (x === centre) un-rotated; a quarter turn puts it
    // to the right of the centre.
    expect(Number(a.getAttribute('x1'))).toBeCloseTo(100, 6)
    expect(Number(b.getAttribute('x1'))).toBeGreaterThan(100)

    // The upper scale is the fixed stator: rotating the middle ring must not
    // move its tick.
    const upperTick = (svg: SVGSVGElement) =>
      svg.querySelector('g.disc-scale[data-scale="D"] line.tick') as SVGLineElement
    const ua = upperTick(base)
    const ub = upperTick(rotated)
    expect(ub.getAttribute('x1')).toBe(ua.getAttribute('x1'))
    expect(ub.getAttribute('y1')).toBe(ua.getAttribute('y1'))
  })
  it('is unchanged without rotationTurns', () => {
    const a = renderDiscToSVG(circularRule(), { face: 'front', theme })
    const b = renderDiscToSVG(circularRule(), { face: 'front', theme, rotationTurns: {} })
    expect(a.outerHTML).toBe(b.outerHTML)
  })
})
