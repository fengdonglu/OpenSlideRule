# Roadmap

The single place for "what is next". Includes the release checklist.

---

## 1. What this is

A web simulator of the **Chinese 1002 vector log-log double-sided slide rule**
(矢双面计算尺), built with Vue 3 + TypeScript.

- **Why**: the physical rule is a beautiful analogue computer; a faithful
  simulator makes it exploreable, teachable and preservable.
- **For whom**: people who own or study slide rules, students learning
  logarithms, and collectors who want to see the rule without handling it.
- **Not**: an automatic calculator, and not a quiz/exam system.

Scope: render the rule faithfully, let the user operate it (slide, cursor,
readings, both faces), and keep the scale data honest - everything either read
from the physical rule or derived from a documented formula.

---

## 2. Scope

### In scope
- Faithful rendering of the 1002 (6:1 face, 4/6/4 rows, real graduations)
- Both faces, single or side-by-side display
- Slide drag, multiple cursors (add / drag / delete), hover read-out, cursor readings
- Zoom and pan
- Themes, export (PNG / SVG / Markdown / Print), i18n (zh-CN / en-US)
- Data-driven models: each rule is a canonical `RuleDefinition` JSON
  (`packages/core/rules/*.json`, `schemaVersion: 1`) so further rules can be added

### Out of scope
- Automatic arithmetic ("give me 2x3") - the point is to use the rule
- Accounts, cloud sync, server-side anything
- A quiz/exam engine

---

## 3. Milestones

### Next up: multi-hairline cursors

**The first planned feature.** A cursor's normal form is **several hairlines**
(发线) - the Type 57's cursor has three - but the app models exactly one. This
is the biggest known gap between the model and the physical instrument, so it
leads the roadmap. It touches, in order:

1. a rule-level cursor spec: hairline count and their offsets, per face;
2. `RuleCursor` holding one position per line (a rigid group that moves together);
3. the renderer drawing every line of a cursor;
4. the reader and the readings panel reporting a value **per hairline**;
5. a designer control to author the hairlines;
6. schema / validator / generator fields to carry the spec.

No shipped model exercises it yet, so the feature also wants a multi-line model
to prove it.

| Milestone | Content | Status |
|---|---|---|
| v0.1.0 | the 1002 renders and operates correctly; docs, tests and CI in place; publishable | mostly done, see the checklist |
| v0.2.0 | multiple cursors (done); the cursor's auxiliary lines and the right reference panel art | in progress |
| v0.3.0 | at least one further model (Type 57 pocket rule) | done |
| generator | the rule generator (`packages/generator`): library + CLI + golden test | done |
| expression DSL | opt-in `map.kind: "expr"` (safe evaluator + analytical / numeric inversion) | done |
| print export | 1:1 mm static SVG (`renderRuleSheetToSVG`) + Print / PDF from the app | done |
| visual designer | in-app `RuleSpec` editor: 5a shell / preview, 5b per-scale fields, 5c calculation editor, 5d draft / templates, 5e circular rendering | done |
| rule import | load an external `RuleDefinition` JSON (local file, file picker / drag-drop) into the simulator | done |
| circular interaction | load, rotate (rotor) and read a circular rule: disc view, radial cursors, circular readings | done |
| e2e suite | Playwright specs for the simulator, designer, rule import and circular interaction (system Edge locally, Chromium in CI, `npm run e2e`) | done |

The **rule generator** is done. `packages/generator` adds an authoring layer with
a one-way dependency on `core`: an author writes a `RuleSpec` (a DTO
superset with rule-level named `calculations` and per-scale `{ ref }`), `buildRule`
inlines the refs and assembles a validated schema-v1 `RuleDefinition`, and the
`slide-rule-gen build <spec.json> -o <out.json>` CLI writes it as JSON. The CLI
exits `0` on success, `1` on a validation failure (every error to stderr) and `2`
on a usage or input/output problem. A per-scale golden test rebuilds the 1002 `C`
calculation through the presets and diffs it against `rules/1002.json`. The
generator shipped (phase 2) as a Node-only, build-time package; since phase 5a its
**library** (`buildRule`, the `RuleSpec` types, the presets) is browser-safe and
is a `simulator -> generator` dependency used by the designer, while only its
**CLI** (`bin.ts`) remains Node-only.

