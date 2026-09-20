// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { builtInRuleDefinitions } from '@slide-rule/core'
import { buildRule } from '@slide-rule/generator'
import {
  addInterval,
  addIntervalLabel,
  addIntervalStep,
  addLabel,
  addMark,
  addNote,
  addScale,
  addSharedLabel,
  calculationRef,
  defaultMap,
  definitionToSpec,
  detectDocument,
  duplicateScale,
  emptySpec,
  getCalculation,
  moveScale,
  noteToParts,
  partsToNote,
  removeInterval,
  removeIntervalLabel,
  removeIntervalStep,
  removeLabel,
  removeMark,
  removeNote,
  removeScale,
  removeSharedLabel,
  seedPreset,
  setCalculation,
  setDecreasing,
  setDomain,
  setForm,
  setLabel,
  setMark,
  setNote,
  setRead,
  updateInterval,
  updateIntervalLabel,
  updateIntervalStep,
  updatePhysical,
  updateRule,
  updateDisc,
  uniqueFrom,
  updateScale,
  updateSharedLabel,
  serializeJson,
} from './model'

const builtin1002 = builtInRuleDefinitions().find((d) => d.id === '1002')!

describe('definitionToSpec', () => {
  it('round-trips a built-in losslessly through buildRule', () => {
    const spec = definitionToSpec(builtin1002)
    expect('schemaVersion' in spec).toBe(false)
    const built = buildRule(spec)
    expect(built.ok).toBe(true)
    if (built.ok) expect(built.rule).toEqual(builtin1002)
  })
})

describe('detectDocument', () => {
  it('adapts a RuleDefinition (schemaVersion present)', () => {
    expect(detectDocument(builtin1002)).toEqual(definitionToSpec(builtin1002))
  })
  it('passes a RuleSpec through as a clone', () => {
    const spec = { id: 'x', name: 'x', physical: builtin1002.physical, faces: builtin1002.faces }
    const out = detectDocument(spec)
    expect(out).toEqual(spec)
    expect(out).not.toBe(spec)
  })
})

describe('scale tree operations', () => {
  it('adds a unique scale id to an empty section', () => {
    const spec = emptySpec()
    const once = addScale(spec, 'front', 'upper')
    expect(once.faces.front.upper).toHaveLength(1)
    expect(once.faces.front.upper[0].id).toBe('C')
    const twice = addScale(once, 'front', 'upper')
    expect(twice.faces.front.upper[1].id).toBe('C2')
  })
  it('inserts at a given index instead of appending', () => {
    const spec = addScale(addScale(emptySpec(), 'front', 'upper'), 'front', 'upper')
    const ids = spec.faces.front.upper.map((s) => s.id)
    const inserted = addScale(spec, 'front', 'upper', 1)
    expect(inserted.faces.front.upper.map((s) => s.id)).toEqual([ids[0], 'C3', ids[1]])
  })
  it('removes by index without touching other sections', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    expect(removeScale(spec, 'front', 'upper', 0).faces.front.upper).toHaveLength(0)
  })
  it('moves a scale within its section, clamped', () => {
    const spec = addScale(addScale(emptySpec(), 'front', 'upper'), 'front', 'upper')
    const ids = spec.faces.front.upper.map((s) => s.id)
    const moved = moveScale(spec, 'front', 'upper', 1, -1).faces.front.upper.map((s) => s.id)
    expect(moved[0]).toBe(ids[1])
    const clamped = moveScale(spec, 'front', 'upper', 0, -1).faces.front.upper.map((s) => s.id)
    expect(clamped).toEqual(ids)
  })
})

describe('uniqueFrom', () => {
  it('returns the base when free, else the next free suffix', () => {
    expect(uniqueFrom([], 'C')).toBe('C')
    expect(uniqueFrom([{ id: 'C' }], 'C')).toBe('C2')
    expect(uniqueFrom([{ id: 'C' }, { id: 'C2' }], 'C')).toBe('C3')
    expect(uniqueFrom([{ id: 'co' }], 'co')).toBe('co2')
  })
})

