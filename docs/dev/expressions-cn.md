# 表达式（`map.kind: "expr"`）

`expr` 映射是针对某个字段专用公式的可选逃生通道：两个映射方向写成简短的算术
字符串，由安全求值器编译。本文是编写这种映射的参考；文法、函数白名单、限制与
反演规则都定义于此。

运行时类型是 `packages/core/src/schema/types.ts` 的 `ExprMapSpec`，以及
`packages/core/src/types/scale.ts` 的 `ExprMapping`。

---

## 1. 规格形状

```typescript
export interface ExprMapSpec {
  kind: 'expr'
  position: string   // p = f(x)，必填
  inverse?: string   // x = g(p)，可选
}
```

`position` 是正向映射 `p = f(x)`，其变量是 `x`。`inverse` 是反向映射
`x = g(p)`，其变量是 `p`。二者都是同一表达式语言中的普通字符串。`inverse`
可选：省略时，加载器对正向映射做数值反演（第 7 节）。

`expr` 是 `MapSpec` 的变体之一。作者可以在标尺 `calculation` 内任何接受映射的
位置书写它；四种声明式类型（`log`、`linear`、`fn`、`valueFn`）保持不变，且没有
任何内置规则使用 `expr`。生成器的 `exprScale` 预设会构造这一形状。

---

## 2. 文法

- **数字**：整数与小数（`1`、`1.5`、`.5`），可选科学计数法（`1e-3`、`6.02e23`）。
- **名称**：`[A-Za-z_][A-Za-z0-9_]*`。名称后跟 `(` 表示函数调用；其他名称是
  变量或常量。
- **空白**（空格、制表符、换行、回车）被忽略。

运算符按优先级从低到高：

| 级别 | 运算符 | 说明 |
|---|---|---|
| 1（最低） | `+`、`-` | 二元，左结合 |
| 2 | `*`、`/`、`%` | `%` 是浮点余数（`7 % 4 = 3`） |
| 3 | 一元 `+`、`-` | 前缀 |
| 4（最高） | `^` | 右结合（`2 ^ 3 ^ 2 = 512`） |

括号对任意子表达式分组。`^` 比一元负号结合更紧，因此 `-2 ^ 2` 是
`-(2 ^ 2) = -4`；`2 ^ -3` 合法，因为 `^` 的右操作数可以是带一元运算的表达式。
函数实参以逗号分隔，每个都是完整表达式：`pow(x, 3)`。

---

## 3. 变量与常量

每个方向的作用域中只有一个变量：

- `position` 中的 `x`（定义域值）；
- `inverse` 中的 `p`（C/D 十进制单位中的位置）。

常量表精确且封闭：

| 名称 | 值 |
|---|---|
| `pi` | `Math.PI` |
| `e` | `Math.E` |

任何其他裸名称都会被校验拒绝（`unknown name "..."`）。

---

## 4. 函数白名单

只有下列函数可以调用；其他名称在解析时被拒绝（`unknown function "..."`）。
除 `min` / `max` 外，元数固定。

| 函数 | 元数 | 含义 |
|---|---|---|
| `sin`、`cos`、`tan` | 1 | 三角函数，实参为**弧度** |
| `asin`、`acos`、`atan` | 1 | 反三角函数，结果为**弧度** |
| `sind`、`cosd`、`tand` | 1 | 三角函数，实参为**角度** |
| `asind`、`acosd`、`atand` | 1 | 反三角函数，结果为**角度** |
| `sinh`、`cosh`、`tanh` | 1 | 双曲函数 |
| `asinh`、`acosh`、`atanh` | 1 | 反双曲函数 |
| `ln`、`log10`、`log2` | 1 | 自然、以 10 为底、以 2 为底的对数 |
| `exp` | 1 | `e` 的实参次幂 |
| `sqrt`、`cbrt` | 1 | 平方根与立方根 |
| `abs`、`sign` | 1 | 绝对值；符号（`-1` / `0` / `1`） |
| `floor`、`ceil`、`round` | 1 | 向 −∞ / +∞ / 最近取整 |
| `pow` | 2 | `pow(a, b) = a ** b` |
| `atan2` | 2 | `atan2(y, x)`，单位为弧度 |
| `min`、`max` | ≥ 1 | 可变元最小 / 最大值 |

