# 架构设计

---

## 1. 技术

### 1.1 前端技术栈
- **框架**：Vue 3.5 + Composition API
- **语言**：TypeScript 5.9
- **构建**：Vite 8
- **状态**：Pinia 4
- **i18n**：vue-i18n 11（`zh-CN` / `en-US`）
- **渲染**：原生 SVG（无第三方图形库）

**理由**：
- Vue 的响应式适合频繁的状态更新（拖动动尺、移动游标）。
- TypeScript 让刻度相关的数学保持类型安全。
- 原生 SVG 轻量且精确；无需 fabric.js / konva。

### 1.2 环境
- **Node**：>= 20.19.4
- **包管理器**：npm
- **浏览器**：ES2022+（Chrome 90+、Firefox 88+、Safari 14+、Edge 90+）

### 1.3 质量工具
| 用途 | 工具 | 命令 |
|---|---|---|
| 类型检查 | `vue-tsc --noEmit` | 属于 `npm run build` |
| 单元测试 | Vitest | `npm run test` / `npm run test:watch` |
| 组件测试 | Vitest + `@vue/test-utils`（jsdom） | `npm run test` |
| 端到端测试 | Playwright，本地系统 Edge、CI 用 Chromium | `npm run e2e`（不含在 `npm test` 内；在 CI 中运行） |
| 端到端类型检查 | `tsc --noEmit -p e2e/tsconfig.json` | 属于 `npm run build`（`typecheck:e2e`） |
| 代码检查 | ESLint（flat config，Vue 3 + TS recommended） | `npm run lint` / `npm run lint:fix` |
| 格式化 | Prettier | `npm run format` |
| 构建 | Vite | `npm run build` |

---

## 2. 总体架构

```
前端层
  Vue 3 + TypeScript + Vite
  - 组件
  - Pinia store
  - i18n
业务逻辑层
  - 计算引擎        （每个标尺一个 ScaleCalculation：位置 + 读数）
  - 布局引擎        （毫米级尺面布局）
  - 标尺配置数据    （models / scales / themes）
  - 交互控制器      （拖动、缩放、悬停）
渲染层
  - 原生 SVG
  - 分段渲染
  - 事件处理
```

---

## 3. 模块

