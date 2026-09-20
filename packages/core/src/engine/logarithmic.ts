// Logarithmic engine: the printed-number formatters for the logarithmic,
// folded and linear rows. The legacy tick generators were removed in Plan 3;
// the unified ScaleCalculation (scaleCalculation.ts) now produces every
// graduation.

import { formatNumber } from './gradations'

// The folded rows print the second decade with the tens digit dropped, exactly
// as the 1002 does (1002-back.jpg): 10 -> `1`, 11 -> `1.1`, 15 -> `1.5`,
// 20 -> `2`, 30 -> `3`, 33 -> `3.3`. The first decade is printed bare.
export function formatFoldedLabel(v: number): string {
  if (v < 10) return String(v)
  return formatNumber(v / 10, 1)
}

// Print a linear-scale number the way the rule does: a bare whole number at the
// ends (`0`, `1`) and a leading-zero-omitted fraction in between (`.1` .. `.9`).
// Read from the 1002's `lg` row and the 57's `L` row.
export function formatLinearLabel(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return '.' + v.toFixed(1).slice(2)
}
