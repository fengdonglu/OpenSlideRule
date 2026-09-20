# 交接 / 当前状态

快照：2026-09-19。这是一份工作笔记，不是真相源；领域与工程文档仍为准。

## 项目

两款中国计算尺的网页模拟：全尺寸**1002**（双面）与便携**57 型**（单面）。
技术栈：Vue 3 + TypeScript（strict）+ Vite + Pinia + vue-i18n；几何用毫米，
`pxPerMm` 是唯一缩放入口。

真相源只有两个：`docs/domain/prototype/` 下的原型照片，以及维基。不清楚的事实
一律标"尚未建立"，绝不猜测。

## 本会话完成

- **1002 每条标尺都有实测刻度表**并驱动绘制：`ln1/2/3`、`sin2/cos2`、
  `tg2/tg3`、`sh2/sh3`、`H2/H'2/H3`、`th2`、`C/D/CI/DI`、`A/B/K`、
  `CF/DF/CIF`、`lg`。数据在 `packages/core/rules/1002.json`。
- **渲染**：`sh2/sh3` 与 `tg2/tg3` 共用一条基线（`ScaleDefinition.tickEdge`
  = `floor` / `roof`）；红色副角数字分列刻度线两侧（黑左红右）；顶挂行的数字
  与最长刻度错开。
- **标注**：A/B/K 只印整数（A/B 另有 π）；C/D 在 `[1,2)` 印十分位、其余整数；
  CI/DI 印倒数整数；`th2` 数字印在刻度**下方**；C/D `[1,2)` 的 `.05` 中点为长档；
  实测的 hyperbolic 行上，印数不再被强制为最长档。
- **文档**：`docs/domain/model-1002.md` §3.9 记录各次实测与未决行；
  `docs/dev/graduations.md`（及 `-cn`）是**自动生成的逐行审计表**
  （分段、`步长@档级`、印数、贴边/共用边/朝向/数字上下、位置范围）。
- **测量方法与工具**：`docs/dev/measurement.md`（及 `-cn`）记录了逐行测量
  的做法；`tools/measure/`（离线、`jpeg-js`、不进构建）保存了可复用的
  `crop`、`strip`、`rowscan`、`ticklen`、`fitmap`、`segments`。
- **统一计算模型（Plan 1-3）**：`types/scale.ts`（`ScaleCalculation`、`Mapping`）、
  `engine/scaleMapping.ts`、`engine/scaleCalculation.ts` 为每条标尺给出统一的声明式
  计算；**每条标尺现在都用同一份计算同时驱动绘制与读数**——57 型自 Plan 1 起，整个
  1002 自 Plan 2 起。实测区间与印数均未改变；绘制刻度有两处变化：H'2 的末端刻度
  （其绘制定义域末端改为 `0.995` 后少了一个），以及 CIF 的档级改用实测的
  `CF_GRADUATIONS`（两个 CF 索引端为 L1、十个网格刻度为 L3，即 `L1 20→22、
  L2 87→75、L3 229→239`，同为 336 条，由 `model1002Graduations.test.ts` 固定）。
  Plan 3 起 `readScaleValue` / `positionForValue` 也改读 `calc`。审计表通篇读
  `calc`。旧的 `GraduationTable` /
  `ScaleReading` 类型、`specialScales` 生成器、`engine/scaleReading.ts` 与
  `engine/logarithmic.ts` 的刻度生成器均已删除。
- 所有改动均过 `npm run lint`、`npm test`（356）、`npm run build`。
- **renderer 抽取（multi-package 1c）**：毫米布局与主题令牌从
  `packages/simulator` 移入与框架无关的 `packages/renderer`；纯绘制 API
  （`renderSection`、`renderRuleToSVG`、`measureRadicals`）现在把内存中的尺
  直接画成 SVG，`ScaleSection.vue` 只负责挂载 `<svg>` 并调用它。
