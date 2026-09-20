// Slide rule model registry.
// A new model = one MODELS entry plus one SlideRuleStructure data file.
// Unimplemented models have available=false and are shown greyed out in the
// selector, which documents the expansion plan.

import type { SlideRuleStructure } from '../types/scale'
import { MODEL_1002 } from './model1002'
import { MODEL_57 } from './model57'

export interface SlideRuleModelEntry {
  id: string // also the i18n key: models.<id>
  available: boolean
}

export const MODELS: SlideRuleModelEntry[] = [
  { id: '1002', available: true },
  { id: '57', available: true }, // Type 57 pocket slide rule (single-faced)
]

export const DEFAULT_MODEL_ID = '1002'

// Implemented models -> structure data
const STRUCTURES: Record<string, SlideRuleStructure> = {
  '1002': MODEL_1002,
  '57': MODEL_57,
}

// Get a model structure; falls back to the default (the UI prevents selecting
// unimplemented models).
export function getModelStructure(id: string): SlideRuleStructure {
  return STRUCTURES[id] ?? MODEL_1002
}

export function isModelAvailable(id: string): boolean {
  return MODELS.some((m) => m.id === id && m.available)
}
