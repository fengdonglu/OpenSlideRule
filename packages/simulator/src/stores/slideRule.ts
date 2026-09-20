// Slide rule state (Pinia)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SlideRuleSide } from '@slide-rule/core'
import { THEMES, DEFAULT_THEME, type Theme } from '@slide-rule/renderer'
import {
  DEFAULT_MODEL_ID,
  MODELS,
  getModelStructure,
  isModelAvailable,
  sideHasScales,
} from '@slide-rule/core'
import type { SlideRuleStructure } from '@slide-rule/core'
import { importRuleText, type ImportRuleResult } from '../utils/importRule'

// Zoom range (1 = fit the viewport width)
export const ZOOM_MIN = 1
export const ZOOM_MAX = 6
export const ZOOM_STEP = 0.25

// Model id reserved for a rule loaded at runtime. It only exists while a rule
// is loaded; the built-in MODELS list never contains it.
export const IMPORTED_MODEL_ID = 'imported'

// Soft cap on the number of cursors; adding beyond it is refused.
export const MAX_CURSORS = 8

// One cursor: a stable id plus a normalized tick position (0..1).
export interface RuleCursor {
  id: string
  position: number
  // The cursor's own colour. Absent means "follow the theme's cursor colour",
  // which is what the first/only cursor does; added cursors get a palette
  // colour so several cursors stay distinguishable.
  color?: string
}

// Fixed palette for extra cursors. Chosen to read on both light and dark theme
// backgrounds; the first cursor keeps the theme colour, so these start with the
// second cursor and cycle once exhausted.
export const CURSOR_PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899']

// Resolve the colour a cursor is drawn with: its own colour, or the theme's
// cursor colour when it has none (the first/only cursor).
export function resolveCursorColor(cursor: RuleCursor, theme: Theme): string {
  return cursor.color ?? theme.colors.cursor
}

// The initial cursor sits at the centre of the tick area.
export const DEFAULT_CURSOR_POSITION = 0.5

