// Shared helpers for the offline measurement scripts.
// CommonJS on purpose: these tools are not part of the application build.
'use strict';
const fs = require('fs');
const jpeg = require('jpeg-js');

function loadJpeg(file) {
  const raw = jpeg.decode(fs.readFileSync(file), { useTArray: true });
  return { width: raw.width, height: raw.height, data: raw.data };
}

function luminance(img, x, y) {
  const i = (y * img.width + x) * 4;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
}

function isDark(img, x, y, thr) {
  return luminance(img, x, y) < thr;
}

function evalPoly(coeffs, u) {
  let v = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) v = v * u + coeffs[i];
  return v;
}

// Least-squares polynomial v = sum c_i u^i for the pairs [[u, v], ...].
// Returns the coefficients (ascending), the rms and the max absolute residual.
function fitPoly(pairs, deg) {
  const n = deg + 1;
  const A = Array.from({ length: n }, () => new Float64Array(n + 1));
  for (const [u, v] of pairs) {
    const b = Array.from({ length: n }, (_, i) => u ** i);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) A[i][j] += b[i] * b[j];
      A[i][n] += b[i] * v;
    }
  }
  for (let i = 0; i < n; i++) {
    const piv = A[i][i];
    for (let j = i + 1; j < n; j++) {
      const f = A[j][i] / piv;
      for (let k = i; k <= n; k++) A[j][k] -= f * A[i][k];
    }
  }
  const coeffs = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * coeffs[j];
    coeffs[i] = s / A[i][i];
  }
  let sse = 0;
  let maxAbs = 0;
  const residuals = pairs.map(([u, v]) => {
    const r = v - evalPoly(coeffs, u);
    sse += r * r;
    maxAbs = Math.max(maxAbs, Math.abs(r));
    return r;
  });
  return { coeffs: [...coeffs], residuals, rms: Math.sqrt(sse / pairs.length), maxAbs };
}

// Invert a monotone polynomial by bisection over [lo, hi].
function invertPoly(coeffs, x, lo, hi) {
  const f = (u) => evalPoly(coeffs, u) - x;
  let a = lo,
    b = hi;
  const fa = f(a),
    fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (fa * fb > 0) throw new Error(`x=${x} is outside [${lo}, ${hi}]`);
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fa * fm <= 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

// Longest tick is level 1, then level 2, then the shortest is level 3.
function levelOf(length, cuts) {
  if (length <= cuts[0]) return 3;
  if (length <= cuts[1]) return 2;
  return 1;
}

module.exports = { loadJpeg, luminance, isDark, evalPoly, fitPoly, invertPoly, levelOf };
