// Scale-related types.
// Terminology follows docs/glossary.md: Scale, Graduation, Orientation.

export type ScaleOrientation = 'increasing' | 'decreasing'
export type SlideRuleSide = 'front' | 'back'
export type ScaleSection = 'upper' | 'middle' | 'lower'

// Scale type.
// The first group maps to mathematical formulas and can be derived directly;
// the rest are specific to a model and may start as placeholders.
// The runtime list is the single source: ScaleType is derived from it so the
// validator and the type can never drift.
export const SCALE_TYPES = [
  // --- Standard scales ---
  'C', // single-decade logarithmic scale (slide)
  'D', // single-decade logarithmic scale (body)
  'A', // double-decade logarithmic scale (squares)
  'B', // double-decade logarithmic scale (squares)
  'K', // triple-decade logarithmic scale (cubes)
  'CF', // folded pi logarithmic scale (C)
  'DF', // folded pi logarithmic scale (D)
  'CI', // reciprocal of C (decreasing)
  'DI', // reciprocal of D (decreasing)
  'CIF', // reciprocal of CF (decreasing)
  'L', // common-log linear scale (lg, 0..1)
  // --- Model-specific scales (may start as placeholders) ---
  'LN1',
  'LN2',
  'LN3', // natural-log segments (1/2/3)
  'LN1I',
  'LN2I',
  'LN3I', // natural-log segment reciprocals (decreasing)
  'H2',
  'H3',
  'H2P', // H scales (meaning to be confirmed)
  'SH2',
  'SH3',
  'TH2', // hyperbolic scales (sinh/tanh, subscripts to confirm)
  'SIN2',
  'COS2',
  'TG2',
  'CTG2',
  'TG3',
  'CTG3', // trigonometric scales
  // --- Type 57 pocket rule (Wikipedia conventions) ---
  'S', // sine, 5.74..90 deg, read on C/D
  'ST', // small angles (sin/tan/radians agree), 0.573..5.74 deg
  'T', // tangent, 5.71..45 deg, read on C/D
] as const

export type ScaleType = (typeof SCALE_TYPES)[number]

// A single graduation line.
export interface Tick {
  position: number // normalized position 0..1
  value: number // value this graduation represents
  level: 1 | 2 | 3 // 1 = major (labelled), 2 = medium, 3 = fine
  label?: string // numeric label (major ticks only)
  angle?: number // angle in degrees (trigonometric scales); enables co-angle labels
}

// --- Unified scale calculation model -------------------------------------
// One calculation per scale is the single source for where a graduation is
// drawn, what a position reads, and which numbers are printed. Both models use
// it.

// p = log10(d / anchor), normalised over the domain when requested.
export interface LogMapping {
  kind: 'log'
  anchor: number
  normalize?: boolean
}

// p = (d - min) / (max - min) with min/max taken from the calculation domain.
export interface LinearMapping {
  kind: 'linear'
}

// p = log10(fn(d)) - log10(from), mathematically log10(fn(d) / from) but written
// as a subtraction for bit-stability with the legacy generators. `fn` uses its
// family's unit: ln/sinh/tanh take the raw argument, sin/tan take degrees (as
// the printed angles do).
export type FnName = 'ln' | 'sin' | 'tan' | 'sinh' | 'tanh'
export interface FnMapping {
  kind: 'fn'
  fn: FnName
  from: number
}

// H2 / H3 / H'2: the domain value is the printed cosh/sech value V and
// p = log10(g(V) / from), g = sqrt(V^2 - 1) (cosh) or sqrt(1 - V^2) (sech).
export interface ValueFnMapping {
  kind: 'valueFn'
  fn: 'cosh' | 'sech'
  from: number
}

// A user-supplied arithmetic mapping (schema kind 'expr'). The source strings
// are retained so serializeRule can round-trip the DTO; the compiled functions
// are what the engine dispatches.
export interface ExprMapping {
  kind: 'expr'
  position: string // p = f(x)
  inverse?: string // x = g(p)
  toPosition: (d: number) => number
  toDomain: (p: number) => number
}

export interface CustomMapping {
  kind: 'custom'
  toPosition: (d: number) => number
  toDomain: (p: number) => number
}

export type Mapping =
  LogMapping | LinearMapping | FnMapping | ValueFnMapping | ExprMapping | CustomMapping

// A printed number: a bare read value, or a read value with exact text.
export type GraduationLabel = number | { value: number; text: string }

export interface ScaleCalculation {
  // The space the interval grids live in (the printed argument x for most
  // scales, the printed value V for H2 / H3 / H'2).
  domain: [number, number]
  map: Mapping
  // Domain -> the value the cursor reports. Identity when omitted. Reciprocal
  // rows set `read(d) = n / d` (and `unread(v) = n / v`), where n is the
  // reciprocal scale: 1 for the ln*I family, 10 for CIF.
  read?: (d: number) => number
  unread?: (v: number) => number
  // Tick grid in domain units, half-open [from, to), finest step first.
  intervals: GraduationInterval[]
  // Repeat the intervals over `decades` decades (K = 3, A / B = 2).
  decades?: number
  // Printed numbers, given as READ values (what is printed), placed at
  // toPosition(unread(value)). Absolute, never range-checked.
  labels?: GraduationLabel[]
  // Off-grid marks, also READ values (pi, sqrt(10), infinity).
  marks?: GraduationMark[]
  // How a numeric label is written (default: bare integer, else up to two
  // decimals with the leading zero dropped). Degree rows override this.
  labelFormat?: (d: number) => string
  // The level a printed number forces on its tick. Default 1 (the number is the
  // longest tick). 'keep' leaves the measured step level (sh2 / sh3 / th2).
  labelLevel?: TickLevel | 'keep'
  // Reciprocal single-decade scales are drawn mirrored (CI / DI).
  decreasing?: boolean
}

