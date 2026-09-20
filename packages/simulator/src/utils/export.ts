// Export utilities: save the current slide rule state as PNG, SVG or Markdown.

import { renderDiscSheetToSVG, type Theme } from '@slide-rule/renderer'
import type { ScaleDefinition, SlideRuleSide, SlideRuleStructure } from '@slide-rule/core'

// Export as a PNG image.
export async function exportToPNG(
  elementId: string,
  filename = 'sliderule-1002.png',
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) throw new Error(`Element #${elementId} not found`)

  // Import html2canvas lazily to keep the main bundle small.
  const html2canvas = (await import('html2canvas')).default

  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2, // 2x resolution
  })

  canvas.toBlob((blob) => {
    if (!blob) return
    downloadBlob(blob, filename)
  })
}

export interface SvgExportOptions {
  widthMm: number
  heightMm: number
  slideOffsetMm: number
}

// Gap between stacked faces in the SVG export, in millimetres.
const FACE_GAP_MM = 4

// Export as a vector SVG of the currently visible face(s).
// Section SVGs already use absolute millimetre face coordinates, so their inner
// markup can be concatenated into one face-sized group; stacked faces are
// translated vertically. The slide offset is applied as a group translation.
export function exportToSVG(filename: string, opts: SvgExportOptions): void {
  const { widthMm, heightMm, slideOffsetMm } = opts
  const faces = document.querySelectorAll('.face')
  if (faces.length === 0) return

  const faceBlocks: string[] = []
  faces.forEach((face) => {
    const upper = face.querySelector('.section.upper .section-svg')
    const middle = face.querySelector('.section.middle .section-svg')
    const lower = face.querySelector('.section.lower .section-svg')
    let inner = ''
    if (upper) inner += upper.innerHTML
    if (middle) inner += `<g transform="translate(${slideOffsetMm}, 0)">${middle.innerHTML}</g>`
    if (lower) inner += lower.innerHTML
    faceBlocks.push(inner)
  })

  const totalHeight = heightMm * faceBlocks.length + FACE_GAP_MM * (faceBlocks.length - 1)
  const body = faceBlocks
    .map((inner, i) => {
      const y = i * (heightMm + FACE_GAP_MM)
      return (
        `<g transform="translate(0, ${y})">` +
        `<rect width="${widthMm}" height="${heightMm}" fill="#ffffff"/>` +
        inner +
        `</g>`
      )
    })
    .join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${widthMm} ${totalHeight}" width="${widthMm}" height="${totalHeight}">` +
    body +
    `</svg>`

  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename)
}

export interface DiscSvgExportOptions {
  rule: SlideRuleStructure
  faces: SlideRuleSide[]
  theme: Theme
  titleOf?: (scale: ScaleDefinition) => string
}

// Export the circular disc view. Unlike the linear path above, which scrapes the
// rendered `.face` elements, the disc is built by the renderer so the export
// carries the same geometry as the on-screen disc. An empty face list is a
// programming error, never a silent no-op download.
export function exportDiscToSVG(filename: string, opts: DiscSvgExportOptions): void {
  if (opts.faces.length === 0) {
    throw new Error('exportDiscToSVG: no faces to export')
  }
  const sheet = renderDiscSheetToSVG(opts.rule, {
    faces: opts.faces,
    theme: opts.theme,
    titleOf: opts.titleOf,
  })
  const svg = new XMLSerializer().serializeToString(sheet)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename)
}

export interface MarkdownExportOptions {
  filename: string
  locale: string
  title: string
  exportedAt: string
  stepsTitle: string
}

// Export the operation log as Markdown.
export function exportToMarkdown(steps: string[], opts: MarkdownExportOptions): void {
  let content = `# ${opts.title}\n\n`
  content += `*${opts.exportedAt}: ${new Date().toLocaleString(opts.locale)}*\n\n`
  content += `## ${opts.stepsTitle}\n\n`

  steps.forEach((step, index) => {
    content += `${index + 1}. ${step}\n`
  })

  downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), opts.filename)
}

// Trigger a browser download for the given blob.
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
