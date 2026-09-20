# 计算管线（一页）

一条标尺如何从原型照片，走到画出的刻度与游标读数。两层元数据 + 一个生成器。参见
[architecture-cn.md](architecture-cn.md)。

## 概览

- **结构元数据**（`SlideRuleStructure`）：尺本体——毫米尺寸、行数，以及各段的标尺清单与顺序。
- **计算元数据**（`ScaleCalculation`，每条标尺一个）：实测区间网格、定义域→位置的映射、印数与记号。
- **一个生成器**（`generateScaledTicks`）：把 `ScaleCalculation` 变成 `Tick[]`；渲染器据此绘制，读数器用同一套映射求逆。

两层元数据都来自权威的 `RuleDefinition` JSON（`packages/core/rules/*.json`），由 `parseRule` 校验并解析。

## 管线

```
  原型照片                          权威规则 JSON                     运行时的逐标尺计算
  docs/domain/prototype/            packages/core/rules/              packages/core/src/load/
                                    {1002,type-57}.json               resolve.ts
  ┌───────────────┐  tools/measure  ┌───────────────────────┐  parse  ┌───────────────────────┐
  │ 1002-front.jpg│ ──────────────► │ RuleDefinition        │ ──────► │ ScaleCalculation      │
  │ 1002-back.jpg │  crop / strip   │  physical             │  calc   │  domain               │
  │ 57-front.jpg  │  rowscan        │  faces.*.*.scale      │         │  map: Mapping         │
  └───────────────┘  fitmap / ...   └───────────────────────┘         │  intervals (步长@档级) │
                                                                      │  labels / marks       │
  结构：load/builtInRules() -> MODEL_1002 / MODEL_57                  │  read/unread, decades │
                                                                      └───────────┬───────────┘
  ┌───────────────────────────────┐                                                │
  │ SlideRuleStructure            │   PhysicalSpec：毫米尺寸、4/6/4 行、           │ generateScaledTicks
  │   physical: PhysicalSpec      │   凹槽/留白比、左右栏                          │ (engine/scaleCalculation.ts)
  │   front/back: {upper,middle,  │                                                ▼
  │     lower}: ScaleDefinition[] │  每个 ScaleDefinition 带版面标志              ┌───────────────────────┐
  │     (+ .calc)                 │  (section、isMovable、numbersBelow、          │ Tick[]                │
  └───────────────┬───────────────┘   tickEdge、sharedLabels、notes、color)      │  position (C/D 十进制)│
                  │                                                              │  value / level 1-3    │
                  │ renderer: computeFaceLayout(spec, widthPx)                   │  label? / angle?      │
                  ▼                                                              └───────┬─────┬─────────┘
        ┌───────────────────┐                                                          │     │
        │ FaceLayout        │                                                          │     │
        │  mm -> px         │                                                          │     │
        │  pxPerMm（缩放）  │                                                          │     │
        └─────────┬─────────┘                                                          │     │
                  └───────────────┬──────────────────────────────────────────────────┘     │
                                  ▼                                                        │
                        ┌───────────────────┐                              ┌───────────────▼────────┐
                        │ renderSection     │                              │ scaleReader.ts         │
                        │  按档级画刻线与印数│                              │  toDomain + 实际绘制范围 │
                        │  (SVG)            │                              │  → 游标读数            │
                        └───────────────────┘                              └────────────────────────┘
```

## 绘制路径（步骤）

`generateScaledTicks(calc)`（`packages/core/src/engine/scaleCalculation.ts:19`）：

1. 逐 `interval` 铺刻度，**最细步长在前**；较粗步长会对其重合的刻度**重定级**（所以 `0.5` 画得比 `0.1` 长）。
2. 按 `decades`（K=3、A/B=2）以 `10^d` 重复区间。
3. 把 `domain` 两端加成 L1 刻度。
4. 放 `labels`（**读数**值）：`toPosition(unread(value))`，文本经 `labelFormat`；`labelLevel` 决定印数是否强制 L1 还是保留实测档级（`sh2`/`sh3`/`th2`）。
5. 放 `marks`（π、√10、`∞` 渐近线）。
6. 若 `decreasing`，镜像 `position = 1 - position`；按位置排序。

位置来自 `toPosition`（`packages/core/src/engine/scaleMapping.ts:47`）；入口是
`getScaleTicks(scale) = scale.calc ? generateScaledTicks(scale.calc) : []`
（`packages/core/src/engine/scaleFunctions.ts:12`）。

## 读数路径

`packages/core/src/engine/scaleReader.ts` 使用**同一份** `calc`：`toDomain` 把映射求逆，并按**实际绘制范围**（域端 ∪ 印数 ∪ 记号，`printedPositionRange` / `printedDomainRange`）钳制，因此越折点的印数（CIF `3.3`）与 th2 `∞` 仍可读。绘制与读数共用映射，二者不会漂移。

## 审计表

`docs/dev/graduations.md`（及 `-cn`）是**生成物**而非输入：
`packages/core/src/engine/graduationReport.test.ts` 读取每个 `calc`、调用 `getScaleTicks`，写出解析后的分段、`步长@档级`、印数、行标志与位置范围。它随每次 `npm test` 重写，因此不可能与代码不一致。
