# Import and Export

This page covers loading a rule into the simulator and getting the current view
out of it. The designer has its own spec and definition exports; those are
described in [Designer](designer.md).

## Importing a rule

Use either of these:

- Press **Import** in the simulator's tools, pick
  a `.json` file, and confirm.
- Drag a `.json` file from your file manager and drop it onto the simulator view.

The file must be a `RuleDefinition` - the same shape the designer's **Export rule
definition** and the generator produce. Linear and circular rules are both
accepted. A successful import makes the rule the active model, adds it to the
model selector under its own name, and resets the slide and cursors.

A failed import leaves the current model untouched and opens a dialog headed
**Could not load the rule**:

- A **JSON syntax error** shows the parser's message.
- A rule that parses but does not validate shows **Validation errors**, listing
  each failure as `path: code: message`.

Close the dialog and either fix the file or try another one.

## Exporting

The **Export** menu in the application bar applies to the simulator. It offers
four entries.

### Export as PNG

Saves `sliderule-1002.png`, a raster snapshot of the current on-screen rule
container at twice the screen resolution. Use it when you want an image to share
or paste elsewhere; it shows exactly what is on screen, including the slide
position, the cursor lines and the current theme.

### Export as SVG

Saves a vector drawing of the visible face(s). A linear rule is written as
`sliderule-1002.svg`, with the visible faces stacked, the slide offset applied
and a white background; a circular rule is written as `sliderule-circular.svg`
from the renderer's own disc geometry. Use the SVG when you need a scalable
drawing, for example to edit or to print at an arbitrary size without pixelation.

### Export as Markdown

Saves `sliderule-operations.md`, the recorded operation log as a numbered list
under a title and an export timestamp. The simulator records the operations as
you perform them - switching model, face or single/dual view, resetting the
slide or rotor, adding or removing a cursor, loading a rule, and changing the
theme - so the file is a record of the session rather than a calculation result.

### Print / PDF

Opens a new window containing a 1:1 sheet of the current rule, then the browser's
print dialog. The page is set to the rule's own size in millimetres, so printing
or choosing **Save as PDF** produces the rule at its true physical scale. This is
the option to use when you want a physical-size copy rather than a screen image.
Allow pop-ups for the app, since the print window is opened before rendering.