- **JSON 规则成为真相源（multi-package 1d）**：可序列化的
  `RuleDefinition`（`schemaVersion: 1`）现在定义一个规则。
  `packages/core/rules/1002.json` 与 `type-57.json` 为权威数据；
  `schema/validate.ts` 聚合 `RuleError[]`，`load/resolve.ts` 把
  `CalculationSpec` 解析为运行时的 `ScaleCalculation`，`parseRule` 先校验后
  解析，`builtInRules` 加载这两个文件。`MODEL_1002` / `MODEL_57` 即解析后的
  规则。实测 TS 模块（`data/model1002Calculations.ts`、
  `data/model1002Graduations.ts`、`data/model57Graduations.ts`、
  `engine/specialScales.ts`）已删除；`data/ruleHelpers.ts` 保存共享辅助函数，
  `model1002.ts` / `model57.ts` 只是薄包装。
- **规则生成器（`packages/generator`，phase 2）**：仅 Node 的构建期包（其库在
  5a 变为浏览器安全，见下），依赖为单向的 `generator -> core`。作者编写
  `RuleSpec`（DTO 超集：规则级命名的
  `calculations` 与逐标尺 `{ ref }`）；`buildRule` 内联 ref、组装 schema-v1
  `RuleDefinition` 并用 `core.parseRule` 校验，返回 `{ ok, rule }` 或
  `{ ok: false, errors }`，绝不抛异常。预设（`logScale`、`logDecades`、
  `linearScale`、`fnScale`、`valueFnScale`、`reciprocal`、`interval`）只承载
  map/read/labelFormat 样板；实测字段仍在规格中显式给出。CLI 为
  `slide-rule-gen build <spec.json> -o <out.json>`（退出码 `0` 成功、`1` 规格
  非法、`2` 用法/IO），逻辑在纯函数、可单测的 `runCli(argv, io)` 中。逐标尺
  黄金测试经 `logScale` 重建 1002 `C` 计算，并与 `rules/1002.json` 逐字段对比。
  根 `build` 也会构建生成器。所有改动均过 `npm run lint`、`npm test`、
  `npm run build`。
- **表达式 DSL（`packages/core/src/expr/`，phase 3）**：`expr/parse.ts` 是手写的
  分词器 + 递归下降解析器（不使用 `eval`）；`expr/evaluate.ts` 在 `x` / `p` 变量
  上编译 `position` / `inverse`，名字仅限 `pi`、`e` 与固定的函数白名单；
  `expr/invert.ts` 提供 `numericInverse`（区间二分）。新增可选的
  `map.kind: "expr"`（`ExprMapSpec`：`position` 必填、`inverse?`），由 schema 校验：
  两个字符串都做解析与名字检查，正向表达式还会在定义域上采样以验证有限性与严格
  单调（`invalidExpression`）。`load/resolve.ts` 把它编译成 `ExprMapping`：给出
  `inverse` 时用解析式 `toDomain`，否则用数值反演；`load/serialize.ts` 无损往返。
  生成器新增 `exprScale` 预设。内置规则及其 JSON 未变（没有内置规则使用 `expr`）。
  所有改动均过 `npm run lint`、`npm test`、`npm run build`。
- **1:1 打印 / PDF 导出（phase 4）**：renderer 的 API 是增量式的。新增第二个整尺
  入口 `renderRuleSheetToSVG(rule, { faces, theme, titleOf, slideOffsetMm })`，把可见
  面按 1:1 毫米叠放在一张白色图幅上，面间距为 `PRINT_FACE_GAP_MM = 4`；
  `RenderRuleOptions` 新增可选的 `slideOffsetMm`，只有每个面的中排带子在偏移
  非零时带有 `translate(slideOffsetMm, 0)`。simulator 新增 `utils/print.ts`：`buildPrintHTML`
  把序列化后的图幅包进独立文档，其 `@page { size: <w>mm <h>mm; margin: 0 }`；
  `printSlideRule` 在屏幕外渲染并测量图幅、序列化后打开打印对话框；新增的
  `export.print` i18n 键用于菜单项，`App.vue` 传入当前动尺偏移（毫米）。全程不
   从缩放后的 DOM 抓取，且**未改动任何实测数据**（`packages/core/rules/*.json`
   与生成的审计表逐字节不变）。所有改动均过 `npm run lint`、`npm test`（431）、
   `npm run build`。
