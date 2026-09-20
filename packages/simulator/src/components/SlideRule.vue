<script setup lang="ts">
// Main slide rule view: millimetre layout, zoom/pan, slide drag and cursor.
// The face is strictly 6:1 (12in x 2in); sections are 4/6/4 and come from @slide-rule/renderer.
// In dual-face mode both sides are stacked and share one slide offset and cursor,
// so graduations line up and readings agree.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlideRuleStore, resolveCursorColor } from '../stores/slideRule'
import { getSections, readScaleValue, formatValue, isRedScale } from '@slide-rule/core'
import { computeFaceLayout } from '@slide-rule/renderer'
import type { ScaleSection, SlideRuleSide } from '@slide-rule/core'
import ScaleSectionView from './ScaleSection.vue'

const { t } = useI18n()
const store = useSlideRuleStore()
const { dualFace, middleOffset, cursors, currentTheme, zoom, currentModel, visibleSides } =
  storeToRefs(store)

// Faces to render: the model's visible faces (both only when it has two and dual
// mode is on). The single-faced Type 57 always renders its front.
const faces = visibleSides

function sectionsFor(face: SlideRuleSide) {
  return getSections(currentModel.value, face)
}

// viewport = visible window (scroll container); the stacked canvases are the face
// bodies (width = viewport width x zoom).
const viewportEl = ref<HTMLElement | null>(null)
const viewportWidth = ref(0)

let observer: ResizeObserver | null = null

function updateWidth(): void {
  if (viewportEl.value) viewportWidth.value = viewportEl.value.clientWidth
}

onMounted(() => {
  updateWidth()
  if (viewportEl.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(updateWidth)
    observer.observe(viewportEl.value)
  }
  window.addEventListener('resize', updateWidth)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateWidth)
})

// Whole-face layout: render width = viewport width x zoom (mm -> px).
const layout = computed(() =>
  computeFaceLayout(currentModel.value.physical, viewportWidth.value * zoom.value),
)
const tickWidthPx = computed(() => layout.value.tickWidthMm * layout.value.pxPerMm)

// At zoom 1 the content fits exactly, so disable horizontal scrolling to avoid
// a meaningless scrollbar.
const viewportOverflowX = computed(() => (zoom.value > 1 ? 'auto' : 'hidden'))

// Keep the face point under the centre of the viewport stable while zooming.
watch(zoom, (next, prev) => {
  const el = viewportEl.value
  if (!el || !prev) return
  const center = (el.scrollLeft + el.clientWidth / 2) * (next / prev)
  nextTick(() => {
    el.scrollLeft = center - el.clientWidth / 2
  })
})

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

// Slide travel in units of the tick-area width. On a real rule the slide can be
// pushed so that either index (1 or 10) reaches any value on the body scale,
// which needs up to a full scale length of travel. 1 = one scale length.
const SLIDE_TRAVEL = 1

function sectionStyle(section: ScaleSection) {
  const l = layout.value
  const s = l.sections[section]
  return {
    position: 'absolute' as const,
    left: '0',
    top: `${(s.topMm - s.bleedTopMm) * l.pxPerMm}px`,
    width: `${l.faceWidthPx}px`,
    height: `${(s.heightMm + s.bleedTopMm + s.bleedBottomMm) * l.pxPerMm}px`,
    overflow: 'visible',
  }
}

// Body material bands (opaque) that sandwich the slide slot.
// The slot itself stays transparent so the page background shows through
// wherever the slide is not covering it.
function bodyBandStyle(fromMm: number, toMm: number) {
  const l = layout.value
  return {
    position: 'absolute' as const,
    left: '0',
    top: `${fromMm * l.pxPerMm}px`,
    width: `${l.faceWidthPx}px`,
    height: `${(toMm - fromMm) * l.pxPerMm}px`,
    background: currentTheme.value.colors.background,
  }
}

// Groove: a wide physical gap with a single 1 px hairline (the slide slot edge).
// The line keeps a constant on-screen width at any zoom level, and its position
// is rounded to whole pixels so it renders crisp instead of blurring over two.
function grooveStyle(which: 'upper' | 'lower') {
  const l = layout.value
  const centerMm = l.grooveTopMm[which] + l.grooveMm / 2
  return {
    position: 'absolute' as const,
    left: '0',
    top: `${Math.round(centerMm * l.pxPerMm)}px`,
    width: `${l.faceWidthPx}px`,
    height: '1px',
    background: currentTheme.value.colors.text,
    opacity: 0.7,
  }
}

