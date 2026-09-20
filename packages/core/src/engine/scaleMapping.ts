// The Mapping of a ScaleCalculation provides toPosition(d) and toDomain(p).

import type { FnName, ScaleCalculation } from '../types/scale'

const DEG = Math.PI / 180

function fnValue(fn: FnName, d: number): number {
  switch (fn) {
    case 'ln':
      return Math.log(d)
    case 'sin':
      return Math.sin(d * DEG)
    case 'tan':
      return Math.tan(d * DEG)
    case 'sinh':
      return Math.sinh(d)
    case 'tanh':
      return Math.tanh(d)
  }
}

function fnArgument(fn: FnName, y: number): number {
  switch (fn) {
    case 'ln':
      return Math.exp(y)
    case 'sin':
      return Math.asin(y) / DEG
    case 'tan':
      return Math.atan(y) / DEG
    case 'sinh':
      return Math.asinh(y)
    case 'tanh':
      return Math.atanh(y)
  }
}

function valueFnValue(fn: 'cosh' | 'sech', v: number): number {
  return fn === 'cosh' ? Math.sqrt(v * v - 1) : Math.sqrt(1 - v * v)
}

function valueFnArgument(fn: 'cosh' | 'sech', g: number): number {
  return fn === 'cosh' ? Math.sqrt(g * g + 1) : Math.sqrt(1 - g * g)
}

// The domain value d -> its position.
export function toPosition(calc: ScaleCalculation, d: number): number {
  const m = calc.map
  switch (m.kind) {
    case 'log': {
      const p = Math.log10(d / m.anchor)
      if (!m.normalize) return p
      return p / Math.log10(calc.domain[1] / m.anchor)
    }
    case 'linear':
      return (d - calc.domain[0]) / (calc.domain[1] - calc.domain[0])
    case 'fn':
      // Subtraction form: mathematically log10(fn(d) / from), bit-identical to
      // the legacy per-family generators so measured positions stay unchanged.
      return Math.log10(fnValue(m.fn, d)) - Math.log10(m.from)
    case 'valueFn':
      return Math.log10(valueFnValue(m.fn, d) / m.from)
    case 'expr':
      return m.toPosition(d)
    case 'custom':
      return m.toPosition(d)
  }
}

// A position -> the domain value.
export function toDomain(calc: ScaleCalculation, p: number): number {
  const m = calc.map
  switch (m.kind) {
    case 'log': {
      const span = m.normalize ? Math.log10(calc.domain[1] / m.anchor) : 1
      return m.anchor * 10 ** (p * span)
    }
    case 'linear':
      return calc.domain[0] + p * (calc.domain[1] - calc.domain[0])
    case 'fn':
      return fnArgument(m.fn, m.from * 10 ** p)
    case 'valueFn':
      return valueFnArgument(m.fn, m.from * 10 ** p)
    case 'expr':
      return m.toDomain(p)
    case 'custom':
      return m.toDomain(p)
  }
}

// The domain values a calculation actually prints: the two ends plus every
// finite label / mark value (a label may sit a hair past a fold, e.g. CIF 3.3).
export function printedDomainRange(calc: ScaleCalculation): [number, number] {
  const vals: number[] = [calc.domain[0], calc.domain[1]]
  const add = (v: number): void => {
    if (Number.isFinite(v)) vals.push(calc.unread ? calc.unread(v) : v)
  }
  for (const l of calc.labels ?? []) add(typeof l === 'number' ? l : l.value)
  for (const m of calc.marks ?? []) add(m.value)
  return [Math.min(...vals), Math.max(...vals)]
}

// The positions a calculation actually draws at: the mapped ends plus every
// label / mark (including an infinite-valued mark such as th2's `∞` at p = 1).
export function printedPositionRange(calc: ScaleCalculation): [number, number] {
  const ps: number[] = [toPosition(calc, calc.domain[0]), toPosition(calc, calc.domain[1])]
  const add = (v: number): void => {
    const p = toPosition(calc, calc.unread ? calc.unread(v) : v)
    if (Number.isFinite(p)) ps.push(p)
  }
  for (const l of calc.labels ?? []) add(typeof l === 'number' ? l : l.value)
  for (const m of calc.marks ?? []) add(m.value)
  return [Math.min(...ps), Math.max(...ps)]
}
