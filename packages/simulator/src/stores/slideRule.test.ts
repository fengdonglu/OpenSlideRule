import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  builtInRuleDefinitions,
  DEFAULT_MODEL_ID,
  parseRule,
  type SlideRuleStructure,
} from '@slide-rule/core'
import {
  useSlideRuleStore,
  MAX_CURSORS,
  DEFAULT_CURSOR_POSITION,
  CURSOR_PALETTE,
  resolveCursorColor,
} from './slideRule'

describe('slideRule store - cursor list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with a single cursor at the default position', () => {
    const store = useSlideRuleStore()
    expect(store.cursors).toHaveLength(1)
    expect(store.cursors[0].position).toBe(DEFAULT_CURSOR_POSITION)
  })

  it('appends cursors and refuses to go past the soft cap', () => {
    const store = useSlideRuleStore()
    for (let i = 0; i < MAX_CURSORS + 3; i++) store.addCursor(0.25)
    expect(store.cursors).toHaveLength(MAX_CURSORS)
  })

  it('clamps the position when adding', () => {
    const store = useSlideRuleStore()
    store.addCursor(2)
    store.addCursor(-1)
    expect(store.cursors[1].position).toBe(1)
    expect(store.cursors[2].position).toBe(0)
  })

  it('moves only the targeted cursor, clamped to 0..1', () => {
    const store = useSlideRuleStore()
    store.addCursor(0.25)
    const target = store.cursors[1].id
    store.setCursorPosition(target, -0.5)
    expect(store.cursors[1].position).toBe(0)
    expect(store.cursors[0].position).toBe(DEFAULT_CURSOR_POSITION)
    store.setCursorPosition(target, 5)
    expect(store.cursors[1].position).toBe(1)
  })

  it('removes a cursor by id', () => {
    const store = useSlideRuleStore()
    store.addCursor(0.25)
    store.removeCursor(store.cursors[1].id)
    expect(store.cursors).toHaveLength(1)
  })

  it('removes the last remaining cursor, leaving no cursors at all', () => {
    const store = useSlideRuleStore()
    store.setCursorPosition(store.cursors[0].id, 0.2)
    store.removeCursor(store.cursors[0].id)
    expect(store.cursors).toHaveLength(0)
  })

  it('adds a fresh cursor after the list has been emptied', () => {
    const store = useSlideRuleStore()
    store.removeCursor(store.cursors[0].id)
    store.addCursor(0.75)
    expect(store.cursors).toHaveLength(1)
    expect(store.cursors[0].position).toBe(0.75)
    expect(store.cursors[0].id).toBeTruthy()
  })

  it('never reuses an id, even after a cursor is removed', () => {
    const store = useSlideRuleStore()
    const firstId = store.cursors[0].id
    store.removeCursor(firstId)
    store.addCursor(0.5)
    store.addCursor(0.6)
    expect(store.cursors[0].id).not.toBe(firstId)
    const ids = store.cursors.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ignores an unknown id', () => {
    const store = useSlideRuleStore()
    store.removeCursor('nope')
    store.setCursorPosition('nope', 0.1)
    expect(store.cursors).toHaveLength(1)
    expect(store.cursors[0].position).toBe(DEFAULT_CURSOR_POSITION)
  })

  it('resets to one centred cursor when the model changes', () => {
    const store = useSlideRuleStore()
    store.addCursor(0.1)
    store.setModel(store.currentModelId)
    expect(store.cursors).toHaveLength(1)
    expect(store.cursors[0].position).toBe(DEFAULT_CURSOR_POSITION)
  })
})

describe('slideRule store - cursor colours', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps the first cursor on the theme cursor colour', () => {
    const store = useSlideRuleStore()
    expect(store.cursors[0].color).toBeUndefined()
    expect(resolveCursorColor(store.cursors[0], store.currentTheme)).toBe(
      store.currentTheme.colors.cursor,
    )
  })

  it('gives added cursors distinct palette colours', () => {
    const store = useSlideRuleStore()
    for (let i = 0; i < CURSOR_PALETTE.length; i++) store.addCursor(0.1 * (i + 1))

    const added = store.cursors.slice(1).map((c) => c.color)
    expect(added).toEqual(CURSOR_PALETTE)
    expect(new Set(added).size).toBe(added.length)
  })

  it('cycles the palette once it is exhausted', () => {
    const store = useSlideRuleStore()
    // The cap allows MAX_CURSORS - 1 additions; the palette is shorter, so the
    // next colour wraps around to the start.
    for (let i = 0; i < MAX_CURSORS - 1; i++) store.addCursor(0.1)

    const added = store.cursors.slice(1).map((c) => c.color)
    expect(added[CURSOR_PALETTE.length]).toBe(CURSOR_PALETTE[0])
  })

  it('keeps a cursor colour stable when cursors move or are removed', () => {
    const store = useSlideRuleStore()
    store.addCursor(0.2)
    store.addCursor(0.3)
    const second = store.cursors[1]
    const colour = second.color

    store.setCursorPosition(second.id, 0.9)
    store.removeCursor(store.cursors[0].id)

    expect(store.cursors.find((c) => c.id === second.id)?.color).toBe(colour)
  })

  it('gives the reset cursor after a model change the theme colour again', () => {
    const store = useSlideRuleStore()
    store.addCursor(0.2)
    store.setModel(store.currentModelId)
    expect(store.cursors).toHaveLength(1)
    expect(store.cursors[0].color).toBeUndefined()
  })
})