The **expression DSL** adds an opt-in fifth map kind, `map.kind: "expr"`, for a
field-specific formula. `position` (required) is `p = f(x)` and `inverse`
(optional) is `x = g(p)`, both compiled by a safe whitelist evaluator that never
uses `eval`; without `inverse` the loader inverts the forward mapping by bracketed
bisection over the domain. The schema validator samples the forward for finiteness
and strict monotonicity. Built-in rules and their generated JSON are unchanged.
See [dev/expressions.md](dev/expressions.md).

The **print export** builds the current rule as a static 1:1 sheet from the model
(`renderRuleSheetToSVG`), not from the zoomed DOM. The renderer stacks the visible
faces at their real millimetres, and the simulator (`utils/print.ts`) sizes the
browser page to the rule itself (`@page { size: <w>mm <h>mm; margin: 0 }`) before
opening the print dialog from the app's **Print / PDF** action. The 1002 is
304.8 mm (12 in) wide, wider than A4 / Letter, so the user prints at 100% scale
with the custom page size (or larger paper); the export never rescales.

The **visual designer** is a full-screen mode inside the simulator, shipped in
increments. Increment **5a** (tasks 1-5) authors a generator `RuleSpec` in the
browser: it seeds from a built-in or imports a `RuleSpec` / `RuleDefinition`,
validates live through `buildRule` + `parseRule`, previews a linear rule with
`renderRuleSheetToSVG`, edits the rule-level fields (id, name, `form` + `disc`,
`physical`) and the scale tree, and exports both the author spec and the built
`RuleDefinition`. It also adds the rule `form` / `disc` metadata to the schema
(the validator codes `unknownForm` / `invalidDisc` / `unexpectedDisc`), but
**does not render circular rules**. Increment **5b** adds the per-scale field
form (`simulator/src/designer/panels/ScaleForm.vue`): it edits a selected
scale's own fields (id, name, type, orientation, sharedLabels, notes,
numbersBelow, tickEdge) and duplicates it. Increment **5c** adds the calculation
editor (`simulator/src/designer/panels/CalcForm.vue`): it edits the selected
scale's whole `CalculationSpec` (`domain`, every `map` kind including `expr`,
`decades`, the `decreasing` mirror control, `read`, `labelFormat`, `labelLevel`,
the `intervals` with their step / level rows and interval labels, `labels` and
`marks`; a `{ ref }` scale is edited through its named `calculations` entry) and
seeds it from the generator presets. The raw DSL option tokens (map kinds, label
formats) are displayed through `designer.*` i18n. Increment **5d** polishes the
designer: `simulator/src/designer/draft.ts` persists the spec to localStorage
(injected storage; restored once on creation, with a Clear-draft action and a
restored note), `errors.ts` maps the validator's dotted `BuildError` paths onto
form fields so invalid ones are highlighted inline (`.is-error`), and
`templates.ts` seeds a minimal linear or circular starter rule from a template
select. Increment **5e** completes the designer with circular rendering: the
framework-free renderer gains `layout/disc.ts` (`computeDiscLayout`: three equal
bands, one sub-ring per scale) and `draw/disc.ts` (`renderDiscToSVG` /
`renderDiscSheetToSVG`: concentric rings of radial graduations at `2π·p` that
wrap, tangential numerals, the limit circle and the pivot), and the designer
preview and the 1:1 print path use the disc sheet for `form: "circular"` (a
circular draft without a `disc` shows an i18n notice instead). The interactive
rotor and cursor were added later (see circular interaction below); spiral
scales remain. The phase-5 visual designer is now complete. See
[dev/architecture.md](dev/architecture.md).

