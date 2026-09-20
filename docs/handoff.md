# Handoff / current state

Snapshot: 2026-09-19. This is a working note, not a source of truth; the domain
and engineering docs remain authoritative.

## Project

Web simulation of two Chinese slide rules: the full-size **1002** (double-sided)
and the pocket **Type 57** (single face). Stack: Vue 3 + TypeScript (strict) +
Vite + Pinia + vue-i18n; geometry is in millimetres and `pxPerMm` is the only
zoom entry point.

Only two sources of truth: the prototype photographs in
`docs/domain/prototype/` and Wikipedia. Unclear facts are marked as not yet
established, never guessed.

## Done in this session

- **Measured graduation tables for every 1002 scale** now drive the drawing:
  `ln1/2/3`, `sin2/cos2`, `tg2/tg3`, `sh2/sh3`, `H2/H'2/H3`, `th2`,
  `C/D/CI/DI`, `A/B/K`, `CF/DF/CIF`, `lg`. Data lives in
  `packages/core/rules/1002.json`.
- **Rendering**: `sh2/sh3` and `tg2/tg3` share a baseline (`ScaleDefinition.tickEdge`
  = `floor` / `roof`); the red co-angle number flanks the tick (black left, red
  right); a top-hung row keeps its numbers clear of the longest ticks.
- **Labels**: A/B/K print the integers only (A/B also pi); C/D print the tenths
  in `[1,2)` then the integers; CI/DI print the reciprocal integers; `th2`
  prints its numbers below the graduations; the C/D `[1,2)` `.05` midpoints are
  long; on a measured hyperbolic row a printed number is no longer forced to the
  longest level.
- **Docs**: `docs/domain/model-1002.md` section 3.9 records the measurement
  passes and the open rows; `docs/dev/graduations.md` (+ `-cn`) is a
  generated per-scale audit sheet (segments, `step@level`, printed numbers,
  adjacency / tickEdge / direction / numbers above-below, position range).
- **Measurement method and tooling**: `docs/dev/measurement.md` (+
  `-cn`) documents how a row is measured, and `tools/measure/` (offline,
  `jpeg-js`, ignored by the build) holds the reusable `crop`, `strip`,
  `rowscan`, `ticklen`, `fitmap` and `segments` helpers.
- **Unified calculation model (Plans 1-3)**: `types/scale.ts`
  (`ScaleCalculation`, `Mapping`), `engine/scaleMapping.ts` and
  `engine/scaleCalculation.ts` give every scale one declarative calculation, and
  **one calculation per scale now drives both drawing and reading** - the Type 57
  since Plan 1, the whole 1002 since Plan 2. No measured source interval or label
  changed; the drawn-tick changes are H'2's exit tick (moved by one when its drawn
  domain end became `0.995`) and CIF's levels, which now take the measured
  `CF_GRADUATIONS` levels (the two CF index ends are L1 and ten grid ticks are L3:
  `L1 20→22, L2 87→75, L3 229→239` at the same 336 ticks, pinned by
  `model1002Graduations.test.ts`). Since Plan 3 `readScaleValue` /
  `positionForValue` read `calc` too. The generated audit sheet reads `calc`
  throughout. The legacy `GraduationTable` / `ScaleReading` types, the
  `specialScales` generators, `engine/scaleReading.ts` and the
  `engine/logarithmic.ts` tick generator are deleted.
- All changes pass `npm run lint`, `npm test` (356), `npm run build`.
- **Renderer extraction (multi-package 1c)**: the millimetre layout and theme
  tokens moved from `packages/simulator` into the framework-free
  `packages/renderer`; a pure drawing API (`renderSection`, `renderRuleToSVG`,
  `measureRadicals`) now turns the in-memory rule into SVG, and
  `ScaleSection.vue` only mounts the `<svg>` and calls it.
- **JSON rule source of truth (multi-package 1d)**: a serialisable
  `RuleDefinition` (`schemaVersion: 1`) now defines a rule.
  `packages/core/rules/1002.json` and `type-57.json` are canonical;
  `schema/validate.ts` aggregates `RuleError[]`, `load/resolve.ts` turns a
  `CalculationSpec` into the runtime `ScaleCalculation`, `parseRule` validates
  then resolves, and `builtInRules` loads the two files. `MODEL_1002` / `MODEL_57`
  are the parsed rules. The measured TS modules
  (`data/model1002Calculations.ts`, `data/model1002Graduations.ts`,
  `data/model57Graduations.ts`, `engine/specialScales.ts`) are deleted;
  `data/ruleHelpers.ts` holds the shared helpers and `model1002.ts` / `model57.ts`
  are thin wrappers.
