# Reading Scales

A slide rule does not calculate an answer for you; it shows values by position.
The simulator follows the same idea: nothing is solved on a keypad, and every
number comes from where a scale sits under a cursor. This page explains how the
app produces a reading. The theory of the instrument is in
[How slide rules work](../domain/slide-rule-101.md), and the scales of the 1002
are in the [1002 model](../domain/model-1002.md).

## Scales and positions

Each printed band is a scale. A scale has a mapping from a value to a position
along the rule, and that mapping is what draws its graduations. **C** (on the
slide) and **D** (on the body) are the reference scales: most other scales are
graduated, placed or read against them, so a position is usually described in
C/D decade units, where 0 is C = 1 and 1 is C = 10. A scale read against C/D may
run past either end and still be correct for the values it is used with; the
1002 model documents these relations, and x-to-y notes printed at the right of a
scale tell you which decade to read it on.

Red scales run decreasing, right to left - for example the reciprocals CI and DI.
On the 1002, red normally means decreasing.

## Two ways to read

The application offers a transient read-out and a fixed reading:

- **Hover read-out.** Rest the pointer on the face. A dashed guide line follows
  it, and each scale row shows a small box with the scale's name and its value at
  that position. This is for exploring: run along the rule and watch the values.
- **Cursor readings.** A cursor is a fixed line. Its card in the readings panel
  lists every scale at that cursor, and a click or drag can place it precisely.

Both are produced from the same mapping that draws the graduations. A graduation
and its reading therefore cannot disagree: the reader inverts the mapping the
graduation was drawn with. On the slide and on a circular rotor, a reading takes
the current offset into account, so a movable scale reads at the position it
actually occupies.

## Why the read-out spans the whole face

The read-out is taken over the full face rather than only the 0-1 span of C/D.
Scales such as the trig, hyperbolic and log-log rows are graduated in C/D decade
units and can stick out past C/D's ends, into the left gutter or the right note
panel. Reading the whole face keeps those graduations readable, while each scale
returns no value outside its own domain.

## Reading in practice

- Align the slide, or turn the rotor, so the scales you need are in the relation
  you want; then read the value of one scale against another at a cursor.
- Use the hover read-out to find the position you want, then click to drop a
  cursor there and read all the scales at once.
- Type a known value into a cursor reading to move the cursor to its position,
  which is quicker than dragging for a precise setting.
- A slide rule gives roughly three to four significant figures, and the decimal
  point is not shown: the rule reads `2`, but you decide whether the answer is
  2, 20 or 0.2. See
  [Reading accuracy](../domain/slide-rule-101.md#4-reading-accuracy).

For which scales appear on each face and where, see the scale distribution in the
[1002 model](../domain/model-1002.md#3-scales); the [glossary](../glossary.md)
defines the terms used here.
