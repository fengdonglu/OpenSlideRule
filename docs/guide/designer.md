# Designer

The designer builds a rule and previews it through the same renderer the
simulator uses. It is a full-page view inside the same application bar. For the
schema behind the form see the [data model](../dev/data-model.md); for the
rendering, sliding and reading behaviour the preview shares see the
[Simulator](simulator.md).

![The designer previewing a circular C/D rule](../assets/sliderule-designer-circular-en.png)

## Opening and closing

Use the **Designer** button in the application bar's Simulator / Designer switch
to open it, and **Simulator** to return. The bar's application functions (theme,
language, export, help, display scale) are the same on both screens. The
designer replaces the simulator's tools with authoring controls, in this order:
**New** (a file icon), **Import** (a tray icon), the **New / load** menu (a
dropdown of built-in models and starter templates) and **Clear draft** (a bin
icon). Each icon button carries its name as a tooltip. The bar's **Export** menu
prints the current draft as well as exporting JSON.

When you leave the designer, its work is kept as a draft. The next time you open
it the draft is restored automatically and a **Restored your previous draft**
note is shown. **Clear draft** discards the draft and starts from an empty rule.
Every edit is saved to the draft as you make it.

## Starting a rule

**New / load** is a single menu with two groups. **Built-in models** copies a
shipped model (the 1002 or the Type 57) into the editor, so you can study or
adapt it; **Templates** loads a minimal starting point (the **Linear log rule
(C/D/L)** or the **Circular C/D rule**). **New** starts an empty linear rule (id
`new-rule`, one empty face structure).

The two starter templates are deliberately small:

- **Linear log rule (C/D/L)** - a straight rule with one row per section: an
  `A` scale on the upper row, `C` on the slide and `D` plus the linear `L` on
  the lower row.
- **Circular C/D rule** - a `form: "circular"` rule with `C` on the slide and
  `D` on the lower section of the disc.

## The form

The preview fills the left side, matching the simulator (rule left, readings
right); the form is on the right, split into two columns.

- The **first column** is always visible and holds the **Rule** and **Layout**
  panels.
- The **second column** appears to its right as soon as you select or add a
  scale, and holds that scale's **Scale fields** and **Calculation** panels.
  With no scale selected only the first column is shown, and the **Layout**
  panel ends with the hint **Select a scale**.

The **«** control at the top-left of the **Rule** panel hides the whole form to
give the preview the full width; a **»** button then appears at the preview's
top right to bring the form back. The same rule tools stay in the application
bar either way.

### Rule

The **Rule** panel holds the model metadata and dimensions.

- **id** - the rule's identifier. It is written into the JSON and forms the
  export file names (`<id>.spec.json`, `<id>.rule.json`). It is not printed on
  the rule.
- **Name** - the rule's display name. It is the title used when the draft is
  printed, and the name the simulator lists an imported rule under.
- **Form** - **Straight** or **Circular disc**. Straight is a rectangular rule
  with a sliding middle section; Circular disc is a concentric-disc rule.

Switching the form changes which dimensions are shown. Selecting **Circular
disc** from Straight creates a default disc if the rule had none; switching back
to **Straight** removes the disc and shows the linear physical fields again.

#### Straight-rule dimensions

These fields are shown while **Form** is **Straight**. All lengths are
millimetres; the ratio fields are fractions of a row height. The defaults below
are the 1002's (the 12in x 2in rule).

| Field | Unit | Meaning | What changing it does |
|---|---|---|---|
| **Face width** | mm | The long edge of the face | How much horizontal room the scales are drawn across (304.8 mm on the 1002) |
| **Face height** | mm | The short edge of the face | Total vertical room for every row (50.8 mm on the 1002) |
| **Upper rows** | count | Scale rows in the upper band | How many scales the upper section can hold |
| **Middle rows** | count | Scale rows in the middle band | How many scales the slide (the movable middle section) can hold |
| **Lower rows** | count | Scale rows in the lower band | How many scales the lower section can hold |
| **Left gutter** | mm | The left name column | Room for the scale names printed at the left of every face |
| **Right panel** | mm | The right reference column | Room for the read-off notes printed at the right of the face |
| **Groove ratio** | ratio | Groove height / row height | The gap between sections |
| **Margin ratio** | ratio | Margin / row height | The vertical margin inside a row |
| **Numeral ratio** | ratio | Numeral height / row height | The printed size of the numbers |