let cursorSeq = 0
function nextCursorId(): string {
  cursorSeq += 1
  return `cursor-${cursorSeq}`
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

export const useSlideRuleStore = defineStore('slideRule', () => {
  // Current model
  const currentModelId = ref(DEFAULT_MODEL_ID)

  // A rule loaded from JSON at runtime. Present only after a successful load;
  // it is never one of the built-in models.
  const importedRule = ref<SlideRuleStructure | null>(null)

  // Structure of the current model: the imported rule while it is selected,
  // otherwise the built-in model registry.
  const currentModel = computed(() =>
    importedRule.value !== null && currentModelId.value === IMPORTED_MODEL_ID
      ? importedRule.value
      : getModelStructure(currentModelId.value),
  )

  // Selector entries: the built-ins plus the imported rule when one is loaded.
  const modelOptions = computed(() => [
    ...MODELS,
    ...(importedRule.value === null ? [] : [{ id: IMPORTED_MODEL_ID, available: true }]),
  ])

  // Whether the current model actually carries a back face (the Type 57 does not)
  const hasBackFace = computed(() => sideHasScales(currentModel.value, 'back'))

  // Currently displayed side (single-face mode)
  const currentSide = ref<SlideRuleSide>('front')

  // Show both faces stacked at once. A double-sided rule starts in dual mode; a
  // single-faced rule can never be in dual mode (see setDualFace).
  const dualFace = ref(hasBackFace.value)

  // Faces the current model actually has (the Type 57 is single-faced)
  const availableSides = computed<SlideRuleSide[]>(() => {
    const sides: SlideRuleSide[] = []
    if (sideHasScales(currentModel.value, 'front')) sides.push('front')
    if (sideHasScales(currentModel.value, 'back')) sides.push('back')
    return sides
  })

  // A model with a single face cannot show both faces or switch sides.
  const isSingleFaced = computed(() => availableSides.value.length <= 1)

  // Faces currently on screen: both in dual mode (when they exist), otherwise
  // the selected one, falling back to the only available face.
  const visibleSides = computed<SlideRuleSide[]>(() => {
    const sides = availableSides.value
    if (dualFace.value && sides.length > 1) return sides
    return sides.includes(currentSide.value) ? [currentSide.value] : [sides[0] ?? 'front']
  })

  // Slide offset in scale-length units (0 = aligned, positive = shifted right)
  const middleOffset = ref(0)

  // Circular rotor offset in turns (0 = the printed alignment). Only the
  // movable ring of a circular rule uses it; linear rules ignore it.
  const discOffset = ref(0)

  // Whether the current model is a circular rule, whose view rotates a disc
  // instead of sliding a rectangular rule.
  const isCircular = computed(() => currentModel.value.form === 'circular')

  // Ordered cursors, each with its own normalized position (0..1)
  const cursors = ref<RuleCursor[]>([{ id: nextCursorId(), position: DEFAULT_CURSOR_POSITION }])

  // Per-store palette cursor: monotonically increasing, so removing a cursor
  // never recolours the remaining ones and new cursors still cycle distinctly.
  let cursorColorSeq = 0
  function nextCursorColor(): string {
    const color = CURSOR_PALETTE[cursorColorSeq % CURSOR_PALETTE.length]
    cursorColorSeq += 1
    return color
  }

  // Current theme id
  const currentThemeId = ref(DEFAULT_THEME)

  // Current theme object
  const currentTheme = computed((): Theme => THEMES[currentThemeId.value])

  // Zoom factor (1 = fit the viewport width)
  const zoom = ref(1)

  // Reset the interaction state shared by every model switch: the imported
  // rule and the built-ins must land in exactly the same state.
  function resetInteraction(): void {
    middleOffset.value = 0
    discOffset.value = 0
    cursors.value = [{ id: nextCursorId(), position: DEFAULT_CURSOR_POSITION }]
    // Land on a face the model actually has: switching from a two-faced rule
    // to the single-faced 57 must not leave 'back' selected. A double-sided
    // rule defaults back to dual mode, a single-faced one stays single.
    const sides = availableSides.value
    if (!sides.includes(currentSide.value)) currentSide.value = sides[0] ?? 'front'
    dualFace.value = sides.length > 1
  }

  function setModel(id: string): void {
    const known = id === IMPORTED_MODEL_ID ? importedRule.value !== null : isModelAvailable(id)
    if (!known) return
    currentModelId.value = id
    resetInteraction()
  }

  // Parse and adopt a rule JSON. On any failure the current model is left
  // untouched and the result is returned for the caller to report.
  function loadRule(text: string): ImportRuleResult {
    const result = importRuleText(text)
    if (result.kind !== 'ok') return result
    importedRule.value = result.rule
    currentModelId.value = IMPORTED_MODEL_ID
    resetInteraction()
    return result
  }

  // Drop the imported rule. Only when it was the selected model do we fall back
  // to the default built-in and reset; clearing must not disturb a built-in.
  function clearImported(): void {
    importedRule.value = null
    if (currentModelId.value === IMPORTED_MODEL_ID) {
      currentModelId.value = DEFAULT_MODEL_ID
      resetInteraction()
    }
  }

  function setDualFace(v: boolean): void {
    dualFace.value = v && !isSingleFaced.value
  }

  function setSide(side: SlideRuleSide): void {
    if (availableSides.value.includes(side)) currentSide.value = side
  }

  function toggleSide(): void {
    const sides = availableSides.value
    if (sides.length <= 1) return
    const i = sides.indexOf(currentSide.value)
    currentSide.value = sides[(i + 1) % sides.length]
  }

  function setTheme(themeId: string): void {
    if (THEMES[themeId]) {
      currentThemeId.value = themeId
    }
  }

  function setZoom(v: number): void {
    zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v))
  }

  function zoomIn(): void {
    setZoom(zoom.value + ZOOM_STEP)
  }

  function zoomOut(): void {
    setZoom(zoom.value - ZOOM_STEP)
  }

  function resetZoom(): void {
    zoom.value = ZOOM_MIN
  }

  // Reset the slide to the aligned position
  function resetSlide(): void {
    middleOffset.value = 0
  }

  // Reset every form of motion at once: the linear slide and the circular rotor
  function resetMotion(): void {
    middleOffset.value = 0
    discOffset.value = 0
  }

  // Turn the circular rotor by `turns` (fractions of a full turn), wrapped into
  // [0, 1) so the store never carries a multi-turn or negative offset. An
  // already-normalised value is kept exactly rather than round-tripped through
  // the modulo, which would introduce float noise.
  function setDiscOffset(turns: number): void {
    discOffset.value = turns >= 0 && turns < 1 ? turns : ((turns % 1) + 1) % 1
  }

  // Reset the circular rotor to the printed alignment
  function resetDisc(): void {
    discOffset.value = 0
  }

  // Append a cursor at `position` unless the soft cap is reached.
  function addCursor(position: number): void {
    if (cursors.value.length >= MAX_CURSORS) return
    cursors.value.push({
      id: nextCursorId(),
      position: clamp01(position),
      color: nextCursorColor(),
    })
  }

  // Remove a cursor by id. Removing the last one leaves the rule with no
  // cursor line; a new cursor can be added again afterwards.
  function removeCursor(id: string): void {
    const i = cursors.value.findIndex((c) => c.id === id)
    if (i === -1) return
    cursors.value.splice(i, 1)
  }

  // Move one cursor; the position is clamped to the tick area.
  function setCursorPosition(id: string, position: number): void {
    const cursor = cursors.value.find((c) => c.id === id)
    if (cursor) cursor.position = clamp01(position)
  }

  // Arrow-key nudging. On by default; the toolbar button turns it off for
  // anyone whose setup would clash.
  const keyboardNav = ref(true)
  function setKeyboardNav(on: boolean): void {
    keyboardNav.value = on
  }

  // Nudge the slide (the arrow keys) and the last cursor (Shift + arrows). The
  // slide's travel matches the drag clamp in SlideRule.vue.
  const SLIDE_TRAVEL = 1
  function nudgeSlide(delta: number): void {
    middleOffset.value = Math.min(SLIDE_TRAVEL, Math.max(-SLIDE_TRAVEL, middleOffset.value + delta))
  }
  function nudgeCursor(delta: number): void {
    const cursor = cursors.value.at(-1)
    if (cursor !== undefined) setCursorPosition(cursor.id, cursor.position + delta)
  }

  // Operation history (used by the Markdown export)
  const operationHistory = ref<string[]>([])

  function logOperation(description: string): void {
    operationHistory.value.push(description)
  }

  function clearHistory(): void {
    operationHistory.value = []
  }

  return {
    currentModelId,
    currentModel,
    importedRule,
    modelOptions,
    currentSide,
    dualFace,
    availableSides,
    isSingleFaced,
    visibleSides,
    middleOffset,
    discOffset,
    isCircular,
    cursors,
    currentThemeId,
    currentTheme,
    zoom,
    operationHistory,
    setModel,
    loadRule,
    clearImported,
    setDualFace,
    setSide,
    toggleSide,
    setTheme,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    resetSlide,
    resetMotion,
    setDiscOffset,
    resetDisc,
    addCursor,
    removeCursor,
    setCursorPosition,
    keyboardNav,
    setKeyboardNav,
    nudgeSlide,
    nudgeCursor,
    logOperation,
    clearHistory,
  }
})
