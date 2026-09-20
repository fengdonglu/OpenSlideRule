# Rendering Specifications

How the rule is drawn, how SVG is used, and how zoom / cursor / hover behave.

---

## 1. Technology choice

### 1.1 Why native SVG
- Exact: graduation positions come from formulas; SVG scales losslessly.
- Light: no fabric.js / konva (~200KB saved).
- Debuggable: the DOM is inspectable.
- Responsive: a millimetre viewBox plus a computed `pxPerMm`.

### 1.2 Millimetres first
- **One coordinate system**: every geometric quantity (face width, row height,
  groove, font size, tick position) is expressed in millimetres.
- **Rendering**: each section is one SVG whose `viewBox` is in millimetres with
  the default `preserveAspectRatio`, so nothing is stretched.
- **Pixels**: the only scale factor is `pxPerMm = availableWidthPx / faceWidthMm`;
  pixels appear only for container sizes.

**Why**: the early implementation used a fixed `viewBox="0 0 1000 100"` with
`preserveAspectRatio="none"`, which squashed the vertical axis until text was
about 1 px tall and unreadable. With millimetres, proportions and font sizes
follow the physical rule and zoom changes exactly one value.

---

## 2. Millimetre coordinates

### 2.1 Physical spec (`PhysicalSpec`)
```typescript
{
  faceWidthMm: 304.8,   // 12 in
  faceHeightMm: 50.8,   // 2 in
  rowCount: { upper: 4, middle: 6, lower: 4 },
  grooveRowRatio: 0.7,  // groove / row height
  marginRowRatio: 0.4,  // top/bottom margin / row height
  leftGutterMm: 26.1,   // left name gutter
  rightPanelMm: 19.7,   // right reference panel
  numeralRatio: 0.6,    // numeral height / row height
}
```
See [domain/model-1002.md section 2.3](../domain/model-1002.md).

### 2.2 Layout solution (`packages/renderer/src/layout/index.ts`)
```
rowHeightMm = faceHeightMm / (14 + 2*grooveRowRatio + 2*marginRowRatio)   // ~3.136
grooveMm    = grooveRowRatio * rowHeightMm                                // ~2.195
marginMm    = marginRowRatio * rowHeightMm                                // ~1.254
numeralMm   = numeralRatio  * rowHeightMm                                 // ~1.881

upper.top   = marginMm
middle.top  = upper.bottom  + grooveMm
lower.top   = middle.bottom + grooveMm
```
`computeFaceLayout(spec, availableWidthPx)` returns a `FaceLayout` with
`pxPerMm`, the three section `top/height`, the groove positions and the tick-area
bounds. Sections also carry `bleedTopMm` / `bleedBottomMm` (half a groove) so the
graduations next to a groove can reach the slot line.

### 2.3 Tick coordinates
```typescript
const x  = tickLeftMm + tick.position * tickWidthMm   // 26.1 .. 285.1 mm
const y1 = rowTop + (level === 1 ? 0.45 : level === 2 ? 0.55 : 0.62) * rowHeightMm
const y2 = rowTop + 0.95 * rowHeightMm                // all levels share the far end
```

### 2.4 Numeral position
Numerals sit on the far side of the graduations; the height is `numeralMm`
(about 1.9 mm, roughly 6-7 px on screen - matching the real rule).