### 3.1 模块树
```
packages/core/
├─ rules/                # 权威实测数据（JSON，schemaVersion: 1）
│  ├─ 1002.json          # 1002 物理规格 + 28 条标尺
│  └─ type-57.json       # 57 型便携尺：9 条标尺、背面为空
└─ src/                  # 与框架无关：无 Vue、无 DOM、无 SVG
   ├─ index.ts             # 公共 API（类型、schema、加载器、刻度引擎、型号）
   ├─ types/
   │  └─ scale.ts          # 标尺、刻度、游标与物理规格类型
   ├─ schema/
   │  ├─ types.ts          # RuleDefinition DTO + RuleError
   │  └─ validate.ts       # validateRule(input) -> RuleError[]
   ├─ format/
   │  └─ policies.ts       # 命名印数策略 + resolveLabelFormat
   ├─ expr/
   │  ├─ parse.ts          # 安全的分词器 + 递归下降解析器（不使用 eval）
   │  ├─ evaluate.ts       # compileExpression / validateExpression 与白名单
   │  └─ invert.ts         # numericInverse（区间二分）
   ├─ load/
   │  ├─ parseRule.ts      # parseRule：先校验后解析
   │  ├─ resolve.ts        # CalculationSpec -> ScaleCalculation；Definition -> Structure
   │  ├─ builtInRules.ts   # 经 parseRule 加载 rules/*.json
   │  └─ serialize.ts      # 运行时 -> RuleDefinition（迁移 / 黄金测试）
   ├─ engine/
   │  ├─ gradations.ts     # 印数格式化辅助函数（共享）
   │  ├─ logarithmic.ts    # 折叠 / 线性标尺的印数格式化
   │  ├─ scaleMapping.ts   # Mapping：toPosition / toDomain、实际绘制范围
   │  ├─ scaleCalculation.ts # 唯一的刻度生成器（ScaleCalculation -> Tick[]）
   │  ├─ scaleFunctions.ts # getScaleTicks(scale)：经由该标尺的 calc 生成刻度数组
   │  └─ scaleReader.ts    # 游标处的读数
   └─ data/
      ├─ models.ts        # 型号注册表（1002 与 57 型）
      ├─ model1002.ts     # MODEL_1002 = 已加载的 1002 规则（重导出辅助函数）
      ├─ model57.ts       # MODEL_57 = 已加载的 57 型规则
      └─ ruleHelpers.ts   # BLACK / RED、shared、getSections、countScales、sideHasScales

packages/renderer/src/             # 与框架无关：无 Vue；毫米布局 + SVG
├─ index.ts             # 公共 API（布局、主题、绘制）
├─ layout/
│  ├─ index.ts           # computeFaceLayout、rowTopMm、tickX；FaceLayout
│  └─ disc.ts            # computeDiscLayout：圆盘纸张与同心标尺环
├─ themes.ts             # 6 套配色主题：尺面配色 + 界面配色（名称来自 i18n）
└─ draw/
   ├─ section.ts         # renderSection / drawSectionContent：一段作为一个 SVG
   ├─ rule.ts            # renderRuleToSVG / renderRuleSheetToSVG：一个面 / 叠放的 1:1 毫米图幅
   ├─ disc.ts            # renderDiscToSVG / renderDiscSheetToSVG：一个圆盘 / 叠放的圆盘图幅
   ├─ labelLayout.ts     # 副角标注布局
   ├─ radicalGeometry.ts # 根号横线几何
   └─ radicalMeasure.ts  # measureRadicals：按字体测量根号宽度

packages/simulator/src/            # Vue 应用
├─ i18n/
│  ├─ index.ts           # createI18n + 语言持久化
│  └─ locales/           # zh-CN.ts（schema 源）、en-US.ts
├─ stores/
│  └─ slideRule.ts       # 型号（含导入槽）、面、动尺/圆盘转子偏移、游标、主题、缩放
├─ designer/
│  ├─ model.ts           # 纯函数：适配/识别、标尺与字段操作、计算操作（get/set/with、预设）
│  ├─ draft.ts           # localStorage 草稿：注入式存储，save/load/clear（不可用时安全空操作）
│  ├─ errors.ts          # 把校验器的 BuildError 路径映射到字段：errorPaths / hasError / subtreeHasError
│  ├─ templates.ts       # 起步 RuleSpec：templateSpecs（linearLog、circularCd）
│  ├─ store.ts           # Pinia：spec、选中、selectedScale/Calculation、buildRule + parseRule 预览、setter
│  ├─ DesignerView.vue   # 全屏外壳：元数据表单、标尺树、错误列表、导出
│  ├─ DesignerPreview.vue # 只读预览：线性图幅或圆盘（缺 disc 给提示）
│  └─ panels/
│     ├─ ScaleForm.vue   # 5b：选中标尺自身字段 + 复制
│     └─ CalcForm.vue    # 5c：选中标尺的整份计算 + 生成器预设
├─ utils/
│  ├─ importRule.ts      # importRuleText：JSON 文本 -> parseRule（线性或圆形）
│  └─ print.ts           # 1:1 打印文档 + window.print
└─ components/
   ├─ AppBar.vue          # 共享顶栏：主题、语言、导出、帮助、模拟器 <-> 设计器
   ├─ ScaleSection.vue    # 每段挂载一个 SVG；调用 renderSection
   ├─ SlideRule.vue       # 线性视图：叠放的面、缩放/平移、拖动、悬停、游标
   ├─ CircularRule.vue    # 圆形视图：旋转圆盘、转子拖动、径向游标
   ├─ CursorReadings.vue  # 线性读数面板
   ├─ CircularReadings.vue # 圆形读数面板：逐游标读数
   ├─ ImportRuleDialog.vue # 报告导入失败（语法 / 校验）
   ├─ ThemeSelector.vue   # 主题选择器
   └─ TutorialOverlay.vue # 首次运行引导

packages/generator/src/            # 浏览器安全的库 + 仅 Node 的 CLI：无 Vue、无 DOM、无 renderer
├─ index.ts             # 公共 API：buildRule、RuleSpec 类型、presets
├─ spec.ts              # RuleSpec / FaceSpec / ScaleSpecInput / BuildError
├─ build.ts             # buildRule：内联 { ref }、组装 schema-v1 DTO、parseRule
├─ presets.ts           # logScale、logDecades、linearScale、fnScale、valueFnScale、exprScale、reciprocal、interval
├─ cli.ts               # runCli(argv, io)：退出码契约
└─ bin.ts               # `slide-rule-gen`：node:fs / process -> runCli

e2e/                     # Playwright 端到端规格（仓库根；不含于 Vitest）
├─ simulator.spec.ts     # 1002 渲染并切换到 57 型
├─ designer.spec.ts      # 设计器起稿 1002 / 预览圆形模板
├─ import.spec.ts        # 设计器导出的定义可导回为 `imported`
└─ circular.spec.ts      # 圆形规则导入、转动转子并读取游标
```
`packages/core` 存放与框架无关的类型、引擎、JSON schema/加载器与权威尺数据；
`packages/renderer` 存放与框架无关的毫米布局、主题令牌与 SVG 绘制；
`packages/simulator` 是 Vue 应用（含设计器）；`packages/generator` 是编写层，
产出经校验的 schema-v1 JSON。其库入口（`src/index.ts`：`buildRule`、`RuleSpec`
类型、presets）只导入 `core`，浏览器安全，因此设计器直接使用它；只有其 CLI
（`bin.ts`：`node:fs` / `process`）仅 Node。依赖是单向的：`simulator -> core`、
`simulator -> renderer`、`simulator -> generator`（仅库）、`renderer -> core`、
`generator -> core`；`generator` 绝不导入 `renderer` 或 `simulator`；
`core` 运行时不依赖任何包（JSON 由打包器内联）。

