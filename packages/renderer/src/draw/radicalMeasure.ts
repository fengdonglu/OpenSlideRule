// Vinculum measurement for radical note radicands.
//
// The radicand span is measured after render rather than estimated, so the bar
// tracks the real font metrics. `getBBox()` gives the font's line box (ascent/
// descent), which sits well above the glyph ink, so the ink box is read from a
// canvas `measureText` with the same computed font: its actualBoundingBox* is
// the true rendered outline. SVG user units and the canvas font size are both
// in millimetres, so the metrics scale straight across.
//
// `getBBox` and `CanvasRenderingContext2D` are absent under jsdom, so every
// entry point is guarded: the function is a safe no-op where it cannot measure.
import { radicalGeometry } from './radicalGeometry'

const SVG_NS = 'http://www.w3.org/2000/svg'

interface RadicandBox {
  left: number
  width: number
  top: number
}

function bboxOf(tspan: SVGTSpanElement): RadicandBox | null {
  if (typeof tspan.getBBox !== 'function') return null
  try {
    const bbox = tspan.getBBox()
    if (!Number.isFinite(bbox.x) || !Number.isFinite(bbox.width)) return null
    return { left: bbox.x, width: bbox.width, top: bbox.y }
  } catch {
    return null
  }
}

// Cached across calls: creating a canvas per radicand is wasteful, and the
// cached `null` also memoises the jsdom case where the API is unavailable.
let measureCtx: CanvasRenderingContext2D | null | undefined

function inkContext(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    measureCtx = null
    return measureCtx
  }
  try {
    measureCtx = document.createElement('canvas').getContext('2d')
  } catch {
    measureCtx = null
  }
  return measureCtx
}

// Refine the font line box with the canvas ink metrics when the API exists.
function inkBox(tspan: SVGTSpanElement): RadicandBox | null {
  const fallback = bboxOf(tspan)
  if (!fallback) return null
  const textEl = tspan.parentElement
  if (!textEl || typeof getComputedStyle !== 'function') return fallback
  const style = getComputedStyle(textEl)
  const fontSize = parseFloat(style.fontSize)
  const baseline = parseFloat(textEl.getAttribute('y') ?? '')
  const ctx = inkContext()
  if (!ctx || !Number.isFinite(fontSize) || !Number.isFinite(baseline)) return fallback
  ctx.font = `${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`
  const metrics = ctx.measureText(tspan.textContent ?? '')
  const scale = fontSize / 100
  const left = fallback.left - metrics.actualBoundingBoxLeft * scale
  const right = fallback.left + metrics.actualBoundingBoxRight * scale
  const top = baseline - metrics.actualBoundingBoxAscent * scale
  return Number.isFinite(left) && Number.isFinite(top) && right > left
    ? { left, width: right - left, top }
    : fallback
}

// Draw a real line over each `[data-radicand]` tspan, replacing the broken
// per-run `overline` text decoration. `noteFontMm` is the note font size (the
// caller passes `layout.numeralMm * 0.9`), in the same millimetres as the SVG.
export function measureRadicals(root: SVGElement, noteFontMm: number): void {
  for (const line of Array.from(root.querySelectorAll('line.radical'))) line.remove()

  const tspans = root.querySelectorAll<SVGTSpanElement>('[data-radicand]')
  for (const tspan of Array.from(tspans)) {
    const box = inkBox(tspan)
    if (!box || box.width <= 0) continue
    const row = tspan.closest('g.row') ?? tspan.parentElement
    if (!row) continue

    const geo = radicalGeometry(box.left, box.width, noteFontMm, box.top)
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('class', 'radical')
    line.setAttribute('x1', String(geo.x1))
    line.setAttribute('y1', String(geo.y1))
    line.setAttribute('x2', String(geo.x2))
    line.setAttribute('y2', String(geo.y2))
    line.setAttribute('stroke', tspan.parentElement?.getAttribute('fill') ?? 'currentColor')
    line.setAttribute('stroke-width', String(geo.strokeWidth))
    line.style.opacity = '0.85'
    row.appendChild(line)
  }
}
