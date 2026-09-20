# Getting Started

SlideRule 1002 is a web simulator of the Chinese 1002 vector log-log
double-sided slide rule (1002 型矢量重对数双面计算尺), with a visual designer
for building new rules in the same page. Values are obtained the way they are on
the physical rule: by sliding and aligning, then reading the scales under a
cursor, not by typing a sum into a calculator. The simulator ships with the
1002, the single-faced Type 57 pocket rule, and any rule JSON you import.

![The simulator showing both faces of the 1002](../assets/sliderule-1002-en.png)

## Run it locally

Node.js 20.19.4 or newer is required.

```bash
npm install
npm run dev
```

Vite opens <http://localhost:3000> for you. A GitHub Pages deployment is defined
in `.github/workflows/deploy.yml`; pushing to `master` or `main` builds and
publishes the site.

## The layout

The whole application shares one application bar:

- **Left (the model selector).** The current model's name doubles as the page
  title. Open it to switch between the 1002, the Type 57 and an imported rule.
  The number next to it is the scale count for that model.
- **Middle (rule tools).** The view switch (**Both faces** / **Single**), the
  face switch (**Front** / **Back**), the **Reset slide** button, the zoom
  control (**1X**-6X), and the **Import** button.
- **Right (application functions).** These are the same in the simulator and the
  designer: the **Theme** selector, the **Language** selector, the **Export**
  menu, the **?** help button, and the **Simulator** / **Designer** switch.

Below the bar, the rule fills the left of the main area and the readings panel
sits on the right, one card per cursor. A short hint line under both lists the
basic gestures. On a first visit a quick-start tutorial opens automatically; you
can reopen it from the **?** dialog at any time.

## First walkthrough

1. **Place a cursor.** Click anywhere on the face to add a cursor line. A card
   for it appears in the readings panel on the right.
2. **Drag the slide.** Press the middle band (the slide) and drag it left or
   right. The upper and lower fixed scales stay put, the slide moves, and the
   values in the readings panel follow.
3. **Read the panel.** Each card lists every scale with its value at that
   cursor. Type a value into a reading and press Enter to move that cursor to the
   position that reads the value.

From here, continue with the [simulator](simulator.md) page for the full set of
controls.
