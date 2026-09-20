// Print a small region as binary ASCII, one character per pixel. Use it to find
// the baseline of a row and to see how far the ticks reach.
//
// Usage: node strip.js <jpg> <x0> <x1> <y0> <y1> [threshold]
'use strict';
const fs = require('fs');
const jpeg = require('jpeg-js');
const [file, x0s, x1s, y0s, y1s, thrs] = process.argv.slice(2);
const X0 = +x0s,
  X1 = +x1s,
  Y0 = +y0s,
  Y1 = +y1s,
  TH = +(thrs || 150);
const raw = jpeg.decode(fs.readFileSync(file), { useTArray: true });
const { width: W, data } = raw;
const lum = (x, y) => {
  const i = (y * W + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};
let head = '    ';
for (let x = X0; x < X1; x += 10) head += String(x).padEnd(10);
console.log(head);
for (let y = Y0; y < Y1; y++) {
  let line = String(y).padStart(3) + ' ';
  for (let x = X0; x < X1; x++) line += lum(x, y) < TH ? '#' : '.';
  console.log(line);
}
