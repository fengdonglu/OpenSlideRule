# 渲染规格

计算尺如何绘制、如何使用 SVG，以及缩放 / 游标 / 悬停的行为。

---

## 1. 技术选择

### 1.1 为何用原生 SVG
- **精确**：刻度位置来自公式；SVG 无损缩放。
- **轻量**：无需 fabric.js / konva（节省约 200KB）。
- **可调试**：DOM 可检查。
- **响应式**：毫米 viewBox 加计算出的 `pxPerMm`。

### 1.2 毫米优先
- **统一坐标系**：每个几何量（尺面宽度、行高、凹槽、字号、刻度位置）都用毫米
  表示。
- **渲染**：每段是一个 SVG，其 `viewBox` 以毫米为单位并使用默认
  `preserveAspectRatio`，因此不会拉伸。
- **像素**：唯一的缩放因子是 `pxPerMm = availableWidthPx / faceWidthMm`；像素
  只出现在容器尺寸中。

**原因**：早期实现使用固定的 `viewBox="0 0 1000 100"` 与
`preserveAspectRatio="none"`，把纵轴压扁到文字约 1 px 高、无法阅读。用毫米后，
比例与字号跟随物理尺，缩放只改变一个值。

---

## 2. 毫米坐标

### 2.1 物理规格（`PhysicalSpec`）
```typescript
{
  faceWidthMm: 304.8,   // 12 in
  faceHeightMm: 50.8,   // 2 in
  rowCount: { upper: 4, middle: 6, lower: 4 },
  grooveRowRatio: 0.7,  // 凹槽 / 行高
  marginRowRatio: 0.4,  // 上 / 下边距 / 行高
  leftGutterMm: 26.1,   // 左侧名称槽
  rightPanelMm: 19.7,   // 右侧参考面板
  numeralRatio: 0.6,    // 数字高度 / 行高
}
```
见 [domain/model-1002.md 第 2.3 节](../domain/model-1002.md)。

### 2.2 布局求解（`packages/renderer/src/layout/index.ts`）
```
rowHeightMm = faceHeightMm / (14 + 2*grooveRowRatio + 2*marginRowRatio)   // ~3.136
grooveMm    = grooveRowRatio * rowHeightMm                                // ~2.195
marginMm    = marginRowRatio * rowHeightMm                                // ~1.254
numeralMm   = numeralRatio  * rowHeightMm                                 // ~1.881

upper.top   = marginMm
middle.top  = upper.bottom  + grooveMm
lower.top   = middle.bottom + grooveMm
```
`computeFaceLayout(spec, availableWidthPx)` 返回一个 `FaceLayout`，含
`pxPerMm`、三个段的 `top/height`、凹槽位置与刻度区边界。段还带有
`bleedTopMm` / `bleedBottomMm`（半个凹槽），使紧邻凹槽的刻度能够抵达槽线。

### 2.3 刻度坐标
```typescript
const x  = tickLeftMm + tick.position * tickWidthMm   // 26.1 .. 285.1 mm
const y1 = rowTop + (level === 1 ? 0.45 : level === 2 ? 0.55 : 0.62) * rowHeightMm
const y2 = rowTop + 0.95 * rowHeightMm                // 所有档级共用远端
```

### 2.4 数字位置
数字位于刻度的远端；高度为 `numeralMm`（约 1.9 mm，屏幕上大约 6-7 px —— 与真实
尺一致）。

标尺可设置 **`numbersBelow`**（57 型的 `L` 行）：其刻度从带的**上边缘**垂下
（1 级到行高的 0.50，2 级 0.42，3 级 0.35），数字印在它们**下方**（基线为行高的
0.95）。默认相反（数字在上，刻度在下带），因此该标志为可选，1002 不变。

---

## 2.5 刻度档级与印数

三个档级（`Tick.level`），具有**固定像素宽度**，不随缩放增大
（`vector-effect="non-scaling-stroke"`）：

| 档级 | 长度（占行高） | 宽度 | 印数 |
|---|---|---|---|
| 1 | 0.45 -> 0.95 | **1.5 px** | 值 |
| 2 | 0.55 -> 0.95 | **1.2 px** | - |
| 3 | 0.62 -> 0.95 | **1 px** | - |