设计器把预览放在左侧、表单放在右侧（与模拟器同向）。表单第一列始终可见，分为
**计算尺**（id/名称/尺形/物理尺寸）与 **布局**（逐面/逐段的标尺列表，带序号，每个段
标题带一个 **+**，有选中则插其后、否则追加）；仅当选中标尺时，其右侧才出现第二列，
显示该标尺的 **标尺字段** 与 **计算**。所选标尺的表单以强调色边框区分，校验改为预览
下方的状态栏而非面板。渲染器为每条
标尺打上 `data-scale-index` / `data-section`（其段带上有 `data-face`），并提供默认惰性的
命中区（`.scale-hit` / `.disc-hit`），于是 `DesignerPreview` 可点击预览中的标尺选中它；
这些命中区在导出与打印中保持惰性。

模拟器与设计器共用 `components/AppBar.vue`，因此两个界面暴露同一套软件级控件：
主题选择、语言切换、按上下文的导出菜单、帮助按钮，以及模拟器/设计器切换。实验与
创作类控件（模拟器的型号控件、设计器的载入型号/模板/导入）放在顶栏的
`brand` / `tools` 插槽中。`appMode.ts` 保存 `AppMode` 类型与顶栏的导出项结构，
使两个界面互不耦合。

自 5b 起，设计器为选中的标尺渲染 `panels/ScaleForm.vue`：编辑标尺自身的字段
（`id`、`name`、`type`、`orientation`、`sharedLabels`、`notes`、`numbersBelow`、
`tickEdge`）并可复制它。自 5c 起，它还渲染 `panels/CalcForm.vue`，编辑选中标尺
 的整份 `CalculationSpec`：`domain`、`map`（所有 kind，含 `expr` 的 `position` /
`inverse` 字符串）、`decades`、`decreasing`、`read`、`labelFormat`、`labelLevel`、
`intervals`（step / level 行与区间印数）、`labels` 与 `marks`；原始 DSL 选项
token 经 `designer.*` i18n 显示。若标尺的 `calculation` 是
`{ ref }`，则通过其命名的 `calculations` 条目编辑，store 会先解析该引用。计算可
用生成器预设（`log`、`linear`、`fn`、`valueFn`、`expr`）重新起稿。自 5d 起，
store 保存一份 localStorage 草稿（`draft.ts`：注入式存储，存储不可用时安全空
操作），仅在创建时恢复一次（`draftRestored`），并可清除；校验器的点分路径会
在对应字段或子树内联高亮（`errors.ts` + `.is-error`）；模板下拉可起稿一条最小
的线性或圆形规则（`templates.ts`：`linearLog`、`circularCd`——后者现可以
圆盘预览）。自 5e 起，与框架无关的渲染器可绘制圆形规则：`layout/disc.ts`
（`computeDiscLayout(disc, counts)`）把圆环带均分为三等份——`upper` 最外、
`lower` 最内——每条标尺一圈；`draw/disc.ts`（`renderDiscToSVG` /
`renderDiscSheetToSVG`）绘制同心环，刻度来自同一 `getScaleTicks` 引擎，位置
`p` 的刻度是角度 `2π·p` 的径向线（位置环绕），数字切向旋转，并绘制限制圆与
枢轴；`faces.front` / `faces.back` 两面及其 `upper` / `middle` / `lower` 数组
映射为外 / 中 / 内环组。设计器预览与 `utils/print.ts` 对
`form: "circular"` 使用圆盘图幅（缺 `disc` 时保留 i18n 提示）。螺旋（log-log）
标尺属于更晚的工作。

自 5f 起，模拟器可交互操作圆形规则。store 在线性 `middleOffset` 之外保存转子
偏移 `discOffset`（圈数，默认 0），暴露 `isCircular`
（`currentModel.form === 'circular'`）与 `setDiscOffset` / `resetDisc` 操作，且
`resetMotion` 会同时归零两个偏移。`middle` 段的环即转子，因此其中（可动）标尺
一起转动。`components/CircularRule.vue` 经 `renderDiscToSVG` 以
`rotationTurns: { middle: discOffset }` 绘制圆盘，并为每个 store 游标叠加一条
径向游标线：拖动圆盘转动转子、拖动游标移动它、在游标以外点击圆盘则在该角度
新增一条。`components/CircularReadings.vue` 为每个游标显示一张卡片，逐标尺一行，
经与线性面板相同的 `readScaleValue` / `positionForValue` 引擎读取；对可动标尺
减去转子偏移（编辑读数时再加回），并提供归零转子的按钮。`App.vue` 依
`store.isCircular` 选择视图：圆形规则渲染 `CircularRule.vue` +
`CircularReadings.vue`，线性规则保持不变的 `SlideRule.vue` +
`CursorReadings.vue`。转子与可交互圆形游标不再是更晚的工作；螺旋标尺仍待后续。

