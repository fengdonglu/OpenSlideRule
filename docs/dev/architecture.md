# Architecture Design

---

## 1. Technology

### 1.1 Front-end stack
- **Framework**: Vue 3.5 + Composition API
- **Language**: TypeScript 5.9
- **Build**: Vite 8
- **State**: Pinia 4
- **i18n**: vue-i18n 11 (`zh-CN` / `en-US`)
- **Rendering**: native SVG (no third-party graphics library)

**Why**:
- Vue's reactivity suits frequent state updates (slide drag, cursor move).
- TypeScript keeps the graduation maths type-safe.
- Native SVG is light and exact; no need for fabric.js / konva.

### 1.2 Environment
- **Node**: >= 20.19.4
- **Package manager**: npm
- **Browser**: ES2022+ (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### 1.3 Quality tooling
| Purpose | Tool | Command |
|---|---|---|
| Type check | `vue-tsc --noEmit` | part of `npm run build` |
| Unit tests | Vitest | `npm run test` / `npm run test:watch` |
| Component tests | Vitest + `@vue/test-utils` (jsdom) | `npm run test` |
| E2E tests | Playwright + system Edge locally, Chromium in CI | `npm run e2e` (excluded from `npm test`; runs in CI) |
| E2E type check | `tsc --noEmit -p e2e/tsconfig.json` | part of `npm run build` (`typecheck:e2e`) |
| Lint | ESLint (flat config, Vue 3 + TS recommended) | `npm run lint` / `npm run lint:fix` |
| Format | Prettier | `npm run format` |
| Build | Vite | `npm run build` |

---

## 2. Overall architecture

```
Frontend layer
  Vue 3 + TypeScript + Vite
  - components
  - Pinia stores
  - i18n
Business logic layer
  - calculation engine        (one ScaleCalculation per scale: positions + reading)
  - layout engine             (millimetre face layout)
  - scale configuration data  (models / scales / themes)
  - interaction controllers   (drag, zoom, hover)
Rendering layer
  - native SVG
  - section rendering
  - event handling
```

---

## 3. Modules

### 3.1 Module tree
```
packages/core/
├─ rules/                # canonical measured data (JSON, schemaVersion: 1)
│  ├─ 1002.json          # 1002 physical spec + 28 scales
│  └─ type-57.json       # Type 57 pocket rule: 9 scales, empty back
└─ src/                  # framework-free: no Vue, no DOM, no SVG
   ├─ index.ts             # public API (types, schema, loader, tick engine, models)
   ├─ types/
   │  └─ scale.ts          # scale, tick, cursor and physical-spec types
   ├─ schema/
   │  ├─ types.ts          # RuleDefinition DTO + RuleError
   │  └─ validate.ts       # validateRule(input) -> RuleError[]
   ├─ format/
   │  └─ policies.ts       # named label-format policies + resolveLabelFormat
   ├─ expr/
   │  ├─ parse.ts          # safe tokenizer + recursive-descent parser (no eval)
   │  ├─ evaluate.ts       # compileExpression / validateExpression + the whitelist
   │  └─ invert.ts         # numericInverse (bracketed bisection)
   ├─ load/
   │  ├─ parseRule.ts      # parseRule: validate then resolve
   │  ├─ resolve.ts        # CalculationSpec -> ScaleCalculation; Definition -> Structure
   │  ├─ builtInRules.ts   # loads rules/*.json through parseRule
   │  └─ serialize.ts      # runtime -> RuleDefinition (migration / golden)
   ├─ engine/
   │  ├─ gradations.ts     # printed-number formatting helpers (shared)
   │  ├─ logarithmic.ts    # folded / linear printed-number formatters
   │  ├─ scaleMapping.ts   # Mapping: toPosition / toDomain, printed ranges
   │  ├─ scaleCalculation.ts # single tick generator (ScaleCalculation -> Tick[])
   │  ├─ scaleFunctions.ts # getScaleTicks(scale): tick array via the scale's calc
   │  └─ scaleReader.ts    # value at the cursor
   └─ data/
      ├─ models.ts        # model registry (1002 and Type 57)
      ├─ model1002.ts     # MODEL_1002 = the loaded 1002 rule (re-exports helpers)
      ├─ model57.ts       # MODEL_57 = the loaded Type 57 rule
      └─ ruleHelpers.ts   # BLACK / RED, shared, getSections, countScales, sideHasScales

packages/renderer/src/             # framework-free: no Vue; millimetre layout + SVG
├─ index.ts             # public API (layout, themes, drawing)
├─ layout/
│  ├─ index.ts           # computeFaceLayout, rowTopMm, tickX; FaceLayout
│  └─ disc.ts            # computeDiscLayout: the disc sheet + concentric scale rings
├─ themes.ts             # 6 colour themes: rule-face colours + UI palette (names come from i18n)
└─ draw/
   ├─ section.ts         # renderSection / drawSectionContent: one section as SVG
   ├─ rule.ts            # renderRuleToSVG / renderRuleSheetToSVG: one face / a stacked 1:1 mm sheet
   ├─ disc.ts            # renderDiscToSVG / renderDiscSheetToSVG: one disc / a stacked disc sheet
   ├─ labelLayout.ts     # co-angle label placement
   ├─ radicalGeometry.ts # radical vinculum geometry
   └─ radicalMeasure.ts  # measureRadicals: font-based radical widths

packages/simulator/src/            # Vue app
├─ i18n/
│  ├─ index.ts           # createI18n + locale persistence
│  └─ locales/           # zh-CN.ts (schema source), en-US.ts
├─ stores/
│  └─ slideRule.ts       # model (incl. the imported slot), faces, slide / disc-rotor offset, cursors, theme, zoom
├─ designer/
│  ├─ model.ts           # pure: adapt/detect, scale + field ops, calculation ops (get/set/with, presets)
│  ├─ draft.ts           # localStorage draft: injected storage, save/load/clear (safe no-op when unavailable)
│  ├─ errors.ts          # map validator BuildError paths to fields: errorPaths / hasError / subtreeHasError
│  ├─ templates.ts       # starter RuleSpecs: templateSpecs (linearLog, circularCd)
│  ├─ store.ts           # Pinia: spec, selection, selectedScale/Calculation, buildRule + parseRule preview, setters
│  ├─ DesignerView.vue   # full-screen shell: metadata form, scale tree, errors, exports
│  ├─ DesignerPreview.vue # read-only preview: linear sheet or disc (missing-disc notice)
│  └─ panels/
│     ├─ ScaleForm.vue   # 5b: a selected scale's own fields + duplicate
│     └─ CalcForm.vue    # 5c: the selected scale's whole calculation + generator presets
├─ utils/
│  ├─ importRule.ts      # importRuleText: JSON text -> parseRule (linear or circular)
│  └─ print.ts           # 1:1 print document + window.print
└─ components/
   ├─ AppBar.vue          # shared bar: theme, language, export, help, simulator <-> designer
   ├─ ScaleSection.vue    # mounts one SVG per section; calls renderSection
   ├─ SlideRule.vue       # linear view: stacked faces, zoom/pan, drag, hover, cursor
   ├─ CircularRule.vue    # circular view: rotating disc, rotor drag, radial cursors
   ├─ CursorReadings.vue  # linear readings panel
   ├─ CircularReadings.vue # circular readings panel: per-cursor values
   ├─ ImportRuleDialog.vue # report a failed rule import (syntax / validation)
   ├─ ThemeSelector.vue   # theme picker
   └─ TutorialOverlay.vue # first-run tutorial

packages/generator/src/            # browser-safe library + Node-only CLI: no Vue, no DOM, no renderer
├─ index.ts             # public API: buildRule, RuleSpec types, presets
├─ spec.ts              # RuleSpec / FaceSpec / ScaleSpecInput / BuildError
├─ build.ts             # buildRule: inline { ref }, assemble schema-v1 DTO, parseRule
├─ presets.ts           # logScale, logDecades, linearScale, fnScale, valueFnScale, exprScale, reciprocal, interval
├─ cli.ts               # runCli(argv, io): the exit-code contract
└─ bin.ts               # `slide-rule-gen`: node:fs / process -> runCli

e2e/                     # Playwright end-to-end specs (repo root; excluded from Vitest)
├─ simulator.spec.ts     # the 1002 renders and switches to the Type 57
├─ designer.spec.ts      # the designer seeds the 1002 / previews the circular template
├─ import.spec.ts        # a designer-exported definition loads back as `imported`
└─ circular.spec.ts      # a circular rule imports, rotates and reads a cursor
```
`packages/core` holds the framework-free types, engine, JSON schema/loader and
the canonical rule JSON; `packages/renderer` holds the framework-free millimetre
layout, theme tokens and SVG drawing; `packages/simulator` is the Vue app,
including the designer; `packages/generator` is the authoring layer that emits
validated schema-v1 JSON. Its library entry (`src/index.ts`: `buildRule`, the
`RuleSpec` types, the presets) imports only `core` and is browser-safe, so the
designer uses it directly; only its CLI (`bin.ts`: `node:fs` / `process`) is
Node-only. Dependencies are one-way: `simulator -> core`,
`simulator -> renderer`, `simulator -> generator` (library only),
`renderer -> core`, `generator -> core`; `generator` never imports `renderer` or
`simulator`; `core` depends on nothing at runtime (the JSON is inlined by the
bundler).

The designer puts the preview on the left and the form on the right (the same
way round as the simulator). The form's first column is always visible and
grouped into **Rule** (id/name/form/physical) and **Layout** (the per-face/
section scale list, numbered, each section heading carrying a **+** that inserts
after the selected scale or appends); a second column with the selected scale's
**Scale fields** and **Calculation** appears to its right only while a scale is
selected. The selected scale's forms carry an accent edge, and validation is a
status bar under the preview rather than a panel. The renderer
tags each drawn scale with `data-scale-index` /
`data-section` (and `data-face` on its band) plus an inert hit target
(`.scale-hit` / `.disc-hit`), so `DesignerPreview` can select a scale by
clicking it in the preview; the hit targets stay inert in export and print.

The simulator and the designer share `components/AppBar.vue`, so both screens
expose the same application-level controls: the theme picker, the language
switch, a contextual export menu, the help action and the simulator/designer
switch. Experiment and authoring controls (model controls in the simulator,
seed/template/import in the designer) sit in the bar's `brand` / `tools` slots.
`appMode.ts` holds the `AppMode` type and the bar's export-item shape, keeping
the two screens decoupled.

Since 5b the designer renders `panels/ScaleForm.vue` for the selected scale: it
edits the scale's own fields (`id`, `name`, `type`, `orientation`,
`sharedLabels`, `notes`, `numbersBelow`, `tickEdge`) and duplicates it. Since 5c
it also renders `panels/CalcForm.vue`, which edits the selected scale's whole
`CalculationSpec`: `domain`, `map` (every kind, including `expr` with its
`position` / `inverse` strings), `decades`, `decreasing`, `read`, `labelFormat`,
`labelLevel`, the `intervals` (step / level rows and interval labels), `labels`
and `marks`; the raw DSL option tokens are displayed through `designer.*` i18n.
A scale whose `calculation` is a `{ ref }` is edited through its named
`calculations` entry, so the store resolves the reference first. A calculation
can be re-seeded from the generator presets (`log`, `linear`, `fn`, `valueFn`,
`expr`). Since 5d the store keeps a localStorage draft (`draft.ts`: injected
storage, a safe no-op when storage is unavailable) that is restored once on
creation (`draftRestored`) and can be cleared; the validator's dotted paths are
highlighted inline on the matching field or subtree (`errors.ts` over
`.is-error`); and a template select seeds a minimal linear or circular starter
rule (`templates.ts`: `linearLog`, `circularCd` -- the latter now previews as a
disc). Since 5e the framework-free renderer draws circular rules:
`layout/disc.ts` (`computeDiscLayout(disc, counts)`) splits the annulus into
three equal bands -- `upper` outermost, `lower` innermost -- and one sub-ring per
scale; `draw/disc.ts` (`renderDiscToSVG` / `renderDiscSheetToSVG`) draws
concentric rings whose graduations come from the same `getScaleTicks` engine, a
tick at position `p` as a radial line at angle `2π·p` (positions wrap), numerals
rotated tangentially, with the limit circle and the pivot; the
`faces.front` / `faces.back` sides and their `upper` / `middle` / `lower` arrays
map to outer / middle / inner ring groups. The designer preview and
`utils/print.ts` use the disc sheet for `form: "circular"` (a missing `disc`
keeps the i18n notice). Spiral (log-log) scales are later work.