A scale may set **`numbersBelow`** (the 57's `L` row): its graduations hang from
the **top edge** of the band (level 1 reaches 0.50 of the row, level 2 0.42,
level 3 0.35) and its numbers are printed **below** them (baseline 0.95 of the
row). The default is the opposite (numbers above, ticks in the lower band), so
the flag is opt-in and the 1002 is unchanged.

---

## 2.5 Graduation levels and printed numbers

Three levels (`Tick.level`), with **fixed pixel widths** that do not grow with
zoom (`vector-effect="non-scaling-stroke"`):

| level | length (of row) | width | printed |
|---|---|---|---|
| 1 | 0.45 -> 0.95 | **1.5 px** | value |
| 2 | 0.55 -> 0.95 | **1.2 px** | - |
| 3 | 0.62 -> 0.95 | **1 px** | - |

**Grooves** are a single **1 px** hairline (also fixed) with an explicit
`z-index: 2`, i.e. above the slide (`z-index: 1`); DOM order alone is not enough
because the slide paints above the body and its bleed covers the hairline. The
line uses the theme's text colour so it stays visible on every theme.

**Rows next to a groove** are printed tight against it: a row directly *below* a
groove is mirrored (graduations against the groove, numbers on the far side); a
row directly *above* a groove keeps its orientation but extends to the groove.

**Density**: every scale is laid down with the shared **coarse-to-fine ladder**
plus a minimum spacing filter (`MIN_SPACING ~ 0.0042`, about 1.1 mm), so density
is even. A fixed value step cannot work: it is far too dense in a compressed
decade (K around 1-4) and too sparse elsewhere.

**Printed numbers**: for each decade and sub-interval the finest *regular*
quantum that does not collide is chosen (`LABEL_SPACING ~ 0.022`, about 5.7 mm):
- `[1,2)` every 0.1, `[2,5)` every 0.2/0.5, `[5,10)` every 1 (the classic layout)
- multi-decade scales (A/B/K) have shorter decades, so the quantum coarsens
  automatically (A's `[1,2)` ends up at 0.2)

**Folded scales CF / DF**: graduations and numbers live in the argument's value
space; only the position depends on the anchor.
- **CF** is anchored at **sqrt(10)**: `sqrt(10) 4 5 6 7 8 9 10 20 30`
- **DF** is anchored at sqrt(10) too but extends left to 3: `3 pi 4 5 6 ...`
- **CIF** is the reciprocal of CF, printed as `1/CF`: `3.2 2.5 2 1.7 ... 0.5 0.3`

**Pi marks**: **C and D on both faces mark pi** (the photo shows `3 pi 4`). The
mark is inserted *after* label thinning so it can never be dropped.

**Right-hand reference notes**: each scale's `notes` (read from the rule, see
domain section 3.7) are drawn in the right panel, **centred** in it, at the same
height as the scale-name line; a second line sits on the next row's name line.
A note starting with a radical puts the rest of the text in a
`text-decoration="overline"` tspan so the bar covers it.

**Co-angle numbers**: `sin2` / `tg2` / `tg3` carry `sharedLabels` (cos2 / ctg2 /
ctg3) printed as a **second number line** below the band (`90 - theta`, red,
0.75 x numeral size). Those rows use a shorter band so the two number lines
never touch the graduations. The 57's `cos` / `ctg` lines print bare numbers;
both models draw **labels only** for the co-angle line (no separate red ticks).

**Linear-scale numbers** (`L` / `lg`): printed as the rule writes them - a bare
whole number at the ends and a leading-zero-omitted fraction between, e.g.
`0 .1 .2 ... .8 .9 1` (not `0.0 ... 1.0`).

---

## 3. Layout structure

### 3.1 Containers
```vue
<div ref="viewportEl" class="rule-viewport">      <!-- scroll container -->
  <div class="rule-stack">                        <!-- one or two faces -->
    <div v-for="face in faces" class="face">
      <div v-if="dualFace" class="face-label">Front / Back</div>
      <div class="rule-canvas">                   <!-- one face -->
        <div class="body-band" /> ... sections ... <div class="groove" />
      </div>
    </div>
    <div class="cursor">                          <!-- one cursor for the stack -->
  </div>
</div>
```

### 3.2 CSS
```css
.rule-viewport { position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; }
.rule-stack    { position: relative; }
.rule-canvas   { position: relative; overflow: hidden; user-select: none; touch-action: none; }
.section       { position: absolute; left: 0; }        /* top/height from FaceLayout */
.groove        { position: absolute; left: 0; height: 1px; }
```
`ResizeObserver` watches the **viewport** (not the canvas), so a wider canvas
cannot feed back into the width measurement.

### 3.3 Section rendering (`ScaleSection.vue` + renderer)

`ScaleSection.vue` mounts one empty `<svg class="section-svg" ref="svgEl" />` per
section; the drawing lives in `@slide-rule/renderer`. The component supplies the
Vue state (i18n titles, theme) and calls
`renderSection(root, { scales, section, layout, theme, titleOf })`, which sets the
millimetre `viewBox` and fills the band:
```typescript
renderSection(svgEl, { scales, section, layout, theme, titleOf })
// viewBox = sectionViewBox: 0 (topMm - bleedTopMm) faceWidthMm (heightMm + bleed)
// per row: line.tick (class level-1 | level-2 | level-3)
//          + text.numeral (angle-anchored when the row has co-labels)
//          + text.note (tspan parts; data-radicand for a measured vinculum)
//          + text.scale-name (left gutter)
// then the two line.guide tick-area boundaries
```
Display strings arrive through `titleOf`, so the renderer stays free of Vue,
Pinia and i18n. The framework-free `renderRuleToSVG(rule, { face, theme, titleOf })`
draws one whole face at 1:1 mm (width/height in `mm`) into a detached `<svg>` for
export and tests. Its sibling
`renderRuleSheetToSVG(rule, { faces, theme, titleOf, slideOffsetMm })` stacks the
visible faces at 1:1 mm on a white sheet; the middle band alone carries a
`translate(slideOffsetMm, 0)` when the offset is non-zero.

---

## 3.4 Single / dual face

`stores/slideRule.ts` holds `dualFace`:
- **single**: one canvas; the front/back switch is enabled.
- **dual**: both canvases stacked (front first); the switch is disabled.

A model may be **single-faced** (the Type 57): `sideHasScales` reports only the
front, so the store's `visibleSides` always contains that one face, the toolbar
disables the dual and back buttons, and the readings panel lists a single group.
`setModel` lands on a valid face and clears dual mode when the new model has one
face. Everything else (slide, cursors, hover, export) is unchanged - the cursor
overlay works over one canvas just as well as over two.

- **Horizontal alignment** comes for free: both faces share one `PhysicalSpec`,
  so `leftGutter` / `tickWidth` / `rightPanel` are identical.
- **Slide coupling**: `middleOffset` is one piece of state read by both faces, so
  dragging either face moves both.
- **Cursors**: a list of overlays on `.rule-stack` (`top:0;bottom:0`), so each
  line runs through both faces and the gap; both faces read the same cursor
  positions.
- **Face direction**: flipping about the long axis keeps left/right, so both
  faces are drawn the same way round (not mirrored).
- **Readings**: dual mode lists two groups (Front / Back) with small headings.

Verified: both canvases have identical height; the cursor's bounding box matches
`.rule-stack` exactly; dragging in dual mode gives the same `translateX` on both.

## 3.5 Print / 1:1 export

`renderRuleSheetToSVG(rule, { faces, theme, titleOf, slideOffsetMm })` builds one
standalone `<svg>` for print: its `viewBox` is `0 0 faceWidthMm totalHeightMm` and
its `width` / `height` carry `mm`, so the browser maps one user unit to one
millimetre. Each visible face is a `g.print-face` holding a white paper `<rect>`
(at the face size), the three section bands, and a thin `rect.sheet-frame`
outline in the theme's `gap` colour, in draw order (front first); faces are
stacked vertically with a `PRINT_FACE_GAP_MM = 4` gap (the same gap the SVG
export uses), and each face's middle band carries the slide offset as
`translate(slideOffsetMm, 0)` when it is non-zero. An empty face list yields a
zero-height sheet. The disc sheet draws the same `rect.sheet-frame` around each
square sheet.

`packages/simulator/src/utils/print.ts` drives the export:
- `buildPrintHTML({ svg, widthMm, heightMm, title })` wraps the serialized sheet
  in a standalone document whose `@page { size: <w>mm <h>mm; margin: 0 }` and zero
  body margins make the SVG's millimetres print 1:1; the title is HTML-escaped.
- `printSlideRule({ rule, faces, theme, slideOffsetMm, title, titleOf })` renders
  the sheet from the model (never scraped from the zoomed DOM), attaches it
  off-screen to measure radical vinculums (the document's fonts are awaited
  first), detaches it before serializing, then opens a fresh
  `window.open('', '_blank')` view that is written, focused and printed.
- `App.vue`'s `handlePrint` passes `visibleSides`, the current theme and the slide
  offset in millimetres
  (`middleOffset * (faceWidthMm - leftGutterMm - rightPanelMm)`).

**Fidelity**: the 1002 is 304.8 mm (12 in) wide, wider than A4 (210 mm) or Letter
(216 mm). Print at **100% scale** and use the custom page size (or larger paper);
the export never rescales to a paper preset, because that would break 1:1.

---

## 3.6 Circular rules

A rule with `form: "circular"` and a `disc` block is drawn as a disc instead of
stacked faces. The geometry is framework-free like the linear path, and the
graduations still come from the same `getScaleTicks` engine, so a circular
rule's values, levels and labels cannot drift from the model.

### 3.6.1 Disc layout (`renderer/src/layout/disc.ts`)
`computeDiscLayout(disc, counts)` returns the square sheet and the concentric
**scale rings**:
- The annulus `outerRadiusMm - innerRadiusMm` is split into **three equal
  bands**; `upper` is the outermost band, then `middle`, then `lower` innermost.
- A section's band is divided **equally among its scales**, so N scales in a
  section produce N sub-rings (outermost first). An empty section still reserves
  its third.
- Each `DiscScaleRing` carries its `innerRadiusMm` / `outerRadiusMm`, a
  `tickOuterMm` inset by 12% of the sub-band, and a `numeralRadiusMm` at
  inner + 28%. The numeral height is
  `max(1, min(band * 0.22, smallestSubBand * 0.5))` mm - capped so a glyph
  cannot overflow its ring.

### 3.6.2 Disc drawing (`renderer/src/draw/disc.ts`)
`renderDiscToSVG(rule, { face, theme, titleOf, rotationTurns })` draws one side
on a square SVG whose `viewBox` and `width` / `height` are the disc's
`sheetSizeMm` in millimetres (falling back to `physical.faceWidthMm`; a circular
rule without a `disc` draws nothing and does not throw). It draws the white
paper, a theme-background disc body, the outer **limit circle** (`circle.limit`),
the inner **pivot** circle (`circle.pivot`), a **groove** between the three bands
(`circle.disc-groove`, in the theme's `gap` colour, so the rotor's edge is
visible) and the scale rings:
- A graduation at position `p` is a **radial line at angle `2π·p`**, from
  `tickOuterMm` inward; its length is a fraction of the sub-band by level
  (0.50 / 0.40 / 0.32) and its width is the fixed 1.5 / 1.2 / 1 px
  (`non-scaling-stroke`). Because the angle is periodic, `p = 0` and `p = 1`
  coincide: **out-of-range positions wrap around the disc** rather than being
  dropped, and coincident graduations are deduplicated to one tick per physical
  point (a labelled in-range tick wins the seam). The printed numerals and
  names share the linear sheet's font.
- Numerals sit at `numeralRadiusMm` and are **rotated tangentially**
  (`rotate(p * 360)` about their own point); red scales use the theme's
  `scaleRed`.
- The scale name sits in its ring's blank band near the top (`position 0`), and
  is clamped so it cannot cross the limit circle.

`renderDiscSheetToSVG(rule, { faces, theme, titleOf, gapMm })` is the 1:1 print
analogue: it stacks the visible faces vertically as `g.disc-face` groups with the
linear sheet's `PRINT_FACE_GAP_MM` gap (re-exported as `DISC_FACE_GAP_MM`; `gapMm`
overrides it); an empty face list yields a zero-height sheet.

