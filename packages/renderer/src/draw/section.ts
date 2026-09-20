// One section = one millimetre-coordinate SVG band containing its scale rows.
// The viewBox is in millimetres and scales uniformly, so text is never squashed.
// Stroke widths use vector-effect: non-scaling-stroke so graduations keep a
// constant on-screen width at any zoom level.
//
// This is the framework-free port of the row geometry previously held by
// ScaleSection.vue: the maths is unchanged, only the framework state (i18n,
// store, reactivity) is gone. Display strings arrive through `titleOf`.
import type { ScaleDefinition, ScaleNote, ScaleSection, Tick } from '@slide-rule/core'
import { getScaleTicks, isRedScale } from '@slide-rule/core'
import type { FaceLayout, SectionLayout } from '../layout'
import { tickX } from '../layout'
import { angleLabelX, coAngleText, coLabelStartX } from './labelLayout'
import type { Theme } from '../themes'

const SVG_NS = 'http://www.w3.org/2000/svg'

// The printed-ink font, carried inline: the pure renderer has no scoped CSS.
// Shared with the circular renderer so a printed disc matches a printed sheet.
export const MONO_FONT = "'JetBrains Mono', 'Consolas', monospace"

export interface RenderSectionOptions {
  scales: ScaleDefinition[]
  section: ScaleSection
  layout: FaceLayout
  theme: Theme
  titleOf?: (scale: ScaleDefinition) => string
}

export function sectionViewBox(opts: RenderSectionOptions): string {
  const sec = opts.layout.sections[opts.section]
  return (
    `0 ${sec.topMm - sec.bleedTopMm} ${opts.layout.faceWidthMm} ` +
    `${sec.heightMm + sec.bleedTopMm + sec.bleedBottomMm}`
  )
}

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag)
}

interface CoLabel {
  x: number
  text: string
}

// Which row edge faces a groove: those graduations are printed tight against it.
type Adjacency = 'top' | 'bottom' | null

interface Row {
  scale: ScaleDefinition
  ticks: Tick[]
  major: Tick[]
  coLabels: CoLabel[]
  notes: ScaleNote[]
  top: number
  adjacency: Adjacency
  /** Graduations hang from the top edge and the numbers sit below them (57 L). */
  numbersBelow: boolean
  /** Shared-edge rows: ticks rise from the floor (sh2) or hang from the roof. */
  tickEdge: 'roof' | 'floor' | null
  color: string
  title: string
}

function buildRows(opts: RenderSectionOptions): Row[] {
  const sec = opts.layout.sections[opts.section]
  const titleOf = opts.titleOf ?? ((scale: ScaleDefinition) => scale.name)
  return opts.scales.map((scale, i) => {
    const ticks = getScaleTicks(scale)
    // A row directly under a groove is mirrored (numbers on the far side); a row
    // directly above a groove keeps its orientation but reaches the groove.
    const first = i === 0
    const last = i === opts.scales.length - 1
    let adjacency: Adjacency = null
    if (first && (opts.section === 'middle' || opts.section === 'lower')) adjacency = 'top'
    else if (last && (opts.section === 'upper' || opts.section === 'middle')) adjacency = 'bottom'
    // Co-angle labels (cos2 / ctg2 / ctg3, cos / ctg on the 57): 90 - angle,
    // printed on the opposite side of the tick from the angle, as both prototype
    // photographs show. The 1002 prints the degree sign, the 57 bare numbers.
    const bare = scale.sharedLabels?.every((sl) => sl.format === 'bare') ?? false
    const coLabels = scale.sharedLabels
      ? ticks
          .filter((t) => t.label && t.angle !== undefined)
          .map((t) => ({
            x: coLabelStartX(tickX(t, opts.layout), opts.layout.numeralMm),
            text: coAngleText(t.angle as number, bare ? 'bare' : 'degree'),
          }))
      : []
    const notes = scale.notes ?? []
    return {
      scale,
      ticks,
      major: ticks.filter((t) => t.label),
      coLabels,
      notes,
      top: sec.topMm + i * opts.layout.rowHeightMm,
      adjacency,
      numbersBelow: scale.numbersBelow === true,
      tickEdge: scale.tickEdge ?? null,
      color: isRedScale(scale) ? opts.theme.colors.scaleRed : opts.theme.colors.scaleBlack,
      title: titleOf(scale),
    }
  })
}

// Graduation stroke widths in screen pixels (constant at any zoom).
function tickStroke(level: number): number {
  return level === 1 ? 1.5 : level === 2 ? 1.2 : 1
}

// Tick geometry. The angle and its co-angle share one number line, so a row
// uses the same band as any other.
function tickRatio(level: number): number {
  return level === 1 ? 0.45 : level === 2 ? 0.55 : 0.62
}

// A row whose graduations hang from the top edge: majors reach farthest down.
function topTickLength(level: number): number {
  return level === 1 ? 0.5 : level === 2 ? 0.42 : 0.35
}

