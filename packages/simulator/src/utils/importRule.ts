// Load a rule JSON produced by the generator or the designer, linear or
// circular. The function is framework-free and total.
import { parseRule } from '@slide-rule/core'
import type { RuleDefinition, RuleError, SlideRuleStructure } from '@slide-rule/core'

export type ImportRuleResult =
  | { kind: 'ok'; rule: SlideRuleStructure; definition: RuleDefinition }
  | { kind: 'errors'; errors: RuleError[] }
  | { kind: 'parseError'; message: string }

export function importRuleText(text: string): ImportRuleResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    return { kind: 'parseError', message: error instanceof Error ? error.message : String(error) }
  }

  try {
    const parsed = parseRule(value)
    if (!parsed.ok) return { kind: 'errors', errors: parsed.errors }
    return { kind: 'ok', rule: parsed.rule, definition: value as RuleDefinition }
  } catch (error) {
    return { kind: 'parseError', message: error instanceof Error ? error.message : String(error) }
  }
}