### 3.6.3 Ring convention
`faces.front` / `faces.back` are the **two sides of the disc**; each face's
`upper` / `middle` / `lower` arrays map to the **outer / middle / inner ring
groups**. This is a documented convention for the circular form and needs no
change to `ScaleSpec` or the schema.

### 3.6.4 Consumers
The designer preview (`DesignerPreview.vue`) and the 1:1 print path
(`utils/print.ts`) call `renderDiscSheetToSVG` for a `form: "circular"` rule that
has a `disc`; the print page is then `disc.sheetSizeMm` wide. A circular draft
whose `disc` is missing is invalid and shows the i18n'd
`designer.circularNotice` instead of a disc.

**Spiral (log-log) scales** remain later work, not part of this rendering path.

### 3.6.5 Circular interaction

The rotor is a **rotation, not rule data**: the designer preview and the 1:1
print keep calling the disc renderer without `rotationTurns`, so a static
surface always draws the printed alignment. The simulator's circular view
(`components/CircularRule.vue`) is the only caller that turns a ring.

- **Rotor rotation.** `renderDiscToSVG` / `renderDiscSheetToSVG` accept
  `rotationTurns?: Partial<Record<ScaleSection, number>>`. A ring in section `s`
  draws every tick, its numeral and the scale name at
  `tick.position + (rotationTurns[s] ?? 0)` turns, so the geometry is unchanged
  in shape and only its angle moves; `position 0` is 12 o'clock and turns grow
  clockwise. The view passes `{ middle: discOffset }`: a disc's `middle` band is
  the rotor and `upper` / `lower` are the fixed stator, matching the 5e ring
  convention (outermost / middle / innermost). Omitting the option is
  byte-compatible with the pre-rotor output.
