# 路线图

> 本文档是英文原版 [roadmap.md](roadmap.md) 的简体中文翻译；英文原版为规范版本（canonical），如有歧义以英文原版为准。

"下一步做什么"的唯一去处。包含发布检查清单。

---

## 1. 这是什么

一款**中国 1002 型矢量重对数双面计算尺**（矢双面计算尺）的网页模拟器，使用
Vue 3 + TypeScript 构建。

- **为什么**：实体计算尺是一台美丽的模拟计算机；忠实的模拟器让它可探索、
  可教学、可保存。
- **为谁**：拥有或研究计算尺的人、学习对数的学生，以及想不动手就能看到
  计算尺的收藏者。
- **不是**：自动计算器，也不是测验 / 考试系统。

范围：忠实渲染计算尺，让用户操作它（动尺、游标、读数、两个面），并保持标尺
数据诚实 —— 一切都来自实体计算尺的实测或由成文公式推得。

---

## 2. 范围

### 范围内
- 忠实渲染 1002（6:1 尺面，4/6/4 行，真实刻度）
- 两个面，单面或并排显示
- 动尺拖动、多游标（添加 / 拖动 / 删除）、悬停读数、游标读数
- 缩放与平移
- 主题、导出（PNG / SVG / Markdown / 打印）、i18n（zh-CN / en-US）
- 数据驱动型号：每把计算尺都是一个规范的 `RuleDefinition` JSON
  （`packages/core/rules/*.json`，`schemaVersion: 1`），便于添加更多规则

### 范围外
- 自动算术（"给我算 2x3"）—— 重点在于使用计算尺
- 账号、云同步、任何服务端内容
- 测验 / 考试引擎

---

## 3. 里程碑

### 首要项目：多线游标

**首个计划中的功能。** 游标的正常形态是带**多条发线**——57 型游标即为三线——而当前
应用只建模了一条。这是模型与实体尺之间已知的最大缺口，因此排在 RoadMap 首位。改动
按序涉及：

1. 规则级游标规格：每个面的发线数量与偏移；
2. `RuleCursor` 每条发线各持一个位置（作为刚性整体一起移动）；
3. 渲染器画出游标的每一条发线；
4. 读取引擎与读数面板按**发线**分别给值；
5. 设计器中编辑发线的控件；
6. schema / 校验器 / 生成器承载该规格。

现有型号都未用到它，因此该功能还需要一个多线尺型来验证。

| 里程碑 | 内容 | 状态 |
|---|---|---|
| v0.1.0 | 1002 正确渲染并运行；文档、测试和 CI 就位；可发布 | 大部分完成，见检查清单 |
| v0.2.0 | 多游标（完成）；游标的辅助线和右侧参考面板图案 | 进行中 |
| v0.3.0 | 至少一个进一步型号（57 型袖珍计算尺） | 完成 |
| generator | 规则生成器（`packages/generator`）：库 + CLI + 黄金测试 | 完成 |
| expression DSL | 可选的 `map.kind: "expr"`（安全求值器 + 解析 / 数值反演） | 完成 |
| print export | 1:1 毫米静态 SVG（`renderRuleSheetToSVG`）+ 从应用导出打印 / PDF | 完成 |
| visual designer | 应用内 `RuleSpec` 编辑器：5a 外壳 / 预览，5b 单尺字段，5c 计算编辑器，5d 草稿 / 模板，5e 圆形渲染 | 完成 |
| rule import | 把外部 `RuleDefinition` JSON（本地文件、文件选择器 / 拖放）加载进模拟器 | 完成 |
| circular interaction | 加载、旋转（转子）并读取圆形计算尺：圆盘视图、径向游标、圆形读数 | 完成 |
| e2e suite | 模拟器、设计器、规则导入与圆形交互的 Playwright 规格（本地用系统 Edge，CI 用 Chromium，`npm run e2e`） | 完成 |

