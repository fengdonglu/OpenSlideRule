# Contributing

Thanks for your interest. This is a small project; keep changes focused.

## Development setup

- Node >= 20.19.4
- `npm ci`
- `npm run dev` (Vite dev server)

## Before every commit

```bash
npm run lint     # ESLint
npm run test     # Vitest
npm run build    # vue-tsc + Vite
```

All three must pass.

## Branches and commits

- Branches: `feat/*`, `fix/*`, `docs/*`, `chore/*`, `refactor/*`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/),
  **written in English**
  ```
  feat(scale): add the log-log segments for ln1/ln2/ln3

  - position ~ log10(ln x) so the values line up with C/D
  - segments: 1.01-1.10, 1.10-2.5, 2.5-1000
  ```
- Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`

## Pull requests

1. Fork, branch, implement with tests
2. Run the three commands above
3. Open the PR with a short description and a linked issue
4. Address review comments

## Code conventions

- **TypeScript strict**; no `any`
- Vue 3 `<script setup lang="ts">`, scoped CSS
- **All comments in English**
- **All user-visible text through i18n** (`packages/simulator/src/i18n/`). `zh-CN.ts` is the schema
  source: a missing key fails `vue-tsc`
- Geometry is in millimetres; `pxPerMm` is the only zoom entry point
- Measured rule data lives in `packages/core/rules/1002.json` and `type-57.json`
  (`physical` plus the scales); keep
  [docs/domain/model-1002.md](docs/domain/model-1002.md) in sync

## Documentation

- **English only** - see [docs/README.md](docs/README.md)
- Update the matching document in the same commit as the code
- New facts: physical -> `docs/domain/`, implementation -> `docs/dev/`,
  plans -> `docs/roadmap.md`, terms -> `docs/glossary.md`

## Tests

- Pure maths and layout belong in Vitest unit tests
- New features ship with tests; bug fixes ship with a regression test

## Licence

Contributions are accepted under the project licence (GPL-3.0).
