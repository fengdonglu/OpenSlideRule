// Author-facing rule model.
// RuleSpec is a DTO superset of core's RuleDefinition: a scale may point at a
// named calculation via { ref } so shared calculations (C/D, A/B) are written
// once. buildRule inlines the refs back into plain schema-v1 JSON.

import type {
  CalculationSpec,
  DiscSpec,
  PhysicalSpec,
  RuleDefinition,
  RuleErrorCode,
  RuleForm,
  ScaleSpec,
} from '@slide-rule/core'

export interface ScaleSpecInput extends Omit<ScaleSpec, 'calculation'> {
  calculation: CalculationSpec | { ref: string }
}

export interface FaceSpec {
  upper: ScaleSpecInput[]
  middle: ScaleSpecInput[]
  lower: ScaleSpecInput[]
}

export interface RuleSpec {
  id: string
  name: string
  form?: RuleForm
  physical?: PhysicalSpec
  disc?: DiscSpec
  calculations?: Record<string, CalculationSpec>
  faces: { front: FaceSpec; back: FaceSpec }
}

export interface BuildError {
  path: string
  message: string
  code?: RuleErrorCode
}

export type BuildResult = { ok: true; rule: RuleDefinition } | { ok: false; errors: BuildError[] }