The row counts decide how many scales fit, not how tall they are: the face
height is shared between the counted rows (less the grooves and margins), so
raising a row count makes every row shorter and lowering it makes them taller.

#### Circular-disc dimensions

These fields are shown while **Form** is **Circular disc**. All are
millimetres.

| Field | Meaning |
|---|---|
| **Outer radius** | The disc's outer edge (the limit circle the scales are drawn within) |
| **Inner radius** | The central hole / pivot boss |
| **Sheet side** | The side of the square sheet the disc is printed on |

The three values must agree: the outer radius must be positive, the inner
radius between 0 (inclusive) and the outer radius, and the sheet side at least
twice the outer radius, so the whole disc fits on the sheet.

### Layout

The **Layout** panel lists the scales for each **Front** and **Back** face, split
into the three bands of the rule: **Upper scale**, **Slide** and **Lower scale**.
The **Slide** is the movable middle band.

Every scale is numbered within its section, and its row reads
`index. id · name`.

- A **+** beside a section heading adds a C scale. It is inserted just after the
  selected scale when that scale is in the same face and section, and appended
  otherwise; the new scale becomes the selection. A new scale starts as `C`
  with a log 1..10 calculation and one interval.
- Click a scale row to select it. The selected row reveals **Move up**,
  **Move down** and a red **✕** remove button. Moving a scale swaps it with its
  neighbour in the same section; removing it clears the selection.
- You can also select a scale by clicking it in the preview; hovering a scale in
  the preview highlights it, and clicking outside the rule face clears the
  selection. The list and the preview stay in step.

### Scale fields

When a scale is selected, the **Scale fields** panel edits the parts of the
scale that are not its calculation:

- **Scale id** and **Scale name** - the two halves of the layout row. The id is
  the schema identifier; a new or duplicated scale is given a unique id within
  its section. The name is the label shown in the simulator's readings and model
  information.
- **Type** - the conventional scale type from the list the renderer knows (`C`,
  `D`, `A`, `B`, `K`, `L`, `CF`, `DF`, `CI`, `DI`, the `LN` / `H` / `SH` / `TH`
  families, the trig types such as `SIN2` / `COS2` / `TG2` / `CTG2`, and the
  Type 57 `S` / `ST` / `T`). It identifies the scale's family; the graduation and
  reading behaviour comes from the calculation below.
- **Orientation** - **Increasing** or **Decreasing (red)**. An increasing scale
  grows left to right and is printed black; a decreasing scale falls left to
  right and is printed red. The colour is derived from the orientation, never set
  directly, and a shared label's colour follows its own orientation the same
  way.
- **Numbers below the ticks** - print the numbers below the graduations instead
  of above them.
- **Tick edge** - what a scale does when it shares a baseline with its neighbour:
  **None** draws as usual, **Roof (top)** hangs the graduations from the top edge
  of the row, and **Floor (bottom)** raises them from the bottom edge. It is used
  by a pair of adjacent scales that share one line: on the 1002 the `sh2` row is
  floored and its neighbour `sh3` is roofed (likewise `tg2` and `tg3`), so their
  graduations meet on the line between them.
- **Shared labels** - extra bracketed labels printed on the same graduations as
  the scale (for example the red `cos2` / `ctg2` co-angle numbers). Each has an
  id, a name, its own orientation (and therefore its own colour) and an **Angle
  format**: **None**, **With degree sign** or **Bare number**. A shared label has
  no calculation of its own; it reuses the scale's graduations.
- **Notes** - the right-hand read-off notes. A note is a list of parts, each a
  text run with an optional **Red** flag, so a note can mix black and red words.
  A note with one black part is stored as a simple string. Add or remove whole
  notes and individual parts.
- **Duplicate scale** - copy the selected scale and insert the copy just after
  it, with a unique id. The selection stays on the original.

### Calculation

The **Calculation** panel controls how the selected scale is graduated and read.
Every field here belongs to the scale's calculation, not to the scale itself.

- **Seed from a preset** - replace the whole calculation with a coarse one for
  the chosen mapping kind: **log**, **linear**, **fn**, **valueFn** or **expr**.
  The current domain is kept; everything else (mapping fields, intervals, labels,
  marks, reading and label format) is replaced by the preset. It is a starting
  point, not a graduation, so you refine the intervals afterwards.
- **Domain** - **Min** and **Max**, the value range the scale covers (1..10 for
  C/D, 5.5..90 for sin2, and so on).

#### Mapping kind