**凹槽**是单条 **1 px** 细线（同样固定），并显式设置 `z-index: 2`，即位于动尺
之上（`z-index: 1`）；仅靠 DOM 顺序不够，因为动尺绘制在本体之上且其溢出会盖住
细线。该线使用主题的文字颜色，因此在每个主题上都可见。

**紧邻凹槽的行**紧贴它印制：凹槽正*下方*的行被镜像（刻度贴着凹槽，数字在远
端）；凹槽正*上方*的行保持朝向，但延伸到凹槽。

**密度**：每条标尺都以共享的**由粗到细梯级**加上最小间距过滤
（`MIN_SPACING ~ 0.0042`，约 1.1 mm）铺设，因此密度均匀。固定的数值步长行不
通：在压缩的十进制（K 约 1-4）中过于密集，在别处又过于稀疏。

**印数**：对每个十进制与子区间，选择不冲突的最细*规则*量子
（`LABEL_SPACING ~ 0.022`，约 5.7 mm）：
- `[1,2)` 每 0.1，`[2,5)` 每 0.2/0.5，`[5,10)` 每 1（经典布局）
- 多十进制标尺（A/B/K）的十进制更短，所以量子会自动变粗（A 的 `[1,2)` 最终为
  0.2）

**折叠标尺 CF / DF**：刻度与数字处于参数的值空间；只有位置依赖锚点。
- **CF** 锚定于 **sqrt(10)**：`sqrt(10) 4 5 6 7 8 9 10 20 30`
- **DF** 也锚定于 sqrt(10)，但向左延伸到 3：`3 pi 4 5 6 ...`
- **CIF** 是 CF 的倒数，印作 `1/CF`：`3.2 2.5 2 1.7 ... 0.5 0.3`

**Pi 记号**：**两个面上的 C 与 D 都标出 pi**（照片显示 `3 pi 4`）。该记号在
印数稀释*之后*插入，因此绝不会被丢弃。

**右侧参考注记**：每条标尺的 `notes`（从尺上读出，见领域文档 3.7 节）绘制在
右侧面板中，在其中**居中**，与标尺名称行同高；第二行位于下一行的名称行。以
根号开头的注记把其余文本放入 `text-decoration="overline"` 的 tspan，使横线
覆盖它。

**副角数字**：`sin2` / `tg2` / `tg3` 带有 `sharedLabels`（cos2 / ctg2 /
ctg3），作为带下方的**第二行数字**印制（`90 - theta`，红色，数字大小的 0.75
倍）。这些行使用更短的带，使两行数字绝不接触刻度。57 型的 `cos` / `ctg` 行
印制裸数字；两个型号的副角行都只绘制**印数**（没有单独的红色刻度）。

**线性标尺数字**（`L` / `lg`）：按尺上的写法印制 —— 两端是裸整数，中间是省略
前导零的分数，例如 `0 .1 .2 ... .8 .9 1`（不是 `0.0 ... 1.0`）。

---

## 3. 布局结构

### 3.1 容器
```vue
<div ref="viewportEl" class="rule-viewport">      <!-- 滚动容器 -->
  <div class="rule-stack">                        <!-- 一个或两个面 -->
    <div v-for="face in faces" class="face">
      <div v-if="dualFace" class="face-label">Front / Back</div>
      <div class="rule-canvas">                   <!-- 一个面 -->
        <div class="body-band" /> ... sections ... <div class="groove" />
      </div>
    </div>
    <div class="cursor">                          <!-- 整个叠层一个游标 -->
  </div>
</div>
```

### 3.2 CSS
```css
.rule-viewport { position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; }
.rule-stack    { position: relative; }
.rule-canvas   { position: relative; overflow: hidden; user-select: none; touch-action: none; }
.section       { position: absolute; left: 0; }        /* top/height 来自 FaceLayout */
.groove        { position: absolute; left: 0; height: 1px; }
```
`ResizeObserver` 观察**视口**（而非画布），因此更宽的画布不会反馈到宽度测量
中。

### 3.3 分段渲染（`ScaleSection.vue` + 渲染器）