describe('metadata operations', () => {
  it('updates rule id/name immutably', () => {
    const spec = emptySpec()
    const next = updateRule(spec, { id: 'mine', name: 'Mine' })
    expect(next.id).toBe('mine')
    expect(spec.id).toBe('new-rule')
  })
  it('sets circular form with a default disc and clears it again', () => {
    const circular = setForm(emptySpec(), 'circular')
    expect(circular.form).toBe('circular')
    expect(circular.disc).toBeDefined()
    expect(updateDisc(circular, { outerRadiusMm: 50 }).disc?.outerRadiusMm).toBe(50)
    expect(setForm(circular, 'linear').disc).toBeUndefined()
  })
  it('updates a physical field', () => {
    expect(updatePhysical(emptySpec(), { faceWidthMm: 100 }).physical?.faceWidthMm).toBe(100)
  })
})

describe('serializeJson', () => {
  it('pretty-prints with a trailing newline', () => {
    expect(serializeJson({ a: 1 })).toBe('{\n  "a": 1\n}\n')
  })
})

describe('scale field operations', () => {
  it('updates scalar fields without touching the calculation', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    const before = spec.faces.front.upper[0].calculation
    const next = updateScale(spec, 'front', 'upper', 0, {
      name: 'D',
      type: 'D',
      orientation: 'decreasing',
      numbersBelow: true,
      tickEdge: 'roof',
    })
    const scale = next.faces.front.upper[0]
    expect(scale.name).toBe('D')
    expect(scale.orientation).toBe('decreasing')
    expect(scale.numbersBelow).toBe(true)
    expect(scale.tickEdge).toBe('roof')
    expect(scale.calculation).toEqual(before)
    expect(spec.faces.front.upper[0].name).toBe('C') // immutability
  })

  it('clears tickEdge when the patch sets undefined', () => {
    const spec = updateScale(addScale(emptySpec(), 'front', 'upper'), 'front', 'upper', 0, {
      tickEdge: 'roof',
    })
    const next = updateScale(spec, 'front', 'upper', 0, { tickEdge: undefined })
    expect(next.faces.front.upper[0].tickEdge).toBeUndefined()
    expect('tickEdge' in next.faces.front.upper[0]).toBe(false)
  })

  it('duplicates a scale after itself with a unique id and a deep-cloned calculation', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    const next = duplicateScale(spec, 'front', 'upper', 0)
    const list = next.faces.front.upper
    expect(list).toHaveLength(2)
    expect(list[1].id).toBe('C2')
    expect(list[1].name).toBe('C')
    expect(list[1].calculation).toEqual(list[0].calculation)
    expect(list[1].calculation).not.toBe(list[0].calculation)
  })

  it('duplicates onto the next free id when the base id is taken', () => {
    const spec = addScale(addScale(emptySpec(), 'front', 'upper'), 'front', 'upper')
    expect(spec.faces.front.upper.map((s) => s.id)).toEqual(['C', 'C2'])
    const next = duplicateScale(spec, 'front', 'upper', 0)
    expect(next.faces.front.upper.map((s) => s.id)).toEqual(['C', 'C3', 'C2'])
  })
})

describe('shared label operations', () => {
  it('adds, updates and removes a shared label', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    const added = addSharedLabel(spec, 'front', 'upper', 0)
    expect(added.faces.front.upper[0].sharedLabels).toHaveLength(1)
    const updated = updateSharedLabel(added, 'front', 'upper', 0, 0, {
      name: 'cos',
      orientation: 'increasing',
      format: 'bare',
    })
    expect(updated.faces.front.upper[0].sharedLabels?.[0]).toMatchObject({
      name: 'cos',
      orientation: 'increasing',
      format: 'bare',
    })
    const removed = removeSharedLabel(updated, 'front', 'upper', 0, 0)
    expect(removed.faces.front.upper[0].sharedLabels).toHaveLength(0)
  })

  it('mints a unique shared-label id', () => {
    const once = addSharedLabel(addScale(emptySpec(), 'front', 'upper'), 'front', 'upper', 0)
    const twice = addSharedLabel(once, 'front', 'upper', 0)
    expect(twice.faces.front.upper[0].sharedLabels?.map((l) => l.id)).toEqual(['co', 'co2'])
  })

  it('ignores an out-of-range shared-label removal', () => {
    const spec = addSharedLabel(addScale(emptySpec(), 'front', 'upper'), 'front', 'upper', 0)
    const next = removeSharedLabel(spec, 'front', 'upper', 0, 5)
    expect(next.faces.front.upper[0].sharedLabels).toHaveLength(1)
  })

  it('clears a shared-label field when the patch sets undefined', () => {
    const added = addSharedLabel(addScale(emptySpec(), 'front', 'upper'), 'front', 'upper', 0)
    const withFormat = updateSharedLabel(added, 'front', 'upper', 0, 0, { format: 'bare' })
    const cleared = updateSharedLabel(withFormat, 'front', 'upper', 0, 0, { format: undefined })
    const label = cleared.faces.front.upper[0].sharedLabels?.[0]
    expect(label !== undefined && 'format' in label).toBe(false)
  })
})

