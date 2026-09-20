// Runtime -> DTO serializer. The inverse of load/resolve.ts: it turns a runtime
// SlideRuleStructure back into the JSON-safe RuleDefinition. This is the
// migration / golden tool used to author the canonical JSON, so a value it
// cannot represent exactly throws rather than being silently approximated.
//
// The loader re-derives side / section / isMovable / colour from the scale's
// position and orientation, so the serializer deliberately omits them.

import type {
  CalculationSpec,
  ExprMapSpec,
  IntervalSpec,
  LabelFormatSpec,
  LabelSpec,
  MapSpec,
  MarkSpec,
  NotePartSpec,
  ReadSpec,
  RuleDefinition,
  ScaleNoteSpec,
  ScaleSectionGroupSpec,
  ScaleSpec,
  SharedLabelSpec,
} from '../schema/types'
import { SCHEMA_VERSION } from '../schema/types'
import type {
  GraduationInterval,
  GraduationLabel,
  GraduationMark,
  Mapping,
  NotePart,
  ScaleCalculation,
  ScaleDefinition,
  ScaleNote,
  ScaleSectionGroup,
  SharedLabel,
  SlideRuleStructure,
} from '../types/scale'
import { formatNumber } from '../engine/gradations'
import {
  formatArgument,
  formatBareAngle,
  formatDegreeAngle,
  formatDegreeMinute,
} from '../format/policies'
import { formatFoldedLabel, formatLinearLabel } from '../engine/logarithmic'
import { defaultLabelFormat } from '../engine/scaleCalculation'

type LabelFormatter = (v: number) => string

// Probe points that separate the closure-built format policies (sechZero and
// { kind: 'number' }) from one another. 0 catches sechZero's '.0'; the
// fractional values separate the fixed-decimal policies.
const PROBE_VALUES = [0, 0.1234, 1.2345, 9.876]

// The { kind: 'number' } policy is only probed up to this many decimals. A
// larger count that happens to print identically at every probe point is
// reported at the smallest decimals that reproduces the same output.
const MAX_PROBED_DECIMALS = 8

// Named formatters compare by identity: resolveLabelFormat returns the same
// function object for a named policy, so a matching reference round-trips to
// that policy. The sechZero and { kind: 'number' } policies build fresh
// closures, so they are detected by probing their output instead.
const NAMED_FORMATS: ReadonlyArray<readonly [LabelFormatter, LabelFormatSpec]> = [
  [formatFoldedLabel, 'folded'],
  [formatLinearLabel, 'linearFraction'],
  [formatDegreeAngle, 'degree'],
  [formatBareAngle, 'degreeBare'],
  [formatDegreeMinute, 'degreeMinute'],
  [formatArgument, 'argument'],
]

function matchesProbe(format: LabelFormatter, candidate: LabelFormatter): boolean {
  return PROBE_VALUES.every((v) => format(v) === candidate(v))
}

function serializeLabelFormat(
  format: LabelFormatter | undefined,
  id: string,
): LabelFormatSpec | undefined {
  if (format === undefined || format === defaultLabelFormat) return undefined
  for (const [fn, spec] of NAMED_FORMATS) {
    if (format === fn) return spec
  }
  // sechZero must be tested before the plain number policies: the two agree
  // everywhere except at 0, where sechZero prints '.0'.
  if (matchesProbe(format, (v) => (v === 0 ? '.0' : formatNumber(v, 3)))) return 'sechZero'
  for (let decimals = 0; decimals <= MAX_PROBED_DECIMALS; decimals++) {
    if (matchesProbe(format, (v) => formatNumber(v, decimals))) {
      return { kind: 'number', decimals }
    }
  }
  throw new Error(`serializeRule: unrepresentable labelFormat on ${id}`)
}

function serializeMap(map: Mapping, id: string): MapSpec {
  switch (map.kind) {
    case 'log':
      return map.normalize === undefined
        ? { kind: 'log', anchor: map.anchor }
        : { kind: 'log', anchor: map.anchor, normalize: map.normalize }
    case 'linear':
      return { kind: 'linear' }
    case 'fn':
      return { kind: 'fn', fn: map.fn, from: map.from }
    case 'valueFn':
      return { kind: 'valueFn', fn: map.fn, from: map.from }
    case 'expr': {
      const spec: ExprMapSpec = { kind: 'expr', position: map.position }
      if (map.inverse !== undefined) spec.inverse = map.inverse
      return spec
    }
    case 'custom':
      throw new Error(`serializeRule: custom map is not representable in schema v1 on ${id}`)
  }
}