- **可视化设计器基座（phase 5a，tasks 1-5）**：`packages/core` 在 DTO 与运行时
  类型上新增规则**尺形**（`linear` / `circular`）与 **`disc`** 元数据
  （`RuleForm`、`DiscSpec`），并新增校验码 `unknownForm` / `invalidDisc` /
  `unexpectedDisc`；圆形规则缺省 `physical` 时合成正方形外接框，`resolve` /
  `serialize` 往返尺形。`packages/generator` 的 `RuleSpec` 携带 `form` / `disc`，
  `@slide-rule/generator` 现为 `simulator` 依赖（其库浏览器安全，仅 `bin.ts`
  仅 Node）。`packages/simulator/src/designer/` 新增纯函数 `model.ts`（适配、
  识别、标尺增删移、form/disc）、Pinia `store.ts`（`buildRule` + `parseRule`
  构建/预览）以及 `DesignerView.vue` / `DesignerPreview.vue` 外壳，由 `App.vue`
   挂载，i18n 键在 `designer.*` 下。5a 编辑 form / disc 元数据但**不渲染圆形规则**
   （那是 5e）；未改动任何实测数据。所有改动均过 `npm run lint`、`npm test`（456）、
   `npm run build`。
- **可视化设计器单尺字段（phase 5b）**：设计器的
  `packages/simulator/src/designer/model.ts` 新增纯字段操作
  （`updateScale`、`duplicateScale`、共享标注增 / 删 / 改、注记增 / 删 / 设，
  以及 `noteToParts` / `partsToNote`）；`store.ts` 暴露 `selectedScale` 与
  写穿操作（`setScaleField`、`duplicateScale`、`addSharedLabel` /
  `removeSharedLabel` / `updateSharedLabel`、`addNote` / `removeNote` /
  `setNoteParts`）；`panels/ScaleForm.vue` 在 `DesignerView.vue` 中挂载，编辑
  选中标尺自身的字段（id、name、type、orientation、sharedLabels、notes、
  numbersBelow、tickEdge）并可复制它，i18n 键在 `designer.*` 下。5b 只编辑
  标尺自身字段；计算编辑器是 5c，且未改动任何实测数据。所有改动均过
  `npm run lint`、`npm test`（467）、`npm run build`。
- **可视化设计器计算编辑器（phase 5c）**：设计器的 `model.ts` 新增计算操作——
  `CalculationTarget`，以及 `getCalculation` / `setCalculation` 与针对
  `CalculationSpec` 每个字段的读改写操作（`setDomain`、`setDecades`、
  `setDecreasing`、`setRead`、`setLabelFormat`、`setLabelLevel`、`setMap`）、`defaultMap` 与
  基于 `log` / `linear` / `fn` / `valueFn` / `expr` 生成器预设的 `seedPreset`，
  还有区间、印数与记号的列表操作。`store.ts` 把选中标尺的计算解析为
  `calculationTarget` / `selectedCalculation`（`{ ref }` 标尺编辑其命名的
  `calculations` 条目）并暴露写穿操作。`panels/CalcForm.vue` 在
  `DesignerView.vue` 中挂载，编辑整份计算：`domain`、所有 `map.kind`（含
  `expr` 的 `position` / `inverse` 字符串）、`decades`、`decreasing` 镜像
  开关、`read`、`labelFormat`、`labelLevel`、`intervals`（step / level 行与区间
  印数）、`labels` 与 `marks`，并可用生成器预设重新起稿；DSL 选项标签全部经
  `designer.*` i18n。未改动任何实测数据。
  所有改动均过 `npm run lint`、`npm test`（486）、`npm run build`。
