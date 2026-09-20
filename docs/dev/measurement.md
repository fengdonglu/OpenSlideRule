# Measuring graduations from the prototype photographs

This is the method used to turn the prototype photographs into the measured
tables that drive the drawing. Its purpose is traceability: every interval,
step, level and printed number must come from a photograph (or from Wikipedia),
never from a guess.

## The photographs

`docs/domain/prototype/` holds `1002-front.jpg`, `1002-back.jpg`,
`57-front.jpg` and `57-back.jpg`. They are the only source for the graduation
layout. Three properties shape the method:

- **Keystone.** On the front photograph the scale shrinks from left to right
  (about 3000 px per decade on the left, about 2840 on the right), so a straight
  pixel-to-position line is not accurate enough.
- **Slight rotation.** The rule is not perfectly level, so a row's baseline
  drifts by a few pixels across the frame.
- **Uneven light and JPEG blur.** The threshold that separates ink from paper
  changes from region to region, and the finest ticks are sometimes only two
  pixels wide.

## Instrument

The photographs are decoded losslessly with `jpeg-js`. A pixel is *dark* when
its luminance `0.299 R + 0.587 G + 0.114 B` is below a threshold (150 by
default, adjusted per region). The helpers are in
[`tools/measure/`](../../tools/measure/README.md); they are offline and are not
part of the build.

## 1. Locate the row

`strip.js` prints a region as binary ASCII, one character per pixel, which makes
the baseline (the line the ticks attach to) and its slope visible. Note whether
the ticks reach **up** from a bottom baseline or **hang down** from a top
baseline, and copy the printed row name exactly.

## 2. Extract the ticks

`rowscan.js` walks every pixel column of the row. It finds the first dark pixel
within a few pixels of the baseline, measures how far the dark run reaches, and
merges adjacent columns into a single tick with a centre `x`, a width and a
length. The baseline is `yBase + slope*(x-465)`, so the keystone and rotation
are absorbed by `slope`.

A genuine tick is narrow and isolated: widths cluster around two to five pixels.
Wide blobs are shadows, the groove between the body and the slide, or ink from a
neighbouring row, and are rejected by inspecting the ASCII strip.

## 3. Calibrate pixel to position

A printed value `v` fixes a theoretical **position** `p` in C/D decade units,
where `0..1` is the C/D span:

```
p = log10(fn(v) / ref)
```

`fn` is the scale's own function (identity for C/D, the sine for sin2, the
hyperbolic tangent for th2, and so on) and `ref` is chosen so that the decade
matches. Each printed label sits over the longest tick near its centre, so a
label gives an anchor pair `(x, p)`.

`fitmap.js` fits a low-degree polynomial through those anchors. The flat back
photograph needs only a line `x = A + B p`; the keystoned front needs a
quadratic or cubic `p = c0 + c1 x + c2 x^2 ...`. The fit is accepted when the
residuals are a few pixels or less; a larger residual means a wrong anchor.

## 4. Read values and steps

Each tick's `x` is converted to `p` with the fit, then `p` is inverted through
`fn` to give the value. Sorted by position, the **median gap** between
consecutive ticks in a segment is that segment's finest step; the tick count
between two printed labels confirms it (`(b - a) / step + 1` ticks).

## 5. Determine levels

Tick **length** clusters into the levels: the longest cluster is level 1, then
level 2, then the shortest is level 3. The length thresholds differ per
photograph (`segments.js --lencuts`).

A caution learned from the photographs: **a printed number is not always the
longest tick**. On C the `1.05` tick is as long as `1.1`, and on th2 the longest
tick moves with the segment. The level of a printed number is therefore whatever
the photograph shows; labels must not be forced to level 1.

## 6. Segment the row

Where the step or the level pattern changes, the row is split into intervals and
each is recorded as `[from, to)` with its `step@level` list. `segments.js` prints
a first cut of this table.

## 7. Verify

The result is checked three ways:

1. **Overlay** the detected ticks back onto the photograph (`crop.js` zooms, or
   draw the `xc` markers) and confirm the count and the level of every tick.
2. Compare with the generated audit sheet
   ([`graduations.md`](graduations.md), rewritten by `npm test`).
3. Compare the application's rendering with the photograph side by side.

## Where the numbers live

| Data | File |
|---|---|
| 1002 measured intervals and printed labels | `packages/core/rules/1002.json` |
| Type 57 measured tables | `packages/core/rules/type-57.json` |
| The drawn result (audit sheet, generated) | `docs/dev/graduations.md` |

## Known limits

- Steps below roughly one pixel are not resolvable (for example `sin2 [80,90]`).
- A cursor or toolbar shadow over a row hides ticks (the `th2` tail).
- The segment-dependent long-tick rules of `th2` are not yet certain.
- The renderer's default row band may not match how a normal row's ticks attach
  to the paper; this is recorded as an open question, not assumed.