**规则生成器**已完成。`packages/generator` 增加了一个创作层，对 `core` 是单向
依赖：作者编写 `RuleSpec`（一个 DTO 超集，带规则级命名 `calculations` 和逐标尺
`{ ref }`），`buildRule` 内联这些 ref 并组装成经校验的 schema-v1
`RuleDefinition`，而 `slide-rule-gen build <spec.json> -o <out.json>` CLI 把它
写成 JSON。CLI 成功时退出码为 `0`，校验失败时为 `1`（每个错误输出到 stderr），
用法或输入 / 输出问题时为 `2`。一个逐标尺黄金测试通过预设重建 1002 的 `C`
计算，并与 `rules/1002.json` 对比。生成器（阶段 2）作为仅 Node、构建期的包
发布；自阶段 5a 起，它的**库**（`buildRule`、`RuleSpec` 类型、预设）对浏览器
安全，是设计器使用的 `simulator -> generator` 依赖，而只有它的**CLI**
（`bin.ts`）仍仅限 Node。

**表达式 DSL**增加第五种可选 map 类型 `map.kind: "expr"`，用于字段特定的
公式。`position`（必填）为 `p = f(x)`，`inverse`（可选）为 `x = g(p)`，两者
都由一个从不使用 `eval` 的安全白名单求值器编译；没有 `inverse` 时，加载器通过
对定义域做括号二分来反演正向映射。schema 校验器会对正向映射采样以验证有限性
和严格单调性。内置规则及其生成的 JSON 不变。见
[dev/expressions.md](dev/expressions.md)。

**打印导出**把当前计算尺从模型构建为静态 1:1 图幅
（`renderRuleSheetToSVG`），而不是从缩放后的 DOM。渲染器按真实毫米叠放可见面，
模拟器（`utils/print.ts`）把浏览器页面尺寸设为计算尺本身
（`@page { size: <w>mm <h>mm; margin: 0 }`），然后从应用的**打印 / PDF**操作
打开打印对话框。1002 宽 304.8 mm（12 in），比 A4 / Letter 更宽，因此用户以
100% 比例配合自定义页面尺寸（或更大的纸张）打印；导出从不重新缩放。

**可视化设计器**是模拟器内的全屏模式，分增量发布。增量 **5a**（任务 1-5）在
浏览器中创作生成器的 `RuleSpec`：它从内置规则起稿，或导入 `RuleSpec` /
`RuleDefinition`，通过 `buildRule` + `parseRule` 实时校验，用
`renderRuleSheetToSVG` 预览线性规则，编辑规则级字段（id、name、`form` + `disc`、
`physical`）和标尺树，并导出作者规格与构建出的 `RuleDefinition`。它还给 schema
增加了规则的 `form` / `disc` 元数据（校验码 `unknownForm` / `invalidDisc` /
`unexpectedDisc`），但**不渲染圆形规则**。增量 **5b** 增加逐标尺字段表单
（`simulator/src/designer/panels/ScaleForm.vue`）：它编辑选中标尺自身的字段
（id、name、type、orientation、sharedLabels、notes、numbersBelow、tickEdge）
并复制它。增量 **5c** 增加计算编辑器
（`simulator/src/designer/panels/CalcForm.vue`）：它编辑选中标尺的整个
`CalculationSpec`（`domain`、包括 `expr` 在内的每种 `map` 类型、`decades`、
`decreasing` 镜像控件、`read`、`labelFormat`、`labelLevel`、带 step / level 行
的 `intervals` 与区间标注、`labels` 和 `marks`；`{ ref }` 标尺通过其命名的
`calculations` 条目编辑），并从生成器预设起稿。原始 DSL 选项 token（map 类型、
标签格式）经 `designer.*` i18n 显示。增量 **5d** 打磨设计器：
`simulator/src/designer/draft.ts` 把规格持久化到 localStorage（注入式存储；创建
时恢复一次，带清除草稿操作和恢复提示），`errors.ts` 把校验器的点分 `BuildError`
路径映射到表单字段，使非法字段内联高亮（`.is-error`），`templates.ts` 从模板
选择起稿一个最小的线性或圆形起步规则。增量 **5e** 以圆形渲染完成设计器：与框架
无关的渲染器新增 `layout/disc.ts`（`computeDiscLayout`：三个等宽环带，每条标尺
一个子环）和 `draw/disc.ts`（`renderDiscToSVG` / `renderDiscSheetToSVG`：以
`2π·p` 环绕的同心径向刻度环、切向数字、限界圆和轴心），设计器预览与 1:1 打印
路径对 `form: "circular"` 使用圆盘图幅（缺 `disc` 的圆形草稿改为显示 i18n
提示）。交互式转子与游标是后来添加的（见下方圆形交互）；螺旋标尺仍待做。阶段 5
的可视化设计器现已完成。见 [dev/architecture.md](dev/architecture.md)。

