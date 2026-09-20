// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseExpression, freeNames } from './parse'

function ok(source: string) {
  const result = parseExpression(source)
  if (!result.ok) throw new Error(result.message)
  return result.node
}
function message(source: string): string {
  const result = parseExpression(source)
  if (result.ok) throw new Error('expected a parse error')
  return result.message
}

describe('parseExpression', () => {
  it('applies multiplication before addition', () => {
    expect(ok('1 + 2 * 3')).toEqual({
      kind: 'binary',
      op: '+',
      left: { kind: 'number', value: 1 },
      right: {
        kind: 'binary',
        op: '*',
        left: { kind: 'number', value: 2 },
        right: { kind: 'number', value: 3 },
      },
    })
  })
  it('makes ^ right-associative and binds tighter than unary minus', () => {
    expect(ok('2 ^ 3 ^ 2')).toEqual({
      kind: 'binary',
      op: '^',
      left: { kind: 'number', value: 2 },
      right: {
        kind: 'binary',
        op: '^',
        left: { kind: 'number', value: 3 },
        right: { kind: 'number', value: 2 },
      },
    })
    expect(ok('-2 ^ 2')).toEqual({
      kind: 'unary',
      op: '-',
      operand: {
        kind: 'binary',
        op: '^',
        left: { kind: 'number', value: 2 },
        right: { kind: 'number', value: 2 },
      },
    })
  })
  it('parses calls and comma-separated arguments', () => {
    expect(ok('pow(x, 2)')).toEqual({
      kind: 'call',
      name: 'pow',
      args: [
        { kind: 'variable', name: 'x' },
        { kind: 'number', value: 2 },
      ],
    })
    expect(ok('max(1, 2, 3)')).toMatchObject({ kind: 'call', name: 'max' })
  })
  it('parses scientific notation and a leading dot', () => {
    expect(ok('1e-3')).toEqual({ kind: 'number', value: 0.001 })
    expect(ok('.5')).toEqual({ kind: 'number', value: 0.5 })
  })
  it('rejects unknown functions, malformed input and empty input', () => {
    expect(message('foo(1)')).toContain('unknown function')
    expect(message('1 +')).toContain('unexpected end')
    expect(message('(1 + 2')).toContain('expected ")"')
    expect(message('1 @ 2')).toContain('unexpected character')
    expect(message('')).toContain('empty')
  })
  it('rejects property access, indexing, statements and string literals', () => {
    for (const source of ['x.y', 'x[0]', '1;2', '"a"']) {
      const result = parseExpression(source)
      expect(result.ok).toBe(false)
      expect(message(source).length).toBeGreaterThan(0)
      expect(message(source)).toContain('unexpected character')
    }
  })
  it('rejects an over-long source and an over-long token stream', () => {
    expect(message('1'.repeat(513))).toContain('longer')
    expect(message('1+'.repeat(200) + '1')).toContain('tokens')
  })
  it('collects the free names', () => {
    expect(freeNames(ok('log10(x) + pi'))).toEqual(['x', 'pi'])
  })
})