- **Cursors.** The store's cursor list is reused unchanged, but
  `cursor.position` is a **turn fraction `[0, 1)`** rather than a tick position.
  The disc view overlays one radial line per cursor, from the inner to the outer
  radius, plus a handle chip in the cursor's colour; dragging the disc body turns
  the rotor (a drag suppresses the click), dragging a cursor's line or handle
  moves that cursor, and clicking the disc away from any cursor adds one at that
  angle. The angle under the pointer is `atan2(dx, -dy) / 2π mod 1` about the
  disc centre and turns are wrapped to `[0, 1)`.
- **Readings.** `components/CircularReadings.vue` shows one card per cursor with
  a row per scale, read through the same `readScaleValue` engine as the linear
  panel at `(cursor.position - (scale.isMovable ? discOffset : 0)) mod 1`; a
  value outside the scale's printed range is `null` (`-`). Editing a row inverts
  the value through `positionForValue` and adds the rotor offset back for a
  movable scale; the toolbar's reset-rotation button zeroes `discOffset` and
  leaves the cursors where they are.

### 3.7 Themes and the application chrome
A `Theme` (`renderer/src/themes.ts`) carries two palettes: `colors` for the rule
face (background, black/red scales, grooves, cursor, text) and `ui` for the
application chrome (page, surface, muted surface, border, text, muted text,
accent, accent text). The renderer only reads `colors`; the simulator maps `ui`
to CSS custom properties through `applyTheme` (`utils/theme.ts`), writing
`--ui-*` and `data-theme` on the document root, so the whole interface - page,
panels, controls and dialogs - follows the selected theme. `style.css` carries a
plastic fallback for the moment before the app mounts.

