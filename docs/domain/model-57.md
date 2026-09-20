# Chinese Type 57 Pocket Slide Rule - Physical Specifications
*Physical Specifications of the Chinese Type 57 (五七型) Pocket Slide Rule*

This document describes the **physical rule** only; it is independent of the
software implementation.

> **Source.** The maintainer's own photograph of the front face is stored in the
> repository at [`prototype/57-front.jpg`](prototype/57-front.jpg) (3560x810).
> The scale list, row order, colours, printed numbers, reference notes **and the
> graduations in section 3.7** were measured from it (the photo is tilted about
> 0.5 deg; it was flattened by a vertical shear before measuring, and tick
> positions and lengths were read column by column). The **dimensions**
> (6in x 1in, 2/4/3 rows, half the 1002's gutters) are the maintainer's fact
> sheet, **confirmed** on 2026-09-17 (see the checklist in section 0). Scale
> meanings follow the standard conventions on Wikipedia
> ([Slide rule scale](https://en.wikipedia.org/wiki/Slide_rule_scale)).

---

## 0. Maintainer checklist

Everything outside this section is measured from the prototype photograph
[`prototype/57-front.jpg`](prototype/57-front.jpg).

### 0.1 Settled (confirmed by the maintainer, 2026-09-17)

| Item | Outcome |
|---|---|
| **Face size and gutters** | Confirmed: 152.4 x 25.4 mm (6in x 1in) with the 1002's gutters halved - the fact sheet stands, no measurement needed |
| **Groove and margin ratios** | Confirmed: reusing the 1002's 0.7 / 0.4 row ratios is correct |
| **The angle glyph** | Confirmed: the three slide trig notes are prefixed by `∠` (the angle symbol), so `∠sin cos`, `∠arc`, `∠tg ctg` stand |
| **The 1002's `lg` row** | Confirmed: it also prints its numbers **below** the graduations, so the 1002 data now sets `numbersBelow` on `lg` (like the 57's `L`) |
| **The Type 57 back face** | Decision: **not rendered**. The model is single-faced in the software; the 0-12 cm measure, the formula tables and the maker mark are documented only |
| **Third-party photographs** | Removed from the references on 2026-09-17; the prototype photograph now covers every reading they were used for |

### 0.2 Still open (recorded, to be confirmed later)

| # | Item | What the software does today | What would close it |
|---|---|---|---|
| 1 | **Boundary tick levels** | `C` / `D` `1.5` and the `K` `[4,5)` boundary are level 1, assigned from the surrounding pattern | A sharper macro of `C` / `D` around `1.5` and of `K` around `4` |
| 2 | **`S` finest steps** | `[5.74,10)` is 1/6 deg and `[15,20)` is 1/4 deg, inferred (the `S` baseline overlaps the `A` row and a red pen mark) | A sharper macro of the `S` row's left half |

---

## 1. Basic information

- **Formal name**: Type 57 pocket slide rule (五七型便携计算尺)
- **Short name**: Type 57
- **Maker**: 上海计算尺厂 (Shanghai Slide Rule Factory)
- **Model**: 57
- **Type**: single-faced linear pocket slide rule
- **Form**: pocket strip, supplied in a green steel case with a 12-page manual
  (学生计算尺说明书)

---

## 2. Physical structure

### 2.1 Three-part structure
The 57 uses the same three-part construction as the 1002:

```
+-----------------------------------------------------+
|                  Upper fixed scale                  |
+-----------------------------------------------------+
|                  Upper groove (slot)                |
+-----------------------------------------------------+
|                  Slide (movable middle part)        |
+-----------------------------------------------------+
|                  Lower groove (slot)                |
+-----------------------------------------------------+
|                  Lower fixed scale                  |
+-----------------------------------------------------+
```

### 2.2 One face
The 57 is **single-faced**: the scale list below is the whole rule and the
reverse side carries no scales. The software therefore offers no back face and
no dual-face view for this model.

### 2.3 Dimensions and proportions
The face is **stated as half the 1002 in both directions** (6in x 1in), which
keeps the same 6 : 1 aspect ratio. The gutters are scaled by the same factor.

| Item | Value | Notes |
|---|---|---|
| Face size | 152.4 x 25.4 mm (6in x 1in) | **supplied**, half of the 1002 |
| Aspect ratio | exactly **6 : 1** | **supplied**, unchanged |
| Rows per face | 9 | read from the photographs |
| Row height | ~2.268 mm | `25.4 / (9 + 2*0.7 + 2*0.4)` |
| Groove (upper / lower) | 0.7 x row height | 1002 convention, not measured |
| Top / bottom margin | 0.4 x row height | 1002 convention, not measured |
| Left name gutter | 13.05 mm | 1002's 26.1 mm / 2, **supplied** |
| Right reference panel | 9.85 mm | 1002's 19.7 mm / 2, **supplied** |
| Numeral height | ~1.361 mm | 0.6 x row height |

**Tick area**: `152.4 - 13.05 - 9.85 = 129.5 mm`.

> In code these live in the `physical` field of `packages/core/rules/type-57.json` /
> the `PhysicalSpec` type.

---

## 3. Scales

### 3.1 Count and distribution
Read from the left-hand name column of the rule (top to bottom):

- **Total**: 9 scales
- **Upper**: `K / A`
- **Slide** (top to bottom): `S / ST / T / C`
- **Lower**: `D / DI / L`

The name column is printed in black except `DI`, which is **red**.

### 3.2 Scale semantics and range

| Scale | Type | Meaning | Endpoints |
|---|---|---|---|
| `K` | triple-decade log | cubes / cube roots | 1 .. 1000 |
| `A` | double-decade log | squares / square roots | 1 .. 100 |
| `S` | sine | angles, `position ~ log10(sin)` | 5.74 .. 90 deg (sin 0.1 .. 1) |
| `ST` | small angles | sine, tangent and radians coincide | 0.573 .. 5.74 deg (sin 0.01 .. 0.1) |
| `T` | tangent | angles, `position ~ log10(tan)` | 5.71 .. 45 deg (tan 0.1 .. 1) |
| `C` / `D` | single-decade log | multiplication and division | 1 .. 10 |
| `DI` | reciprocal of D | decreasing (printed red) | 10 .. 1 |
| `L` | common log, linear | reads log10 directly | 0 .. 1 |

The leftmost `S` / `T` ticks are unlabelled on the rule (5.74 and 5.71 are not
round printed values); the first printed numbers are `6` on both.

`S`, `ST` and `T` are read against C/D, so their positions are in **C/D decade
units** (`p = 0` at `C = 1`, `p = 1` at `C = 10`), not normalised over the row:
`S` sits at `log10(sin x) + 1`, `T` at `log10(tan x) + 1` and `ST` at
`log10(sin x) + 2`. Each row is one decade wide, so the three land on 0..1 and do
not overflow. `K` / `A` / `C` / `D` / `DI` / `L` keep their own spans. The shared
rule is recorded in
[model-1002.md section 3.8.1](model-1002.md#381-position-model-cd-decade-units).

### 3.3 Angle and co-angle flank the tick
`S` and `T` also print the **co-angle** `90 - x` in red. The angle number sits
just **left** of the graduation and the co-angle just **right** of it, on the
same line (`6 | 84`, `15 | 75`, `45 | 45`), not on a second line below. This is
the same construction as the 1002's `cos2` / `ctg2` / `ctg3`, which the front
photograph shows the same way (`5.5 | 84.5`, `45 | 45`).

- On the right end the rule prints `90` (black) then `0` (red) on the `S` band,
  and `45` then `45` on the `T` band.
- The red numbers are printed **bare** (no degree sign): `6 84`, etc.
  The 1002's co-angle numbers carry the degree sign, so the format is per-scale
  data (`SharedLabel.format`), not a global rule.

### 3.4 Printed label formats
- `S` and `T`: **bare numbers** - `6 7 8 9 10 15 20 ... 90` (no degree sign),
  because the red co-angle is printed right next to each angle.
- `ST`: **degrees and minutes** - `35'`, `40'`, `50'`, `1°`, `1°30'`, `2°`,
  `3°`, `4°`, `5°`. The `35' / 40' / 50' / 1°30'` readings are direct; the rest
  is the standard continuation of that spacing.
- `K`: plain numbers, **only** `1 2 3 4 5 6 7 8 9 10 20 30 40 50 60 70 80 90
  100 200 ... 900 1000`. There is **no `1.5` and no `15`** (the tick is there,
  the number is not), measured from the prototype.
- `A`: plain numbers, **only** `1 2 3 4 5 10 20 30 40 50 100` per the two
  decades; `6 7 8 9` and `60 70 80 90` are **not** printed, and there is no
  `1.5` / `15`. `π` is marked at 3.1416 (first decade only).
- `C` / `D`: `1 1.5 2 3 4 5 6 7 8 9 10` with `π` at 3.1416.
- `DI`: the same set in descending order (`10 ... 1.5 1`) with the `π` mark.
- `L`: the linear `0 .. 1` row prints `0 .1 .2 .3 .4 .5 .6 .7 .8 .9 1` - the
  leading zero is omitted on the fractions and the ends are bare whole numbers
  (`0` / `1`, not `0.0` / `1.0`). Read at zoom 8-10 from the sharp photograph
  (the `0`, `.1`, `.4`, `.8`, `.9` and the final `1` are all legible). The 1002's
  `lg` row prints the same way.

### 3.5 Reference notes
Each row ends with the function label printed to the right of its graduations,
exactly as on the rule:

| Row | Printed note |
|---|---|
| `K` | `x³` |
| `A` | `x²` |
| `S` | `∠sin cos` (`sin` black, `cos` printed red) |
| `ST` | `∠arc` |
| `T` | `∠tg ctg` (`tg` black, `ctg` printed red) |
| `C` | `x` |
| `D` | `x` |
| `DI` | `1/x` (printed red) |
| `L` | `Lg x` (capital `L`) |

The three slide trigonometric rows are each prefixed by the printed **angle
symbol** `∠`. It was read from the right end of the rule at zoom 16-24 (a
compact angular glyph, not an arrowhead); the earlier "arrow" reading is
superseded.

Notes are printed black except the **reverse-order** functions, which the rule
prints **red**: `cos` on `S`, `ctg` on `T` and `1/x` on `DI`. A note may
therefore carry coloured parts.

In code these are the `notes` field (a plain string is black; a note may be a
list of `{ text, red }` parts) and the red `cos` / `ctg` on the row also
appears as the `sharedLabels` entry of the same row.

### 3.6 Colour
- `DI` is printed **red**: it is decreasing, so the 1002's default rule applies
  unchanged.
- `T` is printed **black**; the red on that row is the `ctg` co-angle. The
  maintainer's original fact sheet said "T (red)", which the photographs show is
  the **co-angle numbers**, not the scale.

### 3.7 Graduations (measured from the prototype photograph)

**Method.** The prototype photo `prototype/57-front.jpg` is tilted about 0.54
degrees. It was flattened with a vertical shear that makes the face's long
bottom edge horizontal, and then for every row the tick baseline was located
and each tick's x position and length were read column by column (1 px
resolution). The x positions were converted to values with the scale's own
mapping (`log10` for `K`/`A`/`C`/`D`/`DI`, linear for `L`), and the measured
step between neighbouring ticks was then snapped to the printed division. The
raw per-interval tick counts are reproduced below.

**Evidence.** The photo shows the ticks directly; e.g. in `K`'s `[1,2)` segment
there are 20 ticks (every `0.05`, with the `0.1` ticks drawn longer and the
`0.05` ticks shorter), and no number between `1` and `2`. In `C`'s `[1,2)`
there are 50 ticks (every `0.02`, `0.1` longer) and the only number between `1`
and `2` is `1.5`. Tick lengths form at most three levels: **1 = longest**
(carries a printed number where the rule prints one), **2 = medium**, **3 =
shortest**. The rule has only two lengths on `K` and `A`, and three on
`C` / `D` / `DI`.

`C` / `D` (single decade; `DI` is the same, mirrored and printed 10..1):

| Interval | Step | Ticks | Levels |
|---|---|---|---|
| `[1,2)` | 0.02 | 50 | 10 × 1 (every 0.1, incl. 1.5) + 40 × 3 |
| `[2,5)` | 0.05 | 60 | 6 × 1 (every 0.5) + 24 × 2 (every 0.1) + 30 × 3 |
| `[5,10)` | 0.1 | 50 | 5 × 1 (integers) + 5 × 2 (halves) + 40 × 3 |

plus the `π` mark at 3.1416 (level 1).

`K` (the three decades `[1,10)`, `[10,100)`, `[100,1000)` are identical):

| Interval | Step | Ticks | Levels |
|---|---|---|---|
| `[1,2)` | 0.05 | 20 | 10 × 1 (every 0.1) + 10 × 3 |
| `[2,4)` | 0.1 | 20 | 4 × 1 (every 0.5) + 16 × 3 |
| `[4,10)` | 0.2 | 30 | 6 × 1 (integers) + 24 × 3 |

The printed numbers are `1..9`, `10`, `20..90`, `100`, ..., `1000` (section 3.4);
the step changes at `2`, `4` and at each decade.

`A` (the two decades `[1,10)` and `[10,100)` are identical):

| Interval | Step | Ticks | Levels |
|---|---|---|---|
| `[1,2)` | 0.05 | 20 | 10 × 1 (every 0.1) + 10 × 3 |
| `[2,5)` | 0.1 | 30 | 6 × 1 (every 0.5) + 24 × 3 |
| `[5,10)` | 0.2 | 25 | 5 × 1 (integers) + 20 × 3 |

plus the `π` mark at 3.1416 (first decade only).

`L` (linear `0..1`, one block):

| Interval | Step | Ticks | Levels |
|---|---|---|---|
| `[0,1)` | 0.005 | 200 | 100 × 1 (every 0.01) + 100 × 3 |

The **trigonometric rows** `S`, `ST` and `T` were measured the same way, on
their own tick baselines (S ≈ y248, T ≈ y420, ST ≈ y380 of the flattened photo;
the ticks hang downwards and the rows overlap the neighbouring log rows, so the
dark runs crossing each baseline were merged into ticks and the modal gap
between neighbours taken as the step). Their positions are the C/D decade-unit
`log10(sin)` / `log10(tan)` mapping of section 3.2, exactly as the reader does.
The measured steps are degree-minute divisions of the rule.

`S` (sine, `sin 0.1..1`, `position ~ log10(sin)`), 5.74..90 deg:

| Interval (deg) | Step | Ticks | Levels |
|---|---|---|---|
| `[5.74,10)` | 10' (1/6 deg) | 26 | 5 × 1 (`5.74` + `6..9`) + 4 × 2 (halves) + 17 × 3 |
| `[10,15)` | 10' | 30 | 5 × 1 (`10..14`) + 5 × 2 (halves) + 20 × 3 |
| `[15,20)` | 15' (1/4 deg) | 20 | 5 × 1 (`15..19`) + 5 × 2 (halves) + 10 × 3 |
| `[20,30)` | 30' (1/2 deg) | 20 | 10 × 1 (integers) + 10 × 3 |
| `[30,45)` | 30' | 30 | 15 × 1 (integers) + 15 × 3 |
| `[45,60)` | 1 deg | 15 | 15 × 1 |
| `[60,90)` | 2 deg | 16 | 2 × 1 (`60`, `90`) + 14 × 2 |

Printed on the black angle line: **`6 7 8 9 10 15 20 30 40 50 60 90`** (there is
no `70` / `80`). The red co-angle numbers print beside them, reading
**`84 83 82 81 80 75 70 60 50 40 30 0`**. The leftmost tick (5.74) and the
intermediate 10'/15'/30' ticks are unlabelled.

`T` (tangent, `tan 0.1..1`, `position ~ log10(tan)`), 5.71..45 deg. This row was
the cleanest of the three: every measured gap in `[10,15)` is 1/6 deg and in
`[15,45)` 1/3 deg.

| Interval (deg) | Step | Ticks | Levels |
|---|---|---|---|
| `[5.71,10)` | 10' (1/6 deg) | 26 | 5 × 1 (`5.71` + `6..9`) + 4 × 2 (halves) + 17 × 3 |
| `[10,15)` | 10' | 30 | 5 × 1 (`10..14`) + 5 × 2 (halves) + 20 × 3 |
| `[15,20)` | 20' (1/3 deg) | 15 | 5 × 1 (`15..19`) + 10 × 3 |
| `[20,30)` | 20' | 30 | 10 × 1 (integers) + 20 × 3 |
| `[30,45]` | 20' | 46 | 16 × 1 (integers + `45`) + 30 × 3 |

Printed: **`6 7 8 9 10 15 20 30 40 45`**, with the red co-angle numbers `84 83 82
81 80 75 70 60 50 45` beside them.

`ST` (small angles, `sin 0.01..0.1`), 0.573..5.74 deg:

| Interval (deg) | Step | Ticks | Levels |
|---|---|---|---|
| `[0.573,1.5)` | 5' (1/12 deg) | 12 | 5 × 1 (`0.573`, `35'`, `40'`, `50'`, `1`) + 2 × 2 (15') + 5 × 3 |
| `[1.5,5.74]` | 10' (1/6 deg) | 27 | 6 × 1 (the labels + the unlabelled `5.74` end) + 4 × 2 (30') + 17 × 3 |

Printed as degrees and minutes: **`35' 40' 50' 1° 1°30' 2° 3° 4° 5°`**. The
far end (5.74) is deliberately unlabelled; the maintainer's preliminary
`[1,2)` / `[2,5.74)` split is refined here: the step changes at **1 deg 30'**
(the `1°30'` label), not at 1 or 2 deg.

In the canonical JSON (`packages/core/rules/type-57.json`) these are
`fn: 'sin'` / `'tan'` `calculation` specs, resolved to `ScaleCalculation`s: the
bounds and labels are degrees, each generated tick keeps its `angle`, and the red
co-angle is derived from it by the renderer (`90 - angle`). The 1002's
trigonometric rows are resolved the same way (see [model-1002.md](model-1002.md)).

**Rendering notes.**
- **`L` is printed upside down relative to the other rows**: its graduations
  hang from the **top edge of the band** and its numbers sit **below** the
  graduations. `A`'s graduations also hang from their top edge; `K`, `C`, `D`
  and `DI` rise from a bottom edge. This is a per-row property of the renderer,
  not of the data table.
- In code the 57's measured tables live in `packages/core/rules/type-57.json` as
  `calculation` specs, resolved to `ScaleCalculation`s and turned into ticks by
  `packages/core/src/engine/scaleCalculation.ts`. The 1002's scales are resolved
  the same way (`packages/core/rules/1002.json`), so both models draw through the
  same generator and every scale carries a `calc`.
- **Co-angle numbers** (`cos` on `S`, `ctg` on `T`): the red numbers share
  the **black graduations** - no separate red ticks were seen. Only the printed
  numbers are red (matching the 1002, which also draws labels only), with the
  angle number just left of the tick and the co-angle just right of it.

---

## 4. Open questions

The two items still open are listed in
[section 0.2](#02-still-open-recorded-to-be-confirmed-later); the detail behind
each is below. Not yet established (do not guess):

1. **The exact level of a few boundary ticks** is partly inferred. The
   photograph resolves the tick positions and the two/three length groups
   clearly, but a handful of individual ticks sit between groups at the
   measurement noise level (~3 px), so their level assignment is read from the
   surrounding pattern rather than from the tick itself: the labelled `1.5` on
   `C`/`D` (measured near the 0.1 length, recorded as level 1 because it is
   labelled); and the `K` `[4,5)` boundary, where the measured step changes
   from `0.1` to `0.2` exactly at `4`. A sharper macro photograph would settle
   these individual ticks.
2. **The finest steps of `S`** are partly inferred. The `T` row measured very
   cleanly (all gaps 1/6 deg in `[10,15)` and 1/3 deg in `[15,45)`), but the `S`
   row overlaps the `A` row's ticks at its baseline and the red pen mark near
   `6..7`, so a few of its finest ticks were lost or doubled at the ~3 px
   measurement noise level. The `S` step in `[5.74,10)` is positive as 1/6 deg
   (matching `T`, and the detected tick count is 31 against 26 expected: a few
   extras, not a coarser grid), and `[15,20)` is 1/4 deg (20 ticks detected);
   a sharper macro photograph of the `S` row's left half would confirm the
   `[5.74,10)` and `[15,20)` steps and the exact level of every boundary tick.
   The `ST` step change at 1 deg 30' is established from the T-like clean gaps
   (`5'` below, `10'` above).

The remaining items of the earlier list are settled - see
[section 0.1](#01-settled-confirmed-by-the-maintainer-2026-09-17).

---

## 5. References

1. **Maintainer's prototype photograph** - [`prototype/57-front.jpg`](prototype/57-front.jpg),
   the front face (3560x810). This is the source for the scale list, row order,
   colours, printed numbers, reference notes and every graduation in section 3.7.
2. **Maintainer's prototype photograph of the back** -
   [`prototype/57-back.jpg`](prototype/57-back.jpg): the 0-12 cm measure, the
   area/volume formula tables, the sine and cosine rules and the maker mark
   (上海计算尺厂). Documented here; not rendered by the software (section 0.1).
3. **Supplied fact sheet** (maintainer) - dimensions, row counts and gutters,
   confirmed 2026-09-17 (section 0.1).
4. **Wikipedia**:
   - [Slide rule](https://en.wikipedia.org/wiki/Slide_rule)
   - [Slide rule scale](https://en.wikipedia.org/wiki/Slide_rule_scale)

See [../README.md](../README.md) for the documentation standard and
[model-1002.md](model-1002.md) for the full-size rule.

---

*Version: v1.5*
*Created: 2026-09 - Type 57, single face*
*Updated: 2026-09-17 - maintainer decisions recorded in the section 0 checklist:
the fact sheet dimensions, the groove ratios and the angle glyph are confirmed,
the 1002's `lg` row also prints its numbers below the graduations (the 1002 data
now sets `numbersBelow` on it), the back face is documented but not rendered, and
the third-party photograph references are removed because the prototype covers
every reading they served. The boundary tick levels and the `S` finest steps stay
open. Earlier: S / ST / T graduations measured from the prototype photograph
(degree-minute steps, per-interval tick counts, level splits and the black/red
label lists in section 3.7), with explicit `sin` / `tan` graduation tables.
Updated 2026-09-17: the angle number sits left of each graduation and the red
co-angle right of it (section 3.3); the renderer now draws them that way.*
