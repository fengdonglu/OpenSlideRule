// Aggregating validator for a serializable RuleDefinition.
// It never throws: every problem is collected as a RuleError so a loader can
// report all of them at once. Paths are JSON-pointer-ish dotted paths, e.g.
// `faces.front.upper[2].calculation.domain`.

import { SCHEMA_VERSION } from './types'
import type { RuleError, RuleErrorCode } from './types'
import { SCALE_TYPES } from '../types/scale'
import type { RuleForm } from '../types/scale'
import { compileExpression, validateExpression } from '../expr'

type Push = (path: string, code: RuleErrorCode, message: string) => void
type Obj = Record<string, unknown>

const FACES = ['front', 'back'] as const
const SECTIONS = ['upper', 'middle', 'lower'] as const
const ORIENTATIONS = ['increasing', 'decreasing']
const TICK_EDGES = ['roof', 'floor']
const FN_NAMES = ['ln', 'sin', 'tan', 'sinh', 'tanh']
const VALUE_FN_NAMES = ['cosh', 'sech']
const LABEL_FORMATS = [
  'default',
  'folded',
  'linearFraction',
  'degree',
  'degreeBare',
  'degreeMinute',
  'argument',
  'sechZero',
]
const READ_KINDS = ['reciprocal']
const RULE_FORMS = ['linear', 'circular'] as const

function isRuleForm(value: unknown): value is RuleForm {
  return RULE_FORMS.some((form) => form === value)
}

function isObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(obj: Obj, key: string, base: string, push: Push): string | undefined {
  const path = base ? `${base}.${key}` : key
  const value = obj[key]
  if (value === undefined) {
    push(path, 'missingField', `${key} is required`)
    return undefined
  }
  if (typeof value !== 'string') {
    push(path, 'wrongType', `${key} must be a string`)
    return undefined
  }
  return value
}

function requireEnum(
  value: unknown,
  path: string,
  allowed: readonly unknown[],
  push: Push,
  code: RuleErrorCode,
): boolean {
  if (value === undefined) {
    push(path, 'missingField', 'field is required')
    return false
  }
  if (!allowed.includes(value)) {
    push(path, code, `must be one of: ${allowed.join(', ')}`)
    return false
  }
  return true
}

function requiredNumber(obj: Obj, key: string, base: string, push: Push): number | undefined {
  const path = `${base}.${key}`
  const value = obj[key]
  if (value === undefined) {
    push(path, 'missingField', `${key} is required`)
    return undefined
  }
  if (typeof value !== 'number') {
    push(path, 'wrongType', `${key} must be a number`)
    return undefined
  }
  if (!Number.isFinite(value)) {
    push(path, 'nonFiniteNumber', `${key} must be finite`)
    return undefined
  }
  return value
}

export function validateRule(input: unknown): RuleError[] {
  const errors: RuleError[] = []
  const push: Push = (path, code, message) => {
    errors.push({ path, code, message })
  }

  if (!isObject(input)) {
    push('', 'notObject', 'rule definition must be a non-null object')
    return errors
  }

  if (input.schemaVersion !== SCHEMA_VERSION) {
    push('schemaVersion', 'unsupportedSchemaVersion', `schemaVersion must be ${SCHEMA_VERSION}`)
  }

  requireString(input, 'id', '', push)
  requireString(input, 'name', '', push)

  let form: RuleForm | undefined
  if (input.form !== undefined) {
    if (!isRuleForm(input.form)) {
      push('form', 'unknownForm', 'form must be "linear" or "circular"')
    } else {
      form = input.form
    }
  }

  if (form === 'circular') {
    if (input.disc === undefined) {
      push('disc', 'missingField', 'disc is required for a circular rule')
    } else {
      validateDisc(input.disc, 'disc', push)
    }
    if (input.physical !== undefined) validatePhysical(input.physical, 'physical', push)
  } else {
    if (input.disc !== undefined) {
      push('disc', 'unexpectedDisc', 'disc is only valid for a circular rule')
    }
    if (input.physical === undefined) {
      push('physical', 'missingField', 'physical is required')
    } else {
      validatePhysical(input.physical, 'physical', push)
    }
  }

  if (input.faces === undefined) {
    push('faces', 'missingField', 'faces is required')
  } else {
    validateFaces(input.faces, 'faces', push)
  }

  return errors
}