模拟器还可以在运行时加载外部 `RuleDefinition` JSON（例如生成器产出、或设计器
导出的规则）。与框架无关的 `utils/importRule.ts` 暴露 `importRuleText(text)`：
解析 JSON，并经 `core.parseRule` 校验，返回标签联合（`ok` / `parseError` /
`errors`）。现在 `form: "circular"` 的规则与线性规则一样被接受。store 的
`imported` 槽（`importedRule`，经 `modelOptions`
暴露，由 `loadRule` / `clearImported` 驱动）把成功的规则采纳为保留型号
`imported`，并像切换内置型号一样重置交互状态；失败则完全不触碰当前型号，且仅当
导入规则正被选中时才在清除时重置。`App.vue` 提供 **Load rule JSON** 按钮，并接受
拖放到模拟器视图（设计器打开时该目标不可用）的 JSON 文件；失败会打开
`components/ImportRuleDialog.vue`，报告原始 JSON 语法信息或聚合的
`RuleError[]`（`path: code: message`）。导入仅在本地、内存中完成：
URL 加载与持久化属于更晚的工作。

### 3.2 职责

| 模块 | 职责 | 依赖 |
|---|---|---|
| `types/` | 类型定义 | - |
| `schema/` | JSON DTO 类型与聚合校验器 | - |
| `format/policies` | 命名印数策略 -> 格式化函数 | 引擎格式化函数 |
| `expr/` | `map.kind: 'expr'` 的安全算术表达式与数值反演 | - |
| `load/` | 校验并解析规则、加载内置规则 | `schema`、`format`、`data/ruleHelpers` |
| `engine/gradations` | 印数格式化辅助函数 | - |
| `engine/logarithmic` | 折叠 / 线性标尺的印数格式化 | `gradations` |
| `engine/scaleMapping` | 某个 Mapping 的 `toPosition` / `toDomain` 与实际绘制范围 | `types` |
| `engine/scaleCalculation` | 唯一的刻度生成器 | `scaleMapping` |
| `engine/scaleFunctions` | 某标尺的刻度数组（经由其 `calc`） | `scaleCalculation` |
| `engine/scaleReader` | 归一化位置处的读数 | `scaleMapping` |
| `data/models` | 型号注册表（`id`、`available`、结构） | `model1002`、`model57` |
| `data/model1002` | 选取已加载的 1002（重导出面辅助函数） | `load/builtInRules`、`data/ruleHelpers` |
| `data/model57` | 选取已加载的 57 型 | `load/builtInRules` |
| `renderer/layout` | 物理规格 -> 毫米布局与像素 | `types` |
| `renderer/layout (disc)` | 圆盘规格 -> 同心标尺环半径 | `types` |
| `renderer/themes` | 6 套主题的颜色令牌（尺面 + 软件界面） | - |
| `renderer/draw` | `renderSection` / `renderRuleToSVG`：刻度、印数、注记 | `core`、`renderer/layout`、`renderer/themes` |
| `renderer/draw (rule/sheet)` | 一个面 / 叠放的 1:1 毫米打印图幅 | `core`、`renderer/layout`、`renderer/themes` |
| `renderer/draw (disc)` | 一个圆盘 / 叠放的 1:1 毫米圆盘图幅 | `core`、`renderer/layout`、`renderer/themes` |
| `stores/slideRule` | 全局状态，含运行时导入的规则槽 | `models`、`renderer/themes` |
| `simulator/utils/importRule` | JSON 文本 -> `parseRule`（线性或圆形） | `core` |
| `simulator/utils/print` | 1:1 打印文档（线性图幅或圆盘）；打开打印对话框 | `renderer` |
| `components/ScaleSection` | 经由 `renderSection` 挂载一段 SVG | `renderer`、`i18n` |
| `components/SlideRule` | 叠放的面、交互 | `ScaleSection`、`renderer`、`stores` |
| `components/ImportRuleDialog` | 报告导入失败（语法 / 校验） | `i18n`、`utils/importRule` |
| `designer/model` | 纯 spec 操作：适配、识别、标尺/字段操作、计算操作与预设 | `core`（类型）、`generator`（类型） |
| `designer/draft` | localStorage 草稿（注入式存储；save/load/clear，安全空操作） | `designer/model`、`generator`（类型） |
| `designer/errors` | 把校验器的 `BuildError` 路径映射到表单字段 | `generator`（类型） |
| `designer/templates` | 起步 `RuleSpec`（`linearLog`、`circularCd`） | `core`（类型）、`generator` |
| `designer/store` | 设计器状态；`buildRule` + `parseRule` 构建/预览、字段与计算 setter | `designer/model`、`core`、`generator` |
| `designer/DesignerView` | 全屏外壳：元数据表单、标尺树、错误列表、导出 | `designer/store`、`i18n` |
| `designer/DesignerPreview` | 只读预览：线性用 `renderRuleSheetToSVG`，圆形用 `renderDiscSheetToSVG`；缺 disc 给提示 | `renderer`、`core` |
| `designer/ScaleForm` | 选中标尺的字段表单（自身字段 + 复制） | `designer/store`、`designer/model`、`core`、`i18n` |
| `designer/CalcForm` | 选中标尺的计算表单（全部字段、`expr` 映射、预设） | `designer/store`、`designer/model`、`core`、`i18n` |
| `generator/spec` | 编写用的 `RuleSpec` DTO（命名 `calculations` + `{ ref }`、`form` / `disc`） | `core`（类型） |
| `generator/build` | `buildRule`：内联 ref、组装并校验 | `core`、`generator/spec` |
| `generator/presets` | 在显式实测字段之上的 map/read/labelFormat 预设 | `core`（类型） |
| `generator/cli` | `runCli(argv, io)` 与退出码契约 | `generator/build` |