`ScaleSection.vue` 为每段挂载一个空的 `<svg class="section-svg" ref="svgEl" />`；
绘制逻辑位于 `@slide-rule/renderer`。该组件提供 Vue 状态（i18n 标题、主题）并
调用 `renderSection(root, { scales, section, layout, theme, titleOf })`，它会设置
毫米 `viewBox` 并填充带：
```typescript
renderSection(svgEl, { scales, section, layout, theme, titleOf })
// viewBox = sectionViewBox: 0 (topMm - bleedTopMm) faceWidthMm (heightMm + bleed)
// 每行：line.tick（class level-1 | level-2 | level-3）
//       + text.numeral（行有副角标时按角度锚定）
//       + text.note（tspan 片段；data-radicand 用于实测横线）
//       + text.scale-name（左侧槽）
// 然后是两条 line.guide 刻度区边界
```
显示字符串经 `titleOf` 传入，因此渲染器不含 Vue、Pinia 与 i18n。与框架无关的
`renderRuleToSVG(rule, { face, theme, titleOf })` 以 1:1 mm 绘制整个面（宽 / 高
以 `mm` 计），输出到脱离文档的 `<svg>` 供导出与测试。其同类函数
`renderRuleSheetToSVG(rule, { faces, theme, titleOf, slideOffsetMm })` 把可见面
以 1:1 mm 叠放在白色纸张上；仅当偏移非零时，中间带单独应用
`translate(slideOffsetMm, 0)`。

---

## 3.4 单面 / 双面

`stores/slideRule.ts` 保存 `dualFace`：
- **single**：一个画布；正面 / 背面切换可用。
- **dual**：两个画布叠放（正面在前）；切换被禁用。

型号可能是**单面**的（57 型）：`sideHasScales` 只报告正面，因此 store 的
`visibleSides` 始终包含这一个面，工具栏禁用双面与背面按钮，读数面板只列出一
组。`setModel` 落在有效面上，并在新型号只有一个面时清除双面模式。其他一切
（动尺、游标、悬停、导出）都不变 —— 游标叠加层在一个画布上与在两个画布上同
样工作。

- **水平对齐**天然成立：两个面共享同一个 `PhysicalSpec`，因此 `leftGutter` /
  `tickWidth` / `rightPanel` 完全相同。
- **动尺耦合**：`middleOffset` 是一份被两个面读取的状态，因此拖动任一面都会移
  动两者。
- **游标**：`.rule-stack`（`top:0;bottom:0`）上的一组叠加层，因此每条线穿过两
  个面与间隙；两个面读取相同的游标位置。
- **面的方向**：绕长轴翻转保持左右，因此两个面以相同方向绘制（不镜像）。
- **读数**：双面模式列出两组（正面 / 背面），带小标题。

已验证：两个画布高度相同；游标的包围盒与 `.rule-stack` 完全吻合；双面模式下
拖动在两者上给出相同的 `translateX`。

## 3.5 打印 / 1:1 导出

`renderRuleSheetToSVG(rule, { faces, theme, titleOf, slideOffsetMm })` 为打印
构建一个独立的 `<svg>`：其 `viewBox` 为 `0 0 faceWidthMm totalHeightMm`，
`width` / `height` 带 `mm`，因此浏览器把 1 个用户单位映射为 1 毫米。每个可见
面是一个 `g.print-face`，含一个白色纸张 `<rect>`（尺面大小）、三条分段带，以及一个
主题 `gap` 色的细 `rect.sheet-frame` 外框，按绘制顺序（正面在前）；面之间以
`PRINT_FACE_GAP_MM = 4` 的间隙垂直叠放（与 SVG 导出所用间隙相同），每个面的中间带在
偏移非零时以 `translate(slideOffsetMm, 0)` 承载动尺偏移。空面列表产生零高度图幅。
圆盘图幅同样在每个方形纸张四周绘制 `rect.sheet-frame`。

`packages/simulator/src/utils/print.ts` 驱动导出：
- `buildPrintHTML({ svg, widthMm, heightMm, title })` 把序列化后的图幅包进一个
  独立文档，其 `@page { size: <w>mm <h>mm; margin: 0 }` 与零 body 边距使 SVG
  的毫米按 1:1 打印；标题经 HTML 转义。
- `printSlideRule({ rule, faces, theme, slideOffsetMm, title, titleOf })` 从型号
  渲染图幅（绝不从缩放后的 DOM 抓取），先脱离屏幕挂载以测量根号横线（先等待
  文档字体），在序列化前分离，然后打开一个新的 `window.open('', '_blank')`
  视图并写入、聚焦、打印。
