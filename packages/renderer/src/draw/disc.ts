// Circular-rule drawing: concentric rings of radial graduations. The tick set
// comes from getScaleTicks (the same engine as the linear renderer); a tick at
// position p sits at angle 2π·p, so positions wrap around the disc.
import type {
  ScaleDefinition,
  ScaleSection,
  ScaleSectionGroup,
  SlideRuleSide,
  SlideRuleStructure,
  Tick,
} from '@slide-rule/core'
import { getScaleTicks, isRedScale } from '@slide-rule/core'
import { computeDiscLayout, type DiscLayout, type DiscScaleRing } from '../layout/disc'
import type { Theme } from '../themes'
import { PRINT_FACE_GAP_MM } from './rule'
import { MONO_FONT } from './section'

const SVG_NS = 'http://www.w3.org/2000/svg'
const TAU = Math.PI * 2

// A disc has no separate gap: the stacked-face sheets share the linear one.
export { PRINT_FACE_GAP_MM as DISC_FACE_GAP_MM }

export interface RenderDiscOptions {
  face: SlideRuleSide
  theme: Theme
  titleOf?: (scale: ScaleDefinition) => string
  rotationTurns?: Partial<Record<ScaleSection, number>>
  // Paper colour; defaults to white (print / export). The designer preview
  // passes the theme background.
  paperFill?: string
}

export interface RenderDiscSheetOptions {
  faces: SlideRuleSide[]
  theme: Theme
  titleOf?: (scale: ScaleDefinition) => string
  gapMm?: number
  rotationTurns?: Partial<Record<ScaleSection, number>>
  paperFill?: string
}

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag)
}

function point(cx: number, cy: number, radius: number, position: number): [number, number] {
  const angle = TAU * position
  return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)]
}

function countsFor(group: ScaleSectionGroup): { upper: number; middle: number; lower: number } {
  return {
    upper: group.upper.length,
    middle: group.middle.length,
    lower: group.lower.length,
  }
}

function levelRatio(level: Tick['level']): number {
  return level === 1 ? 0.5 : level === 2 ? 0.4 : 0.32
}

// The angle of a position on the disc, normalised to [0, 1).
function seamAngle(position: number): number {
  return ((position % 1) + 1) % 1
}

// Prefer, in order: a labelled tick, a position inside [0, 1), the lower level.
function betterTick(candidate: Tick, current: Tick): boolean {
  const candidateLabelled = candidate.label !== undefined
  const currentLabelled = current.label !== undefined
  if (candidateLabelled !== currentLabelled) return candidateLabelled
  const candidateInside = candidate.position >= 0 && candidate.position < 1
  const currentInside = current.position >= 0 && current.position < 1
  if (candidateInside !== currentInside) return candidateInside
  return candidate.level < current.level
}

// A disc is periodic: p, p + 1 and p - 1 are one physical point, and
// getScaleTicks returns both ends of a scale plus any out-of-range neighbours.
// Collapse ticks that share an angle so the seam carries one tick and one label.
function dedupeTicks(ticks: Tick[]): Tick[] {
  const byAngle = new Map<string, Tick>()
  for (const tick of ticks) {
    // Snap to ~6 significant digits, folding a rounded-up 1.0 back onto 0.
    const key = (Number(seamAngle(tick.position).toPrecision(6)) % 1).toPrecision(6)
    const current = byAngle.get(key)
    if (current === undefined || betterTick(tick, current)) byAngle.set(key, tick)
  }
  return [...byAngle.values()]
}

