// Turn an author RuleSpec into a validated schema-v1 RuleDefinition.
// The only authoring indirection is the calculation { ref }; it is inlined here
// so the emitted DTO is plain JSON. The spec is treated as untrusted input:
// structural problems are reported as BuildErrors and the assembly never throws,
// so a CLI can feed parsed JSON straight in.

import { parseRule } from '@slide-rule/core'
import type { CalculationSpec, RuleDefinition, ScaleSpec } from '@slide-rule/core'
import type { BuildError, BuildResult, RuleSpec } from './spec'

type FaceName = 'front' | 'back'
type Section = 'upper' | 'middle' | 'lower'
type Loose = Record<string, unknown>

const FACES: readonly FaceName[] = ['front', 'back']
const SECTIONS: readonly Section[] = ['upper', 'middle', 'lower']

// Stand-in used only when a ref cannot be resolved. It is a valid calculation so
// parseRule reports nothing extra about the empty slot; the whole build fails
// anyway, so the placeholder never reaches a caller.
const UNRESOLVED_CALCULATION: CalculationSpec = {
  domain: [1, 10],
  map: { kind: 'linear' },
  intervals: [],
}

function isObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRef(calculation: unknown): calculation is { ref: string } {
  return isObject(calculation) && Object.hasOwn(calculation, 'ref')
}

function asScale(value: Loose): ScaleSpec {
  return value as unknown as ScaleSpec
}

function resolveScale(
  scale: unknown,
  path: string,
  calculations: Loose,
  errors: BuildError[],
): ScaleSpec | undefined {
  if (!isObject(scale)) {
    errors.push({ path, message: 'scale must be an object' })
    return undefined
  }

  const { calculation, ...rest } = scale
  if (isRef(calculation)) {
    const ref = calculation.ref
    // Own-enumerable lookup only: a ref named "__proto__" or "constructor" must
    // resolve to "unknown" rather than walk the prototype chain.
    if (!Object.hasOwn(calculations, ref)) {
      errors.push({
        path: `${path}.calculation.ref`,
        message: `unknown calculation ref '${ref}'`,
      })
      return asScale({ ...rest, calculation: UNRESOLVED_CALCULATION })
    }
    return asScale({ ...rest, calculation: calculations[ref] })
  }

  return asScale({ ...rest, calculation })
}

export function buildRule(spec: RuleSpec): BuildResult {
  const errors: BuildError[] = []
  const input: unknown = spec

  if (!isObject(input)) {
    return { ok: false, errors: [{ path: '', message: 'rule spec must be an object' }] }
  }

  const calculationsValue = input.calculations
  if (calculationsValue !== undefined && !isObject(calculationsValue)) {
    errors.push({ path: 'calculations', message: 'calculations must be an object' })
  }
  const calculations: Loose = isObject(calculationsValue) ? calculationsValue : {}

  const front: Record<Section, ScaleSpec[]> = { upper: [], middle: [], lower: [] }
  const back: Record<Section, ScaleSpec[]> = { upper: [], middle: [], lower: [] }
  const faces: Record<FaceName, Record<Section, ScaleSpec[]>> = { front, back }

  const facesValue = input.faces
  if (!isObject(facesValue)) {
    errors.push({ path: 'faces', message: 'faces must be an object' })
  } else {
    for (const face of FACES) {
      const faceValue = facesValue[face]
      if (!isObject(faceValue)) {
        errors.push({ path: `faces.${face}`, message: `${face} face must be an object` })
        continue
      }
      for (const section of SECTIONS) {
        const sectionValue = faceValue[section]
        // A missing section is an authoring mistake, not an empty section: report
        // it, but keep the [] default so validation and resolution stay safe.
        if (sectionValue === undefined) {
          errors.push({
            path: `faces.${face}.${section}`,
            message: `${section} section is required`,
          })
          continue
        }
        if (!Array.isArray(sectionValue)) {
          errors.push({
            path: `faces.${face}.${section}`,
            message: `${section} section must be an array`,
          })
          continue
        }
        const built: ScaleSpec[] = []
        sectionValue.forEach((scale, index) => {
          const resolved = resolveScale(
            scale,
            `faces.${face}.${section}[${index}]`,
            calculations,
            errors,
          )
          if (resolved !== undefined) built.push(resolved)
        })
        faces[face][section] = built
      }
    }
  }

  const rule: RuleDefinition = {
    schemaVersion: 1,
    id: input.id as string,
    name: input.name as string,
    faces,
  }
  if (input.physical !== undefined) rule.physical = input.physical as RuleDefinition['physical']
  if (input.form !== undefined) rule.form = input.form as RuleDefinition['form']
  if (input.disc !== undefined) rule.disc = input.disc as RuleDefinition['disc']

  const parsed = parseRule(rule)
  if (!parsed.ok) {
    for (const error of parsed.errors) {
      // Carry the core code on the BuildError as well as in the message so the
      // CLI's `<path>: <message>` output keeps it.
      errors.push({
        path: error.path,
        code: error.code,
        message: `${error.code}: ${error.message}`,
      })
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, rule }
}
