import { describe, it, expect } from 'vitest'
import { computeFaceLayout, type FaceLayout } from '@slide-rule/renderer'
import { getSections, MODEL_1002, MODEL_57 } from '@slide-rule/core'
import type { SlideRuleSide, ScaleSectionGroup } from '@slide-rule/core'
import {
  computeReadingRows,
  FACE_LABEL_BAR_PX,
  RULE_VIEWPORT_BORDER_PX,
} from './cursorReadingsRows'

function sidesOf(
  model: typeof MODEL_1002,
  sides: SlideRuleSide[],
): { side: SlideRuleSide; sections: ScaleSectionGroup }[] {
  return sides.map((side) => ({ side, sections: getSections(model, side) }))
}

const WIDTH = 1200
const layout1002: FaceLayout = computeFaceLayout(MODEL_1002.physical, WIDTH)

describe('computeReadingRows', () => {
  it('matches the face height and hides the label in single-face mode', () => {
    const out = computeReadingRows(layout1002, sidesOf(MODEL_1002, ['front']), false)

    expect(out.faces).toHaveLength(1)
    expect(out.faces[0].showLabel).toBe(false)
    expect(out.faces[0].labelTopPx).toBe(RULE_VIEWPORT_BORDER_PX)
    expect(out.heightPx).toBeCloseTo(RULE_VIEWPORT_BORDER_PX + layout1002.faceHeightPx)
  })

  it('lists every scale of the face in rule order', () => {
    const out = computeReadingRows(layout1002, sidesOf(MODEL_1002, ['front']), false)
    const rows = out.faces[0].rows

    expect(rows).toHaveLength(14)
    expect(rows[0].scale.id).toBe('sh2')
    expect(rows[13].scale.id).toBe('th2')
  })

  it('derives every row position from the rule layout maths', () => {
    const out = computeReadingRows(layout1002, sidesOf(MODEL_1002, ['front']), false)
    const rows = out.faces[0].rows
    const px = layout1002.pxPerMm
    const rowHeight = layout1002.rowHeightMm * px

    // Row 0 sits on the first upper row; the section's own top already
    // contains the top margin, so only the viewport border offsets it.
    expect(rows[0].topPx).toBeCloseTo(
      RULE_VIEWPORT_BORDER_PX + layout1002.sections.upper.topMm * px,
    )
    expect(rows[0].heightPx).toBeCloseTo(rowHeight)
    expect(rows[1].topPx - rows[0].topPx).toBeCloseTo(rowHeight)

    // The groove separates the sections: the first middle row starts after the
    // four upper rows plus the groove height.
    expect(rows[4].topPx).toBeCloseTo(
      RULE_VIEWPORT_BORDER_PX + layout1002.sections.middle.topMm * px,
    )
    expect(rows[10].topPx).toBeCloseTo(
      RULE_VIEWPORT_BORDER_PX + layout1002.sections.lower.topMm * px,
    )
  })

  it('stacks both faces with a label bar before each in dual-face mode', () => {
    const out = computeReadingRows(layout1002, sidesOf(MODEL_1002, ['front', 'back']), true)
    const px = layout1002.pxPerMm
    const secondFaceTop = RULE_VIEWPORT_BORDER_PX + FACE_LABEL_BAR_PX + layout1002.faceHeightPx

    expect(out.faces.map((f) => f.side)).toEqual(['front', 'back'])
    expect(out.faces[0].showLabel).toBe(true)
    expect(out.faces[1].labelTopPx).toBeCloseTo(secondFaceTop)
    expect(out.faces[1].rows[0].topPx).toBeCloseTo(
      secondFaceTop + FACE_LABEL_BAR_PX + layout1002.sections.upper.topMm * px,
    )
    expect(out.heightPx).toBeCloseTo(
      RULE_VIEWPORT_BORDER_PX + 2 * (FACE_LABEL_BAR_PX + layout1002.faceHeightPx),
    )
  })

  it('places a separator at the centre of each groove in single-face mode', () => {
    const out = computeReadingRows(layout1002, sidesOf(MODEL_1002, ['front']), false)
    const px = layout1002.pxPerMm
    const upperMidMm = layout1002.grooveTopMm.upper + layout1002.grooveMm / 2
    const lowerMidMm = layout1002.grooveTopMm.lower + layout1002.grooveMm / 2

    expect(out.separators).toHaveLength(2)
    expect(out.separators[0]).toBeCloseTo(RULE_VIEWPORT_BORDER_PX + upperMidMm * px)
    expect(out.separators[1]).toBeCloseTo(RULE_VIEWPORT_BORDER_PX + lowerMidMm * px)
  })

  it('adds a face-boundary separator and repeats the grooves per face in dual-face mode', () => {
    const out = computeReadingRows(layout1002, sidesOf(MODEL_1002, ['front', 'back']), true)
    const px = layout1002.pxPerMm
    const faceBlockPx = FACE_LABEL_BAR_PX + layout1002.faceHeightPx
    const boundary = RULE_VIEWPORT_BORDER_PX + faceBlockPx
    const upperMidMm = layout1002.grooveTopMm.upper + layout1002.grooveMm / 2
    const lowerMidMm = layout1002.grooveTopMm.lower + layout1002.grooveMm / 2

    expect(out.separators).toHaveLength(5)
    expect(out.separators[0]).toBeCloseTo(
      RULE_VIEWPORT_BORDER_PX + FACE_LABEL_BAR_PX + upperMidMm * px,
    )
    expect(out.separators[1]).toBeCloseTo(
      RULE_VIEWPORT_BORDER_PX + FACE_LABEL_BAR_PX + lowerMidMm * px,
    )
    expect(out.separators[2]).toBeCloseTo(boundary)
    expect(out.separators[3]).toBeCloseTo(boundary + FACE_LABEL_BAR_PX + upperMidMm * px)
    expect(out.separators[4]).toBeCloseTo(boundary + FACE_LABEL_BAR_PX + lowerMidMm * px)
  })

  it('keeps the separators ordered top to bottom', () => {
    const out = computeReadingRows(layout1002, sidesOf(MODEL_1002, ['front', 'back']), true)
    for (let i = 1; i < out.separators.length; i++) {
      expect(out.separators[i]).toBeGreaterThan(out.separators[i - 1])
    }
  })

  it('works for the smaller single-faced 57 (2/4/3 rows)', () => {
    const layout57 = computeFaceLayout(MODEL_57.physical, 600)
    const out = computeReadingRows(layout57, sidesOf(MODEL_57, ['front']), false)

    expect(out.faces[0].rows.map((r) => r.scale.id)).toEqual([
      'K',
      'A',
      'S',
      'ST',
      'T',
      'C',
      'D',
      'DI',
      'L',
    ])
  })

  it('produces only the top border offset when there is no visible side', () => {
    expect(computeReadingRows(layout1002, [], false)).toEqual({
      heightPx: RULE_VIEWPORT_BORDER_PX,
      faces: [],
      separators: [],
    })
  })
})
