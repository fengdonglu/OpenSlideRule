// Geometry of the square-root vinculum printed over a note radicand.
//
// Chrome draws a `text-decoration="overline"` per text run, which comes out
// thick and visibly broken. The component instead measures the rendered
// radicand span and draws a real SVG line; this helper turns those measured
// millimetre values into the line's endpoints and stroke width so the maths
// stays pure and unit-testable.
//
// All values are in the SVG user space (millimetres), so the line scales with
// the rule layout like the printed ink rather than with screen pixels.

// Vinculum stroke as a fraction of the note font size. Kept in the 0.05-0.06
// band reported as matching the other printed strokes.
export const RADICAL_STROKE_RATIO = 0.055

// How far the line reaches left of the radicand's ink box (as a fraction of
// the font size) so it overlaps the top-right of the radical glyph and the two
// read as one continuous mark. The radicand's left side bearing and the
// radical's right bearing together are about 0.22 em for the note font.
export const RADICAL_OVERLAP_RATIO = 0.25

// Vertical gap between the line and the radicand's ink top (as a fraction of
// the font size), so the bar sits just above the glyphs without touching them.
export const RADICAL_GAP_RATIO = 0.02

export interface RadicalGeometry {
  x1: number
  y1: number
  x2: number
  y2: number
  strokeWidth: number
}

// radicandLeft/Width/Top describe the measured ink box of the radicand span;
// fontSize is the note's rendered font size. The line always runs horizontally
// from just over the radical glyph to the exact end of the radicand.
export function radicalGeometry(
  radicandLeft: number,
  radicandWidth: number,
  fontSize: number,
  radicandTop: number,
): RadicalGeometry {
  const strokeWidth = fontSize * RADICAL_STROKE_RATIO
  const x1 = radicandLeft - fontSize * RADICAL_OVERLAP_RATIO
  const y = radicandTop - fontSize * RADICAL_GAP_RATIO

  return {
    x1,
    y1: y,
    x2: radicandLeft + radicandWidth,
    y2: y,
    strokeWidth,
  }
}