### 3.3 国际化
- **单一入口**：`packages/simulator/src/i18n/`。组件使用 `const { t } = useI18n()`。
- **Schema 强制**：`zh-CN.ts` 导出 `MessageSchema`（`typeof messages`）；
  `en-US.ts` 以其为类型，所以缺少键会让 `vue-tsc` 失败。
- **数据中无文案**：主题与型号只携带 `id`；显示名来自
  `t('theme.<id>')` / `t('model.<id>')`，标尺提示用 `t('scaleDesc.<name>')`。
- **切换**：`applyLocale()` 更新 `i18n.global.locale`、`<html lang>` 与
  文档标题，然后持久化到 `localStorage['sliderule-1002:locale']`。
- **检测**：简体中文环境选择 `zh-CN`；其余选择 `en-US`。
- **新增语言**：添加 `locales/<tag>.ts`，在 `SUPPORTED_LOCALES` 注册，并添加
  `language.<tag>`。

### 3.4 刻度生成（六步）
每条标尺的刻度都由 `engine/scaleCalculation.ts` 的 `generateScaledTicks(calc)` 产生。
`calc` 由 `load/resolve.ts`（`parseRule`）从该标尺的 JSON `calculation` 解析而来；
其 `labelFormat` 策略由 `format/policies.ts` 解析：
1. 逐 `interval` 铺刻度，最细步长在前；较粗步长会对其重合的刻度重定级；
2. 按 `decades`（K=3、A/B=2）重复区间；
3. 把 `domain` 两端加成 L1 刻度；
4. 放印数 `labels`（读数值，`toPosition(unread(value))`，文本经 `labelFormat`；
   `labelLevel` 决定印数是否强制 L1）；
5. 放 `marks`（π、√10、`∞` 渐近线）；
6. `decreasing` 镜像，然后按位置排序。

完整的"元数据 → 刻度 → SVG"管线见 [calculation-pipeline-cn.md](calculation-pipeline-cn.md)。

### 3.5 规则生成器
`packages/generator` 在 schema-v1 DTO 之上加一层编写模型，只依赖 `core`。其
**库**（`src/index.ts`：`buildRule`、`RuleSpec` 类型、presets）浏览器安全，因此
模拟器的设计器直接导入它；只有其 **CLI**（`bin.ts`：`node:fs` / `process`）
仅 Node。
- **`RuleSpec`**（`spec.ts`）是 `RuleDefinition` 的 DTO 超集。它增加规则级的
  `calculations: Record<string, CalculationSpec>`，并允许标尺的 `calculation`
  为内联 `CalculationSpec` 或 `{ ref: name }`。这是唯一的编写间接层，因此共享
  数学（C/D、A/B）只写一次。它原样携带 DTO 的规则级 `form` / `disc` 字段。
- **`buildRule(spec)`**（`build.ts`）内联所有 ref、组装 schema-v1
  `RuleDefinition`，并用 `core.parseRule` 校验。它是全函数的：坏输入以
  `{ ok: false, errors }` 返回（`BuildError { path, message, code? }`），
  绝不抛异常：生成器汇总 core 错误并把错误码放到 `BuildError.code`。ref 用
  `Object.hasOwn` 查找，因此 `__proto__`/`constructor` 不会解析成功。
