// Shared slide-rule helpers: the colour constants and the structural accessors
// used by the runtime model modules and the JSON loader. Kept here (not in
// model1002.ts) so load/* can import them without a data -> load cycle.

import type {
  ScaleSectionGroup,
  SharedLabel,
  SlideRuleSide,
  SlideRuleStructure,
} from '../types/scale'

// Colours: black = increasing, red = decreasing (see docs/glossary.md).
export const BLACK = '#1f2937'
export const RED = '#dc2626'

type Side = 'front' | 'back'

// Parenthesised shared label (red, decreasing, drawn on the previous scale band).
// Also used by the Type 57.
export function shared(name: string, format: SharedLabel['format'] = 'degree'): SharedLabel {
  return { id: name, name, orientation: 'decreasing', color: RED, format }
}

// Get the three sections of one side of a model.
export function getSections(model: SlideRuleStructure, side: Side): ScaleSectionGroup {
  return model[side]
}

// Total number of scales of a model (excluding parenthesised shared labels;
// 1002 has 28).
export function countScales(model: SlideRuleStructure): number {
  const c = (s: ScaleSectionGroup) => s.upper.length + s.middle.length + s.lower.length
  return c(model.front) + c(model.back)
}

// Whether a side of a model carries any scale. The Type 57 is single-faced, so
// its back is empty and the UI must not offer it.
export function sideHasScales(model: SlideRuleStructure, side: SlideRuleSide): boolean {
  const s = model[side]
  return s.upper.length + s.middle.length + s.lower.length > 0
}