- **Rule generator (`packages/generator`, phase 2)**: a Node-only, build-time
  package (its library became browser-safe in 5a; see below) with a one-way
  `generator -> core` dependency. An author writes a
  `RuleSpec` (a DTO superset with named rule-level `calculations` and per-scale
  `{ ref }`); `buildRule` inlines the refs, assembles a schema-v1
  `RuleDefinition` and validates it with `core.parseRule`, returning
  `{ ok, rule }` or `{ ok: false, errors }` and never throwing. Presets
  (`logScale`, `logDecades`, `linearScale`, `fnScale`, `valueFnScale`,
  `reciprocal`, `interval`) carry only the map/read/labelFormat boilerplate; the
  measured fields stay explicit in the spec. The CLI is
  `slide-rule-gen build <spec.json> -o <out.json>` (exit `0` success, `1` invalid
  spec, `2` usage/IO), with the logic in a pure, testable `runCli(argv, io)`. A
  per-scale golden test rebuilds the 1002 `C` calculation through `logScale` and
  diffs it field by field against `rules/1002.json`. Root `build` builds the
  generator too. All changes pass `npm run lint`, `npm test`, `npm run build`.
- **Expression DSL (`packages/core/src/expr/`, phase 3)**: `expr/parse.ts` is a
  hand-written tokenizer + recursive-descent parser (no `eval`), `expr/evaluate.ts`
  compiles `position` / `inverse` over the `x` / `p` variable with only `pi`, `e`
  and a fixed function whitelist, and `expr/invert.ts` provides `numericInverse`
  (bracketed bisection). A new opt-in `map.kind: "expr"` (`ExprMapSpec`:
  `position` required, `inverse?`) is validated by the schema: both strings are
  parsed and name-checked, and the forward is sampled for finiteness and strict
  monotonicity over the domain (`invalidExpression`). `load/resolve.ts` compiles
  it to an `ExprMapping` with an analytic `toDomain` when `inverse` is given and
  numeric inversion otherwise; `load/serialize.ts` round-trips it losslessly. The
  generator gained an `exprScale` preset. Built-in rules and their JSON are
  unchanged (no built-in uses `expr`). All changes pass `npm run lint`,
  `npm test`, `npm run build`.
- **1:1 print / PDF export (phase 4)**: the renderer API is additive. A second
  whole-rule entry point `renderRuleSheetToSVG(rule, { faces, theme, titleOf,
  slideOffsetMm })` stacks the visible faces on one white sheet at 1:1 mm with a
  `PRINT_FACE_GAP_MM = 4` gap; `RenderRuleOptions` gained an optional
  `slideOffsetMm`, and each face's middle band alone carries the
  `translate(slideOffsetMm, 0)` when the offset is non-zero. The simulator gained
  `utils/print.ts`: `buildPrintHTML` wraps the serialized sheet in a standalone
  document with `@page { size: <w>mm <h>mm; margin: 0 }`, and `printSlideRule`
  renders and measures the sheet off-screen, serializes it and opens the print
  dialog; a new `export.print` i18n key labels the menu item and `App.vue` passes
  the current slide offset in millimetres. Nothing is scraped from the zoomed
  DOM, and **no measured data changed** (`packages/core/rules/*.json` and the
  generated audit sheets are byte-identical). All changes pass `npm run lint`,
  `npm test` (431), `npm run build`.
- **Visual designer foundation (phase 5a, tasks 1-5)**: `packages/core` gained
  rule **form** (`linear` / `circular`) and **`disc`** metadata (`RuleForm`,
  `DiscSpec`) on the DTO and runtime types, with the validator codes
  `unknownForm` / `invalidDisc` / `unexpectedDisc`, a synthesised square
  bounding box when a circular rule omits `physical`, and `resolve` /
  `serialize` round-tripping the form. `packages/generator`'s `RuleSpec` carries
  `form` / `disc`, and `@slide-rule/generator` is now a `simulator` dependency
  (its library is browser-safe; only `bin.ts` is Node-only).
  `packages/simulator/src/designer/` adds the pure `model.ts` (adapt, detect,
  scale add/remove/move, form/disc), the Pinia `store.ts` (`buildRule` +
  `parseRule` build/preview) and the `DesignerView.vue` / `DesignerPreview.vue`
  shell, mounted from `App.vue` and i18n'd under `designer.*`. 5a edits the
  form / disc metadata but **does not render circular rules** (that is 5e); no
  measured data changed. All changes pass `npm run lint`, `npm test` (456),
  `npm run build`.