describe('slideRule store - single-faced model', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows both faces of the two-faced 1002 by default', () => {
    const store = useSlideRuleStore()
    expect(store.dualFace).toBe(true)
    expect(store.visibleSides).toEqual(['front', 'back'])
  })

  it('turns dual mode off explicitly for the two-faced 1002', () => {
    const store = useSlideRuleStore()
    store.setDualFace(false)
    expect(store.dualFace).toBe(false)
    expect(store.visibleSides).toEqual([store.currentSide])
  })

  it('lands on the front and clears dual mode when switching to the single-faced 57', () => {
    const store = useSlideRuleStore()
    store.setDualFace(true)
    store.setSide('back')
    store.setModel('57')
    expect(store.currentSide).toBe('front')
    expect(store.dualFace).toBe(false)
    expect(store.visibleSides).toEqual(['front'])
  })

  it('keeps the single-faced 57 single even when dual mode is requested', () => {
    const store = useSlideRuleStore()
    store.setModel('57')
    expect(store.dualFace).toBe(false)
    store.setDualFace(true)
    expect(store.dualFace).toBe(false)
    expect(store.visibleSides).toEqual(['front'])
  })

  it('returns to dual mode when switching back to the 1002', () => {
    const store = useSlideRuleStore()
    store.setModel('57')
    expect(store.dualFace).toBe(false)
    store.setModel('1002')
    expect(store.dualFace).toBe(true)
    expect(store.visibleSides).toEqual(['front', 'back'])
  })

  it('refuses to select a face the model does not have', () => {
    const store = useSlideRuleStore()
    store.setModel('57')
    store.setSide('back')
    expect(store.currentSide).toBe('front')
    store.toggleSide()
    expect(store.currentSide).toBe('front')
    store.setDualFace(true)
    expect(store.dualFace).toBe(false)
  })
})

describe('slideRule store - imported rule', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads a valid rule, makes it current, and lists it in modelOptions', () => {
    const store = useSlideRuleStore()
    const def57 = builtInRuleDefinitions().find((d) => d.id === '57')!
    const result = store.loadRule(JSON.stringify(def57))
    expect(result.kind).toBe('ok')
    expect(store.currentModelId).toBe('imported')
    expect(store.currentModel!.id).toBe('57')
    expect(store.modelOptions.map((m) => m.id)).toContain('imported')
    expect(store.isSingleFaced).toBe(true)
  })

  it('keeps the current model and returns errors for an invalid rule', () => {
    const store = useSlideRuleStore()
    const before = store.currentModel!.id
    const bad = JSON.stringify({ schemaVersion: 2, id: 'x', name: 'x', physical: {}, faces: {} })
    const result = store.loadRule(bad)
    expect(result.kind).toBe('errors')
    expect(store.currentModel!.id).toBe(before)
  })

  it('loads a circular rule and marks the model circular', () => {
    const store = useSlideRuleStore()
    const result = store.loadRule(JSON.stringify(CIRCULAR_DEFINITION))
    expect(result.kind).toBe('ok')
    expect(store.currentModelId).toBe('imported')
    expect(store.isCircular).toBe(true)
  })

  it('clears the imported rule and falls back to a built-in', () => {
    const store = useSlideRuleStore()
    const def57 = builtInRuleDefinitions().find((d) => d.id === '57')!
    store.loadRule(JSON.stringify(def57))
    store.clearImported()
    expect(store.importedRule).toBeNull()
    expect(store.modelOptions.map((m) => m.id)).not.toContain('imported')
    expect(store.currentModelId).toBe(DEFAULT_MODEL_ID)
  })

  it('leaves an active built-in model and its cursors untouched when clearing', () => {
    const store = useSlideRuleStore()
    const def57 = builtInRuleDefinitions().find((d) => d.id === '57')!
    store.loadRule(JSON.stringify(def57))
    store.setModel('1002')
    store.addCursor(0.2)
    const ids = store.cursors.map((c) => c.id)
    const positions = store.cursors.map((c) => c.position)

    store.clearImported()

    expect(store.importedRule).toBeNull()
    expect(store.currentModelId).toBe('1002')
    expect(store.cursors.map((c) => c.id)).toEqual(ids)
    expect(store.cursors.map((c) => c.position)).toEqual(positions)
  })

  it('only selects the imported model when a rule has been loaded', () => {
    const store = useSlideRuleStore()
    store.setModel('imported')
    expect(store.currentModelId).toBe(DEFAULT_MODEL_ID)
    const def57 = builtInRuleDefinitions().find((d) => d.id === '57')!
    store.loadRule(JSON.stringify(def57))
    store.setModel('1002')
    expect(store.currentModelId).toBe('1002')
    store.setModel('imported')
    expect(store.currentModelId).toBe('imported')
    expect(store.currentModel!.id).toBe('57')
  })
})