- `App.vue` 的 `handlePrint` 传入 `visibleSides`、当前主题和以毫米计的动尺偏移
  （`middleOffset * (faceWidthMm - leftGutterMm - rightPanelMm)`）。

**保真度**：1002 宽 304.8 mm（12 in），比 A4（210 mm）或 Letter（216 mm）更
宽。请以 **100% 比例**打印并使用自定义页面尺寸（或更大的纸张）；导出绝不缩放
到纸张预设，因为那会破坏 1:1。

---

## 3.6 圆形规则

带有 `form: "circular"` 与 `disc` 块的规则绘制为圆盘，而非叠放的面。其几何与
线性路径一样与框架无关，刻度仍来自同一 `getScaleTicks` 引擎，因此圆形规则的
值、档级与印数不会偏离型号。

### 3.6.1 圆盘布局（`renderer/src/layout/disc.ts`）
`computeDiscLayout(disc, counts)` 返回正方形纸张与同心**标尺环**：
- 环形 `outerRadiusMm - innerRadiusMm` 被均分为**三等份带**；`upper` 是最外
  带，然后 `middle`，`lower` 最内。
- 一段的带在**其标尺间均分**，因此一段中 N 条标尺产生 N 个子环（最外在前）。
  空段仍保留其三分之一。
- 每个 `DiscScaleRing` 带有其 `innerRadiusMm` / `outerRadiusMm`、内缩子带 12%
  的 `tickOuterMm`，以及位于 inner + 28% 的 `numeralRadiusMm`。数字高度为
  `max(1, min(band * 0.22, smallestSubBand * 0.5))` mm —— 设上限使字形不会溢出
  其环。

### 3.6.2 圆盘绘制（`renderer/src/draw/disc.ts`）
`renderDiscToSVG(rule, { face, theme, titleOf, rotationTurns })` 在正方形 SVG
上绘制一个面，其 `viewBox` 与 `width` / `height` 为圆盘的 `sheetSizeMm` 毫米
数（回退到 `physical.faceWidthMm`；没有 `disc` 的圆形规则不绘制任何东西，也不
抛出）。它绘制白色纸张、主题背景的圆盘本体、外部**限制圆**（`circle.limit`）、
内部**枢轴**圆（`circle.pivot`）、三条带之间的**分隔圆**（`circle.disc-groove`，
取主题 `gap` 色，使转子边缘可见）以及标尺环：
- 位置 `p` 处的刻度是**角度为 `2π·p` 的径向线**，从 `tickOuterMm` 向内；其长
  度按档级为子带的一个分数（0.50 / 0.40 / 0.32），宽度为固定的
  1.5 / 1.2 / 1 px（`non-scaling-stroke`）。由于角度是周期的，`p = 0` 与
  `p = 1` 重合：**越界位置环绕圆盘**而不是被丢弃，重合的刻度去重为每个物理点
  一个刻度（范围内带印数的刻度赢得接缝）。印出的数字与名称共用线性图幅的字
  体。
- 数字位于 `numeralRadiusMm`，并**切向旋转**（绕自身点 `rotate(p * 360)`）；
  红色标尺使用主题的 `scaleRed`。
- 标尺名称位于其环顶部附近的空白带（`position 0`），并被钳制使其不能越过限
  制圆。

`renderDiscSheetToSVG(rule, { faces, theme, titleOf, gapMm })` 是 1:1 打印的
对应物：它把可见面以 `g.disc-face` 组垂直叠放，间隙为线性图幅的
`PRINT_FACE_GAP_MM`（重导出为 `DISC_FACE_GAP_MM`；`gapMm` 可覆盖它）；空面
列表产生零高度图幅。

### 3.6.3 环约定
`faces.front` / `faces.back` 是**圆盘的两面**；每个面的 `upper` / `middle` /
`lower` 数组映射为**外 / 中 / 内环组**。这是圆形形式的文档化约定，无需改动
`ScaleSpec` 或 schema。

### 3.6.4 使用方
设计器预览（`DesignerPreview.vue`）与 1:1 打印路径（`utils/print.ts`）对带
`disc` 的 `form: "circular"` 规则调用 `renderDiscSheetToSVG`；此时打印页面宽为
`disc.sheetSizeMm`。缺少 `disc` 的圆形草稿无效，改为显示经 i18n 的
`designer.circularNotice`。