function serializeRead(calc: ScaleCalculation, id: string): ReadSpec | undefined {
  if (calc.read === undefined) return undefined
  if (calc.unread === undefined) throw new Error(`serializeRule: unrepresentable read on ${id}`)
  if (calc.read(2) === 1 / 2 && calc.unread(5) === 1 / 5) return { kind: 'reciprocal', scale: 1 }
  if (calc.read(2) === 10 / 2 && calc.unread(5) === 10 / 5) {
    return { kind: 'reciprocal', scale: 10 }
  }
  throw new Error(`serializeRule: unrepresentable read on ${id}`)
}

function serializeInterval(interval: GraduationInterval): IntervalSpec {
  const spec: IntervalSpec = {
    from: interval.from,
    to: interval.to,
    steps: interval.steps.map((step) => ({ step: step.step, level: step.level })),
  }
  if (interval.labels !== undefined) spec.labels = [...interval.labels]
  return spec
}

function serializeLabel(label: GraduationLabel): number | LabelSpec {
  return typeof label === 'number' ? label : { value: label.value, text: label.text }
}

function serializeMark(mark: GraduationMark): MarkSpec {
  return { value: mark.value === Infinity ? 'infinity' : mark.value, label: mark.label }
}

function serializeCalculation(calc: ScaleCalculation, id: string): CalculationSpec {
  const spec: CalculationSpec = {
    domain: [calc.domain[0], calc.domain[1]],
    map: serializeMap(calc.map, id),
    intervals: calc.intervals.map(serializeInterval),
  }
  const read = serializeRead(calc, id)
  if (read !== undefined) spec.read = read
  const labelFormat = serializeLabelFormat(calc.labelFormat, id)
  if (labelFormat !== undefined) spec.labelFormat = labelFormat
  if (calc.decades !== undefined) spec.decades = calc.decades
  if (calc.labels !== undefined) spec.labels = calc.labels.map(serializeLabel)
  if (calc.marks !== undefined) spec.marks = calc.marks.map(serializeMark)
  if (calc.labelLevel !== undefined) spec.labelLevel = calc.labelLevel
  if (calc.decreasing !== undefined) spec.decreasing = calc.decreasing
  return spec
}

function serializeNotePart(part: NotePart): NotePartSpec {
  return part.red === undefined ? { text: part.text } : { text: part.text, red: part.red }
}

function serializeNote(note: ScaleNote): ScaleNoteSpec {
  return typeof note === 'string' ? note : note.map(serializeNotePart)
}

function serializeSharedLabel(label: SharedLabel): SharedLabelSpec {
  const spec: SharedLabelSpec = {
    id: label.id,
    name: label.name,
    orientation: label.orientation,
  }
  if (label.format !== undefined) spec.format = label.format
  return spec
}

function serializeScale(scale: ScaleDefinition): ScaleSpec {
  if (scale.calc === undefined) {
    throw new Error(`serializeRule: scale ${scale.id} has no calculation`)
  }
  const spec: ScaleSpec = {
    id: scale.id,
    name: scale.name,
    type: scale.type,
    orientation: scale.orientation,
    calculation: serializeCalculation(scale.calc, scale.id),
  }
  if (scale.sharedLabels !== undefined)
    spec.sharedLabels = scale.sharedLabels.map(serializeSharedLabel)
  if (scale.notes !== undefined) spec.notes = scale.notes.map(serializeNote)
  if (scale.numbersBelow !== undefined) spec.numbersBelow = scale.numbersBelow
  if (scale.tickEdge !== undefined) spec.tickEdge = scale.tickEdge
  return spec
}

function serializeFace(face: ScaleSectionGroup): ScaleSectionGroupSpec {
  return {
    upper: face.upper.map(serializeScale),
    middle: face.middle.map(serializeScale),
    lower: face.lower.map(serializeScale),
  }
}

export function serializeRule(rule: SlideRuleStructure): RuleDefinition {
  const out: Partial<RuleDefinition> = {
    schemaVersion: SCHEMA_VERSION,
    id: rule.id,
    name: rule.name,
  }
  if (rule.form !== undefined) out.form = rule.form
  if (rule.form === 'circular') {
    // A circular rule's physical may be a synthesised bounding box: omit it so
    // the DTO round-trips to the authored form. This is deliberately lossy for
    // the unusual case of a circular rule that carries an authored `physical`:
    // the loader regenerates it as the bounding box, so such a document is not
    // byte-round-tripped through serialize/load.
    if (rule.disc !== undefined) out.disc = { ...rule.disc }
  } else {
    out.physical = { ...rule.physical, rowCount: { ...rule.physical.rowCount } }
  }
  out.faces = { front: serializeFace(rule.front), back: serializeFace(rule.back) }
  return out as RuleDefinition
}
