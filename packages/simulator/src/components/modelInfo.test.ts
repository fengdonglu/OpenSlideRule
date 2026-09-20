import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import { MODEL_1002, MODEL_57 } from '@slide-rule/core'
import zhCN from '../i18n/locales/zh-CN'
import enUS from '../i18n/locales/en-US'
import { buildModelInfo, scaleDescKey, INFO_SECTIONS, type ModelInfo } from './modelInfo'

function scaleIds(info: ModelInfo): string[] {
  return info.faces.flatMap((face) => face.parts.flatMap((part) => part.scales.map((s) => s.id)))
}

describe('buildModelInfo', () => {
  it('reports the 1002 facts and both faces', () => {
    const info = buildModelInfo(MODEL_1002)
    expect(info.id).toBe('1002')
    expect(info.singleFaced).toBe(false)
    expect(info.totalScales).toBe(28)
    expect(info.faces.map((f) => f.side)).toEqual(['front', 'back'])
  })

  it('lists the 1002 front scales by part in rule order', () => {
    const front = buildModelInfo(MODEL_1002).faces[0]
    expect(front.parts.map((p) => p.section)).toEqual(INFO_SECTIONS)
    expect(front.parts[0].scales.map((s) => s.id)).toEqual(['sh2', 'sh3', 'K', 'A'])
    expect(front.parts[1].scales.map((s) => s.id)).toEqual(['B', 'sin2', "H'2", 'tg2', 'tg3', 'C'])
    expect(front.parts[2].scales.map((s) => s.id)).toEqual(['D', 'DI', 'lg', 'th2'])
  })

  it('lists the 1002 back scales by part in rule order', () => {
    const back = buildModelInfo(MODEL_1002).faces[1]
    expect(back.parts[0].scales.map((s) => s.id)).toEqual(['ln1I', 'ln2I', 'ln3I', 'DF'])
    expect(back.parts[1].scales.map((s) => s.id)).toEqual(['CF', 'CIF', 'H2', 'H3', 'CI', 'C'])
    expect(back.parts[2].scales.map((s) => s.id)).toEqual(['D', 'ln3', 'ln2', 'ln1'])
  })

  it('reports the single-faced 57 with its 9 scales and no back', () => {
    const info = buildModelInfo(MODEL_57)
    expect(info.id).toBe('57')
    expect(info.singleFaced).toBe(true)
    expect(info.totalScales).toBe(9)
    expect(info.faces.map((f) => f.side)).toEqual(['front'])
    expect(scaleIds(info)).toEqual(['K', 'A', 'S', 'ST', 'T', 'C', 'D', 'DI', 'L'])
  })

  it('carries each scale colour and its red flag', () => {
    const info = buildModelInfo(MODEL_57)
    const lower = info.faces[0].parts[2].scales
    expect(lower[0].id).toBe('D')
    expect(lower[0].isRed).toBe(false)
    expect(lower[1].id).toBe('DI')
    expect(lower[1].isRed).toBe(true)
    expect(lower[1].color).toBe('#dc2626')
  })

  it('keeps the printed function notes, including the red parts', () => {
    const middle = buildModelInfo(MODEL_57).faces[0].parts[1].scales
    expect(middle[0].id).toBe('S')
    expect(middle[0].notes).toEqual([[{ text: '∠sin ' }, { text: 'cos', red: true }]])

    const lower = buildModelInfo(MODEL_57).faces[0].parts[2].scales
    expect(lower[1].id).toBe('DI')
    expect(lower[1].notes).toEqual([[{ text: '1/x', red: true }]])
  })
})

describe('scaleDescKey', () => {
  it('uses the bracket form so vue-i18n can address names with an apostrophe', () => {
    expect(scaleDescKey("H'2")).toBe('scaleDesc["H\'2"]')
    expect(scaleDescKey('C')).toBe('scaleDesc["C"]')
  })

  it.each(['zh-CN', 'en-US'] as const)(
    'resolves a description for every scale of both models in %s',
    (locale) => {
      const i18n = createI18n({
        legacy: false,
        locale,
        messages: { 'zh-CN': zhCN, 'en-US': enUS },
      })
      const names = new Set([
        ...scaleIds(buildModelInfo(MODEL_1002)),
        ...scaleIds(buildModelInfo(MODEL_57)),
      ])

      for (const name of names) {
        const key = scaleDescKey(name)
        const value = i18n.global.t(key)
        expect(value, `${locale} ${name}`).not.toBe(key)
        expect(value.length).toBeGreaterThan(0)
      }
    },
  )
})
