// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDesignerStore } from './store'

beforeEach(() => setActivePinia(createPinia()))

describe('designer store', () => {
  it('seeds the 1002 and builds a valid definition with a preview rule', () => {
    const store = useDesignerStore()
    store.seed('1002')
    expect(store.buildResult.ok).toBe(true)
    expect(store.definition?.id).toBe('1002')
    expect(store.previewRule).not.toBeNull()
    expect(store.errors).toHaveLength(0)
  })
  it('reports build errors for an invalid spec', () => {
    const store = useDesignerStore()
    store.setRule({ id: '' })
    store.setPhysical({ faceWidthMm: -1 })
    expect(store.buildResult.ok).toBe(false)
    expect(store.errors.length).toBeGreaterThan(0)
  })
  it('keeps the last valid preview and marks it stale when the spec is temporarily invalid', () => {
    const store = useDesignerStore()
    store.seed('1002')
    expect(store.previewRule).not.toBeNull()
    expect(store.isStale).toBe(false)
    store.setPhysical({ faceWidthMm: -1 })
    expect(store.previewRule).not.toBeNull()
    expect(store.isStale).toBe(true)
  })
  it('imports a RuleDefinition JSON and a RuleSpec JSON', () => {
    const store = useDesignerStore()
    const def = JSON.stringify({
      schemaVersion: 1,
      id: 'imp',
      name: 'Imported',
      physical: {
        faceWidthMm: 152.4,
        faceHeightMm: 25.4,
        rowCount: { upper: 2, middle: 4, lower: 3 },
        grooveRowRatio: 0.7,
        marginRowRatio: 0.4,
        leftGutterMm: 13.05,
        rightPanelMm: 9.85,
        numeralRatio: 0.6,
      },
      faces: {
        front: { upper: [], middle: [], lower: [] },
        back: { upper: [], middle: [], lower: [] },
      },
    })
    expect(store.loadText(def)).toBe(true)
    expect(store.spec.id).toBe('imp')
    expect(store.importError).toBeNull()

    const spec = JSON.stringify({
      id: 'imp-spec',
      name: 'Imported spec',
      physical: {
        faceWidthMm: 152.4,
        faceHeightMm: 25.4,
        rowCount: { upper: 2, middle: 4, lower: 3 },
        grooveRowRatio: 0.7,
        marginRowRatio: 0.4,
        leftGutterMm: 13.05,
        rightPanelMm: 9.85,
        numeralRatio: 0.6,
      },
      faces: {
        front: { upper: [], middle: [], lower: [] },
        back: { upper: [], middle: [], lower: [] },
      },
    })
    expect(store.loadText(spec)).toBe(true)
    expect(store.spec.id).toBe('imp-spec')
    expect('schemaVersion' in store.spec).toBe(false)

    expect(store.loadText('123')).toBe(false)
    expect(store.importError).not.toBeNull()
    expect(store.loadText('{not json')).toBe(false)
    expect(store.importError).not.toBeNull()
  })
  it('adds, selects, moves and removes a scale', () => {
    const store = useDesignerStore()
    store.seed('57')
    store.addScale('front', 'upper')
    store.addScale('front', 'upper')
    const list = store.spec.faces.front.upper
    const added = list.at(-1)!
    const index = list.length - 1
    store.select('front', 'upper', index)
    expect(store.selection?.index).toBe(index)
    expect(store.selectedScale?.scale.id).toBe(added.id)
    store.moveScale(-1)
    expect(store.spec.faces.front.upper.findIndex((s) => s.id === added.id)).toBe(index - 1)
    expect(store.selection?.index).toBe(index - 1)
    store.removeScale()
    expect(store.spec.faces.front.upper.some((s) => s.id === added.id)).toBe(false)
    expect(store.selection).toBeNull()
  })
  it('inserts a scale after the selected one and selects it', () => {
    const store = useDesignerStore()
    store.seed('57')
    store.addScale('front', 'upper')
    store.addScale('front', 'upper')
    const before = store.spec.faces.front.upper.map((s) => s.id)
    store.select('front', 'upper', 0)
    store.addScale('front', 'upper', 0)
    const after = store.spec.faces.front.upper.map((s) => s.id)
    const insertedId = after[1]
    expect(after).toEqual([before[0], insertedId, ...before.slice(1)])
    expect(store.selection).toEqual({ face: 'front', section: 'upper', index: 1 })
  })
  it('switches to the circular form and still builds', () => {
    const store = useDesignerStore()
    store.seed('57')
    store.setForm('circular')
    expect(store.isCircular).toBe(true)
    expect(store.buildResult.ok).toBe(true)
  })
})

