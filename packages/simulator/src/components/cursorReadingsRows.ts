// Row geometry for the right-hand readings panel.
// Mirrors the rule's own layout maths (@slide-rule/renderer `computeFaceLayout`): each
// scale row sits at the exact vertical position of the same row on the rule, and
// the panels stack both faces the same way SlideRule.vue does. Keeping this pure
// makes the alignment testable without mounting the component.
import type { FaceLayout } from '@slide-rule/renderer'
import type { ScaleSection, ScaleSectionGroup, SlideRuleSide } from '@slide-rule/core'

// Face-name band shown above each face in dual-face mode. Must match
// SlideRule.vue's LABEL_BAR_H (and the `.face-label` CSS height).
export const FACE_LABEL_BAR_PX = 24

// Height of the rule viewport's own 1px top border. The readings panel is
// stretched to the viewport, so its rows start one border-width lower than the
// panel's top edge, exactly like the rule body.
export const RULE_VIEWPORT_BORDER_PX = 1

const SECTION_ORDER: ScaleSection[] = ['upper', 'middle', 'lower']

export interface ReadingRow {
  key: string
  scale: ScaleSectionGroup[ScaleSection][number]
  // Distance from the top of the panel to the top of this row (pixels).
  topPx: number
  // Height of the row (pixels), i.e. one rule row.
  heightPx: number
}

export interface ReadingFace {
  side: SlideRuleSide
  showLabel: boolean
  labelTopPx: number
  rows: ReadingRow[]
}

export interface ReadingsLayout {
  // Full height of the stacked faces, including the viewport border offset.
  heightPx: number
  faces: ReadingFace[]
  // Pixel Y of every horizontal separator, relative to the panel top: the centre
  // of each groove, plus the boundary between faces in dual-face mode. Ordered
  // top to bottom.
  separators: number[]
}

// Lay out one reading row per scale, in rule order, for each visible face.
export function computeReadingRows(
  layout: FaceLayout,
  sides: { side: SlideRuleSide; sections: ScaleSectionGroup }[],
  dualFace: boolean,
): ReadingsLayout {
  const labelPx = dualFace ? FACE_LABEL_BAR_PX : 0
  const faceBlockPx = labelPx + layout.faceHeightPx
  const rowHeightPx = layout.rowHeightMm * layout.pxPerMm

  const separators: number[] = []
  const faces: ReadingFace[] = sides.map(({ side, sections }, faceIndex) => {
    const faceTopPx = RULE_VIEWPORT_BORDER_PX + faceIndex * faceBlockPx
    const rowsBasePx = faceTopPx + labelPx
    const rows: ReadingRow[] = []

    // The face boundary (top of the next face's label band) separates the two
    // faces in dual-face mode.
    if (faceIndex > 0) separators.push(faceTopPx)
    // Each groove spans a band; draw the line at its centre, exactly as the
    // rule's own hairline does.
    for (const grooveTopMm of [layout.grooveTopMm.upper, layout.grooveTopMm.lower]) {
      const centerPx = (grooveTopMm + layout.grooveMm / 2) * layout.pxPerMm
      separators.push(rowsBasePx + centerPx)
    }

    for (const section of SECTION_ORDER) {
      const sectionLayout = layout.sections[section]
      sections[section].forEach((scale, rowIndex) => {
        rows.push({
          key: `${side}-${section}-${scale.id}`,
          scale,
          topPx:
            rowsBasePx + (sectionLayout.topMm + rowIndex * layout.rowHeightMm) * layout.pxPerMm,
          heightPx: rowHeightPx,
        })
      })
    }

    return { side, showLabel: dualFace, labelTopPx: faceTopPx, rows }
  })

  return {
    heightPx: RULE_VIEWPORT_BORDER_PX + sides.length * faceBlockPx,
    faces,
    separators,
  }
}
