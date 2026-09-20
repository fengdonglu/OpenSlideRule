// General single-row tick extractor (ticks reaching up or hanging down).
//
// Usage: node rowscan.js <jpg> <x0> <x1> <yBase> <slope> <dir> [threshold]
//   dir='up'   ticks rise from the baseline yBase   (length = base - top)
//   dir='down' ticks hang from the baseline yBase   (length = bottom - base)
// The baseline is y(x) = yBase + slope * (x - 465); slope absorbs the small
// keystone/rotation of the photograph. The baseline row is first refined to the
// modal edge, then adjacent columns are merged into single ticks.
//
// Output: one line "xc  width  length" per tick (tab separated), after a header.
'use strict';
const fs = require('fs');
const jpeg = require('jpeg-js');
const [file, x0s, x1s, ybs, slopes, dir, thrs] = process.argv.slice(2);
const X0 = +x0s,
  X1 = +x1s,
  YB = +ybs,
  SLOPE = +(slopes || 0),
  DIR = dir || 'down';
const TH = +(thrs || 150);
const raw = jpeg.decode(fs.readFileSync(file), { useTArray: true });
const { width: W, data } = raw;
const lum = (x, y) => {
  const i = (y * W + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};
const dark = (x, y) => lum(x, y) < TH;

const cols = [];
for (let x = X0; x < X1; x++) {
  const yb = Math.round(YB + SLOPE * (x - 465));
  let edge = -1,
    len = 0;
  if (DIR === 'down') {
    let top = -1;
    for (let y = yb - 4; y <= yb + 6; y++)
      if (dark(x, y)) {
        top = y;
        break;
      }
    if (top < 0) continue;
    let y = top;
    while (y < yb + 60 && dark(x, y)) y++;
    edge = top;
    len = y - top;
  } else {
    let bot = -1;
    for (let y = yb + 4; y >= yb - 6; y--)
      if (dark(x, y)) {
        bot = y;
        break;
      }
    if (bot < 0) continue;
    let y = bot;
    while (y > yb - 60 && dark(x, y)) y--;
    edge = bot;
    len = bot - y;
  }
  cols.push({ x, edge, len, yb });
}
if (!cols.length) {
  console.log('none');
  process.exit(0);
}
// Refine the baseline to the modal edge, then keep only columns on it.
const cnt = new Map();
for (const c of cols) cnt.set(c.edge, (cnt.get(c.edge) || 0) + 1);
let edge0 = cols[0].edge,
  best = 0;
for (const [e, n] of cnt)
  if (n > best) {
    best = n;
    edge0 = e;
  }
const on = cols.filter((c) => Math.abs(c.edge - edge0) <= 2);
const ticks = [];
let cur = null;
for (const c of on) {
  if (!cur || c.x - cur.x2 > 1) {
    if (cur) ticks.push(cur);
    cur = { x1: c.x, x2: c.x, len: c.len, e: c.edge };
  } else {
    cur.x2 = c.x;
    if (c.len > cur.len) cur.len = c.len;
  }
}
if (cur) ticks.push(cur);
for (const t of ticks) {
  t.xc = (t.x1 + t.x2) / 2;
  t.w = t.x2 - t.x1 + 1;
}
console.log(`edge=${edge0}  cols=${cols.length}  used=${on.length}  ticks=${ticks.length}`);
console.log(ticks.map((t) => `${t.xc.toFixed(1)}\t${t.w}\t${t.len}`).join('\n'));