- **预设**（`presets.ts`：`logScale`、`logDecades`、`linearScale`、`fnScale`、
  `valueFnScale`、`exprScale`）只提供 map / labelFormat 的样板；结构辅助
  `interval` / `reciprocal` 构造 `intervals` / `read` 的形状。所有实测字段——
  domain、intervals、labels、marks——都由作者显式传入，预设绝不会凭空捏造刻度
  数据。
- **CLI**（`cli.ts` / `bin.ts`）：`slide-rule-gen build <spec.json> -o <out.json>`。
  `runCli(argv, io)` 是纯函数、可单测；`bin.ts` 提供真实的 `node:fs` / `process`
  IO。退出码契约：`0` 成功，`1` 规格可构建但校验失败（所有错误写到 stderr），
  `2` 调用或输入无法处理（用法、文件不可读、JSON 非法、输出不可写）。
- **黄金测试**（`golden.test.ts`）通过 `logScale` 重建 1002 正面中排 `C` 的计算，
  断言其与权威 `packages/core/rules/1002.json` 的计算逐字段深度相等、构建出的
  规则能通过 `core.parseRule`，且 `getScaleTicks` 与权威标尺一致。整尺黄金测试
  （全部标尺）留待后续。

---

## 4. 数据流

### 4.1 静态（启动）
```
rules/1002.json、rules/type-57.json（权威数据，schemaVersion: 1）
  -> builtInRules() -> parseRule（校验 + 解析）
  -> model1002.ts / model57.ts（MODEL_1002 / MODEL_57）-> models.ts
  -> SlideRule.vue（对视口使用 ResizeObserver）
  -> renderer: computeFaceLayout(physical, width * zoom) -> FaceLayout
  -> ScaleSection.vue: renderSection(svg, { scales, section, layout, theme })
  -> core: getScaleTicks(scale) -> Tick[]
  -> SVG（以毫米为单位的线与文字）
```

### 4.2 交互
```
拖动动尺 -> onMiddlePointerDown -> store.middleOffset
                                 -> 两个面一起平移
拖动游标 / 点击尺面 -> store.cursors（新增 / 移动 / 删除）
悬停或拖动游标 -> hoverReadouts -> 每条标尺条一个读数
缩放滑块或输入比例 -> store.zoom -> pxPerMm（唯一的缩放入口）
```

### 4.3 外部规则导入
```
文件选择 / 拖放 -> file.text() -> store.loadRule
  -> utils/importRule：JSON.parse -> parseRule（线性或圆形）
  -> 成功：store.importedRule、型号 `imported`、resetInteraction
  -> 失败：ImportRuleDialog（parseError / RuleError[]）
```

---

## 5. 性能

### 5.1 渲染
- **唯一缩放因子**：`pxPerMm` 驱动所有尺寸；缩放与新模型不触碰其他东西。
- **无畸变**：一段 SVG 的 viewBox 与其屏幕宽高比一致。
- **无占位标尺**：每条标尺都带有 `calc`；没有 `calc` 的标尺只是不画刻度。
- **实测区间**：标尺的 `ScaleCalculation` 列出其实测 `intervals`（最细步长在前；
  较粗的步长会对其重合的刻度重定级），因此每条标尺的元素个数由照片决定，
  而非由运行时的梯级计算得出。

### 5.2 交互
- **pointer 事件**统一鼠标与触摸。
- **钳制**：动尺偏移 [-1, 1]，游标位置 [0, 1]，缩放 [1, 6]。
- **游标上限**：最多 8 个游标；最后一个调用 `removeCursor` 时是清空而非删除。
- **不做防抖**：状态直接更新（原生 60fps）。
- **滚动条留白**：`html { scrollbar-gutter: stable }` 防止中间缩放级别下
  竖向滚动条出现时布局来回抖动。

---

## 6. 类型安全

### 6.1 核心类型
```typescript
export type ScaleType =
  | 'C' | 'D' | 'A' | 'B' | 'K' | 'CF' | 'DF' | 'CI' | 'DI' | 'CIF' | 'L'
  | 'LN1' | 'LN2' | 'LN3' | 'LN1I' | 'LN2I' | 'LN3I'
  | 'H2' | 'H3' | 'H2P' | 'SH2' | 'SH3' | 'TH2'
  | 'SIN2' | 'COS2' | 'TG2' | 'CTG2' | 'TG3' | 'CTG3'
  | 'S' | 'ST' | 'T'

export interface Tick {
  position: number       // 归一化 0..1
  value: number
  level: 1 | 2 | 3       // 主刻度（带印数）/ 中 / 细
  label?: string
  angle?: number         // 度；三角标尺（用于副角印数）
}

export interface ScaleDefinition {
  id: string
  name: string
  type: ScaleType
  side: 'front' | 'back'
  section: 'upper' | 'middle' | 'lower'
  isMovable: boolean
  orientation: 'increasing' | 'decreasing'
  color: string
  sharedLabels?: SharedLabel[]
  notes?: string[]       // 右侧参考注记
}
```

