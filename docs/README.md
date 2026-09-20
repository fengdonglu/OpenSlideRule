# Documentation

This project is small, so the documentation is small. Four rules keep it useful:

1. **English canonical, Chinese mirrored.** Documents are written in English; a
   Simplified-Chinese mirror sits beside every English file as `<name>-cn.md`
   (e.g. `architecture-cn.md`). English is canonical - change it first, then the
   mirror.
2. **Update the docs in the same commit as the code.** A change that alters
   behaviour, data or conventions must update the matching document.
3. **Write what is true now, briefly.** No speculative designs, no long
   methodology, no duplicated text between documents - link instead.
4. **No personal wording.** Documents are impersonal (the *maintainer*, the
   *project*), because they are published.

---

## Structure

```
/README.md              project intro for users, screenshots, quick start
/README-cn.md           the same, Simplified-Chinese translation
/CONTRIBUTING.md        how to contribute (branches, commits, code, tests)
/CODE_OF_CONDUCT.md     community behaviour
/SECURITY.md            vulnerability reporting
/AGENTS.md              working rules for agents and humans
/LICENSE                GPL-3.0 licence
/CHANGELOG.md           release history (Keep a Changelog)
/packages/              workspace packages (core, renderer, simulator and generator)

docs/
├─ README.md            this index and the documentation standard
├─ README-cn.md         the same, Simplified-Chinese translation
├─ glossary.md          terminology (one table per area)
├─ roadmap.md           vision, scope, milestones and the release checklist
├─ handoff.md           current state / where to continue (working note)
├─ guide/               the user guide - how to use the app (no internals)
│   ├─ getting-started.md    run it, the layout, a first walkthrough
│   ├─ simulator.md          models, faces, slide, cursors, readings, circular
│   ├─ designer.md           build and preview a rule, export it
│   ├─ import-export.md      load a rule JSON; export PNG/SVG/Markdown/print
│   └─ reading-scales.md     how reading works in the app
├─ domain/              the physical rule - never mentions software
│   ├─ slide-rule-101.md    how slide rules work (general)
│   ├─ model-1002.md        1002 dimensions, scales, conventions, references
│   └─ model-57.md          Type 57 pocket rule (photograph verified)
└─ dev/                 how the software is built
    ├─ architecture.md     modules, data flow, tooling
    ├─ data-model.md       the JSON rule format, types and graduation algorithms
    ├─ rendering.md        millimetre layout, zoom, cursor, hover
    ├─ calculation-pipeline.md  one-page draw/read pipeline (metadata -> ticks -> SVG)
    ├─ expressions.md      safe expression language for `map.kind: "expr"`
    ├─ measurement.md      how graduations are measured from the photographs
    └─ graduations.md      per-scale drawing model (generated; audit sheet)

Every file above that is a document has a `-cn.md` mirror beside it.
```

### Where does a new fact go?

| Kind of fact | Document |
|---|---|
| How to use a feature | `guide/` (the matching page) |
| Measurement or scale meaning of the physical rule | `domain/model-1002.md` / `domain/model-57.md` |
| General slide-rule theory | `domain/slide-rule-101.md` |
| Type, interface, graduation formula, JSON rule schema | `dev/data-model.md` |
| Expression grammar, functions, inversion | `dev/expressions.md` |
| Per-scale segments, steps, levels, printed numbers | `dev/graduations.md` (generated) |
| How a graduation was measured from the photographs | `dev/measurement.md` |
| Layout, drawing, interaction rules | `dev/rendering.md` |
| Module boundaries, state, i18n, testing | `dev/architecture.md` |
| What is next, what is missing | `roadmap.md` |
| Current state / where to continue | `handoff.md` (working note) |
| A term | `glossary.md` |

### Single sources of truth
- Physical dimensions -> `domain/model-1002.md` and `domain/model-57.md`
  (mirrored by `PhysicalSpec` in `packages/core/src/types/scale.ts`)
- Measured rule data -> `packages/core/rules/1002.json` and `type-57.json`
  (canonical `schemaVersion: 1`; validated and resolved by `parseRule`)
- Code interfaces -> `dev/data-model.md` (mirrored by `packages/core/src/schema/`
  and `packages/core/src/types/`)
- Outstanding work -> `roadmap.md`

---

## Sources of truth

This project has exactly **two** authoritative sources. Everything else in the
repository - measurements, scale definitions, data and documentation - must be
derived from them and must not contradict them.

1. **The prototype photographs** of the physical rule:
   [`domain/prototype/1002-front.jpg`](domain/prototype/1002-front.jpg) and
   [`domain/prototype/1002-back.jpg`](domain/prototype/1002-back.jpg).
   They settle the physical facts: face order, row order, scale names, printed
   values, graduation shapes and the right-hand reference notes.
2. **Wikipedia**:
   [Slide rule](https://en.wikipedia.org/wiki/Slide_rule) and
   [Slide rule scale](https://en.wikipedia.org/wiki/Slide_rule_scale).
   They settle the general conventions: what each scale type means, how it is
   graduated, and how it is read against the other scales.

Rules that follow from this:

- A statement in the documentation or in the data should be traceable to one of
  these two sources.
- Where a photograph is unclear, the fact must be marked **not yet established**
  rather than guessed silently. Guesses, if unavoidable, are labelled as such.
- Where the two sources appear to disagree, say so explicitly in
  `domain/model-1002.md` instead of picking one silently.
- Nothing else is authoritative - not this documentation, not the code, not any
  third-party page.

The measured rule data derived from the photographs lives in
`packages/core/rules/1002.json` and `type-57.json`. Those files are the single
source of measured rule data; every runtime structure is loaded and validated
from them by `parseRule` / `builtInRules`.

**The Type 57.** The maintainer's own front-face photograph is stored at
[`domain/prototype/57-front.jpg`](domain/prototype/57-front.jpg) and was used to
measure the scale list, colours, printed numbers, reference notes and the
graduations in [domain/model-57.md](domain/model-57.md) section 3.7. Only its
**dimensions** (6in x 1in, 2/4/3 rows) come from the maintainer's fact sheet
rather than a photograph measurement; the photo itself is tilted about 0.5 deg
and was flattened before measuring.

---

*Last revised: 2026-09 - a user-facing `guide/`, developer docs under `dev/`,
and a complete Simplified-Chinese mirror of every document*