// Reference note printed at the right end of a row. A plain string is printed
// in the default (black) colour. A note may instead carry coloured parts: the
// Type 57 prints the reverse-order functions (`cos`, `ctg`, `1/x`) in red and
// the rest in black, so the note is a list of parts.
export interface NotePart {
  text: string
  red?: boolean
}
export type ScaleNote = string | NotePart[]

// --- Explicit graduation tables (Type 57) --------------------------------
// The real Type 57 does not follow the shared coarse-to-fine ladder: its
// tick steps and tick lengths change at fixed value boundaries and differ
// from the 1002. These tables record the measured graduations per interval.
export type TickLevel = 1 | 2 | 3

// One tick step and the level of the ticks it produces. Steps are given from
// finest to coarsest (or any order: the generator sorts them, so a coarser
// step overrides the level of the finer ticks it coincides with).
export interface GraduationStep {
  step: number
  level: TickLevel
}

// One value interval of a scale. `from`/`to` are relative to the decade base
// (1..10) for the multi-decade scales, or absolute for a single block (L).
export interface GraduationInterval {
  from: number
  to: number
  steps: GraduationStep[]
  // Values inside [from, to) that carry a printed number (relative to the
  // decade base like the interval bounds).
  labels?: number[]
}

// A printed mark that does not sit on the regular grid (pi on C/D/A/DI).
export interface GraduationMark {
  value: number
  label: string
}

// Shared label (parenthesised scale such as red cos2 on sin2).
// Shares the graduations of the previous scale but has its own labels.
export interface SharedLabel {
  id: string
  name: string
  orientation: ScaleOrientation
  color: string
  // How the printed co-angle is written: `degree` prints `75°` (the 1002's
  // cos2/ctg2/ctg3), `bare` prints `75` (the 57's cos/ctg, which carry two
  // number lines per band).
  format?: 'degree' | 'bare'
}

// Scale definition.
export interface ScaleDefinition {
  id: string
  name: string // display name, e.g. "C", "ln1I", "cos2"
  type: ScaleType
  side: SlideRuleSide
  section: ScaleSection
  isMovable: boolean // true for the middle section (the slide)
  orientation: ScaleOrientation
  color: string // colour for graduations and labels
  sharedLabels?: SharedLabel[] // parenthesised shared labels (e.g. red cos2)
  notes?: ScaleNote[] // reference notes printed to the right of the scale, read from the rule
  // The unified calculation: the single source of a scale's graduations and
  // cursor reading.
  calc?: ScaleCalculation
  // Graduations hang from the top edge of the band and the printed numbers sit
  // below them. The 57's L row is printed this way (read from the photographs);
  // by default the numbers sit above the graduations (the 1002's rows).
  numbersBelow?: boolean
  // A row that shares an edge with its neighbour draws its graduations from
  // that shared line: 'floor' rises from the row's bottom edge (numbers above,
  // the 1002's sh2), 'roof' hangs from the row's top edge (numbers below, sh3).
  // Without it the row draws its own band as usual.
  tickEdge?: 'roof' | 'floor'
}

// Whether a scale is printed red. Every scale on both models follows the rule
// that decreasing scales are red; the red co-angle number lines are shared
// labels, not scales, and are coloured separately.
export function isRedScale(scale: ScaleDefinition): boolean {
  return scale.orientation === 'decreasing'
}

// Three sections of one face.
export interface ScaleSectionGroup {
  upper: ScaleDefinition[]
  middle: ScaleDefinition[]
  lower: ScaleDefinition[]
}

// Physical specification.
// All geometry is expressed in millimetres; screen pixels are derived from
// pxPerMm at render time.
// See docs/dev/rendering.md
export interface PhysicalSpec {
  faceWidthMm: number // face width (12in = 304.8)
  faceHeightMm: number // face height (2in = 50.8)
  rowCount: { upper: number; middle: number; lower: number } // rows per face, 4/6/4
  grooveRowRatio: number // groove width / row height
  marginRowRatio: number // top & bottom margin / row height
  leftGutterMm: number // left name gutter
  rightPanelMm: number // right reference panel
  numeralRatio: number // numeral height / row height
}

// Rule form: a rectangular (linear) rule is the default; a circular rule carries
// a disc description instead of (or as well as) a rectangular physical spec.
export type RuleForm = 'linear' | 'circular'

// Circular rule geometry: concentric scales on a disc around a central pivot.
export interface DiscSpec {
  outerRadiusMm: number // the rule's outer edge (limit circle)
  innerRadiusMm: number // the central hole / pivot boss
  sheetSizeMm: number // the square sheet the disc is printed on
}

// Double-sided structure.
export interface SlideRuleStructure {
  id: string // model id, e.g. '1002'
  name: string // display name
  physical: PhysicalSpec
  form?: RuleForm
  disc?: DiscSpec
  front: ScaleSectionGroup
  back: ScaleSectionGroup
}

// Cursor line.
export interface CursorLine {
  id: string
  name: string
  offset: number // horizontal offset relative to the cursor centre (normalized)
  color: string
}
