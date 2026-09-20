# Data Model

The JSON rule format (`RuleDefinition`), the runtime types it resolves to, and
the graduation algorithms.

---

## 1. Core types

### 1.1 Scale type
```typescript
export type ScaleType =
  // standard scales (derivable from formulas)
  | 'C' | 'D' | 'A' | 'B' | 'K' | 'CF' | 'DF' | 'CI' | 'DI' | 'CIF' | 'L'
  // model-specific scales
  | 'LN1' | 'LN2' | 'LN3' | 'LN1I' | 'LN2I' | 'LN3I'
  | 'H2' | 'H3' | 'H2P' | 'SH2' | 'SH3' | 'TH2'
  | 'SIN2' | 'COS2' | 'TG2' | 'CTG2' | 'TG3' | 'CTG3'
  // Type 57 pocket rule (Wikipedia conventions)
  | 'S' | 'ST' | 'T'
```

### 1.2 Orientation
```typescript
export type ScaleOrientation = 'increasing' | 'decreasing'
```
- **increasing**: values grow left to right (black by default).
- **decreasing**: values fall left to right (red by default).

The **colour is derived, not fixed**: `isRedScale(scale)` is true exactly when
`orientation === 'decreasing'`. Both models follow that rule - the 57's `DI` is
red because it decreases, and its `T` is black because it increases (the red on
that row is the `ctg` shared label, not the scale).

### 1.3 Tick
```typescript
export interface Tick {
  position: number   // C/D decade units (0..1 at C = 1..10; may overflow for
                     // scales read against C/D - see section 2.3)
  value: number      // value at this graduation
  level: 1 | 2 | 3   // 1 = major (labelled), 2 = medium, 3 = fine
  label?: string     // printed number (major ticks only)
  angle?: number     // degrees, trigonometric scales (enables co-angle labels)
}
```

### 1.4 Scale definition
```typescript
export interface ScaleDefinition {
  id: string
  name: string
  type: ScaleType
  side: 'front' | 'back'
  section: 'upper' | 'middle' | 'lower'
  isMovable: boolean           // true for the middle section (the slide)
  orientation: ScaleOrientation
  color: string
  sharedLabels?: SharedLabel[] // parenthesised co-angle labels
  notes?: ScaleNote[]          // right-hand reference notes read from the rule
  calc?: ScaleCalculation      // the one calculation: graduations + reading
  numbersBelow?: boolean       // printed numbers sit below the graduations
  tickEdge?: 'roof' | 'floor'  // graduations hang from / rise to a shared edge
}
```

### 1.5 Face and model
```typescript
export interface ScaleSectionGroup {
  upper: ScaleDefinition[]
  middle: ScaleDefinition[]
  lower: ScaleDefinition[]
}

export interface PhysicalSpec {
  faceWidthMm: number          // 304.8 (12in)
  faceHeightMm: number         // 50.8  (2in)
  rowCount: { upper: number; middle: number; lower: number }  // 4/6/4
  grooveRowRatio: number       // groove / row height
  marginRowRatio: number       // margin / row height
  leftGutterMm: number         // left name gutter
  rightPanelMm: number         // right reference panel
  numeralRatio: number         // numeral height / row height
}

export interface SlideRuleStructure {
  id: string
  name: string
  physical: PhysicalSpec      // always present; synthesised for a circular rule
  form?: RuleForm             // absent => 'linear'; see section 3.5
  disc?: DiscSpec             // present for a circular rule
  front: ScaleSectionGroup
  back: ScaleSectionGroup
}
```
A model may be **single-faced**: `back` is then an empty `ScaleSectionGroup`
(the Type 57). `sideHasScales(model, side)` reports which faces exist.
`physical` is always present at runtime even for a **circular** rule, where the
loader synthesises a square bounding box from `disc` (section 3.5).