function drawRing(
  parent: SVGElement,
  layout: DiscLayout,
  ring: DiscScaleRing,
  tick: Tick,
  scale: ScaleDefinition,
  theme: Theme,
  rotation: number,
): void {
  const { centerMm, numeralMm } = layout
  const color = isRedScale(scale) ? theme.colors.scaleRed : theme.colors.scaleBlack
  const band = ring.outerRadiusMm - ring.innerRadiusMm
  const length = band * levelRatio(tick.level)
  const angle = tick.position + rotation
  const [x1, y1] = point(centerMm, centerMm, ring.tickOuterMm, angle)
  const [x2, y2] = point(centerMm, centerMm, ring.tickOuterMm - length, angle)
  const line = el('line')
  line.setAttribute('class', `tick level-${tick.level}`)
  line.setAttribute('x1', String(x1))
  line.setAttribute('y1', String(y1))
  line.setAttribute('x2', String(x2))
  line.setAttribute('y2', String(y2))
  line.setAttribute('stroke', color)
  line.setAttribute('stroke-width', tick.level === 1 ? '1.5' : tick.level === 2 ? '1.2' : '1')
  line.setAttribute('vector-effect', 'non-scaling-stroke')
  parent.appendChild(line)

  if (tick.label !== undefined) {
    const [lx, ly] = point(centerMm, centerMm, ring.numeralRadiusMm, angle)
    const text = el('text')
    text.setAttribute('class', 'numeral')
    text.setAttribute('x', String(lx))
    text.setAttribute('y', String(ly))
    text.setAttribute('fill', color)
    text.setAttribute('font-size', String(numeralMm))
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('dominant-baseline', 'middle')
    text.setAttribute('transform', `rotate(${angle * 360} ${lx} ${ly})`)
    text.style.fontFamily = MONO_FONT
    text.textContent = tick.label
    parent.appendChild(text)
  }
}

function drawDisc(
  parent: SVGElement,
  rule: SlideRuleStructure,
  face: SlideRuleSide,
  theme: Theme,
  titleOf: ((scale: ScaleDefinition) => string) | undefined,
  rotationTurns: Partial<Record<ScaleSection, number>> | undefined,
  paperFill: string | undefined,
): void {
  const disc = rule.disc
  if (disc === undefined) return
  const group = rule[face]
  const layout = computeDiscLayout(disc, countsFor(group))
  const { centerMm, outerRadiusMm, innerRadiusMm } = layout

  const paper = el('rect')
  paper.setAttribute('width', String(layout.sheetSizeMm))
  paper.setAttribute('height', String(layout.sheetSizeMm))
  paper.setAttribute('fill', paperFill ?? '#ffffff')
  parent.appendChild(paper)

  const body = el('circle')
  body.setAttribute('class', 'disc-body')
  body.setAttribute('cx', String(centerMm))
  body.setAttribute('cy', String(centerMm))
  body.setAttribute('r', String(outerRadiusMm))
  body.setAttribute('fill', theme.colors.background)
  parent.appendChild(body)

  const limit = el('circle')
  limit.setAttribute('class', 'limit')
  limit.setAttribute('cx', String(centerMm))
  limit.setAttribute('cy', String(centerMm))
  limit.setAttribute('r', String(outerRadiusMm))
  limit.setAttribute('fill', 'none')
  limit.setAttribute('stroke', theme.colors.text)
  limit.setAttribute('vector-effect', 'non-scaling-stroke')
  parent.appendChild(limit)

  const pivot = el('circle')
  pivot.setAttribute('class', 'pivot')
  pivot.setAttribute('cx', String(centerMm))
  pivot.setAttribute('cy', String(centerMm))
  pivot.setAttribute('r', String(innerRadiusMm))
  pivot.setAttribute('fill', '#ffffff')
  pivot.setAttribute('stroke', theme.colors.text)
  pivot.setAttribute('vector-effect', 'non-scaling-stroke')
  parent.appendChild(pivot)

  // A groove between the three bands (upper / slide / lower), matching the
  // linear rule's grooves, so the rotor's edge is visible.
  const band = (outerRadiusMm - innerRadiusMm) / 3
  for (const i of [1, 2]) {
    const groove = el('circle')
    groove.setAttribute('class', 'disc-groove')
    groove.setAttribute('cx', String(centerMm))
    groove.setAttribute('cy', String(centerMm))
    groove.setAttribute('r', String(outerRadiusMm - i * band))
    groove.setAttribute('fill', 'none')
    groove.setAttribute('stroke', theme.colors.gap)
    groove.setAttribute('stroke-width', '1')
    groove.setAttribute('vector-effect', 'non-scaling-stroke')
    parent.appendChild(groove)
  }

  for (const section of ['upper', 'middle', 'lower'] as const) {
    const rotation = rotationTurns?.[section] ?? 0
    group[section].forEach((scale, index) => {
      const ring = layout.rings.find((r) => r.section === section && r.index === index)
      if (ring === undefined) return
      const scaleGroup = el('g')
      scaleGroup.setAttribute('class', 'disc-scale')
      scaleGroup.setAttribute('data-scale', scale.id)
      scaleGroup.setAttribute('data-section', section)
      scaleGroup.setAttribute('data-scale-index', String(index))
      // Transparent ring-sized hit target, inert unless a consumer enables it
      // (the designer preview uses it to select the scale by clicking its ring).
      const hit = el('circle')
      hit.setAttribute('class', 'disc-hit')
      hit.setAttribute('cx', String(centerMm))
      hit.setAttribute('cy', String(centerMm))
      hit.setAttribute('r', String((ring.innerRadiusMm + ring.outerRadiusMm) / 2))
      hit.setAttribute('fill', 'none')
      hit.setAttribute('stroke', 'transparent')
      hit.setAttribute('stroke-width', String(ring.outerRadiusMm - ring.innerRadiusMm))
      hit.setAttribute('pointer-events', 'none')
      scaleGroup.appendChild(hit)
      if (titleOf !== undefined) {
        const title = el('title')
        title.textContent = titleOf(scale)
        scaleGroup.appendChild(title)
      }
      for (const tick of dedupeTicks(getScaleTicks(scale))) {
        drawRing(scaleGroup, layout, ring, tick, scale, theme, rotation)
      }
      // The name sits in the ring's blank band, kept clear of the limit circle
      // even for a single-scale section.
      const nameRadius = Math.min(
        ring.innerRadiusMm + (ring.outerRadiusMm - ring.innerRadiusMm) * 0.14,
        outerRadiusMm - layout.numeralMm / 2,
      )
      const [nx, ny] = point(centerMm, centerMm, nameRadius, rotation)
      const name = el('text')
      name.setAttribute('class', 'scale-name')
      name.setAttribute('x', String(nx))
      name.setAttribute('y', String(ny))
      name.setAttribute('fill', theme.colors.text)
      name.setAttribute('font-size', String(layout.numeralMm))
      name.setAttribute('text-anchor', 'middle')
      name.style.fontFamily = MONO_FONT
      name.style.fontStyle = 'italic'
      name.style.fontWeight = '700'
      name.textContent = scale.name
      scaleGroup.appendChild(name)
      parent.appendChild(scaleGroup)
    })
  }

  // A thin outline around the square sheet, matching the linear print frame.
  const frame = el('rect')
  frame.setAttribute('class', 'sheet-frame')
  frame.setAttribute('x', '0')
  frame.setAttribute('y', '0')
  frame.setAttribute('width', String(layout.sheetSizeMm))
  frame.setAttribute('height', String(layout.sheetSizeMm))
  frame.setAttribute('fill', 'none')
  frame.setAttribute('stroke', theme.colors.gap)
  frame.setAttribute('stroke-width', '0.3')
  parent.appendChild(frame)
}