Since 5f the simulator operates a circular rule interactively. The store keeps a
rotor offset `discOffset` (turns, default 0) beside the linear `middleOffset`,
exposes `isCircular` (`currentModel.form === 'circular'`) and the
`setDiscOffset` / `resetDisc` actions, and `resetMotion` zeroes both offsets. A
`middle`-section ring is the rotor, so only its (movable) scales turn.
`components/CircularRule.vue` renders the disc through `renderDiscToSVG` with
`rotationTurns: { middle: discOffset }` and overlays one radial cursor line per
store cursor: dragging the disc turns the rotor, dragging a cursor moves it and
clicking the disc away from a cursor adds one at that angle.
`components/CircularReadings.vue` shows one card per cursor with a row per
scale, read through the same `readScaleValue` / `positionForValue` engine as the
linear panel, with the rotor offset subtracted for a movable scale (and added
back when a reading is edited); a reset-rotation button zeroes the rotor.
`App.vue` picks the view by `store.isCircular` and renders
`CircularRule.vue` + `CircularReadings.vue` for a circular rule, the unchanged
`SlideRule.vue` + `CursorReadings.vue` for a linear one. The rotor and the
interactive circular cursor are no longer later work; spiral scales remain.

The simulator can also load an external `RuleDefinition` JSON at runtime (for
example a rule produced by the generator or exported from the designer). The
framework-free `utils/importRule.ts` exposes `importRuleText(text)`: it parses
the JSON and validates the value through `core.parseRule`, returning a tagged
union (`ok` / `parseError` / `errors`). A `form: "circular"` rule is now
accepted like a linear one. The store's `imported` slot
(`importedRule`, surfaced through `modelOptions` and driven by `loadRule` /
`clearImported`) adopts a successful rule as the reserved `imported` model and
resets the interaction state exactly like a built-in model switch; a failure
leaves the current model untouched, and clearing only resets a built-in when the
imported rule was active. `App.vue` offers a **Load rule JSON** button and
accepts a JSON file dropped onto the simulator view (inactive while the designer
is open); a failure opens `components/ImportRuleDialog.vue`, which reports the
raw JSON syntax message or the aggregated `RuleError[]` (`path: code: message`).
The import is local and in-memory only: URL loading and persistence are later
work.

