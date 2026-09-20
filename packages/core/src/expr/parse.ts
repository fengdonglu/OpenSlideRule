// A tiny, safe arithmetic expression parser for `map.kind: 'expr'`.
// It tokenises and parses a formula into an AST; it never calls eval/Function
// and exposes no property access, string literals or statements. Unknown
// functions, unknown characters and malformed input are reported as data,
// never thrown. The source and token counts are capped so the tree is bounded.

export type ExprNode =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: string }
  | { kind: 'unary'; op: '+' | '-'; operand: ExprNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '%' | '^'; left: ExprNode; right: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] }

export type ParseResult = { ok: true; node: ExprNode } | { ok: false; message: string }

// The whole callable surface. A value is the exact arity; 'variadic' needs at
// least one argument. Names absent from this table are rejected at parse time.
export const FUNCTIONS: Record<string, number | 'variadic'> = {
  abs: 1,
  sqrt: 1,
  cbrt: 1,
  exp: 1,
  ln: 1,
  log10: 1,
  log2: 1,
  sin: 1,
  cos: 1,
  tan: 1,
  asin: 1,
  acos: 1,
  atan: 1,
  sind: 1,
  cosd: 1,
  tand: 1,
  asind: 1,
  acosd: 1,
  atand: 1,
  sinh: 1,
  cosh: 1,
  tanh: 1,
  asinh: 1,
  acosh: 1,
  atanh: 1,
  floor: 1,
  ceil: 1,
  round: 1,
  sign: 1,
  pow: 2,
  atan2: 2,
  min: 'variadic',
  max: 'variadic',
}

const MAX_SOURCE_LENGTH = 512
const MAX_TOKENS = 256

interface Token {
  type: 'number' | 'name' | 'op' | 'eof'
  value: string
  number?: number
  pos: number
}

function tokenize(source: string): { ok: true; tokens: Token[] } | { ok: false; message: string } {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source.charAt(i)
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }
    const rest = source.slice(i)
    const num = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)
    if (num) {
      tokens.push({ type: 'number', value: num[0], number: Number(num[0]), pos: i })
      i += num[0].length
      continue
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest)
    if (name) {
      tokens.push({ type: 'name', value: name[0], pos: i })
      i += name[0].length
      continue
    }
    if ('+-*/%^(),'.includes(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i })
      i++
      continue
    }
    return { ok: false, message: `unexpected character "${ch}" at position ${i}` }
  }
  tokens.push({ type: 'eof', value: '', pos: source.length })
  return { ok: true, tokens }
}

class ExprError extends Error {}

class Parser {
  private index = 0
  constructor(private readonly tokens: Token[]) {}

  parse(): ExprNode {
    const node = this.additive()
    const token = this.tokens[this.index]
    if (token.type !== 'eof') {
      throw new ExprError(`unexpected "${token.value}" at position ${token.pos}`)
    }
    return node
  }

  private additive(): ExprNode {
    let left = this.multiplicative()
    for (;;) {
      const token = this.tokens[this.index]
      if (token.type === 'op' && (token.value === '+' || token.value === '-')) {
        this.index++
        left = { kind: 'binary', op: token.value, left, right: this.multiplicative() }
      } else {
        return left
      }
    }
  }

  private multiplicative(): ExprNode {
    let left = this.unary()
    for (;;) {
      const token = this.tokens[this.index]
      if (
        token.type === 'op' &&
        (token.value === '*' || token.value === '/' || token.value === '%')
      ) {
        this.index++
        left = { kind: 'binary', op: token.value, left, right: this.unary() }
      } else {
        return left
      }
    }
  }

  private unary(): ExprNode {
    const token = this.tokens[this.index]
    if (token.type === 'op' && (token.value === '+' || token.value === '-')) {
      this.index++
      return { kind: 'unary', op: token.value, operand: this.unary() }
    }
    return this.power()
  }

  private power(): ExprNode {
    const base = this.primary()
    const token = this.tokens[this.index]
    if (token.type === 'op' && token.value === '^') {
      this.index++
      return { kind: 'binary', op: '^', left: base, right: this.unary() }
    }
    return base
  }

  private primary(): ExprNode {
    const token = this.tokens[this.index]
    if (token.type === 'eof') throw new ExprError('unexpected end of expression')
    this.index++
    if (token.type === 'number') return { kind: 'number', value: token.number ?? 0 }
    if (token.type === 'name') {
      const next = this.tokens[this.index]
      if (next.type === 'op' && next.value === '(') {
        this.index++
        const args: ExprNode[] = []
        const first = this.tokens[this.index]
        if (!(first.type === 'op' && first.value === ')')) {
          args.push(this.additive())
          for (;;) {
            const comma = this.tokens[this.index]
            if (comma.type === 'op' && comma.value === ',') {
              this.index++
              args.push(this.additive())
            } else {
              break
            }
          }
        }
        const close = this.tokens[this.index]
        if (!(close.type === 'op' && close.value === ')')) {
          throw new ExprError(`expected ")" at position ${close.pos}`)
        }
        this.index++
        if (!Object.hasOwn(FUNCTIONS, token.value)) {
          throw new ExprError(`unknown function "${token.value}"`)
        }
        const arity = FUNCTIONS[token.value]
        if (arity === 'variadic') {
          if (args.length < 1) {
            throw new ExprError(`function "${token.value}" expects at least 1 argument`)
          }
        } else if (args.length !== arity) {
          throw new ExprError(`function "${token.value}" expects ${arity} argument(s)`)
        }
        return { kind: 'call', name: token.value, args }
      }
      return { kind: 'variable', name: token.value }
    }
    if (token.type === 'op' && token.value === '(') {
      const node = this.additive()
      const close = this.tokens[this.index]
      if (close.type === 'op' && close.value === ')') {
        this.index++
        return node
      }
      throw new ExprError(`expected ")" at position ${close.pos}`)
    }
    throw new ExprError(`unexpected "${token.value}" at position ${token.pos}`)
  }
}

export function parseExpression(source: string): ParseResult {
  if (typeof source !== 'string') return { ok: false, message: 'expression must be a string' }
  if (source.length === 0) return { ok: false, message: 'expression is empty' }
  if (source.length > MAX_SOURCE_LENGTH) {
    return { ok: false, message: `expression is longer than ${MAX_SOURCE_LENGTH} characters` }
  }
  const tokenized = tokenize(source)
  if (!tokenized.ok) return tokenized
  if (tokenized.tokens.length > MAX_TOKENS) {
    return { ok: false, message: `expression has more than ${MAX_TOKENS} tokens` }
  }
  try {
    return { ok: true, node: new Parser(tokenized.tokens).parse() }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'invalid expression' }
  }
}

export function freeNames(node: ExprNode): string[] {
  const names = new Set<string>()
  const visit = (n: ExprNode): void => {
    switch (n.kind) {
      case 'number':
        return
      case 'variable':
        names.add(n.name)
        return
      case 'unary':
        visit(n.operand)
        return
      case 'binary':
        visit(n.left)
        visit(n.right)
        return
      case 'call':
        for (const arg of n.args) visit(arg)
        return
    }
  }
  visit(node)
  return [...names]
}
