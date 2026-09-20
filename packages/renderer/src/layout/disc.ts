// Circular-rule geometry: the disc's square sheet and its concentric scale
// rings. The annulus is split into three equal bands (upper outermost, lower
// innermost); a section's band is divided equally among its scales.
import type { DiscSpec, ScaleSection } from '@slide-rule/core'

const SECTION_ORDER: ScaleSection[] = ['upper', 'middle', 'lower']

export interface DiscScaleRing {
  section: ScaleSection
  index: number
  innerRadiusMm: number
  outerRadiusMm: number
  tickOuterMm: number
  numeralRadiusMm: number
}

export interface DiscLayout {
  sheetSizeMm: number
  centerMm: number
  outerRadiusMm: number
  innerRadiusMm: number
  numeralMm: number
  rings: DiscScaleRing[]
}

function sectionCount(count: number): number {
  return Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1
}

export function computeDiscLayout(
  spec: DiscSpec,
  counts: Record<ScaleSection, number>,
): DiscLayout {
  const band = (spec.outerRadiusMm - spec.innerRadiusMm) / 3
  const normalized = SECTION_ORDER.map((section) => sectionCount(counts[section]))
  const smallestSubBand = band / Math.max(...normalized)
  // A glyph must not overflow its ring, so the numeral size is capped by the
  // narrowest sub-band (a section with many scales divides its band further).
  const numeralMm = Math.max(1, Math.min(band * 0.22, smallestSubBand * 0.5))
  const rings: DiscScaleRing[] = []

  SECTION_ORDER.forEach((section, sectionIndex) => {
    const count = normalized[sectionIndex]
    const sectionOuter = spec.outerRadiusMm - sectionIndex * band
    const sub = band / count
    for (let index = 0; index < count; index++) {
      const outer = sectionOuter - index * sub
      const inner = outer - sub
      rings.push({
        section,
        index,
        innerRadiusMm: inner,
        outerRadiusMm: outer,
        tickOuterMm: outer - sub * 0.12,
        numeralRadiusMm: inner + sub * 0.28,
      })
    }
  })

  return {
    sheetSizeMm: spec.sheetSizeMm,
    centerMm: spec.sheetSizeMm / 2,
    outerRadiusMm: spec.outerRadiusMm,
    innerRadiusMm: spec.innerRadiusMm,
    numeralMm,
    rings,
  }
}