### 3.2 Responsibilities

| Module | Responsibility | Depends on |
|---|---|---|
| `types/` | type definitions | - |
| `schema/` | JSON DTO types and the aggregating validator | - |
| `format/policies` | named label-format policies -> formatters | engine formatters |
| `expr/` | safe arithmetic expressions and numeric inversion for `map.kind: 'expr'` | - |
| `load/` | validate + resolve a rule, and load the built-ins | `schema`, `format`, `data/ruleHelpers` |
| `engine/gradations` | printed-number formatting helpers | - |
| `engine/logarithmic` | folded / linear printed-number formatters | `gradations` |
| `engine/scaleMapping` | a Mapping's `toPosition` / `toDomain` and printed ranges | `types` |
| `engine/scaleCalculation` | the single tick generator | `scaleMapping` |
| `engine/scaleFunctions` | tick array for a scale (via its `calc`) | `scaleCalculation` |
| `engine/scaleReader` | value at a normalized position | `scaleMapping` |
| `data/models` | model registry (`id`, `available`, structure) | `model1002`, `model57` |
| `data/model1002` | selects the loaded 1002 (re-exports the side helpers) | `load/builtInRules`, `data/ruleHelpers` |
| `data/model57` | selects the loaded Type 57 | `load/builtInRules` |
| `renderer/layout` | physical spec -> millimetre layout and pixels | `types` |
| `renderer/layout (disc)` | disc spec -> concentric scale-ring radii | `types` |
| `renderer/themes` | colour tokens for the six themes (rule face + app UI) | - |
| `renderer/draw` | `renderSection` / `renderRuleToSVG`: ticks, numerals, notes | `core`, `renderer/layout`, `renderer/themes` |
| `renderer/draw (rule/sheet)` | one face / a stacked 1:1-mm print sheet | `core`, `renderer/layout`, `renderer/themes` |
| `renderer/draw (disc)` | one disc / a stacked 1:1-mm disc sheet | `core`, `renderer/layout`, `renderer/themes` |
| `stores/slideRule` | global state, including the runtime-imported rule slot | `models`, `renderer/themes` |
| `simulator/utils/importRule` | JSON text -> `parseRule` (linear or circular) | `core` |
| `simulator/utils/print` | 1:1 print document (linear sheet or disc); opens the print dialog | `renderer` |
| `components/ScaleSection` | mounts one section SVG via `renderSection` | `renderer`, `i18n` |
| `components/SlideRule` | stacked faces, interaction | `ScaleSection`, `renderer`, `stores` |
| `components/ImportRuleDialog` | report an import failure (syntax / validation) | `i18n`, `utils/importRule` |
| `designer/model` | pure spec operations: adapt, detect, scale/field ops, calculation ops and presets | `core` (types), `generator` (types) |
| `designer/draft` | localStorage draft (injected storage; save/load/clear, safe no-op) | `designer/model`, `generator` (types) |
| `designer/errors` | map validator `BuildError` paths to form fields | `generator` (types) |
| `designer/templates` | starter `RuleSpec`s (`linearLog`, `circularCd`) | `core` (types), `generator` |
| `designer/store` | designer state; `buildRule` + `parseRule` build/preview, field and calculation setters | `designer/model`, `core`, `generator` |
| `designer/DesignerView` | full-screen shell: metadata form, scale tree, error list, exports | `designer/store`, `i18n` |
| `designer/DesignerPreview` | read-only preview via `renderRuleSheetToSVG` (linear) / `renderDiscSheetToSVG` (circular); missing-disc notice | `renderer`, `core` |
| `designer/ScaleForm` | selected-scale field form (own fields + duplicate) | `designer/store`, `designer/model`, `core`, `i18n` |
| `designer/CalcForm` | selected-scale calculation form (all fields, `expr` map, presets) | `designer/store`, `designer/model`, `core`, `i18n` |
| `generator/spec` | the author `RuleSpec` DTO (named `calculations` + `{ ref }`, `form` / `disc`) | `core` (types) |
| `generator/build` | `buildRule`: inline refs, assemble and validate | `core`, `generator/spec` |
| `generator/presets` | map/read/labelFormat presets over explicit measured fields | `core` (types) |
| `generator/cli` | `runCli(argv, io)` and the exit-code contract | `generator/build` |

