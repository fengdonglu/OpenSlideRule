// Serializable rule definition (DTO).
// This is the JSON boundary: plain data only, no functions or DOM types.
// It mirrors the runtime model in ../types/scale but stays JSON-safe so a rule
// can be loaded from and written to disk. See docs for the schema reference.

import type { DiscSpec, PhysicalSpec, RuleForm, ScaleType } from '../types/scale'

export type { DiscSpec, RuleForm } from '../types/scale'

export const SCHEMA_VERSION = 1

export type LabelFormatSpec =
  | 'default'
  | 'folded'
  | 'linearFraction'
  | 'degree'
  | 'degreeBare'
  | 'degreeMinute'
  | 'argument'
  | 'sechZero'
  | { kind: 'number'; decimals: number }

export interface ReadSpec {
  kind: 'reciprocal'
  scale: number
}

export interface LogMapSpec {
  kind: 'log'
  anchor: number
  normalize?: boolean
}

export interface LinearMapSpec {
  kind: 'linear'
}

export interface FnMapSpec {
  kind: 'fn'
  fn: 'ln' | 'sin' | 'tan' | 'sinh' | 'tanh'
  from: number
}

export interface ValueFnMapSpec {
  kind: 'valueFn'
  fn: 'cosh' | 'sech'
  from: number
}

export interface ExprMapSpec {
  kind: 'expr'
  position: string // p = f(x)
  inverse?: string // x = g(p); omitted => numeric inversion
}

export type MapSpec = LogMapSpec | LinearMapSpec | FnMapSpec | ValueFnMapSpec | ExprMapSpec

export interface IntervalSpec {
  from: number
  to: number
  steps: { step: number; level: 1 | 2 | 3 }[]
  labels?: number[]
}

export interface MarkSpec {
  value: number | 'infinity'
  label: string
}

export interface LabelSpec {
  value: number
  text: string
}

export interface CalculationSpec {
  domain: [number, number]
  map: MapSpec
  read?: ReadSpec
  intervals: IntervalSpec[]
  decades?: number
  labels?: (number | LabelSpec)[]
  marks?: MarkSpec[]
  labelFormat?: LabelFormatSpec
  labelLevel?: 1 | 2 | 3 | 'keep'
  decreasing?: boolean
}

export interface SharedLabelSpec {
  id: string
  name: string
  orientation: 'increasing' | 'decreasing'
  format?: 'degree' | 'bare'
}

export interface NotePartSpec {
  text: string
  red?: boolean
}

export type ScaleNoteSpec = string | NotePartSpec[]

export interface ScaleSpec {
  id: string
  name: string
  type: ScaleType
  orientation: 'increasing' | 'decreasing'
  sharedLabels?: SharedLabelSpec[]
  notes?: ScaleNoteSpec[]
  numbersBelow?: boolean
  tickEdge?: 'roof' | 'floor'
  calculation: CalculationSpec
}

export interface ScaleSectionGroupSpec {
  upper: ScaleSpec[]
  middle: ScaleSpec[]
  lower: ScaleSpec[]
}

export interface RuleDefinition {
  schemaVersion: 1
  id: string
  name: string
  form?: RuleForm // absent => 'linear'
  physical?: PhysicalSpec // required for linear; optional for circular
  disc?: DiscSpec // required for circular
  faces: { front: ScaleSectionGroupSpec; back: ScaleSectionGroupSpec }
}

export type RuleErrorCode =
  | 'notObject'
  | 'missingField'
  | 'wrongType'
  | 'unsupportedSchemaVersion'
  | 'unknownMapKind'
  | 'unknownFn'
  | 'unknownLabelFormat'
  | 'unknownReadKind'
  | 'invalidExpression'
  | 'unknownScaleType'
  | 'invalidDomain'
  | 'nonPositiveStep'
  | 'nonPositiveReadScale'
  | 'intervalOutOfDomain'
  | 'invalidDecades'
  | 'duplicateScaleId'
  | 'nonFiniteNumber'
  | 'nonPositivePhysical'
  | 'unknownForm'
  | 'invalidDisc'
  | 'unexpectedDisc'

export interface RuleError {
  path: string
  code: RuleErrorCode
  message: string
}