function tickY1(row: Row, level: number, sec: SectionLayout, h: number): number {
  // Shared-edge rows draw from the shared line into the row.
  if (row.tickEdge === 'floor') return row.top + (1 - topTickLength(level)) * h
  if (row.tickEdge === 'roof') return row.top
  if (row.numbersBelow) return row.top
  return row.adjacency === 'top' ? row.top - sec.bleedTopMm : row.top + tickRatio(level) * h
}

function tickY2(row: Row, level: number, sec: SectionLayout, h: number): number {
  if (row.tickEdge === 'floor') return row.top + h
  if (row.tickEdge === 'roof') return row.top + topTickLength(level) * h
  if (row.numbersBelow) return row.top + topTickLength(level) * h
  if (row.adjacency === 'top') return row.top + (1 - tickRatio(level)) * h
  if (row.adjacency === 'bottom') return row.top + h + sec.bleedBottomMm
  return row.top + 0.95 * h
}

// Numeral baseline, on the side away from the graduations' far end. A row that
// hangs its graduations from the top edge must keep its numbers clear of the
// longest (level 1) ticks, so it sits them lower.
function numeralY(row: Row, h: number): number {
  if (row.tickEdge === 'floor') return row.top + 0.4 * h
  if (row.tickEdge === 'roof') return row.top + 0.9 * h
  if (row.numbersBelow) return row.top + 0.95 * h
  return row.adjacency === 'top' ? row.top + 0.9 * h : row.top + 0.4 * h
}

// Reference notes read from the rule, printed in the right panel area of the row.
function noteY(row: Row, index: number, h: number): number {
  // Line i sits on the scale-name line of the row i below.
  return row.top + (0.62 + index) * h
}

// Scale name baseline
function nameY(rowTop: number, h: number): number {
  return rowTop + 0.62 * h
}

// A leading radical covers everything after it, so it is rendered as a radical
// glyph followed by the rest of the note as the radicand.
function radicalOf(note: string): { head: string; body: string } {
  if (note.startsWith('√')) return { head: '√', body: note.slice(1) }
  return { head: note, body: '' }
}

// A note is either a plain string (black, with radical handling) or a list of
// coloured parts (the Type 57 prints `cos` / `ctg` / `1/x` red). Normalise both
// into a flat list of text spans the drawing code can render.
interface NoteSpan {
  text: string
  red: boolean
  /** True for the radicand span that a measured vinculum line is drawn over. */
  radicand: boolean
}

function noteSpans(note: ScaleNote): NoteSpan[] {
  if (Array.isArray(note)) {
    return note.map((part) => ({ text: part.text, red: part.red === true, radicand: false }))
  }
  const { head, body } = radicalOf(note)
  const spans: NoteSpan[] = [{ text: head, red: false, radicand: false }]
  if (body) spans.push({ text: body, red: false, radicand: true })
  return spans
}