### 3.3 Internationalisation
- **Single entry point**: `packages/simulator/src/i18n/`. Components use `const { t } = useI18n()`.
- **Schema enforced**: `zh-CN.ts` exports `MessageSchema` (`typeof messages`);
  `en-US.ts` is typed with it, so a missing key fails `vue-tsc`.
- **No text in data**: themes and models carry only an `id`; the display name is
  `t('theme.<id>')` / `t('model.<id>')`, and scale tooltips use `t('scaleDesc.<name>')`.
- **Switching**: `applyLocale()` updates `i18n.global.locale`, `<html lang>` and
  the document title, then persists to `localStorage['sliderule-1002:locale']`.
- **Detection**: a Simplified-Chinese environment selects `zh-CN`; anything else
  selects `en-US`.
- **New locale**: add `locales/<tag>.ts`, register it in `SUPPORTED_LOCALES` and
  add `language.<tag>`.

### 3.4 Tick generation (six steps)
Every scale's graduations come from `generateScaledTicks(calc)` in
`engine/scaleCalculation.ts`. The `calc` is resolved from the scale's JSON
`calculation` by `load/resolve.ts` (`parseRule`); its `labelFormat` policy is
resolved by `format/policies.ts`:
1. lay each `interval`'s ticks, finest step first; a coarser step re-levels the
   ticks it coincides with;