function validatePhysical(value: unknown, path: string, push: Push): void {
  if (!isObject(value)) {
    push(path, 'wrongType', 'physical must be an object')
    return
  }

  const faceWidth = requiredNumber(value, 'faceWidthMm', path, push)
  if (faceWidth !== undefined && faceWidth <= 0) {
    push(`${path}.faceWidthMm`, 'nonPositivePhysical', 'faceWidthMm must be > 0')
  }
  const faceHeight = requiredNumber(value, 'faceHeightMm', path, push)
  if (faceHeight !== undefined && faceHeight <= 0) {
    push(`${path}.faceHeightMm`, 'nonPositivePhysical', 'faceHeightMm must be > 0')
  }

  if (value.rowCount === undefined) {
    push(`${path}.rowCount`, 'missingField', 'rowCount is required')
  } else if (!isObject(value.rowCount)) {
    push(`${path}.rowCount`, 'wrongType', 'rowCount must be an object')
  } else {
    const rowCount = value.rowCount
    for (const section of SECTIONS) {
      const count = requiredNumber(rowCount, section, `${path}.rowCount`, push)
      if (count !== undefined && count <= 0) {
        push(`${path}.rowCount.${section}`, 'nonPositivePhysical', 'row count must be > 0')
      }
    }
  }

  requiredNumber(value, 'grooveRowRatio', path, push)
  requiredNumber(value, 'marginRowRatio', path, push)

  const leftGutter = requiredNumber(value, 'leftGutterMm', path, push)
  if (leftGutter !== undefined && leftGutter < 0) {
    push(`${path}.leftGutterMm`, 'nonPositivePhysical', 'leftGutterMm must be >= 0')
  }
  const rightPanel = requiredNumber(value, 'rightPanelMm', path, push)
  if (rightPanel !== undefined && rightPanel < 0) {
    push(`${path}.rightPanelMm`, 'nonPositivePhysical', 'rightPanelMm must be >= 0')
  }
  const numeral = requiredNumber(value, 'numeralRatio', path, push)
  if (numeral !== undefined && numeral <= 0) {
    push(`${path}.numeralRatio`, 'nonPositivePhysical', 'numeralRatio must be > 0')
  }
}

function validateDisc(value: unknown, path: string, push: Push): void {
  if (!isObject(value)) {
    push(path, 'wrongType', 'disc must be an object')
    return
  }
  const outer = requiredNumber(value, 'outerRadiusMm', path, push)
  const inner = requiredNumber(value, 'innerRadiusMm', path, push)
  const sheet = requiredNumber(value, 'sheetSizeMm', path, push)
  if (outer === undefined || inner === undefined || sheet === undefined) return
  if (outer <= 0 || inner < 0 || inner >= outer || sheet < 2 * outer) {
    push(
      path,
      'invalidDisc',
      'disc radii are out of order (need 0 <= inner < outer and sheet >= 2*outer)',
    )
  }
}

function validateFaces(value: unknown, path: string, push: Push): void {
  if (!isObject(value)) {
    push(path, 'wrongType', 'faces must be an object')
    return
  }
  for (const face of FACES) {
    const facePath = `${path}.${face}`
    const faceValue = value[face]
    if (faceValue === undefined) {
      push(facePath, 'missingField', `${face} face is required`)
      continue
    }
    if (!isObject(faceValue)) {
      push(facePath, 'wrongType', 'face must be an object')
      continue
    }
    for (const section of SECTIONS) {
      const sectionPath = `${facePath}.${section}`
      const scales = faceValue[section]
      if (scales === undefined) {
        push(sectionPath, 'missingField', `${section} section is required`)
        continue
      }
      if (!Array.isArray(scales)) {
        push(sectionPath, 'wrongType', `${section} section must be an array`)
        continue
      }
      // Uniqueness is per (face, section): the same id may appear in two
      // different sections of the same face.
      const seen = new Set<string>()
      scales.forEach((scale, index) => {
        const scalePath = `${sectionPath}[${index}]`
        const id = validateScale(scale, scalePath, push)
        if (id === undefined) return
        if (seen.has(id)) {
          push(
            `${scalePath}.id`,
            'duplicateScaleId',
            `duplicate scale id "${id}" in ${face}.${section}`,
          )
        } else {
          seen.add(id)
        }
      })
    }
  }
}