---

## 4. Slide drag

### 4.1 Transform
```vue
<div class="section middle" :style="{ transform: `translateX(${middleOffset * tickWidthPx}px)` }">
```
- `middleOffset` is normalized over the **tick area** (-1 .. 1; 1 = one scale length).
- `tickWidthPx = tickWidthMm * pxPerMm`.

### 4.2 Event handling
```typescript
const onMove = (ev: PointerEvent): void => {
  if (Math.abs(ev.clientX - startX) > 3) slideDragging = true
  const delta = (ev.clientX - startX) / tickWidthPx.value
  middleOffset.value = clamp(startOffset + delta, -1, 1)
}
```
Readings assume the same convention: `middlePos = cursorPosition - middleOffset`.

### 4.3 Slide appearance
The slide is an opaque strip (theme background) with two edge lines that move
with it, so its boundary is always visible.

---

## 5. Cursors

### 5.1 Structure
```vue
<div v-for="(cursor, index) in cursors" class="cursor" :style="{ left: cursorLeftPx(cursor.position) + 'px' }"
     @pointerdown="onCursorPointerDown($event, cursor.id)">
  <div class="cursor-handle top">
    <span class="cursor-badge">{{ index + 1 }}</span>   <!-- index chip -->
  </div>
  <div class="cursor-handle bottom" />
  <div v-if="dualFace" class="cursor-handle middle" />  <!-- at the face boundary -->
  <div class="cursor-line" />
</div>
```
Each cursor owns its own line and handle set. The top and bottom handles are
symmetric; in dual mode a larger middle handle sits at the centre of the gap
between the two faces. The chip on the top handle shows the 1-based index and
uses the theme cursor colour, so the readings panel blocks can be matched to
their lines.