describe('note operations', () => {
  it('round-trips a string note and a red-part note', () => {
    expect(noteToParts('.1→1')).toEqual([{ text: '.1→1' }])
    expect(partsToNote([{ text: '.1→1' }])).toBe('.1→1')
    expect(partsToNote([{ text: 'cos', red: true }])).toEqual([{ text: 'cos', red: true }])
    expect(noteToParts([{ text: 'a' }, { text: 'b', red: true }])).toEqual([
      { text: 'a' },
      { text: 'b', red: true },
    ])
  })

  it('adds, sets and removes notes', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    const one = addNote(spec, 'front', 'upper', 0)
    expect(one.faces.front.upper[0].notes).toEqual([''])
    const set = setNote(one, 'front', 'upper', 0, 0, 'x→y')
    expect(set.faces.front.upper[0].notes).toEqual(['x→y'])
    expect(removeNote(set, 'front', 'upper', 0, 0).faces.front.upper[0].notes).toHaveLength(0)
  })
})

describe('calculation targets and scalar ops', () => {
  const target = { kind: 'scale', face: 'front', section: 'upper', index: 0 } as const

  it('reads and writes an inline calculation', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    expect(getCalculation(spec, target)?.map).toEqual({ kind: 'log', anchor: 1 })
    const next = setDomain(spec, target, [2, 20])
    expect(getCalculation(next, target)?.domain).toEqual([2, 20])
    expect(getCalculation(spec, target)?.domain).toEqual([1, 10])
  })

  it('edits a named calculation through a ref and updates every sharer', () => {
    const spec = emptySpec()
    spec.calculations = { cd: { domain: [1, 10], map: { kind: 'log', anchor: 1 }, intervals: [] } }
    spec.faces.front.upper.push({
      id: 'C',
      name: 'C',
      type: 'C',
      orientation: 'increasing',
      calculation: { ref: 'cd' },
    })
    spec.faces.front.upper.push({
      id: 'D',
      name: 'D',
      type: 'D',
      orientation: 'increasing',
      calculation: { ref: 'cd' },
    })
    expect(calculationRef(spec, 'front', 'upper', 0)).toBe('cd')
    const next = setDomain(spec, { kind: 'named', name: 'cd' }, [3, 30])
    expect(next.calculations?.cd.domain).toEqual([3, 30])
    expect(
      getCalculation(next, { kind: 'scale', face: 'front', section: 'upper', index: 1 })?.domain,
    ).toEqual([3, 30])
    expect(calculationRef(next, 'front', 'upper', 0)).toBe('cd') // still a ref
  })

  it('writes a scale ref through to its named calculation instead of inlining', () => {
    const spec = emptySpec()
    spec.calculations = { cd: { domain: [1, 10], map: { kind: 'log', anchor: 1 }, intervals: [] } }
    spec.faces.front.upper.push({
      id: 'C',
      name: 'C',
      type: 'C',
      orientation: 'increasing',
      calculation: { ref: 'cd' },
    })
    const next = setCalculation(spec, target, {
      domain: [2, 20],
      map: { kind: 'log', anchor: 1 },
      intervals: [],
    })
    expect(next.calculations?.cd.domain).toEqual([2, 20])
    expect(next.faces.front.upper[0].calculation).toEqual({ ref: 'cd' })
  })

  it('returns null for a scale pointing at a missing ref', () => {
    const spec = emptySpec()
    spec.faces.front.upper.push({
      id: 'C',
      name: 'C',
      type: 'C',
      orientation: 'increasing',
      calculation: { ref: 'gone' },
    })
    expect(getCalculation(spec, target)).toBeNull()
  })

  it('clears optional fields by deleting the key', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    const withRead = setRead(spec, target, { kind: 'reciprocal', scale: 10 })
    expect(getCalculation(withRead, target)?.read).toEqual({ kind: 'reciprocal', scale: 10 })
    const cleared = setRead(withRead, target, undefined)
    expect('read' in (getCalculation(cleared, target) as object)).toBe(false)
  })

  it('sets and clears the decreasing flag by deleting the key', () => {
    const spec = addScale(emptySpec(), 'front', 'upper')
    const mirrored = setDecreasing(spec, target, true)
    expect(getCalculation(mirrored, target)?.decreasing).toBe(true)
    const cleared = setDecreasing(mirrored, target, undefined)
    expect('decreasing' in (getCalculation(cleared, target) as object)).toBe(false)
  })

  it('defaults a map for each kind', () => {
    expect(defaultMap('log')).toEqual({ kind: 'log', anchor: 1 })
    expect(defaultMap('linear')).toEqual({ kind: 'linear' })
    expect(defaultMap('fn')).toEqual({ kind: 'fn', fn: 'ln', from: 1 })
    expect(defaultMap('valueFn')).toEqual({ kind: 'valueFn', fn: 'cosh', from: 1 })
    expect(defaultMap('expr')).toEqual({ kind: 'expr', position: 'log10(x)' })
  })

  it('seeds a preset calculation through the generator', () => {
    const calc = seedPreset('expr', [1, 10])
    expect(calc.map).toEqual({ kind: 'expr', position: 'log10(x)' })
    expect(calc.domain).toEqual([1, 10])
    expect(calc.intervals.length).toBeGreaterThan(0)
  })
})

