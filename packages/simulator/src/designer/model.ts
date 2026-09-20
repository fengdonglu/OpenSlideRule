// Pure designer operations. No Vue, no DOM: everything returns a new value and
// is unit-testable in node. The editor document is a generator RuleSpec.
import type {
  CalculationSpec,
  DiscSpec,
  IntervalSpec,
  LabelFormatSpec,
  LabelSpec,
  MapSpec,
  MarkSpec,
  NotePartSpec,
  PhysicalSpec,
  ReadSpec,
  RuleDefinition,
  RuleForm,
  ScaleNoteSpec,
  ScaleSection,
  ScaleSpec,
  SharedLabelSpec,
} from '@slide-rule/core'
import type { RuleSpec, ScaleSpecInput } from '@slide-rule/generator'
import { exprScale, fnScale, linearScale, logScale, valueFnScale } from '@slide-rule/generator'

export type FaceName = 'front' | 'back'

const DEFAULT_PHYSICAL: PhysicalSpec = {
  faceWidthMm: 304.8,
  faceHeightMm: 50.8,
  rowCount: { upper: 4, middle: 6, lower: 4 },
  grooveRowRatio: 0.7,
  marginRowRatio: 0.4,
  leftGutterMm: 26.1,
  rightPanelMm: 19.7,
  numeralRatio: 0.6,
}

const DEFAULT_DISC: DiscSpec = { outerRadiusMm: 100, innerRadiusMm: 10, sheetSizeMm: 220 }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A RuleDefinition is a RuleSpec with schemaVersion and (usually) no refs, so the
// adaptation is a shape-preserving clone with the version marker dropped.
export function definitionToSpec(def: RuleDefinition): RuleSpec {
  const spec: RuleSpec = {
    id: def.id,
    name: def.name,
    faces: structuredClone(def.faces),
  }
  if (def.physical !== undefined) spec.physical = structuredClone(def.physical)
  if (def.form !== undefined) spec.form = def.form
  if (def.disc !== undefined) spec.disc = { ...def.disc }
  return spec
}

// Accept either a RuleDefinition (it carries schemaVersion) or a RuleSpec and
// return the editor document. The result is not validated here; buildRule is.
export function detectDocument(value: unknown): RuleSpec {
  if (isObject(value) && value.schemaVersion !== undefined) {
    return definitionToSpec(value as unknown as RuleDefinition)
  }
  return structuredClone(value as RuleSpec)
}

export function emptySpec(): RuleSpec {
  return {
    id: 'new-rule',
    name: 'New rule',
    physical: structuredClone(DEFAULT_PHYSICAL),
    faces: {
      front: { upper: [], middle: [], lower: [] },
      back: { upper: [], middle: [], lower: [] },
    },
  }
}

// Mint a string id that is free within `existing`: `base`, then `base2`, ...
export function uniqueFrom(existing: ReadonlyArray<{ id: string }>, base: string): string {
  const ids = new Set(existing.map((s) => s.id))
  if (!ids.has(base)) return base
  let n = 2
  while (ids.has(`${base}${n}`)) n++
  return `${base}${n}`
}

// Append a new C scale, or insert it at `atIndex` (used to add just after the
// selected scale). The index is clamped to the list bounds.
export function addScale(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  atIndex?: number,
): RuleSpec {
  const next = structuredClone(spec)
  const list = next.faces[face][section]
  const id = uniqueFrom(list, 'C')
  const scale: ScaleSpec = {
    id,
    name: id,
    type: 'C',
    orientation: 'increasing',
    calculation: {
      domain: [1, 10],
      map: { kind: 'log', anchor: 1 },
      intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
    },
  }
  const at = atIndex === undefined ? list.length : Math.min(Math.max(atIndex, 0), list.length)
  list.splice(at, 0, scale)
  return next
}

export function removeScale(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
): RuleSpec {
  const next = structuredClone(spec)
  const list = next.faces[face][section]
  if (index < 0 || index >= list.length) return next
  list.splice(index, 1)
  return next
}

export function moveScale(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
  delta: number,
): RuleSpec {
  const next = structuredClone(spec)
  const list = next.faces[face][section]
  const target = index + delta
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return next
  const [scale] = list.splice(index, 1)
  list.splice(target, 0, scale)
  return next
}

export function updateRule(
  spec: RuleSpec,
  patch: Partial<Pick<RuleSpec, 'id' | 'name'>>,
): RuleSpec {
  return { ...structuredClone(spec), ...patch }
}

