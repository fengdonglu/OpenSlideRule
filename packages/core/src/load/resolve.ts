// DTO -> runtime resolver. Turns the JSON-safe Definitions and Calculations
// produced by the schema validator into the runtime ScaleCalculation /
// SlideRuleStructure the engine and renderer consume. Pure data in, functions
// only where the runtime model requires them (read / unread / labelFormat).
// Colours come from data/ruleHelpers so load/* never imports data/model1002
// (which itself loads the JSON rules), avoiding a load cycle.

import type {
  CalculationSpec,
  IntervalSpec,
  LabelSpec,
  MapSpec,
  MarkSpec,
  RuleDefinition,
  ScaleNoteSpec,
  ScaleSectionGroupSpec,
  ScaleSpec,
  SharedLabelSpec,
} from '../schema/types'
import type {
  DiscSpec,
  ExprMapping,
  GraduationInterval,
  GraduationLabel,
  GraduationMark,
  Mapping,
  NotePart,
  PhysicalSpec,
  ScaleCalculation,
  ScaleDefinition,
  ScaleNote,
  ScaleSection,
  ScaleSectionGroup,
  SharedLabel,
  SlideRuleSide,
  SlideRuleStructure,
} from '../types/scale'
import { resolveLabelFormat } from '../format/policies'
import { BLACK, RED } from '../data/ruleHelpers'
import { compileExpression, numericInverse } from '../expr'

function resolveMap(spec: MapSpec, domain: [number, number]): Mapping {
  switch (spec.kind) {
    case 'log':
      return spec.normalize === undefined
        ? { kind: 'log', anchor: spec.anchor }
        : { kind: 'log', anchor: spec.anchor, normalize: spec.normalize }
    case 'linear':
      return { kind: 'linear' }
    case 'fn':
      return { kind: 'fn', fn: spec.fn, from: spec.from }
    case 'valueFn':
      return { kind: 'valueFn', fn: spec.fn, from: spec.from }
    case 'expr': {
      const forward = compileExpression(spec.position, 'x')
      const map: ExprMapping = {
        kind: 'expr',
        position: spec.position,
        toPosition: forward,
        toDomain:
          spec.inverse === undefined
            ? numericInverse(forward, domain)
            : compileExpression(spec.inverse, 'p'),
      }
      if (spec.inverse !== undefined) map.inverse = spec.inverse
      return map
    }
  }
}

function resolveInterval(spec: IntervalSpec): GraduationInterval {
  const interval: GraduationInterval = {
    from: spec.from,
    to: spec.to,
    steps: spec.steps.map((step) => ({ step: step.step, level: step.level })),
  }
  if (spec.labels !== undefined) interval.labels = [...spec.labels]
  return interval
}

function resolveLabel(label: number | LabelSpec): GraduationLabel {
  return typeof label === 'number' ? label : { value: label.value, text: label.text }
}

function resolveMark(mark: MarkSpec): GraduationMark {
  return { value: mark.value === 'infinity' ? Infinity : mark.value, label: mark.label }
}

export function resolveCalculation(spec: CalculationSpec): ScaleCalculation {
  const calc: ScaleCalculation = {
    domain: [spec.domain[0], spec.domain[1]],
    map: resolveMap(spec.map, spec.domain),
    intervals: spec.intervals.map(resolveInterval),
    labelFormat: resolveLabelFormat(spec.labelFormat),
  }
  if (spec.read) {
    const scale = spec.read.scale
    calc.read = (d) => scale / d
    calc.unread = (v) => scale / v
  }
  if (spec.decades !== undefined) calc.decades = spec.decades
  if (spec.labels !== undefined) calc.labels = spec.labels.map(resolveLabel)
  if (spec.marks !== undefined) calc.marks = spec.marks.map(resolveMark)
  if (spec.labelLevel !== undefined) calc.labelLevel = spec.labelLevel
  if (spec.decreasing !== undefined) calc.decreasing = spec.decreasing
  return calc
}

function resolveNote(note: ScaleNoteSpec): ScaleNote {
  if (typeof note === 'string') return note
  return note.map((part): NotePart => ({ text: part.text, red: part.red }))
}

function resolveSharedLabel(spec: SharedLabelSpec): SharedLabel {
  const label: SharedLabel = {
    id: spec.id,
    name: spec.name,
    orientation: spec.orientation,
    color: spec.orientation === 'decreasing' ? RED : BLACK,
  }
  if (spec.format !== undefined) label.format = spec.format
  return label
}

function resolveScale(
  spec: ScaleSpec,
  side: SlideRuleSide,
  section: ScaleSection,
): ScaleDefinition {
  const scale: ScaleDefinition = {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    side,
    section,
    isMovable: section === 'middle',
    orientation: spec.orientation,
    color: spec.orientation === 'decreasing' ? RED : BLACK,
    calc: resolveCalculation(spec.calculation),
  }
  if (spec.sharedLabels !== undefined)
    scale.sharedLabels = spec.sharedLabels.map(resolveSharedLabel)
  if (spec.notes !== undefined) scale.notes = spec.notes.map(resolveNote)
  if (spec.numbersBelow !== undefined) scale.numbersBelow = spec.numbersBelow
  if (spec.tickEdge !== undefined) scale.tickEdge = spec.tickEdge
  return scale
}

function resolveFace(spec: ScaleSectionGroupSpec, side: SlideRuleSide): ScaleSectionGroup {
  return {
    upper: spec.upper.map((scale) => resolveScale(scale, side, 'upper')),
    middle: spec.middle.map((scale) => resolveScale(scale, side, 'middle')),
    lower: spec.lower.map((scale) => resolveScale(scale, side, 'lower')),
  }
}

// A circular rule carries no rectangular physical spec; the renderer still
// needs one, so synthesise a square bounding box from the disc's sheet. Only
// the sheet size is meaningful for a disc; the row and margin ratios are benign
// placeholders that never drive disc geometry.
function boundingPhysical(disc: DiscSpec): PhysicalSpec {
  return {
    faceWidthMm: disc.sheetSizeMm,
    faceHeightMm: disc.sheetSizeMm,
    rowCount: { upper: 1, middle: 1, lower: 1 },
    grooveRowRatio: 0.5,
    marginRowRatio: 0.5,
    leftGutterMm: 0,
    rightPanelMm: 0,
    numeralRatio: 0.6,
  }
}

export function resolveRule(def: RuleDefinition): SlideRuleStructure {
  const rule: SlideRuleStructure = {
    id: def.id,
    name: def.name,
    physical: def.physical
      ? { ...def.physical, rowCount: { ...def.physical.rowCount } }
      : boundingPhysical(def.disc as DiscSpec),
    front: resolveFace(def.faces.front, 'front'),
    back: resolveFace(def.faces.back, 'back'),
  }
  if (def.form !== undefined) rule.form = def.form
  if (def.disc !== undefined) rule.disc = { ...def.disc }
  return rule
}
