# 数据模型

JSON 规则格式（`RuleDefinition`）、它解析成的运行时类型，以及刻度算法。

---

## 1. 核心类型

### 1.1 标尺类型
```typescript
export type ScaleType =
  // 标准标尺（可由公式推导）
  | 'C' | 'D' | 'A' | 'B' | 'K' | 'CF' | 'DF' | 'CI' | 'DI' | 'CIF' | 'L'
  // 型号专用标尺
  | 'LN1' | 'LN2' | 'LN3' | 'LN1I' | 'LN2I' | 'LN3I'
  | 'H2' | 'H3' | 'H2P' | 'SH2' | 'SH3' | 'TH2'
  | 'SIN2' | 'COS2' | 'TG2' | 'CTG2' | 'TG3' | 'CTG3'
  // 57 型便携尺（维基惯例）
  | 'S' | 'ST' | 'T'
```

### 1.2 朝向
```typescript
export type ScaleOrientation = 'increasing' | 'decreasing'
```
- **increasing**：值从左到右增大（默认黑色）。
- **decreasing**：值从左到右减小（默认红色）。

**颜色是推导而来，不是固定写死的**：`isRedScale(scale)` 恰好在
`orientation === 'decreasing'` 时为真。两个型号都遵循此规则 —— 57 型的 `DI` 是
红色，因为它递减；其 `T` 是黑色，因为它递增（那一行上的红色是 `ctg` 共享标签，
不是标尺）。

### 1.3 刻度
```typescript
export interface Tick {
  position: number   // C/D 十进制单位（C = 1..10 时为 0..1；相对 C/D 读取的
                     // 标尺可能溢出 —— 见 2.3 节）
  value: number      // 该刻度处的值
  level: 1 | 2 | 3   // 1 = 主刻度（带印数），2 = 中，3 = 细
  label?: string     // 印出的数字（仅主刻度）
  angle?: number     // 度；三角标尺（启用副角印数）
}
```

### 1.4 标尺定义
```typescript
export interface ScaleDefinition {
  id: string
  name: string
  type: ScaleType
  side: 'front' | 'back'
  section: 'upper' | 'middle' | 'lower'
  isMovable: boolean           // 中间段（动尺）为 true
  orientation: ScaleOrientation
  color: string
  sharedLabels?: SharedLabel[] // 括号中的副角印数
  notes?: ScaleNote[]          // 从尺上读出的右侧参考注记
  calc?: ScaleCalculation      // 唯一的计算：刻度 + 读数
  numbersBelow?: boolean       // 印出的数字位于刻度下方
  tickEdge?: 'roof' | 'floor'  // 刻度自共享边缘垂下 / 升至共享边缘
}
```

### 1.5 面与型号
```typescript
export interface ScaleSectionGroup {
  upper: ScaleDefinition[]
  middle: ScaleDefinition[]
  lower: ScaleDefinition[]
}

export interface PhysicalSpec {
  faceWidthMm: number          // 304.8（12in）
  faceHeightMm: number         // 50.8（2in）
  rowCount: { upper: number; middle: number; lower: number }  // 4/6/4
  grooveRowRatio: number       // 凹槽 / 行高
  marginRowRatio: number       // 边距 / 行高
  leftGutterMm: number         // 左侧名称槽
  rightPanelMm: number         // 右侧参考面板
  numeralRatio: number         // 数字高度 / 行高
}

export interface SlideRuleStructure {
  id: string
  name: string
  physical: PhysicalSpec      // 始终存在；圆形规则会被合成
  form?: RuleForm             // 缺省 => 'linear'；见 3.5 节
  disc?: DiscSpec             // 圆形规则存在
  front: ScaleSectionGroup
  back: ScaleSectionGroup
}
```
型号可能是**单面**的：此时 `back` 是空的 `ScaleSectionGroup`（57 型）。
`sideHasScales(model, side)` 报告存在哪些面。`physical` 在运行时始终存在，即使
对**圆形**规则也是如此；此时加载器会从 `disc` 合成一个正方形包围盒（3.5 节）。

