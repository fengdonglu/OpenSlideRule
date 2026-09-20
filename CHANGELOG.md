# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-09-20

A documentation and tooling patch over 0.1.0.

### Added

- A user-guide page,
  [Designer calculations, by example](docs/guide/designer-calculations.md), with
  a worked example and a figure for every mapping kind (`log`, folded `log`,
  `linear`, `fn`, `valueFn`, `expr`), plus intervals and steps, labels, marks and
  notes, and shared calculations - and its Simplified-Chinese mirror.

### Changed

- The static document title and description now read `OpenSlideRule`; the page
  title had still been the model name until the app loaded.
- CI and Pages use the current Node 24 majors of the GitHub Actions:
  `checkout@v7`, `setup-node@v7`, `cache@v6`, `upload-artifact@v7`,
  `configure-pages@v6`, `upload-pages-artifact@v5` and `deploy-pages@v5`.
- The Simplified-Chinese user-guide index and its cross-links now point at the
  Chinese mirrors rather than the English pages.

## [0.1.0] - 2026-09-20

The first public release: a web simulator and visual authoring tool for slide
rules. It ships with the Chinese 1002 vector log-log double-sided rule and the
Type 57 pocket rule, and can load or design any rule described by a
`RuleDefinition`. Everything below is new in this release.

### Added

**Simulator**

- The Chinese 1002 vector log-log double-sided rule and the Type 57 pocket rule,
  rendered from measured data (Vue 3 + TypeScript + Vite).
- A millimetre layout model: the exact 6:1 face, the 4/6/4 rows, grooves, the
  name gutter and the right-hand readings panel.
- Every scale graduated from its measured interval table: C/D, A/B, K, CF/DF,
  CI/DI/CIF, lg, ln1/2/3 and their reciprocals, sin2/cos2, tg2/tg3, the Type 57
  S / ST / T, and the hyperbolic H2 / H'2 / H3 / sh2 / sh3 / th2 scales.
- Both faces on one screen, sharing the slide and the cursors: drag the slide,
  place and move several cursors, hover for a read-out of every scale under the
  pointer, and edit a reading to move its cursor.
- Precise slide positioning: type the value a movable scale should read and
  press Enter to move the slide there, leaving the cursor where it is.
- Circular (disc) rules, including the rotor, radial multi-cursors and live
  readings; a two-faced circular rule opens dual with the discs stacked.
- Zoom from 1X to 6X, six themes (which also restyle the interface), PNG / SVG /
  Markdown export, 1:1 print / PDF, zh-CN / en-US, and a first-run tutorial.
- Loading an external `RuleDefinition` JSON into the simulator by file picker or
  drag-drop.

**Rule designer**

- A visual `RuleSpec` editor with a live preview through the same renderer,
  per-scale and calculation editing, a validation status bar, a localStorage
  draft, starter templates, and linear and circular rule forms.

**Rule format and tooling**

- `packages/generator`: the author `RuleSpec` model, the `buildRule` library and
  the `slide-rule-gen` CLI, with a per-scale 1002 `C` golden test.
- An expression DSL: the opt-in `map.kind: "expr"`, with a safe whitelist
  evaluator and analytic / numeric inversion.
- Canonical `schemaVersion: 1` JSON rule data (`packages/core/rules/*.json`),
  validated and resolved by `parseRule`.

**Project**

- Split into npm workspaces: `packages/core` (model and engine),
  `packages/renderer` (millimetre layout and SVG), `packages/simulator` (the Vue
  app) and `packages/generator` (the authoring library and CLI).
- Vitest unit and component tests and a Playwright E2E suite (simulator,
  designer, rule import, circular), both run in CI, with ESLint and Prettier.

[0.1.1]: https://github.com/fengdonglu/OpenSlideRule/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/fengdonglu/OpenSlideRule/releases/tag/v0.1.0