### 1.6 Layout types (`packages/renderer/src/layout/index.ts`)
```typescript
export interface SectionLayout {
  section: 'upper' | 'middle' | 'lower'
  topMm: number
  heightMm: number
  rows: number
  bleedTopMm: number      // how far the section may draw into the groove above
  bleedBottomMm: number
}

export interface FaceLayout {
  pxPerMm: number
  faceWidthMm: number; faceHeightMm: number
  faceWidthPx: number; faceHeightPx: number
  rowHeightMm: number; grooveMm: number; marginMm: number; numeralMm: number
  tickLeftMm: number;  tickWidthMm: number
  sections: Record<'upper' | 'middle' | 'lower', SectionLayout>
  grooveTopMm: { upper: number; lower: number }
}

export function computeFaceLayout(spec: PhysicalSpec, availableWidthPx: number): FaceLayout
export function rowTopMm(layout: FaceLayout, section: string, rowIndex: number): number
export function tickX(tick: Tick, layout: FaceLayout): number
```

---

## 2. Graduation algorithms

### 2.1 Logarithmic scales
`position = (log10 v - log10 vMin) / (log10 vMax - log10 vMin)`, with an optional
`anchor` so a folded scale can extend left of its origin.

### 2.2 Measured intervals
A scale's `calculation.intervals` lists the measured grid directly, finest step
first; a coarser step re-levels the ticks it coincides with. The element count is
therefore fixed by the photograph rather than computed from a runtime ladder.
`engine/gradations.ts` only formats the printed numbers now.

### 2.3 Scale families (`ScaleCalculation` + `engine/scaleCalculation.ts`)
| Family | Formula |
|---|---|
| C/D | log10, 1..10, pi marked |
| A/B | log10, 1..100 |
| K | log10, 1..1000 |
| CF | log10 anchored at sqrt(10), integers only, sqrt(10) marked |
| DF | as CF but starting at 3, pi marked |
| CI/DI | mirror of C/D |
| CIF | reciprocal of CF (`fold^2 / v`) |
| lg | linear 0..1 |
| ln1/2/3 | `position ~ log10(ln x)` over 1.0095-1.11 / 1.1-2.9 / 2.5-20000; own span |
| ln*I | reciprocal of the above, mirrored |
| sin2 | `p = log10(sin x) + 1` (note `.1->1`), 5.5..90 deg, co-angle labels |
| tg2 | `p = log10(tan x) + 1` (note `.1->1`), 5.5..45 deg |
| tg3 | `p = log10(tan x)` (note `1->10`), 45..84.5 deg |
| H2 | printed cosh value V, 1.005..1.45; `p = log10(sqrt(V^2 - 1) / from)` (`valueFn`) |
| H2P | printed sech value V, 0..0.995; `p = log10(sqrt(1 - V^2) / from)` (`valueFn`) |
| H3 | printed cosh value V, 1.4..10.5; `p = log10(sqrt(V^2 - 1) / from)` (`valueFn`) |
| sh2 | `p = log10(sinh x) + 1` (note `.1->1`), x 0.095..0.9; labels are x |
| sh3 | `p = log10(sinh x)` (note `1->10`), x 0.85..3; labels are x |
| th2 | `p = log10(tanh x) + 1` (note `.1->1`), x 0.095..infinity; the tanh = 1 end is marked `∞` |
| S | `p = log10(sin x) + 1`, 5.74..90 deg (Type 57) |
| ST | `p = log10(sin x) + 2`, 0.573..5.74 deg (Type 57) |
| T | `p = log10(tan x) + 1`, 5.71..45 deg (Type 57) |

