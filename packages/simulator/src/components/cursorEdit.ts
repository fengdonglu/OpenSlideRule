// Inversion of a readings-panel value edit: convert a typed value back into the
// cursor position that displays it. The panel reads a scale at the cursor's local
// position on the rule (`cursorPosition - middleOffset` for the movable middle
// scale, see SlideRule.vue), so converting a middle-scale value back must add the
// slide offset before the cursor is moved. Without the offset a middle-scale edit
// would land the cursor one slide-length away. The result is clamped to the
// cursor's allowed 0..1 range, exactly as the drag path clamps it.
import { positionForValue } from '@slide-rule/core'
import type { ScaleDefinition } from '@slide-rule/core'

export function cursorPositionForValue(
  scale: ScaleDefinition,
  value: number,
  middleOffset: number,
): number | null {
  const localPosition = positionForValue(scale, value)
  if (localPosition === null) return null
  const position = scale.section === 'middle' ? localPosition + middleOffset : localPosition
  return Math.min(1, Math.max(0, position))
}

// The inverse of the reading, for the slide: the slide offset that makes a
// movable (middle) scale read `value` at the given (unmoved) cursor position.
// The panel reads a middle scale at `cursorPosition - middleOffset`, so the
// offset is `cursorPosition - positionForValue(scale, value)`. Returns null when
// the value is outside the scale.
export function slideOffsetForValue(
  scale: ScaleDefinition,
  value: number,
  cursorPosition: number,
): number | null {
  const localPosition = positionForValue(scale, value)
  if (localPosition === null) return null
  return cursorPosition - localPosition
}
