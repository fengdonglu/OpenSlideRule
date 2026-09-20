// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mountWithPlugins } from '../test/mount'
import AppBar from './AppBar.vue'
import type { AppBarExportItem } from '../appMode'

function items(onClick: () => void): AppBarExportItem[] {
  return [{ key: 'spec', label: '导出创作稿', testId: 'export-spec', onClick }]
}

describe('AppBar', () => {
  it('switches between the simulator and the designer', async () => {
    const wrapper = mountWithPlugins(AppBar, {
      props: { mode: 'simulator', exportItems: [] },
    })
    await wrapper.get('[data-test="designer-open"]').trigger('click')
    expect(wrapper.emitted('mode-change')?.[0]).toEqual(['designer'])

    await wrapper.get('[data-test="designer-close"]').trigger('click')
    expect(wrapper.emitted('mode-change')?.[1]).toEqual(['simulator'])
  })

  it('runs an export item from the drop-down', async () => {
    const onClick = vi.fn()
    const wrapper = mountWithPlugins(AppBar, {
      props: { mode: 'designer', exportItems: items(onClick) },
    })
    expect(wrapper.find('[data-test="export-spec"]').exists()).toBe(false)

    await wrapper.get('[data-test="export-toggle"]').trigger('click')
    await wrapper.get('[data-test="export-spec"]').trigger('click')
    expect(onClick).toHaveBeenCalledOnce()
    // The menu closes after a selection.
    expect(wrapper.find('[data-test="export-spec"]').exists()).toBe(false)
  })

  it('only shows the help action when one is provided', () => {
    const without = mountWithPlugins(AppBar, {
      props: { mode: 'simulator', exportItems: [] },
    })
    expect(without.find('button[title="型号信息"]').exists()).toBe(false)

    const help = { title: '型号信息', onClick: () => {} }
    const withHelp = mountWithPlugins(AppBar, {
      props: { mode: 'simulator', exportItems: [], help },
    })
    expect(withHelp.find('button[title="型号信息"]').exists()).toBe(true)
  })
})