`p` is in **C/D decade units**: `p = 0` exactly at `C = 1` and `p = 1` exactly at
`C = 10`. A scale read against C/D therefore lines up with the C/D graduations
and may stick out past the C/D ends (the Type 57's `S` / `ST` / `T` are each one
decade wide, so they land on 0..1 and do not). Each type's mapping is the
structured `Mapping` on the scale's `ScaleCalculation` (implemented by
`engine/scaleMapping.ts`), resolved from the declarative JSON spec (section 3) by
`load/resolve.ts`, with the optional `read` / `unread` pair; the tick generator
(`engine/scaleCalculation.ts`) and the reader (`engine/scaleReader.ts`) share it,
so a graduation and its reading can never disagree. An `expr` map carries one or
two compiled functions resolved from one or two source strings (the inverse is
optional); the forward is sampled and
must be finite and strictly monotonic over the domain. The full table and
the relation per scale are recorded in
[domain/model-1002.md section 3.8.1](../domain/model-1002.md#381-position-model-cd-decade-units).

### 2.4 Reading (`engine/scaleReader.ts`)
`readScaleValue()` inverts exactly the same definitions, using the scale's `calc`
and its `read` / `unread` pair (`engine/scaleMapping.ts`), so readings and
graduations can never disagree. It clamps by the **printed** range
(`printedPositionRange` / `printedDomainRange`: the mapped domain ends plus every
label and mark), so an over-fold label such as CIF `3.3` and the th2 `∞` mark stay
readable; a position outside that printed range returns `null`.

---

## 3. Rule JSON (`RuleDefinition`)

The measured rule data is JSON, not TypeScript. `packages/core/rules/1002.json`
and `packages/core/rules/type-57.json` are the **canonical** files
(`schemaVersion: 1`) and the single source of measured rule data; the runtime
structures of section 1 are derived from them at start-up. The DTO types live in
`packages/core/src/schema/types.ts`, the aggregating validator in
`schema/validate.ts`, and the loader in `load/`.

### 3.1 Shape
```typescript
export interface RuleDefinition {
  schemaVersion: 1
  id: string
  name: string
  form?: RuleForm           // absent => 'linear'
  physical?: PhysicalSpec   // required for linear; optional for circular
  disc?: DiscSpec           // required for circular
  faces: { front: ScaleSectionGroupSpec; back: ScaleSectionGroupSpec }
}

export interface ScaleSectionGroupSpec {
  upper: ScaleSpec[]
  middle: ScaleSpec[]
  lower: ScaleSpec[]
}

export interface ScaleSpec {
  id: string
  name: string
  type: ScaleType
  orientation: 'increasing' | 'decreasing'
  sharedLabels?: SharedLabelSpec[]   // { id, name, orientation, format? }
  notes?: ScaleNoteSpec[]            // string, or { text, red? }[] for red words
  numbersBelow?: boolean
  tickEdge?: 'roof' | 'floor'
  calculation: CalculationSpec
}
```
The JSON carries no `side`, `section`, `isMovable` or `color`: the loader derives
`side` from the face key, `section` from the array key, `isMovable` when the
section is `middle`, and `color` red exactly when `orientation` is `decreasing`
(section 1.2). A `sharedLabel`'s colour follows its own `orientation` the same
way.

### 3.2 Calculation
```typescript
export interface CalculationSpec {
  domain: [number, number]
  map: MapSpec
  read?: ReadSpec                       // { kind: 'reciprocal', scale: number }
  intervals: IntervalSpec[]             // { from, to, steps: { step, level }[], labels? }
  decades?: number
  labels?: (number | { value: number; text: string })[]
  marks?: MarkSpec[]                    // { value: number | 'infinity', label }
  labelFormat?: LabelFormatSpec
  labelLevel?: 1 | 2 | 3 | 'keep'
  decreasing?: boolean
}
```
`map` is one of four declarative kinds plus the opt-in `expr` kind (the runtime
`Mapping` of section 2.3):

| `kind` | fields | mapping |
|---|---|---|
| `log` | `anchor`, `normalize?` | `position = log10(value / anchor)`; `normalize` scales the span to 0..1 |
| `linear` | - | proportional over the domain |
| `fn` | `fn` (`ln` / `sin` / `tan` / `sinh` / `tanh`), `from` | `position = log10(fn(value) / from)` |
| `valueFn` | `fn` (`cosh` / `sech`), `from` | `v` is the printed `cosh` / `sech` value; `position = log10(sqrt(v² − 1) / from)` (cosh) / `log10(sqrt(1 − v²) / from)` (sech) |
| `expr` | `position` (required), `inverse?` | `position` is `p = f(x)`; `inverse` is `x = g(p)`. Strings only - see [expressions.md](expressions.md) |

> `expr` is the opt-in escape hatch for a field-specific formula. It is never generated by the
> built-ins and needs no change to the declarative kinds. When `inverse` is omitted the loader
> inverts the forward mapping by bracketed bisection over the domain. The grammar, the function
> whitelist and the safety limits are in [expressions.md](expressions.md).

`read` encodes a reciprocal reading pair: `{ kind: 'reciprocal', scale: n }`
resolves to `read = d => n / d` and `unread = v => n / v`. It is present on the
mirrored `ln*I` family (`scale: 1`) and on `CIF` (`scale: 10`); every other scale
reads its direct (invertible) mapping. `CI` / `DI` are ordinary `decreasing` log
scales - the mirror itself yields the reciprocal.

`marks` are extra labelled points: `value` is a number, or the string
`"infinity"` for the `th2` asymptote, which the loader revives to `Infinity`.

### 3.3 Label formats and levels
`labelFormat` is a named policy or `{ kind: 'number', decimals }`; it resolves to
the formatter in `format/policies.ts`:

| Policy | Printed style |
|---|---|
| `default` | whole numbers bare, otherwise <= 2 decimals, no leading zero (`5.5`, `.5`) |
| `folded` | folded rows drop the tens digit (`10` -> `1`, `33` -> `3.3`) |
| `linearFraction` | fraction form on the linear `lg` / `L` rows (`0` / `1`, `.1`..`.9`) |
| `degree` | angle with the degree sign (`5.5°`) |
| `degreeBare` | bare angle (Type 57 `S` / `T`) |
| `degreeMinute` | degrees and minutes (Type 57 `ST`: `35'`, `1°30'`, `2°`) |
| `argument` | 3 decimals below 0.1, 2 below 1, 1 above (`.095`, `.1`, `1.5`) |
| `sechZero` | `.0` at zero, else 3 decimals (`H'2`) |
| `{ kind: 'number', decimals }` | fixed decimals, no leading zero |

`labelLevel` decides how the generator treats a printed number: `1`..`3` forces
that tick level, `'keep'` leaves the measured level (the `sh2` / `sh3` / `th2`
rows). `decreasing` mirrors the scale. `decades` repeats the interval grid
(K = 3, A/B = 2).

### 3.4 Loading
```typescript
export function parseRule(
  input: unknown,
): { ok: true; rule: SlideRuleStructure } | { ok: false; errors: RuleError[] }
export function builtInRules(): SlideRuleStructure[]
```
`parseRule` validates the whole document first (`validateRule` aggregates every
`RuleError` without throwing) and only then resolves it; invalid input never
yields a partial rule. `builtInRules` loads the two canonical files and passes
each through `parseRule`, so the bundled rules are validated like any other rule.
`packages/core/src/data/model1002.ts` and `model57.ts` are thin wrappers that
select `MODEL_1002` / `MODEL_57` from `builtInRules()`.

### 3.5 Rule form (linear / circular)

A rule is **linear** (rectangular) by default; `form: "circular"` selects a
concentric-disc rule. The circular geometry lives in `disc`:

```typescript
export type RuleForm = 'linear' | 'circular'

export interface DiscSpec {
  outerRadiusMm: number // the rule's outer edge (the limit circle)
  innerRadiusMm: number // the central hole / pivot boss
  sheetSizeMm: number   // the square sheet the disc is printed on
}
```

- **Linear** rules keep `physical` required and unchanged. A `disc` on a linear
  rule is `unexpectedDisc`.
- **Circular** rules require `disc` (`missingField` otherwise) and may omit
  `physical`. The constraints are `outerRadiusMm > 0`, `0 <= innerRadiusMm <
  outerRadiusMm` and `sheetSizeMm >= 2 * outerRadiusMm`, all reported as
  `invalidDisc`; a `form` outside the two values is `unknownForm`.
- When a circular rule omits `physical`, `load/resolve.ts` synthesises a **square
  bounding box** (`faceWidthMm = faceHeightMm = sheetSizeMm`, with benign
  row / margin placeholders) so the runtime `SlideRuleStructure.physical` type
  stays non-optional; the disc layout ignores the placeholder row fields.
  `load/serialize.ts` omits that synthesised `physical` again so the DTO
  round-trips to the authored form.
- `resolveRule` copies `form` / `disc` onto the runtime structure. The linear
  renderer (`renderRuleToSVG` / `renderRuleSheetToSVG`) has no `form` / `disc`
  awareness and is never fed a circular structure; circular rules are drawn by
  the disc renderer (`computeDiscLayout` / `renderDiscToSVG` /
  `renderDiscSheetToSVG`, phase 5e - see
  [rendering.md](rendering.md)). The designer preview and the print path pick
  the disc renderer for `form: "circular"` and show an i18n notice only when a
  circular rule has no `disc` (an invalid draft).

---

## 4. Model configuration

### 4.1 Registry (`packages/core/src/data/models.ts`)
```typescript
export interface SlideRuleModelEntry {
  id: string          // also the i18n key: model.<id>
  available: boolean  // false = shown greyed out
}

export const MODELS: SlideRuleModelEntry[] = [
  { id: '1002', available: true },
  { id: '57', available: true },   // Type 57 pocket model
]
```
- `stores/slideRule.ts` holds `currentModelId`; `currentModel` is
  `computed(() => getModelStructure(id))`.
- Rendering and reading always go through `currentModel`, never a hardcoded 1002.
- Display names come from i18n.

### 4.2 1002 data
`packages/core/rules/1002.json` holds the physical spec plus the 28 scales and the
front/back order (see the domain spec). `packages/core/src/data/model1002.ts` is
a thin wrapper that selects it from `builtInRules()`. `getSections(model, side)`
and `countScales(model)` take the model explicitly.

### 4.3 Type 57 data
`packages/core/rules/type-57.json` holds the pocket rule: an empty `back` and 9 front scales
(see [domain/model-57.md](../domain/model-57.md)). Its scale list, colours,
printed numbers and reference notes come from third-party sale photographs of
the rule cited in that document; its **dimensions** are supplied by the
maintainer and are not photo-verified.

### 4.4 Single-faced handling
`sideHasScales(model, side)` (in `data/ruleHelpers.ts`, re-exported from
`model1002.ts`) reports which faces exist. The
store exposes `availableSides`, `isSingleFaced` and `visibleSides`; `setModel`
lands on a valid face and clears dual mode when the new model has one face, and
`setSide` / `setDualFace` refuse invalid choices. Components render
`visibleSides`, so a single-faced rule simply shows its front.

---

## 5. Verification

### 5.1 Graduation maths
```typescript
const calcOf = (model, id) =>
  [model.front, model.back]
    .flatMap(f => [...f.upper, ...f.middle, ...f.lower])
    .find(s => s.id === id)!.calc!
const cd = generateScaledTicks(calcOf(MODEL_1002, 'C'))
assert(cd.find(t => t.value === 1)?.position === 0)
assert(cd.find(t => t.value === 10)?.position === 1)
// CI mirrors C/D
assert(generateScaledTicks(calcOf(MODEL_1002, 'CI')).find(t => t.value === 1)?.position === 1)
// A/B has two decades
assert(generateScaledTicks(calcOf(MODEL_1002, 'A')).find(t => t.value === 100)?.position === 1)
// configuration integrity
assert(countScales(MODEL_1002) === 28)
assert(MODEL_1002.front.upper.length === 4)
assert(MODEL_1002.front.middle.length === 6)
assert(MODEL_1002.front.lower.length === 4)
// the single-faced Type 57
assert(countScales(MODEL_57) === 9)
assert(MODEL_57.front.upper.length === 2)
assert(MODEL_57.front.middle.length === 4)
assert(MODEL_57.front.lower.length === 3)
assert(sideHasScales(MODEL_57, 'back') === false)
```

### 5.2 Schema, layout and models (implemented, Vitest)
`packages/core/src/schema/validate.test.ts` covers the validator codes;
`packages/core/src/load/{parseRule,builtIn,serialize}.test.ts` cover resolving,
loading the canonical JSON and the lossless runtime -> DTO round-trip.
`packages/renderer/src/layout/layout.test.ts` covers the 6:1 aspect, pxPerMm scaling, the row-height
solution, 4/6/4 stacking, groove positions and tickX / rowTopMm.
`packages/core/src/engine/type57Scales.test.ts` covers the S / ST / T endpoints and the reused
log scales; `packages/simulator/src/data/model57.test.ts` covers the pocket rule's spec, scale list
and the registry. `packages/core/src/expr/*.test.ts` cover the expression parser / evaluator /
numeric inverter; `packages/core/src/load/exprRule.test.ts` covers an expr map end to end (ticks,
analytic and numeric reading, serialization round-trip). Run with `npm run test`.

---

*Version: v4.1*
*Created: 2025-01*
*Last revised: 2026-09 - the JSON `RuleDefinition` is the canonical measured data
(`schemaVersion: 1`); the runtime rule is resolved by `parseRule` / `builtInRules`;
the opt-in `expr` map kind adds a safe expression language; the `form` / `disc`
circular-rule metadata adds the `unknownForm` / `invalidDisc` / `unexpectedDisc`
validator codes and a synthesised square bounding box*