2. repeat the intervals over `decades` (K = 3, A / B = 2);
3. add the two `domain` ends as level-1 ticks;
4. place the printed `labels` (read values, `toPosition(unread(value))`, text
   via `labelFormat`; `labelLevel` decides whether a label forces level 1);
5. add the `marks` (pi, sqrt(10), the `∞` asymptote);
6. mirror for `decreasing`, then sort by position.

See [calculation-pipeline.md](calculation-pipeline.md) for the full
metadata -> ticks -> SVG pipeline.

### 3.5 Rule generator
`packages/generator` adds an authoring layer over the schema-v1 DTO and depends
only on `core`. Its **library** (`src/index.ts`: `buildRule`, the `RuleSpec`
types, the presets) is browser-safe, so the simulator's designer imports it
directly; only its **CLI** (`bin.ts`: `node:fs` / `process`) is Node-only.
- **`RuleSpec`** (`spec.ts`) is a DTO superset of `RuleDefinition`. It adds a
  rule-level `calculations: Record<string, CalculationSpec>` and lets a scale's
  `calculation` be an inline `CalculationSpec` or `{ ref: name }`. This is the
  only authoring indirection, so shared maths (C/D, A/B) is written once. It
  carries the rule-level `form` / `disc` fields of the DTO unchanged.
- **`buildRule(spec)`** (`build.ts`) inlines every ref, assembles a schema-v1
  `RuleDefinition` and validates it with `core.parseRule`. It is total: bad input
  comes back as `{ ok: false, errors }` (`BuildError { path, message, code? }`),
  never a thrown exception; the generator aggregates core errors and carries
  their code on `BuildError.code`. Refs are looked up with `Object.hasOwn` so
  `__proto__`/`constructor` do not resolve.
- **Presets** (`presets.ts`: `logScale`, `logDecades`, `linearScale`, `fnScale`,
  `valueFnScale`, `exprScale`) supply only the map / labelFormat boilerplate; the structural
  helpers `interval` and `reciprocal` build the `intervals` / `read` shapes.
  Every measured field - domain, intervals, labels, marks - is passed in
  explicitly, so nothing here can invent graduation data.
