// Numeric inversion for an expr map that has no analytic inverse. A map is
// strictly monotonic over its domain (the validator guarantees it), so bracket
// the position range at the domain ends and bisect. A target outside the
// bracket, a constant function or a non-finite end all yield NaN, which the
// reader treats as out of range.

export function numericInverse(
  toPosition: (d: number) => number,
  domain: [number, number],
): (p: number) => number {
  const [lo, hi] = domain
  const pLo = toPosition(lo)
  const pHi = toPosition(hi)
  if (!Number.isFinite(pLo) || !Number.isFinite(pHi) || pLo === pHi) {
    return () => NaN
  }
  const increasing = pHi > pLo
  return (p: number): number => {
    if (!Number.isFinite(p)) return NaN
    if ((increasing && (p < pLo || p > pHi)) || (!increasing && (p < pHi || p > pLo))) {
      return NaN
    }
    let a = lo
    let b = hi
    for (let i = 0; i < 80; i++) {
      const mid = (a + b) / 2
      const pm = toPosition(mid)
      if (pm === p) return mid
      if (increasing ? pm < p : pm > p) a = mid
      else b = mid
    }
    return (a + b) / 2
  }
}