- **Visual designer per-scale fields (phase 5b)**: the designer's
  `packages/simulator/src/designer/model.ts` gains pure field operations
  (`updateScale`, `duplicateScale`, shared-label add / remove / update, note
  add / remove / set, and `noteToParts` / `partsToNote`); `store.ts` exposes
  `selectedScale` and the write-through actions (`setScaleField`,
  `duplicateScale`, `addSharedLabel` / `removeSharedLabel` / `updateSharedLabel`,
  `addNote` / `removeNote` / `setNoteParts`); and `panels/ScaleForm.vue`, mounted
  in `DesignerView.vue`, edits a selected scale's own fields (id, name, type,
  orientation, sharedLabels, notes, numbersBelow, tickEdge) and duplicates it,
  i18n'd under `designer.*`. 5b edits a scale's own fields only; the calculation
  editor is 5c, and no measured data changed. All changes pass `npm run lint`,
  `npm test` (467), `npm run build`.
- **Visual designer calculation editor (phase 5c)**: the designer's `model.ts`
  gains the calculation operations - `CalculationTarget` plus
  `getCalculation` / `setCalculation` and read-modify-write ops for every field
  of a `CalculationSpec` (`setDomain`, `setDecades`, `setDecreasing`, `setRead`,
  `setLabelFormat`, `setLabelLevel`, `setMap`), `defaultMap` and `seedPreset` over the `log` /
  `linear` / `fn` / `valueFn` / `expr` generator presets, and the interval,
  label and mark list ops. `store.ts` resolves the selected scale's calculation
  into `calculationTarget` / `selectedCalculation` (a `{ ref }` scale edits its
  named `calculations` entry) and exposes the write-through actions.
  `panels/CalcForm.vue`, mounted in `DesignerView.vue`, edits that whole
  calculation: `domain`, every `map.kind` (including `expr` with its `position`
  / `inverse` strings), `decades`, the `decreasing` mirror control, `read`,
  `labelFormat`, `labelLevel`, the `intervals` (step / level rows and interval
  labels), `labels` and `marks`, seeded from a generator preset; the DSL option
  labels all go through `designer.*` i18n. No measured data
  changed. All changes pass `npm run lint`, `npm test` (486), `npm run build`.
- **Visual designer polish (phase 5d)**: `designer/draft.ts` keeps a
  localStorage draft with injected storage (a safe no-op in node, private mode
  or on quota): `saveDraft` / `loadDraft` / `clearDraft`; `store.ts` restores
  one draft on creation (`draftRestored`) and exposes `clearDraft`.
  `designer/errors.ts` maps the validator's dotted `BuildError` paths to form
  fields (`errorPaths`, `hasError`, `subtreeHasError`), and
  `designer/templates.ts` exposes `templateSpecs()` with the `linearLog` and
  `circularCd` starter rules (the circular one was metadata only at this point;
  it renders as a disc since 5e). `DesignerView.vue` gains the template select, the
  Clear-draft button, the draft-restored note and the template i18n labels;
  `ScaleForm.vue` / `CalcForm.vue` mark invalid fields and subtrees with
  `.is-error`. No measured data changed. All changes pass `npm run lint`,
  `npm test` (501), `npm run build`.
