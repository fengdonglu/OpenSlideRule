// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { MODEL_1002, parseRule } from '@slide-rule/core'
import { THEMES } from '@slide-rule/renderer'
import { i18n } from '../i18n'
import { mountWithPlugins } from '../test/mount'
import DesignerPreview from './DesignerPreview.vue'

enableAutoUnmount(afterEach)
beforeEach(() => localStorage.clear())

const theme = THEMES.plastic

function circularRule() {
  const parsed = parseRule({
    schemaVersion: 1,
    id: 'circle',
    name: 'Circle',
    form: 'circular',
    disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
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

describe('DesignerPreview', () => {
  it('draws a linear rule as a sheet with ticks', async () => {
    const wrapper = mountWithPlugins(DesignerPreview, {
      props: { rule: MODEL_1002, circular: false, theme },
    })
    await vi.waitFor(() => {
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.findAll('line.tick').length).toBeGreaterThan(0)
    })
  })

  it('draws a circular rule as a disc', async () => {
    const wrapper = mountWithPlugins(DesignerPreview, {
      props: { rule: circularRule(), circular: true, theme },
    })
    await vi.waitFor(() => {
      expect(wrapper.find('circle.limit').exists()).toBe(true)
      expect(wrapper.findAll('line.tick').length).toBeGreaterThan(0)
    })
  })

  it('shows the notice for a circular rule with no disc', async () => {
    const rule = { ...circularRule(), disc: undefined }
    const wrapper = mountWithPlugins(DesignerPreview, {
      props: { rule, circular: true, theme },
    })
    await vi.waitFor(() => {
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.find('.designer-circular-note').text()).toBe(
        i18n.global.t('designer.circularNotice'),
      )
    })
  })
})