**螺旋（log-log）标尺**仍属后续工作，不属于此渲染路径。

### 3.6.5 圆形交互

转子是**旋转，而非规则数据**：设计器预览与 1:1 打印调用圆盘渲染器时不传
`rotationTurns`，因此静态表面始终绘制印出的对齐。模拟器的圆形视图
（`components/CircularRule.vue`）是唯一转动环的调用方。

- **转子旋转。** `renderDiscToSVG` / `renderDiscSheetToSVG` 接受
  `rotationTurns?: Partial<Record<ScaleSection, number>>`。段 `s` 中的环在
  `tick.position + (rotationTurns[s] ?? 0)` 圈处绘制每个刻度、其数字与标尺名
  称，因此几何形状不变，只有角度移动；`position 0` 是 12 点钟方向，圈数顺时
  针增长。视图传入 `{ middle: discOffset }`：圆盘的 `middle` 带是转子，
  `upper` / `lower` 是固定定子，与 5e 环约定（最外 / 中间 / 最内）一致。省略
  该选项与转子之前的输出逐字节兼容。
- **游标。** store 的游标列表原样复用，但 `cursor.position` 是**圈数分数
  `[0, 1)`** 而不是刻度位置。圆盘视图为每个游标叠加一条从内半径到外半径的径
  向线，外加一个游标颜色的手柄块；拖动圆盘本体转动转子（拖动会抑制点击），
  拖动游标的线或手柄移动该游标，在游标以外点击圆盘则在该角度新增一条。指针下
  的角度是绕圆盘中心的 `atan2(dx, -dy) / 2π mod 1`，圈数被包裹到 `[0, 1)`。
- **读数。** `components/CircularReadings.vue` 为每个游标显示一张卡片，逐标尺
  一行，经与线性面板相同的 `readScaleValue` 引擎在
  `(cursor.position - (scale.isMovable ? discOffset : 0)) mod 1` 处读取；超出标
  尺已印范围的值是 `null`（`-`）。在面板中编辑某行会经 `positionForValue`
  反演该值，并为可动标尺加回转子偏移；工具栏的归零旋转按钮把 `discOffset` 置
  零，游标保持原位。

### 3.7 主题与应用外壳
`Theme`（`renderer/src/themes.ts`）携带两套调色板：`colors` 用于尺面（背景、
黑 / 红标尺、凹槽、游标、文字），`ui` 用于应用外壳（页面、表面、弱化表面、
边框、文字、弱化文字、强调色、强调文字）。渲染器只读取 `colors`；模拟器通过
`applyTheme`（`utils/theme.ts`）把 `ui` 映射为 CSS 自定义属性，在文档根上写入
`--ui-*` 与 `data-theme`，因此整个界面 —— 页面、面板、控件与对话框 —— 都跟随
所选主题。`style.css` 携带一个应用挂载前的塑料质回退样式。

---

## 4. 动尺拖动

### 4.1 变换
```vue
<div class="section middle" :style="{ transform: `translateX(${middleOffset * tickWidthPx}px)` }">
```
- `middleOffset` 在**刻度区**上归一化（-1 .. 1；1 = 一个标尺长度）。
- `tickWidthPx = tickWidthMm * pxPerMm`。

### 4.2 事件处理
```typescript
const onMove = (ev: PointerEvent): void => {
  if (Math.abs(ev.clientX - startX) > 3) slideDragging = true
  const delta = (ev.clientX - startX) / tickWidthPx.value
  middleOffset.value = clamp(startOffset + delta, -1, 1)
}
```
读数采用相同约定：`middlePos = cursorPosition - middleOffset`。

### 4.3 动尺外观
动尺是一条不透明条带（主题背景），带两条随其移动的边线，因此其边界始终可见。

---

## 5. 游标