- **Visual designer circular rendering (phase 5e)**: the framework-free renderer
  gains `packages/renderer/src/layout/disc.ts`
  (`computeDiscLayout(disc, counts)`: the annulus is split into three equal
  bands - `upper` outermost, `lower` innermost - and a section's band is divided
  into one sub-ring per scale) and `packages/renderer/src/draw/disc.ts`
  (`renderDiscToSVG` / `renderDiscSheetToSVG`): concentric rings whose
  graduations come from the same `getScaleTicks` engine as the linear renderer, a
  tick at position `p` as a radial line at angle `2π·p` so positions wrap, level
  lengths 0.50 / 0.40 / 0.32 and fixed 1.5 / 1.2 / 1 px widths, tangential
  numerals, the `circle.limit` outer circle and the `circle.pivot` inner circle,
  and the scale name at the top of each ring; `renderDiscSheetToSVG` stacks faces
  with `DISC_FACE_GAP_MM = 4`. The `faces.front` / `faces.back` sides and their
  `upper` / `middle` / `lower` arrays map to the outer / middle / inner ring
  groups (documented convention). `DesignerPreview.vue` branches on
  `circular && rule.disc` to preview the disc, and `utils/print.ts` uses the disc
  sheet for `form: 'circular'` (page width `disc.sheetSizeMm`); a circular draft
  without a disc keeps the i18n notice `designer.circularNotice`. The rotor,
  spiral scales and the interactive circular cursor are later work. No measured
  data changed. All changes pass `npm run lint`, `npm test` (512),
  `npm run build`.
- **External rule import (multipackage spec §5E, branch
  `simulator-import-json`)**: `packages/simulator/src/utils/importRule.ts`
  exposes `importRuleText(text)`, which parses JSON and validates the value
  through `core.parseRule`, returning a tagged union (`ok` / `parseError` /
  `errors`). The refusal of `form: "circular"` was removed when the circular
  view landed (see below). The store's `imported` slot
  (`importedRule`, `modelOptions`, `loadRule`,
  `clearImported`) adopts a successful rule as the reserved `imported` model and
  reuses `resetInteraction`; a failure leaves the current model untouched, and
  clearing only resets a built-in when the imported rule was active. The
  UI is a **Load rule JSON** toolbar button, a drag-and-drop target on the
  simulator view, the model-selector entry and `components/ImportRuleDialog.vue`
  (syntax / validation errors), i18n'd under `import.*`. The import
  is in-memory and local only; URL loading and persistence are later work. No
  measured data changed. All changes pass `npm run lint`, `npm test` (524),
  `npm run build`.
- **Designer component tests (branch `designer-component-tests`)**: the first
  component tests, under `@vue/test-utils` + jsdom. The root `vitest.config.ts`
  applies `@vitejs/plugin-vue` (Vitest's defaults and the per-file
  `// @vitest-environment jsdom` docblocks are kept), and
  `packages/simulator/src/test/mount.ts` exposes `mountWithPlugins` (a fresh
  Pinia + the app i18n). New suites: `designer/DesignerView.test.ts` (seed the
  1002 -> a valid build, the circular template -> a disc preview, a zero face
  width -> the validation errors), `designer/DesignerPreview.test.ts` (linear
  sheet, circular disc, missing-disc notice) and
  `components/ImportRuleDialog.test.ts` (parse error, aggregated `RuleError[]`,
  close emit; its circular-refusal case was removed when the circular view
  landed). A few `data-test` hooks were added to
  `DesignerView.vue`; no production behaviour changed and no measured data
  changed. All changes pass `npm run lint`, `npm test` (536), `npm run build`.
- **Playwright E2E suite (branch `playwright-e2e`)**: the first end-to-end tests,
  at the repo root rather than under `packages/`. `playwright.config.ts` drives
  the system **Microsoft Edge** (`channel: 'msedge'`, so no browser is
  downloaded), pins `testIdAttribute: 'data-test'`, runs `fullyParallel` with the
  `list` reporter, and starts (or, outside CI, reuses) the dev server through its
  `webServer` on `http://localhost:3000`. Three specs, 4 tests:
  `e2e/simulator.spec.ts` (the 1002 renders and switches to the Type 57),
  `e2e/designer.spec.ts` (the designer seeds the 1002 and previews the circular
  template as a disc) and   `e2e/import.spec.ts` (a designer-exported definition
  loads back as the `imported` model). Run them with `npm run e2e`; the specs are
  excluded from `npm test` (Vitest); later wired into the CI `e2e` job. A few `data-test` hooks
  were added to the app; the specs seed `sliderule-1002:tutorial-seen` to skip the
  first-run tutorial. No measured data changed. All changes pass `npm run lint`,
  `npm test` (536), `npm run build`.