### 1.6 布局类型（`packages/renderer/src/layout/index.ts`）
```typescript
export interface SectionLayout {
  section: 'upper' | 'middle' | 'lower'
  topMm: number
  heightMm: number
  rows: number
  bleedTopMm: number      // 该段可向上画入凹槽的距离
  bleedBottomMm: number
}

export interface FaceLayout {
  pxPerMm: number
  faceWidthMm: number; faceHeightMm: number
  faceWidthPx: number; faceHeightPx: number
  rowHeightMm: number; grooveMm: number; marginMm: number; numeralMm: number
  tickLeftMm: number;  tickWidthMm: number
  sections: Record<'upper' | 'middle' | 'lower', SectionLayout>
  grooveTopMm: { upper: number; lower: number }
}

export function computeFaceLayout(spec: PhysicalSpec, availableWidthPx: number): FaceLayout
export function rowTopMm(layout: FaceLayout, section: string, rowIndex: number): number
export function tickX(tick: Tick, layout: FaceLayout): number
```

---

## 2. 刻度算法

### 2.1 对数标尺
`position = (log10 v - log10 vMin) / (log10 vMax - log10 vMin)`，可选
`anchor`，使折叠标尺能向左延伸出其原点。

### 2.2 实测区间
标尺的 `calculation.intervals` 直接列出实测网格，最细步长在前；较粗的步长会
对其重合的刻度重定级。因此元素个数由照片固定，而非由运行时梯级计算得出。
`engine/gradations.ts` 现在只负责格式化印出的数字。

### 2.3 标尺族（`ScaleCalculation` + `engine/scaleCalculation.ts`）
| 标尺族 | 公式 |
|---|---|
| C/D | log10，1..10，标出 pi |
| A/B | log10，1..100 |
| K | log10，1..1000 |
| CF | log10 锚定于 sqrt(10)，仅整数，标出 sqrt(10) |
| DF | 同 CF，但从 3 开始，标出 pi |
| CI/DI | C/D 的镜像 |
| CIF | CF 的倒数（`fold^2 / v`） |
| lg | 线性 0..1 |
| ln1/2/3 | 在 1.0095-1.11 / 1.1-2.9 / 2.5-20000 上 `position ~ log10(ln x)`；自有跨度 |
| ln*I | 上者的倒数，镜像 |
| sin2 | `p = log10(sin x) + 1`（注记 `.1->1`），5.5..90 度，副角印数 |
| tg2 | `p = log10(tan x) + 1`（注记 `.1->1`），5.5..45 度 |
| tg3 | `p = log10(tan x)`（注记 `1->10`），45..84.5 度 |
| H2 | 印出的 cosh 值 V，1.005..1.45；`p = log10(sqrt(V^2 - 1) / from)`（`valueFn`） |
| H2P | 印出的 sech 值 V，0..0.995；`p = log10(sqrt(1 - V^2) / from)`（`valueFn`） |
| H3 | 印出的 cosh 值 V，1.4..10.5；`p = log10(sqrt(V^2 - 1) / from)`（`valueFn`） |
| sh2 | `p = log10(sinh x) + 1`（注记 `.1->1`），x 0.095..0.9；印数为 x |
| sh3 | `p = log10(sinh x)`（注记 `1->10`），x 0.85..3；印数为 x |
| th2 | `p = log10(tanh x) + 1`（注记 `.1->1`），x 0.095..无穷；tanh = 1 端标为 `∞` |
| S | `p = log10(sin x) + 1`，5.74..90 度（57 型） |
| ST | `p = log10(sin x) + 2`，0.573..5.74 度（57 型） |
| T | `p = log10(tan x) + 1`，5.71..45 度（57 型） |

