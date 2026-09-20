# Glossary

> Shared terminology for the project. "Scale" always means a readable scale band
> (C, D, A, ...); "graduation" means the tick marks and numbers printed on a
> scale. The two words are never used interchangeably.

## This project's terminology

These are **project conventions**, not general slide-rule usage; they are not
used in `docs/domain/`.

- **标尺 (scale) = 刻尺 + 标注.** A scale band has two parts: the **刻尺**
  (the graduated ticks, i.e. the graduations) and the **标注** (the printed
  labels and reference notes). "标尺" names the whole band; 刻尺 and 标注 name
  its parts. In the data model the 刻尺 is `calculation.intervals` (the ticks)
  and the 标注 is `labels` / `notes` / `marks`.

| Term | Chinese | Definition | Usage |
|---|---|---|---|
| Slide rule | 计算尺 | Mechanical analogue calculator using logarithmic scales | This project simulates one |
| Front side | 正面 | The primary face | Switchable with the back |
| Back side | 背面 | The reverse face | Switchable with the front |
| Upper scale | 上尺 | Fixed scale band above the slide | |
| Slide | 动尺 | The movable middle band of scales | Dragged horizontally |
| Lower scale | 下尺 | Fixed scale band below the slide | |
| Upper groove | 上缝 | Slot between the upper scale and the slide | Visual / interaction separator |
| Lower groove | 下缝 | Slot between the slide and the lower scale | Visual / interaction separator |
| Scale | 标尺 | A readable scale band (C, D, A, B, ...) | "Strip" is never used in docs or UI |
| Graduation / tick | 刻度 | A tick line or printed number on a scale | Not to be confused with "scale" |
| Orientation | 方向 | How values change along a scale | increasing = black, decreasing = red by default (a `red` override is possible) |
| Red scale | 红色标尺 | A scale printed in red | On the 1002 this means decreasing; the 57's increasing T is also red |
| Shared graduations | 共享刻度 | Several scales sharing one set of ticks | Written `sin2(cos2)` - own labels, shared ticks |
| Cursor | 游标 | Transparent slider with reference lines | Slides along the rule |
| Cursor line | 准线 / 发线 | A hairline on the cursor for aligning readings | A cursor normally has **several** hairlines (the Type 57's has three); a single-line cursor is the exception |
| Model 1002 | 1002 型号 | The vector log-log double-sided slide rule | First model implemented: 28 scales |
| Model 57 | 五七型 | The Type 57 pocket slide rule | Second model: single face, 9 scales; verified against sale photographs |
| Folded scale | 折叠标尺 | A scale folded at a point (here sqrt(10)) | CF / DF |
| Reciprocal scale | 倒数标尺 | Reciprocal of another scale (CI of C, DI of D) | Usually decreasing |
| lg scale | lg 标尺 | Common-log (log10) linear scale | Reads log10(x) |
| ln scales | ln1/ln2/ln3 | Log-log segments graduated in the argument x | Used for arbitrary powers |
| C/D | C/D 标尺 | The core logarithmic scales | C on the slide, D on the body |
| A/B | A/B 标尺 | Square / square-root scales | Two decades |
| K | K 标尺 | Cube / cube-root scale | Three decades (1-1000) |
| CF/DF | CF/DF 标尺 | Folded C/D | Extends range, fewer index swaps |
| CI/DI | CI/DI 标尺 | Reciprocals of C/D | Division and inverse ratios |
| CIF | CIF 标尺 | Reciprocal of CF | Reciprocal pair with CF |
| Trig scales | sin2, cos2, tg2, ctg2, tg3, ctg3 | Sine / cosine / tangent / cotangent by angle | Degrees; co-angle labels |
| Type 57 trig scales | S, ST, T | Pocket-rule sine / small-angle / tangent scales | Read on C/D; T is increasing but red |
| Hyperbolic scales | H2, H'2, H3, sh2, sh3, th2 | cosh / sech and sinh / tanh | sh2/sh3/th2 are graduated in the argument x and read on C/D |

## Data and rendering

| Term | Definition | Notes |
|---|---|---|
| Scale definition | The data structure for one scale | `ScaleDefinition` |
| Side | `front` / `back` | |
| Section | `upper` / `middle` / `lower` | |
| mm coordinate system | All geometry in millimetres | Screen pixels derive from `pxPerMm` |
| Tick area | Horizontal range of the graduations | face width minus both panels |
| Bleed | How far a section may draw into a groove | So ticks reach the slot line |
| Layered rendering | Body bands / sections / grooves / cursor | Clear structure, cheap to update |

## Interaction

| Term | Definition | Notes |
|---|---|---|
| Slide drag | Dragging the middle band to align scales | Horizontal |
| Cross-scale reading | Aligning and comparing values across scales | Uses the cursor |
| Hover readout | Reading every scale at the pointer position | One readout per strip |
| Zoom | Scaling the whole face | 1X-6X; the only factor is `pxPerMm` |

## Process

| Term | Definition | Notes |
|---|---|---|
| SemVer | major.minor.patch versioning | Breaking changes bump major |
| Conventional Commits | Commit message convention | **English only** |
| English docs | Every document is written in English | Chinese originals live in `*-cn.md` |
| Changelog | Release notes | `CHANGELOG.md` |
| Roadmap | Milestones and releases | `docs/roadmap.md` |

## Rules
- "Scale" = 标尺; "strip" is not used in documentation or UI.
- "Graduation" means the ticks/numbers on a scale, never the scale itself.
- Colour semantics are model-specific: on the 1002 red means decreasing, while
  the 57's increasing `T` is also printed red (a `red` override on the scale).
- Shared graduations are written with brackets: `sin2(cos2)`.
- **All documentation and commit messages are in English.**