function validateScale(value: unknown, path: string, push: Push): string | undefined {
  if (!isObject(value)) {
    push(path, 'wrongType', 'scale must be an object')
    return undefined
  }
  requireString(value, 'id', path, push)
  requireString(value, 'name', path, push)
  requireEnum(value.type, `${path}.type`, SCALE_TYPES, push, 'unknownScaleType')
  requireEnum(value.orientation, `${path}.orientation`, ORIENTATIONS, push, 'wrongType')

  if (value.sharedLabels !== undefined)
    validateSharedLabels(value.sharedLabels, `${path}.sharedLabels`, push)
  if (value.notes !== undefined) validateNotes(value.notes, `${path}.notes`, push)
  if (value.numbersBelow !== undefined && typeof value.numbersBelow !== 'boolean') {
    push(`${path}.numbersBelow`, 'wrongType', 'numbersBelow must be a boolean')
  }
  if (value.tickEdge !== undefined && !TICK_EDGES.includes(value.tickEdge as string)) {
    push(`${path}.tickEdge`, 'wrongType', 'tickEdge must be "roof" or "floor"')
  }

  if (value.calculation === undefined) {
    push(`${path}.calculation`, 'missingField', 'calculation is required')
  } else {
    validateCalculation(value.calculation, `${path}.calculation`, push)
  }

  return typeof value.id === 'string' ? value.id : undefined
}

function validateCalculation(value: unknown, path: string, push: Push): void {
  if (!isObject(value)) {
    push(path, 'wrongType', 'calculation must be an object')
    return
  }

  const domain = validateDomain(value.domain, `${path}.domain`, push)

  if (value.map === undefined) {
    push(`${path}.map`, 'missingField', 'map is required')
  } else {
    validateMap(value.map, `${path}.map`, domain, push)
  }

  if (value.read !== undefined) validateRead(value.read, `${path}.read`, push)

  if (value.intervals === undefined) {
    push(`${path}.intervals`, 'missingField', 'intervals is required')
  } else if (!Array.isArray(value.intervals)) {
    push(`${path}.intervals`, 'wrongType', 'intervals must be an array')
  } else {
    validateIntervals(value.intervals, `${path}.intervals`, domain, push)
  }

  if (value.decades !== undefined) validateDecades(value.decades, `${path}.decades`, push)
  if (value.labels !== undefined) validateLabels(value.labels, `${path}.labels`, push)
  if (value.marks !== undefined) validateMarks(value.marks, `${path}.marks`, push)
  if (value.labelFormat !== undefined)
    validateLabelFormat(value.labelFormat, `${path}.labelFormat`, push)
  if (value.labelLevel !== undefined)
    validateLabelLevel(value.labelLevel, `${path}.labelLevel`, push)
  if (value.decreasing !== undefined && typeof value.decreasing !== 'boolean') {
    push(`${path}.decreasing`, 'wrongType', 'decreasing must be a boolean')
  }
}

function validateDomain(value: unknown, path: string, push: Push): [number, number] | undefined {
  if (!Array.isArray(value)) {
    push(path, 'wrongType', 'domain must be a two-number array')
    return undefined
  }
  if (value.length !== 2) {
    push(path, 'wrongType', 'domain must have exactly two elements')
    return undefined
  }
  const numbers: number[] = []
  let ok = true
  value.forEach((element, index) => {
    if (typeof element !== 'number') {
      push(`${path}[${index}]`, 'wrongType', 'domain element must be a number')
      ok = false
      return
    }
    if (!Number.isFinite(element)) {
      push(`${path}[${index}]`, 'nonFiniteNumber', 'domain element must be finite')
      ok = false
      return
    }
    numbers.push(element)
  })
  if (!ok) return undefined
  const [min, max] = numbers as [number, number]
  if (min >= max) {
    push(path, 'invalidDomain', 'domain[0] must be < domain[1]')
    return undefined
  }
  return [min, max]
}

function validateMap(
  value: unknown,
  path: string,
  domain: [number, number] | undefined,
  push: Push,
): void {
  if (!isObject(value)) {
    push(path, 'wrongType', 'map must be an object')
    return
  }
  switch (value.kind) {
    case 'log':
      requiredNumber(value, 'anchor', path, push)
      if (value.normalize !== undefined && typeof value.normalize !== 'boolean') {
        push(`${path}.normalize`, 'wrongType', 'normalize must be a boolean')
      }
      break
    case 'linear':
      break
    case 'fn':
      if (requireEnum(value.fn, `${path}.fn`, FN_NAMES, push, 'unknownFn')) {
        requiredNumber(value, 'from', path, push)
      }
      break
    case 'valueFn':
      if (requireEnum(value.fn, `${path}.fn`, VALUE_FN_NAMES, push, 'unknownFn')) {
        requiredNumber(value, 'from', path, push)
      }
      break
    case 'expr': {
      const position = requireString(value, 'position', path, push)
      if (value.inverse !== undefined && typeof value.inverse !== 'string') {
        push(`${path}.inverse`, 'wrongType', 'inverse must be a string')
      }
      if (position !== undefined) {
        validateExpressionSource(position, `${path}.position`, 'x', domain, push)
      }
      if (typeof value.inverse === 'string') {
        validateExpressionSource(value.inverse, `${path}.inverse`, 'p', undefined, push)
      }
      break
    }
    default:
      push(path, 'unknownMapKind', `unknown map kind: ${String(value.kind)}`)
  }
}

