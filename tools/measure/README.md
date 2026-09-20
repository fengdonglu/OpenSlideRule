# tools/measure

Offline helpers used to measure graduations directly from the prototype
photographs. They are **not** part of the application build or the test suite:
they are CommonJS, depend on `jpeg-js`, and are ignored by ESLint and Prettier.
The photographs live in `docs/domain/prototype/`.

The method itself is written down in
[`docs/dev/measurement.md`](../../docs/dev/measurement.md);
this file is only the command reference.

## Setup

```
npm install
```

## Tools

| Script | Purpose |
|---|---|
| `crop.js <jpg> <out.png> <x> <y> <w> <h> [scale]` | Crop and upscale a region to a lossless PNG for visual inspection. |
| `strip.js <jpg> <x0> <x1> <y0> <y1> [thr]` | Print a region as binary ASCII (`#` dark, `.` light) to find a row baseline. |
| `rowscan.js <jpg> <x0> <x1> <yBase> <slope> <dir> [thr]` | Extract ticks as `xc width length` (tab separated). `dir` is `up` or `down`; the baseline is `yBase + slope*(x-465)`. |
| `ticklen.js <jpg> <x0> <x1> <y0> <y1> [thr]` | Band-based tick lengths (used for the Type 57 photographs). |
| `fitmap.js <pairs.tsv> [--deg N] [--indep x\|p] [--out cal.json]` | Fit the photo-to-position mapping from label anchors. `--indep x` maps pixel to position; `--indep p` maps position to pixel. |
| `segments.js <cal.json> <ticks.tsv> --pbounds a,b,c [--lencuts s,m] [--xrange lo,hi]` | Print the interval table (count / median gap / level histogram) for a tick list. |

## Typical workflow

1. `crop.js` the row and read it with your eyes first.
2. `strip.js` a short slice to find the baseline `yBase` and its slope.
3. `rowscan.js` the whole row into a tick file (`xc TAB width TAB length`).
4. For each printed label, note its value and pixel centre and compute the
   theoretical position `p` (see the method doc). Write `x<TAB>p` lines and run
   `fitmap.js --indep x`; a small rms (a few px) means the mapping is good.
5. `segments.js` between the labels; the median gap is the finest step of that
   segment and the length clusters are the levels.
6. Record the result as a `GraduationInterval` in the canonical
   `packages/core/rules/1002.json` and regenerate the audit sheet with `npm test`.

## Conventions

- **Position `p` is in C/D decade units**; `0..1` is the C/D span. Values
  outside it overflow the graduations area.
- **Level 1 is the longest tick**, level 3 the shortest.
- The default threshold is `150` (`110` in `ticklen.js`); the photographs are
  unevenly lit, so a per-region value is often needed.
- The baseline slope is in pixels per pixel and absorbs the small keystone and
  rotation of the photograph; it is not a physical property.