The **external rule import** is done (multipackage spec §5E): the simulator can
load a `RuleDefinition` JSON produced by the generator or exported from the
designer. A toolbar **Load rule JSON** button and drag-and-drop onto the
simulator view feed the text to `utils/importRule.ts` (`importRuleText` -> `parseRule`);
the store holds the rule in its `imported` slot and selects it as the reserved
`imported` model. Malformed JSON or a validation error opens
`ImportRuleDialog.vue` and leaves the current model untouched. The import is
local and in-memory only; loading from a URL and persisting an imported rule are
deferred.

The **circular interaction** is done: the simulator imports a `form: "circular"`
rule (the refusal is gone), and `App.vue` branches on `store.isCircular` to
`CircularRule.vue` + `CircularReadings.vue`. The store's `discOffset` rotates the
disc's `middle` band as the rotor through `renderDiscToSVG`'s `rotationTurns`,
while `upper` / `lower` stay fixed; the cursors become turn-fraction angles with
radial lines, drag-to-rotate, click-to-add and drag-to-move. The readings panel
lists every scale at each cursor through the linear panel's `readScaleValue` /
`positionForValue` engine and inverts a typed value to move its cursor. The
designer preview and the 1:1 print stay at zero rotation (rotation is interaction
state, not rule data).

The **Playwright E2E suite** is the top layer of the test pyramid: repo-root
`playwright.config.ts` and `e2e/{simulator,designer,import,circular}.spec.ts` (5
tests) drive the app through the system Microsoft Edge (`channel: 'msedge'`, so
no browser is downloaded locally), pin `testIdAttribute: 'data-test'` and start
(or reuse) the dev server via Playwright's `webServer`. `npm run e2e` runs them;
they are excluded from `npm test` but run in the CI `e2e` job (Chromium on the
runner). `e2e/tsconfig.json` type-checks the specs via `typecheck:e2e`, which is
part of `npm run build`.

### Deferred ideas

- **Spiral (log-log) scales** on circular rules (see the circular-interaction
  section above).
- **Precomputed tick positions in the rule definition**: storing every generated
  tick's `position` in `RuleDefinition` so the renderer reads it instead of
  recomputing. Deferred: it duplicates derived data in the measured canonical
  files and adds roughly 0.4-0.5 MB to `1002.json` for a modest CPU saving (the
  SVG node count, not the tick maths, dominates rendering). To revisit after the
  project is published.

---

## 4. Release checklist (v0.1.0)

Everything here must be done before the repository is announced.

