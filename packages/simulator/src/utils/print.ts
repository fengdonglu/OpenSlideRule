// 1:1 print / PDF export. The sheet is built from the model by the renderer
// (never scraped from the zoomed DOM), serialized, and written into a fresh
// print window whose @page is the rule's own size in millimetres. Only the
// linear sheet is measured for radical vinculums, attached off-screen; a
// circular disc sheet has no vinculums to measure.
import type { ScaleDefinition, SlideRuleSide, SlideRuleStructure } from '@slide-rule/core'
import {
  computeFaceLayout,
  measureRadicals,
  renderDiscSheetToSVG,
  renderRuleSheetToSVG,
  type Theme,
} from '@slide-rule/renderer'

export interface PrintDocumentOptions {
  svg: string
  widthMm: number
  heightMm: number
  title: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// A standalone HTML print document: zero margins and a page exactly the size of
// the sheet, so the SVG's millimetres print 1:1.
export function buildPrintHTML(opts: PrintDocumentOptions): string {
  return (
    '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n' +
    `<title>${escapeHtml(opts.title)}</title>\n` +
    '<style>\n' +
    `@page { size: ${opts.widthMm}mm ${opts.heightMm}mm; margin: 0; }\n` +
    'html, body { margin: 0; padding: 0; background: #fff; }\n' +
    'svg { display: block; }\n' +
    '</style>\n</head>\n<body>\n' +
    opts.svg +
    '\n</body>\n</html>\n'
  )
}

export interface PrintSlideRuleOptions {
  rule: SlideRuleStructure
  faces: SlideRuleSide[]
  theme: Theme
  slideOffsetMm: number
  title: string
  titleOf?: (scale: ScaleDefinition) => string
}

// Render the current rule as a 1:1 sheet and open the browser print dialog.
export async function printSlideRule(opts: PrintSlideRuleOptions): Promise<void> {
  // Open the print window synchronously, before any await: after an await the
  // transient user activation is gone and the popup would be blocked.
  const win = window.open('', '_blank')
  if (!win) return

  const disc = opts.rule.disc

  let sheet: SVGSVGElement
  let widthMm: number

  if (opts.rule.form === 'circular' && disc !== undefined) {
    // A circular rule prints its disc sheet: one stacked square face per side,
    // no radical vinculums to measure.
    sheet = renderDiscSheetToSVG(opts.rule, {
      faces: opts.faces,
      theme: opts.theme,
      titleOf: opts.titleOf,
    })
    widthMm = disc.sheetSizeMm
  } else {
    sheet = renderRuleSheetToSVG(opts.rule, {
      faces: opts.faces,
      theme: opts.theme,
      titleOf: opts.titleOf,
      slideOffsetMm: opts.slideOffsetMm,
    })
    widthMm = opts.rule.physical.faceWidthMm

    // Measure radical vinculums while the sheet is attached (off-screen) so
    // getBBox / getComputedStyle work; then detach before serializing.
    const host = document.createElement('div')
    host.className = 'sliderule-print-host'
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText = 'position:fixed;left:-100000px;top:0;'
    host.appendChild(sheet)
    document.body.appendChild(host)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      const layout = computeFaceLayout(opts.rule.physical, opts.rule.physical.faceWidthMm)
      measureRadicals(sheet, layout.numeralMm * 0.9)
    } finally {
      document.body.removeChild(host)
    }
  }

  // The renderer writes the sheet height as "<n>mm"; read it back rather than
  // recomputing the face count and gap here.
  const heightMm = Number.parseFloat(sheet.getAttribute('height') ?? '0')
  const html = buildPrintHTML({
    svg: sheet.outerHTML,
    widthMm,
    heightMm,
    title: opts.title,
  })

  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}