// Parse-check one expression and, for the forward mapping, sample it over the
// domain: a map must be finite and strictly monotonic so it is invertible.
function validateExpressionSource(
  source: string,
  path: string,
  variable: string,
  domain: [number, number] | undefined,
  push: Push,
): void {
  const problem = validateExpression(source, variable)
  if (problem !== null) {
    push(path, 'invalidExpression', problem)
    return
  }
  if (domain === undefined) return
  try {
    const fn = compileExpression(source, variable)
    let previous = fn(domain[0])
    if (!Number.isFinite(previous)) {
      push(path, 'invalidExpression', 'expression is not finite at the domain start')
      return
    }
    let direction = 0
    const steps = 32
    for (let i = 1; i <= steps; i++) {
      const x = domain[0] + ((domain[1] - domain[0]) * i) / steps
      const y = fn(x)
      if (!Number.isFinite(y)) {
        push(path, 'invalidExpression', 'expression is not finite across the domain')
        return
      }
      const delta = y - previous
      if (delta === 0) {
        push(path, 'invalidExpression', 'expression is not strictly monotonic across the domain')
        return
      }
      const sign = delta > 0 ? 1 : -1
      if (direction === 0) direction = sign
      else if (sign !== direction) {
        push(path, 'invalidExpression', 'expression is not monotonic across the domain')
        return
      }
      previous = y
    }
  } catch (error) {
    push(path, 'invalidExpression', error instanceof Error ? error.message : 'invalid expression')
  }
}

function validateRead(value: unknown, path: string, push: Push): void {
  if (!isObject(value)) {
    push(path, 'wrongType', 'read must be an object')
    return
  }
  if (!requireEnum(value.kind, `${path}.kind`, READ_KINDS, push, 'unknownReadKind')) return
  const scale = requiredNumber(value, 'scale', path, push)
  if (scale !== undefined && scale <= 0) {
    push(`${path}.scale`, 'nonPositiveReadScale', 'scale must be > 0')
  }
}

function validateIntervals(
  intervals: unknown[],
  path: string,
  domain: [number, number] | undefined,
  push: Push,
): void {
  intervals.forEach((value, index) => {
    const intervalPath = `${path}[${index}]`
    if (!isObject(value)) {
      push(intervalPath, 'wrongType', 'interval must be an object')
      return
    }
    const from = requiredNumber(value, 'from', intervalPath, push)
    const to = requiredNumber(value, 'to', intervalPath, push)

    let maxStep = 0
    if (value.steps === undefined) {
      push(`${intervalPath}.steps`, 'missingField', 'steps is required')
    } else if (!Array.isArray(value.steps)) {
      push(`${intervalPath}.steps`, 'wrongType', 'steps must be an array')
    } else {
      value.steps.forEach((entry, stepIndex) => {
        const stepPath = `${intervalPath}.steps[${stepIndex}]`
        if (!isObject(entry)) {
          push(stepPath, 'wrongType', 'step entry must be an object')
          return
        }
        const step = requiredNumber(entry, 'step', stepPath, push)
        if (step !== undefined) {
          if (step > maxStep) maxStep = step
          if (step <= 0) push(`${stepPath}.step`, 'nonPositiveStep', 'step must be > 0')
        }
        if (entry.level !== 1 && entry.level !== 2 && entry.level !== 3) {
          push(`${stepPath}.level`, 'wrongType', 'level must be 1, 2 or 3')
        }
      })
    }

    if (value.labels !== undefined) {
      if (!Array.isArray(value.labels)) {
        push(`${intervalPath}.labels`, 'wrongType', 'labels must be an array')
      } else {
        value.labels.forEach((label, labelIndex) => {
          if (typeof label === 'number' && Number.isFinite(label)) return
          const code: RuleErrorCode = typeof label === 'number' ? 'nonFiniteNumber' : 'wrongType'
          push(
            `${intervalPath}.labels[${labelIndex}]`,
            code,
            'interval label must be a finite number',
          )
        })
      }
    }

    if (domain !== undefined && from !== undefined && from < domain[0]) {
      push(intervalPath, 'intervalOutOfDomain', 'interval starts before the domain')
    }
    if (domain !== undefined && to !== undefined && to > domain[1] + maxStep) {
      push(
        intervalPath,
        'intervalOutOfDomain',
        'interval extends past the domain by more than one step',
      )
    }
  })
}

