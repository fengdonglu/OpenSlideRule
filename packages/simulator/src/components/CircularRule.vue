<script setup lang="ts">
// Interactive circular rule: the disc renderer draws the concentric scales, and
// an overlay draws one radial cursor line per cursor. Pointer rules mirror the
// linear view: drag the disc body to turn the rotor, drag a cursor to move it,
// and click the disc without dragging to add a cursor at that angle.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlideRuleStore, resolveCursorColor } from '../stores/slideRule'
import { getSections } from '@slide-rule/core'
import { computeDiscLayout, renderDiscToSVG } from '@slide-rule/renderer'
import type { ScaleDefinition } from '@slide-rule/core'

const TAU = Math.PI * 2

const { t } = useI18n()
const store = useSlideRuleStore()
const { cursors, discOffset, currentModel, currentTheme, zoom, visibleSides } = storeToRefs(store)

const hasDisc = computed(() => currentModel.value.disc !== undefined)

// Viewport width drives the square sheet's on-screen size, exactly as the
// linear view derives its face width; zoom is the only scale entry point.
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

const discPx = computed(() => Math.max(1, viewportWidth.value) * zoom.value)

// Disc geometry shared by the rendered disc and the overlay, so the cursor
// lines land on the same millimetre coordinates as the graduations.
// The inner/outer radii are the same for every face; only the ring counts
// differ, so the overlay geometry can be taken from any visible face.
const discLayout = computed(() => {
  const disc = currentModel.value.disc
  if (disc === undefined) return null
  const group = getSections(currentModel.value, visibleSides.value[0] ?? 'front')
  return computeDiscLayout(disc, {
    upper: group.upper.length,
    middle: group.middle.length,
    lower: group.lower.length,
  })
})
const sheetMm = computed(() => currentModel.value.disc?.sheetSizeMm ?? 0)

// Render each visible face's disc imperatively; the linear view is a pure Vue
// template, but the disc exporter builds real SVG DOM, so it is mounted into a
// host element per face.
const discHosts = ref<Record<string, HTMLElement | null>>({})
function setDiscHost(side: string, el: unknown): void {
  discHosts.value[side] = (el as HTMLElement | null) ?? null
}

function drawDisc(): void {
  const model = currentModel.value
  for (const side of visibleSides.value) {
    const host = discHosts.value[side]
    if (host === null || host === undefined) continue
    if (model.disc === undefined) {
      host.replaceChildren()
      continue
    }
    const svg = renderDiscToSVG(model, {
      face: side,
      theme: currentTheme.value,
      titleOf: (s: ScaleDefinition) => t('scaleDesc.' + s.name),
      rotationTurns: { middle: discOffset.value },
    })
    svg.style.width = '100%'
    svg.style.height = '100%'
    svg.style.display = 'block'
    host.replaceChildren(svg)
  }
}

onMounted(drawDisc)
// `flush: 'post'` so a newly shown face's host element exists before it is drawn.
watch([currentModel, visibleSides, currentTheme, discOffset], drawDisc, { flush: 'post' })

// A point at `position` turns and `radiusMm` from the disc centre, matching
// renderDiscToSVG: position 0 is 12 o'clock and turns grow clockwise.
function pointOnDisc(radiusMm: number, position: number): [number, number] {
  const layout = discLayout.value
  if (layout === null) return [0, 0]
  const angle = TAU * position
  const center = layout.centerMm
  return [center + radiusMm * Math.sin(angle), center - radiusMm * Math.cos(angle)]
}

interface CursorView {
  id: string
  index: number
  color: string
  x1: number
  y1: number
  x2: number
  y2: number
  hx: number
  hy: number
}

const cursorViews = computed<CursorView[]>(() => {
  const layout = discLayout.value
  if (layout === null) return []
  return cursors.value.map((cursor, index) => {
    const [x1, y1] = pointOnDisc(layout.innerRadiusMm, cursor.position)
    const [x2, y2] = pointOnDisc(layout.outerRadiusMm, cursor.position)
    const [hx, hy] = pointOnDisc(layout.outerRadiusMm, cursor.position)
    return {
      id: cursor.id,
      index,
      color: resolveCursorColor(cursor, currentTheme.value),
      x1,
      y1,
      x2,
      y2,
      hx,
      hy,
    }
  })
})

