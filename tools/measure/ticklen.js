// Tick-length analysis for a row defined by a vertical band (used for the
// Type 57 prototype). For every x column it measures the dark run that starts
// at the band edge, then clusters the lengths so the levels can be told apart.
//
// Usage: node ticklen.js <jpg> <x0> <x1> <y0> <y1> [threshold]
// Output: the edge y, the number of ticks and the x1/x2/length list.
'use strict';
const fs = require('fs');
const jpeg = require('jpeg-js');

const [file, x0s, x1s, y0s, y1s, thrs] = process.argv.slice(2);
const X0 = +x0s,
  X1 = +x1s,
  Y0 = +y0s,
  Y1 = +y1s,
  TH = +(thrs || 110);
const raw = jpeg.decode(fs.readFileSync(file), { useTArray: true });
const { width: W, data } = raw;
const lum = (x, y) => {
  const i = (y * W + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};
const dark = (x, y) => lum(x, y) < TH;

// Edge detection: count dark pixels per row and show the profile.
const rowDark = [];
for (let y = Y0; y < Y1; y++) {
  let c = 0;
  for (let x = X0; x < X1; x++) if (dark(x, y)) c++;
  rowDark.push({ y, c });
}
console.log(
  'row darkness (every 2px):',
  rowDark
    .filter((_, i) => i % 2 === 0)
    .map((r) => `${r.y}:${r.c}`)
    .join(' '),
);

// Split each column into runs of dark pixels.
function tickRun(x) {
  let y = Y0;
  const runs = [];
  while (y < Y1) {
    if (dark(x, y)) {
      const s = y;
      while (y < Y1 && dark(x, y)) y++;
      runs.push({ s, len: y - s });
    } else y++;
  }
  return runs;
}

// Use the longest run of each column as the tick body.
const cols = [];
for (let x = X0; x < X1; x++) {
  const runs = tickRun(x);
  if (!runs.length) continue;
  let best = runs[0];
  for (const r of runs) if (r.len > best.len) best = r;
  cols.push({ x, s: best.s, len: best.len });
}
if (!cols.length) {
  console.log('no dark columns');
  process.exit(0);
}
// The edge is the modal run start among all columns.
const startCount = new Map();
for (const c of cols) startCount.set(c.s, (startCount.get(c.s) || 0) + 1);
let edge = cols[0].s,
  bestN = 0;
for (const [s, n] of startCount)
  if (n > bestN) {
    bestN = n;
    edge = s;
  }
console.log('edge y =', edge, `(columns ${cols.length})`);

// Merge adjacent columns into ticks; keep the maximum length of the group.
const ticks = [];
let cur = null;
for (const c of cols) {
  const len = c.s === edge ? c.len : Math.max(0, c.s - edge + c.len);
  if (!cur || c.x - cur.x2 > 1 || Math.abs(len - cur.len) > 3) {
    if (cur) ticks.push(cur);
    cur = { x1: c.x, x2: c.x, len, top: c.s };
  } else {
    cur.x2 = c.x;
    if (len > cur.len) {
      cur.len = len;
      cur.top = c.s;
    }
  }
}
if (cur) ticks.push(cur);
// Keep only ticks that really start at the edge.
const real = ticks.filter((t) => Math.abs(t.top - edge) <= 2);
real.sort((a, b) => a.x1 - b.x1);
const uniq = [...new Set(real.map((t) => t.len))].sort((a, b) => a - b);
console.log('ticks', real.length, 'lengths', uniq.join(','));
console.log('x1\tx2\tlen');
console.log(real.map((t) => `${t.x1}\t${t.x2}\t${t.len}`).join('\n'));
