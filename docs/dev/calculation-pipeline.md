# Calculation pipeline (one page)

How a scale goes from the prototype photograph to a drawn graduation and a
cursor reading. Two layers of metadata plus one generator. See
[architecture.md](architecture.md).

## Overview

- **Structure metadata** (`SlideRuleStructure`): the rule itself - millimetre
  size, row counts, and the list/order of scales per section.
- **Calculation metadata** (`ScaleCalculation`, one per scale): the measured
  interval grid, the domain->position mapping, the printed numbers and marks.
- **One generator** (`generateScaledTicks`): turns a `ScaleCalculation` into
  `Tick[]`; the renderer draws them and the reader inverts the same mapping.

Both metadata layers come from the canonical `RuleDefinition` JSON
(`packages/core/rules/*.json`), validated and resolved by `parseRule`.

## Pipeline

```
  PROTOTYPE PHOTOS                  CANONICAL RULE JSON               RUNTIME PER-SCALE CALC
  docs/domain/prototype/            packages/core/rules/              packages/core/src/load/
                                    {1002,type-57}.json               resolve.ts
  ┌───────────────┐  tools/measure  ┌───────────────────────┐  parse  ┌───────────────────────┐
  │ 1002-front.jpg│ ──────────────► │ RuleDefinition        │ ──────► │ ScaleCalculation      │
  │ 1002-back.jpg │  crop / strip   │  physical             │  calc   │  domain               │
  │ 57-front.jpg  │  rowscan        │  faces.*.*.scale      │         │  map: Mapping         │
  └───────────────┘  fitmap / ...   └───────────────────────┘         │  intervals (step@L)   │
                                                                      │  labels / marks       │
  STRUCTURE: load/builtInRules() -> MODEL_1002 / MODEL_57             │  read/unread, decades │
                                                                      └───────────┬───────────┘
  ┌───────────────────────────────┐                                                │
  │ SlideRuleStructure            │   PhysicalSpec: mm size, 4/6/4 rows,          │ generateScaledTicks
  │   physical: PhysicalSpec      │   groove/margin ratios, gutters               │ (engine/scaleCalculation.ts)
  │   front/back: {upper,middle,  │                                                ▼
  │     lower}: ScaleDefinition[] │  each ScaleDefinition carries layout flags   ┌───────────────────────┐
  │     (+ .calc)                 │  (section, isMovable, numbersBelow,         │ Tick[]                │
  └───────────────┬───────────────┘   tickEdge, sharedLabels, notes, color)     │  position (C/D dec.)  │
                  │                                                              │  value / level 1-3    │
                  │ renderer: computeFaceLayout(spec, widthPx)                   │  label? / angle?      │
                  ▼                                                              └───────┬─────┬─────────┘
        ┌───────────────────┐                                                          │     │
        │ FaceLayout        │                                                          │     │
        │  mm -> px         │                                                          │     │
        │  pxPerMm (zoom)   │                                                          │     │
        └─────────┬─────────┘                                                          │     │
                  └───────────────┬──────────────────────────────────────────────────┘     │
                                  ▼                                                        │
                        ┌───────────────────┐                              ┌───────────────▼────────┐
                        │ renderSection     │                              │ scaleReader.ts         │
                        │  draws lines+text │                              │  toDomain + printed    │
                        │  by level (SVG)   │                              │  range -> cursor value │
                        └───────────────────┘                              └────────────────────────┘
```

## The draw path (steps)

`generateScaledTicks(calc)` (`packages/core/src/engine/scaleCalculation.ts:19`):

1. For each `interval`, lay the ticks **finest step first**; a coarser step
   re-levels the ticks it coincides with (so `0.5` is drawn longer than `0.1`).
2. Repeat the intervals over `decades` (K = 3, A/B = 2) at `10^d` scaling.
3. Add the two `domain` ends as level-1 ticks.
4. Place `labels` (READ values): `toPosition(unread(value))`, text via
   `labelFormat`; `labelLevel` decides whether a label forces level 1 or keeps
   its measured level (`sh2` / `sh3` / `th2`).
5. Add `marks` (pi, sqrt(10), the `∞` asymptote).
6. If `decreasing`, mirror `position = 1 - position`; sort by position.

Positions come from `toPosition` (`packages/core/src/engine/scaleMapping.ts:47`); the entry
point is `getScaleTicks(scale) = scale.calc ? generateScaledTicks(scale.calc) : []`
(`packages/core/src/engine/scaleFunctions.ts:12`).

## The read path

`packages/core/src/engine/scaleReader.ts` uses the **same** `calc`: `toDomain` inverts the
mapping, clamped by the actually printed range (domain ends plus labels and
marks, `printedPositionRange` / `printedDomainRange`), so an over-fold label
(CIF `3.3`) and the th2 `∞` still read. Because drawing and reading share the
mapping, they cannot drift.

## The audit sheet

`docs/dev/graduations.md` (+ `-cn`) is **generated**, not an input:
`packages/core/src/engine/graduationReport.test.ts` reads every `calc`, calls `getScaleTicks`,
and writes the resolved segments, `step@level`, printed numbers, row flags and
position range. It is rewritten on every `npm test`, so it cannot disagree with
the code.