const handleRadiusMm = computed(() => {
  const layout = discLayout.value
  return layout === null ? 3 : Math.max(3, layout.numeralMm * 1.3)
})

// Normalise a turn fraction and take the shortest signed delta, so dragging
// across the 0/1 seam does not spin the disc the long way round.
function wrap01(v: number): number {
  return ((v % 1) + 1) % 1
}

function wrapDelta(d: number): number {
  return wrap01(d + 0.5) - 0.5
}

function angularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1
  return Math.min(d, 1 - d)
}

// Turn fraction under a pointer, measured from the clicked disc's own rect, so
// it is correct whichever stacked face the pointer is on.
function angleAt(clientX: number, clientY: number, svg: Element | null): number {
  const rect = svg?.getBoundingClientRect()
  if (!rect || rect.width === 0) return 0
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  return (Math.atan2(dx, -dy) / TAU + 1) % 1
}

// Pixel distance the pointer must travel before a press counts as a drag.
const DRAG_THRESHOLD_PX = 3
// A click within this many pixels of a cursor line counts as hitting it.
const CURSOR_HIT_PX = 4

// Set while the disc is being turned, so releasing does not add a cursor.
let rotorDragging = false
// Set on pointerup after a rotor drag: the click that follows the release is
// swallowed once. Cleared at the next press, so a drag that ends without a
// click cannot swallow a later, independent click.
let suppressClick = false

// Teardown for the drag in progress (rotor or cursor), kept at setup scope so
// unmounting mid-drag always removes the window listeners.
let activeDrag: { move: (e: PointerEvent) => void; up: () => void } | null = null

function stopActiveDrag(): void {
  const drag = activeDrag
  activeDrag = null
  if (drag !== null) {
    window.removeEventListener('pointermove', drag.move)
    window.removeEventListener('pointerup', drag.up)
  }
}

function onDiscPointerDown(e: PointerEvent): void {
  e.preventDefault()
  stopActiveDrag()
  const target = e.currentTarget as Element
  target.setPointerCapture(e.pointerId)

  const svg = e.currentTarget as Element
  const startX = e.clientX
  const startY = e.clientY
  const startAngle = angleAt(e.clientX, e.clientY, svg)
  const startOffset = discOffset.value
  rotorDragging = false
  suppressClick = false

  const onMove = (ev: PointerEvent): void => {
    // Turn the rotor only once the press has become a drag; a small jitter on
    // press must not nudge discOffset before the click-vs-drag decision is made.
    if (!rotorDragging) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) <= DRAG_THRESHOLD_PX) return
      rotorDragging = true
    }
    const delta = wrapDelta(angleAt(ev.clientX, ev.clientY, svg) - startAngle)
    store.setDiscOffset(wrap01(startOffset + delta))
  }
  const onUp = (): void => {
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
    // Always drop the drag flag; if the pointer did move, the click that follows
    // this release must be ignored so a drag never adds a cursor.
    if (rotorDragging) {
      suppressClick = true
      rotorDragging = false
    }
    stopActiveDrag()
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  activeDrag = { move: onMove, up: onUp }
}

function onDiscClick(e: MouseEvent): void {
  if (rotorDragging || suppressClick) {
    rotorDragging = false
    suppressClick = false
    return
  }
  const layout = discLayout.value
  const svg = e.currentTarget as Element
  const rect = svg.getBoundingClientRect()
  if (layout === null || rect.width === 0) return

  const dx = e.clientX - (rect.left + rect.width / 2)
  const dy = e.clientY - (rect.top + rect.height / 2)
  const radiusPx = (layout.outerRadiusMm / layout.sheetSizeMm) * rect.width
  if (Math.hypot(dx, dy) > radiusPx) return

  const position = angleAt(e.clientX, e.clientY, svg)
  const hitTurns = CURSOR_HIT_PX / rect.width
  if (cursors.value.some((c) => angularDistance(c.position, position) <= hitTurns)) return
  store.addCursor(position)
}

