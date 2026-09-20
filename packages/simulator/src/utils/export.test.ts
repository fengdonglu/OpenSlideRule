// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseRule } from '@slide-rule/core'
import { THEMES } from '@slide-rule/renderer'
import { exportDiscToSVG, exportToMarkdown } from './export'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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

describe('exportDiscToSVG', () => {
  it('downloads the rendered disc sheet as an SVG', async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:disc')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    exportDiscToSVG('circle.svg', {
      rule: circularRule(),
      faces: ['front'],
      theme: THEMES.plastic,
    })

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('image/svg+xml;charset=utf-8')
    const svg = await blob.text()
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('disc-face')
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:disc')
  })

  it('refuses to silently export an empty face list', () => {
    expect(() =>
      exportDiscToSVG('circle.svg', {
        rule: circularRule(),
        faces: [],
        theme: THEMES.plastic,
      }),
    ).toThrow()
  })
})

describe('exportToMarkdown', () => {
  it('numbers each operation and records the export time', async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:md')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    exportToMarkdown(['新增游标', '切换到正面'], {
      filename: 'ops.md',
      locale: 'zh-CN',
      title: '操作记录',
      exportedAt: '导出时间',
      stepsTitle: '操作步骤',
    })

    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/markdown;charset=utf-8')
    const text = await blob.text()
    expect(text).toContain('# 操作记录')
    expect(text).toContain('## 操作步骤')
    expect(text).toContain('1. 新增游标')
    expect(text).toContain('2. 切换到正面')
  })
})
