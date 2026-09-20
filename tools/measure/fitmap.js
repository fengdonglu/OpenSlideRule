// Fit the photo-to-position mapping from printed-label anchors.
//
// A label's printed value fixes its theoretical position p (in C/D decade
// units, 0..1 = the C/D span). The label sits over the longest tick near its
// centre, so each anchor gives a pair (x, p). Because the front photograph is
// keystoned, a straight line is not enough: fit a low-degree polynomial and
// look at the residuals (a few pixels is good).
//
// Usage: node fitmap.js <pairs.tsv> [--deg 1|2|3] [--indep x|p] [--out cal.json]
//   pairs.tsv lines: <x> [TAB] <position>
//   --indep x : fit position = C(x)   (use this to map pixel -> position)
//   --indep p : fit x = C(position)   (use this to check where a value lands)
'use strict';
const fs = require('fs');
const { fitPoly } = require('./lib');

const args = process.argv.slice(2);
const file = args[0];
function opt(name, def) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
}
const deg = +opt('--deg', 1);
const indep = opt('--indep', 'x');
const out = opt('--out', 'cal.json');

const pairs = fs
  .readFileSync(file, 'utf8')
  .trim()
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split(/\t|,/).map(Number))
  .map(([x, p]) => (indep === 'x' ? [x, p] : [p, x]));

const fit = fitPoly(pairs, deg);
console.log('coeffs (ascending):', fit.coeffs.map((v) => v.toFixed(8)).join(', '));
console.log('rms =', fit.rms.toFixed(4), ' max|resid| =', fit.maxAbs.toFixed(4));
for (let i = 0; i < pairs.length; i++)
  console.log(
    `x=${pairs[i][0]}\tpos=${pairs[i][1]}\tresid=${fit.residuals[i].toFixed(4)}`,
  );
fs.writeFileSync(out, JSON.stringify({ indep, deg, coeffs: fit.coeffs }) + '\n');
console.log('wrote', out);