### Repository
- [x] `/README.md` - exists; screenshots in `docs/assets/` (the simulator and
      the designer's circular preview)
- [x] `/LICENSE` - GPL-3.0, copyright 2025-2026 OpenSlideRule contributors
- [x] `/CHANGELOG.md` - Keep a Changelog; a `0.1.0` release entry
- [x] `.gitignore` covers `dist/`, `node_modules/`, `.claude/`, `.superpowers/`

### Quality
- [x] ESLint + Prettier configured and clean
- [x] Vitest running (layout maths)
- [x] Unit tests for the graduation engine (`scaleCalculation`, `scaleMapping`,
      `scaleReader`) - the maths and the cursor round-trip are covered
- [x] Component tests (`@vue/test-utils`) - `components/{CircularRule,ImportRuleDialog}.test.ts` and the designer components (jsdom, `mountWithPlugins`)
- [x] E2E tests (Playwright) - `playwright.config.ts` + `e2e/{simulator,designer,import,circular}.spec.ts` (5 tests, system Edge, `npm run e2e`; not part of `npm test`)
- [x] CI workflow (lint -> test -> build) plus an `e2e` job (Chromium) and `typecheck:e2e`

### Deployment
- [x] Hosting: GitHub Pages; Vite uses `base: './'` so the build is sub-path safe
- [x] GitHub Pages deploy workflow (`.github/workflows/deploy.yml`), CI unchanged

### Product
- [x] Aspect ratio, graduations, folded scales, both faces, cursor, hover
- [x] Multiple cursors: add by clicking, drag with inline read-out, delete, and
      per-cursor editable readings (`positionForValue`)
- [x] i18n (zh-CN / en-US) with environment detection
- [x] Themes (6), export (PNG / SVG / Markdown / Print), tutorial overlay
- [ ] Cursor's three lines (main + auxiliary + HP) and the cursor's own scale
- [ ] The right-hand reference panel art (kW/hp table, maker mark)
- [x] Every scale is graduated, `H3` and `sh2` / `sh3` / `th2` included.
      Their ranges and label steps were measured from the prototype photographs
      (`domain/model-1002.md` 3.6-3.8)
- [x] Type 57 pocket rule implemented (single-faced, 6in x 1in, 2/4/3 rows,
      S / ST / T scales; `domain/model-57.md`). Scale list, colours, printed
      numbers and reference notes verified against sale photographs of the rule;
      only the dimensions remain maintainer-supplied
- [ ] Mobile: touch panning is disabled by `touch-action: none`; a 6:1 face is
      very short in portrait
- [ ] Keyboard operation and ARIA attributes

---

## 5. Backlog (post v0.1.0)

- More models: other common Chinese rules (the Type 57 is implemented)
- External-rule loading beyond a local file: a URL / paste box (needs a
  server / CORS story) and persisting or re-exporting an imported rule
- Pluggable scale system and user-defined scales
- Practice mode (exercises with marking)
- Performance pass at high zoom and on low-end devices
- Further generator work: the full-rule golden (`rules/1002.json` in full), more
  calculation presets, use the expression kind in presets, and a watch mode.

---

## 6. Working agreement

- Commits: Conventional Commits, **English**
- Docs: English, updated in the same commit as the code
- Before every commit: `npm run lint && npm test && npm run build`

---

## 7. Decisions for the maintainer

Open points from the unified-calculation refactor. None blocks the release; each
needs a human look - mostly at a photograph - or a preference.

### 7.1 Ratify the deliberate drawn-output changes

The refactor makes every scale draw from its measured `ScaleCalculation`. Four
outputs changed deliberately; confirm them against `docs/domain/prototype/`:

- **CIF tick levels** now follow the measured `CF_GRADUATIONS` grid (the old
  generator's automatic labelling had overridden them). Drawn: `L1 20 -> 22`,
  `L2 87 -> 75`, `L3 229 -> 239`, at the same 336 ticks. Confirm CIF's level
  pattern really matches CF's.
- **H'2's leftmost tick** is now the spec domain end `0.995`; the legacy
  `sech(0.1) = 0.9950207` artifact tick is gone (about 2.6 px).
- **Trigonometric `Tick.value`** is now the reading (the angle). `angle` is
  unchanged, so the drawing and the red co-angle are unaffected.
- **sh2 / sh3 / th2 `Tick.value`** is now the argument `x` (what the cursor
  already returned), not `sinh(x)` / `tanh(x)`.

### 7.2 Repository hygiene

- `.gitattributes` (`* text=auto eol=lf`) was added so the lint gate behaves the
  same on every OS. Keep it, or revert to the previous mixed line endings.

### 7.3 Unresolved measurements (need a clearer photograph or maintainer input)

- `th2`: the segment-dependent long-tick pattern, and the provisional
  `[1.5, 3)` step (`0.05`).
- `sin2 [80, 90]`: the finest resolvable step.
- `sh3`: the level-1 class.
- Type 57 tables: re-verify under the "a printed number is not always the
  longest tick" finding.

### 7.4 Preferences

- `CustomMapping` is kept as the model's extension point but is currently
  unconstructed: keep or remove.
- Tighten lint to `eslint . --max-warnings 0`.
- `docs/dev/data-model.md` H2 / H'2 rows still say "even x steps";
  confirm they should read "even value V steps".

---

*Version: v3.8 (1:1 print / PDF export; expression DSL; JSON rule source of truth; `packages/generator` implemented; visual designer complete with circular rendering; local external-rule import; interactive circular rules - rotor, radial cursors and readouts)*