- **CLI** (`cli.ts` / `bin.ts`): `slide-rule-gen build <spec.json> -o <out.json>`.
  `runCli(argv, io)` is pure and testable; `bin.ts` supplies the real
  `node:fs` / `process` IO. The exit-code contract is `0` success, `1` the spec
  built but failed validation (every error to stderr), `2` the invocation or
  input could not be processed (usage, unreadable file, malformed JSON,
  unwritable output).
- **Golden test** (`golden.test.ts`) rebuilds the 1002 front-middle `C`
  calculation through `logScale`, asserts it deep-equals the canonical
  `packages/core/rules/1002.json` calculation field by field, that the built rule
  passes `core.parseRule`, and that `getScaleTicks` matches the canonical scale.
  The full-rule golden (every scale) is later work.

---

## 4. Data flow

### 4.1 Static (start-up)
```
rules/1002.json, rules/type-57.json (canonical, schemaVersion: 1)
  -> builtInRules() -> parseRule (validate + resolve)
  -> model1002.ts / model57.ts (MODEL_1002 / MODEL_57) -> models.ts
  -> SlideRule.vue (ResizeObserver on the viewport)
  -> renderer: computeFaceLayout(physical, width * zoom) -> FaceLayout
  -> ScaleSection.vue: renderSection(svg, { scales, section, layout, theme })
  -> core: getScaleTicks(scale) -> Tick[]
  -> SVG (lines + text in millimetres)
```

### 4.2 Interactive
```
drag the slide -> onMiddlePointerDown -> store.middleOffset
                                       -> both faces translate together
drag a cursor / click the face -> store.cursors (add / move / remove)
hover or drag a cursor -> hoverReadouts -> one readout per scale strip
zoom slider or typed ratio -> store.zoom -> pxPerMm (the single zoom entry)
```

### 4.3 External rule import
```
file picker / drag-drop -> file.text() -> store.loadRule
  -> utils/importRule: JSON.parse -> parseRule (linear or circular)
  -> ok: store.importedRule, model id `imported`, resetInteraction
  -> failure: ImportRuleDialog (parseError / RuleError[])
```

---

## 5. Performance

### 5.1 Rendering
- **One scaling factor**: `pxPerMm` drives every size; zoom and new models touch
  nothing else.
- **No distortion**: a section SVG's viewBox matches its on-screen aspect.
- **No placeholder scales**: every scale carries a `calc`; a scale without one
  simply draws no ticks.
- **Measured intervals**: a scale's `ScaleCalculation` lists its measured
  `intervals` (finest step first; a coarser step re-levels the ticks it
  coincides with), so the number of elements per scale is fixed by the
  photograph rather than computed from a runtime ladder.

### 5.2 Interaction
- **pointer events** unify mouse and touch.
- **Clamps**: slide offset [-1, 1], cursor positions [0, 1], zoom [1, 6].
- **Cursor cap**: at most 8 cursors; `removeCursor` on the last one clears it
  instead of deleting it.
- **No debounce**: state is updated directly (native 60fps).
- **Scrollbar gutter**: `html { scrollbar-gutter: stable }` prevents the layout
  from oscillating when a vertical scrollbar appears at intermediate zoom.

---

## 6. Type safety

### 6.1 Core types
```typescript
export type ScaleType =
  | 'C' | 'D' | 'A' | 'B' | 'K' | 'CF' | 'DF' | 'CI' | 'DI' | 'CIF' | 'L'
  | 'LN1' | 'LN2' | 'LN3' | 'LN1I' | 'LN2I' | 'LN3I'
  | 'H2' | 'H3' | 'H2P' | 'SH2' | 'SH3' | 'TH2'
  | 'SIN2' | 'COS2' | 'TG2' | 'CTG2' | 'TG3' | 'CTG3'
  | 'S' | 'ST' | 'T'

export interface Tick {
  position: number       // C/D decade units: 0..1 at C = 1..10; may overflow
  value: number
  level: 1 | 2 | 3       // major (labelled) / medium / fine
  label?: string
  angle?: number         // degrees, trig scales (enables co-angle labels)
}

export interface ScaleDefinition {
  id: string
  name: string
  type: ScaleType
  side: 'front' | 'back'
  section: 'upper' | 'middle' | 'lower'
  isMovable: boolean
  orientation: 'increasing' | 'decreasing'
  color: string
  sharedLabels?: SharedLabel[]
  notes?: string[]       // right-hand reference notes
  calc?: ScaleCalculation // the one calculation: graduations + reading
  numbersBelow?: boolean  // printed numbers below the graduations
  tickEdge?: 'roof' | 'floor'
}
```

