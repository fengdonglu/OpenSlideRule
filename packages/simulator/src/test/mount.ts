// Mount a component with the app's Pinia and i18n plugins installed, so a
// component test can render it exactly as the app does.
/* eslint-disable @typescript-eslint/no-explicit-any -- a generic test helper */
import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { i18n } from '../i18n'

export function mountWithPlugins(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [createPinia(), i18n, ...(options.global?.plugins ?? [])],
    },
  })
}
