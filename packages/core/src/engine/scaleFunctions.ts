// Scale tick-function dispatch: builds the tick array for a given scale.
//
// Graduation levels: 1 = major (labelled), 2 = medium, 3 = fine.
// Layout rules follow the physical 1002 photos; see
// docs/domain/model-1002.md section 3.6 for the readings they are based on.

import type { ScaleDefinition, Tick } from '../types/scale'
import { generateScaledTicks } from './scaleCalculation'

// Generate every tick of a scale from its unified calculation. A scale without
// one (no model has any) has no graduations.
export function getScaleTicks(scale: ScaleDefinition): Tick[] {
  return scale.calc ? generateScaledTicks(scale.calc) : []
}
