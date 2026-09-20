# Chinese 1002 Slide Rule - Physical Specifications
*Physical Specifications of the Chinese 1002 Type Slide Rule*

This document describes the **physical rule** only; it is independent of the
software implementation.

---

## 1. Basic information

- **Formal name**: Vector Log-Log Double-Sided Slide Rule (矢量重对数双面计算尺)
- **Short name**: Vector double-sided slide rule
- **Model**: 1002
- **Type**: double-sided linear slide rule
- **Form**: long strip

---

## 2. Physical structure

### 2.1 Three-part structure
```
+-------------------------------------------------------------+
|                    Upper fixed scale                        |
+-------------------------------------------------------------+
|                    Upper groove (slot)                      |
+-------------------------------------------------------------+
|                    Slide (movable middle part)               |
+-------------------------------------------------------------+
|                    Lower groove (slot)                      |
+-------------------------------------------------------------+
|                    Lower fixed scale                        |
+-------------------------------------------------------------+
```

- **Upper / lower fixed scales**: fixed to the body.
- **Slide**: runs horizontally in the two grooves.
- **Grooves**: in reality a wide gap crossed by a single hairline (the slot edge).

### 2.2 Two faces
Each face has its own upper / middle / lower structure. The faces are the two
sides of the same body; flipping the rule about its long axis shows the other face.

### 2.3 Dimensions and proportions
The 1002 is a **full-size desk rule**: the face (the printed area) is about
**1 foot long and 2 inches wide**.

| Item | Measured | Notes |
|---|---|---|
| Face size | 304.8 x 50.8 mm (12in x 2in) | aspect ratio exactly **6 : 1** |
| Rows per face | 14 | upper 4 / middle 6 / lower 4 |
| Row height | ~3.14 mm | solved from the total height |
| Groove (upper / lower) | ~0.7 x row height | wide gap with a thin line |
| Top / bottom margin | ~0.4 x row height | face edge |
| Left name gutter | ~26 mm | scale names (sh2, K, sin2, ...) |
| Right reference panel | ~20 mm | conversion notes and formulas |
| Numeral height | ~0.6 x row height | the real rule is very dense |

**Tick area**: `304.8 - 26 - 20 ~ 259 mm`, the horizontal range of the graduations.

> **Source**: measured from the photographs `1002-front.jpg` / `1002-back.jpg`
> (about 11.4 px/mm), so these are **estimates** to be refined against the real
> rule or manufacturer data. In code they live in the `physical` field of
> `packages/core/rules/1002.json` / the `PhysicalSpec` type.

