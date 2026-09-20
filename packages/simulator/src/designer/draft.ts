// The designer's local draft. Storage is injected (the Web Storage shape) so the
// module is testable in node; a real browser passes localStorage. Every function
// is a safe no-op when storage is unavailable (node, private mode, quota).
import type { RuleSpec } from '@slide-rule/generator'
import { detectDocument } from './model'

export const DRAFT_KEY = 'sliderule-designer-draft'

export interface DraftStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function browserStorage(): DraftStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function saveDraft(spec: RuleSpec, storage: DraftStorage | null = browserStorage()): void {
  if (storage === null) return
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(spec))
  } catch {
    // quota exceeded / storage disabled: the draft is a convenience, not state
  }
}

export function loadDraft(storage: DraftStorage | null = browserStorage()): RuleSpec | null {
  if (storage === null) return null
  try {
    const text = storage.getItem(DRAFT_KEY)
    if (text === null) return null
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return detectDocument(parsed)
  } catch {
    return null
  }
}

export function clearDraft(storage: DraftStorage | null = browserStorage()): void {
  if (storage === null) return
  try {
    storage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}