describe('calculation list operations', () => {
  const target = { kind: 'scale', face: 'front', section: 'upper', index: 0 } as const
  const seeded = () => addScale(emptySpec(), 'front', 'upper')

  it('adds, updates and removes an interval and its steps/labels', () => {
    let spec = seeded()
    spec = addInterval(spec, target)
    const calc = () => getCalculation(spec, target)!
    expect(calc().intervals).toHaveLength(2)
    spec = updateInterval(spec, target, 1, { from: 2, to: 5 })
    expect(calc().intervals[1]).toMatchObject({ from: 2, to: 5 })
    spec = addIntervalStep(spec, target, 1)
    expect(calc().intervals[1].steps).toHaveLength(2)
    spec = updateIntervalStep(spec, target, 1, 1, { step: 0.5, level: 2 })
    expect(calc().intervals[1].steps[1]).toEqual({ step: 0.5, level: 2 })
    spec = addIntervalLabel(spec, target, 1)
    expect(calc().intervals[1].labels).toHaveLength(1)
    spec = updateIntervalLabel(spec, target, 1, 0, 3)
    expect(calc().intervals[1].labels?.[0]).toBe(3)
    spec = removeIntervalLabel(spec, target, 1, 0)
    expect(calc().intervals[1].labels).toHaveLength(0)
    spec = removeIntervalStep(spec, target, 1, 1)
    expect(calc().intervals[1].steps).toHaveLength(1)
    spec = removeInterval(spec, target, 1)
    expect(calc().intervals).toHaveLength(1)
  })

  it('adds, sets and removes calculation labels', () => {
    let spec = seeded()
    spec = addLabel(spec, target)
    const calc = () => getCalculation(spec, target)!
    expect(calc().labels).toHaveLength(1)
    spec = setLabel(spec, target, 0, { value: 3, text: 'three' })
    expect(calc().labels?.[0]).toEqual({ value: 3, text: 'three' })
    spec = setLabel(spec, target, 0, 7)
    expect(calc().labels?.[0]).toBe(7)
    spec = removeLabel(spec, target, 0)
    expect(calc().labels).toHaveLength(0)
  })

  it('adds, sets and removes marks', () => {
    let spec = seeded()
    spec = addMark(spec, target)
    const calc = () => getCalculation(spec, target)!
    expect(calc().marks).toHaveLength(1)
    spec = setMark(spec, target, 0, { value: 'infinity', label: '∞' })
    expect(calc().marks?.[0]).toEqual({ value: 'infinity', label: '∞' })
    spec = removeMark(spec, target, 0)
    expect(calc().marks).toHaveLength(0)
  })
})