只有 `x` / `p`、`pi` 和 `e` 可以作为名称出现；函数不得当作值使用。`^` 是
`pow` 的运算符形式。

---

## 5. 限制与安全

- 源字符串上限为 **512 个字符**，token 流上限为 **256 个 token**（含输入结束
  标记）；空字符串被拒绝。超长输入报 `expression is longer than 512 characters`
  或 `expression has more than 256 tokens`。
- 解析器是手写的分词器与递归下降解析器。它**从不调用 `eval` 或 `Function`**。
  没有属性访问（无 `.`）、没有字符串字面量、没有数组或对象字面量、没有赋值、
  没有语句 / 注释语法。唯一的标识符是一个变量、两个常量与白名单函数名。
- 解析失败与未知名称以数据形式报告（`{ ok: false, message }` 或返回的消息），
  校验器绝不抛出。

这些限制使表达式可以安全地从 JSON 规则文件加载。

---

## 6. 校验：有限性与严格单调

schema 校验器（`packages/core/src/schema/validate.ts`）解析两个字符串并做名称
检查。对正向 `position`，它还会在整个定义域上采样编译后的函数：**33 个点**
（起点加 32 个等距步长 —— 32 个区间，含端点）。每个采样值都必须有限，且序列
必须严格单调 —— 相邻值不得相等，也不得改变方向。失败会以代码
`invalidExpression` 记为一条 `RuleError`，例如
`expression is not strictly monotonic across the domain`。

这是采样检查，不是证明：请选择定义域，使公式在采样点之间表现良好。`inverse`
字符串只被解析和名称检查（不做定义域采样），因为绘制从不需要它。

---

## 7. 反演

运行时映射需要两个方向（`toPosition` 用于绘制与读数，`toDomain` 用于读取
游标）。解析发生在 `packages/core/src/load/resolve.ts`：

- **解析式** —— 当 `inverse` 存在时，直接编译 `x = g(p)` 并用作 `toDomain`。
  它是精确的。
- **数值式** —— 当省略 `inverse` 时，`packages/core/src/expr/invert.ts` 的
  `numericInverse(forward, domain)` 反演正向函数：
  1. 在定义域两端求 `f`；若任一端非有限，或两端相等（常量函数），则每次查询
     都返回 `NaN`；
  2. 用两个端值夹住已印位置并确定方向（`f(hi) > f(lo)` 时为 `increasing`）；
  3. 目标落在夹逼区间之外时返回 `NaN`；
  4. 否则用二分法迭代 **80 次**（或精确命中）返回存活区间的中点。

`readScaleValue` 把 `NaN` 视为超出范围，并对超出标尺已印位置范围的位置单独
返回 `null`；`positionForValue` 对超出已印定义域范围以及非有限结果返回 `null`。

---

## 8. 实例：`log10`

```jsonc
{
  "domain": [1, 10],
  "map": { "kind": "expr", "position": "log10(x)", "inverse": "10 ^ p" },
  "intervals": [{ "from": 1, "to": 10, "steps": [{ "step": 1, "level": 1 }] }]
}
```

- `position: "log10(x)"` 把 `x = 1` 映射到 `p = 0`，`x = 10` 映射到 `p = 1`，
  因此正向跨度为 1 个十进制。
- `inverse: "10 ^ p"` 是精确逆，所以 `p = 0.5` 处的游标读作
  `10 ^ 0.5 = sqrt(10)`，且 `positionForValue(sqrt(10))` 返回 `0.5`。
- 去掉 `inverse` 后，在 `[1, 10]` 上做数值二分得到相同读数；在 `p = 0.5` 处
  二分收敛到相同值。解析形式精确且更廉价，因此当逆易于求得时应提供它。

等价地，生成器可以构造整份计算：

```typescript
exprScale({
  domain: [1, 10],
  intervals: [{ from: 1, to: 10, steps: [{ step: 1, level: 1 }] }],
  position: 'log10(x)',
  inverse: '10 ^ p',
})
```

---

*版本：v1.0*
*创建：2026-09*
*最后修订：2026-09 —— `expr` 映射类型（安全求值器 + 解析式 / 数值反演）*