- **可视化设计器打磨（phase 5d）**：`designer/draft.ts` 保存 localStorage 草稿，
  存储为注入式（node、隐私模式或配额不足时安全空操作）：`saveDraft` /
  `loadDraft` / `clearDraft`；`store.ts` 仅在创建时恢复一次草稿
  （`draftRestored`）并暴露 `clearDraft`。`designer/errors.ts` 把校验器的点分
  `BuildError` 路径映射到表单字段（`errorPaths`、`hasError`、`subtreeHasError`），
  `designer/templates.ts` 暴露 `templateSpecs()`，含 `linearLog` 与 `circularCd`
  两个起步规则（`circularCd` 当时仅为圆形元数据，自 5e 起可作为圆盘预览）。`DesignerView.vue`
  新增模板下拉、清除草稿按钮、草稿恢复提示与
  模板 i18n 标签；`ScaleForm.vue` / `CalcForm.vue` 用 `.is-error` 标出非法字段
   与子树。未改动任何实测数据。所有改动均过 `npm run lint`、`npm test`（501）、
   `npm run build`。
- **可视化设计器圆形渲染（phase 5e）**：与框架无关的渲染器新增
  `packages/renderer/src/layout/disc.ts`
  （`computeDiscLayout(disc, counts)`：圆环带均分为三等份——`upper` 最外、
  `lower` 最内——每条标尺一圈）与 `packages/renderer/src/draw/disc.ts`
  （`renderDiscToSVG` / `renderDiscSheetToSVG`）：同心环的刻度来自与线性渲染器
  同一套 `getScaleTicks` 引擎，位置 `p` 的刻度是角度 `2π·p` 的径向线（位置环绕），
  档级长度为 0.50 / 0.40 / 0.32、宽度固定为 1.5 / 1.2 / 1 px，数字切向旋转，
  并绘制 `circle.limit` 外圈与 `circle.pivot` 内圈，标尺名位于每环顶部；
  `renderDiscSheetToSVG` 以 `DISC_FACE_GAP_MM = 4` 叠放各面。
  `faces.front` / `faces.back` 两面及其 `upper` / `middle` / `lower` 数组映射为
  外 / 中 / 内环组（成文约定）。`DesignerPreview.vue` 按 `circular && rule.disc`
  分支预览圆盘，`utils/print.ts` 对 `form: 'circular'` 使用圆盘图幅（页宽为
   `disc.sheetSizeMm`）；缺 disc 的圆形草稿保留 i18n 提示
  `designer.circularNotice`。转子、螺旋标尺与可交互圆形游标属于更晚的工作。
  未改动任何实测数据。所有改动均过 `npm run lint`、`npm test`（512）、
  `npm run build`。
- **外部规则导入（多包 spec §5E，分支 `simulator-import-json`）**：
  `packages/simulator/src/utils/importRule.ts` 暴露 `importRuleText(text)`：解析
  JSON，并经 `core.parseRule` 校验，返回标签联合（`ok` / `parseError` /
  `errors`）。对 `form: "circular"` 规则的拒绝已在圆形视图落地后移除（见下）。
  store 的 `imported` 槽（`importedRule`、`modelOptions`、`loadRule`、
  `clearImported`）把成功的规则采纳为保留型号 `imported`，并复用
  `resetInteraction`；失败则完全不触碰当前型号，且仅当导入规则正被选中时才在清除时
  重置。UI 为 **Load rule JSON** 工具栏按钮、模拟器视图上的拖放目标、型号下拉项，
  以及 `components/ImportRuleDialog.vue`（语法 / 校验错误），i18n 键在
  `import.*` 下。导入仅在内存、本地完成；URL 加载与持久化属于更晚的工作。未改动
  任何实测数据。所有改动均过 `npm run lint`、`npm test`（524）、`npm run build`。
