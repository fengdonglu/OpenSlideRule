# Slide Rule Fundamentals

An introduction to the principle, scale types and operation of a slide rule,
independent of any particular model.

---

## 1. The principle

### 1.1 Logarithms
A slide rule exploits **logarithms** to turn multiplication and division into
addition and subtraction:
- **Multiplication**: `log(a x b) = log(a) + log(b)`
- **Division**: `log(a / b) = log(a) - log(b)`

On a logarithmic scale the **position is proportional to the log of the value**,
so the distance between two values is the difference of their logarithms, and
sliding one scale against another performs addition / subtraction in log space.

### 1.2 Graduation mapping
For a single-decade scale (such as C/D), the position of value v is:
```
position = (log10(v) - log10(vMin)) / (log10(vMax) - log10(vMin))
```
For C (1..10):
- v = 1 -> position 0 (left end)
- v = 10 -> position 1 (right end)
- v = sqrt(10) ~ 3.162 -> position 0.5 (centre)

---

## 2. Scale types

The scales are not peers. **C and D are the reference scales**: almost every
other scale is graduated, placed or read against them. A position that is
"read against C/D" is expressed in **C/D decade units** - `0..1` spans C's
`1..10`, and a scale may overflow past either end while its graduations still
line up with the C/D reading they are used with. Folded scales (CF/DF),
reciprocal scales (CI/DI/CIF), and the logarithmic, trigonometric, hyperbolic
and log-log scales are all defined by where their value falls on C/D. The
per-model rules are in [model-1002.md section 3.8](model-1002.md) and
[model-57.md](model-57.md).

### 2.1 Logarithmic scales
| Scale | Range | Decades | Use |
|---|---|---|---|
| C / D | 1 - 10 | 1 | the core of multiplication and division |
| A / B | 1 - 100 | 2 | squares and square roots |
| K | 1 - 1000 | 3 | cubes and cube roots |

Graduation density is uneven: dense at the small end, sparse at the large end.

### 2.2 Folded scales
- **CF / DF**: C/D folded so that the index sits at sqrt(10) (on the 1002); the
  range runs from sqrt(10) to 10*sqrt(10).
- **Use**: fewer index changes during a long calculation.

### 2.3 Reciprocal scales
- **CI / DI / CIF**: the reciprocals of C/D/CF, running **decreasing** (right to left).
- **Use**: division (`a / b` is `a x (1/b)`).

### 2.4 Linear scales
- **L / lg**: a **linear** common-log scale, position proportional to the value.
- **Use**: read log10 directly, or use it for exponents.

### 2.5 Trigonometric scales
- **S / T / ST**, and on the 1002 `sin2 / cos2 / tg2 / ctg2 / tg3 / ctg3`.
- Graduated in **degrees**; the reading is the function value. On the 1002 the
  position is proportional to log(sin) or log(tan).

### 2.6 Hyperbolic scales
- **sh / th**, and on the 1002 `H2` (cosh), `H'2` (sech), `sh2/sh3`, `th2`.
- Used for hyperbolic functions in engineering and physics.

### 2.7 Scale roles and importance
The scales are not used equally. **C/D and their folded and reciprocal
neighbours (CF/DF, CI/DI)** carry the everyday multiplication and division;
**A/B and K** serve squares, cubes and roots, and **L** gives logarithms
directly. The remaining scales are **special-purpose** - trigonometry,
hyperbolics, log-log - and are consulted far less often. A rule is laid out
with this in mind: the everyday scales are the ones most immediately to hand
and, on a circular rule, the highest-accuracy scales are placed on the outer
rings.

---

## 3. Basic operations

### 3.1 Multiplication
Example: 2 x 3
1. Align C's **1** with D's **2**
2. Move the cursor to C's **3**
3. Read D under the cursor -> **6**

Why: the slide has moved by log10(2), so C's 3 now sits at
log10(2) + log10(3) = log10(6).

### 3.2 Division
Example: 6 / 2
1. Put the cursor on D's **6**
2. Move the slide so C's **2** is under the cursor
3. Read D under C's **1** -> **3**

Or with the reciprocal scale: align C's 1 with D's 6 and read D under CI's 2.

### 3.3 Squares and square roots
- **Square**: read D, take the result on A.
- **Square root**: read A, take the result on D.

### 3.4 Cubes and cube roots
- **Cube**: read D, take the result on K.
- **Cube root**: read K, take the result on D.

---

## 4. Reading accuracy

### 4.1 Significant figures
A slide rule gives **3-4 significant figures**. Major (labelled) graduations are
the most precise; medium and fine graduations require interpolation.

### 4.2 Order of magnitude
The rule does not show a decimal point, so the magnitude must be judged mentally:
2 x 3 and 0.2 x 30 are set the same way and both read "6"; you decide whether the
answer is 6, 60, 0.6 or 0.06.

---

## 5. What the cursor does

### 5.1 Cross-scale alignment
The transparent cursor covers the upper scale, the slide and the lower scale at
once, so one line gives readings on C, D, A, K and the rest simultaneously.

### 5.2 Precise positioning
The cursor line is very thin, which reduces parallax error.

### 5.3 Unit conversion (special cursors)
Some cursors carry an **auxiliary line** (for example the HP line) so two scales
can be converted directly: the main line on one scale, the auxiliary line on the
other.

---

## 6. Limitations

### 6.1 Not suited to
- **Addition / subtraction**: done mentally or from a table.
- **Values outside the scale range**: need a power-of-ten shift.
- **High precision**: graduation density limits you to 3-4 significant figures.

### 6.2 Sources of error
- alignment error when sliding by hand
- parallax when reading at an angle
- interpolation between medium and fine graduations

---

## 7. Historical note

Invented in the 17th century, the slide rule was the everyday tool of engineers,
scientists and aviators until electronic calculators appeared in the 1970s. It
remains valuable as a teaching tool and as a historical artefact.

---

## 8. References

- Wikipedia, "Slide rule" - <https://en.wikipedia.org/wiki/Slide_rule>
- Wikipedia, "Slide rule scale" - <https://en.wikipedia.org/wiki/Slide_rule_scale>

Both are used as project references for scale meanings and standard conventions
(single / double / triple-decade scales, folded scales, S/T/ST, Sh/Ch/Th, LL, L
and the P scale of `sqrt(1-x^2)`).

---

*Version: v1.3*
*Created: 2025-01*
*Last revised: 2026-09 - C/D as the reference scales; scale roles and
importance*
*English translation: 2026-09*