function drawRow(
  group: SVGElement,
  row: Row,
  opts: RenderSectionOptions,
  sec: SectionLayout,
): void {
  const h = opts.layout.rowHeightMm
  const title = el('title')
  title.textContent = row.title
  group.appendChild(title)

  // Graduations
  for (const t of row.ticks) {
    const x = tickX(t, opts.layout)
    const line = el('line')
    line.setAttribute('class', `tick level-${t.level}`)
    line.setAttribute('data-level', String(t.level))
    line.setAttribute('x1', String(x))
    line.setAttribute('y1', String(tickY1(row, t.level, sec, h)))
    line.setAttribute('x2', String(x))
    line.setAttribute('y2', String(tickY2(row, t.level, sec, h)))
    line.setAttribute('stroke', row.color)
    line.setAttribute('stroke-width', String(tickStroke(t.level)))
    line.setAttribute('vector-effect', 'non-scaling-stroke')
    group.appendChild(line)
  }

  // Numeric labels (major ticks only). On a co-angle row the angle sits at the
  // end of its text, left of the tick; elsewhere the label is centred.
  for (const t of row.major) {
    const x = tickX(t, opts.layout)
    const text = el('text')
    text.setAttribute('class', 'numeral')
    text.setAttribute('x', String(row.coLabels.length ? angleLabelX(x, opts.layout.numeralMm) : x))
    text.setAttribute('y', String(numeralY(row, h)))
    text.setAttribute('text-anchor', row.coLabels.length ? 'end' : 'middle')
    text.setAttribute('fill', row.color)
    text.setAttribute('font-size', String(opts.layout.numeralMm))
    text.style.fontFamily = MONO_FONT
    text.textContent = t.label ?? ''
    group.appendChild(text)
  }

  // Co-angle labels, printed red on the other side of the tick from the angle
  for (const c of row.coLabels) {
    const text = el('text')
    text.setAttribute('class', 'numeral')
    text.setAttribute('x', String(c.x))
    text.setAttribute('y', String(numeralY(row, h)))
    text.setAttribute('text-anchor', 'start')
    text.setAttribute('fill', opts.theme.colors.scaleRed)
    text.setAttribute('font-size', String(opts.layout.numeralMm))
    text.style.fontFamily = MONO_FONT
    text.textContent = c.text
    group.appendChild(text)
  }

  // Reference notes: centred in the blank panel right of the tick area
  const noteFontMm = opts.layout.numeralMm * 0.9
  const noteX = (opts.layout.tickLeftMm + opts.layout.tickWidthMm + opts.layout.faceWidthMm) / 2
  for (const [ni, note] of row.notes.entries()) {
    const text = el('text')
    text.setAttribute('class', 'note')
    text.setAttribute('x', String(noteX))
    text.setAttribute('y', String(noteY(row, ni, h)))
    text.setAttribute('fill', opts.theme.colors.text)
    text.setAttribute('font-size', String(noteFontMm))
    text.setAttribute('text-anchor', 'middle')
    text.style.fontFamily = MONO_FONT
    text.style.opacity = '0.85'
    for (const part of noteSpans(note)) {
      const tspan = el('tspan')
      if (part.radicand) tspan.setAttribute('data-radicand', '')
      if (part.red) tspan.setAttribute('fill', opts.theme.colors.scaleRed)
      tspan.textContent = part.text
      text.appendChild(tspan)
    }
    group.appendChild(text)
  }

  // Scale name (in the left gutter) plus parenthesised shared labels
  const name = el('text')
  name.setAttribute('class', 'scale-name')
  name.setAttribute('x', '1.5')
  name.setAttribute('y', String(nameY(row.top, h)))
  name.setAttribute('fill', row.color)
  name.setAttribute('font-size', String(opts.layout.numeralMm * 1.05))
  name.style.fontFamily = MONO_FONT
  name.style.fontStyle = 'italic'
  name.style.fontWeight = '700'
  name.textContent = row.scale.name
  for (const sl of row.scale.sharedLabels ?? []) {
    const tspan = el('tspan')
    tspan.setAttribute('dx', '0.6')
    tspan.setAttribute('fill', opts.theme.colors.scaleRed)
    tspan.textContent = sl.name
    name.appendChild(tspan)
  }
  group.appendChild(name)
}

export function drawSectionContent(parent: SVGElement, opts: RenderSectionOptions): void {
  const sec = opts.layout.sections[opts.section]
  buildRows(opts).forEach((row, index) => {
    const group = el('g')
    group.setAttribute('class', 'row')
    // Identifies the scale in the preview so a click can select it. Harmless in
    // exports and print (no visual effect).
    group.setAttribute('data-scale-index', String(index))
    group.setAttribute('data-section', opts.section)
    // A transparent full-row hit target. It is inert by default (so exports and
    // print are unaffected); the designer preview re-enables pointer events to
    // select the scale by clicking anywhere on its row.
    const hit = el('rect')
    hit.setAttribute('class', 'scale-hit')
    hit.setAttribute('x', '0')
    hit.setAttribute('y', String(row.top))
    hit.setAttribute('width', String(opts.layout.faceWidthMm))
    hit.setAttribute('height', String(opts.layout.rowHeightMm))
    hit.setAttribute('fill', 'transparent')
    hit.setAttribute('pointer-events', 'none')
    group.appendChild(hit)
    drawRow(group, row, opts, sec)
    parent.appendChild(group)
  })

  // Left/right boundaries of the tick area
  const guideLeft = opts.layout.tickLeftMm
  const guideRight = opts.layout.tickLeftMm + opts.layout.tickWidthMm
  for (const x of [guideLeft, guideRight]) {
    const line = el('line')
    line.setAttribute('class', 'guide')
    line.setAttribute('x1', String(x))
    line.setAttribute('y1', String(sec.topMm))
    line.setAttribute('x2', String(x))
    line.setAttribute('y2', String(sec.topMm + sec.heightMm))
    line.setAttribute('stroke', opts.theme.colors.text)
    line.setAttribute('opacity', '0.22')
    line.setAttribute('stroke-width', '1')
    line.setAttribute('vector-effect', 'non-scaling-stroke')
    parent.appendChild(line)
  }
}

// Render one section band into an existing <svg> root: the viewBox is the
// section band plus the groove bleed, so a scale can draw into the slot line.
export function renderSection(root: SVGSVGElement, opts: RenderSectionOptions): void {
  root.setAttribute('viewBox', sectionViewBox(opts))
  // Ticks read against C/D may sit outside the 0..1 span; keep them visible
  // rather than clipping them at the SVG viewport.
  root.style.overflow = 'visible'
  root.replaceChildren()
  const band = el('g')
  band.setAttribute('class', 'section-band')
  band.setAttribute('data-section', opts.section)
  drawSectionContent(band, opts)
  root.appendChild(band)
}