- **设计器组件测试（分支 `designer-component-tests`）**：首批组件测试，基于
  `@vue/test-utils` + jsdom。根目录 `vitest.config.ts` 应用
  `@vitejs/plugin-vue`（保留 Vitest 默认配置与每个文件顶部的
  `// @vitest-environment jsdom` 注释），`packages/simulator/src/test/mount.ts`
  暴露 `mountWithPlugins`（全新的 Pinia + 应用 i18n）。新增套件：
  `designer/DesignerView.test.ts`（起稿 1002 -> 有效构建、圆形模板 -> 圆盘预览、
  面宽为零 -> 校验错误）、`designer/DesignerPreview.test.ts`（线性图幅、圆盘、
  缺 disc 提示）与 `components/ImportRuleDialog.test.ts`（语法错误、聚合
  `RuleError[]`、close 事件；圆形拒绝用例在圆形视图落地后移除）。`DesignerView.vue` 新增少量
  `data-test` 钩子；未改变生产行为，未改动任何实测数据。所有改动均过
  `npm run lint`、`npm test`（536）、`npm run build`。
- **Playwright 端到端套件（分支 `playwright-e2e`）**：首批端到端测试，位于仓库根
  而非 `packages/` 下。`playwright.config.ts` 驱动系统 **Microsoft Edge**
  （`channel: 'msedge'`，因此不下载浏览器），固定 `testIdAttribute: 'data-test'`，
  以 `fullyParallel` 与 `list` reporter 运行，并通过其 `webServer` 在
  `http://localhost:3000` 启动（CI 之外则复用）开发服务器。三个规格、4 个测试：
  `e2e/simulator.spec.ts`（1002 渲染后切换到 57 型）、`e2e/designer.spec.ts`
  （设计器起稿 1002、并把圆形模板预览为圆盘）与 `e2e/import.spec.ts`（设计器
  导出的定义可导回为 `imported` 型号）。用 `npm run e2e` 运行；规格不含在
  `npm test`（Vitest）内；其后接入了 CI 的 `e2e` job。应用新增少量 `data-test` 钩子；规格预置
  `sliderule-1002:tutorial-seen` 以跳过首次引导。未改动任何实测数据。所有改动均过
  `npm run lint`、`npm test`（536）、`npm run build`。
- **圆形规则交互（分支 `circular-interaction`）**：模拟器现在可交互操作圆形规则。
  `renderDiscToSVG` / `renderDiscSheetToSVG` 新增
  `rotationTurns?: Partial<Record<ScaleSection, number>>`，使某环的刻度、数字与
  名称绘制在 `tick.position + turns`（`middle` 环即转子）；`stores/slideRule.ts`
  新增 `discOffset`（圈数，默认 0）、`setDiscOffset`、`resetDisc`、
  `resetMotion`（同时归零两个偏移）与 `isCircular`
  （`currentModel.form === 'circular'`）；`utils/importRule.ts` 再次接受
  `form: "circular"` 规则，`ImportRuleDialog` 去掉圆形分支。
  `components/CircularRule.vue` 绘制圆盘（`renderDiscToSVG` 传
  `rotationTurns: { middle: discOffset }`），并为每个 store 游标叠加一条径向线——
  拖动圆盘转动转子、拖动游标移动它、在游标以外点击新增一条；
  `components/CircularReadings.vue` 为每个游标显示一张卡片、逐标尺一行，经与线性
  面板相同的 `readScaleValue` / `positionForValue` 引擎读取，对可动标尺应用转子
  偏移，并有归零转子的按钮。`App.vue` 依 `store.isCircular` 分支到
  `CircularRule` / `CircularReadings`。E2E 套件新增 `e2e/circular.spec.ts`
  （圆形 fixture 导入、转子转动、读数保持实时）。未改动任何实测数据。所有改动均过
  `npm run lint`、`npm test`（546）、`npm run build`。
