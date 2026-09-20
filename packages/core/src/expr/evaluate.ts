// Compile and validate an expression AST. `compileExpression` turns a source
// string into a plain (value) => number closure; `validateExpression` reports
// the first problem as a string (null when valid) so the schema validator can
// aggregate it. Unknown names are caught here: the parser knows only function
// names, so a bare identifier becomes a variable node and is resolved against
// the one declared variable and the constant table.

import { freeNames, parseExpression } from './parse'
import type { ExprNode } from './parse'

export const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E }

const DEG = Math.PI / 180

type Fn = (...args: number[]) => number

const IMPL: Record<string, Fn> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  exp: Math.exp,
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sind: (x) => Math.sin(x * DEG),
  cosd: (x) => Math.cos(x * DEG),
  tand: (x) => Math.tan(x * DEG),
  asind: (x) => Math.asin(x) / DEG,
  acosd: (x) => Math.acos(x) / DEG,
  atand: (x) => Math.atan(x) / DEG,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  pow: (x, y) => x ** y,
  atan2: Math.atan2,
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
}

function evaluate(node: ExprNode, variable: string, value: number): number {
  switch (node.kind) {
    case 'number':
      return node.value
    case 'variable':
      if (node.name === variable) return value
      if (Object.hasOwn(CONSTANTS, node.name)) return CONSTANTS[node.name]
      throw new Error(`unknown name "${node.name}"`)
    case 'unary': {
      const operand = evaluate(node.operand, variable, value)
      return node.op === '-' ? -operand : operand
    }
    case 'binary': {
      const left = evaluate(node.left, variable, value)
      const right = evaluate(node.right, variable, value)
      switch (node.op) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          return left / right
        case '%':
          return left % right
        case '^':
          return left ** right
      }
      return NaN
    }
    case 'call': {
      const fn = IMPL[node.name]
      if (fn === undefined) throw new Error(`unknown function "${node.name}"`)
      return fn(...node.args.map((arg) => evaluate(arg, variable, value)))
    }
  }
}

export function compileExpression(source: string, variable: string): (value: number) => number {
  const result = parseExpression(source)
  if (!result.ok) throw new Error(result.message)
  const node = result.node
  for (const name of freeNames(node)) {
    if (name !== variable && !Object.hasOwn(CONSTANTS, name)) {
      throw new Error(`unknown name "${name}"`)
    }
  }
  return (value) => evaluate(node, variable, value)
}

export function validateExpression(source: string, variable: string): string | null {
  const result = parseExpression(source)
  if (!result.ok) return result.message
  for (const name of freeNames(result.node)) {
    if (name !== variable && !Object.hasOwn(CONSTANTS, name)) {
      return `unknown name "${name}"`
    }
  }
  return null
}
