// Shared printed-number formatting helpers.
//
// The drawn graduations are laid down by each scale's ScaleCalculation (see
// engine/scaleCalculation.ts); these helpers only render a printed number the
// way the rule does.

// Drop the leading zero the way every rule prints a fraction: `0.5` -> `.5`,
// `0.095` -> `.095` (and `-0.5` -> `-.5`). Whole numbers are untouched.
export function trimLeadingZero(text: string): string {
  if (text.startsWith('0.')) return text.slice(1)
  if (text.startsWith('-0.')) return '-' + text.slice(2)
  return text
}

// Format a numeric label with a sensible number of decimals. A fraction below
// one is printed without its leading zero (`0.5` -> `.5`), matching the 1002's
// `lg` row and the Type 57's `L` row; every printed number on both models uses
// this formatter.
export function formatNumber(v: number, decimals: number): string {
  return trimLeadingZero(String(Number(v.toFixed(decimals))))
}
