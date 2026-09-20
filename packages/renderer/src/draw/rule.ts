// Whole-rule rendering: build standalone <svg> elements from the model for
// export, print and tests. Everything is 1:1 in millimetres: the viewBox and the
// width/height attributes carry mm, so the browser maps 1 user unit to 1 mm.
import type { ScaleDefinition, SlideRuleSide, SlideRuleStructure } from '@slide-rule/core'
import { computeFaceLayout } from '../layout'
import type { Theme } from '../themes'
import { drawSectionContent } from './section'

const SVG_NS = 'http://www.w3.org/2000/svg'

// Vertical gap between stacked faces on a print sheet (matches utils/export.ts).
export const PRINT_FACE_GAP_MM = 4

export interface RenderRuleOptions {
  face: SlideRuleSide
  theme: Theme
  titleOf?: (scale: ScaleDefinition) => string
  slideOffsetMm?: number
}

export interface RenderSheetOptions {
  faces: SlideRuleSide[]
  theme: Theme
  titleOf?: (scale: ScaleDefinition) => string
  slideOffsetMm?: number
  gapMm?: number
  // Paper colour. Defaults to white (print / export); the designer preview
  // passes the theme background so the preview follows the theme.
  paperFill?: string
}

// Append one face's three section bands to `parent`, in face-local millimetres.
// The middle band is the slide, so it alone carries the slide-offset transform.
function drawFace(
  parent: SVGElement,
  rule: SlideRuleStructure,
  face: SlideRuleSide,
  theme: Theme,
  titleOf: ((scale: ScaleDefinition) => string) | undefined,
  slideOffsetMm: number,
): void {
  const layout = computeFaceLayout(rule.physical, rule.physical.faceWidthMm)
  const group = rule[face]
  for (const section of ['upper', 'middle', 'lower'] as const) {
    const band = document.createElementNS(SVG_NS, 'g')
    band.setAttribute('class', 'section-band')
    band.setAttribute('data-section', section)
    band.setAttribute('data-face', face)
    if (section === 'middle' && slideOffsetMm !== 0) {
      band.setAttribute('transform', `translate(${slideOffsetMm}, 0)`)
    }
    drawSectionContent(band, {
      scales: group[section],
      section,
      layout,
      theme,
      titleOf,
    })
    parent.appendChild(band)
  }

  // A groove hairline on each band boundary (between upper/slide and
  // slide/lower), matching the on-screen rule and the disc's band separators.
  for (const y of [layout.grooveTopMm.upper, layout.grooveTopMm.lower]) {
    const groove = document.createElementNS(SVG_NS, 'line')
    groove.setAttribute('class', 'groove')
    groove.setAttribute('x1', '0')
    groove.setAttribute('y1', String(y))
    groove.setAttribute('x2', String(rule.physical.faceWidthMm))
    groove.setAttribute('y2', String(y))
    groove.setAttribute('stroke', theme.colors.gap)
    groove.setAttribute('stroke-width', '1')
    groove.setAttribute('vector-effect', 'non-scaling-stroke')
    parent.appendChild(groove)
  }
}

// A thin outline around a face or a disc sheet, in the rule's groove colour.
// The 1:1 sheets are in millimetres, so 0.3 is a visible 0.3 mm line in print.
function drawFrame(parent: SVGElement, widthMm: number, heightMm: number, theme: Theme): void {
  const frame = document.createElementNS(SVG_NS, 'rect')
  frame.setAttribute('class', 'sheet-frame')
  frame.setAttribute('x', '0')
  frame.setAttribute('y', '0')
  frame.setAttribute('width', String(widthMm))
  frame.setAttribute('height', String(heightMm))
  frame.setAttribute('fill', 'none')
  frame.setAttribute('stroke', theme.colors.gap)
  frame.setAttribute('stroke-width', '0.3')
  parent.appendChild(frame)
}

// One face at 1:1 mm, for export and tests.
export function renderRuleToSVG(rule: SlideRuleStructure, opts: RenderRuleOptions): SVGSVGElement {
  const { physical } = rule
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('viewBox', `0 0 ${physical.faceWidthMm} ${physical.faceHeightMm}`)
  svg.setAttribute('width', `${physical.faceWidthMm}mm`)
  svg.setAttribute('height', `${physical.faceHeightMm}mm`)
  drawFace(svg, rule, opts.face, opts.theme, opts.titleOf, opts.slideOffsetMm ?? 0)
  drawFrame(svg, physical.faceWidthMm, physical.faceHeightMm, opts.theme)
  return svg
}

// All visible faces stacked vertically at 1:1 mm on one sheet, on a white paper
// background. `faces` is in draw order (front first); an empty list yields a
// zero-height sheet.
export function renderRuleSheetToSVG(
  rule: SlideRuleStructure,
  opts: RenderSheetOptions,
): SVGSVGElement {
  const { faceWidthMm, faceHeightMm } = rule.physical
  const gap = opts.gapMm ?? PRINT_FACE_GAP_MM
  const count = opts.faces.length
  const totalHeightMm = count === 0 ? 0 : count * faceHeightMm + (count - 1) * gap

  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('viewBox', `0 0 ${faceWidthMm} ${totalHeightMm}`)
  svg.setAttribute('width', `${faceWidthMm}mm`)
  svg.setAttribute('height', `${totalHeightMm}mm`)

  opts.faces.forEach((face, index) => {
    const group = document.createElementNS(SVG_NS, 'g')
    group.setAttribute('class', 'print-face')
    group.setAttribute('data-face', face)
    group.setAttribute('transform', `translate(0, ${index * (faceHeightMm + gap)})`)
    const paper = document.createElementNS(SVG_NS, 'rect')
    paper.setAttribute('class', 'print-paper')
    paper.setAttribute('width', String(faceWidthMm))
    paper.setAttribute('height', String(faceHeightMm))
    paper.setAttribute('fill', opts.paperFill ?? '#ffffff')
    group.appendChild(paper)
    drawFace(group, rule, face, opts.theme, opts.titleOf, opts.slideOffsetMm ?? 0)
    drawFrame(group, faceWidthMm, faceHeightMm, opts.theme)
    svg.appendChild(group)
  })

  return svg
}