- **Circular rule interaction (branch `circular-interaction`)**: the simulator now
  operates a circular rule. `renderDiscToSVG` / `renderDiscSheetToSVG` gain
  `rotationTurns?: Partial<Record<ScaleSection, number>>`, so a ring's ticks,
  numerals and name draw at `tick.position + turns` (a `middle` ring is the
  rotor); `stores/slideRule.ts` gains `discOffset` (turns, default 0),
  `setDiscOffset`, `resetDisc`, `resetMotion` (zeroes both offsets) and
  `isCircular` (`currentModel.form === 'circular'`); `utils/importRule.ts`
  accepts a `form: "circular"` rule again and `ImportRuleDialog` loses the
  circular branch. `components/CircularRule.vue` renders the disc
  (`renderDiscToSVG` with `rotationTurns: { middle: discOffset }`) and overlays a
  radial line per store cursor - drag the disc to turn the rotor, drag a cursor
  to move it, click away from a cursor to add one; `components/CircularReadings.vue`
  shows one card per cursor with a row per scale, read through the same
  `readScaleValue` / `positionForValue` engine with the rotor offset applied to a
  movable scale, plus a reset-rotation button. `App.vue` branches on
  `store.isCircular` to `CircularRule` / `CircularReadings`. The E2E suite gains
  `e2e/circular.spec.ts` (a circular fixture imports, the rotor turns, the
  readings stay live). No measured data changed. All changes pass `npm run lint`,
  `npm test` (546), `npm run build`.
- **E2E in CI + e2e type check (branch `e2e-ci`)**: `playwright.config.ts` picks
  its browser from the environment - system Edge locally, bundled Chromium in CI
  (`PW_CHANNEL` overrides). `.github/workflows/ci.yml` gains an `e2e` job
  (`needs: verify`) that caches `~/.cache/ms-playwright`, installs Chromium with
  `--with-deps` and runs `npm run e2e`, uploading `test-results` on failure; the
  config also gets `retries: 1` and `trace: 'on-first-retry'` in CI. A new
  `e2e/tsconfig.json` (plus a hand-rolled `e2e/node.d.ts`, so no `@types/node`)
  type-checks the specs and `playwright.config.ts` through the new
  `  typecheck:e2e` script, which is part of `npm run build`. (A two-faced circular
  rule initially defaulted to single-face mode with a front/back switch; it was
  later changed to open dual, with the two discs stacked - see the circular
  interaction work.) No measured data changed. All
  changes pass `npm run lint`, `npm test` (553), `npm run build` (incl.
  `typecheck:e2e`) and `npm run e2e` (5).

## Open / to decide

- **Normal rows' attachment**: the audit sheet shows only the shared-edge rows
  point their ticks up; the measurement suggested K/A rise from the bottom edge.
  Whether the renderer's default band matches the photograph is unresolved.
- **"Label not the longest"**: only the hyperbolic rows set
  `labelLevel: 'keep'`; the unified generator defaults every other printed number
  to level 1.
- **Unresolved measurements**: `th2` segment-dependent long ticks and its
  `[1.5,3]` tail; `sin2 [80,90]`; `sh3` longest class.
- **Unified calculation model**: complete (Plans 1-3). The migration is over, so
  any further work here is ordinary feature work.

## Code layout (lines, non-test / test)

- `packages/core/src` TS: **2480 / 24 files**, tests **4018 / 21 files**;
  `packages/core/rules` holds the two canonical JSON files.
- `packages/renderer/src` TS: **1156 / 10 files**, tests **662 / 7 files**.
- `packages/simulator/src` TS/Vue/CSS: **7743 / 33 files**, tests **2001 / 17 files**.
- `packages/generator/src` TS: **497 / 7 files**, tests **713 / 4 files**; the
  CLI builds to `packages/generator/dist/bin.js` via Vite SSR.
- `packages/core/src` breakdown: `data` 105, `engine` 298, `types` 293, `schema` 815,
  `format` 67, `load` 484, `expr` 407; `packages/renderer/src/layout` 169, `draw` 876;
  `packages/simulator/src/components` 2649, `i18n` 704, `stores` 319, `utils` 250,
  `designer` 3027.