### 6.2 Coverage
- Every component uses `<script setup lang="ts">`.
- `vue-tsc --noEmit` runs before every build.
- `tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`.

---

## 7. Testing

### 7.1 Unit tests (implemented, Vitest)
| File | Coverage |
|---|---|
| `renderer: layout/layout.test.ts` | 6:1 aspect, pxPerMm scaling, row-height solution, 4/6/4 stacking, groove positions, tickX / rowTopMm |
| `renderer: draw/section.test.ts` | `renderSection` / `renderRuleToSVG`: tick classes and levels, label text and positions, notes, guide lines |
| `renderer: draw/rule.test.ts` | the 1:1 sheet, face stacking, gap and slide offset |
| `renderer: layout/disc.test.ts`, `draw/disc.test.ts` | circular disc layout (band split, sub-rings) and drawing (radial ticks, seam dedup, names, sheet, `rotationTurns`) |
| `renderer: draw/labelLayout.test.ts`, `draw/radicalGeometry.test.ts` | co-angle label offsets; radical geometric ratios |
| `core: schema/validate.test.ts` | the validator's error codes and one-pass aggregation |
| `core: load/parseRule.test.ts`, `load/builtIn.test.ts`, `load/serialize.test.ts` | spec resolution, loading the canonical JSON, lossless runtime -> DTO round-trip |
| `core: engine/scaleMapping.test.ts` | `toPosition` / `toDomain` for log, linear, fn and valueFn mappings |
| `core: expr/{parse,evaluate,invert}.test.ts` | the safe parser / evaluator and numeric inversion |
| `core: load/exprRule.test.ts` | an `expr` map end to end: ticks, analytic and numeric reading, serialize round-trip |
| `core: engine/scaleCalculation.test.ts` | `ScaleCalculation` -> tick geometry, label levels and marks |
| `core: engine/scaleCalculation.dashboard.test.ts` | every `ScaleDefinition` of both models has a `calc` and round-trips at each tick |
| `core: engine/logarithmic.test.ts` | folded / linear printed-number formatters |
| `core: data/model1002Graduations.test.ts` | measured 1002 graduations: finest steps, counts, levels, labels, positions |
| `core: engine/type57Scales.test.ts` | Type 57 S / ST / T endpoints and round-trips; reused K / A / C / D / DI / L |
| `core: engine/scaleReader.test.ts` | cursor reading round-trips, both-way `positionForValue` inverses, tolerance edges, `formatValue` |
| `simulator: data/model57.test.ts` | Type 57 physical spec, 2/4/3 layout, scale list and colour, registry |
| `simulator: stores/slideRule.test.ts` | cursor list: add (cap + clamp), move, remove, last-cursor guard, model reset; single-faced model |
| `simulator: utils/print.test.ts` | `buildPrintHTML` `@page`/escaping; `printSlideRule` opens and prints |
| `simulator: designer/model.test.ts`, `designer/store.test.ts` | pure spec operations (definition round-trip, document detection, scale add/remove/move, form/disc); store load/select/build/preview transitions |
| `simulator: designer/{draft,errors,templates,store.draft}.test.ts` | localStorage draft lifecycle, validator-path helpers, starter templates, jsdom clear-draft |
| `simulator: designer/DesignerView.test.ts` | component (jsdom): seed the 1002 -> a valid build, load the circular template -> a disc preview, a zero face width -> the validation errors |
| `simulator: designer/DesignerPreview.test.ts` | component (jsdom): a linear rule as a sheet, a circular rule as a disc, the notice for a circular rule with no disc |
| `simulator: components/{CircularRule,ImportRuleDialog}.test.ts` | component (jsdom): the circular disc mounts and renders; the parse-error message, the aggregated `RuleError[]` as `path: code: message`, the close emit |
| `generator: build.test.ts` | ref inlining (missing ref, prototype-safe lookup), core error mapping, totality and input immutability |
| `generator: presets.test.ts` | each preset's map / labelFormat output and each structural helper's shape against explicit fields |
| `generator: cli.test.ts` | the exit-code contract (`0` / `1` / `2`) with in-memory IO |
| `generator: golden.test.ts` | rebuilds the 1002 `C` calculation from independent literals and compares it to the canonical data |

The first **component tests** mount the real components with `mountWithPlugins`
(`packages/simulator/src/test/mount.ts`: a fresh Pinia plus the app i18n) through
`@vue/test-utils` in jsdom. The root `vitest.config.ts` applies
`@vitejs/plugin-vue` so `.vue` files compile; Vitest's default include/exclude
and the per-file `// @vitest-environment jsdom` docblocks are kept, so the
existing node suites are unchanged.