### 5.2 Position
`cursorLeftPx(position) = (tickLeftMm + position * tickWidthMm) * pxPerMm`, i.e.
each cursor is normalized over the tick area.

### 5.3 Interaction
- **Drag a handle** to move that cursor; while dragging, the per-scale read-outs
  are shown at the cursor's position and hidden on pointer-up.
- **Click empty face** to add a new cursor at that position (up to 8). A click is
  suppressed if it follows a real slide drag (> 3 px) or lands within a few
  pixels of an existing cursor line.
- **Delete** a cursor from its block in the readings panel. The last remaining
  cursor cannot be deleted; it is cleared back to the default position instead.
- **Edit a reading** in the panel to move that cursor to the position that reads
  the typed value (`positionForValue`).

---

## 6. Hover readout

Moving the pointer over a face sets `hoverPos` (the normalized tick position under
the pointer). For **every visible scale**, `readScaleValue()` is evaluated at that
position and shown on **its own strip** with a dashed guide line. Clicking the
face **adds a cursor** there (a slide drag longer than 3 px suppresses the click).
While a cursor is dragged its position takes over `hoverPos` as the read-out
position and the read-outs are hidden on pointer-up.

---

## 7. Colours

### 7.1 Scale colours
Colours come from the active theme: `scaleBlack` for increasing, `scaleRed` for
decreasing scales.

### 7.2 Themes
Six themes live in `packages/renderer/src/themes.ts`; names come from i18n
(`theme.<id>`). The groove hairline uses the theme's text colour, so it stays
visible on dark themes (`contrast`, `blueprint`).

---

## 8. Responsive design

### 8.1 Container
```css
.rule-wrap { position: relative; flex: 1 1 720px; min-width: 0; }
```
- `SlideRule` observes the viewport width and derives the canvas size; the face
  height is always width / 6.
- No fixed `vh` height anywhere, otherwise the ratio would drift with the viewport.

### 8.2 Zoom / pan
Zoom lives in Pinia (1-6, step 0.25) and is edited with a slider plus a typeable
ratio field above it.
- The **only** zoom entry point is `pxPerMm`: ticks, fonts, grooves, section
  heights and drag maths all follow automatically.
- Panning is the viewport's native horizontal scroll; the canvas is
  `overflow: hidden` so the slide cannot widen the scroll range.
- Zoom keeps the visual centre: `scrollLeft` is rescaled by `next / prev`.
- At zoom 1 the viewport switches to `overflow-x: hidden` (no stray scrollbar).
- `html { scrollbar-gutter: stable }` keeps the layout from oscillating when a
  vertical scrollbar appears at intermediate zoom.

### 8.3 Mobile (incomplete)
- Pointer events already unify mouse and touch.
- Cursor handles grow on small screens.
- `touch-action: none` currently prevents touch panning.

---

## 9. Performance

### 9.1 Avoiding overdraw
- Every scale carries a `calc` and draws only its measured graduations; there is
  no placeholder / tint-band path.
- The measured interval table bounds the number of ticks per scale.

### 9.2 GPU hints
```css
.section.middle { transform: translateX(0); }
```

---

## 10. Accessibility

- `<main>` / `<header>` / `<h1>` semantics.
- Keyboard support and ARIA attributes are still to be added.

---

*Version: v3.3*
*Created: 2025-01*
*Last revised: 2026-09 - renderer package (framework-free drawing); English
translation; millimetre coordinates, scaling, gradation levels, dual face,
cursor and hover; the 1:1 print export; circular rules (`computeDiscLayout`,
`renderDiscToSVG` / `renderDiscSheetToSVG`: concentric rings, wrapped radial
ticks, tangential numerals, limit circle and pivot) and their interaction (the
`rotationTurns` rotor, radial cursors and the circular readings panel)*