- **E2E 入 CI + e2e 类型检查（分支 `e2e-ci`）**：`playwright.config.ts` 依环境选择
  浏览器——本地用系统 Edge，CI 用 Playwright 自带 Chromium（可用 `PW_CHANNEL` 覆盖）。
  `.github/workflows/ci.yml` 新增 `e2e` job（`needs: verify`），缓存
  `~/.cache/ms-playwright`、以 `--with-deps` 安装 Chromium 并运行 `npm run e2e`，
  失败时上传 `test-results`；配置在 CI 下还启用 `retries: 1` 与
  `trace: 'on-first-retry'`。新增 `e2e/tsconfig.json`（配手写的 `e2e/node.d.ts`，
  因此无需 `@types/node`），经新脚本 `typecheck:e2e` 检查规格与
  `playwright.config.ts`，并已接入 `npm run build`。（两面圆形规则最初默认单面模式并
  保留前/后换面按钮；后改为默认双面、两个圆盘叠放——见圆形交互部分。）未改动任何
  实测数据。所有改动均过
  `npm run lint`、`npm test`（553）、`npm run build`（含 `typecheck:e2e`）与
  `npm run e2e`（5）。

## 未决 / 待定

- **普通行贴哪条边**：审计表显示只有共用边行向上伸；而实测提示 K/A 是自下边缘
  向上。渲染器默认行带是否与照片一致，尚未解决。
- **"印数≠最长档"**：只有 hyperbolic 行设置 `labelLevel: 'keep'`；统一生成器对
  其余印数一律默认 L1。
- **未量清**：`th2` 分段长档规律及其 `[1.5,3]` 尾段；`sin2 [80,90]`；`sh3` 最长档。
- **统一计算模型**：已完成（Plan 1-3）。迁移结束，此后相关改动只是普通功能开发。

## 代码分布（行数，非测试 / 测试）

- `packages/core/src` 的 TS：**2480 / 24 文件**；测试 **4018 / 21 文件**；
  `packages/core/rules` 保存两个权威 JSON 文件。
- `packages/renderer/src` 的 TS：**1156 / 10 文件**；测试 **662 / 7 文件**。
- `packages/simulator/src` 的 TS/Vue/CSS：**7743 / 33 文件**；测试 **2001 / 17 文件**。
- `packages/generator/src` 的 TS：**497 / 7 文件**；测试 **713 / 4 文件**；
  CLI 经 Vite SSR 构建到 `packages/generator/dist/bin.js`。
- `packages/core/src` 细分：`data` 105、`engine` 298、`types` 293、`schema` 815、
  `format` 67、`load` 484、`expr` 407；`packages/renderer/src/layout` 169、`draw` 876；
  `packages/simulator/src/components` 2649、`i18n` 704、`stores` 319、`utils` 250、
  `designer` 3027。
- 最大的源文件：`packages/simulator/src/App.vue`（738）、`packages/simulator/src/designer/model.ts`（689）、
  `packages/core/src/schema/validate.ts`（658）、`packages/simulator/src/designer/panels/CalcForm.vue`（645）、
  `packages/simulator/src/designer/DesignerView.vue`（638）、`packages/simulator/src/components/SlideRule.vue`（568）、
  `packages/simulator/src/designer/store.ts`（453）、`packages/simulator/src/components/CircularRule.vue`（411）、
  `packages/simulator/src/components/CursorReadings.vue`（334）、`packages/renderer/src/draw/section.ts`（329）、
  `packages/simulator/src/stores/slideRule.ts`（319）、`packages/simulator/src/designer/panels/ScaleForm.vue`（318）、
  `packages/simulator/src/i18n/locales/zh-CN.ts`（316）、`packages/simulator/src/i18n/locales/en-US.ts`（315）、
  `packages/simulator/src/components/CircularReadings.vue`（265）、`packages/core/src/types/scale.ts`（287）、
  `packages/core/src/expr/parse.ts`（257）。

