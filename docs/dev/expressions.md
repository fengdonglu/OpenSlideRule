# Expressions (`map.kind: "expr"`)

An `expr` map is the opt-in escape hatch for a field-specific formula: the two
mapping directions are written as short arithmetic strings and compiled by a safe
evaluator. This document is the reference for authoring one; the grammar, the
function whitelist, the limits and the inversion rule are all defined here.

The runtime types are `ExprMapSpec` in `packages/core/src/schema/types.ts` and
`ExprMapping` in `packages/core/src/types/scale.ts`.

---

## 1. Spec shape

```typescript
export interface ExprMapSpec {
  kind: 'expr'
  position: string   // p = f(x), required
  inverse?: string   // x = g(p), optional
}
```

`position` is the forward mapping `p = f(x)`; its variable is `x`. `inverse` is
the reverse mapping `x = g(p)`; its variable is `p`. Both are plain strings in
the same expression language. `inverse` is optional: when it is omitted the
loader inverts the forward mapping numerically (section 7).

`expr` is one of the `MapSpec` variants. An author writes it anywhere a map is
accepted inside a scale's `calculation`; the four declarative kinds (`log`,
`linear`, `fn`, `valueFn`) are unchanged and no built-in rule uses `expr`. The
generator's `exprScale` preset builds this shape.

---

## 2. Grammar

- **Numbers**: integers and decimals (`1`, `1.5`, `.5`), with optional scientific
  notation (`1e-3`, `6.02e23`).
- **Names**: `[A-Za-z_][A-Za-z0-9_]*`. A name followed by `(` is a function call;
  any other name is a variable or a constant.
- **Whitespace** (spaces, tabs, newlines, carriage returns) is ignored.

Operators, from lowest to highest precedence:

| Level | Operators | Notes |
|---|---|---|
| 1 (lowest) | `+`, `-` | binary, left-associative |
| 2 | `*`, `/`, `%` | `%` is the floating-point remainder (`7 % 4 = 3`) |
| 3 | unary `+`, `-` | prefix |
| 4 (highest) | `^` | right-associative (`2 ^ 3 ^ 2 = 512`) |

Parentheses group any sub-expression. `^` binds tighter than unary minus, so
`-2 ^ 2` is `-(2 ^ 2) = -4`; `2 ^ -3` is valid because the right operand of `^`
may be a unary expression. Function arguments are comma-separated and each one is
a full expression: `pow(x, 3)`.

---

## 3. Variables and constants

Only one variable is in scope for each direction:

- `x` in `position` (the domain value);
- `p` in `inverse` (the position in C/D decade units).

The constant table is exact and closed:

| Name | Value |
|---|---|
| `pi` | `Math.PI` |
| `e` | `Math.E` |

Any other bare name is rejected by validation (`unknown name "..."`).

---

## 4. Function whitelist

Exactly the functions below are callable; any other name is rejected at parse
time (`unknown function "..."`). Arity is fixed except for `min` / `max`.

| Function(s) | Arity | Meaning |
|---|---|---|
| `sin`, `cos`, `tan` | 1 | trigonometric, **radian** argument |
| `asin`, `acos`, `atan` | 1 | inverse trigonometric, **radian** result |
| `sind`, `cosd`, `tand` | 1 | trigonometric, **degree** argument |
| `asind`, `acosd`, `atand` | 1 | inverse trigonometric, **degree** result |
| `sinh`, `cosh`, `tanh` | 1 | hyperbolic |
| `asinh`, `acosh`, `atanh` | 1 | inverse hyperbolic |
| `ln`, `log10`, `log2` | 1 | natural, base-10 and base-2 logarithm |
| `exp` | 1 | `e` raised to the argument |
| `sqrt`, `cbrt` | 1 | square and cube root |
| `abs`, `sign` | 1 | absolute value; sign (`-1` / `0` / `1`) |
| `floor`, `ceil`, `round` | 1 | round toward −∞ / +∞ / nearest |
| `pow` | 2 | `pow(a, b) = a ** b` |
| `atan2` | 2 | `atan2(y, x)` in radians |
| `min`, `max` | ≥ 1 | variadic minimum / maximum |

