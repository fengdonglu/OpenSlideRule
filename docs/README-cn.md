# 文档

本项目很小，因此文档也很小。四条规则让它保持有用：

1. **英文为准，中文镜像。** 文档以英文撰写；每一份英文文件旁都有一份简体中文镜像，
   命名为 `<name>-cn.md`（例如 `architecture-cn.md`）。英文是规范版本——先改英文，
   再改镜像。
2. **文档与代码在同一次提交中更新。** 改变行为、数据或约定的改动，必须同步更新对应的
   文档。
3. **只写当下为真的事实，简明扼要。** 不写臆测性设计，不写冗长方法论，文档之间不重复
   内容——用链接代替。
4. **不出现个人化措辞。** 文档是非人称的（*维护者*、*项目*），因为它们会被公开发布。

---

## 结构

```
/README.md              面向用户的项目简介、截图、快速开始
/README-cn.md           同上，简体中文
/CONTRIBUTING.md        如何贡献（分支、提交、代码、测试）
/CODE_OF_CONDUCT.md     社区行为准则
/SECURITY.md            漏洞报告
/AGENTS.md              面向智能体与人的工作规则
/LICENSE                GPL-3.0 许可
/CHANGELOG.md           版本历史（Keep a Changelog）
/packages/              工作区包（core、renderer、simulator、generator）

docs/
├─ README.md            本索引与文档规范
├─ README-cn.md         同上，简体中文
├─ glossary.md          术语（按领域分表）
├─ roadmap.md           愿景、范围、里程碑与发布清单
├─ handoff.md           当前状态 / 从哪里继续（工作笔记）
├─ guide/               用户指南——如何使用本应用（不含内部实现）
│   ├─ getting-started.md    运行、界面布局、第一次上手
│   ├─ simulator.md          型号、正反面、动尺、游标、读数、圆形尺
│   ├─ designer.md           设计、预览并导出一条规则
│   ├─ import-export.md      载入规则 JSON；导出 PNG/SVG/Markdown/打印
│   └─ reading-scales.md     应用中的读数原理
├─ domain/              物理计算尺——绝不提及软件
│   ├─ slide-rule-101.md    计算尺如何工作（通用）
│   ├─ model-1002.md        1002 的尺寸、标尺、约定与参考
│   └─ model-57.md          57 型袖珍尺（照片核实）
└─ dev/                 软件如何构建
    ├─ architecture.md     模块、数据流、工具链
    ├─ data-model.md       JSON 规则格式、类型与刻度算法
    ├─ rendering.md        毫米布局、缩放、游标、悬停
    ├─ calculation-pipeline.md  一页的绘制/读数管线（元数据 -> 刻度 -> SVG）
    ├─ expressions.md      `map.kind: "expr"` 的安全表达式语言
    ├─ measurement.md      如何从照片测量刻度
    └─ graduations.md      逐标尺绘制模型（自动生成；审计表）

上表中每一份文档都在其旁有一份 `-cn.md` 镜像。
```

### 一条新事实该写到哪里？

| 事实类型 | 文档 |
|---|---|
| 某个功能怎么用 | `guide/`（对应页面） |
| 物理尺的测量或标尺含义 | `domain/model-1002.md` / `domain/model-57.md` |
| 通用计算尺理论 | `domain/slide-rule-101.md` |
| 类型、接口、刻度公式、JSON 规则 schema | `dev/data-model.md` |
| 表达式文法、函数、求逆 | `dev/expressions.md` |
| 逐标尺的区段、步长、层级、印数 | `dev/graduations.md`（自动生成） |
| 某条刻度是如何从照片测量得到的 | `dev/measurement.md` |
| 布局、绘制、交互规则 | `dev/rendering.md` |
| 模块边界、状态、i18n、测试 | `dev/architecture.md` |
| 接下来做什么、还缺什么 | `roadmap.md` |
| 当前状态 / 从哪里继续 | `handoff.md`（工作笔记） |
| 一个术语 | `glossary.md` |

### 单一事实来源
- 物理尺寸 -> `domain/model-1002.md` 与 `domain/model-57.md`
  （由 `packages/core/src/types/scale.ts` 的 `PhysicalSpec` 镜像）
- 实测规则数据 -> `packages/core/rules/1002.json` 与 `type-57.json`
  （规范 `schemaVersion: 1`；由 `parseRule` 校验并解析）
- 代码接口 -> `dev/data-model.md`（由 `packages/core/src/schema/`
  与 `packages/core/src/types/` 镜像）
- 待办工作 -> `roadmap.md`

---

## 事实来源

本项目恰好有**两个**权威来源。仓库中的其他一切——测量、标尺定义、数据与文档——
都必须由它们推导而来，且不得与之矛盾。

1. **物理尺的原型照片**：
   [`domain/prototype/1002-front.jpg`](domain/prototype/1002-front.jpg) 与
   [`domain/prototype/1002-back.jpg`](domain/prototype/1002-back.jpg)。
   它们确定物理事实：面序、行序、标尺名称、印数、刻度形状与右侧参考注记。
2. **维基百科**：
   [Slide rule](https://en.wikipedia.org/wiki/Slide_rule) 与
   [Slide rule scale](https://en.wikipedia.org/wiki/Slide_rule_scale)。
   它们确定通用约定：每种标尺的含义、如何刻制、以及如何与其他标尺对读。

由此得出的规则：

- 文档或数据中的陈述都应可追溯到上述两个来源之一。
- 当照片不清晰时，该事实必须标为**尚未确定**，而不是悄悄猜测。若确有必要猜测，
  须明确标注为猜测。
- 当两个来源看似冲突时，须在 `domain/model-1002.md` 中明确说明，而不是悄悄择一。
- 其他任何东西都不是权威——既不是本文档，也不是代码，更不是任何第三方页面。

由照片导出的实测规则数据位于 `packages/core/rules/1002.json` 与
`type-57.json`。这两个文件是实测规则数据的单一来源；所有运行时结构都由
`parseRule` / `builtInRules` 从它们加载并校验。

**57 型。** 维护者自有的正面照片存于
[`domain/prototype/57-front.jpg`](domain/prototype/57-front.jpg)，用于测量标尺列表、
颜色、印数、参考注记以及 [domain/model-57.md](domain/model-57.md) 第 3.7 节中的刻度。
只有其**尺寸**（6in x 1in，2/4/3 行）来自维护者的事实表而非照片测量；照片本身倾斜约
0.5 度，测量前已做校正。

---

*最后修订：2026-09 —— 面向用户的 `guide/`、`dev/` 下的开发者文档，
以及每一份文档的完整简体中文镜像*