export function updatePhysical(spec: RuleSpec, patch: Partial<PhysicalSpec>): RuleSpec {
  const next = structuredClone(spec)
  // The fallback must be a deep clone: a shallow spread would alias the shared
  // DEFAULT_PHYSICAL.rowCount object between specs.
  next.physical = { ...(next.physical ?? structuredClone(DEFAULT_PHYSICAL)), ...patch }
  return next
}

export function setForm(spec: RuleSpec, form: RuleForm): RuleSpec {
  const next = structuredClone(spec)
  next.form = form
  if (form === 'circular') {
    if (next.disc === undefined) next.disc = { ...DEFAULT_DISC }
  } else {
    delete next.disc
  }
  return next
}

export function updateDisc(spec: RuleSpec, patch: Partial<DiscSpec>): RuleSpec {
  const next = structuredClone(spec)
  next.disc = { ...(next.disc ?? DEFAULT_DISC), ...patch }
  return next
}

export function serializeJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}

export type ScaleFieldPatch = Partial<Omit<ScaleSpec, 'calculation'>>

function scaleAt(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
): ScaleSpecInput | undefined {
  return spec.faces[face][section][index]
}

// Edit a scale's own fields. The calculation is deliberately excluded: 5c owns it.
export function updateScale(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
  patch: ScaleFieldPatch,
): RuleSpec {
  const next = structuredClone(spec)
  const scale = scaleAt(next, face, section, index)
  if (scale !== undefined) {
    Object.assign(scale, patch)
    clearUndefined(scale, patch)
  }
  return next
}

// A cleared react field is patched as `undefined`; drop those keys so `in` and
// `Object.keys` stay clean (JSON already omits them).
function clearUndefined(target: object, patch: object): void {
  const record = target as Record<string, unknown>
  for (const key of Object.keys(patch)) {
    if (record[key] === undefined) delete record[key]
  }
}

export function duplicateScale(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
): RuleSpec {
  const next = structuredClone(spec)
  const list = next.faces[face][section]
  if (index < 0 || index >= list.length) return next
  const copy = structuredClone(list[index])
  copy.id = uniqueFrom(list, list[index].id)
  list.splice(index + 1, 0, copy)
  return next
}

export function addSharedLabel(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
): RuleSpec {
  const next = structuredClone(spec)
  const scale = scaleAt(next, face, section, index)
  if (scale !== undefined) {
    if (scale.sharedLabels === undefined) scale.sharedLabels = []
    scale.sharedLabels.push({
      id: uniqueFrom(scale.sharedLabels, 'co'),
      name: 'co',
      orientation: 'decreasing',
    })
  }
  return next
}

export function removeSharedLabel(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
  labelIndex: number,
): RuleSpec {
  const next = structuredClone(spec)
  const labels = scaleAt(next, face, section, index)?.sharedLabels
  if (labels !== undefined) labels.splice(labelIndex, 1)
  return next
}

export function updateSharedLabel(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
  labelIndex: number,
  patch: Partial<SharedLabelSpec>,
): RuleSpec {
  const next = structuredClone(spec)
  const label = scaleAt(next, face, section, index)?.sharedLabels?.[labelIndex]
  if (label !== undefined) {
    Object.assign(label, patch)
    clearUndefined(label, patch)
  }
  return next
}

// A note is a string or a list of coloured parts. Editing works on parts and
// reconstitutes the compact string form when the note is a single black part.
export function noteToParts(note: ScaleNoteSpec): NotePartSpec[] {
  return typeof note === 'string' ? [{ text: note }] : note.map((part) => ({ ...part }))
}

export function partsToNote(parts: NotePartSpec[]): ScaleNoteSpec {
  if (parts.length === 1 && parts[0].red !== true) return parts[0].text
  return parts.map((part) =>
    part.red === undefined ? { text: part.text } : { text: part.text, red: part.red },
  )
}

export function addNote(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
): RuleSpec {
  const next = structuredClone(spec)
  const scale = scaleAt(next, face, section, index)
  if (scale !== undefined) {
    if (scale.notes === undefined) scale.notes = []
    scale.notes.push('')
  }
  return next
}

export function removeNote(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
  noteIndex: number,
): RuleSpec {
  const next = structuredClone(spec)
  const notes = scaleAt(next, face, section, index)?.notes
  if (notes !== undefined) notes.splice(noteIndex, 1)
  return next
}

export function setNote(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
  noteIndex: number,
  note: ScaleNoteSpec,
): RuleSpec {
  const next = structuredClone(spec)
  const notes = scaleAt(next, face, section, index)?.notes
  if (notes !== undefined && notes[noteIndex] !== undefined) notes[noteIndex] = note
  return next
}