function onCursorPointerDown(e: PointerEvent, id: string): void {
  e.preventDefault()
  e.stopPropagation()
  stopActiveDrag()
  const target = e.currentTarget as Element
  target.setPointerCapture(e.pointerId)

  const cursor = cursors.value.find((c) => c.id === id)
  if (!cursor) return
  const svg = (e.currentTarget as SVGElement).ownerSVGElement
  const startAngle = angleAt(e.clientX, e.clientY, svg)
  const startPos = cursor.position

  const onMove = (ev: PointerEvent): void => {
    const delta = wrapDelta(angleAt(ev.clientX, ev.clientY, svg) - startAngle)
    store.setCursorPosition(id, wrap01(startPos + delta))
  }
  const onUp = (): void => {
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
    stopActiveDrag()
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  activeDrag = { move: onMove, up: onUp }
}

// A drag interrupted by unmount must not leave listeners behind.
onBeforeUnmount(stopActiveDrag)
</script>

<template>
  <div ref="viewportEl" class="disc-viewport">
    <!-- One disc per visible face, stacked vertically (dual-face mode). -->
    <div
      v-for="side in visibleSides"
      :key="side"
      class="disc-stack"
      :style="{ width: `${discPx}px`, height: `${discPx}px` }"
    >
      <!-- The renderer's own SVG (regenerated as the rotor turns). -->
      <div :ref="(el) => setDiscHost(side, el)" class="disc-host" />

      <!-- Cursor overlay, sharing the disc's square viewBox (millimetres). -->
      <svg
        class="disc-overlay"
        :viewBox="`0 0 ${sheetMm} ${sheetMm}`"
        @pointerdown="onDiscPointerDown"
        @click="onDiscClick"
      >
        <g
          v-for="c in cursorViews"
          :key="c.id"
          class="cursor"
          @pointerdown.stop="onCursorPointerDown($event, c.id)"
        >
          <line
            v-if="discLayout"
            class="cursor-line"
            :x1="c.x1"
            :y1="c.y1"
            :x2="c.x2"
            :y2="c.y2"
            :stroke="c.color"
          />
          <line v-if="discLayout" class="cursor-hit" :x1="c.x1" :y1="c.y1" :x2="c.x2" :y2="c.y2" />
          <circle
            v-if="discLayout"
            class="cursor-handle"
            :cx="c.hx"
            :cy="c.hy"
            :r="handleRadiusMm"
            :fill="c.color"
          />
          <text
            v-if="discLayout"
            class="cursor-badge"
            :x="c.hx"
            :y="c.hy"
            :font-size="handleRadiusMm"
            :fill="currentTheme.colors.background"
          >
            {{ c.index + 1 }}
          </text>
        </g>
      </svg>
    </div>

    <p v-if="!hasDisc" class="disc-missing">{{ t('circular.noDisc') }}</p>
  </div>
</template>

<style scoped>
.disc-viewport {
  position: relative;
  width: 100%;
  overflow: auto;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  background: var(--ui-page);
}

/* Square sheet body: the disc SVG fills it, the cursor overlay shares it.
   Centred with auto margins rather than flex centring: when the disc is wider
   than the viewport (zoom > 1) flex centring would push the left overflow out
   of reach, while auto margins collapse to 0 and keep the whole disc scrollable. */
.disc-stack {
  position: relative;
  margin: 0 auto;
}

/* Space between the stacked faces in dual-face mode. */
.disc-stack + .disc-stack {
  margin-top: 10px;
}

.disc-host {
  position: absolute;
  inset: 0;
}

.disc-host :deep(svg) {
  display: block;
}

.disc-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  cursor: grab;
}

.disc-overlay:active {
  cursor: grabbing;
}

/* Radial cursor line, in the cursor's own colour. */
.cursor-line {
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

/* Invisible thick line that makes the thin cursor easy to grab. */
.cursor-hit {
  stroke: transparent;
  stroke-width: 20;
  vector-effect: non-scaling-stroke;
  pointer-events: stroke;
  cursor: grab;
}

/* The visible handle is part of the same drag target as the hit line, so a drag
   started on the handle moves the cursor instead of turning the disc. */
.cursor-handle {
  stroke: var(--ui-text);
  stroke-opacity: 0.35;
  stroke-width: 0.6;
  pointer-events: all;
  cursor: grab;
}

.cursor-badge {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
}

.disc-missing {
  margin: 0;
  padding: 24px;
  color: var(--ui-text-muted);
  font-size: 13px;
  text-align: center;
}
</style>
