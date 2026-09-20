// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { addScale, emptySpec } from './model'
import { DRAFT_KEY, clearDraft, loadDraft, saveDraft, type DraftStorage } from './draft'

function fakeStorage(): DraftStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

describe('draft storage', () => {
  it('round-trips a spec through the injected storage', () => {
    const storage = fakeStorage()
    const spec = addScale(emptySpec(), 'front', 'upper')
    saveDraft(spec, storage)
    expect(storage.map.has(DRAFT_KEY)).toBe(true)
    expect(loadDraft(storage)).toEqual(spec)
  })

  it('clears the draft', () => {
    const storage = fakeStorage()
    saveDraft(emptySpec(), storage)
    clearDraft(storage)
    expect(loadDraft(storage)).toBeNull()
  })

  it('is a no-op without storage and ignores malformed JSON', () => {
    expect(() => saveDraft(emptySpec(), null)).not.toThrow()
    expect(loadDraft(null)).toBeNull()
    const storage = fakeStorage()
    storage.setItem(DRAFT_KEY, '{not json')
    expect(loadDraft(storage)).toBeNull()
  })

  it('rejects a parsed payload that is not a plain object', () => {
    const storage = fakeStorage()
    storage.setItem(DRAFT_KEY, JSON.stringify([1, 2, 3]))
    expect(loadDraft(storage)).toBeNull()
    storage.setItem(DRAFT_KEY, JSON.stringify('a string'))
    expect(loadDraft(storage)).toBeNull()
  })
})