The mapping is the formula that turns a value into a position on the rule. The
kinds and their fields are:

| `kind` | Fields | How a value becomes a position |
|---|---|---|
| **log** | **Anchor**, **Normalize** | `position = log10(value / anchor)`. The anchor moves the origin, so a folded scale can extend left of its start; **Normalize** rescales the span to 0..1. |
| **linear** | (none) | Proportional across the domain - the `L` / `lg` rows. |
| **fn** | **Function** (`ln`, `sin`, `tan`, `sinh`, `tanh`), **From** | `position = log10(fn(value) / from)`. The function is applied to the value first; `From` is the reference the result is divided by. |
| **valueFn** | **Function** (`cosh`, `sech`), **From** | The graduations are labelled with the printed `cosh` / `sech` value `V`, but the position uses the underlying argument: `log10(sqrt(V² − 1) / from)` for `cosh`, `log10(sqrt(1 − V²) / from)` for `sech`. This is the `H2` / `H3` (cosh) and `H'2` (sech) rows. |
| **expr** | **Forward expression position(x)**, **Inverse expression inverse(p)** | `position` is the forward formula `p = f(x)` and is required; `inverse` is the optional `x = g(p)`. Strings only. When the inverse is left empty the loader inverts the forward mapping numerically over the domain. The safe expression language is documented in [Expressions](../dev/expressions.md). |

Changing the mapping kind resets the mapping to that kind's defaults and drops
the fields that belonged to the old kind; the domain, intervals, labels and
marks are untouched. For example, switching to **expr** starts with
`log10(x)`.

- **Decades** - how many times the interval pattern repeats, each time ten times
  further along (the tenth power). One interval `1..10` with **Decades** `2`
  graduates 1..10 and 10..100. The 1002's `K` uses 3 and `A` / `B` use 2; leave
  it empty for a single decade.
- **Mirror (decreasing)** - mirror the graduations so values fall left to right.
  Set it together with **Orientation: Decreasing (red)** for a conventional
  decreasing scale such as `CI` or `DI`. The two controls are separate: the
  orientation decides the colour, the mirror decides the geometry.
- **Read** - how a value is read off the scale. **Direct** (the empty default)
  uses the mapping's own inverse. **Reciprocal** reads `n / value` instead, with
  the factor **n**; the mirrored `ln*I` family uses 1 and `CIF` uses 10. Reading
  always uses the same mapping as the graduations, so the two can never disagree.

#### Label format

**Label format** controls the text of the printed numbers; it does not move any
graduation. The options are:

| Option | Printed style |
|---|---|
| **Default** | Whole numbers bare, otherwise up to two decimals with no leading zero (`5.5`, `.5`) |
| **Folded (CF/DF)** | Folded rows drop the tens digit (`10` -> `1`, `33` -> `3.3`) |
| **Linear fraction (L)** | Fraction style on the linear `L` / `lg` rows (`0` / `1`, `.1` .. `.9`) |
| **With degree sign** | An angle with the degree sign (`5.5°`) |
| **Bare angle** | A bare angle with no sign (the Type 57 `S` / `T`) |
| **Degree + minute** | Degrees and minutes (the Type 57 `ST`: `35'`, `1°30'`, `2°`) |
| **Argument (sh/th)** | Three decimals below 0.1, two below 1, one above (`.095`, `.1`, `1.5`) |
| **sech zero (.0)** | `.0` at zero, otherwise three decimals (the `H'2` row) |
| **Fixed decimals** | At most the number of decimal places set in the **Decimals** box that appears beside it, with the leading zero omitted |

- **Label level** - how each printed label is treated as a graduation. The empty
  default treats every label as a major (level 1) tick; **1**, **2** or **3**
  force that level; **Keep measured level** leaves each label at the level its
  interval grid gave it. The `sh2`, `sh3` and `th2` rows use **Keep measured
  level**.

#### Intervals

An interval is one measured stretch of the graduation grid; the scale's total
grid is the list of them.

- **From** / **To** - the value bounds of the stretch.
- **Steps** - each step is a size and a **level** (1 = major, 2 = medium, 3 =
  fine). The engine sorts a step's sizes and draws the finest first; where a
  coarser step lands on a tick of a finer one, the coarser level wins, which is
  how the major ticks appear inside a fine grid. Add or remove steps.
- **Interval labels** - extra numbers printed inside the interval, each entered
  as a value. They add printed labels without adding a step.

