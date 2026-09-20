// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDesignerStore } from './store'
import { DRAFT_KEY, loadDraft } from './draft'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('designer draft lifecycle', () => {
  it('saves on edit and truly clears on clearDraft', () => {
    const store = useDesignerStore()
    store.setRule({ name: 'draft me' })
    expect(loadDraft()).not.toBeNull()
    store.clearDraft()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    expect(loadDraft()).toBeNull()
    expect(store.draftRestored).toBe(false)
  })
})