主要位置：权威实测数据在 `packages/core/rules/{1002,type-57}.json`，由
`packages/core/src/load/builtInRules.ts` 经 `parseRule` 加载、再由
`packages/core/src/load/resolve.ts` 解析为每条标尺一个 `ScaleCalculation`；DTO/校验器在
`packages/core/src/schema/`，印数策略在 `packages/core/src/format/policies.ts`；安全表达式语言与数值反演在
`packages/core/src/expr/`（`parse.ts`、`evaluate.ts`、`invert.ts`）；
映射与唯一的刻度生成器在
`packages/core/src/engine/{scaleMapping,scaleCalculation}.ts`；改读 `calc` 的读数器在
`packages/core/src/engine/scaleReader.ts`；数字格式化在
`packages/core/src/engine/{gradations,logarithmic}.ts`；毫米布局在
`packages/renderer/src/layout/index.ts`、圆盘各环在
`packages/renderer/src/layout/disc.ts`；主题在 `packages/renderer/src/themes.ts`；与框架无关的
SVG 绘制在 `packages/renderer/src/draw/`（`renderSection`、`renderRuleToSVG`、
`renderRuleSheetToSVG`、`renderDiscToSVG` / `renderDiscSheetToSVG`、副角与根号几何）；1:1 打印文档在
`packages/simulator/src/utils/print.ts`；外部规则导入在
`packages/simulator/src/utils/importRule.ts` 与
`packages/simulator/src/components/ImportRuleDialog.vue`；线性与圆形渲染及交互在
`packages/simulator/src/components/*.vue`（`SlideRule.vue` / `CircularRule.vue`、
`CursorReadings.vue` / `CircularReadings.vue`）与 `App.vue`；可视化设计器在
`packages/simulator/src/designer/`（`model.ts`、`draft.ts`、`errors.ts`、
`templates.ts`、`store.ts`、`DesignerView.vue`、`DesignerPreview.vue`、
`panels/ScaleForm.vue`、`panels/CalcForm.vue`），由
`App.vue` 挂载；类型在
`packages/core/src/types/scale.ts`，DTO 在 `packages/core/src/schema/types.ts`；
编写规格与 CLI 在 `packages/generator/src/`
（`spec.ts`、`build.ts`、`presets.ts`、`cli.ts`）。

## 命令

`npm run dev`（预览）、`npm run test`、`npm run lint`、`npm run build`
（vue-tsc + Vite）。审计表会随 `npm test` 自动重写。

## 本会话提交

以 `git log --oneline` 为准，本笔记不再内嵌容易过时的提交快照。

多包阶段的 `docs` 笔记随各自的 refactor 一并提交。JSON（1d）工作止于
`ec5fc3b`，生成器（phase 2）止于 `1c9fb99`，表达式 DSL（phase 3）止于
`c185631`，打印导出（phase 4）止于 `d99d7de`，可视化设计器基座（phase 5a）
止于 `294cbf7`，其单尺字段表单（phase 5b）止于 `fa5224c`，其计算编辑器
（phase 5c）止于 `b771efc`，其打磨（phase 5d）止于 `d0f7f32`，其圆形渲染
（phase 5e）止于 `38e5262`；模拟器外部规则导入（多包 spec §5E）随后在
`simulator-import-json` 分支完成；设计器组件测试随后在
`designer-component-tests` 分支完成（`751fc82` 基础设施、`87cd0e2` 对话框/预览、
`d97d756` 外壳）；Playwright 端到端套件随后在 `playwright-e2e` 分支完成
（`efa076d` 基础设施、`87f7ad7` 规格、`962f0ea` 断言）；圆形规则交互随后在
`circular-interaction` 分支完成（`cc5d69e` 设计/计划、`1306ab5` 渲染器旋转、
`b6bbdab` store 转子、`3484caf` 导入接受、`63dd546` 圆形视图、`fd2186f` 修复、
`0322b9e` E2E），本次交接由其文档提交修订。