### 2.4 Right reference panel (to be completed)
The panel carries:
- a kilowatt <-> horsepower conversion table (used with the cursor's HP line)
- common read-off notes such as `.1->1` and the function notes `√1+(.1C)²`,
  `√1-(.1C)²`, `√1+C²`
- the maker's mark "Shanghai Slide Rule Factory / SHANGHAI"

The per-scale notes are now printed in the software (see section 3.7).

---

## 3. Scales

### 3.1 Count and distribution
- **Total**: 28 scales
- **Per face**: 14
- **Per face**: upper 4 / middle 6 / lower 4

### 3.2 Front face, top to bottom
> Authoritative source: the photograph `1002-front.jpg`.

**Upper**: `sh2 / sh3 / K / A`
**Middle**: `B / sin2(cos2) / H'2 / tg2(ctg2) / tg3(ctg3) / C`
**Lower**: `D / DI / lg / th2`

### 3.3 Back face, top to bottom
> Authoritative source: the photograph `1002-back.jpg`.

**Upper**: `ln1I / ln2I / ln3I / DF`
**Middle**: `CF / CIF / H2 / H3 / CI / C`
**Lower**: `D / ln3 / ln2 / ln1`

> **Note**: v1.0 of this document had the two faces swapped; corrected in v1.1
> from the photographs.

### 3.4 Naming conventions
- **Red scales** are decreasing (values run from large to small).
- **Black scales** are increasing.
- A name in brackets shares graduations with the previous scale but has its own
  printed numbers (for example `sin2(cos2)`: cos2 is the co-angle 90-theta).

### 3.5 Scale types
| Scale | Type | Use |
|---|---|---|
| C / D | single-decade log | multiplication and division |
| A / B | double-decade log | squares and square roots |
| K | triple-decade log | cubes and cube roots |
| CF / DF | folded log (anchored at sqrt(10)) | extra range for multiplication |
| CI / DI / CIF | reciprocal (decreasing) | division, reciprocals |
| ln1/ln2/ln3 | log-log segments | powers and roots of any order |
| ln1I/ln2I/ln3I | reciprocals of the log-log segments (red) | - |
| lg | common-log linear scale | log10 directly |
| sin2 / cos2 | trigonometry | sine / cosine by angle |
| tg2 / tg3 / ctg2 / ctg3 | trigonometry | tangent / cotangent by angle |
| sh2 / sh3 / th2 | hyperbolic functions | sinh / tanh |
| H2 / H3 / H'2 | hyperbolic functions | cosh / sech |

---

## 3.6 Scale meanings (read from the photographs)

> Source: row-by-row examination of `1002-front.jpg` / `1002-back.jpg` (2026-09).
> "Read" = supported by the photo; "inferred" = deduced mathematically and
> awaiting confirmation.

| Scale | Finding | Evidence |
|---|---|---|
| `C / D` | single-decade log, position proportional to log10 v. Graduated every 0.01 in [1,2) (the .05 midpoints are LONG, same class as the tenths), every 0.02 in [2,4) and 0.05 in [4,10), with the tenths long. Printed: every tenth in [1,2) then the integers, plus pi | `1 1.1 ... 1.9 2 3 π 4 ... 10` |
| `A / B` | two decades, self-similar per decade with boundaries at 2 / 5. Printed numbers are the INTEGERS only (`1 2 3 π 4 5 6 7 8 9 10 20 ... 100`); there are **no** `1.1 / 1.2 ...` labels. pi is marked in the first decade | `1 2 3 π 4 ... 10 20 ... 100` |
| `K` | three decades, self-similar with boundaries at 3 / 6. Printed numbers are the integers and the tens (`1 ... 10 20 ... 90 100 ... 1000`); there is **no** `1.5 / 15` and no pi | `1 ... 1000` |
| `CF / DF` | folded log anchored at **sqrt(10)**; CF starts at the anchor, DF extends left to 3 and their right ends carry the anchor mark again. The second decade prints the tens digit dropped (`10->1`, `11->1.1`, `20->2`, `30->3`); DF reaches **3.3** (value 33) at its right edge | photo shows `3 pi 4 ... 9 1 1.1 ... 2 ... 3 pi 3.3` on DF and `sqrt(10) 4 ... 1 ... 3 sqrt(10)` on CF |
| `CI / CIF` | reciprocals (red, decreasing) | 10...1 |
| `DI` | reciprocal of D (red, decreasing) | 10...1 |
| `CIF` | reciprocal of CF (red, decreasing): prints `10 / CF` at CF's own positions, `3.3 3 2 1.9 1.8 ...` | photo shows `3.3 3 2 1.9 1.8 1.7 ...` |
| `lg` | common log, **linear** 0...1 | `0 .1 .2 ...` evenly spaced |
| `ln1 / ln2 / ln3` | **log-log** scales graduated in the argument x; position `p = log10(ln x) - log10(from)`, where `from` is the note's lower end (the segments are anchored to C/D) | ln1 `1.0095 1.01 1.015...`, ln2 `1.10 1.11 1.15...`, ln3 `2.5 e 3 4 5...` |
| `ln1I / ln2I / ln3I` | reciprocals 1/x of the segments (red, decreasing); own measured numbers, not simply 1/x of the black labels | ln1I `.9905 .99 .985 ... .9`, ln2I `.91 .9 .85 ... e-1 .35`, ln3I `.4 .3 .2 ... .00005` |
| `sin2` | sine, angles from ~5.5 to 90 deg, position proportional to log(sin). **Measured** (section 3.9): every 0.05 deg in `[5.5,10)`, 0.1 in `[10,20)`, 0.2 in `[20,30)`, 0.5 in `[30,60)`, 1 in `[60,80)`, then 5 to 90 | black `5.5 6 7 8 9 10 15 20 25 30 40 50 60 70 80 90` (no 35 / 45 / 55 / 65 / 75 / 85) |
| `cos2` (red) | **co-angle 90-theta**, sharing sin2 graduations | red `84.5 84 83...` |
| `tg2` | tangent, angles ~5.5 to 45 deg, position proportional to log(tan). **Measured** (3.9): finest 0.05 deg in `[5.5,10)`, 0.1 in `[10,30)`, 0.2 in `[30,45]` | black `5.5 6 7 8 9 10 15 20 25 30 35 40 45` (matches sin at small angles) |
| `ctg2` (red) | co-angle, sharing tg2 graduations | red `84.5 84 ...` |
| `tg3` | tangent, 45 to **84.5 deg** (its red ctg3 twin reads 5.5), finest 0.2 in `[45,60)`, 0.1 in `[60,80)`, 0.05 in `[80,84.5]` | black `45 50 55 60 65 70 75 80 81 82 83 84 84.5`, red co-angle beside each |
| `ctg3` (red) | co-angle, sharing tg3 graduations | red `45 40 30 25... 5.5` |
| `H2` | **Hyperbolic cosine**: graduated at even steps of the printed value `cosh(x)`; values **1.005 .. 1.45**. The note ties x to the C scale: the C reading is `10·sinh(x)` | 1002-back.jpg row `H2`: `1.005 1.008 1.01 ... 1.45` |
| `H'2` (red) | **Hyperbolic secant**, the inverse function, over a wider range: printed values **.995 .99 .98 ... .1 .0**, ending on the sech asymptote at C/D = 10. **Measured**: graduated at even steps of sech(x) on a 1-2-5 ladder (.0001 at .995, coarsening to .05) | 1002-front.jpg row `H'2`: `.995 .99 ... .6 .5 .4 .3 .2 .0` |
| `H3` | **Hyperbolic cosine** over the next range: the note has no parentheses, so `sinh(x) = C`; values **1.4 ... 10.5** | 1002-back.jpg row `H3`: `1.4 1.5 ... 10 10.5` |
| `sh2` | **Hyperbolic sine**, first segment: graduated in the argument x from 0.095 to 0.9; read on C/D as `sinh(x) = C / 10` (note `.1->1`); position proportional to log10(sinh x) | printed `0.095 0.1 0.15 0.2 0.3 ... 0.8 0.9` on `1002-front.jpg` |
| `sh3` | **Hyperbolic sine**, second segment: argument x from 0.85 to 3; read on C/D as `sinh(x) = C` (note `1->10`); position proportional to log10(sinh x) | printed `0.85 0.9 1 1.1 ... 2.9 3` on `1002-front.jpg` |
| `th2` | **Hyperbolic tangent**: argument x from 0.095 to the asymptote (tanh = 1); read on C/D as `tanh(x) = C / 10` (note `.1->1`); position proportional to log10(tanh x). **Measured**: even argument steps .001/.002/.005/.01/.02 up to x=1.5 | printed `0.095 0.1 0.15 0.2 0.3 ... 1 1.5 2 3` followed by the end note `∞` on `1002-front.jpg` |

**Corrections versus v1.0**:
- `ln` is not a plain natural-log scale but a **log-log** scale for arbitrary powers.
- `H` scales are **Pythagorean** scales (see 3.8), not unknown engineering scales.
- `cos2 / ctg2 / ctg3` are **co-angle** readings sharing the main graduations.

### 3.6.1 Measured ln graduations (ln1 / ln2 / ln3)

> Source: `1002-back.jpg` (3651x720). The three black rows of the lower section
> hang their graduations from a common top edge; the tick baselines were located
> at y ~ 511 (ln3), 546 (ln2) and 581 (ln1), the dark runs below each baseline
> were merged into ticks, and their x positions were converted with the row's
> own mapping `p = log10(ln x) + K` (K = 0 / 1 / 2 for ln3 / ln2 / ln1), in C/D
> decade units. The pixel data and the script are recorded in the maintainer's
> measurement notes; the resulting table lives in
> `packages/core/rules/1002.json`.

Within each interval the finest step is level 3, the next step is level 2 and
the coarsest regular step is level 1; the printed numbers (section 3.6) are
always level 1.

| Row | Interval | Fine step | Medium | Longest | Ticks |
|---|---|---|---|---|---|
| ln1 | `[1.0095,1.02)` | 0.0001 | 0.0005 | 0.001 | 105 |
| ln1 | `[1.02,1.05)` | 0.0002 | 0.001 | 0.005 | 150 |
| ln1 | `[1.05,1.11]` | 0.0005 | 0.001 | 0.005 | 121 |
| ln2 | `[1.10,1.11)` | 0.0005 | 0.001 | 0.005 | 20 |
| ln2 | `[1.11,1.2)` | 0.001 | 0.005 | 0.01 | 90 |
| ln2 | `[1.2,1.4)` | 0.002 | 0.01 | 0.1 | 100 |
| ln2 | `[1.4,1.8)` | 0.005 | 0.02 | 0.1 | 80 |
| ln2 | `[1.8,2.5)` | 0.01 | 0.05 | 0.1 | 70 |
| ln2 | `[2.5,2.9]` | 0.02 | 0.1 | - | 22 |
| ln3 | `[2.5,4)` | 0.02 | 0.1 | - | 76 |
| ln3 | `[4,6)` | 0.05 | 0.1 | 0.5 | 40 |
| ln3 | `[6,10)` | 0.1 | 0.5 | 1 | 40 |
| ln3 | `[10,15)` | 0.2 | 1 | - | 25 |
| ln3 | `[15,30)` | 0.5 | 1 | 5 | 30 |
| ln3 | `[30,50)` | 1 | 5 | - | 20 |
| ln3 | `[50,100)` | 2 | 10 | - | 25 |
| ln3 | `[100,200)` | 5 | 10 | - | 20 |
| ln3 | `[200,500)` | 10 | 50 | 100 | 30 |
| ln3 | `[500,1000)` | 50 | 100 | - | 10 |
| ln3 | `[1000,2000)` | 100 | 500 | - | 10 |
| ln3 | `[2000,5000)` | 200 | 1000 | - | 15 |
| ln3 | `[5000,10000)` | 500 | 1000 | - | 10 |
| ln3 | `[10000,20000]` | 1000 | 5000 | - | 11 |

The tick counts are the measured evidence for the earlier claim "every 0.02 in
`[3,4)` and every 0.1 longer": the counts generated by the table match the ticks
detected on the photograph to within a few ticks per row (ln1 376/376, ln2
385/382, ln3 352/361). The reciprocal rows (`ln1I / ln2I / ln3I`) are laid on
the same measured grid and print their own numbers.

---

## 3.8 Scale conventions (established)

These rules are fixed by how a slide rule is used. They come from the standard
literature (see References) and were checked against the photographs.

1. **Everything shares the C/D base.** A scale that is read against C or D must
   be graduated with `position proportional to log10(value)` so its graduations
   line up with C/D. This is a hard constraint, not a style choice.
2. **The right-hand notes are read-off instructions.** `x->y` tells you which
   decade of C/D to read the scale's values on:
   - `sin2 .1->1`: sine values 0.1..1 are read on the C/D scale as 1..10 (x10)
   - `tg3 1->10`: tangent values 1..10 are read directly on C/D
   - `sh2 .1->1`, `sh3 1->10`: hyperbolics, same idea
3. **Trigonometric scales read against C/D.**
   - sine (`sin2`): angles ~5.7 to 90 deg; `position ~ log10(sin)`
   - cosine (`cos2`, red): the co-angle 90 - theta, sharing sin2's graduations
     (the "Darmstadt" black/red dual labelling). The angle number is printed
     just left of each graduation and the red co-angle just right of it, on the
     same line (`5.5 | 84.5`, `6 | 84`, `45 | 45`), as the front photograph
     shows; the same holds for `ctg2` / `ctg3`
   - tangent below 45 deg (`tg2`) reads against C/D; above 45 deg (`tg3`) reads
     against CI. The photograph shows `tg3` ending at **84.5 deg** (tan 10.385,
     its ctg3 twin reading 5.5), a hair past C/D = 10
   - `ctg2` / `ctg3` are the co-angle readings
4. **Hyperbolic scales** (Wikipedia: "Sh ... for finding hyperbolic sines on the
   C (or D) scale"):
   - `sh2`: hyperbolic sine, argument x = 0.095..0.9 (sinh 0.1..1); note
     `.1->1`, so `sinh(x) = C / 10`; `position ~ log10(sinh x)`
   - `sh3`: hyperbolic sine, argument x = 0.85..3 (sinh 1..10); note `1->10`,
     so `sinh(x) = C`; `position ~ log10(sinh x)`
   - `th2`: hyperbolic tangent, argument x = 0.095..∞ (tanh 0.1..1); note
     `.1->1`, so `tanh(x) = C / 10`; `position ~ log10(tanh x)`; the far end is
     the asymptote tanh = 1, marked `∞`
   The printed numbers of `sh2` / `sh3` / `th2` are the **argument x**. Their
   positions are in **C/D decade units** (section 3.8.1), *not* normalised over
   the segment's own span: `sh2` places x at `log10(sinh x) + 1` and `sh3` at
   `log10(sinh x)`, so their ends stick out past the C/D ends and line up with
   the C/D graduations they are read against.
   - `H2` / `H'2` / `H3`: **hyperbolic scales**, all graduated at even steps of
     the **printed function value** `cosh(x)` / `sech(x)` (measured, section
     3.9 - the sub-tick counts equal `(Vb-Va)/step` exactly, which does not hold
     for even argument steps). Their notes tie x to the adjacent C scale:
     - `H2` = cosh(x) with `10·sinh(x) = C`; note `√1+(.1C)²`; printed values
       **1.005 .. 1.45**
     - `H'2` = sech(x), the **inverse function**, printed values **.995 .. .0**
       (the sech asymptote at C/D = 10); note `√1-(.1C)²`
     - `H3` = cosh(x) with `sinh(x) = C`; note `√1+C²` (no parentheses because
       the C reading is used as it is); printed values **1.4 .. 10.5**
     A parenthesised `(C)` therefore always means the C reading is **scaled
     first** - here by 1/10.
     The values `sqrt(1+x^2)` and `sqrt(1-x^2)` are the Pythagorean relations
     cosh^2 = 1 + sinh^2 and sech^2 = 1 - tanh^2.
     Their C/D position follows the same rule as the rest of the row
     (section 3.8.1): `H2` at `log10(sinh x) + 1`, `H'2` at
     `log10(tanh x) + 1` (which is why it is **not** linear in x, the C hairline
     reads the relation's C value) and `H3` at `log10(sinh x)`.
5. **Folded scales**: CF and DF are C/D folded so the index sits at sqrt(10)
   (the literature also describes folding at pi; the photographs of this rule
   show sqrt(10) on CF and pi marked on DF, at both ends of the folded span).
   The second decade is printed with the tens digit dropped (`10` -> `1`,
   `11` -> `1.1`, `20` -> `2`, `30` -> `3`); DF's right edge is **3.3** (value
   33) and CIF, the red reciprocal of CF, runs `3.3 3 2 1.9 ...`.
6. **Log-log scales**: `ln1/ln2/ln3` are placed in C/D decade units too:
   `p = log10(ln x) - log10(from)`, where `from` is the note's lower end
   (`1`, `.1`, `.01`). Each note pair is the range of `ln(x)` over its segment,
   so `ln3`'s `e` tick (ln e = 1) lands exactly on the D left edge and `ln2`'s
   on the C/D right edge; `ln1` is shifted two decades and fills the same width.
   `ln1I/ln2I/ln3I` are their reciprocals, with their own measured numbers.
7. **The linear row prints its numbers below the graduations.** `lg` hangs its
   graduations from the top edge of its band and prints `0 .1 .2 ... .9 1`
   **below** them (maintainer-confirmed on 2026-09-17; the Type 57's `L` row is
   printed the same way). No other row of this rule has been checked for that
   arrangement, so they keep numbers above their graduations.
8. **Printed fractions drop the leading zero.** A value below one is printed
   without the zero before the decimal point (`0.095` is printed `.095`, `0.995`
   is `.995`, `0.5` is `.5`); an integer is printed bare (`0`, `1`). This applies
   to every row of both models and is the shared label formatter
   (`formatNumber` / `trimLeadingZero` in `packages/core/src/engine/gradations.ts`).

### 3.8.1 Position model: C/D decade units

Every scale that is read against C/D is placed in **C/D decade units**:
`p = 0` exactly at `C = 1` and `p = 1` exactly at `C = 10`. The mapping is fixed
by the scale's reading relation (its right-hand note). When the printed argument
`x` produces the function value `f(x)` and the note pair is `a->b` (the range of
`f`; the note scales the reading by `1/a`), the adjacent C/D reading is
`f(x) / a`, so

```
p = log10(f(x) / a) = log10(f(x)) - log10(a)
```

A scale may therefore extend past the C/D ends. Those graduations are still
drawn - the C/D span (the tick area's own 0..1) stays the visual reference, and
the overflow reaches into the name gutter or the note panel; nothing is clamped
or hidden.

| Scale | Note | Relation | Position `p` |
|---|---|---|---|
| `C` / `D` | - | reference decade | `log10(v)` |
| `sh2` | `.1->1` | `10*sinh(x) = C` | `log10(sinh x) + 1` |
| `sh3` | `1->10` | `sinh(x) = C` | `log10(sinh x)` |
| `th2` | `.1->1` | `10*tanh(x) = C` | `log10(tanh x) + 1` |
| `sin2` / `cos2` | `.1->1` | `10*sin(x) = C` | `log10(sin x) + 1` |
| `tg2` / `ctg2` | `.1->1` | `10*tan(x) = C` | `log10(tan x) + 1` |
| `tg3` / `ctg3` | `1->10` | `tan(x) = C` | `log10(tan x)` |
| `H2` | `√1+(.1C)²` | `10*sinh(x) = C` | `log10(sinh x) + 1` |
| `H'2` | `√1-(.1C)²` | `10*tanh(x) = C` | `log10(tanh x) + 1` |
| `H3` | `√1+C²` | `sinh(x) = C` | `log10(sinh x)` |
| `lg` | - | `L = log10(C)` | `L` (linear 0..1) |
| `A` / `B` | - | two decades | `log10(v) / 2` |
| `K` | - | three decades | `log10(v) / 3` |
| `ln3` | `1->10` | `log10(ln x)` range 0.92..9.90 | `log10(ln x)` (e at p = 0) |
| `ln2` | `.1->1` | `log10(ln x)` range -0.98..0.03 | `log10(ln x) + 1` (e at p = 1) |
| `ln1` | `.01->.1` | `log10(ln x)` range -2.02..-0.98 | `log10(ln x) + 2` |
| `CF` | - | fold at sqrt(10), values sqrt(10)..10*sqrt(10) | `log10(v / sqrt(10))` |
| `DF` | - | fold at sqrt(10), values 3..33 (right edge 3.3) | `log10(v / sqrt(10))` (p < 0 at 3) |
| `CIF` | - | `10 / CF` (value `v`) | `log10(sqrt(10) / v)` (3.3 sits at p < 0) |
| `CI` / `DI` | - | reciprocal of C/D | `1 - log10(v)` |

A layer of scope: `CF` / `DF` and the `ln*` rows are read against C/D exactly as
the trig and hyperbolic rows are; `CI` / `DI` / `CIF` are the decreasing
reciprocals drawn on the same frame. Every one of them may overflow 0..1 and is
still drawn (section above).

The Type 57's `S` (`log10(sin x) + 1`), `T` (`log10(tan x) + 1`) and `ST`
(`log10(sin x) + 2`) follow the same rule; each is one decade wide, so they land
on 0..1 and do not overflow.

In code the relation is the scale's `calc` (`ScaleCalculation` in
`packages/core/src/types/scale.ts`): its `Mapping` (`engine/scaleMapping.ts`) maps the domain to
the position, the cursor reader (`engine/scaleReader.ts`) maps it back, and both
drive the same `calc`, so a graduation and its reading can never disagree.

### 3.9 Measurement passes - what was measured and what is still open

A column-by-column measurement of `1002-front.jpg` / `1002-back.jpg` (2026-09,
same method as section 3.6.1). The reliable results are now in the code; the
rest is recorded here so it is not silently guessed.

**Implemented (measured tables in the code)**

- `sin2` / `cos2`: finest `0.05` deg in `[5.5,10)`, `0.1` in `[10,20)`, `0.2` in
  `[20,30)`, `0.5` in `[30,60)`, `1` in `[60,80)`, `5` in `[80,90]` (sin is
  sub-pixel above 80). Printed `5.5 6 7 8 9 10 15 20 25 30 40 50 60 70 80 90`
  (no 35 / 45 / 55 / 65 / 75 / 85).
- `tg2` / `tg3`: share a centreline (tg2 `floor`, tg3 `roof`). tg2 finest
  `0.05` / `0.1` / `0.2` below 45, tg3 `0.2` / `0.1` / `0.05` above 45 up to 84.5.
- `sh2` / `sh3`: `sh2` finest `0.001` / `0.002` / `0.005`, `sh3` `0.01` / `0.05`;
  share a baseline (sh2 `floor`, sh3 `roof`).
- `H2` / `H3` (cosh) and `H'2` (sech): graduated at even steps of the printed
  value (measured: sub-tick counts equal `(Vb-Va)/step` exactly), not of the
  argument.
- `th2` (tanh): even argument steps on a 1-2-5 ladder (`.001` / `.002` / `.005` /
  `.01` / `.02`) up to x=1.5; the `[1.5,3]` step (`.05`) is the natural 1-2-5
  continuation past the region the cursor housing obscures, and is provisional.
- `C` / `D` / `CI` / `DI`: one measured value grid (`0.01` in `[1,2)`, `0.02` in
  `[2,4)`, `0.05` in `[4,10)`); CI/DI mirror it.
- `A` / `B` / `K`: self-similar per decade, coarser than C/D, with boundaries at
  `2` / `5` (A) and `3` / `6` (K).
- `CF` / `DF` / `CIF`: measured folded value steps (CF `0.02` in `[sqrt10,4)`,
  `0.05` in `[4,10)`, `0.1` in `[10,20)`, `0.2` above; DF the same from 3; CIF
  reuses CF's grid).
- `lg` (linear 0..1): every `0.002`, labels at the tenths (the 57 `L` is coarser
  at `0.005` and keeps its own table).
- Printed numbers are the measured ones: A/B print the integers only (no
  `1.1` / `1.2` ...) and carry pi; K prints no `1.5` / `15` and no pi; C/D print
  the decimals in `[1,2)` then the integers. `th2` prints its numbers below its
  graduations (like `lg`).
- Tick levels: in C/D `[1,2)` the `.05` midpoint ticks are long, the same class
  as the tenths. On a measured hyperbolic row a printed number is **not** forced
  to the longest level (th2 / H2 show the longest tick is not always labelled).
- All tables live in `packages/core/rules/1002.json`.

**Structural decisions (settled)**

1. Adjacent rows sharing a tick baseline: **confirmed and implemented** for
   `sh2` / `sh3` AND for `tg2` / `tg3` (measured attach ends coincide to <=2 px
   over the whole rule).
2. Lower-section row order: the maintainer confirmed the documented
   **`D / DI / lg / th2`** is authoritative.
3. `3.3` on DF is **value 33** (confirmed: its tick sits 59 px past the 10*pi
   mark, one `33/30` step; the folded span is 3 .. 33).

**Measured but NOT applied (unreliable / unresolved - do not guess)**

- `sin2` `[80,90]`: sub-pixel, only 80 / 85 / 90 visible (encoded as 5 deg).
- `sh3` level 1: not confirmed; only the printed numbers are clearly longest.

**Calibration caveat.** The front photo has keystone compression (~3000 px per
C/D decade at the left, ~2840 at the right); a quadratic `x(p)` is required, not
a single linear fit.

### Open questions
- `sin2` `[80,90]` finest step (sub-pixel in this photograph)
- `sh3` level-1 class

---

## References (the only two sources of truth)

1. **Prototype photographs** (in this repository):
   - [prototype/1002-front.jpg](prototype/1002-front.jpg) - front face
   - [prototype/1002-back.jpg](prototype/1002-back.jpg) - back face
2. **Wikipedia**:
   - [Slide rule](https://en.wikipedia.org/wiki/Slide_rule)
   - [Slide rule scale](https://en.wikipedia.org/wiki/Slide_rule_scale)

Every fact in this document must be traceable to one of these two sources. Where
a photograph is unclear the fact is marked as not yet established instead of
guessed. See [../README.md](../README.md) for the rule in full.

---

## 3.7 Reference notes at the right of each scale (authoritative, user-supplied)

Each scale carries a short read-off note at its right end. The software prints
them verbatim at the right of the corresponding scale.

**Front**

| Scale | Note |
|---|---|
| `sh2` | `.1->1` |
| `sh3` | `1->10` |
| `sin2` | `.1->1`, `√1-(.1C)²` (two lines) |
| `H'2` | `√1-(.1C)²` |
| `tg2` | `.1->1` |
| `tg3` | `1->10` |
| `th2` | `.1->1` |

**Back**

| Scale | Note |
|---|---|
| `ln1I` | `.01->.1` |
| `ln2I` | `.1->1` |
| `ln3I` | `1->10` |
| `H2` | `√1+(.1C)²` |
| `H3` | `√1+C²` |
| `ln3` | `1->10` |
| `ln2` | `.1->1` |
| `ln1` | `.01->.1` |

> Reading: `x->y` means the reading in that range is scaled by the ratio x to y
> (for example `.1->1` means multiply by 10). The radical notes give the
> functional relation directly. Scales without a note are self-explanatory.

---

## 4. Cursor

### 4.1 Structure
A transparent slider travelling the full length of the rule, carrying vertical
lines used to align scales and take readings.

### 4.2 Cursor lines
1. **Main line** (centre): aligns with every scale on both faces.
2. **Left auxiliary line**: a fixed offset to the left of the main line.
3. **Right HP line**: used with the main line for kW <-> hp conversion.

### 4.3 Cursor scale
The cursor body also carries a logarithmic scale of its own (a copy of C/D) for
fine interpolation.

---

## 5. Materials and appearance
- **Body**: plastic (usually white)
- **Printing**: black and red
- **Scale names**: printed at the start (left) of each scale
- **Grooves**: a wide gap crossed by a single thin dark line

---

## 6. Operation
1. **Move the slide**: drag the middle band horizontally.
2. **Move the cursor**: drag the transparent cursor along the rule.
3. **Flip the rule**: show the other face.
4. **Read**: align the cursor line with a graduation and read the value.

---

*Version: v2.2*
*Created: 2025-01*
*Last revised: 2026-09-17 - corrected the printed numbers (A/B/K integers, pi),
the C/D .05 long ticks, th2 numbers below, and stopped forcing printed numbers
to the longest level on measured hyperbolic rows*