### 6.2 覆盖
- 每个组件都使用 `<script setup lang="ts">`。
- 每次构建前运行 `vue-tsc --noEmit`。
- `tsconfig.json` 启用 `strict`、`noUnusedLocals`、`noUnusedParameters`。

---

## 7. 测试

### 7.1 单元测试（已实现，Vitest）
| 文件 | 覆盖 |
|---|---|
| `renderer: layout/layout.test.ts` | 6:1 宽高比、pxPerMm 缩放、行高求解、4/6/4 叠放、凹槽位置、tickX / rowTopMm |
| `renderer: draw/section.test.ts` | `renderSection` / `renderRuleToSVG`：刻度 class 与档级、印数文本与位置、注记、边界线 |
| `renderer: draw/rule.test.ts` | 1:1 图幅、面叠放、间距与动尺偏移 |
| `renderer: draw/labelLayout.test.ts`、`draw/radicalGeometry.test.ts` | 副角标注偏移；根号几何比例 |
| `core: schema/validate.test.ts` | 校验器的错误码与一次遍历聚合 |
| `core: load/parseRule.test.ts`、`load/builtIn.test.ts`、`load/serialize.test.ts` | 规格解析、加载权威 JSON、运行时 -> DTO 的无损往返 |
| `core: engine/scaleMapping.test.ts` | log、linear、fn、valueFn 映射的 `toPosition` / `toDomain` |
| `core: expr/{parse,evaluate,invert}.test.ts` | 安全解析器 / 求值器与数值反演 |
| `core: load/exprRule.test.ts` | `expr` 映射端到端：刻度、解析式与数值读数、序列化往返 |
| `core: engine/scaleCalculation.test.ts` | `ScaleCalculation` -> 刻度几何、印数档级与记号 |
| `core: engine/scaleCalculation.dashboard.test.ts` | 两个型号的每条 `ScaleDefinition` 都有 `calc` 且每个刻度都能往返 |
| `core: engine/logarithmic.test.ts` | 折叠 / 线性标尺的印数格式化 |
| `core: data/model1002Graduations.test.ts` | 1002 实测刻度：最细步长、数量、档级、印数、位置 |
| `core: engine/type57Scales.test.ts` | 57 型 S / ST / T 端点与往返；复用的 K / A / C / D / DI / L |
| `core: engine/scaleReader.test.ts` | 游标读数往返、双向 `positionForValue` 逆映射、容差边界、`formatValue` |
| `simulator: data/model57.test.ts` | 57 型物理规格、2/4/3 布局、标尺列表与颜色、注册表 |
| `simulator: stores/slideRule.test.ts` | 游标列表：新增（上限 + 钳制）、移动、删除、最后一个的守卫、型号重置；单面型号 |
| `simulator: utils/print.test.ts` | `buildPrintHTML` 的 `@page`/转义；`printSlideRule` 打开并打印 |
| `simulator: designer/model.test.ts`、`designer/store.test.ts` | 纯 spec 操作（definition 往返、文档识别、标尺增删移、form/disc）；store 的 load/select/build/preview 迁移 |
| `simulator: designer/DesignerView.test.ts` | 组件（jsdom）：起稿 1002 -> 有效构建、载入圆形模板 -> 圆盘预览、面宽为零 -> 校验错误 |
| `simulator: designer/DesignerPreview.test.ts` | 组件（jsdom）：线性规则为图幅、圆形规则为圆盘、缺 disc 的圆形规则给提示 |
| `simulator: components/{CircularRule,ImportRuleDialog}.test.ts` | 组件（jsdom）：圆形圆盘挂载并渲染；语法错误信息、聚合 `RuleError[]` 的 `path: code: message`、close 事件 |
| `generator: build.test.ts` | ref 内联（未知 ref、原型安全查找）、core 错误映射、全函数性与输入不可变 |
| `generator: presets.test.ts` | 各预设的 map / labelFormat 输出，以及各结构辅助的形状，相对显式字段 |
| `generator: cli.test.ts` | 退出码契约（`0` / `1` / `2`），使用内存 IO |
| `generator: golden.test.ts` | 由独立字面量重建 1002 `C` 的计算，再与权威数据比对 |

首批**组件测试**经 `mountWithPlugins`（`packages/simulator/src/test/mount.ts`：
一个全新的 Pinia + 应用 i18n）用 `@vue/test-utils` 在 jsdom 中挂载真实组件。
根目录 `vitest.config.ts` 应用 `@vitejs/plugin-vue` 以编译 `.vue`；Vitest 默认的
include/exclude 与每个文件顶部的 `// @vitest-environment jsdom` 注释均保留，
因此原有的 node 套件不受影响。