// A calculation lives either inline on a scale or in `spec.calculations`, shared
// by scales that point at it with { ref }. This union addresses both locations.
export type CalculationTarget =
  | { kind: 'scale'; face: FaceName; section: ScaleSection; index: number }
  | { kind: 'named'; name: string }

function isRef(calc: unknown): calc is { ref: string } {
  return isObject(calc) && typeof calc.ref === 'string'
}

export function calculationRef(
  spec: RuleSpec,
  face: FaceName,
  section: ScaleSection,
  index: number,
): string | null {
  const calc = scaleAt(spec, face, section, index)?.calculation
  return isRef(calc) ? calc.ref : null
}

export function getCalculation(spec: RuleSpec, target: CalculationTarget): CalculationSpec | null {
  if (target.kind === 'named') return spec.calculations?.[target.name] ?? null
  const calc = scaleAt(spec, target.face, target.section, target.index)?.calculation
  if (isRef(calc)) return spec.calculations?.[calc.ref] ?? null
  return calc ?? null
}

export function setCalculation(
  spec: RuleSpec,
  target: CalculationTarget,
  calc: CalculationSpec,
): RuleSpec {
  const next = structuredClone(spec)
  if (target.kind === 'named') {
    if (next.calculations === undefined) next.calculations = {}
    next.calculations[target.name] = calc
    return next
  }
  const scale = scaleAt(next, target.face, target.section, target.index)
  if (scale !== undefined) {
    const ref = isRef(scale.calculation) ? scale.calculation.ref : null
    if (ref === null) {
      scale.calculation = calc
    } else {
      if (next.calculations === undefined) next.calculations = {}
      next.calculations[ref] = calc
    }
  }
  return next
}

// Read-modify-write one calculation; a missing/misaimed target is a no-op.
function withCalculation(
  spec: RuleSpec,
  target: CalculationTarget,
  fn: (calc: CalculationSpec) => CalculationSpec,
): RuleSpec {
  const calc = getCalculation(spec, target)
  return calc === null ? spec : setCalculation(spec, target, fn(calc))
}

// Spread a patch over a calculation and drop the keys the patch cleared, so an
// optional field set to `undefined` disappears instead of lingering as a hole.
function withOptional(calc: CalculationSpec, patch: Partial<CalculationSpec>): CalculationSpec {
  const next: CalculationSpec = { ...calc, ...patch }
  clearUndefined(next, patch)
  return next
}

export function setDomain(
  spec: RuleSpec,
  target: CalculationTarget,
  domain: [number, number],
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({ ...calc, domain }))
}

export function setDecades(
  spec: RuleSpec,
  target: CalculationTarget,
  decades: number | undefined,
): RuleSpec {
  return withCalculation(spec, target, (calc) => withOptional(calc, { decades }))
}

export function setDecreasing(
  spec: RuleSpec,
  target: CalculationTarget,
  decreasing: boolean | undefined,
): RuleSpec {
  return withCalculation(spec, target, (calc) => withOptional(calc, { decreasing }))
}

export function setRead(
  spec: RuleSpec,
  target: CalculationTarget,
  read: ReadSpec | undefined,
): RuleSpec {
  return withCalculation(spec, target, (calc) => withOptional(calc, { read }))
}

export function setLabelFormat(
  spec: RuleSpec,
  target: CalculationTarget,
  labelFormat: LabelFormatSpec | undefined,
): RuleSpec {
  return withCalculation(spec, target, (calc) => withOptional(calc, { labelFormat }))
}

export function setLabelLevel(
  spec: RuleSpec,
  target: CalculationTarget,
  labelLevel: 1 | 2 | 3 | 'keep' | undefined,
): RuleSpec {
  return withCalculation(spec, target, (calc) => withOptional(calc, { labelLevel }))
}

export function setMap(spec: RuleSpec, target: CalculationTarget, map: MapSpec): RuleSpec {
  return withCalculation(spec, target, (calc) => ({ ...calc, map }))
}

export function defaultMap(kind: MapSpec['kind']): MapSpec {
  switch (kind) {
    case 'log':
      return { kind: 'log', anchor: 1 }
    case 'linear':
      return { kind: 'linear' }
    case 'fn':
      return { kind: 'fn', fn: 'ln', from: 1 }
    case 'valueFn':
      return { kind: 'valueFn', fn: 'cosh', from: 1 }
    case 'expr':
      return { kind: 'expr', position: 'log10(x)' }
  }
}

export type PresetKind = 'log' | 'linear' | 'fn' | 'valueFn' | 'expr'

