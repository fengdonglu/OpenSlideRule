// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { useSlideRuleStore } from '../stores/slideRule'
import { mountWithPlugins } from '../test/mount'
import CircularRule from './CircularRule.vue'

enableAutoUnmount(afterEach)

// A minimal circular rule: one C scale on the middle (movable) ring.
const CIRCULAR_DEFINITION = {
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
}

describe('CircularRule', () => {
  it('renders the disc and one cursor line for a loaded circular rule', async () => {
    const wrapper = mountWithPlugins(CircularRule)
    const store = useSlideRuleStore()
    const result = store.loadRule(JSON.stringify(CIRCULAR_DEFINITION))
    expect(result.kind).toBe('ok')

    await vi.waitFor(() => {
      expect(wrapper.find('circle.limit').exists()).toBe(true)
    })
    expect(wrapper.findAll('line.cursor-line')).toHaveLength(1)
  })
})
