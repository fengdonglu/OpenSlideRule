// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { i18n } from '../i18n'
import { mountWithPlugins } from '../test/mount'
import ImportRuleDialog from './ImportRuleDialog.vue'

enableAutoUnmount(afterEach)
beforeEach(() => localStorage.clear())

describe('ImportRuleDialog', () => {
  it('shows a JSON parse error message', () => {
    const wrapper = mountWithPlugins(ImportRuleDialog, {
      props: { open: true, result: { kind: 'parseError', message: 'boom' } },
    })
    const message = wrapper.find('.import-message').text()
    expect(message).toContain(i18n.global.t('import.parseError'))
    expect(message).toContain('boom')
  })
  it('lists validation errors as path: code: message', () => {
    const wrapper = mountWithPlugins(ImportRuleDialog, {
      props: {
        open: true,
        result: {
          kind: 'errors',
          errors: [
            {
              path: 'faces.front.upper[0].id',
              code: 'missingField',
              message: 'a required field is absent',
            },
          ],
        },
      },
    })
    const message = wrapper.find('.import-errors').text()
    expect(message).toContain('faces.front.upper[0].id')
    expect(message).toContain('missingField')
    expect(message).toContain('a required field is absent')
  })
  it('emits close', async () => {
    const wrapper = mountWithPlugins(ImportRuleDialog, {
      props: { open: true, result: { kind: 'parseError', message: 'x' } },
    })
    await wrapper.find('.icon-close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
