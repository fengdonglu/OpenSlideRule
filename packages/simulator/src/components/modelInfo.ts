// View-model for the model-information dialog.
// Kept pure so both models' facts, scale order and printed notes can be tested
// without mounting the component (mirrors cursorReadingsRows.ts).
import { countScales, getSections, sideHasScales, isRedScale } from '@slide-rule/core'
import type {
  ScaleDefinition,
  ScaleNote,
  ScaleSection,
  SlideRuleSide,
  SlideRuleStructure,
} from '@slide-rule/core'

// Parts of a face, in rule order (top to bottom). The middle part is the slide.
export const INFO_SECTIONS: ScaleSection[] = ['upper', 'middle', 'lower']

// One note part: the plain string notes become a single black part, while the
// structured Type 57 notes keep their red function segments (cos / ctg / 1/x).
export interface ModelInfoNotePart {
  text: string
  red?: boolean
}

export interface ModelInfoScale {
  id: string
  name: string
  color: string
  isRed: boolean
  notes: ModelInfoNotePart[][]
}

export interface ModelInfoPart {
  section: ScaleSection
  scales: ModelInfoScale[]
}

export interface ModelInfoFace {
  side: SlideRuleSide
  parts: ModelInfoPart[]
}

export interface ModelInfo {
  id: string
  totalScales: number
  singleFaced: boolean
  faces: ModelInfoFace[]
}

// i18n path for a scale description. vue-i18n treats an apostrophe in a dotted
// key path specially, so the name H'2 cannot be reached as scaleDesc.H'2; the
// bracket form scaleDesc["<name>"] resolves every name, apostrophe included.
export function scaleDescKey(name: string): string {
  return `scaleDesc["${name}"]`
}

function toNote(note: ScaleNote): ModelInfoNotePart[] {
  return typeof note === 'string' ? [{ text: note }] : note
}

function toScale(scale: ScaleDefinition): ModelInfoScale {
  return {
    id: scale.id,
    name: scale.name,
    color: scale.color,
    isRed: isRedScale(scale),
    notes: (scale.notes ?? []).map(toNote),
  }
}

// Build the facts and the per-face/per-part scale listing for a model. Faces
// without scales are omitted, so the single-faced Type 57 never mentions a back.
export function buildModelInfo(model: SlideRuleStructure): ModelInfo {
  const sides: SlideRuleSide[] = ['front', 'back']
  const faces: ModelInfoFace[] = []

  for (const side of sides) {
    if (!sideHasScales(model, side)) continue
    const sections = getSections(model, side)
    const parts = INFO_SECTIONS.map((section) => ({
      section,
      scales: sections[section].map(toScale),
    })).filter((part) => part.scales.length > 0)
    faces.push({ side, parts })
  }

  return {
    id: model.id,
    totalScales: countScales(model),
    singleFaced: faces.length <= 1,
    faces,
  }
}