**外部规则导入**已完成（多包 spec §5E）：模拟器可以加载生成器产出的、或从
设计器导出的 `RuleDefinition` JSON。工具栏的 **Load rule JSON** 按钮和拖放到
模拟器视图可把文本送入 `utils/importRule.ts`（`importRuleText` ->
`parseRule`）；store 把规则保存在它的 `imported` 槽中，并作为保留型号
`imported` 选中它。JSON 格式错误或校验失败会打开 `ImportRuleDialog.vue`，
且不触碰当前型号。导入仅在本地、内存中完成；从 URL 加载与持久化导入的规则被
推迟。

**圆形交互**已完成：模拟器导入 `form: "circular"` 规则（拒绝逻辑已移除），
`App.vue` 依 `store.isCircular` 分支到 `CircularRule.vue` +
`CircularReadings.vue`。store 的 `discOffset` 通过 `renderDiscToSVG` 的
`rotationTurns` 把圆盘的 `middle` 带作为转子旋转，而 `upper` / `lower` 保持
固定；游标变为带径向线的转动比例角，支持拖动旋转、点击添加和拖动移动。读数
面板通过线性面板的 `readScaleValue` / `positionForValue` 引擎在每个游标处列出
每条标尺，并可把输入值反演以移动其游标。设计器预览与 1:1 打印保持零旋转
（旋转是交互状态，不是规则数据）。

**Playwright E2E 套件**是测试金字塔的顶层：仓库根的
`playwright.config.ts` 和 `e2e/{simulator,designer,import,circular}.spec.ts`
（5 个测试）通过系统 Microsoft Edge 驱动应用（`channel: 'msedge'`，因此本地
不下载浏览器），固定 `testIdAttribute: 'data-test'`，并通过 Playwright 的
`webServer` 启动（或复用）开发服务器。`npm run e2e` 运行它们；它们不包含在
`npm test` 中，但在 CI 的 `e2e` job 中运行（runner 上用 Chromium）。
`e2e/tsconfig.json` 经 `typecheck:e2e` 对规格做类型检查，后者是
`npm run build` 的一部分。

### 暂缓的想法

- **圆形尺上的螺旋（对数-对数）刻度**（见上文圆形交互一节）。
- **把刻度位置预计算进规则定义**：在 `RuleDefinition` 中存储每个生成刻度的
  `position`，使渲染器直接读取而不再计算。暂缓原因：它会在"实测为准"的权威文件里
  混入派生数据，并为 `1002.json` 增加约 0.4–0.5 MB，而换来的 CPU 节省有限（主导
渲染开销的是 SVG 节点数，而非刻度数学）。待项目发布后再议。

---

## 4. 发布检查清单（v0.1.0）

下面所有事项都必须在仓库公开宣布之前完成。

### 仓库
- [x] `/README.md` - 存在；截图在 `docs/assets/`（模拟器与设计器的圆形预览）
- [x] `/LICENSE` - GPL-3.0，版权 2025-2026 OpenSlideRule contributors
- [x] `/CHANGELOG.md` - Keep a Changelog；`0.1.0` 发布条目
- [x] `.gitignore` 覆盖 `dist/`、`node_modules/`、`.claude/`、`.superpowers/`

### 质量
- [x] ESLint + Prettier 已配置且干净
- [x] Vitest 运行中（布局数学）
- [x] 刻度引擎的单元测试（`scaleCalculation`、`scaleMapping`、
      `scaleReader`）—— 数学与游标往返均已覆盖
- [x] 组件测试（`@vue/test-utils`）- `components/{CircularRule,ImportRuleDialog}.test.ts` 和设计器组件（jsdom，`mountWithPlugins`）
- [x] E2E 测试（Playwright）- `playwright.config.ts` + `e2e/{simulator,designer,import,circular}.spec.ts`（5 个测试，系统 Edge，`npm run e2e`；不属于 `npm test`）
- [x] CI 工作流（lint -> test -> build）加 `e2e` job（Chromium）和 `typecheck:e2e`

### 部署
- [x] 托管：GitHub Pages；Vite 使用 `base: './'`，因此构建对子路径安全
- [x] GitHub Pages 部署工作流（`.github/workflows/deploy.yml`），CI 不变