- Largest: `packages/simulator/src/App.vue` (738), `packages/simulator/src/designer/model.ts` (689),
  `packages/core/src/schema/validate.ts` (658), `packages/simulator/src/designer/panels/CalcForm.vue` (645),
  `packages/simulator/src/designer/DesignerView.vue` (638), `packages/simulator/src/components/SlideRule.vue` (568),
  `packages/simulator/src/designer/store.ts` (453), `packages/simulator/src/components/CircularRule.vue` (411),
  `packages/simulator/src/components/CursorReadings.vue` (334), `packages/renderer/src/draw/section.ts` (329),
  `packages/simulator/src/stores/slideRule.ts` (319), `packages/simulator/src/designer/panels/ScaleForm.vue` (318),
  `packages/simulator/src/i18n/locales/zh-CN.ts` (316), `packages/simulator/src/i18n/locales/en-US.ts` (315),
  `packages/simulator/src/components/CircularReadings.vue` (265), `packages/core/src/types/scale.ts` (287),
  `packages/core/src/expr/parse.ts` (257).

Where things are: canonical measured data in `packages/core/rules/{1002,type-57}.json`, loaded by
`packages/core/src/load/builtInRules.ts` through `parseRule` and resolved into one `ScaleCalculation`
per scale by `packages/core/src/load/resolve.ts`; the DTO/validator in
`packages/core/src/schema/` and the label policies in `packages/core/src/format/policies.ts`; the
safe expression language and numeric inversion in `packages/core/src/expr/`
(`parse.ts`, `evaluate.ts`, `invert.ts`);
the mapping and the single tick generator in `packages/core/src/engine/{scaleMapping,scaleCalculation}.ts`;
the `calc`-backed reader in `packages/core/src/engine/scaleReader.ts`; label formatters in
`packages/core/src/engine/{gradations,logarithmic}.ts`; millimetre layout in
`packages/renderer/src/layout/index.ts` and the disc rings in
`packages/renderer/src/layout/disc.ts`; themes in `packages/renderer/src/themes.ts`; framework-free
SVG drawing in `packages/renderer/src/draw/` (`renderSection`, `renderRuleToSVG`,
`renderRuleSheetToSVG`, `renderDiscToSVG` / `renderDiscSheetToSVG`, co-angle and radical geometry); the 1:1 print document in
`packages/simulator/src/utils/print.ts`; the external-rule import in
`packages/simulator/src/utils/importRule.ts` and
`packages/simulator/src/components/ImportRuleDialog.vue`; the linear and circular
rendering and interaction in `packages/simulator/src/components/*.vue`
(`SlideRule.vue` / `CircularRule.vue`, `CursorReadings.vue` /
`CircularReadings.vue`) and `App.vue`; the visual designer in
`packages/simulator/src/designer/` (`model.ts`, `draft.ts`, `errors.ts`,
`templates.ts`, `store.ts`, `DesignerView.vue`, `DesignerPreview.vue`,
`panels/ScaleForm.vue`, `panels/CalcForm.vue`), mounted
from `App.vue`; types in
`packages/core/src/types/scale.ts` and the DTO in `packages/core/src/schema/types.ts`;
the author spec and CLI
in `packages/generator/src/` (`spec.ts`, `build.ts`, `presets.ts`, `cli.ts`).

## Commands

`npm run dev` (preview), `npm run test`, `npm run lint`, `npm run build`
(vue-tsc + Vite). The audit sheets are rewritten automatically by `npm test`.

## Session history

`git log --oneline` is authoritative for the commit sequence; this note does not
embed a snapshot that would drift out of date.

The multi-package `docs` notes are committed with each refactor. The JSON work
(1d) ends at `ec5fc3b`, the generator (phase 2) at `1c9fb99`, the expression DSL
(phase 3) at `c185631`, the print export (phase 4) at `d99d7de`, and the visual
designer foundation (phase 5a) at `294cbf7`, its per-scale field form (phase 5b)
at `fa5224c`, its calculation editor (phase 5c) at `b771efc`, its polish
(phase 5d) at `d0f7f32`, and its circular rendering (phase 5e) at `38e5262`; the
simulator external-rule import (multipackage spec §5E) followed on the
`simulator-import-json` branch; the designer component tests followed on the
`designer-component-tests` branch (`751fc82` infrastructure, `87cd0e2`
dialog/preview, `d97d756` shell); the Playwright E2E suite followed on the
`playwright-e2e` branch (`efa076d` infrastructure, `87f7ad7` specs, `962f0ea`
assertions); the circular rule interaction followed on the `circular-interaction`
branch (`cc5d69e` design/plan, `1306ab5` renderer rotation, `b6bbdab` store
rotor, `3484caf` import acceptance, `63dd546` circular view, `fd2186f` fix,
`0322b9e` E2E), and this handoff is revised by their documentation commit.
