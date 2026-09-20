// Bundled built-in rules. The canonical data lives in packages/core/rules/*.json
// and is imported here so the bundler inlines it (no node:fs at runtime). This is
// the only module that knows the built-in file names; callers consume the parsed
// runtime structures.

import rule1002Json from '../../rules/1002.json'
import type57Json from '../../rules/type-57.json'
import type { RuleDefinition } from '../schema/types'
import type { SlideRuleStructure } from '../types/scale'
import { parseRule } from './parseRule'

// Freeze the bundled data (arrays and nested objects) so a caller cannot mutate
// it and silently change what the built-in rules parse to.
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
  }
  return value
}

// The JSON is untrusted at the type level; cast once at this boundary and let
// parseRule validate the real shape.
const DEFINITIONS: RuleDefinition[] = deepFreeze([
  rule1002Json,
  type57Json,
]) as unknown as RuleDefinition[]

export function builtInRuleDefinitions(): RuleDefinition[] {
  return DEFINITIONS
}

// The parsed built-in rules, parsed once. A failure here is a programming error
// in the bundled JSON, not user input, so it throws rather than returning a
// partial result.
let cachedRules: SlideRuleStructure[] | undefined

export function builtInRules(): SlideRuleStructure[] {
  if (cachedRules === undefined) {
    cachedRules = builtInRuleDefinitions().map((definition) => {
      const parsed = parseRule(definition)
      if (!parsed.ok) {
        const details = parsed.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
        throw new Error(`built-in rule ${definition.id} failed validation: ${details}`)
      }
      return parsed.rule
    })
  }
  return cachedRules
}