### 产品
- [x] 长宽比、刻度、折叠标尺、两个面、游标、悬停
- [x] 多游标：点击添加、拖动并内联读数、删除，以及逐游标可编辑读数
      （`positionForValue`）
- [x] i18n（zh-CN / en-US），带环境检测
- [x] 主题（6 种）、导出（PNG / SVG / Markdown / 打印）、教程浮层
- [ ] 游标的三条线（主 + 辅助 + HP）和游标自带的标尺
- [ ] 右侧参考面板图案（kW/hp 表、厂标）
- [x] 每条标尺都有刻度，包括 `H3` 和 `sh2` / `sh3` / `th2`。
      它们的范围和标注步长由原型照片测得
      （`domain/model-1002.md` 3.6-3.8）
- [x] 57 型袖珍计算尺已实现（单面，6in x 1in，2/4/3 行，
      S / ST / T 标尺；`domain/model-57.md`）。标尺列表、颜色、印刷
      数字和参考注记已对照该尺的销售照片核实；
      只有尺寸仍由维护者提供
- [ ] 移动端：`touch-action: none` 禁用了触摸平移；6:1 的尺面在
      竖屏下非常矮
- [ ] 键盘操作与 ARIA 属性

---

## 5. 待办（v0.1.0 之后）

- 更多型号：其他常见中国计算尺（57 型已实现）
- 本地文件之外的外部规则加载：URL / 粘贴框（需要
  服务端 / CORS 方案）以及持久化或重新导出导入的规则
- 可插拔标尺系统与用户自定义标尺
- 练习模式（带评分的习题）
- 高缩放和低端设备上的性能优化
- 进一步的生成器工作：整尺黄金测试（完整 `rules/1002.json`）、更多
  计算预设、在预设中使用表达式类型，以及 watch 模式。

---

## 6. 工作约定

- 提交：Conventional Commits，**英文**
- 文档：英文，与代码在同一提交中更新
- 每次提交前：`npm run lint && npm test && npm run build`

---

## 7. 待维护者决定的事项

来自统一计算重构的未决点。没有一项阻碍发布；每一项都需要人工查看 —— 多半是看
照片 —— 或一个偏好。

### 7.1 批准有意的绘制输出变化

重构让每条标尺都从其实测的 `ScaleCalculation` 绘制。有四项输出被有意改变；
请对照 `docs/domain/prototype/` 确认：

- **CIF 刻度档级**现在遵循实测的 `CF_GRADUATIONS` 网格（旧生成器的自动标注曾
  覆盖它们）。绘制：`L1 20 -> 22`、`L2 87 -> 75`、`L3 229 -> 239`，同为 336
  条刻度。确认 CIF 的档级模式确实与 CF 一致。
- **H'2 最左端刻度**现在是规格定义域末端 `0.995`；遗留的
  `sech(0.1) = 0.9950207` 伪刻度已消失（约 2.6 px）。
- **三角 `Tick.value`** 现在是读数（角度）。`angle` 不变，因此绘制与红色余角
  不受影响。
- **sh2 / sh3 / th2 的 `Tick.value`** 现在是自变量 `x`（游标此前已返回的值），
  而不是 `sinh(x)` / `tanh(x)`。

### 7.2 仓库卫生

- 添加了 `.gitattributes`（`* text=auto eol=lf`），使 lint 关卡在每个操作系统
  上表现一致。保留它，或恢复到之前混合的行尾。

### 7.3 未解决的测量（需要更清晰的照片或维护者输入）

- `th2`：依赖分段的长档规律，以及暂定的 `[1.5, 3)` 步长（`0.05`）。
- `sin2 [80, 90]`：可分辨的最细步长。
- `sh3`：级别 1 档。
- 57 型表：在"印刷数字并不总是最长刻度"这一发现下重新核实。

### 7.4 偏好

- `CustomMapping` 作为模型的扩展点保留，但目前未被构造：保留还是移除。
- 把 lint 收紧为 `eslint . --max-warnings 0`。
- `docs/dev/data-model.md` 的 H2 / H'2 行仍写着 "even x steps"；
  确认它们应改为 "even value V steps"。

---

*版本：v3.8（1:1 打印 / PDF 导出；表达式 DSL；JSON 规则作为真相源；`packages/generator` 已实现；可视化设计器完成圆形渲染；本地外部规则导入；可交互圆形规则 - 转子、径向游标与读数）*