Only `x` / `p`, `pi` and `e` may appear as names; functions may not be treated as
values. `^` is the operator form of `pow`.

---

## 5. Limits and safety

- The source string is capped at **512 characters** and the token stream at
  **256 tokens** (including the end-of-input marker); an empty string is
  rejected. Over-long input reports `expression is longer than 512 characters`
  or `expression has more than 256 tokens`.
- The parser is a hand-written tokenizer and recursive-descent parser. It **never
  calls `eval` or `Function`**. There is no property access (no `.`), no string
  literal, no array or object literal, no assignment and no statement/comment
  syntax. The only identifiers are the one variable, the two constants and the
  whitelisted function names.
- Parse failures and unknown names are reported as data (`{ ok: false, message }`
  or a returned message), never thrown by the validator.

These limits are what make an expression safe to load from a JSON rule file.

---

## 6. Validation: finiteness and strict monotonicity

The schema validator (`packages/core/src/schema/validate.ts`) parses and
name-checks both strings. For the forward `position` it also samples the compiled
function across the domain: **33 points** (the start plus 32 equal steps - 32
intervals, end inclusive). Every sampled value must be finite and the sequence must be strictly
monotonic - no equal consecutive values and no change of direction. A failure is
recorded as a `RuleError` with code `invalidExpression`, for example
`expression is not strictly monotonic across the domain`.

This is a sampled check, not a proof: choose the domain so the formula is
well-behaved between samples. The `inverse` string is only parsed and
name-checked (there is no domain sample), because drawing never needs it.

---

## 7. Inversion

The runtime mapping needs both directions (`toPosition` for drawing and reading,
`toDomain` for reading a cursor). Resolution happens in
`packages/core/src/load/resolve.ts`:

- **Analytic** - when `inverse` is present, `x = g(p)` is compiled directly and
  used as `toDomain`. It is exact.
- **Numeric** - when `inverse` is omitted, `numericInverse(forward, domain)` in
  `packages/core/src/expr/invert.ts` inverts the forward function:
  1. evaluate `f` at both domain ends; if either is non-finite, or the two are
     equal (a constant function), every query returns `NaN`;
  2. bracket the printed positions with the two end values and pick the
     direction (`increasing` when `f(hi) > f(lo)`);
  3. a target outside the bracket returns `NaN`;
  4. otherwise bisection for **80 iterations** (or an exact hit) returns the
     midpoint of the surviving interval.

`readScaleValue` treats `NaN` as out of range, and independently returns `null`
for a position outside the scale's printed position range; `positionForValue`
returns `null` outside the printed domain range and for a non-finite result.

---

## 8. Worked example: `log10`

```jsonc
{
  "domain": [1, 10],
  "map": { "kind": "expr", "position": "log10(x)", "inverse": "10 ^ p" },
  "intervals": [{ "from": 1, "to": 10, "steps": [{ "step": 1, "level": 1 }] }]
}
```

- `position: "log10(x)"` maps `x = 1` to `p = 0` and `x = 10` to `p = 1`, so the
  forward has one decade of span.
- `inverse: "10 ^ p"` is the exact inverse, so a cursor at `p = 0.5` reads
  `10 ^ 0.5 = sqrt(10)` and `positionForValue(sqrt(10))` returns `0.5`.
- Dropping `inverse` gives the same readings through numeric bisection over
  `[1, 10]`; at `p = 0.5` the bisection converges to the same value. The
  analytic form is exact and cheaper, so supply it when the inverse is easy.

Equivalently, the generator can build the whole calculation:

```typescript
exprScale({
  domain: [1, 10],
  intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
  position: 'log10(x)',
  inverse: '10 ^ p',
})
```

---

*Version: v1.0*
*Created: 2026-09*
*Last revised: 2026-09 - the `expr` map kind (safe evaluator + analytic /
numeric inversion)*
