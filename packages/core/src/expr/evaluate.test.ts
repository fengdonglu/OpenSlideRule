// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { compileExpression, validateExpression, CONSTANTS } from './evaluate'
import { FUNCTIONS } from './parse'

const f = (source: string, variable = 'x') => compileExpression(source, variable)

describe('compileExpression', () => {
  it('evaluates arithmetic and precedence', () => {
    expect(f('1 + 2 * 3')(0)).toBe(7)
    expect(f('2 ^ 3 ^ 2')(0)).toBe(512)
    expect(f('-2 ^ 2')(0)).toBe(-4)
    expect(f('7 % 4')(0)).toBe(3)
  })
  it('evaluates the variable and the constants', () => {
    expect(f('x * 2')(21)).toBe(42)
    expect(f('pi')(0)).toBeCloseTo(Math.PI, 12)
    expect(f('e')(0)).toBeCloseTo(Math.E, 12)
  })
  it('evaluates the function whitelist', () => {
    expect(f('log10(x)')(100)).toBeCloseTo(2, 12)
    expect(f('sqrt(x)')(9)).toBe(3)
    expect(f('sind(x)')(30)).toBeCloseTo(0.5, 12)
    expect(f('pow(x, 3)')(2)).toBe(8)
    expect(f('min(x, 3, 1)')(5)).toBe(1)
  })
  it('throws for an unknown name', () => {
    expect(() => compileExpression('y + 1', 'x')).toThrow('unknown name')
  })
  it('implements every function in the whitelist', () => {
    for (const [name, arity] of Object.entries(FUNCTIONS)) {
      const count = arity === 'variadic' ? 1 : arity
      const args = Array.from({ length: count }, () => '1').join(', ')
      expect(() => compileExpression(`${name}(${args})`, 'x')(0), name).not.toThrow()
    }
  })
})

describe('validateExpression', () => {
  it('accepts a variable, constants and whitelisted functions', () => {
    expect(validateExpression('log10(x) + pi', 'x')).toBeNull()
    expect(validateExpression('10 ^ p', 'p')).toBeNull()
  })
  it('reports parse errors and unknown names', () => {
    expect(validateExpression('1 +', 'x')).not.toBeNull()
    expect(validateExpression('y + 1', 'x')).toContain('unknown name')
    expect(validateExpression('foo(x)', 'x')).toContain('unknown function')
  })
  it('rejects host objects and prototype names', () => {
    for (const source of ['globalThis', 'this', '__proto__', 'constructor']) {
      const message = validateExpression(source, 'x')
      expect(message).not.toBeNull()
      expect(message).toMatch(/unknown (name|function)/)
    }
    expect(validateExpression('constructor(x)', 'x')).toContain('unknown function')
  })
})

describe('CONSTANTS', () => {
  it('exposes pi and e only', () => {
    expect(Object.keys(CONSTANTS).sort()).toEqual(['e', 'pi'])
  })
})
