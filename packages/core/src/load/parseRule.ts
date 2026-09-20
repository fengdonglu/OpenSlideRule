// The single entry point for turning untrusted JSON into a runtime rule.
// Validation runs first and completely; a rule is only resolved when the
// document is error-free, so a partially built structure is never returned.

import type { RuleDefinition, RuleError } from '../schema/types'
import type { SlideRuleStructure } from '../types/scale'
import { validateRule } from '../schema/validate'
import { resolveRule } from './resolve'

export function parseRule(
  input: unknown,
): { ok: true; rule: SlideRuleStructure } | { ok: false; errors: RuleError[] } {
  const errors = validateRule(input)
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, rule: resolveRule(input as RuleDefinition) }
}