// A coarse starting graduation: ten equal steps across the domain. The author
// refines it later; this only guarantees the preset has something to draw.
function presetIntervals(domain: [number, number]): CalculationSpec['intervals'] {
  const step = (domain[1] - domain[0]) / 10
  return [
    {
      from: domain[0],
      to: domain[1],
      steps: [{ step: step > 0 ? step : 1, level: 1 }],
    },
  ]
}

export function seedPreset(kind: PresetKind, domain: [number, number]): CalculationSpec {
  const intervals = presetIntervals(domain)
  switch (kind) {
    case 'log':
      return logScale({ domain, intervals })
    case 'linear':
      return linearScale({ domain, intervals })
    case 'fn':
      return fnScale({ fn: 'ln', from: 1, domain, intervals })
    case 'valueFn':
      return valueFnScale({ fn: 'cosh', from: 1, domain, intervals })
    case 'expr':
      return exprScale({ domain, intervals, position: 'log10(x)' })
  }
}

export function addInterval(spec: RuleSpec, target: CalculationTarget): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: [
      ...calc.intervals,
      { from: calc.domain[0], to: calc.domain[1], steps: [{ step: 1, level: 1 }] },
    ],
  }))
}

export function removeInterval(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.filter((_, i) => i !== intervalIndex),
  }))
}

export function updateInterval(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
  patch: Partial<IntervalSpec>,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.map((interval, i) => {
      if (i !== intervalIndex) return interval
      const next = { ...interval, ...patch }
      clearUndefined(next, patch)
      return next
    }),
  }))
}

export function addIntervalStep(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.map((interval, i) =>
      i === intervalIndex
        ? { ...interval, steps: [...interval.steps, { step: 1, level: 1 as const }] }
        : interval,
    ),
  }))
}

export function removeIntervalStep(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
  stepIndex: number,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.map((interval, i) =>
      i === intervalIndex
        ? { ...interval, steps: interval.steps.filter((_, j) => j !== stepIndex) }
        : interval,
    ),
  }))
}

export function updateIntervalStep(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
  stepIndex: number,
  patch: Partial<{ step: number; level: 1 | 2 | 3 }>,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.map((interval, i) =>
      i === intervalIndex
        ? {
            ...interval,
            steps: interval.steps.map((step, j) =>
              j === stepIndex ? { ...step, ...patch } : step,
            ),
          }
        : interval,
    ),
  }))
}

export function addIntervalLabel(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.map((interval, i) =>
      i === intervalIndex
        ? { ...interval, labels: [...(interval.labels ?? []), interval.from] }
        : interval,
    ),
  }))
}

export function removeIntervalLabel(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
  labelIndex: number,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.map((interval, i) =>
      i === intervalIndex
        ? { ...interval, labels: (interval.labels ?? []).filter((_, j) => j !== labelIndex) }
        : interval,
    ),
  }))
}

export function updateIntervalLabel(
  spec: RuleSpec,
  target: CalculationTarget,
  intervalIndex: number,
  labelIndex: number,
  value: number,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    intervals: calc.intervals.map((interval, i) =>
      i === intervalIndex
        ? {
            ...interval,
            labels: (interval.labels ?? []).map((label, j) => (j === labelIndex ? value : label)),
          }
        : interval,
    ),
  }))
}

export function addLabel(spec: RuleSpec, target: CalculationTarget): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    labels: [...(calc.labels ?? []), calc.domain[0]],
  }))
}

export function removeLabel(
  spec: RuleSpec,
  target: CalculationTarget,
  labelIndex: number,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    labels: (calc.labels ?? []).filter((_, i) => i !== labelIndex),
  }))
}

export function setLabel(
  spec: RuleSpec,
  target: CalculationTarget,
  labelIndex: number,
  label: number | LabelSpec,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    labels: (calc.labels ?? []).map((entry, i) => (i === labelIndex ? label : entry)),
  }))
}

export function addMark(spec: RuleSpec, target: CalculationTarget): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    marks: [...(calc.marks ?? []), { value: calc.domain[0], label: String(calc.domain[0]) }],
  }))
}

export function removeMark(spec: RuleSpec, target: CalculationTarget, markIndex: number): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    marks: (calc.marks ?? []).filter((_, i) => i !== markIndex),
  }))
}

export function setMark(
  spec: RuleSpec,
  target: CalculationTarget,
  markIndex: number,
  mark: MarkSpec,
): RuleSpec {
  return withCalculation(spec, target, (calc) => ({
    ...calc,
    marks: (calc.marks ?? []).map((entry, i) => (i === markIndex ? mark : entry)),
  }))
}