Add a new interval with **Add interval**; a new interval starts at the current
domain with a single unit step.

#### Labels and marks

- **Labels** - a printed number. Enter a **Value** and, optionally, a **Text**;
  a bare number is printed as it is, and adding text prints the text instead.
  Clearing the text returns the entry to a plain number.
- **Marks** - an extra labelled point that need not sit on the graduation grid.
  Each mark has a **Value** and a **Label**; tick **Infinity ∞** to place it at
  the asymptote instead of a number (the end of `th2`). Labels and marks extend
  the scale's printed range, so a value placed just past the mapped domain
  remains readable.

#### Shared calculations

A calculation can be factored out of a scale into a named entry and shared by
several scales. In the JSON this is `spec.calculations: { "<name>": { ... } }`,
and a scale points at it with `"calculation": { "ref": "<name>" }`; the
generator inlines the refs when it builds the finished rule. When you select a
scale whose calculation is a named reference, the **Calculation** panel says
so: **This calculation is the named ref `<name>`; edits affect every scale
sharing it.** Every edit you make then writes to the shared calculation, so all
of the scales that point at it change together. If a scale points at a reference
that does not exist, the panel reports that instead.

The built-in models and the starter templates carry their calculations inline,
so they do not share; a spec authored with the generator library can.

## The live preview

The **Preview** on the left is redrawn from the current spec as you edit, and it
uses the same renderer as the simulator, so the preview and the simulator agree.
The bar's **display scale** control (a numbered box over a slider, the second
control after **Export**) scales the preview as it scales the simulator's rule.

The designer keeps its own chrome fixed - the top bar, the form and the status
bar never move - and only the preview scrolls, inside its own area. So a preview
that is taller than the screen (a large disc, or a zoom in) is scrolled on its
own without losing the form or the status bar.

Clicking a scale in the preview selects it, exactly as clicking its row in the
list does; hovering highlights it, and clicking outside the rule face clears the
selection.

If an edit makes the spec invalid, the preview keeps showing the last valid rule
and a note reads **Preview shows the last valid rule; the current spec does not
validate**. Fix the reported errors to resume live updates. A circular rule
without a disc definition shows a notice instead of a preview.

## Validation status

A status bar sits under the preview showing **Status** followed by either
**Valid** or a button reading **N validation errors**. Selecting the error button
expands the list, where each entry gives its path, an error code and a message;
the offending field is outlined in the form. The status bar is also where the
**Restored your previous draft** note appears.

## Exporting

The **Export** menu in the designer has two JSON entries plus a print entry, and
all three are disabled while the spec does not validate:

- **Export draft** writes `<id>.spec.json`. This is the authoring spec, not a
  finished rule, and it is the file to re-import later to keep editing.
- **Export rule definition** writes `<id>.rule.json`. This is the validated
  `RuleDefinition` that the simulator and the generator consume.
- **Print / PDF** prints the current draft at 1:1 through the simulator's print
  path (the rule's own millimetres), so a design can be proof-printed on paper.

## Importing

**Import** reads either an authoring spec or a finished rule definition back
into the editor. A file carrying `schemaVersion` is treated as a finished rule
definition and adapted; any other JSON object is treated as an authoring spec.
The file is written into the form; it is validated by the same status bar as any
other edit, and a JSON syntax error or a non-object file is reported in a banner
above the form.

To load a finished rule into the simulator instead, see
[Import and export](import-export.md).

## Worked example: reformat one scale

This walks through the abstract fields with a small, visible change.

1. Open **New / load** and choose **Built-in models -> 1002 Vector Log-Log
   Double-Sided Slide Rule**. The whole model is copied into the editor; the
   preview redraws both faces that have scales.
2. In **Layout**, open the **Front** face and the **Slide** section and click
   the row reading `6. C · C`. The row highlights and the second column appears
   with **Scale fields** and **Calculation**. (The preview highlights a scale on
   hover, and clicking a scale in the preview selects it too.)
3. In **Calculation**, find **Label format** and change it from **Default** to
   **With degree sign**. The preview's `C` numbers change from `1`, `1.1` ...
   `10` to `1°`, `1.1°` ... `10°`. The graduations, the `π` mark and every other
   scale are unchanged: a label format only rewrites the printed text.
4. Change **Label format** back to **Default** to restore it.

Because the shipped model's scales carry their calculations inline, only this
`C` scale changed. If the scale had used a named calculation reference, step 3
would have rewritten the format for every scale sharing it.