// Horizontal pixel offset of a cursor line from the left edge of the stack.
function cursorLeftPx(position: number): number {
  return (layout.value.tickLeftMm + position * layout.value.tickWidthMm) * layout.value.pxPerMm
}

// Each cursor draws in its own colour; the first/only one falls back to the
// theme's cursor colour (see the store's `resolveCursorColor`).
function cursorColor(cursor: (typeof cursors.value)[number]): string {
  return resolveCursorColor(cursor, currentTheme.value)
}

// Middle slide drag (works from either face)
function onMiddlePointerDown(e: PointerEvent): void {
  e.preventDefault()
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)

  const startX = e.clientX
  const startOffset = middleOffset.value
  const onMove = (ev: PointerEvent): void => {
    if (Math.abs(ev.clientX - startX) > 3) slideDragging = true
    const delta = tickWidthPx.value ? (ev.clientX - startX) / tickWidthPx.value : 0
    middleOffset.value = clamp(startOffset + delta, -SLIDE_TRAVEL, SLIDE_TRAVEL)
  }
  const onUp = (): void => {
    target.releasePointerCapture(e.pointerId)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

// Cursor drag: moves one cursor and shows its per-scale readings while dragging.
// The dragged cursor's position drives the shared read-out machinery below.
const dragPos = ref<number | null>(null)

function onCursorPointerDown(e: PointerEvent, id: string): void {
  e.preventDefault()
  e.stopPropagation()
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)

  const cursor = cursors.value.find((c) => c.id === id)
  if (!cursor) return
  const startX = e.clientX
  const startPos = cursor.position
  dragPos.value = startPos

  const onMove = (ev: PointerEvent): void => {
    const delta = tickWidthPx.value ? (ev.clientX - startX) / tickWidthPx.value : 0
    const pos = clamp(startPos + delta, 0, 1)
    store.setCursorPosition(id, pos)
    dragPos.value = pos
  }
  const onUp = (): void => {
    target.releasePointerCapture(e.pointerId)
    dragPos.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

// --- Hover readout + click-to-add cursors ------------------------------------

// Normalized tick position under the pointer, or null when outside the face.
// The range is the whole face, not just the 0..1 C/D span: scales read against
// C/D stick out past the C/D ends (into the left gutter / right note panel) and
// must stay readable. Their own reader returns null outside their real domain.
const hoverPos = ref<number | null>(null)
const hoverMinPos = computed(() => -layout.value.tickLeftMm / layout.value.tickWidthMm)
const hoverMaxPos = computed(
  () =>
    1 +
    (layout.value.faceWidthMm - layout.value.tickLeftMm - layout.value.tickWidthMm) /
      layout.value.tickWidthMm,
)
// Set while the slide is being dragged, so the drag does not also add a cursor.
let slideDragging = false

// Height of the face-name bar shown in dual-face mode (must match the CSS).
const LABEL_BAR_H = 24

// A dragged cursor wins over the hovered position, so both share one read-out.
const readoutPos = computed(() => dragPos.value ?? hoverPos.value)

const hoverLeftPx = computed(() =>
  readoutPos.value === null
    ? 0
    : (layout.value.tickLeftMm + readoutPos.value * layout.value.tickWidthMm) *
      layout.value.pxPerMm,
)

interface HoverReadout {
  key: string
  x: number
  y: number
  text: string
  color: string
}

// Every visible scale is read at the active position and shown on its own strip.
const hoverReadouts = computed<HoverReadout[]>(() => {
  const pos = readoutPos.value
  if (pos === null) return []
  const l = layout.value
  const out: HoverReadout[] = []
  const keys: ScaleSection[] = ['upper', 'middle', 'lower']
  const faceBlockPx = (dualFace.value ? LABEL_BAR_H : 0) + l.faceHeightPx

  faces.value.forEach((face, fi) => {
    const group = sectionsFor(face)
    const basePx = fi * faceBlockPx + (dualFace.value ? LABEL_BAR_H : 0)
    for (const key of keys) {
      const sec = l.sections[key]
      group[key].forEach((scale, i) => {
        const localPos = key === 'middle' ? pos - middleOffset.value : pos
        out.push({
          key: `${face}-${key}-${i}`,
          x: (l.tickLeftMm + pos * l.tickWidthMm) * l.pxPerMm,
          y: (sec.topMm + (i + 0.5) * l.rowHeightMm) * l.pxPerMm + basePx,
          text: `${scale.name} ${formatValue(readScaleValue(scale, localPos))}`,
          color: isRedScale(scale)
            ? currentTheme.value.colors.scaleRed
            : currentTheme.value.colors.scaleBlack,
        })
      })
    }
  })
  return out
})

// Top of the middle cursor handle: the boundary between the two stacked faces.
const middleHandleTopPx = computed(() =>
  // face 1 label bar + face 1 canvas + half of the second label bar (the blank gap)
  dualFace.value ? LABEL_BAR_H * 1.5 + layout.value.faceHeightPx : 0,
)

// Map a pointer event on a canvas to a normalized tick position.
function pointerToFace(e: PointerEvent | MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const l = layout.value
  const tickLeftPx = l.tickLeftMm * l.pxPerMm
  const tickWidthPxLen = l.tickWidthMm * l.pxPerMm
  const pos = tickWidthPxLen ? (e.clientX - rect.left - tickLeftPx) / tickWidthPxLen : 0
  return { pos, yMm: (e.clientY - rect.top) / l.pxPerMm }
}

function onHoverMove(e: PointerEvent): void {
  const { pos } = pointerToFace(e)
  hoverPos.value = pos < hoverMinPos.value || pos > hoverMaxPos.value ? null : pos
}

// A click within this many pixels of an existing cursor counts as hitting it.
const CURSOR_HIT_PX = 4

// Clicking empty face adds a cursor; a real slide drag suppresses the click, and
// a click on an existing cursor line is ignored (only dragging moves it).
function onCanvasClick(e: MouseEvent): void {
  if (slideDragging) {
    slideDragging = false
    return
  }
  const { pos } = pointerToFace(e)
  const position = clamp(pos, 0, 1)
  const hitWidth = tickWidthPx.value ? CURSOR_HIT_PX / tickWidthPx.value : 0
  if (cursors.value.some((c) => Math.abs(c.position - position) <= hitWidth)) return
  store.addCursor(position)
}
</script>

<template>
  <div ref="viewportEl" class="rule-viewport" :style="{ overflowX: viewportOverflowX }">
    <div class="rule-stack" :style="{ width: `${layout.faceWidthPx}px` }">
      <div v-for="face in faces" :key="face" class="face">
        <div v-if="dualFace" class="face-label">{{ t(`side.${face}`) }}</div>

        <div
          class="rule-canvas"
          :style="{
            width: `${layout.faceWidthPx}px`,
            height: `${layout.faceHeightPx}px`,
          }"
          @pointermove="onHoverMove"
          @pointerleave="hoverPos = null"
          @click="onCanvasClick"
        >
          <!-- Opaque body material around the transparent slide slot -->
          <div class="body-band" :style="bodyBandStyle(0, layout.sections.middle.topMm)"></div>
          <div
            class="body-band"
            :style="bodyBandStyle(layout.grooveTopMm.lower, layout.faceHeightMm)"
          ></div>

          <!-- Upper fixed scale -->
          <div class="section upper" :style="sectionStyle('upper')">
            <ScaleSectionView :scales="sectionsFor(face).upper" section="upper" :layout="layout" />
          </div>

          <!-- Slide: opaque surface plus edge lines, all translated together -->
          <div
            class="section middle"
            :style="[
              sectionStyle('middle'),
              {
                background: currentTheme.colors.background,
                transform: `translateX(${middleOffset * tickWidthPx}px)`,
              },
            ]"
            @pointerdown="onMiddlePointerDown"
          >
            <ScaleSectionView
              :scales="sectionsFor(face).middle"
              section="middle"
              :layout="layout"
            />
            <div class="slide-edge" :style="{ background: currentTheme.colors.gap }"></div>
            <div class="slide-edge right" :style="{ background: currentTheme.colors.gap }"></div>
          </div>

          <!-- Lower fixed scale -->
          <div class="section lower" :style="sectionStyle('lower')">
            <ScaleSectionView :scales="sectionsFor(face).lower" section="lower" :layout="layout" />
          </div>

          <!-- Groove hairlines last, so the section bleed cannot hide them -->
          <div class="groove" :style="grooveStyle('upper')"></div>
          <div class="groove" :style="grooveStyle('lower')"></div>
        </div>
      </div>

      <!-- Hover / drag: guide line plus one readout per scale strip -->
      <div
        v-if="readoutPos !== null"
        class="hover-line"
        :style="{ left: `${hoverLeftPx}px` }"
      ></div>
      <div
        v-for="r in hoverReadouts"
        :key="r.key"
        class="hover-item"
        :style="{ left: `${r.x}px`, top: `${r.y}px`, color: r.color }"
      >
        {{ r.text }}
      </div>

      <!-- One cursor per entry; each line runs through both faces -->
      <div
        v-for="(cursor, index) in cursors"
        :key="cursor.id"
        class="cursor"
        :style="{ left: `${cursorLeftPx(cursor.position)}px` }"
        @pointerdown="onCursorPointerDown($event, cursor.id)"
      >
        <div class="cursor-handle top" :style="{ background: cursorColor(cursor) }">
          <span
            class="cursor-badge"
            :style="{
              background: cursorColor(cursor),
              color: currentTheme.colors.background,
            }"
            >{{ index + 1 }}</span
          >
        </div>
        <div class="cursor-handle bottom" :style="{ background: cursorColor(cursor) }"></div>
        <div
          v-if="dualFace"
          class="cursor-handle middle"
          :style="{ background: cursorColor(cursor), top: `${middleHandleTopPx}px` }"
        ></div>
        <div class="cursor-line" :style="{ background: cursorColor(cursor), opacity: 0.85 }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rule-viewport {
  position: relative;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
}