### 7.2 To add
- config integrity: `countScales(model) = 28`, distribution 4/6/4
- interaction: drag maths including the zoom factor

### 7.3 E2E (implemented, Playwright)
The repo-root `playwright.config.ts` drives the system **Microsoft Edge**
(`channel: 'msedge'`) locally, so no browser is downloaded; in CI (no Edge on
the runner) it falls back to Playwright's bundled **Chromium**
(`npx playwright install chromium`), selected by `process.env.CI` (override with
`PW_CHANNEL`). It pins `testIdAttribute: 'data-test'` and starts (or, outside CI,
reuses) the dev server through its `webServer` on `http://localhost:3000`. The
suite is 5 tests across four specs: `e2e/simulator.spec.ts` (the 1002 renders,
then switches to the Type 57), `e2e/designer.spec.ts` (the designer seeds the 1002
and previews the circular template as a disc), `e2e/import.spec.ts` (a
designer-exported definition loads back as the `imported` model) and
`e2e/circular.spec.ts` (a circular fixture imports, the rotor turns and the
readings stay live). Run with `npm run e2e`; the `e2e/` specs are excluded from
`npm test` (Vitest) and from the `verify` CI job, but run in the `e2e` CI job.
`e2e/tsconfig.json` type-checks the specs and `playwright.config.ts` through
`npm run typecheck:e2e`, which is part of `npm run build`.

---

## 8. Deployment

### 8.1 Build output
```bash
npm run build
# packages/simulator/dist/
#   index.html
#   assets/index-[hash].js
#   assets/index-[hash].css
```

### 8.2 Targets
- **GitHub Pages** (primary)
- Vercel / Netlify (alternative)
- Locally: `npm run preview`

### 8.3 CI
`.github/workflows/ci.yml` has two jobs. `verify` runs `npm ci`, `npm run lint`,
`npm test` and `npm run build` (which includes `typecheck:e2e`). `e2e` (gated by
`needs: verify`) installs Chromium and runs `npm run e2e`, caching
`~/.cache/ms-playwright` and uploading `test-results` on failure.

---

*Version: v3.3*
*Created: 2025-01*
*Last revised: 2026-09 - canonical JSON rules (`rules/*.json`) loaded and
validated by `parseRule` / `builtInRules`; framework-free `renderer` package;
browser-safe `generator` library (`buildRule`) + Node-only CLI
(`slide-rule-gen`); Type 57 model; unified calculation model; the
`map.kind: 'expr'` expression DSL; the 1:1 print export; the visual designer
shell (`simulator/src/designer/`), its per-scale field form (5b,
`panels/ScaleForm.vue`), its calculation editor (5c, `panels/CalcForm.vue` over
the pure calculation and preset operations), its 5d polish (`draft.ts`,
`errors.ts`, `templates.ts`: the localStorage draft, inline error highlighting
and the starter templates) and its 5e circular rendering (`layout/disc.ts` /
`draw/disc.ts`: `computeDiscLayout` and `renderDiscToSVG` /
`renderDiscSheetToSVG`, used by the designer preview and the 1:1 print), built
over the `form` / `disc` circular-rule metadata; and runtime loading of an
external `RuleDefinition` JSON in the simulator (file picker / drag-drop ->
`utils/importRule.ts` -> `parseRule`, the store's `imported` slot and
`components/ImportRuleDialog.vue`); and the first component tests
(`vitest.config.ts` with the Vue plugin, `@vue/test-utils` / jsdom,
`simulator/src/test/mount.ts`, `designer/DesignerView.test.ts`,
`designer/DesignerPreview.test.ts` and `components/ImportRuleDialog.test.ts`);
the Playwright end-to-end suite (`playwright.config.ts` +
`e2e/{simulator,designer,import,circular}.spec.ts`, run against the system
Microsoft Edge via `npm run e2e` and excluded from `npm test`); and circular
rule interaction (`CircularRule.vue` + `CircularReadings.vue` in `App.vue`, the
`discOffset` rotor applied through `renderDiscToSVG`'s `rotationTurns`, the
`middle`-ring rotor readings and accepted circular imports); and the circular E2E flow
(`e2e/circular.spec.ts`); with the E2E suite wired into CI (`ci.yml`'s `e2e` job,
Chromium on the runner) and type-checked by `typecheck:e2e` in `npm run build`,
and two-faced circular rules opening dual, with both discs stacked vertically
like the linear faces*