function validateDecades(value: unknown, path: string, push: Push): void {
  if (typeof value !== 'number') {
    push(path, 'wrongType', 'decades must be a number')
    return
  }
  if (!Number.isFinite(value)) {
    push(path, 'nonFiniteNumber', 'decades must be finite')
    return
  }
  if (value < 1) push(path, 'invalidDecades', 'decades must be >= 1')
}

function validateLabels(value: unknown, path: string, push: Push): void {
  if (!Array.isArray(value)) {
    push(path, 'wrongType', 'labels must be an array')
    return
  }
  value.forEach((label, index) => {
    const labelPath = `${path}[${index}]`
    if (typeof label === 'number') {
      if (!Number.isFinite(label)) push(labelPath, 'nonFiniteNumber', 'label must be finite')
      return
    }
    if (isObject(label)) {
      requiredNumber(label, 'value', labelPath, push)
      requireString(label, 'text', labelPath, push)
      return
    }
    push(labelPath, 'wrongType', 'label must be a number or a { value, text } object')
  })
}

function validateMarks(value: unknown, path: string, push: Push): void {
  if (!Array.isArray(value)) {
    push(path, 'wrongType', 'marks must be an array')
    return
  }
  value.forEach((mark, index) => {
    const markPath = `${path}[${index}]`
    if (!isObject(mark)) {
      push(markPath, 'wrongType', 'mark must be an object')
      return
    }
    const markValue = mark.value
    if (markValue === 'infinity') {
      // Ruling 3: the string 'infinity' is a valid mark value.
    } else if (typeof markValue === 'number') {
      if (!Number.isFinite(markValue))
        push(`${markPath}.value`, 'nonFiniteNumber', 'mark value must be finite')
    } else {
      push(`${markPath}.value`, 'wrongType', 'mark value must be a number or "infinity"')
    }
    requireString(mark, 'label', markPath, push)
  })
}

function validateLabelFormat(value: unknown, path: string, push: Push): void {
  if (typeof value === 'string') {
    if (!LABEL_FORMATS.includes(value))
      push(path, 'unknownLabelFormat', `unknown label format: ${value}`)
    return
  }
  if (isObject(value) && value.kind === 'number') {
    const decimals = requiredNumber(value, 'decimals', path, push)
    if (decimals !== undefined && (!Number.isInteger(decimals) || decimals < 0)) {
      push(`${path}.decimals`, 'wrongType', 'decimals must be a non-negative integer')
    }
    return
  }
  push(
    path,
    'unknownLabelFormat',
    'label format must be a known name or { kind: "number", decimals }',
  )
}

function validateLabelLevel(value: unknown, path: string, push: Push): void {
  if (value === 'keep') return
  if (value !== 1 && value !== 2 && value !== 3) {
    push(path, 'wrongType', 'labelLevel must be 1, 2, 3 or "keep"')
  }
}

function validateSharedLabels(value: unknown, path: string, push: Push): void {
  if (!Array.isArray(value)) {
    push(path, 'wrongType', 'sharedLabels must be an array')
    return
  }
  value.forEach((label, index) => {
    const labelPath = `${path}[${index}]`
    if (!isObject(label)) {
      push(labelPath, 'wrongType', 'shared label must be an object')
      return
    }
    requireString(label, 'id', labelPath, push)
    requireString(label, 'name', labelPath, push)
    requireEnum(label.orientation, `${labelPath}.orientation`, ORIENTATIONS, push, 'wrongType')
    if (label.format !== undefined && label.format !== 'degree' && label.format !== 'bare') {
      push(`${labelPath}.format`, 'wrongType', 'format must be "degree" or "bare"')
    }
  })
}

function validateNotes(value: unknown, path: string, push: Push): void {
  if (!Array.isArray(value)) {
    push(path, 'wrongType', 'notes must be an array')
    return
  }
  value.forEach((note, index) => {
    const notePath = `${path}[${index}]`
    if (typeof note === 'string') return
    if (!Array.isArray(note)) {
      push(notePath, 'wrongType', 'note must be a string or an array of parts')
      return
    }
    note.forEach((part, partIndex) => {
      const partPath = `${notePath}[${partIndex}]`
      if (!isObject(part)) {
        push(partPath, 'wrongType', 'note part must be an object')
        return
      }
      requireString(part, 'text', partPath, push)
      if (part.red !== undefined && typeof part.red !== 'boolean') {
        push(`${partPath}.red`, 'wrongType', 'red must be a boolean')
      }
    })
  })
}
