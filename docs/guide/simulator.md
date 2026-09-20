# Simulator

The simulator is the default view. It shows one face or both faces of a rule and
lets you slide, rotate, zoom, place cursors and read every scale.

## Choosing a model

The selector on the left of the application bar is both the page title and the
model picker:

- **1002 Vector Log-Log Double-Sided Slide Rule** - the full-size double-sided
  rule, 14 scales per face.
- **Type 57 Pocket Slide Rule** - the single-faced pocket rule.
- **Imported rule** - appears only after you have imported a rule JSON; it is
  listed under the name carried by the file. See
  [Import and export](import-export.md).

The count beside the selector is the total number of scales on the model.
Switching models resets the slide, the cursors and the displayed face.

## Faces

- **Both faces** stacks the two faces on top of each other, each with a small
  label band. The faces share one slide position, and a cursor line runs through
  both, so the graduations line up and the readings agree.
- **Single** shows one face; use **Front** / **Back** to choose which.

The Type 57 is single-faced, so **Both faces** and **Back** are disabled for it,
and the hint line notes that the model has no back.

## Dragging the slide

The middle band is the slide. Press anywhere on it and drag left or right; the
cursor changes to a grabbing hand. The slide can travel up to one full scale
length in either direction, which is what lets either index reach any value on
the body scale. The **Reset slide** button returns the slide to the aligned
position and is disabled while it is already there.

## Zoom

The zoom control sits in the middle of the application bar and runs from **1X**
to **6X**:

- **minus** and **plus** step by 0.25.
- The number box is editable; type a ratio and confirm.
- The slider behind it drags continuously.

At 1X the rule fits the viewport width exactly. Above 1X the view scrolls
sideways so you can inspect the graduations; zooming keeps the point under the
centre of the viewport in place.

## Cursors

Cursors are the vertical lines that cross every scale.

- **Add**: click an empty part of the face. Up to eight cursors are allowed;
  further clicks are ignored.
- **Move**: drag a cursor's handle or line. A click within a few pixels of an
  existing cursor is treated as a hit and does nothing, so only dragging moves a
  cursor.
- **Remove**: use the small **✕** on the cursor's reading card. It appears when
  the pointer is over the card or when it has keyboard focus. Removing the last
  cursor leaves the rule with no cursor line; click the face to add one again.

The first cursor uses the theme's cursor colour. Each additional cursor gets a
colour from a fixed palette and carries its number on the top handle, matching
the number on its reading card.

## Hover read-out

Rest the pointer on the face without clicking. A dashed guide line follows the
pointer, and every scale on the visible face shows a small box with its name and
the value under the guide. The read-out covers the whole face, not just the 0-1
span of C/D, so scales whose graduations run past the ends of C/D remain
readable. Moving the pointer off the face clears the read-out.

## The readings panel

The panel on the right holds one card per cursor, framed in that cursor's colour.
Each card lists every scale on the visible face(s) in the order they appear on
the rule, and every row sits at the height of the scale it reads. A **Front** or
**Back** label appears in dual-face mode.

- A reading can be edited. Type a value and press Enter (or move focus away); the
  cursor moves to the position that reads that value. Input that is out of range
  or cannot be read on that scale snaps back to the displayed value.
- A movable scale (the slide, or the rotor of a circular rule) gets a **second
  box** beside its reading, in the accent colour with a dashed underline. Type a
  value there and press Enter to move the **slide** so the scale reads it at the
  cursor; the cursor stays put. This is the precise way to set the slide: pick a
  scale that is on the slide, type the value you want it to read, and the slide
  moves to match. The travel is limited to one scale length, like dragging it.
- Readings that the scale does not define at the cursor's position are shown as
  a dash and are not editable.
- Movable scales account for the current offset, so a typed value still lands
  correctly.
- The panel widens with the number of cursors; when there are more cards than
  fit, the cards scroll sideways.

## Circular rules

A circular rule replaces the slide with a rotating rotor:

- **Turn the rotor**: drag the disc body. The press must travel a few pixels
  before it counts as a drag, so a click does not nudge the disc.
- **Cursors**: click the disc to add a radial cursor line at that angle, and drag
  a line or its round handle to move it. The same colour, numbering and card
  behaviour as the linear view applies.
- **Readings**: the panel is headed **Readings** and each card lists the scales
  on the visible face. Typing a value turns the cursor to the angle that reads
  it, taking the rotor offset into account.
- **Reset rotation**: the button in the readings panel and the reset button in
  the application bar return the rotor to its printed alignment.

A two-faced circular rule opens dual like a linear one, with the two discs
stacked vertically; **Single** shows one disc and keeps the **Front** / **Back**
switch available.

## Keyboard nudge

The arrows can move the rule without the mouse. It is **on by default**; switch
it off with the left/right-arrow button in the toolbar, beside **Import**, if it
would clash with other shortcuts.

- **← / →** move the slide by a small step.
- **Shift + ← / →** move the last cursor.

While it is on, the footer hint line shows the shortcut. Keystrokes are ignored
while a text or number field has focus, so typing is never intercepted.

## Themes

The **Theme** button opens a grid of six themes: White Plastic, Vintage Bamboo,
High Contrast, Aluminium, Ivory and Engineering Blueprint. A theme restyles both
the rule face and the surrounding interface, so the whole page changes together.

## Language

The **Language** selector switches the interface between 简体中文 (zh-CN) and
English (en-US). The choice is remembered, and on a first visit the app follows
your browser language, using Simplified Chinese only for Chinese locales.

## Help

The **?** button opens the model-information dialog. It lists the current
model's face size, row counts, total scales and single- or double-sided type,
then every scale grouped by face and part, with a short description and any
printed read-off notes. The dialog also contains the **Open quick-start
tutorial** button, which replays the six-step tour.