.rule-stack {
  position: relative;
}

.face {
  position: relative;
}

/* Face name band shown only in dual-face mode (also the gap between faces) */
.face-label {
  display: flex;
  align-items: center;
  height: 24px;
  padding-left: 6px;
  font-size: 12px;
  color: var(--ui-text-muted);
  background: var(--ui-page);
}

.rule-canvas {
  position: relative;
  min-height: 40px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

.section.middle {
  cursor: grab;
  z-index: 1;
}

/* Above the slide (z-index 1), otherwise the slide's bleed hides the hairline */
.groove {
  z-index: 2;
}

.section.middle:active {
  cursor: grabbing;
}

/* Slide end lines: keep the slide boundary visible while it moves */
.slide-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1.5px;
  opacity: 0.7;
  pointer-events: none;
}

.slide-edge.right {
  left: auto;
  right: 0;
}

.cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  z-index: 3;
  cursor: ew-resize;
}

/* Hover guide line (thin, behind the cursor) */
.hover-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed rgba(107, 114, 128, 0.55);
  pointer-events: none;
  z-index: 2;
}

/* One readout per scale strip, at the hovered position */
.hover-item {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0 4px;
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
  pointer-events: none;
  z-index: 4;
}

.cursor-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -0.5px;
  width: 1.5px;
}

.cursor-handle {
  position: absolute;
  top: 0;
  left: -6px;
  width: 12px;
  height: 14px;
  border-radius: 0 0 4px 4px;
}

/* Symmetric handle at the bottom, and a larger one at the face boundary */
.cursor-handle.bottom {
  top: auto;
  bottom: 0;
  border-radius: 4px 4px 0 0;
}

.cursor-handle.middle {
  width: 24px;
  height: 20px;
  left: -12px;
  transform: translateY(-50%);
  border-radius: 4px;
}

/* Index chip on the top handle; the number labels the cursor */
.cursor-badge {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  min-width: 12px;
  height: 11px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
  line-height: 11px;
  text-align: center;
  pointer-events: none;
}

/* Mobile tweaks */
@media (max-width: 768px) {
  .cursor-handle {
    width: 28px;
    height: 22px;
    left: -14px;
  }

  .cursor-line {
    width: 3px;
    left: -1.5px;
  }
}
</style>
