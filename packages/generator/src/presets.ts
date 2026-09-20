// Author-facing calculation presets.
// Each preset maps to a schema-v1 CalculationSpec. They only fix the mapping
// kind and the few defaults that follow from it; every measured field (domain,
// intervals, labels, marks) is supplied by the author, so a preset can never
// invent graduation data.

import type {
  CalculationSpec,
  IntervalSpec,
  LabelFormatSpec,
  LabelSpec,
  MapSpec,
  MarkSpec,
  ReadSpec,
} from '@slide-rule/core'

export interface LogScaleOptions {
  domain: [number, number]
  intervals: IntervalSpec[]
  labels?: (number | LabelSpec)[]
  marks?: MarkSpec[]
  anchor?: number
  normalize?: boolean
}

export interface LogDecadesOptions {
  domain: [number, number]
  decades: number
  intervals: IntervalSpec[]
  labels?: (number | LabelSpec)[]
  marks?: MarkSpec[]
  anchor?: number
}

export interface LinearScaleOptions {
  domain: [number, number]
  intervals: IntervalSpec[]
  labels?: (number | LabelSpec)[]
  labelFormat?: LabelFormatSpec
}

export interface FnScaleOptions {
  fn: 'ln' | 'sin' | 'tan' | 'sinh' | 'tanh'
  from: number
  domain: [number, number]
  intervals: IntervalSpec[]
  labels?: (number | LabelSpec)[]
  marks?: MarkSpec[]
  labelFormat?: LabelFormatSpec
  labelLevel?: 1 | 2 | 3 | 'keep'
}

export interface ValueFnScaleOptions {
  fn: 'cosh' | 'sech'
  from: number
  domain: [number, number]
  intervals: IntervalSpec[]
  labels?: (number | LabelSpec)[]
  labelFormat?: LabelFormatSpec
}

export interface ExprScaleOptions {
  domain: [number, number]
  intervals: IntervalSpec[]
  position: string
  inverse?: string
  labels?: (number | LabelSpec)[]
  marks?: MarkSpec[]
  labelFormat?: LabelFormatSpec
  labelLevel?: 1 | 2 | 3 | 'keep'
}

export function logScale(opts: LogScaleOptions): CalculationSpec {
  const anchor = opts.anchor ?? 1
  const map: MapSpec =
    opts.normalize === undefined
      ? { kind: 'log', anchor }
      : { kind: 'log', anchor, normalize: opts.normalize }

  const calculation: CalculationSpec = {
    domain: opts.domain,
    map,
    intervals: opts.intervals,
  }
  if (opts.labels !== undefined) calculation.labels = opts.labels
  if (opts.marks !== undefined) calculation.marks = opts.marks
  return calculation
}

export function logDecades(opts: LogDecadesOptions): CalculationSpec {
  const { decades, ...rest } = opts
  return {
    ...logScale({ ...rest, normalize: true }),
    decades,
  }
}

export function linearScale(opts: LinearScaleOptions): CalculationSpec {
  const calculation: CalculationSpec = {
    domain: opts.domain,
    map: { kind: 'linear' },
    intervals: opts.intervals,
  }
  if (opts.labels !== undefined) calculation.labels = opts.labels
  if (opts.labelFormat !== undefined) calculation.labelFormat = opts.labelFormat
  return calculation
}

export function fnScale(opts: FnScaleOptions): CalculationSpec {
  const calculation: CalculationSpec = {
    domain: opts.domain,
    map: { kind: 'fn', fn: opts.fn, from: opts.from },
    intervals: opts.intervals,
  }
  if (opts.labels !== undefined) calculation.labels = opts.labels
  if (opts.marks !== undefined) calculation.marks = opts.marks
  if (opts.labelFormat !== undefined) calculation.labelFormat = opts.labelFormat
  if (opts.labelLevel !== undefined) calculation.labelLevel = opts.labelLevel
  return calculation
}

export function valueFnScale(opts: ValueFnScaleOptions): CalculationSpec {
  const calculation: CalculationSpec = {
    domain: opts.domain,
    map: { kind: 'valueFn', fn: opts.fn, from: opts.from },
    intervals: opts.intervals,
  }
  if (opts.labels !== undefined) calculation.labels = opts.labels
  if (opts.labelFormat !== undefined) calculation.labelFormat = opts.labelFormat
  return calculation
}

export function exprScale(opts: ExprScaleOptions): CalculationSpec {
  const map: MapSpec =
    opts.inverse === undefined
      ? { kind: 'expr', position: opts.position }
      : { kind: 'expr', position: opts.position, inverse: opts.inverse }

  const calculation: CalculationSpec = {
    domain: opts.domain,
    map,
    intervals: opts.intervals,
  }
  if (opts.labels !== undefined) calculation.labels = opts.labels
  if (opts.marks !== undefined) calculation.marks = opts.marks
  if (opts.labelFormat !== undefined) calculation.labelFormat = opts.labelFormat
  if (opts.labelLevel !== undefined) calculation.labelLevel = opts.labelLevel
  return calculation
}

export function reciprocal(scale: number): ReadSpec {
  return { kind: 'reciprocal', scale }
}

export function interval(
  from: number,
  to: number,
  steps: { step: number; level: 1 | 2 | 3 }[],
): IntervalSpec {
  return { from, to, steps }
}
