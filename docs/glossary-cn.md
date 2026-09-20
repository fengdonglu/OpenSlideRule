# 术语表

> 本文档是英文原版 [glossary.md](glossary.md) 的简体中文翻译；英文原版为规范版本（canonical），如有歧义以英文原版为准。

> 项目共享术语。"标尺（scale）"始终指一条可读的标尺带（C、D、A……）；
> "刻度（graduation）"指标尺上印刷的刻度线与数字。这两个词从不互换使用。

## 本工程的术语约定

以下是**本工程的约定**，并非计算尺领域的通行用法；这些词不用于 `docs/domain/`。

- **标尺 = 刻尺 + 标注。** 一条标尺带由两部分组成：**刻尺**（刻出来的刻度，即
  graduations）与**标注**（印出的数字与参考注记）。"标尺"指整条尺带；刻尺与标注
  指它的两部分。在数据模型里，刻尺是 `calculation.intervals`（刻度），标注是
  `labels` / `notes` / `marks`。


| 术语 | 中文 | 定义 | 用法 |
|---|---|---|---|
| Slide rule | 计算尺 | 使用对数标尺的机械模拟计算器 | 本项目模拟其中一种 |
| Front side | 正面 | 主面 | 可切换为背面 |
| Back side | 背面 | 反面 | 可切换为正面 |
| Upper scale | 上尺 | 动尺上方的固定标尺带 | |
| Slide | 动尺 | 可移动的中间标尺带 | 水平拖动 |
| Lower scale | 下尺 | 动尺下方的固定标尺带 | |
| Upper groove | 上缝 | 上尺与动尺之间的缝 | 视觉 / 交互分隔 |
| Lower groove | 下缝 | 动尺与下尺之间的缝 | 视觉 / 交互分隔 |
| Scale | 标尺 | 一条可读的标尺带（C、D、A、B……） | 文档或 UI 中从不使用 "strip" |
| Graduation / tick | 刻度 | 标尺上的刻度线或印刷数字 | 不要与 "scale" 混淆 |
| Orientation | 方向 | 数值沿标尺变化的方式 | 默认递增 = 黑色，递减 = 红色（可有 `red` 覆盖） |
| Red scale | 红色标尺 | 以红色印刷的标尺 | 在 1002 上表示递减；57 型递增的 T 也是红色 |
| Shared graduations | 共享刻度 | 多条标尺共享一套刻度线 | 写作 `sin2(cos2)` - 各自的标注，共享的刻度 |
| Cursor | 游标 | 带参考线的透明滑块 | 沿计算尺滑动 |
| Cursor line | 准线 / 发线 | 游标上用于对齐读数的发线 | 游标通常有**多条**发线（57 型为三线）；单线游标才是例外 |
| Model 1002 | 1002 型号 | 矢量重对数双面计算尺 | 实现的第一个型号：28 条标尺 |
| Model 57 | 五七型 | 57 型袖珍计算尺 | 第二个型号：单面，9 条标尺；已对照销售照片核实 |
| Folded scale | 折叠标尺 | 在某点折叠的标尺（此处为 sqrt(10)） | CF / DF |
| Reciprocal scale | 倒数标尺 | 另一条标尺的倒数（CI 是 C 的，DI 是 D 的） | 通常递减 |
| lg scale | lg 标尺 | 常用对数（log10）线性标尺 | 读出 log10(x) |
| ln scales | ln1/ln2/ln3 | 以自变量 x 分度的对数-对数分段 | 用于任意次幂 |
| C/D | C/D 标尺 | 核心对数标尺 | C 在动尺上，D 在尺体上 |
| A/B | A/B 标尺 | 平方 / 平方根标尺 | 两个十进制段 |
| K | K 标尺 | 立方 / 立方根标尺 | 三个十进制段（1-1000） |
| CF/DF | CF/DF 标尺 | 折叠的 C/D | 扩展量程，减少索引切换 |
| CI/DI | CI/DI 标尺 | C/D 的倒数 | 除法与反比 |
| CIF | CIF 标尺 | CF 的倒数 | 与 CF 成倒数对 |
| Trig scales | sin2, cos2, tg2, ctg2, tg3, ctg3 | 按角度的正弦 / 余弦 / 正切 / 余切 | 度；余角标注 |
| Type 57 trig scales | S, ST, T | 袖珍尺的正弦 / 小角度 / 正切标尺 | 相对于 C/D 读数；T 递增但为红色 |
| Hyperbolic scales | H2, H'2, H3, sh2, sh3, th2 | cosh / sech 与 sinh / tanh | sh2/sh3/th2 以自变量 x 分度并相对于 C/D 读数 |

## 数据与渲染

| 术语 | 定义 | 说明 |
|---|---|---|
| Scale definition | 一条标尺的数据结构 | `ScaleDefinition` |
| Side | `front` / `back` | |
| Section | `upper` / `middle` / `lower` | |
| mm coordinate system | 所有几何都以毫米为单位 | 屏幕像素来自 `pxPerMm` |
| Tick area | 刻度的水平范围 | 尺面宽度减去两侧面板 |
| Bleed | 一个分区可画入缝中的程度 | 使刻度抵达缝线 |
| Layered rendering | 尺体带 / 分区 / 缝 / 游标 | 结构清晰，更新开销小 |

## 交互

| 术语 | 定义 | 说明 |
|---|---|---|
| Slide drag | 拖动中间带以对齐标尺 | 水平 |
| Cross-scale reading | 跨标尺对齐并比较数值 | 使用游标 |
| Hover readout | 读取指针位置上的每条标尺 | 每条条带一个读数 |
| Zoom | 缩放整个尺面 | 1X-6X；唯一的因子是 `pxPerMm` |

## 流程

| 术语 | 定义 | 说明 |
|---|---|---|
| SemVer | major.minor.patch 版本号 | 破坏性变更递增 major |
| Conventional Commits | 提交信息约定 | **仅英文** |
| English docs | 每份文档都以英文撰写 | 中文原版存放在 `*-cn.md` |
| Changelog | 发布说明 | `CHANGELOG.md` |
| Roadmap | 里程碑与发布 | `docs/roadmap.md` |

## 规则
- "Scale" = 标尺；文档或 UI 中不使用 "strip"。
- "Graduation" 指标尺上的刻度线 / 数字，绝不是指标尺本身。
- 颜色语义因型号而异：在 1002 上红色表示递减，而 57 型递增的 `T` 也印为红色
  （标尺上的 `red` 覆盖）。
- 共享刻度用括号书写：`sin2(cos2)`。
- **所有文档和提交信息均使用英文。**
