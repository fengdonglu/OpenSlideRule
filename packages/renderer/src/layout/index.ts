// Face layout computation.
// Uses millimetres as the single coordinate system and converts the physical
// spec into screen pixels plus per-section / per-row positions.
// pxPerMm is the only zoom entry point (a future zoom UI only changes it).

import type { PhysicalSpec, ScaleSection, Tick } from '@slide-rule/core'

// Section layout (millimetre coordinates relative to the face origin).
// bleedTop/Bottom: how far the section may draw into the groove so that the
// graduations next to a groove reach the slot line exactly.
export interface SectionLayout {
  section: ScaleSection
  topMm: number
  heightMm: number
  rows: number
  bleedTopMm: number
  bleedBottomMm: number
}

// Whole-face layout.
export interface FaceLayout {
  pxPerMm: number
  faceWidthMm: number
  faceHeightMm: number
  faceWidthPx: number
  faceHeightPx: number
  rowHeightMm: number
  grooveMm: number
  marginMm: number
  numeralMm: number
  tickLeftMm: number
  tickWidthMm: number
  sections: Record<ScaleSection, SectionLayout>
  grooveTopMm: { upper: number; lower: number }
}

const SECTION_ORDER: ScaleSection[] = ['upper', 'middle', 'lower']

// Derive the whole-face layout from the physical spec and the available width.
export function computeFaceLayout(spec: PhysicalSpec, availableWidthPx: number): FaceLayout {
  const widthPx = Math.max(0, availableWidthPx)
  const pxPerMm = spec.faceWidthMm > 0 ? widthPx / spec.faceWidthMm : 0

  // Solve row height: margins + 14 rows + 2 grooves = face height.
  const totalRows = spec.rowCount.upper + spec.rowCount.middle + spec.rowCount.lower
  const rowHeightMm =
    spec.faceHeightMm / (totalRows + 2 * spec.grooveRowRatio + 2 * spec.marginRowRatio)
  const grooveMm = spec.grooveRowRatio * rowHeightMm
  const marginMm = spec.marginRowRatio * rowHeightMm
  const numeralMm = spec.numeralRatio * rowHeightMm

  const sections = {} as Record<ScaleSection, SectionLayout>
  let cursorMm = marginMm
  for (const section of SECTION_ORDER) {
    const rows = spec.rowCount[section]
    sections[section] = {
      section,
      topMm: cursorMm,
      heightMm: rows * rowHeightMm,
      rows,
      // Sections next to a groove bleed half the groove so their graduations can
      // touch the slot hairline.
      bleedTopMm: section === 'upper' ? 0 : grooveMm / 2,
      bleedBottomMm: section === 'lower' ? 0 : grooveMm / 2,
    }
    cursorMm += rows * rowHeightMm + grooveMm
  }

  return {
    pxPerMm,
    faceWidthMm: spec.faceWidthMm,
    faceHeightMm: spec.faceHeightMm,
    faceWidthPx: spec.faceWidthMm * pxPerMm,
    faceHeightPx: spec.faceHeightMm * pxPerMm,
    rowHeightMm,
    grooveMm,
    marginMm,
    numeralMm,
    tickLeftMm: spec.leftGutterMm,
    tickWidthMm: spec.faceWidthMm - spec.leftGutterMm - spec.rightPanelMm,
    sections,
    grooveTopMm: {
      upper: sections.upper.topMm + sections.upper.heightMm,
      lower: sections.middle.topMm + sections.middle.heightMm,
    },
  }
}

// Top edge of row `rowIndex` inside a section (millimetres).
export function rowTopMm(layout: FaceLayout, section: ScaleSection, rowIndex: number): number {
  return layout.sections[section].topMm + rowIndex * layout.rowHeightMm
}

// Normalized tick position -> horizontal millimetre coordinate on the face.
// The position is in C/D decade units, so a scale read against C/D may sit
// outside 0..1 and is drawn there: the tick area's own span (0..1) stays the
// visual reference for C/D, and the overflow reaches into the name gutter or
// the note panel. Nothing is clamped or hidden.
export function tickX(tick: Tick, layout: FaceLayout): number {
  return layout.tickLeftMm + tick.position * layout.tickWidthMm
}
