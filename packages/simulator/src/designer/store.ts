// Designer state. Thin: all edits go through the pure model, and the derived
// build/preview come from the generator and core.
import { computed, ref, shallowRef, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import { builtInRuleDefinitions, parseRule } from '@slide-rule/core'
import type {
  DiscSpec,
  IntervalSpec,
  LabelFormatSpec,
  LabelSpec,
  MapSpec,
  MarkSpec,
  NotePartSpec,
  PhysicalSpec,
  ReadSpec,
  RuleForm,
  SharedLabelSpec,
  SlideRuleStructure,
} from '@slide-rule/core'
import { buildRule } from '@slide-rule/generator'
import type { BuildError, BuildResult, RuleSpec, ScaleSpecInput } from '@slide-rule/generator'
import {
  addInterval as addIntervalOp,
  addIntervalLabel as addIntervalLabelOp,
  addIntervalStep as addIntervalStepOp,
  addLabel as addLabelOp,
  addMark as addMarkOp,
  addNote as addNoteOp,
  addScale as addScaleOp,
  addSharedLabel as addSharedLabelOp,
  calculationRef,
  definitionToSpec,
  detectDocument,
  duplicateScale as duplicateScaleOp,
  emptySpec,
  getCalculation,
  moveScale as moveScaleOp,
  partsToNote,
  removeInterval as removeIntervalOp,
  removeIntervalLabel as removeIntervalLabelOp,
  removeIntervalStep as removeIntervalStepOp,
  removeLabel as removeLabelOp,
  removeMark as removeMarkOp,
  removeNote as removeNoteOp,
  removeScale as removeScaleOp,
  removeSharedLabel as removeSharedLabelOp,
  seedPreset,
  setCalculation as setCalculationOp,
  setDecades as setDecadesOp,
  setDecreasing as setDecreasingOp,
  setDomain as setDomainOp,
  setForm as setFormOp,
  setLabel as setLabelOp,
  setLabelFormat as setLabelFormatOp,
  setLabelLevel as setLabelLevelOp,
  setMap as setMapOp,
  setMark as setMarkOp,
  setNote as setNoteOp,
  setRead as setReadOp,
  serializeJson,
  updateDisc as updateDiscOp,
  updateInterval as updateIntervalOp,
  updateIntervalLabel as updateIntervalLabelOp,
  updateIntervalStep as updateIntervalStepOp,
  updatePhysical as updatePhysicalOp,
  updateRule as updateRuleOp,
  updateScale as updateScaleOp,
  updateSharedLabel as updateSharedLabelOp,
  type CalculationTarget,
  type FaceName,
  type PresetKind,
  type ScaleFieldPatch,
} from './model'
import { clearDraft, loadDraft, saveDraft } from './draft'
import { templateSpecs } from './templates'

export interface DesignerSelection {
  face: FaceName
  section: 'upper' | 'middle' | 'lower'
  index: number
}

export const useDesignerStore = defineStore('designer', () => {
  // The spec is replaced wholesale by every pure op, so a shallow ref is both
  // sufficient and required: a deep ref proxy cannot be structured-cloned.
  const spec = shallowRef<RuleSpec>(emptySpec())
  const selection = ref<DesignerSelection | null>(null)
  const importError = ref<string | null>(null)

  // Restore a saved draft once on creation, then persist every replacement.
  const draftRestored = ref(false)
  const restored = loadDraft()
  if (restored !== null) {
    spec.value = restored
    draftRestored.value = true
  }
  // Synchronous so tests and event handlers see storage and the store agree;
  // suppressSave lets an explicit replacement (clearDraft) update the spec
  // without the watcher immediately re-saving the empty rule.
  let suppressSave = false
  watch(
    spec,
    (next) => {
      if (!suppressSave) saveDraft(next)
    },
    { flush: 'sync' },
  )

  function clearDraftAction(): void {
    suppressSave = true
    try {
      spec.value = emptySpec()
      clearDraft()
      draftRestored.value = false
      selection.value = null
      importError.value = null
    } finally {
      suppressSave = false
    }
  }

  const buildResult: ComputedRef<BuildResult> = computed(() => buildRule(spec.value))
  const definition = computed(() => (buildResult.value.ok ? buildResult.value.rule : null))
  const errors: ComputedRef<BuildError[]> = computed(() =>
    buildResult.value.ok ? [] : buildResult.value.errors,
  )
  const currentPreview = computed<SlideRuleStructure | null>(() => {
    const def = definition.value
    if (def === null) return null
    const parsed = parseRule(def)
    return parsed.ok ? parsed.rule : null
  })
  // Keep the last valid preview so a temporarily invalid spec still shows
  // something; isStale tells the panel to mark that rendering as out of date.
  const lastGoodPreview = ref<SlideRuleStructure | null>(null)
  // Sync flush: the store is used from plain (non-component) tests and event
  // handlers, where a deferred watcher would leave lastGoodPreview one edit
  // behind.
  watch(
    currentPreview,
    (value) => {
      if (value !== null) lastGoodPreview.value = value
    },
    { flush: 'sync' },
  )
  const previewRule = computed(() => currentPreview.value ?? lastGoodPreview.value)
  const isStale = computed(() => currentPreview.value === null && lastGoodPreview.value !== null)
  const isCircular = computed(() => spec.value.form === 'circular')
  const selectedScale = computed((): { scale: ScaleSpecInput } | null => {
    const s = selection.value
    if (s === null) return null
    const scale = spec.value.faces[s.face][s.section][s.index]
    return scale === undefined ? null : { scale }
  })
  // The calculation being edited is either inline on the selected scale or a
  // named entry the scale points at with a ref. Resolve the ref so both shapes
  // edit the same underlying calculation.
  const calculationTarget = computed((): CalculationTarget | null => {
    const s = selection.value
    if (s === null) return null
    const ref = calculationRef(spec.value, s.face, s.section, s.index)
    return ref === null
      ? { kind: 'scale', face: s.face, section: s.section, index: s.index }
      : { kind: 'named', name: ref }
  })
  const selectedCalculation = computed(() => {
    const target = calculationTarget.value
    return target === null ? null : getCalculation(spec.value, target)
  })

  function seed(id: string): void {
    const def = builtInRuleDefinitions().find((d) => d.id === id)
    if (def !== undefined) {
      spec.value = definitionToSpec(def)
      selection.value = null
      importError.value = null
      draftRestored.value = false
    }
  }

  function loadText(text: string): boolean {
    try {
      const parsed: unknown = JSON.parse(text)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        importError.value = 'imported JSON must be an object'
        return false
      }
      spec.value = detectDocument(parsed)
      selection.value = null
      importError.value = null
      draftRestored.value = false
      return true
    } catch (error) {
      importError.value = error instanceof Error ? error.message : String(error)
      return false
    }
  }

  function newSpec(): void {
    spec.value = emptySpec()
    selection.value = null
    importError.value = null
    draftRestored.value = false
  }

  function loadTemplate(id: string): void {
    const template = templateSpecs().find((t) => t.id === id)
    if (template !== undefined) {
      spec.value = structuredClone(template.spec)
      selection.value = null
      importError.value = null
      draftRestored.value = false
    }
  }

  function select(face: FaceName, section: DesignerSelection['section'], index: number): void {
    selection.value = { face, section, index }
  }
  function clearSelection(): void {
    selection.value = null
  }
  // `afterIndex` inserts the new scale just after that position; omit it to
  // append. The new scale becomes the selection either way.
  function addScale(
    face: FaceName,
    section: DesignerSelection['section'],
    afterIndex?: number,
  ): void {
    const at = afterIndex === undefined ? spec.value.faces[face][section].length : afterIndex + 1
    spec.value = addScaleOp(spec.value, face, section, at)
    selection.value = { face, section, index: at }
  }
  function removeScale(): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = removeScaleOp(spec.value, s.face, s.section, s.index)
    selection.value = null
  }
  function moveScale(delta: number): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    const target = s.index + delta
    const list = spec.value.faces[s.face][s.section]
    if (target < 0 || target >= list.length) return
    spec.value = moveScaleOp(spec.value, s.face, s.section, s.index, delta)
    selection.value = { ...s, index: target }
  }
  function setRule(patch: Partial<Pick<RuleSpec, 'id' | 'name'>>): void {
    spec.value = updateRuleOp(spec.value, patch)
  }
  function setPhysical(patch: Partial<PhysicalSpec>): void {
    spec.value = updatePhysicalOp(spec.value, patch)
  }
  function setForm(form: RuleForm): void {
    spec.value = setFormOp(spec.value, form)
  }
  function setDisc(patch: Partial<DiscSpec>): void {
    spec.value = updateDiscOp(spec.value, patch)
  }
  function setScaleField(patch: ScaleFieldPatch): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = updateScaleOp(spec.value, s.face, s.section, s.index, patch)
  }
  function duplicateScale(): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = duplicateScaleOp(spec.value, s.face, s.section, s.index)
  }
  function addSharedLabel(): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = addSharedLabelOp(spec.value, s.face, s.section, s.index)
  }
  function removeSharedLabel(labelIndex: number): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = removeSharedLabelOp(spec.value, s.face, s.section, s.index, labelIndex)
  }
  function updateSharedLabel(labelIndex: number, patch: Partial<SharedLabelSpec>): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = updateSharedLabelOp(spec.value, s.face, s.section, s.index, labelIndex, patch)
  }
  function addNote(): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = addNoteOp(spec.value, s.face, s.section, s.index)
  }
  function removeNote(noteIndex: number): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = removeNoteOp(spec.value, s.face, s.section, s.index, noteIndex)
  }
  function setNoteParts(noteIndex: number, parts: NotePartSpec[]): void {
    const s = selection.value
    if (s === null || selectedScale.value === null) return
    spec.value = setNoteOp(spec.value, s.face, s.section, s.index, noteIndex, partsToNote(parts))
  }
  function setDomain(domain: [number, number]): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setDomainOp(spec.value, target, domain)
  }
  function setDecades(decades: number | undefined): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setDecadesOp(spec.value, target, decades)
  }
  function setDecreasing(decreasing: boolean | undefined): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setDecreasingOp(spec.value, target, decreasing)
  }
  function setRead(read: ReadSpec | undefined): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setReadOp(spec.value, target, read)
  }
  function setLabelFormat(labelFormat: LabelFormatSpec | undefined): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setLabelFormatOp(spec.value, target, labelFormat)
  }
  function setLabelLevel(labelLevel: 1 | 2 | 3 | 'keep' | undefined): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setLabelLevelOp(spec.value, target, labelLevel)
  }
  function setMap(next: MapSpec): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setMapOp(spec.value, target, next)
  }
  function seedCalculationPreset(kind: PresetKind): void {
    const target = calculationTarget.value
    const calc = selectedCalculation.value
    if (target === null || calc === null) return
    spec.value = setCalculationOp(spec.value, target, seedPreset(kind, calc.domain))
  }
  function addInterval(): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = addIntervalOp(spec.value, target)
  }
  function removeInterval(intervalIndex: number): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = removeIntervalOp(spec.value, target, intervalIndex)
  }
  function updateInterval(intervalIndex: number, patch: Partial<IntervalSpec>): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = updateIntervalOp(spec.value, target, intervalIndex, patch)
  }
  function addIntervalStep(intervalIndex: number): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = addIntervalStepOp(spec.value, target, intervalIndex)
  }
  function removeIntervalStep(intervalIndex: number, stepIndex: number): void {
    const target = calculationTarget.value
    if (target !== null)
      spec.value = removeIntervalStepOp(spec.value, target, intervalIndex, stepIndex)
  }
  function updateIntervalStep(
    intervalIndex: number,
    stepIndex: number,
    patch: Partial<{ step: number; level: 1 | 2 | 3 }>,
  ): void {
    const target = calculationTarget.value
    if (target !== null)
      spec.value = updateIntervalStepOp(spec.value, target, intervalIndex, stepIndex, patch)
  }
  function addIntervalLabel(intervalIndex: number): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = addIntervalLabelOp(spec.value, target, intervalIndex)
  }
  function removeIntervalLabel(intervalIndex: number, labelIndex: number): void {
    const target = calculationTarget.value
    if (target !== null)
      spec.value = removeIntervalLabelOp(spec.value, target, intervalIndex, labelIndex)
  }
  function updateIntervalLabel(intervalIndex: number, labelIndex: number, value: number): void {
    const target = calculationTarget.value
    if (target !== null)
      spec.value = updateIntervalLabelOp(spec.value, target, intervalIndex, labelIndex, value)
  }
  function addLabel(): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = addLabelOp(spec.value, target)
  }
  function removeLabel(labelIndex: number): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = removeLabelOp(spec.value, target, labelIndex)
  }
  function setLabel(labelIndex: number, label: number | LabelSpec): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setLabelOp(spec.value, target, labelIndex, label)
  }
  function addMark(): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = addMarkOp(spec.value, target)
  }
  function removeMark(markIndex: number): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = removeMarkOp(spec.value, target, markIndex)
  }
  function setMark(markIndex: number, mark: MarkSpec): void {
    const target = calculationTarget.value
    if (target !== null) spec.value = setMarkOp(spec.value, target, markIndex, mark)
  }

  return {
    spec,
    selection,
    importError,
    draftRestored,
    clearDraft: clearDraftAction,
    buildResult,
    definition,
    errors,
    previewRule,
    isStale,
    isCircular,
    seed,
    loadText,
    newSpec,
    loadTemplate,
    select,
    clearSelection,
    addScale,
    removeScale,
    moveScale,
    setRule,
    setPhysical,
    setForm,
    setDisc,
    selectedScale,
    setScaleField,
    duplicateScale,
    addSharedLabel,
    removeSharedLabel,
    updateSharedLabel,
    addNote,
    removeNote,
    setNoteParts,
    calculationTarget,
    selectedCalculation,
    setDomain,
    setDecades,
    setDecreasing,
    setRead,
    setLabelFormat,
    setLabelLevel,
    setMap,
    seedCalculationPreset,
    addInterval,
    removeInterval,
    updateInterval,
    addIntervalStep,
    removeIntervalStep,
    updateIntervalStep,
    addIntervalLabel,
    removeIntervalLabel,
    updateIntervalLabel,
    addLabel,
    removeLabel,
    setLabel,
    addMark,
    removeMark,
    setMark,
    serializeJson,
  }
})
