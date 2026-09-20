// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountWithPlugins } from '../test/mount'
import DesignerView from './DesignerView.vue'

enableAutoUnmount(afterEach)
beforeEach(() => localStorage.clear())

describe('DesignerView', () => {
  it('seeds the 1002 and shows the valid validation state', async () => {
    const wrapper = mountWithPlugins(DesignerView)

    await wrapper.find('[data-test="new-select"]').setValue('seed:1002')

    const id = wrapper.find('[data-test="rule-id"]').element as HTMLInputElement
    expect(id.value).toBe('1002')
    expect(wrapper.find('.designer-status-valid').exists()).toBe(true)
  })

  it('loads the circular template and previews a disc', async () => {
    const wrapper = mountWithPlugins(DesignerView)

    await wrapper.find('[data-test="new-select"]').setValue('template:circularCd')
    await vi.waitFor(() => {
      expect(wrapper.find('circle.limit').exists()).toBe(true)
    })
  })

  it('selects a scale by clicking it in the preview', async () => {
    const wrapper = mountWithPlugins(DesignerView)

    await wrapper.find('[data-test="new-select"]').setValue('seed:1002')
    await vi.waitFor(() => {
      expect(wrapper.find('.scale-hit').exists()).toBe(true)
    })

    const hit = wrapper.find(
      '.section-band[data-face="front"][data-section="upper"] [data-scale-index="0"] .scale-hit',
    )
    expect(hit.exists()).toBe(true)
    await hit.trigger('click')

    // The first upper-front scale is now selected in the sidebar list.
    const selected = wrapper.find('.designer-scale.is-selected')
    expect(selected.exists()).toBe(true)
  })

  it('shows validation errors when the physical width is zero', async () => {
    const wrapper = mountWithPlugins(DesignerView)

    await wrapper.find('[data-test="new-select"]').setValue('seed:1002')
    await wrapper.find('[data-test="face-width"]').setValue('0')

    // The status bar stays compact; the list expands from its toggle.
    await vi.waitFor(() => {
      expect(wrapper.find('.designer-status-toggle').exists()).toBe(true)
    })
    await wrapper.find('.designer-status-toggle').trigger('click')
    expect(wrapper.find('.designer-errors').exists()).toBe(true)
  })
})