### 7.2 待补充
- 配置完整性：`countScales(model) = 28`、4/6/4 分布
- 交互：拖动数学（含缩放因子）

### 7.3 端到端（已实现，Playwright）
仓库根目录的 `playwright.config.ts` 本地驱动系统 **Microsoft Edge**
（`channel: 'msedge'`，因此不下载浏览器）；CI runner 没有 Edge，则回退到
Playwright 自带的 **Chromium**（`npx playwright install chromium`），由
`process.env.CI` 选择（可用 `PW_CHANNEL` 覆盖）。它固定
`testIdAttribute: 'data-test'`，并通过其 `webServer` 在
`http://localhost:3000` 启动（CI 之外则复用）开发服务器。
套件共 5 个测试、分四个规格：`e2e/simulator.spec.ts`（1002 渲染后切换到 57 型）、
`e2e/designer.spec.ts`（设计器起稿 1002、并把圆形模板预览为圆盘）、
`e2e/import.spec.ts`（设计器导出的定义可导回为 `imported` 型号）与
`e2e/circular.spec.ts`（圆形 fixture 导入、转子转动且读数保持实时）。用
`npm run e2e` 运行；`e2e/` 规格不含在 `npm test`（Vitest）与 `verify` CI job 内，
但在 `e2e` CI job 中运行。`e2e/tsconfig.json` 经 `npm run typecheck:e2e` 检查规格
与 `playwright.config.ts`，该脚本已接入 `npm run build`。

---

## 8. 部署

### 8.1 构建产物
```bash
npm run build
# packages/simulator/dist/
#   index.html
#   assets/index-[hash].js
#   assets/index-[hash].css
```

### 8.2 目标
- **GitHub Pages**（首选）
- Vercel / Netlify（备选）
- 本地：`npm run preview`

### 8.3 CI
`.github/workflows/ci.yml` 含两个 job。`verify` 运行 `npm ci`、`npm run lint`、
`npm test` 与 `npm run build`（其中含 `typecheck:e2e`）。`e2e`（由
`needs: verify` 把关）安装 Chromium 并运行 `npm run e2e`，缓存
`~/.cache/ms-playwright`，失败时上传 `test-results`。

---

*版本：v3.3*
*创建：2025-01*
*最后修订：2026-09 —— 权威 JSON 规则（`rules/*.json`）由 `parseRule` / `builtInRules`
加载并校验；与框架无关的 `renderer` 包；浏览器安全的 `generator` 库
（`buildRule`）+ 仅 Node 的 CLI（`slide-rule-gen`）；57 型；统一计算模型；
`map.kind: 'expr'` 表达式 DSL；1:1 打印导出；可视化设计器外壳
（`simulator/src/designer/`）、其 5b 单尺字段表单（`panels/ScaleForm.vue`）、
其 5c 计算编辑器（`panels/CalcForm.vue`，基于纯计算与预设操作）、其 5d 打磨
（`draft.ts`、`errors.ts`、`templates.ts`：localStorage 草稿、内联错误高亮与
起步模板）与其 5e 圆形渲染（`layout/disc.ts` / `draw/disc.ts`：
`computeDiscLayout` 与 `renderDiscToSVG` / `renderDiscSheetToSVG`，供设计器预览
与 1:1 打印使用），以及 `form` / `disc` 圆形尺元数据；模拟器运行时加载外部
`RuleDefinition` JSON（文件选择 / 拖放 -> `utils/importRule.ts` -> `parseRule`、
store 的 `imported` 槽与 `components/ImportRuleDialog.vue`）；以及首批组件测试
（带 Vue 插件的 `vitest.config.ts`、`@vue/test-utils` / jsdom、
`simulator/src/test/mount.ts`、`designer/DesignerView.test.ts`、
`designer/DesignerPreview.test.ts` 与 `components/ImportRuleDialog.test.ts`）；
Playwright 端到端套件（`playwright.config.ts` +
`e2e/{simulator,designer,import,circular}.spec.ts`，经 `npm run e2e` 在系统
Microsoft Edge 上运行，不含在 `npm test` 内）；以及圆形规则交互（`App.vue` 中的
`CircularRule.vue` + `CircularReadings.vue`、经 `renderDiscToSVG` 的
`rotationTurns` 应用的 `discOffset` 转子、`middle` 环转子读数与被接受的圆形导入）；
以及圆形端到端流程（`e2e/circular.spec.ts`）；端到端套件接入 CI（`ci.yml` 的
`e2e` job，runner 上用 Chromium）、由 `npm run build` 中的 `typecheck:e2e` 做类型
检查，且两面圆形规则默认双面、两个圆盘与线性尺面一样纵向叠放*