### 5.1 结构
```vue
<div v-for="(cursor, index) in cursors" class="cursor" :style="{ left: cursorLeftPx(cursor.position) + 'px' }"
     @pointerdown="onCursorPointerDown($event, cursor.id)">
  <div class="cursor-handle top">
    <span class="cursor-badge">{{ index + 1 }}</span>   <!-- 序号徽标 -->
  </div>
  <div class="cursor-handle bottom" />
  <div v-if="dualFace" class="cursor-handle middle" />  <!-- 位于面边界 -->
  <div class="cursor-line" />
</div>
```
每个游标拥有自己的线与手柄集合。顶部与底部手柄对称；双面模式下，一个更大的中
间手柄位于两面之间间隙的中心。顶部手柄上的徽标显示从 1 开始的序号，并使用主
题游标颜色，因此读数面板中的块可与其线对应。

### 5.2 位置
`cursorLeftPx(position) = (tickLeftMm + position * tickWidthMm) * pxPerMm`，即
每个游标在刻度区上归一化。

### 5.3 交互
- **拖动手柄**移动该游标；拖动期间，逐标尺读数显示在游标位置，指针松开后隐
  藏。
- **点击空白尺面**在该位置新增游标（最多 8 个）。若点击紧随一次真正的动尺拖
  动（> 3 px），或落在已有游标线几像素范围内，则被抑制。
- **删除**读数面板中某游标块对应的游标。最后一个游标不能删除；而是将其清回
  默认位置。
- 在面板中**编辑读数**，把该游标移动到读取所输入值的位置
  （`positionForValue`）。

---

## 6. 悬停读数

指针移到尺面上会设置 `hoverPos`（指针下的归一化刻度位置）。对**每条可见标
尺**，在该位置求值 `readScaleValue()`，并带一条虚线导引显示在**其自己的条**
上。点击尺面会在该处**新增一个游标**（超过 3 px 的动尺拖动会抑制点击）。拖动
游标期间，其位置接管 `hoverPos` 作为读数位置，指针松开后读数隐藏。

---

## 7. 颜色

### 7.1 标尺颜色
颜色来自当前主题：递增标尺用 `scaleBlack`，递减标尺用 `scaleRed`。

### 7.2 主题
六套主题位于 `packages/renderer/src/themes.ts`；名称来自 i18n
（`theme.<id>`）。凹槽细线使用主题的文字颜色，因此在深色主题（`contrast`、
`blueprint`）上仍可见。

---

## 8. 响应式设计

### 8.1 容器
```css
.rule-wrap { position: relative; flex: 1 1 720px; min-width: 0; }
```
- `SlideRule` 观察视口宽度并推导画布尺寸；尺面高度始终是宽度 / 6。
- 任何地方都没有固定的 `vh` 高度，否则比例会随视口漂移。

### 8.2 缩放 / 平移
缩放位于 Pinia（1-6，步长 0.25），通过滑块及其上方的可输入比例字段编辑。
- **唯一**的缩放入口是 `pxPerMm`：刻度、字体、凹槽、段高与拖动数学都自动跟
  随。
- 平移即视口的原生水平滚动；画布为 `overflow: hidden`，因此动尺不会拓宽滚动
  范围。
- 缩放保持视觉中心：`scrollLeft` 按 `next / prev` 重缩放。
- 缩放为 1 时视口切换到 `overflow-x: hidden`（无多余滚动条）。
- `html { scrollbar-gutter: stable }` 防止中间缩放级别下出现竖向滚动条时布局
  来回抖动。

### 8.3 移动端（未完成）
- pointer 事件已统一鼠标与触摸。
- 小屏幕上游标手柄变大。
- `touch-action: none` 目前阻止触摸平移。

---

## 9. 性能

### 9.1 避免过度绘制
- 每条标尺都带 `calc`，只绘制其实测刻度；没有占位 / 着色带路径。
- 实测区间表限制了每条标尺的刻度数量。

### 9.2 GPU 提示
```css
.section.middle { transform: translateX(0); }
```

---

## 10. 无障碍

- `<main>` / `<header>` / `<h1>` 语义。
- 键盘支持与 ARIA 属性仍待添加。

---

*版本：v3.3*
*创建：2025-01*
*最后修订：2026-09 —— renderer 包（与框架无关的绘制）；英文翻译；毫米坐标、
缩放、刻度档级、双面、游标与悬停；1:1 打印导出；圆形规则（`computeDiscLayout`、
`renderDiscToSVG` / `renderDiscSheetToSVG`：同心环、环绕的径向刻度、切向数字、
限制圆与枢轴）及其交互（`rotationTurns` 转子、径向游标与圆形读数面板）*
