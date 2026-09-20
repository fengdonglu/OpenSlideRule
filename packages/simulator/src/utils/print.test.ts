// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MODEL_1002, MODEL_57, parseRule } from '@slide-rule/core'
import { THEMES } from '@slide-rule/renderer'
import { buildPrintHTML, printSlideRule } from './print'

afterEach(() => vi.restoreAllMocks())

function circularRule() {
  const parsed = parseRule({
    schemaVersion: 1,
    id: 'circle',
    name: 'Circle',
    form: 'circular',
    disc: { outerRadiusMm: 90, innerRadiusMm: 15, sheetSizeMm: 200 },
    faces: {
      front: {
        upper: [],
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
              labels: [1, 10],
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

describe('buildPrintHTML', () => {
  it('sizes the page to the sheet and escapes the title', () => {
    const html = buildPrintHTML({
      svg: '<svg/>',
      widthMm: 152.4,
      heightMm: 25.4,
      title: 'A & <B>',
    })
    expect(html).toContain('@page { size: 152.4mm 25.4mm; margin: 0; }')
    expect(html).toContain('<title>A &amp; &lt;B&gt;</title>')
    expect(html).toContain('<svg/>')
  })
})

describe('printSlideRule', () => {
  it('builds a 1:1 sheet, opens a print view and prints it', async () => {
    const write = vi.fn()
    const print = vi.fn()
    const fakeWindow = {
      document: { open: vi.fn(), write, close: vi.fn() },
      focus: vi.fn(),
      print,
    } as unknown as Window
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow)

    await printSlideRule({
      rule: MODEL_57,
      faces: ['front'],
      theme: THEMES.plastic,
      slideOffsetMm: 0,
      title: 'Type 57',
    })

    expect(open).toHaveBeenCalledOnce()
    const html = write.mock.calls.map((call) => String(call[0])).join('')
    expect(html).toContain('<svg')
    expect(html).toContain(
      `@page { size: ${MODEL_57.physical.faceWidthMm}mm ${MODEL_57.physical.faceHeightMm}mm; margin: 0; }`,
    )
    expect(print).toHaveBeenCalledOnce()
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(print.mock.invocationCallOrder[0])
    expect(document.querySelector('.sliderule-print-host')).toBeNull()
  })

  it('sizes a dual-face 1002 sheet to two faces plus the gap', async () => {
    const write = vi.fn()
    const fakeWindow = {
      document: { open: vi.fn(), write, close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow)

    await printSlideRule({
      rule: MODEL_1002,
      faces: ['front', 'back'],
      theme: THEMES.plastic,
      slideOffsetMm: 0,
      title: '1002',
    })

    const total = MODEL_1002.physical.faceHeightMm * 2 + 4
    const html = write.mock.calls.map((call) => String(call[0])).join('')
    expect(html).toContain(
      `@page { size: ${MODEL_1002.physical.faceWidthMm}mm ${total}mm; margin: 0; }`,
    )
  })

  it('sizes a circular sheet to the disc sheet size', async () => {
    const write = vi.fn()
    const fakeWindow = {
      document: { open: vi.fn(), write, close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow)

    await printSlideRule({
      rule: circularRule(),
      faces: ['front'],
      theme: THEMES.plastic,
      slideOffsetMm: 0,
      title: 'Circle',
    })

    const html = write.mock.calls.map((call) => String(call[0])).join('')
    expect(html).toContain('@page { size: 200mm 200mm; margin: 0; }')
    expect(html).toContain('disc-face')
    expect(document.querySelector('.sliderule-print-host')).toBeNull()
  })
})