`p` 的单位是 **C/D 十进制**：`p = 0` 恰在 `C = 1` 处，`p = 1` 恰在 `C = 10` 处。
因此相对 C/D 读取的标尺与 C/D 刻度对齐，并可能伸出 C/D 两端（57 型的
`S` / `ST` / `T` 各宽 1 个十进制，所以落在 0..1 上，不会伸出）。每种类型的映射
是标尺 `ScaleCalculation` 上的结构化 `Mapping`（由 `engine/scaleMapping.ts`
实现），由 `load/resolve.ts` 从声明式 JSON 规格解析而来（第 3 节），并带可选的
`read` / `unread` 对；刻度生成器（`engine/scaleCalculation.ts`）与读取器
（`engine/scaleReader.ts`）共享它，因此刻度与其读数绝不会不一致。`expr` 映射
携带一或两个从一或两个源字符串编译出的函数（逆可选）；正向会被采样，且必须在
定义域上有限并严格单调。完整表格与每条标尺的关系记录在
[domain/model-1002.md 第 3.8.1 节](../domain/model-1002.md#381-position-model-cd-decade-units)。

### 2.4 读数（`engine/scaleReader.ts`）
`readScaleValue()` 精确地反演同一批定义，使用标尺的 `calc` 及其 `read` /
`unread` 对（`engine/scaleMapping.ts`），因此读数与刻度绝不会不一致。它按
**已印**范围钳制（`printedPositionRange` / `printedDomainRange`：映射后的定义域
端点加所有印数与记号），所以像 CIF `3.3` 这样的过折叠印数与 th2 `∞` 记号仍可
读取；超出该已印范围的位置返回 `null`。

---

## 3. 规则 JSON（`RuleDefinition`）

实测尺数据是 JSON，不是 TypeScript。`packages/core/rules/1002.json` 与
`packages/core/rules/type-57.json` 是**权威**文件（`schemaVersion: 1`），也是
实测尺数据的唯一来源；第 1 节的运行时结构在启动时由它们推导而来。DTO 类型位于
`packages/core/src/schema/types.ts`，聚合校验器位于 `schema/validate.ts`，
加载器位于 `load/`。

### 3.1 形状
```typescript
export interface RuleDefinition {
  schemaVersion: 1
  id: string
  name: string
  form?: RuleForm           // 缺省 => 'linear'
  physical?: PhysicalSpec   // 线性规则必填；圆形规则可选
  disc?: DiscSpec           // 圆形规则必填
  faces: { front: ScaleSectionGroupSpec; back: ScaleSectionGroupSpec }
}

export interface ScaleSectionGroupSpec {
  upper: ScaleSpec[]
  middle: ScaleSpec[]
  lower: ScaleSpec[]
}

export interface ScaleSpec {
  id: string
  name: string
  type: ScaleType
  orientation: 'increasing' | 'decreasing'
  sharedLabels?: SharedLabelSpec[]   // { id, name, orientation, format? }
  notes?: ScaleNoteSpec[]            // string，或红色词用的 { text, red? }[]
  numbersBelow?: boolean
  tickEdge?: 'roof' | 'floor'
  calculation: CalculationSpec
}
```
JSON 不携带 `side`、`section`、`isMovable` 或 `color`：加载器从面键推导 `side`、
从数组键推导 `section`、在段为 `middle` 时推导 `isMovable`，并恰好在
`orientation` 为 `decreasing` 时把 `color` 推导为红色（1.2 节）。
`sharedLabel` 的颜色以相同方式跟随其自身的 `orientation`。

### 3.2 计算
```typescript
export interface CalculationSpec {
  domain: [number, number]
  map: MapSpec
  read?: ReadSpec                       // { kind: 'reciprocal', scale: number }
  intervals: IntervalSpec[]             // { from, to, steps: { step, level }[], labels? }
  decades?: number
  labels?: (number | { value: number; text: string })[]
  marks?: MarkSpec[]                    // { value: number | 'infinity', label }
  labelFormat?: LabelFormatSpec
  labelLevel?: 1 | 2 | 3 | 'keep'
  decreasing?: boolean
}
```
`map` 是四种声明式类型之一，外加可选的 `expr` 类型（2.3 节的运行时
`Mapping`）：

| `kind` | 字段 | 映射 |
|---|---|---|
| `log` | `anchor`、`normalize?` | `position = log10(value / anchor)`；`normalize` 把跨度缩放到 0..1 |
| `linear` | - | 在定义域上成比例 |
| `fn` | `fn`（`ln` / `sin` / `tan` / `sinh` / `tanh`）、`from` | `position = log10(fn(value) / from)` |
| `valueFn` | `fn`（`cosh` / `sech`）、`from` | `v` 是印出的 `cosh` / `sech` 值；`position = log10(sqrt(v² − 1) / from)`（cosh）/ `log10(sqrt(1 − v²) / from)`（sech） |
| `expr` | `position`（必填）、`inverse?` | `position` 是 `p = f(x)`；`inverse` 是 `x = g(p)`。仅字符串 —— 见 [expressions.md](expressions.md) |

> `expr` 是针对字段专用公式的可选逃生通道。内置规则从不生成它，也无需改动声明式
> 类型。省略 `inverse` 时，加载器通过在定义域上的夹逼二分反演正向映射。文法、
> 函数白名单与安全限制见 [expressions.md](expressions.md)。

`read` 编码一对倒数读数：`{ kind: 'reciprocal', scale: n }` 解析为
`read = d => n / d` 与 `unread = v => n / v`。它出现在镜像的 `ln*I` 族
（`scale: 1`）与 `CIF`（`scale: 10`）上；其他每条标尺都读取其直接的（可逆）
映射。`CI` / `DI` 是普通的 `decreasing` 对数标尺 —— 镜像本身就产生倒数。

`marks` 是额外的带印数点：`value` 是数字，或对 `th2` 渐近线使用字符串
`"infinity"`，加载器会将其还原为 `Infinity`。

### 3.3 印数格式与档级
`labelFormat` 是命名策略或 `{ kind: 'number', decimals }`；它解析为
`format/policies.ts` 中的格式化器：

| 策略 | 印制样式 |
|---|---|
| `default` | 整数直接印，否则不超过 2 位小数，无前导零（`5.5`、`.5`） |
| `folded` | 折叠行去掉十位数字（`10` -> `1`，`33` -> `3.3`） |
| `linearFraction` | 线性 `lg` / `L` 行用分数形式（`0` / `1`，`.1`..`.9`） |
| `degree` | 带度符号的角度（`5.5°`） |
| `degreeBare` | 裸角度（57 型 `S` / `T`） |
| `degreeMinute` | 度与分（57 型 `ST`：`35'`、`1°30'`、`2°`） |
| `argument` | 小于 0.1 取 3 位小数，小于 1 取 2 位，大于 1 取 1 位（`.095`、`.1`、`1.5`） |
| `sechZero` | 零处为 `.0`，否则 3 位小数（`H'2`） |
| `{ kind: 'number', decimals }` | 固定小数位，无前导零 |

`labelLevel` 决定生成器如何处理某个印数：`1`..`3` 强制该刻度档级，`'keep'`
保留实测档级（`sh2` / `sh3` / `th2` 行）。`decreasing` 镜像该标尺。`decades`
重复区间网格（K = 3，A/B = 2）。

### 3.4 加载
```typescript
export function parseRule(
  input: unknown,
): { ok: true; rule: SlideRuleStructure } | { ok: false; errors: RuleError[] }
export function builtInRules(): SlideRuleStructure[]
```
`parseRule` 先校验整个文档（`validateRule` 聚合每一条 `RuleError` 而不抛出），
然后才解析它；无效输入绝不产生部分规则。`builtInRules` 加载两个权威文件并让
每个都经过 `parseRule`，因此内置规则与其他规则一样被校验。
`packages/core/src/data/model1002.ts` 与 `model57.ts` 是薄封装，从
`builtInRules()` 中选出 `MODEL_1002` / `MODEL_57`。

### 3.5 规则形式（线性 / 圆形）

规则默认是**线性**（矩形）的；`form: "circular"` 选择同心圆盘规则。圆形几何
位于 `disc`：

```typescript
export type RuleForm = 'linear' | 'circular'

export interface DiscSpec {
  outerRadiusMm: number // 规则的外边缘（限制圆）
  innerRadiusMm: number // 中心孔 / 枢轴凸台
  sheetSizeMm: number   // 圆盘印制其上的正方形纸张
}
```

- **线性**规则保持 `physical` 必填且不变。线性规则上出现 `disc` 是
  `unexpectedDisc`。
- **圆形**规则要求 `disc`（否则 `missingField`），可省略 `physical`。约束为
  `outerRadiusMm > 0`、`0 <= innerRadiusMm < outerRadiusMm` 和
  `sheetSizeMm >= 2 * outerRadiusMm`，全部报为 `invalidDisc`；`form` 超出这两
  个值则是 `unknownForm`。
- 当圆形规则省略 `physical` 时，`load/resolve.ts` 会合成一个**正方形包围盒**
  （`faceWidthMm = faceHeightMm = sheetSizeMm`，带无碍的行 / 边距占位值），使
  运行时 `SlideRuleStructure.physical` 类型保持非可选；圆盘布局忽略这些占位行
  字段。`load/serialize.ts` 会再次省略那个合成出的 `physical`，使 DTO 往返回
  作者书写的形式。
- `resolveRule` 把 `form` / `disc` 复制到运行时结构。线性渲染器
  （`renderRuleToSVG` / `renderRuleSheetToSVG`）不感知 `form` / `disc`，也绝
  不会被喂入圆形结构；圆形规则由圆盘渲染器绘制（`computeDiscLayout` /
  `renderDiscToSVG` / `renderDiscSheetToSVG`，阶段 5e —— 见
  [rendering.md](rendering.md)）。设计器预览与打印路径对
  `form: "circular"` 选择圆盘渲染器，仅当圆形规则缺少 `disc`（无效草稿）时才
  显示 i18n 提示。

---

## 4. 型号配置

### 4.1 注册表（`packages/core/src/data/models.ts`）
```typescript
export interface SlideRuleModelEntry {
  id: string          // 也是 i18n 键：model.<id>
  available: boolean  // false = 灰显
}

export const MODELS: SlideRuleModelEntry[] = [
  { id: '1002', available: true },
  { id: '57', available: true },   // 57 型便携尺
]
```
- `stores/slideRule.ts` 保存 `currentModelId`；`currentModel` 是
  `computed(() => getModelStructure(id))`。
- 渲染与读数始终经由 `currentModel`，绝不硬编码 1002。
- 显示名来自 i18n。

### 4.2 1002 数据
`packages/core/rules/1002.json` 保存物理规格以及 28 条标尺与正 / 背面顺序
（见领域规格）。`packages/core/src/data/model1002.ts` 是薄封装，从
`builtInRules()` 中选出它。`getSections(model, side)` 与 `countScales(model)`
显式接收型号。

### 4.3 57 型数据
`packages/core/rules/type-57.json` 保存便携尺：一个空的 `back` 与 9 条正面标尺
（见 [domain/model-57.md](../domain/model-57.md)）。其标尺列表、颜色、印出的
数字与参考注记来自该文档所引的第三方销售照片；其**尺寸**由维护者提供，未经照片
核实。

### 4.4 单面处理
`sideHasScales(model, side)`（位于 `data/ruleHelpers.ts`，从 `model1002.ts`
重导出）报告存在哪些面。store 暴露 `availableSides`、`isSingleFaced` 与
`visibleSides`；`setModel` 落在有效面上，并在新型号只有一个面时清除双面模式，
`setSide` / `setDualFace` 拒绝无效选择。组件渲染 `visibleSides`，因此单面尺只
显示其正面。

---

## 5. 验证

### 5.1 刻度数学
```typescript
const calcOf = (model, id) =>
  [model.front, model.back]
    .flatMap(f => [...f.upper, ...f.middle, ...f.lower])
    .find(s => s.id === id)!.calc!
const cd = generateScaledTicks(calcOf(MODEL_1002, 'C'))
assert(cd.find(t => t.value === 1)?.position === 0)
assert(cd.find(t => t.value === 10)?.position === 1)
// CI 镜像 C/D
assert(generateScaledTicks(calcOf(MODEL_1002, 'CI')).find(t => t.value === 1)?.position === 1)
// A/B 有两个十进制
assert(generateScaledTicks(calcOf(MODEL_1002, 'A')).find(t => t.value === 100)?.position === 1)
// 配置完整性
assert(countScales(MODEL_1002) === 28)
assert(MODEL_1002.front.upper.length === 4)
assert(MODEL_1002.front.middle.length === 6)
assert(MODEL_1002.front.lower.length === 4)
// 单面的 57 型
assert(countScales(MODEL_57) === 9)
assert(MODEL_57.front.upper.length === 2)
assert(MODEL_57.front.middle.length === 4)
assert(MODEL_57.front.lower.length === 3)
assert(sideHasScales(MODEL_57, 'back') === false)
```

### 5.2 Schema、布局与型号（已实现，Vitest）
`packages/core/src/schema/validate.test.ts` 覆盖校验器错误码；
`packages/core/src/load/{parseRule,builtIn,serialize}.test.ts` 覆盖解析、加载
权威 JSON 以及运行时 -> DTO 的无损往返。
`packages/renderer/src/layout/layout.test.ts` 覆盖 6:1 宽高比、pxPerMm 缩放、
行高求解、4/6/4 叠放、凹槽位置以及 tickX / rowTopMm。
`packages/core/src/engine/type57Scales.test.ts` 覆盖 S / ST / T 端点与复用的
对数标尺；`packages/simulator/src/data/model57.test.ts` 覆盖便携尺的规格、标尺
列表与注册表。`packages/core/src/expr/*.test.ts` 覆盖表达式解析器 / 求值器 /
数值反演器；`packages/core/src/load/exprRule.test.ts` 端到端覆盖 `expr` 映射
（刻度、解析式与数值读数、序列化往返）。用 `npm run test` 运行。

---

*版本：v4.1*
*创建：2025-01*
*最后修订：2026-09 —— JSON `RuleDefinition` 成为权威实测数据
（`schemaVersion: 1`）；运行时规则由 `parseRule` / `builtInRules` 解析；可选的
`expr` 映射类型新增安全表达式语言；`form` / `disc` 圆形尺元数据新增
`unknownForm` / `invalidDisc` / `unexpectedDisc` 校验码与合成的正方形包围盒*
