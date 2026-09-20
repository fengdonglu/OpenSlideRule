# Project rules

Guidance for anyone (human or agent) working in this repository.

## Language
- **Commit messages are written in English** (Conventional Commits).
- **All documentation is written in English.** Every English document has a
  Simplified-Chinese mirror beside it with a `-cn` suffix; the English file is
  canonical. When a fact changes, update the English file first, then the `-cn`
  file. The user guide lives in `docs/guide/` (for app users); developer docs
  live in `docs/dev/`; the physical rule in `docs/domain/`.
- **Source comments are written in English.**
- **User-visible text always goes through i18n** (`packages/simulator/src/i18n/`). Never hardcode a
  string in a component: `zh-CN.ts` is the schema source and a missing key fails
  `vue-tsc`.

## Code
- Vue 3 + TypeScript (strict) + Vite + Pinia; styling with scoped CSS.
- Four packages: `packages/core` (framework-free model, engine and JSON rule
  loader; no UI or DOM), `packages/renderer` (framework-free millimetre layout and
  SVG drawing; no Vue), `packages/simulator` (the Vue app, including the visual
  rule designer) and `packages/generator` (the author spec / `buildRule` library
  that emits validated `RuleDefinition` JSON, plus the `slide-rule-gen` CLI; no
  UI, no renderer). The generator's **library** (`buildRule`, `RuleSpec`, the
  presets) is browser-safe and is used by the simulator's designer; only its
  **CLI** (`bin.ts`) is Node-only.
- Geometry uses **millimetres**; `pxPerMm` is the only zoom entry point.
- Measured rule data lives in `packages/core/rules/1002.json` and `type-57.json`
  (`schemaVersion: 1`). The DTO, validator and loader live in
  `packages/core/src/{schema,load}`; the runtime types and `PhysicalSpec` live in
  `packages/core/src/types/`. Keep the docs in sync.

## Before committing
```
npm run lint    # ESLint
npm run test    # Vitest
npm run build   # vue-tsc + Vite
```
All three must pass. Do not commit unless asked.

## Sources of truth
Only two: the prototype photographs under docs/domain/prototype/ and Wikipedia.
Every fact must be traceable to one of them; unclear facts are marked as not
yet established rather than guessed. See [docs/README.md](docs/README.md).

## Documentation map
See [docs/README.md](docs/README.md) for the standard and the index.
- `docs/guide/` - the user guide, for people using the app
- `docs/domain/` - the physical rule (no software)
- `docs/dev/` - how it is built
- `docs/roadmap.md` - plans and the release checklist
- `docs/glossary.md` - terminology
