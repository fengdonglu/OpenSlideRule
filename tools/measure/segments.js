// Turn a tick list into an interval table: for each segment between two printed
// labels, report the tick count, the median spacing and the level histogram.
//
// Usage: node segments.js <cal.json> <ticks.tsv> --pbounds a,b,c [--lencuts s,m]
//                        [--xrange lo,hi] [--pname pos]
//   ticks.tsv : rowscan.js output (first line is a header, then xc, width, length)
//   --pbounds : segment boundaries in position units (comma separated)
//   --lencuts : length thresholds, e.g. "14,22" -> <=14 is L3, <=22 is L2, rest L1
//   --xrange  : pixel range for inverting an x = C(p) fit
'use strict';
const fs = require('fs');
const { evalPoly, invertPoly, levelOf } = require('./lib');

const args = process.argv.slice(2);
const calFile = args[0];
const ticksFile = args[1];
function opt(name, def) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
}
const cal = JSON.parse(fs.readFileSync(calFile, 'utf8'));
const pbounds = opt('--pbounds', '0,1').split(',').map(Number);
const lencuts = opt('--lencuts', '14,22').split(',').map(Number);
const xrange = opt('--xrange', '0,4000').split(',').map(Number);

const posOf = (xc) =>
  cal.indep === 'x'
    ? evalPoly(cal.coeffs, xc)
    : invertPoly(cal.coeffs, xc, xrange[0], xrange[1]);

const rows = fs
  .readFileSync(ticksFile, 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(/\t|,|\s+/).map(Number))
  .filter((r) => r.length >= 3 && r.every((v) => Number.isFinite(v)));

const ticks = rows.map(([xc, w, len]) => ({ xc, w, len, pos: posOf(xc) }));
console.log('segments:');
console.log('from\tto\tn\tmedianGap\t(b-a)/median\tL1\tL2\tL3');
for (let i = 0; i < pbounds.length - 1; i++) {
  const a = pbounds[i];
  const b = pbounds[i + 1];
  const inSeg = ticks
    .filter((t) => t.pos >= a && t.pos < b)
    .sort((p, q) => p.pos - q.pos);
  const gaps = [];
  for (let j = 1; j < inSeg.length; j++) gaps.push(inSeg[j].pos - inSeg[j - 1].pos);
  gaps.sort((p, q) => p - q);
  const med = gaps.length ? gaps[gaps.length >> 1] : 0;
  const lv = { 1: 0, 2: 0, 3: 0 };
  for (const t of inSeg) lv[levelOf(t.len, lencuts)]++;
  console.log(
    `${a}\t${b}\t${inSeg.length}\t${med.toFixed(5)}\t${((b - a) / (med || 1)).toFixed(1)}\t${lv[1]}\t${lv[2]}\t${lv[3]}`,
  );
}