// A minimal valid circular rule: a disc and empty faces satisfy the schema.
const CIRCULAR_DEFINITION = {
  schemaVersion: 1,
  id: 'circle',
  name: 'Circle',
  form: 'circular',
  disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
  faces: {
    front: { upper: [], middle: [], lower: [] },
    back: { upper: [], middle: [], lower: [] },
  },
}

function circularStructure(): SlideRuleStructure {
  const parsed = parseRule(CIRCULAR_DEFINITION)
  if (!parsed.ok) throw new Error('invalid circular test rule')
  return parsed.rule
}

// The two-faced 1002 with the circular form: real front/back scales, so both
// faces are available and the single-face rule can be exercised.
function twoFacedCircularStructure(): SlideRuleStructure {
  const linear = builtInRuleDefinitions().find((d) => d.id === '1002')!
  const parsed = parseRule({
    ...linear,
    form: 'circular',
    disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
  })
  if (!parsed.ok) throw new Error('invalid two-faced circular test rule')
  return parsed.rule
}

describe('slideRule store - circular rotor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reports isCircular for a circular rule and not for a linear one', () => {
    const store = useSlideRuleStore()
    expect(store.isCircular).toBe(false)
    store.importedRule = circularStructure()
    store.setModel('imported')
    expect(store.isCircular).toBe(true)
  })

  it('sets and resets the disc offset', () => {
    const store = useSlideRuleStore()
    expect(store.discOffset).toBe(0)
    store.setDiscOffset(0.3)
    expect(store.discOffset).toBe(0.3)
    store.resetDisc()
    expect(store.discOffset).toBe(0)
  })

  it('wraps the disc offset into [0, 1)', () => {
    const store = useSlideRuleStore()
    store.setDiscOffset(1.3)
    expect(store.discOffset).toBeCloseTo(0.3, 12)
    store.setDiscOffset(-0.25)
    expect(store.discOffset).toBeCloseTo(0.75, 12)
    store.setDiscOffset(2)
    expect(store.discOffset).toBe(0)
  })

  it('zeroes the disc offset when the model changes', () => {
    const store = useSlideRuleStore()
    store.importedRule = circularStructure()
    store.setModel('imported')
    store.setDiscOffset(0.3)

    const def57 = builtInRuleDefinitions().find((d) => d.id === '57')!
    store.loadRule(JSON.stringify(def57))

    expect(store.discOffset).toBe(0)
    expect(store.isCircular).toBe(false)
  })

  it('resets both the slide and the rotor with resetMotion', () => {
    const store = useSlideRuleStore()
    store.resetMotion()
    store.middleOffset = 0.4
    store.setDiscOffset(0.3)
    store.resetMotion()
    expect(store.middleOffset).toBe(0)
    expect(store.discOffset).toBe(0)
  })
})

describe('slideRule store - circular faces', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows a two-faced circular rule dual by default, and single on request', () => {
    const store = useSlideRuleStore()
    store.importedRule = twoFacedCircularStructure()
    store.setModel('imported')

    expect(store.isCircular).toBe(true)
    // Like the linear rule, a two-faced disc opens dual (both discs stacked).
    expect(store.dualFace).toBe(true)
    expect(store.visibleSides).toEqual(['front', 'back'])

    store.setDualFace(false)
    expect(store.dualFace).toBe(false)
    expect(store.visibleSides).toEqual(['front'])

    store.setSide('back')
    expect(store.currentSide).toBe('back')
    expect(store.visibleSides).toEqual(['back'])
  })
})

describe('slideRule store - operation log', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('records operations in order and clears them', () => {
    const store = useSlideRuleStore()
    store.logOperation('first')
    store.logOperation('second')
    expect(store.operationHistory).toEqual(['first', 'second'])
    store.clearHistory()
    expect(store.operationHistory).toEqual([])
  })
})