describe('designer store scale fields', () => {
  it('has no selected scale before a selection', () => {
    const store = useDesignerStore()
    store.seed('57')
    expect(store.selectedScale).toBeNull()
  })

  it('exposes the selected scale and edits its fields', () => {
    const store = useDesignerStore()
    store.seed('57')
    const scale = store.spec.faces.front.upper[0] // K
    store.select('front', 'upper', 0)
    expect(store.selectedScale?.scale.id).toBe(scale.id)
    store.setScaleField({ name: 'cube', orientation: 'decreasing' })
    expect(store.selectedScale?.scale.name).toBe('cube')
    expect(store.selectedScale?.scale.orientation).toBe('decreasing')
  })

  it('keeps the selection index across an id rename', () => {
    const store = useDesignerStore()
    store.seed('57')
    store.select('front', 'upper', 0)
    store.setScaleField({ id: 'K2' })
    expect(store.selection?.index).toBe(0)
    expect(store.selectedScale?.scale.id).toBe('K2')
  })

  it('targets the selected index when a rename collides with an earlier id', () => {
    const store = useDesignerStore()
    store.seed('57')
    // Index 1 is A; renaming it to K makes the ids collide (K, K), so the build
    // is invalid - that is expected. Later edits must still land on index 1.
    store.select('front', 'upper', 1)
    store.setScaleField({ id: 'K' })
    expect(store.buildResult.ok).toBe(false)
    store.setScaleField({ name: 'second' })
    expect(store.spec.faces.front.upper[1].name).toBe('second')
    expect(store.spec.faces.front.upper[0].name).toBe('K')
    // The selected (renamed) scale is still the same one after a move.
    store.moveScale(-1)
    expect(store.selection?.index).toBe(0)
    expect(store.spec.faces.front.upper[0].name).toBe('second')
  })

  it('duplicates the selected scale', () => {
    const store = useDesignerStore()
    store.seed('57')
    const scale = store.spec.faces.front.upper[0]
    store.select('front', 'upper', 0)
    store.duplicateScale()
    expect(store.spec.faces.front.upper.map((s) => s.id)).toContain(`${scale.id}2`)
  })

  it('edits shared labels and notes as parts', () => {
    const store = useDesignerStore()
    store.seed('57')
    store.select('front', 'upper', 0)
    store.addSharedLabel()
    store.updateSharedLabel(0, { name: 'ctg', format: 'bare' })
    expect(store.selectedScale?.scale.sharedLabels?.[0]).toMatchObject({
      name: 'ctg',
      format: 'bare',
    })
    // The seeded K scale already carries an "x³" note, so addNote appends and
    // the new note is the last entry.
    store.addNote()
    const noteIndex = (store.selectedScale?.scale.notes?.length ?? 0) - 1
    store.setNoteParts(noteIndex, [{ text: 'cos', red: true }])
    expect(store.selectedScale?.scale.notes?.[noteIndex]).toEqual([{ text: 'cos', red: true }])
    store.removeNote(noteIndex)
    expect(store.selectedScale?.scale.notes).toHaveLength(1)
  })
})

describe('designer store calculation', () => {
  it('exposes the selected calculation and edits it', () => {
    const store = useDesignerStore()
    store.seed('57')
    const index = store.spec.faces.front.middle.findIndex((s) => s.id === 'C')
    store.select('front', 'middle', index)
    expect(store.selectedCalculation?.map.kind).toBe('log')
    store.setDomain([2, 20])
    expect(store.selectedCalculation?.domain).toEqual([2, 20])
    store.setMap({ kind: 'linear' })
    expect(store.selectedCalculation?.map).toEqual({ kind: 'linear' })
  })

  it('toggles the decreasing flag on the selected calculation', () => {
    const store = useDesignerStore()
    store.seed('57')
    const index = store.spec.faces.front.middle.findIndex((s) => s.id === 'C')
    store.select('front', 'middle', index)
    store.setDecreasing(true)
    expect(store.selectedCalculation?.decreasing).toBe(true)
    store.setDecreasing(undefined)
    expect('decreasing' in (store.selectedCalculation as object)).toBe(false)
  })

  it('seeds a preset calculation', () => {
    const store = useDesignerStore()
    store.seed('57')
    store.select('front', 'middle', 0)
    store.seedCalculationPreset('valueFn')
    expect(store.selectedCalculation?.map).toEqual({ kind: 'valueFn', fn: 'cosh', from: 1 })
  })

  it('edits a ref calculation through its named entry', () => {
    const store = useDesignerStore()
    store.loadText(
      JSON.stringify({
        id: 'ref-rule',
        name: 'Ref',
        physical: {
          faceWidthMm: 152.4,
          faceHeightMm: 25.4,
          rowCount: { upper: 2, middle: 4, lower: 3 },
          grooveRowRatio: 0.7,
          marginRowRatio: 0.4,
          leftGutterMm: 13.05,
          rightPanelMm: 9.85,
          numeralRatio: 0.6,
        },
        calculations: { cd: { domain: [1, 10], map: { kind: 'log', anchor: 1 }, intervals: [] } },
        faces: {
          front: {
            upper: [
              {
                id: 'C',
                name: 'C',
                type: 'C',
                orientation: 'increasing',
                calculation: { ref: 'cd' },
              },
            ],
            middle: [],
            lower: [],
          },
          back: { upper: [], middle: [], lower: [] },
        },
      }),
    )
    store.select('front', 'upper', 0)
    expect(store.calculationTarget?.kind).toBe('named')
    expect(store.selectedCalculation?.domain).toEqual([1, 10])
    store.setDomain([2, 20])
    expect(store.spec.calculations?.cd.domain).toEqual([2, 20])
    expect(store.spec.faces.front.upper[0].calculation).toEqual({ ref: 'cd' })
  })
})

describe('designer store draft', () => {
  it('exposes a clearDraft action and a draftRestored flag', () => {
    const store = useDesignerStore()
    expect(typeof store.clearDraft).toBe('function')
    expect(store.draftRestored).toBe(false) // no localStorage in node
  })
})

describe('designer store templates', () => {
  it('loads a starter template by id, clears the selection and builds', () => {
    const store = useDesignerStore()
    store.seed('57')
    store.select('front', 'upper', 0)
    store.loadTemplate('linearLog')
    expect(store.spec.id).toBe('template-linear')
    expect(store.selection).toBeNull()
    expect(store.buildResult.ok).toBe(true)
  })

  it('resolves a circular template by id', () => {
    const store = useDesignerStore()
    store.loadTemplate('circularCd')
    expect(store.isCircular).toBe(true)
  })

  it('ignores an unknown template id', () => {
    const store = useDesignerStore()
    store.setRule({ id: 'keep-me' })
    store.loadTemplate('missing')
    expect(store.spec.id).toBe('keep-me')
  })
})