export function renderDiscToSVG(rule: SlideRuleStructure, opts: RenderDiscOptions): SVGSVGElement {
  const sheet = rule.disc?.sheetSizeMm ?? rule.physical.faceWidthMm
  const svg = el('svg')
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('viewBox', `0 0 ${sheet} ${sheet}`)
  svg.setAttribute('width', `${sheet}mm`)
  svg.setAttribute('height', `${sheet}mm`)
  drawDisc(svg, rule, opts.face, opts.theme, opts.titleOf, opts.rotationTurns, opts.paperFill)
  return svg
}

export function renderDiscSheetToSVG(
  rule: SlideRuleStructure,
  opts: RenderDiscSheetOptions,
): SVGSVGElement {
  const sheet = rule.disc?.sheetSizeMm ?? rule.physical.faceWidthMm
  const gap = opts.gapMm ?? PRINT_FACE_GAP_MM
  const count = opts.faces.length
  const total = count === 0 ? 0 : count * sheet + (count - 1) * gap
  const svg = el('svg')
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('viewBox', `0 0 ${sheet} ${total}`)
  svg.setAttribute('width', `${sheet}mm`)
  svg.setAttribute('height', `${total}mm`)
  opts.faces.forEach((face, index) => {
    const group = el('g')
    group.setAttribute('class', 'disc-face')
    group.setAttribute('data-face', face)
    group.setAttribute('transform', `translate(0, ${index * (sheet + gap)})`)
    drawDisc(group, rule, face, opts.theme, opts.titleOf, opts.rotationTurns, opts.paperFill)
    svg.appendChild(group)
  })
  return svg
}
